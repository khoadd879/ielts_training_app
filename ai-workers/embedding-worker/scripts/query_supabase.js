const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/home/khoa/Documents/ielts_training_app/ai-workers/.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  console.log('SUPABASE_URL:', SUPABASE_URL ? 'set' : 'MISSING');
  console.log('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? 'set' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testRAG() {
  console.log('Testing RAG with Supabase pgvector...\n');

  // Test 1: Check if tables exist and have data
  console.log('1. Checking table counts...');
  const tables = ['ielts_reading', 'ielts_listening', 'ielts_speaking', 'ielts_writing'];

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`   ${table}: ERROR - ${error.message}`);
    } else {
      console.log(`   ${table}: ${count} records`);
    }
  }

  // Test 2: Test vector search on reading
  console.log('\n2. Testing vector search on ielts_reading...');

  // Get a sample embedding from reading
  const { data: sampleData } = await supabase
    .from('ielts_reading')
    .select('embedding, content')
    .limit(1);

  if (!sampleData || sampleData.length === 0) {
    console.log('   No data found in ielts_reading');
    return;
  }

  const testEmbedding = sampleData[0].embedding;
  console.log('   Using sample embedding from:', sampleData[0].content.substring(0, 50) + '...');

  // Perform similarity search
  const { data: searchResults, error } = await supabase
    .rpc('search_ielts_reading', {
      query_embedding: testEmbedding,
      match_threshold: 0.5,
      match_count: 3
    });

  if (error) {
    console.log('   RPC Error:', error.message);
    console.log('   Trying direct SQL query...');

    // Fallback to direct query
    const { data: directResults } = await supabase
      .from('ielts_reading')
      .select('id, content, metadata')
      .limit(3);

    if (directResults) {
      console.log('   Direct query returned:', directResults.length, 'records');
      console.log('   Sample content:', directResults[0]?.content?.substring(0, 100));
    }
  } else {
    console.log('   Search results:', searchResults.length);
    for (const result of searchResults) {
      console.log(`   - Similarity: ${result.similarity?.toFixed(4)}`);
      console.log(`     Content: ${result.content?.substring(0, 80)}...`);
      console.log('');
    }
  }

  console.log('\n3. Testing different skills...');

  for (const table of tables) {
    const { data } = await supabase
      .from(table)
      .select('content, metadata')
      .limit(1);

    if (data && data.length > 0) {
      console.log(`   ${table}: ${data[0].content?.substring(0, 60)}...`);
    }
  }

  console.log('\n✅ RAG test complete');
}

testRAG().catch(console.error);