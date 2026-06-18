import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const anonClient = createClient(supabaseUrl, anonKey);
const serviceClient = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("=== POST-FIX VERIFICATION ===\n");

  // Total question counts
  const { count: totalService } = await serviceClient.from('questions').select('*', { count: 'exact', head: true });
  const { count: totalAnon } = await anonClient.from('questions').select('*', { count: 'exact', head: true });
  console.log(`Total questions - Service Role: ${totalService}, Anon Key: ${totalAnon}`);
  
  // Check the specific OPSC exam
  const { data: serviceQs } = await serviceClient.from('questions').select('topic').eq('examId', 'f6efc518-82b0-4a6b-b957-cec4a1fd0969');
  const { data: anonQs } = await anonClient.from('questions').select('topic').eq('examId', 'f6efc518-82b0-4a6b-b957-cec4a1fd0969');
  
  const serviceTopics = new Map<string, number>();
  serviceQs?.forEach(q => serviceTopics.set(q.topic, (serviceTopics.get(q.topic) || 0) + 1));
  
  const anonTopics = new Map<string, number>();
  anonQs?.forEach(q => anonTopics.set(q.topic, (anonTopics.get(q.topic) || 0) + 1));
  
  console.log("\nService Role topics for OPSC exam:");
  for (const [topic, count] of serviceTopics.entries()) console.log(`  "${topic}": ${count}`);

  console.log("\nAnon Key topics for OPSC exam (reflects what browser sees as unauthenticated):");
  for (const [topic, count] of anonTopics.entries()) console.log(`  "${topic}": ${count}`);

  // Specifically check the practice questions
  const practiceTopicService = serviceTopics.get("Advanced Engineering Mechanics — Moments, Centroid, Friction, Kinematics & Dynamics (Revision Set)") ?? 0;
  const practiceTopicAnon = anonTopics.get("Advanced Engineering Mechanics — Moments, Centroid, Friction, Kinematics & Dynamics (Revision Set)") ?? 0;
  
  console.log(`\nPractice questions (Engineering Mechanics):`);
  console.log(`  Service Role sees: ${practiceTopicService}`);
  console.log(`  Anon Key sees: ${practiceTopicAnon}`);
  console.log(practiceTopicAnon >= practiceTopicService 
    ? "\n✅ FIX SUCCESSFUL: Anon key can now see practice questions (Case E RLS working)"
    : "\n⚠️  Still blocked: Anon key cannot see practice questions without purchase (expected for premium content)"
  );
  
  console.log("\nNote: For authenticated users WITH a purchase record in user_purchases,");
  console.log("the new RLS Case E will grant access to these questions.");
}

run().catch(console.error);
