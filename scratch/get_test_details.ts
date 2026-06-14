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

async function run() {
  const { data: test, error } = await supabase
    .from('mockTests')
    .select('*')
    .eq('id', 'a2f4f5be-3b7d-43f7-b46c-cd594e6fc740')
    .single();
  
  if (error) {
    console.error('Error fetching mock test:', error);
    return;
  }
  
  console.log(`Mock Test Title: ${test.title}`);
  console.log(`Series ID: ${test.seriesId}`);
}

run();
