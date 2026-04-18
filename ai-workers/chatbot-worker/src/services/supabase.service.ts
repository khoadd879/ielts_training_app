import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface RagDocument {
  id: string;
  content: string;
  metadata: {
    source: string;
    category: string;
    user_id?: string;
  };
  embedding: number[];
}

export class SupabaseService {
  private client: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.client = createClient(url, serviceKey);
  }

  async searchDocuments(
    queryEmbedding: number[],
    matchThreshold: number = 0.7,
    matchCount: number = 5,
  ): Promise<RagDocument[]> {
    const { data, error } = await this.client.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) {
      console.error('Supabase search error:', error);
      return [];
    }

    return data || [];
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

  // Helper to create embedding
  private async createEmbedding(text: string): Promise<number[]> {
    const Groq = require('groq-sdk');
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY });
    const response = await groq.embeddings.create({
      model: 'embed-english-v2',
      input: text
    });
    return response.data[0]?.embedding || [];
  }

  // Skill-specific search methods
  async searchBySkill(
    skill: 'reading' | 'listening' | 'speaking' | 'writing',
    queryEmbedding: number[],
    matchThreshold: number = 0.6,
    matchCount: number = 3
  ): Promise<RagDocument[]> {
    const { data, error } = await this.client.rpc(`search_ielts_${skill}`, {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount
    });

    if (error) {
      console.error(`Supabase ${skill} search error:`, error);
      return [];
    }

    return data || [];
  }

  async searchReading(query: string): Promise<RagDocument[]> {
    const embedding = await this.createEmbedding(query);
    return this.searchBySkill('reading', embedding);
  }

  async searchListening(query: string): Promise<RagDocument[]> {
    const embedding = await this.createEmbedding(query);
    return this.searchBySkill('listening', embedding);
  }

  async searchSpeaking(query: string): Promise<RagDocument[]> {
    const embedding = await this.createEmbedding(query);
    return this.searchBySkill('speaking', embedding);
  }

  async searchWriting(query: string): Promise<RagDocument[]> {
    const embedding = await this.createEmbedding(query);
    return this.searchBySkill('writing', embedding);
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