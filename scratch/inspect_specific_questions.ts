import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const ids = [
    '080593e2-1b3b-4b74-9f4d-dcfd80469600',
    '14149df9-92c5-4eef-a5b9-f11607e26ed2',
    'a08445b1-7a45-428f-8951-a6bc6944d3f4',
    '575c38b4-017c-40ae-9881-f476ba1973f9'
  ];
  
  const { data: questions, error } = await supabase.from('questions').select('*').in('id', ids);
  if (error) {
    console.error('Error fetching questions:', error);
    return;
  }
  
  questions.forEach(q => {
    console.log(`========================================`);
    console.log(`ID: ${q.id}`);
    console.log(`TOPIC: ${q.topic}`);
    console.log(`QUESTION TEXT:\n${q.questionText}`);
    console.log(`OPTIONS: ${JSON.stringify(q.options)}`);
    console.log(`CORRECT ANSWER INDEX: ${q.correctAnswerIndex}`);
    console.log(`EXPLANATION:\n${q.explanation}`);
  });
}

run();
