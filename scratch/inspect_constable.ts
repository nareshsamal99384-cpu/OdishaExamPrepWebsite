import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: exam, error } = await supabase.from('exams').select('*').eq('id', 'c8343c39-8edb-4c61-a772-05a6daa5b8a7').single();
  if (error) {
    console.error('Error fetching exam:', error);
    return;
  }
  console.log(JSON.stringify(exam, null, 2));
}

run();
