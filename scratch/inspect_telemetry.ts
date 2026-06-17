import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching questions with diagrams...');
  const { data, error } = await supabase
    .from('questions')
    .select('id, questionText, diagram')
    .not('diagram', 'is', null)
    .limit(10);

  if (error) {
    console.error('Error fetching questions:', error);
  } else {
    console.log(`Found ${data?.length || 0} questions:`);
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
