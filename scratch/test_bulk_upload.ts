import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  
  console.log('Logging in to Supabase as admin...');
  const { data, error } = await supabase.auth.signInWithPassword({ email: email || '', password: password || '' });
  if (error) {
    console.error('Login failed:', error);
    return;
  }
  
  const token = data.session?.access_token;
  console.log('Logged in successfully. Token length:', token?.length);
  
  const PORT = process.env.PORT || 3001;
  const url = `http://localhost:${PORT}/api/admin/questions/bulk`;
  
  const testQuestion = {
    examId: 'f6efc518-82b0-4a6b-b957-cec4a1fd0969', // OPSC civil services or generic
    topic: 'test_bulk_topic',
    difficulty: 'easy',
    questionText: 'Test bulk question text',
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctAnswerIndex: 1,
    explanation: 'Test explanation'
  };

  console.log(`Sending bulk upload request to ${url}...`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ questions: [testQuestion] })
    });
    
    console.log('Response status:', res.status);
    const body = await res.json();
    console.log('Response body:', JSON.stringify(body, null, 2));
    
    if (res.status === 200 && body.success) {
      console.log('Bulk upload test PASSED!');
    } else {
      console.error('Bulk upload test FAILED!');
    }

    // Clean up
    console.log('Cleaning up test question from database...');
    const { error: deleteError } = await supabase.from('questions').delete().eq('topic', 'test_bulk_topic');
    if (deleteError) {
      console.error('Cleanup failed:', deleteError);
    } else {
      console.log('Cleanup successful.');
    }
  } catch (err) {
    console.error('Request error:', err);
  }
}

run();
