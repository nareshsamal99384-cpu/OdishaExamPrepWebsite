import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrowserRouter, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  LayoutDashboard, 
  History, 
  Settings, 
  LogOut, 
  ChevronRight, 
  ChevronDown,
  Clock, 
  Target, 
  Award,
  Search,
  Filter,
  Lock,
  Play,
  CheckCircle2,
  AlertCircle,
  X,
  Menu,
  Star,
  Download,
  FileText,
  Layers,
  Dumbbell,
  BookMarked,
  Zap,
  HelpCircle,
  Mail,
  Phone,
  TrendingUp,
  ShieldCheck,
  User,
  BarChart3,
  Eye,
  EyeOff,
  Scale,
  Receipt,
  Sparkles,
  ArrowRight,
  RotateCw,
  Timer,
  Clock3
} from 'lucide-react';
import { useAuth } from './lib/AuthContext';
import { supabase } from './lib/supabase';
import { cn, getDirectImageUrl } from './lib/utils';
import { examService } from './lib/examService';
import { useScrollSpy } from './hooks/useScrollSpy';
import { scrollToElement, scrollToTop } from './lib/scrollManager';
import AnimatedRoutes from './components/AnimatedRoutes';
import { sectionReveal, sectionRevealSimple, sectionRevealScale, fadeSlideRight, scaleIn, barGrow, whileHover, whileTap, modalBackdrop, slideUpPanel, durations, easings } from './lib/animations';
import { ErrorBoundary } from './ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { activityTracker } from './lib/activityTracker';

const AdminPanel = React.lazy(() => import('./AdminPanel'));
const MockTestSystem = React.lazy(() => import('./MockTestSystem'));
const TestResultsView = React.lazy(() => import('./TestResultsView'));
const AnalyticsView = React.lazy(() => import('./AnalyticsView'));
const AdminLoginPage = React.lazy(() => import('./pages/AdminLoginPage'));
const AdminDashboardPage = React.lazy(() => import('./pages/AdminDashboardPage'));
const PrivacyPolicy = React.lazy(() => import('./PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./TermsOfService'));
const RefundPolicy = React.lazy(() => import('./RefundPolicy'));
const SearchableSelect = React.lazy(() => import('./components/SearchableSelect'));
const YouTubeCarousel = React.lazy(() => import('./components/YouTubeCarousel'));
const BlogList = React.lazy(() => import('./pages/BlogList'));
const BlogPost = React.lazy(() => import('./pages/BlogPost'));

const HistoryView = ({ user, onViewResults, onResumeTest }: { user: any, onViewResults?: (results: any) => void, onResumeTest?: (test: any, state: any) => void }) => {
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    const raw = activityTracker.getActivities(user?.id, user?.user_metadata);
    setActivities(raw);
  }, [user]);
  
  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <History className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">No History Yet</h2>
        <p className="text-slate-500 font-medium text-lg">Start taking mock tests and practice sessions to see your progress here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Your Activity History</h2>
      <div className="grid gap-4">
        {activities.map((a, i) => {
          const isTestResult = !!a.metadata && a.type !== 'question_bank_accessed';
          const isDownloadable = a.type === 'question_bank_accessed' && !!a.metadata?.pdfUrl;
          const isInteractive = isTestResult || isDownloadable || a.type === 'test_incomplete';

          return (
            <div 
              key={i} 
              onClick={() => {
                if (isDownloadable) {
                  window.open(a.metadata.pdfUrl, '_blank');
                } else if (a.type === 'test_incomplete' && onResumeTest) {
                  onResumeTest(a.metadata.test, a.metadata);
                } else if (isTestResult && onViewResults) {
                  onViewResults(a.metadata);
                }
              }}
              className={cn(
                "bg-white rounded-2xl p-6 border border-slate-200/50 flex items-center justify-between transition-all group",
                isInteractive ? "cursor-pointer hover:border-brand-500 hover:shadow-lg hover:shadow-brand-500/10" : ""
              )}
            >
              <div>
                 <div className="flex flex-wrap items-center gap-2 mb-1.5">
                   {a.metadata?.testCategory && (
                     <span className="inline-flex items-center px-2 py-0.5 bg-brand-50 text-brand-600 rounded text-[10px] font-black uppercase tracking-wider">
                       {a.metadata.testCategory}
                     </span>
                   )}
                   {a.metadata?.examName && (
                     <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
                       {a.metadata.examName}
                     </span>
                   )}
                   {a.type === 'test_incomplete' && (
                     <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-bold uppercase tracking-wider">
                       Incomplete
                     </span>
                   )}
                 </div>
                 <h4 className={cn("font-bold text-lg text-slate-900 transition-colors", isInteractive && "group-hover:text-brand-600")}>{a.title}</h4>
                 <p className="text-sm text-slate-500">{new Date(a.timestamp).toLocaleString()}</p>
                 {a.type === 'question_bank_accessed' && (
                    <div className="inline-flex items-center px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold mt-3 transition-colors group-hover:bg-blue-100">
                      <Download className="w-3.5 h-3.5 mr-1.5" /> 
                      {isDownloadable ? 'Download Again' : 'Downloaded Item'}
                    </div>
                 )}
              </div>
              
              <div className="flex items-center gap-6">
                 {a.type === 'test_incomplete' && (
                   <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black uppercase text-amber-600 mb-1">In Progress</span>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs font-bold">{Object.keys(a.metadata?.answers || {}).length} Answered</span>
                      </div>
                   </div>
                 )}
                 
                 {a.score !== undefined && (
                   <div className="text-right">
                      <span className="font-bold text-brand-600 text-xl">{a.score}/{a.totalMarks}</span>
                      <p className="text-xs font-semibold text-slate-400">{Math.round(a.accuracy || 0)}% Accuracy</p>
                   </div>
                 )}
                
                 {(isTestResult || a.type === 'test_incomplete') && (
                   <div className={cn(
                     "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                     a.type === 'test_incomplete' 
                        ? "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white" 
                        : "bg-brand-50 text-brand-600 group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white"
                   )}>
                     {a.type === 'test_incomplete' ? <Play className="w-4 h-4 ml-0.5" /> : <ChevronRight className="w-5 h-5 ml-0.5" />}
                   </div>
                 )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Razorpay Helper ---
const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// --- Components ---

export const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' }) => {
  const variants = {
    primary: 'premium-gradient text-white shadow-lg shadow-brand-500/20 hover:premium-glow hover:scale-[1.03] active:scale-95',
    secondary: 'glass text-brand-600 hover:bg-brand-50 border-brand-100 shadow-sm hover:scale-[1.02] active:scale-95',
    outline: 'bg-transparent border-2 border-slate-200 hover:border-brand-400 hover:text-brand-600 text-slate-700 active:scale-95',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 active:scale-95'
  };

  return (
    <button 
      className={cn(
        'px-6 py-3 rounded-2xl font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const Card = ({ children, className, ...props }: { children: React.ReactNode, className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('glass rounded-2xl premium-shadow hover:shadow-xl transition-all duration-500 overflow-hidden', className)} {...props}>
    {children}
  </div>
);

export const UserAvatar = ({ 
  user, 
  profile, 
  className, 
  size = 'md' 
}: { 
  user?: any, 
  profile?: any, 
  className?: string, 
  size?: 'sm' | 'md' | 'lg' | 'xl' 
}) => {
  const [imgError, setImgError] = React.useState(false);
  
  const photoURL = profile?.photoURL || user?.user_metadata?.avatar_url;
  const displayName = profile?.displayName || user?.user_metadata?.full_name || user?.email || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl'
  };

  const initialView = (
    <div className={cn(
      "rounded-xl flex items-center justify-center font-black text-white premium-gradient shadow-inner select-none",
      sizeClasses[size],
      className
    )}>
      <span className="drop-shadow-md">{initial}</span>
    </div>
  );

  if (!photoURL || imgError) {
    return initialView;
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-slate-200/50 bg-white shadow-sm", sizeClasses[size], className)}>
      <img 
        src={photoURL} 
        alt={displayName} 
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

const VisualEffects = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <div className="absolute top-1/4 left-1/4 w-1.5 h-1.5 bg-brand-400/20 rounded-full animate-float-slow" />
    <div className="absolute top-3/4 left-1/2 w-2 h-2 bg-indigo-400/20 rounded-full animate-float-delayed" />
    <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-purple-400/20 rounded-full animate-float-slow" style={{ animationDelay: '-4s' }} />
    <div className="absolute bottom-1/4 right-1/3 w-2.5 h-2.5 bg-brand-400/10 rounded-full animate-float-delayed" style={{ animationDelay: '-1s' }} />
    <div className="absolute inset-0 grid-bg opacity-[0.03]" />
  </div>
);

// --- Sections ---

const StatsSection = () => {
  const stats = [
    { label: 'Questions practiced', value: '50k+', icon: <BookOpen className="w-6 h-6 text-brand-300" /> },
    { label: 'Active Aspirants', value: '2k+', icon: <Target className="w-6 h-6 text-brand-300" /> },
    { label: 'Success rate', value: '94%', icon: <Award className="w-6 h-6 text-brand-300" /> }
  ];

  return (
    <section className="py-12 md:py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto rounded-[3rem] overflow-hidden relative" style={{background: 'linear-gradient(135deg, #120a2e 0%, #1a1040 50%, #120a2e 100%)', boxShadow: '0 40px 100px rgba(124,58,237,0.12), 0 20px 40px rgba(0,0,0,0.15)'}}>
        {/* Dot grid overlay */}
        <div className="absolute inset-0 dot-bg opacity-30" />
        {/* Animated glow orbs */}
        <div className="absolute -top-20 -right-20 sm:-top-40 sm:-right-40 w-64 h-64 sm:w-[500px] sm:h-[500px] rounded-full mix-blend-screen filter blur-[80px] sm:blur-[120px] animate-orb" style={{background: 'radial-gradient(circle, rgba(124,58,237,0.8) 0%, transparent 70%)'}} />
        <div className="absolute -bottom-20 -left-20 sm:-bottom-40 sm:-left-40 w-64 h-64 sm:w-[500px] sm:h-[500px] rounded-full mix-blend-screen filter blur-[80px] sm:blur-[120px] animate-orb" style={{background: 'radial-gradient(circle, rgba(99,102,241,0.7) 0%, transparent 70%)', animationDelay: '2.5s'}} />
        {/* Top shimmer line */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.6), rgba(99,102,241,0.8), rgba(167,139,250,0.6), transparent)'}} />
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-700/30 p-6 sm:p-12 md:p-16">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              {...sectionReveal}
              transition={{ ...sectionReveal.transition, delay: i * 0.18 }}
              className="flex flex-col items-center justify-center space-y-3 sm:space-y-4 py-8 md:py-0 px-2 sm:px-4 group cursor-default"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-400 shadow-xl" style={{background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', boxShadow: '0 4px 24px rgba(124,58,237,0.2), inset 0 1px 0 rgba(255,255,255,0.08)'}}>
                {stat.icon}
              </div>
              <div className="text-center space-y-1 sm:space-y-2">
                <div className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight flex items-baseline justify-center gap-1 group-hover:premium-text-gradient transition-all duration-300" style={{textShadow: '0 0 40px rgba(167,139,250,0.3)'}}>
                  {stat.value}
                </div>
                <div className="text-slate-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs md:text-sm">
                  {stat.label}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        {/* Bottom shimmer line */}
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)'}} />
      </div>
    </section>
  );
};

const HowItWorksSection = () => {
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  const steps = [
    { 
      step: '01',
      title: 'Choose Your Exam', 
      desc: 'Select your target exam (like OPSC or OSSC) and explore mock test series tailored perfectly to the syllabus.',
      details: 'Browse through our extensive catalog of Odisha state exams like OPSC, OSSC, OSSSC, Police Exams, and more. Each exam has a dedicated dashboard with tailored study material, ensuring you focus exactly on what\'s required for your target recruitment. You can switch between exams anytime to explore different opportunities.',
      icon: <LayoutDashboard className="w-8 h-8 text-brand-600" />
    },
    { 
      step: '02',
      title: 'Take A Mock Test', 
      desc: 'Practice with full-length exams, previous year questions (PYQs), or subject-wise mini quizzes to build your confidence.',
      details: 'Experience the real interface with our high-quality mock tests. Practice subject-wise to strengthen your fundamentals, or take full-length simulations with timers and negative marking to build the stamina and speed needed for the actual exam day. Our questions are updated regularly to match the latest OSSC/OPSC patterns.',
      icon: <Play className="w-8 h-8 text-brand-600" />
    },
    { 
      step: '03',
      title: 'Analyze & Improve', 
      desc: 'Review detailed step-by-step solutions and instant performance analytics to identify your weak spots immediately.',
      details: 'Don\'t just practice, improve! After every test, get a detailed scorecard with rank analysis. Review every question with expert step-by-step solutions and identify subject-wise weak areas. Use our "Practice Mode" to specifically target the topics where you scored low and perfect your strategy.',
      icon: <Target className="w-8 h-8 text-brand-600" />
    }
  ];

  return (
    <section id="how-it-works" className="py-24 space-y-16 scroll-mt-24">
      <div className="flex flex-col items-center space-y-5 text-center">
        <span className="section-chip">
          <Target className="w-3.5 h-3.5" />
          Smart Preparation Strategy
        </span>
        <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight">How It <span className="premium-text-gradient">Works</span></h2>
        <div className="section-divider" />
        <p className="text-slate-500 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
          Our structured 3-step approach is designed to take you from fundamentals to exam-ready in record time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-10 relative">
        {/* Connection Line (Desktop) — gradient */}
        <div className="hidden md:block absolute top-[50%] left-0 w-full h-[2px] -translate-y-1/2 z-0" style={{background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.2), rgba(99,102,241,0.3), rgba(124,58,237,0.2), transparent)'}} />
        
        {steps.map((step, i) => (
          <motion.div 
            key={i}
            {...sectionRevealSimple}
            transition={{ ...sectionRevealSimple.transition, delay: i * 0.2 }}
            className="relative z-10 group h-full rounded-[2.5rem]"
            onClick={() => setSelectedStep(i)}
          >
            <Card className="card-3d-deep soft-card p-6 md:p-10 h-full flex flex-col items-start cursor-pointer relative z-20 overflow-visible rounded-[2.5rem] border-white/20">
              <div className="flex justify-between items-start w-full mb-6 md:mb-8">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:premium-glow transition-all duration-500 feature-icon-wrap" style={{background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(99,102,241,0.08))', border: '1px solid rgba(124,58,237,0.15)', boxShadow: '0 4px 16px rgba(124,58,237,0.1)'}}>
                  {step.icon}
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-4xl md:text-5xl font-black text-slate-100 group-hover:text-brand-100 transition-colors duration-500 leading-none">
                    {step.step}
                  </span>
                  <div className="mt-2 w-6 md:w-8 h-1 bg-slate-100 group-hover:bg-brand-200 transition-colors rounded-full" />
                </div>
              </div>
              <div className="space-y-3 md:space-y-4 flex-1">
                <h3 className="text-xl md:text-3xl font-black text-slate-900 group-hover:text-brand-600 transition-colors duration-300 tracking-tight leading-tight">
                  {step.title}
                </h3>
                <p className="text-slate-500 font-bold leading-relaxed text-sm md:text-base line-clamp-3 md:line-clamp-none">
                  {step.desc}
                </p>
              </div>
              
              <div className="mt-6 md:mt-8 flex items-center gap-2 text-brand-600 font-black text-[10px] md:text-xs uppercase tracking-widest group-hover:gap-3 transition-all duration-300">
                Read Detailed Guide
                <ChevronRight className="w-4 h-4" />
              </div>
            </Card>

            {/* Connection Arrows (Desktop) */}
            {i < 2 && (
              <div className="hidden md:flex absolute top-1/2 -right-5 transform -translate-y-1/2 z-30 w-10 h-10 bg-white rounded-full border border-slate-100 items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300">
                <ChevronRight className="w-6 h-6 text-brand-400" />
              </div>
            )}
            {/* Mobile Connection Arrows */}
            {i < 2 && (
              <div className="flex md:hidden absolute -bottom-[2.5rem] left-1/2 -translate-x-1/2 z-20 w-10 h-10 bg-white rounded-full border border-slate-100 items-center justify-center shadow-md text-brand-400">
                <ChevronDown className="w-6 h-6" />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Simplified Professional Modal */}
      <AnimatePresence>
        {selectedStep !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-slate-900/60 transition-all duration-500">
            <motion.div {...modalBackdrop}
              className="absolute inset-0" 
              onClick={() => setSelectedStep(null)} 
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20, rotateX: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20, rotateX: -10 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
              className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.3)] overflow-hidden border border-white/20"
            >
              {/* Background Accent */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-[80px] -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -ml-32 -mb-32" />

              <div className="p-6 sm:p-12 relative z-10 flex flex-col items-center text-center space-y-6 sm:space-y-8">
                {/* Header Icon */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-brand-50 rounded-[1.75rem] sm:rounded-[2rem] flex items-center justify-center premium-glow shadow-xl shadow-brand-500/10">
                  <div className="scale-110 sm:scale-125">
                    {steps[selectedStep].icon}
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-center gap-3 mb-1 sm:mb-2">
                    <span className="text-[10px] sm:text-xs font-black text-brand-600 bg-brand-50 px-3 py-1 rounded-full uppercase tracking-widest border border-brand-100">Step {steps[selectedStep].step}</span>
                  </div>
                  <h3 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight px-2 sm:px-4.5">
                    {steps[selectedStep].title}
                  </h3>
                  <div className="w-12 sm:w-16 h-1 sm:h-1.5 premium-gradient rounded-full mx-auto" />
                </div>

                <p className="text-slate-600 text-sm sm:text-lg md:text-xl font-bold leading-relaxed px-1 sm:px-2">
                  {steps[selectedStep].details}
                </p>

                <div className="w-full pt-2 sm:pt-4">
                  <Button 
                    className="w-full py-4 sm:py-4.5 rounded-2xl text-sm sm:text-base font-black shadow-2xl shadow-brand-500/30"
                    onClick={() => {
                      setSelectedStep(null);
                      scrollToElement('exams', { block: 'start', delay: 50 });
                    }}
                  >
                    Got it, Proceed
                  </Button>
                </div>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => setSelectedStep(null)}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 sm:p-3 bg-slate-100/80 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-2xl transition-all shadow-sm z-50 cursor-pointer flex items-center justify-center group/close"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 group-hover/close:rotate-90 transition-transform duration-300" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

const ProductPreviewSection = () => {
  return (
    <section className="py-16 md:py-24 space-y-12 md:space-y-16 overflow-hidden px-4 sm:px-6">
      <div className="text-center space-y-3 sm:space-y-4">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Experience the Platform</h2>
        <p className="text-slate-500 text-base sm:text-lg font-medium max-w-xl mx-auto">
          Built with a focus on speed, clarity, and performance.
        </p>
      </div>
      
      <div className="relative max-w-6xl mx-auto">
        {/* Mock Dashboard UI */}
        <motion.div 
          {...sectionRevealScale}
          className="glass rounded-2xl md:rounded-3xl premium-shadow border-white/40 overflow-hidden h-[400px] sm:h-[500px] md:h-auto md:aspect-[21/9] relative"
        >
          <div className="absolute inset-0 bg-slate-50/50" />
          
          {/* Sidebar Mock */}
          <div className="absolute left-0 top-0 bottom-0 w-16 md:w-64 border-r border-slate-200/50 bg-white/80 hidden md:flex flex-col p-6 space-y-8 z-20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 premium-gradient rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/20">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-slate-800 tracking-tight">OdishaPrep</span>
            </div>
            <div className="space-y-2 mt-8">
              {[
                { icon: LayoutDashboard, label: 'Dashboard', active: true },
                { icon: BookOpen, label: 'Mock Tests', active: false },
                { icon: History, label: 'History', active: false },
                { icon: Settings, label: 'Settings', active: false }
              ].map((item, i) => (
                <div key={i} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-default", item.active ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-50")}>
                  <item.icon className="w-5 h-5" />
                  <span className="font-semibold text-sm">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Content Mock */}
          <div className="absolute left-0 md:left-64 right-0 top-0 bottom-0 p-4 sm:p-8 space-y-4 sm:space-y-8 flex flex-col z-10">
            <div className="flex justify-between items-center shrink-0">
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">Welcome back, Naresh!</h3>
                <p className="text-xs sm:text-sm font-medium text-slate-500 hidden sm:block">Here is your preparation summary for today.</p>
              </div>
              <div className="h-10 w-10 bg-brand-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden text-brand-700 font-black text-lg">
                N
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 shrink-0">
              <div className="bg-white rounded-xl sm:rounded-2xl premium-shadow border border-slate-100 p-4 sm:p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">Tests Taken</span>
                  <BookOpen className="w-4 h-4 text-brand-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">14</div>
              </div>
              <div className="bg-white rounded-xl sm:rounded-2xl premium-shadow border border-slate-100 p-4 sm:p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">Avg. Score</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900">82%</div>
              </div>
              <div className="bg-brand-500 rounded-2xl premium-shadow border border-brand-400 p-5 flex flex-col justify-between hidden md:flex text-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-brand-100 uppercase tracking-wider">Current Rank</span>
                  <History className="w-4 h-4 text-brand-200" />
                </div>
                <div className="text-3xl font-black">124<span className="text-lg text-brand-200">/2.5k</span></div>
              </div>
            </div>
            <div className="flex-1 bg-white/60 sm:bg-white rounded-2xl sm:rounded-3xl premium-shadow border border-slate-100/50 sm:border-slate-100 p-4 sm:p-6 relative overflow-hidden flex flex-col justify-end min-h-[100px]">
              <div className="absolute top-5 left-5 right-5 flex justify-between items-center">
                <h4 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">Performance History</h4>
                <div className="flex gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-500 mt-1" />
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase">Score Trend</span>
                </div>
              </div>
              {/* Mock Graph */}
              <div className="flex items-end gap-1.5 sm:gap-3 h-20 sm:h-32 w-full mt-auto relative z-10">
                {[40, 70, 45, 90, 65, 80, 55, 85, 60, 95].map((h, i) => (
                  <motion.div 
                    key={i}
                    {...barGrow(`${h}%`)}
                    className="flex-1 bg-gradient-to-t from-brand-500/10 to-brand-500/40 rounded-t-sm sm:rounded-t-lg border-t-2 border-brand-500 relative group cursor-pointer"
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded shadow-lg pointer-events-none z-20">
                      {h}%
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Test UI Overlay */}
          <motion.div 
            {...fadeSlideRight}
            viewport={{ once: true }}
            transition={{ ...fadeSlideRight.transition, delay: 0.5 }}
            className="absolute -right-20 top-16 w-[340px] bg-white/95 backdrop-blur-xl rounded-3xl premium-shadow border border-slate-200/60 p-6 space-y-5 hidden lg:block z-30"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Live Test</span>
              </div>
              <div className="text-sm font-black text-brand-600 bg-brand-50 px-2 py-1 rounded-lg">12:45</div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-800 leading-snug">
                1. Which of the following is the largest river in Odisha?
              </h4>
              <div className="space-y-2">
                {[
                  { label: 'A', text: 'Baitarani', active: false },
                  { label: 'B', text: 'Mahanadi', active: true },
                  { label: 'C', text: 'Subarnarekha', active: false },
                  { label: 'D', text: 'Rushikulya', active: false },
                ].map((opt, i) => (
                  <div key={i} className={cn("flex items-center gap-3 p-2.5 rounded-xl border transition-all text-sm font-semibold cursor-pointer", opt.active ? "bg-brand-50 border-brand-200 text-brand-700" : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50")}>
                    <div className={cn("w-6 h-6 rounded flex items-center justify-center text-xs font-black", opt.active ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500")}>
                      {opt.label}
                    </div>
                    {opt.text}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

const TestimonialsSection = () => {
  const reviews = [
    {
      name: 'Satyajit Behera',
      role: 'OPSC Aspirant',
      text: 'Daily practice kariba pare weak topic clear bujhi paruchi. Confidence increase heuchi.',
      avatar: 'https://picsum.photos/seed/satyajit/100/100',
      rating: 5
    },
    {
      name: 'Priyanka Nayak',
      role: 'SSC Candidate',
      text: 'Mock test real exam bhali laguchi. Time manage kariba easy hela.',
      avatar: 'https://picsum.photos/seed/priyanka/100/100',
      rating: 5
    },
    {
      name: 'Debasish Rout',
      role: 'OPSC Aspirant',
      text: 'Question bank re bhal variety achi. Repeat question kam.',
      avatar: 'https://picsum.photos/seed/debasish/100/100',
      rating: 5
    },
    {
      name: 'Ananya Mohanty',
      role: 'Banking Aspirant',
      text: 'Analysis part clear. Mu janiparuchi kaha re mistake karuchi.',
      avatar: 'https://picsum.photos/seed/ananya/100/100',
      rating: 5
    },
    {
      name: 'Rajesh Sahoo',
      role: 'SSC Aspirant',
      text: 'Regular use karile improvement dekha jauchi.',
      avatar: 'https://picsum.photos/seed/rajesh/100/100',
      rating: 5
    },
    {
      name: 'Subrat Dash',
      role: 'Railway Aspirant',
      text: 'Practice mode re speed improve hela.',
      avatar: 'https://picsum.photos/seed/subrat/100/100',
      rating: 5
    },
    {
      name: 'Pooja Das',
      role: 'OPSC Aspirant',
      text: 'Simple use kariba. Confuse nahi kare.',
      avatar: 'https://picsum.photos/seed/pooja/100/100',
      rating: 5
    },
    {
      name: 'Amit Nayak',
      role: 'SSC CGL Aspirant',
      text: 'Questions updated laguchi. Useful platform.',
      avatar: 'https://picsum.photos/seed/amit/100/100',
      rating: 5
    },
    {
      name: 'Sneha Pradhan',
      role: 'OPSC Aspirant',
      text: 'Daily practice re result miluchi.',
      avatar: 'https://picsum.photos/seed/sneha/100/100',
      rating: 5
    },
    {
      name: 'Rakesh Behera',
      role: 'Banking Aspirant',
      text: 'Mobile re smooth chaluchi.',
      avatar: 'https://picsum.photos/seed/rakesh/100/100',
      rating: 5
    },
    {
      name: 'Manas Pattnaik',
      role: 'OPSC Aspirant',
      text: 'Overall bhal. Practice section aro expand hela better.',
      avatar: 'https://picsum.photos/seed/manas/100/100',
      rating: 4
    },
    {
      name: 'Lipika Das',
      role: 'SSC Aspirant',
      text: 'Interface clean. Explanation aro detail hele bhal.',
      avatar: 'https://picsum.photos/seed/lipika/100/100',
      rating: 4
    },
    {
      name: 'Biswajit Mohanty',
      role: 'Railway Aspirant',
      text: 'Time-based test helpful. Kichi question tough laguchi.',
      avatar: 'https://picsum.photos/seed/biswajit/100/100',
      rating: 4
    },
    {
      name: 'Sasmita Sahoo',
      role: 'Banking Aspirant',
      text: 'Smooth chaluchi. Aro exam add hele bhal.',
      avatar: 'https://picsum.photos/seed/sasmita/100/100',
      rating: 4
    },
    {
      name: 'Chinmay Rout',
      role: 'SSC Candidate',
      text: 'Good for practice. Regular update hele aro bhal.',
      avatar: 'https://picsum.photos/seed/chinmay/100/100',
      rating: 4
    }
  ];

  // ── Carousel config ────────────────────────────────────────────────────────
  const CARD_WIDTH     = 320;   // px
  const CARD_GAP       = 24;    // px
  const ITEM_STEP      = CARD_WIDTH + CARD_GAP;
  const AUTO_SPEED     = 0.45;  // px per frame (~27px/s at 60fps)
  const RESUME_DELAY   = 2000;  // ms after last interaction before auto-scroll resumes

  // Triple the list for seamless infinite loop
  const items      = [...reviews, ...reviews, ...reviews];
  const totalWidth = items.length * ITEM_STEP;

  // ── Refs ───────────────────────────────────────────────────────────────────
  const trackRef        = useRef<HTMLDivElement>(null);
  const offsetRef       = useRef(0);
  const rafRef          = useRef<number>(0);
  const isPaused        = useRef(false);
  const resumeTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging      = useRef(false);
  const dragStartX      = useRef(0);
  const dragStartOffset = useRef(0);

  // ── Apply offset (wraps for infinite loop) ────────────────────────────────
  const applyOffset = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const loopLen = totalWidth / 3;
    offsetRef.current = ((offsetRef.current % loopLen) + loopLen) % loopLen;
    track.style.transform = `translateX(-${offsetRef.current}px)`;
  }, [totalWidth]);

  // ── RAF auto-scroll tick ──────────────────────────────────────────────────
  const tick = useCallback(() => {
    if (!isPaused.current && !isDragging.current) {
      offsetRef.current += AUTO_SPEED;
      applyOffset();
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [applyOffset]);

  useEffect(() => {
    offsetRef.current = totalWidth / 3; // start at middle copy
    applyOffset();
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick, applyOffset, totalWidth]);

  // ── Pause / resume helpers ────────────────────────────────────────────────
  const pauseAuto = useCallback(() => {
    isPaused.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  const scheduleResume = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => { isPaused.current = false; }, RESUME_DELAY);
  }, []);

  // ── Mouse drag ────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current    = true;
    dragStartX.current    = e.clientX;
    dragStartOffset.current = offsetRef.current;
    pauseAuto();
    e.preventDefault();
  }, [pauseAuto]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    offsetRef.current = dragStartOffset.current + (dragStartX.current - e.clientX);
    applyOffset();
  }, [applyOffset]);

  const onMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    scheduleResume();
  }, [scheduleResume]);

  // ── Touch drag ────────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current      = true;
    dragStartX.current      = e.touches[0].clientX;
    dragStartOffset.current = offsetRef.current;
    pauseAuto();
  }, [pauseAuto]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current) return;
    offsetRef.current = dragStartOffset.current + (dragStartX.current - e.touches[0].clientX);
    applyOffset();
    e.preventDefault(); // prevent page scroll while swiping
  }, [applyOffset]);

  const onTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    scheduleResume();
  }, [scheduleResume]);

  // Attach window-level listeners so drag continues even if pointer leaves the track
  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend',  onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend',  onTouchEnd);
    };
  }, [onMouseMove, onMouseUp, onTouchMove, onTouchEnd]);

  return (
    <section id="testimonials" className="py-24 scroll-mt-24 overflow-hidden space-y-16">
      {/* ── Heading ── */}
      <div className="flex flex-col items-center space-y-5 text-center px-6">
        <div
          className="flex items-center gap-2 font-bold animate-bounce-subtle px-4 sm:px-5 py-2 rounded-full border shadow-sm"
          style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.25)', color: '#d97706' }}
        >
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span className="text-xs sm:text-sm tracking-tight">4.8 average rating from 2k+ aspirants</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Trusted by <span className="premium-text-gradient">Aspirants</span>
        </h2>
        <div className="section-divider" />
        <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto">
          Hear from students who are actually using OdishaExamPrep to crack their dream exams.
        </p>
      </div>

      {/* ── Infinite drag/swipe carousel ── */}
      <div className="relative select-none">
        {/* Left edge fade */}
        <div
          className="absolute left-0 top-0 bottom-4 w-12 sm:w-24 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, #f4f0ff 0%, transparent 100%)' }}
        />
        {/* Right edge fade */}
        <div
          className="absolute right-0 top-0 bottom-4 w-12 sm:w-24 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, #f4f0ff 0%, transparent 100%)' }}
        />

        {/* Draggable viewport */}
        <div
          className="overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onMouseEnter={pauseAuto}
          onMouseLeave={scheduleResume}
        >
          {/* Track — translated by JS, not CSS animation */}
          <div
            ref={trackRef}
            className="flex pb-4 will-change-transform"
            style={{ gap: CARD_GAP, paddingLeft: 24, width: `${totalWidth}px` }}
          >
            {items.map((review, idx) => (
              <div
                key={`${review.name}-${idx}`}
                className="shrink-0"
                style={{ width: CARD_WIDTH }}
              >
                <div
                  className="glass-card p-6 sm:p-7 h-full flex flex-col justify-between space-y-5 text-left shimmer-border transition-shadow duration-300 hover:shadow-xl hover:shadow-brand-500/10"
                  style={{ borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.9)' }}
                >
                  {/* Stars + Quote */}
                  <div className="space-y-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={cn(
                            'w-4 h-4',
                            star <= review.rating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-200 fill-slate-200'
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-slate-700 font-medium leading-relaxed italic text-sm sm:text-[15px]">
                      {review.text}
                    </p>
                  </div>

                  {/* Author row */}
                  <div
                    className="flex items-center gap-3 pt-4"
                    style={{ borderTop: '1px solid rgba(124,58,237,0.1)' }}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={review.avatar}
                        alt={review.name}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        draggable={false}
                        className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm leading-tight">{review.name}</h4>
                      <p className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{ color: '#7c3aed' }}>
                        {review.role}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Swipe hint — mobile only */}
        <p className="sm:hidden text-center text-[11px] font-bold text-slate-400 tracking-wide mt-3 pointer-events-none select-none">
          ← Swipe to explore more →
        </p>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer id="contact" className="bg-slate-950 text-slate-300 py-16 md:py-24 mt-20 relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#25D366]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 sm:gap-16 relative z-10">
        <div className="col-span-1 md:col-span-2 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 premium-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-white/5">
              <BookOpen className="text-white w-7 h-7" />
            </div>
            <span className="font-extrabold text-3xl tracking-tighter text-white">OdishaExamPrep</span>
          </div>
          <p className="text-slate-400 font-medium leading-relaxed max-w-md text-base sm:text-lg">
            Empowering aspirants with high-quality mock tests and real-time analytics to master competitive exams confidently.
          </p>
        </div>
        
        <div className="space-y-6">
          <h4 className="text-white font-black tracking-widest uppercase text-sm">Platform</h4>
          <ul className="space-y-4 font-semibold text-slate-400">
            <li><Link to="/blog" className="hover:text-brand-400 transition-colors duration-300 flex items-center gap-2 group"><BookOpen className="w-4 h-4 text-slate-600 group-hover:text-brand-500 transition-colors" /> Official Blog</Link></li>
            <li><Link to="/privacy-policy" className="hover:text-brand-400 transition-colors duration-300 flex items-center gap-2 group"><ShieldCheck className="w-4 h-4 text-slate-600 group-hover:text-brand-500 transition-colors" /> Privacy Policy</Link></li>
            <li><Link to="/terms-of-service" className="hover:text-brand-400 transition-colors duration-300 flex items-center gap-2 group"><Scale className="w-4 h-4 text-slate-600 group-hover:text-brand-500 transition-colors" /> Terms of Service</Link></li>
            <li><Link to="/refund-policy" className="hover:text-brand-400 transition-colors duration-300 flex items-center gap-2 group"><Receipt className="w-4 h-4 text-slate-600 group-hover:text-brand-500 transition-colors" /> Refund Policy</Link></li>
          </ul>
        </div>

        <div className="space-y-6">
          <h4 className="text-white font-black tracking-widest uppercase text-sm">Contact Us</h4>
          <ul className="space-y-4 font-medium text-slate-400">
            <li>
              <a href="https://mail.google.com/mail/?view=cm&fs=1&to=odishaexamprep365@gmail.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                 <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-brand-500/50 group-hover:bg-brand-500/10 transition-colors"><Mail className="w-4 h-4 text-slate-300 group-hover:text-brand-400 transition-colors" /></div>
                 <span className="break-all text-sm sm:text-base group-hover:text-white transition-colors">odishaexamprep365@gmail.com</span>
              </a>
            </li>
            <li>
              <a href="tel:+917377431715" className="flex items-center gap-3 group">
                 <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-[#25D366]/50 group-hover:bg-[#25D366]/10 transition-colors"><Phone className="w-4 h-4 text-slate-300 group-hover:text-[#25D366] transition-colors" /></div>
                 <span className="text-sm sm:text-base group-hover:text-white transition-colors">+91 7377431715</span>
              </a>
            </li>
            <li className="flex gap-4 pt-4">
              <a href="https://www.youtube.com/@OdishaExamPrep365" target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-[#FF0000] hover:border-[#FF0000] hover:-translate-y-1 transition-all text-slate-400 hover:text-white shadow-lg">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a href="https://wa.me/917377431715" target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-[#25D366] hover:border-[#25D366] hover:-translate-y-1 transition-all text-slate-400 hover:text-white shadow-lg">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M12.031 0C5.385 0 0 5.385 0 12.029a12.022 12.022 0 001.6 6.02L0 24l6.15-1.611a12.012 12.012 0 005.881 1.523h.004c6.645 0 12.03-5.386 12.03-12.031S18.675 0 12.031 0zm0 21.936a9.988 9.988 0 01-5.086-1.385l-.364-.216-3.774.99.998-3.682-.236-.376A9.957 9.957 0 012.064 12.03c0-5.497 4.475-9.972 9.972-9.972 5.497 0 9.97 4.475 9.97 9.972s-4.473 9.97-9.97 9.97z"/>
                  <path d="M17.481 14.159c-.297-.149-1.758-.868-2.03-.968-.27-.099-.467-.149-.665.149-.198.298-.767.967-.94 1.165-.173.198-.346.223-.644.074a8.214 8.214 0 01-4.041-2.518c-.282-.326.319-.314.901-1.479.098-.198.05-.371-.025-.52-.075-.149-.665-1.605-.91-2.196-.241-.578-.485-.5-.665-.509-.174-.01-.371-.01-.57-.01-.198 0-.52.074-.792.371C6.822 7.027 6 7.82 6 9.381c0 1.56 1.015 3.07 1.164 3.268.149.198 2.228 3.4 5.397 4.76 2.656 1.139 3.554 1.259 4.314 1.05.76-.208 2.03-.896 2.316-1.761.286-.865.286-1.605.2-1.76-.086-.15-.286-.24-.584-.388z"/>
                </svg>
              </a>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-6 mt-16 md:mt-24">
        <div className="pt-8 border-t border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <p className="text-xs sm:text-sm font-bold tracking-widest text-slate-500 uppercase">
            © 2026 OdishaExamPrep. All rights reserved.
          </p>
          <div className="flex justify-center md:justify-start gap-6 text-slate-600 text-sm font-semibold">
            <span>Made with 🤍 in Odisha</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

const Navbar = ({ 
  user, 
  isAdmin, 
  onSignIn, 
  onShowAdmin,
  onHomeClick
}: { 
  user: any, 
  isAdmin: boolean, 
  onSignIn?: () => void, 
  onShowAdmin?: () => void,
  onHomeClick?: () => void
}) => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const scrolled = useScrollSpy(20);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    
    if (window.location.pathname !== '/') {
      window.location.assign('/#' + id);
      return;
    }
    
    scrollToElement(id, { block: 'start' });
  };

  const defaultMessage = "Hello! I am reaching out from the OdishaExamPrep website. I have a query.";
  const userMessage = user?.email ? `Hello! I am ${user.email} reaching out from the OdishaExamPrep website. I have a query.` : defaultMessage;
  const supportUrl = `https://wa.me/917377431715?text=${encodeURIComponent(userMessage)}`;

  return (
    <header className={cn("sticky top-0 z-[60] w-full transition-all duration-500", scrolled ? "navbar-scrolled" : "navbar-glass")}>
      <div className="max-w-7xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 group cursor-pointer" onClick={onHomeClick || (() => navigate('/'))}>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:rotate-6 group-hover:scale-110 transition-all duration-300 premium-gradient premium-glow-sm">
            <BookOpen className="text-white w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <span className="font-black text-xl sm:text-2xl tracking-tight text-slate-900 group-hover:text-brand-600 transition-colors duration-300">
            Odisha<span className="premium-text-gradient">Exam</span>Prep
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6">
          <div className="flex items-center bg-slate-50 border border-slate-100 rounded-full p-1 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
            {!user && (
              <>
                 <a href="#exams" onClick={(e) => scrollToSection(e, 'exams')} className="flex items-center gap-2 text-[14px] font-bold text-slate-600 hover:text-brand-600 px-4 py-1.5 rounded-full hover:bg-white hover:shadow-sm transition-all duration-300">
                   <Target className="w-4 h-4" />
                   <span>Exams</span>
                 </a>
                 <div className="w-px h-4 bg-slate-200 mx-1"></div>
                 <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="flex items-center gap-2 text-[14px] font-bold text-slate-600 hover:text-brand-600 px-4 py-1.5 rounded-full hover:bg-white hover:shadow-sm transition-all duration-300">
                   <Zap className="w-4 h-4" />
                   <span>How it Works</span>
                 </a>
                 <div className="w-px h-4 bg-slate-200 mx-1"></div>
                 <a href="#testimonials" onClick={(e) => scrollToSection(e, 'testimonials')} className="flex items-center gap-2 text-[14px] font-bold text-slate-600 hover:text-brand-600 px-4 py-1.5 rounded-full hover:bg-white hover:shadow-sm transition-all duration-300">
                   <Star className="w-4 h-4" />
                   <span>Testimonials</span>
                 </a>
                 <div className="w-px h-4 bg-slate-200 mx-1"></div>
              </>
            )}
             <Link to="/blog" className="flex items-center gap-2 text-[14px] font-bold text-slate-600 hover:text-brand-600 px-4 py-1.5 rounded-full hover:bg-white hover:shadow-sm transition-all duration-300">
               <FileText className="w-4 h-4" />
               <span>Blog</span>
             </Link>
            {user && (
              <>
                 <div className="w-px h-4 bg-slate-200 mx-1"></div>
                 <a href={supportUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[14px] font-bold text-slate-600 hover:text-brand-600 px-4 py-1.5 rounded-full hover:bg-white hover:shadow-sm transition-all duration-300">
                   <HelpCircle className="w-4 h-4" />
                   <span>Support</span>
                 </a>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
            {user ? (
               <div className="relative">
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-slate-200"
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  >
                    <UserAvatar profile={profile} user={user} className="w-9 h-9" />
                    <div className="hidden sm:block text-left">
                      <p className="text-xs font-black text-slate-700 leading-none mb-0.5">{profile?.displayName || user?.email?.split('@')[0]}</p>
                      <p className="text-[10px] font-bold text-slate-400 leading-none">{user?.email}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
                  </div>

                  <AnimatePresence>
                    {showProfileDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[100]"
                      >
                         <div className="p-2">
                           {isAdmin && (
                             <Link to="/admin" onClick={() => setShowProfileDropdown(false)} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors">
                               <Settings className="w-4 h-4" />
                               Admin Panel
                             </Link>
                           )}
                           <button 
                             onClick={async () => {
                               setShowProfileDropdown(false);
                               await logout();
                               navigate('/');
                             }}
                             className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                           >
                             <LogOut className="w-4 h-4" />
                             Sign Out
                           </button>
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>
            ) : (
              onSignIn && (
                <Button variant="primary" className="px-8 py-2.5 rounded-2xl text-sm font-bold shadow-lg shadow-brand-500/20" onClick={onSignIn}>
                  Sign In
                </Button>
              )
            )}
          </div>
        </nav>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center gap-3">
          {!user && onSignIn && (
            <Button variant="primary" size="sm" className="px-5 rounded-xl text-xs font-bold" onClick={onSignIn}>
              Sign In
            </Button>
          )}
          <button 
            className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 bg-white/95 backdrop-blur-3xl border-b border-slate-200/40 shadow-2xl overflow-y-auto md:hidden max-h-[calc(100vh-70px)]"
          >
            <div className="p-4 flex flex-col gap-2">
              {!user && (
                <>
                  <a href="#exams" onClick={(e) => scrollToSection(e, 'exams')} className="flex items-center gap-4 text-lg font-bold text-slate-700 p-4 hover:bg-emerald-50 hover:text-emerald-600 rounded-2xl transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                       <Target className="w-5 h-5" />
                    </div>
                    Exams
                  </a>
                  <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="flex items-center gap-4 text-lg font-bold text-slate-700 p-4 hover:bg-amber-50 hover:text-amber-600 rounded-2xl transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                       <Zap className="w-5 h-5" />
                    </div>
                    How it Works
                  </a>
                  <a href="#testimonials" onClick={(e) => scrollToSection(e, 'testimonials')} className="flex items-center gap-4 text-lg font-bold text-slate-700 p-4 hover:bg-purple-50 hover:text-purple-600 rounded-2xl transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                       <Star className="w-5 h-5" />
                    </div>
                    Testimonials
                  </a>
                </>
              )}
              <Link 
                to="/blog"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-4 text-lg font-bold text-slate-700 p-4 hover:bg-brand-50 hover:text-brand-600 rounded-2xl transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
                   <FileText className="w-5 h-5" />
                </div>
                Latest Updates & Blog
              </Link>
              {user && (
                <a 
                  href={supportUrl}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 text-lg font-bold text-slate-700 p-4 hover:bg-blue-50 hover:text-blue-600 rounded-2xl transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                     <HelpCircle className="w-5 h-5" />
                  </div>
                  Help & Support
                </a>
              )}
              {!user && onSignIn && (
                <div className="pt-4 px-2 pb-2">
                  <Button variant="primary" className="w-full py-4 rounded-2xl font-bold" onClick={() => { onSignIn(); setMobileMenuOpen(false); }}>
                    Sign In
                  </Button>
                </div>
              )}
              {user && (
                <>
                  <div className="p-2 border-t border-slate-100 mt-2">
                    <div className="flex items-center gap-3 mb-4">
                      <UserAvatar profile={profile} user={user} className="w-10 h-10" />
                      <div>
                        <p className="text-sm font-black text-slate-700 truncate">{profile?.displayName || user?.email?.split('@')[0]}</p>
                        <p className="text-xs font-bold text-slate-400 truncate">{user?.email}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 text-lg font-medium text-slate-900 p-4 hover:bg-brand-50 rounded-2xl transition-colors w-full">
                        <Settings className="w-5 h-5 text-slate-400" /> Admin Panel
                      </Link>
                    )}
                    <button 
                      onClick={async () => {
                        setMobileMenuOpen(false);
                        await logout();
                        navigate('/');
                      }} 
                      className="flex items-center gap-3 text-lg font-medium text-rose-600 p-4 hover:bg-rose-50 rounded-2xl transition-colors w-full text-left"
                    >
                      <LogOut className="w-5 h-5" /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

// --- Pages ---

const LandingPage = () => {
  const { loading, user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showGuideToast, setShowGuideToast] = useState(false);
  const [announcements, setAnnouncements] = useState<string[]>([
    `🚀 New Mock Test Series released for OSSC CGL ${new Date().getFullYear()}`,
    "📅 OPSC Prelims exam dates announced - Check latest schedule",
    "⭐ 500+ New PYQs added for OSSSC recruitment exams",
    "🔥 Weekly Current Affairs PDF now available for download",
    "✅ Real-time rank analysis enabled for all premium mock tests"
  ]);

  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        const exams = await examService.getAllExams();
        const newsSettings = exams.find(e => e.name === 'SYSTEM_SETTINGS_NEWS_TICKER');
        if (newsSettings && newsSettings.description) {
          const parsed = JSON.parse(newsSettings.description);
          if (parsed.updates && parsed.updates.length > 0) {
            setAnnouncements(parsed.updates);
          }
        }
      } catch(e) {}
    };
    fetchUpdates();
  }, []);

  useEffect(() => {
    document.title = 'OdishaExamPrep - Best Mock Tests for OPSC, OSSC & OSSSC';
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', 'OdishaExamPrep is Odisha\'s leading platform for competitive exam preparation. Practice with topic-wise quizzes, full-length mock tests, and previous year questions for OPSC, OSSC, OSSSC, and Police exams.');
  }, []);
  
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
      setShowAuthModal(false);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setShowAuthModal(false);
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data?.user && !data?.session) {
            alert('Account already exists or requires email verification. Please check your inbox or try logging in!');
            setAuthMode('login');
            return;
        }
        setShowAuthModal(false);
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Top Professional Announcement Bar */}
      <div className="ticker-bar relative z-50">
        <div className="max-w-7xl mx-auto flex items-center h-10 px-4">
          <div className="flex items-center gap-2 px-3 h-full bg-brand-500/10 border-x border-white/10 shrink-0">
            <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
            <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest leading-none">Exam Updates</span>
          </div>
          
          <div className="flex-1 overflow-hidden relative h-full flex items-center">
            <div className="flex items-center gap-12 animate-marquee-lr whitespace-nowrap px-6">
              {announcements.map((text, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-tight">
                  <span className="text-brand-500">•</span>
                  {text}
                </div>
              ))}
              {/* Duplicate the EXACT same list to create a seamless infinite loop with marquee-lr (-50% to 0) */}
              {announcements.map((text, i) => (
                <div key={`dup-${i}`} className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-tight">
                  <span className="text-brand-500">•</span>
                  {text}
                </div>
              ))}
            </div>
            
            {/* Edge Gradients for smooth fade */}
            <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-slate-900 to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-900 to-transparent z-10" />
          </div>
        </div>
      </div>

      <Navbar user={user} isAdmin={false} onSignIn={() => setShowAuthModal(true)} />

      <main className="flex-1" style={{background: 'linear-gradient(160deg, #f5f0ff 0%, #faf7ff 40%, #f0f4ff 100%)'}}>
        {/* Elite Split-Layout Hero Section */}
        <section className="relative overflow-hidden pt-6 pb-16 lg:pt-10 lg:pb-32">
          {/* Animated Mesh + Grid Background */}
          <div className="absolute inset-0 -z-10 mesh-bg" />
          <div className="absolute inset-0 -z-10 grid-bg opacity-60" />
          {/* Glowing Orbs */}
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full -z-10 animate-orb" style={{background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)', filter: 'blur(40px)'}} />
          <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] rounded-full -z-10 animate-orb" style={{background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)', filter: 'blur(50px)', animationDelay: '2.5s'}} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full -z-10 opacity-30" style={{background: 'radial-gradient(ellipse, rgba(167,139,250,0.12) 0%, transparent 65%)', filter: 'blur(60px)'}} />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
              {/* Specialized Content Column */}
              <motion.div 
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex-1 text-center lg:text-left space-y-8 lg:space-y-10"
              >
                <div className="space-y-6">
                  {/* Premium Badge */}
                  <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 mb-2">
                    <div className="flex -space-x-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-brand-600 shadow-sm">
                          {i === 1 ? <Target className="w-4 h-4" /> : i === 2 ? <Award className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                        </div>
                      ))}
                    </div>
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Trusted by 10K+ Aspirants</span>
                  </div>

                  <h1 className="text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-black text-slate-950 tracking-tight leading-[1.1] sm:leading-[1.05]">
                    Excellence in <br className="hidden sm:block" /> 
                    <span className="premium-text-gradient">Odisha Exams</span>
                  </h1>
                  <p className="text-slate-600 text-base sm:text-lg md:text-xl max-w-2xl mx-auto lg:mx-0 font-medium leading-relaxed">
                    Master the OPSC, OSSC, and OSSSC syllabus with precision-crafted test series, verified PYQs, and real-time performance analytics. Your journey to success starts here.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center lg:justify-start pt-2">
                  <Button 
                    className="h-14 sm:h-16 px-8 sm:px-12 text-lg sm:text-xl rounded-2xl shadow-2xl shadow-brand-500/30 group relative overflow-hidden" 
                    onClick={() => {
                      setShowGuideToast(true);
                      setTimeout(() => setShowGuideToast(false), 6000);
                      scrollToElement('exams');
                    }}
                  >
                    <span className="relative z-10">Start Free Practice</span>
                    <div className="absolute inset-0 bg-white/20 translate-y-20 group-hover:translate-y-0 transition-transform" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-14 sm:h-16 px-8 sm:px-12 text-lg sm:text-xl rounded-2xl border-slate-200 bg-white hover:bg-slate-50 transition-all font-bold"
                    onClick={() => {
                      setShowGuideToast(true);
                      setTimeout(() => setShowGuideToast(false), 6000);
                      const target = document.getElementById('test-series') || document.getElementById('exams');
                      if (target) scrollToElement(target);
                    }}
                  >
                    View Test Series
                  </Button>
                </div>

                {/* Localized Exam Categories */}
                <div className="pt-6 sm:pt-10 space-y-4">
                  <p className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] lg:text-left">Focused Preparation For:</p>
                  <div className="flex flex-wrap justify-center lg:justify-start gap-2 sm:gap-3">
                    {['OPSC CGL', 'OSSC LSI', 'OSSSC RI/ARI', 'Police SI', 'Forest Guard'].map((exam) => (
                      <span key={exam} className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs sm:text-sm font-bold text-slate-700 hover:bg-brand-50 hover:border-brand-100 transition-colors cursor-default whitespace-nowrap">
                        {exam}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Advanced Visual Column */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="flex-1 relative w-full lg:max-w-[540px]"
              >
                <div className="relative p-6 sm:p-12">
                  {/* Glowing Aura */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-brand-100/40 rounded-full blur-[100px] -z-10 animate-pulse" />
                  
                  {/* Floating Performance Indicator - Adjusted for Mobile Visibility */}
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 6, repeat: Infinity }}
                    className="absolute -left-2 sm:-left-8 top-1/4 glass-card p-3 sm:p-5 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl z-20 flex items-center gap-3 sm:gap-4 scale-90 sm:scale-100"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 feature-icon-wrap" style={{background: 'linear-gradient(135deg, #10b981, #059669)'}}>
                      <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white relative z-10" />
                    </div>
                    <div className="pr-2">
                      <p className="text-xs sm:text-sm font-black text-slate-900">Score Tracker</p>
                      <p className="text-[10px] sm:text-xs font-bold text-emerald-600">↑ Ranked #24</p>
                    </div>
                  </motion.div>

                  <motion.div 
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 7, repeat: Infinity, delay: 1 }}
                    className="absolute -right-2 sm:-right-8 bottom-1/4 glass-card p-3 sm:p-5 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl z-20 flex items-center gap-3 sm:gap-4 scale-90 sm:scale-100"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30 feature-icon-wrap premium-gradient">
                      <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white relative z-10" />
                    </div>
                    <div className="pr-2">
                      <p className="text-xs sm:text-sm font-black text-slate-900">Verified PYQs</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] sm:text-xs font-bold text-brand-600">✓ Updated {new Date().getFullYear()}</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* High-End Portrait Framing — Softened Edges */}
                  <div className="relative z-10 rounded-[4rem] sm:rounded-[5rem] overflow-hidden bg-white/60 p-4 sm:p-6 depth-shadow transform lg:-rotate-2 hover:rotate-0 hover:scale-[1.01] transition-all duration-1000" style={{backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.6)'}}>
                    <img 
                      src="/student.webp" 
                      alt="Odisha Exam Aspirant" 
                      className="w-full h-auto object-cover rounded-[3rem] sm:rounded-[4rem] shadow-inner" 
                    />
                  </div>

                  {/* Small Floating Elements */}
                  <div className="absolute top-10 right-20 w-16 h-16 bg-amber-400 rounded-full blur-2xl opacity-20 animate-pulse" />
                  <div className="absolute bottom-10 left-20 w-20 h-20 bg-brand-400 rounded-full blur-3xl opacity-20" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-16 md:space-y-20">

        <section id="exams" className="space-y-10 pb-20 scroll-mt-24">
          <div className="flex flex-col items-center space-y-4 text-center">
            <span className="section-chip">
              <Zap className="w-3.5 h-3.5" />
              Your Exam Gateway
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">Explore <span className="premium-text-gradient">Exams</span></h2>
            <div className="section-divider" />
          </div>
          <DashboardContent isGuest={!user} onSignIn={() => setShowAuthModal(true)} />
        </section>

        <StatsSection />
        <HowItWorksSection />
        <ProductPreviewSection />
        <TestimonialsSection />
        </div>
      </main>


      <Footer />

      <AnimatePresence>
        {showGuideToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-md px-4 pointer-events-none"
          >
            <div className="bg-white/80 border border-white/60 p-5 sm:p-6 rounded-[1.5rem] shadow-[0_12px_40px_-10px_rgba(0,0,0,0.08)] backdrop-blur-3xl saturate-150 pointer-events-auto relative overflow-hidden group flex items-start gap-4 sm:gap-5">
              <div className="absolute top-0 right-0 p-16 bg-brand-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
              <div className="absolute bottom-0 left-0 p-16 bg-brand-500/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none" />
              
              <div className="w-12 h-12 sm:w-14 sm:h-14 premium-gradient rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/20 group-hover:scale-110 transition-transform relative z-10">
                <HelpCircle className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              
              <div className="space-y-1.5 pr-8 relative z-10">
                <h4 className="font-extrabold text-[15px] sm:text-lg tracking-tight text-slate-900 flex items-center gap-2">
                  How to Practice for Free?
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
                  </span>
                </h4>
                <p className="text-slate-600 text-xs sm:text-[15px] font-medium leading-relaxed">
                  To access free tests, scroll down to the <span className="text-brand-600 font-extrabold bg-brand-50 px-1.5 py-0.5 rounded-md">Explore Exams</span> section and select your target exam.
                </p>
              </div>

              <button 
                onClick={() => setShowGuideToast(false)} 
                className="absolute top-4 right-4 p-2 bg-slate-100/60 hover:bg-slate-200 rounded-full transition-all text-slate-400 hover:text-slate-600 z-10 backdrop-blur-sm shadow-sm"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 bg-slate-950/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-md">
            <motion.div {...slideUpPanel}
              className="glass rounded-t-[2rem] sm:rounded-3xl w-full max-w-md p-6 sm:p-10 pb-10 sm:pb-10 space-y-6 sm:space-y-8 shadow-2xl border-x-0 border-b-0 sm:border border-white/40 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-center sticky top-0 bg-white/0 z-10">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {authMode === 'login' ? 'Welcome Back' : 'Join OdishaExamPrep'}
                </h3>
                <button onClick={() => setShowAuthModal(false)} className="p-2 -mr-2 bg-slate-100/50 hover:bg-slate-200/50 rounded-full transition-colors backdrop-blur-md">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

               <form onSubmit={handleEmailAuth} className="space-y-5">
                <div className="space-y-4">
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200/60 bg-white/50 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium text-base" 
                  />
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200/60 bg-white/50 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium text-base pr-12" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-base sm:text-lg">
                  {authMode === 'login' ? 'Sign In' : 'Create Account'}
                </Button>
              </form>

              <p className="text-center text-sm text-slate-500 font-medium">
                {authMode === 'login' ? "New to OdishaExamPrep? " : "Already a member? "}
                <button 
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  className="text-brand-600 font-extrabold hover:underline transition-all"
                >
                  {authMode === 'login' ? 'Register' : 'Login'}
                </button>
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PurchasesView = ({ user, profile, exams, mockTests, testSeries, dynamicQuestionBanks, hasAccessTo, onLaunchMockTest, onLaunchBank, onViewExam, loadingExams }: any) => {
  const { refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  };

  if (!user || !profile) return null;

  // Helper: is a string a URL (Supabase storage, Google Drive, etc.)?
  const isUrl = (s: string) => typeof s === 'string' && (s.startsWith('http') || s.startsWith('/'));

  // Helper: strip JSON_METADATA_ prefixed descriptions
  const cleanDesc = (d: string) => {
    if (!d) return '';
    if (d.startsWith('JSON_METADATA_') || d.startsWith('{')) return '';
    return d;
  };

  // Build seriesId → examId map from testSeries (needed when mockTest only has seriesId)
  const seriesExamMap: Record<string, string> = {};
  testSeries.forEach((s: any) => {
    if (s.id && s.examId) seriesExamMap[s.id] = s.examId;
  });

  // Resolve the actual examId for a mock test
  const resolveExamId = (test: any): string => {
    if (test.examId) return test.examId;
    if (test.seriesId && seriesExamMap[test.seriesId]) return seriesExamMap[test.seriesId];
    return '_misc';
  };

  // ── Build a map: examId → { exam, mockTests, questionBanks } ────────────────
  const examSections: Record<string, {
    exam: any;
    isBundle: boolean;
    mockTests: any[];
    questionBanks: any[];
  }> = {};

  const getOrCreate = (examId: string) => {
    if (!examSections[examId]) {
      const exam = exams.find((e: any) => e.id === examId) || {
        id: examId,
        name: examId === '_misc' ? 'Other Content' : examId.toUpperCase(),
        icon: '📚',
        description: '',
      };
      examSections[examId] = { exam, isBundle: false, mockTests: [], questionBanks: [] };
    }
    return examSections[examId];
  };

  // 1. Exam bundles
  (profile.purchasedSeries || []).forEach((id: string) => {
    if (id.startsWith('exam_bundle_')) {
      const examId = id.replace('exam_bundle_', '');
      getOrCreate(examId).isBundle = true;
    }
  });

  // 2. All mock tests the user can access (including individually purchased)
  mockTests.forEach((test: any) => {
    // Safety fallback: if cache is stale, parse the JSON inline
    let isPremium = test.isPremium;
    let tExamId = test.examId;
    if (typeof test.seriesId === 'string' && test.seriesId.startsWith('{')) {
      try {
        const parsed = JSON.parse(test.seriesId);
        isPremium = isPremium ?? parsed.isPremium;
        tExamId = tExamId ?? parsed.examId;
      } catch (e) {}
    }

    const examId = tExamId ? tExamId : resolveExamId(test);
    // Check access: directly purchased by ID, OR via exam bundle, OR via a purchased test series
    let accessible = hasAccessTo(test.id, examId);
    if (!accessible && test.seriesId && typeof test.seriesId === 'string' && !test.seriesId.startsWith('{')) {
      accessible = hasAccessTo(test.seriesId, examId);
    }

    if (isPremium && accessible && !(profile.hasFullAccess || profile.role === 'admin')) {
      const section = getOrCreate(examId);
      if (!section.mockTests.find((t: any) => t.id === test.id)) {
        section.mockTests.push({ ...test, isPremium, _resolvedExamId: examId });
      }
    }
  });

  // 3. All question banks the user can access
  Object.values(dynamicQuestionBanks).flat().forEach((bank: any) => {
    const b = bank as any;
    if (b.isPremium && hasAccessTo(b.id, b.examId) && !(profile.hasFullAccess || profile.role === 'admin')) {
      const section = getOrCreate(b.examId || '_misc');
      if (!section.questionBanks.find((q: any) => q.id === b.id)) {
        section.questionBanks.push(b);
      }
    }
  });

  const sections = Object.values(examSections).filter(s =>
    s.isBundle || s.mockTests.length > 0 || s.questionBanks.length > 0
  );

  const isFullAccess = profile.hasFullAccess || profile.role === 'admin';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 mt-4 md:mt-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 text-center mb-8 relative">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="absolute right-0 top-0 p-3 bg-white rounded-2xl border border-slate-200 text-slate-500 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm"
          title="Refresh Library"
        >
          <RotateCw className={cn("w-5 h-5", refreshing && "animate-spin")} />
        </button>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner relative"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
          <BookMarked className="w-10 h-10 text-white" />
          <div className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }} />
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
          My <span className="premium-text-gradient">Library</span>
        </h2>
        <p className="text-slate-500 font-medium text-lg">All your unlocked premium content in one place.</p>
      </div>

      {loadingExams ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full" />
        </div>
      ) : isFullAccess ? (
        /* Admin / Full Access Banner */
        <div className="relative overflow-hidden rounded-[2rem] p-8 text-white"
          style={{ background: 'linear-gradient(135deg, #0f0a28 0%, #1e1151 50%, #0f172a 100%)' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 to-purple-500/20 pointer-events-none" />
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center shrink-0">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-1">Unlimited Access</div>
              <h3 className="text-2xl font-black">All Content Unlocked</h3>
              <p className="text-white/60 text-sm mt-1">You have full access to every exam, mock test, and question bank.</p>
            </div>
          </div>
        </div>
      ) : sections.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="premium-glass-card p-12 sm:p-16 rounded-[2.5rem] text-center max-w-2xl mx-auto mt-12 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
          
          <motion.div 
            className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200/50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner inner-glow animate-float-gentle"
          >
            <Lock className="w-10 h-10 text-slate-400" />
          </motion.div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Your Library is Empty</h2>
          <p className="text-slate-500 mb-10 max-w-md mx-auto text-lg leading-relaxed">
            You haven't unlocked any premium content yet. Explore our comprehensive exams and test series to start your journey today.
          </p>
          <button
            onClick={() => onViewExam(null)}
            className="group relative px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all overflow-hidden flex items-center gap-3 mx-auto"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-brand-600 to-brand-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative z-10">Explore Exams</span>
            <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {sections.map((section, si) => {
            const { exam, isBundle, mockTests: sTests, questionBanks: sBanks } = section;
            const totalItems = sTests.length + sBanks.length;

            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: si * 0.08 }}
                className="rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-200/60"
              >
                {/* Exam Header — dark premium strip */}
                <div className="relative p-6 sm:p-8 text-white overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #0f0a28 0%, #1e1151 60%, #312e81 100%)' }}>
                  {/* Glow orb */}
                  <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-30 pointer-events-none"
                    style={{ background: 'radial-gradient(circle, #818cf8 0%, transparent 70%)' }} />
                  <div className="relative z-10 flex items-center gap-5">
                    {/* Exam icon */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                      {isUrl(exam.icon)
                        ? <img src={getDirectImageUrl(exam.icon)} alt={exam.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e: any) => { e.target.style.display='none'; e.target.parentNode.textContent='📚'; }} />
                        : <span className="text-3xl sm:text-4xl">{exam.icon || '📚'}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {isBundle && (
                          <span className="text-[10px] font-black uppercase tracking-widest bg-brand-500/30 border border-brand-400/40 text-brand-300 px-2.5 py-1 rounded-lg animate-pulse-soft">
                            Exam Bundle
                          </span>
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                          <CheckCircle2 className="w-3 h-3" /> Premium Unlocked
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-white leading-tight truncate">{exam.name}</h3>
                      {cleanDesc(exam.description) && (
                        <p className="text-white/50 text-sm mt-0.5 line-clamp-1">{cleanDesc(exam.description)}</p>
                      )}
                      <p className="text-white/40 text-xs mt-1">
                        {totalItems} item{totalItems !== 1 ? 's' : ''} unlocked
                        {isBundle ? ' · Full Bundle Access' : ''}
                      </p>
                    </div>
                    {isBundle && (
                      <button
                        onClick={() => onViewExam(exam.id)}
                        className="group shrink-0 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 text-white text-sm font-bold rounded-2xl transition-all duration-300 flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                      >
                        Open <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Content Items Grid */}
                {totalItems > 0 && (
                  <div className="bg-white/80 backdrop-blur-xl border-x border-b border-slate-100 p-6 rounded-b-[2rem]">
                    <div className="max-h-[380px] overflow-y-auto custom-scrollbar pr-2 -mr-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-2">
                        {/* Mock Tests */}
                        {sTests.map((test: any, i: number) => (
                          <motion.div 
                            key={test.id}
                            {...scaleIn}
                            transition={{ ...scaleIn.transition, delay: 0.1 + (i * 0.05) }}
                            whileHover={whileHover.liftTap}
                            whileTap={whileTap.press}
                            className="group premium-shine-container relative bg-white/60 backdrop-blur-md rounded-2xl border border-slate-200/60 p-5 hover:bg-white hover:border-brand-300 hover:shadow-2xl hover:shadow-brand-500/20 transition-all duration-500 cursor-pointer flex flex-col gap-4 overflow-hidden"
                            onClick={() => onLaunchMockTest(test)}
                          >
                            <div className="flex items-start gap-4 relative z-10">
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md group-hover:shadow-brand-500/30 transition-shadow duration-300"
                                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                <Timer className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <div className="text-[10px] font-black uppercase tracking-widest text-brand-600 mb-1">Mock Test</div>
                                <h4 className="font-extrabold text-slate-900 text-base leading-tight group-hover:text-brand-700 transition-colors line-clamp-2">
                                  {test.title}
                                </h4>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-500 font-medium relative z-10 mt-1">
                              <span className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                                <Clock3 className="w-3.5 h-3.5 text-slate-600" />{test.durationMinutes || 60} mins
                              </span>
                              <span className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-100/80 border border-emerald-200 px-2.5 py-1 rounded-lg shadow-sm">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Unlocked
                              </span>
                            </div>
                            <button className="w-full mt-2 py-2.5 text-sm font-bold text-white rounded-xl shadow-md group-hover:shadow-brand-500/25 transition-all duration-300 relative overflow-hidden"
                              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                              <span className="relative z-10 flex items-center justify-center gap-2">
                                Start Test <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                              </span>
                            </button>
                          </motion.div>
                        ))}

                        {/* Question Banks */}
                        {sBanks.map((bank: any, i: number) => (
                          <motion.div 
                            key={bank.id}
                            {...scaleIn}
                            transition={{ ...scaleIn.transition, delay: 0.15 + (i * 0.05) }}
                            whileHover={whileHover.liftTap}
                            whileTap={whileTap.press}
                            className="group premium-shine-container relative bg-white/60 backdrop-blur-md rounded-2xl border border-slate-200/60 p-5 hover:bg-white hover:border-emerald-300 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 cursor-pointer flex flex-col gap-4 overflow-hidden"
                            onClick={() => onLaunchBank(bank)}
                          >
                            <div className="flex items-start gap-4 relative z-10">
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md group-hover:shadow-emerald-500/30 transition-shadow duration-300"
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                <BookOpen className="w-6 h-6 text-white group-hover:-rotate-12 transition-transform duration-300" />
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Question Bank</div>
                                <h4 className="font-extrabold text-slate-900 text-base leading-tight group-hover:text-emerald-700 transition-colors line-clamp-2">
                                  {bank.title}
                                </h4>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-500 font-medium relative z-10 mt-1">
                              <span className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                                <BookOpen className="w-3.5 h-3.5 text-slate-600" />{bank.questions || '—'} Questions
                              </span>
                              <span className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-100/80 border border-emerald-200 px-2.5 py-1 rounded-lg shadow-sm">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Unlocked
                              </span>
                            </div>
                            <button className="w-full mt-2 py-2.5 text-sm font-bold text-white rounded-xl shadow-md group-hover:shadow-emerald-500/25 transition-all duration-300 relative overflow-hidden"
                              style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
                              <span className="relative z-10 flex items-center justify-center gap-2">
                                Practice Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                              </span>
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
/** 
 * Module-level cache — survives DashboardContent remounts (tab switches).
 * This is the key fix: old Gmail accounts were seeing empty exams because
 * every tab-click unmounts/remounts DashboardContent, resetting exams=[]
 * and re-triggering a fetch that could race with a concurrent token refresh.
 * Now we immediately populate state from this cache on re-mount.
 */
const _dashboardCache: {
  exams: any[];
  testSeries: any[];
  mockTests: any[];
  dynamicQuestionBanks: Record<string, any[]>;
  loadedForUserId: string | null;
} = {
  exams: [],
  testSeries: [],
  mockTests: [],
  dynamicQuestionBanks: {},
  loadedForUserId: null,
};

const DashboardContent = ({ isGuest, onSignIn, mainTab = 'home', user, activities = [], onNavigate, onActivityLogged }: { isGuest?: boolean, onSignIn?: () => void, mainTab?: string, user?: any, activities?: any[], onNavigate?: (tab: any) => void, onActivityLogged?: () => void }) => {
  const { profile, isAdmin, hasFullAccess, grantFullAccess, hasAccessTo, unlockItem, guestUsage, incrementGuestUsage } = useAuth();
  const navigate = useNavigate();
  const [selectedExam, setSelectedExam] = useState<string | null>(() => sessionStorage.getItem('oep_selectedExam') || null);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    if (selectedExam) sessionStorage.setItem('oep_selectedExam', selectedExam);
    else sessionStorage.removeItem('oep_selectedExam');
  }, [selectedExam]);

  useEffect(() => {
    if (selectedExam) {
      if (isGuest) {
        scrollToElement('exams', { block: 'start' });
      } else {
        scrollToTop();
      }
    }
  }, [selectedExam, isGuest]);
  const [activeTest, setActiveTest] = useState<any | null>(null);
  const [activeTestState, setActiveTestState] = useState<any>(null);

  // Signal to the global WhatsAppButton that a test/practice is in progress
  // so it can hide itself for a distraction-free experience.
  useEffect(() => {
    if (activeTest) {
      document.body.setAttribute('data-test-mode', 'true');
    } else {
      document.body.removeAttribute('data-test-mode');
    }
    return () => document.body.removeAttribute('data-test-mode');
  }, [activeTest]);
  const [testResults, setTestResults] = useState<any | null>(null);

  // Stats for comparisons
  // (Moving these inside the component so activities is in scope)
  const [selectedBankItem, setSelectedBankItem] = useState<any | null>(() => {
    const saved = sessionStorage.getItem('oep_selectedBankItem');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });

  useEffect(() => {
    if (selectedBankItem) sessionStorage.setItem('oep_selectedBankItem', JSON.stringify(selectedBankItem));
    else sessionStorage.removeItem('oep_selectedBankItem');
  }, [selectedBankItem]);

  // --- Common UI Components (Defined early, rendered at bottom) ---
  const renderCommonModals = () => (
    <>
        {/* Detail View Modal */}
        <AnimatePresence>
          {selectedBankItem && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-[2rem] w-[90%] max-w-sm overflow-hidden shadow-2xl flex flex-col"
              >
                <div className="h-36 relative shrink-0">
                  <img 
                    src={getDirectImageUrl(selectedBankItem.image)} 
                    alt={selectedBankItem.title} 
                    loading="lazy"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <button 
                    onClick={() => setSelectedBankItem(null)}
                    className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 text-white rounded-xl backdrop-blur-md transition-all z-20"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-4 left-6 z-10">
                    <h2 className="text-xl font-black text-white leading-tight">{selectedBankItem.title}</h2>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  <p className="text-slate-500 text-sm font-medium leading-relaxed line-clamp-2">
                    Comprehensive Question Bank and practice materials for {selectedBankItem.title}.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Questions</p>
                      <p className="text-base font-black text-slate-900">{selectedBankItem.questions}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Highlight</p>
                      <p className="text-[11px] font-black text-brand-600 truncate">{selectedBankItem.tagline}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Study Materials</p>
                        {selectedBankItem.pdfLinks && selectedBankItem.pdfLinks.length > 2 && (
                          <span className="text-[9px] font-bold text-brand-500 animate-pulse">Scroll to view all</span>
                        )}
                      </div>
                      
                      <motion.div 
                        initial="hidden"
                        animate="show"
                        variants={{
                          hidden: { opacity: 0 },
                          show: {
                            opacity: 1,
                            transition: { staggerChildren: 0.08 }
                          }
                        }}
                        className="max-h-[180px] overflow-y-auto pr-1 space-y-2 custom-scrollbar"
                      >
                        {selectedBankItem.pdfLinks && selectedBankItem.pdfLinks.length > 0 ? (
                          selectedBankItem.pdfLinks.map((link: any, idx: number) => (
                            <motion.button 
                              key={idx}
                              variants={{
                                hidden: { opacity: 0, x: -10 },
                                show: { opacity: 1, x: 0 }
                              }}
                              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 hover:bg-brand-50 border border-slate-100 hover:border-brand-200 transition-all group relative overflow-hidden"
                              onClick={() => {
                                if (isGuest) {
                                  setShowLoginPrompt(true);
                                  return;
                                }
                                if (selectedBankItem.isPremium && !hasAccessTo(selectedBankItem.id, selectedBankItem.examId)) {
                                  setPaywallPrice(selectedBankItem.price || 499);
                                  setPaywallOriginalPrice(selectedBankItem.originalPrice || ((selectedBankItem.price || 499) * 2));
                                  setPaywallItemTitle(selectedBankItem.title || 'Premium Content');
                                  setPaywallFeatures([
                                    `${selectedBankItem.questions || selectedBankItem.questionCount || '500+'} Questions`,
                                    selectedBankItem.hasPracticeMode !== false ? 'Interactive Practice Mode' : 'Instant PDF Access',
                                    selectedBankItem.tagline || 'Detailed Solutions Provided',
                                    'Advanced Performance Analytics'
                                  ]);
                                  setPaywallItemId(selectedBankItem.id);
                                  setShowPaywall(true);
                                } else {
                                  const currentExamName = exams.find((e: any) => e.id === selectedExam)?.name || 'General';
                                  const bankCategories: Record<string, string> = {
                                    'topic-wise': 'Topic-wise Question Bank',
                                    'exam-focused': 'Exam-Focused Bank',
                                    'revision-sets': 'Revision Sets',
                                    'pyq-collections': 'PYQ Collection'
                                  };
                                  const specificCategory = selectedBankType ? (bankCategories[selectedBankType] || 'PDF Material') : 'PDF Material';

                                  activityTracker.logActivity(user?.id, {
                                    type: 'question_bank_accessed',
                                    title: `Downloaded ${link.title || selectedBankItem.title} PDF`,
                                    metadata: {
                                      pdfUrl: link.url,
                                      examName: currentExamName,
                                      testCategory: specificCategory
                                    }
                                  });
                                  window.open(link.url, '_blank');
                                }
                              }}
                            >
                              <div className="flex items-center gap-3 relative z-10">
                                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm text-brand-600 group-hover:scale-110 group-hover:rotate-6 transition-all">
                                  <Download className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-black text-slate-700 group-hover:text-brand-700 truncate max-w-[180px]">
                                    {link.title || 'Download PDF'}
                                  </p>
                                  <p className="text-[9px] font-bold text-slate-400">PDF Document</p>
                                </div>
                              </div>
                              
                              {selectedBankItem.isPremium && !hasAccessTo(selectedBankItem.id, selectedBankItem.examId) ? (
                                <Lock className="w-4 h-4 text-slate-300 group-hover:text-brand-400 transition-colors" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-400 group-hover:translate-x-1 transition-all" />
                              )}
                            </motion.button>
                          ))
                        ) : (
                          <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                             <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No files available</p>
                          </div>
                        )}
                      </motion.div>
                    </div>
                    <Button 
                      variant="secondary" 
                      className={cn(
                        "w-full h-12 rounded-xl text-sm font-black border-slate-200",
                        selectedBankItem.hasPracticeMode === false && "opacity-60 cursor-not-allowed"
                      )}
                      onClick={() => {
                        if (selectedBankItem.hasPracticeMode === false) {
                          alert("Practice mode for this topic is coming soon!");
                          return;
                        }
                        
                        if (isGuest) {
                          setShowLoginPrompt(true);
                          return;
                        }

                        if (selectedBankItem.isPremium && !hasAccessTo(selectedBankItem.id, selectedBankItem.examId)) {
                          setPaywallPrice(selectedBankItem.price || 499);
                          setPaywallOriginalPrice(selectedBankItem.originalPrice || ((selectedBankItem.price || 499) * 2));
                          setPaywallItemTitle(selectedBankItem.title || 'Premium Content');
                          setPaywallFeatures([
                            `${selectedBankItem.questions || selectedBankItem.questionCount || '500+'} Questions`,
                            selectedBankItem.hasPracticeMode !== false ? 'Interactive Practice Mode' : 'Instant PDF Access',
                            selectedBankItem.tagline || 'Detailed Solutions Provided',
                            'Advanced Performance Analytics'
                          ]);
                          setPaywallItemId(selectedBankItem.id);
                          setShowPaywall(true);
                        } else {
                          setSelectedBankItem(null);
                          setSelectedBankType(null);
                          setShowPracticeConfig(true);
                          setPracticeSettings({
                            ...practiceSettings, 
                            examId: selectedExam || practiceSettings.examId,
                            category: selectedBankType || practiceSettings.category,
                            topic: selectedBankItem.id
                          });
                          scrollToElement('practice-mode-section', { block: 'start', delay: 100 });
                        }
                      }}
                    >
                      {selectedBankItem.hasPracticeMode === false ? (
                        <>
                          <Clock className="w-4 h-4 mr-2" />
                          Coming Soon
                        </>
                      ) : selectedBankItem.isPremium && !hasAccessTo(selectedBankItem.id, selectedBankItem.examId) ? (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Unlock to Practice
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Practice Now
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Practice Config Modal — also available from Library tab */}
        <AnimatePresence>
          {showPracticeConfig && mainTab === 'library' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-slate-900/60 pointer-events-auto"
            >
              <div className="absolute inset-0" onClick={() => setShowPracticeConfig(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-2xl overflow-hidden"
              >
                <div className="p-4 sm:p-6 md:p-8 overflow-y-auto no-scrollbar md:custom-scrollbar">
                  <div className="flex justify-between items-start mb-4 md:mb-6">
                    <div>
                      <h3 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900">Configure Practice</h3>
                      <p className="text-[11px] sm:text-xs md:text-sm text-slate-500 font-medium mt-0.5">Set your preferences for this session</p>
                    </div>
                    <Button variant="ghost" onClick={() => setShowPracticeConfig(false)} className="p-1.5 hover:bg-slate-100 rounded-lg -mr-1">
                      <X className="w-5 h-5 text-slate-400" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-4 md:mb-6">
                    <div className="space-y-1.5 md:space-y-3">
                      <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Select Exam</label>
                      <SearchableSelect
                        value={practiceSettings.examId || ''}
                        onChange={(val) => setPracticeSettings({...practiceSettings, examId: val, category: '', topic: ''})}
                        options={actualExams.map(ex => ({ value: ex.id, label: ex.name }))}
                        placeholder="Choose an exam..."
                        searchPlaceholder="Search exams..."
                        className="px-3 md:px-4 h-[44px] md:h-[50px] rounded-lg md:rounded-xl text-sm md:text-base"
                      />
                    </div>
                    <div className="space-y-1.5 md:space-y-3">
                      <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Select Category</label>
                      <SearchableSelect
                        value={practiceSettings.category}
                        onChange={(val) => setPracticeSettings({...practiceSettings, category: val, topic: ''})}
                        disabled={!practiceSettings.examId}
                        options={[
                          { value: "topic-wise", label: "Topic-wise Question Bank" },
                          { value: "exam-focused", label: "Exam-Focused Bank" },
                          { value: "revision-sets", label: "Revision Sets" },
                          { value: "pyq-collections", label: "PYQ Collections" },
                        ]}
                        placeholder={practiceSettings.examId ? 'Choose a category...' : 'Select an exam first'}
                        searchPlaceholder="Search categories..."
                        className="px-3 md:px-4 h-[44px] md:h-[50px] rounded-lg md:rounded-xl text-sm md:text-base"
                      />
                    </div>
                    <div className="space-y-1.5 md:space-y-3 sm:col-span-2 lg:col-span-1">
                      <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Select Topic / Unit</label>
                      <SearchableSelect
                        value={practiceSettings.topic}
                        onChange={(val) => setPracticeSettings({...practiceSettings, topic: val})}
                        disabled={!practiceSettings.category}
                        options={(dynamicQuestionBanks[practiceSettings.category] || [])
                          .filter((item: any) => item.examId === practiceSettings.examId)
                          .map((item: any) => ({
                            value: item.id,
                            label: `${item.title} ${item.isPremium && !hasAccessTo(item.id, item.examId) ? '(Premium)' : ''}`
                          }))}
                        placeholder={practiceSettings.category ? 'Choose a topic...' : 'Select a category first'}
                        searchPlaceholder="Search topics..."
                        className="px-3 md:px-4 h-[44px] md:h-[50px] rounded-lg md:rounded-xl text-sm md:text-base"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex justify-between items-end">
                        <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Number of Questions</label>
                        {practiceSettings.topic && (
                          <span className="text-[10px] md:text-xs font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {topicMaxQuestions} Available
                          </span>
                        )}
                      </div>
                      {!practiceSettings.topic ? (
                        <div className="w-full p-2.5 md:p-3 rounded-lg md:rounded-xl border border-slate-200 bg-slate-50 text-slate-400 font-bold text-center text-xs md:text-sm">Select a topic first</div>
                      ) : topicMaxQuestions === 0 ? (
                        <div className="w-full p-2.5 md:p-3 rounded-lg md:rounded-xl border border-rose-100 bg-rose-50 text-rose-500 font-bold text-center text-xs md:text-sm">No questions available yet</div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <input type="range" min="1" max={topicMaxQuestions} value={practiceSettings.questions}
                            onChange={(e) => setPracticeSettings({...practiceSettings, questions: e.target.value})}
                            className="flex-1 accent-indigo-600 h-1.5 md:h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                          <div className="relative w-16 md:w-20 shrink-0">
                            <input type="number" min="1" max={topicMaxQuestions} value={practiceSettings.questions}
                              onChange={(e) => { let val = parseInt(e.target.value); if (isNaN(val)) val = 1; if (val > topicMaxQuestions) val = topicMaxQuestions; if (val < 1) val = 1; setPracticeSettings({...practiceSettings, questions: val.toString()}); }}
                              className="w-full p-2 md:p-2.5 rounded-lg md:rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-black text-slate-800 text-center text-xs md:text-sm" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 md:space-y-3">
                      <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Time Limit (Minutes)</label>
                      {!practiceSettings.topic ? (
                        <div className="w-full p-2.5 md:p-3 rounded-lg md:rounded-xl border border-slate-200 bg-slate-50 text-slate-400 font-bold text-center text-xs md:text-sm">Select a topic first</div>
                      ) : topicMaxQuestions === 0 ? (
                        <div className="w-full p-2.5 md:p-3 rounded-lg md:rounded-xl border border-rose-100 bg-rose-50 text-rose-500 font-bold text-center text-xs md:text-sm">-</div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <input type="range" min="1" max="180" value={practiceSettings.timeLimit}
                            onChange={(e) => setPracticeSettings({...practiceSettings, timeLimit: e.target.value})}
                            className="flex-1 accent-indigo-600 h-1.5 md:h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                          <div className="relative w-16 md:w-20 shrink-0 flex items-center bg-white rounded-lg md:rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all overflow-hidden pr-1.5 md:pr-2">
                            <input type="number" min="1" max="180" value={practiceSettings.timeLimit}
                              onChange={(e) => { let val = parseInt(e.target.value); if (isNaN(val)) val = 1; if (val > 180) val = 180; if (val < 1) val = 1; setPracticeSettings({...practiceSettings, timeLimit: val.toString()}); }}
                              className="w-full p-2 md:p-2.5 pr-0.5 md:pr-1 outline-none font-black text-slate-800 text-center bg-transparent appearance-none text-xs md:text-sm" />
                            <span className="text-[10px] md:text-xs font-bold text-slate-400">m</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 md:mt-8 flex justify-center w-full">
                    <Button
                      disabled={!practiceSettings.topic || loadingPractice || topicMaxQuestions === 0}
                      className="w-full sm:w-auto px-6 sm:px-12 py-3 md:py-3.5 rounded-xl md:rounded-2xl text-sm sm:text-base font-black bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none sm:min-w-[280px]"
                      onClick={handleStartDynamicPractice}
                    >
                      {loadingPractice ? 'Compiling...' : 'Start Practice Session'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Paywall Modal */}
        <AnimatePresence>
          {showPaywall && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-[2rem] w-[90%] max-w-sm overflow-hidden shadow-2xl relative"
              >
                <button 
                  onClick={() => { setShowPaywall(false); setPaywallItemId(null); }}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="p-6 text-center space-y-5">
                  <motion.div 
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="w-14 h-14 premium-gradient rounded-2xl flex items-center justify-center mx-auto premium-glow relative"
                  >
                    <Award className="text-white w-7 h-7" />
                    <div className="absolute inset-0 border-2 border-brand-200 rounded-2xl animate-ping opacity-20" />
                  </motion.div>
                  
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight px-2">{paywallItemTitle.includes('Full Access') ? 'Unlock Full Access' : `Unlock ${paywallItemTitle}`}</h2>
                    <p className="text-slate-500 text-sm font-medium leading-tight">
                      {paywallItemTitle.includes('Full Access') ? 'Unlock full lifetime access to all Question Banks, Practice Mode, Premium Mock Tests, PDF notes, and any future content added to this exam.' : `Unlock full lifetime access to this specific premium content, including detailed solutions and any future updates.`}
                    </p>
                  </div>

                  <motion.div 
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: { opacity: 0 },
                      show: {
                        opacity: 1,
                        transition: { staggerChildren: 0.08 }
                      }
                    }}
                    className="space-y-2.5 text-left bg-slate-50/50 p-4 rounded-2xl border border-slate-100"
                  >
                    {paywallFeatures.map((benefit, i) => (
                      <motion.div 
                        key={i} 
                        variants={{
                          hidden: { opacity: 0, x: -10 },
                          show: { opacity: 1, x: 0 }
                        }}
                        className="flex items-center gap-3 text-slate-700 font-bold"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-xs">{benefit}</span>
                      </motion.div>
                    ))}
                  </motion.div>

                  <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center p-2">
                      <div className="flex items-end justify-center gap-2 mb-1">
                        <span className="text-xl font-bold text-slate-400 line-through mb-1">₹{paywallOriginalPrice}</span>
                        <span className="text-4xl font-black text-slate-950">₹{paywallPrice}</span>
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                        {Math.round(((paywallOriginalPrice - paywallPrice) / paywallOriginalPrice) * 100)}% OFF • Lifetime Access
                      </span>
                    </div>
                    <Button 
                      className="w-full h-12 rounded-xl text-base font-black premium-gradient shadow-lg shadow-brand-500/20 group/btn relative overflow-hidden"
                      onClick={async () => {
                        const res = await loadRazorpay();
                        if (res) {
                          const options = {
                            key: 'rzp_live_SeeKABRgdgfsWG',
                            amount: paywallPrice * 100,
                            currency: 'INR',
                            name: 'OdishaExamPrep Premium',
                            description: paywallItemTitle === 'Full Access' ? 'Unlock Full Access' : `Unlock ${paywallItemTitle}`,
                            handler: async function () {
                              if (paywallItemId) {
                                await unlockItem(paywallItemId);
                              } else {
                                await grantFullAccess();
                              }
                              setShowPaywall(false);
                              setPaywallItemId(null);
                            },
                            prefill: {
                              name: profile?.displayName,
                              email: profile?.email
                            },
                            theme: { color: '#4f46e5' }
                          };
                          const rzp = new (window as any).Razorpay(options);
                          rzp.open();
                        }
                      }}
                    >
                      {/* Button Shine Effect */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 z-10" />

                      <span className="relative z-10 flex items-center justify-center gap-2">
                        Unlock Now
                        <ChevronRight className="w-5 h-5" />
                      </span>
                    </Button>
                    <p className="text-[10px] text-slate-400 font-medium">Secure payment via Razorpay • Instant Activation</p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Login Prompt Popup */}
        <AnimatePresence>
          {showLoginPrompt && (
            <div className="fixed inset-0 bg-black/60 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 space-y-6 shadow-2xl relative overflow-hidden"
              >
                {/* Decorative background orbs */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto relative">
                  <User className="w-8 h-8 text-indigo-600" />
                  <div className="absolute inset-0 border-2 border-indigo-200 rounded-2xl animate-ping opacity-20" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900">Sign in Required</h3>
                  <p className="text-slate-500">Please sign in to access mock tests, question banks, or Practice Mode.</p>
                </div>
                <Button className="w-full py-4" onClick={() => { setShowLoginPrompt(false); if (onSignIn) onSignIn(); }}>
                  Sign In Now
                </Button>
                <button onClick={() => setShowLoginPrompt(false)} className="w-full text-slate-500 text-sm font-medium">
                  Maybe Later
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </>
  );

  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<'popular' | 'upcoming'>('upcoming');
  const [showPracticeConfig, setShowPracticeConfig] = useState<boolean>(false);
  const [selectedBankType, setSelectedBankType] = useState<string | null>(() => sessionStorage.getItem('oep_selectedBankType') || null);
  const [bankSearchQuery, setBankSearchQuery] = useState("");
  const [bankSortBy, setBankSortBy] = useState("Name");
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallPrice, setPaywallPrice] = useState(499);
  const [paywallOriginalPrice, setPaywallOriginalPrice] = useState(999);
  const [paywallItemTitle, setPaywallItemTitle] = useState('Full Access');
  const [paywallFeatures, setPaywallFeatures] = useState<string[]>([
    'Full Question Bank (2,500+ Qs)',
    'Unlimited Practice Mode',
    'Detailed Step-by-Step Solutions',
    'Advanced Performance Analytics'
  ]);
  const [paywallItemId, setPaywallItemId] = useState<string | null>(null);
  const [loadingPractice, setLoadingPractice] = useState(false);
  const [topicMaxQuestions, setTopicMaxQuestions] = useState<number>(0);
  const [practiceSettings, setPracticeSettings] = useState(() => {
    const saved = sessionStorage.getItem('oep_practiceSettings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      examId: '',
      category: '',
      topic: '',
      questions: '20',
      timeLimit: '30'
    };
  });

  const [dynamicQuestionBanks, setDynamicQuestionBanks] = useState<Record<string, any[]>>(() => _dashboardCache.dynamicQuestionBanks);
  const [exams, setExams] = useState<any[]>(() => _dashboardCache.exams);
  const [testSeries, setTestSeries] = useState<any[]>(() => _dashboardCache.testSeries);
  const [mockTests, setMockTests] = useState<any[]>(() => _dashboardCache.mockTests);
  // Only show loading spinner if cache is empty (first load); otherwise show cached data instantly
  const [loadingExams, setLoadingExams] = useState(() => _dashboardCache.exams.length === 0);
  const [selectedMockCategory, setSelectedMockCategory] = useState<string | null>(() => sessionStorage.getItem('oep_selectedMockCategory') || null);


  useEffect(() => {
    if (selectedBankType) sessionStorage.setItem('oep_selectedBankType', selectedBankType);
    else sessionStorage.removeItem('oep_selectedBankType');
  }, [selectedBankType]);

  useEffect(() => {
    sessionStorage.setItem('oep_practiceSettings', JSON.stringify(practiceSettings));
  }, [practiceSettings]);

  useEffect(() => {
    if (selectedMockCategory) sessionStorage.setItem('oep_selectedMockCategory', selectedMockCategory);
    else sessionStorage.removeItem('oep_selectedMockCategory');
  }, [selectedMockCategory]);
  const actualExams = useMemo(() => {
    return exams.filter(e => e.category !== 'blog' && e.category !== 'system' && e.name !== 'SYSTEM_SETTINGS_YOUTUBE_RESERVED');
  }, [exams]);

  useEffect(() => {
    const activeExamId = practiceSettings.examId || selectedExam;
    if (!practiceSettings.topic || !activeExamId) {
      setTopicMaxQuestions(0);
      return;
    }
    const fetchMaxQuestions = async () => {
      const topicBank = Object.values(dynamicQuestionBanks).flat().find((b: any) => b.id === practiceSettings.topic) as any;
      const bankTopicName = topicBank ? topicBank.title : practiceSettings.topic;

      const { data } = await supabase.from('questions').select('topic').eq('examId', activeExamId);
      let matchedQs = data || [];
      if (bankTopicName) {
        matchedQs = matchedQs.filter((q: any) => 
           (q.topic && q.topic.toLowerCase().includes(bankTopicName.toLowerCase())) || 
           (bankTopicName.toLowerCase().includes((q.topic || '').toLowerCase()))
        );
      }
      setTopicMaxQuestions(matchedQs.length);
      
      setPracticeSettings(prev => {
         const currentVal = Number(prev.questions) || 20;
         const safeVal = Math.min(currentVal, matchedQs.length);
         return { ...prev, questions: safeVal > 0 ? safeVal.toString() : '0' };
      });
    };
    fetchMaxQuestions();
  }, [practiceSettings.topic, practiceSettings.examId, selectedExam, dynamicQuestionBanks]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Skip re-fetch if we already have data for this user (tab switch remount)
      if (_dashboardCache.loadedForUserId === (user?.id || 'guest') && _dashboardCache.exams.length > 0) {
        // Data is already in state (from cache initializer) — just ensure loading is off
        setLoadingExams(false);
        return;
      }

      try {
        // Use allSettled so one failing table doesn't block everything else.
        // Use getAllMockTestsLite — metadata only, no question payloads.
        // This prevents large question responses from timing out and breaking the dashboard.
        const [examsResult, banksResult, seriesResult, testsResult] = await Promise.allSettled([
          examService.getAllExams(),
          examService.getAllQuestionBanks(),
          examService.getAllTestSeries(),
          examService.getAllMockTestsLite()
        ]);

        let fetchedExams   = examsResult.status   === 'fulfilled' ? examsResult.value   : [];
        const fetchedBanks   = banksResult.status   === 'fulfilled' ? banksResult.value   : [];
        const fetchedSeries  = seriesResult.status  === 'fulfilled' ? seriesResult.value  : [];
        const fetchedTests   = testsResult.status   === 'fulfilled' ? testsResult.value   : [];

        // Log any individual failures for debugging
        [examsResult, banksResult, seriesResult, testsResult].forEach((r, i) => {
          if (r.status === 'rejected') {
            console.error(`fetchDashboardData[${i}] failed:`, r.reason);
          }
        });

        // If exams returned empty, the JWT may be too large/stale.
        // Force a session refresh to get a fresh JWT, then retry.
        if (fetchedExams.length === 0) {
          try {
            const { supabase: sb } = await import('./lib/supabase');
            await sb.auth.refreshSession();
            await new Promise(r => setTimeout(r, 400)); // wait for auth to settle
          } catch (e) {
            console.warn('Session refresh before retry failed:', e);
          }
          const retry = await examService.getAllExams().catch(() => null);
          if (retry && retry.length > 0) {
            fetchedExams = retry;
            console.log('fetchDashboardData: retry after refresh succeeded,', retry.length, 'exams loaded');
          }
        }

        const finalExams = fetchedExams.length > 0
          ? fetchedExams
          : [{ id: 'opsc-aio', name: 'OPSC AIO', description: 'Odisha Public Service Commission All In One', icon: '🏛️', category: 'upcoming' }];

        // Group banks by type
        const groupedBanks: Record<string, any[]> = {};
        fetchedBanks.forEach((bank: any) => {
          if (!groupedBanks[bank.type]) groupedBanks[bank.type] = [];
          let parsedTagline = { text: bank.tagline || '', price: 499 };
          try { 
            if (bank.tagline && bank.tagline.includes('{"text"')) {
               parsedTagline = JSON.parse(bank.tagline);
            }
          } catch(e) {}
          groupedBanks[bank.type].push({
            id: bank.id,
            title: bank.title,
            questions: bank.questionCount,
            tagline: parsedTagline.text,
            price: parsedTagline.price || 499,
            image: bank.image,
            isPremium: bank.isPremium,
            examId: bank.examId,
            pdfUrl: bank.pdfUrl || '',
            pdfLinks: (() => {
              if (!bank.pdfUrl) return [];
              try {
                const parsed = JSON.parse(bank.pdfUrl);
                if (Array.isArray(parsed)) return parsed;
                return [{ title: 'Download PDF', url: bank.pdfUrl }];
              } catch (e) {
                return [{ title: 'Download PDF', url: bank.pdfUrl }];
              }
            })(),
            hasPracticeMode: bank.hasPracticeMode
          });
        });

        // Write to module-level cache before updating state
        _dashboardCache.exams = finalExams;
        _dashboardCache.testSeries = fetchedSeries || [];
        _dashboardCache.mockTests = fetchedTests || [];
        _dashboardCache.dynamicQuestionBanks = groupedBanks;
        _dashboardCache.loadedForUserId = user?.id || 'guest';

        // Update React state
        setExams(finalExams);
        setTestSeries(fetchedSeries || []);
        setMockTests(fetchedTests || []);
        setDynamicQuestionBanks(groupedBanks);

      } catch (error) {
        console.error("Error fetching data:", error);
        // Even on total failure, show fallback so the grid is never empty
        if (_dashboardCache.exams.length === 0) {
          const fallback = [{ id: 'opsc-aio', name: 'OPSC AIO', description: 'Odisha Public Service Commission All In One', icon: '🏛️', category: 'upcoming' }];
          _dashboardCache.exams = fallback;
          setExams(fallback);
        }
      } finally {
        setLoadingExams(false);
      }
    };
    fetchDashboardData();
  }, [user?.id]);

  const [examSearchQuery, setExamSearchQuery] = useState('');

  const filteredExams = exams.filter(exam => {
    if (exam.name === 'SYSTEM_SETTINGS_YOUTUBE_RESERVED') return false;
    if (exam.category === 'system' || exam.category === 'blog') return false;
    
    if (examSearchQuery) {
      const q = examSearchQuery.toLowerCase();
      return exam.name.toLowerCase().includes(q) || (exam.description && exam.description.toLowerCase().includes(q));
    } else {
      return exam.category === activeTab;
    }
  });

  const sampleTest = {
    id: 'test-1',
    title: 'OPSC AIO Full Mock Test 01',
    durationMinutes: 60,
    isPremium: true,
    questions: [
      {
        id: 'q1',
        questionText: 'Which article of the Indian Constitution deals with the amendment procedure?',
        options: ['Article 352', 'Article 356', 'Article 360', 'Article 368'],
        correctAnswerIndex: 3,
        explanation: 'Article 368 of Part XX of the Constitution of India provides for two types of amendments.'
      },
      {
        id: 'q2',
        questionText: 'The Hirakud Dam is built across which river?',
        options: ['Ganga', 'Mahanadi', 'Godavari', 'Krishna'],
        correctAnswerIndex: 1,
        explanation: 'Hirakud Dam is built across the Mahanadi River, about 15 kilometres from Sambalpur in Odisha.'
      }
    ]
  };

  const allActivities = useMemo(() => activities || [], [activities, mainTab, activeTest]);

  const incompleteTests = useMemo(() => {
    if (!allActivities) return [];
    
    const incompletes = allActivities.filter(a => a.type === 'test_incomplete');
    
    // Filter out any where a completed test exists for the same session id
    const completedSessionIds = new Set(
      allActivities.filter(a => a.type === 'mock_test_completed').map(a => a.metadata?.resumeSessionId)
    );
    
    // Deduplicate so we only show the LATEST incomplete state for a given session ID
    const resumeMap = new Map();
    incompletes.forEach(a => {
       const sessionId = a.metadata?.resumeSessionId || a.metadata?.test?.id;
       if (sessionId && !completedSessionIds.has(sessionId)) {
          if (!resumeMap.has(sessionId)) {
              resumeMap.set(sessionId, a);
          }
       }
    });
    
    return Array.from(resumeMap.values()); // Since incompletes are newest-first, Map maintains newest first
  }, [allActivities]);

  const handleStartTest = async (test: any) => {
    if (isGuest) {
      setShowLoginPrompt(true);
      return;
    }
    
    // Prioritize explicitly passed examId (like from PurchasesView's _resolvedExamId)
    let testExamId = test.examId || test._resolvedExamId || '';
    if (!testExamId && test.seriesId) {
      try { testExamId = JSON.parse(test.seriesId).examId || ''; } catch(e){}
    }

    if (test.isPremium && !hasAccessTo(test.id, testExamId)) {
      setPaywallPrice(test.price || 499);
      setPaywallOriginalPrice(test.originalPrice || ((test.price || 499) * 2));
      setPaywallItemTitle(test.title || 'Premium Test');
      setPaywallFeatures([
        `${test.durationMinutes || 60} Minutes Duration`,
        `${test.totalMarks || 100} Total Marks`,
        `Detailed Step-by-Step Solutions`,
        `Advanced Performance Analytics`
      ]);
      setPaywallItemId(test.id);
      setShowPaywall(true);
      return;
    }

    try {
      let finalTest = { ...test };
      
      // If questions are not loaded yet, fetch them from the database
      if (!finalTest.questions || finalTest.questions.length === 0) {
        if (!finalTest.id.startsWith('practice-')) {
          const fetchedQs = await examService.getQuestionsForMockTest(finalTest.id);
          finalTest.questions = fetchedQs;
          
          if (fetchedQs.length === 0) {
            alert("This test doesn't have any questions yet.");
            return;
          }
        }
      }

      if (isGuest) incrementGuestUsage('tests'); // This could be removed since we block guests entirely, but to avoid TS errors
      setActiveTestState({ resumeSessionId: `session-${Date.now()}` });
      setActiveTest({
        ...finalTest,
        durationMinutes: finalTest.durationMinutes || 60, // Fallback duration
      });
    } catch (error) {
      console.error(error);
      alert('Failed to start test.');
    }
  };

  const handleStartDynamicPractice = async () => {
    if (isGuest) {
      setShowLoginPrompt(true);
      return;
    }
    setLoadingPractice(true);
    try {
      const flatBanks = Object.values(dynamicQuestionBanks).flat() as any[];
      const topicBank = flatBanks.find(b => b.id === practiceSettings.topic);

      // Determine the correct examId to query — prefer selectedExam, fall back to the bank's own examId
      const effectiveExamId = selectedExam || topicBank?.examId || practiceSettings.examId;

      // Access check: if the bank is premium, verify the user has purchased it OR has purchased
      // the exam bundle it belongs to. This ensures any new banks added to an exam the user already
      // purchased are automatically unlocked for that user.
      if (topicBank?.isPremium && !hasAccessTo(topicBank.id, topicBank.examId)) {
        setPaywallPrice(topicBank.price || 499);
        setPaywallOriginalPrice(topicBank.originalPrice || ((topicBank.price || 499) * 2));
        setPaywallItemTitle(topicBank.title || 'Premium Bank');
        setPaywallFeatures([
          `${topicBank.questionCount || 500}+ Premium Questions`,
          topicBank.hasPracticeMode !== false ? 'Unlimited Practice Mode' : 'Instant PDF Access',
          'Detailed Step-by-Step Solutions',
          'Advanced Performance Analytics'
        ]);
        setPaywallItemId(topicBank.id);
        setShowPaywall(true);
        setLoadingPractice(false);
        return;
      }
      const bankTopicName = topicBank ? topicBank.title : practiceSettings.topic;

      if (!effectiveExamId) {
        alert("Could not determine which exam to load questions from. Please try opening Practice Mode from the exam page directly.");
        setLoadingPractice(false);
        return;
      }

      const { data, error } = await supabase.from('questions').select('*').eq('examId', effectiveExamId);
      if (error) throw error;
      
      let matchedQs = data || [];
      if (bankTopicName) {
        matchedQs = matchedQs.filter((q: any) => 
           (q.topic && q.topic.toLowerCase().includes(bankTopicName.toLowerCase())) || 
           (bankTopicName.toLowerCase().includes((q.topic || '').toLowerCase()))
        );
      }
      
      if (matchedQs.length === 0) {
        alert("Oh no! You haven't added any questions for this Exam in the Admin Panel yet.");
        setLoadingPractice(false);
        return;
      }

      const limit = Number(practiceSettings.questions) || matchedQs.length;
      const duration = Number(practiceSettings.timeLimit) || 30;
      const shuffled = matchedQs.sort(() => 0.5 - Math.random());
      const finalQuestions = shuffled.slice(0, limit);

      const practiceTest = {
        id: `practice-${Date.now()}`,
        title: `${bankTopicName} - Practice Session`,
        durationMinutes: duration,
        // Access was already verified above — mark as non-premium here so
        // handleStartTest does NOT show the paywall a second time for this session.
        isPremium: false,
        examId: topicBank?.examId || effectiveExamId,
        questions: finalQuestions.map(q => ({
          id: q.id,
          questionText: q.questionText,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
          explanation: q.explanation || 'No explanation provided.'
        }))
      };

      setActiveTestState({ resumeSessionId: `session-${Date.now()}` });
      handleStartTest(practiceTest);
    } catch (err) {
      console.error(err);
      alert("Failed to compile practice session.");
    } finally {
      setLoadingPractice(false);
    }
  };

  const handlePayment = async (test: any) => {
    const res = await loadRazorpay();
    if (!res) {
      alert('Razorpay SDK failed to load. Are you online?');
      return;
    }

    const options = {
      key: 'rzp_live_SeeKABRgdgfsWG', // Razorpay Live API Key
      amount: 49900,
      currency: 'INR',
      name: 'OdishaExamPrep',
      description: `Purchase ${test.title}`,
      handler: function (response: any) {
        alert('Payment Successful! Payment ID: ' + response.razorpay_payment_id);
      },
      prefill: {
        name: profile?.displayName,
        email: profile?.email
      },
      theme: {
        color: '#4f46e5'
      }
    };

    const paymentObject = new (window as any).Razorpay(options);
    paymentObject.open();
  };

  if (showAdmin) {
    return <AdminPanel onClose={() => setShowAdmin(false)} />;
  }

  if (testResults) {
    if (!testResults.test) {
      alert("Detailed question-by-question review is only available on the device where you completed the test. (Detailed performance data is kept locally to optimize account space).");
      setTestResults(null);
      return null;
    }

    // Find previous result for comparison
    const previousResult = activities
      .filter(a => a.type === 'mock_test_completed' && a.title === testResults.test.title)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]; // Most recent from history

    return <TestResultsView results={testResults} previousResult={previousResult} onClose={() => setTestResults(null)} />;
  }

  if (activeTest) {
    return (
      <MockTestSystem 
        test={activeTest} 
        initialState={activeTestState}
        onExit={(progressState) => {
          setActiveTest(null);
          setActiveTestState(null);
          // Log as incomplete whenever the user exits a test — even if they answered 0 questions.
          // "progressState.test" confirms the user actually entered the test (not a spurious exit).
          if (progressState && progressState.test) {
            const currentExamName = exams.find(e => e.id === selectedExam)?.name || 'General';
            
            let testCategory = 'Mock Test';
            if (activeTest.id.startsWith('practice-')) {
              testCategory = 'Practice Test';
            } else if (selectedMockCategory) {
              const categories: Record<string, string> = {
                'full-length': 'Full-Length Mock Test',
                'sectional': 'Sectional Test',
                'pyq': 'PYQ Test',
                'daily': 'Daily / Weekly Test'
              };
              testCategory = categories[selectedMockCategory] || 'Mock Test';
            }

            activityTracker.logActivity(user?.id, {
              type: 'test_incomplete',
              title: activeTest.title,
              metadata: {
                ...progressState,
                resumeSessionId: activeTestState?.resumeSessionId || `session-${Date.now()}`,
                examName: currentExamName,
                testCategory
              }
            });
            if (onActivityLogged) onActivityLogged();
          }
        }} 
        onComplete={(results) => {
          scrollToTop({ behavior: 'instant' });
          setActiveTest(null);
          setTestResults(results);
          const currentExamName = exams.find(e => e.id === selectedExam)?.name || 'General';
          
          let testCategory = 'Mock Test';
          if (activeTest.id.startsWith('practice-')) {
            testCategory = 'Practice Test';
          } else if (selectedMockCategory) {
            const categories: Record<string, string> = {
              'full-length': 'Full-Length Mock Test',
              'sectional': 'Sectional Test',
              'pyq': 'PYQ Test',
              'daily': 'Daily / Weekly Test'
            };
            testCategory = categories[selectedMockCategory] || 'Mock Test';
          }

          activityTracker.logActivity(user?.id, {
            type: 'mock_test_completed',
            title: activeTest.title,
            score: results.score,
            totalMarks: results.totalMarks || results.total,
            accuracy: results.accuracy || 0,
            metadata: {
              ...results,
              resumeSessionId: activeTestState?.resumeSessionId,
              examName: currentExamName,
              testCategory: testCategory
            }
          });
          if (onActivityLogged) onActivityLogged();
        }} 
      />
    );
  }

  if (mainTab === 'courses') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mb-4">
          <BookOpen className="w-10 h-10 text-brand-600" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Premium Courses</h2>
        <p className="text-slate-500 font-medium text-lg">Top-tier video courses are coming very soon. Stay tuned!</p>
      </div>
    );
  }

  if (mainTab === 'analytics') {
    return <AnalyticsView user={user} onNavigate={onNavigate} />;
  }

  if (mainTab === 'history') {
    return <HistoryView user={user} onViewResults={setTestResults} onResumeTest={(test, state) => { setActiveTest(test); setActiveTestState(state); }} />;
  }

  if (mainTab === 'library') {
    return (
      <>
        <PurchasesView 
          user={user} 
          profile={profile}
          exams={actualExams}
          mockTests={mockTests}
          testSeries={testSeries}
          dynamicQuestionBanks={dynamicQuestionBanks}
          hasAccessTo={hasAccessTo}
          loadingExams={loadingExams}
          onLaunchMockTest={(test: any) => {
             // Pass it to handleStartTest to ensure questions are loaded from DB before starting
             const examId = test.examId || test._resolvedExamId;
             handleStartTest({ ...test, type: 'mock_test', examId, examName: exams.find(e => e.id === examId)?.name });
          }}
          onLaunchBank={(bank: any) => {
             setSelectedBankItem(bank);
          }}
          onViewExam={(examId: string | null) => {
             setSelectedExam(examId);
             if (onNavigate) onNavigate('home');
             scrollToElement('exams', { block: 'start', delay: 100 });
          }}
        />
        {renderCommonModals()}
      </>
    );
  }

  if (!selectedExam) {
    let globalVideoIds: string[] | null = exams.length === 0 ? null : [];
    
    const sysSettings = exams.find(e => e.name === 'SYSTEM_SETTINGS_YOUTUBE_RESERVED');
    if (sysSettings && sysSettings.description) {
       try {
         const parsed = JSON.parse(sysSettings.description);
         if (parsed.videos && parsed.videos.length > 0) globalVideoIds = parsed.videos;
       } catch(e) {}
    }

    return (
      <div className="space-y-6 sm:space-y-10">
        <YouTubeCarousel videoIds={globalVideoIds} />
        
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div 
              onClick={() => navigate('/admin')}
              className="p-5 sm:p-8 soft-card bg-[#0f0a28] text-white border-none shadow-2xl shadow-brand-500/10 cursor-pointer group relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] premium-shine-container"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <VisualEffects />
              <div className="absolute -right-20 -top-20 w-80 h-80 bg-brand-500/20 rounded-full blur-[100px] group-hover:scale-150 transition-all duration-1000" />
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white/20 rounded-[1.75rem] flex items-center justify-center backdrop-blur-xl">
                    <Settings className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-lg sm:text-2xl font-black tracking-tight">Admin Control Center</h3>
                    <p className="text-brand-100 font-bold opacity-80 text-sm sm:text-base">Manage all system content & users</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 font-black text-xs sm:text-sm bg-white/20 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl backdrop-blur-xl group-hover:bg-white group-hover:text-brand-600 transition-all duration-500 shadow-xl shadow-brand-900/10 shrink-0">
                  Open Dashboard
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Continue Practice (horizontal snap-scroll slider) ── */}
        {!isGuest && incompleteTests.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Continue Practice</h2>
              <button
                onClick={() => onNavigate?.('history')}
                className="text-xs sm:text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors"
              >
                View All
              </button>
            </div>

            {/* Horizontal snap-scroll — bleeds to screen edges on mobile */}
            <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
                {incompleteTests.slice(0, 6).map((a: any, i: number) => {
                  // Support both full-question activities (local) and lite cloud-synced ones
                  const answeredCount = (() => {
                    try { return Object.keys(a.metadata?.answers || {}).length; } catch { return 0; }
                  })();
                  const totalCount =
                    a.metadata?.test?.questions?.length ||
                    a.metadata?.test?._questionCount ||
                    1;
                  const progressPct = Math.min(100, Math.round((answeredCount / totalCount) * 100));
                  const timeAgo = (() => {
                    try {
                      const diff = Date.now() - new Date(a.timestamp).getTime();
                      const days = Math.floor(diff / 86400000);
                      const hours = Math.floor(diff / 3600000);
                      const mins = Math.floor(diff / 60000);
                      if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
                      if (hours > 0) return `${hours}h ago`;
                      return `${mins}m ago`;
                    } catch { return 'recently'; }
                  })();

                  // Can only resume if full question data is available locally
                  const canResume = Array.isArray(a.metadata?.test?.questions) && a.metadata.test.questions.length > 0;

                  return (
                    <div
                      key={i}
                      onClick={() => {
                        if (!canResume) return; // Don't try to start a test without questions
                        setActiveTestState({ ...a.metadata, resumeSessionId: a.metadata?.resumeSessionId || a.metadata?.test?.id });
                        setActiveTest(a.metadata.test);
                      }}
                      className={`snap-start shrink-0 w-[72vw] sm:w-[300px] lg:w-[340px] bg-white rounded-2xl border border-amber-100 hover:border-amber-400 hover:shadow-md hover:shadow-amber-500/10 transition-all group active:scale-[0.97] p-4 sm:p-5 flex flex-col gap-3 ${
                        canResume ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
                      }`}
                    >
                      {/* Top row: icon + text */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30 group-hover:scale-110 transition-transform">
                          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-extrabold text-sm text-slate-900 line-clamp-1 group-hover:text-amber-600 transition-colors">{a.title || 'Practice Session'}</h4>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Last practiced {timeAgo}</p>
                          {a.metadata?.testCategory && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">{a.metadata.testCategory}</span>
                          )}
                          {!canResume && (
                            <span className="text-[9px] font-bold text-slate-400">Open app to resume</span>
                          )}
                        </div>
                      </div>
                      {/* Progress bar at bottom */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${progressPct}%` }} />
                        </div>
                        <span className="text-[10px] font-black text-amber-600 shrink-0">{progressPct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Recent Activity (completed tests & other) ── */}
        {!isGuest && activities.filter((a: any) => a.type !== 'test_incomplete').length > 0 && (
          <div className="space-y-3 sm:space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Recent Activity</h2>
              <button
                onClick={() => onNavigate?.('history')}
                className="text-xs sm:text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors"
              >
                View All
              </button>
            </div>

            {/* Horizontal snap-scroll slider — bleeds to screen edges on mobile */}
            <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2">
                {activities.filter((a: any) => a.type !== 'test_incomplete').slice(0, 6).map((a: any, i: number) => {
                  const isTestResult = a.type === 'mock_test_completed' || a.type === 'practice_test_completed';
                  const scoreLabel = a.metadata?.score !== undefined
                    ? `${a.metadata.score}/${a.metadata.totalMarks ?? a.metadata.total ?? '?'}`
                    : a.score !== undefined
                    ? `${a.score}/${a.totalMarks ?? '?'}`
                    : null;
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        if (isTestResult) setTestResults(a.metadata);
                        else if (a.type === 'question_bank_accessed' && a.metadata?.pdfUrl) window.open(a.metadata.pdfUrl, '_blank');
                      }}
                      className="snap-start shrink-0 w-[72vw] sm:w-[300px] lg:w-[340px] bg-white rounded-2xl border border-slate-100 hover:border-brand-200 hover:shadow-md hover:shadow-brand-500/10 transition-all cursor-pointer group active:scale-[0.97] flex items-center gap-3 sm:gap-4 p-4 sm:p-5"
                    >
                      {/* Icon */}
                      <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 bg-brand-500/10 text-brand-600 group-hover:scale-110 transition-transform">
                        <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-sm sm:text-base text-slate-900 line-clamp-1 group-hover:text-brand-600 transition-colors">{a.title}</h4>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-xs text-slate-400 font-medium">{new Date(a.timestamp).toLocaleDateString()}</p>
                          {scoreLabel && (
                            <span className="text-[10px] font-black text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-md">
                              {scoreLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-slate-400 font-black mt-1 uppercase tracking-widest truncate">
                          {a.metadata?.testCategory || 'Activity'}
                        </p>
                      </div>
                      {/* Arrow hint */}
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}



        <div className="flex flex-col space-y-4 sm:space-y-6">
          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="bg-slate-200/40 p-1 sm:p-1.5 rounded-[1.5rem] flex gap-1 backdrop-blur-xl shrink-0">
              <button
                onClick={() => { setActiveTab('upcoming'); setExamSearchQuery(''); }}
                className={cn(
                  "px-5 sm:px-8 py-2 sm:py-3 rounded-[1.25rem] font-black text-xs sm:text-sm transition-all duration-500",
                  (examSearchQuery ? filteredExams.some(e => e.category === 'upcoming') : activeTab === 'upcoming')
                    ? "premium-gradient text-white shadow-2xl shadow-brand-500/20 scale-[1.02]" 
                    : "text-slate-600 hover:bg-white/40"
                )}
              >
                Upcoming
              </button>
              <button
                onClick={() => { setActiveTab('popular'); setExamSearchQuery(''); }}
                className={cn(
                  "px-5 sm:px-8 py-2 sm:py-3 rounded-[1.25rem] font-black text-xs sm:text-sm transition-all duration-500",
                  (examSearchQuery ? filteredExams.some(e => e.category === 'popular') : activeTab === 'popular')
                    ? "premium-gradient text-white shadow-2xl shadow-brand-500/20 scale-[1.02]" 
                    : "text-slate-600 hover:bg-white/40"
                )}
              >
                Popular
              </button>
            </div>

            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 sm:left-5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
              <input 
                type="text"
                placeholder="Search exams..."
                value={examSearchQuery}
                onChange={(e) => setExamSearchQuery(e.target.value)}
                className="soft-input pl-10 sm:pl-14 pr-6 py-2.5 sm:py-4 rounded-[1.25rem] sm:rounded-[1.75rem] font-bold text-sm sm:text-base w-full"
              />
              {examSearchQuery && (
                <button onClick={() => setExamSearchQuery('')} className="absolute right-5 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="relative group -mx-2 px-2">
            {/* Top Fade */}
            <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-[#F8FAFC] to-transparent z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-3xl" />

            
            <div 
              className="max-h-[420px] sm:max-h-[500px] md:max-h-[600px] overflow-y-auto no-scrollbar pb-4 sm:pb-6 pt-2 rounded-2xl sm:rounded-3xl"
              style={{ 
                overscrollBehaviorY: 'auto',
                background: 'rgba(255,255,255,0.5)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(124,58,237,0.08)',
                boxShadow: '0 4px 24px rgba(124,58,237,0.06), inset 0 1px 0 rgba(255,255,255,0.8)'
              }}
              onWheel={(e) => {
                const el = e.currentTarget;
                const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 2;
                const isAtTop = el.scrollTop <= 2;
                if ((e.deltaY > 0 && isAtBottom) || (e.deltaY < 0 && isAtTop)) {
                  window.scrollBy(0, e.deltaY);
                }
              }}
            >
              <motion.div 
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6 px-1"
              >
                <AnimatePresence mode="popLayout">
                  {loadingExams ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <motion.div
                        key={`skeleton-${i}`}
                        className="h-28 sm:h-40 md:h-56 rounded-[1.25rem] sm:rounded-[1.75rem] md:rounded-[2rem] border animate-pulse"
                        style={{background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(99,102,241,0.04))', borderColor: 'rgba(124,58,237,0.1)'}}
                      />
                    ))
                  ) : filteredExams.length === 0 ? (
                    <motion.div
                      key="empty-exams"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="col-span-2 sm:col-span-3 lg:col-span-4 flex flex-col items-center justify-center py-12 text-center gap-3"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-3xl">📚</div>
                      <p className="font-black text-slate-700 text-base">
                        {examSearchQuery ? `No results for "${examSearchQuery}"` : `No ${activeTab} exams yet`}
                      </p>
                      <p className="text-slate-400 text-sm font-medium max-w-xs">
                        {examSearchQuery ? 'Try a different search term' : activeTab === 'upcoming' ? 'Switch to Popular to see available exams' : 'Exams will appear here once added'}
                      </p>
                      {!examSearchQuery && activeTab === 'upcoming' && (
                        <button onClick={() => setActiveTab('popular')} className="mt-1 px-5 py-2 text-sm font-black text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors">
                          View Popular Exams
                        </button>
                      )}
                    </motion.div>
                  ) : (
                    filteredExams.map((exam) => {
                      let displayDesc = exam.description || 'Practice mock tests and quizzes';
                      if (typeof displayDesc === 'string' && displayDesc.startsWith('JSON_METADATA_')) {
                        try {
                          const meta = JSON.parse(displayDesc.replace('JSON_METADATA_', ''));
                          displayDesc = meta.description || 'Practice mock tests and quizzes';
                        } catch(e) {}
                      }

                      return (
                      <motion.div 
                        key={exam.id}
                        initial={{ opacity: 0, scale: 0.88, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.88 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        onClick={() => {
                          setSelectedExam(exam.id);
                          scrollToElement('exams', { block: 'start', delay: 50 });
                        }}
                        className="cursor-pointer h-full card-3d-deep rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem]"
                      >
                        <div className="soft-card p-3 sm:p-6 md:p-8 h-full group/card flex flex-col items-center text-center justify-center space-y-2 sm:space-y-4 md:space-y-6 relative rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem]">
                          {/* Corner arrow - softer circle */}
                          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 md:top-5 md:right-5 w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full hidden sm:flex items-center justify-center transition-all duration-500 shadow-xl group-hover/card:premium-gradient group-hover/card:text-white" style={{background: 'rgba(124,58,237,0.05)'}}>
                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-brand-400 group-hover/card:translate-x-1 transition-transform" />
                          </div>

                          {/* Icon with super-soft glow container */}
                          <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-20 md:h-20 flex justify-center items-center shrink-0 transform group-hover/card:scale-110 transition-transform duration-700 relative">
                            <div className="absolute inset-0 rounded-full opacity-0 group-hover/card:opacity-100 transition-opacity duration-700" style={{background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', filter: 'blur(15px)'}} />
                            {(exam.icon && (exam.icon.startsWith('http') || exam.icon.startsWith('/'))) ? (
                              <img src={getDirectImageUrl(exam.icon)} alt={exam.name} className="w-full h-full object-contain filter drop-shadow-xl relative z-10" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-3xl sm:text-4xl md:text-6xl relative z-10 drop-shadow-lg">{exam.icon || '📚'}</span>
                            )}
                          </div>
                          
                          <div className="flex-1 w-full flex flex-col justify-start">
                            <h3 className="text-[13px] sm:text-[15px] md:text-xl lg:text-2xl font-black text-slate-900 group-hover/card:text-brand-600 transition-all duration-300 line-clamp-2 leading-tight tracking-tight">{exam.name}</h3>
                            <p className="hidden md:block text-slate-500 mt-3 text-sm font-bold line-clamp-2 leading-relaxed opacity-70 group-hover/card:opacity-100 transition-opacity">{displayDesc}</p>
                          </div>
                        </div>
                      </motion.div>
                    )})
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedBankType) {
    let items = (dynamicQuestionBanks[selectedBankType] || []).filter(item => item.examId === selectedExam);
    const bankTitle = selectedBankType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    if (bankSearchQuery.trim()) {
      items = items.filter(i => i.title.toLowerCase().includes(bankSearchQuery.toLowerCase()));
    }
    
    if (bankSortBy === "Most Questions") {
      items.sort((a, b) => (b.questions?.length || 0) - (a.questions?.length || 0));
    } else if (bankSortBy === "Least Questions") {
      items.sort((a, b) => (a.questions?.length || 0) - (b.questions?.length || 0));
    } else {
      items.sort((a, b) => a.title.localeCompare(b.title));
    }

    return (
      <div className="space-y-8 md:space-y-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setSelectedBankType(null)} className="p-3 rounded-2xl hover:bg-brand-50 shrink-0">
              <ChevronRight className="w-6 h-6 rotate-180 text-brand-600" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">{bankTitle}</h1>
              <p className="text-sm sm:text-base text-slate-500 font-medium">Browse available question banks</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
             <div className="relative w-full sm:w-64">
               <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Search banks..." 
                 value={bankSearchQuery}
                 onChange={e => setBankSearchQuery(e.target.value)}
                 className="w-full pl-10 pr-4 py-3 sm:py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 text-sm font-medium outline-none transition-all shadow-sm"
               />
             </div>
             <div className="relative w-full sm:w-auto">
               <select 
                 value={bankSortBy}
                 onChange={e => setBankSortBy(e.target.value)}
                 className="w-full sm:w-auto pl-4 pr-10 py-3 sm:py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 text-sm font-bold text-slate-700 outline-none transition-all cursor-pointer shadow-sm appearance-none"
               >
                  <option value="Name">Sort by Name</option>
                  <option value="Most Questions">Most Questions</option>
                  <option value="Least Questions">Least Questions</option>
               </select>
               <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                 <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
               </div>
             </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="w-full p-12 bg-white rounded-[2rem] border border-slate-200/60 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">No matching banks found</h3>
              <p className="text-slate-500">Try adjusting your search filters.</p>
            </div>
          </div>
        ) : (
          <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
            <div 
              className="max-h-[460px] md:max-h-[600px] overflow-y-auto no-scrollbar scroll-smooth pb-12 pt-4"
              style={{
                maskImage: 'linear-gradient(to bottom, transparent, black 2rem, black calc(100% - 3rem), transparent)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 2rem, black calc(100% - 3rem), transparent)'
              }}
            >
            <motion.div 
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 }
                }
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
            >
          {items.map((item) => {
            const isLocked = item.isPremium && !hasAccessTo(item.id, item.examId);
            return (
              <motion.div
                key={item.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 }
                }}
              >
                <Card 
                  onClick={() => { setSelectedBankItem(item); scrollToElement('exams', { block: 'start', delay: 50 }); }}
                  className="group cursor-pointer hover:border-brand-300 relative overflow-hidden rounded-[1.5rem] hover:-translate-y-2 transition-all duration-500 h-full border-slate-200/60 shadow-sm hover:shadow-2xl hover:shadow-brand-500/10 flex flex-col"
                >
                  <div className={cn("h-44 overflow-hidden relative shrink-0", isLocked && "blur-[2px]")}>
                    <img 
                      src={getDirectImageUrl(item.image)} 
                      alt={item.title} 
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    {isLocked && (
                      <div className="absolute inset-0 bg-slate-900/20 flex items-center justify-center">
                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                          <Lock className="w-6 h-6 text-slate-900" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={cn("p-6 flex flex-col flex-1", isLocked && "opacity-60")}>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-black text-slate-900 line-clamp-1 group-hover:text-brand-600 transition-colors uppercase tracking-tight">{item.title}</h3>
                      {isLocked && <Lock className="w-4 h-4 text-slate-400" />}
                    </div>
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-slate-500">
                        <HelpCircle className="w-4 h-4" />
                        <span className="text-xs font-bold">{item.questions} Questions</span>
                      </div>
                      <div className="flex items-center gap-2 text-brand-600 bg-brand-50/50 px-3 py-1.5 rounded-lg w-fit border border-brand-100/30">
                        <Zap className="w-3.5 h-3.5 fill-brand-600" />
                        <span className="text-[11px] font-black uppercase tracking-wider">{item.tagline}</span>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <Button variant="secondary" className="w-full py-3 rounded-xl text-sm font-black relative overflow-hidden group-hover:bg-gradient-to-r group-hover:from-brand-600 group-hover:to-brand-500 group-hover:text-white group-hover:border-transparent group-hover:shadow-lg group-hover:shadow-brand-500/20 transition-all duration-500">
                        {/* Button Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 z-10" />
                        <span className="relative z-10">{isLocked ? 'Unlock to View' : 'View Details'}</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
            </motion.div>
          </div>
        </div>
        )}
        
        {/* Common View Elements */}
        {renderCommonModals()}
      </div>
    );
  }

    const currentExam = exams.find(e => e.id === selectedExam);
    let bundlePrice = 0;
    let bundleOriginalPrice = 0;
    let examDescription = currentExam?.description || '';
    let hasBundle = false;

    if (typeof examDescription === 'string' && examDescription.startsWith('JSON_METADATA_')) {
      try {
        const meta = JSON.parse(examDescription.replace('JSON_METADATA_', ''));
        bundlePrice = meta.price;
        bundleOriginalPrice = meta.originalPrice;
        examDescription = meta.description;
        hasBundle = true;
      } catch(e) {}
    }

    return (
      <ErrorBoundary>
      <div className="space-y-12">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setSelectedExam(null)} className="p-3 rounded-2xl hover:bg-brand-50">
                <ChevronRight className="w-6 h-6 rotate-180 text-brand-600" />
              </Button>
              <div>
                <h1 className="text-3xl font-black text-slate-950 tracking-tight">
                  {currentExam?.name}
                </h1>
                <p className="text-slate-500 font-medium">Select your preparation path</p>
              </div>
            </div>
          </div>

          {/* Quick Navigation Pills */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-2 sm:gap-3"
          >
            <Button variant="outline" className="rounded-full bg-white border-slate-200/60 shadow-sm text-slate-600 font-bold hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 h-9 px-4 text-xs sm:text-sm transition-all" onClick={() => scrollToElement('question-bank-section', { block: 'start' })}>
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-brand-500" />
              Question Bank
            </Button>
            <Button variant="outline" className="rounded-full bg-white border-slate-200/60 shadow-sm text-slate-600 font-bold hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 h-9 px-4 text-xs sm:text-sm transition-all" onClick={() => scrollToElement('practice-mode-section', { block: 'start' })}>
              <Dumbbell className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-indigo-500" />
              Practice Mode
            </Button>
            <Button variant="outline" className="rounded-full bg-white border-slate-200/60 shadow-sm text-slate-600 font-bold hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 h-9 px-4 text-xs sm:text-sm transition-all" onClick={() => scrollToElement('test-series', { block: 'start' })}>
              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-amber-500" />
              Mock Tests
            </Button>
          </motion.div>
        </div>

        {/* Full Exam Access Banner - Refined for Laptop & Mobile */}
        {/* Full Exam Access Banner - Refined for Laptop & Mobile */}
        {hasBundle && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative overflow-hidden rounded-[1.5rem] lg:rounded-[2.5rem] p-[1.5px] premium-glow shadow-2xl shadow-brand-500/10 premium-shine-container mb-8"
          >
            {/* Animated Border */}
            <div className={cn(
              "absolute inset-0 animate-gradient-x opacity-80",
              hasAccessTo(`exam_bundle_${selectedExam}`) ? "bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600" : "bg-gradient-to-r from-brand-600 via-indigo-500 to-purple-600"
            )} />
            
            <div className="relative bg-[#0f0a28] rounded-[1.45rem] lg:rounded-[2.45rem] overflow-hidden">
              <VisualEffects />
              <div className={cn(
                "absolute inset-0 opacity-50",
                hasAccessTo(`exam_bundle_${selectedExam}`) ? "bg-gradient-to-br from-emerald-900/40 to-transparent" : "bg-gradient-to-br from-brand-900/40 to-transparent"
              )} />
              
              {/* Animated Floating Orbs */}
              <motion.div 
                animate={{ 
                  y: [0, -30, 0],
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.5, 0.3]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className={cn(
                  "absolute -top-20 -right-20 w-80 h-80 rounded-full blur-[120px] pointer-events-none",
                  hasAccessTo(`exam_bundle_${selectedExam}`) ? "bg-emerald-500/10" : "bg-brand-500/10"
                )}
              />
              <motion.div 
                animate={{ 
                  y: [0, 30, 0],
                  scale: [1.1, 1, 1.1],
                  opacity: [0.2, 0.4, 0.2]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className={cn(
                  "absolute -bottom-20 -left-20 w-80 h-80 rounded-full blur-[120px] pointer-events-none",
                  hasAccessTo(`exam_bundle_${selectedExam}`) ? "bg-teal-500/10" : "bg-indigo-500/10"
                )}
              />

              {/* Background Sparkles */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                      opacity: [0, 1, 0], 
                      scale: [0, 1.5, 0],
                      x: [Math.random() * 100 - 50, Math.random() * 100 - 50],
                      y: [Math.random() * 100 - 50, Math.random() * 100 - 50]
                    }}
                    transition={{ 
                      duration: 3 + Math.random() * 2, 
                      repeat: Infinity, 
                      delay: Math.random() * 5 
                    }}
                    className="absolute w-1 h-1 bg-white rounded-full blur-[1px]"
                    style={{ 
                      left: `${Math.random() * 100}%`, 
                      top: `${Math.random() * 100}%` 
                    }}
                  />
                ))}
              </div>

              <div className="relative z-10 px-6 py-8 sm:p-10 lg:p-12 flex flex-col lg:flex-row items-center justify-between gap-10">
                <motion.div 
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.1
                      }
                    }
                  }}
                  className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 flex-1"
                >
                  {/* Icon with Ring Glow */}
                  <motion.div 
                    variants={{
                      hidden: { scale: 0.8, opacity: 0 },
                      show: { scale: 1, opacity: 1 }
                    }}
                    className="relative shrink-0"
                  >
                    <div className="w-16 h-16 sm:w-20 lg:w-24 lg:h-24 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.25rem] sm:rounded-[2rem] flex items-center justify-center text-white shadow-inner transition-transform duration-700 group-hover:scale-105 group-hover:rotate-2">
                       {hasAccessTo(`exam_bundle_${selectedExam}`) ? (
                         <CheckCircle2 className="w-8 h-8 sm:w-10 lg:w-12 text-emerald-400" />
                       ) : (
                         <Award className="w-8 h-8 sm:w-10 lg:w-12 text-brand-300" />
                       )}
                    </div>
                    {/* Ring Pulse */}
                    <div className={cn(
                      "absolute inset-0 border-2 rounded-[1.25rem] sm:rounded-[2rem] animate-ping opacity-20",
                      hasAccessTo(`exam_bundle_${selectedExam}`) ? "border-emerald-500/30" : "border-brand-500/30"
                    )} />
                  </motion.div>

                  <div className="text-center sm:text-left space-y-4">
                    <motion.div 
                      variants={{
                        hidden: { y: 10, opacity: 0 },
                        show: { y: 0, opacity: 1 }
                      }}
                      className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3"
                    >
                      <span className="px-3 py-1 bg-brand-500/20 border border-brand-400/20 rounded-full text-[10px] font-black text-brand-200 uppercase tracking-widest">
                        Selection Special
                      </span>
                      <span className="hidden sm:inline-block w-1 h-1 bg-white/20 rounded-full" />
                      <span className={cn(
                        "px-3 py-1 border rounded-full text-[10px] font-black uppercase tracking-widest",
                        hasAccessTo(`exam_bundle_${selectedExam}`) ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300" : "bg-emerald-500/10 border-emerald-400/20 text-emerald-300"
                      )}>
                        {hasAccessTo(`exam_bundle_${selectedExam}`) ? 'Premium Unlocked' : 'Unlimited Access'}
                      </span>
                    </motion.div>

                    <div className="max-w-2xl">
                      <motion.h2 
                        variants={{
                          hidden: { y: 10, opacity: 0 },
                          show: { y: 0, opacity: 1 }
                        }}
                        className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight tracking-tight mb-2"
                      >
                        {hasAccessTo(`exam_bundle_${selectedExam}`) ? (
                          <>You have <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-300">Full Access</span> to {currentExam?.name}</>
                        ) : (
                          <>Get Full Access to <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-indigo-300">{currentExam?.name}</span> Pack</>
                        )}
                      </motion.h2>
                      <motion.p 
                        variants={{
                          hidden: { y: 10, opacity: 0 },
                          show: { y: 0, opacity: 1 }
                        }}
                        className="text-slate-400 text-sm sm:text-base lg:text-lg font-medium leading-relaxed"
                      >
                        {hasAccessTo(`exam_bundle_${selectedExam}`) 
                          ? 'You have unlocked lifetime access to all Question Banks, Practice Mode, Premium Mock Tests, and PDF notes. Best of luck with your preparation!'
                          : 'Get full lifetime access to all Question Banks, Practice Mode, Premium Mock Tests, PDF notes, and any future content added to this exam. Complete your preparation with the ultimate bundle.'
                        }
                      </motion.p>
                    </div>
                  </div>
                </motion.div>

                {/* Action Section - Compact on Laptop */}
                {!hasAccessTo(`exam_bundle_${selectedExam}`) ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col items-center lg:items-end gap-6 shrink-0 lg:border-l lg:border-white/5 lg:pl-12 lg:min-w-[280px]"
                  >
                    <div className="text-center lg:text-right">
                      <div className="flex flex-col sm:flex-row lg:flex-col items-center lg:items-end gap-1">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500 text-base lg:text-lg line-through font-bold">₹{bundleOriginalPrice}</span>
                          <span className="text-4xl lg:text-5xl font-black text-white font-mono tracking-tighter">₹{bundlePrice}</span>
                        </div>
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-lg border border-emerald-400/20 uppercase">
                          Save {Math.round(((bundleOriginalPrice - bundlePrice) / bundleOriginalPrice) * 100)}% Instant
                        </span>
                      </div>
                    </div>

                    <Button 
                      onClick={() => {
                        if (isGuest) {
                          setShowLoginPrompt(true);
                          return;
                        }
                        setPaywallPrice(bundlePrice);
                        setPaywallOriginalPrice(bundleOriginalPrice);
                        setPaywallItemTitle(`${currentExam?.name} Full Access Pack`);
                        setPaywallFeatures([
                          'Unlocks ALL Premium Mock Tests',
                          'Unlocks ALL Question Banks',
                          'Full Interactive Practice Mode',
                          'Advanced Performance Analytics',
                          'All PDF Downloads Included',
                          'Lifetime Validity & Updates'
                        ]);
                        setPaywallItemId(`exam_bundle_${selectedExam}`);
                        setShowPaywall(true);
                      }}
                      className="w-full sm:w-auto h-14 lg:h-16 px-10 rounded-2xl bg-white text-brand-950 font-black text-base lg:text-lg shadow-xl shadow-brand-500/10 hover:shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 group/btn relative overflow-hidden"
                    >
                      {/* Button Shine Effect */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 z-10" />
                      
                      <span className="relative z-10">Unlock All Access</span>
                      <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1.5 transition-transform relative z-10" />
                    </Button>
                    
                    <div className="flex items-center gap-2 text-brand-300/60 font-bold text-[10px] uppercase tracking-widest">
                      <Zap className="w-3 h-3 fill-brand-300/60" />
                      Instant Activation
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col items-center lg:items-end gap-4 shrink-0 lg:border-l lg:border-white/5 lg:pl-12 lg:min-w-[280px]"
                  >
                     <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center relative shadow-lg shadow-emerald-500/20">
                       <CheckCircle2 className="w-8 h-8 text-emerald-400 relative z-10" />
                       <div className="absolute inset-0 rounded-full border-2 border-emerald-400/30 animate-ping" />
                     </div>
                     <span className="text-emerald-300 font-bold uppercase tracking-widest text-xs bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">Bundle Active</span>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}

      {/* Section 1: Download Question Bank */}
      <section id="question-bank-section" className="space-y-8 scroll-mt-24">
        <div className="relative pl-4">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 rounded-full" />
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Download Question Bank</h2>
          <p className="text-slate-500 font-medium mt-1">Premium resources for your preparation</p>
        </div>
        
        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.1 }
            }
          }}
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6"
        >
          {[
            { id: 'topic-wise', title: 'Topic-wise Question Bank', desc: 'Master specific subjects with curated questions.', icon: <Layers className="w-6 h-6 sm:w-7 sm:h-7" /> },
            { id: 'exam-focused', title: 'Exam-Focused Bank', desc: 'High-yield questions tailored for this exam.', icon: <Target className="w-6 h-6 sm:w-7 sm:h-7" /> },
            { id: 'revision-sets', title: 'Revision Sets', desc: 'Quick revision modules for last-minute prep.', icon: <BookMarked className="w-6 h-6 sm:w-7 sm:h-7" /> },
            { id: 'pyq-collections', title: 'PYQ Collections', desc: 'Previous Year Questions with detailed solutions.', icon: <History className="w-6 h-6 sm:w-7 sm:h-7" /> },
          ].map((item, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { y: 20, opacity: 0 },
                show: { y: 0, opacity: 1 }
              }}
              whileHover={whileHover.liftTap}
              whileTap={whileTap.press}
            >
              <Card 
                onClick={() => { setSelectedBankType(item.id); scrollToElement('exams', { block: 'start', delay: 50 }); }}
                className="p-5 sm:p-6 lg:p-8 flex flex-col justify-between bg-gradient-to-br from-white to-slate-50/50 backdrop-blur-md border border-white/20 shadow-sm hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-500 rounded-[1.5rem] cursor-pointer group relative overflow-hidden h-full"
              >
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl group-hover:bg-brand-500/10 transition-colors" />
                
                <div className="flex-1 pb-6">
                  <div className="flex justify-between items-start mb-4 sm:mb-6">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 premium-gradient rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20 group-hover:scale-110 group-hover:premium-glow transition-all duration-500 shrink-0 relative">
                      {item.icon}
                      <div className="absolute inset-0 border-2 border-white/20 rounded-xl sm:rounded-2xl animate-pulse" />
                    </div>
                  </div>
                  <h4 className="font-extrabold text-base sm:text-lg lg:text-xl text-slate-900 mb-2 group-hover:text-brand-600 transition-colors tracking-tight line-clamp-2 md:line-clamp-none leading-snug">{item.title}</h4>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                </div>
                
                <Button className="w-full py-3 sm:py-3.5 mt-auto rounded-xl flex items-center justify-center text-xs sm:text-sm font-black premium-gradient border-none shadow-md shadow-brand-500/10 group-hover:shadow-lg group-hover:shadow-brand-500/30 transition-all pointer-events-none relative overflow-hidden">
                   {/* Button Shine Effect */}
                   <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 z-10" />
                   <span className="relative z-10">View Collection</span>
                </Button>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Section 2: Practice Mode */}
      <section id="practice-mode-section" className="space-y-6 scroll-mt-24">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Practice Mode</h2>
        </div>
        
          <Card 
            onClick={() => setShowPracticeConfig(true)}
            className="p-5 sm:p-6 md:p-8 bg-white border border-slate-200/60 shadow-xl shadow-brand-500/5 rounded-[1.5rem] md:rounded-[2rem] cursor-pointer group relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-500 hover:-translate-y-1 premium-shine-container"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand-50/50 via-white to-indigo-50/50" />
            <VisualEffects />
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl group-hover:bg-brand-500/10 transition-colors duration-700 pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors duration-700 pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 relative z-10 flex-1 w-full">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 shrink-0 premium-gradient rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/10 group-hover:scale-110 group-hover:premium-glow transition-all duration-500">
                <Play className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white fill-white/20 ml-1" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight group-hover:text-brand-600 transition-colors leading-snug">Start Practice Session</h3>
                <p className="text-xs sm:text-sm lg:text-base text-slate-500 font-medium leading-relaxed max-w-xl">Customize your practice based on targeted subjects and units.</p>
              </div>
            </div>

            <div className="relative z-10 w-full md:w-auto shrink-0 mt-2 md:mt-0">
              <Button className="w-full md:w-auto px-8 h-[48px] sm:h-[56px] rounded-xl flex items-center justify-center gap-2 text-sm sm:text-base font-black premium-gradient text-white border-none shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 group-hover:premium-glow transition-all">
                Start Practice
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </Card>

        <AnimatePresence>
          {showPracticeConfig && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-slate-900/60 pointer-events-auto"
            >
              <div className="absolute inset-0" onClick={() => setShowPracticeConfig(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-2xl overflow-hidden"
              >
                <div className="p-4 sm:p-6 md:p-8 overflow-y-auto no-scrollbar md:custom-scrollbar">

              <div className="flex justify-between items-start mb-4 md:mb-6">
                <div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900">Configure Practice</h3>
                  <p className="text-[11px] sm:text-xs md:text-sm text-slate-500 font-medium mt-0.5">Set your preferences for this session</p>
                </div>
                <Button variant="ghost" onClick={() => setShowPracticeConfig(false)} className="p-1.5 hover:bg-slate-100 rounded-lg -mr-1">
                  <X className="w-5 h-5 text-slate-400" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-4 md:mb-6">
                <div className="space-y-1.5 md:space-y-3">
                  <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Select Exam</label>
                  <SearchableSelect
                    value={practiceSettings.examId || selectedExam || ''}
                    onChange={(val) => setPracticeSettings({...practiceSettings, examId: val, category: '', topic: ''})}
                    options={actualExams.map(ex => ({ value: ex.id, label: ex.name }))}
                    placeholder="Choose an exam..."
                    searchPlaceholder="Search exams..."
                    className="px-3 md:px-4 h-[44px] md:h-[50px] rounded-lg md:rounded-xl text-sm md:text-base"
                  />
                </div>

                <div className="space-y-1.5 md:space-y-3">
                  <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Select Category</label>
                  <SearchableSelect
                    value={practiceSettings.category}
                    onChange={(val) => setPracticeSettings({...practiceSettings, category: val, topic: ''})}
                    disabled={!(practiceSettings.examId || selectedExam)}
                    options={[
                      { value: "topic-wise", label: "Topic-wise Question Bank" },
                      { value: "exam-focused", label: "Exam-Focused Bank" },
                      { value: "revision-sets", label: "Revision Sets" },
                      { value: "pyq-collections", label: "PYQ Collections" },
                    ]}
                    placeholder={(practiceSettings.examId || selectedExam) ? 'Choose a category...' : 'Select an exam first'}
                    searchPlaceholder="Search categories..."
                    className="px-3 md:px-4 h-[44px] md:h-[50px] rounded-lg md:rounded-xl text-sm md:text-base"
                  />
                </div>

                <div className="space-y-1.5 md:space-y-3 sm:col-span-2 lg:col-span-1">
                  <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Select Topic / Unit</label>
                  <SearchableSelect
                    value={practiceSettings.topic}
                    onChange={(val) => setPracticeSettings({...practiceSettings, topic: val})}
                    disabled={!practiceSettings.category}
                    options={(dynamicQuestionBanks[practiceSettings.category] || [])
                      .filter((item: any) => item.examId === (practiceSettings.examId || selectedExam))
                      .map((item: any) => ({
                         value: item.id,
                         label: `${item.title} ${item.isPremium && !hasAccessTo(item.id, item.examId) ? '(Premium)' : ''}`
                      }))}
                    placeholder={practiceSettings.category ? 'Choose a topic...' : 'Select a category first'}
                    searchPlaceholder="Search topics..."
                    className="px-3 md:px-4 h-[44px] md:h-[50px] rounded-lg md:rounded-xl text-sm md:text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
                <div className="space-y-2 md:space-y-3">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Number of Questions</label>
                    {practiceSettings.topic && (
                      <span className="text-[10px] md:text-xs font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {topicMaxQuestions} Available
                      </span>
                    )}
                  </div>
                  
                  {!practiceSettings.topic ? (
                    <div className="w-full p-2.5 md:p-3 rounded-lg md:rounded-xl border border-slate-200 bg-slate-50 text-slate-400 font-bold text-center text-xs md:text-sm">
                      Select a topic first
                    </div>
                  ) : topicMaxQuestions === 0 ? (
                    <div className="w-full p-2.5 md:p-3 rounded-lg md:rounded-xl border border-rose-100 bg-rose-50 text-rose-500 font-bold text-center text-xs md:text-sm">
                      No questions available yet
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <input 
                        type="range" 
                        min="1" 
                        max={topicMaxQuestions} 
                        value={practiceSettings.questions} 
                        onChange={(e) => setPracticeSettings({...practiceSettings, questions: e.target.value})}
                        className="flex-1 accent-indigo-600 h-1.5 md:h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="relative w-16 md:w-20 shrink-0">
                        <input
                          type="number"
                          min="1"
                          max={topicMaxQuestions}
                          value={practiceSettings.questions}
                          onChange={(e) => {
                             let val = parseInt(e.target.value);
                             if (isNaN(val)) val = 1;
                             if (val > topicMaxQuestions) val = topicMaxQuestions;
                             if (val < 1) val = 1;
                             setPracticeSettings({...practiceSettings, questions: val.toString()});
                          }}
                          className="w-full p-2 md:p-2.5 rounded-lg md:rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-black text-slate-800 text-center text-xs md:text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 md:space-y-3">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Time Limit (Minutes)</label>
                  </div>
                  
                  {!practiceSettings.topic ? (
                    <div className="w-full p-2.5 md:p-3 rounded-lg md:rounded-xl border border-slate-200 bg-slate-50 text-slate-400 font-bold text-center text-xs md:text-sm">
                      Select a topic first
                    </div>
                  ) : topicMaxQuestions === 0 ? (
                    <div className="w-full p-2.5 md:p-3 rounded-lg md:rounded-xl border border-rose-100 bg-rose-50 text-rose-500 font-bold text-center text-xs md:text-sm">
                      -
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <input 
                        type="range" 
                        min="1" 
                        max="180" 
                        value={practiceSettings.timeLimit} 
                        onChange={(e) => setPracticeSettings({...practiceSettings, timeLimit: e.target.value})}
                        className="flex-1 accent-indigo-600 h-1.5 md:h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="relative w-16 md:w-20 shrink-0 flex items-center bg-white rounded-lg md:rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all overflow-hidden pr-1.5 md:pr-2">
                        <input
                          type="number"
                          min="1"
                          max="180"
                          value={practiceSettings.timeLimit}
                          onChange={(e) => {
                             let val = parseInt(e.target.value);
                             if (isNaN(val)) val = 1;
                             if (val > 180) val = 180;
                             if (val < 1) val = 1;
                             setPracticeSettings({...practiceSettings, timeLimit: val.toString()});
                          }}
                          className="w-full p-2 md:p-2.5 pr-0.5 md:pr-1 outline-none font-black text-slate-800 text-center bg-transparent appearance-none text-xs md:text-sm"
                        />
                         <span className="text-[10px] md:text-xs font-bold text-slate-400">m</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 md:mt-8 flex justify-center w-full">
                <Button 
                  disabled={!practiceSettings.topic || loadingPractice || topicMaxQuestions === 0}
                  className="w-full sm:w-auto px-6 sm:px-12 py-3 md:py-3.5 rounded-xl md:rounded-2xl text-sm sm:text-base font-black bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none sm:min-w-[280px]"
                  onClick={handleStartDynamicPractice}
                >
                  {loadingPractice ? 'Compiling...' : 'Start Practice Session'}
                </Button>
              </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Section 3: Mock Tests */}
      <section id="test-series" className="space-y-10 scroll-mt-24">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-brand-600 font-black text-[10px] uppercase tracking-[0.2em] bg-brand-50 w-fit px-3 py-1 rounded-full border border-brand-100">
            <Award className="w-3 h-3" />
            Test Series
          </div>
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 sm:gap-6">
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">Mock Tests</h2>
              <p className="text-slate-500 text-sm sm:text-lg font-medium mt-1 sm:mt-2 leading-relaxed">Simulate the real exam environment with our expert-curated test series.</p>
            </div>
            <div className="flex items-center gap-3 bg-white/50 px-4 py-2 rounded-full border border-slate-200/50 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-brand-500" />
              <span className="text-sm font-bold text-slate-700">
              Updated for {new Date().getFullYear()} Exam Pattern
              </span>
            </div>
          </div>
        </div>

        {(() => {
          const renderMockTestCard = (test: any) => {
            let isPremium = test.isPremium;
            let price = test.price || 499;
            let testExamId = '';
            if (isPremium === undefined || test.seriesId) {
              try { 
                const parsed = JSON.parse(test.seriesId);
                isPremium = parsed.isPremium || false; 
                price = parsed.price || 499;
                testExamId = parsed.examId || '';
              } catch(e) {}
            }
            const isLocked = isPremium && !hasAccessTo(test.id, testExamId);
            const isPremiumUnlocked = isPremium && hasAccessTo(test.id, testExamId);

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card 
                  key={test.id} 
                  className={cn("p-6 bg-white border-slate-200/60 shadow-lg shadow-slate-200/30 rounded-[1.5rem] hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-500/10 hover:border-brand-200 group transition-all duration-500 cursor-pointer flex flex-col gap-6 relative overflow-hidden", isLocked && "border-amber-200/50 hover:border-amber-300", isPremiumUnlocked && "border-emerald-200/50 hover:border-emerald-300")}
                  onClick={() => handleStartTest({ ...test, isPremium, price })}
                >
                  {isPremiumUnlocked && <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />}
                  <div className="flex items-start justify-between relative z-10 w-full">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-md text-white transition-transform group-hover:scale-110 relative", isLocked ? "bg-gradient-to-br from-amber-400 to-orange-500" : isPremiumUnlocked ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-indigo-500 to-purple-600")}>
                        <Target className="w-6 h-6" />
                        <div className="absolute inset-0 border-2 border-white/20 rounded-xl animate-pulse" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-black text-xl text-slate-950 tracking-tight group-hover:text-brand-600 transition-colors uppercase leading-tight">{test.title}</h4>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Official Mock</span>
                      </div>
                    </div>
                    {isPremium && (
                      <div className="flex shrink-0">
                        {isLocked ? (
                          <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl border border-amber-100 flex items-center justify-center shadow-sm" aria-label="Premium Locked">
                            <Lock className="w-5 h-5 fill-amber-500/20" />
                          </div>
                        ) : (
                          <div className="bg-emerald-50 text-emerald-600 px-2.5 py-1 flex items-center gap-1.5 rounded-lg border border-emerald-100 text-[10px] font-black uppercase tracking-widest shadow-sm" aria-label="Premium Unlocked">
                            <CheckCircle2 className="w-3 h-3" />
                            Premium Active
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4 flex-1 relative z-10 pt-2">
                    <div className="flex gap-4 text-xs font-bold text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded"><Clock className="w-3.5 h-3.5 text-brand-500"/> {test.durationMinutes} Mins</span>
                      <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded"><Award className="w-3.5 h-3.5 text-brand-500"/> {test.totalMarks} Marks</span>
                      <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded"><FileText className="w-3.5 h-3.5 text-brand-500"/> {test.questions?.length || test._questionCount || 0} Qs</span>
                    </div>
                  </div>
                  
                  <Button 
                    variant={isLocked ? "outline" : "primary"}
                    className={cn("w-full h-[48px] rounded-xl font-black text-sm relative z-10 transition-all overflow-hidden group/btn", !isLocked && "premium-gradient text-white shadow-lg shadow-brand-500/20 group-hover:premium-glow", isLocked && "border-amber-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700")}
                  >
                    {/* Button Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 z-10" />

                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isLocked ? (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Unlock to Access
                        </>
                      ) : (
                        <>
                          Start Test Now
                          <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 duration-300" />
                        </>
                      )}
                    </span>
                  </Button>
                </Card>
              </motion.div>
            );
          };

          if (!selectedMockCategory) return (
              <motion.div 
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { staggerChildren: 0.1 }
                  }
                }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:gap-8 gap-4 sm:gap-6"
              >
                {[
                  { id: 'full-length', title: 'Full-Length Mock Tests', desc: 'Complete exam simulation with real-time ranking.', icon: <Award className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'from-amber-400 to-orange-500', tag: 'Most Popular' },
                  { id: 'sectional', title: 'Sectional Tests', desc: 'Focus on specific sections to improve your score.', icon: <Target className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'from-blue-400 to-indigo-500', tag: 'Recommended' },
                  { id: 'pyq', title: 'PYQ Tests', desc: 'Practice with actual previous year papers.', icon: <History className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'from-purple-400 to-pink-500', tag: 'High Yield' },
                  { id: 'daily', title: 'Daily / Weekly Tests', desc: 'Regular assessments to track your progress.', icon: <Clock className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'from-emerald-400 to-teal-500', tag: 'Consistency' },
                ].map((test, i) => (
                  <motion.div
                    key={i}
                    variants={{
                      hidden: { opacity: 0, scale: 0.95, y: 10 },
                      show: { opacity: 1, scale: 1, y: 0 }
                    }}
                  >
                    <Card 
                      className="p-5 sm:p-6 lg:p-8 bg-white border-slate-200/60 shadow-lg shadow-slate-200/30 rounded-[2rem] hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-500/10 hover:border-brand-200 group transition-all duration-500 cursor-pointer flex flex-col gap-4 sm:gap-6 relative overflow-hidden h-full"
                      onClick={() => setSelectedMockCategory(test.id)}
                    >
                      <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                        <div className={cn(
                          "w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-md bg-gradient-to-br text-white transition-transform group-hover:scale-110 relative",
                          test.color
                        )}>
                          {test.icon}
                          <div className="absolute inset-0 border-2 border-white/20 rounded-2xl animate-pulse" />
                        </div>
                        <h4 className="font-black text-xl sm:text-2xl text-slate-950 tracking-tight leading-tight group-hover:text-brand-600 transition-colors uppercase">{test.title}</h4>
                      </div>
                      
                      <div className="space-y-4 flex-1 relative z-10">
                        <p className="text-slate-500 font-medium text-xs sm:text-sm leading-relaxed">{test.desc}</p>
                        <div className="flex">
                          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-slate-50 text-slate-400 rounded-lg border border-slate-100 group-hover:bg-brand-50 group-hover:text-brand-600 group-hover:border-brand-100 transition-colors">
                            {test.tag}
                          </span>
                        </div>
                      </div>

                      <Button 
                        className="w-full h-[48px] sm:h-[56px] mt-2 rounded-xl flex items-center justify-center gap-2 font-black text-sm sm:text-base premium-gradient text-white shadow-lg shadow-brand-500/20 group-hover:premium-glow transition-all relative z-10 pointer-events-none overflow-hidden"
                      >
                        {/* Button Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 z-10" />
                        <span className="relative z-10">Explore Tests</span>
                        <ChevronRight className="w-4 h-4 sm:ml-1 group-hover:translate-x-1 transition-transform relative z-10" />
                      </Button>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            );

          return (
            <div className="space-y-8">
              <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
                <Button variant="ghost" onClick={() => setSelectedMockCategory(null)} className="p-3 rounded-2xl hover:bg-brand-50">
                  <ChevronRight className="w-6 h-6 rotate-180 text-brand-600" />
                </Button>
                <div className="flex items-center gap-4">
                  <h3 className="text-3xl font-black text-slate-900 capitalize flex items-center gap-3">
                    {selectedMockCategory.replace('-', ' ')} Tests
                  </h3>
                  {selectedMockCategory === 'sectional' && (
                    <span className="bg-brand-100 text-brand-600 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border border-brand-200">Subject-Wise</span>
                  )}
                </div>
              </div>
            
              {(() => {
                const matchingTests = mockTests.filter(mt => {
                  try {
                    const cfg = JSON.parse(mt.seriesId);
                    return cfg.examId === selectedExam && cfg.category === selectedMockCategory;
                  } catch(e) { return false; }
                });

                if (matchingTests.length === 0) {
                  return (
                    <div className="p-8 text-center bg-slate-50 rounded-[2rem] border border-slate-200 text-slate-500 font-bold">
                      No tests found in this category for the selected exam.
                    </div>
                  );
                }

                if (selectedMockCategory === 'sectional') {
                  const groupedBySubject = matchingTests.reduce((acc, mt) => {
                    const subj = JSON.parse(mt.seriesId).subject || 'General';
                    if (!acc[subj]) acc[subj] = [];
                    acc[subj].push(mt);
                    return acc;
                  }, {} as Record<string, any[]>);

                  return (
                    <div className="space-y-12">
                      {Object.entries(groupedBySubject).map(([subject, tests]) => (
                        <div key={subject} className="space-y-6">
                          <h4 className="text-xl font-black text-brand-700 px-5 py-2.5 bg-brand-50/80 rounded-xl inline-block border border-brand-100/50 shadow-sm">{subject}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(tests as any[]).map(test => renderMockTestCard(test))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {matchingTests.map(test => renderMockTestCard(test))}
                  </div>
                );
              })()}
            </div>
          );
        })()}
      </section>

      {/* Common View Elements */}
      {renderCommonModals()}
    </div>
    </ErrorBoundary>
  );
};

const WhatsAppButton = () => {
  const { user } = useAuth();
  const [isTestMode, setIsTestMode] = useState(false);

  // Listen for body attribute changes set by DashboardContent when a test is active
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsTestMode(document.body.hasAttribute('data-test-mode'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-test-mode'] });
    return () => observer.disconnect();
  }, []);

  if (isTestMode) return null;

  const defaultMessage = "Hello! I am reaching out from the OdishaExamPrep website. I have a query.";
  const userMessage = user?.email ? `Hello! I am ${user.email} reaching out from the OdishaExamPrep website. I have a query.` : defaultMessage;
  const whatsappUrl = `https://wa.me/917377431715?text=${encodeURIComponent(userMessage)}`;

  return (
    <motion.a 
      href={whatsappUrl}
      target="_blank" 
      rel="noopener noreferrer"
      initial={{ opacity: 0, scale: 0.5, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={whileHover.subtle}
      whileTap={whileTap.pressMedium}
      className={cn(
        "fixed right-4 sm:right-8 z-[100] group transition-all duration-500",
        user ? "bottom-[100px] sm:bottom-8" : "bottom-6 sm:bottom-8"
      )}
    >
      {/* Outer Pulsing Ring */}
      <div className="absolute inset-0 bg-[#25D366] rounded-full animate-ping opacity-20 group-hover:opacity-40 transition-opacity" />
      
      {/* Main Button */}
      <div className="relative w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgb(37,211,102,0.4)] group-hover:shadow-[0_15px_45px_rgb(37,211,102,0.6)] transition-all duration-500 overflow-hidden">
        {/* Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 sm:w-9 sm:h-9 drop-shadow-md">
          <path d="M12.031 0C5.385 0 0 5.385 0 12.029a12.022 12.022 0 001.6 6.02L0 24l6.15-1.611a12.012 12.012 0 005.881 1.523h.004c6.645 0 12.03-5.386 12.03-12.031S18.675 0 12.031 0zm0 21.936a9.988 9.988 0 01-5.086-1.385l-.364-.216-3.774.99.998-3.682-.236-.376A9.957 9.957 0 012.064 12.03c0-5.497 4.475-9.972 9.972-9.972 5.497 0 9.97 4.475 9.97 9.972s-4.473 9.97-9.97 9.97z"/>
          <path d="M17.481 14.159c-.297-.149-1.758-.868-2.03-.968-.27-.099-.467-.149-.665.149-.198.298-.767.967-.94 1.165-.173.198-.346.223-.644.074a8.214 8.214 0 01-4.041-2.518c-.282-.326.319-.314.901-1.479.098-.198.05-.371-.025-.52-.075-.149-.665-1.605-.91-2.196-.241-.578-.485-.5-.665-.509-.174-.01-.57-.01-.198 0-.52.074-.792.371C6.822 7.027 6 7.82 6 9.381c0 1.56 1.015 3.07 1.164 3.268.149.198 2.228 3.4 5.397 4.76 2.656 1.139 3.554 1.259 4.314 1.05.76-.208 2.03-.896 2.316-1.761.286-.865.286-1.605.2-1.76-.086-.15-.286-.24-.584-.388z"/>
        </svg>

        {/* Live Indicator Dot */}
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full flex items-center justify-center">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Premium Tooltip */}
      <div className="absolute right-full mr-6 top-1/2 -translate-y-1/2 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 pointer-events-none hidden md:block">
        <div className="glass px-5 py-3 rounded-2xl shadow-2xl border border-white/20 min-w-[180px] space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Support Online</span>
          </div>
          <p className="text-slate-800 font-extrabold text-sm">Need any help?</p>
          <p className="text-slate-500 text-[11px] font-medium leading-tight">Chat with our experts now for instant support.</p>
        </div>
        {/* Triangle Arrow */}
        <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 glass border-r border-t border-white/20 rotate-45 rounded-sm" />
      </div>
    </motion.a>
  );
};

// --- Main App ---

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    scrollToTop({ behavior: 'auto' });
  }, [pathname]);

  return null;
};

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const { user, loading, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState<'home' | 'courses' | 'analytics' | 'history' | 'library'>('home');
  const [dashboardKey, setDashboardKey] = useState(0);
  const [activities, setActivities] = useState<any[]>([]);

  // Clean up stale sessionStorage key that previously caused Practice Mode
  // to reopen unexpectedly when navigating to Dashboard from Library tab.
  useEffect(() => {
    sessionStorage.removeItem('oep_showPracticeConfig');
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // Load activities (merges local + cloud, prefers local which has full question data)
    const initialActivities = activityTracker.getActivities(user.id, user.user_metadata);
    setActivities(initialActivities);

    // ── One-time metadata repair for old accounts ──────────────────────────────
    // Run whenever user_metadata is large (> 2KB). Strips ALL heavy session state
    // (answers, markedForReview, timeSpent, questions) so the JWT stays small.
    const cloudActivities = user.user_metadata?.activities;
    const metaSize = JSON.stringify(user.user_metadata || {}).length;
    if (Array.isArray(cloudActivities) && metaSize > 2000) {
      const repaired = cloudActivities.slice(0, 30).map((a: any) => {
        if (!a) return null;
        const m = a.metadata || {};
        const lightMeta: any = {
          examName: m.examName,
          testCategory: m.testCategory,
          bankType: m.bankType,
          bankId: m.bankId,
          resumeSessionId: m.resumeSessionId,
        };
        if (a.type === 'test_incomplete') {
          lightMeta.currentQuestionIndex = m.currentQuestionIndex;
          lightMeta.timeLeft = m.timeLeft;
          lightMeta.totalQuestions = m.totalQuestions || 0;
          if (m.test && typeof m.test === 'object') {
            lightMeta.test = {
              id: m.test.id,
              title: m.test.title,
              durationMinutes: m.test.durationMinutes,
              _questionCount: m.test._questionCount ||
                (Array.isArray(m.test.questions) ? m.test.questions.length : 0),
            };
          }
        }
        return { id: a.id, type: a.type, title: a.title, timestamp: a.timestamp,
                 score: a.score, accuracy: a.accuracy, metadata: lightMeta };
      }).filter(Boolean);
      // Fire-and-forget — don't await so it doesn't block anything
      import('./lib/supabase').then(({ supabase }) => {
        supabase.auth.updateUser({ data: { activities: repaired } }).catch(
          (e: any) => console.warn('Metadata repair failed (non-fatal):', e)
        );
      });
    }
    // ─────────────────────────────────────────────────────────────────────────
  }, [user?.id, user?.user_metadata]);

  // Clear dashboard cache on logout so a different account sees fresh data
  useEffect(() => {
    if (!user) {
      _dashboardCache.exams = [];
      _dashboardCache.testSeries = [];
      _dashboardCache.mockTests = [];
      _dashboardCache.dynamicQuestionBanks = {};
      _dashboardCache.loadedForUserId = null;
    }
  }, [user]);

  const refreshActivities = () => {
    if (user?.id) {
       const updated = activityTracker.getActivities(user.id, user.user_metadata);
       setActivities(updated);
    }
  };

  const handleHomeClick = () => {
    setMainTab('home');
    setDashboardKey(prev => prev + 1);
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      <AnimatedRoutes>
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:id" element={<BlogPost />} />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requireAdmin>
              <AdminDashboardPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/" 
          element={
            !user ? (
              <LandingPage />
            ) : (
              <div className="flex flex-col min-h-screen">
                <Navbar user={user} isAdmin={isAdmin} onHomeClick={handleHomeClick} />

                <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pt-4 md:pt-8 overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${mainTab}-${dashboardKey}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3 }}
                      className="w-full"
                    >
                      <DashboardContent mainTab={mainTab} user={user} activities={activities} onNavigate={setMainTab} onActivityLogged={refreshActivities} />
                    </motion.div>
                  </AnimatePresence>
                </main>

                {/* Mobile Bottom Nav */}
                <nav className="glass border-t border-slate-200/50 px-2 sm:px-8 py-3 sm:py-4 flex justify-around items-center sticky bottom-0 z-30 rounded-t-[2rem]">
                  <button onClick={handleHomeClick} className={`flex flex-col items-center gap-1 sm:gap-1.5 group ${mainTab === 'home' ? 'text-brand-600' : 'text-slate-400'}`}>
                    <div className={`p-1.5 sm:p-2 rounded-xl group-hover:scale-110 transition-transform ${mainTab === 'home' ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                      <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide sm:tracking-widest">Home</span>
                  </button>
                  <button onClick={() => setMainTab('courses')} className={`flex flex-col items-center gap-1 sm:gap-1.5 group ${mainTab === 'courses' ? 'text-brand-600' : 'text-slate-400'}`}>
                    <div className={`p-1.5 sm:p-2 rounded-xl group-hover:scale-110 transition-transform ${mainTab === 'courses' ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                      <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide sm:tracking-widest">Courses</span>
                  </button>
                  <button onClick={() => setMainTab('analytics')} className={`flex flex-col items-center gap-1 sm:gap-1.5 group ${mainTab === 'analytics' ? 'text-brand-600' : 'text-slate-400'}`}>
                    <div className={`p-1.5 sm:p-2 rounded-xl group-hover:scale-110 transition-transform ${mainTab === 'analytics' ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                      <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide sm:tracking-widest">Analytics</span>
                  </button>
                  <button onClick={() => setMainTab('history')} className={`flex flex-col items-center gap-1 sm:gap-1.5 group ${mainTab === 'history' ? 'text-brand-600' : 'text-slate-400'}`}>
                    <div className={`p-1.5 sm:p-2 rounded-xl group-hover:scale-110 transition-transform ${mainTab === 'history' ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                      <History className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide sm:tracking-widest">History</span>
                  </button>
                  <button onClick={() => setMainTab('library')} className={`flex flex-col items-center gap-1 sm:gap-1.5 group ${mainTab === 'library' ? 'text-brand-600' : 'text-slate-400'}`}>
                    <div className={`p-1.5 sm:p-2 rounded-xl group-hover:scale-110 transition-transform ${mainTab === 'library' ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                      <BookMarked className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide sm:tracking-widest">Library</span>
                  </button>
                </nav>
              </div>
            )
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </AnimatedRoutes>
      <WhatsAppButton />
    </div>
  );
}
