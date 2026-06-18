import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, anonKey);

async function run() {
  console.log("Querying questions table using Anon client...");
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('examId', 'f6efc518-82b0-4a6b-b957-cec4a1fd0969');
    
  console.log("Result Error:", error);
  console.log("Result Data Length:", data ? data.length : null);
}

run().catch(console.error);
