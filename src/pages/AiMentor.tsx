import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Send, 
  Trash2, 
  Play, 
  Copy, 
  CheckCircle2, 
  Clock3, 
  Calendar, 
  ArrowRight,
  BookOpen,
  Award,
  ChevronRight,
  User,
  Cpu
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AiMentor({ user }: { user: any }) {
  // Chat States
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Namaskar! I am your personal Study Coach. I am here to help you prepare for OPSC OAS, OSSC CGL, and OSSSC RI/ARI/Amin exams. Ask me any questions about Odisha History & Geography, Indian Polity, Odia Grammar rules, or Quantitative Aptitude shortcuts! You can also use the scheduler on the right to plan your revision session."
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Study Planner States
  const [plannerCategory, setPlannerCategory] = useState('General Studies (Odisha GK)');
  const [studyDate, setStudyDate] = useState('');
  const [studyTime, setStudyTime] = useState('');

  // Auto-scroll ref
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Exam Preparation presets - highly optimized for credit saving
  const presetPrompts = [
    {
      title: "Paika Rebellion",
      prompt: "Summarize the key causes, leaders, and significance of the Paika Rebellion (1817) in Odisha history in 2 concise bullet points.",
      desc: "Odisha History quick revision"
    },
    {
      title: "President's Rule",
      prompt: "Explain the difference between Article 356 (President's Rule) and Article 360 (Financial Emergency) of the Indian Constitution in one sentence each.",
      desc: "Indian Polity core facts"
    },
    {
      title: "Odisha GK Quiz",
      prompt: "Generate 3 high-yield multiple-choice questions on Odisha Rivers and Geography with a brief explanation for each.",
      desc: "Quick self-assessment quiz"
    },
    {
      title: "Time & Work Trick",
      prompt: "Show me a shortcut formula and speed calculation method to solve 'A and B together can do a work' questions in under 30 seconds.",
      desc: "Aptitude speed shortcuts"
    }
  ];

  // Chat Submission
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Context history pruning (keep last 4 messages to save tokens)
      const recentHistory = messages.slice(-4); 

      const systemPrompt = `You are the official expert AI Study Coach for Odisha governmental examinations (OPSC civil services, OSSC CGL, and OSSSC RI/ARI/Amin recruitments).
Your goal is to provide highly focused, accurate, and structured academic mentorship.

Topics of expertise:
1. Odisha History & Heritage (e.g., Kalinga War, Kharavela, Gajapati Dynasty, Paika Rebellion, Salt Satyagraha in Odisha).
2. Odisha Geography & Resources (e.g., Mahanadi river system, Similipal, Chilika lake, mineral wealth).
3. Indian Constitution & Polity (e.g., Preamble, Fundamental Rights, Emergency Provisions, Odisha legislative structure).
4. Quantitative Aptitude & Logical Reasoning (tricks, shortcuts, timers, speed math).
5. Language Core: English and Odia Grammar, translation mappings, and writing styles.

CREDIT-CONSCIOUS DIRECTIVES:
- Keep explanations brief, direct, and structured with bullet points.
- Avoid generic pleasantries, chat filler, or lengthy introductions.
- Deliver maximum educational value per token to save student AI credits.
- Do NOT mention NVIDIA, DeepSeek, or other external AI brands. Introduce yourself only as the Website's Study Coach.`;

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...recentHistory.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: textToSend }
      ];

      // Call local proxy endpoint to bypass CORS and protect API key
      const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-ai/deepseek-v4-flash', // Default standard model on backend
          messages: apiMessages,
          temperature: 0.2,
          max_tokens: 750,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`Connection issue (status ${response.status})`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let assistantResponse = "";

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      if (reader) {
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            if (trimmedLine === "data: [DONE]") continue;

            if (trimmedLine.startsWith("data: ")) {
              const dataStr = trimmedLine.slice(6).trim();
              try {
                const parsed = JSON.parse(dataStr);
                const chunkContent = parsed.choices[0]?.delta?.content || "";
                assistantResponse += chunkContent;

                setMessages(prev => {
                  const updated = [...prev];
                  if (updated.length > 0) {
                    updated[updated.length - 1] = {
                      role: 'assistant',
                      content: assistantResponse
                    };
                  }
                  return updated;
                });
              } catch (e) {}
            }
          }
        }
      } else {
        const resJson = await response.json();
        const fullContent = resJson.choices[0]?.message?.content || "No response received.";
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              role: 'assistant',
              content: fullContent
            };
          }
          return updated;
        });
      }
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "⚠️ Connection to study coach failed. Please check your internet connection and try again."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Generate Study Outline from Planner
  const handleGenerateOutline = () => {
    if (!studyDate || !studyTime) {
      alert("Please select both a date and time for your study session!");
      return;
    }
    const outlinePrompt = `Create a highly structured study plan for my scheduled session on ${studyDate} at ${studyTime} focusing on "${plannerCategory}". Suggest 3 core subtopics to cover and 1 speed practice strategy. Keep it extremely brief.`;
    handleSendMessage(outlinePrompt);
  };

  return (
    <div className="space-y-10">
      {/* Header and Chip */}
      <div className="flex flex-col items-center text-center space-y-4">
        <span className="section-chip">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-[#8A1C36]" />
          Smart Study Suite
        </span>
        <h2 className="text-3xl md:text-5xl font-serif font-extrabold text-slate-900 tracking-tight">
          Personal Study <span className="premium-text-gradient font-serif font-extrabold">Coach</span>
        </h2>
        <div className="section-divider" />
        <p className="text-slate-500 text-base sm:text-lg font-medium max-w-xl mx-auto leading-relaxed">
          Ask questions, get core summaries, clear doubts, or schedule revision sessions directly with your personal tutor.
        </p>
      </div>

      {/* Main Dual-pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Pane: Chat Interface */}
        <div className="lg:col-span-7 bg-[#0b0f19] text-slate-300 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col h-[600px] relative noise-overlay">
          {/* Declaring dark color-scheme on the dark chat console to enable dark-themed scrollbars and select default popups */}
          <div style={{ colorScheme: 'dark' }} className="absolute inset-0 flex flex-col">
            
            {/* Header Control Panel */}
            <div className="p-4 border-b border-white/10 bg-slate-950/60 backdrop-blur-md flex justify-between items-center z-10">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">Study Coach Online</span>
              </div>

              {/* Clear Chat */}
              <button 
                onClick={() => setMessages([{ role: 'assistant', content: "Chat cleared! What shall we revise next?" }])}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Clear Chat History"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Chat</span>
              </button>
            </div>

            {/* Chat Messages Console */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.map((m, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "flex flex-col max-w-[85%] rounded-2xl p-4 text-sm font-medium leading-relaxed shadow-md animate-fade-up",
                    m.role === 'user' 
                      ? "bg-brand-500 text-white self-end rounded-tr-none" 
                      : "bg-slate-900/60 border border-white/10 text-slate-200 self-start rounded-tl-none"
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {m.role === 'user' ? 'Student' : 'Study Coach'}
                  </div>
                  <div className="whitespace-pre-wrap font-sans">
                    {m.content || (
                      <span className="inline-flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Console */}
            <div className="p-4 border-t border-white/10 bg-slate-950/60 backdrop-blur-md">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }}
                className="flex gap-2"
              >
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about Odisha history, GS, math, grammar..."
                  className="flex-1 bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 transition-all font-semibold"
                />
                <button 
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="p-3 bg-[#8A1C36] hover:bg-[#76142c] text-white rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>
        </div>

        {/* Right Pane: Smart Planner & Facts Board */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section 1: Study Planner (Applying SKILL_EFFICIENT_DEVELOPMENT.md inputs & pickers) */}
          <div 
            style={{ colorScheme: 'dark' }} 
            className="bg-[#080b12] text-slate-200 border border-white/10 rounded-[2rem] p-6 shadow-2xl space-y-6 relative overflow-hidden noise-overlay"
          >
            {/* Ambient gradients */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#8A1C36]/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-teal-500/10 rounded-full blur-xl pointer-events-none" />

            <div className="space-y-1">
              <span className="inline-flex px-2.5 py-0.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded text-[9px] font-black uppercase tracking-wider">
                Study Scheduler
              </span>
              <h4 className="font-serif font-extrabold text-white text-lg">
                Interactive Session Planner
              </h4>
              <p className="text-slate-500 text-[11px] font-semibold leading-relaxed">
                Schedule a mock test or reading session. We apply custom Webkit indicators and full-input onClick triggers to launch browser pickers easily.
              </p>
            </div>

            <div className="space-y-4">
              {/* Category Select Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Exam Focus Category</label>
                <select 
                  value={plannerCategory}
                  onChange={(e) => setPlannerCategory(e.target.value)}
                  className="w-full bg-[#111625]/90 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500/50 transition-colors font-bold"
                >
                  <option>General Studies (Odisha GK)</option>
                  <option>Indian Polity & Constitution</option>
                  <option>Arithmetic Core & DI Shortcuts</option>
                  <option>Odia Language & Grammar Rules</option>
                  <option>English Comprehension & Vocabulary</option>
                </select>
              </div>

              {/* Date Input with full-box click and Webkit style custom teal indicator */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Select Study Date</label>
                <input 
                  type="date" 
                  value={studyDate}
                  onChange={(e) => setStudyDate(e.target.value)}
                  onClick={(e) => {
                    try {
                      e.currentTarget.showPicker();
                    } catch (err) {
                      console.warn("Native date picker support error:", err);
                    }
                  }}
                  className="w-full bg-[#111625]/90 border border-white/10 rounded-xl px-4 py-3 text-sm text-white cursor-pointer hover:border-teal-500/50 transition-colors font-bold outline-none"
                />
              </div>

              {/* Time Input with full-box click and Webkit style custom teal indicator */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Select Session Time</label>
                <input 
                  type="time" 
                  value={studyTime}
                  onChange={(e) => setStudyTime(e.target.value)}
                  onClick={(e) => {
                    try {
                      e.currentTarget.showPicker();
                    } catch (err) {
                      console.warn("Native time picker support error:", err);
                    }
                  }}
                  className="w-full bg-[#111625]/90 border border-white/10 rounded-xl px-4 py-3 text-sm text-white cursor-pointer hover:border-teal-500/50 transition-colors font-bold outline-none"
                />
              </div>
            </div>

            {/* Action trigger */}
            <button 
              onClick={handleGenerateOutline}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border-2 border-teal-500 text-xs font-black uppercase tracking-widest text-teal-400 hover:bg-teal-500 hover:text-slate-950 transition-all cursor-pointer shadow-[3px_3px_0px_rgba(45,212,191,0.2)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none"
            >
              Generate Custom Study Outline
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Section 2: Study Presets */}
          <div className="bg-white border-2 border-slate-900 rounded-[2rem] p-6 shadow-[5px_5px_0px_rgba(0,0,0,1)] space-y-4">
            <h4 className="font-serif font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#8A1C36]" />
              Quick Revision Cards
            </h4>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed">
              Click any fast-track template below to launch a targeted revision query focused on core state syllabus.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {presetPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(p.prompt);
                    handleSendMessage(p.prompt);
                  }}
                  className="text-left p-3.5 bg-slate-50 hover:bg-[#fce7eb]/60 rounded-2xl border border-slate-200/60 hover:border-[#8A1C36]/50 transition-all cursor-pointer group shadow-sm flex flex-col justify-between h-24"
                >
                  <span className="font-black text-slate-800 text-xs block group-hover:text-[#8A1C36] transition-colors">{p.title}</span>
                  <span className="text-[10px] text-slate-400 font-bold leading-tight mt-1.5 line-clamp-2">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Odisha GK Revision Board (Asymmetrical layout as required by SKILL.md) */}
          <div className="bg-white border-2 border-slate-900 rounded-[2rem] p-6 shadow-[5px_5px_0px_rgba(0,0,0,1)] space-y-5">
            <h4 className="font-serif font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              Syllabus High-Yield Facts
            </h4>
            
            {/* Asymmetrical fact list */}
            <div className="space-y-3">
              {/* Fact 1 */}
              <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-start gap-3 hover:border-slate-300 transition-colors">
                <span className="text-2xl p-1.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 shrink-0">🏛️</span>
                <div className="text-left">
                  <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600">Odisha History</span>
                  <h5 className="font-serif font-bold text-slate-900 text-sm mt-0.5">Kalinga War (261 BC)</h5>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">Fought on the banks of Daya River near Dhauli hills, leading to Ashoka adopting Buddhism.</p>
                </div>
              </div>

              {/* Fact 2 - Asymmetric placement & styling */}
              <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-start gap-3 hover:border-slate-300 transition-colors ml-4 md:ml-6 border-l-4 border-l-[#8A1C36]">
                <span className="text-2xl p-1.5 bg-[#fdf2f4] border border-[#fce7eb] rounded-xl text-[#8A1C36] shrink-0">🏞️</span>
                <div className="text-left">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#8A1C36]">Odisha Geography</span>
                  <h5 className="font-serif font-bold text-slate-900 text-sm mt-0.5">Mahanadi River System</h5>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">Odisha's longest river. Features Hirakud Dam, the world's longest earthen dam (Sambalpur).</p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
