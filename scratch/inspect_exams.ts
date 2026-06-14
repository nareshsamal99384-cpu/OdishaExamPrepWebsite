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
  const { data: exams, error } = await supabase.from('exams').select('id, name, category');
  if (error) {
    console.error('Error fetching exams:', error);
    return;
  }
  console.log('--- ALL EXAMS ---');
  exams.forEach(e => {
    console.log(`- ID: ${e.id}, Name: ${e.name}, Category: ${e.category}`);
  });
}

run();
