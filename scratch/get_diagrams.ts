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
    if (q.diagram) {
      console.log(`\n=================== QUESTION ID: ${q.id} ===================`);
      console.log(`Question Text: ${q.questionText}`);
      console.log(`Diagram JSON:`, JSON.stringify(q.diagram, null, 2));
    }
  });
}

run();
