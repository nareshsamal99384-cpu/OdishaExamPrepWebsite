import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, BookOpen, BarChart3, History, 
  BookMarked, CheckCircle2, HelpCircle, 
  ChevronLeft, ChevronRight, Rocket, Award
} from 'lucide-react';

export interface TourStep {
  targetSelector: string;
  title: string;
  content: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  tab?: 'home' | 'courses' | 'analytics' | 'history' | 'library' | 'ai_mentor';
}

interface OnboardingTourProps {
  mainTab?: string;
  onNavigate?: (tab: 'home' | 'courses' | 'analytics' | 'history' | 'library' | 'ai_mentor') => void;
  isOpenManual?: boolean;
  onCloseManual?: () => void;
}

export const TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="exam-search"]',
    title: 'Select Your Targeted Exams',
    content: 'Browse, search, and select examinations (such as OPSC, OSSC, and OSSSC). Tap any exam card to view its curriculum, mock tests, and topic-wise practice material.',
    placement: 'bottom',
    tab: 'home'
  },
  {
    targetSelector: '[data-tour="bottom-nav-ai_mentor"]',
    title: 'AI Mentor — Your 24/7 Personal Tutor',
    content: 'Chat with our advanced AI tailored for Odisha state exams. It helps you clear doubts, generates study plans, and renders step-by-step mathematical formulas and diagrams instantly.',
    placement: 'top',
    tab: 'ai_mentor'
  },
  {
    targetSelector: '[data-tour="bottom-nav-analytics"]',
    title: 'Performance Analytics Dashboard',
    content: 'Track your learning curve! Review subject-wise progress, analyze performance metrics, and pinpoint your strengths and improvement areas with interactive charts.',
    placement: 'top',
    tab: 'analytics'
  },
  {
    targetSelector: '[data-tour="bottom-nav-history"]',
    title: 'Practice History & Smart Resume',
    content: 'Review details of all your previous mock test attempts. If you left a mock test incomplete, you can resume it right where you left off without losing your progress.',
    placement: 'top',
    tab: 'history'
  },
  {
    targetSelector: '[data-tour="bottom-nav-library"]',
    title: 'Your Purchases & Saved Materials',
    content: 'Access all your premium test series, specific question banks, and study packages that you have acquired.',
    placement: 'top',
    tab: 'library'
  },
  {
    targetSelector: '[data-tour="ai-companion"]',
    title: 'OEP Buddy — Always By Your Side',
    content: 'This companion bubble stays with you on every page. Tap it at any time to ask quick questions or get instant clarifications as you study.',
    placement: 'left',
    tab: 'home'
  }
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  mainTab = 'home',
  onNavigate,
  isOpenManual = false,
  onCloseManual
}) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1); // -1: Welcome modal, TOUR_STEPS.length: Congrats modal
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ opacity: 0 });

  // Auto-start for new users (if no tour completed flag exists in localStorage)
  useEffect(() => {
    const isCompleted = localStorage.getItem('oep_tour_completed');
    if (!isCompleted) {
      setIsActive(true);
      setCurrentStep(-1);
    }
  }, []);

  // Monitor manual opening
  useEffect(() => {
    if (isOpenManual) {
      setIsActive(true);
      setCurrentStep(-1);
    }
  }, [isOpenManual]);

  const handleStartTour = () => {
    setCurrentStep(0);
  };

  const handleSkipOrClose = () => {
    setIsActive(false);
    setCurrentStep(-1);
    localStorage.setItem('oep_tour_completed', 'true');
    if (onCloseManual) onCloseManual();
    // Return to home tab upon exit to restore default dashboard state
    if (onNavigate) onNavigate('home');
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      const nextStepIndex = currentStep + 1;
      const nextStep = TOUR_STEPS[nextStepIndex];
      
      // Auto-navigate to correct tab if step requires it
      if (nextStep.tab && onNavigate) {
        onNavigate(nextStep.tab);
      }
      
      setCurrentStep(nextStepIndex);
    } else {
      // Last step completed -> show congrats modal
      setCurrentStep(TOUR_STEPS.length);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      const prevStepIndex = currentStep - 1;
      const prevStep = TOUR_STEPS[prevStepIndex];
      
      if (prevStep.tab && onNavigate) {
        onNavigate(prevStep.tab);
      }
      
      setCurrentStep(prevStepIndex);
    } else if (currentStep === 0) {
      setCurrentStep(-1);
    }
  };

  // Re-calculate target element boundaries when active step, tab, or window state changes
  useEffect(() => {
    if (!isActive || currentStep < 0 || currentStep >= TOUR_STEPS.length) {
      setTargetRect(null);
      return;
    }

    const step = TOUR_STEPS[currentStep];
    
    const updateTargetRect = () => {
      const element = document.querySelector(step.targetSelector);
      if (element) {
        // Scroll element into view smoothly if not visible
        element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        // If element is not found, clear rect and show centered tooltip
        setTargetRect(null);
      }
    };

    // Delay slightly to allow React tabs to finish rendering/mounting components
    const timer = setTimeout(updateTargetRect, 300);

    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect);
    };
  }, [isActive, currentStep, mainTab]);

  // Position tooltip relative to target rect
  useEffect(() => {
    if (!isActive || currentStep < 0 || currentStep >= TOUR_STEPS.length) return;
    
    const step = TOUR_STEPS[currentStep];
    if (!targetRect) {
      // Center position if element not found
      setTooltipStyle({
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        width: '360px',
        maxWidth: '90vw',
        opacity: 1,
        transition: 'opacity 0.2s ease'
      });
      return;
    }

    const margin = 16;
    const tooltipWidth = 350; // Approximated
    const tooltipHeight = 200; // Approximated
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = 0;
    let top = 0;

    switch (step.placement) {
      case 'bottom':
        left = targetRect.left + (targetRect.width - tooltipWidth) / 2;
        top = targetRect.bottom + margin;
        break;
      case 'top':
        left = targetRect.left + (targetRect.width - tooltipWidth) / 2;
        top = targetRect.top - tooltipHeight - margin;
        break;
      case 'left':
        left = targetRect.left - tooltipWidth - margin;
        top = targetRect.top + (targetRect.height - tooltipHeight) / 2;
        break;
      case 'right':
        left = targetRect.right + margin;
        top = targetRect.top + (targetRect.height - tooltipHeight) / 2;
        break;
      default:
        // Center
        left = (viewportWidth - tooltipWidth) / 2;
        top = (viewportHeight - tooltipHeight) / 2;
    }

    // Boundary constraints to keep tooltip within screen edges
    left = Math.max(margin, Math.min(left, viewportWidth - tooltipWidth - margin));
    top = Math.max(margin, Math.min(top, viewportHeight - tooltipHeight - margin));

    // Handle mobile adjustments (always overlay neatly)
    if (viewportWidth < 640) {
      left = (viewportWidth - Math.min(320, viewportWidth - 24)) / 2;
      if (step.placement === 'top') {
        top = Math.max(margin, targetRect.top - 210);
      } else {
        top = Math.min(viewportHeight - 240, targetRect.bottom + margin);
      }
    }

    setTooltipStyle({
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      width: `${Math.min(350, viewportWidth - 24)}px`,
      zIndex: 1000,
      opacity: 1,
      transition: 'left 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease'
    });
  }, [isActive, currentStep, targetRect]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[999] overflow-hidden select-none">
      {/* ── Spotlight SVG Mask Overlay ── */}
      {currentStep >= 0 && currentStep < TOUR_STEPS.length && (
        <svg className="fixed inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="onboarding-spotlight-mask">
              {/* Entire screen opaque white (covers everything) */}
              <rect width="100%" height="100%" fill="white" />
              {/* Highlight transparent rect (spotlight cutout) */}
              {targetRect && (
                <motion.rect
                  initial={false}
                  animate={{
                    x: targetRect.left - 6,
                    y: targetRect.top - 6,
                    width: targetRect.width + 12,
                    height: targetRect.height + 12,
                  }}
                  rx={12}
                  ry={12}
                  fill="black"
                  transition={{ type: 'spring', stiffness: 220, damping: 28 }}
                />
              )}
            </mask>
          </defs>
          {/* Semi-transparent Backdrop Panel */}
          <rect
            width="100%"
            height="100%"
            fill="rgba(8, 12, 28, 0.65)"
            mask="url(#onboarding-spotlight-mask)"
            className="pointer-events-auto cursor-default backdrop-blur-[2px]"
          />
        </svg>
      )}

      <AnimatePresence mode="wait">
        {/* ── Welcome Modal ── */}
        {currentStep === -1 && (
          <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-md z-[1000] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="bg-white/95 rounded-[2.5rem] border border-slate-100 shadow-[0_20px_50px_rgba(37,99,235,0.15)] max-w-md w-full overflow-hidden p-6 sm:p-8 text-center relative"
            >
              {/* Close Button */}
              <button 
                onClick={handleSkipOrClose}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                title="Skip Tour"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 bg-brand-50 border border-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Rocket className="w-8 h-8 text-brand-650 animate-bounce" />
              </div>

              <h2 className="font-serif font-black text-2xl sm:text-3xl text-slate-900 mb-3 tracking-tight">
                Welcome to Odisha<span className="text-brand-600">Exam</span>Prep!
              </h2>
              
              <p className="text-slate-500 font-bold text-sm sm:text-base mb-8 max-w-sm mx-auto leading-relaxed">
                Unlock your potential and ace your exam. Let's take a quick 1-minute guided tour to showcase the key tools that will supercharge your preparation.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleStartTour}
                  className="w-full py-3.5 px-6 rounded-2xl font-black text-sm text-white bg-brand-600 hover:bg-brand-700 transition-all duration-300 shadow-[0_4px_12px_rgba(37,99,235,0.25)] hover:shadow-[0_8px_20px_rgba(37,99,235,0.35)] cursor-pointer transform hover:-translate-y-[1px]"
                >
                  Start Interactive Tour 🚀
                </button>
                <button
                  onClick={handleSkipOrClose}
                  className="w-full py-3 px-6 rounded-2xl font-extrabold text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Explore on My Own
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ── Tour Steps Tooltip Card ── */}
        {currentStep >= 0 && currentStep < TOUR_STEPS.length && (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={tooltipStyle}
            className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/50 shadow-2xl p-5 sm:p-6 flex flex-col gap-4 relative overflow-hidden backdrop-blur-md"
            ref={tooltipRef}
          >
            {/* Top Row: step badge + close button */}
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-600 bg-brand-50 border border-brand-100/50 px-2.5 py-1 rounded-full">
                Step {currentStep + 1} of {TOUR_STEPS.length}
              </span>
              <button 
                onClick={handleSkipOrClose}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                title="Skip Tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content text */}
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-snug flex items-center gap-2 mb-1.5">
                {currentStep === 1 && <Sparkles className="w-4 h-4 text-brand-550 shrink-0" />}
                {TOUR_STEPS[currentStep].title}
              </h3>
              <p className="text-slate-500 font-bold text-slate-550 text-xs sm:text-sm leading-relaxed">
                {TOUR_STEPS[currentStep].content}
              </p>
            </div>

            {/* Footer buttons & progress dots */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-2">
              {/* Progress Dots */}
              <div className="flex gap-1">
                {TOUR_STEPS.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-4 bg-brand-600' : 'w-1.5 bg-slate-200'}`}
                  />
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBack}
                  className="px-3 py-1.5 rounded-xl font-bold text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  onClick={handleNext}
                  className="px-4 py-2 rounded-xl font-black text-xs text-white bg-brand-600 hover:bg-brand-700 transition-all shadow-md shadow-brand-500/10 cursor-pointer flex items-center gap-1"
                >
                  {currentStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Congrats Celebration Modal ── */}
        {currentStep === TOUR_STEPS.length && (
          <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-md z-[1000] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_20px_50px_rgba(37,99,235,0.15)] max-w-md w-full overflow-hidden p-6 sm:p-8 text-center relative"
            >
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Award className="w-8 h-8 text-emerald-600 animate-pulse" />
              </div>

              <h2 className="font-serif font-black text-2xl sm:text-3xl text-slate-900 mb-3 tracking-tight">
                You're Ready! 🎯
              </h2>
              
              <p className="text-slate-500 font-bold text-sm sm:text-base mb-8 max-w-sm mx-auto leading-relaxed">
                You've successfully explored the platform tools. Access your exam portal, practice tests, and AI companion to start studying smart!
              </p>

              <button
                onClick={handleSkipOrClose}
                className="w-full py-3.5 px-6 rounded-2xl font-black text-sm text-white bg-brand-600 hover:bg-brand-700 transition-all duration-300 shadow-[0_4px_12px_rgba(37,99,235,0.25)] hover:shadow-[0_8px_20px_rgba(37,99,235,0.35)] cursor-pointer transform hover:-translate-y-[1px]"
              >
                Let's Ace the Exams! 🏆
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
