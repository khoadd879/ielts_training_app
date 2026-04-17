import { Channel } from 'amqplib';
import { GradingWriteMessage } from '@ai-workers/shared/types/messages';
import { createGroqService } from '../services/groq.service';
import { createNeonService } from '../services/neon.service';
import { buildWritingPrompt, WritingGradingResult } from '../prompts/writing.prompt';

const RETRY_CONFIG = {
  maxRetries: 3,
  backoffMs: [1000, 2000, 4000],
};

export async function processWriteGrading(
  msg: GradingWriteMessage,
  channel: Channel,
): Promise<void> {
  const groq = createGroqService();
  const neon = createNeonService();

  let lastError: unknown;

  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      // Build prompt
      const prompt = buildWritingPrompt(
        msg.submissionText,
        msg.prompt,
        msg.type,
      );

      // Call Groq with retry
      const responseText = await groq.chatcompletion(prompt);

      // Parse response
      const cleanJson = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const result = JSON.parse(cleanJson) as WritingGradingResult;

      // Write to Neon
      await neon.updateWritingSubmission(msg.submissionId, {
        aiGradingStatus: 'COMPLETED',
        aiOverallScore: result.score,
        aiDetailedFeedback: {
          taskResponse: result.task_response,
          coherenceAndCohesion: result.coherence_and_cohesion,
          lexicalResource: result.lexical_resource,
          grammaticalRangeAndAccuracy: result.grammatical_range_and_accuracy,
          generalFeedback: result.general_feedback,
          detailedCorrections: result.detailed_corrections,
        },
        gradedAt: new Date(),
      });

      return; // Success
    } catch (error) {
      lastError = error;
      console.error(
        `Attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries} failed:`,
        error,
      );

      if (attempt < RETRY_CONFIG.maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_CONFIG.backoffMs[attempt]),
        );
      }
    }
  }

  // All retries failed - mark as FAILED
  console.error('All retries exhausted for write grading:', lastError);

  await neon.updateWritingSubmission(msg.submissionId, {
    aiGradingStatus: 'FAILED',
    aiOverallScore: 0,
    aiDetailedFeedback: {
      error: lastError instanceof Error ? lastError.message : String(lastError),
    },
    gradedAt: new Date(),
  });

  await neon.disconnect();
  throw lastError;
}