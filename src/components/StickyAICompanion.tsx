import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { examService } from '../lib/examService';
import { activityTracker } from '../lib/activityTracker';
import {
  X,
  Send,
  RotateCcw,
  Sparkles,
  Minimize2,
  ChevronDown,
  Bot,
  User,
  Loader2,
  RefreshCw,
  AlertCircle,
  BookOpen,
  Trophy,
  Award,
  ChevronRight,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface LiveSiteData {
  exams: { id: string; name: string; description: string; category: string; price?: number }[];
  mockTests: { id: string; title: string; durationMinutes: number; totalMarks: number; isPremium?: boolean; price?: number }[];
  questionBanks: { id: string; title: string; type: string; questionCount: number; isPremium: boolean; price?: number }[];
  testSeries?: { id: string; examId: string; title: string }[];
  isFullAccess?: boolean;
  history?: { 
    type: string; 
    title: string; 
    timestamp: string; 
    score?: number; 
    totalMarks?: number; 
    accuracy?: number; 
    timeSpent?: number;
    examName?: string;
    testCategory?: string;
    metadata?: any;
  }[];
  selectedExamId?: string | null;
  selectedExamName?: string | null;
  unlockedExams?: string[];
  unlockedMockTests?: string[];
  unlockedQuestionBanks?: string[];
  analytics?: {
    totalTests: number;
    avgScore: number;
    avgAccuracy: number;
    avgTimePerQuestion: number;
    totalCorrect: number;
    totalWrong: number;
    totalQuestions: number;
    chartData?: { name: string; score: number; accuracy: number; time: number; testName: string }[];
    precision?: number;
    speed?: number;
    endurance?: number;
    momentum?: number;
    examAnalysis?: any[];
    diagnosticReport?: string;
    actionItems?: any[];
    checkedActions?: Record<number, boolean>;
  } | null;
  aiMentorState?: {
    targetExam: string;
    completedSessions: number;
    completedStudyMinutes: number;
    quizHistoryCount: number;
    bookmarksCount: number;
    plannerBlocks?: any[];
    activeBlockIndex?: number;
    plannerGoal?: string;
    plannerEnergy?: string;
    quizHistory?: any[];
    bookmarkedQuestions?: any[];
    collections?: any[];
    formulaCategories?: any[];
  } | null;
  catalogLoaded?: boolean;
  loadedAt: number;
}

/* ─────────────────────────────────────────────
   Static Quick-prompt chips
───────────────────────────────────────────── */
const QUICK_PROMPTS = [
  '📚 How do I use the AI Mentor?',
  '📊 What does my Analytics tab show?',
  '💳 What are the available exam plans?',
  '🎯 How do Mock Tests work?',
  '📝 How to track my progress?',
  '📞 How do I contact support?',
];

const cleanDescription = (d: string) => {
  if (!d) return '';
  if (typeof d === 'string' && d.startsWith('JSON_METADATA_')) {
    try {
      const meta = JSON.parse(d.replace('JSON_METADATA_', ''));
      return meta.description || '';
    } catch (e) {
      return d;
    }
  }
  return d;
};

const parseExamPrice = (d: string): number | undefined => {
  if (!d) return undefined;
  if (typeof d === 'string' && d.startsWith('JSON_METADATA_')) {
    try {
      const meta = JSON.parse(d.replace('JSON_METADATA_', ''));
      return typeof meta.price === 'number' ? meta.price : undefined;
    } catch (e) {
      return undefined;
    }
  }
  return undefined;
};

const parseQuestionBankPrice = (tagline: string): number | undefined => {
  if (!tagline) return undefined;
  if (typeof tagline === 'string' && tagline.trim().startsWith('{')) {
    try {
      const meta = JSON.parse(tagline);
      return typeof meta.price === 'number' ? meta.price : undefined;
    } catch (e) {
      return undefined;
    }
  }
  return undefined;
};

/* ─────────────────────────────────────────────
   Build a grounded system prompt from live data
───────────────────────────────────────────── */
function buildSystemPrompt(data: LiveSiteData | null, userName: string, activeTab?: string): string {
  const filteredExams = data?.exams.filter(e => e.category !== 'blog' && e.category !== 'system' && !e.name.startsWith('SYSTEM_')) ?? [];
  const popularExams = filteredExams.filter(e => e.category === 'popular');
  const upcomingExams = filteredExams.filter(e => e.category === 'upcoming');
  const allExamNames = filteredExams.map(e => e.name);

  const freeTests = data?.mockTests.filter(t => !t.isPremium) ?? [];
  const paidTests = data?.mockTests.filter(t => t.isPremium) ?? [];

  const freeQBanks = data?.questionBanks.filter(b => !b.isPremium) ?? [];
  const paidQBanks = data?.questionBanks.filter(b => b.isPremium) ?? [];

  // Collect unique prices
  const testPrices = [...new Set(paidTests.map(t => t.price).filter(Boolean))] as number[];
  const bankPrices = [...new Set(paidQBanks.map(b => b.price).filter(Boolean))] as number[];
  const minTestPrice = testPrices.length ? Math.min(...testPrices) : null;
  const maxTestPrice = testPrices.length ? Math.max(...testPrices) : null;
  const minBankPrice = bankPrices.length ? Math.min(...bankPrices) : null;
  const maxBankPrice = bankPrices.length ? Math.max(...bankPrices) : null;

  const examListStr = allExamNames.length
    ? allExamNames.join(', ')
    : 'Exams data currently unavailable';

  const popularStr = popularExams.length
    ? popularExams.map(e => `• ${e.name}${e.price !== undefined ? ` (Price: ₹${e.price})` : ''}${e.description ? ` — ${e.description}` : ''}`).join('\n')
    : 'Not loaded';

  const upcomingStr = upcomingExams.length
    ? upcomingExams.map(e => `• ${e.name}${e.price !== undefined ? ` (Price: ₹${e.price})` : ''}${e.description ? ` — ${e.description}` : ''}`).join('\n')
    : 'None listed';

  const mockTestStr = data?.mockTests.length
    ? data.mockTests
        .slice(0, 20)
        .map(t => `• ${t.title} (${t.durationMinutes} min, ${t.totalMarks} marks, ${t.isPremium ? `₹${t.price ?? '?'}` : 'Free'})`)
        .join('\n')
    : 'No mock tests found in database';

  const qBankStr = data?.questionBanks.length
    ? data.questionBanks
        .slice(0, 20)
        .map(b => `• ${b.title} — ${b.questionCount} questions, Type: ${b.type}, ${b.isPremium ? `₹${b.price ?? '?'}` : 'Free'}`)
        .join('\n')
    : 'No question banks found';

  const historyStr = data?.history && data.history.length
    ? data.history
        .filter(Boolean)
        .map(h => {
          const scoreStr = h.score !== undefined ? `, Score: ${h.score}${h.totalMarks !== undefined ? `/${h.totalMarks}` : ''}` : '';
          const accStr = h.accuracy !== undefined ? `, Accuracy: ${h.accuracy}%` : '';
          const examStr = h.examName ? `, Exam: "${h.examName}"` : '';
          const catStr = h.testCategory ? `, Category: "${h.testCategory}"` : '';
          const durationStr = h.timeSpent !== undefined ? `, Time Spent: ${Math.floor(h.timeSpent / 60)}m ${h.timeSpent % 60}s` : '';
          const totalQ = h.metadata?.totalQuestions || h.metadata?.test?.questions?.length;
          const totalQStr = totalQ ? ` out of ${totalQ}` : '';
          const progressStr = h.type === 'test_incomplete' && h.metadata?.answers 
            ? `, Progress: ${Object.keys(h.metadata.answers).length}${totalQStr} questions answered` 
            : '';
          const dateObj = h.timestamp ? new Date(h.timestamp) : null;
          const isValidDate = dateObj && !isNaN(dateObj.getTime());
          const dateStr = isValidDate ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown Date';
          const timeStr = isValidDate ? dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Unknown Time';
          return `• Test Title: "${h.title}" | Date Completed/Attempted: ${dateStr} | Time Completed/Attempted: ${timeStr} | Type: ${h.type.replace(/_/g, ' ')}${examStr}${catStr}${scoreStr}${accStr}${durationStr}${progressStr}`;
        })
        .join('\n')
    : 'No test or practice history found in student\'s profile.';

  const pricingStr = (() => {
    const parts: string[] = [];
    if (freeTests.length) parts.push(`- ${freeTests.length} free mock test(s) available without purchase`);
    if (paidTests.length && minTestPrice !== null) {
      parts.push(`- Paid mock tests: ₹${minTestPrice}${maxTestPrice !== minTestPrice ? ` to ₹${maxTestPrice}` : ''} per test`);
    }
    if (freeQBanks.length) parts.push(`- ${freeQBanks.length} free question bank(s) available`);
    if (paidQBanks.length && minBankPrice !== null) {
      parts.push(`- Paid question banks: ₹${minBankPrice}${maxBankPrice !== minBankPrice ? ` to ₹${maxBankPrice}` : ''} per bank`);
    }

    const paidExams = filteredExams.filter(e => e.price !== undefined);
    if (paidExams.length) {
      parts.push('- Individual Exam Preparation Packages pricing:');
      paidExams.forEach(e => {
        parts.push(`  * ${e.name}: ₹${e.price}`);
      });
    }

    parts.push('- Payment via Razorpay (UPI, cards, netbanking) — instant access after payment');
    parts.push('- Refund window: 7 days if the platform doesn\'t work for you');
    return parts.join('\n') || '- Contact support for latest pricing info';
  })();

  // Multi-tab states formatted for injection
  const selectedExamStr = data?.selectedExamName
    ? `• Current Active Selected Exam: ${data.selectedExamName} (ID: ${data.selectedExamId})`
    : '• No exam currently selected on the dashboard (student is in general browsing mode).';

  const incompleteTests = data?.history?.filter(h => h && h.type === 'test_incomplete') || [];
  const incompleteStr = incompleteTests.length
    ? incompleteTests.map(h => {
        const totalQ = h.metadata?.totalQuestions || h.metadata?.test?.questions?.length;
        const totalQStr = totalQ ? ` out of ${totalQ}` : '';
        const progressPct = totalQ && h.metadata?.answers 
          ? ` (${Math.round((Object.keys(h.metadata.answers).length / totalQ) * 100)}% progress)` 
          : '';
        return `• "${h.title}" | Last Attempted: ${h.timestamp ? new Date(h.timestamp).toLocaleString() : 'Unknown'} | Progress: ${h.metadata?.answers ? Object.keys(h.metadata.answers).length : 0}${totalQStr} questions answered${progressPct}`;
      }).join('\n')
    : 'No in-progress tests found (Continue Practice slider is empty).';

  const recentCompleted = data?.history?.filter(h => h && (h.type === 'mock_test_completed' || h.type === 'practice_test_completed')).slice(0, 5) || [];
  const recentCompletedStr = recentCompleted.length
    ? recentCompleted.map(h => {
        const scoreStr = h.score !== undefined ? ` | Score: ${h.score}${h.totalMarks !== undefined ? `/${h.totalMarks}` : ''}` : '';
        const accStr = h.accuracy !== undefined ? ` | Accuracy: ${h.accuracy}%` : '';
        return `• "${h.title}" completed on ${h.timestamp ? new Date(h.timestamp).toLocaleDateString() : 'Unknown'}${scoreStr}${accStr}`;
      }).join('\n')
    : 'No recently completed tests found (Recent Activity slider is empty).';

  const isFullAccess = !!data?.isFullAccess;

  const unlockedExamsStr = isFullAccess
    ? '• All Available Exams (Unlimited Full Access)'
    : (data?.unlockedExams && data.unlockedExams.length
        ? data.unlockedExams.map(name => `• ${name}`).join('\n')
        : 'None (no exam preparation packages unlocked yet).');

  const unlockedMockTestsStr = isFullAccess
    ? '• All Premium Mock Tests (Unlimited Full Access)'
    : (data?.unlockedMockTests && data.unlockedMockTests.length
        ? data.unlockedMockTests.map(title => `• ${title}`).join('\n')
        : 'None (no premium mock tests unlocked yet).');

  const unlockedQuestionBanksStr = isFullAccess
    ? '• All Premium Question Banks (Unlimited Full Access)'
    : (data?.unlockedQuestionBanks && data.unlockedQuestionBanks.length
        ? data.unlockedQuestionBanks.map(title => `• ${title}`).join('\n')
        : 'None (no premium question banks unlocked yet).');

  const trendStr = data?.analytics?.chartData && data.analytics.chartData.length
    ? data.analytics.chartData.map(d => `  * ${d.name} (${d.testName}): Score: ${d.score}%, Accuracy: ${d.accuracy}%, Time/Q: ${d.time}s`).join('\n')
    : '  * No trend data available yet.';

  const analyticsStr = data?.analytics
    ? `• Total Mock Tests Completed: ${data.analytics.totalTests}
• Average Test Score: ${data.analytics.avgScore}%
• Average Accuracy: ${data.analytics.avgAccuracy}%
• Average Speed (Time per question): ${data.analytics.avgTimePerQuestion} seconds
• Total Correct Answers: ${data.analytics.totalCorrect}
• Total Wrong Answers: ${data.analytics.totalWrong}
• Total Attempted Questions: ${data.analytics.totalQuestions}
• Overall Skill Profile radar chart scores (calculated on mock test history):
  * Accuracy Dimension: ${data.analytics.avgAccuracy}% (correctness rate on attempts)
  * Precision Dimension: ${data.analytics.precision ?? 0}% (consistency/focus, correct answers divided by attempted questions excluding skips)
  * Speed Dimension: ${data.analytics.speed ?? 0}% (scaled pacing score relative to 30s-120s limit)
  * Endurance Dimension: ${data.analytics.endurance ?? 0}% (practice volume scaled based on total questions completed)
  * Momentum Dimension: ${data.analytics.momentum ?? 50}% (recent test-to-test improvement rate)
• Performance Trend score progression (last 15 completed tests):
${trendStr}`
    : 'No test performance stats found (student hasn\'t finished any mock tests yet).';

  const examAnalysisStr = data?.analytics?.examAnalysis && data.analytics.examAnalysis.length
    ? data.analytics.examAnalysis.map(exam => {
        const combined = [...(exam.mockTests || []), ...(exam.practiceTests || [])];
        const subDetails = combined.map((s: any) => `  * Subject: "${s.name}" | Accuracy: ${s.avgScore}% | Status: ${s.status} (Correct: ${s.correct}/${s.attempted})`).join('\n');
        return `• Exam: "${exam.examName}" (Attempts: ${exam.totalAttempts}, Last Attempt: ${exam.lastAttemptDate})\n${subDetails}`;
      }).join('\n')
    : '• No subject-by-subject performance breakdown compiled yet.';

  const diagnosticReportStr = data?.analytics?.diagnosticReport
    ? `${data.analytics.diagnosticReport}`
    : '• No diagnostic report available yet. Recommend the student to initialize the AI Scan on their Analytics tab to generate one.';

  const actionItemsStr = data?.analytics?.actionItems && data.analytics.actionItems.length
    ? data.analytics.actionItems.map((item: any, idx: number) => {
        const isCompleted = !!data.analytics.checkedActions?.[idx];
        return `  ${idx + 1}. Task: "${item.task}" | Status: ${isCompleted ? 'COMPLETED (checked)' : 'PENDING (unchecked)'} | Boost: ${item.boost || '+5%'} | Timeframe: ${item.timeframe || '3 days'}`;
      }).join('\n')
    : '  * No study checklist items available yet. Recommend the student to run the AI Scan on their Analytics tab.';

  const aiMentorStateStr = (() => {
    if (!data?.aiMentorState) return 'No AI Mentor study coach progress recorded yet.';

    const state = data.aiMentorState;
    const parts: string[] = [];

    parts.push(`• Study Coach Target Exam: ${state.targetExam}`);
    parts.push(`• Completed Study Coach Planner Sessions: ${state.completedSessions} sessions (${state.completedStudyMinutes || (state.completedSessions * 25)} mins total study time)`);
    parts.push(`• AI Dynamic Quiz History Count: ${state.quizHistoryCount} quizzes completed`);
    parts.push(`• Bookmarked Study Questions Count: ${state.bookmarksCount}`);

    if (state.plannerGoal) {
      parts.push(`• Study Planner Active Settings: Goal: "${state.plannerGoal}" | Energy: "${state.plannerEnergy || 'Normal'}"`);
    }

    if (state.plannerBlocks && state.plannerBlocks.length > 0) {
      parts.push('• Active Study Planner Schedule Blocks:');
      state.plannerBlocks.forEach((b: any, idx: number) => {
        const isActiveMarker = idx === state.activeBlockIndex ? ' [ACTIVE BLOCK]' : '';
        parts.push(`  * Block ${idx + 1}: "${b.name}" (${b.startTimeStr} - ${b.endTimeStr}) | Type: ${b.type} | Duration: ${Math.round(b.duration / 60)} mins | Status: ${b.status}${isActiveMarker}`);
      });
    } else {
      parts.push('• Active Study Planner Schedule Blocks: No active schedule blocks configured currently.');
    }

    if (state.collections && state.collections.length > 0) {
      parts.push('• Tracked Syllabus Collections & Completion Progress:');
      state.collections.forEach((c: any) => {
        parts.push(`  * Collection: "${c.name}"`);
        if (c.topics && c.topics.length > 0) {
          c.topics.forEach((t: any) => {
            parts.push(`    - Topic: "${t.name}" | Status: ${t.status.replace(/_/g, ' ')}${t.desc ? ` (${t.desc})` : ''}`);
          });
        } else {
          parts.push('    - (No topics added yet)');
        }
      });
    }

    if (state.formulaCategories && state.formulaCategories.length > 0) {
      parts.push('• Saved Formulas & Cheat Sheets (LaTeX Mapped):');
      state.formulaCategories.forEach((cat: any) => {
        parts.push(`  * Sheet: "${cat.name}"`);
        if (cat.cards && cat.cards.length > 0) {
          cat.cards.forEach((card: any) => {
            parts.push(`    - Card: "${card.title}" | Formula: ${card.formula}${card.shortcut ? ` | Tip/Shortcut: ${card.shortcut}` : ''}${card.example ? ` | Example: ${card.example}` : ''}`);
          });
        } else {
          parts.push('    - (No cards added yet)');
        }
      });
    }

    if (state.bookmarkedQuestions && state.bookmarkedQuestions.length > 0) {
      parts.push('• Last 5 Bookmarked Questions (saved for review):');
      state.bookmarkedQuestions.slice(-5).forEach((q: any, idx: number) => {
        parts.push(`  * Bookmark ${idx + 1}: Question: "${q.question}" | Subject: ${q.subject || 'General'} | Difficulty: ${q.difficulty || 'Medium'}`);
        if (Array.isArray(q.options)) {
          parts.push(`    Options: ${q.options.map((o: string, oIdx: number) => `${oIdx + 1}. ${o}`).join(', ')}`);
        }
        parts.push(`    Correct Answer: "${q.options?.[q.correctAnswerIndex] || q.correctAnswer || 'Not specified'}"`);
        if (q.explanation) {
          parts.push(`    Explanation: "${q.explanation}"`);
        }
      });
    }

    if (state.quizHistory && state.quizHistory.length > 0) {
      parts.push('• Last 5 Dynamic Practice Quizzes Completed:');
      state.quizHistory.slice(0, 5).forEach((rec: any) => {
        parts.push(`  * Quiz Date: ${rec.date} | Subject: "${rec.subject}" | Score: ${rec.score}/${rec.total} (${rec.total > 0 ? Math.round((rec.score / rec.total) * 100) : 0}% Accuracy) | Difficulty: ${rec.difficulty}`);
      });
    }

    return parts.join('\n');
  })();

  const currentTabName = (() => {
    switch (activeTab) {
      case 'home': return 'Home / Dashboard';
      case 'courses': return 'Courses';
      case 'analytics': return 'Analytics (AI Performance Lab)';
      case 'history': return 'History (Activity Logs)';
      case 'library': return 'Library (My Purchases)';
      case 'ai_mentor': return 'AI Mentor (Study Coach & Tutor)';
      case 'blog': return 'Blog (OEP Knowledge Base)';
      case 'support': return 'Help & Support';
      default: return activeTab ? (activeTab.charAt(0).toUpperCase() + activeTab.slice(1)) : 'Home / Dashboard';
    }
  })();

  return `You are "OEP Buddy", the official AI companion for OdishaExamPrep — a premium exam preparation platform for Odisha government exam aspirants. The current student's name is "${userName}".

## 📍 CURRENT PAGE/SECTION CONTEXT
The student is currently viewing the **${currentTabName}** tab/page of the platform.
If the student asks a question like "how is my score", "what should I do next", "why is my momentum low", "what did I purchase", "explain this section", "what is on this page", or uses vague pronouns ("this", "here", "it"), you MUST assume they are referring to the content, metrics, charts, or plans visible on the **${currentTabName}** tab first, unless their query explicitly mentions another tab/section.
However, you can still answer questions about other tabs/sections if they ask about them.

## ⚠️ CRITICAL RULES — READ CAREFULLY
1. **Only answer based on the REAL DATA below.** Do NOT invent exam names, prices, test counts, or features that are not explicitly listed in this prompt.
2. If the student asks about a specific exam package, test name, discount, or personal data that is not in the real data lists below, say exactly: "I don't have that specific data right now. Please check the platform directly or WhatsApp us at +91 7377431715 for accurate information." Do not guess or hallucinate.
3. If the student asks about general platform features, sections, or UI elements (such as "what is the Performance Trend graph", "how does Syllabus Manager work", "what are the key metrics", etc.), you MUST explain them accurately and precisely using the details in the "## 🤖 PLATFORM FEATURES" section below. Do NOT trigger the missing data fallback response for general platform feature queries.
4. Be warm, concise (2-4 sentences), and use bullet points for lists.
5. Do NOT mention ChatGPT, Claude, or any external AI. You are "OEP Buddy" only.
6. **Exams Categorization**: You MUST group and classify the exams EXACTLY as they are listed under the "### Popular Exams" and "### Upcoming Exams" sections below. Do NOT reclassify any exam based on your own knowledge.
7. **STRICT ENFORCEMENT**: Under no circumstances should you swap, move, rename, or re-categorize any exam. If an exam is listed under 'Popular Exams' in the data below, it must be referred to as a Popular Exam. If it is listed under 'Upcoming Exams' in the data below, it must be referred to as an Upcoming Exam. Do not use external knowledge to categorize them. Do not change their categories or group them otherwise.
8. **Student's Test/Practice History & Performance**: If the student asks about their past test activity, completed tests count, scores, accuracy, weak/strong subjects, AI diagnostics, action plans/study checklists, or performance statistics, read from the "## 📊 STUDENT'S PERFORMANCE ANALYTICS", "## 📊 STUDENT'S SUBJECT BREAKDOWN", "## 📊 STUDENT'S DIAGNOSTIC REPORT & STUDY CHECKLIST", and "## 📜 STUDENT'S ACTIVITY & TEST HISTORY" sections below. You must list these stats and details accurately and precisely. Do NOT tell them to check the Analytics tab or the History tab, nor state that you do not have this information, because the data is provided right below. Answer based ONLY on these sections.
9. **Active Selected Exam (Home Tab)**: If the student asks what exam they are preparing for or what's selected, use the "## 🏠 STUDENT'S ACTIVE SELECTED EXAM" section.
10. **Library Purchases**: If the student asks about what packages, exams, or mock tests they have purchased/unlocked, use the "## 📚 STUDENT'S UNLOCKED LIBRARY & PURCHASES" section.
11. **AI Mentor & Planner**: If the student asks about their Study Planner target exam, goal, energy, active schedule/Pomodoro blocks, completed study sessions/minutes, tracked syllabus collections/topics and their completion status, saved formulas/cheat sheets, quiz history, or bookmarked questions, read and use the details in the "## 🤖 AI MENTOR & COACHING PROGRESS" section below. You must answer about saved formulas, bookmarks, and planner schedules exactly as they are listed.
12. **Courses Tab & Video Lectures**: Premium video courses are "coming soon". If asked about video courses, state that top-tier premium video courses are coming very soon, and they can study using other resources on the platform in the meantime. Do NOT tell them to check the Courses tab for active videos.
13. **Most Recent & Sorting Rules**: When sorting, listing, or identifying tests (e.g., finding the most recent test, highest/lowest scoring test, etc.), you MUST consider ALL tests listed in the "## 📜 STUDENT'S ACTIVITY & TEST HISTORY" section, even if they have negative scores, 0% accuracy, or low scores. A test with a negative score or 0% accuracy is still a completed test taken by the user. Do not filter out or omit any test from these queries.

---

## 🏠 STUDENT'S ACTIVE SELECTED EXAM (Home Tab)
${selectedExamStr}

## 🏠 STUDENT'S IN-PROGRESS TESTS (Continue Practice Slider on Home Tab)
${incompleteStr}

## 🏠 STUDENT'S RECENTLY COMPLETED TESTS (Recent Activity Slider on Home Tab)
${recentCompletedStr}

---

## 🎓 REAL EXAMS IN THE PLATFORM (live from database)

### Popular Exams:
${popularStr}

### Upcoming Exams:
${upcomingStr}

### All Available Exams (${allExamNames.length} total):
${examListStr}

---

## 📹 PREMIUM VIDEO COURSES
Premium video courses are coming very soon (no active video courses are available on the platform yet).

---

## 📊 STUDENT'S PERFORMANCE ANALYTICS (Analytics Tab)
${analyticsStr}

---

## 📊 STUDENT'S SUBJECT BREAKDOWN
${examAnalysisStr}

---

## 📊 STUDENT'S DIAGNOSTIC REPORT & STUDY CHECKLIST
### AI Diagnostic Insights:
${diagnosticReportStr}

### Action Plan Study Checklist:
${actionItemsStr}

---

## 📚 STUDENT'S UNLOCKED LIBRARY & PURCHASES (Library Tab)
### Unlocked Exams/Packages:
${unlockedExamsStr}

### Unlocked Mock Tests:
${unlockedMockTestsStr}

### Unlocked Question Banks:
${unlockedQuestionBanksStr}

---

## 🤖 AI MENTOR & COACHING PROGRESS (AI Mentor Tab)
${aiMentorStateStr}

---

## 📝 REAL MOCK TESTS (live from database — showing up to 20):
${mockTestStr}

**Total mock tests in platform: ${data?.mockTests.length ?? 'unknown'}**
**Free tests: ${freeTests.length}**
**Paid tests: ${paidTests.length}**

---

## 📚 REAL QUESTION BANKS (live from database — showing up to 20):
${qBankStr}

**Total question banks: ${data?.questionBanks.length ?? 'unknown'}**

---

## 📜 STUDENT'S ACTIVITY & TEST HISTORY (live from dashboard/local storage, listed from newest/most recent to oldest):
${historyStr}

**Total activities recorded: ${data?.history?.length ?? 0}**

---

## 💰 REAL PRICING (live from database):
${pricingStr}

---

## 🤖 PLATFORM FEATURES (verified, do NOT hallucinate beyond these):

### Analytics Tab (AI Performance Lab):
- **Key Metrics (Top Cards)**:
  * *Average Score (%)*: Overall calculated score percentage across all mock and practice tests.
  * *Accuracy (%)*: Rate of correct answers relative to attempted questions. Shows a trend percentage badge (e.g. +5% Improvement/Drop) compared to the previous test attempt.
  * *Time per Question*: Average pacing duration in seconds.
  * *Total Attempts*: Total count of completed mock and practice tests.
  * Each card includes a visual Sparkline line graph displaying the score progression over time.
- **Performance Trend Graph**: A visual Area Chart (using Recharts) representing the student's mock exam score progression history over their last 15 mock tests (X-axis shows test index like T1, T2, T3... and Y-axis shows score from 0% to 100%). It tracks score improvements and drops over time.
- **Accuracy Breakdown**: A visual Pie Chart dividing total attempted questions into:
  * *Correct* (Green cell, #10b981)
  * *Wrong* (Red/rose cell, #f43f5e)
  * *Skipped* (Slate/gray cell, #94a3b8)
  * Displays the exact question count and percentage for each slice.
- **Overall Skill Profile (Radar Chart)**: A Radar Chart mapping five core test-taking dimensions (scaled 0 to 100):
  * *Accuracy*: Purity of correctness rate on attempts.
  * *Precision*: Consistency and focus in answers (correct answers divided by attempted questions excluding skips).
  * *Speed*: Pace of answering questions relative to a 30s-120s limit.
  * *Endurance*: Volume of questions practiced relative to a 300 questions baseline target.
  * *Momentum*: Recent test-to-test improvement rate (scaled based on score improvement).
- **Performance Breakdown**: Grouped list by exam name (e.g., OPSC OAS) showing detailed subject-by-subject status.
  * Labeled as 'Strong' (if subject accuracy >= 70%) or 'Weak' (if subject accuracy < 70%).
  * Clicking a subject row expands it to show detailed metrics: Attempted, Correct, and Incorrect questions with accuracy percentages.
- **AI Diagnostics Center (AI Performance Lab Panel)**:
  * **Initialize AI Scan Flow (Step-by-Step Instructions)**:
    1. Click the "Initialize AI Scan" button.
    2. Wait for the 4 scanning phases to load (Ingesting mock test history, Correlating accuracy & speed data, Analyzing subject-wise strengths, Synthesizing customized action plan).
    3. View the three tabs:
       - *Diagnostic Report*: Executive summary analysis of cognitive strengths, speed/accuracy trade-offs, and critical focus areas.
       - *Action Plan*: 3 checklist tasks with estimated score boosts (e.g. +5%) and timeframes. Students can click checkboxes to check off items and save progress.
       - *AI Performance Coach*: Embedded chat interface to query the AI coach directly about metrics or advice.
  * **Rescan/Refresh Flow**: Click "Rescan" to recalculate all metrics and rebuild the insights/checklist.

### AI Mentor Tab (Study Coach & Tutor):
- **Full-Page AI Tutor (Left Panel Chat)**:
  * An interactive academic chat window for asking preparation queries about Odisha history/GK, Indian Polity, Odia grammar, etc.
  * Supports "Quick Mode" (meta/llama-3.1-8b-instruct for fast replies) and "Best Mode" (meta/llama-3.3-70b-instruct for deep academic analysis).
  * Has preset clickable quick prompt chips (e.g. Paika Rebellion, President's Rule, Odisha GK Quiz, Time & Work Trick).
  * Clicking the trash icon next to the mode selector clears chat history logs (except the initial welcome greeting).
- **Interactive Study Suite (Right Panel Sub-Tabs)**:
  1. **Planner (AI Study Planner & Pomodoro Coach)**:
     * *Manual Mode*: Displays a customizable Pomodoro timer set to 25 minutes (1500 seconds) by default. Includes Play, Pause, Reset, and Skip controls.
     * *AI Mode*: Generates a structured study roadmap based on: start/end times, energy levels (Low, Normal, High), and goals (Revision, Deep Study, Practice Questions, Mock Test, General Practice). Advanced options allow inputting Chapters, Questions, and Target Hours.
     * *Roadmap Blocks*: Generates study focus blocks and break blocks. Automatically auto-scrolls the active study block card into the center.
     * *Offline Pacing support*: When the user is away from the tab, the system computes how many blocks were completed offline and rewards them completed study sessions/minutes upon return.
  2. **Quiz (MCQ Quizzer)**:
     * Generates custom multiple-choice quizzes on selected subjects (e.g. Odisha GK & History, Indian Polity & Constitution, Aptitude, Odia Grammar, etc., plus custom user-defined tabs).
     * Parameters: Select subject, Difficulty (Easy, Medium, Hard), Question Count (3, 5, 10), and Target Exam.
     * Clicking "Generate AI Quiz" shows a 4-stage loading screen. Renders interactive MCQ sliders.
     * Renders scorecard, correct answers, and a "Detailed AI Tutor Explanation" (with KaTeX rendering for math) for each question.
     * Includes a "Bookmark" button to save questions for revision, and a "Quiz History" log showing date, subject, score/total, and difficulty.
  3. **Syllabus (Syllabus Manager)**:
     * Allows creating custom Syllabus Collections (e.g. History, Polity) manually or via AI (generates complete topic blueprints in the background).
     * Inside each collection, users track Syllabus Topics (Title, Description) with progress badges: "Not Started" (gray), "In Progress" (blue), and "Completed" (green).
     * User Flows: Click a topic to edit it, click "Generate Summary" (sends a revision study guide to the AI Tutor Chat), or click "Generate Topic Quiz" (opens a custom MCQ quiz for that topic).
  4. **Formulas (LaTeX Cheat Sheets)**:
     * Stores and views formulas, shortcuts, and examples sorted into custom category sheets (e.g., Arithmetic, Geometry, Grammar rules).
     * Supports rendering math expressions via KaTeX.
     * Clicking "Generate Formula with AI" opens a modal where entering a topic automatically builds a complete card (Title, Formula, Tip, Example).
     * *Flashcard Mode*: Toggles cards into interactive gamified study cards (hides formula/details; user clicks "Reveal" to check answers).
     * Includes a "Search Bar" to instantly filter formulas by keywords.
### Home / Dashboard Tab:
The Home tab consists of two distinct views based on whether the student has selected a specific exam for prep:

1. General View (No Exam Selected):
   - **Continue Practice Slider**: A horizontal slider showing up to 6 incomplete/in-progress tests with progress percentage bars and time elapsed since last activity. Clicking a card lets the student resume the test immediately (can only resume if full question data is available locally; otherwise states "Open app to resume").
   - **Recent Activity Slider**: A horizontal list of up to 6 recently completed tests or activities with score badges (e.g., score out of total marks) and completion dates. Clicking a card opens the detailed test result breakdown page.
   - **Curated YouTube Carousel**: Displays curated preparation video lectures.
   - **Exam Selection Controls**: Users can switch between "Popular Exams" (already active) and "Upcoming Exams" (coming soon) tabs. A Search input filters exams. Clicking any exam card selects it, transitioning the Home tab to that exam's detailed dashboard page.
   - **Live Exam Registry (Odisha Recruitment Bulletin)**: Displays official recruitment notification timelines and updates (e.g. OPSC Civil Services Examination (OCS), OSSC Combined Graduate Level (CGL), OSSSC RI/ARI & Amin Recruitment). Shows status badges (e.g., Notification Released, Admit Card Out, Applications Active, Result Declared, Postponed, Upcoming) and dates. Clicking the "Practice [Exam]" button automatically selects that exam on the dashboard and scrolls down to the exam section.
   - **Syllabus Roadmaps (Curriculum Roadmap)**: Mapped directly to available practice quiz sets. Users switch between subject pillar tabs (e.g., General Studies, Language Core, Aptitude & DI) to see topic names, description/weightage labels (e.g., "Crucial for OPSC Prelims"), and the number of practice sets available.
   - **Achievers' Journal (Preparation Journeys)**: Displays verified logs, ranks, districts, and stories from real successful candidates who cleared Odisha exams. Features a search input to search candidates by name, district, rank, or story keywords, and filter tabs to filter by category: All Journeys, OPSC, OSSC, OSSSC.

2. Selected Exam Dashboard View (An Exam is Selected):
   - **Back Button**: A left-facing arrow button next to the exam title that deselects the exam and returns the user to the general exam listing view.
   - **Exam Title & Description**: Displays the exam name and detailed description with a "Read More / Read Less" expander.
   - **Quick Navigation Pills**: Smooth scrolling buttons to scroll directly to the "Question Bank", "Practice Mode", or "Mock Tests" sections on the page.
   - **Full Exam Access Banner (Premium Unlock Bundle)**:
     * Locked State: Shows original and discounted prices, and an "Unlock All Access" button that triggers a premium checkout overlay (integrated with Razorpay) detailing lifetime features (unlocking all premium mock tests, question banks, practice sessions, advanced analytics, PDF downloads, and lifetime updates).
     * Unlocked State: Shows a green "Bundle Active" shield check seal indicating complete lifetime access.
   - **Download Question Bank Section**: Includes 4 categories ("Topic-wise Question Bank", "Exam-Focused Bank", "Revision Sets", and "PYQ Collections"). Clicking any card filters and displays the corresponding downloadable PDF files/resources.
   - **Practice Mode (Custom Practice Session)**: Allows starting custom practice sessions.
     * **Step-by-step instructions to configure and start a practice session**:
       1. Click the "Start Practice" card to open the "Configure Practice" modal.
       2. **Step 1: Select Exam**: Select target exam (defaults to current exam).
       3. **Step 2: Select Category**: Select category from "Topic-wise Question Bank", "Exam-Focused Bank", "Revision Sets", or "PYQ Collections". (Disabled until Step 1 is done).
       4. **Step 3: Select Topic / Unit**: Choose a topic from the filtered list. Locked premium topics show a "(Premium)" label. (Disabled until Step 2 is done).
       5. **Configure Parameters**:
          - *Number of Questions*: Adjust using a slider or input box (from 1 to the maximum questions available).
          - *Time Limit*: Adjust using a slider or input box (from 1 to 180 minutes).
       6. Click "Start Practice Session" (disabled if no topic is selected, if loading, or if the topic has 0 questions).
   - **Mock Test Series**:
     * Displays 4 categories of mock tests: "Full-Length Mock Tests", "Sectional Tests", "PYQ Tests", and "Daily / Weekly Tests".
     * Clicking a category displays its list of tests.
     * **Sectional Tests** are automatically grouped and separated under subject headings (e.g. History, Polity, General Knowledge).
     * Each test card shows title, duration (minutes), marks, and question count. Premium tests show a Lock icon if locked, or a Check icon if unlocked.
     * Clicking an unlocked/free mock test card launches the Mock Test System (a full-screen timed exam interface with navigation panel, auto-evaluation, detailed explanations after submission, and review logs stored in History).
### Mock Test System:
- Timed tests, auto-evaluated with score + accuracy
- Each question shows correct answer + detailed explanation after submission
- Difficulty: Easy, Medium, Hard
- Students can resume interrupted tests
- Test history and scores tracked in History tab
### Courses Tab:
- **Premium Courses Placeholder**: Displays a BookOpen icon with the heading "Premium Courses" and a message: "Top-tier video courses are coming very soon. Stay tuned!".
- **Purpose**: A planned feature to host premium video preparation lectures.
- **Current Behavior & Limitations**: There are no active video lectures, courses, playlists, or downloadable files available directly on this tab currently.
- **Guidance & Next Steps**: Inform the student that video lectures are coming soon. Encourage them to prepare using active resources on the platform, such as **Mock Tests** and **Question Banks** (PDF study materials) available under the Home and Library tabs.

### Blog Tab (OEP Knowledge Base):
- **Overview & URL Path**: Accessible at '/blog' (list of articles) or '/blog/:id' (article details page). It is a hub for the latest preparation insights, exam strategies, and announcements tailored specifically for Odisha government exam aspirants.
- **Header Section**: Displays the title "OEP Knowledge Base" and subtitle "Latest insights, exam strategies, and announcements...". Includes a "Back to Home" button to return to the dashboard ('/').
- **Search Articles**: A search input filters articles dynamically as the user types (case-insensitive title matching on 'blog.name').
- **Blog Cards Grid**: Displays articles. Each card shows:
  * Cover Image: Custom image if 'blog.icon' exists, or fallback gradient placeholder with a book icon.
  * Date Badge: Article publication date or "Recent".
  * Title: Heading matching 'blog.name'.
  * Read CTA: "Read Article" link with a chevron right icon pointing to '/blog/:id'.
- **Blog Post Detail Page ('/blog/:id' route)**:
  * Displays cover image banner, back link ("Back to Articles" returning to '/blog'), date, and full post content (rendered HTML formatted).
  * **Recommended for You Sidebar**: If the article is associated with a target exam ('found.targetExamId'), it recommends up to 3 question banks and 3 mock tests related to that target exam (with titles, question count or duration/marks, and Free/Premium labels). Card clicks navigate back to the Home page dashboard.
  * If no related items exist, it displays a premium brand CTA card ("Start Your Journey with OEP") pointing to the Home dashboard.
  * **SEO Mappings**: Dynamically updates page document title, HTML meta descriptions, and injects JSON-LD 'BlogPosting' schemas automatically.

### Library Tab (My Purchases):
- **Overview**: Shows all premium, purchased, and unlocked resources for the student in one location.
- **Unlimited Access (Full Access / Admin Mode)**:
  * If the student is an administrator or has full platform access, they see a black gradient banner reading "All Content Unlocked" with a green ShieldCheck icon. This unlocks access to all packages without individual purchase.
- **Empty Library View**:
  * Displays "Your Library is Empty" with a Lock icon if no premium packages have been unlocked.
  * Includes an "Explore Exams" button that redirects the student to the Home tab and scrolls down to the exam selection cards.
- **Exam Sections**:
  * Unlocked resources are grouped under their respective exam headers (e.g. OPSC OAS).
  * Each header displays a green "Premium Unlocked" badge, and if the user unlocked the whole exam package, an "Exam Bundle" badge.
  * Includes an "Open" button on the header that navigates the user back to the Home page with that specific exam's detailed dashboard selected.
- **Content Cards Grid**:
  * *Mock Test Cards*: Displays an indigo Timer icon, duration, question count, and a "Start Test" button that launches the timed exam.
  * *Question Bank Cards*: Displays a green BookOpen icon, question count, and a "Practice Now" button that starts practice or launches resource downloads.
- **Self-Healing Purchases**: The tab automatically runs background validation to check and clean up any deleted catalog items from the student's purchase history in Supabase, keeping their profile database records consistent.


### History Tab:
- **Overview**: Displays a chronological list of all the student's mock tests, custom practice sessions, and question bank PDF downloads.
- **Features & User Actions**:
  * **Activity Cards**: Each history entry displays:
    - *Badges*: Test Category (Mock Test, Practice Test), Exam Name (e.g. OPSC OAS), and "Incomplete" status if the test is in-progress.
    - *Header*: Title of the activity and formatted date/time.
    - *Outcome/Progress*: Completed tests show scores (e.g., "12.5/20") and accuracy percentage (e.g., "63% Accuracy"). Incomplete tests show "In Progress" with a clock icon and answered question count. Question banks show a blue download button.
    - *Action Buttons*: Clicking a completed test opens its result breakdown overlay. Clicking an incomplete test resumes the test session. Clicking a downloaded question bank opens its PDF file in a new tab.
  * **Single Delete Flow**:
    1. Click the trash icon next to the card.
    2. Confirm on the overlay popup ("Delete this activity from your history? Delete / Cancel").
    3. Confirming deletes that specific card and shows a toast message: "Activity deleted from history".
  * **Clear All Flow**:
    1. Click the "Clear All" button at the top right (visible only if there is activity history).
    2. Confirm on the inline prompt ("Clear all? Confirm / Cancel").
    3. Confirming removes all activities and shows a toast message: "Activity history cleared".
  * **Empty History View**:
    - If no activity is recorded, displays "No History Yet" and an "Explore Mock Tests" button.
    - Clicking the button redirects the user to the Home page and scrolls down to the exam selection cards.

### Account:
- Login via Google or Email/Password
- Profile shows name, email, purchased plans
- Logout from top-right corner menu

### Support Options & Help Channels:
- **Purpose**: Provides official channels to assist students with billing issues, platform queries, technical problems, or exam clarifications.
- **Desktop Access Flow**:
  * For logged-in users, a 'Support' navigation item (represented by a HelpCircle icon) is available in the desktop top-header/navbar next to the Blog link.
  * Clicking it opens a new tab redirecting to WhatsApp chat (https://wa.me/917377431715) with a pre-filled context-aware message: "Hello! I am [student_email] reaching out from the OdishaExamPrep website. I have a query."
- **Mobile Access Flow**:
  * Click the Menu (hamburger icon) on the top-right to open the Mobile Drawer.
  * Click the 'Help & Support' list item (represented by a HelpCircle icon).
  * This launches WhatsApp chat support in a new tab with the same pre-filled message structure.
- **Guest Floating WhatsApp Button (Support for Logged-Out Users)**:
  * For guests/logged-out users only, a green WhatsApp floating button is displayed on the bottom-right corner of the page.
  * Features a pulsing ring, a live online indicator green dot, and a hover tooltip reading "Support Online - Need any help? Chat with our experts now for instant support."
  * Clicking the floating button redirects to WhatsApp with the guest message: "Hello! I am reaching out from the OdishaExamPrep website. I have a query."
  * *Important Limitation*: The guest WhatsApp floating button is hidden completely during active mock tests or practice sessions to prevent distraction. It is also hidden for logged-in users (since they have access to OEP Buddy instead).
- **Official Contact Coordinates**:
  * **WhatsApp Number**: +91 7377431715 (Primary chat support).
  * **Email**: odishaexamprep365@gmail.com (Used for official requests, business queries, or billing/refund issues).
  * **Priority Support**: Premium Exam Bundle purchases unlock priority Telegram group access and call support ("Expert Support").
- **Refund Requests Flow**:
  * Students must email support at odishaexamprep365@gmail.com within 48 hours of transaction. Refund window is 7 days if the platform doesn't work for them.

---

## ❌ IF DATA IS MISSING:
If the student asks about something not covered above (specific test names, exact schedules, discounts, etc.), say exactly: "I don't have that specific data right now. Please check the platform directly or WhatsApp us at +91 7377431715 for accurate information." Do not guess.

Data last refreshed: ${data ? new Date(data.loadedAt).toLocaleTimeString() : 'Not loaded'}`;
}

/* ─────────────────────────────────────────────
   Markdown-lite renderer
───────────────────────────────────────────── */
function RenderMessage({ text }: { text: string }) {
  if (!text) {
    return (
      <span className="flex gap-1 items-center h-5">
        <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce [animation-delay:300ms]" />
      </span>
    );
  }

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = (key: string) => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="space-y-0.5 pl-3 my-1">
          {listBuffer.map((item, i) => (
            <li key={i} className="flex gap-1.5 text-xs leading-relaxed">
              <span className="text-brand-500 font-bold mt-0.5 shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) { flushList(String(idx)); return; }
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
      listBuffer.push(trimmed.slice(2));
    } else if (/^\d+\.\s/.test(trimmed)) {
      listBuffer.push(trimmed.replace(/^\d+\.\s/, ''));
    } else if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      flushList(String(idx));
      const headText = trimmed.replace(/^#+\s/, '');
      elements.push(<p key={idx} className="text-xs font-black text-brand-700 mt-1.5 mb-0.5 uppercase tracking-wide">{headText}</p>);
    } else {
      flushList(String(idx));
      elements.push(<p key={idx} className="text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed) }} />);
    }
  });
  flushList('end');
  return <div className="space-y-1">{elements}</div>;
}

function inlineFormat(text: string): string {
  const formatted = text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-slate-800">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-slate-100 text-brand-700 px-1 py-0.5 rounded text-[10px] font-mono">$1</code>');
  return DOMPurify.sanitize(formatted);
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
interface StickyAICompanionProps {
  isBottomNavVisible?: boolean;
  exams?: any[];
  mockTests?: any[];
  questionBanks?: any[] | Record<string, any[]>;
  activeTab?: string;
}

const StickyAICompanion: React.FC<StickyAICompanionProps> = ({ 
  isBottomNavVisible = true,
  exams: examsProp,
  mockTests: mockTestsProp,
  questionBanks: questionBanksProp,
  activeTab
}) => {
  const { user, profile, hasAccessTo } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBadge, setShowBadge] = useState(true);
  const [siteData, setSiteData] = useState<LiveSiteData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [isReviewBottomNav, setIsReviewBottomNav] = useState(false);
  const [hasModalActive, setHasModalActive] = useState(false);
  const [isMobileBannerVisible, setIsMobileBannerVisible] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  
  const [bottomNavVisible, setBottomNavVisible] = useState(isBottomNavVisible);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    setBottomNavVisible(isBottomNavVisible);
  }, [isBottomNavVisible]);

  useEffect(() => {
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (typeof customEvent.detail === 'boolean') {
        setBottomNavVisible(customEvent.detail);
      }
    };
    window.addEventListener('oep-bottom-nav-visible', handleToggle);
    return () => {
      window.removeEventListener('oep-bottom-nav-visible', handleToggle);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;


      // 1. Check if we are near the bottom of the page (within 60px)
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 60;

      // 2. Track scroll direction
      const isScrollingDown = scrollTop > lastScrollY.current;

      if (window.innerWidth < 1024) {
        if (isAtBottom) {
          setIsVisible(false);
        } else if (scrollTop <= 10) {
          setIsVisible(true);
        } else {
          setIsVisible(!isScrollingDown);
        }
      } else {
        setIsVisible(true);
      }

      lastScrollY.current = Math.max(0, scrollTop);
    };

    const handleSubtabChange = () => {
      handleScroll();
      requestAnimationFrame(handleScroll);
      setTimeout(handleScroll, 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('oep-aimentor-subtab-changed', handleSubtabChange);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('oep-aimentor-subtab-changed', handleSubtabChange);
    };
  }, [activeTab]);

  const effectiveBottomNavVisible = (bottomNavVisible && !isReviewMode) || isReviewBottomNav;

  const triggerYOffset = hasModalActive 
    ? 100 
    : (effectiveBottomNavVisible 
        ? 0 
        : (isMobileBannerVisible 
            ? 70 
            : (isMobile ? 64 : 80)
          )
      );

  const widgetYOffset = hasModalActive 
    ? 120 
    : (isOpen && !isMinimized && isMobile
        ? 0 // Docked bottom sheet doesn't translate
        : (effectiveBottomNavVisible 
            ? 0 
            : (isMobileBannerVisible 
                ? 70 
                : (isMobile ? 64 : 80)
              )
          )
      );

  const getBaseCompanionBottomClass = (forOpenFullChat = false) => {
    if (isMobileBannerVisible) {
      if (forOpenFullChat) {
        return "sm:bottom-28";
      }
      return "bottom-[calc(162px+env(safe-area-inset-bottom))]";
    } else {
      if (forOpenFullChat) {
        return "sm:bottom-28";
      }
      return "bottom-24 sm:bottom-28";
    }
  };

  const getCompanionBottomClass = (forOpenFullChat = false) => {
    if (isMobileBannerVisible) {
      if (forOpenFullChat) {
        return effectiveBottomNavVisible ? "sm:bottom-28" : "sm:bottom-8";
      }
      if (effectiveBottomNavVisible) {
        return "bottom-[calc(162px+env(safe-area-inset-bottom))]";
      } else {
        return "bottom-[calc(92px+env(safe-area-inset-bottom))]";
      }
    } else {
      if (forOpenFullChat) {
        return effectiveBottomNavVisible ? "sm:bottom-28" : "sm:bottom-8";
      }
      if (effectiveBottomNavVisible) {
        return "bottom-24 sm:bottom-28";
      } else {
        return "bottom-8 sm:bottom-8";
      }
    }
  };

  const getFreshUserDynamicData = useCallback((currentData: LiveSiteData | null): LiveSiteData | null => {
    const baseData = currentData || {
      exams: [],
      mockTests: [],
      questionBanks: [],
      catalogLoaded: false,
      loadedAt: Date.now()
    };

    const userActivities = user?.id ? activityTracker.getActivities(user.id, user.user_metadata) : [];
    const history = userActivities.filter(Boolean).map((h: any) => {
      const score = h.score !== undefined ? h.score : h.metadata?.score;
      const totalMarks = h.totalMarks !== undefined ? h.totalMarks : (h.metadata?.totalMarks || h.metadata?.total);
      const accuracy = h.accuracy !== undefined ? h.accuracy : h.metadata?.accuracy;
      const timeSpent = h.timeSpent !== undefined ? h.timeSpent : h.metadata?.timeTaken;
      const examName = h.metadata?.examName || h.metadata?.test?.exam;
      const testCategory = h.metadata?.testCategory || h.metadata?.test?.category;
      return {
        type: h.type,
        title: h.title,
        timestamp: h.timestamp,
        score,
        totalMarks,
        accuracy,
        timeSpent,
        examName,
        testCategory,
        metadata: h.metadata,
      };
    });

    const selectedExamId = sessionStorage.getItem('oep_selectedExam');

    const completions = userActivities.filter((a: any) => a && (a.type === 'mock_test_completed' || a.type === 'practice_test_completed'))
      .sort((a: any, b: any) => new Date(a?.timestamp || 0).getTime() - new Date(b?.timestamp || 0).getTime());

    let totalCorrect = 0;
    let totalWrong = 0;
    let totalAttempted = 0;
    let totalQuestions = 0;
    let totalTimeTaken = 0;
    let totalCalculatedScore = 0;
    let totalCalculatedScorePctSum = 0;

    const chartDataList: { name: string; score: number; accuracy: number; time: number; testName: string }[] = [];

    completions.forEach((a: any, i: number) => {
      const rawAnswers = a?.metadata?.answers || {};
      const questions = a?.metadata?.test?.questions || [];
      const hasRawData = questions.length > 0 && Object.keys(rawAnswers).length > 0;

      let actCorrect = 0;
      let actWrong = 0;
      let actAttempted = 0;
      let actTotalQ = 0;
      let negativeMarking = a?.metadata?.test?.negativeMarking ?? 0;

      if (hasRawData) {
        actTotalQ = questions.length;
        actAttempted = Object.keys(rawAnswers).length;
        
        Object.entries(rawAnswers).forEach(([qIdxStr, ansIdx]) => {
          const qIdx = parseInt(qIdxStr);
          const q = questions[qIdx];
          if (q && q.correctAnswerIndex === ansIdx) {
            actCorrect++;
          } else {
            actWrong++;
          }
        });
      } else {
        actCorrect = typeof a?.correct === 'number' 
          ? a.correct 
          : (typeof a?.metadata?.correctCount === 'number' 
            ? a.metadata.correctCount 
            : (typeof a?.metadata?.correct === 'number' 
              ? a.metadata.correct 
              : (typeof a?.score === 'number' && a.score > 0 ? Math.round(a.score) : 0)));
        actWrong = typeof a?.incorrect === 'number' 
          ? a.incorrect 
          : (typeof a?.metadata?.incorrectCount === 'number' 
            ? a.metadata.incorrectCount 
            : (typeof a?.metadata?.incorrect === 'number' 
              ? a.metadata.incorrect 
              : 0));
        actAttempted = a?.metadata?.attempted || (actCorrect + actWrong);
        actTotalQ = a?.totalMarks || a?.total || actAttempted;
      }

      const actScore = typeof a?.score === 'number' ? a.score : (actCorrect - (actWrong * negativeMarking));
      const timeTaken = a?.metadata?.timeTaken || a?.timeSpent || 0;

      const actMaxMarks = a.totalMarks || a.metadata?.test?.totalMarks || a.metadata?.totalMarks || actTotalQ || 1;
      const completionScorePct = isNaN(actScore) || isNaN(actMaxMarks) || actMaxMarks <= 0 
        ? 0 
        : Math.round((actScore / actMaxMarks) * 100);
      const completionAccuracy = isNaN(actCorrect) || isNaN(actAttempted) || actAttempted <= 0 
        ? 0 
        : Math.round((actCorrect / actAttempted) * 100);
      const completionTime = isNaN(timeTaken) || isNaN(actAttempted) || actAttempted <= 0 
        ? 0 
        : Math.round(timeTaken / actAttempted);

      totalCorrect += actCorrect;
      totalWrong += actWrong;
      totalAttempted += actAttempted;
      totalQuestions += actTotalQ;
      totalTimeTaken += timeTaken;
      totalCalculatedScore += actScore;
      totalCalculatedScorePctSum += isNaN(actScore) || isNaN(actMaxMarks) || actMaxMarks <= 0 
        ? 0 
        : (actScore / actMaxMarks) * 100;

      chartDataList.push({
        name: `T${i + 1}`,
        score: completionScorePct,
        accuracy: completionAccuracy,
        time: completionTime,
        testName: a?.title || `Mock Test ${i + 1}`
      });
    });

    const totalTests = completions.length;
    const avgAccuracy = isNaN(totalCorrect) || isNaN(totalAttempted) || totalAttempted <= 0 
      ? 0 
      : Math.round((totalCorrect / totalAttempted) * 100);
    const avgScore = totalTests > 0 ? Math.round(totalCalculatedScorePctSum / totalTests) : 0;
    const avgTimePerQuestion = isNaN(totalTimeTaken) || isNaN(totalAttempted) || totalAttempted <= 0 
      ? 0 
      : Math.round(totalTimeTaken / totalAttempted);

    const attemptedWithoutSkips = totalCorrect + totalWrong;
    const precision = isNaN(totalCorrect) || isNaN(attemptedWithoutSkips) || attemptedWithoutSkips <= 0 
      ? 0 
      : Math.round((totalCorrect / attemptedWithoutSkips) * 100);
    const speed = Math.max(0, Math.min(100, Math.round(100 - ((avgTimePerQuestion - 30) / (120 - 30)) * 100)));
    const endurance = Math.min(100, Math.round((totalQuestions / 300) * 100));

    let impScore = 0;
    if (totalTests >= 2) {
      const lastPoint = chartDataList[chartDataList.length - 1];
      const prevPoint = chartDataList[chartDataList.length - 2];
      if (lastPoint && prevPoint) {
        impScore = lastPoint.score - prevPoint.score;
      }
    }
    const momentum = Math.max(0, Math.min(100, Math.round(50 + (impScore * 2))));

    // Subject Breakdown (examAnalysis) calculation matching AnalyticsView.tsx exactly
    const examGroups = new Map<string, {
      lastAttemptDate: string,
      totalAttempts: number,
      practiceMap: Map<string, { correct: number, attempted: number }>,
      mockMap: Map<string, { correct: number, attempted: number }>
    }>();

    const cleanSubjectName = (name: string) => {
      if (!name) return "Mixed Questions";
      let cleaned = name;
      if (cleaned.match(/[0-9a-f]{8}-[0-9a-f]{4}/) || cleaned.match(/[0-9a-f]{8}/) || cleaned.includes('mockTest')) {
         cleaned = cleaned.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ig, '')
                          .replace(/[0-9a-f]{8}/ig, '')
                          .replace(/mockTest/ig, '')
                          .replace(/-/g, ' ')
                          .replace(/\s+/g, ' ')
                          .trim();
      }
      if (!cleaned || cleaned.length === 0 || cleaned === '•') {
         if (name.includes('•')) {
            const parts = name.split('•');
            cleaned = parts[0].trim();
         } else {
            cleaned = "Mixed Questions";
         }
      }
      if (cleaned.toLowerCase() === "general") {
         return "General Practice";
      }
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    };

    const extractSubjectFromTitle = (title: string, examName: string) => {
      const escapedExamName = examName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let t = title.replace(new RegExp(escapedExamName, 'i'), '')
                   .replace(/practice/i, '')
                   .replace(/test/i, '')
                   .replace(/mock/i, '')
                   .replace(/session/i, '')
                   .replace(/pyq/i, '')
                   .replace(/daily/i, '')
                   .replace(/-/g, '')
                   .trim();
      return t.length > 0 ? t : "Full Subject";
    };

    completions.forEach((a: any) => {
      let rawTitle = a.title || "";
      if (rawTitle.includes('mockTest') || rawTitle.match(/[0-9a-f]{8}/)) {
        rawTitle = rawTitle.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ig, '')
                           .replace(/[0-9a-f]{8}/ig, '')
                           .replace(/mockTest/ig, '')
                           .replace(/_/g, ' ')
                           .trim();
        if (!rawTitle) {
          rawTitle = "Practice Session";
        }
      }

      let examName = a.metadata?.examName || a.metadata?.test?.exam;
      if (!examName || examName.match(/[0-9a-f]{8}/)) {
         if (rawTitle.includes('-')) {
            examName = rawTitle.split('-')[0].trim();
         } else {
            examName = "General";
         }
      }

      const isMockTest = a.metadata?.testCategory 
         ? a.metadata.testCategory !== 'Practice Test'
         : (a.type === 'mock_test' || a.metadata?.test?.type === 'mock_test' || rawTitle.toLowerCase().includes('mock'));
         
      const dateStr = new Date(a.timestamp || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      if (!examGroups.has(examName)) {
        examGroups.set(examName, { lastAttemptDate: dateStr, totalAttempts: 0, practiceMap: new Map(), mockMap: new Map() });
      }
      const group = examGroups.get(examName)!;
      group.totalAttempts++;

      const rawAnswers = a.metadata?.answers || {};
      const questions = a.metadata?.test?.questions || [];
      const catMeta = a.metadata?.testCategory || a.metadata?.test?.category;
      const mapToUse = isMockTest ? group.mockMap : group.practiceMap;

      let actCorrect = 0;
      let actWrong = 0;
      let actAttempted = 0;
      let negativeMarking = a.metadata?.test?.negativeMarking ?? 0;

      if (questions.length > 0 && Object.keys(rawAnswers).length > 0) {
        Object.entries(rawAnswers).forEach(([qIdxStr, ansIdx]) => {
          const qIdx = parseInt(qIdxStr);
          const q = questions[qIdx];
          if (q) {
            let rawSub = q.subject || q.topic;
            if (!rawSub || rawSub.toLowerCase() === 'general' || rawSub.match(/[0-9a-f]{8}/)) {
               rawSub = extractSubjectFromTitle(rawTitle, examName);
            }
            if (isMockTest && catMeta && !catMeta.match(/[0-9a-f]{8}/)) {
               rawSub = rawSub.toLowerCase() === "full subject" || rawSub.toLowerCase() === "general" 
                  ? catMeta 
                  : `${catMeta} • ${rawSub}`;
            }
            const subject = cleanSubjectName(rawSub);
            const existing = mapToUse.get(subject) || { correct: 0, attempted: 0 };
            const isCorrect = q.correctAnswerIndex === ansIdx;
            
            mapToUse.set(subject, {
              correct: existing.correct + (isCorrect ? 1 : 0),
              attempted: existing.attempted + 1
            });
          }
        });
      } else {
         actCorrect = typeof a.correct === 'number' ? a.correct : (typeof a.score === 'number' && a.score > 0 ? a.score : 0);
         actWrong = typeof a.incorrect === 'number' ? a.incorrect : 0;
         actAttempted = a.metadata?.attempted || (actCorrect + actWrong);
         let rawSub = extractSubjectFromTitle(rawTitle, examName);
         if (isMockTest && catMeta && !catMeta.match(/[0-9a-f]{8}/)) {
            rawSub = rawSub.toLowerCase() === "full subject" || rawSub.toLowerCase() === "general" 
               ? catMeta 
               : `${catMeta} • ${rawSub}`;
         }
         const subject = cleanSubjectName(rawSub);
         const existing = mapToUse.get(subject) || { correct: 0, attempted: 0 };
         mapToUse.set(subject, {
            correct: existing.correct + actCorrect,
            attempted: existing.attempted + actAttempted
         });
      }
    });
    
    const examAnalysis = Array.from(examGroups.entries()).map(([name, data]) => {
      const formatMap = (m: Map<string, any>) => {
        return Array.from(m.entries()).map(([subName, sData]) => {
          const acc = sData.attempted > 0 ? (sData.correct / sData.attempted) * 100 : 0;
          return { 
             name: subName, 
             avgScore: Math.round(acc), 
             status: acc >= 70 ? 'Strong' : 'Weak',
             correct: sData.correct,
             attempted: sData.attempted
          };
        }).sort((a, b) => b.avgScore - a.avgScore);
      };

      return {
        examName: name,
        lastAttemptDate: data.lastAttemptDate,
        totalAttempts: data.totalAttempts,
        practiceTests: formatMap(data.practiceMap),
        mockTests: formatMap(data.mockMap)
      };
    });

    // Load serialized AI insights/checklists and checked actions from localStorage
    const diagnosticReport = user?.id ? (localStorage.getItem(`oep_analytics_diagnostic_report_${user.id}`) || '') : '';
    const actionItemsStr = user?.id ? (localStorage.getItem(`oep_analytics_action_items_${user.id}`) || '') : '';
    let actionItems: any[] = [];
    if (actionItemsStr) {
      try {
        actionItems = JSON.parse(actionItemsStr);
      } catch (e) {}
    }
    const checkedActions = user?.id ? (() => {
      try {
        return JSON.parse(localStorage.getItem(`oep_analytics_checked_actions_${user.id}`) || '{}');
      } catch {
        return {};
      }
    })() : {};

    const roundedCorrect = Math.round(totalCorrect);
    const roundedWrong = Math.round(totalWrong);

    const analytics = totalTests > 0 ? {
      totalTests,
      avgScore,
      avgAccuracy,
      avgTimePerQuestion,
      totalCorrect: roundedCorrect,
      totalWrong: roundedWrong,
      totalQuestions,
      chartData: chartDataList.slice(-15),
      precision,
      speed,
      endurance,
      momentum,
      examAnalysis,
      diagnosticReport,
      actionItems,
      checkedActions
    } : null;

    const purchased = profile?.purchasedSeries || [];
    const isFullAccess = !!(profile?.hasFullAccess || profile?.role === 'admin');

    // Build seriesId → examId map from testSeries (matching App.tsx resolution logic)
    const seriesExamMap: Record<string, string> = {};
    if (baseData.testSeries) {
      baseData.testSeries.forEach((s: any) => {
        if (s.id && s.examId) {
          seriesExamMap[s.id] = s.examId;
        }
      });
    }

    const resolveUnlocked = (
      mappedExams: any[],
      mappedMockTests: any[],
      mappedQuestionBanks: any[]
    ) => {
      const uExams: string[] = [];
      const uMockTests: string[] = [];
      const uQuestionBanks: string[] = [];

      mappedExams.forEach((e: any) => {
        const isExamPremium = e.price !== undefined && e.price > 0;
        if (!isExamPremium || hasAccessTo(`exam_bundle_${e.id}`)) {
          uExams.push(e.name);
        }
      });

      mappedMockTests.forEach((t: any) => {
        const resolvedExamId = t.examId || t._resolvedExamId || (t.seriesId && seriesExamMap[t.seriesId]);
        if (!t.isPremium) return;
        if (hasAccessTo(t, resolvedExamId)) {
          uMockTests.push(t.title);
        }
      });

      mappedQuestionBanks.forEach((b: any) => {
        if (!b.isPremium) return;
        if (hasAccessTo(b, b.examId)) {
          uQuestionBanks.push(b.title);
        }
      });

      return { uExams, uMockTests, uQuestionBanks };
    };

    const { uExams, uMockTests, uQuestionBanks } = resolveUnlocked(baseData.exams, baseData.mockTests, baseData.questionBanks);

    const metadata = user?.user_metadata || {};
    const plannerMeta = metadata.study_coach_planner || {};
    const practiceMeta = metadata.study_coach_practice || {};
    const syllabusMeta = metadata.study_coach_syllabus || {};
    const formulasMeta = metadata.study_coach_formulas || {};

    const targetExam = plannerMeta.targetExam || localStorage.getItem('study_coach_target_exam') || 'OPSC OAS';
    
    const completedSessions = plannerMeta.completedSessionsCount !== undefined 
      ? Number(plannerMeta.completedSessionsCount) 
      : parseInt(localStorage.getItem('study_coach_completed_sessions') || '0', 10);
      
    const completedStudyMinutes = plannerMeta.completedStudyMinutes !== undefined 
      ? Number(plannerMeta.completedStudyMinutes) 
      : parseInt(localStorage.getItem('study_coach_completed_study_minutes') || '0', 10);

    const plannerBlocks = plannerMeta.plannerBlocks || (() => {
      try { return JSON.parse(localStorage.getItem('study_coach_planner_blocks') || '[]'); } catch { return []; }
    })();

    const activeBlockIndex = plannerMeta.activeBlockIndex !== undefined 
      ? Number(plannerMeta.activeBlockIndex) 
      : (() => {
          const val = localStorage.getItem('study_coach_active_block_index');
          return val !== null ? Number(val) : -1;
        })();

    const plannerGoal = plannerMeta.plannerGoal || localStorage.getItem('study_coach_planner_goal') || '';
    const plannerEnergy = plannerMeta.plannerEnergy || localStorage.getItem('study_coach_planner_energy') || '';

    const quizHistory = practiceMeta.quizHistory || (() => {
      try { return JSON.parse(localStorage.getItem('study_coach_quiz_history') || '[]'); } catch { return []; }
    })();

    const bookmarkedQuestions = practiceMeta.bookmarkedQuestions || (() => {
      try { return JSON.parse(localStorage.getItem('study_coach_bookmarks') || '[]'); } catch { return []; }
    })();

    const collections = syllabusMeta.collections || (() => {
      try { return JSON.parse(localStorage.getItem(`study_coach_collections_${user?.id || 'guest'}`) || '[]'); } catch { return []; }
    })();

    const formulaCategories = formulasMeta.formulaCategories || (() => {
      try { return JSON.parse(localStorage.getItem('study_coach_formula_categories') || '[]'); } catch { return []; }
    })();

    const aiMentorState = {
      targetExam,
      completedSessions,
      completedStudyMinutes,
      quizHistoryCount: quizHistory.length,
      bookmarksCount: bookmarkedQuestions.length,
      plannerBlocks,
      activeBlockIndex,
      plannerGoal,
      plannerEnergy,
      quizHistory,
      bookmarkedQuestions,
      collections,
      formulaCategories,
    };

    return {
      ...baseData,
      history,
      selectedExamId,
      selectedExamName: baseData.exams.find((e: any) => e.id === selectedExamId)?.name || selectedExamId,
      unlockedExams: uExams,
      unlockedMockTests: uMockTests,
      unlockedQuestionBanks: uQuestionBanks,
      analytics,
      aiMentorState,
      isFullAccess,
    };
  }, [user, profile]);

  useEffect(() => {
    // Load local storage activities immediately on mount
    setSiteData(prev => getFreshUserDynamicData(prev));

    const handleActivityChange = () => {
      setSiteData(prev => getFreshUserDynamicData(prev));
    };
    window.addEventListener('oep-activity-changed', handleActivityChange);
    window.addEventListener('oep-aimentor-changed', handleActivityChange);
    return () => {
      window.removeEventListener('oep-activity-changed', handleActivityChange);
      window.removeEventListener('oep-aimentor-changed', handleActivityChange);
    };
  }, [getFreshUserDynamicData]);

  /* ── Hide/adjust during active mock/practice tests & review modes ── */
  useEffect(() => {
    const check = () => {
      setIsTestMode(document.body.hasAttribute('data-test-mode'));
      setIsReviewMode(document.body.hasAttribute('data-review-mode'));
      setIsReviewBottomNav(document.body.hasAttribute('data-review-bottom-nav'));
      setIsMobileBannerVisible(!!document.getElementById('mobile-payment-banner'));
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['data-test-mode', 'data-review-mode', 'data-review-bottom-nav'],
      childList: true,
      subtree: true
    });
    return () => observer.disconnect();
  }, []);

  /* ── Hide/slide-down when a modal is active on screen ── */
  useEffect(() => {
    const checkModals = () => {
      const fixedElements = document.querySelectorAll('.fixed.inset-0');
      let found = false;
      for (let i = 0; i < fixedElements.length; i++) {
        const el = fixedElements[i];
        const className = el.className || '';
        if (
          (className.includes('bg-black') || className.includes('bg-slate-950') || className.includes('bg-slate-900')) &&
          className.includes('backdrop-blur')
        ) {
          found = true;
          break;
        }
      }
      setHasModalActive(found);
    };

    checkModals();

    const observer = new MutationObserver(checkModals);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);
  /* ── Load live site data from Supabase when widget opens ── */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const loadSiteData = async (force = false) => {
    // If props are passed, use them directly and update state
    if (examsProp && mockTestsProp && questionBanksProp) {
      let flatQBanks: any[] = [];
      if (Array.isArray(questionBanksProp)) {
        flatQBanks = questionBanksProp;
      } else if (typeof questionBanksProp === 'object') {
        flatQBanks = Object.values(questionBanksProp).flat();
      }

      const mappedExams = examsProp
        .filter((e: any) => e.category !== 'blog' && e.category !== 'system' && !e.name.startsWith('SYSTEM_'))
        .map((e: any) => ({
          id: e.id || e.name,
          name: e.name,
          description: cleanDescription(e.description),
          category: e.category,
          price: parseExamPrice(e.description),
        }));

      const mappedMockTests = mockTestsProp.map((t: any) => {
        let price: number | undefined = t.price;
        let isPremium = t.isPremium ?? false;
        return {
          id: t.id,
          title: t.title,
          durationMinutes: t.durationMinutes,
          totalMarks: t.totalMarks,
          isPremium,
          price,
          examId: t.examId,
        };
      });

      const mappedQuestionBanks = flatQBanks.map((b: any) => ({
        id: b.id,
        title: b.title,
        type: b.type,
        questionCount: b.questionCount,
        isPremium: b.isPremium,
        price: parseQuestionBankPrice(b.tagline) ?? b.price,
        examId: b.examId,
      }));

      const staticData: LiveSiteData = {
        exams: mappedExams,
        mockTests: mappedMockTests,
        questionBanks: mappedQuestionBanks,
        catalogLoaded: true,
        loadedAt: Date.now()
      };
      setSiteData(getFreshUserDynamicData(staticData));
      setDataLoading(false);
      setDataError(false);
      return;
    }

    // Cache for 30 seconds fallback - refresh dynamic activities anyway
    if (!force && siteData && Date.now() - siteData.loadedAt < 30 * 1000) {
      setSiteData(prev => getFreshUserDynamicData(prev));
      return;
    }

    if (force) {
      setSiteData(null);
    }
    setDataLoading(true);
    setDataError(false);
    try {
      const [exams, mockTestsRaw, questionBanks, testSeries] = await Promise.all([
        examService.getAllExams(),
        examService.getAllMockTestsLite(),
        examService.getAllQuestionBanks(),
        examService.getAllTestSeries(),
      ]);

      const mappedExams = exams
        .filter((e: any) => e.category !== 'blog' && e.category !== 'system' && !e.name.startsWith('SYSTEM_'))
        .map((e: any) => ({
          id: e.id,
          name: e.name,
          description: cleanDescription(e.description),
          category: e.category,
          price: parseExamPrice(e.description),
        }));

      const mappedMockTests = mockTestsRaw.map((t: any) => {
        let price: number | undefined;
        let isPremium = t.isPremium ?? false;
        // Extract price from seriesId JSON if present
        if (typeof t.seriesId === 'string' && t.seriesId.startsWith('{')) {
          try {
            const meta = JSON.parse(t.seriesId);
            price = meta.price;
            isPremium = meta.isPremium ?? isPremium;
          } catch {}
        } else if (t.seriesId && typeof t.seriesId === 'object') {
          price = t.seriesId.price;
          isPremium = t.seriesId.isPremium ?? isPremium;
        }
        return {
          id: t.id,
          title: t.title,
          durationMinutes: t.durationMinutes,
          totalMarks: t.totalMarks,
          isPremium,
          price,
          examId: t.examId,
          seriesId: typeof t.seriesId === 'string' && !t.seriesId.startsWith('{') ? t.seriesId : undefined,
        };
      });

      const mappedQuestionBanks = questionBanks.map(b => ({
        id: b.id,
        title: b.title,
        type: b.type,
        questionCount: b.questionCount,
        isPremium: b.isPremium,
        price: parseQuestionBankPrice(b.tagline) ?? (b as any).price,
        examId: b.examId,
      }));

      const mappedTestSeries = (testSeries || []).map((s: any) => ({
        id: s.id,
        examId: s.examId,
        title: s.title,
      }));

      const staticData: LiveSiteData = {
        exams: mappedExams,
        mockTests: mappedMockTests,
        questionBanks: mappedQuestionBanks,
        testSeries: mappedTestSeries,
        catalogLoaded: true,
        loadedAt: Date.now()
      };
      setSiteData(getFreshUserDynamicData(staticData));
    } catch (err) {
      console.error('OEP Buddy: failed to load site data', err);
      setDataError(true);
    } finally {
      setDataLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (isOpen) loadSiteData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, examsProp, mockTestsProp, questionBanksProp]);

  // Auto-scroll
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (isOpen && !isMinimized) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Focus input
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, isMinimized]);

  // Only for logged-in users
  if (!user) return null;

  // Hide completely during active mock/practice tests
  if (isTestMode) return null;

  const firstName = profile?.displayName?.split(' ')[0] || 'there';

  /* ── Send message with grounded system prompt ── */
  const sendMessage = async (text: string) => {
    const userText = text.trim();
    if (!userText || loading) return;

    setShowBadge(false);
    setMessages(prev => [...prev, { role: 'user', content: userText }, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const latestSiteData = getFreshUserDynamicData(siteData);
      if (latestSiteData) {
        setSiteData(latestSiteData);
      }
      const systemPrompt = buildSystemPrompt(latestSiteData, firstName, activeTab);

      const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: userText },
          ],
          temperature: 0.15, // lower = less hallucination
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`Error ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      if (!reader) throw new Error('No reader');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content || '';
            if (delta) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + delta,
                };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: "Sorry, I couldn't connect right now. Please try again in a moment, or reach us on WhatsApp at +91 7377431715 🙏",
          };
          return updated;
        });
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setLoading(false);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setShowBadge(false);
  };

  if (isDismissed) return null;

  return (
    <>
      {/* ── Floating Trigger Button ── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="trigger"
            initial={{ opacity: 0, scale: 0.5, y: 40 }}
            animate={{ 
              opacity: (hasModalActive || !isVisible) ? 0 : 1, 
              scale: (hasModalActive || !isVisible) ? 0.5 : 1, 
              y: triggerYOffset 
            }}
            exit={{ opacity: 0, scale: 0.5, y: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={handleOpen}
            className={cn(
              "fixed right-4 sm:right-6 z-[80] group focus:outline-none",
              getBaseCompanionBottomClass(false)
            )}
            style={{ pointerEvents: (hasModalActive || !isVisible) ? 'none' : 'auto' }}
            title="Ask OEP Buddy"
            aria-label="Open AI Companion"
          >
            {/* Close/Dismiss Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDismissed(true);
              }}
              className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center border border-white/20 shadow-md hover:bg-slate-800 hover:scale-110 active:scale-95 transition-all duration-200 z-[90] cursor-pointer"
              title="Dismiss AI Companion"
              aria-label="Dismiss AI Companion"
            >
              <X className="w-3 h-3 text-slate-300" strokeWidth={3} />
            </button>
            <span className="absolute inset-0 rounded-2xl bg-brand-500 animate-ping opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(138,28,54,0.4)] group-hover:shadow-[0_14px_40px_rgba(138,28,54,0.55)] transition-[box-shadow] duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-white relative z-10 drop-shadow-sm" />
            </div>
            {showBadge && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-md"
              >
                AI
              </motion.span>
            )}
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
              Ask OEP Buddy ✨
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat Widget ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="widget"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ 
              opacity: hasModalActive ? 0 : 1, 
              scale: hasModalActive ? 0.9 : 1, 
              y: widgetYOffset 
            }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'fixed z-[80] bg-white flex flex-col overflow-hidden',
              isMinimized 
                ? 'rounded-3xl shadow-lg left-3 right-3 sm:left-auto sm:right-6 w-auto sm:w-[390px] h-auto border border-slate-200/50 ' + getBaseCompanionBottomClass(false)
                : cn(
                    // Mobile open style: docked bottom sheet
                    'left-0 right-0 bottom-0 rounded-t-[1.75rem] rounded-b-none w-full h-[78dvh] max-h-[85dvh] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] border-t border-slate-200/40',
                    // Desktop open style: floating card
                    'sm:left-auto sm:right-6 sm:bottom-auto sm:w-[390px] sm:rounded-3xl sm:shadow-[0_24px_70px_rgba(0,0,0,0.12),0_8px_24px_rgba(138,28,54,0.04)] sm:border sm:border-slate-200/50',
                    effectiveBottomNavVisible ? 'sm:h-[540px]' : 'sm:h-[570px]',
                    getBaseCompanionBottomClass(true)
                  )
            )}
            style={{ 
              pointerEvents: hasModalActive ? 'none' : 'auto',
              transitionProperty: 'width, height, border-radius, box-shadow, border-color',
              transitionDuration: '300ms',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* ── Header ── */}
            <div className="shrink-0 bg-gradient-to-r from-brand-800 via-brand-700 to-brand-600 px-4 py-3 sm:py-3.5 flex flex-col gap-1.5 sm:gap-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              {/* Mobile drag handle line */}
              <div className="w-12 h-1 bg-white/25 rounded-full mx-auto mb-1.5 sm:hidden shrink-0" />
              <div className="flex items-center gap-3 w-full">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center border border-white/20 backdrop-blur-sm">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-black text-sm leading-tight tracking-wide">OEP Buddy</p>
                    {dataLoading && (
                      <span className="flex items-center gap-1 bg-white/15 text-white/80 text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        Loading data…
                      </span>
                    )}
                    {dataError && (
                      <span className="flex items-center gap-1 bg-amber-500/30 text-amber-200 text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                        <AlertCircle className="w-2.5 h-2.5" />
                        Offline mode
                      </span>
                    )}
                  </div>
                  <p className="text-white/70 text-[10px] font-semibold truncate">Your AI Study Companion ✨</p>
                </div>
                <div className="flex items-center gap-1 relative z-10">
                  {siteData && (
                    <button
                      onClick={() => loadSiteData(true)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all"
                      title="Refresh website data"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {messages.length > 0 && (
                    <button onClick={clearChat} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all" title="Clear chat">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => setIsMinimized(v => !v)} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all" title={isMinimized ? 'Expand' : 'Minimize'}>
                    {isMinimized ? <Sparkles className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => setIsOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/15 hover:scale-105 active:scale-95 transition-all" title="Close">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Body ── */}
            {!isMinimized && (
              <>
                {/* Data loading banner */}
                {dataLoading && (
                  <div className="shrink-0 bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center gap-2">
                    <RefreshCw className="w-3 h-3 text-amber-500 animate-spin shrink-0" />
                    <p className="text-[10px] text-amber-700 font-semibold">Fetching live exam & pricing data from the platform…</p>
                  </div>
                )}
                {dataError && (
                  <div className="shrink-0 bg-red-50 border-b border-red-100 px-4 py-2 flex items-center gap-2">
                    <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                    <p className="text-[10px] text-red-600 font-semibold">Couldn't load live data. Answers may be limited.
                      <button onClick={() => loadSiteData()} className="ml-1 underline font-bold">Retry</button>
                    </p>
                  </div>
                )}

                {/* Messages */}
                <div 
                  className="flex-1 overflow-y-auto px-3 py-3 space-y-3 overscroll-contain" 
                  style={{ 
                    scrollbarWidth: 'none',
                    WebkitOverflowScrolling: 'touch',
                    willChange: 'transform'
                  }}
                >
                  {messages.length === 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="space-y-4 py-1"
                    >
                      {/* Premium Welcome Card */}
                      <div className="relative overflow-hidden bg-gradient-to-br from-brand-50/70 via-slate-50/50 to-white border border-brand-100/60 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-sm">
                        {/* Glow decorative element */}
                        <div className="absolute -right-8 -top-8 w-24 h-24 bg-gradient-to-br from-brand-300/10 to-brand-500/10 rounded-full blur-xl" />
                        
                        <div className="flex items-center gap-3 mb-2 relative z-10">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md shadow-brand-900/10">
                            <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-bounce-subtle" style={{ animationDuration: '3s' }} />
                          </div>
                          <div>
                            <h3 className="text-[9px] sm:text-[10px] font-black text-slate-400 tracking-wider uppercase">OEP Companion</h3>
                            <h2 className="text-[11.5px] sm:text-xs font-extrabold bg-gradient-to-r from-brand-600 to-brand-800 bg-clip-text text-transparent">
                              Namaskar, {firstName}! 🙏
                            </h2>
                          </div>
                        </div>

                        <p className="text-[10.5px] sm:text-[11px] text-slate-600 leading-relaxed font-semibold relative z-10">
                          I'm <strong className="text-brand-600 font-bold">OEP Buddy</strong>, your AI prep partner. Ask me about Odisha government exams, mock test counts, prices, or study tips!
                        </p>
                      </div>

                      {/* Live Platform Status Panel */}
                      {siteData && siteData.catalogLoaded ? (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-slate-50/70 border border-slate-200/40 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-xs transition-all duration-300 hover:border-brand-200/60 hover:-translate-y-0.5 group">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-indigo-50 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform duration-300">
                              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                            </div>
                            <span className="text-[11.5px] sm:text-xs font-black text-slate-800 leading-tight">{siteData.exams.length}</span>
                            <span className="text-[7.5px] sm:text-[8px] font-extrabold text-slate-400 uppercase tracking-wide mt-0.5">Exams</span>
                          </div>
                          
                          <div className="bg-slate-50/70 border border-slate-200/40 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-xs transition-all duration-300 hover:border-brand-200/60 hover:-translate-y-0.5 group">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-50 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform duration-300">
                              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
                            </div>
                            <span className="text-[11.5px] sm:text-xs font-black text-slate-800 leading-tight">{siteData.mockTests.length}</span>
                            <span className="text-[7.5px] sm:text-[8px] font-extrabold text-slate-400 uppercase tracking-wide mt-0.5">Mock Tests</span>
                          </div>

                          <div className="bg-slate-50/70 border border-slate-200/40 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-xs transition-all duration-300 hover:border-brand-200/60 hover:-translate-y-0.5 group">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform duration-300">
                              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                            </div>
                            <span className="text-[11.5px] sm:text-xs font-black text-slate-800 leading-tight">{siteData.questionBanks.length}</span>
                            <span className="text-[7.5px] sm:text-[8px] font-extrabold text-slate-400 uppercase tracking-wide mt-0.5">Q-Banks</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-2 text-[10px] text-slate-400 font-semibold gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                          <span>Connecting to website database...</span>
                        </div>
                      )}

                      {/* Suggested Questions Section */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 pl-1">
                          <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-brand-500 animate-pulse" />
                          <h4 className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Suggested Questions</h4>
                        </div>
                        <div className="flex flex-row overflow-x-auto gap-2 pb-2.5 pt-0.5 px-0.5 no-scrollbar snap-x snap-mandatory sm:flex-col sm:gap-2">
                          {QUICK_PROMPTS.map((p, i) => {
                            // Extract emoji and question text
                            const match = p.match(/^([^\w\s\d]+)?\s*(.*)$/);
                            const emoji = match?.[1] || '❓';
                            const text = match?.[2] || p;
                            
                            return (
                              <motion.button
                                key={i}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => sendMessage(p)}
                                className="w-[66vw] sm:w-full flex items-center gap-2 bg-slate-50/70 hover:bg-brand-50/30 border border-slate-200/50 hover:border-brand-200/80 text-left px-3 py-2 sm:py-2.5 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] group cursor-pointer shadow-xs hover:shadow-sm shrink-0 snap-start"
                              >
                                <span className="w-6 h-6 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-xs text-[10px] shrink-0 group-hover:bg-brand-50 group-hover:border-brand-100 transition-colors duration-300">
                                  {emoji}
                                </span>
                                <span className="text-[10.5px] sm:text-[11px] font-semibold text-slate-600 group-hover:text-brand-800 flex-1 leading-snug transition-colors duration-300 line-clamp-2">
                                  {text}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-600 translate-x-0 group-hover:translate-x-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300 shrink-0 hidden sm:block" />
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={cn('flex items-start gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}
                      >
                        <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5', isUser ? 'bg-brand-600 text-white' : 'bg-brand-50 border border-brand-100')}>
                          {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5 text-brand-600" />}
                        </div>
                        <div className={cn('px-3 py-2.5 rounded-2xl max-w-[84%] shadow-sm text-xs leading-relaxed', isUser ? 'bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-tr-sm' : 'bg-slate-50 border border-slate-100/80 text-slate-700 rounded-tl-sm')}>
                          {isUser ? <p>{msg.content}</p> : <RenderMessage text={msg.content} />}
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Bar */}
                <div className="shrink-0 border-t border-slate-100 bg-white/95 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-3 pb-[calc(8px+env(safe-area-inset-bottom))] sm:pb-3">
                  <form onSubmit={e => { e.preventDefault(); sendMessage(input); }} className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ask about exams, pricing, features…"
                        disabled={loading}
                        className="w-full text-xs bg-slate-50/70 border border-slate-200/60 rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-400/80 focus:bg-white transition-all duration-300 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!input.trim() || loading}
                      className={cn(
                        'w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300',
                        input.trim() && !loading
                          ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-900/15 hover:shadow-brand-500/25 hover:scale-105 active:scale-95'
                          : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                      )}
                      title="Send"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2.5} />}
                    </button>
                  </form>
                  <p className="text-[9px] text-slate-400 text-center mt-1.5 font-semibold">
                    OEP Buddy · Real-time data from OdishaExamPrep
                  </p>
                </div>
              </>
            )}

            {/* Minimized state */}
            {isMinimized && (
              <button onClick={() => setIsMinimized(false)} className="flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 transition-colors w-full">
                <Sparkles className="w-4 h-4 text-brand-500 shrink-0" />
                <span className="text-xs font-semibold text-slate-600 flex-1 truncate">
                  {messages.length > 0 ? messages[messages.length - 1].content.slice(0, 55) + '…' : 'Ask me about exams, pricing, features…'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 rotate-180" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StickyAICompanion;
