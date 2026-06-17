import React from 'react';
import { BookOpen } from 'lucide-react';

export const LoadingPortal = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F5] relative overflow-hidden">
      {/* Ambient background grid and glowing orb */}
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-brand-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative flex flex-col items-center space-y-8 z-10">
        {/* Concentric Portal Spinner */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          {/* Outer Slow Orbit */}
          <div className="absolute inset-0 rounded-full border border-dashed border-brand-500/30 animate-[spin_15s_linear_infinite]" />
          
          {/* Middle Counter-Orbit */}
          <div className="absolute inset-2 rounded-full border border-brand-500/10 border-t-brand-500/40 animate-[spin_3s_linear_infinite_reverse]" />
          
          {/* Inner Glowing Core */}
          <div className="w-16 h-16 rounded-full bg-white border border-brand-500/10 flex items-center justify-center shadow-lg shadow-brand-500/5">
            <BookOpen className="w-7 h-7 text-brand-600 animate-pulse" />
          </div>
        </div>

        {/* Typography Details */}
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Odisha<span className="font-serif italic font-normal text-[#8A1C36]">ExamPrep</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
            Loading Portal...
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingPortal;
