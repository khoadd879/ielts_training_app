import { Channel } from 'amqplib';
import axios from 'axios';
import { GradingSpeakMessage } from '@ai-workers/shared/types/messages';
import { createGroqService } from '../services/groq.service';
import { createNeonService } from '../services/neon.service';
import { buildSpeakingPrompt, SpeakingGradingResult } from '../prompts/speaking.prompt';

const RETRY_CONFIG = {
  maxRetries: 3,
  backoffMs: [1000, 2000, 4000],
};

async function downloadAudio(url: string): Promise<Buffer> {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
}

export async function processSpeakGrading(
  msg: GradingSpeakMessage,
  channel: Channel,
): Promise<void> {
  const groq = createGroqService();
  const neon = createNeonService();

  let transcript = msg.transcript;
  let lastError: unknown;

  // Step 1: Transcribe audio if no transcript provided
  if (!transcript) {
    for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
      try {
        console.log(`Transcribing audio for: ${msg.submissionId}`);
        const audioBuffer = await downloadAudio(msg.audioUrl);
        transcript = await groq.transcribeAudio(audioBuffer);
        console.log(`Transcription completed: ${transcript.substring(0, 50)}...`);
        break;
      } catch (error) {
        lastError = error;
        console.error(`Transcription attempt ${attempt + 1} failed:`, error);

        if (attempt < RETRY_CONFIG.maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_CONFIG.backoffMs[attempt]),
          );
        }
      }
    }

    if (!transcript) {
      console.error('Transcription failed after all retries');
      await neon.updateSpeakingSubmission(msg.submissionId, {
        aiGradingStatus: 'FAILED',
        aiOverallScore: 0,
        aiDetailedFeedback: {
          error: 'Transcription failed',
        },
        gradedAt: new Date(),
      });
      await neon.disconnect();
      throw lastError;
    }
  }

  // Step 2: Grade the transcript
  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const prompt = buildSpeakingPrompt(
        transcript,
        msg.taskTitle,
        msg.questionsText,
      );

      const responseText = await groq.chatcompletion(prompt);

      const cleanJson = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const result = JSON.parse(cleanJson) as SpeakingGradingResult;

      // Calculate overall score as average of 4 criteria
      const overallScore = Math.round(
        (result.fluencyAndCoherence.score +
          result.lexicalResource.score +
          result.grammaticalRangeAndAccuracy.score +
          result.pronunciation.score) /
          4 *
          2,
      ) / 2;

      await neon.updateSpeakingSubmission(msg.submissionId, {
        aiGradingStatus: 'COMPLETED',
        transcript,
        aiOverallScore: overallScore,
        aiDetailedFeedback: {
          fluencyAndCoherence: result.fluencyAndCoherence,
          lexicalResource: result.lexicalResource,
          grammaticalRangeAndAccuracy: result.grammaticalRangeAndAccuracy,
          pronunciation: result.pronunciation,
          generalFeedback: result.generalFeedback,
          detailedCorrections: result.detailedCorrections ?? [],
        },
        gradedAt: new Date(),
      });

      await neon.disconnect();
      return;
    } catch (error) {
      lastError = error;
      console.error(`Grading attempt ${attempt + 1} failed:`, error);

      if (attempt < RETRY_CONFIG.maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_CONFIG.backoffMs[attempt]),
        );
      }
    }
  }

  // All retries failed
  await neon.updateSpeakingSubmission(msg.submissionId, {
    aiGradingStatus: 'FAILED',
    transcript,
    aiOverallScore: 0,
    aiDetailedFeedback: {
      error: lastError instanceof Error ? lastError.message : String(lastError),
    },
    gradedAt: new Date(),
  });

  await neon.disconnect();
  throw lastError;
}
