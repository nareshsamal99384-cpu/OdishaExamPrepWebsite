import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: tests, error } = await supabase
    .from('mockTests')
    .select('*')
    .order('sortOrder', { ascending: true });
  if (error) {
    console.error('Error fetching mockTests:', error);
    return;
  }

  const testIds = (tests ?? []).map(t => `mockTest__${t.id}`);
  const { data: qTopics } = await supabase
    .from('questions')
    .select('topic')
    .in('topic', testIds);
    
  const countMap: Record<string, number> = {};
  if (qTopics) {
    qTopics.forEach(q => {
      if (q.topic) {
        countMap[q.topic] = (countMap[q.topic] || 0) + 1;
      }
    });
  }

  const results = (tests ?? []).map((t: any) => {
    const _questionCount = countMap[`mockTest__${t.id}`] || 0;
    return { id: t.id, title: t.title, _questionCount };
  });

  console.log('Lite Mock Tests question count mapping:', JSON.stringify(results, null, 2));
}

run();
