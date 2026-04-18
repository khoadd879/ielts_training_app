import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

console.log('SUPABASE_URL:', SUPABASE_URL ? '***' : 'missing');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface WritingEmbedding {
  file: string;
  url: string;
  source: string;
  title: string;
  skill: string;
  text_length: number;
  embedding_dim: number;
  embedding: number[];
  chunk_count: number;
  embedded_at: string;
}

async function uploadWritingEmbeddings() {
  const filePath = '/home/khoa/Documents/Ielts_Project/Data/embeddings/writing/embeddings_20260411_170323.json';

  console.log('Loading writing embeddings...');
  const embeddings: WritingEmbedding[] = require(filePath);
  console.log(`Found ${embeddings.length} writing embeddings`);

  // Upload in batches of 50
  const batchSize = 50;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < embeddings.length; i += batchSize) {
    const batch = embeddings.slice(i, i + batchSize);
    console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(embeddings.length / batchSize)} (${i + 1}-${Math.min(i + batchSize, embeddings.length)})`);

    const records = batch.map(item => ({
      content: `Writing: ${item.title || item.file} | Source: ${item.source} | URL: ${item.url}`.substring(0, 10000),
      metadata: {
        file: item.file,
        url: item.url,
        source: item.source,
        title: item.title,
        skill: item.skill,
        text_length: item.text_length,
        chunk_count: item.chunk_count,
        embedded_at: item.embedded_at,
      },
      embedding: item.embedding,
    }));

    const { error } = await supabase.from('rag_documents').insert(records);

    if (error) {
      console.error('Batch error:', error.message);
      errorCount += batch.length;
    } else {
      successCount += batch.length;
      console.log(`  Inserted ${batch.length} records`);
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`Success: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Verify: SELECT COUNT(*), metadata->>'skill' FROM rag_documents GROUP BY 2;`);
}

uploadWritingEmbeddings().catch(console.error);
