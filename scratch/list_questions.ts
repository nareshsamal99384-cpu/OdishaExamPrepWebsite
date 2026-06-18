import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, examId, topic');
  if (error) {
    console.error('Error fetching questions:', error);
    return;
  }

  const { data: exams } = await supabase.from('exams').select('id, name');
  const examMap = new Map((exams ?? []).map(e => [e.id, e.name]));

  const grouped = (questions ?? []).reduce((acc: any, q: any) => {
    const examName = examMap.get(q.examId) || q.examId;
    if (!acc[examName]) acc[examName] = {};
    acc[examName][q.topic] = (acc[examName][q.topic] || 0) + 1;
    return acc;
  }, {});

  console.log('All questions by exam and topic:', JSON.stringify(grouped, null, 2));
}

run();
