import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("Fetching all 70 questions for inspection...");
  const { data: questions, error } = await supabase
    .from('questions')
    .select('*')
    .eq('examId', 'f6efc518-82b0-4a6b-b957-cec4a1fd0969');
    
  if (error) {
    console.error("DB error:", error);
    return;
  }
  
  console.log(`Successfully fetched ${questions?.length} questions.`);
  
  questions?.forEach((q, idx) => {
    const errors: string[] = [];
    if (!q.id) errors.push("Missing id");
    if (!q.questionText) errors.push("Missing questionText");
    if (!q.topic) errors.push("Missing topic");
    if (q.correctAnswerIndex === undefined || q.correctAnswerIndex === null) errors.push("Missing correctAnswerIndex");
    if (!q.options) {
      errors.push("Missing options");
    } else if (!Array.isArray(q.options)) {
      errors.push(`options is not an array: ${typeof q.options}`);
    } else if (q.options.length === 0) {
      errors.push("options array is empty");
    }
    
    if (errors.length > 0) {
      console.log(`[!] Question Index ${idx} (ID: ${q.id}) has errors:`, errors);
      console.log(JSON.stringify(q, null, 2));
    }
  });
  
  console.log("Inspection complete.");
}

run().catch(console.error);
