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
  const { data: questions, error } = await supabase.from('questions').select('*');
  if (error) {
    console.error('Error fetching questions:', error);
    return;
  }
  console.log(`Total questions: ${questions.length}`);
  questions.forEach(q => {
    let hasDiagram = false;
    if (q.questionText && (q.questionText.includes('diagram') || q.questionText.includes('{') || q.questionText.includes('*') || q.questionText.includes('|'))) {
      hasDiagram = true;
    }
    if (q.explanation && (q.explanation.includes('diagram') || q.explanation.includes('{') || q.explanation.includes('*') || q.explanation.includes('|'))) {
      hasDiagram = true;
    }
    if (hasDiagram) {
      console.log(`--- Question ID: ${q.id} (Topic: ${q.topic}) ---`);
      console.log(`Text: ${q.questionText.substring(0, 150)}...`);
      console.log(`Explanation: ${q.explanation?.substring(0, 150)}...`);
    }
  });
}

run();
