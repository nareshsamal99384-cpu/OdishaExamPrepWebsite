import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';

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
}

export interface TestSeries {
  id?: string;
  examId: string;
  title: string;
  description: string;
  price: number;
  durationDays: number;
  testIds: string[];
}

export interface MockTest {
  id?: string;
  seriesId: string;
  title: string;
  durationMinutes: number;
  totalMarks: number;
  questions?: Question[];
}

// --- Services ---

export const examService = {
  // Questions
  async addQuestion(question: Question) {
    return addDoc(collection(db, 'questions'), {
      ...question,
      createdAt: Timestamp.now()
    });
  },

  async getQuestionsByExam(examId: string) {
    const q = query(collection(db, 'questions'), where('examId', '==', examId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
  },

  // Test Series
  async createTestSeries(series: TestSeries) {
    return addDoc(collection(db, 'testSeries'), {
      ...series,
      createdAt: Timestamp.now()
    });
  },

  async getTestSeriesByExam(examId: string) {
    const q = query(collection(db, 'testSeries'), where('examId', '==', examId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestSeries));
  },

  // Mock Tests
  async createMockTest(test: MockTest) {
    return addDoc(collection(db, 'mockTests'), {
      ...test,
      createdAt: Timestamp.now()
    });
  },

  async getMockTestsBySeries(seriesId: string) {
    const q = query(collection(db, 'mockTests'), where('seriesId', '==', seriesId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MockTest));
  }
};
