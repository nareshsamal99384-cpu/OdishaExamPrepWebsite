import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Send, 
  Cpu, 
  Coins, 
  AlertCircle, 
  Trash2, 
  Play, 
  Copy, 
  CheckCircle2, 
  Clock3, 
  Calendar, 
  Palette, 
  Type, 
  Info,
  ArrowRight,
  ChevronRight
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
      content: "Namaskar! I am your AI Design & Frontend Mentor. I'm here to help you build distinctive, premium user interfaces that avoid generic 'AI slop' aesthetics. Ask me anything about typography pairings, HSL color harmony, CSS glassmorphism, native dark picker indicators, or asymmetrical layouts!"
    }
  ]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState<'deepseek-ai/deepseek-v4-flash' | 'deepseek-ai/deepseek-v4-pro'>('deepseek-ai/deepseek-v4-flash');
  const [loading, setLoading] = useState(false);
  const [temperature, setTemperature] = useState(0.3);
  const [estimatedCost, setEstimatedCost] = useState(0);

  // Playground States
  const [studyDate, setStudyDate] = useState('');
  const [studyTime, setStudyTime] = useState('');
  const [activeFontPair, setActiveFontPair] = useState(0);
  const [customText, setCustomText] = useState('Explore the beauty of Odisha Exam Prep');
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  // Auto-scroll ref
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Fonts definition from uiux-designer.md / SKILL.md
  const fontPairs = [
    {
      name: "Refined Editorial (Serif + Sans)",
      heading: "font-serif font-extrabold tracking-tight",
      headingFont: "Fraunces, Georgia",
      body: "font-sans font-medium",
      bodyFont: "Plus Jakarta Sans, sans-serif",
      desc: "Perfect for education dashboards, blogs, and official recruitment journals."
    },
    {
      name: "Sleek Tech (Sans Display + Mono)",
      heading: "font-sans font-black uppercase tracking-wider",
      headingFont: "Plus Jakarta Sans (Extra Bold)",
      body: "font-mono text-sm",
      bodyFont: "Courier New, monospace",
      desc: "Great for CBT exam rooms, developer dashboards, and timer interfaces."
    }
  ];

  // HSL Palette Generator
  const generatedHSLColors = [
    { name: "Primary Deep Wine", hsl: "hsl(346, 66%, 32%)", hex: "#8A1C36" },
    { name: "Secondary Dark Navy", hsl: "hsl(213, 78%, 15%)", hex: "#0C2340" },
    { name: "Accent Light Teal", hsl: "hsl(172, 66%, 50%)", hex: "#2DD4BF" },
    { name: "Card Dark Translucent", hsl: "hsl(220, 40%, 8%)", hex: "#080B12" }
  ];

  const handleCopyColor = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  // Preset Prompts - optimized for low token credit consumption
  const presetPrompts = [
    {
      title: "Palette Critique",
      prompt: "Evaluate this palette: Primary Wine (#8A1C36), Navy (#0C2340), Accent Teal (#2DD4BF) on a Dark Slate background. Is the contrast accessible?",
      desc: "Get HSL contrast critique"
    },
    {
      title: "Glassmorphism CSS",
      prompt: "Give me the CSS rules for a sleek dark glassmorphic card container with border highlights and a subtle backdrop filter.",
      desc: "CSS glass template"
    },
    {
      title: "Asymmetrical Grid",
      prompt: "Generate a responsive Tailwind grid layout template with asymmetrical, grid-breaking elements for a syllabus roadmap card.",
      desc: "Tailwind grid snippet"
    },
    {
      title: "Styled Date Picker",
      prompt: "Show me the webkit calendar picker CSS and the react showPicker() trigger code to make date/time inputs premium.",
      desc: "Native indicator styling"
    }
  ];

  // Credit Estimator Logic (Word count based)
  useEffect(() => {
    const text = input.trim();
    if (!text) {
      setEstimatedCost(0);
      return;
    }
    // Estimate tokens: roughly 1 word = 1.3 tokens
    const words = text.split(/\s+/).length;
    const promptTokens = Math.ceil(words * 1.3);
    const expectedCompletionTokens = 350; // Average completion length
    
    // NIM NIM Credits: Flash is $0.000075 / 1k tokens, Pro is $0.0005 / 1k tokens
    const rate = model.includes('flash') ? 0.075 : 0.5; // per 1k tokens
    const totalEstTokens = promptTokens + expectedCompletionTokens;
    const estimatedCredits = (totalEstTokens / 1000) * rate;
    setEstimatedCost(Number(estimatedCredits.toFixed(4)));
  }, [input, model]);

  // Chat Submission
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY || import.meta.env.VITE_DENTA_RESPONSE_AI;
      const baseUrl = import.meta.env.VITE_DEEPSEEK_BASE_URL || 'https://integrate.api.nvidia.com/v1';

      if (!apiKey) {
        throw new Error("NVIDIA NIM API key is not configured in your .env file.");
      }

      // CREDIT-CONSCIOUS HISTORY PRUNING
      // We prune the history to send only the system instruction, the last 4 messages, 
      // and the current query. This saves substantial credit tokens!
      const recentHistory = messages.slice(-4); 

      const systemPrompt = `You are an elite Professional UI/UX Designer & Frontend Developer Mentor.
Your role is to guide students in applying high-end frontend design (as detailed in SKILL.md) and efficient development practices (as detailed in SKILL_EFFICIENT_DEVELOPMENT.md).

Key Styling Rules to advocate:
1. Avoid generic "AI slop" aesthetics (like Inter on plain white/purple gradients). Prefer Fraunces for headings and Plus Jakarta Sans for body.
2. Commit to bold, extreme tones (e.g. brutally minimal, retro-futuristic, magazine editorial, dark glassmorphism).
3. Pair distinctive display fonts with readable body text.
4. Colors: Dominant brand HSL colors with sharp high-contrast accents (e.g. bright teal #2dd4bf).
5. CSS Animations: Orchestrate staggered delays on load instead of spamming micro-animations on hover.
6. Layout: Unexpected layouts, grid-breaking, asymmetry, diagonal flow, overlap.
7. Backgrounds: Add depth via gradient meshes, noise texture overlays, and translucent card panels.
8. Native Dark inputs: Add color-scheme: dark; to native pickers, use webkit-calendar-picker-indicator filter transitions, and trigger showPicker() on click.

IMPORTANT CREDIT-SAVING INSTRUCTION:
Be extremely concise. Avoid generic conversational filler, wordy introductions, or chat summaries. Directly provide answers, design critique, and code snippets in brief, highly professional formatting. This directly saves student tokens and NIM credits.`;

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...recentHistory.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: textToSend }
      ];

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: apiMessages,
          temperature: temperature,
          max_tokens: 800,
          stream: true // Stream responses for a highly dynamic visual feedback
        })
      });

      if (!response.ok) {
        throw new Error(`API returned error code ${response.status}`);
      }

      // Set up streaming reader
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let assistantResponse = "";

      // Push initial empty response card
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

                // Update the last message in real-time
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
              } catch (e) {
                // Parse non-JSON lines gracefully
              }
            }
          }
        }
      } else {
        // Fallback to non-streaming if reader is unavailable
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
          content: `⚠️ Error reaching DeepSeek NIM: ${error.message || "Please check your API key in .env"}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header and Chip */}
      <div className="flex flex-col items-center text-center space-y-4">
        <span className="section-chip">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          AI Studio & Design Lab
        </span>
        <h2 className="text-3xl md:text-5xl font-serif font-extrabold text-slate-900 tracking-tight">
          AI Design <span className="premium-text-gradient font-serif font-extrabold">Mentor</span>
        </h2>
        <div className="section-divider" />
        <p className="text-slate-500 text-base sm:text-lg font-medium max-w-xl mx-auto leading-relaxed">
          Chat with the DeepSeek NIM Copilot to master professional UI/UX, or test custom styled dark-themed native inputs live.
        </p>
      </div>

      {/* Main Dual-pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Pane: NIM Chat Interface */}
        <div className="lg:col-span-7 bg-[#0b0f19] text-slate-300 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col h-[650px] relative noise-overlay">
          {/* Declaring dark color-scheme on the dark chat console */}
          <div style={{ colorScheme: 'dark' }} className="absolute inset-0 flex flex-col">
            
            {/* Header Control Panel */}
            <div className="p-4 border-b border-white/10 bg-slate-950/60 backdrop-blur-md flex flex-wrap justify-between items-center gap-3 z-10">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-brand-400" />
                <select 
                  value={model} 
                  onChange={(e: any) => setModel(e.target.value)}
                  className="bg-slate-900 border border-white/10 text-white rounded-lg text-xs font-bold py-1.5 px-3 focus:outline-none focus:border-brand-500"
                >
                  <option value="deepseek-ai/deepseek-v4-flash">DeepSeek V4 Flash (Fast/Cheap)</option>
                  <option value="deepseek-ai/deepseek-v4-pro">DeepSeek V4 Pro (Deep Code)</option>
                </select>
              </div>

              {/* Temperature Slider */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">Temp: {temperature}</span>
                <input 
                  type="range" 
                  min="0.1" 
                  max="0.8" 
                  step="0.1" 
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-20 accent-brand-400 cursor-pointer h-1 rounded" 
                />
              </div>

              {/* Clear Chat */}
              <button 
                onClick={() => setMessages([{ role: 'assistant', content: "Chat cleared! How can I help you design today?" }])}
                className="p-1.5 hover:bg-white/10 hover:text-white rounded-lg text-slate-400 transition-colors cursor-pointer"
                title="Clear Chat History"
              >
                <Trash2 className="w-4 h-4" />
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
                    {m.role === 'user' ? 'Aspirant Student' : 'Design Mentor'}
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

            {/* Warn message if user enters very long prompt */}
            {input.length > 500 && (
              <div className="mx-6 p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs flex items-center gap-2 animate-scale-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Long prompt detected! Consider summarizing to save NIM AI credits.</span>
              </div>
            )}

            {/* Footer Form & Credits display */}
            <div className="p-4 border-t border-white/10 bg-slate-950/60 backdrop-blur-md">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }}
                className="flex gap-2"
              >
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask for feedback on colors, layout, pickers, typography..."
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

              {/* Cost Estimator HUD */}
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mt-3 px-1">
                <span className="flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-amber-500/80" />
                  Estimated Cost: <span className="text-amber-400">{estimatedCost} Credits</span>
                </span>
                <span>Max Context Pruning Active (Last 4 msgs)</span>
              </div>
            </div>

          </div>
        </div>

        {/* Right Pane: Design Lab & Interactive Playground */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Quick Prompts Panel */}
          <div className="bg-white border-2 border-slate-900 rounded-[2rem] p-6 shadow-[5px_5px_0px_rgba(0,0,0,1)] space-y-4">
            <h4 className="font-serif font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-600" />
              Token-Saving Presets
            </h4>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed">
              Click any optimized template below to execute a compact query that saves credits.
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
                  <span className="text-[10px] text-slate-400 font-bold leading-tight mt-1 line-clamp-2">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Playground: Dark Native inputs */}
          <div 
            style={{ colorScheme: 'dark' }} 
            className="bg-[#080b12] text-slate-200 border border-white/10 rounded-[2rem] p-6 shadow-2xl space-y-6 relative overflow-hidden noise-overlay"
          >
            {/* Visual effects orbs */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-brand-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-teal-500/10 rounded-full blur-xl pointer-events-none" />

            <div className="space-y-1">
              <span className="inline-flex px-2 py-0.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded text-[9px] font-black uppercase tracking-wider">
                Native Elements Studio
              </span>
              <h4 className="font-serif font-extrabold text-white text-lg">
                Dark Mode Picker Playground
              </h4>
              <p className="text-slate-500 text-[11px] font-medium leading-relaxed">
                Applying section 2 & 3 of `SKILL_EFFICIENT_DEVELOPMENT.md`. Clicking anywhere on the input programmatically triggers `showPicker()`.
              </p>
            </div>

            {/* Inputs Group */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Study Session Date</label>
                <div className="relative">
                  <input 
                    type="date" 
                    value={studyDate}
                    onChange={(e) => setStudyDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker();
                      } catch (err) {
                        console.warn("Native picker not supported:", err);
                      }
                    }}
                    className="w-full bg-[#111625]/90 border border-white/10 rounded-xl px-4 py-3 text-sm text-white cursor-pointer hover:border-teal-500/50 transition-colors font-bold outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Mock Exam Timer Time</label>
                <div className="relative">
                  <input 
                    type="time" 
                    value={studyTime}
                    onChange={(e) => setStudyTime(e.target.value)}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker();
                      } catch (err) {
                        console.warn("Native picker not supported:", err);
                      }
                    }}
                    className="w-full bg-[#111625]/90 border border-white/10 rounded-xl px-4 py-3 text-sm text-white cursor-pointer hover:border-teal-500/50 transition-colors font-bold outline-none"
                  />
                </div>
              </div>
            </div>

            {/* HSL Color Harmony copy-board */}
            <div className="space-y-3 pt-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 block">HSL Palette Generator</label>
              <div className="grid grid-cols-2 gap-2.5">
                {generatedHSLColors.map((color, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleCopyColor(color.hsl)}
                    className="bg-[#111625]/60 border border-white/5 p-2.5 rounded-xl flex items-center justify-between cursor-pointer hover:bg-[#111625] hover:border-white/10 transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md border border-white/10" style={{ backgroundColor: color.hex }} />
                      <div className="text-left leading-none">
                        <span className="text-[9px] font-black block text-slate-300 group-hover:text-white transition-colors">{color.name}</span>
                        <span className="text-[8px] text-slate-500 font-mono mt-0.5 block">{color.hsl}</span>
                      </div>
                    </div>
                    {copiedColor === color.hsl ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Typography pairing tool */}
          <div className="bg-white border-2 border-slate-900 rounded-[2rem] p-6 shadow-[5px_5px_0px_rgba(0,0,0,1)] space-y-4">
            <h4 className="font-serif font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <Type className="w-5 h-5 text-[#8A1C36]" />
              Typography Pair Tester
            </h4>
            <div className="flex gap-2">
              {fontPairs.map((pair, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveFontPair(idx)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer border-2",
                    activeFontPair === idx
                      ? "bg-slate-900 text-white border-slate-900"
                      : "text-slate-600 bg-white border-slate-200 hover:border-slate-400"
                  )}
                >
                  Pair {idx + 1}
                </button>
              ))}
            </div>

            {/* Test Input and Output container */}
            <div className="space-y-3">
              <input 
                type="text" 
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none focus:border-brand-500"
                placeholder="Type sample text to preview..."
              />

              <div className="p-5 bg-[#FAF8F5] border border-slate-200 rounded-2xl space-y-3">
                <div className="text-left">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#8A1C36] block mb-1">Heading (Display) Preview:</span>
                  <h3 className={cn(fontPairs[activeFontPair].heading, "text-2xl text-slate-900 leading-tight")}>
                    {customText}
                  </h3>
                </div>
                <div className="text-left pt-2 border-t border-slate-200/60">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Body text style:</span>
                  <p className={cn(fontPairs[activeFontPair].body, "text-xs text-slate-500 leading-relaxed")}>
                    {fontPairs[activeFontPair].desc} Active Fonts: {fontPairs[activeFontPair].headingFont} & {fontPairs[activeFontPair].bodyFont}.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
