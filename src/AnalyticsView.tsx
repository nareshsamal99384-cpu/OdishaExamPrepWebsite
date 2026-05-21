import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Target, Zap, 
  Timer, History, LayoutDashboard, Rocket,
  ArrowRight, ChevronDown
} from 'lucide-react';
import { activityTracker } from './lib/activityTracker';
import { cn } from './lib/utils';

// --- Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1, y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 }
  }
};

const AnimatedCounter = ({ value, suffix = "", decimals = 0 }: { value: number, suffix?: string, decimals?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 1200;
    let timer: any;
    
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const easeOutQuad = (t: number) => t * (2 - t);
      setDisplayValue(Number((easeOutQuad(progress) * end).toFixed(decimals)));
      if (progress < 1) {
        timer = window.requestAnimationFrame(step);
      }
    };
    
    timer = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(timer);
  }, [value, decimals]);
  
  return <>{displayValue}{suffix}</>;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100">
        <p className="text-xs font-bold text-slate-500 mb-2">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-sm font-semibold text-slate-700">{entry.name}:</span>
              <span className="text-sm font-bold text-slate-900">{entry.value}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const SubjectRow = ({ subject }: { subject: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div 
      onClick={() => setIsExpanded(!isExpanded)}
      className="flex flex-col p-4 bg-white/60 backdrop-blur-md rounded-2xl border border-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer"
    >
       <div className="flex items-center justify-between gap-3">
          <span className={cn("font-extrabold text-slate-700 min-w-0 flex-1 group-hover:text-brand-700 transition-colors text-sm", isExpanded ? "" : "truncate")} title={subject.name}>
             {subject.name}
          </span>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm font-black text-slate-400 group-hover:text-brand-500 transition-colors">{subject.avgScore}%</span>
            <span className={cn("px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap shadow-sm border border-white", subject.status === 'Strong' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
               {subject.status}
            </span>
            <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-300", isExpanded && "rotate-180")} />
          </div>
       </div>
       
       <AnimatePresence>
         {isExpanded && (
           <motion.div
             initial={{ height: 0, opacity: 0 }}
             animate={{ height: 'auto', opacity: 1 }}
             exit={{ height: 0, opacity: 0 }}
             className="overflow-hidden"
           >
             <div className="pt-4 mt-3 border-t border-slate-200/50 flex items-center justify-between">
                <div className="flex gap-6">
                  <div className="flex flex-col">
                    <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Attempted</span>
                    <span className="text-slate-700 font-extrabold text-sm">{subject.attempted}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Correct</span>
                    <span className="text-emerald-600 font-extrabold text-sm">{subject.correct}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Incorrect</span>
                    <span className="text-rose-600 font-extrabold text-sm">{subject.attempted - subject.correct}</span>
                  </div>
                </div>
             </div>
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
};

export default function AnalyticsView({ user, onNavigate }: { user: any, onNavigate?: (tab: any) => void }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      if (!user?.id) return;
      const data = await activityTracker.getActivities(user.id);
      const completions = data.filter(a => a.type === 'mock_test_completed')
        .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setActivities(completions);
      setLoading(false);
    };
    fetchActivities();
  }, [user?.id]);

  const stats = useMemo(() => {
    if (activities.length === 0) return null;

    let totalCorrect = 0;
    let totalWrong = 0;
    let totalAttempted = 0;
    let totalQuestions = 0;
    let totalTimeTaken = 0;
    let totalCalculatedScore = 0;

    // Rule 4: Recalculate results from raw answers instead of trusting stored summary values
    const recalculatedActivities = activities.map(a => {
      const rawAnswers = a.metadata?.answers || {};
      const questions = a.metadata?.test?.questions || [];
      const hasRawData = questions.length > 0 && Object.keys(rawAnswers).length > 0;

      let actCorrect = 0;
      let actWrong = 0;
      let actAttempted = 0;
      let actTotalQ = 0;
      
      // Negative marking defaults to 0 if not defined
      let negativeMarking = a.metadata?.test?.negativeMarking ?? 0;

      if (hasRawData) {
        actTotalQ = questions.length;
        actAttempted = Object.keys(rawAnswers).length;
        
        Object.entries(rawAnswers).forEach(([qIdxStr, ansIdx]) => {
          const qIdx = parseInt(qIdxStr);
          const q = questions[qIdx];
          if (q && q.correctAnswerIndex === ansIdx) {
            actCorrect++;
          } else {
            actWrong++;
          }
        });
      } else {
        // Safe fallback ONLY if raw data is missing
        actCorrect = a.correct || a.score || 0;
        actWrong = a.incorrect || 0;
        actAttempted = a.metadata?.attempted || (actCorrect + actWrong);
        actTotalQ = a.total || actAttempted;
      }

      // Rule 2: Score = Correct Answers - (Wrong Answers × Negative Marking)
      const actScore = Math.max(0, actCorrect - (actWrong * negativeMarking));
      
      // Rule 2: Accuracy (%) = (Correct Answers / Attempted Questions) * 100
      const actAccuracy = actAttempted > 0 ? (actCorrect / actAttempted) * 100 : 0;
      
      // Rule 6: Time Calculation
      const timeTaken = a.metadata?.timeTaken || a.timeSpent || 0;

      totalCorrect += actCorrect;
      totalWrong += actWrong;
      totalAttempted += actAttempted;
      totalQuestions += actTotalQ;
      totalTimeTaken += timeTaken;
      totalCalculatedScore += actScore;

      return {
        ...a,
        recal_score: actScore,
        recal_accuracy: actAccuracy,
        recal_correct: actCorrect,
        recal_wrong: actWrong,
        recal_attempted: actAttempted,
        recal_totalQ: actTotalQ,
        recal_time: timeTaken
      };
    });

    const totalTests = recalculatedActivities.length;
    
    const avgAccuracy = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;
    // Rule 6: Average Time per Question = Time Taken / Attempted Questions
    const avgTimePerQuestion = totalAttempted > 0 ? (totalTimeTaken / totalAttempted) : 0;

    // Rule 2: Unattempted = Total Questions - Attempted
    const totalSkipped = Math.max(0, totalQuestions - totalAttempted);

    const pieData = [
      { name: 'Correct', value: totalCorrect, color: '#10b981' },
      { name: 'Wrong', value: totalWrong, color: '#ef4444' },
      { name: 'Skipped', value: totalSkipped, color: '#94a3b8' }
    ];

    let impScore = 0;
    let impAcc = 0;
    if (totalTests >= 2) {
      const last = recalculatedActivities[0];
      const prev = recalculatedActivities[1];
      // Rule 5: Improvement = Current Test Score - Previous Test Score
      // Normalizing score to percentage for direct comparison
      const lastScorePct = (last.recal_score / (last.recal_totalQ || 1)) * 100;
      const prevScorePct = (prev.recal_score / (prev.recal_totalQ || 1)) * 100;
      
      impScore = lastScorePct - prevScorePct;
      impAcc = last.recal_accuracy - prev.recal_accuracy;
    }

    // Limit chart to newest 15 tests, ordered chronologically (left=oldest, right=newest)
    const recent15 = recalculatedActivities.slice(0, 15).reverse();
    const chartData = recent15.map((a, i) => ({
      name: `T${totalTests - recent15.length + i + 1}`,
      score: Math.round((a.recal_score / (a.recal_totalQ || 1)) * 100),
      accuracy: Math.round(a.recal_accuracy),
    }));

    // Rule 7: Accuracy per subject calculated from actual question-level data
    // Group subjects by Exam, then split between Practice and Mock
    const examGroups = new Map<string, {
      lastAttemptDate: string,
      totalAttempts: number,
      practiceMap: Map<string, { correct: number, attempted: number }>,
      mockMap: Map<string, { correct: number, attempted: number }>
    }>();
    const cleanSubjectName = (name: string) => {
      if (!name) return "Mixed Questions";
      
      let cleaned = name;
      // Strip out ugly backend UUIDs and system tags if they leaked into the name
      if (cleaned.match(/[0-9a-f]{8}-[0-9a-f]{4}/) || cleaned.match(/[0-9a-f]{8}/) || cleaned.includes('mockTest')) {
         cleaned = cleaned.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ig, '')
                          .replace(/[0-9a-f]{8}/ig, '')
                          .replace(/mockTest/ig, '')
                          .replace(/-/g, ' ')
                          .replace(/\s+/g, ' ')
                          .trim();
      }
      
      if (!cleaned || cleaned.length === 0 || cleaned === '•') {
         if (name.includes('•')) {
            const parts = name.split('•');
            cleaned = parts[0].trim();
         } else {
            cleaned = "Mixed Questions";
         }
      }
      
      if (cleaned.toLowerCase() === "general") {
         return "General Practice";
      }

      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    };

    const extractSubjectFromTitle = (title: string, examName: string) => {
      let t = title.replace(new RegExp(examName, 'i'), '')
                   .replace(/practice/i, '')
                   .replace(/test/i, '')
                   .replace(/mock/i, '')
                   .replace(/session/i, '')
                   .replace(/pyq/i, '')
                   .replace(/daily/i, '')
                   .replace(/-/g, '')
                   .trim();
      return t.length > 0 ? t : "Full Subject";
    };

    recalculatedActivities.forEach(a => {
      let rawTitle = a.title || "";
      if (rawTitle.includes('mockTest') || rawTitle.match(/[0-9a-f]{8}/)) {
        rawTitle = rawTitle.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ig, '')
                           .replace(/[0-9a-f]{8}/ig, '')
                           .replace(/mockTest/ig, '')
                           .replace(/_/g, ' ')
                           .trim();
        if (!rawTitle) {
          rawTitle = "Practice Session";
        }
      }

      let examName = a.metadata?.examName || a.metadata?.test?.exam;
      if (!examName || examName.match(/[0-9a-f]{8}/)) {
         if (rawTitle.includes('-')) {
            examName = rawTitle.split('-')[0].trim();
         } else {
            examName = "General";
         }
      }

      const isMockTest = a.metadata?.testCategory 
         ? a.metadata.testCategory !== 'Practice Test'
         : (a.type === 'mock_test' || a.metadata?.test?.type === 'mock_test' || rawTitle.toLowerCase().includes('mock'));
         
      const dateStr = new Date(a.timestamp || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      if (!examGroups.has(examName)) {
        examGroups.set(examName, { lastAttemptDate: dateStr, totalAttempts: 0, practiceMap: new Map(), mockMap: new Map() });
      }
      const group = examGroups.get(examName)!;
      // Activities are ordered chronologically (newest first).
      // The initialization above captures the newest date, so we don't overwrite it.
      group.totalAttempts++;

      const rawAnswers = a.metadata?.answers || {};
      const questions = a.metadata?.test?.questions || [];
      const catMeta = a.metadata?.testCategory || a.metadata?.test?.category;

      const mapToUse = isMockTest ? group.mockMap : group.practiceMap;

      if (questions.length > 0 && Object.keys(rawAnswers).length > 0) {
        Object.entries(rawAnswers).forEach(([qIdxStr, ansIdx]) => {
          const qIdx = parseInt(qIdxStr);
          const q = questions[qIdx];
          if (q) {
            let rawSub = q.subject || q.topic;
            if (!rawSub || rawSub.toLowerCase() === 'general' || rawSub.match(/[0-9a-f]{8}/)) {
               rawSub = extractSubjectFromTitle(rawTitle, examName);
            }
            if (isMockTest && catMeta && !catMeta.match(/[0-9a-f]{8}/)) {
               rawSub = rawSub.toLowerCase() === "full subject" || rawSub.toLowerCase() === "general" 
                  ? catMeta 
                  : `${catMeta} • ${rawSub}`;
            }
            const subject = cleanSubjectName(rawSub);
            const existing = mapToUse.get(subject) || { correct: 0, attempted: 0 };
            const isCorrect = q.correctAnswerIndex === ansIdx;
            
            mapToUse.set(subject, {
              correct: existing.correct + (isCorrect ? 1 : 0),
              attempted: existing.attempted + 1
            });
          }
        });
      } else {
         let rawSub = extractSubjectFromTitle(rawTitle, examName);
         if (isMockTest && catMeta && !catMeta.match(/[0-9a-f]{8}/)) {
            rawSub = rawSub.toLowerCase() === "full subject" || rawSub.toLowerCase() === "general" 
               ? catMeta 
               : `${catMeta} • ${rawSub}`;
         }
         const subject = cleanSubjectName(rawSub);
         const existing = mapToUse.get(subject) || { correct: 0, attempted: 0 };
         mapToUse.set(subject, {
            correct: existing.correct + a.recal_correct,
            attempted: existing.attempted + a.recal_attempted
         });
      }
    });
    
    const parsedExamAnalysis = Array.from(examGroups.entries()).map(([name, data]) => {
      const formatMap = (m: Map<string, any>) => {
        return Array.from(m.entries()).map(([subName, sData]) => {
          const acc = sData.attempted > 0 ? (sData.correct / sData.attempted) * 100 : 0;
          return { 
             name: subName, 
             avgScore: Math.round(acc), 
             status: acc >= 70 ? 'Strong' : 'Weak',
             correct: sData.correct,
             attempted: sData.attempted
          };
        }).sort((a, b) => b.avgScore - a.avgScore);
      };

      return {
        examName: name,
        lastAttemptDate: data.lastAttemptDate,
        totalAttempts: data.totalAttempts,
        practiceTests: formatMap(data.practiceMap),
        mockTests: formatMap(data.mockMap)
      };
    });

    const speedScore = Math.max(0, Math.min(100, 100 - ((avgTimePerQuestion - 30) / (120 - 30)) * 100));
    const enduranceScore = Math.min(100, (totalQuestions / 300) * 100);
    const attemptedWithoutSkips = totalCorrect + totalWrong;
    const precisionScore = attemptedWithoutSkips > 0 ? (totalCorrect / attemptedWithoutSkips) * 100 : 0;
    const scoringScore = totalQuestions > 0 ? (totalCalculatedScore / totalQuestions) * 100 : 0;
    const momentumScore = Math.max(0, Math.min(100, 50 + (impScore * 2)));

    const skillProfile = [
       { name: "Accuracy", value: Math.round(avgAccuracy) },
       { name: "Precision", value: Math.round(precisionScore) },
       { name: "Speed", value: Math.round(speedScore || 0) },
       { name: "Endurance", value: Math.round(enduranceScore) },
       { name: "Momentum", value: Math.round(momentumScore || 50) }
    ];

    return {
      totalTests,
      avgScore: Math.round(totalQuestions > 0 ? (totalCalculatedScore / totalQuestions) * 100 : 0),
      avgAccuracy: Math.round(avgAccuracy),
      avgTimePerQuestion,
      pieData,
      chartData,
      totalCorrect,
      totalWrong,
      totalSkipped,
      totalQuestions,
      impScore: Math.round(impScore),
      impAcc: Math.round(impAcc),
      skillProfile,
      examAnalysis: parsedExamAnalysis
    };
  }, [activities]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-48">
      <div className="w-12 h-12 border-4 border-slate-100 border-t-brand-600 rounded-full animate-spin shadow-lg shadow-brand-500/20"></div>
      <p className="mt-4 text-slate-500 font-medium">Loading precise analytics...</p>
    </div>
  );

  if (!stats) return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-6 max-w-lg mx-auto relative z-10">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-24 h-24 bg-gradient-to-br from-brand-50 to-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-brand-500/10 border border-white"
      >
        <LayoutDashboard className="w-10 h-10 text-brand-600" />
      </motion.div>
      <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">No Data Available</h2>
      <p className="text-slate-500 mb-8 font-medium text-lg leading-relaxed">Complete your first mock test to generate highly accurate performance metrics.</p>
      <motion.button 
        whileHover={{ y: -2, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onNavigate?.('home')}
        className="px-8 py-3.5 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-2xl font-bold shadow-[0_8px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_15px_30px_rgba(79,70,229,0.4)] transition-all flex items-center gap-2"
      >
        <Rocket className="w-5 h-5" />
        Take a Test
      </motion.button>
    </div>
  );

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      {/* Decorative Glass Background */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-br from-brand-100/30 via-purple-100/20 to-transparent blur-[120px] -z-10 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[800px] h-[600px] bg-gradient-to-tl from-indigo-100/20 to-transparent blur-[120px] -z-10 pointer-events-none" />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full mx-auto space-y-6 sm:space-y-8 pb-20 relative z-10"
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
          <StatCard icon={<Zap className="w-5 h-5 text-brand-600" />} title="Average Score" value={stats.avgScore} suffix="%" trend={stats.impScore} />
          <StatCard icon={<Target className="w-5 h-5 text-emerald-600" />} title="Accuracy" value={stats.avgAccuracy} suffix="%" trend={stats.impAcc} />
          <StatCard icon={<Timer className="w-5 h-5 text-amber-600" />} title="Time per Question" value={stats.avgTimePerQuestion} suffix="s" decimals={1} />
          <StatCard icon={<History className="w-5 h-5 text-indigo-600" />} title="Total Attempts" value={stats.totalTests} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            <motion.div 
              variants={itemVariants} 
              className="relative bg-white/70 backdrop-blur-2xl rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white hover:border-brand-100/50 hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-all duration-500 overflow-hidden group"
            >
               <div className="absolute -top-32 -right-32 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl group-hover:bg-brand-500/10 transition-colors duration-500 pointer-events-none" />
               <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <div>
                     <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Performance Trend</h3>
                     <p className="text-sm font-medium text-slate-500">Your score history over time</p>
                  </div>
                  {stats.impScore !== 0 && (
                    <div className={cn("px-3 py-1.5 rounded-xl flex items-center gap-2 text-sm font-bold shadow-sm border border-white/50", stats.impScore > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
                       {stats.impScore > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                       {Math.abs(stats.impScore)}% {stats.impScore > 0 ? 'Improvement' : 'Drop'}
                    </div>
                  )}
               </div>
               
               {stats.chartData.length > 0 ? (
                 <div className="w-full h-[300px] relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                             <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                             </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} domain={[0, 100]} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="score" name="Score" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#scoreGrad)" activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5', style: { filter: 'drop-shadow(0px 4px 8px rgba(79,70,229,0.5))' } }} />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
               ) : (
                 <div className="w-full h-[300px] flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100/50">
                   <p className="text-slate-400 font-bold text-sm">Not enough data to plot a trend.</p>
                 </div>
               )}
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
               <motion.div variants={itemVariants} whileHover={{ y: -4, scale: 0.99 }} className="bg-white/70 backdrop-blur-xl rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white hover:border-brand-100/50 hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-all duration-300 flex gap-5 items-start">
                  <div className={cn("p-3.5 rounded-2xl shrink-0 shadow-sm border border-white", stats.impScore >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                     {stats.impScore >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                  </div>
                  <div>
                     <h4 className="font-extrabold text-slate-900 mb-1.5 tracking-tight">{stats.impScore >= 0 ? "You are improving" : "Scores dropped recently"}</h4>
                     <p className="text-sm font-medium text-slate-500 leading-relaxed">{stats.impScore >= 0 ? "Your latest test scores show positive momentum. Keep up the good work!" : "Review your recent mistakes to get back on track."}</p>
                  </div>
               </motion.div>
               <motion.div variants={itemVariants} whileHover={{ y: -4, scale: 0.99 }} className="bg-white/70 backdrop-blur-xl rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white hover:border-brand-100/50 hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-all duration-300 flex gap-5 items-start">
                  <div className={cn("p-3.5 rounded-2xl shrink-0 shadow-sm border border-white", stats.avgTimePerQuestion > 60 ? "bg-amber-50 text-amber-600" : "bg-brand-50 text-brand-600")}>
                     <Timer className="w-6 h-6" />
                  </div>
                  <div>
                     <h4 className="font-extrabold text-slate-900 mb-1.5 tracking-tight">{stats.avgTimePerQuestion > 60 ? "You need to improve speed" : "Your speed is good"}</h4>
                     <p className="text-sm font-medium text-slate-500 leading-relaxed">You are averaging {stats.avgTimePerQuestion.toFixed(1)}s per question. {stats.avgTimePerQuestion > 60 ? "Try to solve familiar questions faster." : "Maintain this pace in real exams."}</p>
                  </div>
               </motion.div>
            </div>

            <motion.div 
              variants={itemVariants} 
              whileHover={{ y: -4 }}
              className="relative bg-gradient-to-br from-brand-600 via-indigo-600 to-purple-700 rounded-[2rem] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between shadow-[0_15px_40px_-10px_rgba(79,70,229,0.5)] border border-brand-400/30 gap-6 overflow-hidden transition-all duration-500 hover:shadow-[0_25px_50px_-12px_rgba(79,70,229,0.6)]"
            >
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
              <div className="text-center sm:text-left relative z-10">
                <h3 className="text-2xl font-extrabold text-white mb-2 tracking-tight">What to improve next</h3>
                <p className="text-brand-100 text-sm font-medium text-opacity-90">Focus on your weak topics in the next mock test to maximize your score.</p>
              </div>
              <motion.button 
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigate?.('home')} 
                className="relative z-10 px-8 py-3.5 bg-white text-brand-700 rounded-2xl font-extrabold shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_15px_25px_rgba(0,0,0,0.2)] transition-all duration-300 flex items-center gap-2 shrink-0 whitespace-nowrap"
              >
                Start Next Test
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          </div>

          <div className="space-y-6 sm:space-y-8">
            <motion.div variants={itemVariants} className="bg-white/70 backdrop-blur-xl rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white hover:border-brand-100/50 hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-all duration-500 relative overflow-hidden group">
               <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-brand-500/5 rounded-full blur-3xl group-hover:bg-brand-500/10 transition-colors duration-500 pointer-events-none" />
               <h3 className="text-xl font-extrabold text-slate-900 mb-8 tracking-tight relative z-10 text-center">Accuracy Breakdown</h3>
               
               {stats.totalQuestions > 0 ? (
                 <div className="relative z-10">
                   <div className="w-full aspect-square relative max-w-[200px] mx-auto mb-8 drop-shadow-xl">
                      <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                            <Pie data={stats.pieData} innerRadius={65} outerRadius={90} paddingAngle={6} dataKey="value" stroke="none">
                               {stats.pieData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                         </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                         <span className="text-4xl font-black text-slate-900 leading-none tracking-tight">{stats.totalQuestions}</span>
                         <span className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Total Qs</span>
                      </div>
                   </div>
                   <div className="space-y-3">
                      <AccuracyRow label="Correct" value={stats.totalCorrect} total={stats.totalQuestions} color="bg-emerald-500" />
                      <AccuracyRow label="Wrong" value={stats.totalWrong} total={stats.totalQuestions} color="bg-rose-500" />
                      <AccuracyRow label="Skipped" value={stats.totalSkipped} total={stats.totalQuestions} color="bg-slate-400" />
                   </div>
                 </div>
               ) : (
                 <div className="p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/60 text-center text-sm font-semibold text-slate-500">
                   No question data available to calculate breakdown.
                 </div>
               )}
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white/70 backdrop-blur-xl rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white hover:border-brand-100/50 hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-all duration-500 relative overflow-hidden group">
               <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-brand-500/5 rounded-full blur-3xl group-hover:bg-brand-500/10 transition-colors duration-500 pointer-events-none" />
               <h3 className="text-xl font-extrabold text-slate-900 mb-8 tracking-tight relative z-10 text-center">Overall Skill Profile</h3>
               
               {stats.skillProfile && stats.totalQuestions > 0 ? (
                 <div className="w-full h-[300px] sm:h-[350px] mb-4 mt-2 relative z-10 drop-shadow-sm flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                       <RadarChart cx="50%" cy="50%" outerRadius={window.innerWidth > 640 ? "55%" : "60%"} data={stats.skillProfile} margin={{ top: 10, right: 35, bottom: 10, left: 35 }}>
                          <defs>
                             <linearGradient id="overallRadarGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.7}/>
                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                             </linearGradient>
                          </defs>
                          <PolarGrid stroke="#cbd5e1" strokeDasharray="4 4" />
                          <PolarAngleAxis dataKey="name" tick={{ fill: '#475569', fontSize: window.innerWidth > 640 ? 12 : 10, fontWeight: 700 }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} tickCount={6} />
                          <Radar 
                            name="Skill Level" 
                            dataKey="value" 
                            stroke="#4f46e5" 
                            strokeWidth={3} 
                            fill="url(#overallRadarGrad)" 
                            activeDot={{ r: 5, fill: '#4f46e5', strokeWidth: 2, stroke: '#ffffff', style: { filter: 'drop-shadow(0px 2px 4px rgba(79,70,229,0.5))' } }} 
                          />
                          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }} />
                       </RadarChart>
                    </ResponsiveContainer>
                 </div>
               ) : (
                 <div className="p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/60 text-center text-sm font-semibold text-slate-500">
                   No subject data available to map your profile.
                 </div>
               )}
            </motion.div>

            {stats.examAnalysis && stats.examAnalysis.length > 0 && (
              <div className="flex flex-col gap-6 sm:gap-8 max-h-[600px] lg:max-h-[750px] overflow-y-auto custom-scrollbar pr-2 sm:pr-4 pb-2 -mr-2 sm:-mr-4 relative">
                {stats.examAnalysis.map((exam: any, idx: number) => (
                  <motion.div key={idx} variants={itemVariants} className="bg-white/70 backdrop-blur-xl rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white hover:border-brand-100/50 hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-all duration-500 relative overflow-hidden flex flex-col shrink-0">
                 <div className="mb-6 relative z-10">
                    <div className="mb-3">
                       <span className="px-3 py-1.5 bg-slate-900 text-white text-[11px] font-extrabold rounded-lg uppercase tracking-widest shadow-md">
                          {exam.examName} – Analytics
                       </span>
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900 leading-tight mb-1 tracking-tight">Performance Breakdown</h3>
                    <p className="text-sm text-slate-500 font-bold">Total Attempts: {exam.totalAttempts} • Last Attempt: {exam.lastAttemptDate}</p>
                 </div>
                 
                 {(() => {
                   const combinedSubjects = [...(exam.mockTests || []), ...(exam.practiceTests || [])];
                   const uniqueMap = new Map();
                   
                   // Ensure 100% data accuracy by truly merging all correct and attempted counts for the same subject
                   combinedSubjects.forEach(s => {
                     if (!uniqueMap.has(s.name)) {
                       uniqueMap.set(s.name, { ...s });
                     } else {
                       const existing = uniqueMap.get(s.name);
                       existing.correct += (s.correct || 0);
                       existing.attempted += (s.attempted || 0);
                       const newAcc = existing.attempted > 0 ? (existing.correct / existing.attempted) * 100 : 0;
                       existing.avgScore = Math.round(newAcc);
                       existing.status = newAcc >= 70 ? 'Strong' : 'Weak';
                     }
                   });
                   let uniqueSubjects = Array.from(uniqueMap.values());
                   
                   if (uniqueSubjects.length > 0) {
                     return (
                       <div className="w-full h-[220px] mb-6 relative z-10">
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={uniqueSubjects} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                   <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9}/>
                                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                                   </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} domain={[0, 100]} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="avgScore" name="Accuracy" fill="url(#barGrad)" radius={[4, 4, 0, 0]} barSize={40} />
                             </BarChart>
                          </ResponsiveContainer>
                       </div>
                     );
                   }
                   return null;
                 })()}

                 <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-6 relative z-10" />

                 <div className="space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 relative z-10">
                    {exam.mockTests && exam.mockTests.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Mock Tests</h4>
                        <div className="space-y-3">
                          {exam.mockTests.map((subject: any, i: number) => (
                             <SubjectRow key={`m-${i}`} subject={subject} />
                          ))}
                        </div>
                      </div>
                    )}

                    {exam.practiceTests && exam.practiceTests.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">Practice Sessions</h4>
                        <div className="space-y-3">
                          {exam.practiceTests.map((subject: any, i: number) => (
                             <SubjectRow key={`p-${i}`} subject={subject} />
                          ))}
                        </div>
                      </div>
                    )}

                    {(!exam.practiceTests || exam.practiceTests.length === 0) && (!exam.mockTests || exam.mockTests.length === 0) && (
                      <div className="p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/60 text-center text-sm font-semibold text-slate-500">
                        No subject data available. Complete more diverse tests to build this profile.
                      </div>
                    )}
                 </div>
              </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({ icon, title, value, suffix = "", trend, decimals = 0 }: any) {
  const isPositive = (trend ?? 0) >= 0;
  return (
    <motion.div 
      variants={itemVariants} 
      whileHover={{ y: -6, scale: 0.99 }}
      whileTap={{ scale: 0.97 }}
      className="relative overflow-hidden bg-white/70 backdrop-blur-xl p-4 sm:p-7 rounded-[1.5rem] sm:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white hover:border-brand-100/50 flex flex-col justify-between group transition-all duration-500 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] cursor-default"
    >
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/5 rounded-full blur-3xl group-hover:bg-brand-500/10 transition-colors duration-700 pointer-events-none" />
      <div className="relative z-10 flex items-center justify-between mb-3 sm:mb-6">
         <div className="p-2 sm:p-3 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 text-slate-600 group-hover:text-brand-600 group-hover:bg-brand-50 transition-colors duration-300">
            {icon}
         </div>
         {trend !== undefined && trend !== 0 && (
            <div className={cn(
               "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-extrabold shadow-sm border border-white",
               isPositive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            )}>
               {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
               {Math.abs(Math.round(trend))}%
            </div>
         )}
      </div>
      <div className="relative z-10 mt-auto">
        <div className="text-[1.75rem] sm:text-4xl font-black text-slate-900 flex items-baseline gap-1 mb-0.5 sm:mb-1.5 tracking-tight group-hover:text-brand-900 transition-colors duration-300 leading-none">
           <AnimatedCounter value={value} decimals={decimals} />
           {suffix && <span className="text-sm sm:text-lg font-bold text-slate-400">{suffix}</span>}
        </div>
        <h4 className="text-[11px] sm:text-sm font-bold text-slate-500 leading-tight mt-1 sm:mt-0">{title}</h4>
      </div>
    </motion.div>
  );
}

function AccuracyRow({ label, value, total, color }: { label: string, value: number, total: number, color: string }) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between p-3.5 bg-white/60 backdrop-blur-md rounded-2xl border border-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
       <div className="flex items-center gap-3.5">
          <div className={cn("w-3.5 h-3.5 rounded-full shadow-inner", color)} />
          <span className="text-sm font-extrabold text-slate-700 group-hover:text-slate-900 transition-colors">{label}</span>
       </div>
       <div className="flex items-center gap-5">
          <span className="text-base font-black text-slate-900">{value}</span>
          <span className="text-sm font-extrabold text-slate-400 w-10 text-right">{percentage}%</span>
       </div>
    </div>
  );
}
