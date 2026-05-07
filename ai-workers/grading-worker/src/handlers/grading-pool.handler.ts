import { Channel } from 'amqplib';
import { GradingWriteMessage, GradingSpeakMessage } from '@ai-workers/shared/types/messages';
import { createNeonService } from '../services/neon.service';
import { buildWritingPrompt, WritingGradingResult } from '../prompts/writing.prompt';
import { buildSpeakingPrompt, SpeakingGradingResult } from '../prompts/speaking.prompt';
import { AIKeyPool, AIKeyConfig, PoolStats } from '@ai-workers/shared/config/ai-pool';

const RETRY_CONFIG = {
  maxRetries: 3,
  backoffMs: [1000, 2000, 4000],
};

const GRADING_MODEL = 'llama-3.3-70b-versatile';
const TRANSCRIPTION_MODEL = 'whisper-large-v3';

interface GradingPoolConfig {
  pool: AIKeyPool;
}

let poolConfig: GradingPoolConfig | null = null;

export function initializeGradingPool(config: {
  apiKeys: { apiKey: string; name: string }[];
}): void {
  const { apiKeys } = config;

  const keyConfigs: AIKeyConfig[] = apiKeys.map(k => ({
    apiKey: k.apiKey,
    name: k.name,
    isDisabled: false,
    dailyQuotaUsed: 0,
    dailyQuotaLimit: 10000,
    lastResetAt: new Date(),
    consecutiveFailures: 0,
  }));

  poolConfig = {
    pool: new AIKeyPool({
      keys: keyConfigs,
      rateLimitWindowMs: 30000,
      rateLimitMaxRequests: 30,
      dailyQuotaLimit: 10000,
      healthCheckIntervalMs: 60000,
    }),
  };

  console.log(`Grading AI Pool initialized with ${apiKeys.length} keys`);
}

export async function processWriteGradingWithPool(
  msg: GradingWriteMessage,
  channel: Channel,
): Promise<void> {
  if (!poolConfig) {
    throw new Error('Grading Pool not initialized. Call initializeGradingPool first.');
  }

  const neon = createNeonService();
  const { pool } = poolConfig;

  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    const groqResult = await pool.getGroqClient();

    if (!groqResult) {
      console.error('No healthy AI key available for write grading');
      break;
    }

    const { client: groq, key: activeKey } = groqResult;

    try {
      const prompt = buildWritingPrompt(
        msg.submissionText,
        msg.prompt,
        msg.type,
      );

      const response = await groq.chat.completions.create({
        model: GRADING_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const responseText = response.choices[0]?.message?.content || '';
      const cleanJson = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const result = JSON.parse(cleanJson) as WritingGradingResult;

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

      pool.recordSuccess(activeKey.name);
      await neon.disconnect();
      return;

    } catch (error: any) {
      console.error(`Write grading attempt ${attempt + 1} failed with key ${activeKey.name}:`, error.message);

      const errorMsg = error.message || '';
      if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
        pool.recordRateLimitError(activeKey.name);
      } else if (errorMsg.includes('quota') || errorMsg.includes('exhausted')) {
        pool.recordQuotaExhausted(activeKey.name);
      } else {
        pool.recordFailure(activeKey.name);
      }

      if (attempt < RETRY_CONFIG.maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.backoffMs[attempt]));
      }
    }
  }

  console.error('All retries exhausted for write grading');

  await neon.updateWritingSubmission(msg.submissionId, {
    aiGradingStatus: 'FAILED',
    aiOverallScore: 0,
    aiDetailedFeedback: {
      error: 'All AI keys failed',
    },
    gradedAt: new Date(),
  });

  await refundOnFailure(msg.submissionId, msg.userId, msg.usedSubscriptionQuota, neon);
  await neon.disconnect();
}

export async function processSpeakGradingWithPool(
  msg: GradingSpeakMessage,
  channel: Channel,
): Promise<void> {
  if (!poolConfig) {
    throw new Error('Grading Pool not initialized. Call initializeGradingPool first.');
  }

  const neon = createNeonService();
  const { pool } = poolConfig;

  let transcript = msg.transcript;
  let transcriptionFailed = false;

  if (!transcript) {
    for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
      const groqResult = await pool.getGroqClient();

      if (!groqResult) {
        console.error('No healthy AI key available for transcription');
        transcriptionFailed = true;
        break;
      }

      const { client: groq, key: activeKey } = groqResult;

      try {
        console.log(`Transcribing audio for: ${msg.submissionId}`);
        const response = await groq.chat.completions.create({
          model: TRANSCRIPTION_MODEL,
          messages: [{ role: 'user', content: 'Transcribe this audio' }],
        });

        transcript = response.choices[0]?.message?.content || '';
        pool.recordSuccess(activeKey.name);
        console.log(`Transcription completed: ${transcript.substring(0, 50)}...`);
        break;

      } catch (error: any) {
        console.error(`Transcription attempt ${attempt + 1} failed:`, error.message);

        const errorMsg = error.message || '';
        if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
          pool.recordRateLimitError(activeKey.name);
        } else {
          pool.recordFailure(activeKey.name);
        }

        if (attempt < RETRY_CONFIG.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.backoffMs[attempt]));
        }
      }
    }

    if (!transcript) {
      console.error('Transcription failed after all retries');
      transcriptionFailed = true;
    }
  }

  if (transcriptionFailed) {
    await neon.updateSpeakingSubmission(msg.submissionId, {
      aiGradingStatus: 'FAILED',
      aiOverallScore: 0,
      aiDetailedFeedback: {
        error: 'Transcription failed',
      },
      gradedAt: new Date(),
    });

    await refundOnFailure(msg.submissionId, msg.userId, msg.usedSubscriptionQuota, neon);
    await neon.disconnect();
    return;
  }

  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    const groqResult = await pool.getGroqClient();

    if (!groqResult) {
      console.error('No healthy AI key available for speak grading');
      break;
    }

    const { client: groq, key: activeKey } = groqResult;

    try {
      if (!transcript) {
        throw new Error('Transcript is empty');
      }

      const prompt = buildSpeakingPrompt(
        transcript,
        msg.taskTitle,
        msg.questionsText,
      );

      const response = await groq.chat.completions.create({
        model: GRADING_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const responseText = response.choices[0]?.message?.content || '';
      const cleanJson = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const result = JSON.parse(cleanJson) as SpeakingGradingResult;

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

      pool.recordSuccess(activeKey.name);
      await neon.disconnect();
      return;

    } catch (error: any) {
      console.error(`Speak grading attempt ${attempt + 1} failed with key ${activeKey.name}:`, error.message);

      const errorMsg = error.message || '';
      if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
        pool.recordRateLimitError(activeKey.name);
      } else if (errorMsg.includes('quota') || errorMsg.includes('exhausted')) {
        pool.recordQuotaExhausted(activeKey.name);
      } else {
        pool.recordFailure(activeKey.name);
      }

      if (attempt < RETRY_CONFIG.maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.backoffMs[attempt]));
      }
    }
  }

  console.error('All retries exhausted for speak grading');

  await neon.updateSpeakingSubmission(msg.submissionId, {
    aiGradingStatus: 'FAILED',
    transcript,
    aiOverallScore: 0,
    aiDetailedFeedback: {
      error: 'All AI keys failed',
    },
    gradedAt: new Date(),
  });

  await refundOnFailure(msg.submissionId, msg.userId, msg.usedSubscriptionQuota, neon);
  await neon.disconnect();
}

async function refundOnFailure(
  submissionId: string,
  userId: string,
  usedSubscriptionQuota: boolean | undefined,
  neon: any,
): Promise<void> {
  try {
    const submission = submissionId.includes('writing')
      ? await neon.getWritingSubmissionWithRefund(submissionId)
      : await neon.getSpeakingSubmissionWithRefund(submissionId);

    if (submission) {
      if (usedSubscriptionQuota) {
        await neon.refundSubscriptionQuota(submission.idUser, 2);
        console.log(`Refunded subscription quota for user ${submission.idUser}`);
      }

      if (submission.idCreditTransaction) {
        await neon.refundCredits(submission.idUser, 0, submissionId);
        console.log(`Refunded credits for user ${submission.idUser}`);
      }
    }
  } catch (refundError) {
    console.error('Failed to refund credits/quota:', refundError);
  }
}

export function getGradingPoolStats(): PoolStats | null {
  if (!poolConfig) return null;
  return {
    ...poolConfig.pool.getPoolStats(),
    keysHealth: poolConfig.pool.getAllKeyHealth(),
  };
}

export function isGradingPoolInitialized(): boolean {
  return poolConfig !== null;
}
