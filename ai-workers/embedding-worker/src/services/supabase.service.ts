import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class SupabaseService {
  private client: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.client = createClient(url, serviceKey);
  }

  async insertDocument(doc: {
    content: string;
    metadata: object;
    embedding: number[];
  }): Promise<void> {
    const { error } = await this.client.from('rag_documents').insert({
      content: doc.content,
      metadata: doc.metadata,
      embedding: doc.embedding,
    });

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }
  }
}

export function createSupabaseService(): SupabaseService {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  }

  return new SupabaseService(url, serviceKey);
}
