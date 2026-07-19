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
    .eq('examId', '226fc62b-8a66-4238-9873-e69d2990ee80')
    .eq('topic', 'Medical-Surgical Nursing I');
    
  console.log("Result Error:", error);
  console.log("Result Data Length:", data ? data.length : null);
}

run().catch(console.error);
