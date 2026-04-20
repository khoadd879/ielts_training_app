const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment
require('dotenv').config({ path: '/home/khoa/Documents/ielts_training_app/ai-workers/.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const EXPORT_DIR = '/home/khoa/Documents/Ielts_Project/Data/embeddings/exports';

const COLLECTIONS = [
  { name: 'ielts_reading', file: 'export_ielts_reading.json', skill: 'reading' },
  { name: 'ielts_listening', file: 'export_ielts_listening.json', skill: 'listening' },
  { name: 'ielts_speaking', file: 'export_ielts_speaking.json', skill: 'speaking' },
  { name: 'ielts_writing', file: 'export_ielts_writing.json', skill: 'writing' }
];

async function importToSupabase() {
  console.log('Connecting to Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  for (const col of COLLECTIONS) {
    console.log(`\n=== Importing ${col.name} ===`);

    const filePath = path.join(EXPORT_DIR, col.file);

    if (!fs.existsSync(filePath)) {
      console.log(`  File not found: ${filePath}`);
      continue;
    }

    console.log(`  Reading ${filePath}...`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`  Total records: ${data.length}`);

    // Insert in batches
    const BATCH_SIZE = 100;
    let inserted = 0;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);

      const records = batch.map(item => ({
        id: item.id,
        content: item.document || item.metadata?.chunk_text || '',
        metadata: item.metadata || {},
        embedding: item.embedding,
        skill: col.skill
      }));

      const { error } = await supabase
        .from(col.name)
        .upsert(records, { onConflict: 'id' });

      if (error) {
        console.error(`  Error inserting batch ${i}:`, error.message);
        continue;
      }

      inserted += batch.length;
      console.log(`  Inserted ${inserted}/${data.length}`);
    }

    console.log(`  ✅ ${col.name}: ${inserted} records imported`);
  }

  console.log('\n=== Import Complete ===');
}

importToSupabase().catch(console.error);