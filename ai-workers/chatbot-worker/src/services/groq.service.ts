import Groq from 'groq-sdk';

export class MultiKeyGroqService {
  private clients: Groq[];
  private apiKeyIndex: number = 0;

  constructor() {
    const apiKeys = [
      process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY,
      process.env.GROQ_API_KEY_2,
      process.env.GROQ_API_KEY_3
    ].filter(key => key && key.length > 0);

    if (apiKeys.length === 0) {
      throw new Error('At least one GROQ_API_KEY must be set');
    }

    this.clients = apiKeys.map(key => new Groq({ apiKey: key }));
  }

  private getCurrentClient(): Groq {
    return this.clients[this.apiKeyIndex % this.clients.length];
  }

  private getCurrentKeyIndex(): number {
    return this.apiKeyIndex % this.clients.length;
  }

  private isRateLimitError(error: any): boolean {
    if (!error) return false;
    const message = error.message || error.msg || '';
    return message.includes('429') ||
           message.includes('rate limit') ||
           message.includes('TOO_MANY_REQUESTS');
  }

  async chatcompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string; name?: string; tool_call_id?: string }>,
    model: string = 'llama-3.3-70b-versatile',
    tools?: any[],
    toolChoice?: any
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let keyAttempt = 0; keyAttempt < this.clients.length; keyAttempt++) {
      const client = this.getCurrentClient();
      const currentKeyIdx = this.getCurrentKeyIndex();

      try {
        const params: any = {
          model,
          messages,
          temperature: 0.7,
        };

        if (tools) {
          params.tools = tools;
        }
        if (toolChoice) {
          params.tool_choice = toolChoice;
        }

        const response = await client.chat.completions.create(params);
        return response;
      } catch (error: any) {
        lastError = error;
        console.error(`Groq key ${currentKeyIdx + 1} failed:`, error.message);

        if (this.isRateLimitError(error)) {
          this.apiKeyIndex = (this.apiKeyIndex + 1) % this.clients.length;
          console.log(`Switching to Groq key ${this.getCurrentKeyIndex() + 1}`);
          continue;
        }

        throw error;
      }
    }

    throw new Error(`All Groq API keys exhausted. Last error: ${lastError?.message}`);
  }

  async createEmbedding(text: string): Promise<number[]> {
    const client = this.getCurrentClient();
    const response = await client.embeddings.create({
      model: 'embed-english-v2',
      input: text,
    });
    const embedding = response.data[0]?.embedding;
    return Array.isArray(embedding) ? embedding : [];
  }
}

export function createGroqService(): MultiKeyGroqService {
  return new MultiKeyGroqService();
}
