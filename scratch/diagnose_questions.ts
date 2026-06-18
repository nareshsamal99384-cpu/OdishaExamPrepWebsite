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
  console.log("=== DIAGNOSTIC RUN ===");

  // 1. Fetch Exams
  const { data: exams } = await serviceClient.from('exams').select('id, name');
  console.log(`Exams found via Service Role (${exams?.length || 0}):`);
  exams?.forEach(e => console.log(` - ID: ${e.id}, Name: ${e.name}`));

  // 2. Fetch Question Banks
  const { data: questionBanks } = await serviceClient.from('questionBanks').select('id, examId, title, isPremium, hasPracticeMode');
  console.log(`\nQuestion Banks found via Service Role (${questionBanks?.length || 0}):`);
  questionBanks?.forEach(q => console.log(` - ID: ${q.id}, ExamId: ${q.examId}, Title: "${q.title}", isPremium: ${q.isPremium}, practiceMode: ${q.hasPracticeMode}`));

  // 3. Fetch Mock Tests
  const { data: mockTests } = await serviceClient.from('mockTests').select('id, seriesId, title');
  console.log(`\nMock Tests found via Service Role (${mockTests?.length || 0}):`);
  mockTests?.forEach(mt => {
    console.log(` - ID: ${mt.id}, Title: "${mt.title}", seriesId: ${mt.seriesId}`);
  });

  // 4. Test question counts via Service Role vs Anon Key
  console.log("\n=== QUESTIONS COUNT COMPARISON ===");
  const { count: totalQService } = await serviceClient.from('questions').select('*', { count: 'exact', head: true });
  const { count: totalQAnon } = await anonClient.from('questions').select('*', { count: 'exact', head: true });
  console.log(`Total questions in table: ServiceRole=${totalQService}, AnonKey=${totalQAnon}`);

  // 5. Look at topics
  console.log("\n=== TOPICS FROM QUESTIONS (via Service Role) ===");
  const { data: qTopicsService } = await serviceClient.from('questions').select('topic');
  const serviceTopics = new Map<string, number>();
  qTopicsService?.forEach(q => {
    if (q.topic) serviceTopics.set(q.topic, (serviceTopics.get(q.topic) || 0) + 1);
  });
  console.log("Service Role found topics:");
  for (const [topic, count] of serviceTopics.entries()) {
    console.log(` - Topic: "${topic}", Count: ${count}`);
  }

  console.log("\n=== TOPICS FROM QUESTIONS (via Anon Key) ===");
  const { data: qTopicsAnon } = await anonClient.from('questions').select('topic');
  const anonTopics = new Map<string, number>();
  qTopicsAnon?.forEach(q => {
    if (q.topic) anonTopics.set(q.topic, (anonTopics.get(q.topic) || 0) + 1);
  });
  console.log("Anon Client found topics:");
  for (const [topic, count] of anonTopics.entries()) {
    console.log(` - Topic: "${topic}", Count: ${count}`);
  }
}

run().catch(console.error);
