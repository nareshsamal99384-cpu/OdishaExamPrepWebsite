import React, { useState, useRef, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Flag, AlertCircle, ChevronLeft, ChevronRight, BarChart } from 'lucide-react';
import { cn } from './lib/utils';
import { Button } from './App';

export default function TestResultsView({ results, onClose }: { results: any, onClose: () => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const questionCardRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const [showQuestionNav, setShowQuestionNav] = useState(false);
  
  const { test, answers, score: rawScore, total, timeTaken, timeSpent = {}, markedForReview = [] } = results;
  const questions = test?.questions || [];
  const currentQ = questions[currentIdx];

  // useLayoutEffect fires synchronously BEFORE the browser paints, ensuring
  // the page is at position 0 before the user ever sees it.
  useLayoutEffect(() => {
    setShowQuestionNav(false);
    // Target all three scroll containers for cross-browser reliability
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [results]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      // Fallback: show nav only after a delay so the scroll-to-top can settle first
      const t = setTimeout(() => setShowQuestionNav(true), 600);
      return () => clearTimeout(t);
    }

    // Delay observer setup so the scroll-to-top (instant) has fully committed
    // before the observer fires its first callback.
    const setupTimer = setTimeout(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          setShowQuestionNav(entry.isIntersecting);
        },
        {
          rootMargin: '0px 0px -10% 0px',
          threshold: 0.05
        }
      );

      const currentCard = questionCardRef.current;
      if (currentCard) {
        observer.observe(currentCard);
      }

      // Store observer on a ref so the cleanup can disconnect it
      (questionCardRef as any)._observer = observer;
    }, 250);

    return () => {
      clearTimeout(setupTimer);
      if ((questionCardRef as any)._observer) {
        (questionCardRef as any)._observer.disconnect();
        (questionCardRef as any)._observer = null;
      }
    };
  }, [results]);

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (questionCardRef.current && window.innerWidth < 1024) {
      const rect = questionCardRef.current.getBoundingClientRect();
      const offset = 80;
      const targetY = rect.top + window.scrollY - offset;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  }, [currentIdx]);
  
  // Calculate question metrics
  const correctCount = questions.reduce((acc, q, i) => {
    return acc + (answers[i] === q.correctAnswerIndex ? 1 : 0);
  }, 0);

  const incorrectCount = questions.reduce((acc, q, i) => {
    const uAns = answers[i];
    const isCorrect = uAns === q.correctAnswerIndex;
    return acc + (uAns !== undefined && uAns !== null && !isCorrect ? 1 : 0);
  }, 0);

  const unansweredCount = questions.length - (correctCount + incorrectCount);

  // Calculate marks metrics
  const totalMarks = test?.totalMarks || questions.length || 100;
  const marksPerQuestion = questions.length > 0 ? (totalMarks / questions.length) : 1;
  const negativeMarkingValue = test?.negativeMarking || 0;

  const obtainedMarks = correctCount * marksPerQuestion;
  const penaltyDeduction = incorrectCount * negativeMarkingValue;
  const finalScore = obtainedMarks - penaltyDeduction;

  const totalAttempted = correctCount + incorrectCount;
  const accuracy = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0;
  const avgSpeed = questions.length > 0 ? (timeTaken / questions.length).toFixed(1) : "0";
  
  const userAnswer = answers[currentIdx];
  const isCorrect = userAnswer === currentQ?.correctAnswerIndex;
  const isUnanswered = userAnswer === undefined;
  const isMarked = markedForReview.includes(currentIdx);
  
  const formatTime = (secs: number) => {
    if (!secs) return '0s';
    if (secs < 60) return `${Math.floor(secs)}s`;
    return `${Math.floor(secs/60)}m ${Math.floor(secs%60)}s`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 sm:pb-20 font-sans">
      <header className="h-16 sm:h-20 glass border-b border-slate-200/50 flex items-center justify-between px-4 sm:px-10 sticky top-0 z-[100] w-full mb-4 sm:mb-8">
        <h1 className="font-black text-lg sm:text-2xl text-slate-900 tracking-tight line-clamp-1">Performance Report</h1>
        <Button onClick={onClose} variant="outline" className="px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base border-2 border-slate-200 rounded-xl font-extrabold hover:bg-slate-100">Back</Button>
      </header>

      {/* TOP SECTION: Overall Performance & Results (Overview) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          
          {/* Overall Score Card */}
          <div className="lg:col-span-1 glass p-6 sm:p-8 rounded-[2rem] border border-slate-200 premium-shadow text-center bg-white/60 flex flex-col justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Total Score</h3>
              <div className="text-4xl sm:text-5xl font-black text-brand-600 mb-1">
                {Number.isInteger(finalScore) ? finalScore : finalScore.toFixed(2)}
                <span className="text-xl sm:text-2xl text-slate-400"> / {totalMarks}</span>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-500 font-extrabold mb-6 bg-slate-50 w-fit mx-auto px-3.5 py-1.5 rounded-xl border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-500"/> {accuracy}% Accuracy
              </div>
            </div>

            {/* Performance Calculation Breakdown */}
            <div className="bg-slate-50/50 rounded-2xl border border-slate-100/80 p-4 text-left space-y-2.5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                <span>Total Marks</span>
                <span className="text-slate-800 font-extrabold">{totalMarks} Marks</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                <span>Obtained Marks</span>
                <span className="text-emerald-600 font-extrabold">+{Number.isInteger(obtainedMarks) ? obtainedMarks : obtainedMarks.toFixed(2)}</span>
              </div>
              {negativeMarkingValue > 0 && (
                <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                  <span>Negative Penalty (-{negativeMarkingValue}/wrong)</span>
                  <span className="text-rose-600 font-extrabold">-{Number.isInteger(penaltyDeduction) ? penaltyDeduction : penaltyDeduction.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-slate-200/50 pt-2.5 flex justify-between items-center text-xs sm:text-sm font-extrabold text-slate-700">
                <span>Final Score</span>
                <span className="text-brand-600 font-black">{Number.isInteger(finalScore) ? finalScore : finalScore.toFixed(2)} / {totalMarks}</span>
              </div>
            </div>
          </div>

          {/* Performance Summary Cards Grid */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200/60 shadow-sm flex flex-col justify-between">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Time Taken</div>
              <div className="text-lg sm:text-2xl font-black text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-brand-500 shrink-0"/>
                <span className="truncate">{formatTime(timeTaken)}</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200/60 shadow-sm flex flex-col justify-between">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Average Speed</div>
              <div className="text-lg sm:text-2xl font-black text-slate-800 flex items-center gap-2">
                <BarChart className="w-4 h-4 sm:w-5 sm:h-5 text-brand-500 shrink-0"/>
                <span>{avgSpeed}s / Q</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200/60 shadow-sm flex flex-col justify-between">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Marked Review</div>
              <div className="text-lg sm:text-2xl font-black text-slate-800 flex items-center gap-2">
                <Flag className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0"/>
                <span>{markedForReview.length}</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200/60 shadow-sm flex flex-col justify-between">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Correct Answers</div>
              <div className="text-lg sm:text-2xl font-black text-emerald-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0"/>
                <span>{correctCount}</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200/60 shadow-sm flex flex-col justify-between">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Incorrect Answers</div>
              <div className="text-lg sm:text-2xl font-black text-rose-600 flex items-center gap-2">
                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 shrink-0"/>
                <span>{incorrectCount}</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200/60 shadow-sm flex flex-col justify-between">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Unanswered</div>
              <div className="text-lg sm:text-2xl font-black text-slate-500 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0"/>
                <span>{unansweredCount}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* SECTION DIVIDER & HEADING */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-8 mt-12">
        <div className="border-t border-slate-200/60 my-8"></div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Detailed Question Analysis</h2>
          <p className="text-slate-500 text-sm font-semibold mt-1">Review each question, your answer, and detailed explanations below.</p>
        </div>
      </div>

      {/* BOTTOM SECTION: Detailed Question-by-Question Review */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Left Col: Quick Navigation (Question Navigator) */}
        <div className="lg:col-span-1">
          <div className="glass p-6 sm:p-8 rounded-[2rem] border border-slate-200 premium-shadow bg-white/60 lg:sticky lg:top-24">
             <h3 className="font-extrabold text-slate-900 mb-6 text-lg sm:text-xl tracking-tight">Question Navigator</h3>
             <div className="max-h-[300px] overflow-y-auto pr-1.5 custom-scrollbar">
               <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2 sm:gap-3 py-1">
                 {questions.map((q: any, i: number) => {
                   const uAns = answers[i];
                   const isCorr = uAns === q.correctAnswerIndex;
                   const isUnans = uAns === undefined;
                   const isMarked = markedForReview.includes(i);
                   return (
                     <button 
                       key={i}
                       onClick={() => { setCurrentIdx(i); setTimeout(() => { if (questionCardRef.current) { const rect = questionCardRef.current.getBoundingClientRect(); const offset = window.innerWidth < 1024 ? 80 : 100; const targetY = rect.top + window.scrollY - offset; window.scrollTo({ top: targetY, behavior: 'smooth' }); } }, 50); }}
                       className={cn(
                         "aspect-square rounded-xl font-bold flex items-center justify-center text-xs sm:text-sm transition-all relative overflow-hidden",
                         currentIdx === i ? "ring-2 sm:ring-4 ring-slate-200 scale-105 z-10 shadow-lg" : "hover:scale-105 shadow-sm",
                         isUnans ? "bg-slate-100 text-slate-400 border border-slate-200" :
                         isCorr ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : 
                         "bg-rose-100 text-rose-700 border border-rose-200"
                       )}
                     >
                       {isMarked && <div className="absolute top-0 right-0 w-4 h-4 bg-amber-400 rotate-45 transform translate-x-2 -translate-y-2"></div>}
                       {i + 1}
                     </button>
                   )
                 })}
               </div>
             </div>
             <div className="mt-8 space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><div className="w-3 h-3 bg-emerald-100 border border-emerald-200 rounded"></div> Correct</div>
               <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><div className="w-3 h-3 bg-rose-100 border border-rose-200 rounded"></div> Incorrect</div>
               <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><div className="w-3 h-3 bg-slate-100 border border-slate-200 rounded"></div> Unanswered</div>
               <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><div className="w-3 h-3 overflow-hidden rounded border border-slate-200 relative"><div className="absolute top-0 right-0 w-3 h-3 bg-amber-400 rotate-45 transform translate-x-1.5 -translate-y-1.5"></div></div> Marked for Review</div>
             </div>
          </div>
        </div>

        {/* Right Col: Detailed Question Card */}
        <div className="lg:col-span-2 space-y-6">
          <div ref={questionCardRef} className="glass p-5 sm:p-12 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 premium-shadow bg-white">
            <motion.div 
               key={currentIdx}
               initial={{ opacity: 0, y: 5 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.15 }}
             >
             
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
               <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                 <span className="px-4 sm:px-5 py-1.5 sm:py-2 bg-slate-100 text-slate-600 rounded-lg sm:rounded-xl text-xs sm:text-sm font-extrabold tracking-widest uppercase border border-slate-200">
                   Question {currentIdx + 1}
                 </span>
                 <span className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> Time Spent: {formatTime(timeSpent[currentIdx] || 0)}
                 </span>
               </div>
               
               <div className="flex items-center gap-2 flex-wrap">
                  {isMarked && (
                    <span className="flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 bg-amber-50 text-amber-600 rounded-lg sm:rounded-xl text-xs sm:text-sm font-extrabold border border-amber-200">
                      <Flag className="w-4 h-4 text-amber-500 fill-amber-500" /> Marked for Review
                    </span>
                  )}
                  {isUnanswered ? (
                     <span className="flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 bg-slate-100 text-slate-500 rounded-lg sm:rounded-xl text-xs sm:text-sm font-extrabold border border-slate-200"><div className="w-2 h-2 rounded-full bg-slate-400"/> Unanswered</span>
                  ) : isCorrect ? (
                     <span className="flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 bg-emerald-50 text-emerald-600 rounded-lg sm:rounded-xl text-xs sm:text-sm font-extrabold border border-emerald-100"><CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5"/> Correct</span>
                  ) : (
                     <span className="flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 bg-rose-50 text-rose-600 rounded-lg sm:rounded-xl text-xs sm:text-sm font-extrabold border border-rose-100"><XCircle className="w-4 h-4 sm:w-5 sm:h-5"/> Incorrect</span>
                  )}
                </div>
             </div>

             <h2 className="text-xl sm:text-3xl font-extrabold text-slate-950 leading-snug mb-8 sm:mb-10">
               {currentQ.questionText}
             </h2>

             <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-10">
                {currentQ.options.map((opt: string, i: number) => {
                  const isThisSelected = userAnswer === i;
                  const isThisCorrect = currentQ.correctAnswerIndex === i;
                  
                  let ringClass = "border-slate-100 bg-slate-50";
                  let icon = null;
                  
                  if (isThisCorrect) {
                     ringClass = "border-emerald-500 bg-emerald-50/50 text-emerald-900";
                     icon = <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500 ml-auto shrink-0" />;
                  } else if (isThisSelected && !isThisCorrect) {
                     ringClass = "border-rose-500 bg-rose-50/50 text-rose-900";
                     icon = <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500 ml-auto shrink-0" />;
                  }

                  return (
                    <div key={i} className={cn("p-4 sm:p-6 rounded-2xl border-2 flex items-center gap-4 sm:gap-5 transition-all text-left w-full", ringClass)}>
                       <div className={cn(
                         "w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center font-extrabold text-sm sm:text-base shrink-0",
                         isThisCorrect ? "bg-emerald-500 text-white" :
                         isThisSelected ? "bg-rose-500 text-white" : "bg-slate-200 text-slate-600"
                       )}>
                         {String.fromCharCode(65 + i)}
                       </div>
                       <span className="text-base sm:text-xl font-bold leading-tight">{opt}</span>
                       {icon}
                    </div>
                  )
                })}
             </div>

             {currentQ.explanation && (
                <div className="bg-brand-50 p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-brand-100 mb-8 sm:mb-10">
                  <h4 className="font-extrabold text-brand-900 flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 text-base sm:text-lg">
                    <div className="bg-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-sm"><AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600"/></div> 
                    Detailed Explanation
                  </h4>
                  <p className="text-brand-800 font-medium leading-relaxed text-sm sm:text-lg">{currentQ.explanation}</p>
                </div>
             )}
             
             {/* Desktop inline nav - hidden on mobile */}
             <div className="hidden lg:flex mt-6 justify-between gap-4">
               <Button variant="outline" disabled={currentIdx === 0} onClick={() => setCurrentIdx(p => p - 1)} className="flex-none justify-center gap-2 px-8 py-6 text-lg rounded-2xl border-2 border-slate-200"><ChevronLeft className="w-5 h-5"/> Previous</Button>
               <Button disabled={currentIdx === questions.length - 1} onClick={() => setCurrentIdx(p => p + 1)} className="flex-none justify-center gap-2 px-10 py-6 text-lg rounded-2xl bg-slate-900 text-white hover:bg-slate-800">Next <ChevronRight className="w-5 h-5"/></Button>
             </div>

            </motion.div>
          </div>
        </div>

      </div>

      {/* Mobile Sticky Bottom Nav — dynamically slides in when user scrolls down to the question card */}
      <div className={cn(
        "lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 flex gap-3 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] transition-all duration-300 transform",
        showQuestionNav ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      )}>
        <Button
          variant="outline"
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx(p => p - 1)}
          className="flex-1 justify-center gap-2 py-4 text-sm font-black rounded-xl border-2 border-slate-200 disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4"/> Previous
        </Button>
        <div className="flex items-center justify-center px-3 text-xs font-black text-slate-400 bg-slate-50 rounded-xl border border-slate-100 shrink-0">
          {currentIdx + 1} / {questions.length}
        </div>
        <Button
          disabled={currentIdx === questions.length - 1}
          onClick={() => setCurrentIdx(p => p + 1)}
          className="flex-1 justify-center gap-2 py-4 text-sm font-black rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40"
        >
          Next <ChevronRight className="w-4 h-4"/>
        </Button>
      </div>
    </div>
  );
}
