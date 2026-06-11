import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Target, Zap, 
  Timer, History, LayoutDashboard, Rocket,
  ArrowRight, ChevronDown, Crosshair, Flame,
  Sparkles, Brain, Cpu, Send, Activity, 
  Gauge, Lightbulb, Loader2, RefreshCw, Trash2
} from 'lucide-react';
import { activityTracker } from './lib/activityTracker';
import { cn } from './lib/utils';
import { stagger } from './lib/animations';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const MathTextRenderer = ({ text, isUser = false }: { text: string; isUser?: boolean }) => {
  if (!text) return null;
  const parts = text.split(/(\$\$.*?\$\$|\$.*?\$)/g);
  return (
    <span>
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2);
          try {
            const html = katex.renderToString(math, {
              throwOnError: false,
              displayMode: true,
            });
            return (
              <span
                key={index}
                className="block my-2 overflow-x-auto custom-scrollbar text-center"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (e) {
            return <code key={index}>{part}</code>;
          }
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1);
          try {
            const html = katex.renderToString(math, {
              throwOnError: false,
              displayMode: false,
            });
            return (
              <span
                key={index}
                className={cn(
                  "inline-block px-0.5 align-middle font-serif font-bold",
                  isUser ? "text-amber-250" : "text-[#8A1C36]"
                )}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (e) {
            return <code key={index}>{part}</code>;
          }
        } else {
          return <span key={index}>{part}</span>;
        }
      })}
    </span>
  );
};

const MarkdownMathRenderer = ({ text, isUser = false }: { text: string; isUser?: boolean }) => {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-2 text-left w-full whitespace-pre-wrap">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('### ')) {
          return <h4 key={lineIdx} className={cn("text-xs font-black mt-3 mb-1 uppercase tracking-wider", isUser ? "text-white" : "text-[#8A1C36]")}><MathTextRenderer text={trimmed.substring(4)} isUser={isUser} /></h4>;
        }
        if (trimmed.startsWith('## ')) {
          return <h3 key={lineIdx} className={cn("text-sm font-black mt-4 mb-1.5 uppercase tracking-wide", isUser ? "text-white" : "text-slate-900")}><MathTextRenderer text={trimmed.substring(3)} isUser={isUser} /></h3>;
        }
        if (trimmed.startsWith('# ')) {
          return <h2 key={lineIdx} className={cn("text-base font-black mt-5 mb-2", isUser ? "text-white" : "text-slate-900")}><MathTextRenderer text={trimmed.substring(2)} isUser={isUser} /></h2>;
        }

        let isBullet = false;
        let listContent = trimmed;
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          isBullet = true;
          listContent = trimmed.substring(2);
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        let isNumbered = false;
        let numLabel = "";
        if (numMatch) {
          isNumbered = true;
          numLabel = numMatch[1];
          listContent = numMatch[2];
        }

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
              <span className={cn("leading-relaxed font-semibold flex-1 text-xs text-slate-700", isUser ? "text-brand-50" : "text-slate-700")}>{renderInline(listContent)}</span>
            </div>
          );
        }

        if (isNumbered) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-3 my-0.5">
              <span className={cn("font-black text-xs shrink-0 mt-0.5", isUser ? "text-brand-200" : "text-[#8A1C36]")}>{numLabel}.</span>
              <span className={cn("leading-relaxed font-semibold flex-1 text-xs text-slate-700", isUser ? "text-brand-50" : "text-slate-700")}>{renderInline(listContent)}</span>
            </div>
          );
        }

        return (
          <p key={lineIdx} className={cn("leading-relaxed font-semibold text-xs text-slate-700", isUser ? "text-brand-50" : "text-slate-700")}>
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
};

const cleanSubjectName = (name: string) => {
  if (!name) return "Mixed Questions";
  let cleaned = name;
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

const calculateStats = (completions: any[]) => {
  if (completions.length === 0) return null;

  let totalCorrect = 0;
  let totalWrong = 0;
  let totalAttempted = 0;
  let totalQuestions = 0;
  let totalTimeTaken = 0;
  let totalCalculatedScore = 0;

  const recalculatedActivities = completions.map(a => {
    const rawAnswers = a.metadata?.answers || {};
    const questions = a.metadata?.test?.questions || [];
    const hasRawData = questions.length > 0 && Object.keys(rawAnswers).length > 0;

    let actCorrect = 0;
    let actWrong = 0;
    let actAttempted = 0;
    let actTotalQ = 0;
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
      actCorrect = a.correct || a.score || 0;
      actWrong = a.incorrect || 0;
      actAttempted = a.metadata?.attempted || (actCorrect + actWrong);
      actTotalQ = a.total || actAttempted;
    }

    const actScore = Math.max(0, actCorrect - (actWrong * negativeMarking));
    const actAccuracy = actAttempted > 0 ? (actCorrect / actAttempted) * 100 : 0;
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
  const avgTimePerQuestion = totalAttempted > 0 ? (totalTimeTaken / totalAttempted) : 0;
  const totalSkipped = Math.max(0, totalQuestions - totalAttempted);

  const pieData = [
    { name: 'Correct', value: totalCorrect, color: '#10b981' },
    { name: 'Wrong', value: totalWrong, color: '#f43f5e' },
    { name: 'Skipped', value: totalSkipped, color: '#94a3b8' }
  ];

  let impScore = 0;
  let impAcc = 0;
  if (totalTests >= 2) {
    const last = recalculatedActivities[recalculatedActivities.length - 1];
    const prev = recalculatedActivities[recalculatedActivities.length - 2];
    const lastScorePct = (last.recal_score / (last.recal_totalQ || 1)) * 100;
    const prevScorePct = (prev.recal_score / (prev.recal_totalQ || 1)) * 100;
    
    impScore = lastScorePct - prevScorePct;
    impAcc = last.recal_accuracy - prev.recal_accuracy;
  }

  const recent15 = recalculatedActivities.slice(-15);
  const chartData = recent15.map((a, i) => ({
    name: `T${totalTests - recent15.length + i + 1}`,
    score: Math.round((a.recal_score / (a.recal_totalQ || 1)) * 100),
    accuracy: Math.round(a.recal_accuracy),
    time: a.recal_attempted > 0 ? Math.round(a.recal_time / a.recal_attempted) : 0,
  }));

  const examGroups = new Map<string, {
    lastAttemptDate: string,
    totalAttempts: number,
    practiceMap: Map<string, { correct: number, attempted: number }>,
    mockMap: Map<string, { correct: number, attempted: number }>
  }>();

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
};

const AnimatedCounter = ({ value, suffix = "", decimals = 0 }: { value: number, suffix?: string, decimals?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 850;
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
      <div className="bg-slate-950/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border border-slate-800 text-white">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
              <span className="text-xs font-semibold text-slate-350">{entry.name}:</span>
              <span className="text-xs font-bold text-white">{entry.value}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const Sparkline = ({ data, color = "#8a1c36", id }: { data: number[]; color?: string; id: string }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min === 0 ? 1 : max - min;
  const height = 32;
  const width = 100;
  
  const points = data.map((val, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height + 2;
    return { x, y };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPoints = [
    `0,${height + 4}`,
    ...points.map(p => `${p.x},${p.y}`),
    `${width},${height + 4}`
  ].join(' ');

  const gradId = `sparkline-grad-${id}`;

  return (
    <svg className="w-24 h-10 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <polygon
        fill={`url(#${gradId})`}
        points={areaPoints}
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polylinePoints}
      />
    </svg>
  );
};

function StatCard({ icon, title, value, suffix = "", trend, decimals = 0, sparklineData, color = "brand" }: any) {
  const isPositive = (trend ?? 0) >= 0;
  const strokeColor = color === "brand" ? "#8a1c36" : color === "success" ? "#10b981" : color === "warning" ? "#d97706" : "#6366f1";
  
  const iconBg = color === "brand" 
    ? "bg-[#8a1c36]/5 text-[#8a1c36] border-[#8a1c36]/10 hover:bg-[#8a1c36]/10" 
    : color === "success" 
      ? "bg-emerald-50/70 text-emerald-600 border-emerald-100/60 hover:bg-emerald-100/50" 
      : color === "warning" 
        ? "bg-amber-50/70 text-amber-600 border-amber-100/60 hover:bg-amber-100/50" 
        : "bg-indigo-50/70 text-indigo-600 border-indigo-100/60 hover:bg-indigo-100/50";

  return (
    <motion.div 
      variants={stagger.itemFadeUp} 
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative overflow-hidden bg-white/65 backdrop-blur-xl p-5 sm:p-6 rounded-[2.25rem] shadow-[0_8px_32px_rgba(0,0,0,0.015)] border border-white/80 flex flex-col justify-between group transition-all duration-500 cursor-default",
        color === "brand" ? "hover:shadow-[0_20px_40px_rgba(138,28,54,0.065)] hover:border-brand-200/50" :
        color === "success" ? "hover:shadow-[0_20px_40px_rgba(16,185,129,0.065)] hover:border-emerald-200/50" :
        color === "warning" ? "hover:shadow-[0_20px_40px_rgba(217,119,6,0.065)] hover:border-amber-200/50" :
        "hover:shadow-[0_20px_40px_rgba(99,102,241,0.065)] hover:border-indigo-200/50"
      )}
    >
      <div className={cn(
        "absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20 group-hover:opacity-30 transition-all duration-500",
        color === "brand" ? "bg-[#8a1c36]" :
        color === "success" ? "bg-[#10b981]" :
        color === "warning" ? "bg-[#d97706]" :
        "bg-[#6366f1]"
      )} />
      
      <div className="relative z-10 flex items-center justify-between mb-5">
         <div className={cn("p-3 rounded-2xl border shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:rotate-2", iconBg)}>
            {icon}
         </div>
         {trend !== undefined && trend !== 0 && (
            <div className={cn(
               "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-black shadow-sm border border-white/80 transition-transform duration-300 group-hover:scale-103",
               isPositive ? "bg-emerald-50/80 text-emerald-700 border-emerald-100" : "bg-rose-50/80 text-rose-700 border-rose-100"
            )}>
               {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
               {Math.abs(Math.round(trend))}%
            </div>
         )}
      </div>

      <div className="relative z-10 flex items-end justify-between mt-auto">
        <div className="space-y-1.5 flex-1">
          <h4 className="text-[10px] font-sans font-black tracking-widest text-slate-400/90 uppercase leading-none">{title}</h4>
          <div className="text-3xl sm:text-4xl font-sans font-black text-slate-900 flex items-baseline tracking-tight group-hover:text-slate-950 transition-colors duration-300 leading-none mt-1">
             <AnimatedCounter value={value} decimals={decimals} />
             {suffix && <span className="text-sm font-sans font-black text-slate-400/80 ml-1 leading-none">{suffix}</span>}
          </div>
        </div>
        
        {sparklineData && sparklineData.length >= 2 && (
          <div className="pb-1 pl-4 opacity-85 group-hover:opacity-100 transition-opacity duration-300 shrink-0">
            <Sparkline data={sparklineData} color={strokeColor} id={title.replace(/\s+/g, '-').toLowerCase()} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AccuracyRow({ label, value, total, color }: { label: string, value: number, total: number, color: string }) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  const circleColor = color === "bg-rose-500" ? "bg-rose-500" : color;

  return (
    <div className="flex items-center justify-between p-3.5 bg-white/40 border border-white/60 backdrop-blur-md rounded-[1.25rem] hover:bg-white/80 hover:border-slate-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.025)] hover:-translate-y-0.5 transition-all duration-300 group">
       <div className="flex items-center gap-3 font-sans">
          <div className={cn("w-2.5 h-2.5 rounded-full border-2 border-white shadow-[0_0_6px_rgba(0,0,0,0.05)]", circleColor)} />
          <span className="text-[10px] font-black text-slate-500 group-hover:text-slate-800 transition-colors uppercase tracking-wider">{label}</span>
       </div>
       <div className="flex items-center gap-4 font-sans">
          <span className="text-xs font-black text-slate-800">{value}</span>
          <span className="text-[10px] font-black text-slate-450 px-2.5 py-0.5 bg-white border border-slate-100 rounded-lg leading-none">{percentage}%</span>
       </div>
    </div>
  );
}

const SubjectRow = ({ subject }: { subject: any; key?: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const incorrect = Math.max(0, subject.attempted - subject.correct);
  const correctPct = subject.attempted > 0 ? Math.round((subject.correct / subject.attempted) * 100) : 0;
  const incorrectPct = subject.attempted > 0 ? Math.round((incorrect / subject.attempted) * 100) : 0;

  return (
    <div 
      onClick={() => setIsExpanded(!isExpanded)}
      className={cn(
        "flex flex-col p-4 bg-white/45 backdrop-blur-md rounded-2xl border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.005)] hover:bg-white/80 hover:border-brand-200/40 hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer relative overflow-hidden",
        isExpanded && "bg-white/85 border-brand-200/30 shadow-[0_8px_20px_rgba(138,28,54,0.02)]"
      )}
    >
       <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex flex-col min-w-0 flex-1">
             <span 
                className={cn(
                   "font-sans font-black text-slate-800 group-hover:text-[#8a1c36] transition-colors text-xs sm:text-sm", 
                   isExpanded ? "" : "truncate"
                )} 
                title={subject.name}
             >
                {subject.name}
             </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs sm:text-sm font-sans font-black text-slate-800 group-hover:text-[#8a1c36] transition-colors">{subject.avgScore}%</span>
            <span className={cn(
              "px-2.5 py-1 rounded-lg text-[9px] font-sans font-black uppercase tracking-wider leading-none shadow-sm border", 
              subject.status === 'Strong' 
                 ? "bg-emerald-50 text-emerald-700 border-emerald-100/70" 
                 : "bg-rose-50 text-rose-700 border-rose-100/70"
            )}>
               {subject.status}
            </span>
            <ChevronDown className={cn("w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-all duration-300", isExpanded && "rotate-180")} />
          </div>
       </div>
       
       {/* Subtle Accuracy Meter underneath */}
       {!isExpanded && (
         <div className="w-full h-1 bg-slate-100/60 rounded-full overflow-hidden mt-2.5">
            <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${subject.avgScore}%` }}
               transition={{ duration: 0.85, ease: "easeOut" }}
               className={cn(
                 "h-full rounded-full bg-gradient-to-r", 
                 subject.avgScore >= 70 ? "from-emerald-500 to-emerald-400" : "from-rose-500 to-rose-450"
               )}
            />
         </div>
       )}
       
       <AnimatePresence>
         {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-3 border-t border-slate-100/60 relative z-10">
                 <div className="grid grid-cols-3 gap-2.5">
                   {/* Attempted stat box */}
                   <div className="p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl text-center flex flex-col justify-between items-center hover:bg-slate-100/40 transition-colors">
                     <span className="text-slate-400 font-sans font-black uppercase tracking-widest text-[8px] leading-none mb-1">Attempted</span>
                     <span className="text-slate-800 font-sans font-black text-sm">{subject.attempted}</span>
                     <span className="text-[7.5px] font-bold text-slate-400 uppercase mt-1 leading-none">Questions</span>
                   </div>
                   
                   {/* Correct stat box */}
                   <div className="p-2.5 bg-emerald-50/30 border border-emerald-100/40 rounded-xl text-center flex flex-col justify-between items-center hover:bg-emerald-50/55 transition-colors">
                     <span className="text-emerald-700/80 font-sans font-black uppercase tracking-widest text-[8px] leading-none mb-1">Correct</span>
                     <span className="text-emerald-600 font-sans font-black text-sm">{subject.correct}</span>
                     <span className="text-[7.5px] font-sans font-black text-emerald-500/80 uppercase mt-1 leading-none">{correctPct}% Acc</span>
                   </div>
                   
                   {/* Incorrect stat box */}
                   <div className="p-2.5 bg-rose-50/30 border border-rose-100/40 rounded-xl text-center flex flex-col justify-between items-center hover:bg-rose-50/55 transition-colors">
                     <span className="text-rose-700/80 font-sans font-black uppercase tracking-widest text-[8px] leading-none mb-1">Incorrect</span>
                     <span className="text-rose-600 font-sans font-black text-sm">{incorrect}</span>
                     <span className="text-[7.5px] font-sans font-black text-rose-500/80 uppercase mt-1 leading-none">{incorrectPct}% Pct</span>
                   </div>
                 </div>
              </div>
            </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
};

function SkeletonStatCard() {
  return (
    <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl p-5 sm:p-6 rounded-[2.25rem] shadow-[0_8px_32px_rgba(0,0,0,0.015)] border border-white/80 flex flex-col justify-between min-h-[142px] animate-pulse">
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-slate-150/40 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div className="p-3 bg-slate-200/50 rounded-2xl border border-slate-150/60 w-11 h-11" />
        <div className="px-2.5 py-1.5 bg-slate-200/50 rounded-xl w-14 h-7 border border-slate-150/60" />
      </div>
      <div className="relative z-10 flex items-end justify-between mt-auto">
        <div className="space-y-2 flex-1">
          <div className="h-3 w-20 bg-slate-200/60 rounded-md" />
          <div className="h-9 w-28 bg-slate-200/70 rounded-xl mt-1.5" />
        </div>
        <div className="w-24 h-10 bg-slate-200/40 rounded-xl shrink-0 ml-4" />
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="w-full mx-auto space-y-6 sm:space-y-8 pb-20 relative z-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Trend skeleton */}
        <div className="lg:col-span-8 relative bg-white/60 backdrop-blur-xl rounded-[2.0rem] p-6 sm:p-8 border border-white animate-pulse overflow-hidden">
           <div className="absolute -top-32 -right-32 w-64 h-64 bg-slate-100 rounded-full blur-3xl pointer-events-none" />
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="space-y-2">
                 <div className="h-6 w-40 bg-slate-200 rounded-lg" />
                 <div className="h-4 w-60 bg-slate-150 rounded-md" />
              </div>
              <div className="w-28 h-8 bg-slate-200 rounded-xl" />
           </div>
           <div className="w-full h-[300px] bg-slate-100/55 rounded-2xl border border-slate-150/40 flex items-center justify-center animate-pulse" />
        </div>

        {/* Pie skeleton */}
        <div className="lg:col-span-4 bg-white/66 backdrop-blur-xl rounded-[2.0rem] p-6 border border-white animate-pulse flex flex-col items-center overflow-hidden">
           <div className="h-6 w-40 bg-slate-200 rounded-md mb-8" />
           <div className="w-44 h-44 rounded-full border-[12px] border-slate-100 flex items-center justify-center mb-8 relative">
              <div className="flex flex-col items-center gap-1.5">
                 <div className="h-7 w-12 bg-slate-200 rounded-lg" />
                 <div className="h-3.5 w-14 bg-slate-150 rounded-md" />
              </div>
           </div>
           <div className="w-full space-y-3">
              <div className="h-12 bg-slate-100/80 rounded-2xl" />
              <div className="h-12 bg-slate-100/80 rounded-2xl" />
           </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsViewInner({ user, activities: propActivities, onNavigate }: { user: any, activities?: any[], onNavigate?: (tab: any) => void }) {
  const [activities, setActivities] = useState<any[]>(() => {
    const rawData = (propActivities && propActivities.length > 0)
      ? propActivities
      : (user?.id ? activityTracker.getActivities(user.id) : []);
    return rawData.filter(a => a.type === 'mock_test_completed')
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  });
  const [loading, setLoading] = useState(() => !user?.id);

  // AI Performance Lab States
  const [aiInsight, setAiInsight] = useState<string>('');
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [scanningPhase, setScanningPhase] = useState<number>(0); // 0 = idle, 1 = scanning, 2 = loaded
  const [scanStep, setScanStep] = useState<string>('');
  const [aiPanelTab, setAiPanelTab] = useState<'diagnostic' | 'actionPlan' | 'chat'>('diagnostic');
  const [chatInput, setChatInput] = useState<string>('');
  const [rawChatHistory, setRawChatHistory] = useState<any[]>(() => {
    try {
      const storageKey = `oep_analytics_coach_messages_${user?.id || 'guest'}`;
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const chatHistory = rawChatHistory;

  const setChatHistory = (newHistory: any[] | ((prev: any[]) => any[])) => {
    setRawChatHistory(prev => {
      const next = typeof newHistory === 'function' ? (newHistory as any)(prev) : newHistory;
      try {
        const storageKey = `oep_analytics_coach_messages_${user?.id || 'guest'}`;
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (e) {
        console.error("Failed to save chat history:", e);
      }
      return next;
    });
  };

  // Sync chat history when user ID changes (e.g. login/logout)
  useEffect(() => {
    try {
      const storageKey = `oep_analytics_coach_messages_${user?.id || 'guest'}`;
      const saved = localStorage.getItem(storageKey);
      setRawChatHistory(saved ? JSON.parse(saved) : []);
    } catch (e) {
      setRawChatHistory([]);
    }
  }, [user?.id]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [checkedActions, setCheckedActions] = useState<Record<number, boolean>>({});
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat container to bottom locally
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatHistory, chatLoading]);

  useEffect(() => {
    const rawData = (propActivities && propActivities.length > 0)
      ? propActivities
      : (user?.id ? activityTracker.getActivities(user.id) : []);
    const completions = rawData.filter(a => a.type === 'mock_test_completed')
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    setActivities(completions);
    setLoading(false);
  }, [user?.id, propActivities]);

  const stats = useMemo(() => calculateStats(activities), [activities]);

  const assistantChips = useMemo(() => {
    const defaultChips = [
      "Analyze my speed versus accuracy.",
      "Give me shortcuts for Mathematics.",
      "Why is my momentum score low?",
      "Design a 5-day custom study plan."
    ];

    if (!stats) return defaultChips;

    let weakestSub = "";
    let lowestScore = 100;
    
    stats.examAnalysis.forEach(exam => {
      const allTests = [...(exam.practiceTests || []), ...(exam.mockTests || [])];
      allTests.forEach(test => {
        if (test.avgScore < lowestScore && test.name) {
          lowestScore = test.avgScore;
          weakestSub = test.name;
        }
      });
    });

    const chips: string[] = [];

    const speed = stats.avgTimePerQuestion;
    if (speed > 45) {
      chips.push(`How can I reduce my slow speed of ${speed.toFixed(0)}s per question?`);
    } else if (speed < 20 && stats.avgAccuracy < 60) {
      chips.push(`My speed is fast (${speed.toFixed(0)}s) but accuracy is low (${stats.avgAccuracy}%). How do I balance them?`);
    } else {
      chips.push("Analyze my speed versus accuracy balance.");
    }

    if (weakestSub && lowestScore < 75) {
      chips.push(`Explain the high-yield topics and shortcuts for ${weakestSub}.`);
    } else {
      chips.push("Give me high-yield shortcuts for Mathematics.");
    }

    const momentum = stats.skillProfile.find(s => s.name === "Momentum")?.value ?? 50;
    if (momentum < 45) {
      chips.push(`Why is my performance momentum dropping and how do I fix it?`);
    } else if (stats.impScore > 0) {
      chips.push(`How do I sustain my recent +${stats.impScore}% score improvement?`);
    } else {
      chips.push("Why is my momentum score low compared to accuracy?");
    }

    const targetScore = Math.min(95, Math.max(75, stats.avgScore + 10));
    if (stats.avgScore < 50) {
      chips.push(`Design a 7-day emergency study roadmap to hit ${targetScore}% score.`);
    } else {
      chips.push(`Design a 5-day custom plan to scale my score to ${targetScore}%.`);
    }

    return chips;
  }, [stats]);

  // Load AI Insights from cache if available
  useEffect(() => {
    if (!user?.id || !stats) return;
    const cacheKey = `oep_ai_insights_${user.id}_${stats.totalTests}_${stats.avgScore}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setAiInsight(parsed.diagnostic || '');
        setActionItems(parsed.actionPlan || []);
        setScanningPhase(2);
      } catch (e) {}
    } else {
      setScanningPhase(0);
      setAiInsight('');
      setActionItems([]);
    }
  }, [user?.id, stats?.totalTests, stats?.avgScore]);

  const cleanJson = (str: string) => {
    let cleaned = str.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }
    return cleaned;
  };

  const runAiAnalysis = async (force = false) => {
    let currentStats = stats;

    if (force && user?.id) {
      try {
        const rawData = (propActivities && propActivities.length > 0)
          ? propActivities
          : activityTracker.getActivities(user.id);
        const completions = rawData.filter(a => a.type === 'mock_test_completed')
          .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setActivities(completions);
        if (completions.length > 0) {
          currentStats = calculateStats(completions);
        }
      } catch (e) {
        console.error("Failed to refresh activities:", e);
      }
    }

    if (!currentStats) return;
    const cacheKey = `oep_ai_insights_${user?.id}_${currentStats.totalTests}_${currentStats.avgScore}`;
    
    setChatHistory([]);
    setLoadingAi(true);
    setScanningPhase(1);
    
    const steps = [
      "Ingesting mock test history...",
      "Correlating accuracy & speed data...",
      "Analyzing subject-wise strengths...",
      "Synthesizing customized action plan..."
    ];

    for (let i = 0; i < steps.length; i++) {
      setScanStep(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    try {
      const systemPrompt = `You are the OdishaExamPrep AI Performance Laboratory, an elite exam coaching intelligence. You generate performance insights in JSON format.
Your output must be a JSON object with:
{
  "diagnostic": "A detailed executive performance analysis (3-4 sentences) highlighting cognitive strengths, speed/accuracy trade-offs, and critical focus areas in Odisha exams.",
  "actionPlan": [
    { "task": "A highly specific recommendation, e.g., 'Attempt 25 intermediate math questions'", "boost": "+5%", "timeframe": "2 days" },
    ... (exactly 3 items)
  ]
}`;

      const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta/llama-3.3-70b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Analyze this student data and return JSON:\n${JSON.stringify(currentStats, null, 2)}` }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) throw new Error('API connection failed');
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      const parsed = JSON.parse(cleanJson(content));
      setAiInsight(parsed.diagnostic || '');
      setActionItems(parsed.actionPlan || []);
      sessionStorage.setItem(cacheKey, JSON.stringify(parsed));
      setScanningPhase(2);
    } catch (err) {
      console.error(err);
      // Fallback
      const fallbackData = {
        diagnostic: `Based on your ${currentStats.totalTests} completed mock tests, you have shown an average accuracy of ${currentStats.avgAccuracy}%. Your speed is ${currentStats.avgTimePerQuestion.toFixed(0)}s per question. Focus on reviewing wrong answers and practicing weaker subjects.`,
        actionPlan: [
          { task: "Practice 15 topic-wise tests in your weakest subjects", boost: "+8%", timeframe: "3 days" },
          { task: "Attempt a full-length mock test focusing on speed (under 45s per Q)", boost: "+5%", timeframe: "5 days" },
          { task: "Review all incorrect answers in your test history log", boost: "+10%", timeframe: "1 day" }
        ]
      };
      setAiInsight(fallbackData.diagnostic);
      setActionItems(fallbackData.actionPlan);
      setScanningPhase(2);
    } finally {
      setLoadingAi(false);
    }
  };

  const sendMessage = async (customText?: string) => {
    const textToSend = customText || chatInput;
    if (!textToSend.trim() || chatLoading) return;

    const userMsg = { role: 'user', content: textToSend };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const systemPrompt = `You are the OdishaExamPrep AI Coach, an elite personal tutor. You help students understand their performance metrics.
Use this student context in your replies:
- Average Score: ${stats.avgScore}%
- Accuracy: ${stats.avgAccuracy}%
- Speed: ${stats.avgTimePerQuestion.toFixed(1)}s per question
- Total Tests: ${stats.totalTests}
- Strengths/Weaknesses: ${stats.examAnalysis.map(e => `${e.examName}: ${[...(e.mockTests || []), ...(e.practiceTests || [])].map(s => `${s.name} (${s.avgScore}%)`).join(', ')}`).join('; ')}

Keep your answers short, structured, and focused on helping them improve their Odisha exam scores. Do not mention external AI brands.`;

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.map(m => ({ role: m.role, content: m.content })),
        userMsg
      ];

      const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          messages: apiMessages,
          temperature: 0.4,
          stream: true
        })
      });

      if (!response.ok) throw new Error('API connection failed');
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let assistantMsg = { role: 'assistant', content: '' };
      setChatHistory(prev => [...prev, assistantMsg]);

      if (reader) {
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || "";

          for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.startsWith('data: ')) {
              const jsonStr = cleanLine.substring(6);
              if (jsonStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed.choices?.[0]?.delta?.content || "";
                if (text) {
                  assistantMsg.content += text;
                  setChatHistory(prev => {
                    const next = [...prev];
                    next[next.length - 1] = { ...assistantMsg };
                    return next;
                  });
                }
              } catch(e){}
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'assistant', content: "Sorry, I am facing a connection issue right now. Please try again in a moment!" }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) return (
    <div className="relative w-full min-h-screen overflow-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-br from-brand-100/20 via-purple-100/10 to-transparent blur-[120px] -z-10 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[800px] h-[600px] bg-gradient-to-tl from-indigo-100/10 to-transparent blur-[120px] -z-10 pointer-events-none" />
      <AnalyticsSkeleton />
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
      <h2 className="text-3xl font-serif font-extrabold text-slate-900 mb-3 tracking-tight">No Data Available</h2>
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
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-br from-brand-100/20 via-purple-100/10 to-transparent blur-[120px] -z-10 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[800px] h-[600px] bg-gradient-to-tl from-indigo-100/10 to-transparent blur-[120px] -z-10 pointer-events-none" />

      <motion.div 
        variants={stagger.containerDelay(0.1, 0.1)}
        initial="hidden"
        animate="show"
        className="w-full mx-auto space-y-6 sm:space-y-8 pb-20 relative z-10"
      >
        {/* Redesigned Stat Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          <StatCard 
            icon={<Zap className="w-5 h-5" />} 
            title="Average Score" 
            value={stats.avgScore} 
            suffix="%" 
            trend={stats.impScore}
            color="brand"
            sparklineData={stats.chartData.map(d => d.score)}
          />
          <StatCard 
            icon={<Target className="w-5 h-5" />} 
            title="Accuracy" 
            value={stats.avgAccuracy} 
            suffix="%" 
            trend={stats.impAcc}
            color="success"
            sparklineData={stats.chartData.map(d => d.accuracy)}
          />
          <StatCard 
            icon={<Timer className="w-5 h-5" />} 
            title="Time per Question" 
            value={stats.avgTimePerQuestion} 
            suffix="s" 
            decimals={1}
            color="warning"
            sparklineData={stats.chartData.map(d => d.time)}
          />
          <StatCard 
            icon={<History className="w-5 h-5" />} 
            title="Total Attempts" 
            value={stats.totalTests}
            color="info"
            sparklineData={stats.chartData.map((_, i) => i + 1)}
          />
        </div>

        {/* AI Performance Lab */}
        <motion.div
          variants={stagger.itemFadeUp}
          className="relative overflow-hidden bg-white text-slate-800 rounded-[2.5rem] border border-slate-200/60 shadow-xl p-6 sm:p-8"
        >
          {/* Subtle Glow Orbs */}
          <div className="absolute top-[-100px] right-[-100px] w-80 h-80 rounded-full bg-[#8A1C36]/5 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-[-100px] left-[-100px] w-80 h-80 rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />

          {/* Faint grid pattern background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.008)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.008)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-40" />

          <div className="relative z-10">
            {scanningPhase === 0 && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-4">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-[#8A1C36]/5 border border-[#8A1C36]/15 flex items-center justify-center relative shadow-sm">
                    <Brain className="w-9 h-9 text-[#8A1C36] animate-pulse" />
                    <div className="absolute inset-0 rounded-2xl border-2 border-[#8A1C36]/10 animate-ping" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 bg-[#8A1C36]/10 border border-[#8A1C36]/20 text-[#8A1C36] text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1 shadow-sm leading-none">
                        <Cpu className="w-2.5 h-2.5" /> DeepSeek NIM
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Ready to diagnose</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-sans font-black tracking-tight leading-tight text-slate-900">AI Performance & Diagnostic Laboratory</h3>
                    <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1.5 max-w-xl">
                      Unlock instant cognitive diagnostics, custom time-management strategy, and a targeted exam preparation roadmap.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => runAiAnalysis()}
                  className="w-full md:w-auto px-8 h-[52px] rounded-2xl bg-gradient-to-r from-[#8A1C36] via-[#a32240] to-indigo-600 hover:from-[#76142c] hover:to-indigo-700 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-brand-500/10 hover:shadow-brand-500/20 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-2 group cursor-pointer border-none"
                >
                  <Sparkles className="w-4 h-4 fill-white/10 group-hover:scale-110 transition-transform" />
                  Initialize AI Scan
                </button>
              </div>
            )}

            {scanningPhase === 1 && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="relative w-28 h-28 mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100 border-t-[#8A1C36] animate-spin" />
                  <div className="absolute inset-3 rounded-full border-4 border-slate-105/5 border-b-indigo-400 animate-spin [animation-duration:1.5s]" />
                  <div className="absolute inset-6 rounded-full border-2 border-slate-105/10 border-t-emerald-400 animate-spin [animation-duration:0.8s]" />
                  <Brain className="w-8 h-8 text-[#8A1C36] animate-pulse" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-black uppercase tracking-widest text-slate-550 flex items-center gap-1.5 justify-center">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8A1C36]" />
                    Holographic Scanning Active
                  </div>
                  <h4 className="text-lg font-black tracking-tight mt-1 text-slate-800">{scanStep}</h4>
                  <div className="w-64 h-1 bg-slate-100 rounded-full overflow-hidden mt-4 mx-auto relative border border-slate-200/50">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-[#8A1C36] to-indigo-500 rounded-full"
                      animate={{ x: [-200, 200] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      style={{ width: '40%' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {scanningPhase === 2 && (
              <div className="space-y-6">
                {/* AI Panel Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200/60 pb-5 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center">
                      <Cpu className="w-5.5 h-5.5 text-[#8A1C36]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-sans font-black tracking-tight leading-none text-slate-900">AI Diagnostics Center</h3>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">Synthesized via DeepSeek Cognitive Engine</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    {/* Tab Navigation */}
                    <div className="flex bg-slate-100 border border-slate-200/60 p-1 rounded-xl w-full sm:w-auto">
                      {(['diagnostic', 'actionPlan', 'chat'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setAiPanelTab(tab)}
                          className={cn(
                            "px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex-1 sm:flex-initial border-none",
                            aiPanelTab === tab 
                              ? "bg-white text-[#8A1C36] shadow-sm border border-slate-200/40" 
                              : "text-slate-500 hover:text-slate-800"
                          )}
                        >
                          {tab === 'diagnostic' ? 'Insights' : tab === 'actionPlan' ? 'Action Plan' : 'AI Coach'}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => runAiAnalysis(true)}
                      disabled={loadingAi}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                      title="Re-Scan Analytics"
                    >
                      <RefreshCw className={cn("w-4 h-4", loadingAi && "animate-spin")} />
                    </button>
                  </div>
                </div>

                {/* AI Panel Tabs Body */}
                <div className="min-h-[220px]">
                  {aiPanelTab === 'diagnostic' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
                    >
                      <div className="lg:col-span-8 space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-[#8A1C36]/10 border border-[#8A1C36]/20 text-[#8A1C36] text-[9px] font-black uppercase tracking-widest rounded-lg">Performance Report</span>
                          <span className="text-[10px] font-bold text-slate-500">Targeting Odisha Competitive Exams</span>
                        </div>
                        <p className="text-slate-700 text-sm sm:text-base font-medium leading-relaxed max-w-3xl">
                          {aiInsight}
                        </p>
                      </div>

                      {/* Visual metrics cards */}
                      <div className="lg:col-span-4 space-y-3">
                        <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-start gap-3.5 hover:bg-emerald-50/90 transition-colors">
                          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shadow-sm shrink-0">
                            <Gauge className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Top Cognitive Strength</h4>
                            <p className="text-slate-700 text-xs font-semibold leading-relaxed">
                              {stats.avgAccuracy >= 70 ? 'Superior Accuracy thresholds under moderate test length pacing.' : 'Consistent performance stability in fundamental core topics.'}
                            </p>
                          </div>
                        </div>

                        <div className="p-4 bg-amber-50/70 border border-amber-100 rounded-2xl flex items-start gap-3.5 hover:bg-amber-50/90 transition-colors">
                          <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shadow-sm shrink-0">
                            <Activity className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-0.5">Primary Cognitive Blocker</h4>
                            <p className="text-slate-700 text-xs font-semibold leading-relaxed">
                              {stats.avgTimePerQuestion > 60 ? 'Solving speed decay. Pacing exceeds 60s limit on complex questions.' : 'Precision drop detected under high-speed snap answers.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {aiPanelTab === 'actionPlan' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-[#8A1C36]/10 border border-[#8A1C36]/20 text-[#8A1C36] text-[9px] font-black uppercase tracking-widest rounded-lg">Study Checklist</span>
                        <span className="text-[10px] font-bold text-slate-500">Check off items as you complete them to lift your score</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {actionItems.map((item, idx) => (
                          <div 
                            key={idx}
                            onClick={() => setCheckedActions(prev => ({ ...prev, [idx]: !prev[idx] }))}
                            className={cn(
                              "p-5 bg-slate-50/70 border border-slate-200/60 rounded-2xl flex flex-col justify-between gap-4 cursor-pointer hover:bg-slate-100/50 hover:border-[#8A1C36]/30 hover:shadow-md transition-all duration-300 relative overflow-hidden group",
                              checkedActions[idx] && "bg-[#8A1C36]/5 border-[#8A1C36]/20 hover:border-[#8A1C36]/35"
                            )}
                          >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-[#8A1C36]/2 rounded-full blur-xl group-hover:bg-[#8A1C36]/5 transition-colors" />

                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                                checkedActions[idx] 
                                  ? "bg-emerald-500 border-emerald-400 text-white" 
                                  : "border-slate-300 text-transparent"
                              )}>
                                <span className="text-[10px] font-black leading-none">✓</span>
                              </div>
                              <p className={cn(
                                "text-slate-700 text-xs sm:text-sm font-semibold leading-relaxed group-hover:text-slate-900 transition-colors",
                                checkedActions[idx] && "line-through text-slate-400 group-hover:text-slate-400"
                              )}>
                                {item.task}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 mt-auto pt-2">
                              <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded-lg border border-emerald-250/30 uppercase">
                                Lift {item.boost || '+5%'}
                              </span>
                              <span className="px-2 py-1 bg-slate-100 text-slate-650 text-[9px] font-black rounded-lg border border-slate-200 uppercase">
                                {item.timeframe || '3 days'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {aiPanelTab === 'chat' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
                    >
                      {/* Left: Chat Container */}
                      <div className="lg:col-span-8 flex flex-col justify-between border border-slate-200 rounded-2xl bg-slate-50/50 overflow-hidden h-[390px]">
                        {/* Top bar with Clear Chat option */}
                        <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-705 uppercase tracking-wider">AI Performance Coach</span>
                          </div>
                          {chatHistory.length > 0 && (
                            <button
                              onClick={() => setChatHistory([])}
                              className="text-[9px] font-black text-slate-450 hover:text-[#8A1C36] flex items-center gap-1.5 transition-colors cursor-pointer border-none bg-transparent"
                            >
                              <Trash2 className="w-3 h-3" /> CLEAR CHAT
                            </button>
                          )}
                        </div>

                        <div ref={chatContainerRef} className="p-4 overflow-y-auto space-y-3.5 flex-1 custom-scrollbar text-xs">
                          {chatHistory.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6">
                              <Cpu className="w-10 h-10 text-slate-400 mb-3 animate-float-gentle" />
                              <p className="font-semibold text-sm text-slate-750 mb-1">Your AI Exam Coach is ready</p>
                              <p className="text-[10px] font-medium leading-relaxed max-w-xs text-slate-500">Ask specific questions about your mock scores, speed problems, or request target study advice.</p>
                            </div>
                          ) : (
                            chatHistory.map((msg, i) => (
                              <div 
                                key={i} 
                                className={cn(
                                  "flex gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-305",
                                  msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                                )}
                              >
                                <div className={cn(
                                  "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black shadow-sm",
                                  msg.role === 'user' ? "bg-[#8A1C36] text-white" : "bg-slate-200 text-slate-700"
                                )}>
                                  {msg.role === 'user' ? 'ME' : 'AI'}
                                </div>
                                <div className={cn(
                                  "p-3 rounded-2xl leading-relaxed text-xs shadow-sm",
                                  msg.role === 'user' 
                                    ? "bg-[#8A1C36] text-white rounded-tr-none" 
                                    : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                                )}>
                                  <MarkdownMathRenderer text={msg.content} isUser={msg.role === 'user'} />
                                </div>
                              </div>
                            ))
                          )}
                          {chatLoading && chatHistory[chatHistory.length - 1]?.role === 'user' && (
                            <div className="flex gap-3 max-w-[85%] items-center mr-auto">
                              <div className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-black shadow-sm">
                                AI
                              </div>
                              <div className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-550 rounded-tl-none flex items-center gap-1.5 shadow-sm">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8A1C36]" /> Thinking...
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Text Input */}
                        <div className="p-3 border-t border-slate-200 bg-white flex gap-2.5 items-center">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            disabled={chatLoading}
                            placeholder="Type a query about your statistics (e.g. 'How can I fix speed?')..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#8A1C36]/50 focus:bg-white disabled:opacity-50 transition-all font-sans"
                          />
                          <button
                            onClick={() => sendMessage()}
                            disabled={!chatInput.trim() || chatLoading}
                            className="p-2.5 rounded-xl bg-[#8A1C36] hover:bg-[#76142c] text-white disabled:opacity-50 transition-all cursor-pointer shrink-0 border-none flex items-center justify-center"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Right: Quick Chips Panel */}
                      <div className="lg:col-span-4 flex flex-col justify-between gap-3 bg-slate-50/50 border border-slate-200/80 p-4 rounded-2xl">
                        <div>
                          <h4 className="text-[10px] font-black text-[#8A1C36] uppercase tracking-widest mb-1.5 flex items-center gap-1">
                            <Lightbulb className="w-3.5 h-3.5" /> Study Assistant
                          </h4>
                          <p className="text-[10px] font-medium text-slate-500 leading-relaxed mb-4">Click any prompt to trigger instant diagnostics from your AI coach.</p>
                          
                          <div className="flex flex-col gap-2.5">
                            {assistantChips.map((chip, idx) => (
                              <button
                                key={idx}
                                onClick={() => sendMessage(chip)}
                                disabled={chatLoading}
                                className="text-left p-2.5 bg-white hover:bg-brand-50 border border-slate-200/60 hover:border-brand-200 rounded-xl text-[11px] font-semibold text-slate-600 hover:text-[#8A1C36] transition-all cursor-pointer leading-tight disabled:opacity-50 shadow-sm"
                              >
                                {chip}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest text-center mt-4">
                          OdishaExamPrep Cognitive Lab
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Charts & Breakdown Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
           {/* Performance Trend Card */}
           <motion.div 
             variants={stagger.itemFadeUp} 
             className="lg:col-span-8 relative overflow-hidden bg-white/65 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.015)] border border-white/80 hover:border-brand-200/40 hover:shadow-[0_20px_50px_rgba(138,28,54,0.045)] transition-all duration-500 group"
           >
              <div className="absolute -top-32 -right-32 w-72 h-72 bg-brand-500/5 rounded-full blur-[80px] group-hover:bg-brand-500/8 group-hover:scale-110 transition-all duration-700 pointer-events-none" />
              <div className="absolute -bottom-32 -left-32 w-72 h-72 bg-indigo-500/3 rounded-full blur-[80px] group-hover:bg-indigo-500/5 transition-all duration-700 pointer-events-none" />
              
              <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                 <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-1 h-5 bg-[#8a1c36] rounded-full shrink-0" />
                      <h3 className="text-lg sm:text-xl font-sans font-black text-slate-900 tracking-tight">Performance Trend</h3>
                    </div>
                    <p className="text-xs font-semibold text-slate-450 leading-none mt-1">Your mock exam score progression history</p>
                 </div>
                 {stats.impScore !== 0 && (
                   <div className={cn(
                     "px-2.5 py-1.5 rounded-xl flex items-center gap-1 text-[9px] font-sans font-black uppercase tracking-widest shadow-sm border transition-all duration-300 group-hover:scale-103",
                     stats.impScore > 0 
                       ? "bg-emerald-500/8 text-emerald-700 border-emerald-200/50 shadow-[0_2px_10px_rgba(16,185,129,0.02)]" 
                       : "bg-rose-500/8 text-rose-700 border-rose-200/50 shadow-[0_2px_10px_rgba(244,63,94,0.02)]"
                   )}>
                      {stats.impScore > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {Math.abs(Math.round(stats.impScore))}% {stats.impScore > 0 ? 'Improvement' : 'Drop'}
                   </div>
                 )}
              </div>
              
              {stats.chartData.length > 0 ? (
                <div className="w-full h-[300px] relative z-10 pr-2">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                         <defs>
                            <filter id="areaLineShadow" x="-5%" y="-5%" width="110%" height="115%">
                              <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#8a1c36" floodOpacity="0.15" />
                            </filter>
                            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="0%" stopColor="#8a1c36" stopOpacity={0.22}/>
                               <stop offset="100%" stopColor="#8a1c36" stopOpacity={0}/>
                             </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#e2e8f0/60" />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-sans)', letterSpacing: '0.05em' }} dy={10} />
                         <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-sans)' }} domain={[0, 100]} />
                         <Tooltip content={<CustomTooltip />} />
                         <Area type="monotone" dataKey="score" name="Score" stroke="#8a1c36" strokeWidth={3.5} fillOpacity={1} fill="url(#scoreGrad)" activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2, fill: '#8a1c36', style: { filter: 'drop-shadow(0px 4px 8px rgba(138,28,54,0.4))' } }} isAnimationActive={true} animationDuration={850} animationEasing="ease-out" style={{ filter: 'url(#areaLineShadow)' }} />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>
              ) : (
                 <div className="w-full h-[300px] flex items-center justify-center bg-slate-50/40 rounded-2xl border border-slate-150/50">
                    <p className="text-slate-400 font-bold text-sm">Not enough data to plot a trend.</p>
                 </div>
              )}
           </motion.div>

           {/* Accuracy Breakdown Card */}
           <motion.div 
             variants={stagger.itemFadeUp} 
             className="lg:col-span-4 relative overflow-hidden bg-white/65 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.015)] border border-white/80 hover:border-brand-200/40 hover:shadow-[0_20px_50px_rgba(138,28,54,0.045)] transition-all duration-500 group"
           >
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-slate-100/50 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/3 rounded-full blur-3xl group-hover:bg-brand-500/5 transition-colors duration-500 pointer-events-none" />
              
              <div className="flex items-center gap-2.5 mb-8 justify-center">
                <div className="w-1 h-5 bg-[#8a1c36] rounded-full shrink-0" />
                <h3 className="text-lg font-sans font-black text-slate-900 tracking-tight text-center">Accuracy Breakdown</h3>
              </div>
              
              {stats.totalQuestions > 0 ? (
                <div className="relative z-10">
                   <div className="w-full aspect-square relative max-w-[190px] mx-auto mb-8 drop-shadow-md">
                      <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                            <Pie data={stats.pieData} innerRadius={60} outerRadius={85} paddingAngle={6} dataKey="value" stroke="none" isAnimationActive={true} animationDuration={850} animationEasing="ease-out">
                               {stats.pieData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                         </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                         <span className="text-3xl sm:text-4xl font-sans font-black text-slate-900 leading-none tracking-tight">{stats.totalQuestions}</span>
                         <span className="text-[9px] font-sans font-black text-slate-400 mt-1.5 uppercase tracking-widest">Total Qs</span>
                      </div>
                   </div>
                   <div className="space-y-2.5">
                      <AccuracyRow label="Correct" value={stats.totalCorrect} total={stats.totalQuestions} color="bg-emerald-500" />
                      <AccuracyRow label="Wrong" value={stats.totalWrong} total={stats.totalQuestions} color="bg-rose-500" />
                      <AccuracyRow label="Skipped" value={stats.totalSkipped} total={stats.totalQuestions} color="bg-slate-400" />
                   </div>
                </div>
              ) : (
                 <div className="p-4 bg-slate-50/40 rounded-2xl border border-slate-150/50 text-center text-xs font-bold text-slate-450">
                    No question breakdown history available.
                 </div>
              )}
           </motion.div>

            {/* Skill Radar Card */}
            <motion.div 
              variants={stagger.itemFadeUp} 
              className="lg:col-span-12 relative overflow-hidden bg-white/70 backdrop-blur-2xl rounded-[2.5rem] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.015)] border border-white/80 hover:border-brand-200/40 hover:shadow-[0_20px_50px_rgba(138,28,54,0.045)] transition-all duration-500 group"
            >
               <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-slate-50 rounded-full blur-3xl pointer-events-none" />
               <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/3 rounded-full blur-3xl group-hover:bg-indigo-500/5 transition-colors duration-500 pointer-events-none" />
               
               <div className="flex flex-col gap-1.5 mb-6 text-center">
                 <div className="flex justify-center">
                   <span className="text-[9px] font-sans font-black text-[#8a1c36] uppercase tracking-widest bg-[#8a1c36]/5 px-3 py-1 rounded-full border border-[#8a1c36]/10 leading-none">
                      Metrics Overview
                   </span>
                 </div>
                 <h3 className="text-xl font-serif font-black text-slate-900 tracking-tight mt-1.5">Overall Skill Profile</h3>
                 <p className="text-[11px] font-bold text-slate-400">Analysis of your core exam-taking dimensions</p>
               </div>
               
               {stats.skillProfile && stats.totalQuestions > 0 ? (
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    {/* Radar Chart Container */}
                    <div className="lg:col-span-5 w-full h-[280px] relative z-10 flex items-center justify-center">
                       <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="58%" data={stats.skillProfile} margin={{ top: 10, right: 40, bottom: 10, left: 40 }}>
                             <defs>
                                <filter id="radarShadow" x="-10%" y="-10%" width="120%" height="120%">
                                  <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#8a1c36" floodOpacity="0.12" />
                                </filter>
                                <linearGradient id="overallRadarGrad" x1="0" y1="0" x2="0" y2="1">
                                   <stop offset="0%" stopColor="#8a1c36" stopOpacity={0.65}/>
                                   <stop offset="100%" stopColor="#6366f1" stopOpacity={0.10}/>
                                </linearGradient>
                             </defs>
                             <PolarGrid stroke="#cbd5e1" strokeOpacity={0.5} strokeDasharray="4 4" />
                             <PolarAngleAxis dataKey="name" tickFormatter={(t) => t.toUpperCase()} tick={{ fill: '#64748b', fontSize: 9, fontWeight: 900, fontFamily: 'var(--font-sans)', letterSpacing: '0.05em' }} />
                             <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} tickCount={6} />
                             <Radar 
                               name="Skill Level" 
                               dataKey="value" 
                               stroke="#8a1c36" 
                               strokeWidth={2.5} 
                               fill="url(#overallRadarGrad)" 
                               activeDot={{ r: 5, fill: '#8a1c36', strokeWidth: 2, stroke: '#ffffff', style: { filter: 'drop-shadow(0px 2px 4px rgba(138,28,54,0.4))' } }} 
                               isAnimationActive={true}
                               animationDuration={850}
                               animationEasing="ease-out"
                               style={{ filter: 'url(#radarShadow)' }}
                             />
                             <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }} />
                          </RadarChart>
                       </ResponsiveContainer>
                    </div>
 
                    {/* Detailed breakdown items */}
                    <div className="lg:col-span-7 space-y-3.5 relative z-10">
                      {stats.skillProfile.map((skill: any, idx: number) => {
                         let icon = <Target className="w-4 h-4 text-emerald-500" />;
                         let colorClass = "from-emerald-500 to-emerald-400";
                         let desc = "Correctness rate on attempts";
                         let bgClass = "bg-emerald-50/50 border-emerald-100/50";
                         let textClass = "text-emerald-700";

                         if (skill.name === "Accuracy") {
                            icon = <Target className="w-4 h-4 text-emerald-600" />;
                            colorClass = "from-emerald-600 to-emerald-400";
                            desc = "Accuracy on attempted questions";
                            bgClass = "bg-emerald-50/50 border-emerald-100/50";
                            textClass = "text-emerald-700";
                         } else if (skill.name === "Precision") {
                            icon = <Crosshair className="w-4 h-4 text-[#8a1c36]" />;
                            colorClass = "from-[#8a1c36] to-[#b83c5a]";
                            desc = "Consistency & focus in answers";
                            bgClass = "bg-brand-50/50 border-brand-100/50";
                            textClass = "text-brand-700";
                         } else if (skill.name === "Speed") {
                            icon = <Timer className="w-4 h-4 text-amber-600" />;
                            colorClass = "from-amber-600 to-amber-400";
                            desc = "Pace answering questions";
                            bgClass = "bg-amber-50/50 border-amber-100/50";
                            textClass = "text-amber-700";
                         } else if (skill.name === "Endurance") {
                            icon = <Flame className="w-4 h-4 text-indigo-600" />;
                            colorClass = "from-indigo-600 to-indigo-400";
                            desc = "Volume of questions practiced";
                            bgClass = "bg-indigo-50/50 border-indigo-100/50";
                            textClass = "text-indigo-700";
                         } else if (skill.name === "Momentum") {
                            icon = <TrendingUp className="w-4 h-4 text-cyan-600" />;
                            colorClass = "from-cyan-600 to-cyan-400";
                            desc = "Test-to-test improvement rate";
                            bgClass = "bg-cyan-50/50 border-cyan-100/50";
                            textClass = "text-cyan-700";
                         }

                         return (
                            <div key={idx} className="p-3 bg-white/40 border border-slate-100/60 rounded-2xl flex flex-col gap-2 hover:bg-white/80 hover:border-slate-200/50 transition-all duration-350 shadow-[0_2px_8px_rgba(0,0,0,0.005)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.015)]">
                               <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                     <div className={cn("p-1.5 rounded-xl border shrink-0", bgClass)}>
                                        {icon}
                                     </div>
                                     <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-sans font-black text-slate-800 leading-none">{skill.name}</span>
                                        <span className="text-[9px] font-bold text-slate-400 leading-none mt-1 truncate">{desc}</span>
                                     </div>
                                  </div>
                                  <span className={cn("text-xs font-sans font-black tracking-tight", textClass)}>{skill.value}%</span>
                               </div>
                               <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div 
                                     initial={{ width: 0 }}
                                     animate={{ width: `${skill.value}%` }}
                                     transition={{ duration: 0.85, ease: "easeOut", delay: idx * 0.05 }}
                                     className={cn("h-full rounded-full bg-gradient-to-r", colorClass)}
                                  />
                                </div>
                            </div>
                         );
                      })}
                   </div>
                 </div>
               ) : (
                 <div className="p-4 bg-slate-50/40 rounded-2xl border border-slate-150/50 text-center text-xs font-bold text-slate-450">
                    Complete tests to compile your skill profile.
                 </div>
              )}
           </motion.div>

           {/* Performance Breakdown Card */}
           {stats.examAnalysis && stats.examAnalysis.length > 0 && (
             <div className="lg:col-span-12 flex flex-col gap-6 relative">
               {stats.examAnalysis.map((exam: any, idx: number) => {
                 const combinedSubjects = [...(exam.mockTests || []), ...(exam.practiceTests || [])];
                 const uniqueMap = new Map();
                 
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
                 const uniqueSubjects = Array.from(uniqueMap.values());

                 return (
                   <motion.div key={idx} variants={stagger.itemFadeUp} className="bg-white/70 backdrop-blur-2xl rounded-[2.5rem] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.015)] border border-white/80 hover:border-brand-200/40 hover:shadow-[0_20px_50px_rgba(138,28,54,0.045)] transition-all duration-500 relative overflow-hidden flex flex-col shrink-0">
                     <div className="mb-6 relative z-10 flex flex-col gap-3">
                        <div>
                           <span className="px-3 py-1.5 bg-[#8a1c36]/8 text-[#8a1c36] text-[9px] font-sans font-black rounded-xl uppercase tracking-widest border border-[#8a1c36]/15 shadow-sm leading-none">
                              {exam.examName}
                           </span>
                        </div>
                        <div>
                           <h3 className="text-xl font-serif font-black text-slate-900 leading-tight mb-1">Performance Breakdown</h3>
                           <p className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5">
                              Attempts: <span className="text-slate-800 font-black">{exam.totalAttempts}</span>
                              <span className="text-slate-200">•</span>
                              Last Attempt: <span className="text-[#8a1c36] font-black">{exam.lastAttemptDate}</span>
                           </p>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
                        {/* Left column: Bar Chart */}
                        {uniqueSubjects.length > 0 ? (
                          <div className="lg:col-span-5 w-full h-[240px] flex items-center justify-center">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={uniqueSubjects} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                   <defs>
                                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                         <stop offset="5%" stopColor="#8a1c36" stopOpacity={0.95}/>
                                         <stop offset="95%" stopColor="#6366f1" stopOpacity={0.65}/>
                                      </linearGradient>
                                   </defs>
                                   <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#cbd5e1" strokeOpacity={0.25} />
                                   <XAxis dataKey="name" axisLine={false} tickLine={false} tickFormatter={(val) => val.length > 24 ? `${val.substring(0, 22)}...` : val} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                                   <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} domain={[0, 100]} />
                                   <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                   <Bar dataKey="avgScore" name="Accuracy" fill="url(#barGrad)" radius={[8, 8, 0, 0]} barSize={28} isAnimationActive={true} animationDuration={850} animationEasing="ease-out" />
                                </BarChart>
                             </ResponsiveContainer>
                          </div>
                        ) : null}
  
                        {/* Divider on mobile only */}
                        {uniqueSubjects.length > 0 && (
                          <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-1 lg:hidden" />
                        )}
  
                        {/* Right column: Expandable List */}
                        <div className={cn("space-y-4 max-h-[380px] overflow-y-auto custom-scrollbar pr-1", uniqueSubjects.length > 0 ? "lg:col-span-7" : "lg:col-span-12")}>
                           {exam.mockTests && exam.mockTests.length > 0 && (
                             <div className="space-y-3">
                               <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Mock Tests</h4>
                               <div className="space-y-3">
                                 {exam.mockTests.map((subject: any, i: number) => (
                                    <SubjectRow key={`m-${i}`} subject={subject} />
                                 ))}
                               </div>
                             </div>
                           )}
      
                           {exam.practiceTests && exam.practiceTests.length > 0 && (
                             <div className="space-y-3">
                               <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 mt-2">Practice Sessions</h4>
                               <div className="space-y-3">
                                 {exam.practiceTests.map((subject: any, i: number) => (
                                    <SubjectRow key={`p-${i}`} subject={subject} />
                                 ))}
                               </div>
                             </div>
                           )}
      
                           {(!exam.practiceTests || exam.practiceTests.length === 0) && (!exam.mockTests || exam.mockTests.length === 0) && (
                             <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 text-center text-xs font-semibold text-slate-450">
                               No subject metrics compiled yet.
                             </div>
                           )}
                        </div>
                     </div>
                  </motion.div>
                 );
               })}
             </div>
           )}

           {/* Visual Action cards */}
           <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
               <motion.div variants={stagger.itemFadeUp} whileHover={{ y: -3 }} className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 shadow-[0_8px_30px_rgba(15,23,42,0.015)] border border-slate-200/50 hover:border-slate-200 flex gap-5 items-start">
                  <div className={cn("p-3 rounded-2xl shrink-0 shadow-sm border border-slate-100", stats.impScore >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                     {stats.impScore >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                 </div>
                 <div>
                    <h4 className="font-extrabold text-slate-800 mb-1 tracking-tight text-sm sm:text-base">{stats.impScore >= 0 ? "You are improving" : "Scores dropped recently"}</h4>
                    <p className="text-xs sm:text-sm font-medium text-slate-450 leading-relaxed">{stats.impScore >= 0 ? "Your latest test scores show positive momentum. Keep up the good work!" : "Review your recent mistakes to get back on track."}</p>
                 </div>
              </motion.div>
               <motion.div variants={stagger.itemFadeUp} whileHover={{ y: -3 }} className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 shadow-[0_8px_30px_rgba(15,23,42,0.015)] border border-slate-200/50 hover:border-slate-200 flex gap-5 items-start">
                  <div className={cn("p-3 rounded-2xl shrink-0 shadow-sm border border-slate-100", stats.avgTimePerQuestion > 60 ? "bg-amber-50 text-amber-600" : "bg-brand-50 text-brand-600")}>
                    <Timer className="w-5 h-5" />
                 </div>
                 <div>
                    <h4 className="font-extrabold text-slate-800 mb-1 tracking-tight text-sm sm:text-base">{stats.avgTimePerQuestion > 60 ? "Improve Question Speed" : "Optimal Solving Pace"}</h4>
                    <p className="text-xs sm:text-sm font-medium text-slate-450 leading-relaxed">Averaging {stats.avgTimePerQuestion.toFixed(1)}s per question. {stats.avgTimePerQuestion > 60 ? "Try to solve familiar questions faster." : "Excellent pacing, maintain this rate in real exams."}</p>
                 </div>
              </motion.div>
           </div>

           {/* Premium action banner */}
           <motion.div 
             variants={stagger.itemFadeUp} 
             whileHover={{ y: -3 }}
             className="lg:col-span-5 relative bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 rounded-[2rem] p-6 sm:p-8 flex flex-col justify-between shadow-xl border border-slate-800 gap-6 overflow-hidden transition-all duration-500 min-h-[160px]"
           >
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none animate-pulse-soft" />
             <div className="text-left relative z-10">
               <h3 className="text-xl sm:text-2xl font-serif font-black text-white mb-2 tracking-tight">Unlock Your Potential</h3>
               <p className="text-slate-400 text-xs sm:text-sm font-medium">Focus on weak subjects in targeted mock sessions to optimize your overall score.</p>
             </div>
             <div className="mt-auto pt-2 flex justify-start">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onNavigate?.('home')} 
                  className="relative z-10 px-8 py-3.5 bg-[#8A1C36] hover:bg-[#76142c] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer shadow-lg shadow-brand-500/20"
                >
                  Start Practice Mocks
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
             </div>
           </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

const areActivitiesEqual = (a: any[] | undefined, b: any[] | undefined) => {
  if (!a || !b) return a === b;
  if (a.length !== b.length) return false;
  return a.every((val, index) => val.id === b[index].id && val.timestamp === b[index].timestamp);
};

const AnalyticsView = React.memo(AnalyticsViewInner, (prevProps, nextProps) => {
  return prevProps.user?.id === nextProps.user?.id && 
         areActivitiesEqual(prevProps.activities, nextProps.activities);
});

export default AnalyticsView;
