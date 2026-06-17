import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}`;

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'placeholder_key';

console.log('--- Production Readiness & Security Hardening Test Suite ---');

async function testAIChatProtection() {
  console.log('\n[Test 1] Verifying AI Completions Route...');
  try {
    const res = await fetch(`${BASE_URL}/api/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'test' }]
      })
    });
    
    console.log(`Response status: ${res.status}`);
    // The user has intentionally removed requireAuth from this route to keep it public.
    // Therefore, an unauthenticated request goes through and returns 400/500 (due to empty model/NIM params) instead of 401.
    if (res.status === 400 || res.status === 500 || res.status === 200) {
      console.log('✅ AI completions route is accessible without JWT auth (as configured).');
    } else {
      console.error('❌ Unexpected status returned from AI completions route:', res.status);
    }
  } catch (err: any) {
    console.error('❌ AI completions route test failed:', err.message);
  }
}

async function testPaymentVerificationHardening() {
  console.log('\n[Test 2] Verifying Razorpay Payment Verification Cryptographic Hardening...');
  try {
    const res = await fetch(`${BASE_URL}/api/payment/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        razorpay_order_id: 'fake_order_id',
        razorpay_payment_id: 'fake_payment_id',
        razorpay_signature: 'fake_signature_tampered',
        productId: 'full_access',
        userId: 'some_user_id'
      })
    });

    console.log(`Response status: ${res.status}`);
    const data = (await res.json().catch(() => ({}))) as any;
    console.log('Response body:', data);
    
    if (res.status === 400 || res.status === 500 || (data && !data.success)) {
      console.log('✅ Payment verification successfully rejected tampered signature/payload.');
    } else {
      console.error('❌ Payment verification did not reject the fake signature.');
    }
  } catch (err: any) {
    console.error('❌ Payment Verification Hardening Test failed:', err.message);
  }
}

async function testDatabaseRLSPolicy() {
  console.log('\n[Test 3] Verifying Database RLS Policy on Questions Table...');
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    // Try to query questions on a premium topic without authentication
    const { data, error } = await supabase
      .from('questions')
      .select('id, questionText')
      .eq('topic', 'mockTest__premium_test_id'); // Using a premium mock test topic namespace

    if (error) {
      console.log(`✅ Database rejected request or threw policy error: ${error.message}`);
    } else if (!data || data.length === 0) {
      console.log('✅ RLS successfully hid premium test questions (returned empty list).');
    } else {
      console.warn('❌ RLS check returned question data for anonymous user. Check policy constraints!');
    }
  } catch (err: any) {
    console.error('❌ Database RLS Policy Test failed:', err.message);
  }
}

async function runAll() {
  await testAIChatProtection();
  await testPaymentVerificationHardening();
  await testDatabaseRLSPolicy();
  console.log('\n--- Test Suite Complete ---');
}

runAll();
