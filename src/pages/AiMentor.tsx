import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
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
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Award,
  ChevronRight,
  User,
  Cpu,
  Square,
  Zap,
  Target,
  HelpCircle,
  Bookmark,
  Search,
  Timer,
  Check,
  RotateCcw,
  Trophy,
  Star,
  ChevronDown,
  ChevronUp,
  Edit3,
  X,
  Plus
} from 'lucide-react';
import { cn } from '../lib/utils';
import TimePicker from '../components/TimePicker';
import { MathTextRenderer, DiagramRenderer } from '../components/MathTextRenderer';
import { toast } from 'react-hot-toast';
import { scrollToElement } from '../lib/scrollManager';
import { activityTracker } from '../lib/activityTracker';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  mode?: 'quick' | 'best';
}

interface SyllabusTopic {
  id: string;
  name: string;
  desc: string;
  status: 'not_started' | 'in_progress' | 'completed';
}

interface SyllabusCollection {
  id: string;
  name: string;
  topics: SyllabusTopic[];
}

// Dynamic formulas are managed per student and stored in localStorage.

const getCurrentTimeStr = () => {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

const getFutureTimeStr = (hoursAhead: number) => {
  const now = new Date();
  now.setHours(now.getHours() + hoursAhead);
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

const timeStringToMinutes = (timeStr: string) => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  if (parts.length < 2) return 0;
  return (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
};

const minutesToTimeString = (mins: number) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m.toString().padStart(2, '0');
  return `${displayH}:${displayM} ${period}`;
};

const generateStudyPlan = (
  startTimeStr: string,
  endTimeStr: string,
  goal: string,
  energy: string,
  extra: { chapters?: string; questions?: string; targetHours?: string }
) => {
  let startMins = timeStringToMinutes(startTimeStr);
  let endMins = timeStringToMinutes(endTimeStr);
  
  if (endMins < startMins) {
    endMins += 24 * 60; // overnight bound
  }
  
  const totalMinutes = endMins - startMins;
  if (totalMinutes <= 0) return [];
  
  let baseFocus = 45;
  let baseBreak = 10;
  let baseLongBreak = 15;
  
  if (energy === 'Low') {
    baseFocus = 25;
    baseBreak = 5;
    baseLongBreak = 10;
  } else if (energy === 'High') {
    baseFocus = 50;
    baseBreak = 10;
    baseLongBreak = 20;
  }
  
  if (goal === 'Revision') {
    baseFocus = Math.max(20, baseFocus - 5);
  } else if (goal === 'Deep Study') {
    baseFocus = Math.min(60, baseFocus + 10);
  } else if (goal === 'Mock Test') {
    baseFocus = 60;
    baseBreak = 10;
  }

  // Dynamic premium naming arrays based on study goal to make layout look custom & realistic
  const revisionNames = [
    "Warm-up Active Recall", 
    "Core Concepts Revision", 
    "Key Formulas & Rules", 
    "Topic Review Drill", 
    "Summary & Connections", 
    "Active Recall Recap"
  ];
  const deepStudyNames = [
    "Foundational Concept Dive", 
    "Advanced Principles Study", 
    "Applied Analysis & Notes", 
    "High-Value Topic Study", 
    "Synthesis & Integration", 
    "Core Concept Deep-Dive"
  ];
  const practiceNames = [
    "Topic Practice Warm-up", 
    "High-Yield Qs Session", 
    "Timed Accuracy Drill", 
    "Concept Application Practice", 
    "Active Q-Bank Sprint", 
    "Mistakes Analysis Drill"
  ];
  const mockTestNames = [
    "Mock Test Warm-up", 
    "Sectional Mock Practice", 
    "Full Mock Simulation", 
    "Accuracy & Strategy Focus", 
    "Mock Test Review Session"
  ];
  const defaultNames = [
    "Active Recall Warm-up", 
    "Deep Focus Study", 
    "Practice & Application", 
    "Revision & Recall Sprint", 
    "Mind-mapping & Synthesis", 
    "Focus Session Wrap-up"
  ];
  
  const blocks: any[] = [];
  let currentOffset = 0;
  let blockCounter = 1;
  
  while (currentOffset < totalMinutes) {
    const remainingMins = totalMinutes - currentOffset;
    
    if (remainingMins < 15) {
      blocks.push({
        id: `block_review_${blockCounter}`,
        name: 'Cool-down & Reflection',
        type: 'review',
        duration: remainingMins * 60,
        elapsed: 0,
        startMins: startMins + currentOffset,
        endMins: startMins + currentOffset + remainingMins,
        status: 'upcoming'
      });
      currentOffset += remainingMins;
      break;
    }
    
    // Progressive focus block duration (Warm-up -> Core Focus -> Peak Focus -> Sinusoidal fluctuations)
    let currentStudyDuration = baseFocus;
    if (blockCounter === 1) {
      currentStudyDuration = Math.max(20, Math.round(baseFocus * 0.8)); // Warm up
    } else if (blockCounter === 3) {
      currentStudyDuration = Math.min(60, Math.round(baseFocus * 1.1)); // Peak focus
    } else if (blockCounter > 3) {
      currentStudyDuration = baseFocus + (blockCounter % 2 === 0 ? 5 : -5); // Fluctuate
    }
    
    currentStudyDuration = Math.min(currentStudyDuration, remainingMins);
    
    let blockName = "";
    let blockType = 'focus';
    const nameIdx = (blockCounter - 1) % 6;
    
    if (goal === 'Revision') {
      blockName = revisionNames[nameIdx];
    } else if (goal === 'Deep Study') {
      blockName = deepStudyNames[nameIdx];
    } else if (goal === 'Practice Questions') {
      blockName = practiceNames[nameIdx];
      blockType = 'practice';
    } else if (goal === 'Mock Test') {
      blockName = mockTestNames[nameIdx % mockTestNames.length];
      blockType = 'practice';
    } else {
      blockName = defaultNames[nameIdx];
    }
    
    blocks.push({
      id: `block_focus_${blockCounter}`,
      name: blockName,
      type: blockType,
      duration: currentStudyDuration * 60,
      elapsed: 0,
      startMins: startMins + currentOffset,
      endMins: startMins + currentOffset + currentStudyDuration,
      status: 'upcoming'
    });
    
    currentOffset += currentStudyDuration;
    
    if (currentOffset < totalMinutes) {
      const isLongBreak = blockCounter % 3 === 0;
      
      // Calculate break time relative to preceding study block duration with dynamic jitter
      let targetBreakDuration = baseBreak;
      if (isLongBreak) {
        targetBreakDuration = Math.max(12, Math.min(25, Math.round(currentStudyDuration * 0.35 + (blockCounter % 2 === 0 ? 2 : -2))));
      } else {
        targetBreakDuration = Math.max(5, Math.min(10, Math.round(currentStudyDuration * 0.15 + (blockCounter % 2 === 0 ? 1 : -1))));
      }
      
      const currentBreakDuration = Math.min(
        targetBreakDuration,
        totalMinutes - currentOffset
      );
      
      if (currentBreakDuration > 0) {
        blocks.push({
          id: `block_break_${blockCounter}`,
          name: isLongBreak ? 'Long Break ☕' : 'Quick Break ☕',
          type: 'break',
          duration: currentBreakDuration * 60,
          elapsed: 0,
          startMins: startMins + currentOffset,
          endMins: startMins + currentOffset + currentBreakDuration,
          status: 'upcoming'
        });
        currentOffset += currentBreakDuration;
      }
    }
    
    blockCounter++;
  }
  
  return blocks.map(b => ({
    ...b,
    startTimeStr: minutesToTimeString(b.startMins),
    endTimeStr: minutesToTimeString(b.endMins)
  }));
};

const adaptRemainingPlan = (
  blocks: any[],
  activeIndex: number,
  endTimeStr: string,
  timerSeconds: number
) => {
  if (activeIndex < 0 || activeIndex >= blocks.length) return blocks;
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  let endMinutes = timeStringToMinutes(endTimeStr);
  if (endMinutes < currentMinutes) {
    endMinutes += 24 * 60;
  }
  
  const remainingMinutes = endMinutes - currentMinutes;
  if (remainingMinutes <= 0) {
    return blocks;
  }
  
  const remainingBlocks = blocks.slice(activeIndex);
  
  let remainingOriginalMinutes = 0;
  remainingBlocks.forEach(b => {
    if (b.id === blocks[activeIndex].id) {
      remainingOriginalMinutes += timerSeconds / 60;
    } else {
      remainingOriginalMinutes += b.duration / 60;
    }
  });
  
  if (remainingOriginalMinutes <= 0) return blocks;
  
  const ratio = remainingMinutes / remainingOriginalMinutes;
  
  let currentOffset = currentMinutes;
  return blocks.map((b, idx) => {
    if (idx < activeIndex) {
      return b;
    }
    
    let newDurationSeconds = 0;
    if (idx === activeIndex) {
      newDurationSeconds = Math.round(timerSeconds * ratio);
    } else {
      newDurationSeconds = Math.round(b.duration * ratio);
    }
    
    if (b.type === 'break') {
      newDurationSeconds = Math.max(180, newDurationSeconds);
    } else {
      newDurationSeconds = Math.max(900, newDurationSeconds);
    }
    
    const durationMins = Math.round(newDurationSeconds / 60);
    
    const startMins = currentOffset;
    const endMins = currentOffset + durationMins;
    currentOffset = endMins;
    
    return {
      ...b,
      duration: newDurationSeconds,
      startTimeStr: minutesToTimeString(startMins),
      endTimeStr: minutesToTimeString(endMins)
    };
  });
};

const PRESET_SUBJECTS = [
  'Odisha GK & History',
  'Indian Polity & Constitution',
  'Quantitative Aptitude (Arithmetic)',
  'Odia Grammar & Translation',
  'English Comprehension & Vocabulary'
];



const FormulaRenderer = ({ formula }: { formula: string }) => {
  // Check if it looks like a LaTeX math expression
  const isLatex = /\\frac|\\left|\\right|\\partial|\\dot|\\alpha|\\beta|\\gamma|\\theta|\\sigma|\\pi|\\sum|\\int|\\sqrt|\\Delta|\\cdot|\\times|\^|_|\\{/i.test(formula);

  if (isLatex) {
    try {
      const html = katex.renderToString(formula, {
        throwOnError: false,
        displayMode: false, // inline fits inside card paddings better
      });
      return <div className="katex-formula py-1 text-center overflow-x-auto custom-scrollbar" dangerouslySetInnerHTML={{ __html: html }} />;
    } catch (e) {
      console.error("KaTeX rendering error", e);
    }
  }

  // Fallback to plain text style
  return <span className="break-all">{formula}</span>;
};

const robustParseJSON = (rawText: string) => {
  let clean = rawText.trim();
  
  // 1. Remove markdown code block markers
  clean = clean.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

  // 2. Strip JavaScript-style comments (both // and /* */)
  clean = clean.replace(/\/\*[\s\S]*?\*\//g, '');
  clean = clean.replace(/^(?:\s*)\/\/.*$/gm, ''); // Remove whole line comments
  clean = clean.replace(/\s\/\/.*$/gm, '');       // Remove end-of-line comments

  // 2.5. Double-escape backslashes that are not followed by double quotes
  // This prevents \f, \t, \n, \r, \b, \u from being interpreted as JSON escapes.
  clean = clean.replace(/\\(?!")/g, '\\\\');

  // 3. Extract correct JSON boundary
  const firstBracket = clean.indexOf('[');
  const firstBrace = clean.indexOf('{');
  
  let startIdx = -1;
  let endIdx = -1;

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    // Array expected
    startIdx = firstBracket;
    endIdx = clean.lastIndexOf(']');
  } else if (firstBrace !== -1) {
    // Object expected
    startIdx = firstBrace;
    endIdx = clean.lastIndexOf('}');
  }

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    clean = clean.substring(startIdx, endIdx + 1);
  }

  // 4. Remove trailing commas before closing braces/brackets
  clean = clean.replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(clean);
  } catch (err) {
    console.error("Failed to parse JSON even after robust cleanup. Cleaned text:", clean, err);
    throw err;
  }
};



const ODISHA_STUDY_TIPS = [
  {
    category: "OPSC OAS GS",
    tip: "OPSC OAS GS Paper I covers a vast syllabus. Focus on Odisha History & Geography (15-20 questions historically) for high-efficiency scoring.",
    icon: BookOpen
  },
  {
    category: "OSSC CGL Math",
    tip: "In OSSC CGL, practice digital root and approximation methods for faster arithmetic calculations. Saving 10 seconds per question adds up to 15 extra minutes!",
    icon: Target
  },
  {
    category: "Daily Revision",
    tip: "Competitive exams in Odisha require heavy memorization. Dedicate the final 15 minutes of your study session to review notes from the morning.",
    icon: RotateCcw
  },
  {
    category: "Odisha GK & Schemes",
    tip: "Regularly read local current affairs (e.g., scheme launches like KALIA, BSKY, LAccMI). At least 5-10 questions in OSSC exams are direct GK facts.",
    icon: Sparkles
  },
  {
    category: "OSSSC RI English",
    tip: "For OSSSC RI/AMIN, the English section is highly scoring. Focus on subject-verb agreement and active/passive voice transformation rules.",
    icon: Award
  },
  {
    category: "Active Recall",
    tip: "Instead of just rereading your notes on Odisha Polity, close the book and write down everything you remember about the Panchayati Raj system in Odisha.",
    icon: HelpCircle
  }
];

const AI_COACH_INSIGHTS = [
  {
    category: "Energy Management",
    tip: "Alternating high-intensity focus with micro-breaks prevents mental fatigue and keeps retention rates high.",
    icon: Sparkles
  },
  {
    category: "Cognitive Capacity",
    tip: "Tackling difficult concepts early in your plan aligns with high energy periods, leaving easier reviews for the end.",
    icon: Target
  },
  {
    category: "Active Recall",
    tip: "Self-testing on key definitions or formulas is 150% more effective for long-term memory than passive re-reading.",
    icon: HelpCircle
  },
  {
    category: "Spaced Repetition",
    tip: "Reviewing your newly structured planner topics after 24 hours reinforces neural pathways and halts memory decay.",
    icon: RotateCcw
  },
  {
    category: "Deep Focus Flow",
    tip: "Muting notifications and practicing single-tasking allows your brain to reach the flow state in 15–20 minutes.",
    icon: BookOpen
  }
];


const GENERATING_STEPS = [
  "Securing connection to OEP AI Model...",
  "Analyzing exam blueprint & target standards...",
  "Drafting high-yield custom MCQ question keys...",
  "Rendering LaTeX formulas & tutor explanations..."
];


const MarkdownMathRenderer = ({ text, isUser = false }: { text: string; isUser?: boolean }) => {
  if (!text) return null;

  // Process text to handle math, lists, bold, etc.
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 text-left w-full">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        
        // Check for headers
        if (trimmed.startsWith('### ')) {
          return <h4 key={lineIdx} className={cn("text-sm font-black mt-3 mb-1", isUser ? "text-white" : "text-slate-800")}><MathTextRenderer text={trimmed.substring(4)} isUser={isUser} /></h4>;
        }
        if (trimmed.startsWith('## ')) {
          return <h3 key={lineIdx} className={cn("text-base font-black mt-4 mb-1.5", isUser ? "text-white" : "text-slate-900")}><MathTextRenderer text={trimmed.substring(3)} isUser={isUser} /></h3>;
        }
        if (trimmed.startsWith('# ')) {
          return <h2 key={lineIdx} className={cn("text-lg font-black mt-5 mb-2", isUser ? "text-white" : "text-slate-900")}><MathTextRenderer text={trimmed.substring(2)} isUser={isUser} /></h2>;
        }

        // Check for bullet lists
        let isBullet = false;
        let listContent = trimmed;
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          isBullet = true;
          listContent = trimmed.substring(2);
        }

        // Check for numbered lists
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        let isNumbered = false;
        let numLabel = "";
        if (numMatch) {
          isNumbered = true;
          numLabel = numMatch[1];
          listContent = numMatch[2];
        }

        // Parse bold and other inline formats in listContent
        const renderInline = (str: string) => {
          const parts = str.split(/(\*\*.*?\*\*)/g);
          return parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx} className={cn("font-extrabold", isUser ? "text-white" : "text-slate-900")}><MathTextRenderer text={part.slice(2, -2)} isUser={isUser} /></strong>;
            }
            return <span key={pIdx}><MathTextRenderer text={part} isUser={isUser} /></span>;
          });
        };

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-3 my-0.5">
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 mt-2", isUser ? "bg-brand-200" : "bg-[#8A1C36]")} />
              <span className={cn("leading-relaxed font-semibold flex-1", isUser ? "text-brand-50" : "text-slate-700")}>{renderInline(listContent)}</span>
            </div>
          );
        }

        if (isNumbered) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-3 my-0.5">
              <span className={cn("font-black text-xs shrink-0 mt-0.5", isUser ? "text-brand-200" : "text-[#8A1C36]")}>{numLabel}.</span>
              <span className={cn("leading-relaxed font-semibold flex-1", isUser ? "text-brand-50" : "text-slate-700")}>{renderInline(listContent)}</span>
            </div>
          );
        }

        // Regular line
        if (trimmed === '') {
          return <div key={lineIdx} className="h-1" />;
        }

        return (
          <p key={lineIdx} className={cn("leading-relaxed font-semibold", isUser ? "text-white" : "text-slate-700")}>
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
};


export default function AiMentor({ user }: { user: any }) {
  const { refreshProfile } = useAuth();
  // rotating exam tips index
  const [currentTipIdx, setCurrentTipIdx] = useState(0);
  const [mobileTab, setMobileTab] = useState<'chat' | 'tools'>('chat');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTipIdx((prev) => (prev + 1) % ODISHA_STUDY_TIPS.length);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [generatingStep, setGeneratingStep] = useState(0);

  // Chat States
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('study_coach_messages');
    return saved ? JSON.parse(saved) : [
      {
        role: 'assistant',
        content: "Namaskar! I am your OdishaExamPrep AI Model. I am here to help you prepare for OPSC OAS, OSSC CGL, and OSSSC RI/ARI/Amin exams. Ask me any questions about Odisha History & Geography, Indian Polity, Odia Grammar rules, or Quantitative Aptitude shortcuts! You can also select a syllabus chapter on the right to get summaries, or take a dynamic practice quiz."
      }
    ];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [responseMode, setResponseMode] = useState<'quick' | 'best'>(() => {
    const saved = localStorage.getItem('study_coach_response_mode');
    return (saved === 'quick' || saved === 'best') ? saved : 'quick';
  });

  // Interactive Study Suite States
  const [quizSubject, setQuizSubject] = useState(() => {
    const metaVal = user?.user_metadata?.study_coach_practice?.quizSubject;
    if (metaVal) return metaVal;
    return localStorage.getItem('study_coach_quiz_subject') || 'Odisha GK & History';
  });

  const [quizTabs, setQuizTabs] = useState<string[]>(() => {
    const saved = localStorage.getItem('study_coach_quiz_tabs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      'Odisha GK & History',
      'Indian Polity & Constitution',
      'Quantitative Aptitude',
      'Odia Grammar & Translation',
      'English Comprehension & Vocabulary'
    ];
  });

  const [isAddingQuizTab, setIsAddingQuizTab] = useState(false);
  const [newQuizTabName, setNewQuizTabName] = useState('');

  const [quizTargetExam, setQuizTargetExam] = useState(() => {
    const metaVal = user?.user_metadata?.study_coach_practice?.quizTargetExam;
    if (metaVal !== undefined) return metaVal;
    return localStorage.getItem('study_coach_quiz_target_exam') || '';
  });

  useEffect(() => {
    localStorage.setItem('study_coach_quiz_tabs', JSON.stringify(quizTabs));
  }, [quizTabs]);

  const [userExams, setUserExams] = useState<string[]>(() => {
    const saved = localStorage.getItem('study_coach_user_exams');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return ['OPSC OAS', 'OSSC CGL', 'OSSSC RI/ARI/Amin'];
  });

  const [targetExam, setTargetExam] = useState(() => {
    const metaVal = user?.user_metadata?.study_coach_planner?.targetExam;
    if (metaVal) return metaVal;
    const saved = localStorage.getItem('study_coach_target_exam');
    if (saved) return saved;
    return 'OPSC OAS';
  });

  const [newExamName, setNewExamName] = useState('');

  const handleDeleteExam = (examToDelete: string) => {
    const updated = userExams.filter(e => e !== examToDelete);
    setUserExams(updated);
    if (targetExam === examToDelete) {
      if (updated.length > 0) {
        setTargetExam(updated[0]);
      } else {
        setTargetExam('General Practice');
      }
    }
  };

  const handleAddNewExam = () => {
    const trimmed = newExamName.trim();
    if (!trimmed) return;
    const exists = userExams.some(e => e.toLowerCase() === trimmed.toLowerCase());
    const updated = exists ? userExams : [...userExams, trimmed];
    if (!exists) {
      setUserExams(updated);
    }
    setTargetExam(trimmed);
    setNewExamName('');
  };

  const [isExamDropdownOpen, setIsExamDropdownOpen] = useState(false);
  const examDropdownRef = useRef<HTMLDivElement>(null);

  const [activeRightTab, setActiveRightTab] = useState<'planner' | 'quiz' | 'syllabus' | 'formulas'>(() => {
    return (localStorage.getItem('study_coach_right_tab') as any) || 'planner';
  });

  useEffect(() => {
    localStorage.setItem('study_coach_right_tab', activeRightTab);
  }, [activeRightTab]);

  const [quizDifficulty, setQuizDifficulty] = useState(() => {
    const metaVal = user?.user_metadata?.study_coach_practice?.quizDifficulty;
    if (metaVal) return metaVal;
    return localStorage.getItem('study_coach_quiz_difficulty') || 'Medium';
  });
  const [quizSize, setQuizSize] = useState<number>(() => {
    const metaVal = user?.user_metadata?.study_coach_practice?.quizSize;
    if (metaVal !== undefined && metaVal !== null) return Number(metaVal);
    const saved = localStorage.getItem('study_coach_quiz_size');
    return saved ? Number(saved) : 3;
  });
  const [quizMode, setQuizMode] = useState<'quick' | 'best'>(() => {
    const metaVal = user?.user_metadata?.study_coach_practice?.quizMode;
    if (metaVal) return metaVal;
    const saved = localStorage.getItem('study_coach_quiz_mode');
    return (saved === 'quick' || saved === 'best') ? saved : 'quick';
  });
  const [activeQuiz, setActiveQuiz] = useState<any[]>(() => {
    const metaVal = user?.user_metadata?.study_coach_practice?.activeQuiz;
    if (metaVal) return metaVal;
    const saved = localStorage.getItem('study_coach_active_quiz');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>(() => {
    const metaVal = user?.user_metadata?.study_coach_practice?.selectedAnswers;
    if (metaVal) return metaVal;
    const saved = localStorage.getItem('study_coach_selected_answers');
    return saved ? JSON.parse(saved) : {};
  });
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(() => {
    const metaVal = user?.user_metadata?.study_coach_practice?.quizSubmitted;
    if (metaVal !== undefined && metaVal !== null) return metaVal === true || metaVal === 'true';
    return localStorage.getItem('study_coach_quiz_submitted') === 'true';
  });
  const [quizLoading, setQuizLoading] = useState(false);

  // Quiz loading progress animation
  useEffect(() => {
    if (!quizLoading) {
      setGeneratingProgress(0);
      setGeneratingStep(0);
      return;
    }

    const progressTimer = setInterval(() => {
      setGeneratingProgress((prev) => {
        if (prev >= 98) return 98;
        const inc = Math.floor(Math.random() * 8) + 4;
        const next = prev + inc;
        return next > 98 ? 98 : next;
      });
    }, 350);

    return () => clearInterval(progressTimer);
  }, [quizLoading]);

  useEffect(() => {
    if (generatingProgress < 25) {
      setGeneratingStep(0);
    } else if (generatingProgress < 55) {
      setGeneratingStep(1);
    } else if (generatingProgress < 80) {
      setGeneratingStep(2);
    } else {
      setGeneratingStep(3);
    }
  }, [generatingProgress]);

  // Score History
  const [quizHistory, setQuizHistory] = useState<{
    date: string;
    subject: string;
    score: number;
    total: number;
    difficulty: string;
  }[]>(() => {
    const metaVal = user?.user_metadata?.study_coach_practice?.quizHistory;
    if (metaVal) return metaVal;
    const saved = localStorage.getItem('study_coach_quiz_history');
    return saved ? JSON.parse(saved) : [];
  });

  const activities = React.useMemo(() => {
    const raw = user?.id ? activityTracker.getActivities(user.id) : [];
    return raw.filter(act => act && typeof act === 'object' && typeof act.type === 'string');
  }, [user?.id]);

  const practiceStats = React.useMemo(() => {
    const completedFromActivities = activities.filter(
      (act) => act && (act.type === 'practice_test_completed' || act.type === 'mock_test_completed')
    );

    const totalCompleted = Math.max(
      quizHistory.length,
      completedFromActivities.length
    );

    let totalAccuracySum = 0;
    let accuracyCount = 0;

    completedFromActivities.forEach((act) => {
      if (act.accuracy !== undefined) {
        totalAccuracySum += act.accuracy;
        accuracyCount++;
      } else if (act.score !== undefined && act.totalMarks !== undefined && act.totalMarks > 0) {
        totalAccuracySum += (act.score / act.totalMarks) * 100;
        accuracyCount++;
      }
    });

    if (accuracyCount === 0) {
      quizHistory.forEach((rec) => {
        if (rec.total > 0) {
          totalAccuracySum += (rec.score / rec.total) * 100;
          accuracyCount++;
        }
      });
    }

    const avgAccuracy = accuracyCount > 0 ? Math.round(totalAccuracySum / accuracyCount) : 0;

    const activeDates = new Set<string>();
    activities.forEach((act) => {
      if (act && act.timestamp) {
        try {
          const dateStr = act.timestamp.split('T')[0];
          activeDates.add(dateStr);
        } catch (e) {}
      }
    });
    
    quizHistory.forEach((rec) => {
      if (rec.date) {
        try {
          const parsedDate = new Date(rec.date);
          if (!isNaN(parsedDate.getTime())) {
            activeDates.add(parsedDate.toISOString().split('T')[0]);
          }
        } catch (e) {}
      }
    });

    let streak = 0;
    if (activeDates.size > 0) {
      let checkDate = new Date();
      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (activeDates.has(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          if (streak === 0) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            if (activeDates.has(yesterdayStr)) {
              checkDate = yesterday;
              continue;
            }
          }
          break;
        }
      }
    }

    return {
      totalCompleted,
      avgAccuracy,
      streak: streak || (totalCompleted > 0 ? 1 : 0)
    };
  }, [activities, quizHistory, user?.id]);

  // Bookmarks
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<any[]>(() => {
    const metaVal = user?.user_metadata?.study_coach_practice?.bookmarkedQuestions;
    if (metaVal) return metaVal;
    const saved = localStorage.getItem('study_coach_bookmarks');
    return saved ? JSON.parse(saved) : [];
  });
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  // Syllabus Workspace States
  const [collections, setCollections] = useState<SyllabusCollection[]>(() => {
    const metaVal = user?.user_metadata?.study_coach_syllabus?.collections;
    if (metaVal) return metaVal;
    const saved = localStorage.getItem(`study_coach_collections_${user?.id || 'guest'}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(() => {
    const metaVal = user?.user_metadata?.study_coach_syllabus?.activeCollectionId;
    if (metaVal !== undefined) return metaVal;
    const saved = localStorage.getItem(`study_coach_active_collection_id_${user?.id || 'guest'}`);
    return saved || null;
  });

  // UI state for adding/editing items
  const [newCollectionName, setNewCollectionName] = useState('');
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editingCollectionName, setEditingCollectionName] = useState('');
  
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicName, setEditingTopicName] = useState('');
  const [editingTopicDesc, setEditingTopicDesc] = useState('');

  const [aiSubjectInput, setAiSubjectInput] = useState('');
  const [aiGeneratingSyllabus, setAiGeneratingSyllabus] = useState(false);
  const [showAddCollection, setShowAddCollection] = useState(false);
  const [showAddTopic, setShowAddTopic] = useState(false);

  // Custom Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary' | 'success';
    onConfirm: () => void;
  } | null>(null);

  // Formula & Cheat Sheet States
  const [formulaCategories, setFormulaCategories] = useState<{
    id: string;
    name: string;
    cards: { id: string; title: string; formula: string; shortcut: string; example: string }[];
  }[]>(() => {
    const metaVal = user?.user_metadata?.study_coach_formulas?.formulaCategories;
    if (metaVal) return metaVal;
    const saved = localStorage.getItem('study_coach_formula_categories');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeFormulaCatId, setActiveFormulaCatId] = useState<string | null>(() => {
    const metaVal = user?.user_metadata?.study_coach_formulas?.activeFormulaCatId;
    if (metaVal !== undefined) return metaVal;
    const saved = localStorage.getItem('study_coach_active_formula_cat_id');
    return saved || null;
  });

  // Sync category and active cat selection
  useEffect(() => {
    localStorage.setItem('study_coach_formula_categories', JSON.stringify(formulaCategories));
    if (formulaCategories.length > 0 && !activeFormulaCatId) {
      setActiveFormulaCatId(formulaCategories[0].id);
    }
  }, [formulaCategories, activeFormulaCatId]);

  useEffect(() => {
    if (activeFormulaCatId) {
      localStorage.setItem('study_coach_active_formula_cat_id', activeFormulaCatId);
    } else {
      localStorage.removeItem('study_coach_active_formula_cat_id');
    }
  }, [activeFormulaCatId]);

  const [searchQuery, setSearchQuery] = useState('');
  const [flashcardMode, setFlashcardMode] = useState(false);
  const [revealedFlashcards, setRevealedFlashcards] = useState<Record<string, boolean>>({});

  // Category addition form states
  const [showAddFormulaCategory, setShowAddFormulaCategory] = useState(false);
  const [newFormulaCategoryName, setNewFormulaCategoryName] = useState('');
  const [editingFormulaCatId, setEditingFormulaCatId] = useState<string | null>(null);
  const [editingFormulaCatName, setEditingFormulaCatName] = useState('');

  // Formula addition form states
  const [showAddFormula, setShowAddFormula] = useState(false);
  const [newFormulaTitle, setNewFormulaTitle] = useState('');
  const [newFormulaVal, setNewFormulaVal] = useState('');
  const [newFormulaShortcut, setNewFormulaShortcut] = useState('');
  const [newFormulaExample, setNewFormulaExample] = useState('');

  // Formula inline edit states
  const [editingFormulaKey, setEditingFormulaKey] = useState<string | null>(null); // acts as categoryId
  const [editingFormulaIndex, setEditingFormulaIndex] = useState<string | null>(null); // acts as cardId
  const [editingFormulaTitle, setEditingFormulaTitle] = useState('');
  const [editingFormulaVal, setEditingFormulaVal] = useState('');
  const [editingFormulaShortcut, setEditingFormulaShortcut] = useState('');
  const [editingFormulaExample, setEditingFormulaExample] = useState('');

  // AI Formula Generation States
  const [showAiFormulaPrompt, setShowAiFormulaPrompt] = useState(false);
  const [aiFormulaPromptText, setAiFormulaPromptText] = useState('');
  const [aiGeneratingFormula, setAiGeneratingFormula] = useState(false);
  const [aiGeneratedFormula, setAiGeneratedFormula] = useState<{
    category: string;
    title: string;
    formula: string;
    shortcut: string;
    example: string;
  } | null>(null);

  // AI Coach / Planner States
  const [coachMode, setCoachMode] = useState<'manual' | 'ai'>(() => {
    const metaVal = user?.user_metadata?.study_coach_planner?.coachMode;
    if (metaVal) return metaVal;
    return (localStorage.getItem('study_coach_timer_type') as 'manual' | 'ai') || 'manual';
  });
  const [plannerStart, setPlannerStart] = useState(() => {
    const metaVal = user?.user_metadata?.study_coach_planner?.plannerStart;
    if (metaVal) return metaVal;
    return localStorage.getItem('study_coach_planner_start') || getCurrentTimeStr();
  });
  const [plannerEnd, setPlannerEnd] = useState(() => {
    const metaVal = user?.user_metadata?.study_coach_planner?.plannerEnd;
    if (metaVal) return metaVal;
    return localStorage.getItem('study_coach_planner_end') || getFutureTimeStr(3);
  });
  const [plannerGoal, setPlannerGoal] = useState(() => {
    const metaVal = user?.user_metadata?.study_coach_planner?.plannerGoal;
    if (metaVal) return metaVal;
    return localStorage.getItem('study_coach_planner_goal') || 'Deep Study';
  });
  const [plannerEnergy, setPlannerEnergy] = useState(() => {
    const metaVal = user?.user_metadata?.study_coach_planner?.plannerEnergy;
    if (metaVal) return metaVal;
    return localStorage.getItem('study_coach_planner_energy') || 'Normal';
  });
  const [plannerChapters, setPlannerChapters] = useState(() => {
    const metaVal = user?.user_metadata?.study_coach_planner?.plannerChapters;
    if (metaVal !== undefined) return metaVal;
    return localStorage.getItem('study_coach_planner_chapters') || '';
  });
  const [plannerQuestions, setPlannerQuestions] = useState(() => {
    const metaVal = user?.user_metadata?.study_coach_planner?.plannerQuestions;
    if (metaVal !== undefined) return metaVal;
    return localStorage.getItem('study_coach_planner_questions') || '';
  });
  const [plannerHours, setPlannerHours] = useState(() => {
    const metaVal = user?.user_metadata?.study_coach_planner?.plannerHours;
    if (metaVal !== undefined) return metaVal;
    return localStorage.getItem('study_coach_planner_hours') || '';
  });
  const [plannerBlocks, setPlannerBlocks] = useState<any[]>(() => {
    const metaVal = user?.user_metadata?.study_coach_planner?.plannerBlocks;
    if (metaVal) return metaVal;
    const saved = localStorage.getItem('study_coach_planner_blocks');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeBlockIndex, setActiveBlockIndex] = useState<number>(() => {
    const metaVal = user?.user_metadata?.study_coach_planner?.activeBlockIndex;
    if (metaVal !== undefined && metaVal !== null) return Number(metaVal);
    const saved = localStorage.getItem('study_coach_active_block_index');
    return saved ? Number(saved) : -1;
  });
  const [coachStrategy, setCoachStrategy] = useState(() => {
    const metaVal = user?.user_metadata?.study_coach_planner?.coachStrategy;
    if (metaVal !== undefined) return metaVal;
    return localStorage.getItem('study_coach_strategy') || '';
  });
  const [pausedSeconds, setPausedSeconds] = useState(0);
  const [coachLoading, setCoachLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const roadmapContainerRef = useRef<HTMLDivElement>(null);
  const [hasPlanStarted, setHasPlanStarted] = useState(() => {
    const metaVal = user?.user_metadata?.study_coach_planner?.hasPlanStarted;
    if (metaVal !== undefined) return !!metaVal;
    return localStorage.getItem('study_coach_has_plan_started') === 'true';
  });

  // Auto-scroll active block into center view in the roadmap box
  useEffect(() => {
    if (activeBlockIndex !== -1 && plannerBlocks.length > 0 && roadmapContainerRef.current) {
      setTimeout(() => {
        if (roadmapContainerRef.current) {
          const activeEl = roadmapContainerRef.current.querySelector('[data-active="true"]');
          if (activeEl) {
            roadmapContainerRef.current.scrollTop = 
              (activeEl as HTMLElement).offsetTop - 
              roadmapContainerRef.current.clientHeight / 2 + 
              (activeEl as HTMLElement).clientHeight / 2;
          }
        }
      }, 100);
    }
  }, [activeBlockIndex, plannerBlocks]);

  // Pomodoro Study Timer Initial State Calculation
  const initialTimer = React.useMemo(() => {
    const metaPlanner = user?.user_metadata?.study_coach_planner;
    const savedSeconds = metaPlanner?.timerSeconds !== undefined ? String(metaPlanner.timerSeconds) : localStorage.getItem('study_coach_timer_seconds');
    const savedActive = metaPlanner?.timerActive !== undefined ? metaPlanner.timerActive : (localStorage.getItem('study_coach_timer_active') === 'true');
    const savedMode = metaPlanner?.timerMode || (localStorage.getItem('study_coach_timer_mode') as 'study' | 'break') || 'study';
    const savedMaxSeconds = metaPlanner?.timerMaxSeconds !== undefined ? String(metaPlanner.timerMaxSeconds) : localStorage.getItem('study_coach_timer_max_seconds');
    const savedLastTimestampStr = metaPlanner?.timerLastTimestamp !== undefined ? String(metaPlanner.timerLastTimestamp) : localStorage.getItem('study_coach_timer_last_timestamp');
    
    const initMaxSeconds = savedMaxSeconds ? Number(savedMaxSeconds) : 1500;
    const initSeconds = savedSeconds ? Number(savedSeconds) : 1500;
    const initActive = savedActive;
    const initMode = savedMode;
    
    if (savedActive && savedLastTimestampStr) {
      const savedLastTimestamp = Number(savedLastTimestampStr);
      const elapsedSeconds = Math.floor((Date.now() - savedLastTimestamp) / 1000);
      
      if (elapsedSeconds > 0) {
        const remainingSeconds = initSeconds - elapsedSeconds;
        if (remainingSeconds > 0) {
          return {
            seconds: remainingSeconds,
            active: true,
            mode: initMode,
            maxSeconds: initMaxSeconds,
            offlineFinished: false,
            finishedMode: null,
            skippedBlocksCount: 0
          };
        } else {
          // Timer finished offline!
          const isAi = metaPlanner?.coachMode ? (metaPlanner.coachMode === 'ai') : (localStorage.getItem('study_coach_timer_type') === 'ai');
          if (isAi) {
            const savedBlocksStr = metaPlanner?.plannerBlocks ? JSON.stringify(metaPlanner.plannerBlocks) : localStorage.getItem('study_coach_planner_blocks');
            const savedActiveIdxStr = metaPlanner?.activeBlockIndex !== undefined ? String(metaPlanner.activeBlockIndex) : localStorage.getItem('study_coach_active_block_index');
            
            if (savedBlocksStr && savedActiveIdxStr) {
              const savedBlocks = JSON.parse(savedBlocksStr);
              let activeIdx = Number(savedActiveIdxStr);
              
              if (Array.isArray(savedBlocks) && activeIdx >= 0 && activeIdx < savedBlocks.length) {
                let currentRemainingElapsed = elapsedSeconds;
                currentRemainingElapsed -= initSeconds;
                
                savedBlocks[activeIdx].status = 'completed';
                if (savedBlocks[activeIdx].type !== 'break') {
                  savedBlocks[activeIdx].actuallyStudiedSeconds = savedBlocks[activeIdx].duration;
                }
                activeIdx++;
                
                let skippedCount = 1;
                while (activeIdx < savedBlocks.length && currentRemainingElapsed > 0) {
                  const blockDuration = savedBlocks[activeIdx].duration;
                  if (currentRemainingElapsed >= blockDuration) {
                    currentRemainingElapsed -= blockDuration;
                    savedBlocks[activeIdx].status = 'completed';
                    if (savedBlocks[activeIdx].type !== 'break') {
                      savedBlocks[activeIdx].actuallyStudiedSeconds = blockDuration;
                    }
                    activeIdx++;
                    skippedCount++;
                  } else {
                    const blockRemaining = blockDuration - currentRemainingElapsed;
                    savedBlocks[activeIdx].status = 'active';
                    
                    return {
                      seconds: blockRemaining,
                      active: true,
                      mode: savedBlocks[activeIdx].type === 'break' ? 'break' : 'study',
                      maxSeconds: blockDuration,
                      offlineFinished: true,
                      finishedMode: initMode,
                      skippedBlocksCount: skippedCount,
                      updatedBlocks: savedBlocks,
                      updatedActiveIdx: activeIdx
                    };
                  }
                }
                
                return {
                  seconds: 1500,
                  active: false,
                  mode: 'study',
                  maxSeconds: 1500,
                  offlineFinished: true,
                  finishedMode: 'study',
                  skippedBlocksCount: skippedCount,
                  updatedBlocks: savedBlocks.map((b: any) => ({ 
                    ...b, 
                    status: 'completed',
                    actuallyStudiedSeconds: b.actuallyStudiedSeconds !== undefined ? b.actuallyStudiedSeconds : (b.type !== 'break' ? b.duration : 0)
                  })),
                  updatedActiveIdx: -1
                };
              }
            }
          }
          
          // Fallback or manual Pomodoro
          const nextMode = initMode === 'study' ? 'break' : 'study';
          const nextMax = nextMode === 'study' ? initMaxSeconds : 300;
          return {
            seconds: nextMax,
            active: false,
            mode: nextMode,
            maxSeconds: initMaxSeconds,
            offlineFinished: true,
            finishedMode: initMode,
            skippedBlocksCount: 0
          };
        }
      }
    }
    
    return {
      seconds: initSeconds,
      active: initActive,
      mode: initMode,
      maxSeconds: initMaxSeconds,
      offlineFinished: false,
      finishedMode: null,
      skippedBlocksCount: 0
    };
  }, []);

  // Pomodoro Study Timer States
  const [timerSeconds, setTimerSeconds] = useState<number>(initialTimer.seconds);
  const [timerActive, setTimerActive] = useState<boolean>(initialTimer.active);
  const [timerMode, setTimerMode] = useState<'study' | 'break'>(initialTimer.mode);
  const [timerMaxSeconds, setTimerMaxSeconds] = useState<number>(initialTimer.maxSeconds);
  const [timerSyncTrigger, setTimerSyncTrigger] = useState(0);
  const [breakMaxSeconds, setBreakMaxSeconds] = useState<number>(() => {
    const metaVal = user?.user_metadata?.study_coach_planner?.breakMaxSeconds;
    if (metaVal !== undefined && metaVal !== null) return Number(metaVal);
    const saved = localStorage.getItem('study_coach_break_max_seconds');
    return saved ? Number(saved) : 300;
  });
  const [timerGoal, setTimerGoal] = useState(() => {
    const metaVal = user?.user_metadata?.study_coach_planner?.timerGoal;
    if (metaVal !== undefined) return metaVal;
    return localStorage.getItem('study_coach_timer_goal') || '';
  });
  const [completedSessionsCount, setCompletedSessionsCount] = useState<number>(() => {
    const metaVal = user?.user_metadata?.study_coach_planner?.completedSessionsCount;
    if (metaVal !== undefined && metaVal !== null) return Number(metaVal);
    const saved = localStorage.getItem('study_coach_completed_sessions');
    return saved ? Number(saved) : 0;
  });
  const [completedStudyMinutes, setCompletedStudyMinutes] = useState<number>(() => {
    const metaVal = user?.user_metadata?.study_coach_planner?.completedStudyMinutes;
    if (metaVal !== undefined && metaVal !== null) return Number(metaVal);
    const saved = localStorage.getItem('study_coach_completed_study_minutes');
    if (saved) return Number(saved);
    const savedSessions = localStorage.getItem('study_coach_completed_sessions');
    const sessions = savedSessions ? Number(savedSessions) : 0;
    const metaSessionsVal = user?.user_metadata?.study_coach_planner?.completedSessionsCount;
    const finalSessions = metaSessionsVal !== undefined && metaSessionsVal !== null ? Number(metaSessionsVal) : sessions;
    return finalSessions * 25;
  });
  const [studySecondsAccumulator, setStudySecondsAccumulator] = useState(0);

  // Calculate remaining minutes in active study plan
  const remainingPlanMinutes = React.useMemo(() => {
    if (activeBlockIndex < 0 || !plannerBlocks.length) return 0;
    let totalSeconds = 0;
    plannerBlocks.forEach((b, idx) => {
      if (idx === activeBlockIndex) {
        totalSeconds += timerSeconds;
      } else if (idx > activeBlockIndex) {
        totalSeconds += b.duration;
      }
    });
    return totalSeconds / 60;
  }, [plannerBlocks, activeBlockIndex, timerSeconds]);

  // State Synchronizers & Offline handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (examDropdownRef.current && !examDropdownRef.current.contains(event.target as Node)) {
        setIsExamDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('study_coach_target_exam', targetExam);
  }, [targetExam]);

  useEffect(() => {
    localStorage.setItem('study_coach_user_exams', JSON.stringify(userExams));
  }, [userExams]);


  useEffect(() => {
    localStorage.setItem('study_coach_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('study_coach_response_mode', responseMode);
  }, [responseMode]);

  useEffect(() => {
    localStorage.setItem('study_coach_quiz_subject', quizSubject);
    localStorage.setItem('study_coach_quiz_difficulty', quizDifficulty);
    localStorage.setItem('study_coach_quiz_size', String(quizSize));
    localStorage.setItem('study_coach_quiz_mode', quizMode);
    localStorage.setItem('study_coach_quiz_target_exam', quizTargetExam);
    localStorage.setItem('study_coach_active_quiz', JSON.stringify(activeQuiz));
    localStorage.setItem('study_coach_selected_answers', JSON.stringify(selectedAnswers));
    localStorage.setItem('study_coach_quiz_submitted', String(quizSubmitted));
  }, [quizSubject, quizDifficulty, quizSize, quizMode, quizTargetExam, activeQuiz, selectedAnswers, quizSubmitted]);

  useEffect(() => {
    // timerSeconds is intentionally excluded — it's written inside the interval
    // at a throttled rate (every 10s) and on pause/unmount to avoid per-second
    // synchronous localStorage calls that block the main thread during scroll.
    localStorage.setItem('study_coach_timer_mode', timerMode);
    localStorage.setItem('study_coach_timer_max_seconds', String(timerMaxSeconds));
    localStorage.setItem('study_coach_break_max_seconds', String(breakMaxSeconds));
    localStorage.setItem('study_coach_timer_active', String(timerActive));
    localStorage.setItem('study_coach_timer_goal', timerGoal);
  }, [timerMode, timerMaxSeconds, breakMaxSeconds, timerActive, timerGoal]);

  // Save AI Session Planner states
  useEffect(() => {
    localStorage.setItem('study_coach_timer_type', coachMode);
    localStorage.setItem('study_coach_planner_start', plannerStart);
    localStorage.setItem('study_coach_planner_end', plannerEnd);
    localStorage.setItem('study_coach_planner_goal', plannerGoal);
    localStorage.setItem('study_coach_planner_energy', plannerEnergy);
    localStorage.setItem('study_coach_planner_chapters', plannerChapters);
    localStorage.setItem('study_coach_planner_questions', plannerQuestions);
    localStorage.setItem('study_coach_planner_hours', plannerHours);
    localStorage.setItem('study_coach_planner_blocks', JSON.stringify(plannerBlocks));
    localStorage.setItem('study_coach_active_block_index', String(activeBlockIndex));
    localStorage.setItem('study_coach_strategy', coachStrategy);
  }, [
    coachMode,
    plannerStart,
    plannerEnd,
    plannerGoal,
    plannerEnergy,
    plannerChapters,
    plannerQuestions,
    plannerHours,
    plannerBlocks,
    activeBlockIndex,
    coachStrategy
  ]);

  // Sync custom syllabus collections
  useEffect(() => {
    localStorage.setItem(`study_coach_collections_${user?.id || 'guest'}`, JSON.stringify(collections));
    if (collections.length > 0 && !activeCollectionId) {
      setActiveCollectionId(collections[0].id);
    }
  }, [collections, activeCollectionId, user?.id]);

  useEffect(() => {
    if (activeCollectionId) {
      localStorage.setItem(`study_coach_active_collection_id_${user?.id || 'guest'}`, activeCollectionId);
    } else {
      localStorage.removeItem(`study_coach_active_collection_id_${user?.id || 'guest'}`);
    }
  }, [activeCollectionId, user?.id]);

  const lastSyncedTimestampRef = useRef<number>(0);

  // Unified Debounced Supabase Sync Engine
  useEffect(() => {
    if (!user || user.id === 'guest') return;

    const handler = setTimeout(async () => {
      try {
        const updatedTimestamp = Date.now();
        const { error } = await supabase.auth.updateUser({
          data: {
            study_coach_planner: {
              coachMode,
              plannerStart,
              plannerEnd,
              plannerGoal,
              plannerEnergy,
              plannerChapters,
              plannerQuestions,
              plannerHours,
              plannerBlocks,
              activeBlockIndex,
              coachStrategy,
              completedSessionsCount,
              completedStudyMinutes,
              timerGoal,
              breakMaxSeconds,
              targetExam,
              timerSeconds: timerSecondsRef.current,
              timerActive,
              timerMode,
              timerMaxSeconds,
              timerLastTimestamp: Date.now(),
              hasPlanStarted
            },
            study_coach_practice: {
              quizSubject,
              quizDifficulty,
              quizSize,
              quizMode,
              quizTargetExam,
              activeQuiz,
              selectedAnswers,
              quizSubmitted,
              quizHistory,
              bookmarkedQuestions
            },
            study_coach_syllabus: {
              collections,
              activeCollectionId
            },
            study_coach_formulas: {
              formulaCategories,
              activeFormulaCatId
            },
            study_coach_user_exams: userExams,
            study_coach_target_exam: targetExam,
            study_suite_last_updated: updatedTimestamp
          }
        });
        if (!error) {
          lastSyncedTimestampRef.current = updatedTimestamp;
        } else {
          console.error("Supabase study suite sync error:", error);
        }
      } catch (err) {
        console.error("Supabase study suite sync failed:", err);
      }
    }, 2000); // 2-second debounce to batch rapid updates

    return () => clearTimeout(handler);
  }, [
    user,
    // Planner section states
    coachMode,
    plannerStart,
    plannerEnd,
    plannerGoal,
    plannerEnergy,
    plannerChapters,
    plannerQuestions,
    plannerHours,
    plannerBlocks,
    activeBlockIndex,
    coachStrategy,
    completedSessionsCount,
    completedStudyMinutes,
    timerGoal,
    breakMaxSeconds,
    targetExam,
    timerActive,
    timerMode,
    timerMaxSeconds,
    hasPlanStarted,
    // Practice section states
    quizSubject,
    quizDifficulty,
    quizSize,
    quizMode,
    quizTargetExam,
    activeQuiz,
    selectedAnswers,
    quizSubmitted,
    quizHistory,
    bookmarkedQuestions,
    // Syllabus section states
    collections,
    activeCollectionId,
    // Formulas section states
    formulaCategories,
    activeFormulaCatId,
    // User exams
    userExams,
    // Timer sync trigger
    timerSyncTrigger
  ]);

  // Sync-in cloud changes to local React states when user metadata changes
  useEffect(() => {
    if (!user || user.id === 'guest') return;
    
    // Initialize the ref if it hasn't been set yet
    const initialServerTimestamp = user.user_metadata?.study_suite_last_updated;
    if (lastSyncedTimestampRef.current === 0 && initialServerTimestamp) {
      lastSyncedTimestampRef.current = Number(initialServerTimestamp);
    }
    
    const serverTimestamp = user.user_metadata?.study_suite_last_updated;
    if (serverTimestamp && Number(serverTimestamp) > lastSyncedTimestampRef.current) {
      const meta = user.user_metadata;
      
      // 1. Target Exam & User Exams
      if (meta.study_coach_target_exam !== undefined) setTargetExam(meta.study_coach_target_exam);
      if (meta.study_coach_user_exams !== undefined) setUserExams(meta.study_coach_user_exams);

      // 2. Planner
      const planner = meta.study_coach_planner;
      if (planner) {
        if (planner.coachMode !== undefined) setCoachMode(planner.coachMode);
        if (planner.plannerStart !== undefined) setPlannerStart(planner.plannerStart);
        if (planner.plannerEnd !== undefined) setPlannerEnd(planner.plannerEnd);
        if (planner.plannerGoal !== undefined) setPlannerGoal(planner.plannerGoal);
        if (planner.plannerEnergy !== undefined) setPlannerEnergy(planner.plannerEnergy);
        if (planner.plannerChapters !== undefined) setPlannerChapters(planner.plannerChapters);
        if (planner.plannerQuestions !== undefined) setPlannerQuestions(planner.plannerQuestions);
        if (planner.plannerHours !== undefined) setPlannerHours(planner.plannerHours);
        if (planner.plannerBlocks !== undefined) setPlannerBlocks(planner.plannerBlocks);
        if (planner.activeBlockIndex !== undefined) setActiveBlockIndex(planner.activeBlockIndex);
        if (planner.coachStrategy !== undefined) setCoachStrategy(planner.coachStrategy);
        if (planner.completedSessionsCount !== undefined) setCompletedSessionsCount(planner.completedSessionsCount);
        if (planner.completedStudyMinutes !== undefined) setCompletedStudyMinutes(planner.completedStudyMinutes);
        if (planner.hasPlanStarted !== undefined) setHasPlanStarted(planner.hasPlanStarted);
        
        // Timer states
        if (planner.timerMode !== undefined) setTimerMode(planner.timerMode);
        if (planner.timerMaxSeconds !== undefined) setTimerMaxSeconds(planner.timerMaxSeconds);
        if (planner.breakMaxSeconds !== undefined) setBreakMaxSeconds(planner.breakMaxSeconds);
        if (planner.timerGoal !== undefined) setTimerGoal(planner.timerGoal);
        
        if (planner.timerActive !== undefined) {
          const isActive = planner.timerActive;
          setTimerActive(isActive);
          
          if (planner.timerSeconds !== undefined) {
            let finalSeconds = planner.timerSeconds;
            if (isActive && planner.timerLastTimestamp) {
              const elapsed = Math.floor((Date.now() - planner.timerLastTimestamp) / 1000);
              if (elapsed > 0) {
                finalSeconds = Math.max(0, finalSeconds - elapsed);
              }
            }
            setTimerSeconds(finalSeconds);
          }
        }
      }

      // 3. Practice
      const practice = meta.study_coach_practice;
      if (practice) {
        if (practice.quizSubject !== undefined) setQuizSubject(practice.quizSubject);
        if (practice.quizDifficulty !== undefined) setQuizDifficulty(practice.quizDifficulty);
        if (practice.quizSize !== undefined) setQuizSize(practice.quizSize);
        if (practice.quizMode !== undefined) setQuizMode(practice.quizMode);
        if (practice.quizTargetExam !== undefined) setQuizTargetExam(practice.quizTargetExam);
        if (practice.activeQuiz !== undefined) setActiveQuiz(practice.activeQuiz);
        if (practice.selectedAnswers !== undefined) setSelectedAnswers(practice.selectedAnswers);
        if (practice.quizSubmitted !== undefined) setQuizSubmitted(practice.quizSubmitted);
        if (practice.quizHistory !== undefined) setQuizHistory(practice.quizHistory);
        if (practice.bookmarkedQuestions !== undefined) setBookmarkedQuestions(practice.bookmarkedQuestions);
      }

      // 4. Syllabus
      const syllabus = meta.study_coach_syllabus;
      if (syllabus) {
        if (syllabus.collections !== undefined) setCollections(syllabus.collections);
        if (syllabus.activeCollectionId !== undefined) setActiveCollectionId(syllabus.activeCollectionId);
      }

      // 5. Formulas
      const formulas = meta.study_coach_formulas;
      if (formulas) {
        if (formulas.formulaCategories !== undefined) setFormulaCategories(formulas.formulaCategories);
        if (formulas.activeFormulaCatId !== undefined) setActiveFormulaCatId(formulas.activeFormulaCatId);
      }

      // Update local timestamp reference to prevent recursive loop or stale writes
      lastSyncedTimestampRef.current = Number(serverTimestamp);
      
      toast.success("🔄 Sync complete: study profile updated from cloud.", { id: 'cloud-sync-success', duration: 3000 });
    }
  }, [user]);

  // Background polling & focus-driven sync-in from cloud
  useEffect(() => {
    if (!user || user.id === 'guest') return;

    const checkCloudVersion = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        // Fetch fresh user from server to bypass cached JWT issues
        const { data: { user: freshUser }, error } = await supabase.auth.getUser();
        if (!error && freshUser) {
          const serverTimestamp = freshUser.user_metadata?.study_suite_last_updated;
          if (serverTimestamp && Number(serverTimestamp) > lastSyncedTimestampRef.current) {
            // Trigger AuthContext profile refresh to propagate changes to the app
            await refreshProfile();
          }
        }
      } catch (err) {
        console.warn("[Sync-In] Failed to query cloud version:", err);
      }
    };

    // Poll every 10 seconds while tab is active
    const interval = setInterval(checkCloudVersion, 10000);

    // Check immediately on tab focus/visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkCloudVersion();
      }
    };
    
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkCloudVersion);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkCloudVersion);
    };
  }, [user, refreshProfile]);

  // Dispatch event to sync OEP Buddy AI Companion in real time
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('oep-aimentor-changed'));
  }, [
    targetExam,
    plannerBlocks,
    activeBlockIndex,
    collections,
    formulaCategories,
    quizHistory,
    bookmarkedQuestions
  ]);

  // Guard: prevent StrictMode double-mount from firing these one-time toasts twice
  const mountToastFiredRef = useRef(false);
  useEffect(() => {
    if (mountToastFiredRef.current) return; // already ran — ignore StrictMode re-mount
    mountToastFiredRef.current = true;

    if (initialTimer.offlineFinished) {
      const isAi = localStorage.getItem('study_coach_timer_type') === 'ai';
      if (isAi && initialTimer.updatedBlocks) {
        const oldBlocksStr = localStorage.getItem('study_coach_planner_blocks');
        let addedMins = 0;
        if (oldBlocksStr) {
          try {
            const oldBlocks = JSON.parse(oldBlocksStr);
            if (Array.isArray(oldBlocks)) {
              initialTimer.updatedBlocks.forEach((newB: any, idx: number) => {
                const oldB = oldBlocks[idx];
                if (oldB && oldB.status !== 'completed' && newB.status === 'completed' && newB.type !== 'break') {
                  addedMins += Math.round(newB.duration / 60);
                }
              });
            }
          } catch (e) {}
        }
        if (addedMins > 0) {
          setCompletedStudyMinutes(m => {
            const updated = m + addedMins;
            localStorage.setItem('study_coach_completed_study_minutes', String(updated));
            return updated;
          });
        }

        setPlannerBlocks(initialTimer.updatedBlocks);
        setActiveBlockIndex(initialTimer.updatedActiveIdx);
        if (initialTimer.updatedActiveIdx === -1) {
          toast.success("🏆 You completed all remaining sessions in your AI Study Plan while away!", { duration: 9000, id: 'offline-all-done' });
        } else {
          toast(`⏰ Resuming study plan. Completed ${initialTimer.skippedBlocksCount} session blocks while you were away!`, { icon: '🔔', duration: 8000, id: 'offline-resume' });
        }
      } else {
        if (initialTimer.finishedMode === 'study') {
          setCompletedSessionsCount(c => {
            const updated = c + 1;
            localStorage.setItem('study_coach_completed_sessions', String(updated));
            return updated;
          });
          setCompletedStudyMinutes(m => {
            const addedMins = Math.round(initialTimer.maxSeconds / 60);
            const updated = m + addedMins;
            localStorage.setItem('study_coach_completed_study_minutes', String(updated));
            return updated;
          });
          toast(`⏰ Study session completed while you were away! Take a break.`, { icon: '🔔', duration: 8000, id: 'offline-study-done' });
        } else {
          toast(`⏰ Break completed while you were away! Ready to study?`, { icon: '🔔', duration: 8000, id: 'offline-break-done' });
        }
      }

      // Old synthetic audio beep removed to prevent playing dual sounds
    } else if (initialTimer.active) {
      toast(`⏱️ Welcome back! Resuming your focus timer.`, { icon: '⏱️', id: 'welcome-back' });
    }
  }, []);


  // Chat console ref for local container autoscroll
  const chatConsoleRef = useRef<HTMLDivElement>(null);

  // Abort Controller for cancelling generation
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = (force = false) => {
    const container = chatConsoleRef.current;
    if (container) {
      if (force) {
        container.scrollTop = container.scrollHeight;
      } else {
        // Scroll only if the user is already near the bottom (within 150px)
        const threshold = 150;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
        if (isNearBottom) {
          container.scrollTop = container.scrollHeight;
        }
      }
    }
  };

  // Clean up any pending stream on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Stop current streaming generation
  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

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
      prompt: "Generate 3 high-yield multiple-choice questions (using LaTeX math syntax $...$ for all symbols/equations) on Odisha Rivers and Geography with a brief explanation for each.",
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

    setMobileTab('chat');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMessage: Message = { role: 'user', content: textToSend };
    // Immediately append user message AND empty assistant message to show bouncing dots (active feedback)
    setMessages(prev => [...prev, userMessage, { role: 'assistant', content: '', mode: responseMode }]);
    setInput('');
    setLoading(true);
    setTimeout(() => scrollToBottom(true), 30);

    try {
      // Context history pruning (keep last 4 messages to save tokens)
      const recentHistory = messages.slice(-4); 

      const systemPrompt = `You are the expert Exam-Aware AI Engine for OdishaExamPrep, specializing in Indian Government Exams and Odisha Government Exams.
Your goal is to provide highly focused, exam-oriented, and structured academic mentorship optimized for the student's active target exam: "${targetExam}".

Topics of expertise & guidelines under "${targetExam}" context:
1. Odisha History, Heritage & Geography (e.g., Kalinga War, Kharavela, Gajapati Dynasty, Paika Rebellion, Salt Satyagraha in Odisha, river systems, Similipal, Chilika lake, mineral wealth).
2. Indian Constitution & Polity (e.g., Preamble, Fundamental Rights, Emergency, Parliament, judiciary, state legislative structures).
3. Quantitative Aptitude & Logical Reasoning (tricks, shortcuts, speed math, DI).
4. Language Core: English and Odia Grammar, translation mappings, and writing styles.

EXAM-ORIENTED DIRECTIVES:
- Adapt the complexity, depth, and vocabulary to the standard of "${targetExam}".
- Prioritize high-yield exam concepts, Previous Year Question (PYQ) patterns, syllabus-aware topics, and practical scoring strategies.
- Avoid generic academic knowledge; focus strictly on what is frequently asked in government recruitment papers.
- Keep explanations brief, direct, structured with bullet points, and highly preparation-oriented.
- Do NOT mention external AI brands. Introduce yourself only as the OdishaExamPrep AI Model.`;

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...recentHistory.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: textToSend }
      ];

      // Map response mode to the optimized NVIDIA NIM model endpoints
      const modelName = responseMode === 'quick' 
        ? 'meta/llama-3.1-8b-instruct' 
        : 'meta/llama-3.3-70b-instruct';

      // Call local proxy endpoint to bypass CORS and protect API key
      const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          messages: apiMessages,
          temperature: 0.2,
          stream: true
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Connection issue (status ${response.status})`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let assistantResponse = "";

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
      if (error.name === 'AbortError') {
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
            const lastMsg = updated[updated.length - 1];
            updated[updated.length - 1] = {
              role: 'assistant',
              content: lastMsg.content 
                ? `${lastMsg.content}\n\n*(Generation stopped by student)*`
                : "*(Generation stopped by student)*"
            };
          }
          return updated;
        });
      } else {
        console.error(error);
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
            updated[updated.length - 1] = {
              role: 'assistant',
              content: "⚠️ Connection to study coach failed. Please check your internet connection and try again."
            };
          }
          return updated;
        });
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Pomodoro Timer Block Finish Handler
  const handleBlockFinish = () => {
    // Old synthetic audio beep removed to prevent playing dual sounds

    if (coachMode === 'ai' && activeBlockIndex >= 0 && activeBlockIndex < plannerBlocks.length) {
      setHasPlanStarted(true);
      localStorage.setItem('study_coach_has_plan_started', 'true');
      const finishedBlock = plannerBlocks[activeBlockIndex];
      const elapsedSeconds = timerMaxSeconds - timerSeconds;

      if (finishedBlock && finishedBlock.type !== 'break') {
        setCompletedStudyMinutes(m => {
          const addedMins = Math.floor(elapsedSeconds / 60);
          const updated = m + addedMins;
          localStorage.setItem('study_coach_completed_study_minutes', String(updated));
          return updated;
        });
      }

      // Mark current block completed and save actual study seconds
      const updated = plannerBlocks.map((b, idx) => 
        idx === activeBlockIndex 
          ? { ...b, status: 'completed', actuallyStudiedSeconds: b.type !== 'break' ? elapsedSeconds : 0 } 
          : b
      );
      
      const nextIndex = activeBlockIndex + 1;
      if (nextIndex < updated.length) {
        // Activate next block
        updated[nextIndex] = { ...updated[nextIndex], status: 'active' };
        setPlannerBlocks(updated);
        setActiveBlockIndex(nextIndex);
        
        const nextBlock = updated[nextIndex];
        setTimerMode(nextBlock.type === 'break' ? 'break' : 'study');
        setTimerSeconds(nextBlock.duration);
        setTimerMaxSeconds(nextBlock.duration);
        setTimerActive(true); // continue running automatically
        setPausedSeconds(0);
        
        toast(
          `⏰ Block completed! Starting: ${nextBlock.name}`,
          { icon: '🔔', duration: 6000 }
        );
      } else {
        // Plan completed
        setPlannerBlocks(updated);
        setActiveBlockIndex(-1);
        setTimerActive(false);
        setTimerSeconds(1500);
        setTimerMaxSeconds(1500);
        setTimerMode('study');
        setPausedSeconds(0);
        
        toast.success("🏆 Congratulations! You have completed your entire AI Study Plan!", {
          icon: '👑',
          duration: 10000
        });
      }
    } else {
      // Manual Pomodoro finish
      const nextMode = timerMode === 'study' ? 'break' : 'study';
      setTimerMode(nextMode);
      setTimerActive(false);
      
      if (timerMode === 'study') {
        setCompletedSessionsCount(c => {
          const updated = c + 1;
          localStorage.setItem('study_coach_completed_sessions', String(updated));
          return updated;
        });
      }

      toast(
        `⏰ Time's up! Your ${timerMode === 'study' ? 'study session' : 'break'} has ended.`,
        { icon: '🔔', duration: 6000 }
      );

      const nextMax = nextMode === 'study' ? timerMaxSeconds : breakMaxSeconds;
      setTimerSeconds(nextMax);
    }
  };

  // Pomodoro Timer Effect
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Ref to throttle localStorage writes — save timerSeconds every 10 ticks, not every tick
  const timerTickCountRef = useRef(0);
  // Ref mirror of timerSeconds for use inside interval without stale closure
  const timerSecondsRef = useRef(timerSeconds);
  useEffect(() => { timerSecondsRef.current = timerSeconds; }, [timerSeconds]);

  useEffect(() => {
    if (timerActive) {
      timerIntervalRef.current = setInterval(() => {
        // 1. Decrement remaining timer seconds
        setTimerSeconds(prev => (prev > 0 ? prev - 1 : 0));
        
        // 2. Accumulate study seconds if currently in study mode
        if (timerMode === 'study') {
          setStudySecondsAccumulator(prev => prev + 1);
        }

        // 3. Throttled localStorage write — only every 10 seconds to avoid main-thread blocking on every tick
        timerTickCountRef.current += 1;
        if (timerTickCountRef.current % 10 === 0) {
          localStorage.setItem('study_coach_timer_seconds', String(timerSecondsRef.current));
          localStorage.setItem('study_coach_timer_last_timestamp', String(Date.now()));
        }
        if (timerTickCountRef.current % 20 === 0) {
          setTimerSyncTrigger(prev => prev + 1);
        }
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      // Save accurate position when paused/stopped
      localStorage.setItem('study_coach_timer_seconds', String(timerSecondsRef.current));
      localStorage.setItem('study_coach_timer_last_timestamp', String(Date.now()));
      timerTickCountRef.current = 0;
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        // Save on cleanup (tab switch / unmount)
        localStorage.setItem('study_coach_timer_seconds', String(timerSecondsRef.current));
      }
    };
  }, [timerActive, timerMode]);

  // Handle studySecondsAccumulator rollover
  useEffect(() => {
    if (studySecondsAccumulator >= 60) {
      setCompletedStudyMinutes(m => {
        const nextMins = m + Math.floor(studySecondsAccumulator / 60);
        localStorage.setItem('study_coach_completed_study_minutes', String(nextMins));
        return nextMins;
      });
      setStudySecondsAccumulator(prev => prev % 60);
    }
  }, [studySecondsAccumulator]);

  // Handle block finish when timer reaches 0
  useEffect(() => {
    if (timerActive && timerSeconds === 0) {
      handleBlockFinish();
    }
  }, [timerSeconds, timerActive]);

  // Pause detection timer for AI Session Planner
  useEffect(() => {
    let pauseInterval: NodeJS.Timeout | null = null;
    if (coachMode === 'ai' && activeBlockIndex >= 0 && !timerActive && hasPlanStarted) {
      pauseInterval = setInterval(() => {
        setPausedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setPausedSeconds(0);
    }
    return () => {
      if (pauseInterval) clearInterval(pauseInterval);
    };
  }, [timerActive, coachMode, activeBlockIndex, hasPlanStarted]);

  const toggleTimer = () => {
    const nextState = !timerActive;
    setTimerActive(nextState);
    if (nextState) {
      setHasPlanStarted(true);
      localStorage.setItem('study_coach_has_plan_started', 'true');
    }
  };

  const resetTimer = () => {
    setTimerActive(false);
    if (coachMode === 'ai' && activeBlockIndex >= 0 && activeBlockIndex < plannerBlocks.length) {
      setTimerSeconds(plannerBlocks[activeBlockIndex].duration);
    } else {
      setTimerSeconds(timerMode === 'study' ? timerMaxSeconds : breakMaxSeconds);
    }
  };

  const changePreset = (minutes: number) => {
    if (timerActive) {
      toast.error("Pause the timer to change the study duration");
      return;
    }
    const secs = minutes * 60;
    setTimerMaxSeconds(secs);
    setTimerSeconds(secs);
    toast.success(`Study duration set to ${minutes} minutes`);
  };

  const handleNotifyCoachTimer = () => {
    const goalText = timerGoal.trim() ? `focusing on: "${timerGoal.trim()}"` : `focusing on my study plan`;
    const text = `I am starting a ${timerMaxSeconds / 60}-minute Pomodoro study session ${goalText}. Provide a quick 2-bullet-point strategy and one critical formula or historical fact about this topic to help me stay focused!`;
    handleSendMessage(text);
  };

  const handleAdjustActiveBreak = (mins: number) => {
    if (timerMode !== 'break') return;
    
    const secondsChange = mins * 60;
    setTimerSeconds(prev => Math.max(60, prev + secondsChange));
    setTimerMaxSeconds(prev => Math.max(60, prev + secondsChange));
    
    if (activeBlockIndex >= 0 && activeBlockIndex < plannerBlocks.length) {
      setPlannerBlocks(prev => {
        // Step 1: Update the duration of the active block
        const updated = prev.map((b, idx) => {
          if (idx === activeBlockIndex) {
            const newDuration = Math.max(60, b.duration + secondsChange);
            return {
              ...b,
              duration: newDuration
            };
          }
          return b;
        });

        // Step 2: Shift start/end times of the active block and all subsequent blocks
        for (let i = activeBlockIndex; i < updated.length; i++) {
          if (i === activeBlockIndex) {
            updated[i].endMins = updated[i].startMins + (updated[i].duration / 60);
          } else {
            updated[i].startMins = updated[i - 1].endMins;
            updated[i].endMins = updated[i].startMins + (updated[i].duration / 60);
          }
          updated[i].startTimeStr = minutesToTimeString(updated[i].startMins);
          updated[i].endTimeStr = minutesToTimeString(updated[i].endMins);
        }

        return updated;
      });
    }
    
    toast.success(mins > 0 ? `Break extended by ${mins} minutes` : `Break shortened by ${Math.abs(mins)} minutes`);
  };

  const handleAdaptSchedule = () => {
    const updated = adaptRemainingPlan(plannerBlocks, activeBlockIndex, plannerEnd, timerSeconds);
    setPlannerBlocks(updated);
    if (updated[activeBlockIndex]) {
      setTimerSeconds(updated[activeBlockIndex].duration);
      setTimerMaxSeconds(updated[activeBlockIndex].duration);
    }
    setPausedSeconds(0);
    toast.success("AI study plan recalculated and dynamically adapted!");
  };

  const handleGeneratePlan = async () => {
    if (!plannerStart || !plannerEnd) {
      toast.error("Please specify both start and end times.");
      return;
    }
    
    setCoachLoading(true);
    setCoachStrategy("");
    
    const blocks = generateStudyPlan(
      plannerStart,
      plannerEnd,
      plannerGoal,
      plannerEnergy,
      {
        chapters: plannerChapters,
        questions: plannerQuestions,
        targetHours: plannerHours
      }
    );
    
    if (blocks.length === 0) {
      toast.error("Invalid time window. End time must be after start time!");
      setCoachLoading(false);
      return;
    }
    
    blocks[0].status = 'active';
    
    setCompletedStudyMinutes(0);
    setStudySecondsAccumulator(0);
    localStorage.setItem('study_coach_completed_study_minutes', '0');
    
    setPlannerBlocks(blocks);
    setActiveBlockIndex(0);
    setTimerMode(blocks[0].type === 'break' ? 'break' : 'study');
    setTimerSeconds(blocks[0].duration);
    setTimerMaxSeconds(blocks[0].duration);
    setTimerActive(false);
    setPausedSeconds(0);
    setHasPlanStarted(false);
    localStorage.setItem('study_coach_has_plan_started', 'false');
    
    try {
      const extraDetails = [];
      if (plannerChapters.trim()) extraDetails.push(`chapters: "${plannerChapters.trim()}"`);
      if (plannerQuestions.trim()) extraDetails.push(`questions: "${plannerQuestions.trim()}"`);
      if (plannerHours.trim()) extraDetails.push(`target hours: "${plannerHours.trim()}"`);
      const extraDetailsStr = extraDetails.length > 0 ? `, targeting ${extraDetails.join(' and ')}` : '';

      const prompt = `Student is starting an AI-planned study session from ${plannerStart} to ${plannerEnd} for the goal "${plannerGoal}" with a "${plannerEnergy}" energy level${extraDetailsStr}. 
The plan has ${blocks.filter(b => b.type !== 'break').length} study blocks and ${blocks.filter(b => b.type === 'break').length} breaks.
As their expert AI Study Coach, write a personalized, highly encouraging, and brief 2-sentence coaching roadmap/strategy to stay motivated and avoid burnout. Focus purely on the study strategy, timing, motivation, and energy management. Do NOT mention the name of any exam (such as "${targetExam}" or similar) anywhere in your response. Keep it under 240 characters. Avoid pleasantries.`;

      const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          messages: [
            { role: 'system', content: `You are the expert Website Study Coach. Be direct, coaching-focused, and write under 240 characters. Focus purely on study strategy and do NOT mention the name of any exam under any circumstances.` },
            { role: 'user', content: prompt }
          ],
          temperature: 0.4,
          stream: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content || "";
        setCoachStrategy(content.trim());
      } else {
        setCoachStrategy(`Focus on executing the plan: ${blocks.filter(b => b.type !== 'break').length} study blocks mapped out for maximum absorption. Pace yourself!`);
      }
    } catch (err) {
      setCoachStrategy(`Ready to begin! Let's crush this ${plannerGoal} session and keep your energy high.`);
    } finally {
      setCoachLoading(false);
    }
  };

  // MCQ Quiz Generator function
  const triggerCustomQuiz = async (subject: string, difficulty: string, customSize = quizSize) => {
    setQuizLoading(true);
    setQuizSubmitted(false);
    setSelectedAnswers({});
    setActiveQuiz([]);

    const examTarget = quizTargetExam.trim() || targetExam;

    try {
      const prompt = `Generate exactly ${customSize} multiple choice questions (MCQs) in the actual style and standard of the "${examTarget}" examination.
Subject/Topic: "${subject}"
Difficulty: "${difficulty}" (match the strict exam standard of ${examTarget} for this difficulty level)
Make sure the questions test specific syllabus concepts, avoid generic trivia, and match official recruitment formats. Ensure the questions, options, and explanations are written in clear, professional English.`;
      
      const explanationInstruction = quizMode === 'quick'
        ? "Exactly 1 very brief sentence explaining the correct answer. Keep it highly concise for fast response time."
        : "A high-quality, step-by-step detailed explanation of the correct answer, explaining why it is correct and why other options are incorrect.";

      const systemPrompt = `You are a professional quiz generator for OdishaExamPrep. Generate exactly ${customSize} multiple choice questions optimized for "${examTarget}".
For ALL mathematical formulas, equations, expressions, variables, and scientific symbols in the question, options, or explanation, format them using standard LaTeX syntax wrapped in single dollar signs for inline math (e.g. $f(x) = \\frac{x^2+1}{x+1}$, $x = -1$, $f(-1)$) or double dollar signs for centered display block formulas (e.g. $$\\int f(x)dx$$). Do not output raw text notation like x^2 + 1 or f(x) = (x^2+1)/(x+1).
You must return ONLY a JSON object with a single key "questions" containing the array of questions.

JSON structure:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "correctOption": 0,
      "explanation": "${explanationInstruction}"
    }
  ]
}

Note: "correctOption" must be an integer index (0 for Option A, 1 for Option B, 2 for Option C, 3 for Option D). Do not include any comments (like // or /*) inside your JSON output.`;

      const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: quizMode === 'quick' ? 'meta/llama-3.1-8b-instruct' : 'meta/llama-3.3-70b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          stream: false,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate quiz");
      }

      const data = await response.json();
      const rawText = data.choices[0]?.message?.content || "";
      const parsed = robustParseJSON(rawText);
      const questions = (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
        ? (parsed.questions || [])
        : (Array.isArray(parsed) ? parsed : []);
      
      if (Array.isArray(questions) && questions.length > 0) {
        setActiveQuiz(questions);
      } else {
        throw new Error("Invalid quiz format returned");
      }
    } catch (error) {
      console.error(error);
      toast.error("Oops! We encountered an error generating the quiz. Please try again.");
    } finally {
      setQuizLoading(false);
    }
  };

  const handlePracticeFormula = (title: string, context: string) => {
    const prompt = `Give me a practical, exam-oriented practice question to solve that tests my understanding of "${title}" (${context}) in the standard of the "${targetExam}" exam. Show me the question first, then explain the step-by-step solution.`;
    handleSendMessage(prompt);
  };

  const handleTriggerQuizFromSyllabus = (topicName: string) => {
    setQuizSubject(topicName);
    setQuizDifficulty('Medium');
    triggerCustomQuiz(topicName, 'Medium');
  };


  const toggleBookmark = (q: any) => {
    // Compute new state synchronously from current snapshot — do NOT put toast inside setState updater
    // because React StrictMode calls updater functions TWICE (to detect side effects), causing 2 toasts.
    const exists = bookmarkedQuestions.some(bq => bq.question === q.question);
    let updated;
    let message: string;
    if (exists) {
      updated = bookmarkedQuestions.filter(bq => bq.question !== q.question);
      message = 'Question removed from bookmarks';
    } else {
      const newBookmark = {
        ...q,
        id: Math.random().toString(36).substr(2, 9),
        subject: quizSubject,
        bookmarkedAt: new Date().toLocaleDateString()
      };
      updated = [...bookmarkedQuestions, newBookmark];
      message = 'Question saved to bookmarks!';
    }
    localStorage.setItem('study_coach_bookmarks', JSON.stringify(updated));
    setBookmarkedQuestions(updated);
    toast.success(message);
  };


  const saveQuizScore = (score: number, total: number) => {
    const newRecord = {
      date: new Date().toLocaleDateString(),
      subject: quizSubject,
      score,
      total,
      difficulty: quizDifficulty
    };
    setQuizHistory(prev => {
      const updated = [newRecord, ...prev].slice(0, 10);
      localStorage.setItem('study_coach_quiz_history', JSON.stringify(updated));
      return updated;
    });

    if (user?.id) {
      activityTracker.logActivity(user.id, {
        type: 'practice_test_completed',
        title: `AI Quiz: ${quizSubject} (${quizDifficulty})`,
        score,
        totalMarks: total,
        accuracy: total > 0 ? Math.round((score / total) * 100) : 0,
        correct: score,
        incorrect: total - score,
      });
    }

    toast.success(`Quiz completed! Score: ${score}/${total}`, { icon: '🏆' });
  };

  const clearQuizHistory = () => {
    setQuizHistory([]);
    localStorage.removeItem('study_coach_quiz_history');
    toast.success("Quiz history cleared");
  };

  const handleToggleSyllabusStatus = (collectionId: string, topicId: string) => {
    // Determine the next status first, then update state and show toast once.
    // Putting toast inside setState updater causes double-fire in React StrictMode.
    const statusLabels: Record<string, string> = {
      not_started: 'Not Started ⚪',
      in_progress: 'In Progress 🟡',
      completed: 'Completed 🟢'
    };
    let toastMessage = '';
    setCollections(prev => {
      const updated = prev.map(c => {
        if (c.id === collectionId) {
          const updatedTopics = c.topics.map(t => {
            if (t.id === topicId) {
              let nextStatus: 'not_started' | 'in_progress' | 'completed' = 'not_started';
              if (t.status === 'not_started') nextStatus = 'in_progress';
              else if (t.status === 'in_progress') nextStatus = 'completed';
              toastMessage = `Progress: ${statusLabels[nextStatus]}`;
              return { ...t, status: nextStatus };
            }
            return t;
          });
          return { ...c, topics: updatedTopics };
        }
        return c;
      });
      return updated;
    });
    // Toast is called here — outside the updater — so StrictMode cannot double-fire it.
    if (toastMessage) toast.success(toastMessage);
  };


  const handleCreateCollection = (name: string) => {
    if (!name.trim()) return;
    const newColl: SyllabusCollection = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      topics: []
    };
    setCollections(prev => [...prev, newColl]);
    setActiveCollectionId(newColl.id);
    setNewCollectionName('');
    setShowAddCollection(false);
    toast.success(`Created collection: "${name}"`);
  };

  const handleRenameCollection = (id: string, newName: string) => {
    if (!newName.trim()) return;
    setCollections(prev => prev.map(c => c.id === id ? { ...c, name: newName.trim() } : c));
    setEditingCollectionId(null);
    setEditingCollectionName('');
    toast.success("Collection renamed");
  };

  const handleDeleteCollection = (id: string) => {
    setConfirmDialog({
      title: "Delete Collection",
      message: "Are you sure you want to delete this collection and all its topics? This action cannot be undone.",
      confirmText: "Delete Collection",
      variant: "danger",
      onConfirm: () => {
        setCollections(prev => {
          const filtered = prev.filter(c => c.id !== id);
          if (activeCollectionId === id) {
            setActiveCollectionId(filtered.length > 0 ? filtered[0].id : null);
          }
          return filtered;
        });
        toast.success("Collection deleted");
      }
    });
  };

  const handleCreateTopic = (collectionId: string, name: string, desc: string) => {
    if (!name.trim()) return;
    const newTopic: SyllabusTopic = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      desc: desc.trim(),
      status: 'not_started'
    };
    setCollections(prev => prev.map(c => {
      if (c.id === collectionId) {
        return { ...c, topics: [...c.topics, newTopic] };
      }
      return c;
    }));
    setNewTopicName('');
    setNewTopicDesc('');
    setShowAddTopic(false);
    toast.success(`Added topic: "${name}"`);
  };

  const handleEditTopic = (collectionId: string, topicId: string, name: string, desc: string) => {
    if (!name.trim()) return;
    setCollections(prev => prev.map(c => {
      if (c.id === collectionId) {
        const updatedTopics = c.topics.map(t => 
          t.id === topicId ? { ...t, name: name.trim(), desc: desc.trim() } : t
        );
        return { ...c, topics: updatedTopics };
      }
      return c;
    }));
    setEditingTopicId(null);
    setEditingTopicName('');
    setEditingTopicDesc('');
    toast.success("Topic updated");
  };

  const handleDeleteTopic = (collectionId: string, topicId: string) => {
    setConfirmDialog({
      title: "Delete Topic",
      message: "Are you sure you want to delete this topic from your syllabus workspace?",
      confirmText: "Delete Topic",
      variant: "danger",
      onConfirm: () => {
        setCollections(prev => prev.map(c => {
          if (c.id === collectionId) {
            return { ...c, topics: c.topics.filter(t => t.id !== topicId) };
          }
          return c;
        }));
        toast.success("Topic deleted");
      }
    });
  };

  const handleMoveCollection = (id: string, direction: 'up' | 'down') => {
    setCollections(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx === -1) return prev;
      const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const updated = [...prev];
      const temp = updated[idx];
      updated[idx] = updated[nextIdx];
      updated[nextIdx] = temp;
      return updated;
    });
  };

  const handleMoveTopic = (collectionId: string, topicId: string, direction: 'up' | 'down') => {
    setCollections(prev => prev.map(c => {
      if (c.id === collectionId) {
        const idx = c.topics.findIndex(t => t.id === topicId);
        if (idx === -1) return c;
        const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (nextIdx < 0 || nextIdx >= c.topics.length) return c;
        const updatedTopics = [...c.topics];
        const temp = updatedTopics[idx];
        updatedTopics[idx] = updatedTopics[nextIdx];
        updatedTopics[nextIdx] = temp;
        return { ...c, topics: updatedTopics };
      }
      return c;
    }));
  };

  const handleGenerateAIEnhancedSyllabus = async (examName: string) => {
    if (!examName.trim()) {
      toast.error("Please enter a subject or exam name first!");
      return;
    }
    
    setAiGeneratingSyllabus(true);
    
    try {
      const prompt = `Generate a structured, standard exam syllabus of key topics for "${examName}" under the official syllabus context of the "${targetExam}" examination.
Generate exactly 4 to 6 key study topics/chapters that match actual exam patterns. Ensure all text is written in clear, professional English.`;

      const systemPrompt = `You are a professional syllabus compiler for OdishaExamPrep. You must return ONLY a JSON object with a single key "topics" containing the array of syllabus topics optimized for "${targetExam}".

JSON structure:
{
  "topics": [
    {
      "name": "Topic/Chapter Title",
      "desc": "Subtopics or key areas to cover (comma-separated, concise, max 100 characters)"
    }
  ]
}`;

      const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          stream: false,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        throw new Error("Failed to compile syllabus");
      }

      const data = await response.json();
      const rawText = data.choices[0]?.message?.content || "";
      const parsed = robustParseJSON(rawText);
      const topics = (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
        ? (parsed.topics || [])
        : (Array.isArray(parsed) ? parsed : []);
      if (Array.isArray(topics) && topics.length > 0) {
        const newTopics: SyllabusTopic[] = topics.map((t: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          name: t.name || "Untitled Topic",
          desc: t.desc || "",
          status: 'not_started'
        }));

        const newCollection: SyllabusCollection = {
          id: Math.random().toString(36).substr(2, 9),
          name: examName.trim(),
          topics: newTopics
        };

        setCollections(prev => [...prev, newCollection]);
        setActiveCollectionId(newCollection.id);
        setAiSubjectInput('');
        toast.success("AI generated your personalized syllabus successfully!");
      } else {
        throw new Error("Invalid format");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate AI syllabus. Please create manually or try again.");
    } finally {
      setAiGeneratingSyllabus(false);
    }
  };

  const handleCopyShortcut = (card: any) => {
    const textToCopy = `${card.title} - Formula: ${card.formula} | Shortcut: ${card.shortcut}`;
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        toast.success("Copied to clipboard!");
      })
      .catch(() => {
        toast.error("Failed to copy");
      });
  };

  const toggleFlashcardReveal = (cardTitle: string) => {
    setRevealedFlashcards(prev => ({
      ...prev,
      [cardTitle]: !prev[cardTitle]
    }));
  };

  const handleCreateFormulaCategory = (name: string) => {
    if (!name.trim()) return;
    const newCat = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      cards: []
    };
    setFormulaCategories(prev => [...prev, newCat]);
    setActiveFormulaCatId(newCat.id);
    setNewFormulaCategoryName('');
    setShowAddFormulaCategory(false);
    toast.success("Category created successfully!");
  };

  const handleRenameFormulaCategory = (id: string, newName: string) => {
    if (!newName.trim()) return;
    setFormulaCategories(prev => prev.map(c => c.id === id ? { ...c, name: newName.trim() } : c));
    setEditingFormulaCatId(null);
    toast.success("Category renamed successfully!");
  };

  const handleDeleteFormulaCategory = (id: string) => {
    const category = formulaCategories.find(c => c.id === id);
    if (!category) return;

    setConfirmDialog({
      title: "Delete Category",
      message: `Are you sure you want to delete the category "${category.name}" and all its formulas? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "danger",
      onConfirm: () => {
        setFormulaCategories(prev => prev.filter(c => c.id !== id));
        if (activeFormulaCatId === id) {
          setActiveFormulaCatId(null);
        }
        toast.success("Category deleted.");
      }
    });
  };

  const handleMoveFormulaCategory = (id: string, direction: 'up' | 'down') => {
    const index = formulaCategories.findIndex(c => c.id === id);
    if (index === -1) return;
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= formulaCategories.length) return;

    const list = [...formulaCategories];
    const temp = list[index];
    list[index] = list[nextIndex];
    list[nextIndex] = temp;
    setFormulaCategories(list);
  };

  const handleCreateFormula = () => {
    if (!activeFormulaCatId) {
      toast.error("Please select or create a category first");
      return;
    }
    if (!newFormulaTitle.trim() || !newFormulaVal.trim()) {
      toast.error("Title and Formula are required");
      return;
    }

    const newCard = {
      id: Math.random().toString(36).substr(2, 9),
      title: newFormulaTitle.trim(),
      formula: newFormulaVal.trim(),
      shortcut: newFormulaShortcut.trim(),
      example: newFormulaExample.trim()
    };

    setFormulaCategories(prev => prev.map(cat => {
      if (cat.id === activeFormulaCatId) {
        return {
          ...cat,
          cards: [...cat.cards, newCard]
        };
      }
      return cat;
    }));

    setNewFormulaTitle('');
    setNewFormulaVal('');
    setNewFormulaShortcut('');
    setNewFormulaExample('');
    setShowAddFormula(false);
    toast.success("Formula added successfully!");
  };

  const handleGenerateFormulaWithAI = async () => {
    if (!aiFormulaPromptText.trim()) {
      toast.error("Please describe what formula you want to generate!");
      return;
    }

    setAiGeneratingFormula(true);
    setAiGeneratedFormula(null);

    try {
      const prompt = `Given a user request: "${aiFormulaPromptText.trim()}", generate a shortcut formula card.
You must categorize it under a single broad subject/category name (e.g., "Math", "Polity", "Odia", "History", "Geography", "English", "Reasoning" etc. Keep it to one or two words, and capitalize it appropriately).
For mathematical, physical, or scientific formulas, write the "formula" using standard LaTeX notation (e.g. using backslashes like \\\\frac{a}{b}, x^2, \\\\sqrt{y}, \\\\partial, \\\\dot, \\\\int, etc.) so it displays as a high-fidelity equation.
Return ONLY a valid JSON object matching the requested structure below, with no markdown fences, no explanations, and no text outside the JSON object.

JSON structure:
{
  "category": "Broad Category Name (e.g. Math)",
  "title": "Factual Title or Topic (e.g. Euler-Lagrange Equation)",
  "formula": "The core formula, article or spelling rule (e.g. \\\\frac{d}{dt}\\\\left(\\\\frac{\\\\partial L}{\\\\partial \\\\dot{q}}\\\\right) - \\\\frac{\\\\partial L}{\\\\partial q} = 0)",
  "shortcut": "A helpful trick, shortcut or mnemonic (e.g. S1 + S2 for opposite directions)",
  "example": "A concrete example showing application (e.g. Minimizes the action integral...)"
}`;

      const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          messages: [
            { role: 'system', content: `You are an expert tutor for OdishaExamPrep. You extract formulas and shortcuts and output only valid, raw JSON matching the exact requested format.` },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          stream: false,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate formula");
      }

      const data = await response.json();
      const rawText = data.choices[0]?.message?.content || "";
      const parsed = robustParseJSON(rawText);
      if (parsed.category && parsed.title && parsed.formula) {
        setAiGeneratedFormula({
          category: parsed.category.trim(),
          title: parsed.title.trim(),
          formula: parsed.formula.trim(),
          shortcut: parsed.shortcut ? parsed.shortcut.trim() : "",
          example: parsed.example ? parsed.example.trim() : ""
        });
      } else {
        throw new Error("Invalid fields generated");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate formula. Please try again or type another prompt.");
    } finally {
      setAiGeneratingFormula(false);
    }
  };

  const handleConfirmAndAddFormula = (generated: {
    category: string;
    title: string;
    formula: string;
    shortcut: string;
    example: string;
  }) => {
    const existingCat = formulaCategories.find(
      c => c.name.toLowerCase() === generated.category.toLowerCase()
    );

    let targetCatId = '';

    setFormulaCategories(prev => {
      let updatedCategories = [...prev];

      if (existingCat) {
        targetCatId = existingCat.id;
        updatedCategories = updatedCategories.map(cat => {
          if (cat.id === targetCatId) {
            return {
              ...cat,
              cards: [
                ...cat.cards,
                {
                  id: Math.random().toString(36).substr(2, 9),
                  title: generated.title,
                  formula: generated.formula,
                  shortcut: generated.shortcut,
                  example: generated.example
                }
              ]
            };
          }
          return cat;
        });
      } else {
        const newCatId = Math.random().toString(36).substr(2, 9);
        targetCatId = newCatId;
        updatedCategories.push({
          id: newCatId,
          name: generated.category.trim(),
          cards: [
            {
              id: Math.random().toString(36).substr(2, 9),
              title: generated.title,
              formula: generated.formula,
              shortcut: generated.shortcut,
              example: generated.example
            }
          ]
        });
      }

      return updatedCategories;
    });

    setTimeout(() => {
      setActiveFormulaCatId(targetCatId);
    }, 50);

    setAiGeneratedFormula(null);
    setAiFormulaPromptText('');
    setShowAiFormulaPrompt(false);
    toast.success(`Formula added to category "${generated.category}" successfully!`);
  };

  const handleEditFormula = (categoryId: string, cardId: string) => {
    if (!editingFormulaTitle.trim() || !editingFormulaVal.trim()) {
      toast.error("Title and Formula are required");
      return;
    }

    setFormulaCategories(prev => prev.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          cards: cat.cards.map(card => {
            if (card.id === cardId) {
              return {
                ...card,
                title: editingFormulaTitle.trim(),
                formula: editingFormulaVal.trim(),
                shortcut: editingFormulaShortcut.trim(),
                example: editingFormulaExample.trim()
              };
            }
            return card;
          })
        };
      }
      return cat;
    }));

    setEditingFormulaKey(null);
    setEditingFormulaIndex(null);
    toast.success("Formula updated successfully!");
  };

  const handleDeleteFormula = (categoryId: string, cardId: string) => {
    setConfirmDialog({
      title: "Delete Formula Card",
      message: "Are you sure you want to delete this formula card? This action cannot be undone.",
      confirmText: "Delete",
      variant: "danger",
      onConfirm: () => {
        setFormulaCategories(prev => prev.map(cat => {
          if (cat.id === categoryId) {
            return {
              ...cat,
              cards: cat.cards.filter(card => card.id !== cardId)
            };
          }
          return cat;
        }));
        toast.success("Formula card deleted.");
      }
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const renderDailyFocusBoard = () => {
    const dailyTargetMins = 120;
    const currentMins = completedStudyMinutes;
    const progressPercent = Math.min(100, Math.round((currentMins / dailyTargetMins) * 100));
    
    let statusMessage = "Start your first Pomodoro to kickstart your daily streak!";
    if (progressPercent > 0 && progressPercent < 50) {
      statusMessage = "Good start! You are on your way to building focus discipline.";
    } else if (progressPercent >= 50 && progressPercent < 100) {
      statusMessage = "Over halfway there! Keep going to hit your daily focus target.";
    } else if (progressPercent >= 100) {
      statusMessage = "Daily focus target achieved! Outstanding dedication today.";
    }

    const currentTip = ODISHA_STUDY_TIPS[currentTipIdx];
    const TipIcon = currentTip.icon;

    return (
      <div className="bg-gradient-to-b from-slate-50 to-white/70 border border-slate-200/50 rounded-2xl p-3.5 sm:p-4 mt-2.5 text-left space-y-3 sm:space-y-3.5 flex-1 flex flex-col justify-between relative overflow-hidden shadow-xs hover:shadow-sm transition-all duration-300 animate-scale-in">
        <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
        
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs sm:text-[10px] font-bold text-slate-500">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] sm:text-[10px]">
              <Timer className="w-3.5 h-3.5 text-[#8A1C36]" /> Focus Target Progress
            </span>
            <span className="font-mono text-[#8A1C36] text-xs sm:text-[11px] bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-lg font-bold">
              {currentMins} / {dailyTargetMins} min
            </span>
          </div>

          <div className="w-full bg-slate-50 rounded-full h-2 overflow-hidden border border-slate-200/50 p-0.5">
            <motion.div 
              className="bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          
          <p className="text-[10.5px] sm:text-[9.5px] text-slate-500 italic pl-0.5 leading-tight font-medium">
            {statusMessage}
          </p>
        </div>

        <div className="border-t border-slate-200/50 w-full my-0.5" />

        <div className="space-y-2.5 sm:space-y-2 text-left relative flex-1 flex flex-col justify-between">
          <div className="flex justify-between items-center shrink-0">
            <span className="inline-flex px-2 py-0.5 rounded text-[10px] sm:text-[8px] font-black uppercase tracking-wider bg-indigo-500/15 border border-indigo-500/20 text-indigo-650">
              {currentTip.category}
            </span>
            <button
              type="button"
              onClick={() => {
                setCurrentTipIdx((prev) => (prev + 1) % ODISHA_STUDY_TIPS.length);
              }}
              className="p-1.5 sm:p-1 border border-slate-200/50 bg-slate-50 hover:bg-slate-900 text-slate-500 hover:text-white rounded-lg transition-all duration-300 cursor-pointer flex items-center justify-center shadow-xs"
              title="Next Strategy"
            >
              <ChevronRight className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>
          
          <div className="flex gap-3 bg-white/80 border border-slate-200/40 p-3 rounded-xl flex-1 items-center shadow-2xs hover:shadow-xs transition-all duration-300">
            <div className="p-2.5 sm:p-2 bg-indigo-500/10 border border-indigo-500/15 rounded-xl text-indigo-650 shrink-0">
              <TipIcon className="w-5.5 h-5.5 sm:w-5 sm:h-5" />
            </div>
            <p className="text-xs sm:text-[11px] text-slate-700 leading-relaxed font-semibold">
              {currentTip.tip}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderAiFocusProgressBoard = () => {
    const isPlanActive = plannerBlocks.length > 0;
    
    let currentMins = completedStudyMinutes;
    let targetMins = 120;
    let progressPercent = 0;
    let titleText = "AI Focus Target Progress";
    let statusMessage = "";

    if (isPlanActive) {
      const completedBlocksCount = plannerBlocks.filter(b => b.status === 'completed' && b.type !== 'break').length;
      const totalBlocksCount = plannerBlocks.filter(b => b.type !== 'break').length;

      const completedStudySecs = plannerBlocks
        .filter(b => b.status === 'completed' && b.type !== 'break')
        .reduce((acc, b) => acc + (b.actuallyStudiedSeconds || 0), 0);

      const activeBlock = plannerBlocks[activeBlockIndex];
      const activeStudySecs = (activeBlock && activeBlock.status === 'active' && activeBlock.type !== 'break')
        ? (activeBlock.duration - timerSeconds)
        : 0;

      const totalStudySecs = plannerBlocks
        .filter(b => b.type !== 'break')
        .reduce((acc, b) => acc + b.duration, 0);

      const actualStudyMins = Math.floor((completedStudySecs + activeStudySecs) / 60);
      const totalStudyMins = Math.round(totalStudySecs / 60);

      currentMins = actualStudyMins;
      targetMins = totalStudyMins;
      progressPercent = targetMins > 0 ? Math.min(100, Math.round((currentMins / targetMins) * 100)) : 0;
      titleText = "AI Plan Progress";

      if (progressPercent === 0) {
        statusMessage = "Ready to start your AI study plan. Click Start Focus below!";
      } else if (progressPercent > 0 && progressPercent < 100) {
        statusMessage = `AI Plan execution underway. ${completedBlocksCount} of ${totalBlocksCount} study sessions done.`;
      } else if (progressPercent >= 100) {
        statusMessage = "Outstanding! You have completed 100% of your AI Study Plan today.";
      }
    } else {
      let dailyTargetMins = 120;
      if (plannerStart && plannerEnd) {
        const previewBlocks = generateStudyPlan(
          plannerStart,
          plannerEnd,
          plannerGoal,
          plannerEnergy,
          {
            chapters: plannerChapters,
            questions: plannerQuestions,
            targetHours: plannerHours
          }
        );
        const totalStudySecs = previewBlocks
          .filter(b => b.type !== 'break')
          .reduce((acc, b) => acc + b.duration, 0);
        if (totalStudySecs > 0) {
          dailyTargetMins = Math.round(totalStudySecs / 60);
        }
      }
      
      currentMins = completedStudyMinutes;
      targetMins = dailyTargetMins;
      progressPercent = targetMins > 0 ? Math.min(100, Math.round((currentMins / dailyTargetMins) * 100)) : 0;
      
      if (progressPercent === 0) {
        statusMessage = "Set your start/end times above and click Generate AI Study Plan!";
      } else if (progressPercent > 0 && progressPercent < 50) {
        statusMessage = "Good start! Keep going with your AI schedule to build focus discipline.";
      } else if (progressPercent >= 50 && progressPercent < 100) {
        statusMessage = "Excellent momentum! You are over halfway to your daily focus target.";
      } else if (progressPercent >= 100) {
        statusMessage = "Target reached! Outstanding dedication to your AI Study Coach sessions today.";
      }
    }

    const currentInsight = AI_COACH_INSIGHTS[currentTipIdx % AI_COACH_INSIGHTS.length];
    const InsightIcon = currentInsight.icon;

    return (
      <div className="bg-gradient-to-b from-indigo-50/50 to-white/70 border border-indigo-100/40 rounded-2xl p-3.5 sm:p-4 mt-2.5 text-left space-y-3 sm:space-y-3.5 flex-1 flex flex-col justify-between relative overflow-hidden shadow-xs hover:shadow-sm transition-all duration-300 animate-scale-in">
        <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
        
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs sm:text-[10px] font-bold text-slate-500">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] sm:text-[10px]">
              <Sparkles className="w-3.5 h-3.5 text-indigo-650 animate-pulse" /> {titleText}
            </span>
            <span className="font-mono text-indigo-650 text-xs sm:text-[11px] bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-lg font-bold">
              {currentMins} / {targetMins} min
            </span>
          </div>

          <div className="w-full bg-slate-50 rounded-full h-2 overflow-hidden border border-slate-200/50 p-0.5">
            <motion.div 
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          
          <p className="text-[10.5px] sm:text-[9.5px] text-slate-500 italic pl-0.5 leading-tight font-medium">
            {statusMessage}
          </p>
        </div>

        <div className="border-t border-slate-200/50 w-full my-0.5" />

        <div className="space-y-2.5 sm:space-y-2 text-left relative flex-1 flex flex-col justify-between">
          <div className="flex justify-between items-center shrink-0">
            <span className="inline-flex px-2 py-0.5 rounded text-[10px] sm:text-[8px] font-black uppercase tracking-wider bg-indigo-500/15 border border-indigo-500/20 text-indigo-650">
              {currentInsight.category}
            </span>
            <button
              type="button"
              onClick={() => {
                setCurrentTipIdx((prev) => (prev + 1) % AI_COACH_INSIGHTS.length);
              }}
              className="p-1.5 sm:p-1 border border-slate-200/50 bg-slate-50 hover:bg-slate-900 text-slate-500 hover:text-white rounded-lg transition-all duration-300 cursor-pointer flex items-center justify-center shadow-xs"
              title="Next Strategy"
            >
              <ChevronRight className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>
          
          <div className="flex gap-3 bg-white/80 border border-indigo-500/10 p-3 rounded-xl flex-1 items-center shadow-2xs hover:shadow-xs transition-all duration-300">
            <div className="p-2.5 sm:p-2 bg-indigo-500/10 border border-indigo-500/15 rounded-xl text-indigo-650 shrink-0">
              <InsightIcon className="w-5.5 h-5.5 sm:w-5 sm:h-5" />
            </div>
            <p className="text-xs sm:text-[11px] text-slate-700 leading-relaxed font-semibold">
              {currentInsight.tip}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderPracticeAnalyticsHUD = () => {
    return (
      <div className="bg-slate-50   border border-slate-200/50 rounded-2xl p-4 mt-4 text-left space-y-3 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-teal-500/5 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          <Cpu className="w-3.5 h-3.5 text-brand-600" /> Practice Performance HUD
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 border border-slate-200/50 p-2 rounded-xl flex flex-col justify-center relative hover:border-teal-500/10 transition-all">
            <span className="text-[10px] font-black text-[#8A1C36] mb-0.5 flex justify-center">
              <Trophy className="w-3.5 h-3.5" />
            </span>
            <span className="text-sm font-black text-slate-800 font-mono leading-none block">
              {practiceStats.totalCompleted}
            </span>
            <span className="text-[7.5px] font-bold uppercase tracking-widest text-slate-500 mt-1 block">
              Attempts
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/50 p-2 rounded-xl flex flex-col justify-center relative hover:border-teal-500/10 transition-all">
            <span className="text-[10px] font-black text-emerald-650 mb-0.5 flex justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
            <span className="text-sm font-black text-slate-800 font-mono leading-none block">
              {practiceStats.avgAccuracy}%
            </span>
            <span className="text-[7.5px] font-bold uppercase tracking-widest text-slate-500 mt-1 block">
              Avg Accuracy
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/50 p-2 rounded-xl flex flex-col justify-center relative hover:border-teal-500/10 transition-all">
            <span className="text-[10px] font-black text-amber-650 mb-0.5 flex justify-center">
              <Zap className="w-3.5 h-3.5" />
            </span>
            <span className="text-sm font-black text-slate-800 font-mono leading-none block">
              {practiceStats.streak} {practiceStats.streak === 1 ? 'Day' : 'Days'}
            </span>
            <span className="text-[7.5px] font-bold uppercase tracking-widest text-slate-500 mt-1 block">
              Streak
            </span>
          </div>
        </div>

        <p className="text-[9px] text-slate-500 text-center leading-normal font-semibold">
          {practiceStats.totalCompleted === 0 
            ? "Configure a subject above and start practicing to unlock analytics!" 
            : practiceStats.avgAccuracy >= 70 
              ? "🎯 Excellent accuracy! You are fully prepared for competitive OPSC/OSSC standards." 
              : "💡 Tip: Review explanation cards carefully after quiz submittal to boost accuracy."
          }
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-10">


      {/* Premium Custom Confirmation Dialog */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 bg-slate-50   z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white border border-slate-200/60 rounded-[2rem] max-w-sm w-full p-6 shadow-2xl space-y-6 text-left relative overflow-hidden "
            >
              <div className="absolute -top-10 -right-10 w-20 h-20 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
              
              <div className="space-y-2">
                <h4 className="font-serif font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-amber-650" />
                  {confirmDialog.title}
                </h4>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 border border-slate-200/60 hover:border-slate-800/85 bg-white hover:bg-slate-900 text-slate-700 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer active:translate-y-0.5 shadow-xs hover:shadow-sm"
                >
                  {confirmDialog.cancelText || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer active:translate-y-0.5 shadow-lg",
                    confirmDialog.variant === 'danger'
                      ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white shadow-red-500/10"
                      : confirmDialog.variant === 'success'
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-emerald-500/10"
                        : "bg-teal-500 hover:bg-emerald-400 text-slate-900 shadow-teal-500/10"
                  )}
                >
                  {confirmDialog.confirmText || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Header and Chip */}
      <div className="flex flex-col items-center text-center space-y-2 md:space-y-4 mb-2 md:mb-4">
        <span className="section-chip text-[10px] md:text-xs">
          <Sparkles className="w-3 md:w-3.5 h-3 md:h-3.5 animate-pulse text-[#8A1C36]" />
          Smart Study Suite
        </span>
        <h2 className="text-2xl md:text-5xl font-serif font-extrabold text-slate-900 tracking-tight">
          Personal Study <span className="premium-text-gradient font-serif font-extrabold">Coach</span>
        </h2>
        <div className="section-divider" />
        <p className="text-slate-500 text-xs md:text-base sm:text-lg font-medium max-w-xl mx-auto leading-relaxed px-4 md:px-0">
          Ask questions, get core summaries, clear doubts, or schedule revision sessions directly with your personal tutor.
        </p>
      </div>

      {/* Mobile-only View Selector Tab (only visible on mobile lg:hidden) */}
      <div className="lg:hidden flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/50 shadow-inner overflow-hidden max-w-[280px] sm:max-w-xs mx-auto mb-4 relative z-20">
        <button
          type="button"
          onClick={() => setMobileTab('chat')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer relative",
            mobileTab === 'chat' ? "text-[#8A1C36]" : "text-slate-500 hover:text-slate-800"
          )}
        >
          {mobileTab === 'chat' && (
            <motion.div
              layoutId="mobileViewActiveTabBg"
              className="absolute inset-0 bg-white border border-slate-200/60 rounded-lg shadow-md z-0"
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>AI Chat</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('tools')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer relative",
            mobileTab === 'tools' ? "text-indigo-650" : "text-slate-500 hover:text-slate-800"
          )}
        >
          {mobileTab === 'tools' && (
            <motion.div
              layoutId="mobileViewActiveTabBg"
              className="absolute inset-0 bg-white border border-slate-200/60 rounded-lg shadow-md z-0"
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Study Tools</span>
          </span>
        </button>
      </div>

      {/* Main Dual-pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Pane: Chat Interface */}
        <div id="chat-pane" className={cn(
          "lg:col-span-7 bg-white text-slate-700 border border-slate-200/60 rounded-[2rem] overflow-hidden shadow-2xl flex-col h-[600px] lg:h-[720px] relative",
          mobileTab === 'chat' ? "flex" : "hidden lg:flex"
        )}>
          {/* Declaring dark color-scheme on the dark chat console to enable dark-themed scrollbars and select default popups */}
          <div style={{ colorScheme: 'light' }} className="absolute inset-0 flex flex-col">
            
            {/* Header Control Panel */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200/60 bg-slate-50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 z-10">
              {/* Top Row on Mobile: Title and Mobile-only Clear Chat */}
              <div className="flex justify-between items-center w-full sm:w-auto gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">OdishaExamPrep AI</span>
                </div>

                {/* Clear Chat Button (Visible only on mobile top-row) */}
                <button 
                  onClick={() => {
                    setMessages([{ role: 'assistant', content: "Chat cleared! What shall we revise next?" }]);
                    setLoading(false);
                  }}
                  className="flex sm:hidden items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-brand-50 text-slate-600 hover:text-[#8A1C36] border border-slate-200/60 hover:border-brand-200/40 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                  title="Clear Chat History"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Clear</span>
                </button>
              </div>

              {/* Bottom Row on Mobile / Main Row Inline on Desktop */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Target Exam Custom Popover Selector (Full-width on mobile, auto on desktop) */}
                <div className="relative w-full sm:w-auto" ref={examDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsExamDropdownOpen(!isExamDropdownOpen)}
                    className="bg-white hover:bg-slate-100 hover:text-slate-800/90 border border-slate-200/60 hover:border-teal-500/30 text-brand-600 rounded-lg text-[9px] font-black uppercase tracking-wider py-1.5 pl-2.5 pr-7 focus:outline-none transition-all cursor-pointer flex items-center gap-1.5 w-full sm:min-w-[120px] justify-between shadow-md"
                  >
                    <div className="flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-brand-600" />
                      <span className="truncate max-w-[140px] sm:max-w-[80px]">
                        {targetExam || 'Select Exam'}
                      </span>
                    </div>
                    <ChevronDown className={cn("w-3 h-3 text-brand-600 transition-transform duration-300 absolute right-2.5 top-1/2 -translate-y-1/2", isExamDropdownOpen && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {isExamDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 sm:right-auto sm:left-0 mt-2 w-56 rounded-xl bg-white border border-slate-200/60 shadow-2xl p-1 z-50 overflow-hidden"
                      >
                        <div className="max-h-64 overflow-y-auto pr-0.5 no-scrollbar">
                          {userExams.length === 0 ? (
                            <div className="px-3 py-4 text-center text-[9px] text-slate-500 font-black uppercase tracking-wider">
                              No target exams. Add one below!
                            </div>
                          ) : (
                            userExams.map((exam) => {
                              const isActive = targetExam === exam;
                              return (
                                <div
                                  key={exam}
                                  className={cn(
                                    "group w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer",
                                    isActive
                                      ? "bg-teal-500/10 border-l-2 border-teal-500 text-brand-600 font-bold"
                                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                  )}
                                  onClick={() => {
                                    setTargetExam(exam);
                                    setIsExamDropdownOpen(false);
                                  }}
                                >
                                  <div className="flex items-center gap-2 truncate flex-1">
                                    <Target className={cn("w-3 h-3 shrink-0", isActive ? "text-brand-600" : "text-slate-600")} />
                                    <span className="truncate">{exam}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteExam(exam);
                                    }}
                                    className="opacity-70 md:opacity-0 md:group-hover:opacity-100 hover:opacity-100 hover:bg-rose-500/20 p-1 rounded transition-all text-slate-500 hover:text-[#8A1C36] cursor-pointer flex items-center justify-center shrink-0"
                                    title="Delete Target Exam"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })
                          )}
                          
                          <div className="border-t border-slate-200/50 mt-1.5 pt-2 px-1.5">
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleAddNewExam();
                              }}
                              className="flex items-center gap-1.5"
                            >
                              <input
                                type="text"
                                value={newExamName}
                                onChange={(e) => setNewExamName(e.target.value)}
                                placeholder="Add exam (e.g. UPSC)..."
                                className="w-full bg-slate-50 border border-slate-200/60 focus:border-teal-500/50 rounded-lg px-2 py-1 text-[9px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500/30 transition-all font-semibold uppercase tracking-wider placeholder:text-slate-400"
                              />
                              <button
                                type="submit"
                                className="px-2.5 py-1 bg-[#8A1C36] hover:bg-[#76142c] text-white font-black text-[9px] uppercase tracking-wider rounded-lg transition-all shrink-0 cursor-pointer shadow-md shadow-teal-500/10"
                              >
                                Add
                              </button>
                            </form>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Clear Chat Button (Visible only on desktop sm+) */}
                <button 
                  onClick={() => {
                    setMessages([{ role: 'assistant', content: "Chat cleared! What shall we revise next?" }]);
                    setLoading(false);
                  }}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-brand-50 text-slate-600 hover:text-[#8A1C36] border border-slate-200/60 hover:border-brand-200/40 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                  title="Clear Chat History"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Clear Chat</span>
                  <span className="xs:hidden">Clear</span>
                </button>
              </div>
            </div>

            <div ref={chatConsoleRef} className="flex-1 overflow-y-auto p-3.5 md:p-6 space-y-3.5 md:space-y-4 no-scrollbar smooth-scroll-gpu">
              {messages.map((m, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "flex flex-col max-w-[90%] sm:max-w-[85%] rounded-2xl p-3 md:p-4 text-[13px] md:text-sm font-medium leading-relaxed shadow-md animate-fade-up",
                    m.role === 'user' 
                      ? "bg-brand-500 text-white self-end rounded-tr-none" 
                      : "bg-slate-50 border border-slate-200/60 text-slate-800 self-start rounded-tl-none"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-between gap-1.5 mb-1 text-[10px] font-black uppercase tracking-widest",
                    m.role === 'user' ? "text-brand-200" : "text-slate-500"
                  )}>
                    <span>{m.role === 'user' ? 'Student' : 'OdishaExamPrep AI'}</span>
                    {m.role === 'assistant' && m.mode && (
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1",
                        m.mode === 'quick' 
                          ? "bg-amber-500/10 text-amber-500" 
                          : "bg-indigo-500/10 text-indigo-650"
                      )}>
                        {m.mode === 'quick' ? <Zap className="w-2.5 h-2.5" /> : <Sparkles className="w-2.5 h-2.5 animate-pulse" />}
                        {m.mode === 'quick' ? 'Quick Result' : 'Best Result'}
                      </span>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap font-sans">
                    {m.content ? <MarkdownMathRenderer text={m.content} isUser={m.role === 'user'} /> : (
                      <span className="inline-flex gap-2 items-center text-xs font-semibold text-slate-500">
                        <span className="text-[10px] text-brand-600/80 font-black tracking-wider uppercase animate-pulse">OdishaExamPrep AI is responding</span>
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Premium Chat Input Console ── */}
            <div className="relative shrink-0">
              {/* Top shimmer border */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

              <div className="px-3 sm:px-4 pt-3 pb-3 sm:pb-4 bg-slate-50 border-t border-slate-200/60">
                <form
                  onSubmit={(e) => { e.preventDefault(); if (input.trim()) handleSendMessage(input); }}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5"
                >
                  {/* Segmented pill — shrink-0 so it doesn't compress, width auto on desktop */}
                  <div className="relative flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/50 shadow-inner overflow-hidden shrink-0 w-full sm:w-auto">
                    {/* Gliding active background */}
                    <div
                      className={cn(
                        "absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-[10px] shadow-lg transition-all duration-300 ease-in-out",
                        responseMode === 'quick'
                          ? "left-0.5 bg-gradient-to-r from-brand-600 to-brand-500"
                          : "left-[50%] bg-gradient-to-r from-indigo-600 to-violet-600"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setResponseMode('quick')}
                      className={cn(
                        "relative z-10 flex-1 sm:flex-initial flex items-center justify-center gap-1 py-1.5 px-3 rounded-[10px] text-[10px] font-black uppercase tracking-widest transition-colors duration-200 cursor-pointer min-w-[70px]",
                        responseMode === 'quick' ? "text-white" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      <Zap className={cn(
                        "w-3 h-3 shrink-0 transition-all duration-300",
                        responseMode === 'quick' ? "text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]" : ""
                      )} />
                      <span>Quick</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setResponseMode('best')}
                      className={cn(
                        "relative z-10 flex-1 sm:flex-initial flex items-center justify-center gap-1 py-1.5 px-3 rounded-[10px] text-[10px] font-black uppercase tracking-widest transition-colors duration-200 cursor-pointer min-w-[70px]",
                        responseMode === 'best' ? "text-white" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      <Sparkles className={cn(
                        "w-3 h-3 shrink-0 transition-all duration-300",
                        responseMode === 'best' ? "text-violet-300 drop-shadow-[0_0_6px_rgba(196,181,253,0.9)]" : ""
                      )} />
                      <span>Best</span>
                    </button>
                  </div>

                  {/* Input Wrapper and Send Button Row */}
                  <div className="flex items-center gap-2 flex-1">
                    {/* Glowing Input Wrapper */}
                    <div className={cn(
                      "relative flex-1 group transition-all duration-300",
                      loading && "opacity-70"
                    )}>
                      {/* Ambient glow on focus */}
                      <div className={cn(
                        "absolute -inset-px rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm pointer-events-none",
                        responseMode === 'quick'
                          ? "bg-gradient-to-r from-brand-500/40 to-brand-600/20"
                          : "bg-gradient-to-r from-indigo-500/40 to-violet-600/20"
                      )} />
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about Odisha history, GS, math, grammar…"
                        disabled={loading}
                        className={cn(
                          "relative w-full bg-white border rounded-xl pl-3.5 pr-10 sm:pl-4 sm:pr-12 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none transition-all duration-300 font-semibold shadow-inner",
                          "border-slate-200/60 focus:border-slate-300/80",
                          loading && "cursor-not-allowed"
                        )}
                      />
                      {/* Character count hint when typing */}
                      {input.length > 0 && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-600 font-mono pointer-events-none"
                        >
                          {input.length}
                        </motion.span>
                      )}
                    </div>

                    {/* Send / Stop Button */}
                    {loading ? (
                      <motion.button
                        type="button"
                        onClick={handleCancelGeneration}
                        whileTap={{ scale: 0.92 }}
                        className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-lg shadow-amber-900/30 transition-colors duration-200 shrink-0 cursor-pointer overflow-hidden group"
                        title="Stop Generation"
                      >
                        <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                        <Square className="w-3.5 h-3.5 fill-white text-white" />
                      </motion.button>
                    ) : (
                      <motion.button
                        type="submit"
                        disabled={!input.trim()}
                        whileTap={{ scale: 0.9 }}
                        className={cn(
                          "relative flex items-center justify-center w-10 h-10 rounded-xl text-white shadow-lg transition-all duration-300 shrink-0 overflow-hidden group cursor-pointer",
                          input.trim()
                            ? responseMode === 'quick'
                              ? "bg-gradient-to-br from-brand-500 to-brand-700 shadow-brand-900/40 hover:shadow-brand-500/30 hover:scale-105"
                              : "bg-gradient-to-br from-indigo-500 to-violet-700 shadow-indigo-900/40 hover:shadow-indigo-500/30 hover:scale-105"
                            : "bg-slate-800/80 opacity-40 cursor-not-allowed"
                        )}
                        title="Send Message"
                      >
                        {/* Lighten overlay on hover */}
                        <span className="absolute inset-0 bg-white/15 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                        <Send className="w-4 h-4 relative z-10" strokeWidth={2.5} />
                      </motion.button>
                    )}
                  </div>
                </form>
              </div>
            </div>

          </div>
        </div>

        {/* Right Pane: Interactive Study Suite */}
        <div className={cn(
          "lg:col-span-5 bg-white text-slate-600 border border-slate-200/60 rounded-[2rem] overflow-hidden shadow-2xl flex-col h-auto lg:h-[720px] relative",
          mobileTab === 'tools' ? "flex" : "hidden lg:flex"
        )}>
          
          {/* Ambient Glows */}
          <div className={cn(
            "absolute -top-10 -right-10 w-24 h-24 rounded-full blur-xl pointer-events-none transition-all duration-500",
            activeRightTab === 'planner'
              ? (coachMode === 'ai' ? "bg-indigo-500/10" : "bg-rose-500/5")
              : "bg-rose-500/5"
          )} />
          <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-teal-500/5 rounded-full blur-xl pointer-events-none" />

          {/* Glassmorphic Tab Bar */}
          <div className="flex border-b border-slate-200/60 bg-slate-50   p-1.5 px-4 gap-1 shrink-0 z-10">
            {[
              { id: 'planner', label: 'Planner', icon: Calendar, color: 'text-indigo-650' },
              { id: 'quiz', label: 'Practice', icon: HelpCircle, color: 'text-[#8A1C36]' },
              { id: 'syllabus', label: 'Syllabus', icon: BookOpen, color: 'text-amber-650' },
              { id: 'formulas', label: 'Formulas', icon: Award, color: 'text-brand-600' }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeRightTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveRightTab(tab.id as any)}
                  className={cn(
                    "flex-1 flex flex-row items-center justify-center gap-1 py-2 px-1 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer relative",
                    isActive 
                      ? tab.color 
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  )}
                >
                  {/* Sliding Active Background */}
                  {isActive && (
                    <motion.div
                      layoutId="activeStudyTabBg"
                      className="absolute inset-0 bg-slate-100 border border-slate-200/60 rounded-xl shadow-lg z-0"
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    />
                  )}

                  {/* Icon and label wrapper to render on top of sliding background */}
                  <span className="relative z-10 flex flex-row items-center justify-center gap-1">
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </span>

                  {tab.id === 'planner' && timerActive && (
                    <span className="absolute top-1 right-1 flex h-1.5 w-1.5 z-20">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Scrollable content pane */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 pb-6 sm:p-3.5 sm:pb-8 no-scrollbar relative z-10 flex flex-col smooth-scroll-gpu" style={{ contain: 'layout paint' }}>
            <AnimatePresence mode="wait">
              {activeRightTab === 'planner' && (
                <motion.div
                  key="planner"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-2.5 sm:space-y-3 text-left flex-1 flex flex-col min-h-full"
                >
            <div className={cn(
              "absolute -top-10 -right-10 w-24 h-24 rounded-full blur-xl pointer-events-none transition-all duration-500",
              coachMode === 'ai' ? "bg-indigo-500/15" : "bg-rose-500/10"
            )} />
            
            {/* Header Selector */}
            <div className="flex justify-between items-center border-b border-slate-200/50 pb-3">
              <div className="space-y-0.5 text-left">
                <span className={cn(
                  "inline-flex px-2 py-0.5 rounded text-[10px] sm:text-[9px] font-black uppercase tracking-wider",
                  coachMode === 'ai' 
                    ? "bg-indigo-500/15 border border-indigo-500/20 text-indigo-650" 
                    : "bg-rose-500/10 border border-rose-500/20 text-[#8A1C36]"
                )}>
                  {coachMode === 'ai' ? 'AI Session Planner' : 'Focus Station'}
                </span>
                <h4 className="font-serif font-extrabold text-slate-900 text-base flex items-center gap-1.5 mt-0.5">
                  {coachMode === 'ai' ? <Sparkles className="w-4.5 h-4.5 text-indigo-650 animate-pulse" /> : <Timer className="w-4.5 h-4.5 text-[#8A1C36]" />}
                  {coachMode === 'ai' ? 'AI Study Coach' : 'Study Timer (Pomodoro)'}
                </h4>
              </div>
              
              {/* Switcher Toggle */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50 shrink-0 relative overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    if (timerActive) {
                      toast.error("Pause the timer before changing modes");
                      return;
                    }
                    setCoachMode('manual');
                  }}
                  className={cn(
                    "px-3 py-1.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[9px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer relative",
                    coachMode === 'manual' ? "text-white" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {coachMode === 'manual' && (
                    <motion.div
                      layoutId="activeCoachModeBg"
                      className="absolute inset-0 bg-gradient-to-r from-[#8a1c36] to-[#b83a55] rounded-md z-0 shadow-sm"
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    />
                  )}
                  <span className="relative z-10">Manual</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (timerActive) {
                      toast.error("Pause the timer before changing modes");
                      return;
                    }
                    setCoachMode('ai');
                  }}
                  className={cn(
                    "px-3 py-1.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[9px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer flex items-center gap-1 relative",
                    coachMode === 'ai' ? "text-white" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {coachMode === 'ai' && (
                    <motion.div
                      layoutId="activeCoachModeBg"
                      className="absolute inset-0 bg-indigo-600 rounded-md z-0 shadow-sm"
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>AI Coach</span>
                  </span>
                </button>
              </div>
            </div>

            {coachMode === 'manual' ? (
              /* MANUAL POMODORO MODE */
              <div className="space-y-3 animate-scale-in flex-1 flex flex-col">
                {/* Completed session counter */}
                <div className="flex justify-between items-center bg-slate-50/50 sm:bg-white border border-slate-200/50 px-3 py-2 sm:px-3 sm:py-1.5 rounded-xl premium-shadow">
                  <span className="text-xs sm:text-[10px] font-bold text-slate-600 sm:text-slate-500">Completed Focus Sessions</span>
                  <div className="flex items-center gap-2 sm:gap-1.5 text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-full shadow-2xs">
                    <Trophy className="w-3.5 h-3.5 text-amber-600 animate-trophy-bounce shrink-0" />
                    <span>Done: {completedSessionsCount}</span>
                    {completedSessionsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCompletedSessionsCount(0);
                          setCompletedStudyMinutes(0);
                          localStorage.removeItem('study_coach_completed_sessions');
                          localStorage.removeItem('study_coach_completed_study_minutes');
                          toast.success("Sessions reset");
                        }}
                        className="p-1 sm:p-0 ml-1 text-amber-700 hover:text-amber-950 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                        title="Reset completed count"
                      >
                        <X className="w-2.5 h-2.5 stroke-[3.5px]" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Circular Timer & Controls */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-5 sm:gap-4 bg-gradient-to-b from-white to-slate-50/50 border border-slate-200/50 p-4 sm:p-3.5 rounded-2xl premium-shadow relative overflow-hidden">
                  {/* Subtle decorative background pattern */}
                  <div className="absolute inset-0 grid-bg-fine opacity-20 pointer-events-none" />
                  
                  <div className="relative flex items-center justify-center w-32 h-32 sm:w-28 sm:h-28 shrink-0 mx-auto sm:mx-0 lg:mx-auto bg-white/80 rounded-full border border-slate-200/40 p-1.5 shadow-inner relative z-10">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 112 112">
                      <defs>
                        <linearGradient id="studyTimerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#8a1c36" />
                          <stop offset="100%" stopColor="#b83a55" />
                        </linearGradient>
                        <linearGradient id="breakTimerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#059669" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        className="text-slate-100"
                        strokeWidth="5.5"
                        stroke="currentColor"
                        fill="transparent"
                      />
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        strokeWidth="5.5"
                        strokeDasharray="301.59"
                        strokeDashoffset={301.59 * (1 - (timerSeconds / (timerMode === 'study' ? timerMaxSeconds : breakMaxSeconds)))}
                        strokeLinecap="round"
                        stroke={timerMode === 'study' ? "url(#studyTimerGrad)" : "url(#breakTimerGrad)"}
                        fill="transparent"
                        className={cn("transition-all duration-300", timerActive && "animate-pulse-soft")}
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center w-full px-2 text-center">
                      <span className={cn(
                        "font-mono font-black text-slate-800 transition-all duration-200",
                        formatTime(timerSeconds).length > 5 
                          ? (formatTime(timerSeconds).length > 6 ? "text-[15px] sm:text-[14px] tracking-tighter" : "text-lg sm:text-base tracking-tight")
                          : "text-2xl sm:text-xl tracking-tight"
                      )}>
                        {formatTime(timerSeconds)}
                      </span>
                      <span className={cn(
                        "text-[9px] sm:text-[8px] font-black uppercase tracking-widest mt-0.5",
                        timerMode === 'study' ? "text-[#8a1c36]" : "text-emerald-600"
                      )}>
                        {timerMode === 'study' ? 'focus' : 'break'}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-2.5 sm:space-y-2 relative z-10">
                    <div className="flex items-center gap-2.5 sm:gap-2 w-full">
                      <button
                        type="button"
                        onClick={toggleTimer}
                        className={cn(
                          "flex-1 py-2.5 sm:py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 cursor-pointer active:scale-95 text-center text-white shadow-md premium-btn-transition",
                          timerActive 
                            ? "bg-gradient-to-r from-amber-600 to-amber-500 shadow-amber-600/20" 
                            : "bg-gradient-to-r from-[#8a1c36] to-[#b83a55] shadow-[#8a1c36]/20"
                        )}
                      >
                        {timerActive ? 'Pause' : 'Start'}
                      </button>
                      <button
                        type="button"
                        onClick={resetTimer}
                        className="p-3 sm:p-2 border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-xl transition-all duration-300 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 flex items-center justify-center shrink-0"
                        title="Reset Timer"
                      >
                        <RotateCcw className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        const newMode = timerMode === 'study' ? 'break' : 'study';
                        setTimerMode(newMode);
                        setTimerActive(false);
                        setTimerSeconds(newMode === 'study' ? timerMaxSeconds : breakMaxSeconds);
                      }}
                      className="w-full py-2 sm:py-1.5 border border-slate-200 bg-white/50 hover:bg-slate-100/80 text-[10px] sm:text-[9px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer text-center text-slate-600 hover:text-slate-900 hover:shadow-2xs active:scale-98"
                    >
                      Switch to {timerMode === 'study' ? 'Break' : 'Study'}
                    </button>
                  </div>
                </div>

                {/* Presets and Focus Target */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-3 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">
                      {timerMode === 'study' ? 'Study Presets' : 'Break Presets'}
                    </label>
                    <div className="grid grid-cols-4 gap-1.5 sm:gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 text-center relative overflow-hidden">
                      {timerMode === 'study' ? (
                        <>
                          {[25, 45, 60].map((mins) => {
                            const secs = mins * 60;
                            const isSelected = timerMaxSeconds === secs;
                            return (
                              <button
                                type="button"
                                key={mins}
                                disabled={timerActive}
                                onClick={() => {
                                  if (!timerActive) {
                                    setTimerMaxSeconds(secs);
                                    setTimerSeconds(secs);
                                    toast.success(`Study duration set to ${mins} minutes`);
                                  }
                                }}
                                className={cn(
                                  "py-2 sm:py-1 rounded-lg text-[10px] sm:text-[9px] font-black uppercase transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed relative",
                                  isSelected 
                                    ? "text-[#8a1c36] font-black" 
                                    : "text-slate-500 hover:text-slate-800"
                                )}
                              >
                                {isSelected && (
                                  <motion.div
                                    layoutId="activePresetBg"
                                    className="absolute inset-0 bg-white shadow-2xs border border-slate-200/40 rounded-lg z-0"
                                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                                  />
                                )}
                                <span className="relative z-10">{mins}m</span>
                              </button>
                            );
                          })}
                          
                          {![1500, 2700, 3600].includes(timerMaxSeconds) ? (
                            <div className="relative rounded-lg z-10 flex items-center justify-center h-full min-h-[28px] sm:min-h-[20px]">
                              <motion.div
                                layoutId="activePresetBg"
                                className="absolute inset-0 bg-white shadow-2xs border border-slate-200/40 rounded-lg z-0"
                                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                              />
                              <input
                                type="number"
                                disabled={timerActive}
                                value={timerMaxSeconds / 60}
                                onChange={(e) => {
                                  const val = Math.min(999, Math.max(1, parseInt(e.target.value) || 1));
                                  if (!timerActive) {
                                    setTimerMaxSeconds(val * 60);
                                    setTimerSeconds(val * 60);
                                  }
                                }}
                                className="w-full text-center bg-transparent text-[#8a1c36] font-black text-[10px] sm:text-[9px] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none relative z-10 p-0"
                                placeholder="Min"
                                min="1"
                                max="999"
                              />
                              <span className="text-[8px] sm:text-[7px] text-[#8a1c36]/60 font-bold pr-1 relative z-10 select-none">m</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={timerActive}
                              onClick={() => {
                                if (!timerActive) {
                                  setTimerMaxSeconds(1800);
                                  setTimerSeconds(1800);
                                }
                              }}
                              className="py-2 sm:py-1 rounded-lg text-[10px] sm:text-[9px] font-black uppercase transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-slate-500 hover:text-slate-800"
                            >
                              Custom
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          {[5, 10, 15].map((mins) => {
                            const secs = mins * 60;
                            const isSelected = breakMaxSeconds === secs;
                            return (
                              <button
                                type="button"
                                key={mins}
                                disabled={timerActive}
                                onClick={() => {
                                  if (!timerActive) {
                                    setBreakMaxSeconds(secs);
                                    setTimerSeconds(secs);
                                    toast.success(`Break duration set to ${mins} minutes`);
                                  }
                                }}
                                className={cn(
                                  "py-2 sm:py-1 rounded-lg text-[10px] sm:text-[9px] font-black uppercase transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed relative",
                                  isSelected 
                                    ? "text-emerald-700 font-black" 
                                    : "text-slate-500 hover:text-slate-800"
                                )}
                              >
                                {isSelected && (
                                  <motion.div
                                    layoutId="activePresetBg"
                                    className="absolute inset-0 bg-white shadow-2xs border border-slate-200/40 rounded-lg z-0"
                                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                                  />
                                )}
                                <span className="relative z-10">{mins}m</span>
                              </button>
                            );
                          })}
                          
                          {![300, 600, 900].includes(breakMaxSeconds) ? (
                            <div className="relative rounded-lg z-10 flex items-center justify-center h-full min-h-[28px] sm:min-h-[20px]">
                              <motion.div
                                layoutId="activePresetBg"
                                className="absolute inset-0 bg-white shadow-2xs border border-slate-200/40 rounded-lg z-0"
                                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                              />
                              <input
                                type="number"
                                disabled={timerActive}
                                value={breakMaxSeconds / 60}
                                onChange={(e) => {
                                  const val = Math.min(999, Math.max(1, parseInt(e.target.value) || 1));
                                  if (!timerActive) {
                                    setBreakMaxSeconds(val * 60);
                                    setTimerSeconds(val * 60);
                                  }
                                }}
                                className="w-full text-center bg-transparent text-emerald-700 font-black text-[10px] sm:text-[9px] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none relative z-10 p-0"
                                placeholder="Min"
                                min="1"
                                max="999"
                              />
                              <span className="text-[8px] sm:text-[7px] text-emerald-700/60 font-bold pr-1 relative z-10 select-none">m</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={timerActive}
                              onClick={() => {
                                if (!timerActive) {
                                  setBreakMaxSeconds(720);
                                  setTimerSeconds(720);
                                }
                              }}
                              className="py-2 sm:py-1 rounded-lg text-[10px] sm:text-[9px] font-black uppercase transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-slate-500 hover:text-slate-800"
                            >
                              Custom
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Session Target</label>
                    {timerActive ? (
                      <div className="bg-brand-50/30 border border-brand-100/50 px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-xl text-[11px] sm:text-[10px] font-extrabold text-[#8a1c36] flex items-center gap-2 truncate shadow-2xs">
                        <span className="w-1.5 h-1.5 bg-[#8a1c36] rounded-full animate-ping shrink-0" />
                        <span className="truncate">{timerGoal.trim() || "Deep Study Block"}</span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={timerGoal}
                        onChange={(e) => setTimerGoal(e.target.value)}
                        placeholder="Focus Target (e.g. History)"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 sm:px-2.5 sm:py-1 text-[11px] sm:text-[10px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8a1c36]/10 focus:border-[#8a1c36] transition-all duration-300 font-semibold shadow-2xs"
                      />
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNotifyCoachTimer}
                  className="w-full py-3 sm:py-2 bg-white hover:bg-slate-950 hover:text-white border border-slate-200 hover:border-slate-950 text-slate-700 rounded-xl text-[11px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md active:scale-98 group"
                >
                  <Sparkles className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#8a1c36] group-hover:text-brand-300 transition-colors animate-pulse" />
                  Notify Study Coach & Request Motivation
                </button>

                {/* Daily Focus Motivation & Coaching Board */}
                {renderDailyFocusBoard()}
              </div>
            ) : (
              /* AI STUDY COACH & PLANNED TIMER MODE */
              <div className="space-y-4 flex-1 flex flex-col">
                {activeBlockIndex === -1 ? (
                  /* AI PLAN GENERATOR FORM */
                  <div className="space-y-4 text-left animate-fade-up flex-1 flex flex-col">
                    {/* Times */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Study Start Time</label>
                        <TimePicker
                          value={plannerStart}
                          onChange={setPlannerStart}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Study End Time</label>
                        <TimePicker
                          value={plannerEnd}
                          onChange={setPlannerEnd}
                        />
                      </div>
                    </div>

                    {/* Goal Grid */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Primary Session Goal</label>
                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 sm:gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200/50">
                        {["Deep Study", "Revision", "Mock Test", "Practice Questions", "Mixed Session"].map(g => (
                          <button
                            type="button"
                            key={g}
                            onClick={() => setPlannerGoal(g)}
                            className={cn(
                              "px-2.5 py-1.5 sm:py-1 text-[10px] sm:text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer relative",
                              plannerGoal === g ? "text-white font-extrabold" : "text-slate-500 hover:text-slate-800",
                              g === "Mixed Session" && "col-span-2 sm:col-span-1"
                            )}
                          >
                            {plannerGoal === g && (
                              <motion.div
                                layoutId="activePlannerGoalBg"
                                className="absolute inset-0 bg-indigo-600 rounded-lg z-0 shadow-sm"
                                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                              />
                            )}
                            <span className="relative z-10">{g}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Energy Level */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Your Energy Level</label>
                      <div className="flex gap-1.5 sm:gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200/50">
                        {["Low", "Normal", "High"].map(e => (
                          <button
                            type="button"
                            key={e}
                            onClick={() => setPlannerEnergy(e)}
                            className={cn(
                              "flex-1 py-1.5 sm:py-1 text-[10px] sm:text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer relative",
                              plannerEnergy === e ? "text-white font-extrabold" : "text-slate-500 hover:text-slate-800"
                            )}
                          >
                            {plannerEnergy === e && (
                              <motion.div
                                layoutId="activePlannerEnergyBg"
                                className="absolute inset-0 bg-indigo-600 rounded-lg z-0 shadow-sm"
                                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                              />
                            )}
                            <span className="relative z-10 flex items-center justify-center gap-1">
                              {e === 'Low' ? '🔋 Low' : e === 'Normal' ? '🔋 Normal' : '🔋 High'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Advanced options toggle */}
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="w-full text-center text-[10px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-650 transition-colors flex items-center justify-center gap-1 cursor-pointer py-1"
                    >
                      <span>{showAdvanced ? 'Hide Advanced Plan Parameters' : 'Show Advanced Plan Parameters'}</span>
                      <ChevronDown className={cn("w-3 h-3 transition-transform 300", showAdvanced && "rotate-180")} />
                    </button>

                    {showAdvanced && (
                      <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/50 animate-fade-down">
                        <div className="space-y-1">
                          <label className="text-[9px] sm:text-[8px] font-black uppercase tracking-widest text-slate-500 px-1">Chapters</label>
                          <input
                            type="text"
                            value={plannerChapters}
                            onChange={(e) => setPlannerChapters(e.target.value)}
                            placeholder="e.g. Chapter 4"
                            className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-2.5 py-2 sm:px-2 sm:py-1.5 text-[11px] sm:text-[10px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all font-semibold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] sm:text-[8px] font-black uppercase tracking-widest text-slate-500 px-1">MCQ Count</label>
                          <input
                            type="text"
                            value={plannerQuestions}
                            onChange={(e) => setPlannerQuestions(e.target.value)}
                            placeholder="e.g. 30 MCQs"
                            className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-2.5 py-2 sm:px-2 sm:py-1.5 text-[11px] sm:text-[10px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all font-semibold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] sm:text-[8px] font-black uppercase tracking-widest text-slate-500 px-1">Target Hours</label>
                          <input
                            type="text"
                            value={plannerHours}
                            onChange={(e) => setPlannerHours(e.target.value)}
                            placeholder="e.g. 5 hours"
                            className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-2.5 py-2 sm:px-2 sm:py-1.5 text-[11px] sm:text-[10px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all font-semibold"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={coachLoading}
                      onClick={handleGeneratePlan}
                      className={cn(
                        "w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-indigo-600/20 active:translate-y-0.5 text-center flex items-center justify-center gap-2",
                        coachLoading && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      {coachLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Structuring Study blocks...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4.5 h-4.5 animate-pulse" />
                          <span>Generate AI Study Plan</span>
                        </>
                      )}
                    </button>

                    {/* Daily Focus Motivation & Coaching Board */}
                    {renderAiFocusProgressBoard()}
                  </div>
                ) : (
                  /* AI PLAN ACTIVE DASHBOARD */
                  <div className="space-y-4 animate-fade-up">
                    
                    {/* Top Bar Info Panel */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200/50 p-3.5 sm:p-3 rounded-2xl text-left">
                      <div className="space-y-0.5">
                        <span className="text-[9px] sm:text-[8px] font-black uppercase tracking-widest text-slate-500 block">Remaining Time</span>
                        <span className="text-xs sm:text-[11px] font-extrabold text-slate-800 block">
                          {Math.floor(remainingPlanMinutes / 60)}h {Math.round(remainingPlanMinutes % 60)}m
                        </span>
                      </div>
                      <div className="space-y-0.5 border-l border-slate-200/50 pl-2">
                        <span className="text-[9px] sm:text-[8px] font-black uppercase tracking-widest text-slate-500 block">Estimated Finish</span>
                        <span className="text-xs sm:text-[11px] font-extrabold text-slate-800 block flex items-center gap-1">
                          <Clock3 className="w-3.5 h-3.5 text-indigo-650 shrink-0" />
                          {minutesToTimeString(timeStringToMinutes(plannerEnd))}
                        </span>
                      </div>
                      <div className="space-y-0.5 border-l border-slate-200/50 pl-2 truncate">
                        <span className="text-[9px] sm:text-[8px] font-black uppercase tracking-widest text-slate-500 block">Focus Goal</span>
                        <span className="text-xs sm:text-[11px] font-extrabold text-indigo-650 block truncate">
                          {plannerGoal}
                        </span>
                      </div>
                    </div>

                    {/* AI Coaching Strategy Box */}
                    {coachStrategy && (
                      <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 sm:p-3.5 text-[11px] sm:text-[10px] text-indigo-800 font-semibold text-left leading-relaxed relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-lg pointer-events-none" />
                        <span className="font-black text-indigo-650 uppercase tracking-widest block mb-1 text-[9px] sm:text-[8px] flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-650" /> AI Coach Strategy
                        </span>
                        "{coachStrategy}"
                      </div>
                    )}

                    {/* Center Session Timer Widget */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-5 sm:gap-6 bg-gradient-to-b from-white to-slate-50/50 border border-slate-200/50 p-4.5 sm:p-5 rounded-2xl">
                      
                      {/* Progress ring svg */}
                      <div className="relative flex items-center justify-center w-32 h-32 sm:w-28 sm:h-28 shrink-0 mx-auto sm:mx-0 lg:mx-auto bg-white/80 rounded-full border border-slate-200/40 p-1.5 shadow-inner relative z-10">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 112 112">
                          <circle
                            cx="56"
                            cy="56"
                            r="48"
                            className="text-slate-100"
                            strokeWidth="5"
                            stroke="currentColor"
                            fill="transparent"
                          />
                          <circle
                            cx="56"
                            cy="56"
                            r="48"
                            className={cn(
                              "transition-all duration-300",
                              timerMode === 'break' ? "text-brand-600" : "text-indigo-650"
                            )}
                            strokeWidth="5"
                            strokeDasharray="301.59"
                            strokeDashoffset={301.59 * (1 - (timerSeconds / (timerMaxSeconds || 1)))}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                          />
                        </svg>
                        
                        <div className="absolute flex flex-col items-center justify-center text-center w-full px-2">
                          <span className={cn(
                            "font-mono font-black text-slate-800 transition-all duration-200",
                            formatTime(timerSeconds).length > 5
                              ? (formatTime(timerSeconds).length > 6 ? "text-[15px] sm:text-[14px] tracking-tighter" : "text-lg sm:text-base tracking-tight")
                              : "text-2xl sm:text-xl tracking-tight"
                          )}>
                            {formatTime(timerSeconds)}
                          </span>
                          <span className={cn(
                            "text-[9px] sm:text-[8px] font-black uppercase tracking-wider",
                            timerMode === 'break' ? "text-brand-600" : "text-indigo-650"
                          )}>
                            {timerMode === 'break' ? 'Break' : 'Focus'}
                          </span>
                        </div>
                      </div>

                      {/* Session Details & Action Buttons */}
                      <div className="flex-1 w-full text-left space-y-3.5">
                        <div className="pl-[3px]">
                          <span className="text-[9px] sm:text-[8px] font-black uppercase tracking-widest text-slate-500 block mb-0.5">Active Session</span>
                          <h5 className="text-base sm:text-sm font-extrabold text-slate-900 truncate">
                            {plannerBlocks[activeBlockIndex]?.name || "Focus Session"}
                          </h5>
                        </div>
                        
                        <div className="flex gap-2.5 sm:gap-2">
                          <button
                            type="button"
                            onClick={toggleTimer}
                            className={cn(
                              "flex-1 py-3 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 text-center text-white shadow-md",
                              timerActive 
                                ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/10" 
                                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10"
                            )}
                          >
                            {timerActive ? 'Pause' : 'Start Focus'}
                          </button>
                          
                          <button
                            type="button"
                            onClick={handleBlockFinish}
                            className="p-3 sm:p-2.5 border border-slate-200/60 hover:bg-slate-100 text-slate-700 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
                            title="Skip/Complete Block"
                          >
                            <ArrowRight className="w-4 h-4 text-slate-600" />
                          </button>
                        </div>

                        {/* Break Controls */}
                        {timerMode === 'break' && (
                          <div className="flex gap-2.5 sm:gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleAdjustActiveBreak(5)}
                              className="flex-1 py-2 sm:py-1 px-2 border border-teal-500/20 bg-teal-500/5 hover:bg-teal-500/10 text-brand-600 rounded-lg text-[10px] sm:text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                            >
                              Extend +5m
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustActiveBreak(-2)}
                              className="flex-1 py-2 sm:py-1 px-2 border border-teal-500/20 bg-teal-500/5 hover:bg-teal-500/10 text-brand-600 rounded-lg text-[10px] sm:text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                            >
                              Shorten -2m
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Paused warning Adapt block */}
                    {pausedSeconds > 15 && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 sm:p-3.5 text-left space-y-3 animate-pulse">
                        <div className="space-y-0.5">
                          <span className="text-[10px] sm:text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                            ⚠️ Session Idle Warning
                          </span>
                          <p className="text-[11px] sm:text-[10px] text-slate-700 font-semibold leading-relaxed">
                            You have been paused for {Math.floor(pausedSeconds / 60)}m {pausedSeconds % 60}s. Your remaining sessions will overflow past your target end time ({minutesToTimeString(timeStringToMinutes(plannerEnd))}).
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAdaptSchedule}
                          className="w-full py-2.5 sm:py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-[10px] sm:text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-center font-extrabold"
                        >
                          ⚡ Recalculate & Scale Sessions to finish by {minutesToTimeString(timeStringToMinutes(plannerEnd))}
                        </button>
                      </div>
                    )}

                    {/* Timeline RoadMap View */}
                    <div className="space-y-2 text-left">
                      <span className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Study Roadmap & Timeline</span>
                      <div 
                        ref={roadmapContainerRef}
                        className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 sm:p-4 max-h-[320px] overflow-y-auto no-scrollbar scroll-smooth relative smooth-scroll-gpu"
                      >
                        <div className="relative border-l border-slate-200/60 ml-2.5 pl-4 space-y-4 pr-1">
                          {plannerBlocks.map((b, idx) => {
                            const isCompleted = b.status === 'completed';
                            const isActive = idx === activeBlockIndex;
                            
                            return (
                              <div key={b.id} data-active={isActive} className="relative flex items-start justify-between text-xs sm:text-xs">
                                <div className={cn(
                                  "absolute -left-[22.5px] w-4.5 h-4.5 rounded-full flex items-center justify-center border text-[9px] font-black transition-all",
                                  isCompleted 
                                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-650" 
                                    : isActive 
                                      ? "bg-indigo-500/20 border-indigo-500 text-indigo-650 animate-pulse font-extrabold scale-110 shadow-sm" 
                                      : "bg-slate-100 border-slate-200/60 text-slate-500"
                                )}>
                                  {isCompleted ? <Check className="w-2.5 h-2.5 text-emerald-650" /> : idx + 1}
                                </div>
                                
                                <div className="space-y-0.5 pr-2 flex-1 min-w-0">
                                  <span className={cn(
                                    "font-bold block transition-colors truncate text-slate-700",
                                    isCompleted ? "text-slate-500 line-through" : isActive ? "text-indigo-650 font-extrabold" : ""
                                  )}>
                                    {b.name}
                                  </span>
                                  <span className="text-[10px] sm:text-[9px] text-slate-500 block">
                                    {b.startTimeStr} – {b.endTimeStr} ({Math.round(b.duration / 60)} mins)
                                  </span>
                                </div>

                                <span className={cn(
                                  "text-[9px] sm:text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0",
                                  isCompleted 
                                    ? "bg-emerald-500/10 text-emerald-650" 
                                    : isActive 
                                      ? "bg-indigo-500/10 text-indigo-650 animate-pulse" 
                                      : "bg-slate-100 text-slate-500"
                                )}>
                                  {isCompleted ? 'Done' : isActive ? 'Active' : 'Pending'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* AI Focus Target Progress */}
                    {renderAiFocusProgressBoard()}

                    {/* Discard plan button */}
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDialog({
                          title: "Discard AI Plan",
                          message: "Are you sure you want to discard your current AI Study Plan? Your timer and blocks will be reset.",
                          confirmText: "Discard Plan",
                          variant: "danger",
                          onConfirm: () => {
                            setActiveBlockIndex(-1);
                            setPlannerBlocks([]);
                            setTimerActive(false);
                            setTimerSeconds(1500);
                            setTimerMaxSeconds(1500);
                            setTimerMode('study');
                            setPausedSeconds(0);
                            setCoachStrategy('');
                            setHasPlanStarted(false);
                            localStorage.setItem('study_coach_has_plan_started', 'false');
                            toast.success("AI Study Plan discarded.");
                          }
                        });
                      }}
                      className="w-full py-2.5 sm:py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 rounded-xl text-[10px] sm:text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 mb-4"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Discard AI Plan & Reset
                    </button>

                  </div>
                )}
              </div>
            )}
                </motion.div>
              )}

              {activeRightTab === 'quiz' && (
                <motion.div
                  key="quiz"
                  id="quiz-pane"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5 text-left"
                >

            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <span className="inline-flex px-2.5 py-0.5 bg-teal-500/10 border border-teal-500/20 text-brand-600 rounded text-[10px] sm:text-[9px] font-black uppercase tracking-wider">
                  Self-Assessment
                </span>
                <h4 className="font-serif font-extrabold text-slate-800 text-base sm:text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-brand-600" />
                  Dynamic AI MCQ Quizzer
                </h4>
              </div>

              {/* Sub-view Toggle */}
              <div className="flex bg-slate-100 border border-slate-200/50 p-0.5 rounded-lg shrink-0 relative overflow-hidden">
                <button
                  onClick={() => setShowBookmarksOnly(false)}
                  className={cn(
                    "px-3 py-1.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[9px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer relative",
                    !showBookmarksOnly ? "text-white" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {!showBookmarksOnly && (
                    <motion.div
                      layoutId="activeQuizSubViewBg"
                      className="absolute inset-0 bg-[#8A1C36] rounded-md z-0 shadow-sm"
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    />
                  )}
                  <span className="relative z-10">Quiz</span>
                </button>
                <button
                  onClick={() => setShowBookmarksOnly(true)}
                  className={cn(
                    "px-3 py-1.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[9px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer flex items-center gap-1.5 group relative",
                    showBookmarksOnly ? "text-white" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {showBookmarksOnly && (
                    <motion.div
                      layoutId="activeQuizSubViewBg"
                      className="absolute inset-0 bg-[#8A1C36] rounded-md z-0 shadow-sm"
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Star className={cn(
                      "w-3 h-3 sm:w-2.5 sm:h-2.5 transition-all duration-300",
                      showBookmarksOnly ? "fill-white text-white" : "fill-none text-slate-500 group-hover:text-amber-650 group-hover:scale-110"
                    )} />
                    <span>Bookmarks ({bookmarkedQuestions.length})</span>
                  </span>
                </button>
              </div>
            </div>

            {/* Bookmarks view */}
            {showBookmarksOnly ? (
              <div className="space-y-4">
                {bookmarkedQuestions.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <Star className="w-8 h-8 text-slate-600 mx-auto stroke-[1.25] animate-pulse fill-none" />
                    <p className="text-slate-500 text-xs font-bold">No bookmarked questions yet.</p>
                    <p className="text-slate-500 text-[11px] sm:text-[10px] max-w-[200px] mx-auto leading-relaxed">Click the star button on any quiz question to save it here for quick revision.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookmarkedQuestions.map((bq) => (
                      <div key={bq.id} className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200/50 rounded-2xl space-y-3.5 sm:space-y-3 text-left relative">
                        <button
                          onClick={() => toggleBookmark(bq)}
                          className="absolute top-3.5 right-3.5 p-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-400 rounded-lg transition-all cursor-pointer"
                          title="Remove bookmark"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="space-y-1">
                          <span className="text-[10px] sm:text-[9px] font-black uppercase tracking-wider text-brand-600 bg-teal-500/5 px-2 py-0.5 rounded border border-teal-500/10">
                            {bq.subject}
                          </span>
                          <p className="text-xs sm:text-xs text-slate-500 font-bold block pt-1">Saved: {bq.bookmarkedAt}</p>
                        </div>
                        <h5 className="text-[13px] sm:text-xs font-bold text-slate-800 pr-8 leading-relaxed">
                          Q. <MathTextRenderer text={bq.question} />
                        </h5>
                        {(() => {
                          const question = bq;
                          console.log("QUESTION", question);
                          console.log("DIAGRAM", question.diagram);
                          console.log("TYPE", question.diagram?.type);
                          return null;
                        })()}
                        {bq.diagram ? (
                          <div className="mt-4 sm:mt-5 w-full block">
                            <DiagramRenderer diagram={bq.diagram} data={bq.diagram} />
                          </div>
                        ) : null}
                        <div className="space-y-1.5">
                          {bq.options.map((opt: string, oIdx: number) => (
                            <div 
                              key={oIdx} 
                              className={cn(
                                "p-2.5 sm:p-2 rounded-lg border text-xs sm:text-[11px] font-semibold leading-relaxed flex items-center justify-between",
                                bq.correctOption === oIdx 
                                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-650" 
                                  : "bg-slate-50 border-slate-200/50 text-slate-500"
                              )}
                            >
                              <span><MathTextRenderer text={opt} isOption /></span>
                              {bq.correctOption === oIdx && <CheckCircle2 className="w-3 h-3 text-emerald-650 shrink-0" />}
                            </div>
                          ))}
                        </div>
                        <div className="text-xs sm:text-[10px] text-slate-500 bg-slate-50 border border-slate-200/50 rounded-xl p-3 font-medium leading-relaxed">
                          <span className="font-bold text-brand-600 block mb-0.5 text-xs sm:text-[10px]">Explanation:</span>
                          <MathTextRenderer text={bq.explanation} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Quiz view
              <div className="space-y-4">
                {!activeQuiz.length && !quizLoading && (
                  <div className="space-y-4">
                    <div className="space-y-4">
                      {/* Subject Selector */}
                      <div className="space-y-2 text-left">
                        <label className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">
                          Subject / Topic
                        </label>
                        
                        <input
                          type="text"
                          value={quizSubject}
                          onChange={(e) => setQuizSubject(e.target.value)}
                          placeholder="Enter subject or topic (e.g., Odisha Rivers, Trigonometry)"
                          className="w-full bg-white border border-slate-200/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500/40 focus:border-teal-500/40 transition-all font-semibold"
                        />
 
                        {/* Popular Suggestion Chips */}
                        <div className="flex flex-wrap gap-1.5 pt-1 items-center">
                          {quizTabs.map((s) => (
                            <div
                              key={s}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-2 sm:py-0.5 border text-[9px] sm:text-[8px] font-black uppercase tracking-wider rounded-lg transition-all",
                                quizSubject.toLowerCase() === s.toLowerCase()
                                  ? "bg-teal-500/10 border-teal-500/35 text-brand-600 font-bold"
                                  : "bg-slate-50 border-slate-200/50 text-slate-500 hover:text-slate-700 hover:bg-slate-100 hover:text-slate-800"
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => setQuizSubject(s)}
                                className="cursor-pointer transition-colors focus:outline-none"
                              >
                                {s.replace(/\s*\(.*\)/, '').replace(/\s*&\s*/, ' & ')}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQuizTabs(prev => prev.filter(t => t !== s));
                                }}
                                className="text-slate-600 hover:text-red-400 font-black transition-colors pl-1 sm:pl-0.5 cursor-pointer text-xs sm:text-[10px] leading-none focus:outline-none"
                                title={`Delete ${s}`}
                              >
                                ×
                              </button>
                            </div>
                          ))}
 
                          {/* Add New Tab Inline Form */}
                          {isAddingQuizTab ? (
                            <form 
                              onSubmit={(e) => {
                                e.preventDefault();
                                if (newQuizTabName.trim()) {
                                  if (!quizTabs.some(t => t.toLowerCase() === newQuizTabName.trim().toLowerCase())) {
                                    setQuizTabs(prev => [...prev, newQuizTabName.trim()]);
                                  }
                                  setQuizSubject(newQuizTabName.trim());
                                  setNewQuizTabName('');
                                  setIsAddingQuizTab(false);
                                }
                              }}
                              className="flex items-center gap-1 inline-flex animate-fade-in"
                            >
                              <input
                                type="text"
                                value={newQuizTabName}
                                onChange={(e) => setNewQuizTabName(e.target.value)}
                                placeholder="New tab..."
                                className="bg-white border border-teal-500/30 rounded-lg px-2.5 py-1 sm:px-2 sm:py-0.5 text-[10px] sm:text-[9px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500/40 w-28 sm:w-24 font-bold"
                                autoFocus
                              />
                              <button 
                                type="submit" 
                                className="px-2 py-1 sm:px-1.5 sm:py-0.5 bg-[#8A1C36] hover:bg-[#76142c] text-white rounded text-[10px] sm:text-[9px] font-black cursor-pointer"
                              >
                                ✓
                              </button>
                              <button 
                                type="button" 
                                onClick={() => setIsAddingQuizTab(false)} 
                                className="px-2 py-1 sm:px-1.5 sm:py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-500 rounded text-[10px] sm:text-[9px] font-black cursor-pointer"
                              >
                                ✗
                              </button>
                            </form>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setIsAddingQuizTab(true)}
                              className="px-2.5 py-1 sm:px-2 sm:py-0.5 border border-dashed border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10 text-brand-600 text-[9px] sm:text-[8px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-0.5"
                            >
                              ➕ Add Tab
                            </button>
                          )}
                        </div>
                      </div>
 
                      {/* Difficulty and MCQ count row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1 text-left">
                          <label className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Difficulty</label>
                          <select
                            value={quizDifficulty}
                            onChange={(e) => setQuizDifficulty(e.target.value)}
                            className="w-full bg-white border border-slate-200/60 rounded-xl px-3 py-2.5 sm:px-2 sm:py-2 text-xs sm:text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all font-bold"
                          >
                            <option>Easy</option>
                            <option>Medium</option>
                            <option>Hard</option>
                          </select>
                        </div>
 
                        <div className="space-y-1 text-left">
                          <label className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">MCQ Count</label>
                          <select
                            value={quizSize}
                            onChange={(e) => setQuizSize(Number(e.target.value))}
                            className="w-full bg-white border border-slate-200/60 rounded-xl px-3 py-2.5 sm:px-2 sm:py-2 text-xs sm:text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all font-bold"
                          >
                            <option value={3}>3 Questions</option>
                            <option value={5}>5 Questions</option>
                            <option value={10}>10 Questions</option>
                          </select>
                        </div>
                      </div>
 
                      {/* Generation Mode Control */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Quiz Engine Mode</label>
                        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200/50 w-full relative overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setQuizMode('quick')}
                            className={cn(
                              "flex-1 py-2 sm:py-1.5 px-3 rounded-lg text-[10.5px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer relative",
                              quizMode === "quick" ? "text-white" : "text-slate-600 hover:text-slate-900"
                            )}
                          >
                            {quizMode === 'quick' && (
                              <motion.div
                                layoutId="activeQuizModeBg"
                                className="absolute inset-0 bg-[#8A1C36] rounded-lg z-0 shadow-sm"
                                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                              />
                            )}
                            <span className="relative z-10 flex items-center gap-1.5">
                              <Zap className="w-3 h-3 text-current" />
                              <span>Quick Result</span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuizMode('best')}
                            className={cn(
                              "flex-1 py-2 sm:py-1.5 px-3 rounded-lg text-[10.5px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer relative",
                              quizMode === 'best'
                                ? "text-white"
                                : "text-slate-500 hover:text-slate-800"
                            )}
                          >
                            {quizMode === 'best' && (
                              <motion.div
                                layoutId="activeQuizModeBg"
                                className="absolute inset-0 bg-indigo-650 rounded-lg z-0 shadow-sm"
                                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                              />
                            )}
                            <span className="relative z-10 flex items-center gap-1.5">
                              <Sparkles className="w-3 h-3 text-current" />
                              <span>Best Result</span>
                            </span>
                          </button>
                        </div>
                      </div>
 
                      {/* Targeted Exam (Optional) */}
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">
                          Target Exam <span className="text-slate-500 text-[9px] sm:text-[8px] font-semibold">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={quizTargetExam}
                          onChange={(e) => setQuizTargetExam(e.target.value)}
                          placeholder="e.g. OSSC CGL, OPSC OAS (defaults to global target)"
                          className="w-full bg-white border border-slate-200/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500/40 focus:border-teal-500/40 transition-all font-semibold"
                        />
                      </div>
                    </div>
 
                    <button
                      onClick={() => triggerCustomQuiz(quizSubject, quizDifficulty, quizSize)}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 sm:py-3.5 rounded-2xl premium-gradient text-white text-xs font-black uppercase tracking-widest hover:premium-glow transition-all duration-300 cursor-pointer shadow-lg shadow-brand-500/15 active:scale-98 hover:scale-[1.01]"
                    >
                      <Sparkles className="w-4 h-4 text-white animate-pulse" />
                      Generate AI Practice Quiz
                      <Play className="w-3.5 h-3.5 fill-white text-white" />
                    </button>
 
                    {/* Quiz History Scorecard */}
                    {quizHistory.length > 0 && (
                       <div className="border-t border-slate-200/50 pt-4 space-y-2 text-left">
                        <div className="flex justify-between items-center">
                          <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5 text-amber-500" />
                            Recent Attempts Scorecard
                          </h5>
                          <button
                            onClick={clearQuizHistory}
                            className="text-[10px] sm:text-[9px] font-black uppercase tracking-wider text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-2 max-h-[120px] overflow-y-auto no-scrollbar">
                          {quizHistory.map((rec, rIdx) => (
                            <div key={rIdx} className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 sm:p-2.5 flex justify-between items-center text-xs sm:text-[10px] font-semibold text-slate-700">
                              <div className="space-y-0.5 pr-2 truncate">
                                <span className="text-slate-800 font-extrabold truncate block">{rec.subject}</span>
                                <span className="text-[10px] sm:text-[9px] text-slate-500">{rec.date} • {rec.difficulty}</span>
                              </div>
                              <span className={cn(
                                "px-2.5 py-1.5 sm:py-1 rounded text-[11px] sm:text-[10px] font-black shrink-0",
                                (rec.score / rec.total) >= 0.7 ? "bg-emerald-500/10 text-emerald-650" : (rec.score / rec.total) >= 0.4 ? "bg-amber-500/10 text-amber-650" : "bg-red-500/10 text-red-400"
                              )}>
                                {rec.score} / {rec.total}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
 
                    {/* Practice Performance HUD */}
                    {renderPracticeAnalyticsHUD()}
                  </div>
                )}

                {/* Quiz loading state */}
                {quizLoading && (
                  <div className="py-8 flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 text-xs font-bold animate-pulse">
                      OdishaExamPrep AI Model generating {quizSize} custom questions ({quizMode === 'quick' ? 'Quick Result' : 'Best Result'})...
                    </p>
                  </div>
                )}

                {/* Quiz questions render */}
                {activeQuiz.length > 0 && (
                  <div className="space-y-5">
                    {activeQuiz.map((q, qIdx) => {
                      const isBookmarked = bookmarkedQuestions.some(bq => bq.question === q.question);
                      return (
                        <div key={qIdx} className="space-y-3 border-b border-slate-200/50 pb-4 last:border-0 last:pb-0 text-left relative">
                          <div className="flex justify-between items-start gap-4">
                            <h5 className="text-[15px] sm:text-sm font-bold text-slate-800 leading-relaxed pr-8">
                              Q{qIdx + 1}. <MathTextRenderer text={q.question} />
                            </h5>
                            <button
                              onClick={() => toggleBookmark(q)}
                              className={cn(
                                "w-8.5 h-8.5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer shrink-0 group",
                                isBookmarked 
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-650 shadow-md shadow-amber-500/5" 
                                  : "bg-slate-50 border-slate-200/50 text-slate-500 hover:border-amber-500/20 hover:bg-amber-500/5 hover:text-amber-650"
                              )}
                              title={isBookmarked ? "Bookmarked!" : "Bookmark question"}
                            >
                              <Star className={cn(
                                "w-4.5 h-4.5 sm:w-3.5 sm:h-3.5 transition-all duration-300",
                                isBookmarked 
                                  ? "fill-amber-400 text-amber-650 scale-110 drop-shadow-[0_0_4px_rgba(245,158,11,0.4)]" 
                                  : "fill-none text-slate-500 group-hover:text-amber-300 group-hover:scale-110"
                              )} />
                            </button>
                          </div>
                          {(() => {
                            const question = q;
                            console.log("QUESTION", question);
                            console.log("DIAGRAM", question.diagram);
                            console.log("TYPE", question.diagram?.type);
                            return null;
                          })()}
                          {q.diagram ? (
                            <div className="mt-4 sm:mt-5 w-full block">
                              <DiagramRenderer diagram={q.diagram} data={q.diagram} />
                            </div>
                          ) : null}
                          <div className="grid grid-cols-1 gap-2">
                            {q.options.map((opt: string, optIdx: number) => {
                              const isSelected = selectedAnswers[qIdx] === optIdx;
                              const isCorrect = q.correctOption === optIdx;
                              
                              let optionStyle = "bg-slate-50 border-slate-200/50 hover:border-slate-300/60 text-slate-700";
                              if (isSelected) {
                                optionStyle = "bg-[#8A1C36] border-[#8A1C36] text-white shadow-md shadow-brand-500/10 ring-1 ring-brand-500/30";
                              }
                              if (quizSubmitted) {
                                  if (isCorrect) {
                                    optionStyle = "bg-emerald-500/10 border-emerald-500/50 text-emerald-650 font-bold ring-1 ring-emerald-500/20";
                                  } else if (isSelected) {
                                    optionStyle = "bg-red-500/10 border-red-500/50 text-red-400 ring-1 ring-red-500/20";
                                  }
                              }
 
                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  disabled={quizSubmitted}
                                  onClick={() => setSelectedAnswers(prev => ({ ...prev, [qIdx]: optIdx }))}
                                  className={cn(
                                    "text-left p-3.5 sm:p-2.5 rounded-xl border text-xs transition-all duration-300 cursor-pointer flex items-center justify-between",
                                    optionStyle
                                  )}
                                >
                                  <span><MathTextRenderer text={opt} isOption /></span>
                                  {quizSubmitted && isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-650 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                          {quizSubmitted && (
                            <p className="text-xs sm:text-[11px] text-slate-500 bg-slate-50 border border-slate-200/50 rounded-xl p-3.5 sm:p-3 mt-2 font-medium leading-relaxed">
                              <span className="font-bold text-brand-600 block mb-0.5 text-xs sm:text-[11px]">Explanation:</span>
                              <MathTextRenderer text={q.explanation} />
                            </p>
                          )}
                        </div>
                      );
                    })}
 
                    {/* Submit / Restart Quiz action */}
                    <div className="flex gap-2 pt-2">
                      {!quizSubmitted ? (
                        <>
                          <button
                            onClick={() => {
                              const unansweredCount = activeQuiz.length - Object.keys(selectedAnswers).length;
                              if (unansweredCount > 0) {
                                setConfirmDialog({
                                  title: "Submit Partial Quiz",
                                  message: `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit the quiz? Unanswered questions will be marked as incorrect.`,
                                  confirmText: "Submit Anyway",
                                  variant: "primary",
                                  onConfirm: () => {
                                    const correctCount = activeQuiz.reduce((acc, q, idx) => {
                                      return acc + (selectedAnswers[idx] === q.correctOption ? 1 : 0);
                                    }, 0);
                                    saveQuizScore(correctCount, activeQuiz.length);
                                    setQuizSubmitted(true);
                                  }
                                });
                              } else {
                                const correctCount = activeQuiz.reduce((acc, q, idx) => {
                                  return acc + (selectedAnswers[idx] === q.correctOption ? 1 : 0);
                                }, 0);
                                saveQuizScore(correctCount, activeQuiz.length);
                                setQuizSubmitted(true);
                              }
                            }}
                            className="flex-[2] py-3.5 sm:py-2.5 bg-teal-500 hover:bg-emerald-400 text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest transition-colors cursor-pointer shadow-md active:translate-y-0.5"
                          >
                            Submit Quiz
                          </button>
                          <button
                            onClick={() => {
                              setConfirmDialog({
                                title: "Cancel Quiz",
                                message: "Are you sure you want to cancel the current quiz? Your progress will be lost.",
                                confirmText: "Yes, Cancel",
                                variant: "danger",
                                onConfirm: () => {
                                  setActiveQuiz([]);
                                  setQuizSubmitted(false);
                                  setSelectedAnswers({});
                                }
                              });
                            }}
                            className="flex-1 py-3.5 sm:py-2.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/25 text-red-400 rounded-xl text-xs font-black uppercase tracking-widest transition-colors cursor-pointer active:translate-y-0.5"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveQuiz([]);
                            setQuizSubmitted(false);
                            setSelectedAnswers({});
                          }}
                          className="flex-1 py-3.5 sm:py-2.5 border border-slate-200/60 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest transition-colors cursor-pointer active:translate-y-0.5"
                        >
                          Retry / New Quiz
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
                </motion.div>
              )}

              {activeRightTab === 'syllabus' && (
                <motion.div
                  key="syllabus"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4 text-left"
                >

            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1 text-left">
                <span className="inline-flex px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-650 rounded text-[10px] sm:text-[9px] font-black uppercase tracking-wider">
                  Syllabus Map
                </span>
                <h4 className="font-serif font-extrabold text-slate-800 text-base sm:text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-650" />
                  Syllabus Workspace
                </h4>
                <p className="text-slate-500 text-[11px] font-semibold leading-relaxed">
                  Design and manage your own exam syllabus. Toggle progress, request tutoring summaries, or trigger dynamic AI MCQs.
                </p>
              </div>

              {/* Add Collection Action */}
              <button
                onClick={() => {
                  setShowAddCollection(!showAddCollection);
                  setShowAddTopic(false);
                }}
                className="px-3 py-1.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[9px] font-black uppercase tracking-wider border border-slate-200/60 hover:bg-slate-100 rounded-lg text-slate-700 hover:text-slate-900 transition-colors cursor-pointer shrink-0 active:scale-95 flex items-center gap-1.5"
              >
                {showAddCollection ? (
                  <span>Cancel</span>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-slate-500 shrink-0" />
                    <span>Collection</span>
                  </>
                )}
              </button>
            </div>

            {/* Form to Add Collection manually or generate with AI */}
            {showAddCollection && (
              <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-2xl space-y-4 text-left animate-fade-down">
                <div className="space-y-2">
                  <label className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 block px-1">Option A: Generate Syllabus with AI</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiSubjectInput}
                      onChange={(e) => setAiSubjectInput(e.target.value)}
                      placeholder="e.g. Modern Indian History, OSSSC Arithmetic"
                      className="flex-1 bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-2.5 sm:px-3 sm:py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500/40 transition-all font-semibold"
                    />
                    <button
                      type="button"
                      disabled={aiGeneratingSyllabus || !aiSubjectInput.trim()}
                      onClick={() => handleGenerateAIEnhancedSyllabus(aiSubjectInput)}
                      className="px-3.5 py-2.5 sm:py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-[11px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 active:translate-y-0.5"
                    >
                      {aiGeneratingSyllabus ? (
                        <div className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      )}
                      <span>Generate</span>
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-200/50 pt-3 space-y-2">
                  <label className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 block px-1">Option B: Create Blank Collection</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      placeholder="e.g. My OPSC GS Syllabus"
                      className="flex-1 bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-2.5 sm:px-3 sm:py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500/40 transition-all font-semibold"
                    />
                    <button
                      type="button"
                      disabled={!newCollectionName.trim()}
                      onClick={() => handleCreateCollection(newCollectionName)}
                      className="px-4 py-2.5 sm:py-2 border border-slate-200/60 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl text-[11px] sm:text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed active:translate-y-0.5"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Collection Tab Switcher */}
            {collections.length > 0 ? (
              <div className="space-y-4">
                {/* Modern Pill Grid */}
                <div className="flex flex-wrap gap-2 text-left">
                  {collections.map((c) => {
                    const isActive = c.id === activeCollectionId;

                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setActiveCollectionId(c.id);
                          setEditingCollectionId(null); // Cancel editing other items
                        }}
                        className={cn(
                          "px-4 py-2.5 sm:py-2 text-[10.5px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-1.5 relative",
                          isActive 
                            ? "text-amber-650 border-amber-500/40" 
                            : "bg-slate-50 border-slate-200/50 text-slate-500 hover:text-slate-800 hover:bg-slate-100 hover:text-slate-800/40 hover:border-slate-200/60"
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeSyllabusCollectionBg"
                            className="absolute inset-0 bg-amber-500/15 rounded-xl border border-amber-500/40 z-0 shadow-lg shadow-amber-500/5"
                            transition={{ type: "spring", stiffness: 350, damping: 28 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-1.5">
                          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                          <span>{c.name}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Dedicated Collection Workspace Toolbar */}
                {(() => {
                  const activeColl = collections.find(c => c.id === activeCollectionId);
                  if (!activeColl) return null;
                  const isEditing = activeColl.id === editingCollectionId;

                  return (
                    <div className="bg-slate-50 border border-slate-200/50 p-3 sm:p-3.5 rounded-2xl flex items-center justify-between gap-3 text-left animate-fade-in">
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <input
                              type="text"
                              value={editingCollectionName}
                              onChange={(e) => setEditingCollectionName(e.target.value)}
                              className="flex-1 min-w-0 bg-slate-50 border border-slate-200/60 rounded-xl px-2.5 py-2 sm:py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500/40 transition-all font-semibold"
                              autoFocus
                              placeholder="Name..."
                            />
                            <button
                              onClick={() => handleRenameCollection(activeColl.id, editingCollectionName)}
                              className="p-2 sm:p-1.5 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-650 rounded-lg shrink-0 transition-all cursor-pointer active:scale-95"
                              title="Save Name"
                            >
                              <Check className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingCollectionId(null)}
                              className="p-2 sm:p-1.5 bg-slate-50 border border-slate-200/60 hover:bg-slate-100 text-slate-500 rounded-lg shrink-0 transition-all cursor-pointer active:scale-95"
                              title="Cancel"
                            >
                              <Square className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] sm:text-[8px] font-black uppercase tracking-widest text-slate-500 block mb-0.5">Selected Workspace</span>
                              <h5 className="font-serif font-extrabold text-slate-900 text-sm flex items-center gap-1.5 min-w-0">
                                <span className="truncate max-w-[130px] xs:max-w-[180px] sm:max-w-[280px] md:max-w-none block">
                                  {activeColl.name}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingCollectionId(activeColl.id);
                                    setEditingCollectionName(activeColl.name);
                                  }}
                                  className="text-slate-500 hover:text-amber-650 transition-colors p-1.5 rounded hover:bg-slate-100 shrink-0"
                                  title="Rename Workspace"
                                >
                                  <Edit3 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                                </button>
                              </h5>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Toolbar Actions */}
                      <div className="flex items-center gap-1.5 sm:gap-1 shrink-0">
                        <button
                          onClick={() => handleMoveCollection(activeColl.id, 'up')}
                          className="p-2.5 sm:p-2 bg-slate-50 border border-slate-200/50 hover:border-slate-200/60 hover:bg-slate-100 hover:text-slate-800/80 rounded-xl text-slate-500 hover:text-white transition-all cursor-pointer active:scale-90"
                          title="Move Left/Up"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveCollection(activeColl.id, 'down')}
                          className="p-2.5 sm:p-2 bg-slate-50 border border-slate-200/50 hover:border-slate-200/60 hover:bg-slate-100 hover:text-slate-800/80 rounded-xl text-slate-500 hover:text-white transition-all cursor-pointer active:scale-90"
                          title="Move Right/Down"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-5 bg-slate-100 mx-1 shrink-0" />
                        <button
                          onClick={() => handleDeleteCollection(activeColl.id)}
                          className="p-2.5 sm:p-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-all cursor-pointer active:scale-90"
                          title="Delete Workspace"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Progress bar for active collection */}
                {(() => {
                  const activeColl = collections.find(c => c.id === activeCollectionId);
                  if (!activeColl) return null;
                  const totalTopics = activeColl.topics.length;
                  const completedCount = activeColl.topics.filter(t => t.status === 'completed').length;
                  const progressPercentage = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

                  return (
                    <div className="bg-slate-50 border border-slate-200/50 p-3 rounded-2xl space-y-2 text-left">
                      <div className="flex justify-between items-center text-[11px] sm:text-[10px] font-black uppercase text-slate-500">
                        <span>Workspace Progress</span>
                        <span className="text-amber-650">{completedCount} of {totalTopics} Completed ({progressPercentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                        <div 
                          className="bg-amber-400 h-full transition-all duration-500 rounded-full" 
                          style={{ width: `${progressPercentage}%` }} 
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Active Collection Syllabus Topics List */}
                {(() => {
                  const activeColl = collections.find(c => c.id === activeCollectionId);
                  if (!activeColl) return null;

                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500">Study Chapters / Topics</span>
                        <button
                          onClick={() => {
                            setShowAddTopic(!showAddTopic);
                            setEditingTopicId(null);
                          }}
                          className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-amber-650 hover:text-amber-300 border border-amber-500/25 hover:border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-lg transition-all duration-200 cursor-pointer active:scale-95"
                        >
                          {showAddTopic ? 'Close Form' : '+ Add Custom Topic'}
                        </button>
                      </div>

                      {/* Add Custom Topic Form */}
                      {showAddTopic && (
                        <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-2xl space-y-3 text-left animate-fade-down">
                          <div className="space-y-1">
                            <label className="text-[9px] sm:text-[8px] font-black uppercase tracking-widest text-slate-500 block px-1">Topic Title</label>
                            <input
                              type="text"
                              value={newTopicName}
                              onChange={(e) => setNewTopicName(e.target.value)}
                              placeholder="e.g. Indus Valley Civilization"
                              className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-2.5 sm:px-3 sm:py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500/40 transition-all font-semibold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] sm:text-[8px] font-black uppercase tracking-widest text-slate-500 block px-1">Description / Chapters</label>
                            <input
                              type="text"
                              value={newTopicDesc}
                              onChange={(e) => setNewTopicDesc(e.target.value)}
                              placeholder="e.g. Harappan sites, trade routes, decline causes"
                              className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-2.5 sm:px-3 sm:py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500/40 transition-all font-semibold"
                            />
                          </div>
                          <button
                            type="button"
                            disabled={!newTopicName.trim()}
                            onClick={() => handleCreateTopic(activeColl.id, newTopicName, newTopicDesc)}
                            className="w-full py-3 sm:py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs sm:text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-extrabold"
                          >
                            Add Topic to Syllabus
                          </button>
                        </div>
                      )}

                      {/* Topics Cards */}
                      {activeColl.topics.length === 0 ? (
                        <div className="py-8 text-center border border-dashed border-slate-200/50 rounded-2xl space-y-2">
                          <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
                          <p className="text-slate-500 text-xs font-bold">This collection is empty.</p>
                          <p className="text-slate-500 text-[10px] max-w-[200px] mx-auto leading-relaxed">
                            Click "Add Custom Topic" above to manually write down your chapters, or outline it with AI.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 pr-1">
                          {activeColl.topics.map((topic) => {
                            const isEditing = topic.id === editingTopicId;
                            const status = topic.status || 'not_started';

                            let statusColor = "border-slate-200/50 text-slate-500 bg-slate-50";
                            let statusLabel = "Not Started";
                            if (status === 'in_progress') {
                              statusColor = "border-amber-500/20 text-amber-650 bg-amber-500/5";
                              statusLabel = "In Progress";
                            } else if (status === 'completed') {
                              statusColor = "border-emerald-500/20 text-emerald-650 bg-emerald-500/5";
                              statusLabel = "Completed";
                            }

                            if (isEditing) {
                              return (
                                <div key={topic.id} className="p-4 bg-slate-50 border border-amber-500/30 rounded-2xl space-y-3.5 sm:space-y-3 text-left animate-fade-in">
                                  <div className="space-y-1">
                                    <label className="text-[9px] sm:text-[8px] font-black uppercase tracking-widest text-slate-500 block px-1">Rename Topic</label>
                                    <input
                                      type="text"
                                      value={editingTopicName}
                                      onChange={(e) => setEditingTopicName(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-2.5 sm:px-3 sm:py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500/40 font-semibold"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] sm:text-[8px] font-black uppercase tracking-widest text-slate-500 block px-1">Edit Description</label>
                                    <input
                                      type="text"
                                      value={editingTopicDesc}
                                      onChange={(e) => setEditingTopicDesc(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-2.5 sm:px-3 sm:py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500/40 font-semibold"
                                    />
                                  </div>
                                  <div className="flex gap-2.5 sm:gap-2 pt-1">
                                    <button
                                      onClick={() => handleEditTopic(activeColl.id, topic.id, editingTopicName, editingTopicDesc)}
                                      className="flex-1 py-2.5 sm:py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] sm:text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer active:scale-95"
                                    >
                                      Save Details
                                    </button>
                                    <button
                                      onClick={() => setEditingTopicId(null)}
                                      className="px-4 py-2.5 sm:px-3.5 sm:py-1.5 border border-slate-200/60 hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] sm:text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer active:scale-95"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            let indicatorColor = "bg-slate-500";
                            if (status === 'in_progress') indicatorColor = "bg-amber-400";
                            else if (status === 'completed') indicatorColor = "bg-emerald-400 animate-pulse";

                            return (
                              <div key={topic.id} className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200/50 hover:border-slate-200/60 rounded-2.5xl flex flex-col gap-3 sm:gap-3.5 text-left transition-colors relative group">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-3">
                                  <div className="space-y-1 pr-2 sm:truncate min-w-0">
                                    <h5 className="font-serif font-extrabold text-slate-800 text-sm sm:text-xs leading-tight">
                                      {topic.name}
                                    </h5>
                                    {topic.desc && (
                                      <p className="text-slate-500 text-xs sm:text-[10px] font-medium leading-relaxed">
                                        {topic.desc}
                                      </p>
                                    )}
                                  </div>

                                  {/* Topic Actions & Status Menu */}
                                  <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-2 w-full sm:w-auto shrink-0 mt-2 sm:mt-0 border-t border-slate-200/30 pt-2 sm:border-0 sm:pt-0">
                                    <button
                                      onClick={() => handleToggleSyllabusStatus(activeColl.id, topic.id)}
                                      className={cn(
                                        "px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-[8px] font-black uppercase tracking-wider border transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-1.5",
                                        status === 'not_started' && "bg-slate-50 border-slate-200/50 text-slate-500 hover:bg-slate-100 hover:text-slate-800",
                                        status === 'in_progress' && "bg-amber-500/10 border-amber-500/25 text-amber-650 hover:bg-amber-500/20",
                                        status === 'completed' && "bg-emerald-500/10 border-emerald-500/25 text-emerald-650 hover:bg-emerald-500/20"
                                      )}
                                      title="Toggle status"
                                    >
                                      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", indicatorColor)} />
                                      <span>{statusLabel}</span>
                                    </button>

                                    {/* Action Buttons Toolbar */}
                                    <div className="flex items-center bg-slate-50 border border-slate-200/50 rounded-lg p-0.5 opacity-100 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => {
                                          setEditingTopicId(topic.id);
                                          setEditingTopicName(topic.name);
                                          setEditingTopicDesc(topic.desc);
                                        }}
                                        className="p-1.5 sm:p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors cursor-pointer active:scale-90"
                                        title="Edit topic"
                                      >
                                        <Edit3 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleMoveTopic(activeColl.id, topic.id, 'up')}
                                        className="p-1.5 sm:p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors cursor-pointer active:scale-90"
                                        title="Move Up"
                                      >
                                        <ChevronUp className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleMoveTopic(activeColl.id, topic.id, 'down')}
                                        className="p-1.5 sm:p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors cursor-pointer active:scale-90"
                                        title="Move Down"
                                      >
                                        <ChevronDown className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteTopic(activeColl.id, topic.id)}
                                        className="p-1.5 sm:p-1 text-slate-500 hover:text-red-400 rounded hover:bg-slate-100 transition-colors cursor-pointer active:scale-90"
                                        title="Delete topic"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Action buttons */}
                                <div className="flex gap-2.5 sm:gap-2">
                                  <button
                                    onClick={() => {
                                      handleSendMessage(`Provide a comprehensive, exam-oriented study summary for: "${topic.name}" (${topic.desc}) under the context of the "${targetExam}" syllabus. List 3 high-yield exam subtopics, 2 historical/factual reference points or formulas to memorize for the exam, and 1 core takeaway/practical tip.`);
                                      // Delay scroll slightly so the message appends to DOM first
                                      setTimeout(() => scrollToElement('chat-pane', { block: 'start' }), 150);
                                    }}
                                    className="flex-1 py-3 sm:py-2 bg-slate-50 border border-slate-200/60 hover:bg-[#8A1C36]/8 hover:border-[#8A1C36]/30 hover:text-[#8A1C36] text-slate-600 text-xs sm:text-[9px] font-black uppercase tracking-widest rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                                    title="Ask personal AI tutor for summary"
                                  >
                                    <HelpCircle className="w-3.5 h-3.5" />
                                    Ask Tutor
                                  </button>
                                  <button
                                    onClick={() => {
                                      // Switch to quiz tab first so quiz-pane renders in DOM, then scroll
                                      setActiveRightTab('quiz');
                                      handleTriggerQuizFromSyllabus(topic.name);
                                      setTimeout(() => scrollToElement('quiz-pane', { block: 'start' }), 200);
                                    }}
                                    className="flex-1 py-3 sm:py-2 bg-[#8A1C36] hover:bg-[#a12340] text-white text-xs sm:text-[9px] font-black uppercase tracking-widest rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 shadow-lg shadow-red-950/20"
                                    title="Test yourself with dynamic MCQs"
                                  >
                                    <Target className="w-3.5 h-3.5" />
                                    Quiz Me
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* EMPTY ONBOARDING STATE */
              <div className="py-12 px-4 border border-dashed border-slate-200/60 rounded-[2rem] space-y-6 text-center animate-fade-up">
                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
                  <BookOpen className="w-8 h-8 text-amber-650" />
                </div>
                
                <div className="space-y-1.5 max-w-sm mx-auto">
                  <h5 className="font-serif font-extrabold text-slate-800 text-base">Your Syllabus Workspace is empty</h5>
                  <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                    Personalize your study dashboard. Compile custom subject collections, generate a syllabus with AI, or manually outline your exam targets.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-xs mx-auto">
                  <button
                    onClick={() => setShowAddCollection(true)}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10 active:translate-y-0.5"
                  >
                    <Sparkles className="w-4 h-4 animate-pulse text-slate-950" />
                    AI Compiler
                  </button>
                  <button
                    onClick={() => setShowAddCollection(true)}
                    className="flex-1 py-3 border border-slate-200/60 hover:border-slate-800/80 bg-white hover:bg-slate-900 text-slate-700 hover:text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer active:translate-y-0.5 shadow-sm hover:shadow-md hover:shadow-slate-900/5"
                  >
                    Create Manually
                  </button>
                </div>
              </div>
            )}
                </motion.div>
              )}

              {activeRightTab === 'formulas' && (
                <motion.div
                  key="formulas"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4 text-left"
                >
            <div className="flex flex-col gap-3.5 border-b border-slate-200/50 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left">
                <div className="space-y-1">
                  <span className="inline-flex px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-650 rounded text-[10px] sm:text-[9px] font-black uppercase tracking-wider">
                    Shortcut Deck
                  </span>
                  <h4 className="font-serif font-extrabold text-slate-800 text-base sm:text-lg flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-650 shrink-0" />
                    <span>Formula & Shortcut Cards</span>
                  </h4>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/50 w-full">
                {/* Add Category Action */}
                <button
                  onClick={() => {
                    setShowAddFormulaCategory(!showAddFormulaCategory);
                    setShowAddFormula(false);
                    setShowAiFormulaPrompt(false);
                  }}
                  className={cn(
                    "flex-1 sm:flex-initial px-3.5 py-2 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5",
                    showAddFormulaCategory 
                      ? "bg-indigo-500 border-indigo-400 text-slate-950 font-black" 
                      : "border-slate-200/50 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                  )}
                  title="Add category"
                >
                  {showAddFormulaCategory ? (
                    <>
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Category</span>
                    </>
                  )}
                </button>

                {/* Add Custom Formula Action */}
                <button
                  disabled={formulaCategories.length === 0}
                  onClick={() => {
                    setShowAddFormula(!showAddFormula);
                    setShowAddFormulaCategory(false);
                    setShowAiFormulaPrompt(false);
                  }}
                  className={cn(
                    "flex-1 sm:flex-initial px-3.5 py-2 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed",
                    showAddFormula 
                      ? "bg-indigo-500 border-indigo-400 text-slate-950 font-black" 
                      : "border-slate-200/50 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                  )}
                  title="Add custom formula card"
                >
                  {showAddFormula ? (
                    <>
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Formula</span>
                    </>
                  )}
                </button>

                {/* AI Generate Formula Action */}
                <button
                  onClick={() => {
                    setShowAiFormulaPrompt(!showAiFormulaPrompt);
                    setShowAddFormula(false);
                    setShowAddFormulaCategory(false);
                  }}
                  className={cn(
                    "flex-1 sm:flex-initial px-3.5 py-2 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5",
                    showAiFormulaPrompt 
                      ? "bg-gradient-to-r from-violet-500 to-indigo-500 border-indigo-400 text-white font-black animate-pulse" 
                      : "border-slate-200/50 text-indigo-650 hover:text-indigo-700 hover:bg-indigo-50"
                  )}
                  title="Generate formula with AI"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{showAiFormulaPrompt ? 'Cancel' : 'AI Generate'}</span>
                </button>

                {/* Flashcard Memory Toggle */}
                <button
                  onClick={() => {
                    setFlashcardMode(!flashcardMode);
                    setRevealedFlashcards({});
                    toast.success(
                      flashcardMode 
                        ? "Switched to normal reading mode" 
                        : "Memory Mode active! Click cards to reveal formulas.",
                      { icon: '🧠' }
                    );
                  }}
                  className={cn(
                    "flex-1 sm:flex-initial px-3.5 py-2 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5",
                    flashcardMode 
                      ? "bg-indigo-500 border-indigo-400 text-slate-950" 
                      : "border-slate-200/50 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  )}
                  title="Toggle memory cards style"
                >
                  <span>🧠 Memory Mode</span>
                </button>
              </div>
            </div>

            {/* Search filter bar */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-500" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search formulas, articles, grammar rules..."
                className="w-full bg-white border border-slate-200/60 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all font-semibold"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[10px] font-black text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Form to Add Category manually */}
            {showAddFormulaCategory && (
              <div className="bg-white border border-slate-200/50 p-4 rounded-2xl space-y-3 text-left animate-fade-down shadow-xl">
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 block px-1">Category Name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFormulaCategoryName}
                      onChange={(e) => setNewFormulaCategoryName(e.target.value)}
                      placeholder="e.g., Math Techniques, Civics"
                      className="flex-1 bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-2.5 sm:px-3 sm:py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all font-semibold"
                    />
                    <button
                      type="button"
                      disabled={!newFormulaCategoryName.trim()}
                      onClick={() => handleCreateFormulaCategory(newFormulaCategoryName)}
                      className="px-5 py-2.5 sm:px-4 sm:py-2 border border-slate-200/60 hover:bg-slate-100 text-slate-700 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed active:translate-y-0.5"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI Generate Formula Form & Preview Card */}
            {showAiFormulaPrompt && (
              <div className="bg-white border border-slate-200/50 p-4 rounded-2xl space-y-4 text-left animate-fade-down shadow-xl">
                {!aiGeneratedFormula ? (
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block px-1">Describe the formula or rule for the AI</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={aiFormulaPromptText}
                        onChange={(e) => setAiFormulaPromptText(e.target.value)}
                        placeholder="e.g., Relative speed formula, swara sandhi rule, governor article..."
                        className="flex-1 bg-slate-50 border border-slate-200/60 rounded-xl px-3 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all font-semibold"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && aiFormulaPromptText.trim() && !aiGeneratingFormula) {
                            handleGenerateFormulaWithAI();
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={aiGeneratingFormula || !aiFormulaPromptText.trim()}
                        onClick={handleGenerateFormulaWithAI}
                        className="px-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 active:translate-y-0.5"
                      >
                        {aiGeneratingFormula ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                        )}
                        <span>{aiGeneratingFormula ? 'Generating...' : 'Generate'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    <div className="border-b border-slate-200/50 pb-2">
                      <span className="text-[8px] font-black uppercase tracking-widest text-indigo-650 block">AI GENERATION PREVIEW</span>
                      <h5 className="text-white text-xs font-bold font-serif mt-0.5">Please confirm details before adding to Shortcut Deck</h5>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200/50 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[9px] font-black uppercase tracking-wider text-indigo-650 font-extrabold">
                          {aiGeneratedFormula.title}
                        </span>
                        
                        {(() => {
                          const categoryExists = formulaCategories.some(
                            c => c.name.toLowerCase() === aiGeneratedFormula.category.toLowerCase()
                          );
                          return (
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border",
                              categoryExists
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-650"
                                : "bg-amber-500/10 border-amber-500/20 text-amber-650"
                            )}>
                              Category: {aiGeneratedFormula.category} {categoryExists ? '✓' : '(New Category)'}
                            </span>
                          );
                        })()}
                      </div>

                      <div className="space-y-1.5">
                        <div className="font-mono text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200/50 p-2.5 rounded-lg leading-relaxed overflow-x-auto custom-scrollbar">
                          <FormulaRenderer formula={aiGeneratedFormula.formula} />
                        </div>
                        {aiGeneratedFormula.shortcut && (
                          <p className="text-slate-500 text-[10px] font-semibold leading-relaxed">
                            <span className="font-extrabold text-slate-800">Trick:</span> {aiGeneratedFormula.shortcut}
                          </p>
                        )}
                        {aiGeneratedFormula.example && (
                          <p className="text-slate-500 text-[10px] font-semibold leading-relaxed">
                            <span className="font-extrabold text-slate-500">e.g.,</span> {aiGeneratedFormula.example}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleConfirmAndAddFormula(aiGeneratedFormula)}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer active:translate-y-0.5 font-extrabold text-center shadow-lg shadow-indigo-500/10"
                      >
                        Confirm & Add to Deck
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiGeneratedFormula(null)}
                        className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/25 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer active:translate-y-0.5 font-extrabold text-center"
                      >
                        Redo Prompt
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Form to Add Custom Formula card */}
            {showAddFormula && activeFormulaCatId && (
              <div className="bg-white border border-slate-200/50 p-4 rounded-2xl space-y-3.5 text-left animate-fade-down shadow-xl">
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 block px-1">Formula Title</label>
                  <input
                    type="text"
                    value={newFormulaTitle}
                    onChange={(e) => setNewFormulaTitle(e.target.value)}
                    placeholder="e.g., Time & Work Shortcut"
                    className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-2.5 sm:px-3 sm:py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 block px-1">Formula / Content</label>
                  <input
                    type="text"
                    value={newFormulaVal}
                    onChange={(e) => setNewFormulaVal(e.target.value)}
                    placeholder="e.g., Work = Time × Efficiency"
                    className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-2.5 sm:px-3 sm:py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 block px-1">Trick / Shortcut Description (Optional)</label>
                  <input
                    type="text"
                    value={newFormulaShortcut}
                    onChange={(e) => setNewFormulaShortcut(e.target.value)}
                    placeholder="e.g., A and B together can finish..."
                    className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-2.5 sm:px-3 sm:py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 block px-1">Example (Optional)</label>
                  <input
                    type="text"
                    value={newFormulaExample}
                    onChange={(e) => setNewFormulaExample(e.target.value)}
                    placeholder="e.g., A in 10 days, B in 15 days. Together = 6 days."
                    className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-2.5 sm:px-3 sm:py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all font-semibold"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCreateFormula}
                  disabled={!newFormulaTitle.trim() || !newFormulaVal.trim()}
                  className="w-full py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-[11px] sm:text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer font-extrabold active:translate-y-0.5 shadow-md shadow-indigo-600/10"
                >
                  Add Formula to Deck
                </button>
              </div>
            )}

            {/* Category Tab Switcher & Workspace Toolbar */}
            {formulaCategories.length > 0 && (
              <div className="space-y-4">
                {/* Dynamic Category Pill Switcher */}
                <div className="flex flex-wrap gap-2 text-left">
                  {formulaCategories.map((cat) => {
                    const isActive = cat.id === activeFormulaCatId;

                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setActiveFormulaCatId(cat.id);
                          setEditingFormulaCatId(null);
                        }}
                        className={cn(
                          "px-4.5 py-2.5 sm:px-4 sm:py-2 text-[10.5px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-1.5 relative",
                          isActive 
                            ? "text-indigo-650 border-indigo-500/40" 
                            : "bg-slate-50 border-slate-200/50 text-slate-500 hover:text-slate-800 hover:bg-slate-100 hover:text-slate-800/40 hover:border-slate-200/60"
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeFormulaCategoryBg"
                            className="absolute inset-0 bg-indigo-500/15 rounded-xl border border-indigo-500/40 z-0 shadow-lg shadow-indigo-500/5"
                            transition={{ type: "spring", stiffness: 350, damping: 28 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-1.5">
                          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />}
                          <span>{cat.name}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Category Workspace Toolbar */}
                {(() => {
                  const activeCat = formulaCategories.find(c => c.id === activeFormulaCatId);
                  if (!activeCat) return null;
                  const isEditing = activeCat.id === editingFormulaCatId;

                  return (
                    <div className="bg-slate-50 border border-slate-200/50 p-3 sm:p-3.5 rounded-2xl flex items-center justify-between gap-3 text-left animate-fade-in">
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <input
                              type="text"
                              value={editingFormulaCatName}
                              onChange={(e) => setEditingFormulaCatName(e.target.value)}
                              className="flex-1 min-w-0 bg-white border border-slate-200/60 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all font-semibold"
                              autoFocus
                              placeholder="Name..."
                            />
                            <button
                              onClick={() => handleRenameFormulaCategory(activeCat.id, editingFormulaCatName)}
                              className="p-2 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-650 rounded-lg shrink-0 transition-all cursor-pointer active:scale-95"
                              title="Save Name"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingFormulaCatId(null)}
                              className="p-2 bg-slate-50 border border-slate-200/60 hover:bg-slate-100 text-slate-500 rounded-lg shrink-0 transition-all cursor-pointer active:scale-95"
                              title="Cancel"
                            >
                              <Square className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] sm:text-[8px] font-black uppercase tracking-widest text-slate-500 block mb-0.5">Category Workspace</span>
                              <h5 className="font-serif font-extrabold text-slate-800 text-sm flex items-center gap-1.5 min-w-0">
                                <span className="truncate max-w-[130px] xs:max-w-[180px] sm:max-w-[280px] md:max-w-none block">
                                  {activeCat.name}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingFormulaCatId(activeCat.id);
                                    setEditingFormulaCatName(activeCat.name);
                                  }}
                                  className="text-slate-500 hover:text-amber-650 transition-colors p-1 rounded hover:bg-slate-150 shrink-0 cursor-pointer"
                                  title="Rename Category"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </h5>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Toolbar Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleMoveFormulaCategory(activeCat.id, 'up')}
                          className="p-2.5 sm:p-2 bg-white border border-slate-200/50 hover:border-slate-200/60 hover:bg-slate-100 text-slate-650 transition-all cursor-pointer active:scale-90 rounded-xl"
                          title="Move Left/Up"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveFormulaCategory(activeCat.id, 'down')}
                          className="p-2.5 sm:p-2 bg-white border border-slate-200/50 hover:border-slate-200/60 hover:bg-slate-100 text-slate-650 transition-all cursor-pointer active:scale-90 rounded-xl"
                          title="Move Right/Down"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-5 bg-slate-200 mx-1 shrink-0" />
                        <button
                          onClick={() => handleDeleteFormulaCategory(activeCat.id)}
                          className="p-2.5 sm:p-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-500 rounded-xl transition-all cursor-pointer active:scale-90"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}


            {/* Cheat sheet list cards */}
            {(() => {
              const activeCat = formulaCategories.find(c => c.id === activeFormulaCatId);
              const activeCards = activeCat ? activeCat.cards : [];
              const filtered = activeCards.filter(card => 
                card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                card.formula.toLowerCase().includes(searchQuery.toLowerCase()) ||
                card.shortcut.toLowerCase().includes(searchQuery.toLowerCase())
              );

              if (formulaCategories.length === 0) {
                return (
                  <div className="relative py-14 px-6 text-center bg-slate-50 border border-slate-200/60 rounded-[2rem] space-y-6 overflow-hidden shadow-2xl">
                    {/* Ambient background glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                    
                    {/* Dot grid pattern overlay */}
                    <div 
                      className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                      style={{
                        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 0)',
                        backgroundSize: '12px 12px'
                      }}
                    />

                    {/* 3D Floating Card Stack Graphic */}
                    <div className="relative h-20 w-32 mx-auto flex items-center justify-center">
                      {/* Back Card */}
                      <motion.div 
                        animate={{ y: [4, -4, 4], rotate: [-8, -6, -8] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        className="absolute w-12 h-16 bg-slate-50 border border-slate-200/50 rounded-xl shadow-lg transform origin-bottom"
                      />
                      {/* Middle Card */}
                      <motion.div 
                        animate={{ y: [-4, 4, -4], rotate: [8, 6, 8] }}
                        transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
                        className="absolute w-12 h-16 bg-indigo-950/30 border border-indigo-500/10 rounded-xl shadow-lg transform origin-bottom"
                      />
                      {/* Front Card */}
                      <motion.div 
                        animate={{ y: [6, -6, 6] }}
                        transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                        className="absolute w-12 h-16 bg-[#0c1020] border border-indigo-500/30 rounded-xl shadow-2xl flex items-center justify-center z-10"
                      >
                        <Award className="w-5 h-5 text-indigo-650 animate-pulse" />
                      </motion.div>
                    </div>

                    <div className="space-y-2 max-w-xs mx-auto relative z-10">
                      <h5 className="font-serif font-black text-lg text-slate-800 tracking-tight font-black">
                        Your Shortcut Deck is empty
                      </h5>
                      <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                        Build your personalized formula compiler. Create categories like "Math", "History", or "Polity" to get started.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowAddFormulaCategory(true)}
                      className="relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 cursor-pointer active:scale-95 shadow-lg shadow-indigo-600/20 border border-indigo-400/20 overflow-hidden group z-10"
                    >
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                      <span>➕ Create Category</span>
                    </button>
                  </div>
                );
              }

              if (!activeFormulaCatId) {
                return (
                  <div className="py-8 text-center text-slate-500 text-xs font-bold">
                    Select a category tab above to view formulas.
                  </div>
                );
              }

              if (filtered.length === 0) {
                return (
                  <div className="py-12 text-center border border-dashed border-slate-200/50 rounded-2xl space-y-2">
                    <Award className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-slate-500 text-xs font-bold">This category is empty.</p>
                    <p className="text-slate-500 text-[10px] max-w-[200px] mx-auto leading-relaxed">
                      Click "Add Formula" above to start custom compiling your own formulas, shortcuts, and grammar rules.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3 pr-1">
                  {filtered.map((card, idx) => {
                    const isRevealed = !flashcardMode || revealedFlashcards[card.title];
                    const isEditing = editingFormulaKey === activeFormulaCatId && editingFormulaIndex === card.id;

                    if (isEditing) {
                      return (
                        <div 
                          key={card.id} 
                          className="p-4 bg-slate-50 border border-indigo-500/30 rounded-2xl space-y-3.5 text-left animate-fade-in"
                        >
                          <div className="space-y-1.5">
                            <label className="text-[9px] sm:text-[8px] font-black uppercase tracking-widest text-slate-500 block px-1">Rename Title</label>
                            <input
                              type="text"
                              value={editingFormulaTitle}
                              onChange={(e) => setEditingFormulaTitle(e.target.value)}
                              className="w-full bg-white border border-slate-200/60 rounded-xl px-3 py-2 sm:px-2.5 sm:py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 font-semibold"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] sm:text-[8px] font-black uppercase tracking-widest text-slate-500 block px-1">Formula</label>
                            <input
                              type="text"
                              value={editingFormulaVal}
                              onChange={(e) => setEditingFormulaVal(e.target.value)}
                              className="w-full bg-white border border-slate-200/60 rounded-xl px-3 py-2 sm:px-2.5 sm:py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 font-semibold"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] sm:text-[8px] font-black uppercase tracking-widest text-slate-500 block px-1">Trick / Shortcut</label>
                            <input
                              type="text"
                              value={editingFormulaShortcut}
                              onChange={(e) => setEditingFormulaShortcut(e.target.value)}
                              className="w-full bg-white border border-slate-200/60 rounded-xl px-3 py-2 sm:px-2.5 sm:py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 font-semibold"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] sm:text-[8px] font-black uppercase tracking-widest text-slate-500 block px-1">Example</label>
                            <input
                              type="text"
                              value={editingFormulaExample}
                              onChange={(e) => setEditingFormulaExample(e.target.value)}
                              className="w-full bg-white border border-slate-200/60 rounded-xl px-3 py-2 sm:px-2.5 sm:py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 font-semibold"
                            />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleEditFormula(activeFormulaCatId, card.id)}
                              className="flex-1 py-2.5 sm:py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] sm:text-[9px] font-black uppercase tracking-widest cursor-pointer font-bold active:scale-95"
                            >
                              Save Details
                            </button>
                            <button
                              onClick={() => {
                                setEditingFormulaKey(null);
                                setEditingFormulaIndex(null);
                              }}
                              className="px-4 py-2.5 sm:px-3.5 sm:py-1.5 border border-slate-200/60 hover:bg-slate-100 text-slate-400 rounded-lg text-[10px] sm:text-[9px] font-black uppercase tracking-widest cursor-pointer active:scale-95"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={card.id} 
                        className={cn(
                          "p-4 border rounded-2xl text-left transition-all duration-300 relative overflow-hidden",
                          flashcardMode 
                            ? isRevealed 
                              ? "bg-slate-50 border-indigo-500/25" 
                              : "bg-indigo-950/20 border-indigo-500/10 cursor-pointer hover:bg-indigo-950/30"
                            : "bg-slate-50 border-slate-200/50"
                        )}
                        onClick={() => {
                          if (flashcardMode && !isRevealed) {
                            toggleFlashcardReveal(card.title);
                          }
                        }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                          <span className="text-[10.5px] sm:text-[9px] font-black uppercase tracking-wider text-indigo-650">
                            {card.title}
                          </span>
                          
                          <div className="flex items-center justify-between sm:justify-end gap-1.5 border-t border-slate-200/30 pt-2 mt-1 sm:border-0 sm:pt-0 sm:mt-0 w-full sm:w-auto shrink-0">
                            <div className="flex items-center gap-1.5">
                              {/* Copy button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyShortcut(card);
                                }}
                                className="p-1.5 sm:p-1 border border-slate-200/60 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                                title="Copy shortcut"
                              >
                                <Copy className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                              </button>

                              {/* Edit button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingFormulaKey(activeFormulaCatId);
                                  setEditingFormulaIndex(card.id);
                                  setEditingFormulaTitle(card.title);
                                  setEditingFormulaVal(card.formula);
                                  setEditingFormulaShortcut(card.shortcut);
                                  setEditingFormulaExample(card.example);
                                }}
                                className="p-1.5 sm:p-1 border border-slate-200/60 hover:bg-slate-100 text-slate-500 hover:text-amber-650 rounded-lg transition-colors cursor-pointer"
                                title="Edit formula"
                              >
                                <Edit3 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                              </button>

                              {/* Delete button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFormula(activeFormulaCatId, card.id);
                                }}
                                className="p-1.5 sm:p-1 border border-slate-200/60 hover:bg-slate-100 text-slate-500 hover:text-red-550 rounded-lg transition-colors cursor-pointer"
                                title="Delete formula"
                              >
                                <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                              </button>
                            </div>

                            {/* Practice button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePracticeFormula(card.title, `${card.formula} | ${card.shortcut}`);
                              }}
                              className="py-1.5 px-3 sm:py-1 sm:px-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500 hover:text-slate-950 text-indigo-650 text-[10px] sm:text-[9px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer active:translate-y-0.5"
                            >
                              Practice This
                            </button>
                          </div>
                        </div>

                        {/* Card Content display */}
                        <div className="mt-2.5 space-y-2 relative">
                          {flashcardMode && !isRevealed ? (
                            <div className="py-4 flex flex-col items-center justify-center text-[11px] sm:text-[10px] font-black uppercase tracking-widest text-indigo-650/80">
                              <span>❓ Tap Card to Reveal Formula</span>
                            </div>
                          ) : (
                            <div className="space-y-1.5 animate-fade-in">
                              <div className="font-mono text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200/50 p-2.5 rounded-lg leading-relaxed overflow-x-auto custom-scrollbar">
                                <FormulaRenderer formula={card.formula} />
                              </div>
                              {card.shortcut && (
                                <p className="text-slate-500 text-xs sm:text-[10px] font-semibold leading-relaxed">
                                  <span className="font-extrabold text-slate-800">Trick:</span> {card.shortcut}
                                </p>
                              )}
                              {card.example && (
                                <p className="text-slate-500 text-xs sm:text-[10px] font-semibold leading-relaxed">
                                  <span className="font-extrabold text-slate-500">e.g.,</span> {card.example}
                                </p>
                              )}
                              {flashcardMode && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFlashcardReveal(card.title);
                                  }}
                                  className="text-[10px] sm:text-[9px] font-black uppercase text-indigo-650 hover:text-indigo-300 block pt-1 cursor-pointer"
                                >
                                  🙈 Hide card details
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>
    </div>
  );
}
