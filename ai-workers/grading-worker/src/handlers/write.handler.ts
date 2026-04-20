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
      const prompt = buildWritingPrompt(
        msg.submissionText,
        msg.prompt,
        msg.type,
      );

      const responseText = await groq.chatcompletion(prompt);

      const cleanJson = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const result = JSON.parse(cleanJson) as WritingGradingResult;

      // Calculate overall score as average of 4 criteria
      const overallScore = Math.round(
        (result.taskAchievement.score +
          result.coherenceAndCohesion.score +
          result.lexicalResource.score +
          result.grammaticalRangeAndAccuracy.score) /
          4 *
          2,
      ) / 2;

      await neon.updateWritingSubmission(msg.submissionId, {
        aiGradingStatus: 'COMPLETED',
        aiOverallScore: overallScore,
        aiDetailedFeedback: {
          taskAchievement: result.taskAchievement,
          coherenceAndCohesion: result.coherenceAndCohesion,
          lexicalResource: result.lexicalResource,
          grammaticalRangeAndAccuracy: result.grammaticalRangeAndAccuracy,
          generalFeedback: result.generalFeedback,
          detailedCorrections: result.detailedCorrections ?? [],
        },
        gradedAt: new Date(),
      });

      await neon.disconnect();
      return;
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
