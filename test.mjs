import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  const newExam = {
    name: 'TEST EXAM TO DELETE',
    description: 'Test',
    icon: 'TEST',
    category: 'popular'
  };
  const { data: insData, error: insErr } = await supabase.from('exams').insert([newExam]).select().single();
  if (insErr) { console.log('Insert err', insErr); return; }
  console.log('Inserted exam:', insData.id);
  
  const { data: delData, error: delErr } = await supabase.from('exams').delete().eq('id', insData.id).select();
  console.log('Delete result:', delData, delErr);
}
test();
