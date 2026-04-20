import assert from 'node:assert/strict';
import test from 'node:test';
import { SupabaseService } from './supabase.service';

test('falls back to text search when query embedding generation is unavailable', async () => {
  const service = new SupabaseService('https://example.supabase.co', 'test-service-key');

  const textSearchResults = [
    {
      id: 'speaking-doc-1',
      content: 'IELTS Speaking includes Part 1, Part 2, and Part 3.',
      metadata: {
        source: 'speaking.json',
        category: 'speaking',
      },
      embedding: [],
    },
  ];

  const queryBuilder = {
    select() {
      return this;
    },
    or() {
      return this;
    },
    limit() {
      return Promise.resolve({ data: textSearchResults, error: null });
    },
  };

  (service as any).client = {
    rpc: async () => ({ data: [], error: null }),
    from: () => queryBuilder,
  };

  (service as any).createEmbedding = async () => {
    throw new Error('model_not_found');
  };

  const results = await service.searchSpeaking('IELTS speaking la gi?');

  assert.deepEqual(results, textSearchResults);
});
