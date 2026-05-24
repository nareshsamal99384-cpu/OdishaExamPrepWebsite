import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
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
  // Show overview only for new tests; skip if user is genuinely resuming saved progress
  const [isStarted, setIsStarted] = useState(() => {
    if (!initialState) return false;
    const hasAnswers = Object.keys(initialState.answers || {}).length > 0;
    const hasPartialTime = initialState.timeLeft !== undefined && initialState.timeLeft < test.durationMinutes * 60;
    return hasAnswers || hasPartialTime;
  });

  // Derived test settings used on both overview & sidebar
  const totalQs = test.questions.length;
  const testTotalMarks = test.totalMarks || totalQs;
  const marksPerQ = totalQs > 0 ? testTotalMarks / totalQs : 1;
  const negMarkVal = test.negativeMarking || 0;
  const avgSecsPerQ = totalQs > 0 ? Math.round((test.durationMinutes * 60) / totalQs) : 0;

  const mainRef = useRef<HTMLElement>(null);
  const desktopPaletteRef = useRef<HTMLDivElement>(null);
  const mobilePaletteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [currentQuestionIndex]);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (optionIndex: number) => {
    if (mode === 'practice' && answers[currentQuestionIndex] !== undefined) return;
    
    setAnswers({ ...answers, [currentQuestionIndex]: optionIndex });
    if (mode === 'practice') {
      setShowExplanation(true);
    }
  };

  const toggleMarkForReview = () => {
    if (markedForReview.includes(currentQuestionIndex)) {
      setMarkedForReview(markedForReview.filter(i => i !== currentQuestionIndex));
    } else {
      setMarkedForReview([...markedForReview, currentQuestionIndex]);
    }
  };

  const handleSubmit = () => {
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
  };

  const handleExit = () => {
    onExit({
      answers,
      timeLeft,
      timeSpent,
      markedForReview,
      currentQuestionIndex,
      test
    });
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowExplanation(false);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setShowExplanation(false);
    }
  };

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
    <div className="fixed inset-0 bg-[#F8FAFC] z-[100] flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 glass border-b border-slate-200/50 flex items-center justify-between px-4 sm:px-6 shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={() => setShowExitConfirm(true)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <X className="w-6 h-6 text-slate-500" />
          </button>
          <h1 className="font-extrabold text-slate-900 truncate max-w-[150px] sm:max-w-none tracking-tight">{test.title}</h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-6">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-mono font-extrabold text-sm sm:text-lg premium-shadow",
            timeLeft < 300 ? "bg-red-50 text-red-600 animate-pulse border border-red-100" : "bg-white text-slate-700 border border-slate-100"
          )}>
            <Timer className="w-4 h-4 sm:w-5 sm:h-5" />
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

      <div className="flex-1 flex overflow-hidden">
        {/* Main Question Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent">
          <main ref={mainRef} className="flex-1 overflow-y-auto p-4 sm:p-10 pb-8 sm:pb-12">
            <div className="max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto space-y-8 sm:space-y-12">
              <div className="flex items-center justify-between">
                <span className="px-4 py-1.5 bg-brand-50 text-brand-700 rounded-full text-[10px] sm:text-xs font-extrabold uppercase tracking-widest border border-brand-100">
                  Question {currentQuestionIndex + 1} of {test.questions.length}
                </span>
                <button 
                  onClick={toggleMarkForReview}
                  className={cn(
                    "flex items-center gap-2 text-xs sm:text-sm font-bold transition-all px-3 py-1.5 rounded-lg",
                    markedForReview.includes(currentQuestionIndex) ? "bg-amber-50 text-amber-600 border border-amber-100" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                  )}
                >
                  <Flag className={cn("w-3 h-3 sm:w-4 sm:h-4", markedForReview.includes(currentQuestionIndex) && "fill-amber-600")} />
                  Mark for Review
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-6 sm:gap-y-10 lg:gap-x-10 lg:items-start">
                {/* Left Column: Question Text Card (styled on desktop only) */}
                <div className="lg:col-span-6 lg:bg-white lg:rounded-3xl lg:p-8 lg:border lg:border-slate-200/50 lg:shadow-[0_10px_30px_rgba(0,0,0,0.02)] lg:sticky lg:top-6">
                  <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-2xl xl:text-3xl font-semibold sm:font-extrabold text-slate-900 leading-relaxed sm:leading-[1.3] tracking-tight break-words">
                    {currentQuestion.questionText}
                  </h2>
                </div>

                {/* Right Column: Options & Explanation */}
                <div className="lg:col-span-6 space-y-6 sm:space-y-10 lg:space-y-6">
                  <div className="grid gap-4 sm:gap-5">
                    {currentQuestion.options.map((option, idx) => {
                      const isSelected = answers[currentQuestionIndex] === idx;
                      const isCorrect = idx === currentQuestion.correctAnswerIndex;
                      const showResult = mode === 'practice' && answers[currentQuestionIndex] !== undefined;

                      return (
                        <button
                          key={idx}
                          onClick={() => handleAnswer(idx)}
                          className={cn(
                            "w-full text-left p-4 sm:p-6 lg:p-4 xl:p-5 rounded-2xl border-2 transition-all flex items-center gap-4 sm:gap-5 group premium-shadow",
                            showResult
                              ? isCorrect 
                                ? "border-green-500 bg-green-50/50" 
                                : isSelected ? "border-red-500 bg-red-50/50" : "glass"
                              : isSelected 
                                ? "border-brand-600 bg-brand-50/50" 
                                : "glass hover:border-brand-200"
                          )}
                        >
                          <div className={cn(
                            "w-9 h-9 sm:w-10 sm:h-10 lg:w-9 lg:h-9 xl:w-10 xl:h-10 rounded-xl flex items-center justify-center font-extrabold text-sm sm:text-base shrink-0 transition-all",
                            showResult
                              ? isCorrect 
                                ? "bg-green-500 text-white" 
                                : isSelected ? "bg-red-500 text-white" : "bg-slate-100 text-slate-500"
                              : isSelected 
                                ? "premium-gradient text-white premium-glow" 
                                : "bg-slate-100 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600"
                          )}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span className={cn(
                            "text-[15px] sm:text-lg lg:text-base xl:text-lg font-medium sm:font-bold leading-relaxed",
                            isSelected ? "text-slate-900" : "text-slate-700"
                          )}>
                            {option}
                          </span>
                          {showResult && isCorrect && (
                            <div className="ml-auto bg-green-100 p-1.5 rounded-lg">
                              <CheckCircle2 className="w-6 h-6 text-green-600" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {showExplanation && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-8 lg:p-6 xl:p-8 glass rounded-3xl space-y-4 border-brand-100 premium-shadow"
                    >
                      <h4 className="font-extrabold text-slate-900 flex items-center gap-3 text-lg lg:text-base xl:text-lg">
                        <div className="p-2 bg-brand-50 rounded-lg">
                          <AlertCircle className="w-5 h-5 text-brand-600" />
                        </div>
                        Detailed Explanation
                      </h4>
                      <p className="text-slate-600 text-lg lg:text-base xl:text-lg leading-relaxed font-medium">
                        {currentQuestion.explanation}
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </main>

          {/* Sticky Footer Navigation */}
          <div className="shrink-0 glass border-t border-slate-200/60 p-4 sm:p-6 sm:px-10 z-20 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
            <div className="max-w-3xl mx-auto flex justify-between items-center w-full">
              <button 
                disabled={currentQuestionIndex === 0}
                onClick={prevQuestion}
                className="flex items-center gap-2 sm:gap-3 px-5 py-3 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-slate-200 font-extrabold text-slate-600 hover:bg-white hover:border-brand-400 hover:text-brand-600 disabled:opacity-30 transition-all text-sm sm:text-lg active:scale-95"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" /> <span className="hidden sm:inline">Previous</span><span className="sm:hidden">Prev</span>
              </button>

              <button 
                onClick={() => setShowMobilePalette(true)}
                className="flex lg:hidden items-center justify-center w-12 h-12 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm active:scale-95"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>

              <button 
                disabled={currentQuestionIndex === test.questions.length - 1}
                onClick={nextQuestion}
                className="flex items-center gap-2 sm:gap-3 px-6 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-950 text-white font-extrabold hover:bg-slate-800 disabled:opacity-30 transition-all text-sm sm:text-lg active:scale-95 premium-shadow"
              >
                Next <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
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
                {Object.keys(answers).length}/{test.questions.length}
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full premium-gradient rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(Object.keys(answers).length / test.questions.length) * 100}%` }}
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
                <span className="text-slate-800 tabular-nums ml-0.5">{Object.keys(answers).length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-amber-500 shrink-0" />
                <span className="text-slate-400">Marked</span>
                <span className="text-slate-800 tabular-nums ml-0.5">{markedForReview.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-white border border-slate-300 shrink-0" />
                <span className="text-slate-400">Left</span>
                <span className="text-slate-800 tabular-nums ml-0.5">{test.questions.length - Object.keys(answers).length}</span>
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
                    {Object.keys(answers).length} answered · {markedForReview.length} marked · {test.questions.length - Object.keys(answers).length} left
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
                    <span className="text-slate-800 tabular-nums ml-0.5">{Object.keys(answers).length}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm bg-amber-500 shrink-0" />
                    <span className="text-slate-400">Marked</span>
                    <span className="text-slate-800 tabular-nums ml-0.5">{markedForReview.length}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm bg-white border border-slate-300 shrink-0" />
                    <span className="text-slate-400">Left</span>
                    <span className="text-slate-800 tabular-nums ml-0.5">{test.questions.length - Object.keys(answers).length}</span>
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
          <div className="fixed inset-0 bg-slate-950/40 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 max-w-md w-full text-center space-y-6 sm:space-y-8 shadow-2xl border-white/40"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 premium-gradient rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto premium-glow rotate-12">
                <Send className="text-white w-10 h-10 sm:w-12 sm:h-12 -translate-y-1 translate-x-1" />
              </div>
              <div className="space-y-2 sm:space-y-3">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">Submit Test?</h3>
                <p className="text-slate-500 text-base sm:text-lg font-medium">You've answered <span className="text-brand-600 font-extrabold">{Object.keys(answers).length}</span> out of <span className="text-slate-900 font-extrabold">{test.questions.length}</span> questions.</p>
              </div>
              <div className="flex flex-col gap-3 sm:gap-4">
                <Button 
                  onClick={handleSubmit}
                  className="w-full py-4 sm:py-5 rounded-xl sm:rounded-2xl text-lg sm:text-xl"
                >
                  Yes, Submit Now
                </Button>
                <button 
                  onClick={() => setShowSubmitConfirm(false)}
                  className="w-full py-2.5 sm:py-3 text-sm sm:text-base text-slate-400 font-bold hover:text-slate-600 transition-colors"
                >
                  Keep Solving
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 bg-slate-950/40 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 max-w-md w-full text-center space-y-6 sm:space-y-8 shadow-2xl border-white/40"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-amber-50 border border-amber-100 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto premium-shadow rotate-12">
                <LogOut className="text-amber-600 w-10 h-10 sm:w-12 sm:h-12 -translate-y-1 translate-x-1" />
              </div>
              <div className="space-y-2 sm:space-y-3">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">Pause & Exit?</h3>
                <p className="text-slate-500 text-base sm:text-lg font-medium">Your progress is automatically saved. You can easily resume exactly where you left off from your dashboard later.</p>
              </div>
              <div className="flex flex-col gap-3 sm:gap-4">
                <button 
                  onClick={handleExit}
                  className="w-full py-4 sm:py-5 rounded-xl sm:rounded-2xl text-lg sm:text-xl font-extrabold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  Yes, Save & Exit
                </button>
                <button 
                  onClick={() => setShowExitConfirm(false)}
                  className="w-full py-2.5 sm:py-3 text-sm sm:text-base text-slate-400 font-bold hover:text-slate-600 transition-colors"
                >
                  Keep Solving
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MockTestSystem;
