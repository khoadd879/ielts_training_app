import { createClient, SupabaseClient } from '@supabase/supabase-js';

type Skill = 'reading' | 'listening' | 'speaking' | 'writing';

const SKILL_TABLES: Record<Skill, string> = {
  reading: 'ielts_reading',
  listening: 'ielts_listening',
  speaking: 'ielts_speaking',
  writing: 'ielts_writing',
};

export interface RagDocument {
  id: string;
  content: string;
  metadata: {
    source: string;
    category: string;
    user_id?: string;
  };
  embedding?: number[] | string;
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

  private buildSearchTerms(query: string): string[] {
    const stopWords = new Set([
      'the',
      'and',
      'for',
      'with',
      'what',
      'about',
      'hay',
      'tra',
      'loi',
      'ngan',
      'gon',
      'mot',
      'cau',
    ]);

    const terms = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((term) => term.length >= 3 && !stopWords.has(term));

    return Array.from(new Set(terms)).slice(0, 6);
  }

  private scoreTextMatch(content: string, query: string, terms: string[]): number {
    const normalizedContent = content.toLowerCase();
    const normalizedQuery = query.toLowerCase();

    let score = normalizedContent.includes(normalizedQuery) ? 10 : 0;

    for (const term of terms) {
      if (normalizedContent.includes(term)) {
        score += 1;
      }
    }

    return score;
  }

  private async searchBySkillText(
    skill: Skill,
    query: string,
    matchCount: number = 3,
  ): Promise<RagDocument[]> {
    const terms = this.buildSearchTerms(query);

    if (terms.length === 0) {
      return [];
    }

    const filters = terms.map((term) => `content.ilike.%${term}%`);
    const tableName = SKILL_TABLES[skill];
    const queryBuilder = this.client
      .from(tableName)
      .select('id,content,metadata,embedding')
      .or(filters.join(','));

    const { data, error } = await queryBuilder.limit(Math.max(matchCount * 4, 12));

    if (error) {
      console.error(`Supabase ${skill} text search error:`, error);
      return [];
    }

    return (data || [])
      .map((doc) => ({
        doc,
        score: this.scoreTextMatch(doc.content || '', query, terms),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, matchCount)
      .map(({ doc }) => doc as RagDocument);
  }

  async searchBySkill(
    skill: Skill,
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

  private async searchSkill(
    skill: Skill,
    query: string,
    matchThreshold: number = 0.6,
    matchCount: number = 3,
  ): Promise<RagDocument[]> {
    try {
      const embedding = await this.createEmbedding(query);

      if (embedding.length > 0) {
        const vectorResults = await this.searchBySkill(
          skill,
          embedding,
          matchThreshold,
          matchCount,
        );

        if (vectorResults.length > 0) {
          return vectorResults;
        }
      }
    } catch (error: any) {
      console.warn(
        `Embedding search unavailable for ${skill}, falling back to text search:`,
        error?.message || error,
      );
    }

    return this.searchBySkillText(skill, query, matchCount);
  }

  async searchReading(query: string): Promise<RagDocument[]> {
    return this.searchSkill('reading', query);
  }

  async searchListening(query: string): Promise<RagDocument[]> {
    return this.searchSkill('listening', query);
  }

  async searchSpeaking(query: string): Promise<RagDocument[]> {
    return this.searchSkill('speaking', query);
  }

  async searchWriting(query: string): Promise<RagDocument[]> {
    return this.searchSkill('writing', query);
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
