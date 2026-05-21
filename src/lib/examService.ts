import { supabase, supabaseAdmin } from './supabase';

// --- Types ---

export interface Question {
  id?: string;
  examId: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  sortOrder?: number;
  createdAt?: string;
}

export interface TestSeries {
  id?: string;
  examId: string;
  title: string;
  description: string;
  price: number;
  durationDays: number;
  testIds: string[];
  sortOrder?: number;
  createdAt?: string;
}

export interface MockTest {
  id?: string;
  seriesId: string;
  title: string;
  durationMinutes: number;
  totalMarks: number;
  questions?: Question[];
  sortOrder?: number;
  createdAt?: string;
}

export interface Exam {
  id?: string;
  name: string;
  description: string;
  icon: string;
  category: 'popular' | 'upcoming' | 'blog' | 'system';
  examDate?: string;
  targetExamId?: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  sortOrder?: number;
  createdAt?: string;
}

export interface QuestionBank {
  id?: string;
  examId: string;
  type: string; // 'topic-wise', 'exam-focused', 'revision-sets', 'pyq-collections'
  title: string;
  questionCount: number;
  tagline: string;
  image: string;
  isPremium: boolean;
  pdfUrl?: string;
  hasPracticeMode?: boolean;
  sortOrder?: number;
  createdAt?: string;
}

// --- Services ---

export const examService = {
  // Questions
  async addQuestion(question: Question) {
    const { data, error } = await supabaseAdmin
      .from('questions')
      .insert([question])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async addQuestionsBulk(questions: Question[]) {
    const { data, error } = await supabaseAdmin
      .from('questions')
      .insert(questions)
      .select();
    if (error) throw error;
    return data;
  },

  async getAllQuestions() {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('sortOrder', { ascending: true });
    if (error) throw error;
    return data as Question[];
  },

  async deleteQuestion(id: string) {
    const { error } = await supabaseAdmin
      .from('questions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async updateQuestion(id: string, updates: Partial<Question>) {
    const { data, error } = await supabaseAdmin
      .from('questions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Test Series
  async createTestSeries(series: TestSeries) {
    const { data, error } = await supabaseAdmin
      .from('testSeries')
      .insert([series])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getAllTestSeries() {
    const { data, error } = await supabase
      .from('testSeries')
      .select('*')
      .order('sortOrder', { ascending: true });
    if (error) throw error;
    return data as TestSeries[];
  },

  async deleteTestSeries(id: string) {
    const { error } = await supabaseAdmin
      .from('testSeries')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async updateTestSeries(id: string, updates: Partial<TestSeries>) {
    const { data, error } = await supabaseAdmin
      .from('testSeries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Mock Tests
  async createMockTest(test: MockTest) {
    const { questions, ...testData } = test;
    const { data, error } = await supabaseAdmin
      .from('mockTests')
      .insert([testData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getAllMockTests() {
    const { data: tests, error: testsError } = await supabase
      .from('mockTests')
      .select('*')
      .order('sortOrder', { ascending: true });
    if (testsError) throw testsError;

    if (!tests || tests.length === 0) return [];

    const testIds = tests.map(t => `mockTest__${t.id}`);
    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('*')
      .in('topic', testIds);

    if (qError) {
      console.error("Error fetching mock test questions", qError);
      return tests as MockTest[];
    }

    return tests.map(t => ({
      ...t,
      questions: questions.filter(q => q.topic === `mockTest__${t.id}`)
    })) as MockTest[];
  },

  /**
   * Lightweight version for dashboard display — fetches only test metadata
   * WITHOUT the full question array. Much faster and smaller payload.
   * Use this for listing tests; use getQuestionsForMockTest() when starting a test.
   */
  async getAllMockTestsLite() {
    const { data: tests, error } = await supabase
      .from('mockTests')
      .select('*')
      .order('sortOrder', { ascending: true });
    if (error) throw error;

    // Fast query to get question counts by fetching only the topic string
    const testIds = (tests ?? []).map(t => `mockTest__${t.id}`);
    const { data: qTopics } = await supabase
      .from('questions')
      .select('topic')
      .in('topic', testIds);
      
    const countMap: Record<string, number> = {};
    if (qTopics) {
      qTopics.forEach(q => {
        if (q.topic) {
          countMap[q.topic] = (countMap[q.topic] || 0) + 1;
        }
      });
    }

    // The `seriesId` column may contain either:
    //   - A UUID string (for tests linked to a real testSeries row)
    //   - A JSON/JSONB object like {examId, isPremium, category, price, ...}
    //     (used by the admin panel to store exam metadata inline)
    // Parse it to expose virtual `examId` and `isPremium` fields on each test.
    return (tests ?? []).map((t: any) => {
      let examId: string | null = t.examId || null;
      let isPremium = t.isPremium ?? false;
      let category: string | null = t.category || null;

      let seriesData = t.seriesId;
      if (typeof seriesData === 'string' && seriesData.startsWith('{')) {
        try { seriesData = JSON.parse(seriesData); } catch(e) {}
      }

      if (seriesData && typeof seriesData === 'object') {
        examId   = examId   || seriesData.examId   || null;
        isPremium = seriesData.isPremium ?? isPremium;
        category  = category  || seriesData.category  || null;
      }

      const _questionCount = countMap[`mockTest__${t.id}`] || 0;

      return { ...t, examId, isPremium, category, _questionCount };
    }) as MockTest[];
  },

  async deleteMockTest(id: string) {
    const { error } = await supabaseAdmin
      .from('mockTests')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async updateMockTest(id: string, updates: Partial<MockTest>) {
    const { questions, ...updateData } = updates;
    const { data, error } = await supabaseAdmin
      .from('mockTests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getQuestionsForMockTest(mockTestId: string) {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('topic', `mockTest__${mockTestId}`);
    if (error) throw error;
    return data as Question[];
  },

  async addQuestionsToMockTest(mockTestId: string, examId: string, questions: Partial<Question>[]) {
    const payload = questions.map(q => ({
      examId: examId || 'generic',
      topic: `mockTest__${mockTestId}`,
      difficulty: q.difficulty || 'medium',
      questionText: q.questionText,
      options: q.options,
      correctAnswerIndex: q.correctAnswerIndex,
      explanation: q.explanation || ''
    }));
    const { data, error } = await supabaseAdmin
      .from('questions')
      .insert(payload);
    if (error) throw error;
    return data;
  },

  // Exams
  async addExam(exam: Exam) {
    const { data, error } = await supabaseAdmin
      .from('exams')
      .insert([exam])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getAllExams() {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .order('sortOrder', { ascending: true });
    if (error) throw error;
    return data as Exam[];
  },

  async deleteExam(id: string) {
    // Delete associated questions first
    const { error: questionsError } = await supabaseAdmin
      .from('questions')
      .delete()
      .eq('examId', id);
    if (questionsError) throw questionsError;

    // Delete associated question banks
    await supabaseAdmin.from('questionBanks').delete().eq('examId', id);

    // Delete associated test series
    await supabaseAdmin.from('testSeries').delete().eq('examId', id);

    // Delete associated mock tests (seriesId contains JSON with examId)
    await supabaseAdmin.from('mockTests').delete().like('seriesId', `%"examId":"${id}"%`);

    // Delete the exam
    const { error } = await supabaseAdmin
      .from('exams')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async updateExam(id: string, updates: Partial<Exam>) {
    const { data, error } = await supabaseAdmin
      .from('exams')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Question Banks
  async createQuestionBank(bank: QuestionBank) {
    const { data, error } = await supabaseAdmin
      .from('questionBanks')
      .insert([bank])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getAllQuestionBanks() {
    const { data, error } = await supabase
      .from('questionBanks')
      .select('*')
      .order('sortOrder', { ascending: true });
    if (error) throw error;
    return data as QuestionBank[];
  },

  async deleteQuestionBank(id: string) {
    const { error } = await supabaseAdmin
      .from('questionBanks')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async updateQuestionBank(id: string, updates: Partial<QuestionBank>) {
    const { data, error } = await supabaseAdmin
      .from('questionBanks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
