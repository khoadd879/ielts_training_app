import Groq from 'groq-sdk';

export class GroqService {
  private client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey });
  }

  async chatcompletion(
    prompt: string,
    model: string = 'llama-3.3-70b-versatile',
  ): Promise<string> {
    const response = await this.client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content || '';
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
