import Groq from 'groq-sdk';

// Models verified against the project's GROQ_API_KEY_* (probe 2026-09-04):
//   openai/gpt-oss-120b -> 200 OK (931ms)
//   openai/gpt-oss-20b  -> 200 OK (575ms)
// The previous default `llama-3.3-70b-versatile` was shut down 2026-08-16 per
// https://console.groq.com/docs/deprecations and now returns 404 model_not_found.
// Override the primary model via GROQ_MODEL env var if needed.
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const MODEL_FALLBACK_LIST: string[] = (() => {
  const list = [
    DEFAULT_MODEL,
    'openai/gpt-oss-20b',
    'qwen/qwen3.6-27b',
  ].filter((m, i, arr) => arr.indexOf(m) === i);
  return list;
})();

function isModelNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { status?: number; code?: string; error?: { code?: string; error?: { code?: string } } };
  if (e.status !== 404) return false;
  const nested =
    e.error?.error?.code ||
    e.error?.code ||
    e.code ||
    '';
  return typeof nested === 'string' && nested.includes('model_not_found');
}

export class GroqService {
  private client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey });
  }

  async chatcompletion(
    prompt: string,
    model?: string,
  ): Promise<string> {
    // If caller passes a model explicitly, single-shot (no fallback) — preserve
    // any caller intent (e.g. tests, manual override).
    if (model) {
      const response = await this.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });
      return response.choices[0]?.message?.content || '';
    }

    // Otherwise walk the fallback list. On model_not_found, log + try next;
    // any other error propagates so the outer retry in write/speak handlers
    // can do its 3-attempt loop.
    let lastError: unknown;
    for (const candidate of MODEL_FALLBACK_LIST) {
      try {
        const response = await this.client.chat.completions.create({
          model: candidate,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        });
        const content = response.choices[0]?.message?.content || '';
        if (content.length > 0) {
          if (candidate !== DEFAULT_MODEL) {
            console.warn(
              `[groq.service] Primary model ${DEFAULT_MODEL} unavailable; used fallback ${candidate}`,
            );
          }
          return content;
        }
        lastError = new Error(`Empty response from ${candidate}`);
      } catch (error) {
        lastError = error;
        if (isModelNotFoundError(error)) {
          console.warn(
            `[groq.service] Model ${candidate} returned 404 model_not_found; trying next fallback`,
          );
          continue;
        }
        throw error;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error('All Groq model fallbacks exhausted');
  }

  async transcribeAudio(
    audioBuffer: Buffer,
    model: string = 'whisper-large-v3',
  ): Promise<string> {
    const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

    const response = await this.client.audio.transcriptions.create({
      file,
      model,
    });

    return response.text || '';
  }
}

export function createGroqService(): GroqService {
  const apiKey =
    process.env.GROQ_API_KEY_1 ||
    process.env.GROQ_API_KEY_2 ||
    process.env.GROQ_API_KEY_3 ||
    process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set');
  }
  return new GroqService(apiKey);
}
