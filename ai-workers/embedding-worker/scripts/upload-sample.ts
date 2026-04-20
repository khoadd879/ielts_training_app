import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

console.log('SUPABASE_URL:', SUPABASE_URL ? '***' : 'missing');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface ChunkData {
  record_id: string;
  parent_id: string;
  parent_file: string;
  label: string;
  unit_index: number;
  chunk_index: number;
  url: string;
  source: string;
  topic?: string;
  part?: string;
  difficulty?: string;
  skill: string;
  chunk_text: string;
  chunk_char_start: number;
  chunk_char_end: number;
  full_text_length: number;
  embedding_dim: number;
  embedding: number[];
}

async function readJSONL(filePath: string): Promise<ChunkData[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  return lines.map(line => JSON.parse(line));
}

async function insertDocument(
  content: string,
  metadata: Record<string, unknown>,
  embedding: number[]
): Promise<void> {
  const { error } = await supabase.from('rag_documents').insert({
    content,
    metadata,
    embedding,
  });

  if (error) {
    console.error('Insert error:', error);
    throw error;
  }
}

async function main() {
  const dataDir = '/home/khoa/Documents/Ielts_Project/Data/embeddings';
  const sampleFile = path.join(dataDir, 'speaking_chunks/batch_0001.jsonl');

  console.log('Reading JSONL file...');
  const chunks = await readJSONL(sampleFile);
  console.log(`Found ${chunks.length} chunks`);

  // Upload all chunks
  const testChunks = chunks;

  for (let i = 0; i < testChunks.length; i++) {
    const chunk = testChunks[i];
    console.log(`\nProcessing chunk ${i + 1}/${testChunks.length}: ${chunk.record_id}`);
    console.log(`  Text length: ${chunk.chunk_text.length}`);
    console.log(`  Embedding dim: ${chunk.embedding.length}`);

    const metadata = {
      record_id: chunk.record_id,
      parent_id: chunk.parent_id,
      source: chunk.source,
      url: chunk.url,
      skill: chunk.skill,
      topic: chunk.topic,
      part: chunk.part,
      difficulty: chunk.difficulty,
      label: chunk.label,
    };

    await insertDocument(chunk.chunk_text, metadata, chunk.embedding);
    console.log('  Inserted successfully');
  }

  console.log('\n=== Test Complete ===');
  console.log('Verify with: SELECT COUNT(*), metadata->>\'skill\' FROM rag_documents GROUP BY 2;');
}

main().catch(console.error);
