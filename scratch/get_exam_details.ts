import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const { data: exam, error } = await supabase
    .from('exams')
    .select('id, name, description')
    .eq('id', 'f6efc518-82b0-4a6b-b957-cec4a1fd0969')
    .single();
    
  if (error) {
    console.error("Error fetching exam:", error);
    return;
  }
  
  console.log("Exam details:", JSON.stringify(exam, null, 2));
}

run().catch(console.error);
