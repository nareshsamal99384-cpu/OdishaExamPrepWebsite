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
  Gauge, Lightbulb, Loader2, RefreshCw, Trash2, X
} from 'lucide-react';
import { activityTracker } from './lib/activityTracker';
import { cn } from './lib/utils';
import { stagger } from './lib/animations';
import { MathTextRenderer } from './components/MathTextRenderer';


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

const CustomTooltip = React.memo(({ active, payload, label }: any) => {
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
});

const Sparkline = React.memo(({ data, color = "#8a1c36", id }: { data: number[]; color?: string; id: string }) => {
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
    <svg className="w-full h-8 overflow-visible" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
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
});

const StatCard = React.memo(({ icon, title, value, suffix = "", trend, decimals = 0, sparklineData, color = "brand" }: any) => {
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
      className="w-full flex"
    >
      <div
        className={cn(
          "relative w-full bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2.25rem] shadow-[0_8px_32px_rgba(0,0,0,0.015)] border border-slate-100/70 flex flex-col justify-between group transition-[transform,box-shadow,border-color,background-color] duration-300 ease-out cursor-default hover:-translate-y-1.5 hover:scale-[1.02] active:scale-[0.98] min-h-[146px] sm:min-h-[170px]",
          color === "brand" ? "hover:shadow-[0_20px_40px_rgba(138,28,54,0.065)] hover:border-brand-200/50" :
          color === "success" ? "hover:shadow-[0_20px_40px_rgba(16,185,129,0.065)] hover:border-emerald-200/50" :
          color === "warning" ? "hover:shadow-[0_20px_40px_rgba(217,119,6,0.065)] hover:border-amber-200/50" :
          "hover:shadow-[0_20px_40px_rgba(99,102,241,0.065)] hover:border-indigo-200/50"
        )}
        style={{
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          WebkitTransform: 'translate3d(0,0,0)',
          transform: 'translate3d(0,0,0)',
          isolation: 'isolate'
        }}
      >
        <div className="absolute inset-0 rounded-2xl sm:rounded-[2.25rem] overflow-hidden pointer-events-none z-0">
          <div 
            className="absolute -top-24 -right-24 w-48 h-48 opacity-20 group-hover:opacity-30 transition-opacity duration-300" 
            style={{
              background: `radial-gradient(circle at center, ${
                color === "brand" ? "#8a1c36" :
                color === "success" ? "#10b981" :
                color === "warning" ? "#d97706" :
                "#6366f1"
              } 0%, transparent 70%)`
            }}
          />
        </div>
        
        <div className="relative z-10 flex items-center justify-between mb-3.5 sm:mb-5">
           <div className={cn("p-2 sm:p-3 rounded-xl sm:rounded-2xl border shadow-sm transition-[transform,background-color,border-color] duration-300 group-hover:scale-105 group-hover:rotate-2", iconBg)}>
              {React.cloneElement(icon, { className: "w-4 h-4 sm:w-5 h-5" })}
           </div>
           {trend !== undefined && trend !== 0 && (
              <div className={cn(
                 "flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-black shadow-sm border border-white/80 transition-transform duration-300 group-hover:scale-103",
                 isPositive ? "bg-emerald-50/80 text-emerald-700 border-emerald-100" : "bg-rose-50/80 text-rose-700 border-rose-100"
              )}>
                 {isPositive ? <TrendingUp className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" /> : <TrendingDown className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />}
                 {Math.abs(Math.round(trend))}%
              </div>
           )}
        </div>

        <div className="relative z-10 space-y-1 flex-1 min-w-0 mb-3">
          <h4 className="text-[9px] sm:text-[10px] font-sans font-black tracking-widest text-slate-400/90 uppercase leading-none truncate">{title}</h4>
          <div className="text-xl xs:text-2xl sm:text-3xl font-sans font-black text-slate-900 flex items-baseline tracking-tight group-hover:text-slate-950 transition-colors duration-300 leading-none mt-1">
             <AnimatedCounter value={value} decimals={decimals} />
             {suffix && <span className="text-xs sm:text-sm font-sans font-black text-slate-400/80 ml-1 leading-none">{suffix}</span>}
          </div>
        </div>
        
        {sparklineData && sparklineData.length >= 2 && (
          <div className="relative z-10 w-full pt-1 border-t border-slate-100/50 opacity-85 group-hover:opacity-100 transition-opacity duration-300">
            <Sparkline data={sparklineData} color={strokeColor} id={title.replace(/\s+/g, '-').toLowerCase()} />
          </div>
        )}
      </div>
    </motion.div>
  );
});

const AccuracyRow = React.memo(({ label, value, total, color }: { label: string, value: number, total: number, color: string }) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  const circleColor = color === "bg-rose-500" ? "bg-rose-500" : color;

  return (
    <div className="flex items-center justify-between p-2.5 sm:p-3.5 bg-white/80 border border-slate-100/50 rounded-[1.25rem] hover:bg-white hover:border-slate-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.025)] hover:-translate-y-0.5 transition-[transform,background-color,border-color,box-shadow] duration-300 group">
       <div className="flex items-center gap-3 font-sans">
          <div className={cn("w-2.5 h-2.5 rounded-full border-2 border-white shadow-[0_0_6px_rgba(0,0,0,0.05)]", circleColor)} />
          <span className="text-[10px] font-black text-slate-500 group-hover:text-slate-800 transition-colors uppercase tracking-wider">{label}</span>
       </div>
       <div className="flex items-center gap-4 font-sans">
          <span className="text-xs font-black text-slate-800">{value}</span>
          <span className="text-[10px] font-black text-slate-400 px-2 py-0.5 sm:px-2.5 sm:py-0.5 bg-white border border-slate-100 rounded-lg leading-none">{percentage}%</span>
       </div>
    </div>
  );
});

const SubjectRow = React.memo(({ subject }: { subject: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const incorrect = Math.max(0, subject.attempted - subject.correct);
  const correctPct = subject.attempted > 0 ? Math.round((subject.correct / subject.attempted) * 100) : 0;
  const incorrectPct = subject.attempted > 0 ? Math.round((incorrect / subject.attempted) * 100) : 0;

  return (
    <div 
      onClick={() => setIsExpanded(!isExpanded)}
      className={cn(
        "flex flex-col p-3 sm:p-4 bg-white/80 rounded-2xl border border-slate-100/70 shadow-[0_2px_8px_rgba(0,0,0,0.005)] hover:bg-white/95 hover:border-brand-200/40 hover:-translate-y-0.5 transition-[transform,background-color,border-color,box-shadow] duration-300 group cursor-pointer relative overflow-hidden",
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
              "px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[9px] font-sans font-black uppercase tracking-wider leading-none shadow-sm border", 
              subject.status === 'Strong' 
                 ? "bg-emerald-50 text-emerald-700 border-emerald-100/70" 
                 : "bg-rose-50 text-rose-700 border-rose-100/70"
            )}>
               {subject.status}
            </span>
            <ChevronDown className={cn("w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-300", isExpanded && "rotate-180")} />
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
                 subject.avgScore >= 70 ? "from-emerald-500 to-emerald-400" : "from-rose-500 to-rose-400"
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
                 <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                   {/* Attempted stat box */}
                   <div className="p-2 sm:p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl text-center flex flex-col justify-between items-center hover:bg-slate-100/40 transition-colors">
                     <span className="text-slate-400 font-sans font-black uppercase tracking-widest text-[8px] leading-none mb-1">Attempted</span>
                     <span className="text-slate-800 font-sans font-black text-xs sm:text-sm">{subject.attempted}</span>
                     <span className="text-[7.5px] font-bold text-slate-400 uppercase mt-1 leading-none scale-90 sm:scale-100">Questions</span>
                   </div>
                   
                   {/* Correct stat box */}
                   <div className="p-2 sm:p-2.5 bg-emerald-50/30 border border-emerald-100/40 rounded-xl text-center flex flex-col justify-between items-center hover:bg-emerald-50/55 transition-colors">
                     <span className="text-emerald-700/80 font-sans font-black uppercase tracking-widest text-[8px] leading-none mb-1">Correct</span>
                     <span className="text-emerald-600 font-sans font-black text-xs sm:text-sm">{subject.correct}</span>
                     <span className="text-[7.5px] font-sans font-black text-emerald-500/80 uppercase mt-1 leading-none scale-90 sm:scale-100">{correctPct}% Acc</span>
                   </div>
                   
                   {/* Incorrect stat box */}
                   <div className="p-2 sm:p-2.5 bg-rose-50/30 border border-rose-100/40 rounded-xl text-center flex flex-col justify-between items-center hover:bg-rose-50/55 transition-colors">
                     <span className="text-rose-700/80 font-sans font-black uppercase tracking-widest text-[8px] leading-none mb-1">Incorrect</span>
                     <span className="text-rose-600 font-sans font-black text-xs sm:text-sm">{incorrect}</span>
                     <span className="text-[7.5px] font-sans font-black text-rose-500/80 uppercase mt-1 leading-none scale-90 sm:scale-100">{incorrectPct}% Pct</span>
                   </div>
                 </div>
              </div>
            </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
});

// Standalone memoized Chart components to prevent re-renders & scroll lag
const PerformanceTrendChart = React.memo(({ chartData }: { chartData: any[] }) => {
  return (
    <div className="w-full h-[300px] relative z-10 pr-2">
       <ResponsiveContainer width="100%" height="100%" debounce={100}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
             <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="0%" stopColor="#8a1c36" stopOpacity={0.22}/>
                   <stop offset="100%" stopColor="#8a1c36" stopOpacity={0}/>
                 </linearGradient>
             </defs>
             <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#e2e8f0/60" />
             <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-sans)', letterSpacing: '0.05em' }} dy={10} />
             <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-sans)' }} domain={[0, 100]} />
             <Tooltip content={<CustomTooltip />} />
             <Area type="monotone" dataKey="score" name="Score" stroke="#8a1c36" strokeWidth={3.5} fillOpacity={1} fill="url(#scoreGrad)" activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2, fill: '#8a1c36' }} isAnimationActive={false} />
          </AreaChart>
       </ResponsiveContainer>
    </div>
  );
});

const AccuracyBreakdownChart = React.memo(({ pieData, totalQuestions, totalCorrect, totalWrong, totalSkipped }: { pieData: any[], totalQuestions: number, totalCorrect: number, totalWrong: number, totalSkipped: number }) => {
  return (
    <div className="relative z-10">
       <div className="w-full aspect-square relative max-w-[190px] mx-auto mb-8 drop-shadow-md">
          <ResponsiveContainer width="100%" height="100%" debounce={100}>
             <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={85} paddingAngle={6} dataKey="value" stroke="none" isAnimationActive={false}>
                   {pieData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
             </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
             <span className="text-3xl sm:text-4xl font-sans font-black text-slate-900 leading-none tracking-tight">{totalQuestions}</span>
             <span className="text-[9px] font-sans font-black text-slate-400 mt-1.5 uppercase tracking-widest">Total Qs</span>
          </div>
       </div>
       <div className="space-y-2.5">
          <AccuracyRow label="Correct" value={totalCorrect} total={totalQuestions} color="bg-emerald-500" />
          <AccuracyRow label="Wrong" value={totalWrong} total={totalQuestions} color="bg-rose-500" />
          <AccuracyRow label="Skipped" value={totalSkipped} total={totalQuestions} color="bg-slate-400" />
       </div>
    </div>
  );
});

const SkillRadarChart = React.memo(({ skillProfile }: { skillProfile: any[] }) => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="lg:col-span-5 w-full h-[280px] relative z-10 flex items-center justify-center">
       <ResponsiveContainer width="100%" height="100%" debounce={100}>
          <RadarChart cx="50%" cy="50%" outerRadius={isMobile ? "64%" : "58%"} data={skillProfile} margin={isMobile ? { top: 10, right: 10, bottom: 10, left: 10 } : { top: 10, right: 40, bottom: 10, left: 40 }}>
             <defs>
                <linearGradient id="overallRadarGrad" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="0%" stopColor="#8a1c36" stopOpacity={0.65}/>
                   <stop offset="100%" stopColor="#6366f1" stopOpacity={0.10}/>
                </linearGradient>
             </defs>
             <PolarGrid stroke="#cbd5e1" strokeOpacity={0.5} strokeDasharray="4 4" />
             <PolarAngleAxis dataKey="name" tickFormatter={(t) => t.toUpperCase()} tick={{ fill: '#64748b', fontSize: isMobile ? 8 : 9, fontWeight: 900, fontFamily: 'var(--font-sans)', letterSpacing: '0.05em' }} />
             <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} tickCount={6} />
             <Radar 
               name="Skill Level" 
               dataKey="value" 
               stroke="#8a1c36" 
               strokeWidth={2.5} 
               fill="url(#overallRadarGrad)" 
               activeDot={{ r: 5, fill: '#8a1c36', strokeWidth: 2, stroke: '#ffffff' }} 
               isAnimationActive={false}
             />
             <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }} />
          </RadarChart>
       </ResponsiveContainer>
    </div>
  );
});

const SubjectBarChart = React.memo(({ uniqueSubjects }: { uniqueSubjects: any[] }) => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="lg:col-span-5 w-full h-[240px] flex items-center justify-center">
       <ResponsiveContainer width="100%" height="100%" debounce={100}>
          <BarChart data={uniqueSubjects} margin={isMobile ? { top: 10, right: 10, left: -32, bottom: 0 } : { top: 10, right: 10, left: -25, bottom: 0 }}>
             <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor="#8a1c36" stopOpacity={0.95}/>
                   <stop offset="95%" stopColor="#6366f1" stopOpacity={0.65}/>
                </linearGradient>
             </defs>
             <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#cbd5e1" strokeOpacity={0.25} />
             <XAxis dataKey="name" axisLine={false} tickLine={false} tickFormatter={(val) => val.length > (isMobile ? 12 : 24) ? `${val.substring(0, isMobile ? 10 : 22)}...` : val} tick={{ fill: '#94a3b8', fontSize: isMobile ? 8 : 10, fontWeight: 700 }} dy={10} />
             <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: isMobile ? 8 : 10, fontWeight: 700 }} domain={[0, 100]} />
             <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
             <Bar dataKey="avgScore" name="Accuracy" fill="url(#barGrad)" radius={[8, 8, 0, 0]} barSize={isMobile ? 20 : 28} isAnimationActive={false} />
          </BarChart>
       </ResponsiveContainer>
    </div>
  );
});

function SkeletonStatCard() {
  return (
    <div className="w-full animate-pulse">
      <div 
        className="relative bg-white/85 p-5 sm:p-6 rounded-2xl sm:rounded-[2.25rem] shadow-[0_8px_32px_rgba(0,0,0,0.015)] border border-slate-100/70 flex flex-col justify-between min-h-[142px]"
        style={{
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          WebkitTransform: 'translate3d(0,0,0)',
          transform: 'translate3d(0,0,0)'
        }}
      >
        <div className="absolute inset-0 rounded-2xl sm:rounded-[2.25rem] overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-slate-150/40 rounded-full blur-3xl" />
        </div>
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
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="w-full mx-auto px-4 sm:px-0 space-y-6 sm:space-y-8 pb-32 sm:pb-24 relative z-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Trend skeleton */}
        <div className="lg:col-span-8 relative bg-white/85 rounded-[2.0rem] p-6 sm:p-8 border border-slate-100/70 animate-pulse overflow-hidden">
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
        <div className="lg:col-span-4 bg-white/85 rounded-[2.0rem] p-6 border border-slate-100/70 animate-pulse flex flex-col items-center overflow-hidden">
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
    return rawData.filter(a => a && (a.type === 'mock_test_completed' || a.type === 'practice_test_completed'))
      .sort((a: any, b: any) => new Date(a?.timestamp || 0).getTime() - new Date(b?.timestamp || 0).getTime());
  });
  const [loading, setLoading] = useState(() => !user?.id);

  // AI Performance Lab States
  const [aiInsight, setAiInsight] = useState<string>('');
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [scanningPhase, setScanningPhase] = useState<number>(0); // 0 = idle, 1 = scanning, 2 = loaded
  const [scanStep, setScanStep] = useState<string>('');
  const [aiPanelTab, setAiPanelTab] = useState<'diagnostic' | 'actionPlan' | 'chat'>('diagnostic');
  const [scanCount, setScanCount] = useState<number>(0); // increments on every scan to rotate prompts
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

  const [checkedActions, setCheckedActions] = useState<Record<number, boolean>>(() => {
    try {
      const storageKey = `oep_analytics_checked_actions_${user?.id || 'guest'}`;
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Sync chat history and checked actions when user ID changes (e.g. login/logout)
  useEffect(() => {
    try {
      const chatKey = `oep_analytics_coach_messages_${user?.id || 'guest'}`;
      const savedChat = localStorage.getItem(chatKey);
      setRawChatHistory(savedChat ? JSON.parse(savedChat) : []);
    } catch (e) {
      setRawChatHistory([]);
    }
    try {
      const actionsKey = `oep_analytics_checked_actions_${user?.id || 'guest'}`;
      const savedActions = localStorage.getItem(actionsKey);
      setCheckedActions(savedActions ? JSON.parse(savedActions) : {});
    } catch (e) {
      setCheckedActions({});
    }
  }, [user?.id]);

  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat container and persist dashboard items
  useEffect(() => {
    if (!user?.id) return;
    localStorage.setItem(`oep_analytics_diagnostic_report_${user.id}`, aiInsight || '');
    localStorage.setItem(`oep_analytics_action_items_${user.id}`, JSON.stringify(actionItems || []));
    localStorage.setItem(`oep_analytics_checked_actions_${user.id}`, JSON.stringify(checkedActions || {}));
  }, [user?.id, aiInsight, actionItems, checkedActions]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatHistory, chatLoading]);

  useEffect(() => {
    const load = () => {
      const rawData = (propActivities && propActivities.length > 0)
        ? propActivities
        : (user?.id ? activityTracker.getActivities(user.id) : []);
      const completions = rawData.filter(a => a && (a.type === 'mock_test_completed' || a.type === 'practice_test_completed'))
        .sort((a: any, b: any) => new Date(a?.timestamp || 0).getTime() - new Date(b?.timestamp || 0).getTime());
      setActivities(completions);
      setLoading(false);
    };

    load();

    window.addEventListener('oep-activity-changed', load);
    return () => window.removeEventListener('oep-activity-changed', load);
  }, [user?.id, propActivities]);

  const stats = useMemo(() => {
    if (activities.length === 0) return null;

    let totalCorrect = 0;
    let totalWrong = 0;
    let totalAttempted = 0;
    let totalQuestions = 0;
    let totalTimeTaken = 0;
    let totalCalculatedScore = 0;

    const recalculatedActivities = activities.filter(Boolean).map(a => {
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
        actCorrect = typeof a.correct === 'number' 
          ? a.correct 
          : (typeof a.metadata?.correctCount === 'number' 
            ? a.metadata.correctCount 
            : (typeof a.metadata?.correct === 'number' 
              ? a.metadata.correct 
              : (typeof a.score === 'number' && a.score > 0 ? Math.round(a.score) : 0)));
        actWrong = typeof a.incorrect === 'number' 
          ? a.incorrect 
          : (typeof a.metadata?.incorrectCount === 'number' 
            ? a.metadata.incorrectCount 
            : (typeof a.metadata?.incorrect === 'number' 
              ? a.metadata.incorrect 
              : 0));
        actAttempted = a.metadata?.attempted || (actCorrect + actWrong);
        actTotalQ = a.totalMarks || a.total || actAttempted;
      }

      const actScore = typeof a.score === 'number' ? a.score : (actCorrect - (actWrong * negativeMarking));
      const actAccuracy = isNaN(actCorrect) || isNaN(actAttempted) || actAttempted <= 0 
        ? 0 
        : (actCorrect / actAttempted) * 100;
      const timeTaken = a.metadata?.timeTaken || a.timeSpent || 0;

      const actMaxMarks = a.totalMarks || a.metadata?.test?.totalMarks || a.metadata?.totalMarks || actTotalQ || 1;
      const actScorePct = isNaN(actScore) || isNaN(actMaxMarks) || actMaxMarks <= 0 
        ? 0 
        : (actScore / actMaxMarks) * 100;

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
        recal_maxMarks: actMaxMarks,
        recal_score_pct: actScorePct,
        recal_time: timeTaken
      };
    });

    const totalTests = recalculatedActivities.length;
    const avgAccuracy = isNaN(totalCorrect) || isNaN(totalAttempted) || totalAttempted <= 0 
      ? 0 
      : (totalCorrect / totalAttempted) * 100;
    const avgTimePerQuestion = isNaN(totalTimeTaken) || isNaN(totalAttempted) || totalAttempted <= 0 
      ? 0 
      : (totalTimeTaken / totalAttempted);
    const roundedCorrect = Math.round(totalCorrect);
    const roundedWrong = Math.round(totalWrong);
    const roundedSkipped = Math.max(0, totalQuestions - (roundedCorrect + roundedWrong));

    const pieData = [
      { name: 'Correct', value: roundedCorrect, color: '#10b981' },
      { name: 'Wrong', value: roundedWrong, color: '#f43f5e' },
      { name: 'Skipped', value: roundedSkipped, color: '#94a3b8' }
    ];

    let impScore = 0;
    let impAcc = 0;
    if (totalTests >= 2) {
      const last = recalculatedActivities[recalculatedActivities.length - 1];
      const prev = recalculatedActivities[recalculatedActivities.length - 2];
      const lastScorePct = last.recal_score_pct;
      const prevScorePct = prev.recal_score_pct;
      
      impScore = lastScorePct - prevScorePct;
      impAcc = last.recal_accuracy - prev.recal_accuracy;
    }

    const recent15 = recalculatedActivities.slice(-15);
    const chartData = recent15.map((a, i) => ({
      name: `T${totalTests - recent15.length + i + 1}`,
      score: Math.round(a.recal_score_pct),
      accuracy: Math.round(a.recal_accuracy),
      time: a.recal_attempted > 0 ? Math.round(a.recal_time / a.recal_attempted) : 0,
    }));

    const examGroups = new Map<string, {
      lastAttemptDate: string,
      totalAttempts: number,
      practiceMap: Map<string, { correct: number, attempted: number }>,
      mockMap: Map<string, { correct: number, attempted: number }>
    }>();

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
      const escapedExamName = examName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let t = title.replace(new RegExp(escapedExamName, 'i'), '')
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
          const acc = isNaN(sData.correct) || isNaN(sData.attempted) || sData.attempted <= 0 
            ? 0 
            : (sData.correct / sData.attempted) * 100;
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

    const lightAttempts = recalculatedActivities.map(a => ({
      title: a.title,
      type: a.type,
      timestamp: a.timestamp,
      score: a.recal_score,
      totalQ: a.recal_totalQ,
      accuracy: a.recal_accuracy,
      correct: a.recal_correct,
      wrong: a.recal_wrong,
      attempted: a.recal_attempted,
      time: a.recal_time,
      examName: a.metadata?.examName || a.metadata?.test?.exam,
      testCategory: a.metadata?.testCategory || a.metadata?.test?.category
    }));

    return {
      totalTests,
      avgScore: Math.round(recalculatedActivities.reduce((sum, a) => sum + (a.recal_score_pct || 0), 0) / (recalculatedActivities.length || 1)),
      avgAccuracy: Math.round(avgAccuracy),
      avgTimePerQuestion,
      pieData,
      chartData,
      totalCorrect: roundedCorrect,
      totalWrong: roundedWrong,
      totalSkipped: roundedSkipped,
      totalQuestions,
      impScore: Math.round(impScore),
      impAcc: Math.round(impAcc),
      skillProfile,
      examAnalysis: parsedExamAnalysis,
      attempts: lightAttempts
    };
  }, [activities]);

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
    let strongestSub = "";
    let highestScore = 0;
    
    stats.examAnalysis.forEach(exam => {
      const allTests = [...(exam.practiceTests || []), ...(exam.mockTests || [])];
      allTests.forEach(test => {
        if (test.avgScore < lowestScore && test.name) {
          lowestScore = test.avgScore;
          weakestSub = test.name;
        }
        if (test.avgScore > highestScore && test.name) {
          highestScore = test.avgScore;
          strongestSub = test.name;
        }
      });
    });

    const speed = stats.avgTimePerQuestion;
    const targetScore = Math.min(95, Math.max(75, stats.avgScore + 10));
    const momentum = stats.skillProfile.find(s => s.name === "Momentum")?.value ?? 50;
    const endurance = stats.skillProfile.find(s => s.name === "Endurance")?.value ?? 50;
    const precision = stats.skillProfile.find(s => s.name === "Precision")?.value ?? 50;

    // Pool of context-aware prompt variants per category, rotated by scan count
    const slot0Options: string[] = [];
    if (speed > 45) {
      slot0Options.push(`How can I reduce my slow speed of ${speed.toFixed(0)}s per question?`);
      slot0Options.push(`Give me a timed drill plan to get below 30s per question.`);
      slot0Options.push(`What question-skipping strategies work when I run out of time?`);
    } else if (speed < 20 && stats.avgAccuracy < 60) {
      slot0Options.push(`My speed is fast (${speed.toFixed(0)}s) but accuracy is low (${stats.avgAccuracy}%). How do I balance them?`);
      slot0Options.push(`I answer quickly but keep making mistakes — what cognitive habit should I change?`);
      slot0Options.push(`How do I slow down on tricky questions without losing overall pace?`);
    } else {
      slot0Options.push("Analyze my overall speed versus accuracy tradeoff.");
      slot0Options.push(`My speed is ${speed.toFixed(0)}s per question — is that competitive for OPSC exams?`);
      slot0Options.push("What is the ideal time management strategy per question type?");
    }

    const slot1Options: string[] = [];
    if (weakestSub && lowestScore < 75) {
      slot1Options.push(`Explain the high-yield topics and shortcuts for ${weakestSub}.`);
      slot1Options.push(`Give me 3 targeted practice strategies to improve my ${weakestSub} score from ${lowestScore}%.`);
      slot1Options.push(`What are the most commonly repeated questions in ${weakestSub} for Odisha exams?`);
    } else {
      slot1Options.push("Give me high-yield shortcuts for Odisha GK & History.");
      slot1Options.push("What are the most repeated topics across OPSC OAS previous years?");
      slot1Options.push("Summarize the key focus areas for OSSSC RI/ARI exam preparation.");
    }

    const slot2Options: string[] = [];
    if (momentum < 45) {
      slot2Options.push(`Why is my performance momentum dropping and how do I reverse it?`);
      slot2Options.push(`What is causing my declining score trend and how do I recover?`);
      slot2Options.push(`Design a confidence-building 3-day plan to get my momentum back.`);
    } else if (stats.impScore > 0) {
      slot2Options.push(`How do I sustain my recent +${stats.impScore}% score improvement?`);
      slot2Options.push(`My scores are rising — what should I focus on to keep improving?`);
      slot2Options.push(`I improved by ${stats.impScore}% recently. What's the next milestone to target?`);
    } else if (precision < 60) {
      slot2Options.push(`My precision score is low (${precision}%). How do I stop making careless mistakes?`);
      slot2Options.push("What techniques help reduce wrong answers from overconfidence?");
      slot2Options.push("How do I build better answer verification habits under time pressure?");
    } else {
      slot2Options.push("Why is my momentum score low compared to my accuracy?");
      slot2Options.push("How do I turn consistent practice into a steady score improvement curve?");
      slot2Options.push("What psychological habits help maintain exam performance consistency?");
    }

    const slot3Options: string[] = [];
    if (stats.avgScore < 50) {
      slot3Options.push(`Design a 7-day emergency study roadmap to hit ${targetScore}% score.`);
      slot3Options.push(`My average score is ${stats.avgScore}% — what is the fastest path to ${targetScore}%?`);
      slot3Options.push(`Create a priority topic list I must master this week to improve quickly.`);
    } else if (endurance < 50) {
      slot3Options.push(`Design a 5-day custom plan to scale my score to ${targetScore}% while improving endurance.`);
      slot3Options.push("How do I build stamina to maintain performance across a full 150-question mock test?");
      slot3Options.push("What is a good daily practice volume to improve my endurance score?");
    } else if (strongestSub) {
      slot3Options.push(`Design a 5-day custom plan to push my ${strongestSub} score above 90%.`);
      slot3Options.push(`I am strongest in ${strongestSub} — how do I maximize marks from it in the actual exam?`);
      slot3Options.push(`Design a hybrid study plan combining my strength in ${strongestSub} with improving ${weakestSub || 'weaker areas'}.`);
    } else {
      slot3Options.push(`Design a 5-day custom plan to scale my score to ${targetScore}%.`);
      slot3Options.push("Create a balanced weekly study schedule for Odisha competitive exam preparation.");
      slot3Options.push("Design a revision plan targeting maximum score improvement in 10 days.");
    }

    // Rotate variant selection based on scan count so each scan gives different chips
    const pick = (options: string[]) => options[scanCount % options.length];

    return [
      pick(slot0Options),
      pick(slot1Options),
      pick(slot2Options),
      pick(slot3Options),
    ];
  }, [stats, scanCount]);

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
    if (!stats) return;
    const cacheKey = `oep_ai_insights_${user?.id}_${stats.totalTests}_${stats.avgScore}`;
    
    setChatHistory([]);
    setScanCount(prev => prev + 1);
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
            { role: 'user', content: `Analyze this student data and return JSON:\n${JSON.stringify(stats, null, 2)}` }
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
        diagnostic: `Based on your ${stats.totalTests} completed mock tests, you have shown an average accuracy of ${stats.avgAccuracy}%. Your speed is ${stats.avgTimePerQuestion.toFixed(0)}s per question. Focus on reviewing wrong answers and practicing weaker subjects.`,
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
      const historyStr = stats?.attempts && stats.attempts.length
        ? stats.attempts
            .map(h => {
              const scoreStr = h.score !== undefined ? `, Score: ${h.score}${h.totalQ !== undefined ? `/${h.totalQ}` : ''}` : '';
              const accStr = h.accuracy !== undefined ? `, Accuracy: ${Math.round(h.accuracy)}%` : '';
              const examStr = h.examName ? `, Exam: "${h.examName}"` : '';
              const catStr = h.testCategory ? `, Category: "${h.testCategory}"` : '';
              const durationStr = h.time !== undefined ? `, Time Spent: ${Math.floor(h.time / 60)}m ${h.time % 60}s` : '';
              const dateObj = h.timestamp ? new Date(h.timestamp) : null;
              const isValidDate = dateObj && !isNaN(dateObj.getTime());
              const dateStr = isValidDate ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown Date';
              const timeStr = isValidDate ? dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Unknown Time';
              return `• Title: "${h.title}" | Date: ${dateStr} | Time: ${timeStr} | Type: ${h.type.replace(/_/g, ' ')}${examStr}${catStr}${scoreStr}${accStr}${durationStr}`;
            })
            .join('\n')
        : 'No mock or practice test attempts recorded yet.';

      const skillProfileStr = stats?.skillProfile
        ? stats.skillProfile.map(s => `  * ${s.name}: ${s.value}%`).join('\n')
        : '  * Skill profile not calculated yet.';

      const actionItemsStr = actionItems && actionItems.length
        ? actionItems.map((item: any, idx: number) => {
            const isCompleted = !!checkedActions[idx];
            return `  ${idx + 1}. Task: "${item.task}" | Status: ${isCompleted ? 'COMPLETED (checked)' : 'PENDING (unchecked)'} | Boost: ${item.boost} | Timeframe: ${item.timeframe}`;
          }).join('\n')
        : '  * No study checklist items generated yet.';

      const systemPrompt = `You are the "OdishaExamPrep AI Performance Coach", an elite academic analyst and tutor. You help students understand and improve their performance metrics based on real database records.

Use this complete student context in your replies:
- Student Name: ${user?.user_metadata?.full_name || 'Student'}
- Active target exam: ${sessionStorage.getItem('oep_selectedExamName') || sessionStorage.getItem('oep_selectedExam') || 'None selected'}
- Average Score: ${stats?.avgScore ?? 0}%
- Average Accuracy: ${stats?.avgAccuracy ?? 0}%
- Average Speed: ${(stats?.avgTimePerQuestion ?? 0).toFixed(1)}s per question
- Total Test Attempts: ${stats?.totalTests ?? 0}
- Calculated Skill Profile Radar Dimensions:
${skillProfileStr}
- Latest AI Scan Diagnostic Insight: "${aiInsight || 'No scan insights generated yet.'}"
- Custom Action Plan checklist (Completed/Pending status based on user clicks):
${actionItemsStr}
- Detailed Test Attempts (from oldest to newest):
${historyStr}
- Subject-by-Subject Breakdown:
${stats?.examAnalysis ? stats.examAnalysis.map(e => `  * Exam: "${e.examName}" (Attempts: ${e.totalAttempts})\n` + [...(e.mockTests || []), ...(e.practiceTests || [])].map(s => `    - Subject: "${s.name}" | Status: ${s.status} (Accuracy: ${s.avgScore}%, Correct: ${s.correct}/${s.attempted})`).join('\n')).join('\n') : '  * No breakdown compiled yet.'}

## ⚠️ CRITICAL RULES — READ CAREFULLY
1. **Answer ONLY based on the REAL DATA above.** Do NOT hallucinate other scores, mock tests, topics, or checklist items.
2. If the student asks about a specific mock/practice test score, speed dimension, weak topic, or checklist action item that is not in the real data list above, state that you do not have that specific data.
3. Keep your answers warm, encouraging, short, structured (2-4 sentences), and focused on helping them improve their scores in Odisha exams. Do not mention external AI brands.`;

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
    <div className="relative w-full min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(138,28,54,0.05),transparent_50%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.04),transparent_50%)]">
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
    <div className="relative w-full min-h-screen overflow-x-hidden" style={{ isolation: 'isolate' }}>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(138,28,54,0.06),transparent_50%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.04),transparent_50%)] -z-10 pointer-events-none" />

      <motion.div 
        variants={stagger.containerDelay(0.1, 0.1)}
        initial="hidden"
        animate="show"
        className="w-full mx-auto px-4 sm:px-0 space-y-6 sm:space-y-8 pb-32 sm:pb-24 relative z-10"
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
          className="relative overflow-hidden bg-white text-slate-800 rounded-3xl sm:rounded-[2.5rem] p-4.5 sm:p-6 lg:p-8 border border-slate-200/60 shadow-xl"
        >
          {/* Subtle Glow Orbs */}
          <div 
            className="absolute top-[-100px] right-[-100px] w-80 h-80 pointer-events-none" 
            style={{ background: 'radial-gradient(circle at center, rgba(138, 28, 54, 0.05) 0%, transparent 70%)' }} 
          />
          <div 
            className="absolute bottom-[-100px] left-[-100px] w-80 h-80 pointer-events-none" 
            style={{ background: 'radial-gradient(circle at center, rgba(99, 102, 241, 0.05) 0%, transparent 70%)' }} 
          />

          {/* Faint grid pattern background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.008)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.008)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-40" />

          <div className="relative z-10">
            {scanningPhase === 0 && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-4">
                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5 w-full">
                  <div className="w-16 h-16 rounded-2xl bg-[#8A1C36]/5 border border-[#8A1C36]/15 flex items-center justify-center relative shadow-sm shrink-0">
                    <Brain className="w-9 h-9 text-[#8A1C36] animate-pulse" />
                    <div className="absolute inset-0 rounded-2xl border-2 border-[#8A1C36]/10 animate-ping" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                      <span className="px-2.5 py-0.5 bg-[#8A1C36]/10 border border-[#8A1C36]/20 text-[#8A1C36] text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1 shadow-sm leading-none">
                        <Cpu className="w-2.5 h-2.5" /> OdishaExamPrep AI
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
                  className="w-full md:w-auto px-8 h-[52px] rounded-2xl bg-gradient-to-r from-[#8A1C36] via-[#a32240] to-indigo-600 hover:from-[#76142c] hover:to-indigo-700 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-brand-500/10 hover:shadow-brand-500/20 hover:scale-[1.02] active:scale-98 transition-[transform,box-shadow] flex items-center justify-center gap-2 group cursor-pointer border-none"
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
                  <div className="absolute inset-3 rounded-full border-4 border-slate-100/5 border-b-indigo-400 animate-spin [animation-duration:1.5s]" />
                  <div className="absolute inset-6 rounded-full border-2 border-slate-100/10 border-t-emerald-400 animate-spin [animation-duration:0.8s]" />
                  <Brain className="w-8 h-8 text-[#8A1C36] animate-pulse" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 justify-center">
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200/60 pb-4 sm:pb-5 gap-4">
                  <div className="flex items-center justify-between w-full sm:w-auto min-w-0">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center shrink-0">
                        <Cpu className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-[#8A1C36]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-sans font-black tracking-tight leading-snug text-slate-900">AI Diagnostics Center</h3>
                        <p className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1 sm:mt-1.5 leading-normal">Synthesized via OdishaExamPrep AI Engine</p>
                      </div>
                    </div>
                    {/* Mobile Close Button */}
                    <button
                      onClick={() => {
                        const cacheKey = `oep_ai_insights_${user?.id}_${stats?.totalTests}_${stats?.avgScore}`;
                        sessionStorage.removeItem(cacheKey);
                        setScanningPhase(0);
                        setAiInsight('');
                        setActionItems([]);
                      }}
                      className="sm:hidden w-9 h-9 rounded-xl flex items-center justify-center bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/60 transition-all cursor-pointer shrink-0"
                      title="Return to main screen"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    {/* Tab Navigation */}
                    <div className="flex bg-slate-100 border border-slate-200/60 p-0.5 sm:p-1 rounded-xl w-full sm:w-auto relative">
                      {(['diagnostic', 'actionPlan', 'chat'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setAiPanelTab(tab)}
                          className={cn(
                            "relative px-1.5 sm:px-4 py-1 sm:py-2 text-[9px] sm:text-xs font-black uppercase tracking-wider rounded-lg transition-colors duration-300 cursor-pointer flex-1 sm:flex-initial border-none whitespace-nowrap focus:outline-none bg-transparent",
                            aiPanelTab === tab ? "text-[#8A1C36]" : "text-slate-500 hover:text-slate-800"
                          )}
                        >
                          {aiPanelTab === tab && (
                            <motion.div
                              layoutId="activeDiagnosticTab"
                              className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/40 z-0"
                              transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            />
                          )}
                          <span className="relative z-10">
                            {tab === 'diagnostic' ? 'Insights' : tab === 'actionPlan' ? 'Action Plan' : 'AI Coach'}
                          </span>
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => runAiAnalysis(true)}
                      disabled={loadingAi}
                      className={cn(
                        "flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-2.5 sm:px-2.5 rounded-xl transition-all cursor-pointer font-bold text-[10px] sm:text-xs uppercase tracking-wider shrink-0 disabled:opacity-50 border active:scale-95",
                        loadingAi
                          ? "bg-slate-50 border-slate-200/60 text-slate-400"
                          : "bg-[#8A1C36]/5 hover:bg-[#8A1C36]/10 border-[#8A1C36]/10 text-[#8A1C36] hover:text-[#8A1C36]"
                      )}
                      title="Re-Scan Analytics"
                    >
                      <RefreshCw className={cn("w-3 h-3 sm:w-3.5 sm:h-3.5", loadingAi && "animate-spin")} />
                      <span className="inline-block sm:hidden lg:inline text-[9px] sm:text-xs">
                        {loadingAi ? "Scanning..." : "Rescan Analytics"}
                      </span>
                    </button>

                    {/* Laptop Close Button */}
                    <button
                      onClick={() => {
                        const cacheKey = `oep_ai_insights_${user?.id}_${stats?.totalTests}_${stats?.avgScore}`;
                        sessionStorage.removeItem(cacheKey);
                        setScanningPhase(0);
                        setAiInsight('');
                        setActionItems([]);
                      }}
                      className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/60 hover:border-rose-200/60 active:scale-95 transition-all shrink-0 cursor-pointer"
                      title="Return to main screen"
                    >
                      <X className="w-4 h-4" />
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
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="px-2 py-0.5 bg-[#8A1C36]/10 border border-[#8A1C36]/20 text-[#8A1C36] text-[9px] font-black uppercase tracking-widest rounded-lg whitespace-nowrap">Performance Report</span>
                          <span className="text-[10px] font-bold text-slate-500 leading-normal">Targeting Odisha Competitive Exams</span>
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
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-[#8A1C36]/10 border border-[#8A1C36]/20 text-[#8A1C36] text-[9px] font-black uppercase tracking-widest rounded-lg whitespace-nowrap">Study Checklist</span>
                        <span className="text-[10px] font-bold text-slate-500 leading-normal">Check off items as you complete them to lift your score</span>
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
                              <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded-lg border border-emerald-200/30 uppercase">
                                Lift {item.boost || '+5%'}
                              </span>
                              <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[9px] font-black rounded-lg border border-slate-200 uppercase">
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
                      <div className="lg:col-span-8 flex flex-col justify-between border border-slate-200 rounded-2xl bg-slate-50/50 overflow-hidden h-[480px] sm:h-[500px] lg:h-[520px]">
                        {/* Top bar with Clear Chat option */}
                        <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">AI Performance Coach</span>
                          </div>
                          {chatHistory.length > 0 && (
                            <button
                              onClick={() => setChatHistory([])}
                              className="text-[9px] font-black text-slate-400 hover:text-[#8A1C36] flex items-center gap-1.5 transition-colors cursor-pointer border-none bg-transparent"
                            >
                              <Trash2 className="w-3 h-3" /> CLEAR CHAT
                            </button>
                          )}
                        </div>

                        <div ref={chatContainerRef} className="p-4 overflow-y-auto space-y-3.5 flex-1 no-scrollbar text-xs" style={{ overscrollBehaviorY: 'contain' }}>
                          {chatHistory.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6">
                              <Cpu className="w-10 h-10 text-slate-400 mb-3 animate-float-gentle" />
                              <p className="font-semibold text-sm text-slate-700 mb-1">Your AI Exam Coach is ready</p>
                              <p className="text-[10px] font-medium leading-relaxed max-w-xs text-slate-500">Ask specific questions about your mock scores, speed problems, or request target study advice.</p>
                            </div>
                          ) : (
                            chatHistory.map((msg, i) => (
                              <div 
                                key={i} 
                                className={cn(
                                  "flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-305",
                                  msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                                )}
                              >
                                <div className={cn(
                                  "w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center shrink-0 text-[9px] sm:text-[10px] font-black shadow-sm",
                                  msg.role === 'user' ? "bg-[#8A1C36] text-white" : "bg-slate-200 text-slate-700"
                                )}>
                                  {msg.role === 'user' ? 'ME' : 'AI'}
                                </div>
                                <div className={cn(
                                  "p-2.5 sm:p-3 rounded-2xl leading-relaxed text-xs shadow-sm",
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
                            <div className="flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%] items-center mr-auto">
                              <div className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] sm:text-[10px] font-black shadow-sm">
                                AI
                              </div>
                              <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-slate-200 text-slate-500 rounded-tl-none flex items-center gap-1.5 shadow-sm">
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
                            placeholder="Ask about speed, scores, accuracy..."
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
                          <p className="text-[10px] font-medium text-slate-500 leading-relaxed mb-3 sm:mb-4">Click any prompt to trigger instant diagnostics from your AI coach.</p>
                          
                          <div className="flex flex-row overflow-x-auto gap-2.5 no-scrollbar pb-1.5 whitespace-nowrap lg:flex-col lg:overflow-visible lg:whitespace-normal">
                            {assistantChips.map((chip, idx) => (
                              <button
                                key={idx}
                                onClick={() => sendMessage(chip)}
                                disabled={chatLoading}
                                className="text-left p-2.5 bg-white hover:bg-brand-50 border border-slate-200/60 hover:border-brand-200 rounded-xl text-[11px] font-semibold text-slate-600 hover:text-[#8A1C36] transition-all cursor-pointer leading-tight disabled:opacity-50 shadow-sm shrink-0 whitespace-nowrap lg:whitespace-normal"
                              >
                                {chip}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest text-center mt-3 sm:mt-4">
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
             className="lg:col-span-8 relative overflow-hidden bg-white/92 rounded-3xl sm:rounded-[2.5rem] p-4.5 sm:p-6 lg:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.015)] border border-slate-100/70 hover:border-brand-200/40 hover:shadow-[0_20px_50px_rgba(138,28,54,0.045)] transition-[border-color,box-shadow] duration-500 group"
           >
              <div 
                className="absolute -top-32 -right-32 w-72 h-72 pointer-events-none transition-transform duration-700 group-hover:scale-110" 
                style={{ background: 'radial-gradient(circle at center, rgba(138, 28, 54, 0.05) 0%, transparent 70%)' }} 
              />
              <div 
                className="absolute -bottom-32 -left-32 w-72 h-72 pointer-events-none" 
                style={{ background: 'radial-gradient(circle at center, rgba(99, 102, 241, 0.03) 0%, transparent 70%)' }} 
              />
              
              <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                 <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-1 h-5 bg-[#8a1c36] rounded-full shrink-0" />
                      <h3 className="text-lg sm:text-xl font-sans font-black text-slate-900 tracking-tight">Performance Trend</h3>
                    </div>
                    <p className="text-xs font-semibold text-slate-400 leading-none mt-1">Your mock exam score progression history</p>
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
                <PerformanceTrendChart chartData={stats.chartData} />
              ) : (
                 <div className="w-full h-[300px] flex items-center justify-center bg-slate-50/40 rounded-2xl border border-slate-150/50">
                    <p className="text-slate-400 font-bold text-sm">Not enough data to plot a trend.</p>
                 </div>
              )}
           </motion.div>

           {/* Accuracy Breakdown Card */}
           <motion.div 
             variants={stagger.itemFadeUp} 
             className="lg:col-span-4 relative overflow-hidden bg-white/92 rounded-3xl sm:rounded-[2.5rem] p-4.5 sm:p-6 lg:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.015)] border border-slate-100/70 hover:border-brand-200/40 hover:shadow-[0_20px_50px_rgba(138,28,54,0.045)] transition-[border-color,box-shadow] duration-500 group"
           >
              <div 
                className="absolute -bottom-24 -left-24 w-48 h-48 pointer-events-none" 
                style={{ background: 'radial-gradient(circle at center, rgba(203, 213, 225, 0.5) 0%, transparent 70%)' }} 
              />
              <div 
                className="absolute -top-24 -right-24 w-48 h-48 pointer-events-none" 
                style={{ background: 'radial-gradient(circle at center, rgba(138, 28, 54, 0.03) 0%, transparent 70%)' }} 
              />
              
              <div className="flex items-center gap-2.5 mb-8 justify-center">
                <div className="w-1 h-5 bg-[#8a1c36] rounded-full shrink-0" />
                <h3 className="text-lg font-sans font-black text-slate-900 tracking-tight text-center">Accuracy Breakdown</h3>
              </div>
              
              {stats.totalQuestions > 0 ? (
                <AccuracyBreakdownChart pieData={stats.pieData} totalQuestions={stats.totalQuestions} totalCorrect={stats.totalCorrect} totalWrong={stats.totalWrong} totalSkipped={stats.totalSkipped} />
              ) : (
                 <div className="p-4 bg-slate-50/40 rounded-2xl border border-slate-200/50 text-center text-xs font-bold text-slate-400">
                    No question breakdown history available.
                 </div>
              )}
           </motion.div>

            {/* Skill Radar Card */}
            <motion.div 
              variants={stagger.itemFadeUp} 
              className="lg:col-span-12 relative overflow-hidden bg-white/92 rounded-3xl sm:rounded-[2.5rem] p-4.5 sm:p-6 lg:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.015)] border border-slate-100/70 hover:border-brand-200/40 hover:shadow-[0_20px_50px_rgba(138,28,54,0.045)] transition-[border-color,box-shadow] duration-500 group"
            >
               <div 
                 className="absolute -bottom-24 -left-24 w-48 h-48 pointer-events-none" 
                 style={{ background: 'radial-gradient(circle at center, rgba(248, 250, 252, 1) 0%, transparent 70%)' }} 
               />
               <div 
                 className="absolute -top-24 -right-24 w-48 h-48 pointer-events-none" 
                 style={{ background: 'radial-gradient(circle at center, rgba(99, 102, 241, 0.03) 0%, transparent 70%)' }} 
               />
               
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
                    <SkillRadarChart skillProfile={stats.skillProfile} />
 
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
                 <div className="p-4 bg-slate-50/40 rounded-2xl border border-slate-200/50 text-center text-xs font-bold text-slate-400">
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
                   <motion.div key={idx} variants={stagger.itemFadeUp} className="bg-white/92 rounded-3xl sm:rounded-[2.5rem] p-4.5 sm:p-6 lg:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.015)] border border-slate-100/70 hover:border-brand-200/40 hover:shadow-[0_20px_50px_rgba(138,28,54,0.045)] transition-[border-color,box-shadow] duration-500 relative overflow-hidden flex flex-col shrink-0">
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
                            <SubjectBarChart uniqueSubjects={uniqueSubjects} />
                         ) : null}
  
                        {/* Divider on mobile only */}
                        {uniqueSubjects.length > 0 && (
                          <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-1 lg:hidden" />
                        )}
  
                        {/* Right column: Expandable List */}
                        <div className={cn("space-y-4 max-h-[380px] overflow-y-auto custom-scrollbar pr-1", uniqueSubjects.length > 0 ? "lg:col-span-7" : "lg:col-span-12")} style={{ overscrollBehaviorY: 'contain' }}>
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
                             <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 text-center text-xs font-semibold text-slate-400">
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
               <motion.div variants={stagger.itemFadeUp} whileHover={{ y: -3 }} className="bg-white/92 rounded-3xl sm:rounded-[2rem] p-4.5 sm:p-6 shadow-[0_8px_30px_rgba(15,23,42,0.015)] border border-slate-100/70 hover:border-slate-200 flex gap-4 sm:gap-5 items-start">
                  <div className={cn("p-3 rounded-2xl shrink-0 shadow-sm border border-slate-100", stats.impScore >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                     {stats.impScore >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                 </div>
                 <div>
                    <h4 className="font-extrabold text-slate-800 mb-1 tracking-tight text-sm sm:text-base">{stats.impScore >= 0 ? "You are improving" : "Scores dropped recently"}</h4>
                    <p className="text-xs sm:text-sm font-medium text-slate-400 leading-relaxed">{stats.impScore >= 0 ? "Your latest test scores show positive momentum. Keep up the good work!" : "Review your recent mistakes to get back on track."}</p>
                 </div>
              </motion.div>
               <motion.div variants={stagger.itemFadeUp} whileHover={{ y: -3 }} className="bg-white/92 rounded-3xl sm:rounded-[2rem] p-4.5 sm:p-6 shadow-[0_8px_30px_rgba(15,23,42,0.015)] border border-slate-100/70 hover:border-slate-200 flex gap-4 sm:gap-5 items-start">
                  <div className={cn("p-3 rounded-2xl shrink-0 shadow-sm border border-slate-100", stats.avgTimePerQuestion > 60 ? "bg-amber-50 text-amber-600" : "bg-brand-50 text-brand-600")}>
                    <Timer className="w-5 h-5" />
                 </div>
                 <div>
                    <h4 className="font-extrabold text-slate-800 mb-1 tracking-tight text-sm sm:text-base">{stats.avgTimePerQuestion > 60 ? "Improve Question Speed" : "Optimal Solving Pace"}</h4>
                    <p className="text-xs sm:text-sm font-medium text-slate-400 leading-relaxed">Averaging {stats.avgTimePerQuestion.toFixed(1)}s per question. {stats.avgTimePerQuestion > 60 ? "Try to solve familiar questions faster." : "Excellent pacing, maintain this rate in real exams."}</p>
                 </div>
              </motion.div>
           </div>

           {/* Premium action banner */}
           <motion.div 
             variants={stagger.itemFadeUp} 
             whileHover={{ y: -3 }}
             className="lg:col-span-5 relative bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 rounded-3xl sm:rounded-[2rem] p-4.5 sm:p-6 lg:p-8 flex flex-col justify-between shadow-xl border border-slate-800 gap-6 overflow-hidden min-h-[160px]"
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
