import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown, 
  Flag, 
  CheckCircle2, 
  AlertCircle,
  Timer,
  Send,
  X,
  LayoutGrid,
  LogOut,
  BookOpen,
  Target,
  TrendingDown,
  Zap,
  FileText,
  Play
} from 'lucide-react';
import { cn } from './lib/utils';

import { useAuth } from './lib/AuthContext';
import { MathTextRenderer, DiagramRenderer } from './components/MathTextRenderer';
import { fadeSlideUp, modalContent } from './lib/animations';

// ─────────────────────────────────────────────────────────────
// Layout Detection Helpers
// ─────────────────────────────────────────────────────────────

/** Count math [bracket] blocks in a question string */
const countMathBlocks = (text: string): number => {
  const matches = text.match(/\[[^\[\]\n]{2,120}\]/g) || [];
  return matches.filter(m => /[=^_\\+\-*/]/.test(m) && /[a-zA-Z0-9]/.test(m)).length;
};

/** 
 * Comprehensive ASCII diagram detector.
 * Handles all common diagram types stored in question databases:
 * - Asterisk shapes: * (circles, triangles, borders)
 * - Dot shapes: . (dot diagrams, ellipses)
 * - Line art: /, \, |, -, + (geometric line art, trees, graphs)
 * - Hybrid: O, o, #, %, @, ~ mixed with above
 * - Multi-line blocks: paragraphs with \n that contain diagram lines
 */
const isAsciiDiagram = (para: string): boolean => {
  // Helper: checks a single line for diagram character density
  const lineIsDiagram = (line: string): boolean => {
    if (line.trim().length < 3) return false;
    const trimmed = line.trim();

    // Asterisk patterns (circles, shapes drawn with *)
    const asterisks = (trimmed.match(/\*/g) || []).length;
    if (asterisks >= 3) return true;

    // Dot-heavy patterns (dotted shapes, ellipses)
    const dots = (trimmed.match(/\./g) || []).length;
    if (dots >= 4 && dots / trimmed.length > 0.20) return true;

    // Hash/block patterns (#)
    const hashes = (trimmed.match(/#/g) || []).length;
    if (hashes >= 4) return true;

    // Standard line-art characters (/, \, |, -, +, _, ~, <, >)
    const lineArt = (trimmed.match(/[\/\\|\-+_~<>]/g) || []).length;
    if (lineArt >= 3 && lineArt / trimmed.length > 0.18) return true;

    // Mixed: line with geometry letters + symbols (like "A /|\ B---D")
    const mixedGeo = (trimmed.match(/[\/\\|\-+*\.O]/g) || []).length;
    const letters = (trimmed.match(/[A-Za-z]/g) || []).length;
    if (mixedGeo >= 3 && letters <= 6 && mixedGeo > letters) return true;

    return false;
  };

  if (!para || para.trim().length < 3) return false;

  // Multi-line paragraph: check if ANY line within it is a diagram
  if (para.includes('\n')) {
    const lines = para.split('\n');
    const diagramLineCount = lines.filter(lineIsDiagram).length;
    // If more than 40% of lines look like diagram lines → it's a diagram block
    return diagramLineCount >= 1 && diagramLineCount / lines.length >= 0.40;
  }

  // Single-line check
  return lineIsDiagram(para);
};

/** True when a question needs the full-width stacked layout */
const isMathHeavyQuestion = (text: string): boolean => {
  const blocks = countMathBlocks(text);
  // Also trigger stacked layout if question contains a diagram
  const hasDiagram = text.split('\n\n').some(p => isAsciiDiagram(p));
  return blocks >= 2 || text.length > 320 || hasDiagram;
};

interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  diagram?: any;
}

interface MockTestProps {
  test: {
    id: string;
    title: string;
    durationMinutes: number;
    totalMarks?: number;
    negativeMarking?: number;
    questions: Question[];
  };
  mode?: 'mock' | 'practice';
  initialState?: any;
  onComplete: (results: any) => void;
  onExit: (progressState?: any) => void;
}

const MockTestSystem = ({ test, mode = 'mock', initialState, onComplete, onExit }: MockTestProps) => {
  const { user } = useAuth();

  // Robust parsing: Map ID-keyed progress from saved state back to current/fresh question indices
  const mappedInitialState = useMemo(() => {
    if (!initialState) return null;

    const hasIds = initialState.answersById || initialState.currentQuestionId;
    if (!hasIds) {
      return initialState; // Legacy index-keyed compatibility fallback
    }

    const questions = test?.questions || [];
    const answersMap: Record<number, number> = {};
    const markedList: number[] = [];
    const timeMap: Record<number, number> = {};
    const visitedList: number[] = [];

    const answersById = initialState.answersById || {};
    const markedForReviewIds = initialState.markedForReviewIds || [];
    const timeSpentById = initialState.timeSpentById || {};
    const visitedIds = initialState.visitedIds || [];

    questions.forEach((q, idx) => {
      if (answersById[q.id] !== undefined) {
        answersMap[idx] = answersById[q.id];
      }
      if (markedForReviewIds.includes(q.id)) {
        markedList.push(idx);
      }
      if (timeSpentById[q.id] !== undefined) {
        timeMap[idx] = timeSpentById[q.id];
      }
      if (visitedIds.includes(q.id)) {
        visitedList.push(idx);
      }
    });

    let currentQuestionIndex = 0;
    if (initialState.currentQuestionId) {
      const idx = questions.findIndex(q => q.id === initialState.currentQuestionId);
      if (idx !== -1) currentQuestionIndex = idx;
    } else if (initialState.currentQuestionIndex !== undefined) {
      currentQuestionIndex = Math.min(initialState.currentQuestionIndex, Math.max(0, questions.length - 1));
    }

    return {
      ...initialState,
      currentQuestionIndex,
      answers: answersMap,
      markedForReview: markedList,
      timeSpent: timeMap,
      visited: visitedList
    };
  }, [initialState, test?.questions]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(mappedInitialState?.currentQuestionIndex || 0);
  const [answers, setAnswers] = useState<Record<number, number>>(mappedInitialState?.answers || {});
  const [markedForReview, setMarkedForReview] = useState<number[]>(mappedInitialState?.markedForReview || []);
  const [timeSpent, setTimeSpent] = useState<Record<number, number>>(mappedInitialState?.timeSpent || {});
  const [timeLeft, setTimeLeft] = useState(mappedInitialState?.timeLeft ?? (test?.durationMinutes || 30) * 60);
  const [visited, setVisited] = useState<number[]>(mappedInitialState?.visited || [0]);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const [currentMode, setCurrentMode] = useState<'mock' | 'practice'>(mappedInitialState?.currentMode || mode);
  const [untimedPractice, setUntimedPractice] = useState(mappedInitialState?.untimedPractice || false);
  const [targetScore, setTargetScore] = useState(() => {
    const totalQs = test?.questions?.length || 0;
    const testTotalMarks = test?.totalMarks || totalQs;
    return Math.round(testTotalMarks * 0.8);
  });
  const questionTextRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  // Show overview only for new tests; skip if user is genuinely resuming saved progress
  const [isStarted, setIsStarted] = useState(() => {
    if (!mappedInitialState) return false;
    if (mappedInitialState.isStarted) return true;
    const hasAnswers = Object.keys(mappedInitialState.answers || {}).length > 0;
    const hasPartialTime = mappedInitialState.timeLeft !== undefined && mappedInitialState.timeLeft < (test?.durationMinutes || 30) * 60;
    return hasAnswers || hasPartialTime;
  });

  // Synchronize active test state to sessionStorage on any progress/change
  useEffect(() => {
    if (isStarted && test) {
      const questions = test?.questions || [];
      const answersById: Record<string, number> = {};
      const markedForReviewIds: string[] = [];
      const timeSpentById: Record<string, number> = {};
      const visitedIds: string[] = [];

      Object.entries(answers).forEach(([idxStr, val]) => {
        const idx = parseInt(idxStr);
        const q = questions[idx];
        if (q?.id) answersById[q.id] = val as number;
      });

      markedForReview.forEach(idx => {
        const q = questions[idx];
        if (q?.id) markedForReviewIds.push(q.id);
      });

      Object.entries(timeSpent).forEach(([idxStr, val]) => {
        const idx = parseInt(idxStr);
        const q = questions[idx];
        if (q?.id) timeSpentById[q.id] = val as number;
      });

      visited.forEach(idx => {
        const q = questions[idx];
        if (q?.id) visitedIds.push(q.id);
      });

      const currentQuestionId = questions[currentQuestionIndex]?.id || null;

      sessionStorage.setItem('oep_activeTestState', JSON.stringify({
        resumeSessionId: initialState?.resumeSessionId || `session-${Date.now()}`,
        userId: user?.id || null,
        test: {
          id: test?.id || '',
          title: test?.title || '',
          durationMinutes: test?.durationMinutes || 30,
          totalMarks: test?.totalMarks || 0,
          negativeMarking: test?.negativeMarking || 0,
          questions: test?.questions || []
        },
        currentQuestionIndex,
        currentQuestionId,
        answers,
        answersById,
        markedForReview,
        markedForReviewIds,
        timeSpent,
        timeSpentById,
        timeLeft,
        visited,
        visitedIds,
        isStarted: true,
        currentMode,
        untimedPractice
      }));
    }
  }, [isStarted, test, currentQuestionIndex, answers, markedForReview, timeSpent, timeLeft, visited, currentMode, untimedPractice, initialState?.resumeSessionId, user]);

  // Derived test settings used on both overview & sidebar
  const totalQs = test?.questions?.length || 0;
  const testTotalMarks = useMemo(() => test?.totalMarks || totalQs, [test?.totalMarks, totalQs]);
  const marksPerQ = useMemo(() => totalQs > 0 ? testTotalMarks / totalQs : 1, [totalQs, testTotalMarks]);
  const negMarkVal = useMemo(() => test?.negativeMarking || 0, [test?.negativeMarking]);
  const avgSecsPerQ = useMemo(() => totalQs > 0 ? Math.round(((test?.durationMinutes || 30) * 60) / totalQs) : 0, [totalQs, test?.durationMinutes]);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const markedCount = useMemo(() => markedForReview.length, [markedForReview]);
  const unansweredCount = useMemo(() => totalQs - answeredCount, [totalQs, answeredCount]);

  const desktopPaletteRef = useRef<HTMLDivElement>(null);
  const mobilePaletteRef = useRef<HTMLDivElement>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  // Scroll question text container to top when changing questions
  useEffect(() => {
    const el = questionTextRef.current;
    if (el) {
      el.scrollTop = 0;
    }
  }, [currentQuestionIndex]);

  // Update progress bar based on answered questions count (premium exam progress tracking)
  useEffect(() => {
    const bar = progressBarRef.current;
    if (!bar) return;
    const progress = totalQs > 0 ? answeredCount / totalQs : 0;
    bar.style.transform = `scaleX(${progress})`;
  }, [answeredCount, totalQs]);

  useEffect(() => {
    if (!isStarted) return; // Don't tick timer on the overview screen
    const timer = setInterval(() => {
      if (currentMode === 'practice' && untimedPractice) {
        // Untimed Practice Mode - do not tick down time
      } else {
        setTimeLeft((prev) => {
          if (prev <= 0) {
            clearInterval(timer);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }
      setTimeSpent(prev => ({
        ...prev,
        [currentQuestionIndex]: (prev[currentQuestionIndex] || 0) + 1
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, [currentQuestionIndex, isStarted, currentMode, untimedPractice]);

  // Auto-scroll desktop palette to keep current question in view
  useEffect(() => {
    const container = desktopPaletteRef.current;
    if (!container) return;
    const btn = container.querySelector(`[data-qidx="${currentQuestionIndex}"]`) as HTMLElement | null;
    if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentQuestionIndex]);

  // Auto-scroll mobile palette when opened or selection changes
  useEffect(() => {
    if (!showMobilePalette) return;
    const container = mobilePaletteRef.current;
    if (!container) return;
    const raf = requestAnimationFrame(() => {
      const btn = container.querySelector(`[data-qidx="${currentQuestionIndex}"]`) as HTMLElement | null;
      if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(raf);
  }, [showMobilePalette, currentQuestionIndex]);

  // Track visited questions for CBT status tracking
  useEffect(() => {
    if (!visited.includes(currentQuestionIndex)) {
      setVisited(prev => [...prev, currentQuestionIndex]);
    }
  }, [currentQuestionIndex]);





  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleAnswer = useCallback((optionIndex: number) => {
    if (currentMode === 'practice' && answersRef.current[currentQuestionIndex] !== undefined) return;
    
    setAnswers(prev => ({ ...prev, [currentQuestionIndex]: optionIndex }));
    if (currentMode === 'practice') {
      setShowExplanation(true);
    }
  }, [currentMode, currentQuestionIndex]);

  const toggleMarkForReview = useCallback(() => {
    setMarkedForReview(prev => 
      prev.includes(currentQuestionIndex)
        ? prev.filter(i => i !== currentQuestionIndex)
        : [...prev, currentQuestionIndex]
    );
  }, [currentQuestionIndex]);

  const handleClearResponse = useCallback(() => {
    setAnswers(prev => {
      const copy = { ...prev };
      delete copy[currentQuestionIndex];
      return copy;
    });
  }, [currentQuestionIndex]);

  const topicDistribution = useMemo(() => {
    let polity = 0;
    let geography = 0;
    let historyCount = 0;
    let math = 0;
    let general = 0;

    (test?.questions || []).forEach(q => {
      const txt = q.questionText.toLowerCase();
      if (txt.includes('article') || txt.includes('president') || txt.includes('governor') || txt.includes('amendment') || txt.includes('constitution') || txt.includes('legislature') || txt.includes('parliament') || txt.includes('court') || txt.includes('high court')) {
        polity++;
      } else if (txt.includes('river') || txt.includes('lake') || txt.includes('soil') || txt.includes('district') || txt.includes('forest') || txt.includes('dam') || txt.includes('national park') || txt.includes('climate') || txt.includes('geography') || txt.includes('mineral')) {
        geography++;
      } else if (txt.includes('war') || txt.includes('battle') || txt.includes('rebellion') || txt.includes('independence') || txt.includes('dynasty') || txt.includes('king') || txt.includes('ashoka') || txt.includes('temple') || txt.includes('british') || txt.includes('freedom') || txt.includes('history')) {
        historyCount++;
      } else if (txt.includes('time') || txt.includes('work') || txt.includes('speed') || txt.includes('average') || txt.includes('ratio') || txt.includes('percent') || txt.includes('profit') || txt.includes('interest') || txt.includes('math') || txt.includes('arithmetic') || txt.includes('solve')) {
        math++;
      } else {
        general++;
      }
    });

    const total = test?.questions?.length || 0;
    if (total === 0) return [];

    return [
      { name: 'Polity & Constitution', count: polity, color: 'bg-indigo-500' },
      { name: 'Geography & Environment', count: geography, color: 'bg-emerald-500' },
      { name: 'History & Art', count: historyCount, color: 'bg-amber-500' },
      { name: 'Quantitative & Logic', count: math, color: 'bg-rose-500' },
      { name: 'General Awareness', count: general, color: 'bg-slate-500' }
    ].filter(t => t.count > 0).map(t => ({
      ...t,
      percentage: Math.round((t.count / total) * 100)
    }));
  }, [test?.questions]);

  const handleSubmit = useCallback(() => {
    const totalQuestions = test?.questions?.length || 0;
    const correctCount = Object.entries(answers).reduce((acc, [index, answer]) => {
      return acc + (answer === test?.questions?.[parseInt(index)]?.correctAnswerIndex ? 1 : 0);
    }, 0);
    const incorrectCount = Object.entries(answers).reduce((acc, [index, answer]) => {
      const isCorrect = answer === test?.questions?.[parseInt(index)]?.correctAnswerIndex;
      return acc + (answer !== null && answer !== undefined && !isCorrect ? 1 : 0);
    }, 0);
    const unansweredCount = totalQuestions - (correctCount + incorrectCount);

    const totalMarks = test?.totalMarks || totalQuestions;
    const marksPerQuestion = totalQuestions > 0 ? (totalMarks / totalQuestions) : 1;
    const negativeMarkingValue = test?.negativeMarking || 0;

    const obtainedMarks = correctCount * marksPerQuestion;
    const penaltyDeduction = incorrectCount * negativeMarkingValue;
    const finalScore = obtainedMarks - penaltyDeduction;

    const totalAttempted = correctCount + incorrectCount;
    const accuracy = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0;

    onComplete({
      score: finalScore,
      totalMarks: totalMarks,
      correctCount,
      incorrectCount,
      unansweredCount,
      obtainedMarks,
      penaltyDeduction,
      accuracy,
      total: totalQuestions,
      answers,
      timeTaken: currentMode === 'practice' && untimedPractice
        ? Object.keys(timeSpent).reduce((a, b) => a + (timeSpent[Number(b)] || 0), 0)
        : (test?.durationMinutes || 30) * 60 - timeLeft,
      timeSpent,
      markedForReview,
      test,
      mode: currentMode,
      isComplete: true
    });
  }, [test, answers, timeLeft, timeSpent, markedForReview, currentMode, untimedPractice, onComplete]);

  const handleExit = useCallback(() => {
    const questions = test?.questions || [];
    const answersById: Record<string, number> = {};
    const markedForReviewIds: string[] = [];
    const timeSpentById: Record<string, number> = {};
    const visitedIds: string[] = [];

    Object.entries(answers).forEach(([idxStr, val]) => {
      const idx = parseInt(idxStr);
      const q = questions[idx];
      if (q?.id) answersById[q.id] = val as number;
    });

    markedForReview.forEach(idx => {
      const q = questions[idx];
      if (q?.id) markedForReviewIds.push(q.id);
    });

    Object.entries(timeSpent).forEach(([idxStr, val]) => {
      const idx = parseInt(idxStr);
      const q = questions[idx];
      if (q?.id) timeSpentById[q.id] = val as number;
    });

    visited.forEach(idx => {
      const q = questions[idx];
      if (q?.id) visitedIds.push(q.id);
    });

    const currentQuestionId = questions[currentQuestionIndex]?.id || null;

    onExit({
      answers,
      answersById,
      timeLeft,
      timeSpent,
      timeSpentById,
      markedForReview,
      markedForReviewIds,
      visited,
      visitedIds,
      currentQuestionIndex,
      currentQuestionId,
      test,
      mode: currentMode,
      untimedPractice
    });
  }, [answers, timeLeft, timeSpent, markedForReview, visited, currentQuestionIndex, test, currentMode, untimedPractice, onExit]);

  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < (test?.questions?.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowExplanation(false);
    } else {
      setShowSubmitConfirm(true);
    }
  }, [currentQuestionIndex, test?.questions?.length]);

  const prevQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setShowExplanation(false);
    }
  }, [currentQuestionIndex]);

  const currentQuestion = test?.questions?.[currentQuestionIndex];

  // Keyboard Shortcuts for CBT Usability (30% Modern Usability Improvements)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSubmitConfirm || showExitConfirm) return;
      if (e.key >= '1' && e.key <= '4') {
        const idx = parseInt(e.key) - 1;
        if (currentQuestion && currentQuestion.options && currentQuestion.options[idx] !== undefined) {
          handleAnswer(idx);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        nextQuestion();
      } else if (e.key === 'ArrowLeft') {
        prevQuestion();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMarkForReview();
      } else if (e.key === 'c' || e.key === 'C') {
        handleClearResponse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionIndex, showSubmitConfirm, showExitConfirm, currentQuestion, handleAnswer, nextQuestion, prevQuestion, toggleMarkForReview]);

  if (!test || !test.questions || test.questions.length === 0) {
    return (
      <div className="fixed inset-0 bg-[#FBF9F6] z-[100] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-12 h-12 border-4 border-[#8A1C36]/20 border-t-[#8A1C36] rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-850">Preparing Practice Session...</h2>
        <p className="text-slate-500 text-sm mt-2">Loading your customized question bank. Please wait.</p>
      </div>
    );
  }

  if (!isStarted) {
    const fmt = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(2);
    return (
      <div className="fixed inset-0 bg-[#FBF9F6] z-[100] flex flex-col font-sans overflow-hidden">
        {/* Subtle grid and gradient meshes overlay */}
        <div className="absolute inset-0 pointer-events-none z-[1] opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle, rgba(138,28,54,0.3) 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-[#8a1c36]/5 to-transparent pointer-events-none z-[1]" />

        {/* Sticky Glassmorphic Header */}
        <header className="shrink-0 flex items-center justify-between px-6 py-4 sm:px-10 sm:py-5 border-b border-slate-200/60 bg-white/75 backdrop-blur-md z-20 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8a1c36]/5 border border-[#8a1c36]/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#8a1c36]" />
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block leading-none">Assessment System</span>
              <span className="text-slate-800 text-sm font-extrabold tracking-tight mt-1 block">General Briefing</span>
            </div>
          </div>
          <button 
            onClick={() => onExit(undefined)} 
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 transition-all duration-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 sm:px-10 py-8 sm:py-12 pb-28 sm:pb-32 relative z-10">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Motivation Header */}
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#8a1c36]/5 border border-[#8a1c36]/15 rounded-full text-[#8a1c36] text-[10px] font-black uppercase tracking-widest">
                <BookOpen className="w-3.5 h-3.5" /> {currentMode === 'practice' ? 'Practice Mode Active' : 'Official Mock Exam'}
              </div>
              <h1 className="text-3xl sm:text-4xl font-serif font-black text-slate-900 tracking-tight leading-tight">
                {test.title}
              </h1>
              <p className="text-slate-500 text-sm sm:text-base font-medium leading-relaxed">
                Review the marking rubrics, select your preparation mode, analyze the distribution of topics, and initiate when ready.
              </p>
            </div>

            {/* Mode Selection Panel */}
            <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-sm max-w-4xl mx-auto space-y-4">
              <div className="text-center">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block leading-none">Select Session Style</span>
                <h3 className="text-slate-800 text-base font-black tracking-tight mt-1.5">Choose How You Want to Study</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Exam Mode Option */}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentMode('mock');
                    setUntimedPractice(false);
                  }}
                  className={cn(
                    "p-5 rounded-2xl border-2 text-left transition-all duration-300 flex flex-col justify-between space-y-3 cursor-pointer",
                    currentMode === 'mock'
                      ? "border-[#8a1c36] bg-[#8a1c36]/5 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={cn(
                      "px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md border",
                      currentMode === 'mock'
                        ? "bg-[#8a1c36] border-[#8a1c36] text-white font-black"
                        : "bg-slate-100 border-slate-200 text-slate-500"
                    )}>
                      🏆 Exam Mode
                    </span>
                    <span className="text-[10px] font-black uppercase text-slate-400">Strict Timed</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">Official Exam Simulation</h4>
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-1">
                      Strict countdown timer. Negative markings apply. Answers and explanations will be shown only after you submit the test.
                    </p>
                  </div>
                </button>

                {/* Practice Mode Option */}
                <button
                  type="button"
                  onClick={() => setCurrentMode('practice')}
                  className={cn(
                    "p-5 rounded-2xl border-2 text-left transition-all duration-300 flex flex-col justify-between space-y-3 cursor-pointer",
                    currentMode === 'practice'
                      ? "border-emerald-500 bg-emerald-500/5 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={cn(
                      "px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md border",
                      currentMode === 'practice'
                        ? "bg-emerald-500 border-emerald-500 text-white font-black"
                        : "bg-slate-100 border-slate-200 text-slate-500"
                    )}>
                      📖 Practice Mode
                    </span>
                    <span className="text-[10px] font-black uppercase text-slate-400">Self-Paced</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">Interactive Self-Study</h4>
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-1">
                      Immediate feedback after each response. Detailed step-by-step solutions are shown instantly. Select timed or untimed practice.
                    </p>
                  </div>
                </button>
              </div>

              {/* Practice Mode Configurations */}
              {currentMode === 'practice' && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-6 animate-fade-in">
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 font-bold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={untimedPractice}
                      onChange={(e) => setUntimedPractice(e.target.checked)}
                      className="rounded text-[#8a1c36] focus:ring-[#8a1c36]/40 w-4 h-4 accent-[#8a1c36]"
                    />
                    <span>Untimed Session (Disable strict countdown timer)</span>
                  </label>
                </div>
              )}
            </div>

            {/* Asymmetric Columns (3:2 split) */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
              
              {/* Left Column: Brief details, rubrics, duration (Col Span 3) */}
              <div className="lg:col-span-3 space-y-6">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Questions', value: String(totalQs), sub: 'Total count' },
                    { label: 'Duration', value: currentMode === 'practice' && untimedPractice ? 'No Limit' : test.durationMinutes + ' min', sub: 'Countdown limit' },
                    { label: 'Total Marks', value: String(testTotalMarks), sub: 'Maximum raw' },
                  ].map(s => (
                    <div key={s.label} className="bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-2xl sm:text-3xl font-serif font-extrabold text-[#8a1c36] tracking-tight">{s.value}</div>
                      <div className="text-slate-800 text-[11px] font-extrabold uppercase tracking-wider mt-1.5">{s.label}</div>
                      <div className="text-slate-400 text-[10px] font-medium mt-0.5">{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Target Score & Attempts Planner */}
                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
                  <h3 className="text-slate-900 font-serif font-black flex items-center gap-2.5 text-base sm:text-lg">
                    <Target className="w-5 h-5 text-[#8a1c36]" /> Target Score & Attempts Planner
                  </h3>
                  <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                    Set your goal for this session and analyze your permitted room for error under negative marking conditions.
                  </p>
                  
                  <div className="space-y-4 pt-1">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-500">Your Target Score Goal:</span>
                      <span className="text-[#8a1c36] font-black text-sm">{targetScore} / {testTotalMarks} Marks ({Math.round(targetScore / testTotalMarks * 100)}%)</span>
                    </div>
                    
                    <input
                      type="range"
                      min={Math.round(testTotalMarks * 0.5)}
                      max={testTotalMarks}
                      step={1}
                      value={targetScore}
                      onChange={(e) => setTargetScore(parseInt(e.target.value))}
                      className="w-full accent-[#8a1c36] h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                    />
                    
                    {/* Calculation Output Cards */}
                    {(() => {
                      const minCorrect = Math.ceil(targetScore / marksPerQ);
                      const maxIncorrect = negMarkVal > 0 
                        ? Math.floor((testTotalMarks - targetScore) / (marksPerQ + negMarkVal))
                        : totalQs - minCorrect;
                      
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                          <div className="bg-[#FBF9F6] border border-slate-200/40 rounded-xl p-3.5 space-y-1">
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Min. Correct Needed</span>
                            <div className="text-slate-800 text-base font-black">{minCorrect} Questions</div>
                            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                              You must answer at least {minCorrect} questions correctly to meet your target.
                            </p>
                          </div>
                          
                          <div className="bg-[#FBF9F6] border border-slate-200/40 rounded-xl p-3.5 space-y-1">
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Max Allowed Mistakes</span>
                            <div className="text-slate-800 text-base font-black">{maxIncorrect >= 0 ? maxIncorrect : 0} Questions</div>
                            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                              If you attempt every question, you can afford at most {maxIncorrect >= 0 ? maxIncorrect : 0} mistakes under penalty.
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Automated Topic Distribution Visualizer */}
                {topicDistribution.length > 0 && (
                  <div className="bg-white border border-slate-200/60 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
                    <h3 className="text-slate-900 font-serif font-black flex items-center gap-2.5 text-base sm:text-lg">
                      <BookOpen className="w-5 h-5 text-[#8a1c36]" /> Syllabus Topic Breakdown
                    </h3>
                    <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                      Analysis of this test paper showing the concentration of core syllabus topics.
                    </p>
                    
                    {/* Visual Segmented Bar */}
                    <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200/40 mt-1">
                      {topicDistribution.map((t) => (
                        <div
                          key={t.name}
                          className={t.color}
                          style={{ width: `${t.percentage}%` }}
                          title={`${t.name}: ${t.count} Qs (${t.percentage}%)`}
                        />
                      ))}
                    </div>
                    
                    {/* Legends Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                      {topicDistribution.map((t) => (
                        <div key={t.name} className="flex items-center gap-2 text-[10px] sm:text-[11px] font-semibold text-slate-600">
                          <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", t.color)} />
                          <span className="truncate">{t.name}:</span>
                          <span className="text-slate-800 font-extrabold">{t.count} Qs ({t.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Marking Rubric Details */}
                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
                  <h3 className="text-slate-900 font-serif font-black flex items-center gap-2.5 text-base sm:text-lg">
                    <Target className="w-5 h-5 text-[#8a1c36]" /> Marking Rubric & Scoring
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-250 rounded-xl p-3.5">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-emerald-700 text-[10px] font-bold uppercase tracking-wider">Correct Answer</div>
                        <div className="text-slate-900 font-extrabold text-base sm:text-lg mt-0.5">+{fmt(marksPerQ)}</div>
                      </div>
                    </div>

                    <div className={cn(
                      'flex items-center gap-3 rounded-xl p-3.5 border', 
                      negMarkVal > 0 
                        ? 'bg-rose-50/60 border-rose-100' 
                        : 'bg-slate-50 border-slate-100'
                    )}>
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                        negMarkVal > 0 ? 'bg-rose-500/10' : 'bg-slate-200/50'
                      )}>
                        <TrendingDown className={cn('w-5 h-5', negMarkVal > 0 ? 'text-rose-600' : 'text-slate-400')} />
                      </div>
                      <div>
                        <div className={cn(
                          'text-[10px] font-bold uppercase tracking-wider', 
                          negMarkVal > 0 ? 'text-rose-700' : 'text-slate-400'
                        )}>Incorrect</div>
                        <div className="text-slate-900 font-extrabold text-base sm:text-lg mt-0.5">
                          {negMarkVal > 0 ? '-' + fmt(negMarkVal) : '0'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                      <div className="w-10 h-10 rounded-lg bg-slate-200/50 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Unanswered</div>
                        <div className="text-slate-900 font-extrabold text-base sm:text-lg mt-0.5">0</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Time Allocation details */}
                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
                  <h3 className="text-slate-900 font-serif font-black flex items-center gap-2.5 text-base sm:text-lg">
                    <Zap className="w-5 h-5 text-[#8a1c36]" /> Pace & Time Budget
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#FBF9F6] rounded-xl p-4 border border-slate-200/50">
                      <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Duration Budget</div>
                      <div className="text-slate-800 font-serif font-extrabold text-xl sm:text-2xl">
                        {currentMode === 'practice' && untimedPractice ? 'No Time Limit' : test.durationMinutes + ' minutes'}
                      </div>
                    </div>
                    <div className="bg-[#FBF9F6] rounded-xl p-4 border border-slate-200/50">
                      <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Target Pace</div>
                      <div className="text-slate-800 font-serif font-extrabold text-xl sm:text-2xl">
                        {avgSecsPerQ} <span className="text-xs font-sans font-semibold text-slate-400 uppercase tracking-widest ml-1">seconds / Q</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Instructions, start button (Col Span 2) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* CBT Keyboard Navigation Guide */}
                <div className="hidden sm:block bg-white border border-slate-200/60 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
                  <h3 className="text-slate-900 font-serif font-black text-base flex items-center gap-2">
                    <Zap className="w-4.5 h-4.5 text-amber-500" /> CBT Keyboard Shortcuts
                  </h3>
                  <p className="text-slate-500 text-[11px] font-semibold leading-relaxed">
                     OdishaExamPrep CBT engine supports fully functional keyboard shortcuts for quick and efficient test-taking.
                  </p>
                  <div className="grid grid-cols-1 gap-2.5">
                    {[
                      { keys: ['1', '2', '3', '4'], desc: 'Select option A, B, C, or D' },
                      { keys: ['ArrowRight', 'Enter'], desc: 'Save Response & Next' },
                      { keys: ['ArrowLeft'], desc: 'Go Back to Previous' },
                      { keys: ['M'], desc: 'Flag Question for Review' },
                      { keys: ['C'], desc: 'Clear Current Response' }
                    ].map(sh => (
                      <div key={sh.desc} className="flex items-center gap-3 bg-slate-50 border border-slate-200/40 p-2.5 rounded-xl text-[11px] font-semibold">
                        <div className="flex gap-1 shrink-0">
                          {sh.keys.map(k => (
                            <kbd key={k} className="px-1.5 py-0.5 bg-white border border-slate-300 shadow-sm rounded text-[9px] font-black text-slate-700 font-mono">{k}</kbd>
                          ))}
                        </div>
                        <span className="text-slate-600 font-medium leading-tight">{sh.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Instructions Panel */}
                <div className="bg-white border border-slate-200/60 rounded-3xl p-6 space-y-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#8a1c36]/3 rounded-full blur-2xl pointer-events-none" />
                  
                  <h3 className="text-slate-900 font-serif font-black text-lg">Instructions for Candidates</h3>
                  
                  <ul className="space-y-4">
                    {[
                      'Read each problem statement carefully before selecting options.',
                      'You can bookmark questions for review and return to them anytime.',
                      currentMode === 'practice' && untimedPractice ? 'You are taking this session as an untimed practice.' : 'The count-down timer starts instantly when you click the Start button.',
                      'Closing the browser pauses progress; you can resume from your dashboard.',
                      negMarkVal > 0 && currentMode === 'mock' ? `Incorrect responses incur a penalty of ${fmt(negMarkVal)} marks.` : 'There are no scoring penalties for incorrect answers in Practice mode.',
                      'The question palette is available for quick vertical navigation.',
                    ].map((ins, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                        <span className="w-5.5 h-5.5 rounded-full bg-[#8a1c36]/10 flex items-center justify-center shrink-0 text-[#8a1c36] text-[11px] font-extrabold font-serif mt-0.5">
                          {i + 1}
                        </span>
                        <span>{ins}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

            </div>

          </div>
        </div>

        {/* Sticky Fixed Bottom Start Button Container */}
        <div className="shrink-0 p-6 bg-white/80 backdrop-blur-md border-t border-slate-200/60 z-20 flex justify-center shadow-[0_-8px_30px_rgba(0,0,0,0.02)]">
          <button
            onClick={() => setIsStarted(true)}
            className="max-w-3xl w-full py-4 sm:py-4.5 rounded-2xl bg-[#8a1c36] hover:bg-[#76142c] text-white font-black text-sm sm:text-base transition-all duration-300 shadow-lg shadow-[#8a1c36]/20 flex items-center justify-center gap-2.5 active:scale-[0.98] cursor-pointer premium-btn-transition"
          >
            <Play className="w-4.5 h-4.5 fill-white" /> Initiate Session
          </button>
        </div>
      </div>
    );
  }  return (
    <div className="fixed inset-0 bg-[#FBF9F6] z-[100] flex flex-col font-sans overflow-hidden">
      {/* Subtle print grid texture overlay */}
      <div className="absolute inset-0 pointer-events-none z-[1] opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, rgba(138,28,54,0.3) 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
      
      {/* Header (CBT Candidate + Exam details) */}
      <header className="h-20 bg-white/85 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-6 sm:px-8 shrink-0 sticky top-0 z-40 relative shadow-sm">
        {/* Scroll Progress Bar */}
        <div ref={progressBarRef} className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8a1c36] origin-left transition-transform duration-75 ease-out scale-x-0 z-50" />

        <div className="flex items-center gap-3 sm:gap-4 relative z-10">
          <button 
            onClick={() => setShowExitConfirm(true)} 
            className="p-2.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded-xl transition-all duration-200 cursor-pointer text-slate-500 hover:text-[#8a1c36]"
            title="Exit Assessment"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-serif font-extrabold text-slate-900 truncate max-w-[140px] sm:max-w-[300px] lg:max-w-[400px] tracking-tight leading-tight">{test.title}</h1>
            <p className="text-[10px] font-black text-[#8A1C36] uppercase tracking-widest leading-none mt-1">Subject: General Awareness</p>
          </div>
        </div>

        {/* Central Official Timer */}
        <div className="flex items-center gap-2.5 sm:gap-4 relative z-10">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-black text-sm sm:text-base border transition-all duration-300 shadow-sm",
            currentMode === 'practice' && untimedPractice
              ? "bg-emerald-50 text-emerald-700 border-emerald-250"
              : timeLeft < 60
                ? "bg-rose-50 text-rose-600 border-rose-200"
                : timeLeft < 300
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-slate-50 text-slate-700 border-slate-200/80"
          )}>
            <Timer className={cn("w-4.5 h-4.5 text-[#8A1C36]", timeLeft < 300 && !(currentMode === 'practice' && untimedPractice) && "animate-pulse")} />
            <span className="hidden sm:inline text-[11px] font-black uppercase text-slate-400 font-sans tracking-wider leading-none mt-0.5">
              {currentMode === 'practice' && untimedPractice ? "Time Elapsed:" : "Time Left:"}
            </span>
            <span className="tracking-widest">
              {currentMode === 'practice' && untimedPractice 
                ? formatTime(Object.keys(timeSpent).reduce((a, b) => a + (timeSpent[Number(b)] || 0), 0))
                : formatTime(timeLeft)}
            </span>
          </div>

          <button 
            onClick={() => setShowSubmitConfirm(true)}
            className="bg-[#8a1c36] hover:bg-[#76142c] text-white px-5 py-2.5 sm:px-6 rounded-xl font-bold transition-all duration-300 text-xs sm:text-sm uppercase tracking-widest cursor-pointer shadow-md shadow-[#8a1c36]/10 hover:shadow-lg hover:shadow-[#8a1c36]/20 active:scale-95 flex items-center gap-2"
          >
            <Send className="w-4 h-4" /> Submit
          </button>
        </div>
      </header>

      {/* Split CBT Layout Container */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Left Side: Question Pane */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent border-r border-slate-200/60">
          {/* Question Scoring Info Bar */}
          <div className="h-10 sm:h-12 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between px-6 sm:px-8 text-xs font-bold text-slate-500 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8A1C36]" />
              <span>Multiple Choice Question (MCQ)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100">Correct: +{marksPerQ.toFixed(2)}</span>
              {negMarkVal > 0 && <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-100">Negative: -{negMarkVal.toFixed(2)}</span>}
            </div>
          </div>

          {/* ── Adaptive Main Content Area ──
               Detects complex/math-heavy questions and switches layout automatically.
               - Normal questions: side-by-side grid (question left, options right)
               - Math-heavy questions: stacked full-width (question top, options below)
          */}
          {(() => {
            const mathHeavy = isMathHeavyQuestion(currentQuestion?.questionText || '') || !!currentQuestion?.diagram;
            const mathBlockCount = countMathBlocks(currentQuestion?.questionText || '');
            const useCompactBlocks = mathBlockCount >= 2;
            const paragraphs = (currentQuestion?.questionText || '').split('\n\n').filter(Boolean);

            return (
              <main className={cn(
                "flex-1 px-2 py-3 sm:p-5 lg:p-6 relative bg-[#FBF9F6] flex flex-col",
                mathHeavy ? "overflow-y-auto no-scrollbar" : "overflow-hidden"
              )}>
                <div className={cn(
                  "max-w-4xl lg:max-w-6xl mx-auto w-full flex flex-col space-y-2.5 sm:space-y-3 lg:space-y-4",
                  !mathHeavy && "h-full overflow-hidden"
                )}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentQuestionIndex}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        "flex flex-col gap-3 sm:gap-4",
                        !mathHeavy && "lg:grid lg:grid-cols-2 lg:grid-rows-1 lg:gap-8 lg:h-full min-h-0 flex-1"
                      )}
                    >
                      {/* ── Question Panel ── */}
                      <div className={cn(
                        "bg-white rounded-xl sm:rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow flex flex-col space-y-2.5 sm:space-y-3",
                        mathHeavy
                          ? "px-3 py-4 sm:p-6"
                          : "px-2.5 py-3 sm:p-5 flex-shrink-0 lg:flex-1 lg:h-full lg:max-h-none overflow-hidden"
                      )}>
                        {/* Question label + Math badge */}
                        <div className="flex items-center justify-between flex-shrink-0">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-[#8A1C36] bg-[#8A1C36]/5 rounded-lg border border-[#8A1C36]/15">
                            <FileText className="w-4 h-4 animate-pulse-soft" />
                            Question {currentQuestionIndex + 1} of {test.questions.length}
                          </span>
                          {mathHeavy && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg">
                              <span className="text-sm leading-none select-none">∑</span> Math
                            </span>
                          )}
                        </div>

                        {/* Question text with smart paragraph rendering */}
                        <div
                          ref={questionTextRef}
                          className={cn(
                            "text-base sm:text-lg lg:text-xl font-serif font-extrabold text-slate-900 leading-relaxed break-words overflow-wrap-anywhere",
                            !mathHeavy && "flex-1 overflow-y-auto pr-2 no-scrollbar"
                          )}
                        >
                          {paragraphs.map((para, i) => (
                            <p key={i} className="mb-3 last:mb-0">
                              <MathTextRenderer
                                text={para}
                                blockSize={useCompactBlocks ? 'sm' : 'md'}
                              />
                            </p>
                          ))}
                          {(() => {
                            const question = currentQuestion;
                            console.log("QUESTION", question);
                            console.log("DIAGRAM", question?.diagram);
                            console.log("TYPE", question?.diagram?.type);
                            return null;
                          })()}
                          {currentQuestion?.diagram ? (
                            <div className="mt-4 sm:mt-5 w-full block">
                              <DiagramRenderer
                                diagram={currentQuestion.diagram}
                                data={currentQuestion.diagram}
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* ── Options & Explanation ── */}
                      <div className={cn(
                        "space-y-3 lg:space-y-4",
                        !mathHeavy && "flex-1 overflow-y-auto no-scrollbar min-h-0 py-1 lg:h-full flex flex-col justify-start",
                        mathHeavy && "py-1"
                      )}>
                        <div className={cn(
                          "grid gap-2 lg:gap-2.5",
                          mathHeavy ? "sm:grid-cols-2" : "max-w-3xl"
                        )}>
                          {(currentQuestion?.options || []).map((option, idx) => {
                            const isSelected = answers[currentQuestionIndex] === idx;
                            const isCorrect = idx === currentQuestion?.correctAnswerIndex;
                            const showResult = currentMode === 'practice' && answers[currentQuestionIndex] !== undefined;

                            return (
                              <button
                                key={`q${currentQuestionIndex}-o${idx}`}
                                onClick={() => handleAnswer(idx)}
                                className={cn(
                                  "mcq-option group w-full text-left py-2 px-3.5 sm:py-2.5 sm:px-4 rounded-xl border transition-all duration-300 relative cursor-pointer select-none flex items-center gap-3 sm:gap-4 shadow-sm",
                                  showResult
                                    ? isCorrect 
                                      ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm" 
                                      : isSelected ? "border-rose-500 bg-rose-50 text-rose-900 shadow-sm" : "border-slate-200 bg-white"
                                    : isSelected 
                                      ? "border-[#8A1C36] bg-gradient-to-r from-[#8A1C36]/5 to-white text-slate-900 shadow-md ring-1 ring-[#8A1C36]" 
                                      : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50/50 hover:shadow-md"
                                )}
                              >
                                <div className={cn(
                                  "w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition-all duration-300 pointer-events-none",
                                  showResult
                                    ? isCorrect 
                                      ? "bg-emerald-600 text-white" 
                                      : isSelected ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-400"
                                    : isSelected 
                                      ? "bg-[#8A1C36] text-white" 
                                      : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/70"
                                )}>
                                  {String.fromCharCode(65 + idx)}
                                </div>
                                
                                <span className={cn(
                                  "flex-1 text-slate-800 text-sm sm:text-base transition-all pointer-events-none",
                                  isSelected ? "font-bold text-slate-900" : "font-medium text-slate-600 group-hover:text-slate-900"
                                )}><MathTextRenderer text={option} isOption /></span>
                                
                                {showResult && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 pointer-events-none" />}
                                {showResult && isSelected && !isCorrect && <X className="w-5 h-5 text-rose-600 shrink-0 pointer-events-none" />}
                                
                                {!showResult && (
                                  <span className={cn(
                                    "text-[10px] font-mono font-black border px-2 py-0.5 rounded-md hidden sm:inline ml-auto select-none transition-all duration-300 pointer-events-none",
                                    isSelected 
                                      ? "border-[#8A1C36]/30 bg-[#8A1C36]/5 text-[#8A1C36]" 
                                      : "border-slate-200 bg-slate-50 text-slate-400 opacity-0 group-hover:opacity-100"
                                  )}>
                                    Press {idx + 1}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {showExplanation && (
                          <motion.div {...fadeSlideUp}
                            className="math-explanation rounded-2xl border border-slate-200/60 bg-white p-5 sm:p-6 space-y-3 relative overflow-hidden shadow-sm"
                          >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#8A1C36]/3 rounded-full blur-2xl pointer-events-none" />
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                              </div>
                              <div>
                                <h4 className="font-serif font-black text-slate-900 text-base leading-none">Expert Explanation</h4>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 block">Solution Breakdown</span>
                              </div>
                            </div>
                            <p className="text-slate-700 text-sm sm:text-base leading-relaxed font-serif font-medium border-l-4 border-[#8A1C36] pl-4 py-1">
                              <MathTextRenderer text={currentQuestion?.explanation} />
                            </p>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </main>
            );
          })()}


          {/* Bottom Official Exam Navigation Footer */}
          <div className="shrink-0 bg-white border-t border-slate-200/80 py-2 px-4 sm:py-3 sm:px-8 shadow-sm">
            <div className="max-w-4xl lg:max-w-6xl mx-auto">
              
              {/* Mobile View Navigation (hidden on lg and above) */}
              <div className="flex flex-col gap-3 lg:hidden w-full">
                {/* Upper row: Utility functions */}
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={toggleMarkForReview}
                    className={cn(
                      "py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border flex items-center justify-center gap-1.5 cursor-pointer",
                      markedForReview.includes(currentQuestionIndex)
                        ? "bg-amber-50 border-amber-200 text-amber-700 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span className="truncate">Mark</span>
                  </button>
                  
                  <button 
                    onClick={handleClearResponse}
                    className="py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span className="truncate">Clear</span>
                  </button>

                  <button 
                    onClick={() => setShowMobilePalette(true)}
                    className="py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="truncate">Palette</span>
                  </button>
                </div>

                {/* Lower row: Primary navigation */}
                <div className="grid grid-cols-5 gap-2">
                  <button 
                    disabled={currentQuestionIndex === 0}
                    onClick={prevQuestion}
                    className="col-span-2 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button 
                    onClick={nextQuestion}
                    className="col-span-3 bg-[#8a1c36] hover:bg-[#76142c] text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-[#8a1c36]/10 active:scale-95 flex items-center justify-center gap-1 cursor-pointer font-extrabold"
                  >
                    {currentQuestionIndex === test.questions.length - 1 ? 'Save & Submit' : 'Save & Next'} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Desktop View Navigation (hidden below lg) */}
              <div className="hidden lg:flex w-full items-center justify-between">
                {/* Left group */}
                <div className="flex gap-2.5">
                  <button 
                    onClick={toggleMarkForReview}
                    className={cn(
                      "px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer border flex items-center gap-1.5",
                      markedForReview.includes(currentQuestionIndex)
                        ? "bg-amber-50 border-amber-200 text-amber-700 shadow-sm"
                        : "bg-white hover:bg-amber-50/50 border-slate-200 hover:border-amber-200 text-slate-600 hover:text-amber-700"
                    )}
                  >
                    <Flag className="w-3.5 h-3.5" /> Mark for Review
                  </button>
                  <button 
                    onClick={handleClearResponse}
                    className="bg-white border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer"
                  >
                    Clear Answer
                  </button>
                </div>

                {/* Right group */}
                <div className="flex gap-2.5">
                  <button 
                    disabled={currentQuestionIndex === 0}
                    onClick={prevQuestion}
                    className="bg-white border border-slate-200 hover:border-slate-300 text-slate-600 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button 
                    onClick={nextQuestion}
                    className="bg-[#8a1c36] hover:bg-[#76142c] text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-md shadow-[#8a1c36]/10 hover:shadow-lg active:scale-95 flex items-center gap-1 font-extrabold"
                  >
                    {currentQuestionIndex === test.questions.length - 1 ? 'Save & Submit' : 'Save & Next'} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Side: CBT Candidate Profile & Question Palette (Premium Redesign) */}
        <aside className="w-80 bg-white flex flex-col shrink-0 hidden lg:flex border-l border-slate-200/60">
          
          {/* Candidate Card */}
          <div className="p-5 border-b border-slate-200/60 flex items-center gap-3.5 bg-slate-50/50">
            <div className="w-12 h-12 bg-gradient-to-tr from-[#8a1c36] to-[#76142c] text-white rounded-2xl font-serif font-black flex items-center justify-center text-lg shadow-sm border border-[#8a1c36]/10">
              {user?.user_metadata?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'N'}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Session Active</p>
              <h4 className="font-serif font-black text-slate-800 truncate max-w-[190px] text-sm mt-1">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Naresh Samal"}</h4>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Candidate Verified</span>
              </div>
            </div>
          </div>

          {/* Palette Grid Header */}
          <div className="p-4.5 border-b border-slate-100 flex items-center justify-between shrink-0">
            <h3 className="font-serif font-black text-xs text-slate-900 uppercase tracking-wider">Question Palette</h3>
            <span className="text-[10px] font-black text-[#8A1C36] bg-[#8A1C36]/5 border border-[#8A1C36]/10 px-2 py-0.5 rounded-md tracking-wider tabular-nums">
              {answeredCount}/{test.questions.length} Saved
            </span>
          </div>

          <div ref={desktopPaletteRef} className="flex-1 overflow-y-auto px-5 py-4 no-scrollbar palette-scroll">
            <div className="grid grid-cols-4 gap-3">
              {test.questions.map((_, idx) => {
                const isAnswered = answers[idx] !== undefined;
                const isMarked = markedForReview.includes(idx);
                const isCurrent = currentQuestionIndex === idx;
                const isVisited = visited.includes(idx);

                let btnStyle = "";
                let badgeElement = null;

                if (isAnswered && isMarked) {
                  // Answered & Marked for Review (Yellow/Amber bg + Green Check badge)
                  btnStyle = "bg-amber-50 text-amber-800 border border-amber-300 rounded-xl font-bold hover:bg-amber-100/60";
                  badgeElement = <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border border-white flex items-center justify-center text-[8px] text-white font-black shadow-sm">✓</span>;
                } else if (isMarked) {
                  // Marked for Review (Yellow/Amber bg + Amber exclamation badge)
                  btnStyle = "bg-amber-50 text-amber-800 border border-amber-300 rounded-xl font-bold hover:bg-amber-100/60";
                  badgeElement = <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border border-white flex items-center justify-center text-[8px] text-white font-black shadow-sm">!</span>;
                } else if (isAnswered) {
                  // Answered (Green bg)
                  btnStyle = "bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold hover:bg-emerald-100/60";
                } else if (isVisited) {
                  // Not Answered but Visited (Rose bg)
                  btnStyle = "bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-bold hover:bg-rose-100/60";
                } else {
                  // Not Visited (Gray bg)
                  btnStyle = "bg-slate-50 text-slate-400 border border-slate-200/80 rounded-xl font-bold hover:border-slate-300 hover:bg-slate-100/50";
                }

                if (isCurrent) {
                  btnStyle += " ring-2 ring-offset-2 ring-[#8A1C36] scale-105 z-10 shadow-sm";
                }

                return (
                  <button
                    key={idx}
                    data-qidx={idx}
                    onClick={() => {
                      setCurrentQuestionIndex(idx);
                      setShowExplanation(false);
                    }}
                    className={cn(
                      "w-11 h-11 text-xs transition-all relative flex items-center justify-center cursor-pointer",
                      btnStyle
                    )}
                  >
                    {badgeElement}
                    <span>{idx + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CBT Legend Box */}
          <div className="p-5 border-t border-slate-200/60 bg-slate-50/50 space-y-3 shrink-0">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Legend Overview</h4>
            <div className="grid grid-cols-2 gap-2.5 text-[10px] font-bold text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-lg bg-emerald-50 border border-emerald-200 shrink-0" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-lg bg-rose-50 border border-rose-200 shrink-0" />
                <span>Not Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-lg bg-slate-50 border border-slate-200 shrink-0" />
                <span>Not Visited</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-lg bg-amber-50 border border-amber-300 shrink-0 relative flex items-center justify-center">
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-500 rounded-full border border-white" />
                </span>
                <span>Marked</span>
              </div>
              <div className="flex items-center gap-1.5 col-span-2">
                <span className="w-5 h-5 rounded-lg bg-amber-50 border border-amber-300 shrink-0 relative flex items-center justify-center">
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white flex items-center justify-center text-[5px] text-white font-black">✓</span>
                </span>
                <span>Marked & Answered</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Palette Bottom Sheet */}
      <AnimatePresence>
        {showMobilePalette && (
          <div className="fixed inset-0 bg-slate-950/40 z-[100] flex flex-col justify-end lg:hidden backdrop-blur-sm">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="bg-white rounded-t-[2rem] shadow-2xl border-t border-slate-200/60 flex flex-col max-h-[85vh]"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-12 h-1 rounded-full bg-slate-200" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-3 pb-4 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="font-serif font-black text-slate-900 text-lg tracking-tight">Question Palette</h3>
                  <p className="text-xs text-slate-400 font-bold mt-0.5 uppercase tracking-wide">
                    {answeredCount} saved · {markedForReview.length} marked · {test.questions.length - answeredCount} left
                  </p>
                </div>
                <button onClick={() => setShowMobilePalette(false)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-slate-500 hover:text-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Palette grid */}
              <div ref={mobilePaletteRef} className="overflow-y-auto px-6 py-5 flex-1 no-scrollbar palette-scroll">
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-3">
                  {test.questions.map((_, idx) => {
                    const isAnswered = answers[idx] !== undefined;
                    const isMarked = markedForReview.includes(idx);
                    const isCurrent = currentQuestionIndex === idx;
                    const isVisited = visited.includes(idx);

                    let btnStyle = "";
                    let badgeElement = null;

                    if (isAnswered && isMarked) {
                      // Answered & Marked for Review
                      btnStyle = "bg-amber-50 text-amber-800 border border-amber-300 rounded-xl font-bold";
                      badgeElement = <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border border-white flex items-center justify-center text-[8px] text-white font-black shadow-sm">✓</span>;
                    } else if (isMarked) {
                      // Marked for Review
                      btnStyle = "bg-amber-50 text-amber-800 border border-amber-300 rounded-xl font-bold";
                      badgeElement = <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border border-white flex items-center justify-center text-[8px] text-white font-black shadow-sm">!</span>;
                    } else if (isAnswered) {
                      btnStyle = "bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold";
                    } else if (isVisited) {
                      btnStyle = "bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-bold";
                    } else {
                      btnStyle = "bg-slate-50 text-slate-400 border border-slate-200/80 rounded-xl font-bold";
                    }

                    if (isCurrent) {
                      btnStyle += " ring-2 ring-offset-2 ring-[#8A1C36] scale-105 z-10";
                    }

                    return (
                      <button
                        key={idx}
                        data-qidx={idx}
                        onClick={() => {
                          setCurrentQuestionIndex(idx);
                          setShowExplanation(false);
                          setShowMobilePalette(false);
                        }}
                        className={cn(
                          "w-11 h-11 text-xs relative flex items-center justify-center cursor-pointer mx-auto transition-all",
                          btnStyle
                        )}
                      >
                        {badgeElement}
                        <span>{idx + 1}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="px-6 py-5 border-t border-slate-200 bg-slate-50/50 shrink-0">
                <div className="grid grid-cols-2 gap-2.5 text-[10px] font-bold text-slate-600 max-w-sm mx-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-lg bg-emerald-50 border border-emerald-250 shrink-0" />
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-lg bg-rose-50 border border-rose-200 shrink-0" />
                    <span>Not Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-lg bg-slate-50 border border-slate-200 shrink-0" />
                    <span>Not Visited</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-lg bg-amber-50 border border-amber-300 shrink-0 relative flex items-center justify-center">
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-500 rounded-full border border-white animate-pulse-soft" />
                    </span>
                    <span>Marked</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Submit Confirmation Modal */}
      <AnimatePresence>
        {showSubmitConfirm && (
          <div className="fixed inset-0 bg-slate-950/40 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm">
            <motion.div {...modalContent}
              className="relative overflow-hidden rounded-3xl bg-white shadow-2xl max-w-md w-full border border-slate-200/80"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#8A1C36]/5 rounded-full blur-3xl pointer-events-none" />
              <div className="p-6 sm:p-8 text-center space-y-6 relative z-10">
                <div className="w-16 h-16 bg-[#8A1C36]/10 rounded-2xl flex items-center justify-center mx-auto border border-[#8A1C36]/20">
                  <Send className="text-[#8A1C36] w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-serif font-black text-slate-900 tracking-tight">Confirm Submission</h3>
                  <p className="text-slate-500 text-sm font-medium">
                    You have answered <span className="text-[#8A1C36] font-extrabold">{answeredCount}</span> out of <span className="text-slate-900 font-extrabold">{test.questions.length}</span> questions.
                  </p>
                </div>

                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#8A1C36] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(answeredCount / test.questions.length) * 100}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleSubmit}
                    className="w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-md shadow-emerald-600/10 hover:shadow-lg hover:shadow-emerald-600/20 active:scale-95 premium-btn-transition"
                  >
                    Submit Test Now
                  </button>
                  <button 
                    onClick={() => setShowSubmitConfirm(false)}
                    className="w-full py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 bg-slate-950/40 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm">
            <motion.div {...modalContent}
              className="relative overflow-hidden rounded-3xl bg-white shadow-2xl max-w-md w-full border border-slate-200/80"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#8A1C36]/5 rounded-full blur-3xl pointer-events-none" />
              <div className="p-6 sm:p-8 text-center space-y-6 relative z-10">
                <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto">
                  <LogOut className="text-slate-600 w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-serif font-black text-slate-900 tracking-tight">Pause & Exit Exam?</h3>
                  <p className="text-slate-500 text-sm font-medium">Your progress is automatically saved. You can easily resume exactly where you left off from your dashboard later.</p>
                </div>

                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200/60 shadow-sm">
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-600">
                    {answeredCount} of {test.questions.length} answered
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleExit}
                    className="w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider bg-[#8A1C36] hover:bg-[#76142c] text-white transition-all cursor-pointer shadow-md shadow-[#8A1C36]/10 hover:shadow-lg hover:shadow-[#8a1c36]/20 active:scale-95 premium-btn-transition"
                  >
                    Save & Exit Exam
                  </button>
                  <button 
                    onClick={() => setShowExitConfirm(false)}
                    className="w-full py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors rounded-xl cursor-pointer"
                  >
                    Keep Solving
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MockTestSystem;
