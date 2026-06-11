import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { examService } from '../lib/examService';
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
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface LiveSiteData {
  exams: { name: string; description: string; category: string }[];
  mockTests: { title: string; durationMinutes: number; totalMarks: number; isPremium?: boolean; price?: number }[];
  questionBanks: { title: string; type: string; questionCount: number; isPremium: boolean; price?: number }[];
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

/* ─────────────────────────────────────────────
   Build a grounded system prompt from live data
───────────────────────────────────────────── */
function buildSystemPrompt(data: LiveSiteData | null, userName: string): string {
  const popularExams = data?.exams.filter(e => e.category === 'popular') ?? [];
  const upcomingExams = data?.exams.filter(e => e.category === 'upcoming') ?? [];
  const allExamNames = data?.exams.map(e => e.name) ?? [];

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
    ? popularExams.map(e => `• ${e.name}${e.description ? ` — ${e.description}` : ''}`).join('\n')
    : 'Not loaded';

  const upcomingStr = upcomingExams.length
    ? upcomingExams.map(e => `• ${e.name}${e.description ? ` — ${e.description}` : ''}`).join('\n')
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
    parts.push('- Payment via Razorpay (UPI, cards, netbanking) — instant access after payment');
    parts.push('- Refund window: 7 days if the platform doesn\'t work for you');
    return parts.join('\n') || '- Contact support for latest pricing info';
  })();

  return `You are "OEP Buddy", the official AI companion for OdishaExamPrep — a premium exam preparation platform for Odisha government exam aspirants. The current student's name is "${userName}".

## ⚠️ CRITICAL RULES — READ CAREFULLY
1. **Only answer based on the REAL DATA below.** Do NOT invent exam names, prices, test counts, or features that are not explicitly listed in this prompt.
2. If specific data is not available (e.g., student asks about a specific test not in the list), say: "I don't have that specific information right now. Please check the Courses tab or contact us on WhatsApp at +91 7377431715."
3. Never guess or hallucinate. If uncertain, redirect to support.
4. Be warm, concise (2-4 sentences), and use bullet points for lists.
5. Do NOT mention ChatGPT, Claude, or any external AI. You are "OEP Buddy" only.

---

## 🎓 REAL EXAMS IN THE PLATFORM (live from database)

### Popular Exams:
${popularStr}

### Upcoming Exams:
${upcomingStr}

### All Available Exams (${allExamNames.length} total):
${examListStr}

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

## 💰 REAL PRICING (live from database):
${pricingStr}

---

## 🤖 PLATFORM FEATURES (verified, do NOT hallucinate beyond these):

### AI Mentor Tab:
- Full-page AI tutor (Quick mode: fast answers, Best mode: deep analysis)
- Ask any academic question: Odisha history, polity, maths, English, Odia grammar, GK, reasoning
- Syllabus Manager: maintain topics, get AI quiz or summary on any topic
- Dynamic MCQ Quizzer: AI-generates MCQs on any subject
- Study Planner, Formula Library, Bookmarked Questions
- Chat history saved per session

### Analytics Tab (AI Performance Lab):
- See average score, accuracy, speed (seconds per question), improvement %
- AI Insights: strengths & weaknesses analysis
- Action Plan: personalized 5-day or 7-day study roadmap
- AI Performance Coach: chat interface for performance questions
- Study Assistant: smart prompt chips based on actual test data
- "Rescan Analytics" button refreshes insights from latest tests

### Mock Test System:
- Timed tests, auto-evaluated with score + accuracy
- Each question shows correct answer + detailed explanation after submission
- Difficulty: Easy, Medium, Hard
- Students can resume interrupted tests
- Test history and scores tracked in History tab

### Courses / Library Tab:
- Curated study material per exam: PDFs, notes, PYQs
- Locked content unlocked after purchase
- Library tab shows only unlocked purchased content

### History Tab:
- All past mock tests and practice sessions with scores, date, duration
- Can review completed tests and result breakdowns

### Account:
- Login via Google or Email/Password
- Profile shows name, email, purchased plans
- Logout from top-right corner menu

### Support:
- WhatsApp: +91 7377431715
- Email: odishaexamprep365@gmail.com

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
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-slate-800">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-slate-100 text-brand-700 px-1 py-0.5 rounded text-[10px] font-mono">$1</code>');
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
interface StickyAICompanionProps {
  isBottomNavVisible?: boolean;
}

const StickyAICompanion: React.FC<StickyAICompanionProps> = ({ isBottomNavVisible = true }) => {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBadge, setShowBadge] = useState(true);
  const [siteData, setSiteData] = useState<LiveSiteData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);



  /* ── Load live site data from Supabase when widget opens ── */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const loadSiteData = async () => {
    // Cache for 5 minutes
    if (siteData && Date.now() - siteData.loadedAt < 5 * 60 * 1000) return;
    setDataLoading(true);
    setDataError(false);
    try {
      const [exams, mockTestsRaw, questionBanks] = await Promise.all([
        examService.getAllExams(),
        examService.getAllMockTestsLite(),
        examService.getAllQuestionBanks(),
      ]);

      const mockTests = mockTestsRaw.map((t: any) => {
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
          title: t.title,
          durationMinutes: t.durationMinutes,
          totalMarks: t.totalMarks,
          isPremium,
          price,
        };
      });

      setSiteData({
        exams: exams.map(e => ({ name: e.name, description: e.description, category: e.category })),
        mockTests,
        questionBanks: questionBanks.map(b => ({
          title: b.title,
          type: b.type,
          questionCount: b.questionCount,
          isPremium: b.isPremium,
          price: undefined, // QuestionBank type doesn't have price field directly
        })),
        loadedAt: Date.now(),
      });
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
  }, [isOpen]);

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

  // Listen for body attribute changes set by DashboardContent when a test is active
  const [isTestMode, setIsTestMode] = useState(() => document.body.hasAttribute('data-test-mode'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsTestMode(document.body.hasAttribute('data-test-mode'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-test-mode'] });
    return () => observer.disconnect();
  }, []);

  if (isTestMode) return null;

  // Only for logged-in users
  if (!user) return null;

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
      const systemPrompt = buildSystemPrompt(siteData, firstName);

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

  return (
    <>
      {/* ── Floating Trigger Button ── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="trigger"
            initial={{ opacity: 0, scale: 0.5, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            onClick={handleOpen}
            className={cn(
              "fixed right-4 sm:right-6 z-[200] group focus:outline-none transition-all duration-300",
              isBottomNavVisible ? "bottom-24 sm:bottom-28" : "bottom-8 sm:bottom-8"
            )}
            title="Ask OEP Buddy"
            aria-label="Open AI Companion"
          >
            <span className="absolute inset-0 rounded-2xl bg-brand-500 animate-ping opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(138,28,54,0.4)] group-hover:shadow-[0_14px_40px_rgba(138,28,54,0.55)] transition-all duration-300 overflow-hidden">
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
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className={cn(
              'fixed left-3 right-3 sm:left-auto sm:right-6 z-[200] w-auto sm:w-[390px] bg-white rounded-[1.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.15),0_4px_16px_rgba(0,0,0,0.06)] border border-slate-200/60 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-none transition-all duration-300',
              isMinimized 
                ? (isBottomNavVisible ? 'h-auto bottom-24 sm:bottom-28' : 'h-auto bottom-8 sm:bottom-8') 
                : (isBottomNavVisible ? 'bottom-24 sm:bottom-28 h-[500px] sm:h-[540px]' : 'bottom-8 sm:bottom-8 h-[540px] sm:h-[570px]')
            )}
          >
            {/* ── Header ── */}
            <div className="shrink-0 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 px-4 py-3 flex items-center gap-3 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              <div className="relative shrink-0">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center border border-white/20 backdrop-blur-sm">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
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
                    onClick={() => { setSiteData(null); loadSiteData(); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-all"
                    title="Refresh website data"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
                {messages.length > 0 && (
                  <button onClick={clearChat} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-all" title="Clear chat">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => setIsMinimized(v => !v)} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-all" title={isMinimized ? 'Expand' : 'Minimize'}>
                  {isMinimized ? <Sparkles className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setIsOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-all" title="Close">
                  <X className="w-3.5 h-3.5" />
                </button>
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
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ scrollbarWidth: 'thin' }}>
                  {messages.length === 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      {/* Welcome bubble */}
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-3.5 h-3.5 text-brand-600" />
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[88%]">
                          <p className="text-xs text-slate-700 leading-relaxed">
                            👋 Hey <strong className="text-brand-600">{firstName}</strong>! I'm <strong>OEP Buddy</strong> — your AI companion for OdishaExamPrep.
                          </p>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            I have access to your platform's <strong>live exam list, mock tests, and pricing</strong>. Ask me anything! 🎯
                          </p>
                          {siteData && (
                            <p className="text-[10px] text-emerald-600 font-semibold mt-1.5">
                              ✓ {siteData.exams.length} exams · {siteData.mockTests.length} mock tests · {siteData.questionBanks.length} question banks loaded
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Quick prompt chips */}
                      <div className="pl-8">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Quick questions</p>
                        <div className="flex flex-wrap gap-1.5">
                          {QUICK_PROMPTS.map((p, i) => (
                            <motion.button
                              key={i}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.04 }}
                              onClick={() => sendMessage(p)}
                              className="text-[10px] font-semibold bg-slate-50 hover:bg-brand-50 border border-slate-200/80 hover:border-brand-200 text-slate-600 hover:text-brand-700 px-2.5 py-1.5 rounded-xl transition-all duration-150 active:scale-95 text-left"
                            >
                              {p}
                            </motion.button>
                          ))}
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
                <div className="shrink-0 border-t border-slate-100 bg-white px-3 py-2.5">
                  <form onSubmit={e => { e.preventDefault(); sendMessage(input); }} className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ask about exams, pricing, features…"
                        disabled={loading}
                        className="w-full text-xs bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-300 focus:bg-white transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!input.trim() || loading}
                      className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200',
                        input.trim() && !loading
                          ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-900/20 hover:shadow-brand-500/30 hover:scale-105 active:scale-95'
                          : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                      )}
                      title="Send"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" strokeWidth={2.5} />}
                    </button>
                  </form>
                  <p className="text-[9px] text-slate-400 text-center mt-1.5 font-medium">
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
