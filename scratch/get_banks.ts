import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const { data: banks, error } = await supabase
    .from('questionBanks')
    .select('*')
    .eq('examId', 'f6efc518-82b0-4a6b-b957-cec4a1fd0969');
    
  if (error) {
    console.error("Error fetching banks:", error);
    return;
  }
  
  console.log("Question Banks:", JSON.stringify(banks, null, 2));
}

run().catch(console.error);
