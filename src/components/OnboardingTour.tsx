import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, BookOpen, BarChart3, History, 
  BookMarked, CheckCircle2, HelpCircle, 
  ChevronLeft, ChevronRight, Rocket, Award, Navigation
} from 'lucide-react';

export interface TourStep {
  targetSelector: string;
  title: string;
  targetName: string;
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
    title: 'Choose Your Targeted Odisha Exam',
    targetName: 'Exam Gateway',
    content: 'Explore examinations such as OPSC, OSSC, OSSSC, or Police. Select your exam card to unlock its full syllabus, mock tests, and subject practice material.',
    placement: 'bottom',
    tab: 'home'
  },
  {
    targetSelector: '[data-tour="bottom-nav-ai_mentor"]',
    title: 'AI Mentor — Your 24/7 Personal Tutor',
    targetName: 'AI Mentor Tab',
    content: 'Chat with our advanced AI tailored for Odisha state exams. Clear doubts, generate study plans, and render math formulas and diagrams instantly.',
    placement: 'top',
    tab: 'ai_mentor'
  },
  {
    targetSelector: '[data-tour="bottom-nav-analytics"]',
    title: 'Performance Analytics Dashboard',
    targetName: 'Analytics Tab',
    content: 'Track your learning curve! Review subject-wise progress, analyze performance metrics, and pinpoint your improvement areas with interactive charts.',
    placement: 'top',
    tab: 'analytics'
  },
  {
    targetSelector: '[data-tour="bottom-nav-history"]',
    title: 'Practice History & Smart Resume',
    targetName: 'History Tab',
    content: 'Review details of all your previous mock test attempts. Resume incomplete mock tests right where you left off without losing your progress.',
    placement: 'top',
    tab: 'history'
  },
  {
    targetSelector: '[data-tour="bottom-nav-library"]',
    title: 'Your Purchases & Saved Materials',
    targetName: 'Library Tab',
    content: 'Access all your premium test series, specific question banks, and study packages that you have acquired.',
    placement: 'top',
    tab: 'library'
  },
  {
    targetSelector: '[data-tour="ai-companion"]',
    title: 'OEP Buddy — Always By Your Side',
    targetName: 'OEP Buddy Launcher',
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
  const [currentStep, setCurrentStep] = useState(-1);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ opacity: 0 });
  const [arrowStyle, setArrowStyle] = useState<{ position: 'top' | 'bottom' | 'left' | 'right'; offset: number } | null>(null);
  const [isMobileScreen, setIsMobileScreen] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  // Responsive mode listener
  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-start for new users
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
    if (onNavigate) onNavigate('home');
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      const nextStepIndex = currentStep + 1;
      const nextStep = TOUR_STEPS[nextStepIndex];
      
      if (nextStep.tab && onNavigate) {
        onNavigate(nextStep.tab);
      }
      
      setCurrentStep(nextStepIndex);
    } else {
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

  // Keyboard controls
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkipOrClose();
      } else if (e.key === 'ArrowRight' || (e.key === 'Enter' && currentStep >= 0)) {
        e.preventDefault();
        if (currentStep === -1) {
          handleStartTour();
        } else {
          handleNext();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStep]);

  // Track target element boundaries
  useEffect(() => {
    if (!isActive || currentStep < 0 || currentStep >= TOUR_STEPS.length) {
      setTargetRect(null);
      return;
    }

    const step = TOUR_STEPS[currentStep];
    
    const updateTargetRect = () => {
      let element = document.querySelector(step.targetSelector);
      if (!element && step.tab) {
        element = document.querySelector(`[data-tour="bottom-nav-${step.tab}"]`) ||
                  document.querySelector(`[id="${step.tab}"]`);
      }

      if (element) {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect(rect);
        } else {
          setTargetRect(null);
        }
      } else {
        setTargetRect(null);
      }
    };

    // Instant scroll to target element
    const initialElem = document.querySelector(step.targetSelector);
    if (initialElem) {
      initialElem.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
    }

    updateTargetRect();
    const t1 = setTimeout(updateTargetRect, 20);
    const t2 = setTimeout(updateTargetRect, 100);
    const t3 = setTimeout(updateTargetRect, 250);
    const interval = setInterval(updateTargetRect, 80);

    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, { passive: true });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearInterval(interval);
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect);
    };
  }, [isActive, currentStep, mainTab]);

  // Desktop Target Centering Logic (>=768px)
  useEffect(() => {
    if (!isActive || currentStep < 0 || currentStep >= TOUR_STEPS.length || isMobileScreen) return;
    
    const step = TOUR_STEPS[currentStep];
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const actualWidth = Math.min(350, viewportWidth - 32);
    const actualHeight = tooltipRef.current?.offsetHeight || 260;

    if (!targetRect) {
      setTooltipStyle({
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        width: `${actualWidth}px`,
        maxWidth: 'calc(100vw - 32px)',
        boxSizing: 'border-box',
        opacity: 1,
        transition: 'opacity 0.2s ease'
      });
      setArrowStyle(null);
      return;
    }

    const margin = 16;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    let idealLeft = targetCenterX - actualWidth / 2;
    let idealTop = targetRect.bottom + margin;
    let arrowSide: 'top' | 'bottom' | 'left' | 'right' = 'top';

    if (step.placement === 'top' || (step.placement === 'bottom' && idealTop + actualHeight > viewportHeight - 20)) {
      idealTop = targetRect.top - actualHeight - margin;
      arrowSide = 'bottom';
    } else if (step.placement === 'left') {
      idealLeft = targetRect.left - actualWidth - margin;
      idealTop = targetCenterY - actualHeight / 2;
      arrowSide = 'right';
    } else if (step.placement === 'right') {
      idealLeft = targetRect.right + margin;
      idealTop = targetCenterY - actualHeight / 2;
      arrowSide = 'left';
    }

    const clampedLeft = Math.max(16, Math.min(idealLeft, viewportWidth - actualWidth - 16));
    const clampedTop = Math.max(16, Math.min(idealTop, viewportHeight - actualHeight - 20));

    let arrowOffset = 0;
    if (arrowSide === 'top' || arrowSide === 'bottom') {
      arrowOffset = Math.max(24, Math.min(targetCenterX - clampedLeft, actualWidth - 24));
    } else {
      arrowOffset = Math.max(24, Math.min(targetCenterY - clampedTop, actualHeight - 24));
    }

    setTooltipStyle({
      position: 'fixed',
      left: `${clampedLeft}px`,
      top: `${clampedTop}px`,
      transform: 'none',
      width: `${actualWidth}px`,
      maxWidth: 'calc(100vw - 32px)',
      boxSizing: 'border-box',
      zIndex: 1000,
      opacity: 1,
      transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1), top 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.15s ease'
    });

    setArrowStyle({ position: arrowSide, offset: arrowOffset });
  }, [isActive, currentStep, targetRect, isMobileScreen]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[999] overflow-hidden select-none pointer-events-none">
      {/* ── Spotlight SVG Mask Overlay (NO BLUR) ── */}
      {currentStep >= 0 && currentStep < TOUR_STEPS.length && (
        <>
          <svg className="fixed inset-0 w-full h-full pointer-events-none z-[997]">
            <defs>
              <mask id="onboarding-spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                {targetRect && (
                  <motion.rect
                    initial={false}
                    animate={{
                      x: targetRect.left - 8,
                      y: targetRect.top - 8,
                      width: targetRect.width + 16,
                      height: targetRect.height + 16,
                    }}
                    rx={14}
                    ry={14}
                    fill="black"
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  />
                )}
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(15, 23, 42, 0.48)"
              mask="url(#onboarding-spotlight-mask)"
              className="pointer-events-auto cursor-default"
              onClick={handleSkipOrClose}
            />
          </svg>

          {/* Vibrant Glowing Ring around Target Element */}
          {targetRect && (
            <motion.div
              initial={false}
              animate={{
                left: targetRect.left - 8,
                top: targetRect.top - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="fixed pointer-events-none rounded-2xl border-2 border-brand-500 shadow-[0_0_0_2px_rgba(255,255,255,0.8),0_0_25px_rgba(37,99,235,0.7)] z-[998]"
            />
          )}
        </>
      )}

      <AnimatePresence mode="wait">
        {/* ── Welcome Modal ── */}
        {currentStep === -1 && (
          <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-[1000] p-4 pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_20px_50px_rgba(37,99,235,0.15)] max-w-md w-full overflow-hidden p-6 sm:p-8 text-center relative"
            >
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
                Unlock your potential and ace your exam. Let's take a quick guided tour pointing directly to each key feature!
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

        {/* ── MOBILE PHONE DEDICATED TOUR DRAWER (<768px) ── */}
        {isMobileScreen && currentStep >= 0 && currentStep < TOUR_STEPS.length && (
          <div className="fixed bottom-0 left-0 right-0 z-[1000] p-4 pb-6 pointer-events-auto flex flex-col items-center">
            {/* Target Location Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-brand-600 text-white font-extrabold text-[11px] uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg border border-white/40 flex items-center gap-1.5 mb-2.5 animate-bounce"
            >
              <Navigation className="w-3.5 h-3.5" /> Highlighting: {TOUR_STEPS[currentStep].targetName}
            </motion.div>

            {/* Mobile Bottom Action Sheet Card */}
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="w-full max-w-md bg-white rounded-[2rem] border border-slate-200/90 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] p-5 sm:p-6 flex flex-col gap-3.5 relative overflow-hidden"
            >
              {/* Drag Handle Bar */}
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto -mt-1 mb-1" />

              {/* Top Row: Step badge + close button */}
              <div className="flex justify-between items-center relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-600 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-brand-600" /> Step {currentStep + 1} of {TOUR_STEPS.length}
                </span>
                <button 
                  onClick={handleSkipOrClose}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Skip Tour"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content Text */}
              <div className="relative z-10">
                <h3 className="font-extrabold text-base text-slate-900 leading-snug mb-1">
                  {TOUR_STEPS[currentStep].title}
                </h3>
                <p className="text-slate-600 font-medium text-xs leading-relaxed">
                  {TOUR_STEPS[currentStep].content}
                </p>
              </div>

              {/* Footer Buttons & Progress Dots */}
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 mt-1 relative z-10">
                <div className="flex gap-1.5">
                  {TOUR_STEPS.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-5 bg-brand-600' : 'w-1.5 bg-slate-200'}`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBack}
                    className="px-3 py-1.5 rounded-xl font-bold text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <button
                    onClick={handleNext}
                    className="px-4 py-2 rounded-xl font-black text-xs text-white bg-brand-600 hover:bg-brand-700 transition-all shadow-md shadow-brand-500/20 cursor-pointer flex items-center gap-1"
                  >
                    {currentStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'} <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* ── DESKTOP TARGETED POPOVER CARD (>=768px) ── */}
        {!isMobileScreen && currentStep >= 0 && currentStep < TOUR_STEPS.length && (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={tooltipStyle}
            className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.25)] p-5 sm:p-6 flex flex-col gap-3.5 relative overflow-visible z-[1000] pointer-events-auto"
            ref={tooltipRef}
          >
            {targetRect && arrowStyle && (
              <div
                className={`absolute w-3.5 h-3.5 bg-white border-slate-300 rotate-45 shadow-sm z-30 ${
                  arrowStyle.position === 'top'
                    ? '-top-2 border-t border-l'
                    : arrowStyle.position === 'bottom'
                    ? '-bottom-2 border-b border-r'
                    : arrowStyle.position === 'left'
                    ? '-left-2 border-b border-l'
                    : '-right-2 border-t border-r'
                }`}
                style={
                  arrowStyle.position === 'top' || arrowStyle.position === 'bottom'
                    ? { left: `${arrowStyle.offset}px`, transform: 'translateX(-50%) rotate(45deg)' }
                    : { top: `${arrowStyle.offset}px`, transform: 'translateY(-50%) rotate(45deg)' }
                }
              />
            )}

            <div className="flex justify-between items-center relative z-10">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-600 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-brand-600" /> Step {currentStep + 1} of {TOUR_STEPS.length}
              </span>
              <button 
                onClick={handleSkipOrClose}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                title="Skip Tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative z-10">
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-snug mb-1">
                {TOUR_STEPS[currentStep].title}
              </h3>
              <p className="text-slate-600 font-medium text-xs sm:text-sm leading-relaxed">
                {TOUR_STEPS[currentStep].content}
              </p>
            </div>

            <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 mt-1 relative z-10">
              <div className="flex gap-1.5">
                {TOUR_STEPS.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-5 bg-brand-600' : 'w-1.5 bg-slate-200'}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleBack}
                  className="px-3 py-1.5 rounded-xl font-bold text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  onClick={handleNext}
                  className="px-4 py-2 rounded-xl font-black text-xs text-white bg-brand-600 hover:bg-brand-700 transition-all shadow-md shadow-brand-500/20 cursor-pointer flex items-center gap-1"
                >
                  {currentStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Congrats Celebration Modal ── */}
        {currentStep === TOUR_STEPS.length && (
          <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-[1000] p-4 pointer-events-auto">
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
                You've successfully explored all key sections of OdishaExamPrep. Access your exam portal, practice tests, and AI companion to start studying smart!
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
