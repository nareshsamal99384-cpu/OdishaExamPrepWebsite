import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrowserRouter, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  LayoutDashboard, 
  History, 
  Settings, 
  LogOut, 
  ChevronLeft,
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Clock, 
  Target, 
  Award,
  Search,
  Filter,
  Lock,
  Play,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  Trash2,
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
  Clock3,
  MessageSquare
} from 'lucide-react';
import { Toaster, toast, useToasterStore } from 'react-hot-toast';
import { useAuth } from './lib/AuthContext';
import { supabase } from './lib/supabase';
import { cn, getDirectImageUrl } from './lib/utils';
import { examService } from './lib/examService';
import { DEFAULT_ACHIEVERS_JOURNAL } from './lib/defaultAchievers';
import { useScrollSpy } from './hooks/useScrollSpy';
import { scrollToElement, scrollToTop } from './lib/scrollManager';
import AnimatedRoutes from './components/AnimatedRoutes';
import { sectionReveal, sectionRevealSimple, sectionRevealScale, fadeSlideRight, scaleIn, barGrow, whileHover, whileTap, modalBackdrop, slideUpPanel, durations, easings } from './lib/animations';
import { ErrorBoundary } from './ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { activityTracker } from './lib/activityTracker';
import { MathTextRenderer, DiagramRenderer } from './components/MathTextRenderer';

const AdminPanel = React.lazy(() => import('./AdminPanel'));
const MockTestSystem = React.lazy(() => import('./MockTestSystem'));
const TestResultsView = React.lazy(() => import('./TestResultsView'));
import AnalyticsView from './AnalyticsView';
const AdminLoginPage = React.lazy(() => import('./pages/AdminLoginPage'));
const AdminDashboardPage = React.lazy(() => import('./pages/AdminDashboardPage'));
const PrivacyPolicy = React.lazy(() => import('./PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./TermsOfService'));
const RefundPolicy = React.lazy(() => import('./RefundPolicy'));
const SearchableSelect = React.lazy(() => import('./components/SearchableSelect'));
const YouTubeCarousel = React.lazy(() => import('./components/YouTubeCarousel'));
const BlogList = React.lazy(() => import('./pages/BlogList'));
const BlogPost = React.lazy(() => import('./pages/BlogPost'));
const AiMentor = React.lazy(() => import('./pages/AiMentor'));
import StickyAICompanion from './components/StickyAICompanion';
import LoadingPortal from './components/LoadingPortal';

const HistoryView = ({ 
  user, 
  onViewResults, 
  onResumeTest,
  onActivityDeleted,
  onNavigate
}: { 
  user: any, 
  onViewResults?: (results: any) => void, 
  onResumeTest?: (test: any, state: any) => void,
  onActivityDeleted?: () => void,
  onNavigate?: (tab: string) => void
}) => {
  const [activities, setActivities] = useState<any[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const loadActivities = useCallback(() => {
    const raw = activityTracker.getActivities(user?.id, user?.user_metadata);
    setActivities(raw);
  }, [user]);

  useEffect(() => {
    loadActivities();
    window.addEventListener('oep-activity-changed', loadActivities);
    return () => window.removeEventListener('oep-activity-changed', loadActivities);
  }, [loadActivities]);

  const handleDeleteActivity = async (activityId: string) => {
    if (!user?.id) return;
    await activityTracker.deleteActivity(user.id, activityId);
    setConfirmDeleteId(null);
    toast.success("Activity deleted from history");
    loadActivities();
    onActivityDeleted?.();
  };

  const handleClearAll = async () => {
    if (!user?.id) return;
    await activityTracker.clearActivities(user.id);
    setConfirmClearAll(false);
    toast.success("Activity history cleared");
    loadActivities();
    onActivityDeleted?.();
  };

  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 sm:p-16 text-center space-y-6 bg-gradient-to-b from-white to-slate-50/40 rounded-[2.5rem] border border-slate-200/40 shadow-[0_20px_50px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,1)] relative overflow-hidden py-16">
        <div className="absolute inset-0 grid-bg opacity-[0.01]" />
        <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-brand-50/50 mb-2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center shadow-inner">
            <History className="w-8 h-8 text-brand-600 animate-float-sm" />
          </div>
        </div>
        <div className="space-y-2 relative z-10 max-w-sm">
          <h2 className="text-2xl font-serif font-extrabold bg-gradient-to-r from-brand-700 to-brand-500 bg-clip-text text-transparent">No History Yet</h2>
          <p className="text-slate-500 font-semibold text-xs sm:text-sm leading-relaxed">
            Start taking mock tests, practicing custom quizzes, or analyzing your stats to see your detailed progress logs here.
          </p>
        </div>
        <button
          onClick={() => {
            if (onNavigate) {
              onNavigate('home');
              setTimeout(() => {
                scrollToElement('exams', { block: 'start' });
              }, 100);
            } else {
              scrollToElement('exams', { block: 'start' });
            }
          }}
          className="relative z-10 premium-gradient text-white flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:premium-glow hover:scale-[1.02] active:scale-98 transition-all duration-300 shadow-md cursor-pointer border-none"
        >
          Explore Mock Tests
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-100 pb-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/50 flex items-center justify-center shrink-0">
              <History className="w-5.5 h-5.5 text-[#8A1C36]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-none">Your Activity History</h2>
          </div>

          {activities.length > 0 && (
            <div className="shrink-0">
              {confirmClearAll ? (
                <div className="flex items-center gap-1.5 sm:gap-2 animate-in fade-in duration-200">
                  <span className="text-[10px] sm:text-xs font-semibold text-slate-500 hidden xs:inline">Clear all?</span>
                  <button
                    onClick={async () => {
                      await handleClearAll();
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-wider cursor-pointer border-none shadow-sm"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmClearAll(false)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-black uppercase tracking-wider cursor-pointer border-none"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClearAll(true)}
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-50 hover:bg-rose-50/70 text-slate-500 hover:text-rose-600 border border-slate-200/60 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          )}
        </div>
        <p className="text-[10px] sm:text-xs font-semibold text-slate-400 pl-0 sm:pl-[52px]">
          Manage and track your exam mock tests and practice sessions
        </p>
      </div>

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
                "relative bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/50 flex items-center justify-between transition-all group overflow-hidden history-card",
                isInteractive ? "cursor-pointer hover:border-brand-500 hover:shadow-lg hover:shadow-brand-500/10" : ""
              )}
            >
              {/* Confirm Single Delete Overlay */}
              {confirmDeleteId === a.id && (
                <div 
                  className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-6 z-20 animate-in fade-in duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-800 text-center">Delete this activity from your history?</span>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        await handleDeleteActivity(a.id);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider cursor-pointer border-none shadow-md shadow-rose-600/20 active:scale-95 transition-all"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] sm:text-xs font-black uppercase tracking-wider cursor-pointer border-none active:scale-95 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="flex-1 min-w-0 pr-4">
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
                     <span className="inline-flex items-center px-2 py-0.5 bg-brand-50 text-brand-600 rounded text-[10px] font-bold uppercase tracking-wider">
                       Incomplete
                     </span>
                   )}
                 </div>
                 <h4 className={cn("font-bold text-base sm:text-lg text-slate-900 transition-colors truncate", isInteractive && "group-hover:text-brand-600")}>{a.title}</h4>
                 <p className="text-xs sm:text-sm text-slate-500">{new Date(a.timestamp).toLocaleString()}</p>
                 {a.type === 'question_bank_accessed' && (
                    <div className="inline-flex items-center px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold mt-3 transition-colors group-hover:bg-blue-100">
                      <Download className="w-3.5 h-3.5 mr-1.5" /> 
                      {isDownloadable ? 'Download Again' : 'Downloaded Item'}
                    </div>
                 )}
              </div>
              
              <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                 {a.type === 'test_incomplete' && (
                   <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black uppercase text-brand-600 mb-1">In Progress</span>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold">{Object.keys(a.metadata?.answers || {}).length} Answered</span>
                      </div>
                   </div>
                 )}
                 
                 {a.score !== undefined && (
                   <div className="text-right">
                      <span className="font-bold text-brand-600 text-lg sm:text-xl">{typeof a.score === 'number' ? Number(a.score.toFixed(2)) : a.score}/{a.totalMarks}</span>
                      <p className="text-[10px] sm:text-xs font-semibold text-slate-400">{Math.round(a.accuracy || 0)}% Accuracy</p>
                   </div>
                 )}
                
                 {(isTestResult || a.type === 'test_incomplete') && (
                   <div className={cn(
                     "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all bg-brand-50 text-brand-600 group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white"
                   )}>
                     {a.type === 'test_incomplete' ? <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" /> : <ChevronRight className="w-4.5 h-4.5 sm:w-5 sm:h-5 ml-0.5" />}
                   </div>
                 )}

                 {/* Delete Button */}
                 <button
                   onClick={(e) => {
                     e.stopPropagation();
                     setConfirmDeleteId(a.id);
                   }}
                   className="delete-btn p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 transition-all cursor-pointer border-none bg-transparent"
                   title="Delete from history"
                 >
                   <Trash2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                 </button>
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
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// --- Components ---

import { Button, Card } from './components/ui';
export { Button, Card };

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

// --- Custom Portal Sections (Refined Educational Editorial) ---

const EXAM_REGISTRY_STATUS_MAP: Record<string, { label: string; color: string }> = {
  'notification': { label: 'Notification Released', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  'admit-card':   { label: 'Admit Card Out',        color: 'bg-amber-50 text-amber-700 border-amber-100' },
  'applications': { label: 'Applications Active',   color: 'bg-blue-50 text-blue-700 border-blue-100' },
  'result':       { label: 'Result Declared',       color: 'bg-purple-50 text-purple-700 border-purple-100' },
  'postponed':    { label: 'Postponed',             color: 'bg-rose-50 text-rose-700 border-rose-100' },
  'upcoming':     { label: 'Upcoming',              color: 'bg-slate-50 text-slate-600 border-slate-200' },
};

const EXAM_REGISTRY_DEFAULT = [
  { exam: 'OPSC Civil Services Examination (OCS)', status: 'notification', date: 'Prelims: July 15, 2026', actionLabel: 'Practice OPSC', examKey: 'opsc' },
  { exam: 'OSSC Combined Graduate Level (CGL)', status: 'admit-card', date: 'Exam: June 28, 2026', actionLabel: 'Practice OSSC', examKey: 'ossc' },
  { exam: 'OSSSC RI/ARI & Amin Recruitment', status: 'applications', date: 'Closing: June 30, 2026', actionLabel: 'Practice OSSSC', examKey: 'osssc' },
];

const ExamRegistrySection = ({ 
  setSelectedExam, 
  exams 
}: { 
  setSelectedExam: (id: string | null) => void; 
  exams: any[] 
}) => {
  const [announcements, setAnnouncements] = useState<any[]>(EXAM_REGISTRY_DEFAULT);

  useEffect(() => {
    examService.getAllExams().then((allExams: any[]) => {
      const setting = allExams.find((e: any) => e.name === 'SYSTEM_SETTINGS_EXAM_REGISTRY');
      if (setting && setting.description) {
        try {
          const parsed = JSON.parse(setting.description);
          if (Array.isArray(parsed) && parsed.length > 0) setAnnouncements(parsed);
        } catch (e) { /* keep defaults */ }
      }
    }).catch(() => { /* keep defaults */ });
  }, []);

  const handlePracticeClick = (item: any) => {
    const key = (item.examKey || '').toLowerCase();
    let matched = null;

    // First: try direct UUID match (new format — admin picked a real exam ID)
    if (item.examKey) {
      matched = exams.find(e => e.id === item.examKey);
    }

    // Fallback: legacy keyword matching (opsc/ossc/osssc/police/forest)
    if (!matched) {
      if (key === 'opsc') matched = exams.find(e => e.name.toLowerCase().includes('opsc'));
      else if (key === 'osssc') matched = exams.find(e => e.name.toLowerCase().includes('osssc'));
      else if (key === 'ossc') matched = exams.find(e => e.name.toLowerCase().includes('ossc') && !e.name.toLowerCase().includes('osssc'));
      else if (key === 'police') matched = exams.find(e => e.name.toLowerCase().includes('police'));
      else if (key === 'forest') matched = exams.find(e => e.name.toLowerCase().includes('forest'));
      else {
        // Last resort: fuzzy match from the exam name text
        const nameLower = (item.exam || '').toLowerCase();
        if (nameLower.includes('opsc')) matched = exams.find(e => e.name.toLowerCase().includes('opsc'));
        else if (nameLower.includes('osssc')) matched = exams.find(e => e.name.toLowerCase().includes('osssc'));
        else if (nameLower.includes('ossc')) matched = exams.find(e => e.name.toLowerCase().includes('ossc') && !e.name.toLowerCase().includes('osssc'));
      }
    }

    if (matched) setSelectedExam(matched.id);
    else if (key === 'opsc' || (item.exam || '').toLowerCase().includes('opsc')) setSelectedExam('opsc-aio');
    scrollToElement('exams', { block: 'start' });
  };

  return (
    <section id="exam-registry" className="py-12 md:py-16 bg-[#FAF8F5] border-y border-slate-200/50 scroll-mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
        <div className="flex flex-col items-center space-y-4 text-center">
          <span className="section-chip">
            <Clock3 className="w-3.5 h-3.5" />
            Odisha Recruitment Bulletin
          </span>
          <h2 className="text-3xl md:text-5xl font-serif font-extrabold text-slate-900 tracking-tight">
            Live Exam <span className="premium-text-gradient font-serif font-extrabold">Registry</span>
          </h2>
          <div className="section-divider" />
          <p className="text-slate-500 text-base sm:text-lg font-medium max-w-xl mx-auto leading-relaxed">
            Stay updated with real-time official notification timelines and jump straight into dedicated preparation sets.
          </p>
        </div>

        <div className="bg-white border-2 border-slate-900/80 rounded-[2.5rem] overflow-hidden shadow-[6px_6px_0px_rgba(138,28,54,0.15)] divide-y-2 divide-slate-100">
          {announcements.map((item, idx) => {
            const statusMeta = EXAM_REGISTRY_STATUS_MAP[item.status] || {
              label: item.status,
              color: 'bg-slate-50 text-slate-600 border-slate-200'
            };
            return (
              <div key={idx} className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className={cn("px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border", statusMeta.color)}>
                      {statusMeta.label}
                    </span>
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      {item.date}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-serif font-extrabold text-slate-900">
                    {item.exam}
                  </h3>
                </div>
                <button 
                  onClick={() => handlePracticeClick(item)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-slate-900 text-xs font-black uppercase tracking-widest text-slate-900 hover:bg-slate-900 hover:text-white transition-all cursor-pointer self-start md:self-auto shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
                >
                  {item.actionLabel}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const SYLLABUS_ROADMAPS_DEFAULT = [
  {
    id: 'gs',
    label: 'General Studies',
    topics: [
      { name: 'Odisha History & Heritage', count: 12, label: 'Crucial for OPSC Prelims' },
      { name: 'Indian Constitution & Polity', count: 8, label: 'Core Weightage' },
      { name: 'Geography of Odisha & Climate', count: 10, label: 'High-scoring Section' },
      { name: 'General Science & Technology', count: 15, label: 'Daily Current Mappings' },
    ],
  },
  {
    id: 'lang',
    label: 'Language Core',
    topics: [
      { name: 'Odia Grammar & Composition', count: 8, label: 'OSSC CGL Compulsory' },
      { name: 'English Comprehension', count: 6, label: 'Vocabulary & Common Errors' },
      { name: 'Translation & Precise Writing', count: 4, label: 'Mains Answer Prep' },
    ],
  },
  {
    id: 'quant',
    label: 'Aptitude & DI',
    topics: [
      { name: 'Number System & Arithmetic', count: 14, label: 'OSSSC Exam Primary Focus' },
      { name: 'Logical Reasoning & Analogies', count: 12, label: 'Timer Speed Practice' },
      { name: 'Data Interpretation (DI) Charts', count: 9, label: 'High-level Practice Sets' },
    ],
  },
];

const SyllabusPathsSection = () => {
  const [tabs, setTabs] = useState<any[]>(SYLLABUS_ROADMAPS_DEFAULT);
  const [activeTabIdx, setActiveTabIdx] = useState(0);

  useEffect(() => {
    examService.getAllExams().then((allExams: any[]) => {
      const setting = allExams.find((e: any) => e.name === 'SYSTEM_SETTINGS_SYLLABUS_ROADMAPS');
      if (setting && setting.description) {
        try {
          const parsed = JSON.parse(setting.description);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTabs(parsed);
            setActiveTabIdx(0);
          }
        } catch (e) { /* keep defaults */ }
      }
    }).catch(() => { /* keep defaults */ });
  }, []);

  const activeTab = tabs[activeTabIdx] || tabs[0];

  return (
    <section id="syllabus-paths" className="py-12 md:py-16 scroll-mt-24 border-b border-slate-200/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
        <div className="flex flex-col items-center space-y-4 text-center">
          <span className="section-chip">
            <BookOpen className="w-3.5 h-3.5" />
            Curriculum Roadmap
          </span>
          <h2 className="text-3xl md:text-5xl font-serif font-extrabold text-slate-900 tracking-tight">
            Syllabus <span className="premium-text-gradient font-serif font-extrabold">Roadmaps</span>
          </h2>
          <div className="section-divider" />
          <p className="text-slate-500 text-base sm:text-lg font-medium max-w-xl mx-auto leading-relaxed">
            Choose a subject pillar and review the curriculum chapters, mapped directly to practice quiz availability.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-center gap-2 sm:gap-4 p-1.5 bg-slate-100/60 rounded-2xl max-w-2xl mx-auto border border-slate-200/50 flex-wrap">
          {tabs.map((tab, i) => (
            <button
              key={tab.id || i}
              onClick={() => setActiveTabIdx(i)}
              className={cn(
                "flex-1 min-w-[100px] py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer",
                activeTabIdx === i
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-400 hover:text-slate-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pathway List */}
        {activeTab && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {(activeTab.topics || []).map((topic: any, i: number) => (
              <div
                key={i}
                className="bg-white border-2 border-slate-900/80 rounded-2xl p-5 sm:p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-start justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#8A1C36]">
                    {topic.label}
                  </p>
                  <h4 className="text-base sm:text-lg font-serif font-extrabold text-slate-900 leading-tight">
                    {topic.name}
                  </h4>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-flex px-2.5 py-1 bg-brand-50 text-[#8A1C36] rounded font-mono text-xs font-black uppercase border border-brand-100">
                    {topic.count} Sets
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const AchieversJournalSection = () => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'opsc' | 'ossc' | 'osssc'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(4);

  const [stories, setStories] = useState<any[]>(DEFAULT_ACHIEVERS_JOURNAL);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const { data } = await supabase
          .from('exams')
          .select('description')
          .eq('name', 'SYSTEM_SETTINGS_ACHIEVERS_JOURNAL')
          .single();
        if (data && data.description) {
          const parsed = JSON.parse(data.description);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setStories(parsed);
          }
        }
      } catch (e) {
        console.error("Failed to load dynamic achiever stories:", e);
      }
    };
    fetchStories();
  }, []);

  const filteredStories = useMemo(() => {
    return stories.filter(s => {
      const matchFilter = activeFilter === 'all' || s.examCategory === activeFilter;
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.rank.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.district.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.story.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [activeFilter, searchQuery]);

  useEffect(() => {
    setVisibleCount(4);
  }, [activeFilter, searchQuery]);

  return (
    <section id="achievers-journal" className="py-12 md:py-16 bg-slate-50 border-y border-slate-200/60 scroll-mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
        <div className="flex flex-col items-center space-y-4 text-center">
          <span className="section-chip">
            <Award className="w-3.5 h-3.5" />
            Achievers' Journal
          </span>
          <h2 className="text-3xl md:text-5xl font-serif font-extrabold text-slate-900 tracking-tight">
            Preparation <span className="premium-text-gradient font-serif font-extrabold">Journeys</span>
          </h2>
          <div className="section-divider" />
          <p className="text-slate-500 text-base sm:text-lg font-medium max-w-xl mx-auto leading-relaxed">
            Read verified preparation reports and exam statistics from real candidates clearing Odisha recruitment exams.
          </p>
        </div>

        {/* Search and Filters bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-5xl mx-auto pt-2">
          {/* Category Filter */}
          <div className="border-2 border-slate-900 bg-white p-1 rounded-2xl flex flex-wrap gap-1 shrink-0 shadow-[4px_4px_0px_rgba(138,28,54,0.15)]">
            {(['all', 'opsc', 'ossc', 'osssc'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 cursor-pointer",
                  activeFilter === filter 
                    ? "bg-[#8A1C36] text-white shadow-[2px_2px_0px_#0f172a] -translate-y-0.5" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                {filter === 'all' ? 'All Journeys' : filter.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by name, district, keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-900 bg-white font-bold text-xs sm:text-sm shadow-[3px_3px_0px_rgba(138,28,54,0.1)] focus:shadow-[4px_4px_0px_#8A1C36] focus:outline-none transition-all duration-200"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto pt-4">
          <AnimatePresence mode="popLayout">
            {filteredStories.length === 0 ? (
              <motion.div
                key="empty-achievers"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="col-span-1 md:col-span-2 text-center py-12 bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-[4px_4px_0px_rgba(138,28,54,0.15)] flex flex-col items-center justify-center gap-2"
              >
                <div className="text-3xl">📝</div>
                <h4 className="font-serif font-bold text-slate-900 text-lg">No Achiever Logs Found</h4>
                <p className="text-slate-500 text-xs sm:text-sm">Try searching for another candidate, district or exam category.</p>
              </motion.div>
            ) : (
              filteredStories.slice(0, visibleCount).map((item, idx) => (
                <motion.div 
                  key={item.name}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white border-2 border-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-[6px_6px_0px_rgba(138,28,54,0.1)] hover:shadow-[8px_8px_0px_#8A1C36] hover:-translate-y-1 hover:-translate-x-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img 
                          src={item.avatar} 
                          alt={item.name} 
                          className="w-12 h-12 rounded-full border border-slate-200 object-cover shrink-0" 
                        />
                        <div>
                          <h4 className="font-serif font-extrabold text-slate-900 text-base leading-none">{item.name}</h4>
                          <p className="text-[10px] font-black uppercase text-[#8A1C36] tracking-widest mt-1.5">{item.rank}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                        <span className="text-[10px] font-mono font-black text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-md uppercase tracking-tight">
                          📍 {item.district}
                        </span>
                        <span className="text-[9px] font-extrabold text-slate-400 flex items-center gap-1 select-none">
                          <Clock className="w-2.5 h-2.5 text-slate-400" />
                          {(() => {
                            try {
                              if (!item.date) return 'Recent';
                              const d = new Date(item.date);
                              if (isNaN(d.getTime())) return item.date;
                              return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                            } catch (e) {
                              return item.date || 'Recent';
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-600 font-serif text-sm leading-relaxed italic">
                      "{item.story}"
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 pt-4 mt-6 border-t border-slate-100 text-center text-slate-800">
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Score</p>
                      <p className="text-xs font-black text-slate-900">{item.stats.score}</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Accuracy</p>
                      <p className="text-xs font-black text-slate-900">{item.stats.accuracy}</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Timeline</p>
                      <p className="text-xs font-black text-slate-900">{item.stats.time}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Load More Button */}
        {filteredStories.length > visibleCount && (
          <div className="flex justify-center pt-4">
            <button 
              onClick={() => setVisibleCount(prev => prev + 6)}
              className="px-6 py-3 rounded-xl border-2 border-slate-900 bg-white hover:bg-slate-50 text-xs sm:text-sm font-extrabold uppercase tracking-widest text-slate-900 shadow-[3px_3px_0px_#8A1C36] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              Load More preparation journals (+{filteredStories.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

const Footer = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert([{ email: cleanEmail }]);

      if (error) {
        if (error.code === '23505') {
          toast.error("You're already subscribed!");
        } else {
          toast.error(error.message || "Failed to subscribe.");
        }
        return;
      }

      setSubscribed(true);
      toast.success("Successfully subscribed for alerts!");
      setEmail('');
      setTimeout(() => setSubscribed(false), 5000);
    } catch (err: any) {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <footer id="contact" className="bg-[#080b11] text-slate-300 py-16 md:py-24 mt-20 relative overflow-hidden noise-overlay">
      {/* Decorative background grid and orbs */}
      <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#8a1c36_1px,transparent_1px),linear-gradient(to_bottom,#8a1c36_1px,transparent_1px)] bg-[size:3.5rem_3.5rem]" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
      
      {/* Glowing blur spheres */}
      <div className="absolute -top-20 right-1/4 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse-soft" />
      <div className="absolute -bottom-40 left-10 w-[400px] h-[400px] bg-slate-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse-soft" style={{ animationDelay: '-2s' }} />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        
        {/* Pre-footer Stats Dashboard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pb-16 mb-16 border-b border-slate-800/60">
          {[
            { label: "Mock Tests Attempted", value: "10,000+", icon: BarChart3, color: "text-blue-400 bg-blue-500/10", desc: "Real exam simulations" },
            { label: "Syllabus Coverage", value: "98.4%", icon: Target, color: "text-rose-400 bg-rose-500/10", desc: "Mapped to state boards" },
            { label: "Score Analytics", value: "Real-Time", icon: Zap, color: "text-amber-400 bg-amber-500/10", desc: "Detailed rank mapping" },
            { label: "Expert Support", value: "24/7 Support", icon: MessageSquare, color: "text-emerald-400 bg-emerald-500/10", desc: "Priority Telegram & Call" }
          ].map((stat, idx) => (
            <div 
              key={idx}
              className="bg-slate-900/30 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-brand-500/30 hover:bg-slate-900/60 transition-all duration-300 group hover:-translate-y-1"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">{stat.label}</span>
              </div>
              <h5 className="font-serif font-black text-xl sm:text-2xl text-white tracking-tight leading-none mb-1">
                {stat.value}
              </h5>
              <p className="text-[11px] font-medium text-slate-400">
                {stat.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Core footer layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 sm:gap-16">
          
          {/* Logo & Tagline column */}
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 premium-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-[#8a1c36]/10 animate-float-sm">
                <BookOpen className="text-white w-6 h-6" />
              </div>
              <span className="font-serif font-black text-3xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                Odisha<span className="text-brand-400 font-serif font-black">Exam</span>Prep
              </span>
            </div>
            <p className="text-slate-400 font-medium leading-relaxed max-w-sm text-sm sm:text-base">
              Empowering aspirants with high-quality mock tests and real-time analytics to master competitive exams confidently.
            </p>
            
            {/* Newsletter update form */}
            <div className="space-y-3 pt-2">
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-400">Subscribe for Exam Notifications</h5>
              <form onSubmit={handleSubscribe} className="flex gap-2 max-w-md">
                <input 
                  type="email" 
                  required
                  placeholder="Enter email to get notified..." 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-slate-950/80 border border-slate-800/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500/50 transition-all font-bold placeholder:text-slate-600"
                />
                <button 
                  type="submit"
                  className="px-4 py-2.5 bg-[#8A1C36] hover:bg-[#76142c] border border-brand-500/20 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-brand-500/10"
                >
                  {subscribed ? "Subscribed!" : (
                    <>
                      <span>Join</span>
                      <ArrowRight className="w-3 h-3" />
                    </>
                  )}
                </button>
              </form>
              <p className="text-[10px] text-slate-500 font-medium">Get real-time notification alerts for OPSC, OSSC & OSSSC exams.</p>
            </div>
          </div>
          
          {/* Platform navigation */}
          <div className="space-y-6">
            <h4 className="text-white font-black tracking-widest uppercase text-xs mb-6 relative after:content-[''] after:absolute after:-bottom-2.5 after:left-0 after:w-8 after:h-[2px] after:bg-[#8a1c36]">
              Platform
            </h4>
            <ul className="space-y-3.5 font-semibold text-slate-400">
              {[
                { to: "/blog", label: "Official Blog", icon: BookOpen },
                { to: "/privacy-policy", label: "Privacy Policy", icon: ShieldCheck },
                { to: "/terms-of-service", label: "Terms of Service", icon: Scale },
                { to: "/refund-policy", label: "Refund Policy", icon: Receipt }
              ].map((link, idx) => (
                <li key={idx}>
                  <Link 
                    to={link.to} 
                    className="hover:text-brand-400 transition-all duration-300 flex items-center gap-2 group hover:translate-x-1.5"
                  >
                    <link.icon className="w-4 h-4 text-slate-700 group-hover:text-brand-500 transition-colors" />
                    <span className="text-sm">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact details */}
          <div className="space-y-6">
            <h4 className="text-white font-black tracking-widest uppercase text-xs mb-6 relative after:content-[''] after:absolute after:-bottom-2.5 after:left-0 after:w-8 after:h-[2px] after:bg-[#8a1c36]">
              Contact Us
            </h4>
            <ul className="space-y-3.5 font-medium text-slate-400">
              <li>
                <a 
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=odishaexamprep365@gmail.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-center shrink-0 group-hover:border-brand-500/50 group-hover:bg-[#8a1c36]/10 transition-all duration-300">
                    <Mail className="w-4 h-4 text-slate-400 group-hover:text-brand-400 transition-colors" />
                  </div>
                  <span className="break-words lg:whitespace-nowrap text-sm group-hover:text-white transition-colors duration-300">
                    odishaexamprep365@gmail.com
                  </span>
                </a>
              </li>
              <li>
                <a 
                  href="tel:+917377431715" 
                  className="flex items-center gap-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-center shrink-0 group-hover:border-[#25D366]/50 group-hover:bg-[#25D366]/10 transition-all duration-300">
                    <Phone className="w-4 h-4 text-slate-400 group-hover:text-[#25D366] transition-colors" />
                  </div>
                  <span className="text-sm group-hover:text-white transition-colors duration-300">
                    +91 7377431715
                  </span>
                </a>
              </li>
              
              {/* Social links */}
              <li className="flex gap-3 pt-3">
                <a 
                  href="https://www.youtube.com/@OdishaExamPrep365" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-11 h-11 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-center hover:bg-[#FF0000] hover:border-[#FF0000] hover:-translate-y-1 transition-all duration-300 text-slate-400 hover:text-white shadow-lg hover:shadow-red-600/10 group"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 group-hover:scale-110 transition-transform">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
                <a 
                  href="https://wa.me/917377431715" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-11 h-11 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-center hover:bg-[#25D366] hover:border-[#25D366] hover:-translate-y-1 transition-all duration-300 text-slate-400 hover:text-white shadow-lg hover:shadow-[#25D366]/10 group"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 group-hover:scale-110 transition-transform">
                    <path d="M12.031 0C5.385 0 0 5.385 0 12.029a12.022 12.022 0 001.6 6.02L0 24l6.15-1.611a12.012 12.012 0 005.881 1.523h.004c6.645 0 12.03-5.386 12.03-12.031S18.675 0 12.031 0zm0 21.936a9.988 9.988 0 01-5.086-1.385l-.364-.216-3.774.99.998-3.682-.236-.376A9.957 9.957 0 012.064 12.03c0-5.497 4.475-9.972 9.972-9.972 5.497 0 9.97 4.475 9.97 9.972s-4.473 9.97-9.97 9.97z"/>
                    <path d="M17.481 14.159c-.297-.149-1.758-.868-2.03-.968-.27-.099-.467-.149-.665.149-.198.298-.767.967-.94 1.165-.173.198-.346.223-.644.074a8.214 8.214 0 01-4.041-2.518c-.282-.326.319-.314.901-1.479.098-.198.05-.371-.025-.52-.075-.149-.665-1.605-.91-2.196-.241-.578-.485-.5-.665-.509-.174-.01-.371-.01-.57-.01-.198 0-.52.074-.792.371C6.822 7.027 6 7.82 6 9.381c0 1.56 1.015 3.07 1.164 3.268.149.198 2.228 3.4 5.397 4.76 2.656 1.139 3.554 1.259 4.314 1.05.76-.208 2.03-.896 2.316-1.761.286-.865.286-1.605.2-1.76-.086-.15-.286-.24-.584-.388z"/>
                  </svg>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Bottom bar */}
      <div className="max-w-6xl mx-auto px-6 mt-16 md:mt-24">
        <div className="pt-8 border-t border-slate-800/60 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <p className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase">
            © 2026 OdishaExamPrep. All rights reserved.
          </p>
          <div className="flex justify-center md:justify-start">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-900/80 border border-slate-800/80 text-slate-400">
              <span>Made with</span>
              <span className="text-rose-500 animate-pulse">❤️</span>
              <span>in Odisha</span>
            </span>
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
  const location = useLocation();
  const scrolled = useScrollSpy(20);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const isScrollingRef = useRef(false);
  const scrollLockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Viewport tracking scroll spy for active sections
  useEffect(() => {
    if (location.pathname !== '/') {
      if (location.pathname.startsWith('/blog')) {
        setActiveSection('blog');
      } else {
        setActiveSection('');
      }
      return;
    }

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Pause spy while a programmatic smooth-scroll is animating
          if (isScrollingRef.current) {
            ticking = false;
            return;
          }

          const sectionIds = ['exam-registry', 'exams', 'syllabus-paths', 'achievers-journal'];

          // If we are at the very top of the page, clear active section
          if (window.scrollY < 100) {
            setActiveSection('');
            ticking = false;
            return;
          }

          // Standard scroll-spy: iterate sections in REVERSE order.
          // Find the LAST section whose top edge has scrolled above the trigger offset.
          const NAVBAR_OFFSET = 100;

          let currentActive = '';
          for (let i = sectionIds.length - 1; i >= 0; i--) {
            const id = sectionIds[i];
            const el = document.getElementById(id);
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.top <= NAVBAR_OFFSET) {
                currentActive = id;
                break;
              }
            }
          }
          setActiveSection(currentActive);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname]);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (window.location.pathname !== '/') {
      window.location.assign('/#' + id);
      return;
    }

    // Immediately update highlight for instant visual feedback
    setActiveSection(id);
    // Lock spy during smooth-scroll animation (~900ms)
    isScrollingRef.current = true;
    if (scrollLockTimer.current) clearTimeout(scrollLockTimer.current);
    scrollLockTimer.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 900);

    scrollToElement(id, { block: 'start', behavior: 'smooth' });
  };

  const defaultMessage = "Hello! I am reaching out from the OdishaExamPrep website. I have a query.";
  const userMessage = user?.email ? `Hello! I am ${user.email} reaching out from the OdishaExamPrep website. I have a query.` : defaultMessage;
  const supportUrl = `https://wa.me/917377431715?text=${encodeURIComponent(userMessage)}`;

  const isBlogActive = location.pathname.startsWith('/blog') || activeSection === 'blog';

  return (
    <header className={cn("sticky top-0 z-[60] w-full transition-all duration-500", scrolled ? "navbar-scrolled" : "navbar-glass")}>
      <div className="max-w-7xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
        <div
          className="flex items-center gap-2 sm:gap-3 group cursor-pointer"
          onClick={() => {
            if (onHomeClick) {
              onHomeClick();
            } else if (window.location.pathname === '/') {
              // Already on landing page — smooth scroll to hero (top)
              setActiveSection('');
              scrollToTop();
            } else {
              navigate('/');
            }
          }}
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl border-2 border-slate-900 bg-[#8A1C36] flex items-center justify-center shadow-[3px_3px_0px_#0f172a] group-hover:rotate-3 group-hover:scale-105 transition-all duration-300">
            <BookOpen className="text-white w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <span className="font-serif font-black text-lg sm:text-2xl tracking-tight text-slate-900 group-hover:text-[#8A1C36] transition-colors duration-300 uppercase">
            Odisha<span className="text-[#8A1C36] font-serif font-black">Exam</span>Prep
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6">
          {/* Desktop nav pill group — uses Framer Motion layoutId for the sliding active indicator */}
          <div className="flex items-center border-2 border-slate-900 bg-white rounded-xl p-0.5 shadow-[3px_3px_0px_#0f172a] relative">
            {!user && (
              <>
                 {/* Registry */}
                 <a 
                   href="#exam-registry"
                   onClick={(e) => scrollToSection(e, 'exam-registry')}
                   className="relative flex items-center gap-1.5 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg group cursor-pointer"
                 >
                   {activeSection === 'exam-registry' && (
                     <motion.div
                       layoutId="nav-active-pill"
                       className="absolute inset-0 rounded-lg bg-[#fce7eb]"
                       transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.8 }}
                     />
                   )}
                   <Clock3 className={cn("relative z-10 w-3.5 h-3.5 transition-colors duration-150", activeSection === 'exam-registry' ? "text-[#8A1C36]" : "text-slate-400 group-hover:text-[#8A1C36]")} />
                   <span className={cn("relative z-10 transition-colors duration-150", activeSection === 'exam-registry' ? "text-[#8A1C36]" : "text-slate-600 group-hover:text-[#8A1C36]")}>Registry</span>
                 </a>
                 <div className="w-0.5 h-4 bg-slate-200 mx-0.5 shrink-0"></div>
                 {/* Practice */}
                 <a 
                   href="#exams"
                   onClick={(e) => scrollToSection(e, 'exams')}
                   className="relative flex items-center gap-1.5 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg group cursor-pointer"
                 >
                   {activeSection === 'exams' && (
                     <motion.div
                       layoutId="nav-active-pill"
                       className="absolute inset-0 rounded-lg bg-[#fce7eb]"
                       transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.8 }}
                     />
                   )}
                   <Target className={cn("relative z-10 w-3.5 h-3.5 transition-colors duration-150", activeSection === 'exams' ? "text-[#8A1C36]" : "text-slate-400 group-hover:text-[#8A1C36]")} />
                   <span className={cn("relative z-10 transition-colors duration-150", activeSection === 'exams' ? "text-[#8A1C36]" : "text-slate-600 group-hover:text-[#8A1C36]")}>Practice</span>
                 </a>
                 <div className="w-0.5 h-4 bg-slate-200 mx-0.5 shrink-0"></div>
                 {/* Syllabus */}
                 <a 
                   href="#syllabus-paths"
                   onClick={(e) => scrollToSection(e, 'syllabus-paths')}
                   className="relative flex items-center gap-1.5 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg group cursor-pointer"
                 >
                   {activeSection === 'syllabus-paths' && (
                     <motion.div
                       layoutId="nav-active-pill"
                       className="absolute inset-0 rounded-lg bg-[#fce7eb]"
                       transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.8 }}
                     />
                   )}
                   <BookOpen className={cn("relative z-10 w-3.5 h-3.5 transition-colors duration-150", activeSection === 'syllabus-paths' ? "text-[#8A1C36]" : "text-slate-400 group-hover:text-[#8A1C36]")} />
                   <span className={cn("relative z-10 transition-colors duration-150", activeSection === 'syllabus-paths' ? "text-[#8A1C36]" : "text-slate-600 group-hover:text-[#8A1C36]")}>Syllabus</span>
                 </a>
                 <div className="w-0.5 h-4 bg-slate-200 mx-0.5 shrink-0"></div>
                 {/* Achievers */}
                 <a 
                   href="#achievers-journal"
                   onClick={(e) => scrollToSection(e, 'achievers-journal')}
                   className="relative flex items-center gap-1.5 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg group cursor-pointer"
                 >
                   {activeSection === 'achievers-journal' && (
                     <motion.div
                       layoutId="nav-active-pill"
                       className="absolute inset-0 rounded-lg bg-[#fce7eb]"
                       transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.8 }}
                     />
                   )}
                   <Award className={cn("relative z-10 w-3.5 h-3.5 transition-colors duration-150", activeSection === 'achievers-journal' ? "text-[#8A1C36]" : "text-slate-400 group-hover:text-[#8A1C36]")} />
                   <span className={cn("relative z-10 transition-colors duration-150", activeSection === 'achievers-journal' ? "text-[#8A1C36]" : "text-slate-600 group-hover:text-[#8A1C36]")}>Achievers</span>
                 </a>
                 <div className="w-0.5 h-4 bg-slate-200 mx-0.5 shrink-0"></div>
              </>
            )}
             {/* Blog */}
             <Link 
               to="/blog"
               className="relative flex items-center gap-1.5 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg group cursor-pointer"
             >
               {isBlogActive && (
                 <motion.div
                   layoutId="nav-active-pill"
                   className="absolute inset-0 rounded-lg bg-[#fce7eb]"
                   transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.8 }}
                 />
               )}
               <FileText className={cn("relative z-10 w-3.5 h-3.5 transition-colors duration-150", isBlogActive ? "text-[#8A1C36]" : "text-slate-400 group-hover:text-[#8A1C36]")} />
               <span className={cn("relative z-10 transition-colors duration-150", isBlogActive ? "text-[#8A1C36]" : "text-slate-600 group-hover:text-[#8A1C36]")}>Blog</span>
             </Link>
            {user && (
              <>
                 <div className="w-0.5 h-4 bg-slate-200 mx-0.5 shrink-0"></div>
                 <a href={supportUrl} target="_blank" rel="noopener noreferrer" className="relative flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-600 hover:text-[#8A1C36] px-4 py-2 rounded-lg hover:bg-slate-50 transition-all duration-200 group">
                   <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#8A1C36] transition-colors" />
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
                <button 
                  onClick={onSignIn}
                  className="px-6 h-10 text-xs font-black uppercase tracking-widest rounded-lg border-2 border-slate-900 bg-[#8A1C36] text-white shadow-[3px_3px_0px_#0f172a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all duration-200 cursor-pointer shrink-0"
                >
                  Sign In
                </button>
              )
            )}
          </div>
        </nav>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center gap-2 sm:gap-3">
          {!user && onSignIn && (
            <button 
              onClick={onSignIn}
              className="hidden sm:inline-flex px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg border-2 border-slate-900 bg-[#8A1C36] text-white shadow-[2px_2px_0px_#0f172a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all duration-200 cursor-pointer shrink-0"
            >
              Sign In
            </button>
          )}
          <button 
            className="p-2 sm:p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
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
            className="absolute top-full left-0 right-0 bg-white/95 backdrop-blur-3xl border-b border-slate-200/40 shadow-2xl overflow-y-auto no-scrollbar md:hidden max-h-[calc(100vh-70px)]"
          >
            <div className="p-4 flex flex-col gap-2">
              {!user && onSignIn && (
                <div className="p-4 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50 to-white shadow-sm mb-2">
                  <p className="text-[10px] font-black text-[#8A1C36] uppercase tracking-widest mb-1">Welcome Aspirant</p>
                  <h4 className="text-xs font-serif font-extrabold text-slate-800 mb-3 leading-tight">Master the OPSC, OSSC, and OSSSC syllabus with precision-crafted test series.</h4>
                  <Button variant="primary" className="w-full py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider" onClick={() => { onSignIn(); setMobileMenuOpen(false); }}>
                    Sign In to Account
                  </Button>
                </div>
              )}
              {!user && (
                <>
                  <a 
                    href="#exam-registry" 
                    onClick={(e) => scrollToSection(e, 'exam-registry')} 
                    className={cn(
                      "flex items-center gap-4 text-lg font-bold p-4 rounded-2xl transition-all border-l-4",
                      activeSection === 'exam-registry'
                        ? "bg-[#fce7eb] text-[#8A1C36] font-extrabold border-[#8A1C36] pl-3"
                        : "text-slate-700 hover:bg-[#fce7eb] hover:text-[#8A1C36] border-transparent hover:border-[#8A1C36]/30"
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#fce7eb] flex items-center justify-center text-[#8A1C36] shrink-0 shadow-sm">
                       <Clock3 className="w-5 h-5" />
                    </div>
                    <span>Registry</span>
                  </a>
                  <a 
                    href="#exams" 
                    onClick={(e) => scrollToSection(e, 'exams')} 
                    className={cn(
                      "flex items-center gap-4 text-lg font-bold p-4 rounded-2xl transition-all border-l-4",
                      activeSection === 'exams'
                        ? "bg-emerald-50 text-emerald-700 font-extrabold border-emerald-600 pl-3"
                        : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border-transparent hover:border-emerald-600/30"
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
                       <Target className="w-5 h-5" />
                    </div>
                    <span>Practice</span>
                  </a>
                  <a 
                    href="#syllabus-paths" 
                    onClick={(e) => scrollToSection(e, 'syllabus-paths')} 
                    className={cn(
                      "flex items-center gap-4 text-lg font-bold p-4 rounded-2xl transition-all border-l-4",
                      activeSection === 'syllabus-paths'
                        ? "bg-blue-50 text-blue-700 font-extrabold border-blue-600 pl-3"
                        : "text-slate-700 hover:bg-blue-50 hover:text-blue-700 border-transparent hover:border-blue-600/30"
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
                       <BookOpen className="w-5 h-5" />
                    </div>
                    <span>Syllabus</span>
                  </a>
                  <a 
                    href="#achievers-journal" 
                    onClick={(e) => scrollToSection(e, 'achievers-journal')} 
                    className={cn(
                      "flex items-center gap-4 text-lg font-bold p-4 rounded-2xl transition-all border-l-4",
                      activeSection === 'achievers-journal'
                        ? "bg-amber-50 text-amber-700 font-extrabold border-amber-600 pl-3"
                        : "text-slate-700 hover:bg-amber-50 hover:text-amber-700 border-transparent hover:border-amber-600/30"
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 shadow-sm">
                       <Award className="w-5 h-5" />
                    </div>
                    <span>Achievers</span>
                  </a>
                </>
              )}
              <Link 
                to="/blog"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-4 text-lg font-bold p-4 rounded-2xl transition-all border-l-4",
                  isBlogActive
                    ? "bg-[#fce7eb] text-[#8A1C36] font-extrabold border-[#8A1C36] pl-3"
                    : "text-slate-700 hover:bg-[#fce7eb] hover:text-[#8A1C36] border-transparent hover:border-[#8A1C36]/30"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-[#fce7eb] flex items-center justify-center text-[#8A1C36] shrink-0 shadow-sm">
                   <FileText className="w-5 h-5" />
                </div>
                <span>Latest Updates & Blog</span>
              </Link>
              {user && (
                <a 
                  href={supportUrl}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 text-lg font-bold p-4 rounded-2xl transition-all border-l-4 border-transparent text-slate-700 hover:bg-[#fce7eb] hover:text-[#8A1C36]"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#fce7eb] flex items-center justify-center text-[#8A1C36] shrink-0 shadow-sm">
                     <HelpCircle className="w-5 h-5" />
                  </div>
                  <span>Help & Support</span>
                </a>
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

// --- Interactive Hero Preview Component ---
const HERO_CARD_DEFAULT = {
  examLabel: 'OPSC Prelims Mock',
  questionNumber: 'Q. 42',
  questionText: 'The historical Sun Temple of Konark, a UNESCO World Heritage site, was constructed by which ruler of the Eastern Ganga Dynasty?',
  options: ['Anantavarman Chodagangadeva', 'Narasimhadeva I', 'Kapilendradeva', 'Purushottamadeva'],
  correctIndex: 1,
  explanation: 'King Langula Narasimhadeva I built the Konark Sun Temple in the 13th century (circa 1250 CE) to celebrate his military victories.',
  marks: 1.00,
  penalty: 0.25,
};

const InteractiveHeroPreview = () => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(522); // 08:42
  const [card, setCard] = useState(HERO_CARD_DEFAULT);

  // Load admin-configured hero card from Supabase
  useEffect(() => {
    examService.getAllExams().then((exams: any[]) => {
      const setting = exams.find((e: any) => e.name === 'SYSTEM_SETTINGS_HERO_CARD');
      if (setting && setting.description) {
        try {
          const parsed = JSON.parse(setting.description);
          setCard({ ...HERO_CARD_DEFAULT, ...parsed });
        } catch (e) { /* keep defaults */ }
      }
    }).catch(() => { /* keep defaults on network error */ });
  }, []);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 600));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Reset interaction when question changes
  useEffect(() => {
    setSelectedOption(null);
    setShowResult(false);
  }, [card.questionText]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelect = (idx: number) => {
    if (showResult) return;
    setSelectedOption(idx);
    setShowResult(true);
  };

  const handleReset = () => {
    setSelectedOption(null);
    setShowResult(false);
  };

  const marksLabel = card.marks?.toFixed(2) ?? '1.00';
  const penaltyLabel = card.penalty?.toFixed(2) ?? '0.25';

  return (
    <div className="w-full bg-white border-2 border-slate-900/80 rounded-[2rem] p-6 sm:p-8 shadow-[8px_8px_0px_rgba(138,28,54,1)] relative overflow-hidden font-sans">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] grid-bg" />
      
      <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4 mb-5 shrink-0 relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-[#8A1C36] rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">{card.examLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg font-mono text-xs font-black text-slate-700">
            <Clock3 className="w-3.5 h-3.5 text-slate-500" />
            {formatTimer(secondsLeft)}
          </div>
          <span className="text-xs font-extrabold text-[#8A1C36] bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">
            {card.questionNumber}
          </span>
        </div>
      </div>

      <div className="space-y-4 mb-6 relative z-10">
        <h3 className="text-base sm:text-lg font-serif font-extrabold text-slate-900 leading-relaxed">
          <MathTextRenderer text={card.questionText} />
        </h3>
        {(() => {
          const question = card;
          console.log("QUESTION", question);
          console.log("DIAGRAM", question.diagram);
          console.log("TYPE", question.diagram?.type);
          return null;
        })()}
        {card.diagram ? (
          <DiagramRenderer diagram={card.diagram} data={card.diagram} />
        ) : null}
      </div>

      <div className="space-y-3 mb-6 relative z-10">
        {card.options.map((opt, idx) => {
          const isSelected = selectedOption === idx;
          const isCorrect = idx === card.correctIndex;
          const showSuccess = showResult && isCorrect;
          const showFailure = showResult && isSelected && !isCorrect;

          let optionStyle = "border-slate-200 hover:border-slate-900/60 hover:bg-slate-50";
          let badgeStyle = "bg-slate-100 text-slate-500";

          if (showResult) {
            if (isCorrect) {
              optionStyle = "border-emerald-500 bg-emerald-50 text-emerald-900";
              badgeStyle = "bg-emerald-500 text-white";
            } else if (isSelected) {
              optionStyle = "border-rose-500 bg-rose-50 text-rose-900";
              badgeStyle = "bg-rose-500 text-white";
            } else {
              optionStyle = "border-slate-100 bg-slate-50/50 opacity-60";
            }
          } else if (isSelected) {
            optionStyle = "border-[#8A1C36] bg-[#8A1C36]/5 text-slate-900";
            badgeStyle = "bg-[#8A1C36] text-white";
          }

          return (
            <button
              key={idx}
              disabled={showResult}
              onClick={() => handleSelect(idx)}
              className={cn(
                "w-full text-left p-3.5 rounded-xl border-2 font-semibold text-sm transition-all flex items-center gap-3.5 select-none relative cursor-pointer",
                optionStyle
              )}
            >
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs transition-colors shrink-0", badgeStyle)}>
                {String.fromCharCode(65 + idx)}
              </div>
              <span className="flex-1 font-bold"><MathTextRenderer text={opt} isOption /></span>
              {showSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
              {showFailure && <X className="w-5 h-5 text-rose-600 shrink-0" />}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t-2 border-dashed border-slate-100 pt-5 space-y-3 relative z-10">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border",
                  selectedOption === card.correctIndex 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                    : "bg-rose-50 text-rose-700 border-rose-100"
                )}>
                  {selectedOption === card.correctIndex ? `Correct Answer! (+${marksLabel} Marks)` : `Incorrect! (-${penaltyLabel} Marks)`}
                </span>
                <button 
                  onClick={handleReset}
                  className="text-xs font-black text-slate-400 hover:text-[#8A1C36] transition-colors ml-auto uppercase tracking-wider cursor-pointer"
                >
                  Try Again
                </button>
              </div>
              <p className="text-xs font-medium text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100 font-serif">
                <strong className="text-slate-800 font-extrabold block mb-1">Explanation:</strong>
                <MathTextRenderer text={card.explanation} />
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex items-center justify-between border-t-2 border-slate-100 pt-4 mt-5 text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10 shrink-0">
        <div>Marks: {marksLabel}</div>
        <div>Penalty: {penaltyLabel}</div>
        <div>Status: Interactive Demo</div>
      </div>
    </div>
  );
};

// --- Pages ---

const LandingPage = () => {
  const { loading, user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgotPassword' | 'resetPassword'>('login');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showGuideToast, setShowGuideToast] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'error' | 'info' | 'success', text: string } | null>(null);


  useEffect(() => {
    setEmail('');
    setPassword('');
    setFullName('');
    setConfirmPassword('');
    setShowPassword(false);
    setAuthMessage(null);
  }, [showAuthModal, authMode]);

  useEffect(() => {
    setAuthMessage(null);
  }, [email, password, fullName, confirmPassword]);

  const [announcements, setAnnouncements] = useState<string[]>([
    `🚀 New Mock Test Series released for OSSC CGL ${new Date().getFullYear()}`,
    "📅 OPSC Prelims exam dates announced - Check latest schedule",
    "⭐ 500+ New PYQs added for OSSSC recruitment exams",
    "🔥 Weekly Current Affairs PDF now available for download",
    "✅ Real-time rank analysis enabled for all premium mock tests"
  ]);

  const [selectedExam, setSelectedExam] = useState<string | null>(() => sessionStorage.getItem('oep_selectedExam') || null);
  const [exams, setExams] = useState<any[]>([]);

  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        const fetchedExams = await examService.getAllExams();
        setExams(fetchedExams);
        const newsSettings = fetchedExams.find(e => e.name === 'SYSTEM_SETTINGS_NEWS_TICKER');
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
    setAuthMessage(null);
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setShowAuthModal(false);
      } else {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: fullName.trim()
            }
          }
        });
        if (error) throw error;
        if (data?.user && !data?.session) {
            setAuthMessage({
              type: 'info',
              text: 'Account already exists or requires email verification. Please check your inbox or try logging in!'
            });
            setAuthMode('login');
            return;
        }
        setShowAuthModal(false);
      }
    } catch (error: any) {
      setAuthMessage({
        type: 'error',
        text: error.message || 'An unexpected error occurred. Please try again.'
      });
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setAuthMessage({
        type: 'success',
        text: 'A password reset link has been sent to your email. Please check your inbox!'
      });
    } catch (error: any) {
      setAuthMessage({
        type: 'error',
        text: error.message || 'Failed to send reset link. Please verify your email.'
      });
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);
    if (password !== confirmPassword) {
      setAuthMessage({
        type: 'error',
        text: 'Passwords do not match!'
      });
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setAuthMessage({
        type: 'success',
        text: 'Password updated successfully! You are now logged in. Redirecting...'
      });
      setTimeout(() => {
        setShowAuthModal(false);
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      setAuthMessage({
        type: 'error',
        text: error.message || 'Failed to update password.'
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Top Professional Announcement Bar */}
      <div className="ticker-bar relative z-50 bg-[#0F172A] border-b-2 border-slate-900 overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center h-10 relative">
          <div className="flex items-center gap-2 px-4 h-full bg-[#8A1C36] text-white border-r-2 border-slate-900 shrink-0 relative z-20 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
            <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Exam Updates</span>
          </div>
          
          <div className="flex-1 overflow-hidden relative h-full flex items-center z-10">
            <div className="flex items-center gap-12 animate-marquee-lr whitespace-nowrap px-6">
              {announcements.map((text, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-tight">
                  <span className="text-[#8A1C36] font-black">•</span>
                  {text}
                </div>
              ))}
              {/* Duplicate the EXACT same list to create a seamless infinite loop with marquee-lr (-50% to 0) */}
              {announcements.map((text, i) => (
                <div key={`dup-${i}`} className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-tight">
                  <span className="text-[#8A1C36] font-black">•</span>
                  {text}
                </div>
              ))}
            </div>
            
            {/* Edge Gradients for smooth fade */}
            <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#0F172A] to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#0F172A] to-transparent z-10" />
          </div>
        </div>
      </div>

      <Navbar user={user} isAdmin={false} onSignIn={() => setShowAuthModal(true)} />

      <main className="flex-1" style={{background: 'linear-gradient(160deg, #FAF8F5 0%, #FAF8F5 40%, #FAF8F5 100%)'}}>
        {/* Elite Split-Layout Hero Section */}
        <section className="relative overflow-hidden pt-6 pb-12 lg:pt-10 lg:pb-20 border-b border-slate-200/50">
          {/* Animated Mesh + Grid Background */}
          <div className="absolute inset-0 -z-10 mesh-bg" />
          <div className="absolute inset-0 -z-10 grid-bg opacity-60" />
          {/* Glowing Orbs */}
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full -z-10 animate-orb" style={{background: 'radial-gradient(circle, rgba(138,28,54,0.06) 0%, transparent 70%)', filter: 'blur(40px)'}} />
          <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] rounded-full -z-10 animate-orb" style={{background: 'radial-gradient(circle, rgba(0,0,0,0.02) 0%, transparent 70%)', filter: 'blur(50px)', animationDelay: '2.5s'}} />
          
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

                  <h1 className="text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-serif font-extrabold text-slate-950 tracking-tight leading-[1.1] sm:leading-[1.05]">
                    Excellence in <br className="hidden sm:block" /> 
                    <span className="premium-text-gradient font-serif font-extrabold">Odisha Exams</span>
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

              {/* Advanced Visual Column - CBT Mock Test Preview */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex-1 relative w-full lg:max-w-[500px]"
              >
                <InteractiveHeroPreview />
              </motion.div>
            </div>
          </div>
        </section>

        {/* 1. Exam Registry Section */}
        <ExamRegistrySection setSelectedExam={setSelectedExam} exams={exams} />

        {/* 2. Practice Core (Explore Exams) */}
        <section id="exams" className="py-12 md:py-16 scroll-mt-24 border-b border-slate-200/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
            <div className="flex flex-col items-center space-y-4 text-center">
              <span className="section-chip">
                <Zap className="w-3.5 h-3.5" />
                Your Exam Gateway
              </span>
              <h2 className="text-3xl md:text-5xl font-serif font-extrabold text-slate-900 tracking-tight">Explore <span className="premium-text-gradient font-serif font-extrabold">Exams</span></h2>
              <div className="section-divider" />
              <p className="text-slate-500 text-base sm:text-lg font-medium max-w-xl mx-auto leading-relaxed">
                Practice with our curated question banks and full-length mock tests designed for official patterns.
              </p>
            </div>
            <DashboardContent 
              isGuest={!user} 
              onSignIn={() => setShowAuthModal(true)} 
              selectedExam={selectedExam} 
              setSelectedExam={setSelectedExam} 
            />
          </div>
        </section>

        {/* 3. Syllabus Paths Section */}
        <SyllabusPathsSection />

        {/* 4. Achievers' Journal Section */}
        <AchieversJournalSection />
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
          <div className="fixed inset-0 bg-slate-950/40 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-md">
            <motion.div {...slideUpPanel}
              className="glass rounded-t-[2rem] sm:rounded-3xl w-full max-w-md p-6 sm:p-10 pb-10 sm:pb-10 space-y-6 sm:space-y-8 shadow-2xl border-x-0 border-b-0 sm:border border-white/40 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-center sticky top-0 bg-white/0 z-10">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {authMode === 'login' && 'Welcome Back'}
                  {authMode === 'signup' && 'Join OdishaExamPrep'}
                  {authMode === 'forgotPassword' && 'Reset Password'}
                  {authMode === 'resetPassword' && 'Create New Password'}
                </h3>
                <button onClick={() => setShowAuthModal(false)} className="p-2 -mr-2 bg-slate-100/50 hover:bg-slate-200/50 rounded-full transition-colors backdrop-blur-md">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              {authMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-4 border rounded-2xl flex items-start gap-3 text-xs font-semibold leading-relaxed shadow-sm",
                    authMessage.type === 'error' && "bg-rose-50 border-rose-100/80 text-rose-700",
                    authMessage.type === 'info' && "bg-blue-50 border-blue-100/80 text-blue-700",
                    authMessage.type === 'success' && "bg-emerald-50 border-emerald-100/80 text-emerald-700"
                  )}
                >
                  {authMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                  {authMessage.type === 'info' && <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />}
                  {authMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    {authMessage.text}
                  </div>
                </motion.div>
              )}

              <form onSubmit={
                 authMode === 'forgotPassword'
                   ? handleForgotPasswordSubmit
                   : authMode === 'resetPassword'
                     ? handleResetPasswordSubmit
                     : handleEmailAuth
               } className="space-y-5">
                 <div className="space-y-4">
                  {/* Full Name field (Signup only) */}
                  {authMode === 'signup' && (
                    <div className="space-y-1.5 text-left">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">
                        Full Name
                      </label>
                      <input 
                        type="text" 
                        placeholder="John Doe" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200/60 bg-white/50 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium text-base" 
                      />
                    </div>
                  )}

                  {/* Email field (Login, Signup, Forgot Password) */}
                  {authMode !== 'resetPassword' && (
                    <div className="space-y-1.5 text-left">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">
                        Email Address
                      </label>
                      <input 
                        type="email" 
                        placeholder="email@example.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200/60 bg-white/50 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium text-base" 
                      />
                    </div>
                  )}

                  {/* Password field (Login, Signup, Reset Password) */}
                  {authMode !== 'forgotPassword' && (
                    <div className="space-y-1.5 text-left">
                      <div className="flex justify-between items-center pl-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                          {authMode === 'resetPassword' ? "New Password" : "Password"}
                        </label>
                        {authMode === 'login' && (
                          <button
                            type="button"
                            onClick={() => setAuthMode('forgotPassword')}
                            className="text-[11px] font-extrabold text-brand-600 hover:text-brand-700 hover:underline transition-all focus:outline-none border-none bg-transparent cursor-pointer"
                          >
                            Forgot Password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="••••••••" 
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
                  )}

                  {/* Confirm Password field (Reset Password only) */}
                  {authMode === 'resetPassword' && (
                    <div className="space-y-1.5 text-left">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200/60 bg-white/50 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium text-base pr-12" 
                        />
                      </div>
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-base sm:text-lg">
                  {authMode === 'login' && 'Sign In'}
                  {authMode === 'signup' && 'Create Account'}
                  {authMode === 'forgotPassword' && 'Send Reset Link'}
                  {authMode === 'resetPassword' && 'Update Password'}
                </Button>
              </form>

              {(authMode === 'login' || authMode === 'signup') && (
                <p className="text-center text-sm text-slate-500 font-medium">
                  {authMode === 'login' ? "New to OdishaExamPrep? " : "Already a member? "}
                  <button 
                    onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                    className="text-brand-600 font-extrabold hover:underline transition-all"
                  >
                    {authMode === 'login' ? 'Register' : 'Login'}
                  </button>
                </p>
              )}

              {authMode === 'forgotPassword' && (
                <p className="text-center text-sm text-slate-500 font-medium">
                  Remember your password?{" "}
                  <button 
                    onClick={() => setAuthMode('login')}
                    className="text-brand-600 font-extrabold hover:underline transition-all"
                  >
                    Login
                  </button>
                </p>
              )}
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

  // Sync profile when the library is opened/mounted
  React.useEffect(() => {
    refreshProfile().catch((err) => console.error("Error refreshing profile on mount:", err));
  }, []);

  // Self-healing cleanup of deleted items from user purchases
  // Disabled client-side destructive cleanup to protect entitlements of users when admin panel restructures or archives items.
  React.useEffect(() => {
    // Entitlements are validated and healed directly from database user_purchases ledger in AuthContext.
  }, [user, profile?.purchasedSeries]);

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
    if (d.startsWith('JSON_METADATA_')) {
      try {
        const meta = JSON.parse(d.replace('JSON_METADATA_', ''));
        return meta.description || '';
      } catch (e) {
        return '';
      }
    }
    if (d.startsWith('{')) return '';
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
    if (b.isPremium && hasAccessTo(b) && !(profile.hasFullAccess || profile.role === 'admin')) {
      const section = getOrCreate(b.examId || '_misc');
      if (!section.questionBanks.find((q: any) => q.id === b.id)) {
        section.questionBanks.push(b);
      }
    }
  });

  const sections = Object.values(examSections).filter(s => {
    const existsInExams = exams.some((e: any) => e.id === s.exam.id);
    if (!existsInExams && s.exam.id !== '_misc') {
      return false;
    }
    return s.isBundle || s.mockTests.length > 0 || s.questionBanks.length > 0;
  });

  const isFullAccess = profile.hasFullAccess || profile.role === 'admin';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 mt-4 md:mt-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 text-center mb-8 relative">
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
        <div className="flex justify-center mt-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 font-bold rounded-xl text-xs transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none"
          >
            <RotateCw className={cn("w-3.5 h-3.5 text-brand-600", refreshing && "animate-spin")} />
            {refreshing ? 'Syncing Library...' : 'Sync Library'}
          </button>
        </div>
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
const getCachedData = (key: string, fallback: any) => {
  try {
    const saved = sessionStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (e) {
    return fallback;
  }
};

const _dashboardCache: {
  exams: any[];
  testSeries: any[];
  mockTests: any[];
  dynamicQuestionBanks: Record<string, any[]>;
  loadedForUserId: string | null;
  hasFetchedThisSession: boolean;
} = {
  exams: getCachedData('oep_cached_exams', []),
  testSeries: getCachedData('oep_cached_testSeries', []),
  mockTests: getCachedData('oep_cached_mockTests', []),
  dynamicQuestionBanks: getCachedData('oep_cached_dynamicQuestionBanks', {}),
  loadedForUserId: sessionStorage.getItem('oep_cached_loadedForUserId') || null,
  hasFetchedThisSession: false,
};

// --- Goal Onboarding Modal ---
const OnboardingModal = ({ 
  isOpen, 
  onSave, 
  user 
}: { 
  isOpen: boolean; 
  onSave: (targetExam: string, targetTimeline: string, currentPrepLevel: string) => Promise<void>; 
  user: any 
}) => {
  const [targetExam, setTargetExam] = useState<'OPSC' | 'OSSC' | 'OSSSC'>('OPSC');
  const [targetTimeline, setTargetTimeline] = useState<'3m' | '6m' | '1y'>('6m');
  const [currentPrepLevel, setCurrentPrepLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave(targetExam, targetTimeline, currentPrepLevel);
    } catch(err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-[#FAF8F5] border-2 border-slate-900 rounded-[2.5rem] p-6 sm:p-10 max-w-lg w-full shadow-[8px_8px_0px_rgba(0,0,0,1)] relative overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="absolute inset-0 pointer-events-none border-[12px] border-slate-900/5 rounded-[2.5rem]" />
        
        <form onSubmit={handleSubmit} className="space-y-8 relative z-10 flex-1 overflow-y-auto no-scrollbar smooth-scroll-gpu pr-1 py-1">
          <div className="text-center space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#8A1C36]/10 text-[#8A1C36] rounded-full text-xs font-black uppercase tracking-wider border border-[#8A1C36]/20">
              <Target className="w-3.5 h-3.5" />
              Set Your Target Goal
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif font-extrabold text-slate-950 tracking-tight">
              Personalize Your Prep
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm font-medium max-w-sm mx-auto">
              Tell us your target exam, timeline, and current level to customize your dashboard layout and recommendation tracks.
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-mono">
                1. Target Exam
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['OPSC', 'OSSC', 'OSSSC'] as const).map((exam) => (
                  <button
                    key={exam}
                    type="button"
                    onClick={() => setTargetExam(exam)}
                    className={cn(
                      "py-3.5 sm:py-4 px-2.5 rounded-2xl border-2 text-xs font-black uppercase tracking-widest transition-all cursor-pointer",
                      targetExam === exam
                        ? "bg-[#8A1C36] text-white border-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                        : "bg-white text-slate-700 border-slate-200/80 hover:border-slate-400 hover:bg-slate-50/50"
                    )}
                  >
                    {exam}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-mono">
                2. Target Timeline
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: '3m', label: '3 Months' },
                  { value: '6m', label: '6 Months' },
                  { value: '1y', label: '1 Year' }
                ].map((time) => (
                  <button
                    key={time.value}
                    type="button"
                    onClick={() => setTargetTimeline(time.value as any)}
                    className={cn(
                      "py-3.5 sm:py-4 px-2 rounded-2xl border-2 text-xs font-black uppercase tracking-widest transition-all cursor-pointer",
                      targetTimeline === time.value
                        ? "bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                        : "bg-white text-slate-700 border-slate-200/80 hover:border-slate-400 hover:bg-slate-50/50"
                    )}
                  >
                    {time.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-mono">
                3. Preparation Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'beginner', label: 'Beginner' },
                  { value: 'intermediate', label: 'Intermediate' },
                  { value: 'advanced', label: 'Advanced' }
                ].map((lvl) => (
                  <button
                    key={lvl.value}
                    type="button"
                    onClick={() => setCurrentPrepLevel(lvl.value as any)}
                    className={cn(
                      "py-3.5 sm:py-4 px-1 rounded-2xl border-2 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all cursor-pointer",
                      currentPrepLevel === lvl.value
                        ? "bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                        : "bg-white text-slate-700 border-slate-200/80 hover:border-slate-400 hover:bg-slate-50/50"
                    )}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 py-4.5 rounded-[1.25rem] border-2 border-slate-900 text-xs font-black uppercase tracking-widest text-white bg-[#8A1C36] hover:bg-[#72142a] transition-all cursor-pointer shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving Goals...' : 'Save & Personalize Dashboard'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const DashboardContent = ({ isGuest, onSignIn, mainTab = 'home', user, activities = [], onNavigate, onActivityLogged, selectedExam: propsSelectedExam, setSelectedExam: propsSetSelectedExam }: { isGuest?: boolean, onSignIn?: () => void, mainTab?: string, user?: any, activities?: any[], onNavigate?: (tab: any) => void, onActivityLogged?: () => void, selectedExam?: string | null, setSelectedExam?: (val: string | null) => void }) => {
  const { profile, isAdmin, hasFullAccess, grantFullAccess, hasAccessTo, unlockItem, guestUsage, incrementGuestUsage } = useAuth();
  const navigate = useNavigate();
  const [dynamicQuestionBanks, setDynamicQuestionBanks] = useState<Record<string, any[]>>(() => _dashboardCache.dynamicQuestionBanks);
  const [exams, setExams] = useState<any[]>(() => _dashboardCache.exams);
  const [testSeries, setTestSeries] = useState<any[]>(() => _dashboardCache.testSeries);
  const [mockTests, setMockTests] = useState<any[]>(() => _dashboardCache.mockTests);
  const [loadingExams, setLoadingExams] = useState(() => _dashboardCache.exams.length === 0);
  const [selectedMockCategory, setSelectedMockCategory] = useState<string | null>(() => sessionStorage.getItem('oep_selectedMockCategory') || null);
  const [internalSelectedExam, setInternalSelectedExam] = useState<string | null>(() => sessionStorage.getItem('oep_selectedExam') || null);
  const selectedExam = propsSelectedExam !== undefined ? propsSelectedExam : internalSelectedExam;
  const setSelectedExam = (val: string | null) => {
    if (val === null) {
      sessionStorage.setItem('oep_auto_navigated_dismissed', 'true');
    }
    if (propsSetSelectedExam) {
      propsSetSelectedExam(val);
    } else {
      setInternalSelectedExam(val);
    }
  };
  const [showAdmin, setShowAdmin] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isBannerDescExpanded, setIsBannerDescExpanded] = useState(false);

  // Refs and scroll handlers for horizontal lists
  const continuePracticeRef = useRef<HTMLDivElement>(null);
  const recentActivityRef = useRef<HTMLDivElement>(null);

  const smoothScroll = (element: HTMLDivElement | null, direction: 'left' | 'right') => {
    if (!element) return;
    const { scrollLeft, clientWidth } = element;
    const scrollAmount = clientWidth * 0.75;
    const targetOffset = direction === 'left' 
      ? Math.max(0, scrollLeft - scrollAmount) 
      : Math.min(element.scrollWidth - clientWidth, scrollLeft + scrollAmount);

    const startOffset = scrollLeft;
    const change = targetOffset - startOffset;
    if (change === 0) return;
    const duration = 500; // 500ms
    const startTime = performance.now();

    // Disable snap scroll during scroll animation to prevent stutter
    element.style.scrollSnapType = 'none';

    const easeInOutCubic = (t: number) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = easeInOutCubic(progress);

      element.scrollLeft = startOffset + change * easeProgress;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Restore snap scroll
        element.style.scrollSnapType = '';
      }
    };

    requestAnimationFrame(animate);
  };

  const scrollContinuePractice = (direction: 'left' | 'right') => {
    smoothScroll(continuePracticeRef.current, direction);
  };

  const scrollRecentActivity = (direction: 'left' | 'right') => {
    smoothScroll(recentActivityRef.current, direction);
  };

  useEffect(() => {
    if (selectedExam) {
      sessionStorage.setItem('oep_selectedExam', selectedExam);
      const name = exams.find((e: any) => e.id === selectedExam)?.name || selectedExam;
      sessionStorage.setItem('oep_selectedExamName', name);
    } else {
      sessionStorage.removeItem('oep_selectedExam');
      sessionStorage.removeItem('oep_selectedExamName');
    }
    setIsDescExpanded(false);
    setIsBannerDescExpanded(false);
    window.dispatchEvent(new CustomEvent('oep-activity-changed'));
  }, [selectedExam, exams]);

  useEffect(() => {
    if (selectedExam) {
      if (isGuest) {
        scrollToElement('exams', { block: 'start' });
      } else {
        scrollToTop();
      }
    }
  }, [selectedExam, isGuest]);

  useEffect(() => {
    if (user && !user.user_metadata?.targetExam) {
      const dismissed = sessionStorage.getItem('oep_onboarding_dismissed');
      if (!dismissed) {
        setShowOnboarding(true);
      }
    }
  }, [user]);



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

  // Recovery Effect: Automatically restore active test state on page reload
  useEffect(() => {
    try {
      const rawState = sessionStorage.getItem('oep_activeTestState');
      if (rawState) {
        const parsed = JSON.parse(rawState);
        const currentUserId = user?.id || null;
        if (currentUserId && parsed.userId === currentUserId && parsed.test) {
          console.log('[Recovery] Restoring active test session:', parsed.resumeSessionId);
          setActiveTest(parsed.test);
          setActiveTestState(parsed);
        }
      }
    } catch (e) {
      console.error('[Recovery] Failed to restore active test state:', e);
    }
  }, [user]);
  const [testResults, setTestResults] = useState<any | null>(null);

  const handleViewResults = async (results: any) => {
    if (!results) {
      setTestResults(null);
      return;
    }
    let finalResults = { ...results };
    if (finalResults.test && finalResults.test.id && !finalResults.test.id.startsWith('practice-')) {
      try {
        const freshQs = await examService.getQuestionsForMockTest(finalResults.test.id);
        if (freshQs && freshQs.length > 0) {
          const freshMap = new Map(freshQs.map(q => [q.id, q]));
          finalResults.test.questions = (finalResults.test.questions || []).map((q: any) => {
            const fresh = freshMap.get(q.id);
            return fresh ? { ...q, ...fresh } : q;
          });
        }
      } catch (e) {
        console.error("Failed to merge fresh questions for results review:", e);
      }
    }
    setTestResults(finalResults);
  };

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
        <OnboardingModal 
          isOpen={showOnboarding} 
          onSave={handleSaveOnboarding} 
          user={user} 
        />
        {/* Detail View Modal */}
        <AnimatePresence>
          {selectedBankItem && (
            <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[#FAF8F5] rounded-[2rem] w-[95%] sm:w-[90%] md:w-full max-w-sm md:max-w-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col md:flex-row border border-slate-200/50 relative max-h-[90vh] md:max-h-[85vh]"
              >
                {/* Unified Close Button (Adaptive theme based on viewport layout context) */}
                <button 
                  onClick={() => setSelectedBankItem(null)}
                  className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 text-white md:bg-slate-100 md:hover:bg-slate-200 md:text-slate-500 rounded-xl backdrop-blur-md md:backdrop-blur-none transition-all z-50 hover:scale-105 active:scale-95 border-none cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Left Column: Premium Visual Branding & Stats (Fixed height on mobile, full-height banner on laptop) */}
                <div className="relative h-48 md:h-auto md:min-h-[440px] md:w-[38%] bg-gradient-to-br from-[#12040b]/98 via-[#08020a]/99 to-[#030005]/100 border-b md:border-b-0 md:border-r border-slate-200/50 flex flex-col justify-center md:justify-between items-center p-6 md:p-8 overflow-hidden shrink-0">
                  {/* Ambient background grid and glowing orb */}
                  <div className="absolute inset-0 grid-bg opacity-[0.06] pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-brand-500/10 rounded-full blur-[60px] pointer-events-none" />
                  
                  {/* Category image as soft abstract overlay texture */}
                  {selectedBankItem.image && (
                    <img 
                      src={getDirectImageUrl(selectedBankItem.image)} 
                      alt="" 
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover opacity-90 pointer-events-none select-none z-0"
                      referrerPolicy="no-referrer"
                    />
                  )}

                  {/* Dark gradient overlay to ensure text contrast and readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25 z-[1] pointer-events-none" />

                  {/* Interactive Orbital Study Seal */}
                  <div className="relative flex flex-col items-center justify-center space-y-3 md:space-y-4 w-full md:my-auto z-10">
                    <div className="relative w-20 h-20 md:w-24 md:h-24 flex items-center justify-center shrink-0">
                      <div className="absolute inset-0 rounded-full border border-dashed border-brand-500/30 animate-[spin_20s_linear_infinite]" />
                      <div className="absolute inset-2 rounded-full border border-brand-500/10 border-t-brand-500/40 animate-[spin_5s_linear_infinite_reverse]" />
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl shadow-brand-500/20 backdrop-blur-md">
                        <BookOpen className="w-5.5 h-5.5 md:w-6 md:h-6 text-brand-400" />
                      </div>
                    </div>
                    
                    {/* Header title for mobile */}
                    <div className="text-center md:hidden w-full px-2">
                      <h2 
                        className={cn(
                          "font-serif font-extrabold text-white leading-tight line-clamp-2",
                          selectedBankItem.title.length > 55 ? "text-lg" : "text-2xl"
                        )}
                        title={selectedBankItem.title}
                      >
                        {selectedBankItem.title}
                      </h2>
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-400 mt-1">Question Bank Portal</p>
                    </div>

                    {/* Branding label for laptop */}
                    <div className="hidden md:block text-center space-y-1">
                      <h3 className="text-xl font-serif font-extrabold text-white">
                        Odisha<span className="font-serif italic font-normal text-brand-400">Prep</span>
                      </h3>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Study Companion</p>
                    </div>
                  </div>

                  {/* Desktop Stats Cards (translucent style, hidden on mobile) */}
                  <div className="relative hidden md:grid grid-cols-2 gap-3 z-10 w-full mt-auto">
                    <div className="p-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md shadow-sm">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Questions</p>
                      <p className="text-base font-black text-white">{selectedBankItem.questions}</p>
                    </div>
                    <div className="p-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md shadow-sm">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Highlight</p>
                      <p className="text-[10px] font-black text-brand-400 line-clamp-2 leading-tight" title={selectedBankItem.tagline || "Comprehensive"}>
                        {selectedBankItem.tagline || "Comprehensive"}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Right Column: Metadata, List & Actions */}
                <div className="relative md:w-[62%] p-6 md:p-8 flex flex-col relative overflow-y-auto no-scrollbar smooth-scroll-gpu max-h-full flex-1">
                  {/* Subtle grid background */}
                  <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

                  <div className="space-y-6 relative z-10 flex-grow flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Topic Title (Laptop only) */}
                      <div className="hidden md:block space-y-1">
                        <span className="inline-flex items-center px-2 py-0.5 bg-brand-50 text-[#8A1C36] rounded text-[9px] font-black uppercase tracking-wider border border-brand-100">
                          Topic Focus
                        </span>
                        <h2 
                          className={cn(
                            "font-serif font-extrabold text-slate-900 leading-tight line-clamp-2 md:line-clamp-3",
                            selectedBankItem.title.length > 55 ? "text-xl md:text-2xl" : "text-2xl md:text-3xl"
                          )}
                          title={selectedBankItem.title}
                        >
                          {selectedBankItem.title}
                        </h2>
                      </div>

                      {/* Description */}
                      <p className="text-slate-500 text-sm font-medium leading-relaxed">
                        {selectedBankItem.description || (
                          selectedBankItem.title.length > 50 
                            ? 'Access official question banks, chapter notes, and exam practice materials customized for this topic.'
                            : `Access official question banks, chapter notes, and exam practice materials customized for ${selectedBankItem.title}.`
                        )}
                      </p>
                      
                      {/* Mobile Stats Cards (Rendered here on mobile viewports) */}
                      <div className="grid grid-cols-2 gap-3 md:hidden">
                        <div className="p-3 bg-white border border-slate-200/60 rounded-2xl shadow-sm">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Questions</p>
                          <p className="text-base font-black text-slate-900">{selectedBankItem.questions}</p>
                        </div>
                        <div className="p-3 bg-white border border-slate-200/60 rounded-2xl shadow-sm">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Highlight</p>
                          <p className="text-[10px] font-black text-[#8A1C36] line-clamp-2 leading-tight" title={selectedBankItem.tagline || "Comprehensive"}>
                            {selectedBankItem.tagline || "Comprehensive"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Study Materials */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Study Materials</p>
                        {selectedBankItem.pdfLinks && selectedBankItem.pdfLinks.length > 2 && (
                          <span className="text-[9px] font-bold text-[#8A1C36] animate-pulse">Scroll to view all</span>
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
                        className="max-h-[160px] overflow-y-auto pr-1 space-y-2 custom-scrollbar"
                      >
                        {selectedBankItem.pdfLinks && selectedBankItem.pdfLinks.length > 0 ? (
                          selectedBankItem.pdfLinks.map((link: any, idx: number) => (
                            <motion.button 
                              key={idx}
                              variants={{
                                hidden: { opacity: 0, x: -10 },
                                show: { opacity: 1, x: 0 }
                              }}
                              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white hover:bg-brand-50/50 border border-slate-200/60 hover:border-brand-200/60 transition-all group relative overflow-hidden shadow-sm cursor-pointer"
                              onClick={() => {
                                if (isGuest) {
                                  setShowLoginPrompt(true);
                                  return;
                                }
                                if (selectedBankItem.isPremium && !hasAccessTo(selectedBankItem)) {
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
                                  setPaywallProductType('question_bank');
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
                                <div className="w-8.5 h-8.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[#8A1C36] group-hover:scale-110 group-hover:bg-[#8A1C36] group-hover:text-white transition-all shadow-sm">
                                  <Download className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-bold text-slate-800 group-hover:text-slate-950 truncate max-w-[140px] sm:max-w-[220px] md:max-w-[280px] lg:max-w-[340px]">
                                    {link.title || 'Download PDF'}
                                  </p>
                                  <p className="text-[9px] font-bold text-slate-400">PDF Document</p>
                                </div>
                              </div>
                              
                              {selectedBankItem.isPremium && !hasAccessTo(selectedBankItem) ? (
                                <Lock className="w-4 h-4 text-slate-400 group-hover:text-[#8A1C36] transition-colors" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#8A1C36] group-hover:translate-x-1 transition-all" />
                              )}
                            </motion.button>
                          ))
                        ) : (
                          <div className="py-8 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                             <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No files available</p>
                          </div>
                        )}
                      </motion.div>
                    </div>

                    {/* Bottom Action Button */}
                    <div className="pt-2">
                      <Button 
                        variant="primary" 
                        className={cn(
                          "w-full h-13 rounded-2xl text-xs font-black uppercase tracking-widest premium-gradient text-white shadow-lg shadow-brand-500/20 hover:premium-glow",
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

                          if (selectedBankItem.isPremium && !hasAccessTo(selectedBankItem)) {
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
                            setPaywallProductType('question_bank');
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
                        ) : selectedBankItem.isPremium && !hasAccessTo(selectedBankItem) ? (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            Unlock to Practice
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2 fill-current" />
                            Practice Now
                          </>
                        )}
                      </Button>
                    </div>
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
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-slate-950/40 pointer-events-auto"
            >
              <div className="absolute inset-0" onClick={() => setShowPracticeConfig(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-slate-200/50 overflow-hidden"
              >
                {/* Background glowing effects */}
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="p-5 sm:p-7 md:p-9 overflow-y-auto no-scrollbar relative z-10 flex flex-col">
                  <div className="flex justify-between items-start mb-6 md:mb-8 border-b border-slate-100 pb-5">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 premium-gradient rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/10">
                        <Dumbbell className="w-6 h-6 text-white animate-[pulse_3s_infinite]" />
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black premium-text-gradient tracking-tight">Configure Practice</h3>
                        <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-0.5">Set your preferences for this session</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowPracticeConfig(false)} 
                      className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer border border-slate-200/40"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7 mb-6 md:mb-8">
                    {/* Select Exam Card */}
                    <div className="bg-slate-50/50 border border-slate-200/50 rounded-2xl p-4.5 space-y-3 flex flex-col justify-between hover:border-brand-200 hover:shadow-md hover:shadow-brand-500/2 transition-all duration-300 relative group">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-brand-500/5 rounded-full blur-lg pointer-events-none" />
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                          Select Exam
                        </label>
                        <span className="text-[9px] font-extrabold text-brand-600 bg-brand-50/80 px-2 py-0.5 rounded-full uppercase tracking-wider">Step 1</span>
                      </div>
                      <SearchableSelect
                        value={practiceSettings.examId || ''}
                        onChange={(val) => setPracticeSettings({...practiceSettings, examId: val, category: '', topic: ''})}
                        options={actualExams.map(ex => ({ value: ex.id, label: ex.name }))}
                        placeholder="Choose an exam..."
                        searchPlaceholder="Search exams..."
                        className="px-4 h-[48px] rounded-xl text-sm border-slate-200 bg-white hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 transition-all font-bold text-slate-700 shadow-sm"
                      />
                    </div>

                    {/* Select Category Card */}
                    <div className={cn(
                      "border rounded-2xl p-4.5 space-y-3 flex flex-col justify-between transition-all duration-300 relative group",
                      practiceSettings.examId 
                        ? "bg-slate-50/50 border-slate-200/50 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/2" 
                        : "bg-slate-100/20 border-slate-200/30 opacity-75"
                    )}>
                      {practiceSettings.examId && <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-lg pointer-events-none" />}
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full", practiceSettings.examId ? "bg-indigo-500 animate-pulse" : "bg-slate-300")} />
                          Select Category
                        </label>
                        <span className={cn("text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider",
                          practiceSettings.examId ? "text-indigo-600 bg-indigo-50/80" : "text-slate-400 bg-slate-100"
                        )}>Step 2</span>
                      </div>
                      {!practiceSettings.examId ? (
                        <div className="h-[48px] rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-between px-4 text-slate-400 text-xs font-semibold select-none">
                          <span className="flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-slate-300" />
                            <span>Select an exam first</span>
                          </span>
                        </div>
                      ) : (
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
                          placeholder="Choose a category..."
                          searchPlaceholder="Search categories..."
                          className="px-4 h-[48px] rounded-xl text-sm border-slate-200 bg-white hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold text-slate-700 shadow-sm"
                        />
                      )}
                    </div>

                    {/* Select Topic / Unit Card */}
                    <div className={cn(
                      "border rounded-2xl p-4.5 space-y-3 flex flex-col justify-between transition-all duration-300 relative group sm:col-span-2 lg:col-span-1",
                      practiceSettings.category 
                        ? "bg-slate-50/50 border-slate-200/50 hover:border-purple-200 hover:shadow-md hover:shadow-purple-500/2" 
                        : "bg-slate-100/20 border-slate-200/30 opacity-75"
                    )}>
                      {practiceSettings.category && <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-lg pointer-events-none" />}
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full", practiceSettings.category ? "bg-purple-500 animate-pulse" : "bg-slate-300")} />
                          Select Topic / Unit
                        </label>
                        <span className={cn("text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider",
                          practiceSettings.category ? "text-purple-600 bg-purple-50/80" : "text-slate-400 bg-slate-100"
                        )}>Step 3</span>
                      </div>
                      {!practiceSettings.category ? (
                        <div className="h-[48px] rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-between px-4 text-slate-400 text-xs font-semibold select-none">
                          <span className="flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-slate-300" />
                            <span>Select a category first</span>
                          </span>
                        </div>
                      ) : (
                        <SearchableSelect
                          value={practiceSettings.topic}
                          onChange={(val) => setPracticeSettings({...practiceSettings, topic: val})}
                          disabled={!practiceSettings.category}
                          options={(dynamicQuestionBanks[practiceSettings.category] || [])
                            .filter((item: any) => item.examId === practiceSettings.examId && (!item.is_archived || hasAccessTo(item)))
                            .map((item: any) => ({
                              value: item.id,
                              label: `${item.title} ${item.isPremium && !hasAccessTo(item) ? '(Premium)' : ''}`
                            }))}
                          placeholder="Choose a topic..."
                          searchPlaceholder="Search topics..."
                          className="px-4 h-[48px] rounded-xl text-sm border-slate-200 bg-white hover:border-slate-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 transition-all font-bold text-slate-700 shadow-sm"
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-7">
                    <div className="space-y-2">
                      <div className="flex justify-between items-end mb-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          Number of Questions
                        </label>
                        {practiceSettings.topic && (
                          <span className="text-[10px] font-bold text-indigo-650 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-full">
                            {topicMaxQuestions} Available
                          </span>
                        )}
                      </div>
                      {!practiceSettings.topic ? (
                        <div className="w-full py-9 rounded-2xl border border-dashed border-slate-300 bg-slate-50/30 text-slate-400 font-bold text-center text-xs md:text-sm flex flex-col items-center justify-center gap-2 shadow-sm transition-all duration-300">
                          <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                            <Lock className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="text-slate-400 font-extrabold text-[11px] uppercase tracking-wider">Select a topic first</div>
                        </div>
                      ) : topicMaxQuestions === 0 ? (
                        <div className="w-full py-9 rounded-2xl border border-dashed border-rose-200 bg-rose-50/20 text-rose-500 font-bold text-center text-xs md:text-sm flex flex-col items-center justify-center gap-2 shadow-sm transition-all duration-300">
                          <div className="w-9 h-9 bg-rose-50 rounded-full flex items-center justify-center text-rose-400">
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                          </div>
                          <div className="text-rose-500 font-extrabold text-[11px] uppercase tracking-wider">No questions available yet</div>
                        </div>
                      ) : (
                        <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-5 relative overflow-hidden transition-all duration-300 shadow-sm hover:border-slate-300/80">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-2xl font-black text-indigo-950 tracking-tight flex items-baseline gap-1">
                              {practiceSettings.questions}
                              <span className="text-xs font-semibold text-slate-400">questions</span>
                            </span>
                            <span className="text-[10px] font-extrabold text-indigo-650 bg-indigo-50/80 border border-indigo-100/50 px-2 py-0.5 rounded-full">
                              Range: 1 - {topicMaxQuestions}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <input 
                              type="range" 
                              min="1" 
                              max={topicMaxQuestions} 
                              value={practiceSettings.questions}
                              onChange={(e) => setPracticeSettings({...practiceSettings, questions: e.target.value})}
                              className="flex-1 accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" 
                            />
                            <div className="relative w-16 shrink-0">
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
                                className="w-full py-1.5 px-2 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-black text-slate-800 text-center text-xs md:text-sm shadow-sm" 
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-end mb-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          Time Limit
                        </label>
                      </div>
                      {!practiceSettings.topic ? (
                        <div className="w-full py-9 rounded-2xl border border-dashed border-slate-300 bg-slate-50/30 text-slate-400 font-bold text-center text-xs md:text-sm flex flex-col items-center justify-center gap-2 shadow-sm transition-all duration-300">
                          <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                            <Lock className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="text-slate-400 font-extrabold text-[11px] uppercase tracking-wider">Select a topic first</div>
                        </div>
                      ) : topicMaxQuestions === 0 ? (
                        <div className="w-full py-9 rounded-2xl border border-dashed border-slate-200 bg-slate-50/30 text-slate-400 font-bold text-center text-xs md:text-sm flex flex-col items-center justify-center gap-2 shadow-sm transition-all duration-300">
                          <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                            <Lock className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="text-slate-400 font-extrabold text-[11px] uppercase tracking-wider">-</div>
                        </div>
                      ) : (
                        <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-5 relative overflow-hidden transition-all duration-300 shadow-sm hover:border-slate-300/80">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-2xl font-black text-indigo-950 tracking-tight flex items-baseline gap-1">
                              {practiceSettings.timeLimit}
                              <span className="text-xs font-semibold text-slate-400">minutes</span>
                            </span>
                            <span className="text-[10px] font-extrabold text-indigo-650 bg-indigo-50/80 border border-indigo-100/50 px-2 py-0.5 rounded-full">
                              Range: 1 - 180 min
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <input 
                              type="range" 
                              min="1" 
                              max="180" 
                              value={practiceSettings.timeLimit}
                              onChange={(e) => setPracticeSettings({...practiceSettings, timeLimit: e.target.value})}
                              className="flex-1 accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" 
                            />
                            <div className="relative w-16 shrink-0">
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
                                className="w-full py-1.5 px-2 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-black text-slate-800 text-center text-xs md:text-sm shadow-sm" 
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 md:mt-10 flex justify-center w-full">
                    <Button
                      disabled={!practiceSettings.topic || loadingPractice || topicMaxQuestions === 0}
                      className={cn(
                        "w-full sm:w-auto px-10 sm:px-16 py-4 rounded-2xl text-sm sm:text-base font-black transition-all sm:min-w-[280px] flex items-center justify-center gap-2 cursor-pointer shadow-lg group/btn",
                        (!practiceSettings.topic || loadingPractice || topicMaxQuestions === 0)
                          ? "bg-slate-100 text-slate-400 border border-slate-200/60 shadow-none pointer-events-none cursor-not-allowed"
                          : "premium-gradient text-white hover:premium-glow hover:scale-[1.02] shadow-brand-500/20"
                      )}
                      onClick={handleStartDynamicPractice}
                    >
                      {loadingPractice ? 'Compiling Practice...' : 'Start Practice Session'}
                      <ChevronRight className="w-5 h-5 ml-1 transition-transform group-hover/btn:translate-x-1" />
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
            <div className="fixed inset-0 bg-slate-950/75 z-[250] flex items-center justify-center p-4 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className="relative overflow-hidden rounded-[2.5rem] p-[1px] bg-gradient-to-b from-white/15 via-white/5 to-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] w-full max-w-md max-h-[90vh] flex flex-col"
              >
                {/* Background ambient light */}
                <div className="absolute top-0 left-1/4 w-[180px] h-[180px] bg-brand-500/10 rounded-full blur-[50px] pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-[180px] h-[180px] bg-indigo-500/10 rounded-full blur-[50px] pointer-events-none" />

                <div className="bg-[#0B0F19] rounded-[2.45rem] p-6 sm:p-8 relative overflow-hidden flex flex-col max-h-full flex-1">
                  {/* Close button with subtle outline */}
                  {paymentState === 'idle' && (
                    <button 
                      onClick={() => { 
                        setShowPaywall(false); 
                        setPaywallItemId(null); 
                        setPaymentState('idle');
                        setPaymentError(null);
                      }}
                      className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all z-20"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  <AnimatePresence mode="wait">
                    {paymentState === 'idle' && (
                      <motion.div 
                        key="idle"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className="text-center space-y-6 overflow-y-auto no-scrollbar smooth-scroll-gpu flex-1 pr-1 py-2 mt-4"
                      >
                        {/* Pulsing visual badge */}
                        <motion.div 
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                          className="w-16 h-16 bg-gradient-to-tr from-brand-600 via-brand-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-[0_8px_25px_rgba(138,28,54,0.3)] border border-white/10 relative group"
                        >
                          <Award className="text-white w-8 h-8 filter drop-shadow-[0_2px_8px_rgba(255,255,255,0.25)]" />
                          <div className="absolute inset-0 border border-brand-400/25 rounded-2xl animate-ping opacity-25 pointer-events-none" />
                        </motion.div>
                        
                        <div className="space-y-2">
                          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight px-1 font-sans">
                            {paywallItemTitle.includes('Full Access') ? (
                              <>Unlock <span className="font-serif italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-brand-300 via-pink-200 to-indigo-300">Full Access</span></>
                            ) : (
                              <>Unlock <span className="font-serif italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-brand-300 via-pink-200 to-indigo-300">{paywallItemTitle}</span></>
                            )}
                          </h2>
                          <p className="text-slate-400 text-xs sm:text-sm font-medium leading-relaxed max-w-sm mx-auto">
                            {paywallItemTitle.includes('Full Access') 
                              ? 'Unlock full lifetime access to all Question Banks, Practice Mode, Premium Mock Tests, PDF notes, and any future content added to this exam.' 
                              : `Unlock full lifetime access to this specific premium content, including detailed solutions and any future updates.`
                            }
                          </p>
                        </div>

                        {/* Features Panel */}
                        <motion.div 
                          initial="hidden"
                          animate="show"
                          variants={{
                            hidden: { opacity: 0 },
                            show: {
                              opacity: 1,
                              transition: { staggerChildren: 0.06 }
                            }
                          }}
                          className="space-y-3.5 text-left bg-white/[0.02] border border-white/[0.06] p-5 rounded-[1.5rem] backdrop-blur-md"
                        >
                          {paywallFeatures.map((benefit, i) => (
                            <motion.div 
                              key={i} 
                              variants={{
                                hidden: { opacity: 0, x: -8 },
                                show: { opacity: 1, x: 0 }
                              }}
                              className="flex items-center gap-3 text-slate-200 font-bold"
                            >
                              <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              </div>
                              <span className="text-xs sm:text-sm tracking-wide">{benefit}</span>
                            </motion.div>
                          ))}
                        </motion.div>

                        {/* Pricing Block */}
                        <div className="space-y-4 pt-1">
                          <div className="flex flex-col items-center justify-center">
                            <div className="flex items-end justify-center gap-2.5 mb-1.5">
                              <span className="text-lg sm:text-xl font-bold text-slate-500 line-through mb-1 font-mono">₹{paywallOriginalPrice}</span>
                              <span className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tighter">₹{paywallPrice}</span>
                            </div>
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
                              {Math.round(((paywallOriginalPrice - paywallPrice) / paywallOriginalPrice) * 100)}% OFF • Lifetime Access
                            </span>
                          </div>

                          {/* CTA Button */}
                          <Button 
                            className="w-full h-13 rounded-2xl text-base font-black bg-gradient-to-r from-brand-600 via-brand-500 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-[0_8px_30px_rgba(138,28,54,0.3)] hover:shadow-[0_15px_45px_rgba(138,28,54,0.5)] group/btn relative overflow-hidden transition-all duration-300 active:scale-[0.98] border border-white/10"
                            onClick={async () => {
                            try {
                              const res = await loadRazorpay();
                              if (!res) {
                                alert('Failed to load payment gateway SDK. Please check your internet connection.');
                                // Reset paymentState just in case
                                setPaymentState('idle');
                                return;
                              }

                              // 1. Create order on the server
                              const orderRes = await fetch('/api/payment/order', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                  productId: paywallItemId || 'full_access',
                                  productType: paywallProductType,
                                  userId: profile?.uid || 'unknown',
                                  currency: 'INR'
                                })
                              });

                              let orderData;
                              const orderText = await orderRes.text();
                              try {
                                orderData = orderText ? JSON.parse(orderText) : {};
                              } catch (e) {
                                throw new Error(`Invalid response from server. Status: ${orderRes.status}. If you just updated the server, please restart the dev server (npm run dev).`);
                              }

                              if (!orderRes.ok) {
                                throw new Error(orderData.message || `Failed to create payment order (status ${orderRes.status}).`);
                              }

                              if (!orderData.orderId) {
                                throw new Error('Server did not return a valid order ID. Please verify your Razorpay API key configurations in .env and restart your dev server.');
                              }

                              // Track pending payment state in localStorage (essential for auto-recovery on page reloads/switches)
                              localStorage.setItem('oep_pending_payment', JSON.stringify({
                                orderId: orderData.orderId,
                                productId: paywallItemId || 'full_access',
                                timestamp: Date.now()
                              }));

                              // 2. Open Razorpay checkout with the orderId
                              const options = {
                                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_StcJAJY1MgRGmJ',
                                amount: orderData.amount,
                                currency: orderData.currency,
                                name: 'OdishaExamPrep Premium',
                                description: paywallItemTitle === 'Full Access' ? 'Unlock Full Access' : `Unlock ${paywallItemTitle}`,
                                order_id: orderData.orderId,
                                handler: async function (response: any) {
                                  try {
                                    setPaymentState('processing');
                                    setPaymentError(null);
                                    // 3. Verify payment signature on the server and record secure entitlement
                                    const verifyRes = await fetch('/api/payment/verify', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json'
                                      },
                                      body: JSON.stringify({
                                        razorpay_order_id: response.razorpay_order_id,
                                        razorpay_payment_id: response.razorpay_payment_id,
                                        razorpay_signature: response.razorpay_signature,
                                        userId: profile?.uid,
                                        productId: paywallItemId || 'full_access',
                                        productType: paywallProductType,
                                        pricePaid: paywallPrice,
                                        snapshot: {
                                          id: paywallItemId || 'full_access',
                                          title: paywallItemTitle,
                                          price: paywallPrice
                                        }
                                      })
                                    });

                                    let verifyData;
                                    const verifyText = await verifyRes.text();
                                    try {
                                      verifyData = verifyText ? JSON.parse(verifyText) : {};
                                    } catch (e) {
                                      throw new Error(`Invalid verification response from server. Status: ${verifyRes.status}`);
                                    }

                                    if (!verifyRes.ok) {
                                      throw new Error(verifyData.message || 'Payment verification failed.');
                                    }
                                    if (verifyData.success) {
                                      setPaymentState('success');
                                      if (paywallItemId) {
                                        await unlockItem(paywallItemId);
                                      } else {
                                        await grantFullAccess();
                                      }
                                      setTimeout(() => {
                                        setShowPaywall(false);
                                        setPaywallItemId(null);
                                        setPaymentState('idle');
                                      }, 2000);
                                    } else {
                                      throw new Error(verifyData.message || 'Payment verification failed.');
                                    }
                                  } catch (err: any) {
                                    console.error('Verification error:', err);
                                    setPaymentState('error');
                                    setPaymentError(err.message || 'Payment verification failed.');
                                  }
                                },
                                prefill: {
                                  name: profile?.displayName || '',
                                  email: profile?.email || ''
                                },
                                theme: { color: '#4f46e5' },
                                modal: {
                                  ondismiss: function () {
                                    console.log('Payment checkout closed');
                                    localStorage.removeItem('oep_pending_payment');
                                  }
                                }
                              };

                              const rzp = new (window as any).Razorpay(options);
                              rzp.open();
                            } catch (err: any) {
                              console.error('Payment initialization failed:', err);
                              alert('Payment initialization failed: ' + err.message);
                            }
                          }}
                          >
                            {/* Button Shine Effect */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 z-10" />

                            <span className="relative z-10 flex items-center justify-center gap-2">
                              Unlock Now
                              <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                            </span>
                          </Button>

                          {/* Secure Info Footer */}
                          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-semibold pt-1">
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                            <span>Secure payment via Razorpay • Instant Activation</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {paymentState === 'processing' && (
                      <motion.div
                        key="processing"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="text-center space-y-8 py-10 flex-1 flex flex-col justify-center items-center"
                      >
                        {/* Glowing progress ring */}
                        <div className="relative w-24 h-24 flex items-center justify-center">
                          {/* Pulsing outer aura */}
                          <div className="absolute inset-0 bg-brand-500/20 rounded-full blur-xl animate-pulse" />
                          {/* Spinning border ring */}
                          <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                            className="absolute inset-0 border-4 border-t-brand-500 border-r-indigo-500 border-b-transparent border-l-transparent rounded-full shadow-[0_0_15px_rgba(138,28,54,0.4)]"
                          />
                          <Lock className="w-8 h-8 text-slate-400 animate-bounce" />
                        </div>

                        <div className="space-y-3">
                          <h3 className="text-xl font-extrabold text-white tracking-tight">Confirming Purchase...</h3>
                          <p className="text-slate-400 text-xs max-w-xs mx-auto leading-relaxed">
                            Please do not close this window, refresh the page, or click back. We are verifying your transaction signature securely.
                          </p>
                        </div>

                        {/* Verification steps animation */}
                        <div className="w-full max-w-xs bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 text-left space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/25 border border-emerald-500/50 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                            <span className="text-xs font-bold text-slate-200">Secure Payment Received</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full border border-brand-500/50 flex items-center justify-center shrink-0 animate-pulse bg-brand-500/10">
                              <RotateCw className="w-3 h-3 text-brand-400 animate-spin" />
                            </div>
                            <span className="text-xs font-black text-white">Cryptographic Verification</span>
                          </div>

                          <div className="flex items-center gap-3 opacity-40">
                            <div className="w-5 h-5 rounded-full border border-slate-600 flex items-center justify-center shrink-0 text-slate-500">
                              <span className="text-[9px] font-black">3</span>
                            </div>
                            <span className="text-xs font-bold text-slate-400">Activating Lifetime Access</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {paymentState === 'success' && (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="text-center space-y-8 py-10 flex-1 flex flex-col justify-center items-center"
                      >
                        {/* Celebrate circle checkmark */}
                        <div className="relative w-24 h-24 flex items-center justify-center">
                          {/* Pulsing successful aura */}
                          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl" />
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                            className="w-20 h-20 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(16,185,129,0.3)] border border-white/10"
                          >
                            <ShieldCheck className="w-10 h-10 text-white" />
                          </motion.div>
                          
                          {/* Animated Sparkles popping out */}
                          <motion.div 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.8, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute -top-1 -right-1"
                          >
                            <Sparkles className="w-5 h-5 text-amber-300" />
                          </motion.div>
                          <motion.div 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.8, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                            className="absolute -bottom-1 -left-1"
                          >
                            <Sparkles className="w-4 h-4 text-pink-300" />
                          </motion.div>
                        </div>

                        <div className="space-y-3">
                          <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 tracking-tight leading-tight font-sans">Payment Verified!</h3>
                          <p className="text-slate-400 text-xs max-w-xs mx-auto leading-relaxed font-medium">
                            {paywallItemTitle === 'Full Access' 
                              ? 'Your lifetime access package is activated! Unlocking all practice systems and mock tests now.' 
                              : `Successfully unlocked: "${paywallItemTitle}". Enjoy your learning journey!`
                            }
                          </p>
                        </div>

                        {/* Completed Verification steps */}
                        <div className="w-full max-w-xs bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 text-left space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/25 border border-emerald-500/50 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                            <span className="text-xs font-bold text-slate-300">Secure Payment Received</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/25 border border-emerald-500/50 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                            <span className="text-xs font-bold text-slate-300">Cryptographic Verification</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/25 border border-emerald-500/50 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                            <span className="text-xs font-black text-emerald-400">Access Activated Successfully</span>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2 animate-pulse">
                          <RotateCw className="w-3 h-3 animate-spin text-slate-500" />
                          Redirecting to your course...
                        </div>
                      </motion.div>
                    )}

                    {paymentState === 'error' && (
                      <motion.div
                        key="error"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="text-center space-y-6 py-6 flex-1 flex flex-col justify-center items-center"
                      >
                        <div className="relative w-20 h-20 flex items-center justify-center">
                          <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-xl animate-pulse" />
                          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/35 rounded-2xl flex items-center justify-center text-rose-500 shadow-lg shadow-rose-950/20">
                            <AlertCircle className="w-8 h-8" />
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          <h3 className="text-lg font-black text-rose-400 tracking-tight leading-tight">Verification Failed</h3>
                          <p className="text-slate-400 text-xs max-w-xs mx-auto leading-relaxed">
                            {paymentError || 'There was a problem verifying your purchase entitlement with our servers.'}
                          </p>
                        </div>

                        {/* Customer Support Reassurance Card */}
                        <div className="w-full max-w-xs bg-rose-950/15 border border-rose-500/15 p-4 rounded-xl text-left space-y-2">
                          <h4 className="text-[10px] font-black text-rose-300 uppercase tracking-widest">Debited but not unlocked?</h4>
                          <p className="text-[11px] text-slate-400 leading-normal font-medium">
                            If the amount was deducted from your account, do not worry. Your money is safe. Please email us at <strong className="text-rose-200 font-bold select-all">support@odishaexamprep.com</strong> with your transaction ID, and our support team will unlock it manually within a few hours.
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 w-full max-w-xs">
                          <Button 
                            className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all active:scale-95 cursor-pointer"
                            onClick={() => {
                              setShowPaywall(false);
                              setPaywallItemId(null);
                              setPaymentState('idle');
                              setPaymentError(null);
                            }}
                          >
                            Close Overlay
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 space-y-6 shadow-2xl relative overflow-y-auto no-scrollbar smooth-scroll-gpu max-h-[90vh] sm:max-h-[85vh] flex flex-col"
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
  const [paymentState, setPaymentState] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);
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
  const [paywallProductType, setPaywallProductType] = useState<string>('full_access');
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




  const handleSaveOnboarding = async (exam: string, timeline: string, prepLevel: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          targetExam: exam,
          targetTimeline: timeline,
          currentPrepLevel: prepLevel
        }
      });
      if (error) throw error;
      
      let matched = null;
      if (exam.toLowerCase().includes('opsc')) {
        matched = exams.find(e => e.name.toLowerCase().includes('opsc'));
      } else if (exam.toLowerCase().includes('osssc')) {
        matched = exams.find(e => e.name.toLowerCase().includes('osssc'));
      } else if (exam.toLowerCase().includes('ossc')) {
        matched = exams.find(e => e.name.toLowerCase().includes('ossc') && !e.name.toLowerCase().includes('osssc'));
      }
      if (matched) {
        setSelectedExam(matched.id);
      }

      setShowOnboarding(false);
      if (onActivityLogged) onActivityLogged();
    } catch(err: any) {
      alert('Error updating onboarding settings: ' + err.message);
    }
  };


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
    return exams.filter(e => !e.is_archived && e.category !== 'blog' && e.category !== 'system' && !(e.name || '').startsWith('SYSTEM_SETTINGS_'));
  }, [exams]);

  useEffect(() => {
    const activeExamId = practiceSettings.examId || selectedExam;
    if (!practiceSettings.topic || !activeExamId) {
      setTopicMaxQuestions(0);
      return;
    }
    const topicBank = Object.values(dynamicQuestionBanks).flat().find((b: any) => b.id === practiceSettings.topic) as any;
    if (topicBank) {
      const qCount = Number(topicBank.questions) || 0;
      setTopicMaxQuestions(qCount);
      setPracticeSettings(prev => {
         const currentVal = Number(prev.questions) || 20;
         const safeVal = Math.min(currentVal, qCount);
         return { ...prev, questions: safeVal > 0 ? safeVal.toString() : '0' };
      });
    } else {
      setTopicMaxQuestions(0);
    }
  }, [practiceSettings.topic, practiceSettings.examId, selectedExam, dynamicQuestionBanks]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Skip re-fetch if we already fetched database updates in this session (e.g., from tab switching)
      if (_dashboardCache.hasFetchedThisSession && _dashboardCache.loadedForUserId === (user?.id || 'guest') && _dashboardCache.exams.length > 0) {
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
            hasPracticeMode: bank.hasPracticeMode,
            is_archived: bank.is_archived || false
          });
        });

        // Write to module-level cache before updating state
        _dashboardCache.exams = finalExams;
        _dashboardCache.testSeries = fetchedSeries || [];
        _dashboardCache.mockTests = fetchedTests || [];
        _dashboardCache.dynamicQuestionBanks = groupedBanks;
        _dashboardCache.loadedForUserId = user?.id || 'guest';
        _dashboardCache.hasFetchedThisSession = true;

        // Save to sessionStorage for persistent SWR caching across reloads
        try {
          sessionStorage.setItem('oep_cached_exams', JSON.stringify(finalExams));
          sessionStorage.setItem('oep_cached_testSeries', JSON.stringify(fetchedSeries || []));
          sessionStorage.setItem('oep_cached_mockTests', JSON.stringify(fetchedTests || []));
          sessionStorage.setItem('oep_cached_dynamicQuestionBanks', JSON.stringify(groupedBanks));
          sessionStorage.setItem('oep_cached_loadedForUserId', user?.id || 'guest');
        } catch (e) {}

        // Update React state
        setExams(finalExams);
        setTestSeries(fetchedSeries || []);
        setMockTests(fetchedTests || []);
        setDynamicQuestionBanks(groupedBanks);

        // Clean up activities in localStorage and state that belong to deleted exams/tests/banks
        if (user?.id && finalExams.length > 1) {
          const activeExamNames = new Set(finalExams.map((e: any) => e.name));
          const activeMockTestIds = new Set((fetchedTests || []).map((t: any) => t.id));
          const activeBankIds = new Set((fetchedBanks || []).map((b: any) => b.id));

          try {
            const localKey = `oep_activities_${user.id}`;
            const localActivitiesStr = localStorage.getItem(localKey);
            if (localActivitiesStr) {
              const localActivities = JSON.parse(localActivitiesStr);
              if (Array.isArray(localActivities)) {
                const filtered = localActivities.filter((act: any) => {
                  if (!act) return false;

                  // 1. Filter out by examName (if deleted)
                  const actExamName = act.metadata?.examName;
                  if (actExamName && actExamName !== 'General' && !activeExamNames.has(actExamName)) {
                    return false;
                  }

                  // 2. Filter out by mockTestId (if deleted)
                  const testId = act.metadata?.test?.id;
                  if (testId && !testId.startsWith('practice-') && (act.type === 'mock_test_completed' || act.type === 'test_incomplete')) {
                    if (!activeMockTestIds.has(testId)) {
                      return false;
                    }
                  }

                  // 3. Filter out by bankId (if deleted)
                  const bankId = act.metadata?.bankId;
                  if (bankId && act.type === 'question_bank_accessed') {
                    if (!activeBankIds.has(bankId)) {
                      return false;
                    }
                  }

                  return true;
                });

                if (filtered.length !== localActivities.length) {
                  localStorage.setItem(localKey, JSON.stringify(filtered));
                  
                  // Sync updated activities to user cloud metadata
                  const cloudPayload = filtered.slice(0, 50).map((a: any) => {
                    try {
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
                        if (m.test && typeof m.test === 'object') {
                          lightMeta.test = {
                            id: m.test.id,
                            title: m.test.title,
                            durationMinutes: m.test.durationMinutes,
                            _questionCount: m.test._questionCount || (Array.isArray(m.test.questions) ? m.test.questions.length : 0),
                          };
                        }
                        lightMeta.totalQuestions = m.totalQuestions || lightMeta.test?._questionCount || 0;
                      }
                      return { ...a, metadata: lightMeta };
                    } catch {
                      return { id: a.id, userId: a.userId, type: a.type, title: a.title, timestamp: a.timestamp, score: a.score, accuracy: a.accuracy };
                    }
                  });
                  await supabase.auth.updateUser({
                    data: { activities: cloudPayload },
                  });

                  if (onActivityLogged) onActivityLogged();
                }
              }
            }
          } catch (e) {
            console.error("Error cleaning up local activities:", e);
          }
        }

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
    if (exam.name && exam.name.startsWith('SYSTEM_SETTINGS_')) return false;
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

    if (test.isPremium && !hasAccessTo(test, testExamId)) {
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
      setPaywallProductType('mock_test');
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
      } else {
        // Questions are pre-loaded, let's merge fresh ones to get latest diagrams/edits
        if (!finalTest.id.startsWith('practice-')) {
          try {
            const freshQs = await examService.getQuestionsForMockTest(finalTest.id);
            if (freshQs && freshQs.length > 0) {
              const freshMap = new Map(freshQs.map(q => [q.id, q]));
              finalTest.questions = finalTest.questions.map((q: any) => {
                const fresh = freshMap.get(q.id);
                return fresh ? { ...q, ...fresh } : q;
              });
            }
          } catch (e) {
            console.error("Failed to merge fresh questions on start:", e);
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
      if (topicBank?.isPremium && !hasAccessTo(topicBank)) {
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
        setPaywallProductType('question_bank');
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
        questions: finalQuestions.map(q => {
          const item: any = {
            id: q.id,
            questionText: q.questionText,
            options: q.options,
            correctAnswerIndex: q.correctAnswerIndex,
            explanation: q.explanation || 'No explanation provided.'
          };
          if (q.diagram !== undefined && q.diagram !== null) {
            item.diagram = q.diagram;
          }
          return item;
        })
      };

      setActiveTestState({ resumeSessionId: `session-${Date.now()}` });
      handleStartTest(practiceTest);
    } catch (err: any) {
      console.error(err);
      alert("Failed to compile practice session: " + (err?.message || err));
    } finally {
      setLoadingPractice(false);
    }
  };

  const handlePayment = async (test: any) => {
    try {
      const res = await loadRazorpay();
      if (!res) {
        alert('Razorpay SDK failed to load. Are you online?');
        return;
      }

      const price = test.price || 499;
      const orderRes = await fetch('/api/payment/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: test.id,
          productType: 'mock_test',
          userId: profile?.uid || 'unknown',
          currency: 'INR'
        })
      });

      let orderData;
      const orderText = await orderRes.text();
      try {
        orderData = orderText ? JSON.parse(orderText) : {};
      } catch (e) {
        throw new Error(`Invalid response from server. Status: ${orderRes.status}. If you just updated the server, please restart the dev server (npm run dev).`);
      }

      if (!orderRes.ok) {
        throw new Error(orderData.message || `Failed to create payment order (status ${orderRes.status}).`);
      }

      if (!orderData.orderId) {
        throw new Error('Server did not return a valid order ID. Please verify your Razorpay API key configurations in .env and restart your dev server.');
      }

      // Track pending payment state in localStorage (essential for auto-recovery on page reloads/switches)
      localStorage.setItem('oep_pending_payment', JSON.stringify({
        orderId: orderData.orderId,
        productId: test.id,
        timestamp: Date.now()
      }));

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_StcJAJY1MgRGmJ',
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'OdishaExamPrep',
        description: `Purchase ${test.title}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: profile?.uid,
                productId: test.id,
                productType: 'mock_test',
                pricePaid: price,
                snapshot: test
              })
            });

            let verifyData;
            const verifyText = await verifyRes.text();
            try {
              verifyData = verifyText ? JSON.parse(verifyText) : {};
            } catch (e) {
              throw new Error(`Invalid verification response from server. Status: ${verifyRes.status}`);
            }

            if (!verifyRes.ok) {
              throw new Error(verifyData.message || 'Payment verification failed.');
            }
            if (verifyData.success) {
              await unlockItem(test.id);
              alert('Payment Successful and Verified! Course unlocked.');
            } else {
              alert('Payment verification failed. Please contact support.');
            }
          } catch (err: any) {
            console.error('Verification error:', err);
            alert('Error verifying payment: ' + err.message);
          }
        },
        prefill: {
          name: profile?.displayName || '',
          email: profile?.email || ''
        },
        theme: {
          color: '#4f46e5'
        },
        modal: {
          ondismiss: function () {
            console.log('Payment checkout closed');
            localStorage.removeItem('oep_pending_payment');
          }
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (err: any) {
      console.error('Payment initialization failed:', err);
      alert('Payment initialization failed: ' + err.message);
    }
  };

  if (showAdmin) {
    return (
      <React.Suspense fallback={<LoadingPortal />}>
        <AdminPanel onClose={() => setShowAdmin(false)} />
      </React.Suspense>
    );
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

    return (
      <React.Suspense fallback={<LoadingPortal />}>
        <TestResultsView results={testResults} previousResult={previousResult} onClose={() => setTestResults(null)} />
      </React.Suspense>
    );
  }

  if (activeTest) {
    return (
      <React.Suspense fallback={<LoadingPortal />}>
        <MockTestSystem 
          test={activeTest} 
          initialState={activeTestState}
          onExit={(progressState) => {
            sessionStorage.removeItem('oep_activeTestState');
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
            sessionStorage.removeItem('oep_activeTestState');
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
      </React.Suspense>
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
    return <AnalyticsView user={user} activities={activities} onNavigate={onNavigate} />;
  }

  if (mainTab === 'history') {
    return (
      <HistoryView 
        user={user} 
        onViewResults={handleViewResults} 
        onResumeTest={async (test, state) => {
          let finalTest = { ...test };
          if (finalTest && finalTest.id && !finalTest.id.startsWith('practice-')) {
            try {
              const freshQs = await examService.getQuestionsForMockTest(finalTest.id);
              if (freshQs && freshQs.length > 0) {
                finalTest.questions = freshQs;
              }
            } catch (e) {
              console.error("Failed to fetch fresh questions on resume:", e);
            }
          }
          setActiveTest(finalTest);
          setActiveTestState(state);
        }} 
        onActivityDeleted={onActivityLogged} 
        onNavigate={onNavigate} 
      />
    );
  }

  if (mainTab === 'library') {
    return (
      <>
        <PurchasesView 
          user={user} 
          profile={profile}
          exams={exams.filter(e => e.category !== 'blog' && e.category !== 'system' && !(e.name || '').startsWith('SYSTEM_SETTINGS_'))}
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

  if (mainTab === 'ai_mentor') {
    return <AiMentor user={user} />;
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
            <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0 group/scroll">
              {/* Left Scroll Button */}
              <button 
                type="button"
                onClick={() => scrollContinuePractice('left')}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 border border-slate-200/60 text-slate-600 hover:text-brand-600 shadow-md flex items-center justify-center cursor-pointer transition-all duration-200 z-20 opacity-0 group-hover/scroll:opacity-100 hover:scale-105 active:scale-95 hidden md:flex"
                title="Scroll Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {/* Right Scroll Button */}
              <button 
                type="button"
                onClick={() => scrollContinuePractice('right')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 border border-slate-200/60 text-slate-600 hover:text-brand-600 shadow-md flex items-center justify-center cursor-pointer transition-all duration-200 z-20 opacity-0 group-hover/scroll:opacity-100 hover:scale-105 active:scale-95 hidden md:flex"
                title="Scroll Right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div 
                ref={continuePracticeRef}
                className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pt-3 pb-3 px-4 sm:px-6"
                style={{
                  WebkitMaskImage: 'linear-gradient(to right, transparent, white 24px, white calc(100% - 24px), transparent)',
                  maskImage: 'linear-gradient(to right, transparent, white 24px, white calc(100% - 24px), transparent)'
                }}
              >
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
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 15, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 22, delay: i * 0.06 }}
                      whileHover={whileHover.subtle}
                      whileTap={whileTap.press}
                      onClick={async () => {
                        if (!canResume) return;
                        
                        let testToResume = { ...a.metadata.test };
                        if (testToResume.id && !testToResume.id.startsWith('practice-')) {
                          try {
                            const freshQs = await examService.getQuestionsForMockTest(testToResume.id);
                            if (freshQs && freshQs.length > 0) {
                              testToResume.questions = freshQs;
                            }
                          } catch (e) {
                            console.error("Failed to fetch fresh questions on Continue resume:", e);
                          }
                        }
                        
                        setActiveTestState({ ...a.metadata, resumeSessionId: a.metadata?.resumeSessionId || a.metadata?.test?.id });
                        setActiveTest(testToResume);
                      }}
                      className={`snap-start shrink-0 w-[72vw] sm:w-[300px] lg:w-[340px] bg-white rounded-2xl border border-slate-100 hover:border-brand-200/60 hover:shadow-xl hover:shadow-brand-500/5 transition-all duration-300 group p-4 sm:p-5 flex flex-col gap-3 premium-shine-container ${
                        canResume ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
                      }`}
                    >
                      {/* Top row: icon + text */}
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shrink-0 shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform duration-300">
                          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-extrabold text-sm text-slate-900 line-clamp-1 group-hover:text-brand-600 transition-colors duration-300">{a.title || 'Practice Session'}</h4>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Last practiced {timeAgo}</p>
                          {a.metadata?.testCategory && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-brand-600">{a.metadata.testCategory}</span>
                          )}
                          {!canResume && (
                            <span className="text-[9px] font-bold text-slate-400">Open app to resume</span>
                          )}
                        </div>
                      </div>
                      {/* Progress bar at bottom */}
                      <div className="flex items-center gap-2 relative z-10">
                        <div className="flex-1 h-1.5 bg-brand-50 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full" style={{ width: `${progressPct}%` }} />
                        </div>
                        <span className="text-[10px] font-black text-brand-600 shrink-0">{progressPct}%</span>
                      </div>
                    </motion.div>
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
            <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0 group/scroll-recent">
              {/* Left Scroll Button */}
              <button 
                type="button"
                onClick={() => scrollRecentActivity('left')}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 border border-slate-200/60 text-slate-600 hover:text-brand-600 shadow-md flex items-center justify-center cursor-pointer transition-all duration-200 z-20 opacity-0 group-hover/scroll-recent:opacity-100 hover:scale-105 active:scale-95 hidden md:flex"
                title="Scroll Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {/* Right Scroll Button */}
              <button 
                type="button"
                onClick={() => scrollRecentActivity('right')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 border border-slate-200/60 text-slate-600 hover:text-brand-600 shadow-md flex items-center justify-center cursor-pointer transition-all duration-200 z-20 opacity-0 group-hover/scroll-recent:opacity-100 hover:scale-105 active:scale-95 hidden md:flex"
                title="Scroll Right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div 
                ref={recentActivityRef}
                className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pt-3 pb-3 px-4 sm:px-6"
                style={{
                  WebkitMaskImage: 'linear-gradient(to right, transparent, white 24px, white calc(100% - 24px), transparent)',
                  maskImage: 'linear-gradient(to right, transparent, white 24px, white calc(100% - 24px), transparent)'
                }}
              >
                {activities.filter((a: any) => a.type !== 'test_incomplete').slice(0, 6).map((a: any, i: number) => {
                  const isTestResult = a.type === 'mock_test_completed' || a.type === 'practice_test_completed';
                  const scoreLabel = a.metadata?.score !== undefined
                    ? `${typeof a.metadata.score === 'number' ? Number(a.metadata.score.toFixed(2)) : a.metadata.score}/${a.metadata.totalMarks ?? a.metadata.total ?? '?'}`
                    : a.score !== undefined
                    ? `${typeof a.score === 'number' ? Number(a.score.toFixed(2)) : a.score}/${a.totalMarks ?? '?'}`
                    : null;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 15, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 22, delay: i * 0.06 }}
                      whileHover={whileHover.subtle}
                      whileTap={whileTap.press}
                      onClick={() => {
                        if (isTestResult) handleViewResults(a.metadata);
                        else if (a.type === 'question_bank_accessed' && a.metadata?.pdfUrl) window.open(a.metadata.pdfUrl, '_blank');
                      }}
                      className="snap-start shrink-0 w-[72vw] sm:w-[300px] lg:w-[340px] bg-white rounded-2xl border border-slate-100 hover:border-brand-200/60 hover:shadow-xl hover:shadow-brand-500/5 transition-all duration-300 cursor-pointer group flex items-center gap-3 sm:gap-4 p-4 sm:p-5 premium-shine-container"
                    >
                      {/* Icon */}
                      <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 bg-brand-500/10 text-brand-600 group-hover:scale-110 transition-transform relative z-10">
                        <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      {/* Text */}
                      <div className="flex-1 min-w-0 relative z-10">
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
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all relative z-10" />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        )}



        <div className="flex flex-col space-y-5 sm:space-y-7">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="border-2 border-slate-900 bg-white p-1 rounded-2xl flex gap-1.5 w-full sm:w-auto shrink-0 shadow-[4px_4px_0px_rgba(138,28,54,0.15)] relative">
              {(['upcoming', 'popular'] as const).map((tab) => {
                const isTabActive = examSearchQuery 
                  ? filteredExams.some(e => e.category === tab) 
                  : activeTab === tab;
                
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => { setActiveTab(tab); setExamSearchQuery(''); }}
                    className={cn(
                      "px-5 sm:px-8 py-2 sm:py-3 rounded-xl font-extrabold text-xs sm:text-sm cursor-pointer relative transition-all duration-300 focus:outline-none select-none flex-1 sm:flex-initial text-center",
                      isTabActive 
                        ? "text-white -translate-y-0.5" 
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50"
                    )}
                  >
                    {isTabActive && (
                      <motion.div
                        layoutId="activeExamTabBg"
                        className="absolute inset-0 bg-[#8A1C36] rounded-xl shadow-[2px_2px_0px_#0f172a] z-0"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 capitalize">{tab}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 sm:left-5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
              <input 
                type="text"
                placeholder="Search exams..."
                value={examSearchQuery}
                onChange={(e) => setExamSearchQuery(e.target.value)}
                className="pl-10 sm:pl-14 pr-12 py-2.5 sm:py-3.5 rounded-2xl font-bold text-sm sm:text-base w-full border-2 border-slate-900 bg-white shadow-[4px_4px_0px_rgba(138,28,54,0.15)] focus:shadow-[6px_6px_0px_#8A1C36] focus:outline-none transition-all duration-200"
              />
              {examSearchQuery && (
                <button onClick={() => setExamSearchQuery('')} className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors">
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="relative group -mx-2 px-2">
            {/* Top Fade */}
            <div className="absolute top-0.5 left-0.5 right-0.5 h-8 bg-gradient-to-b from-[#FAF8F5] to-transparent z-20 pointer-events-none rounded-t-3xl" />

            <div 
              className="max-h-[420px] sm:max-h-[500px] md:max-h-[600px] overflow-y-auto no-scrollbar pb-6 pt-6 px-4 rounded-3xl border-2 border-slate-900 bg-[#FAF8F5] shadow-[6px_6px_0px_rgba(138,28,54,0.15)]"
              style={{ scrollbarGutter: 'stable' }}
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
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 px-1"
              >
                <AnimatePresence mode="wait">
                  {loadingExams ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <motion.div
                        key={`skeleton-${i}`}
                        className="h-28 sm:h-40 md:h-56 rounded-2xl border-2 border-slate-900 bg-white animate-pulse shadow-[4px_4px_0px_rgba(138,28,54,0.1)]"
                      />
                    ))
                  ) : filteredExams.length === 0 ? (
                    <motion.div
                      key="empty-exams"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="col-span-2 sm:col-span-3 lg:col-span-4 flex flex-col items-center justify-center py-12 text-center gap-3 bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-[4px_4px_0px_rgba(138,28,54,0.15)]"
                    >
                      <div className="w-14 h-14 rounded-2xl border-2 border-slate-900 bg-[#FAF8F5] flex items-center justify-center text-3xl shadow-[2px_2px_0px_#8A1C36]">📚</div>
                      <p className="font-serif font-bold text-slate-900 text-lg">
                        {examSearchQuery ? `No results for "${examSearchQuery}"` : `No ${activeTab} exams yet`}
                      </p>
                      <p className="text-slate-500 text-sm font-medium max-w-xs">
                        {examSearchQuery ? 'Try a different search term' : activeTab === 'upcoming' ? 'Switch to Popular to see available exams' : 'Exams will appear here once added'}
                      </p>
                      {!examSearchQuery && activeTab === 'upcoming' && (
                        <button 
                          onClick={() => setActiveTab('popular')} 
                          className="mt-1 px-5 py-2 text-sm font-extrabold text-white bg-[#8A1C36] hover:bg-[#76142c] border-2 border-slate-900 rounded-xl transition-all duration-200 shadow-[2px_2px_0px_#0f172a] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#0f172a] cursor-pointer"
                        >
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

                      // Replace generic AI placeholder descriptions if empty
                      if (!displayDesc || displayDesc.trim() === '') {
                        const nameLower = exam.name.toLowerCase();
                        if (nameLower.includes('amin')) {
                          displayDesc = 'Comprehensive practice tests covering Mathematics, Computer Awareness, English, and Odia for the OSSSC Amin recruitment.';
                        } else if (nameLower.includes('ri') || nameLower === 'ri') {
                          displayDesc = 'Mock examinations covering General Awareness, Mathematics, Odia, English, and Computer concepts for Revenue Inspector.';
                        } else if (nameLower.includes('upsc')) {
                          displayDesc = 'Mock tests and previous year papers for Civil Services Prelims, focusing on General Studies and CSAT paper preparation.';
                        } else if (nameLower.includes('opsc')) {
                          displayDesc = 'Mock tests tailored for OPSC OAS Prelims & Mains exams, containing detailed solutions and performance analytics.';
                        } else if (nameLower.includes('ossc')) {
                          displayDesc = 'Comprehensive syllabus coverage for OSSC CGL and other graduate level examinations, featuring daily practice quizzes.';
                        } else if (nameLower.includes('osssc')) {
                          displayDesc = 'Dedicated preparation tests for various OSSSC cadre posts, including targeted section tests and full-length papers.';
                        } else {
                          displayDesc = 'Access specialized syllabus-aligned mock exams, topic-wise practice questions, and previous year papers.';
                        }
                      }

                      return (
                        <motion.div 
                          key={exam.id}
                          initial={{ opacity: 0, scale: 0.95, y: 12 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                          onClick={() => {
                            setSelectedExam(exam.id);
                            scrollToElement('exams', { block: 'start', delay: 50 });
                          }}
                          className="cursor-pointer h-full group/card"
                        >
                          <div className="p-4 sm:p-5 md:p-6 h-full bg-white border-2 border-slate-900 rounded-3xl flex flex-col items-center text-center justify-center space-y-3 sm:space-y-4 md:space-y-5 relative shadow-[4px_4px_0px_#8A1C36] group-hover/card:shadow-[8px_8px_0px_#8A1C36] group-hover/card:-translate-y-1 group-hover/card:-translate-x-1 transition-all duration-300">
                            {/* Corner arrow - structured circle */}
                            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 md:top-5 md:right-5 w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full border-2 border-slate-900 bg-white hidden sm:flex items-center justify-center transition-all duration-300 shadow-[2px_2px_0px_#8A1C36] group-hover/card:bg-[#8A1C36] group-hover/card:shadow-none group-hover/card:translate-x-0.5 group-hover/card:translate-y-0.5">
                              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-900 group-hover/card:text-white transition-colors" />
                            </div>

                            {/* Icon Container */}
                            <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl border-2 border-slate-900 bg-[#FAF8F5] flex justify-center items-center shrink-0 shadow-[3px_3px_0px_rgba(138,28,54,0.15)] group-hover/card:shadow-[4px_4px_0px_#8A1C36] transition-all duration-300 relative overflow-hidden">
                              {(exam.icon && (exam.icon.startsWith('http') || exam.icon.startsWith('/'))) ? (
                                <img src={getDirectImageUrl(exam.icon)} alt={exam.name} className="w-8/12 h-8/12 object-contain relative z-10" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-xl sm:text-2xl md:text-4xl relative z-10">{exam.icon || '📚'}</span>
                              )}
                            </div>
                            
                            <div className="flex-1 w-full flex flex-col justify-start">
                              <h3 
                                className="text-sm sm:text-base md:text-lg lg:text-xl font-serif font-black text-slate-900 group-hover/card:text-[#8A1C36] transition-all duration-300 leading-tight tracking-tight uppercase"
                                style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {exam.name}
                              </h3>
                              <div className="hidden md:block w-full mt-2.5">
                                <p 
                                  className="text-slate-500 text-xs font-bold leading-relaxed opacity-85 group-hover/card:opacity-100 transition-opacity"
                                  style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                >
                                  {displayDesc}
                                </p>
                              </div>
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
    let items = (dynamicQuestionBanks[selectedBankType] || []).filter(item => {
      if (item.is_archived && !hasAccessTo(item.id, selectedExam)) return false;
      return item.examId === selectedExam;
    });
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
          <div className="relative">
            <div className="pb-12 pt-4">
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
            const isLocked = item.isPremium && !hasAccessTo(item);
            return (
              <motion.div
                key={item.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 }
                }}
                whileHover={whileHover.liftTap}
                whileTap={whileTap.press}
              >
                <Card 
                  onClick={() => { setSelectedBankItem(item); scrollToElement('exams', { block: 'start', delay: 50 }); }}
                  className="group cursor-pointer hover:border-brand-300/80 relative overflow-hidden rounded-[2rem] hover:-translate-y-1.5 transition-all duration-500 h-full border-slate-200/50 bg-white shadow-sm hover:shadow-xl hover:shadow-brand-500/5 flex flex-col premium-shine-container"
                >
                  {/* Ambient grid-bg inside the card */}
                  <div className="absolute inset-0 grid-bg opacity-[0.02] group-hover:opacity-[0.04] pointer-events-none transition-opacity duration-500" />
                  
                  {/* Hero Image Section */}
                  <div className={cn("h-44 overflow-hidden relative shrink-0 border-b border-slate-100", isLocked && "blur-[1px]")}>
                    <img 
                      src={getDirectImageUrl(item.image)} 
                      alt={item.title} 
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 select-none pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Linear contrast gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none opacity-60" />
                    
                    {isLocked && (
                      <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="w-12 h-12 bg-white/95 rounded-2xl flex items-center justify-center shadow-lg border border-slate-200/50">
                          <Lock className="w-5 h-5 text-[#8A1C36]" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Card Content Body */}
                  <div className={cn("p-6 flex flex-col flex-1 relative z-10 bg-white/50 backdrop-blur-sm", isLocked && "opacity-60")}>
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-serif font-extrabold text-slate-900 group-hover:text-brand-650 transition-colors capitalize tracking-tight leading-snug line-clamp-1">
                        {item.title.toLowerCase()}
                      </h3>
                      {isLocked ? (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-wider rounded border border-slate-200/40">
                          Premium
                        </span>
                      ) : (
                        <Lock className="w-4 h-4 text-slate-200" />
                      )}
                    </div>
                    
                    {/* Stats and Highlights */}
                    <div className="space-y-3.5 mb-6">
                      <div className="flex items-center gap-2 text-slate-500">
                        <div className="w-6.5 h-6.5 rounded-lg bg-slate-50 border border-slate-100/60 flex items-center justify-center text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50/50 transition-all shadow-sm">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors">
                          {item.questions} Practice Questions
                        </span>
                      </div>
                      
                      {item.tagline && (
                        <div className="flex items-center gap-2 text-brand-650 bg-gradient-to-r from-brand-50/70 to-indigo-50/40 px-3 py-1.5 rounded-xl w-fit border border-brand-100/30">
                          <Zap className="w-3.5 h-3.5 fill-brand-650 text-brand-650 shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-wider">{item.tagline}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* View Details Button */}
                    <div className="mt-auto pt-2">
                      <button 
                        className="w-full py-3 px-6 rounded-xl font-black text-xs uppercase tracking-wider relative overflow-hidden flex items-center justify-center gap-2 transition-all duration-500 border border-brand-100 bg-brand-50/40 text-brand-600 shadow-sm hover:scale-[1.02] active:scale-95 group-hover:bg-gradient-to-r group-hover:from-brand-600 group-hover:to-brand-500 group-hover:text-white group-hover:border-transparent group-hover:shadow-lg group-hover:shadow-brand-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {/* Button Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 z-10" />
                        <span className="relative z-10 flex items-center justify-center gap-1.5">
                          {isLocked ? 'Unlock to View' : 'View Details'}
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform relative -top-[0.5px]" />
                        </span>
                      </button>
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
            <div className="flex items-start gap-3 sm:gap-4">
              <Button 
                variant="ghost" 
                onClick={() => { setSelectedExam(null); scrollToElement('exams', { block: 'start', delay: 100 }); }} 
                className="p-3 rounded-2xl hover:bg-brand-50 mt-1 shrink-0"
              >
                <ChevronRight className="w-6 h-6 rotate-180 text-brand-600" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight mb-1 flex flex-wrap items-center gap-3">
                  {currentExam?.name}
                  {hasAccessTo(`exam_bundle_${selectedExam}`) && (
                    <span className="px-3.5 py-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 text-[10px] font-black rounded-lg uppercase tracking-wider inline-flex items-center gap-1.5 h-6">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Premium Unlocked
                    </span>
                  )}
                </h1>
                <div className="max-w-3xl">
                  <p 
                    className={cn(
                      "text-slate-500 font-medium text-sm sm:text-base leading-relaxed transition-all duration-300",
                      !isDescExpanded && "line-clamp-2"
                    )}
                  >
                    {!hasBundle && examDescription ? examDescription : 'Select your preparation path'}
                  </p>
                  {!hasBundle && examDescription && examDescription.length > 150 && (
                    <button 
                      onClick={() => setIsDescExpanded(!isDescExpanded)}
                      className="text-xs font-black text-brand-600 hover:text-brand-700 transition-colors uppercase tracking-wider mt-1.5 focus:outline-none inline-flex items-center gap-1 cursor-pointer"
                    >
                      {isDescExpanded ? 'Read Less' : 'Read More'}
                    </button>
                  )}
                </div>
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
        {hasBundle && !hasAccessTo(`exam_bundle_${selectedExam}`) && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative overflow-hidden rounded-[2rem] lg:rounded-[3rem] p-[1px] premium-shine-container mb-10"
          >
            {/* Animated Outer Gradient Border */}
            <div className={cn(
              "absolute inset-0 animate-gradient-x opacity-90 transition-all duration-500",
              hasAccessTo(`exam_bundle_${selectedExam}`) 
                ? "bg-gradient-to-r from-emerald-500/60 via-teal-400/40 to-emerald-600/60" 
                : "bg-gradient-to-r from-brand-500/60 via-amber-400/40 to-indigo-600/60"
            )} />
            
            <div className={cn(
              "relative rounded-[1.95rem] lg:rounded-[2.95rem] overflow-hidden transition-all duration-500",
              hasAccessTo(`exam_bundle_${selectedExam}`)
                ? "bg-gradient-to-br from-[#02130c]/98 via-[#010906]/99 to-[#000503]/100 border border-emerald-500/10"
                : "bg-gradient-to-br from-[#12040b]/98 via-[#08020a]/99 to-[#030005]/100 border border-brand-500/10"
            )}>
              <VisualEffects />
              
              {/* Dynamic Glowing Ambient Mesh / Orbs */}
              {hasAccessTo(`exam_bundle_${selectedExam}`) ? (
                <>
                  <motion.div 
                    animate={{ 
                      x: [0, 20, 0],
                      y: [0, -20, 0],
                      scale: [1, 1.15, 1],
                    }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none"
                  />
                  <motion.div 
                    animate={{ 
                      x: [0, -30, 0],
                      y: [0, 30, 0],
                      scale: [1.1, 0.9, 1.1],
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-teal-500/10 blur-[120px] pointer-events-none"
                  />
                  <div className="absolute top-1/2 left-2/3 -translate-y-1/2 w-80 h-80 rounded-full bg-emerald-500/[0.04] blur-[80px] pointer-events-none" />
                </>
              ) : (
                <>
                  <motion.div 
                    animate={{ 
                      x: [0, 20, 0],
                      y: [0, -20, 0],
                      scale: [1, 1.15, 1],
                    }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-500/10 blur-[100px] pointer-events-none"
                  />
                  <motion.div 
                    animate={{ 
                      x: [0, -30, 0],
                      y: [0, 30, 0],
                      scale: [1.1, 0.9, 1.1],
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"
                  />
                  <div className="absolute top-1/2 left-2/3 -translate-y-1/2 w-80 h-80 rounded-full bg-amber-500/[0.03] blur-[80px] pointer-events-none" />
                </>
              )}

              {/* Sparkle Particles */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                      opacity: [0, 0.8, 0], 
                      scale: [0, 1.3, 0],
                      x: [Math.random() * 80 - 40, Math.random() * 80 - 40],
                      y: [Math.random() * 80 - 40, Math.random() * 80 - 40]
                    }}
                    transition={{ 
                      duration: 4 + Math.random() * 3, 
                      repeat: Infinity, 
                      delay: Math.random() * 6 
                    }}
                    className={cn(
                      "absolute w-1 h-1 rounded-full blur-[0.5px]",
                      hasAccessTo(`exam_bundle_${selectedExam}`) ? "bg-emerald-300" : "bg-brand-300"
                    )}
                    style={{ 
                      left: `${Math.random() * 100}%`, 
                      top: `${Math.random() * 100}%` 
                    }}
                  />
                ))}
              </div>

              <div className="relative z-10 px-6 py-8 sm:p-10 lg:p-14 flex flex-col lg:flex-row items-center justify-between gap-10">
                <motion.div 
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.08
                      }
                    }
                  }}
                  className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 flex-1"
                >
                  {/* Rotating Orbital Emblem */}
                  <motion.div 
                    variants={{
                      hidden: { scale: 0.8, opacity: 0 },
                      show: { scale: 1, opacity: 1 }
                    }}
                    className="relative shrink-0 flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32"
                  >
                    {/* Rotating Dashed Orbit 1 */}
                    <div className={cn(
                      "absolute inset-0 rounded-full border border-dashed animate-[spin_35s_linear_infinite] opacity-40",
                      hasAccessTo(`exam_bundle_${selectedExam}`) ? "border-emerald-400" : "border-brand-400"
                    )} />
                    
                    {/* Rotating Dashed Orbit 2 (Counter-rotated) */}
                    <div className={cn(
                      "absolute inset-2 rounded-full border border-dashed animate-[spin_20s_linear_infinite_reverse] opacity-20",
                      hasAccessTo(`exam_bundle_${selectedExam}`) ? "border-teal-300" : "border-indigo-400"
                    )} />

                    {/* Ring Pulse Glow */}
                    <div className={cn(
                      "absolute inset-4 rounded-full border animate-[ping_4s_ease-in-out_infinite] opacity-15",
                      hasAccessTo(`exam_bundle_${selectedExam}`) ? "border-emerald-400" : "border-brand-400"
                    )} />

                    {/* Core Glass Sphere */}
                    <div className={cn(
                      "absolute inset-4 backdrop-blur-xl rounded-full flex items-center justify-center shadow-2xl transition-transform duration-700 hover:scale-105",
                      hasAccessTo(`exam_bundle_${selectedExam}`)
                        ? "bg-emerald-950/45 border border-emerald-400/30 text-emerald-400 shadow-emerald-900/30"
                        : "bg-brand-950/45 border border-brand-400/30 text-brand-300 shadow-brand-950/50"
                    )}>
                       {hasAccessTo(`exam_bundle_${selectedExam}`) ? (
                         <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 text-emerald-300 filter drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]" />
                       ) : (
                         <Award className="w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 text-brand-200 filter drop-shadow-[0_0_8px_rgba(244,176,190,0.3)] animate-pulse" />
                       )}
                    </div>
                  </motion.div>

                  <div className="text-center sm:text-left space-y-4">
                    <motion.div 
                      variants={{
                        hidden: { y: 8, opacity: 0 },
                        show: { y: 0, opacity: 1 }
                      }}
                      className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5"
                    >
                      <span className={cn(
                        "px-3.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.18em] border backdrop-blur-sm",
                        hasAccessTo(`exam_bundle_${selectedExam}`)
                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                          : "bg-brand-500/10 border-brand-500/25 text-brand-300"
                      )}>
                        Selection Special
                      </span>
                      <span className={cn(
                        "px-3.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.18em] border backdrop-blur-sm",
                        hasAccessTo(`exam_bundle_${selectedExam}`) 
                          ? "bg-teal-500/10 border-teal-400/30 text-teal-300" 
                          : "bg-indigo-500/10 border-indigo-400/25 text-indigo-300"
                      )}>
                        {hasAccessTo(`exam_bundle_${selectedExam}`) ? 'Premium Unlocked' : 'Unlimited Access'}
                      </span>
                    </motion.div>

                    <div className="max-w-2xl space-y-2.5">
                      <motion.h2 
                        variants={{
                          hidden: { y: 8, opacity: 0 },
                          show: { y: 0, opacity: 1 }
                        }}
                        className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight"
                      >
                        {hasAccessTo(`exam_bundle_${selectedExam}`) ? (
                          <>You have <span className="font-serif italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 drop-shadow-[0_2px_10px_rgba(52,211,153,0.15)]">Full Access</span> to {currentExam?.name}</>
                        ) : (
                          <>Get Full Access to <span className="font-serif italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-brand-300 via-pink-200 to-indigo-300 drop-shadow-[0_2px_10px_rgba(244,176,190,0.15)]">{currentExam?.name}</span> Pack</>
                        )}
                      </motion.h2>
                      <motion.p 
                        variants={{
                          hidden: { y: 8, opacity: 0 },
                          show: { y: 0, opacity: 1 }
                        }}
                        className={cn(
                          "text-sm sm:text-base lg:text-[1.05rem] leading-relaxed font-normal tracking-wide max-w-xl transition-all duration-300",
                          hasAccessTo(`exam_bundle_${selectedExam}`) ? "text-emerald-100/70" : "text-brand-100/70",
                          !isBannerDescExpanded && "line-clamp-2"
                        )}
                      >
                        {examDescription || (hasAccessTo(`exam_bundle_${selectedExam}`) 
                          ? 'You have unlocked lifetime access to all Question Banks, Practice Mode, Premium Mock Tests, and PDF notes. Best of luck with your preparation!'
                          : 'Get full lifetime access to all Question Banks, Practice Mode, Premium Mock Tests, PDF notes, and any future content added to this exam. Complete your preparation with the ultimate bundle.'
                        )}
                      </motion.p>
                      {examDescription && examDescription.length > 150 && (
                        <button 
                          onClick={() => setIsBannerDescExpanded(!isBannerDescExpanded)}
                          className={cn(
                            "text-xs font-black transition-colors uppercase tracking-wider focus:outline-none inline-flex items-center gap-1 cursor-pointer mt-1",
                            hasAccessTo(`exam_bundle_${selectedExam}`)
                              ? "text-emerald-300 hover:text-emerald-200"
                              : "text-brand-300 hover:text-brand-200"
                          )}
                        >
                          {isBannerDescExpanded ? 'Read Less' : 'Read More'}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Action Section - Compact on Laptop */}
                {!hasAccessTo(`exam_bundle_${selectedExam}`) ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col items-center lg:items-center gap-5 shrink-0 lg:border-l lg:border-white/5 lg:pl-12 lg:min-w-[280px] w-full lg:w-auto"
                  >
                    <div className="text-center lg:text-center">
                      <div className="flex flex-col sm:flex-row lg:flex-col items-center lg:items-center gap-1.5">
                        <div className="flex items-center gap-3">
                          <span className="text-brand-300/40 text-base lg:text-lg line-through font-bold">₹{bundleOriginalPrice}</span>
                          <span className="text-4xl lg:text-5xl font-black text-white font-mono tracking-tighter">₹{bundlePrice}</span>
                        </div>
                        <span className="px-3 py-1 bg-amber-500/10 text-amber-300 text-[10px] font-black rounded-lg border border-amber-500/20 uppercase tracking-widest">
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
                        setPaywallProductType('exam_bundle');
                        setShowPaywall(true);
                      }}
                      className="w-full sm:w-auto h-14 lg:h-16 px-10 rounded-2xl bg-gradient-to-r from-white via-slate-100 to-white hover:from-brand-100 hover:to-white text-brand-950 font-black text-base lg:text-lg shadow-xl shadow-brand-500/10 hover:shadow-brand-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 group/btn relative overflow-hidden"
                    >
                      {/* Button Shine Effect */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 z-10" />
                      
                      <span className="relative z-10">Unlock All Access</span>
                      <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1.5 transition-transform relative z-10" />
                    </Button>
                    
                    <div className="flex items-center gap-2 text-brand-300/60 font-bold text-[10px] uppercase tracking-widest">
                      <Zap className="w-3.5 h-3.5 fill-brand-300/60 animate-pulse" />
                      Instant Activation
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col items-center lg:items-center gap-4 shrink-0 lg:border-l lg:border-emerald-500/10 lg:pl-12 lg:min-w-[280px] w-full lg:w-auto"
                  >
                     {/* Elegant Gold/Emerald Security Seal */}
                     <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center relative shadow-[0_0_30px_rgba(16,185,129,0.15)] group-hover:scale-105 transition-transform duration-500">
                       <div className="absolute inset-2 rounded-full border border-dashed border-emerald-400/20 animate-[spin_40s_linear_infinite]" />
                       <ShieldCheck className="w-10 h-10 text-emerald-400 filter drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]" />
                       <div className="absolute inset-0 rounded-full border border-emerald-400/20 animate-ping opacity-30" style={{ animationDuration: '3s' }} />
                     </div>
                     <span className="text-emerald-300 font-bold uppercase tracking-[0.2em] text-[10px] bg-emerald-950/60 hover:bg-emerald-950/80 px-4.5 py-1.5 rounded-full border border-emerald-500/25 flex items-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-[pulse_1.5s_ease-in-out_infinite]" />
                       Bundle Active
                     </span>
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
                className="p-5 sm:p-6 lg:p-8 flex flex-col justify-between bg-gradient-to-br from-white to-slate-50/50 backdrop-blur-md border border-white/20 shadow-sm hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-500 rounded-[1.5rem] cursor-pointer group relative overflow-hidden h-full premium-shine-container"
              >
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl group-hover:bg-brand-500/10 transition-colors" />
                
                <div className="flex-1 pb-6 relative z-10">
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
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-slate-950/40 pointer-events-auto"
            >
              <div className="absolute inset-0" onClick={() => setShowPracticeConfig(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-slate-200/50 overflow-hidden"
              >
                {/* Background glowing effects */}
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="p-5 sm:p-7 md:p-9 overflow-y-auto no-scrollbar relative z-10 flex flex-col">
                  <div className="flex justify-between items-start mb-6 md:mb-8 border-b border-slate-100 pb-5">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 premium-gradient rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/10">
                        <Dumbbell className="w-6 h-6 text-white animate-[pulse_3s_infinite]" />
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black premium-text-gradient tracking-tight">Configure Practice</h3>
                        <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-0.5">Set your preferences for this session</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowPracticeConfig(false)} 
                      className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer border border-slate-200/40"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7 mb-6 md:mb-8">
                    {/* Select Exam Card */}
                    <div className="bg-slate-50/50 border border-slate-200/50 rounded-2xl p-4.5 space-y-3 flex flex-col justify-between hover:border-brand-200 hover:shadow-md hover:shadow-brand-500/2 transition-all duration-300 relative group">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-brand-500/5 rounded-full blur-lg pointer-events-none" />
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                          Select Exam
                        </label>
                        <span className="text-[9px] font-extrabold text-brand-600 bg-brand-50/80 px-2 py-0.5 rounded-full uppercase tracking-wider">Step 1</span>
                      </div>
                      <SearchableSelect
                        value={practiceSettings.examId || selectedExam || ''}
                        onChange={(val) => setPracticeSettings({...practiceSettings, examId: val, category: '', topic: ''})}
                        options={actualExams.map(ex => ({ value: ex.id, label: ex.name }))}
                        placeholder="Choose an exam..."
                        searchPlaceholder="Search exams..."
                        className="px-4 h-[48px] rounded-xl text-sm border-slate-200 bg-white hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 transition-all font-bold text-slate-700 shadow-sm"
                      />
                    </div>

                    {/* Select Category Card */}
                    <div className={cn(
                      "border rounded-2xl p-4.5 space-y-3 flex flex-col justify-between transition-all duration-300 relative group",
                      (practiceSettings.examId || selectedExam) 
                        ? "bg-slate-50/50 border-slate-200/50 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/2" 
                        : "bg-slate-100/20 border-slate-200/30 opacity-75"
                    )}>
                      {(practiceSettings.examId || selectedExam) && <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-lg pointer-events-none" />}
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full", (practiceSettings.examId || selectedExam) ? "bg-indigo-500 animate-pulse" : "bg-slate-300")} />
                          Select Category
                        </label>
                        <span className={cn("text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider",
                          (practiceSettings.examId || selectedExam) ? "text-indigo-600 bg-indigo-50/80" : "text-slate-400 bg-slate-100"
                        )}>Step 2</span>
                      </div>
                      {!(practiceSettings.examId || selectedExam) ? (
                        <div className="h-[48px] rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-between px-4 text-slate-400 text-xs font-semibold select-none">
                          <span className="flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-slate-300" />
                            <span>Select an exam first</span>
                          </span>
                        </div>
                      ) : (
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
                          placeholder="Choose a category..."
                          searchPlaceholder="Search categories..."
                          className="px-4 h-[48px] rounded-xl text-sm border-slate-200 bg-white hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold text-slate-700 shadow-sm"
                        />
                      )}
                    </div>

                    {/* Select Topic / Unit Card */}
                    <div className={cn(
                      "border rounded-2xl p-4.5 space-y-3 flex flex-col justify-between transition-all duration-300 relative group sm:col-span-2 lg:col-span-1",
                      practiceSettings.category 
                        ? "bg-slate-50/50 border-slate-200/50 hover:border-purple-200 hover:shadow-md hover:shadow-purple-500/2" 
                        : "bg-slate-100/20 border-slate-200/30 opacity-75"
                    )}>
                      {practiceSettings.category && <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-lg pointer-events-none" />}
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full", practiceSettings.category ? "bg-purple-500 animate-pulse" : "bg-slate-300")} />
                          Select Topic / Unit
                        </label>
                        <span className={cn("text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider",
                          practiceSettings.category ? "text-purple-600 bg-purple-50/80" : "text-slate-400 bg-slate-100"
                        )}>Step 3</span>
                      </div>
                      {!practiceSettings.category ? (
                        <div className="h-[48px] rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-between px-4 text-slate-400 text-xs font-semibold select-none">
                          <span className="flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-slate-300" />
                            <span>Select a category first</span>
                          </span>
                        </div>
                      ) : (
                        <SearchableSelect
                          value={practiceSettings.topic}
                          onChange={(val) => setPracticeSettings({...practiceSettings, topic: val})}
                          disabled={!practiceSettings.category}
                          options={(dynamicQuestionBanks[practiceSettings.category] || [])
                            .filter((item: any) => item.examId === (practiceSettings.examId || selectedExam) && (!item.is_archived || hasAccessTo(item)))
                            .map((item: any) => ({
                              value: item.id,
                              label: `${item.title} ${item.isPremium && !hasAccessTo(item) ? '(Premium)' : ''}`
                            }))}
                          placeholder="Choose a topic..."
                          searchPlaceholder="Search topics..."
                          className="px-4 h-[48px] rounded-xl text-sm border-slate-200 bg-white hover:border-slate-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 transition-all font-bold text-slate-700 shadow-sm"
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-7">
                    <div className="space-y-2">
                      <div className="flex justify-between items-end mb-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          Number of Questions
                        </label>
                        {practiceSettings.topic && (
                          <span className="text-[10px] font-bold text-indigo-650 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-full">
                            {topicMaxQuestions} Available
                          </span>
                        )}
                      </div>
                      {!practiceSettings.topic ? (
                        <div className="w-full py-9 rounded-2xl border border-dashed border-slate-300 bg-slate-50/30 text-slate-400 font-bold text-center text-xs md:text-sm flex flex-col items-center justify-center gap-2 shadow-sm transition-all duration-300">
                          <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                            <Lock className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="text-slate-400 font-extrabold text-[11px] uppercase tracking-wider">Select a topic first</div>
                        </div>
                      ) : topicMaxQuestions === 0 ? (
                        <div className="w-full py-9 rounded-2xl border border-dashed border-rose-200 bg-rose-50/20 text-rose-500 font-bold text-center text-xs md:text-sm flex flex-col items-center justify-center gap-2 shadow-sm transition-all duration-300">
                          <div className="w-9 h-9 bg-rose-50 rounded-full flex items-center justify-center text-rose-400">
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                          </div>
                          <div className="text-rose-500 font-extrabold text-[11px] uppercase tracking-wider">No questions available yet</div>
                        </div>
                      ) : (
                        <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-5 relative overflow-hidden transition-all duration-300 shadow-sm hover:border-slate-300/80">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-2xl font-black text-indigo-950 tracking-tight flex items-baseline gap-1">
                              {practiceSettings.questions}
                              <span className="text-xs font-semibold text-slate-400">questions</span>
                            </span>
                            <span className="text-[10px] font-extrabold text-indigo-650 bg-indigo-50/80 border border-indigo-100/50 px-2 py-0.5 rounded-full">
                              Range: 1 - {topicMaxQuestions}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <input 
                              type="range" 
                              min="1" 
                              max={topicMaxQuestions} 
                              value={practiceSettings.questions}
                              onChange={(e) => setPracticeSettings({...practiceSettings, questions: e.target.value})}
                              className="flex-1 accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" 
                            />
                            <div className="relative w-16 shrink-0">
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
                                className="w-full py-1.5 px-2 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-black text-slate-800 text-center text-xs md:text-sm shadow-sm" 
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-end mb-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          Time Limit
                        </label>
                      </div>
                      {!practiceSettings.topic ? (
                        <div className="w-full py-9 rounded-2xl border border-dashed border-slate-300 bg-slate-50/30 text-slate-400 font-bold text-center text-xs md:text-sm flex flex-col items-center justify-center gap-2 shadow-sm transition-all duration-300">
                          <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                            <Lock className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="text-slate-400 font-extrabold text-[11px] uppercase tracking-wider">Select a topic first</div>
                        </div>
                      ) : topicMaxQuestions === 0 ? (
                        <div className="w-full py-9 rounded-2xl border border-dashed border-slate-200 bg-slate-50/30 text-slate-400 font-bold text-center text-xs md:text-sm flex flex-col items-center justify-center gap-2 shadow-sm transition-all duration-300">
                          <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                            <Lock className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="text-slate-400 font-extrabold text-[11px] uppercase tracking-wider">-</div>
                        </div>
                      ) : (
                        <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-5 relative overflow-hidden transition-all duration-300 shadow-sm hover:border-slate-300/80">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-2xl font-black text-indigo-950 tracking-tight flex items-baseline gap-1">
                              {practiceSettings.timeLimit}
                              <span className="text-xs font-semibold text-slate-400">minutes</span>
                            </span>
                            <span className="text-[10px] font-extrabold text-indigo-650 bg-indigo-50/80 border border-indigo-100/50 px-2 py-0.5 rounded-full">
                              Range: 1 - 180 min
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <input 
                              type="range" 
                              min="1" 
                              max="180" 
                              value={practiceSettings.timeLimit}
                              onChange={(e) => setPracticeSettings({...practiceSettings, timeLimit: e.target.value})}
                              className="flex-1 accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" 
                            />
                            <div className="relative w-16 shrink-0">
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
                                className="w-full py-1.5 px-2 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-black text-slate-800 text-center text-xs md:text-sm shadow-sm" 
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 md:mt-10 flex justify-center w-full">
                    <Button
                      disabled={!practiceSettings.topic || loadingPractice || topicMaxQuestions === 0}
                      className={cn(
                        "w-full sm:w-auto px-10 sm:px-16 py-4 rounded-2xl text-sm sm:text-base font-black transition-all sm:min-w-[280px] flex items-center justify-center gap-2 cursor-pointer shadow-lg group/btn",
                        (!practiceSettings.topic || loadingPractice || topicMaxQuestions === 0)
                          ? "bg-slate-100 text-slate-400 border border-slate-200/60 shadow-none pointer-events-none cursor-not-allowed"
                          : "premium-gradient text-white hover:premium-glow hover:scale-[1.02] shadow-brand-500/20"
                      )}
                      onClick={handleStartDynamicPractice}
                    >
                      {loadingPractice ? 'Compiling Practice...' : 'Start Practice Session'}
                      <ChevronRight className="w-5 h-5 ml-1 transition-transform group-hover/btn:translate-x-1" />
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
            const isLocked = isPremium && !hasAccessTo(test, testExamId);
            const isPremiumUnlocked = isPremium && hasAccessTo(test, testExamId);

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={whileHover.liftTap}
                whileTap={whileTap.press}
              >
                <Card 
                  key={test.id} 
                  className={cn("p-6 bg-white border-slate-200/60 shadow-lg shadow-slate-200/30 rounded-[1.5rem] hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-500/10 hover:border-brand-200 group transition-all duration-500 cursor-pointer flex flex-col gap-6 relative overflow-hidden premium-shine-container", isLocked && "border-amber-200/50 hover:border-amber-300", isPremiumUnlocked && "border-emerald-200/50 hover:border-emerald-300")}
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
                    whileHover={whileHover.liftTap}
                    whileTap={whileTap.press}
                  >
                    <Card 
                      className="p-5 sm:p-6 lg:p-8 bg-white border-slate-200/60 shadow-lg shadow-slate-200/30 rounded-[2rem] hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-500/10 hover:border-brand-200 group transition-all duration-500 cursor-pointer flex flex-col gap-4 sm:gap-6 relative overflow-hidden h-full premium-shine-container"
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
                  if (mt.is_archived && !hasAccessTo(mt.id, selectedExam)) return false;
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
  if (user) return null; // Hide for logged-in users


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
    scrollToTop({ behavior: 'smooth' });
  }, [pathname]);

  return null;
};

function NotificationSoundListener() {
  const { toasts } = useToasterStore();
  const playedToastsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    toasts.forEach((t) => {
      if (t.visible && !playedToastsRef.current.has(t.id)) {
        playedToastsRef.current.add(t.id);
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.55;
        audio.play().catch((err) => {
          console.warn('Notification sound autoplay failed:', err);
        });
      }
    });

    const activeIds = new Set(toasts.map((t) => t.id));
    playedToastsRef.current.forEach((id) => {
      if (!activeIds.has(id)) {
        playedToastsRef.current.delete(id);
      }
    });
  }, [toasts]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Single global Toaster — must be here (root) so StrictMode never renders two instances */}
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            fontSize: '14px',
            borderRadius: '12px',
            padding: '12px 16px',
          },
        }}
      />
      <NotificationSoundListener />
      <ScrollToTop />
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const { user, loading, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mainTab, setMainTab] = useState<'home' | 'courses' | 'analytics' | 'history' | 'library' | 'ai_mentor'>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'courses' || tab === 'analytics' || tab === 'history' || tab === 'library' || tab === 'ai_mentor') {
      return tab as 'courses' | 'analytics' | 'history' | 'library' | 'ai_mentor';
    }
    return 'home';
  });
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);

  // Reset Password recovery states
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowResetModal(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setResetMessage(null);
  }, [newPassword, confirmNewPassword]);

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage(null);
    if (newPassword !== confirmNewPassword) {
      setResetMessage({
        type: 'error',
        text: 'Passwords do not match!'
      });
      return;
    }
    setIsResetting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setResetMessage({
        type: 'success',
        text: 'Password updated successfully! Redirecting...'
      });
      setTimeout(() => {
        setShowResetModal(false);
        setNewPassword('');
        setConfirmNewPassword('');
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      setResetMessage({
        type: 'error',
        text: error.message || 'Failed to update password.'
      });
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    if (location.pathname !== '/') return;
    const params = new URLSearchParams(window.location.search);
    if (mainTab === 'home') {
      params.delete('tab');
    } else {
      params.set('tab', mainTab);
    }
    const newSearch = params.toString();
    const newUrl = `${window.location.pathname}${newSearch ? '?' + newSearch : ''}${window.location.hash}`;
    window.history.replaceState(null, '', newUrl);
  }, [mainTab, location.pathname]);

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
    if (!loading && !user) {
      _dashboardCache.exams = [];
      _dashboardCache.testSeries = [];
      _dashboardCache.mockTests = [];
      _dashboardCache.dynamicQuestionBanks = {};
      _dashboardCache.loadedForUserId = null;
      _dashboardCache.hasFetchedThisSession = false;
      sessionStorage.removeItem('oep_selectedExam');
      sessionStorage.removeItem('oep_selectedBankType');
      sessionStorage.removeItem('oep_practiceSettings');
      sessionStorage.removeItem('oep_selectedMockCategory');
      sessionStorage.removeItem('oep_auto_navigated_dismissed');
      sessionStorage.removeItem('oep_cached_exams');
      sessionStorage.removeItem('oep_cached_testSeries');
      sessionStorage.removeItem('oep_cached_mockTests');
      sessionStorage.removeItem('oep_cached_dynamicQuestionBanks');
      sessionStorage.removeItem('oep_cached_loadedForUserId');
      setMainTab('home');
    }
  }, [user, loading]);

  const prevUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    // Only clear session data if we transition between different user sessions
    if (prevUserIdRef.current !== null && user?.id !== prevUserIdRef.current) {
      sessionStorage.removeItem('oep_selectedExam');
      sessionStorage.removeItem('oep_selectedBankType');
      sessionStorage.removeItem('oep_practiceSettings');
      sessionStorage.removeItem('oep_selectedMockCategory');
      sessionStorage.removeItem('oep_auto_navigated_dismissed');
      sessionStorage.removeItem('oep_cached_exams');
      sessionStorage.removeItem('oep_cached_testSeries');
      sessionStorage.removeItem('oep_cached_mockTests');
      sessionStorage.removeItem('oep_cached_dynamicQuestionBanks');
      sessionStorage.removeItem('oep_cached_loadedForUserId');
      _dashboardCache.exams = [];
      _dashboardCache.testSeries = [];
      _dashboardCache.mockTests = [];
      _dashboardCache.dynamicQuestionBanks = {};
      _dashboardCache.loadedForUserId = null;
      _dashboardCache.hasFetchedThisSession = false;
    }
    prevUserIdRef.current = user?.id || null;
  }, [user?.id]);

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
    return <LoadingPortal />;
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#F8FAFC] font-sans text-slate-900">
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
              <div className="flex flex-col min-h-screen min-h-[100dvh]">
                <Navbar user={user} isAdmin={isAdmin} onHomeClick={handleHomeClick} />

                <main className={cn(
                  "flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pt-4 md:pt-8 overflow-x-hidden transition-all duration-500",
                  isBottomNavVisible 
                    ? "pb-28 sm:pb-24 lg:pb-32" 
                    : "pb-12 sm:pb-16 lg:pb-20"
                )}>
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
                <motion.nav 
                  initial={false}
                  animate={{ y: isBottomNavVisible ? 0 : '100%' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="glass border-t border-slate-200/50 px-2 sm:px-8 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] sm:py-4 flex justify-around items-center fixed bottom-0 left-0 right-0 z-30 rounded-t-[2rem]"
                >
                  {/* Hide Navigation Toggle Tab */}
                  <button 
                    type="button"
                    onClick={() => setIsBottomNavVisible(false)}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white/95 border-t border-l border-r border-slate-200/50 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-t-xl px-4 py-1 flex items-center justify-center cursor-pointer shadow-[0_-4px_10px_rgba(0,0,0,0.03)] backdrop-blur-md transition-colors z-40 group focus:outline-none"
                    title="Hide Navigation"
                  >
                    <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5 duration-200" />
                  </button>

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
                  <button onClick={() => setMainTab('ai_mentor')} className={`flex flex-col items-center gap-1 sm:gap-1.5 group ${mainTab === 'ai_mentor' ? 'text-brand-600' : 'text-slate-400'}`}>
                    <div className={`p-1.5 sm:p-2 rounded-xl group-hover:scale-110 transition-transform ${mainTab === 'ai_mentor' ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide sm:tracking-widest">AI Mentor</span>
                  </button>
                </motion.nav>

                {/* Show Navigation Trigger Tab */}
                <AnimatePresence>
                  {!isBottomNavVisible && (
                    <motion.button 
                      initial={{ y: 50, opacity: 0, x: '-50%' }}
                      animate={{ y: 0, opacity: 1, x: '-50%' }}
                      exit={{ y: 50, opacity: 0, x: '-50%' }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      type="button"
                      onClick={() => setIsBottomNavVisible(true)}
                      className="fixed bottom-0 left-1/2 bg-white/95 border-t border-l border-r border-slate-200/50 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-t-xl px-5 py-1.5 flex items-center justify-center cursor-pointer shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur-md z-40 group focus:outline-none"
                      title="Show Navigation"
                    >
                      <ChevronUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 duration-200" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            )
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </AnimatedRoutes>
      {!(location.pathname.startsWith('/admin') || location.pathname.startsWith('/admin-login')) && (
        <WhatsAppButton />
      )}
      {!(location.pathname.startsWith('/admin') || location.pathname.startsWith('/admin-login')) && (
        <StickyAICompanion 
          isBottomNavVisible={isBottomNavVisible} 
          activeTab={location.pathname.startsWith('/blog') ? 'blog' : mainTab} 
        />
      )}

      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 bg-slate-950/40 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-md">
            <motion.div {...slideUpPanel}
              className="glass rounded-t-[2rem] sm:rounded-3xl w-full max-w-md p-6 sm:p-10 pb-10 sm:pb-10 space-y-6 sm:space-y-8 shadow-2xl border-x-0 border-b-0 sm:border border-white/40 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-center sticky top-0 bg-white/0 z-10">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
                  Create New Password
                </h3>
                <button 
                  onClick={() => setShowResetModal(false)} 
                  className="p-2 -mr-2 bg-slate-100/50 hover:bg-slate-200/50 rounded-full transition-colors backdrop-blur-md cursor-pointer"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              {resetMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-4 border rounded-2xl flex items-start gap-3 text-xs font-semibold leading-relaxed shadow-sm",
                    resetMessage.type === 'error' && "bg-rose-50 border-rose-100/80 text-rose-700",
                    resetMessage.type === 'success' && "bg-emerald-50 border-emerald-100/80 text-emerald-700"
                  )}
                >
                  {resetMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                  {resetMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    {resetMessage.text}
                  </div>
                </motion.div>
              )}

              <form onSubmit={handleResetSubmit} className="space-y-5">
                <div className="space-y-4">
                  {/* New Password field */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input 
                        type={showNewPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200/60 bg-white/50 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium text-base pr-12" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password field */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input 
                        type={showNewPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        required
                        className="w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200/60 bg-white/50 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium text-base pr-12" 
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isResetting}
                  className="w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-base sm:text-lg"
                >
                  {isResetting ? 'Updating Password...' : 'Update Password'}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
