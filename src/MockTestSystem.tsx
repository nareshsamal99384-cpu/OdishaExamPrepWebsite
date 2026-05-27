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
import { Button } from './App';
import { fadeSlideUp, modalContent } from './lib/animations';

interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialState?.currentQuestionIndex || 0);
  const [answers, setAnswers] = useState<Record<number, number>>(initialState?.answers || {});
  const [markedForReview, setMarkedForReview] = useState<number[]>(initialState?.markedForReview || []);
  const [timeSpent, setTimeSpent] = useState<Record<number, number>>(initialState?.timeSpent || {});
  const [timeLeft, setTimeLeft] = useState(initialState?.timeLeft ?? test.durationMinutes * 60);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const [questionExpanded, setQuestionExpanded] = useState(false);
  const [questionOverflows, setQuestionOverflows] = useState(false);
  const questionTextRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  // Show overview only for new tests; skip if user is genuinely resuming saved progress
  const [isStarted, setIsStarted] = useState(() => {
    if (!initialState) return false;
    const hasAnswers = Object.keys(initialState.answers || {}).length > 0;
    const hasPartialTime = initialState.timeLeft !== undefined && initialState.timeLeft < test.durationMinutes * 60;
    return hasAnswers || hasPartialTime;
  });

  // Derived test settings used on both overview & sidebar
  const totalQs = test.questions.length;
  const testTotalMarks = useMemo(() => test.totalMarks || totalQs, [test.totalMarks, totalQs]);
  const marksPerQ = useMemo(() => totalQs > 0 ? testTotalMarks / totalQs : 1, [totalQs, testTotalMarks]);
  const negMarkVal = useMemo(() => test.negativeMarking || 0, [test.negativeMarking]);
  const avgSecsPerQ = useMemo(() => totalQs > 0 ? Math.round((test.durationMinutes * 60) / totalQs) : 0, [totalQs, test.durationMinutes]);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const markedCount = useMemo(() => markedForReview.length, [markedForReview]);
  const unansweredCount = useMemo(() => totalQs - answeredCount, [totalQs, answeredCount]);

  const mainRef = useRef<HTMLElement>(null);
  const desktopPaletteRef = useRef<HTMLDivElement>(null);
  const mobilePaletteRef = useRef<HTMLDivElement>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const scrollRafRef = useRef<number | null>(null);

  // Bulletproof smooth scroll to top on question change
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    // Cancel any in-progress scroll animation
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }

    // Schedule on next frame so AnimatePresence has started its transition
    const startRaf = requestAnimationFrame(() => {
      const start = el.scrollTop;
      if (start < 2) return;
      const duration = 200;
      const t0 = performance.now();

      function tick(now: number) {
        const p = Math.min((now - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.scrollTop = start * (1 - eased);
        if (p < 1) {
          scrollRafRef.current = requestAnimationFrame(tick);
        } else {
          scrollRafRef.current = null;
        }
      }

      scrollRafRef.current = requestAnimationFrame(tick);
    });

    return () => {
      cancelAnimationFrame(startRaf);
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [currentQuestionIndex]);

  // Track scroll progress within the main content area (zero-render DOM update, cached dimensions)
  useEffect(() => {
    const el = mainRef.current;
    const bar = progressBarRef.current;
    if (!el || !bar) return;

    let sh = el.scrollHeight;
    let ch = el.clientHeight;

    const updateDims = () => {
      sh = el.scrollHeight;
      ch = el.clientHeight;
    };

    let ticking = false;
    const handler = () => {
      if (ticking) return;
      requestAnimationFrame(() => {
        const maxScroll = sh - ch;
        bar.style.transform = `scaleX(${maxScroll > 0 ? Math.min(el.scrollTop / maxScroll, 1) : 0})`;
        ticking = false;
      });
      ticking = true;
    };

    handler();
    el.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', updateDims, { passive: true });

    return () => {
      el.removeEventListener('scroll', handler);
      window.removeEventListener('resize', updateDims);
    };
  }, []);

  useEffect(() => {
    if (!isStarted) return; // Don't tick timer on the overview screen
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
      setTimeSpent(prev => ({
        ...prev,
        [currentQuestionIndex]: (prev[currentQuestionIndex] || 0) + 1
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, [currentQuestionIndex, isStarted]);

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

  // Detect if current question text overflows its container
  useEffect(() => {
    setQuestionExpanded(false);
    const el = questionTextRef.current;
    if (el) {
      setQuestionOverflows(el.scrollHeight > 280);
    }
  }, [currentQuestionIndex]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleAnswer = useCallback((optionIndex: number) => {
    if (mode === 'practice' && answersRef.current[currentQuestionIndex] !== undefined) return;
    
    setAnswers(prev => ({ ...prev, [currentQuestionIndex]: optionIndex }));
    if (mode === 'practice') {
      setShowExplanation(true);
    }
  }, [mode, currentQuestionIndex]);

  const toggleMarkForReview = useCallback(() => {
    setMarkedForReview(prev => 
      prev.includes(currentQuestionIndex)
        ? prev.filter(i => i !== currentQuestionIndex)
        : [...prev, currentQuestionIndex]
    );
  }, [currentQuestionIndex]);

  const handleSubmit = useCallback(() => {
    const totalQuestions = test.questions.length;
    const correctCount = Object.entries(answers).reduce((acc, [index, answer]) => {
      return acc + (answer === test.questions[parseInt(index)].correctAnswerIndex ? 1 : 0);
    }, 0);
    const incorrectCount = Object.entries(answers).reduce((acc, [index, answer]) => {
      const isCorrect = answer === test.questions[parseInt(index)].correctAnswerIndex;
      return acc + (answer !== null && answer !== undefined && !isCorrect ? 1 : 0);
    }, 0);
    const unansweredCount = totalQuestions - (correctCount + incorrectCount);

    const totalMarks = test.totalMarks || totalQuestions;
    const marksPerQuestion = totalQuestions > 0 ? (totalMarks / totalQuestions) : 1;
    const negativeMarkingValue = test.negativeMarking || 0;

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
      timeTaken: test.durationMinutes * 60 - timeLeft,
      timeSpent,
      markedForReview,
      test,
      isComplete: true
    });
  }, [test, answers, timeLeft, timeSpent, markedForReview, onComplete]);

  const handleExit = useCallback(() => {
    onExit({
      answers,
      timeLeft,
      timeSpent,
      markedForReview,
      currentQuestionIndex,
      test
    });
  }, [answers, timeLeft, timeSpent, markedForReview, currentQuestionIndex, test, onExit]);

  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowExplanation(false);
    }
  }, [currentQuestionIndex, test.questions.length]);

  const prevQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setShowExplanation(false);
    }
  }, [currentQuestionIndex]);

  const currentQuestion = test.questions[currentQuestionIndex];

  if (!isStarted) {
    const fmt = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(2);
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-[100] flex flex-col font-sans overflow-hidden">
        {/* Header - Sticky */}
        <header className="shrink-0 flex items-center justify-between px-6 py-4 sm:px-10 sm:py-5 border-b border-white/10 bg-slate-900/90 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/20 border border-brand-400/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-brand-300" />
            </div>
            <span className="text-white/60 text-sm font-bold uppercase tracking-widest">Test Overview</span>
          </div>
          <button onClick={() => onExit(undefined)} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
            <X className="w-5 h-5 text-white/70" />
          </button>
        </header>

        {/* Scrollable Content area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-10 pb-28 sm:pb-32">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-500/20 border border-brand-400/30 rounded-full text-brand-300 text-xs font-black uppercase tracking-widest">
                <BookOpen className="w-3.5 h-3.5" /> {mode === 'practice' ? 'Practice Test' : 'Mock Test'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">{test.title}</h1>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Questions', value: String(totalQs) },
                { label: 'Duration', value: test.durationMinutes + ' min' },
                { label: 'Total Marks', value: String(testTotalMarks) },
              ].map(s => (
                <div key={s.label} className="bg-white/10 border border-white/20 rounded-2xl p-3 sm:p-4 text-center">
                  <div className="text-xl sm:text-3xl font-black text-white">{s.value}</div>
                  <div className="text-white/50 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Marking Scheme */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 sm:p-5 space-y-4">
              <h3 className="text-white font-extrabold flex items-center gap-2 text-sm sm:text-base">
                <Target className="w-5 h-5 text-brand-400" /> Marking Scheme
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-3 bg-emerald-500/15 border border-emerald-400/20 rounded-xl p-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-emerald-300 text-[10px] font-bold uppercase">Correct</div>
                    <div className="text-white font-black text-base sm:text-lg">+{fmt(marksPerQ)}</div>
                  </div>
                </div>
                <div className={cn('flex items-center gap-3 border rounded-xl p-3', negMarkVal > 0 ? 'bg-rose-500/15 border-rose-400/20' : 'bg-white/5 border-white/10')}>
                  <TrendingDown className={cn('w-5 h-5 shrink-0', negMarkVal > 0 ? 'text-rose-400' : 'text-white/30')} />
                  <div>
                    <div className={cn('text-[10px] font-bold uppercase', negMarkVal > 0 ? 'text-rose-300' : 'text-white/30')}>Wrong</div>
                    <div className={cn('font-black text-base sm:text-lg', negMarkVal > 0 ? 'text-white' : 'text-white/30')}>{negMarkVal > 0 ? '-' + fmt(negMarkVal) : 'No Penalty'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                  <AlertCircle className="w-5 h-5 text-white/30 shrink-0" />
                  <div>
                    <div className="text-white/30 text-[10px] font-bold uppercase">Skipped</div>
                    <div className="text-white/30 font-black text-base sm:text-lg">0</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Time Info */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 sm:p-5 space-y-4">
              <h3 className="text-white font-extrabold flex items-center gap-2 text-sm sm:text-base">
                <Zap className="w-5 h-5 text-amber-400" /> Time Allocation
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                  <div className="text-white/50 text-[10px] font-bold uppercase mb-1">Total Duration</div>
                  <div className="text-white font-black text-lg sm:text-xl">{test.durationMinutes} <span className="text-xs sm:text-sm font-bold text-white/40">minutes</span></div>
                </div>
                <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                  <div className="text-white/50 text-[10px] font-bold uppercase mb-1">Avg Per Question</div>
                  <div className="text-white font-black text-lg sm:text-xl">{avgSecsPerQ} <span className="text-xs sm:text-sm font-bold text-white/40">seconds</span></div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 sm:p-5 space-y-3">
              <h3 className="text-white font-extrabold text-sm sm:text-base">General Instructions</h3>
              <ul className="space-y-2">
                {[
                  'Read each question carefully before answering.',
                  'Mark questions for review and revisit them anytime.',
                  'Timer begins the moment you press Start Test.',
                  'Your progress is auto-saved if you exit early.',
                  negMarkVal > 0 ? `Each wrong answer deducts ${fmt(negMarkVal)} mark(s) — avoid guessing.` : 'No negative marking — attempt all questions.',
                  'Use the Question Palette to jump between questions.',
                ].map((ins, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs sm:text-sm text-white/65 font-medium">
                    <span className="w-5 h-5 rounded-full bg-brand-500/25 border border-brand-400/30 flex items-center justify-center shrink-0 mt-0.5 text-brand-300 text-[10px] font-black">{i + 1}</span>
                    {ins}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Sticky Fixed Bottom Start Button Container */}
        <div className="shrink-0 p-4 sm:p-6 bg-slate-900/90 backdrop-blur-md border-t border-white/10 z-20 flex justify-center shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
          <button
            onClick={() => setIsStarted(true)}
            className="max-w-3xl w-full py-4 sm:py-5 rounded-2xl bg-brand-500 hover:bg-brand-400 text-white font-black text-base sm:text-lg transition-all shadow-xl shadow-brand-500/20 flex items-center justify-center gap-2.5 active:scale-[0.98]"
          >
            <Play className="w-5 h-5 fill-white" /> Start Test Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-white to-brand-50/30 z-[100] flex flex-col font-sans overflow-hidden">
      {/* Decorative animated background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-48 -right-48 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] animate-float-slow" />
        <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] animate-float-gentle" style={{ animationDelay: '-3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-300/8 rounded-full blur-[150px] animate-orb" />
      </div>
      {/* Subtle dot-grid texture overlay */}
      <div className="absolute inset-0 pointer-events-none z-[1] opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle, rgba(124,58,237,0.3) 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' }} />
      {/* Header */}
      <header className="h-16 glass border-b border-slate-200/50 flex items-center justify-between px-4 sm:px-6 shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={() => setShowExitConfirm(true)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <X className="w-6 h-6 text-slate-500" />
          </button>
          <h1 className="font-extrabold text-slate-900 truncate max-w-[140px] sm:max-w-[200px] lg:max-w-none tracking-tight">{test.title}</h1>
        </div>

        {/* Question progress indicator */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-400">
          <span className="tabular-nums text-slate-600">{currentQuestionIndex + 1}</span>
          <span className="text-slate-300">/</span>
          <span className="tabular-nums">{test.questions.length}</span>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-6">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-mono font-extrabold text-sm sm:text-lg transition-all duration-500 relative overflow-hidden",
            timeLeft < 60
              ? "timer-urgent bg-red-50 text-red-600 border border-red-200"
              : timeLeft < 300
                ? "bg-amber-50 text-amber-700 border border-amber-200 shadow-sm shadow-amber-500/10"
                : "bg-white/80 text-slate-700 border border-slate-200/80 premium-shadow"
          )}>
            <Timer className={cn(
              "w-4 h-4 sm:w-5 sm:h-5 transition-all",
              timeLeft < 60 ? "animate-pulse" : timeLeft < 300 ? "animate-pulse" : ""
            )} />
            {formatTime(timeLeft)}
          </div>
          <button 
            onClick={() => setShowSubmitConfirm(true)}
            className="premium-gradient text-white px-5 py-2 sm:px-8 sm:py-2.5 rounded-xl font-extrabold hover:premium-glow shadow-lg shadow-brand-500/20 transition-all text-sm sm:text-base active:scale-95"
          >
            Submit
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Main Question Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent">
          <main ref={mainRef} className="flex-1 overflow-y-auto p-4 sm:p-10 pb-8 sm:pb-12 relative" style={{ willChange: 'scroll-position' }}>
            {/* Scroll progress indicator (zero-render DOM update) */}
            <div
              ref={progressBarRef}
              className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-400 via-brand-500 to-indigo-500 origin-left z-10 rounded-full shadow-[0_0_6px_rgba(124,58,237,0.3)]"
              style={{ transform: 'scaleX(0)' }}
            />
            <div className="max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto space-y-6 sm:space-y-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestionIndex}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.18, ease: 'easeInOut' }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-y-6 sm:gap-y-8 lg:gap-x-10 lg:items-start"
                >
                {/* Left Column: Question Text Card */}
                <div className="lg:col-span-6 lg:sticky lg:top-6 space-y-5">
                  {/* Question text card */}
                  <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/50 shadow-[0_10px_30px_rgba(0,0,0,0.02)] transition-shadow duration-300 hover:shadow-[0_10px_40px_rgba(124,58,237,0.04)] relative overflow-hidden">
                    {/* Subtle decorative gradient */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-brand-500/[0.04] rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/[0.03] rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none" />
                    {/* Question number + Mark for Review */}
                    <div className="flex items-center justify-between mb-5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-brand-600 bg-brand-50 rounded-full border border-brand-100">
                        <FileText className="w-3 h-3" />
                        Q{currentQuestionIndex + 1}/{test.questions.length}
                      </span>
                      <button 
                        onClick={toggleMarkForReview}
                        className={cn(
                          "flex items-center gap-1.5 text-xs font-bold transition-all px-2.5 py-1.5 rounded-lg",
                          markedForReview.includes(currentQuestionIndex) 
                            ? "bg-amber-50 text-amber-600 border border-amber-100" 
                            : "text-slate-400 hover:bg-slate-50 hover:text-slate-600 border border-transparent"
                        )}
                      >
                        <Flag className={cn("w-3 h-3", markedForReview.includes(currentQuestionIndex) && "fill-amber-600")} />
                        <span className="hidden sm:inline">Mark for Review</span>
                      </button>
                    </div>

                    {/* Question text with expand/collapse */}
                    <motion.div
                      animate={{ maxHeight: questionExpanded ? 9999 : 280 }}
                      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                      className="relative overflow-hidden"
                    >
                      <div
                        ref={questionTextRef}
                        className="text-lg sm:text-2xl md:text-3xl lg:text-2xl xl:text-3xl font-semibold sm:font-extrabold text-slate-900 leading-relaxed sm:leading-[1.3] tracking-tight break-words overflow-wrap-anywhere space-y-4"
                      >
                        {currentQuestion.questionText.split('\n\n').map((para, i) => (
                          <p key={i}>{para}</p>
                        ))}
                      </div>

                      {/* Gradient fade overlay when collapsed */}
                      {!questionExpanded && questionOverflows && (
                        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
                      )}
                    </motion.div>

                    {/* Expand/collapse button */}
                    {questionOverflows && (
                      <button
                        onClick={() => setQuestionExpanded(prev => !prev)}
                        className="mt-3 text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors flex items-center gap-1.5 group"
                      >
                        <span>{questionExpanded ? 'Show less' : 'Show more'}</span>
                        <motion.div
                          animate={{ rotate: questionExpanded ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </motion.div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Column: Options & Explanation */}
                <div className="lg:col-span-6 space-y-6 sm:space-y-10 lg:space-y-6">
                  <div className="grid gap-3 sm:gap-4">
                    {currentQuestion.options.map((option, idx) => {
                      const isSelected = answers[currentQuestionIndex] === idx;
                      const isCorrect = idx === currentQuestion.correctAnswerIndex;
                      const showResult = mode === 'practice' && answers[currentQuestionIndex] !== undefined;

                      return (
                        <motion.button
                          key={`q${currentQuestionIndex}-o${idx}`}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.25, delay: idx * 0.05, ease: 'easeOut' }}
                          onClick={() => handleAnswer(idx)}
                          className={cn(
                            "option-card w-full text-left p-4 sm:p-5 rounded-2xl border-2 flex items-center gap-4 sm:gap-5 group relative overflow-hidden",
                            showResult
                              ? isCorrect 
                                ? "border-emerald-400 bg-emerald-50/80" 
                                : isSelected ? "border-red-400 bg-red-50/80" : "glass border-slate-200/50"
                              : isSelected 
                                ? "border-brand-500 bg-brand-50/80 shadow-md shadow-brand-500/10" 
                                : "glass border-slate-200/50 hover:border-brand-200 hover:shadow-md hover:shadow-brand-500/5"
                          )}
                        >
                          {/* Shimmer on hover for non-selected */}
                          {!isSelected && !showResult && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                          )}

                          <div className={cn(
                            "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-extrabold text-sm sm:text-base shrink-0 transition-all duration-300 relative",
                            showResult
                              ? isCorrect 
                                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                                : isSelected ? "bg-red-500 text-white shadow-md shadow-red-500/20" : "bg-slate-100 text-slate-500"
                              : isSelected 
                                ? "premium-gradient text-white premium-glow-sm" 
                                : "bg-slate-100 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600 group-hover:scale-105"
                          )}>
                            {String.fromCharCode(65 + idx)}
                            <kbd className="absolute -bottom-0.5 -right-0.5 text-[7px] leading-none font-bold bg-white border border-slate-200 rounded-[3px] px-[2px] py-[0.5px] text-slate-400 shadow-sm">
                              {idx + 1}
                            </kbd>
                            {isSelected && !showResult && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white rounded-full border-2 border-brand-500 flex items-center justify-center"
                              >
                                <CheckCircle2 className="w-2 h-2 text-brand-600" />
                              </motion.div>
                            )}
                          </div>
                          <span className={cn(
                            "flex-1 text-[15px] sm:text-lg lg:text-base xl:text-lg font-medium sm:font-bold leading-relaxed",
                            isSelected ? "text-slate-900" : "text-slate-700"
                          )}>
                            {option}
                          </span>
                          {showResult && isCorrect && (
                            <motion.div
                              initial={{ scale: 0, rotate: -90 }}
                              animate={{ scale: 1, rotate: 0 }}
                              className="ml-auto bg-emerald-100 p-1.5 rounded-lg"
                            >
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            </motion.div>
                          )}
                          {showResult && isSelected && !isCorrect && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="ml-auto bg-red-100 p-1.5 rounded-lg"
                            >
                              <X className="w-5 h-5 text-red-600" />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  {showExplanation && (
                    <motion.div {...fadeSlideUp}
                      className="relative overflow-hidden rounded-3xl border border-brand-100/50 bg-gradient-to-br from-brand-50/80 to-white premium-shadow"
                    >
                      <div className="absolute top-0 right-0 w-40 h-40 bg-brand-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                      <div className="p-6 sm:p-8 space-y-4 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-brand-100 rounded-xl">
                            <AlertCircle className="w-5 h-5 text-brand-600" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-base sm:text-lg">Explanation</h4>
                            <p className="text-[11px] font-bold text-brand-500 uppercase tracking-widest">Step-by-step solution</p>
                          </div>
                        </div>
                        <div className="w-full h-px bg-gradient-to-r from-brand-200/50 via-brand-300/30 to-transparent" />
                        <p className="text-slate-700 text-base sm:text-lg leading-relaxed font-medium">
                          {currentQuestion.explanation}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </main>

          {/* Sticky Footer Navigation */}
          <div className="shrink-0 glass border-t border-slate-200/60 z-20 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
            {/* Progress bar */}
            <div className="h-1 bg-slate-100 relative overflow-hidden">
              <motion.div
                className="h-full premium-gradient absolute inset-y-0 left-0"
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestionIndex + 1) / test.questions.length) * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>

            <div className="p-4 sm:px-8 sm:py-5">
              <div className="flex justify-between items-center w-full">
                <button 
                  disabled={currentQuestionIndex === 0}
                  onClick={prevQuestion}
                  className="flex items-center gap-2 sm:gap-3 px-4 py-3 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl border-2 border-slate-200 font-extrabold text-slate-600 hover:bg-white hover:border-brand-300 hover:text-brand-600 hover:shadow-md hover:shadow-brand-500/10 disabled:opacity-30 transition-all text-sm sm:text-base active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" /> <span className="hidden sm:inline">Previous</span><span className="sm:hidden">Prev</span>
                  <kbd className="hidden sm:inline-flex text-[9px] font-bold bg-slate-100 border border-slate-200 rounded-[4px] px-1.5 py-px text-slate-400 leading-none opacity-60">←</kbd>
                </button>

                {/* Center: question count */}
                <div className="hidden sm:flex items-center gap-2 text-sm font-bold">
                  {test.questions.map((_, idx) => {
                    const isAnswered = answers[idx] !== undefined;
                    const isMarked = markedForReview.includes(idx);
                    const isCurrent = currentQuestionIndex === idx;
                    const isNear = Math.abs(idx - currentQuestionIndex) <= 2;
                    if (!isNear && !isCurrent && idx !== 0 && idx !== test.questions.length - 1) {
                      if (idx === currentQuestionIndex + 3) {
                        return <span key={idx} className="text-slate-300 text-xs">···</span>;
                      }
                      return null;
                    }
                    return (
                      <button
                        key={idx}
                        onClick={() => { setCurrentQuestionIndex(idx); setShowExplanation(false); }}
                        className={cn(
                          "w-7 h-7 rounded-lg text-[11px] font-extrabold flex items-center justify-center transition-all",
                          isCurrent
                            ? "ring-2 ring-brand-500/30 bg-brand-50 text-brand-700 scale-110"
                            : isAnswered && isMarked
                              ? "bg-gradient-to-br from-brand-400/80 to-amber-400/80 text-white"
                              : isAnswered
                                ? "premium-gradient text-white"
                                : isMarked
                                  ? "bg-amber-400/80 text-white"
                                  : "bg-white text-slate-400 border border-slate-200 hover:border-brand-300 hover:text-brand-600"
                        )}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <button 
                  onClick={() => setShowMobilePalette(true)}
                  className="flex lg:hidden items-center justify-center w-11 h-11 rounded-xl bg-white border-2 border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-brand-600 hover:border-brand-200 transition-all active:scale-95"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>

                <button 
                  disabled={currentQuestionIndex === test.questions.length - 1}
                  onClick={nextQuestion}
                  className="flex items-center gap-2 sm:gap-3 px-6 py-3 sm:px-8 sm:py-3.5 rounded-xl sm:rounded-2xl premium-gradient text-white font-extrabold hover:premium-glow disabled:opacity-30 disabled:shadow-none transition-all text-sm sm:text-base active:scale-95 shadow-lg shadow-brand-500/20"
                >
                  Next <ChevronRight className="w-5 h-5" />
                  <kbd className="hidden sm:inline-flex text-[9px] font-bold bg-slate-100 border border-slate-200 rounded-[4px] px-1.5 py-px text-slate-400 leading-none opacity-60">→</kbd>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Sidebar - Hidden on Mobile */}
        <aside className="w-85 glass border-l border-slate-200/50 flex flex-col shrink-0 hidden lg:flex">
          {/* Header with progress */}
          <div className="p-6 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 tracking-tight">Question Palette</h3>
              <span className="text-xs font-bold text-slate-400 tabular-nums">
                {answeredCount}/{test.questions.length}
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full premium-gradient rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(answeredCount / test.questions.length) * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Palette grid */}
          <div ref={desktopPaletteRef} className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar palette-scroll">
            <div className="grid grid-cols-5 gap-2.5">
              {test.questions.map((_, idx) => {
                const isAnswered = answers[idx] !== undefined;
                const isMarked = markedForReview.includes(idx);
                const isCurrent = currentQuestionIndex === idx;

                return (
                  <button
                    key={idx}
                    data-qidx={idx}
                    onClick={() => {
                      setCurrentQuestionIndex(idx);
                      setShowExplanation(false);
                    }}
                    className={cn(
                      "palette-btn w-11 h-11 rounded-xl text-xs font-extrabold flex items-center justify-center relative",
                      isCurrent
                        ? "palette-active-glow ring-2 ring-brand-500 scale-110 z-10 bg-white text-brand-600 shadow-lg shadow-brand-500/10 border border-brand-500"
                        : isAnswered && isMarked
                          ? "bg-gradient-to-br from-brand-500 to-amber-500 text-white shadow-md"
                          : isAnswered
                            ? "premium-gradient text-white shadow-sm"
                            : isMarked
                              ? "bg-amber-500 text-white shadow-sm"
                              : "bg-white text-slate-400 border border-slate-200/80 hover:border-brand-300 hover:text-brand-600 hover:shadow-md hover:scale-105"
                    )}
                  >
                    {!isCurrent && isAnswered && (
                      <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
                        <CheckCircle2 className="w-2 h-2 text-white" />
                      </div>
                    )}
                    {!isCurrent && isMarked && !isAnswered && (
                      <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center">
                        <Flag className="w-2 h-2 text-white fill-white" />
                      </div>
                    )}
                    {isCurrent && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-brand-500 rounded-full"
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      />
                    )}
                    <span className={cn(isCurrent && "drop-shadow-sm")}>{idx + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="px-6 py-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm premium-gradient shrink-0" />
                <span className="text-slate-400">Answered</span>
                <span className="text-slate-800 tabular-nums ml-0.5">{answeredCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-amber-500 shrink-0" />
                <span className="text-slate-400">Marked</span>
                <span className="text-slate-800 tabular-nums ml-0.5">{markedCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-white border border-slate-300 shrink-0" />
                <span className="text-slate-400">Left</span>
                <span className="text-slate-800 tabular-nums ml-0.5">{unansweredCount}</span>
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
              <div className="flex justify-center pt-2 pb-0 shrink-0">
                <div className="w-10 h-1 rounded-full bg-slate-300" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-3 pb-4 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">Question Palette</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    {answeredCount} answered · {markedCount} marked · {unansweredCount} left
                  </p>
                </div>
                <button onClick={() => setShowMobilePalette(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              
              {/* Palette grid */}
              <div ref={mobilePaletteRef} className="overflow-y-auto px-6 py-5 flex-1 custom-scrollbar palette-scroll">
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5">
                  {test.questions.map((_, idx) => {
                    const isAnswered = answers[idx] !== undefined;
                    const isMarked = markedForReview.includes(idx);
                    const isCurrent = currentQuestionIndex === idx;

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
                          "palette-btn w-11 h-11 rounded-xl text-xs font-extrabold flex items-center justify-center relative mx-auto",
                          isCurrent
                            ? "palette-active-glow ring-2 ring-brand-500 scale-110 z-10 bg-white text-brand-600 shadow-lg shadow-brand-500/10 border border-brand-500"
                            : isAnswered && isMarked
                              ? "bg-gradient-to-br from-brand-500 to-amber-500 text-white shadow-md"
                              : isAnswered
                                ? "premium-gradient text-white shadow-sm"
                                : isMarked
                                  ? "bg-amber-500 text-white shadow-sm"
                                  : "bg-white text-slate-400 border border-slate-200/80 hover:border-brand-300 hover:text-brand-600 hover:shadow-md hover:scale-105"
                        )}
                      >
                        {!isCurrent && isAnswered && (
                          <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
                            <CheckCircle2 className="w-2 h-2 text-white" />
                          </div>
                        )}
                        {!isCurrent && isMarked && !isAnswered && (
                          <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center">
                            <Flag className="w-2 h-2 text-white fill-white" />
                          </div>
                        )}
                        {isCurrent && (
                          <motion.div
                            layoutId="activeIndicatorMobile"
                            className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-brand-500 rounded-full"
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          />
                        )}
                        <span className={cn(isCurrent && "drop-shadow-sm")}>{idx + 1}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="px-6 py-4 border-t border-slate-100 shrink-0">
                <div className="flex items-center justify-center gap-6 text-[11px] font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm premium-gradient shrink-0" />
                    <span className="text-slate-400">Answered</span>
                    <span className="text-slate-800 tabular-nums ml-0.5">{answeredCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm bg-amber-500 shrink-0" />
                    <span className="text-slate-400">Marked</span>
                    <span className="text-slate-800 tabular-nums ml-0.5">{markedCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm bg-white border border-slate-300 shrink-0" />
                    <span className="text-slate-400">Left</span>
                    <span className="text-slate-800 tabular-nums ml-0.5">{unansweredCount}</span>
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
          <div className="fixed inset-0 bg-slate-950/50 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md">
            <motion.div {...modalContent}
              className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-white shadow-2xl max-w-md w-full border border-slate-200/50"
            >
              {/* Decorative gradient */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

              <div className="p-6 sm:p-10 text-center space-y-6 sm:space-y-8 relative z-10">
                <div className="w-16 h-16 sm:w-20 sm:h-20 premium-gradient rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto premium-glow shadow-xl shadow-brand-500/20">
                  <Send className="text-white w-8 h-8 sm:w-10 sm:h-10" />
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Submit Test?</h3>
                  <p className="text-slate-500 text-base sm:text-lg font-medium">
                    You've answered <span className="text-brand-600 font-extrabold">{answeredCount}</span> out of <span className="text-slate-900 font-extrabold">{test.questions.length}</span> questions.
                  </p>
                </div>

                {/* Mini progress bar */}
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full premium-gradient rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(answeredCount / test.questions.length) * 100}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <Button 
                    onClick={handleSubmit}
                    className="w-full py-4 sm:py-5 rounded-xl sm:rounded-2xl text-base sm:text-lg shadow-xl shadow-brand-500/25"
                  >
                    Yes, Submit Now
                  </Button>
                  <button 
                    onClick={() => setShowSubmitConfirm(false)}
                    className="w-full py-2.5 sm:py-3 text-sm sm:text-base text-slate-400 font-bold hover:text-slate-600 transition-colors rounded-xl hover:bg-slate-50"
                  >
                    Keep Solving
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
          <div className="fixed inset-0 bg-slate-950/50 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md">
            <motion.div {...modalContent}
              className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-white shadow-2xl max-w-md w-full border border-slate-200/50"
            >
              {/* Decorative gradient */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

              <div className="p-6 sm:p-10 text-center space-y-6 sm:space-y-8 relative z-10">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-50 border border-amber-100 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
                  <LogOut className="text-amber-600 w-8 h-8 sm:w-10 sm:h-10" />
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Pause & Exit?</h3>
                  <p className="text-slate-500 text-base sm:text-lg font-medium">Your progress is automatically saved. You can easily resume exactly where you left off from your dashboard later.</p>
                </div>

                {/* Answered count summary */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-bold text-slate-600">
                    {answeredCount} of {test.questions.length} answered
                  </span>
                </div>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <button 
                    onClick={handleExit}
                    className="w-full py-4 sm:py-5 rounded-xl sm:rounded-2xl text-base sm:text-lg font-extrabold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                  >
                    Yes, Save & Exit
                  </button>
                  <button 
                    onClick={() => setShowExitConfirm(false)}
                    className="w-full py-2.5 sm:py-3 text-sm sm:text-base text-slate-400 font-bold hover:text-slate-600 transition-colors rounded-xl hover:bg-slate-50"
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
