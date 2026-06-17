import { supabase } from './supabase';

let schemaHasDiagram: boolean | null = null;

async function checkSchemaHasDiagram(): Promise<boolean> {
  if (schemaHasDiagram !== null) return schemaHasDiagram;
  try {
    const { error } = await supabase
      .from('questions')
      .select('diagram')
      .limit(1);
    schemaHasDiagram = !error;
  } catch (e) {
    schemaHasDiagram = false;
  }
  return schemaHasDiagram;
}

async function callAdminDbProxy(table: string, action: 'insert' | 'update' | 'delete', payload?: any, id?: string, filters?: any) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error("Admin authorization token is missing. Please log in again.");
  }

  const res = await fetch(`/api/admin/db/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ action, payload, id, filters })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Failed to perform ${action} on ${table}`);
  }
  return data.data;
}

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
  diagram?: any;
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
  is_archived?: boolean;
}

export interface MockTest {
  id?: string;
  seriesId: string;
  title: string;
  durationMinutes: number;
  totalMarks: number;
  negativeMarking?: number;
  questions?: Question[];
  sortOrder?: number;
  createdAt?: string;
  is_archived?: boolean;
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
  is_archived?: boolean;
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
  is_archived?: boolean;
}

// --- Services ---

export const examService = {
  // Questions
  async addQuestion(question: Question) {
    const hasDiagramCol = await checkSchemaHasDiagram();
    const payload: any = {
      examId: question.examId,
      topic: question.topic,
      difficulty: question.difficulty,
      questionText: question.questionText,
      options: question.options,
      correctAnswerIndex: question.correctAnswerIndex,
      explanation: question.explanation
    };
    if (question.diagram && hasDiagramCol) {
      payload.diagram = question.diagram;
    }
    console.log("Single Add Payload:", payload);
    const data = await callAdminDbProxy('questions', 'insert', payload);
    return data?.[0] || data;
  },

  async addQuestionsBulk(questions: Question[]) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      throw new Error("Admin authorization token is missing. Please log in again.");
    }

    const res = await fetch('/api/admin/questions/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ questions })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to bulk upload questions');
    }
    return data.data;
  },

  async getQuestionsPaginated(page = 1, limit = 50, search = '', examId = 'all', questionFilter = 'all') {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      throw new Error("Admin authorization token is missing. Please log in again.");
    }

    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search,
      examId,
      questionFilter
    });

    const res = await fetch(`/api/admin/questions?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch paginated questions');
    }
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
    await callAdminDbProxy('questions', 'delete', undefined, id);
  },

  async updateQuestion(id: string, updates: Partial<Question>) {
    const hasDiagramCol = await checkSchemaHasDiagram();
    const payload: any = {
      examId: updates.examId,
      topic: updates.topic,
      difficulty: updates.difficulty,
      questionText: updates.questionText,
      options: updates.options,
      correctAnswerIndex: updates.correctAnswerIndex,
      explanation: updates.explanation
    };
    // Clean undefined keys
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });
    if (updates.diagram && hasDiagramCol) {
      payload.diagram = updates.diagram;
    }
    console.log("Update Payload:", payload);
    const data = await callAdminDbProxy('questions', 'update', payload, id);
    return data?.[0] || data;
  },

  // Test Series
  async createTestSeries(series: TestSeries) {
    const data = await callAdminDbProxy('testSeries', 'insert', series);
    return data?.[0] || data;
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
    // Check if purchased
    const { data: purchaseCount } = await supabase
      .from('user_purchases')
      .select('id')
      .eq('product_id', id);

    // Also check if any mock tests inside this series are purchased
    const { data: allTests } = await supabase
      .from('mockTests')
      .select('id, seriesId');
    
    const testIds = (allTests || [])
      .filter((t: any) => {
        if (t.seriesId === id) return true;
        if (typeof t.seriesId === 'string' && t.seriesId.includes(id)) return true;
        return false;
      })
      .map((t: any) => t.id);

    let hasPurchasedChildren = false;
    if (testIds.length > 0) {
      const { data: childPurchases } = await supabase
        .from('user_purchases')
        .select('id')
        .in('product_id', testIds);
      if (childPurchases && childPurchases.length > 0) {
        hasPurchasedChildren = true;
      }
    }

    const isPurchased = (purchaseCount && purchaseCount.length > 0) || hasPurchasedChildren;

    if (isPurchased) {
      // Soft delete: set is_archived = true on the testSeries, and on its mockTests
      console.log(`Test series ${id} or its mock tests have active user purchases. Archiving to protect access.`);
      await callAdminDbProxy('testSeries', 'update', { is_archived: true }, id);

      if (testIds.length > 0) {
        await callAdminDbProxy('mockTests', 'update', { is_archived: true }, undefined, { id: { op: 'in', val: testIds } });
      }
    } else {
      // Hard delete: delete associated mock tests and questions, then the series
      if (testIds.length > 0) {
        const topicIds = testIds.map(tId => `mockTest__${tId}`);
        await callAdminDbProxy('questions', 'delete', undefined, undefined, { topic: { op: 'in', val: topicIds } });
        await callAdminDbProxy('mockTests', 'delete', undefined, undefined, { id: { op: 'in', val: testIds } });
      }
      await callAdminDbProxy('testSeries', 'delete', undefined, id);
    }
  },

  async updateTestSeries(id: string, updates: Partial<TestSeries>) {
    const data = await callAdminDbProxy('testSeries', 'update', updates, id);
    return data?.[0] || data;
  },

  // Mock Tests
  async createMockTest(test: MockTest) {
    const { questions, ...testData } = test;
    const data = await callAdminDbProxy('mockTests', 'insert', testData);
    return data?.[0] || data;
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
    // Check if mock test is purchased
    const { data: purchaseCount } = await supabase
      .from('user_purchases')
      .select('id')
      .eq('product_id', id);

    if (purchaseCount && purchaseCount.length > 0) {
      // Soft delete
      console.log(`Mock test ${id} has active user purchases. Archiving to protect access.`);
      await callAdminDbProxy('mockTests', 'update', { is_archived: true }, id);
    } else {
      // Hard delete: delete associated questions first
      await callAdminDbProxy('questions', 'delete', undefined, undefined, { topic: { op: 'eq', val: `mockTest__${id}` } });
      await callAdminDbProxy('mockTests', 'delete', undefined, id);
    }
  },

  async updateMockTest(id: string, updates: Partial<MockTest>) {
    const { questions, ...updateData } = updates;
    const data = await callAdminDbProxy('mockTests', 'update', updateData, id);
    return data?.[0] || data;
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
    const hasDiagramCol = await checkSchemaHasDiagram();
    const payloads = questions.map(q => {
      const item: any = {
        examId: examId || 'generic',
        topic: `mockTest__${mockTestId}`,
        difficulty: q.difficulty || 'medium',
        questionText: q.questionText,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation || ''
      };
      if (q.diagram && hasDiagramCol) {
        item.diagram = q.diagram;
      }
      return item;
    });

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      throw new Error("Admin authorization token is missing. Please log in again.");
    }

    const res = await fetch('/api/admin/questions/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ questions: payloads })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to bulk upload mock test questions');
    }
    return data.data;
  },

  // Exams
  // Exams
  async addExam(exam: Exam) {
    const data = await callAdminDbProxy('exams', 'insert', exam);
    return data?.[0] || data;
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
    // 1. Fetch the exam details to get the name
    const { data: examData } = await supabase
      .from('exams')
      .select('name')
      .eq('id', id)
      .single();
    const examName = examData?.name;

    // 2. Fetch associated question banks
    const { data: banks } = await supabase
      .from('questionBanks')
      .select('id')
      .eq('examId', id);
    const bankIds = (banks || []).map(b => b.id);

    // 3. Fetch associated test series
    const { data: series } = await supabase
      .from('testSeries')
      .select('id')
      .eq('examId', id);
    const seriesIds = (series || []).map(s => s.id);

    // 4. Fetch associated mock tests
    const { data: allTests } = await supabase
      .from('mockTests')
      .select('id, examId, seriesId');
    
    const relatedTestIds: string[] = [];
    (allTests || []).forEach((t: any) => {
      let isRelated = t.examId === id;
      if (!isRelated && typeof t.seriesId === 'string' && t.seriesId.includes(id)) {
        isRelated = true;
      }
      if (isRelated) {
        relatedTestIds.push(t.id);
      }
    });

    // 5. Gather all content IDs to check for purchases
    const contentIdsToCheck = [
      `exam_bundle_${id}`,
      ...bankIds,
      ...seriesIds,
      ...relatedTestIds
    ];

    // Check if there are any active purchases for these items in user_purchases
    let hasPurchases = false;
    if (contentIdsToCheck.length > 0) {
      const { data: purchases } = await supabase
        .from('user_purchases')
        .select('id')
        .in('product_id', contentIdsToCheck);
      if (purchases && purchases.length > 0) {
        hasPurchases = true;
      }
    }

    if (hasPurchases) {
      console.log(`Exam ${id} has active user purchases. Performing conditional soft-delete (archiving) to protect paid users.`);
      
      // Soft-delete the exam
      await callAdminDbProxy('exams', 'update', { is_archived: true }, id);
      
      // Soft-delete associated question banks
      if (bankIds.length > 0) {
        await callAdminDbProxy('questionBanks', 'update', { is_archived: true }, undefined, { id: { op: 'in', val: bankIds } });
      }
      
      // Soft-delete associated test series
      if (seriesIds.length > 0) {
        await callAdminDbProxy('testSeries', 'update', { is_archived: true }, undefined, { id: { op: 'in', val: seriesIds } });
      }
      
      // Soft-delete associated mock tests
      if (relatedTestIds.length > 0) {
        await callAdminDbProxy('mockTests', 'update', { is_archived: true }, undefined, { id: { op: 'in', val: relatedTestIds } });
      }
      
      return; // Stop here, do not delete from database
    }

    console.log(`Exam ${id} has no active user purchases. Proceeding with hard-delete.`);
    const contentIdsToRevoke = new Set(contentIdsToCheck);

    // Revoke access and clean activities for all users in Supabase Auth
    try {
      if (supabase.auth.admin) {
        let page = 1;
        const perPage = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
            page,
            perPage
          });
          if (listError) throw listError;
          if (!users || users.length === 0) {
            hasMore = false;
            break;
          }

          for (const u of users) {
            let needsUpdate = false;
            const currentMetadata = u.user_metadata || {};

            // A. Clean up purchasedSeries
            let newPurchased = currentMetadata.purchasedSeries;
            if (Array.isArray(newPurchased)) {
              const filteredPurchased = newPurchased.filter(p => !contentIdsToRevoke.has(p));
              if (filteredPurchased.length !== newPurchased.length) {
                newPurchased = filteredPurchased;
                needsUpdate = true;
              }
            }

            // B. Clean up activities
            let newActivities = currentMetadata.activities;
            if (Array.isArray(newActivities)) {
              const filteredActivities = newActivities.filter((act: any) => {
                if (!act) return false;
                
                // Filter out by examName
                if (examName && act.metadata?.examName === examName) return false;

                // Filter out by bankId
                if (act.metadata?.bankId && bankIds.includes(act.metadata.bankId)) return false;

                // Filter out by mock test ID
                const testId = act.metadata?.test?.id;
                if (testId && relatedTestIds.includes(testId)) return false;

                return true;
              });

              if (filteredActivities.length !== newActivities.length) {
                needsUpdate = true;
                newActivities = filteredActivities;
              }
            }

            if (needsUpdate) {
              await supabase.auth.admin.updateUserById(u.id, {
                user_metadata: {
                  ...currentMetadata,
                  purchasedSeries: newPurchased,
                  activities: newActivities
                }
              });
            }
          }
          page++;
        }
      }
    } catch (err) {
      console.warn("Failed to clean up user metadata on cloud (likely service role key missing or unauthorized):", err);
    }

    // Delete associated mock test questions (topic matches mockTest__<mockTestId>)
    if (relatedTestIds.length > 0) {
      const topicIds = relatedTestIds.map(mtId => `mockTest__${mtId}`);
      await callAdminDbProxy('questions', 'delete', undefined, undefined, { topic: { op: 'in', val: topicIds } });
    }

    // Delete associated direct questions
    await callAdminDbProxy('questions', 'delete', undefined, undefined, { examId: { op: 'eq', val: id } });

    // Delete associated question banks
    await callAdminDbProxy('questionBanks', 'delete', undefined, undefined, { examId: { op: 'eq', val: id } });

    // Delete associated test series
    await callAdminDbProxy('testSeries', 'delete', undefined, undefined, { examId: { op: 'eq', val: id } });

    // Delete associated mock tests
    await callAdminDbProxy('mockTests', 'delete', undefined, undefined, { seriesId: { op: 'like', val: `%\"examId\":\"${id}\"%` } });

    // Delete the exam
    await callAdminDbProxy('exams', 'delete', undefined, id);
  },

  async updateExam(id: string, updates: Partial<Exam>) {
    const data = await callAdminDbProxy('exams', 'update', updates, id);
    return data?.[0] || data;
  },

  // Question Banks
  async createQuestionBank(bank: QuestionBank) {
    const data = await callAdminDbProxy('questionBanks', 'insert', bank);
    return data?.[0] || data;
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
    // Check if question bank is purchased
    const { data: purchaseCount } = await supabase
      .from('user_purchases')
      .select('id')
      .eq('product_id', id);

    if (purchaseCount && purchaseCount.length > 0) {
      // Soft delete
      console.log(`Question bank ${id} has active user purchases. Archiving to protect access.`);
      await callAdminDbProxy('questionBanks', 'update', { is_archived: true }, id);
    } else {
      await callAdminDbProxy('questionBanks', 'delete', undefined, id);
    }
  },

  async updateQuestionBank(id: string, updates: Partial<QuestionBank>) {
    const data = await callAdminDbProxy('questionBanks', 'update', updates, id);
    return data?.[0] || data;
  }
};
