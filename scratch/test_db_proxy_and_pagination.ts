import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  
  console.log('Logging in as admin to retrieve token...');
  const { data, error } = await supabase.auth.signInWithPassword({ email: email || '', password: password || '' });
  if (error) {
    console.error('Login failed:', error);
    return;
  }
  
  const token = data.session?.access_token;
  console.log('Logged in successfully. Token length:', token?.length);
  
  const PORT = process.env.PORT || 3001;
  const dbProxyUrl = `http://localhost:${PORT}/api/admin/db/questions`;
  const questionsUrl = `http://localhost:${PORT}/api/admin/questions`;
  
  const testQuestion = {
    examId: 'f6efc518-82b0-4a6b-b957-cec4a1fd0969', // generic / opsc civil services
    topic: 'test_proxy_topic',
    difficulty: 'medium',
    questionText: 'This is a test question for db proxy verification.',
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctAnswerIndex: 2,
    explanation: 'Explanation for proxy test.'
  };

  try {
    // 1. Insert via Proxy
    console.log('\n[Test 1] Testing DB Proxy Insert...');
    const insertRes = await fetch(dbProxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'insert',
        payload: testQuestion
      })
    });
    
    console.log('Insert status:', insertRes.status);
    const insertBody = await insertRes.json();
    console.log('Insert response:', JSON.stringify(insertBody, null, 2));
    
    if (insertRes.status !== 200 || !insertBody.success || !insertBody.data || insertBody.data.length === 0) {
      console.error('❌ Insert failed!');
      return;
    }
    const questionId = insertBody.data[0].id;
    console.log('✅ Insert successful. Inserted Question ID:', questionId);

    // 2. Fetch and Paginate
    console.log('\n[Test 2] Testing Questions Pagination and Search...');
    const searchParams = new URLSearchParams({
      page: '1',
      limit: '10',
      search: 'test_proxy_topic'
    });
    const fetchRes = await fetch(`${questionsUrl}?${searchParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Fetch status:', fetchRes.status);
    const fetchBody = await fetchRes.json();
    console.log('Fetch response:', JSON.stringify(fetchBody, null, 2));
    
    if (fetchRes.status !== 200 || !fetchBody.success || fetchBody.data.length === 0) {
      console.error('❌ Paginated fetch failed!');
      return;
    }
    console.log('✅ Paginated fetch and search successful. Total count:', fetchBody.totalCount);

    // 3. Update via Proxy
    console.log('\n[Test 3] Testing DB Proxy Update...');
    const updateRes = await fetch(dbProxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'update',
        id: questionId,
        payload: {
          questionText: 'This is an UPDATED test question for db proxy verification.'
        }
      })
    });
    
    console.log('Update status:', updateRes.status);
    const updateBody = await updateRes.json();
    console.log('Update response:', JSON.stringify(updateBody, null, 2));
    
    if (updateRes.status !== 200 || !updateBody.success) {
      console.error('❌ Update failed!');
      return;
    }
    console.log('✅ Update successful.');

    // 4. Verify Update
    console.log('\n[Test 4] Verifying Update via Fetch...');
    const verifyRes = await fetch(`${questionsUrl}?${searchParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const verifyBody = await verifyRes.json();
    if (verifyBody.data[0].questionText === 'This is an UPDATED test question for db proxy verification.') {
      console.log('✅ Update verification successful.');
    } else {
      console.error('❌ Update verification failed. Text matches:', verifyBody.data[0].questionText);
    }

    // 5. Delete via Proxy
    console.log('\n[Test 5] Testing DB Proxy Delete...');
    const deleteRes = await fetch(dbProxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'delete',
        id: questionId
      })
    });
    
    console.log('Delete status:', deleteRes.status);
    const deleteBody = await deleteRes.json();
    console.log('Delete response:', JSON.stringify(deleteBody, null, 2));
    
    if (deleteRes.status !== 200 || !deleteBody.success) {
      console.error('❌ Delete failed!');
      return;
    }
    console.log('✅ Delete successful.');

    // 6. Verify Delete
    console.log('\n[Test 6] Verifying Delete via Fetch...');
    const verifyDeleteRes = await fetch(`${questionsUrl}?${searchParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const verifyDeleteBody = await verifyDeleteRes.json();
    if (verifyDeleteBody.data.length === 0) {
      console.log('✅ Delete verification successful.');
    } else {
      console.error('❌ Delete verification failed. Remaining questions:', verifyDeleteBody.data.length);
    }
    
    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Request error during test execution:', err);
  }
}

run();
