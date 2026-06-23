import React, { useState, useRef, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Flag, AlertCircle, ChevronLeft, ChevronRight, ChevronDown, BarChart } from 'lucide-react';
import { cn } from './lib/utils';
import { Button } from './components/Button';
import { fadeSlideUpSm } from './lib/animations';
import { MathTextRenderer, DiagramRenderer } from './components/MathTextRenderer';

export default function TestResultsView({ results, onClose }: { results: any, onClose: () => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const questionCardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const [showQuestionNav, setShowQuestionNav] = useState(false);
  const [questionExpanded, setQuestionExpanded] = useState(false);
  const [questionOverflows, setQuestionOverflows] = useState(false);
  const questionTextRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    document.body.setAttribute('data-review-mode', 'true');
    return () => {
      document.body.removeAttribute('data-review-mode');
    };
  }, []);
  
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
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [results]);

  React.useEffect(() => {
    const handleScrollToTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    };
    handleScrollToTop();
    const frameId = requestAnimationFrame(handleScrollToTop);
    const timeoutId = setTimeout(handleScrollToTop, 50);
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timeoutId);
    };
  }, [results]);

  React.useEffect(() => {
    const checkAndSetAttribute = () => {
      if (showQuestionNav && window.innerWidth < 1024) {
        document.body.setAttribute('data-review-bottom-nav', 'true');
      } else {
        document.body.removeAttribute('data-review-bottom-nav');
      }
    };
    checkAndSetAttribute();
    window.addEventListener('resize', checkAndSetAttribute);
    return () => {
      document.body.removeAttribute('data-review-bottom-nav');
      window.removeEventListener('resize', checkAndSetAttribute);
    };
  }, [showQuestionNav]);

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
    if (questionCardRef.current && containerRef.current) {
      const cardRect = questionCardRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      const offset = window.innerWidth < 1024 ? 80 : 100;
      const targetY = containerRef.current.scrollTop + cardRect.top - containerRect.top - offset;
      containerRef.current.scrollTo({ top: targetY, behavior: 'auto' });
    }
  }, [currentIdx]);

  // Detect if current question text overflows its container
  React.useEffect(() => {
    setQuestionExpanded(!!currentQ?.diagram);
    const el = questionTextRef.current;
    if (el) {
      setQuestionOverflows(currentQ?.diagram ? false : el.scrollHeight > 280);
    }
  }, [currentIdx, currentQ]);

  // Calculate question metrics
  const correctCount = questions.reduce((acc, q, i) => {
    return acc + ((answers && answers[i]) === q.correctAnswerIndex ? 1 : 0);
  }, 0);

  const incorrectCount = questions.reduce((acc, q, i) => {
    const uAns = answers ? answers[i] : undefined;
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
  
  const userAnswer = answers ? answers[currentIdx] : undefined;
  const isCorrect = userAnswer === currentQ?.correctAnswerIndex;
  const isUnanswered = userAnswer === undefined;
  const isMarked = markedForReview.includes(currentIdx);
  
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === undefined || secs === null || !secs) return '0s';
    if (secs < 60) return `${Math.floor(secs)}s`;
    return `${Math.floor(secs/60)}m ${Math.floor(secs%60)}s`;
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "fixed inset-0 z-[200] overflow-y-auto bg-[#F8FAFC] font-sans transition-all duration-300",
        showQuestionNav ? "pb-18 sm:pb-20" : "pb-12"
      )}
      style={{ transform: 'translate3d(0, 0, 0)' }}
    >
      {/* Background gradients for ambient atmosphere */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-br from-brand-100/20 via-purple-100/10 to-transparent blur-[120px] -z-10 pointer-events-none" style={{ transform: 'translate3d(0, 0, 0)' }} />
      <div className="fixed bottom-0 right-0 w-[800px] h-[600px] bg-gradient-to-tl from-indigo-100/10 to-transparent blur-[120px] -z-10 pointer-events-none" style={{ transform: 'translate3d(0, 0, 0)' }} />

      <header className="h-16 sm:h-20 glass border-b border-slate-200/50 flex items-center justify-between px-4 sm:px-10 sticky top-0 z-[100] w-full mb-4 sm:mb-8">
        <h1 className="font-black text-lg sm:text-2xl text-slate-900 tracking-tight line-clamp-1">Performance Report</h1>
        <Button onClick={onClose} variant="outline" className="px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base border-2 border-slate-200 rounded-xl font-extrabold hover:bg-slate-100">Back</Button>
      </header>

      {/* TOP SECTION: Overall Performance & Results (Overview) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-6">
          
          {/* Overall Score Card */}
          <div className="lg:col-span-1 relative overflow-hidden bg-white/95 p-6 sm:p-8 rounded-[2.5rem] border border-white/85 shadow-[0_8px_32px_rgba(0,0,0,0.015)] hover:border-brand-200/40 hover:shadow-[0_20px_50px_rgba(138,28,54,0.045)] flex flex-col justify-between group transition-all duration-500 cursor-default" style={{ transform: 'translate3d(0,0,0)' }}>
            {/* Background Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#8a1c36]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#8a1c36]/10 transition-colors duration-500" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/3 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/5 transition-colors duration-500" />

            <div className="relative z-10 text-center">
              <h3 className="text-[10px] font-sans font-black text-slate-400/90 uppercase tracking-widest mb-4">Total Score</h3>
              <div className="text-5xl sm:text-6xl font-serif font-black text-[#8a1c36] tracking-tight mb-2 drop-shadow-sm">
                {Number.isInteger(finalScore) ? finalScore : finalScore.toFixed(2)}
                <span className="text-xl sm:text-2xl font-sans font-extrabold text-slate-400"> / {totalMarks}</span>
              </div>
              
              <div className="flex items-center justify-center gap-1.5 text-xs font-black text-emerald-700 bg-emerald-50/70 border border-emerald-100/60 px-3.5 py-1.5 rounded-2xl w-fit mx-auto mt-4 shadow-sm transition-transform duration-300 group-hover:scale-103">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/> {accuracy}% Accuracy
              </div>
            </div>

            {/* Performance Calculation Breakdown */}
            <div className="relative z-10 bg-[#F8FAFC]/90 border border-slate-200/50 rounded-2xl p-4 text-left space-y-2.5 mt-8 hover:bg-white/80 transition-all duration-300">
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
              <div className="border-t border-slate-200/50 pt-2.5 flex justify-between items-center text-xs sm:text-sm font-black text-slate-700">
                <span>Final Score</span>
                <span className="text-[#8a1c36] font-black">{Number.isInteger(finalScore) ? finalScore : finalScore.toFixed(2)} / {totalMarks}</span>
              </div>
            </div>
          </div>

          {/* Performance Summary Cards Grid */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
            
            {/* Time Taken */}
            <div className="relative overflow-hidden bg-white/95 p-5 sm:p-6 rounded-[2rem] border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.015)] hover:border-brand-200/30 hover:shadow-[0_20px_45px_rgba(138,28,54,0.045)] hover:-translate-y-1 flex flex-col justify-between group transition-all duration-300 cursor-default" style={{ transform: 'translate3d(0,0,0)' }}>
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#8a1c36]/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
              <div className="flex items-center justify-between gap-3 mb-4 relative z-10">
                <span className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest leading-none">Time Taken</span>
                <div className="p-2 bg-[#8a1c36]/5 border border-[#8a1c36]/10 rounded-xl text-[#8a1c36] group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
                  <Clock className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0"/>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-sans font-black text-slate-900 leading-none tracking-tight relative z-10 truncate">
                {formatTime(timeTaken)}
              </div>
            </div>

            {/* Average Speed */}
            <div className="relative overflow-hidden bg-white/95 p-5 sm:p-6 rounded-[2rem] border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.015)] hover:border-brand-200/30 hover:shadow-[0_20px_45px_rgba(138,28,54,0.045)] hover:-translate-y-1 flex flex-col justify-between group transition-all duration-300 cursor-default" style={{ transform: 'translate3d(0,0,0)' }}>
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#8a1c36]/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
              <div className="flex items-center justify-between gap-3 mb-4 relative z-10">
                <span className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest leading-none">Average Speed</span>
                <div className="p-2 bg-[#8a1c36]/5 border border-[#8a1c36]/10 rounded-xl text-[#8a1c36] group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
                  <BarChart className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0"/>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-sans font-black text-slate-900 leading-none tracking-tight relative z-10">
                {avgSpeed}<span className="text-xs font-bold text-slate-400 ml-1">s / Q</span>
              </div>
            </div>

            {/* Marked Review */}
            <div className="relative overflow-hidden bg-white/95 p-5 sm:p-6 rounded-[2rem] border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.015)] hover:border-brand-200/30 hover:shadow-[0_20px_45px_rgba(138,28,54,0.045)] hover:-translate-y-1 flex flex-col justify-between group transition-all duration-300 cursor-default" style={{ transform: 'translate3d(0,0,0)' }}>
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
              <div className="flex items-center justify-between gap-3 mb-4 relative z-10">
                <span className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest leading-none">Marked Review</span>
                <div className="p-2 bg-amber-50/70 border border-amber-100/50 rounded-xl text-amber-600 group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
                  <Flag className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0"/>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-sans font-black text-slate-900 leading-none tracking-tight relative z-10">
                {markedForReview.length}
              </div>
            </div>

            {/* Correct Answers */}
            <div className="relative overflow-hidden bg-white/95 p-5 sm:p-6 rounded-[2rem] border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.015)] hover:border-brand-200/30 hover:shadow-[0_20px_45px_rgba(138,28,54,0.045)] hover:-translate-y-1 flex flex-col justify-between group transition-all duration-300 cursor-default" style={{ transform: 'translate3d(0,0,0)' }}>
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
              <div className="flex items-center justify-between gap-3 mb-4 relative z-10">
                <span className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest leading-none">Correct Answers</span>
                <div className="p-2 bg-emerald-50/70 border border-emerald-100/50 rounded-xl text-emerald-600 group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
                  <CheckCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0"/>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-sans font-black text-emerald-600 leading-none tracking-tight relative z-10">
                {correctCount}
              </div>
            </div>

            {/* Incorrect Answers */}
            <div className="relative overflow-hidden bg-white/95 p-5 sm:p-6 rounded-[2rem] border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.015)] hover:border-brand-200/30 hover:shadow-[0_20px_45px_rgba(138,28,54,0.045)] hover:-translate-y-1 flex flex-col justify-between group transition-all duration-300 cursor-default" style={{ transform: 'translate3d(0,0,0)' }}>
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-rose-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
              <div className="flex items-center justify-between gap-3 mb-4 relative z-10">
                <span className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest leading-none">Incorrect Answers</span>
                <div className="p-2 bg-rose-50/70 border border-rose-100/50 rounded-xl text-rose-600 group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
                  <XCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0"/>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-sans font-black text-rose-600 leading-none tracking-tight relative z-10">
                {incorrectCount}
              </div>
            </div>

            {/* Unanswered */}
            <div className="relative overflow-hidden bg-white/95 p-5 sm:p-6 rounded-[2rem] border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.015)] hover:border-brand-200/30 hover:shadow-[0_20px_45px_rgba(138,28,54,0.045)] hover:-translate-y-1 flex flex-col justify-between group transition-all duration-300 cursor-default" style={{ transform: 'translate3d(0,0,0)' }}>
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-slate-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
              <div className="flex items-center justify-between gap-3 mb-4 relative z-10">
                <span className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest leading-none">Unanswered</span>
                <div className="p-2 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-500 group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
                  <AlertCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0"/>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-sans font-black text-slate-700 leading-none tracking-tight relative z-10">
                {unansweredCount}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* SECTION DIVIDER & HEADING */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 mt-12">
        <div className="border-t border-slate-200/60 my-8"></div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Detailed Question Analysis</h2>
          <p className="text-slate-500 text-sm font-semibold mt-1">Review each question, your answer, and detailed explanations below.</p>
        </div>
      </div>

      {/* BOTTOM SECTION: Detailed Question-by-Question Review */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-6">
        
        {/* Left Col: Quick Navigation (Question Navigator) */}
        <div className="lg:col-span-1">
          <div className="glass px-2.5 py-4 sm:p-8 rounded-xl sm:rounded-[2rem] border border-slate-200 premium-shadow bg-white/60 lg:sticky lg:top-24">
             <h3 className="font-extrabold text-slate-900 mb-6 text-lg sm:text-xl tracking-tight">Question Navigator</h3>
              <div className="max-h-[300px] lg:max-h-[450px] overflow-y-auto p-1.5 custom-scrollbar">
               <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-7 gap-2 sm:gap-3 py-1">
                  {questions.map((q: any, i: number) => {
                    const uAns = answers ? answers[i] : undefined;
                    const isCorr = uAns === q.correctAnswerIndex;
                    const isUnans = uAns === undefined;
                    const isMarked = markedForReview.includes(i);
                    return (
                      <button 
                        key={i}
                        onClick={() => setCurrentIdx(i)}
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
             <div className="mt-8 lg:mt-6 space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><div className="w-3 h-3 bg-emerald-100 border border-emerald-200 rounded"></div> Correct</div>
               <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><div className="w-3 h-3 bg-rose-100 border border-rose-200 rounded"></div> Incorrect</div>
               <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><div className="w-3 h-3 bg-slate-100 border border-slate-200 rounded"></div> Unanswered</div>
               <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><div className="w-3 h-3 overflow-hidden rounded border border-slate-200 relative"><div className="absolute top-0 right-0 w-3 h-3 bg-amber-400 rotate-45 transform translate-x-1.5 -translate-y-1.5"></div></div> Marked for Review</div>
             </div>
          </div>
        </div>

        {/* Right Col: Detailed Question Card */}
        <div className="lg:col-span-2 space-y-6">
          <div ref={questionCardRef} className="glass px-2.5 py-5 sm:p-10 lg:p-8 rounded-2xl sm:rounded-[2.5rem] border border-slate-200 premium-shadow bg-white">
            <div key={currentIdx}>
             
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

              {/* Question text with expand/collapse */}
              <div className="bg-white rounded-xl sm:rounded-3xl px-3 py-4 sm:p-8 border border-slate-200/50 shadow-[0_10px_30px_rgba(0,0,0,0.02)] mb-8 sm:mb-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-brand-500/[0.04] rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/[0.03] rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none" />
                <motion.div
                  animate={{ maxHeight: questionExpanded ? 9999 : 280 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className="relative overflow-hidden"
                >
                  <div
                    ref={questionTextRef}
                    className="text-lg sm:text-2xl md:text-3xl lg:text-2xl xl:text-3xl font-semibold sm:font-extrabold text-slate-900 leading-relaxed sm:leading-[1.3] tracking-tight break-words overflow-wrap-anywhere space-y-4"
                  >
                    {(currentQ?.questionText || '').split('\n\n').map((para, i) => (
                      <p key={i}>
                        <MathTextRenderer text={para} />
                      </p>
                    ))}
                    {(() => {
                      const question = currentQ;
                      console.log("QUESTION", question);
                      console.log("DIAGRAM", question?.diagram);
                      console.log("TYPE", question?.diagram?.type);
                      return null;
                    })()}
                    {currentQ?.diagram ? (
                      <div className="mt-5 sm:mt-6 w-full block">
                        <DiagramRenderer diagram={currentQ.diagram} data={currentQ.diagram} />
                      </div>
                    ) : null}
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

             <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-10">
                {(currentQ?.options || []).map((opt: string, i: number) => {
                  const isThisSelected = userAnswer === i;
                  const isThisCorrect = currentQ?.correctAnswerIndex === i;
                  
                  let ringClass = "border-slate-100 bg-slate-50";
                  let icon = null;
                  
                  if (isThisCorrect) {
                      ringClass = "border-emerald-500 bg-emerald-50/50 text-emerald-900";
                      icon = <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 lg:w-5 lg:h-5 text-emerald-500 ml-auto shrink-0" />;
                   } else if (isThisSelected && !isThisCorrect) {
                      ringClass = "border-rose-500 bg-rose-50/50 text-rose-900";
                      icon = <XCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-5 lg:h-5 text-rose-500 ml-auto shrink-0" />;
                  }

                  return (
                    <div key={i} className={cn("mcq-option px-3 py-3.5 sm:p-6 lg:p-5 rounded-xl sm:rounded-2xl border-2 flex items-center gap-3 sm:gap-5 lg:gap-4 transition-all text-left w-full", ringClass)}>
                       <div className={cn(
                          "w-8 h-8 sm:w-10 sm:h-10 lg:w-9 lg:h-9 rounded-lg sm:rounded-xl flex items-center justify-center font-extrabold text-sm sm:text-base lg:text-sm shrink-0",
                         isThisCorrect ? "bg-emerald-500 text-white" :
                         isThisSelected ? "bg-rose-500 text-white" : "bg-slate-200 text-slate-600"
                       )}>
                         {String.fromCharCode(65 + i)}
                       </div>
                        <span className="text-base sm:text-xl lg:text-lg font-bold leading-tight">
                          <MathTextRenderer text={opt} isOption />
                        </span>
                       {icon}
                    </div>
                  )
                })}
             </div>

             {currentQ?.explanation && (
                 <div className="math-explanation bg-brand-50 px-3 py-4 sm:p-8 lg:p-6 rounded-xl sm:rounded-3xl border border-brand-100 mb-2 lg:mb-10">
                  <h4 className="font-extrabold text-brand-900 flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 text-base sm:text-lg">
                    <div className="bg-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-sm"><AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600"/></div> 
                    Detailed Explanation
                  </h4>
                  <p className="text-brand-800 font-medium leading-relaxed text-sm sm:text-lg">
                    <MathTextRenderer text={currentQ.explanation} />
                  </p>
                </div>
             )}
             
             {/* Desktop inline nav - hidden on mobile */}
              <div className="hidden lg:flex mt-6 justify-between gap-4">
                <Button variant="outline" disabled={currentIdx === 0} onClick={() => { setCurrentIdx(p => p - 1); questionCardRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' }); }} className="flex-none justify-center gap-2 px-8 py-5 text-base rounded-2xl border-2 border-slate-200"><ChevronLeft className="w-5 h-5"/> Previous</Button>
                <Button disabled={currentIdx === questions.length - 1} onClick={() => { setCurrentIdx(p => p + 1); questionCardRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' }); }} className="flex-none justify-center gap-2 px-10 py-5 text-base rounded-2xl bg-slate-900 text-white hover:bg-slate-800">Next <ChevronRight className="w-5 h-5"/></Button>
             </div>

            </div>
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
