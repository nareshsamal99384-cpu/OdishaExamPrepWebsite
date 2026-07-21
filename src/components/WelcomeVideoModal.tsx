import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Rocket, CheckCircle2, Video, HelpCircle, ArrowRight, BarChart3, ChevronDown } from 'lucide-react';

interface WelcomeVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour?: () => void;
}

export const WelcomeVideoModal: React.FC<WelcomeVideoModalProps> = ({
  isOpen,
  onClose,
  onStartTour
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(true);

  if (!isOpen) return null;

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('oep_welcome_video_seen', 'true');
    }
    onClose();
  };

  const handleStartTourClick = () => {
    if (dontShowAgain) {
      localStorage.setItem('oep_welcome_video_seen', 'true');
    }
    onClose();
    if (onStartTour) {
      onStartTour();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 lg:p-6 overflow-y-auto select-none">
        {/* Glassmorphic Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl transition-opacity cursor-pointer"
        />

        {/* Responsive Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="relative w-full max-w-lg lg:max-w-4xl bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.35)] overflow-hidden z-10 my-auto max-h-[92vh] flex flex-col"
        >
          {/* 1. TOP HEADER BAR (Fixed) */}
          <div className="bg-slate-950 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between border-b border-slate-800 text-white shrink-0 z-30">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-brand-600/30 border border-brand-500/40 flex items-center justify-center text-brand-400">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-400 block lg:hidden">
                  Quick Video Guide
                </span>
                <h2 className="text-xs sm:text-base font-bold text-white tracking-tight leading-none">
                  How to Use Odisha<span className="text-brand-400">Exam</span>Prep
                </h2>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close video tutorial"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. DESKTOP 2-COLUMN SPLIT GRID / MOBILE PINNED VIDEO + SCROLLABLE DETAILS */}
          <div className="flex-1 overflow-hidden flex flex-col lg:grid lg:grid-cols-12 bg-slate-50/50">
            
            {/* VIDEO PLAYER SECTION (Pinned at Top on Mobile / Left 7-Cols on Desktop) */}
            <div className="lg:col-span-7 bg-black flex flex-col justify-between shrink-0 z-20 shadow-md lg:shadow-none">
              <div className="relative w-full aspect-video lg:h-full bg-black flex items-center overflow-hidden">
                <iframe
                  src="https://www.youtube.com/embed/2QYEtgSZGiA?autoplay=1&rel=0&modestbranding=1"
                  title="How to Use OdishaExamPrep - Video Tutorial"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              {/* Desktop Sub-bar */}
              <div className="hidden lg:flex items-center justify-between px-5 py-2.5 bg-slate-950 border-t border-slate-800/80 text-slate-300 text-xs">
                <span className="flex items-center gap-1.5 text-brand-400 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Official Platform Guide
                </span>
                <span className="text-slate-400 text-[11px] font-medium">100% Odisha Exam Syllabus Alignment</span>
              </div>
            </div>

            {/* DETAILS SECTION (Scrollable on Mobile below pinned video / Right 5-Cols on Desktop) */}
            <div className="lg:col-span-5 flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-4">
              {/* Header Title & Intro */}
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-brand-50 border border-brand-100/80 text-brand-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                  <Rocket className="w-3 h-3 text-brand-600" /> Platform Walkthrough
                </div>
                <h3 className="text-base sm:text-xl font-serif font-black text-slate-900 tracking-tight leading-snug">
                  Welcome to Your Exam Prep Hub! 🚀
                </h3>
                <p className="text-slate-600 text-xs sm:text-sm font-semibold leading-relaxed">
                  Watch the pinned video above to explore test features, AI mentor, and rank analytics.
                </p>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-2.5 pt-1">
                <div className="p-3 bg-white rounded-xl border border-slate-200/70 shadow-xs flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-brand-600 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">Timed Exam Simulator</h4>
                    <p className="text-[11px] text-slate-500 font-semibold leading-snug">OPSC, OSSC PYQs & syllabus mock tests.</p>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/70 shadow-xs flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">24/7 AI Mentor Tutor</h4>
                    <p className="text-[11px] text-slate-500 font-semibold leading-snug">Instant doubt solver & LaTeX math diagrams.</p>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/70 shadow-xs flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">State Rank Analytics</h4>
                    <p className="text-[11px] text-slate-500 font-semibold leading-snug">Real-time rank estimation & progress radar.</p>
                  </div>
                </div>
              </div>

              {/* Mobile Scroll Badge */}
              <div className="lg:hidden flex items-center justify-center pt-1 pb-1">
                <span className="text-[10px] font-extrabold text-slate-400 flex items-center gap-1 bg-slate-200/50 px-2.5 py-0.5 rounded-full">
                  <ChevronDown className="w-3 h-3 animate-bounce" /> Details below
                </span>
              </div>
            </div>
          </div>

          {/* 3. STICKY BOTTOM FOOTER BAR (Always Fixed at Bottom) */}
          <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 p-3 sm:p-4 shrink-0 shadow-[0_-8px_25px_rgba(0,0,0,0.06)] space-y-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <label className="inline-flex items-center gap-2 cursor-pointer text-[11px] font-bold text-slate-600 hover:text-slate-900 select-none">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
                />
                Don't show this popup automatically again
              </label>

              <div className="flex items-center gap-2">
                {onStartTour && (
                  <button
                    onClick={handleStartTourClick}
                    className="flex-1 sm:flex-initial py-2.5 px-3 rounded-xl font-bold text-xs text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <HelpCircle className="w-4 h-4 text-brand-600" /> Interactive Tour
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="flex-1 sm:flex-initial py-2.5 px-5 rounded-xl font-black text-xs text-white bg-brand-600 hover:bg-brand-700 transition-all shadow-md hover:shadow-brand-500/20 cursor-pointer flex items-center justify-center gap-1.5 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
