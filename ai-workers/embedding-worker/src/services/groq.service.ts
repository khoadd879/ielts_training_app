import Groq from 'groq-sdk';

export class GroqService {
  private client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey });
  }

  async createEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'embed-english-v2',
      input: text,
    });

    return response.data[0]?.embedding || [];
  }
}

export function createGroqService(): GroqService {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set');
  }
  return new GroqService(apiKey);
}
