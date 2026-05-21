import React, { useState, useEffect } from 'react';
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
  LogOut
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

  useEffect(() => {
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
  }, [currentQuestionIndex]);

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
    const score = Object.entries(answers).reduce((acc, [index, answer]) => {
      return acc + (answer === test.questions[parseInt(index)].correctAnswerIndex ? 1 : 0);
    }, 0);
    
    onComplete({
      score,
      total: test.questions.length,
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
          <main className="flex-1 overflow-y-auto p-4 sm:p-10 pb-8 sm:pb-12">
            <div className="max-w-3xl mx-auto space-y-8 sm:space-y-12">
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

              <div className="space-y-6 sm:space-y-10">
                <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-semibold sm:font-extrabold text-slate-900 leading-relaxed sm:leading-[1.3] tracking-tight break-words">
                  {currentQuestion.questionText}
                </h2>

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
                          "w-full text-left p-4 sm:p-6 rounded-2xl border-2 transition-all flex items-center gap-4 sm:gap-5 group premium-shadow",
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
                          "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-extrabold text-sm sm:text-base shrink-0 transition-all",
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
                          "text-[15px] sm:text-lg lg:text-xl font-medium sm:font-bold leading-relaxed",
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
                    className="p-8 glass rounded-3xl space-y-4 border-brand-100 premium-shadow"
                  >
                    <h4 className="font-extrabold text-slate-900 flex items-center gap-3 text-lg">
                      <div className="p-2 bg-brand-50 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-brand-600" />
                      </div>
                      Detailed Explanation
                    </h4>
                    <p className="text-slate-600 text-lg leading-relaxed font-medium">
                      {currentQuestion.explanation}
                    </p>
                  </motion.div>
                )}
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
          <div className="p-8 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 mb-6 text-lg tracking-tight">Question Palette</h3>
            <div className="grid grid-cols-5 gap-3">
              {test.questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentQuestionIndex(idx);
                    setShowExplanation(false);
                  }}
                  className={cn(
                    "w-12 h-12 rounded-xl text-sm font-extrabold flex items-center justify-center transition-all premium-shadow",
                    currentQuestionIndex === idx ? "ring-4 ring-brand-500/20 border-2 border-brand-600" : "border border-transparent",
                    markedForReview.includes(idx) ? "bg-amber-500 text-white" :
                    answers[idx] !== undefined ? "premium-gradient text-white" : "bg-white text-slate-400 hover:bg-slate-50"
                  )}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8 space-y-6 text-sm font-bold">
            <div className="flex items-center gap-4">
              <div className="w-5 h-5 rounded-lg premium-gradient" />
              <span className="text-slate-600">Answered ({Object.keys(answers).length})</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-5 h-5 rounded-lg bg-amber-500" />
              <span className="text-slate-600">Marked for Review ({markedForReview.length})</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-5 h-5 rounded-lg bg-white border border-slate-200" />
              <span className="text-slate-600">Not Visited ({test.questions.length - Object.keys(answers).length})</span>
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
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white rounded-t-[2rem] shadow-2xl border-t border-slate-200/60 flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
                <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">Question Palette</h3>
                <button onClick={() => setShowMobilePalette(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
              
              <div className="overflow-y-auto p-6 flex-1">
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-3 mb-8">
                  {test.questions.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentQuestionIndex(idx);
                        setShowExplanation(false);
                        setShowMobilePalette(false);
                      }}
                      className={cn(
                        "w-12 h-12 rounded-xl text-sm font-extrabold flex items-center justify-center transition-all premium-shadow mx-auto",
                        currentQuestionIndex === idx ? "ring-4 ring-brand-500/20 border-2 border-brand-600" : "border border-transparent",
                        markedForReview.includes(idx) ? "bg-amber-500 text-white" :
                        answers[idx] !== undefined ? "premium-gradient text-white" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                <div className="space-y-4 text-sm font-bold bg-slate-50 p-6 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-md premium-gradient" />
                      <span className="text-slate-600">Answered</span>
                    </div>
                    <span className="text-slate-900">{Object.keys(answers).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-md bg-amber-500" />
                      <span className="text-slate-600">Marked for Review</span>
                    </div>
                    <span className="text-slate-900">{markedForReview.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-md bg-white border border-slate-200" />
                      <span className="text-slate-600">Not Visited</span>
                    </div>
                    <span className="text-slate-900">{test.questions.length - Object.keys(answers).length}</span>
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
