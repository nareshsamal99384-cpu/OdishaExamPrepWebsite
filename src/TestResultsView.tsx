import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Flag, AlertCircle, ChevronLeft, ChevronRight, BarChart } from 'lucide-react';
import { cn } from './lib/utils';
import { Button } from './App';

export default function TestResultsView({ results, onClose }: { results: any, onClose: () => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  
  const { test, answers, score, total, timeTaken, timeSpent = {}, markedForReview = [] } = results;
  const questions = test.questions;
  const currentQ = questions[currentIdx];
  
  // Stats
  const avgSpeed = total > 0 ? (timeTaken / total).toFixed(1) : "0";
  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;
  const unansweredCount = total - Object.keys(answers).length;
  
  const userAnswer = answers[currentIdx];
  const isCorrect = userAnswer === currentQ.correctAnswerIndex;
  const isUnanswered = userAnswer === undefined;
  
  const formatTime = (secs: number) => {
    if (!secs) return '0s';
    if (secs < 60) return `${Math.floor(secs)}s`;
    return `${Math.floor(secs/60)}m ${Math.floor(secs%60)}s`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans">
      <header className="h-16 sm:h-20 glass border-b border-slate-200/50 flex items-center justify-between px-4 sm:px-10 sticky top-0 z-[100] w-full mb-4 sm:mb-8">
        <h1 className="font-black text-lg sm:text-2xl text-slate-900 tracking-tight line-clamp-1">Performance Report</h1>
        <Button onClick={onClose} variant="outline" className="px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base border-2 border-slate-200 rounded-xl font-extrabold hover:bg-slate-100">Back</Button>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Left Col: Overview & Quick Navigation */}
        <div className="space-y-6">
          <div className="glass p-6 sm:p-8 rounded-[2rem] border border-slate-200 premium-shadow text-center bg-white/60">
            <h3 className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Total Score</h3>
            <div className="text-5xl sm:text-6xl font-black text-brand-600 mb-2">{score} <span className="text-2xl sm:text-3xl text-slate-400">/ {total}</span></div>
            <div className="flex items-center justify-center gap-2 text-sm sm:text-base text-slate-600 font-extrabold mb-8 bg-slate-50 w-fit mx-auto px-4 py-2 rounded-xl border border-slate-100">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500"/> {accuracy}% Accuracy
            </div>
            
            <div className="grid grid-cols-2 gap-3 sm:gap-4 text-left">
               <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-sm">
                 <div className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Time Taken</div>
                 <div className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-1.5 sm:gap-2"><Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-500"/> {formatTime(timeTaken)}</div>
               </div>
               <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-sm">
                 <div className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Avg Speed</div>
                 <div className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-1.5 sm:gap-2"><BarChart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-500"/> {avgSpeed}s / Q</div>
               </div>
               <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-sm">
                 <div className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Marked Review</div>
                 <div className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-1.5 sm:gap-2"><Flag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500"/> {markedForReview.length}</div>
               </div>
               <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-sm">
                 <div className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Unanswered</div>
                 <div className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-1.5 sm:gap-2"><AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400"/> {unansweredCount}</div>
               </div>
            </div>
          </div>

          <div className="glass p-6 sm:p-8 rounded-[2rem] border border-slate-200 premium-shadow bg-white/60">
             <h3 className="font-extrabold text-slate-900 mb-6 text-lg sm:text-xl tracking-tight">Question Navigator</h3>
             <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2 sm:gap-3">
               {questions.map((q: any, i: number) => {
                 const uAns = answers[i];
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
             <div className="mt-8 space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><div className="w-3 h-3 bg-emerald-100 border border-emerald-200 rounded"></div> Correct</div>
               <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><div className="w-3 h-3 bg-rose-100 border border-rose-200 rounded"></div> Incorrect</div>
               <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><div className="w-3 h-3 bg-slate-100 border border-slate-200 rounded"></div> Unanswered</div>
               <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><div className="w-3 h-3 overflow-hidden rounded border border-slate-200 relative"><div className="absolute top-0 right-0 w-3 h-3 bg-amber-400 rotate-45 transform translate-x-1.5 -translate-y-1.5"></div></div> Marked for Review</div>
             </div>
          </div>
        </div>

        {/* Right Col: Question Context & Answer */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
             key={currentIdx}
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             className="glass p-5 sm:p-12 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 premium-shadow bg-white"
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
               
               {isUnanswered ? (
                  <span className="flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 bg-slate-100 text-slate-500 rounded-lg sm:rounded-xl text-xs sm:text-sm font-extrabold border border-slate-200"><div className="w-2 h-2 rounded-full bg-slate-400"/> Unanswered</span>
               ) : isCorrect ? (
                 <span className="flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 bg-emerald-50 text-emerald-600 rounded-lg sm:rounded-xl text-xs sm:text-sm font-extrabold border border-emerald-100"><CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5"/> Correct</span>
               ) : (
                 <span className="flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 bg-rose-50 text-rose-600 rounded-lg sm:rounded-xl text-xs sm:text-sm font-extrabold border border-rose-100"><XCircle className="w-4 h-4 sm:w-5 sm:h-5"/> Incorrect</span>
               )}
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
             
             <div className="mt-4 sm:mt-6 flex justify-between gap-4">
               <Button variant="outline" disabled={currentIdx === 0} onClick={() => setCurrentIdx(p => p - 1)} className="flex-1 sm:flex-none justify-center gap-2 px-4 sm:px-8 py-4 sm:py-6 text-sm sm:text-lg rounded-xl sm:rounded-2xl border-2 border-slate-200"><ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5"/> Previous</Button>
               <Button disabled={currentIdx === questions.length - 1} onClick={() => setCurrentIdx(p => p + 1)} className="flex-1 sm:flex-none justify-center gap-2 px-4 sm:px-10 py-4 sm:py-6 text-sm sm:text-lg rounded-xl sm:rounded-2xl bg-slate-900 text-white hover:bg-slate-800">Next <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5"/></Button>
             </div>

           </motion.div>
        </div>
      </div>
    </div>
  );
}
