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

async function inspect() {
  console.log("Querying questions table...");
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, questionText, diagram');
    
  if (error) {
    console.error("Error fetching questions:", error);
    return;
  }
  
  console.log(`Loaded ${questions.length} questions. Searching for keywords...`);
  
  for (const q of questions) {
    const txt = (q.questionText || "").toLowerCase();
    if (txt.includes("hexagon") || txt.includes("square")) {
      console.log("-----------------------------------------");
      console.log(`ID: ${q.id}`);
      console.log(`Question: ${q.questionText}`);
      console.log(`Diagram Schema:`, JSON.stringify(q.diagram, null, 2));
    }
  }
}

inspect();
