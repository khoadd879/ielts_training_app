import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function deleteSpeaking() {
  console.log('Deleting speaking records from Supabase...');

  const { count, error } = await supabase
    .from('rag_documents')
    .delete()
    .eq('metadata->>skill', 'speaking')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Delete error:', error);
    return;
  }

  console.log(`Deleted ${count} speaking records`);
}

deleteSpeaking().catch(console.error);
