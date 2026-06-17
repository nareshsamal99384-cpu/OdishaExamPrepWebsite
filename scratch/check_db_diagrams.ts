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
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, questionText, diagram');

  if (error) {
    console.error('Error fetching questions:', error);
    return;
  }

  questions.forEach(q => {
    if (!q.diagram) return;
    const text = q.questionText || '';
    if (
      text.includes('rectangle shown below') ||
      text.includes('triangle below, one angle') ||
      text.includes('circle below, radius') ||
      text.includes('adjacent angles on a straight line')
    ) {
      console.log(`ID: ${q.id}`);
      console.log(`Text: ${text}`);
      console.log(`Diagram:`, JSON.stringify(q.diagram, null, 2));
      console.log('---');
    }
  });
}

run();
