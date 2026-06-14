import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: questions, error } = await supabase.from('questions').select('*').limit(1);
  if (error) {
    console.error('Error fetching questions:', error);
    return;
  }
  if (questions && questions.length > 0) {
    console.log('Columns in questions table:', Object.keys(questions[0]));
    console.log('Sample question:', JSON.stringify(questions[0], null, 2));
  } else {
    console.log('No questions found in the table.');
  }
}

run();
