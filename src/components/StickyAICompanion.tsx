import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
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
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/* ─────────────────────────────────────────────
   Quick-prompt chips shown before first message
───────────────────────────────────────────── */
const QUICK_PROMPTS = [
  '📚 How do I use the AI Mentor?',
  '📊 Explain my Analytics section',
  '💳 What are the pricing plans?',
  '🎯 How do Mock Tests work?',
  '🏆 Which exam should I prepare for?',
  '📝 How to track my progress?',
];

/* ─────────────────────────────────────────────
   System prompt — deep knowledge of the website
───────────────────────────────────────────── */
const SYSTEM_PROMPT = `You are "OEP Buddy", the friendly and knowledgeable AI companion for OdishaExamPrep (https://odishaexamprep.com) — a premium online exam preparation platform built exclusively for Odisha government exam aspirants.

## Your Role
You assist logged-in students with EVERYTHING related to OdishaExamPrep: how to use features, understanding their analytics, pricing, exam strategy, content navigation, and study tips. You are warm, concise, and motivational.

## Platform Features You Know

### 🎓 Exams Covered
OPSC OAS, OPSC OES, OSSC (CGL, RI/ARI, Clerk), OSSSC, Police SI/Constable, Forest Guard, and other Odisha state government exams.

### 📝 Mock Test System
- Students can take full-length mock tests and practice tests subject-wise.
- Tests are timed, auto-evaluated, and detailed results are shown after submission.
- Includes difficulty levels: Easy, Medium, Hard.
- Each question shows correct answer + explanation after the test.
- Score, accuracy, and time-per-question are tracked.
- Students can resume interrupted tests.

### 🤖 AI Mentor (AI Tutor Tab)
- A full-page AI tutor powered by NVIDIA NIM (Llama 3.1 and 3.3 models).
- Two response modes: "Quick" (fast answer) and "Best" (detailed, deep analysis).
- Students can ask any academic question about Odisha history, polity, maths, English, Odia grammar, GK, reasoning.
- Includes a Syllabus Manager where students maintain their topic list and get quiz/summary on any topic.
- Includes a Dynamic MCQ Quizzer that generates AI-powered MCQs on any subject.
- Includes a Study Planner, Formula Library, Bookmarked Questions sections.
- Chat history is saved between sessions for continuity.

### 📊 Analytics Tab (AI Performance Lab)
- Students see their aggregated performance stats: average score, accuracy, speed (avg time per question), improvement percentage.
- AI-generated Insights section: summarizes strengths, weaknesses, and performance patterns.
- Action Plan section: gives a personalized 5-day or 7-day study plan.
- AI Performance Coach: a chat interface where students can ask questions about their performance.
- Study Assistant: contextual prompt chips that suggest smart questions based on the student's actual data.
- Students can press "Rescan Analytics" to refresh insights with the latest test data.

### 📚 Courses / Library
- Students can browse and access curated study material series for each exam.
- PDFs, notes, previous year questions (PYQs) are organized by subject and exam.
- Locked content is unlocked after purchasing.
- Full Access plan unlocks all content across all exams.

### 📜 History Tab
- Shows all past mock tests, practice sessions with scores, date, duration.
- Students can review completed tests and see result breakdowns.

### 💰 Pricing
- **Free Plan**: Limited mock tests (2 free practice tests), basic AI mentor access, limited questions.
- **Full Access Plan**: ₹299 (single exam) or bundle pricing — unlocks all mock tests, all study materials, all AI features without limits.
- Payment via Razorpay (UPI, credit/debit card, netbanking).
- Instant access after payment, no manual approval needed.
- Refund policy: 7-day refund window if the platform doesn't work for the student.

### ⚙️ Account & Settings
- Login via Google or Email/Password.
- Profile shows name, email, purchased plans.
- Students can logout from the top-right corner menu.

### 📞 Support
- WhatsApp support: +91 7377431715
- Email: odishaexamprep365@gmail.com
- Students can message on WhatsApp for queries, payment issues, or course guidance.

## Response Style Rules
- Be warm, encouraging, and brief (2–4 sentences max unless a detailed explanation is needed).
- Use bullet points for lists of features or steps.
- Always use "you" to address the student directly.
- Add 1 relevant emoji at the start of each key point for readability.
- Never make up features. Only answer based on what is documented above.
- If unsure, say: "For this, please reach out to our support team on WhatsApp at +91 7377431715."
- Do NOT mention external AI brands or refer to yourself as ChatGPT or Claude.
- Always refer to yourself as "OEP Buddy".`;

/* ─────────────────────────────────────────────
   Markdown-lite renderer for assistant messages
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
    if (!trimmed) {
      flushList(String(idx));
      return;
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
      listBuffer.push(trimmed.slice(2));
    } else if (/^\d+\.\s/.test(trimmed)) {
      listBuffer.push(trimmed.replace(/^\d+\.\s/, ''));
    } else if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      flushList(String(idx));
      const headText = trimmed.replace(/^#+\s/, '');
      elements.push(
        <p key={idx} className="text-xs font-black text-brand-700 mt-1.5 mb-0.5 uppercase tracking-wide">
          {headText}
        </p>
      );
    } else {
      flushList(String(idx));
      elements.push(
        <p key={idx} className="text-xs leading-relaxed"
          dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed) }}
        />
      );
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
const StickyAICompanion: React.FC = () => {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBadge, setShowBadge] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Only render for logged-in users
  if (!user) return null;

  // Auto-scroll to bottom of chat
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (isOpen && !isMinimized) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Focus input when opened
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, isMinimized]);

  const firstName = profile?.displayName?.split(' ')[0] || 'there';

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

      const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history,
            { role: 'user', content: userText },
          ],
          temperature: 0.3,
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
            content: "Sorry, I couldn't connect right now. Please try again in a moment! 🙏",
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
            className="fixed bottom-24 sm:bottom-8 right-4 sm:right-6 z-[200] group focus:outline-none"
            title="Ask OEP Buddy"
            aria-label="Open AI Companion"
          >
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-2xl bg-brand-500 animate-ping opacity-20 group-hover:opacity-30 transition-opacity" />

            {/* Button */}
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(138,28,54,0.4)] group-hover:shadow-[0_14px_40px_rgba(138,28,54,0.55)] transition-all duration-300 overflow-hidden">
              {/* Shine */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-white relative z-10 drop-shadow-sm" />
            </div>

            {/* Badge */}
            {showBadge && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-md"
              >
                AI
              </motion.span>
            )}

            {/* Tooltip */}
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
            initial={{ opacity: 0, scale: 0.9, y: 30, originX: 1, originY: 1 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className={cn(
              'fixed right-3 sm:right-6 z-[200] w-[calc(100vw-24px)] sm:w-[380px] bg-white rounded-[1.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.15),0_4px_16px_rgba(0,0,0,0.06)] border border-slate-200/60 overflow-hidden flex flex-col',
              isMinimized ? 'h-auto bottom-24 sm:bottom-8' : 'bottom-4 sm:bottom-8 h-[520px] sm:h-[560px]'
            )}
          >
            {/* ── Header ── */}
            <div className="shrink-0 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 px-4 py-3 flex items-center gap-3 relative overflow-hidden">
              {/* Decorative shimmer */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center border border-white/20 backdrop-blur-sm">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
              </div>

              {/* Title */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-sm leading-tight tracking-wide">OEP Buddy</p>
                <p className="text-white/70 text-[10px] font-semibold truncate">Your AI Study Companion ✨</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 relative z-10">
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-all"
                    title="Clear chat"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setIsMinimized(v => !v)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-all"
                  title={isMinimized ? 'Expand' : 'Minimize'}
                >
                  {isMinimized ? <Sparkles className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-all"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ── Body (hidden when minimized) ── */}
            {!isMinimized && (
              <>
                {/* ── Messages ── */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scroll-smooth" style={{ scrollbarWidth: 'thin' }}>

                  {/* Welcome message */}
                  {messages.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      {/* Bot welcome bubble */}
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-3.5 h-3.5 text-brand-600" />
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[88%]">
                          <p className="text-xs text-slate-700 leading-relaxed">
                            👋 Hey <strong className="text-brand-600">{firstName}</strong>! I'm <strong>OEP Buddy</strong>, your personal AI companion for OdishaExamPrep.
                          </p>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            Ask me anything — exam tips, how to use features, your analytics, pricing, or study strategies! 🎯
                          </p>
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

                  {/* Chat messages */}
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
                        {/* Avatar */}
                        <div className={cn(
                          'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                          isUser
                            ? 'bg-brand-600 text-white'
                            : 'bg-brand-50 border border-brand-100'
                        )}>
                          {isUser
                            ? <User className="w-3.5 h-3.5" />
                            : <Bot className="w-3.5 h-3.5 text-brand-600" />
                          }
                        </div>

                        {/* Bubble */}
                        <div className={cn(
                          'px-3 py-2.5 rounded-2xl max-w-[84%] shadow-sm text-xs leading-relaxed',
                          isUser
                            ? 'bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-tr-sm'
                            : 'bg-slate-50 border border-slate-100/80 text-slate-700 rounded-tl-sm'
                        )}>
                          {isUser
                            ? <p>{msg.content}</p>
                            : <RenderMessage text={msg.content} />
                          }
                        </div>
                      </motion.div>
                    );
                  })}

                  <div ref={chatEndRef} />
                </div>

                {/* ── Input Bar ── */}
                <div className="shrink-0 border-t border-slate-100 bg-white px-3 py-2.5">
                  <form
                    onSubmit={e => { e.preventDefault(); sendMessage(input); }}
                    className="flex items-center gap-2"
                  >
                    <div className="flex-1 relative">
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ask me anything…"
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
                      {loading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Send className="w-3.5 h-3.5" strokeWidth={2.5} />
                      }
                    </button>
                  </form>

                  <p className="text-[9px] text-slate-400 text-center mt-1.5 font-medium">
                    OEP Buddy · Powered by OdishaExamPrep AI
                  </p>
                </div>
              </>
            )}

            {/* Minimized state preview */}
            {isMinimized && (
              <button
                onClick={() => setIsMinimized(false)}
                className="flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 transition-colors w-full"
              >
                <Sparkles className="w-4 h-4 text-brand-500 shrink-0" />
                <span className="text-xs font-semibold text-slate-600 flex-1 truncate">
                  {messages.length > 0
                    ? messages[messages.length - 1].content.slice(0, 50) + '…'
                    : 'Ask me anything about OdishaExamPrep…'}
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
