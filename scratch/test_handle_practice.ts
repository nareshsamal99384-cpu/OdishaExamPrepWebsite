import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, anonKey);

// Mock dynamicQuestionBanks
const dynamicQuestionBanks = {
  "topic-wise": [
    {
      id: "a6824a48-3ad7-4c11-8f97-123f2cd238e4",
      title: "Engineering Mechanics Master Set",
      questions: 1498,
      examId: "f6efc518-82b0-4a6b-b957-cec4a1fd0969",
      isPremium: false
    }
  ]
};

const practiceSettings = {
  topic: "a6824a48-3ad7-4c11-8f97-123f2cd238e4",
  examId: "f6efc518-82b0-4a6b-b957-cec4a1fd0969",
  questions: "20",
  timeLimit: "30"
};

const selectedExam = "f6efc518-82b0-4a6b-b957-cec4a1fd0969";

async function simulate() {
  console.log("Simulating handleStartDynamicPractice try-catch...");
  try {
    const flatBanks = Object.values(dynamicQuestionBanks).flat() as any[];
    const topicBank = flatBanks.find(b => b.id === practiceSettings.topic);

    const effectiveExamId = selectedExam || topicBank?.examId || practiceSettings.examId;
    const bankTopicName = topicBank ? topicBank.title : practiceSettings.topic;

    console.log("effectiveExamId:", effectiveExamId);
    console.log("bankTopicName:", bankTopicName);

    if (!effectiveExamId) {
      console.log("No effectiveExamId");
      return;
    }

    // Run the actual query
    console.log("Querying questions from database...");
    const { data, error } = await supabase.from('questions').select('*').eq('examId', effectiveExamId);
    if (error) {
      console.log("Database returned error during query:", error);
      throw error;
    }
    
    console.log("Query returned", data?.length, "rows.");

    let matchedQs = data || [];
    if (bankTopicName) {
      matchedQs = matchedQs.filter((q: any) => 
         (q.topic && q.topic.toLowerCase().includes(bankTopicName.toLowerCase())) || 
         (bankTopicName.toLowerCase().includes((q.topic || '').toLowerCase()))
      );
    }
    
    console.log("Filtered matchedQs length:", matchedQs.length);

    if (matchedQs.length === 0) {
      console.log("matchedQs.length is 0. Would alert: Oh no! You haven't added any questions...");
      return;
    }

    const limit = Number(practiceSettings.questions) || matchedQs.length;
    const duration = Number(practiceSettings.timeLimit) || 30;
    const shuffled = matchedQs.sort(() => 0.5 - Math.random());
    const finalQuestions = shuffled.slice(0, limit);

    console.log("Mapping finalQuestions to practiceTest...");
    const practiceTest = {
      id: `practice-${Date.now()}`,
      title: `${bankTopicName} - Practice Session`,
      durationMinutes: duration,
      isPremium: false,
      examId: topicBank?.examId || effectiveExamId,
      questions: finalQuestions.map(q => {
        const item: any = {
          id: q.id,
          questionText: q.questionText,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
          explanation: q.explanation || 'No explanation provided.'
        };
        if (q.diagram !== undefined && q.diagram !== null) {
          item.diagram = q.diagram;
        }
        return item;
      })
    };
    
    console.log("Practice Test successfully compiled:", practiceTest.title, "with", practiceTest.questions.length, "questions.");
  } catch (err: any) {
    console.error("CAUGHT EXCEPTION:", err);
    console.error("Error stack trace:", err.stack);
  }
}

simulate().catch(console.error);
