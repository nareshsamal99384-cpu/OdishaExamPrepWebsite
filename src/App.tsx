import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
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
  Phone
} from 'lucide-react';
import { useAuth } from './lib/AuthContext';
import { supabase } from './lib/supabase';
import { cn, getDirectImageUrl } from './lib/utils';
import { examService } from './lib/examService';
import AdminPanel from './AdminPanel';
import MockTestSystem from './MockTestSystem';
import TestResultsView from './TestResultsView';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import { activityTracker } from './lib/activityTracker';

import PrivacyPolicy from './PrivacyPolicy';
import TermsOfService from './TermsOfService';
import RefundPolicy from './RefundPolicy';
import SearchableSelect from './components/SearchableSelect';
import YouTubeCarousel from './components/YouTubeCarousel';
import BlogList from './pages/BlogList';
import BlogPost from './pages/BlogPost';

const HistoryView = ({ user, onViewResults }: { user: any, onViewResults?: (results: any) => void }) => {
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    // If the component mounts, instantly load activities. It will prefer user_metadata if we just logged in.
    const raw = activityTracker.getActivities(user?.id, user?.user_metadata);
    setActivities(raw.filter((a: any) => a.type !== 'test_incomplete'));
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
          const isInteractive = isTestResult || isDownloadable;

          return (
            <div 
              key={i} 
              onClick={() => {
                if (isDownloadable) {
                  window.open(a.metadata.pdfUrl, '_blank');
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
                {a.score !== undefined && (
                   <div className="text-right">
                      <span className="font-bold text-brand-600 text-xl">{a.score}/{a.totalMarks}</span>
                      <p className="text-xs font-semibold text-slate-400">{Math.round(a.accuracy || 0)}% Accuracy</p>
                   </div>
                )}
                
                {isTestResult && (
                  <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white transition-all">
                    <ChevronRight className="w-5 h-5 ml-0.5" />
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

// --- Sections ---

const StatsSection = () => {
  const stats = [
    { label: 'Questions Attempted', value: '3M+', icon: <BookOpen className="w-6 h-6 text-brand-300" /> },
    { label: 'Active Aspirants', value: '15k+', icon: <Target className="w-6 h-6 text-brand-300" /> },
    { label: 'Success Rate', value: '94%', icon: <Award className="w-6 h-6 text-brand-300" /> }
  ];

  return (
    <section className="py-12 md:py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto bg-slate-950 rounded-[2rem] sm:rounded-3xl premium-shadow overflow-hidden relative">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
        <div className="absolute -top-20 -right-20 sm:-top-40 sm:-right-40 w-64 h-64 sm:w-[500px] sm:h-[500px] bg-brand-500 rounded-full mix-blend-screen filter blur-[90px] sm:blur-[128px] opacity-20 animate-pulse" />
        <div className="absolute -bottom-20 -left-20 sm:-bottom-40 sm:-left-40 w-64 h-64 sm:w-[500px] sm:h-[500px] bg-indigo-500 rounded-full mix-blend-screen filter blur-[90px] sm:blur-[128px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }} />
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800/60 p-6 sm:p-12 md:p-16">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="flex flex-col items-center justify-center space-y-3 sm:space-y-4 py-8 md:py-0 px-2 sm:px-4 group"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center group-hover:scale-110 group-hover:bg-brand-500/20 group-hover:border-brand-500/50 transition-all duration-300 shadow-xl">
                {stat.icon}
              </div>
              <div className="text-center space-y-1 sm:space-y-2">
                <div className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight flex items-baseline justify-center gap-1 group-hover:text-brand-300 transition-colors duration-300">
                  {stat.value}
                </div>
                <div className="text-slate-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs md:text-sm">
                  {stat.label}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const HowItWorksSection = () => {
  const steps = [
    { 
      step: '01',
      title: 'Choose Your Exam', 
      desc: 'Select your target exam (like OPSC or OSSC) and explore mock test series tailored perfectly to the syllabus.',
      icon: <LayoutDashboard className="w-8 h-8 text-brand-600" />
    },
    { 
      step: '02',
      title: 'Take A Mock Test', 
      desc: 'Practice with full-length exams, previous year questions (PYQs), or subject-wise mini quizzes to build your confidence.',
      icon: <Play className="w-8 h-8 text-brand-600" />
    },
    { 
      step: '03',
      title: 'Analyze & Improve', 
      desc: 'Review detailed step-by-step solutions and instant performance analytics to identify your weak spots immediately.',
      icon: <Target className="w-8 h-8 text-brand-600" />
    }
  ];

  return (
    <section id="how-it-works" className="py-24 space-y-16 scroll-mt-24">
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="space-y-3">
          <span className="text-brand-600 font-bold uppercase tracking-widest text-sm">
            Follow a proven 3-step system to improve your exam performance
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">How It Works</h2>
          <div className="w-24 h-1.5 premium-gradient rounded-full mx-auto" />
        </div>
        <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto">
          Our structured approach is designed to take you from fundamentals to exam-ready in record time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-10 relative">
        {/* Connection Line (Desktop) */}
        <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
        
        {steps.map((step, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.2 }}
            className="relative z-10 group h-full"
          >
            <Card className="p-6 md:p-8 h-full space-y-5 md:space-y-6 hover:border-brand-200 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 relative z-20">
              <div className="flex justify-between items-start">
                <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center premium-shadow group-hover:scale-110 group-hover:premium-glow transition-all duration-500">
                  {step.icon}
                </div>
                <span className="text-4xl font-black text-slate-100 group-hover:text-brand-100 transition-colors duration-500">
                  {step.step}
                </span>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-extrabold text-slate-900 group-hover:text-brand-600 transition-colors duration-300">
                  {step.title}
                </h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </Card>
            {/* Desktop right arrow */}
            {i < 2 && (
              <div className="hidden md:flex absolute top-1/2 -right-5 transform -translate-y-1/2 z-20 w-10 h-10 bg-white rounded-full border border-slate-100 items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <ChevronRight className="w-6 h-6 text-brand-400" />
              </div>
            )}
            {/* Mobile down arrow */}
            {i < 2 && (
              <div className="flex md:hidden absolute -bottom-[1.5rem] left-1/2 -translate-x-1/2 z-20 w-10 h-10 bg-white rounded-full border border-slate-100 items-center justify-center shadow-md text-brand-400">
                <ChevronDown className="w-6 h-6" />
              </div>
            )}
          </motion.div>
        ))}
      </div>
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
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
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
                <div className="text-3xl font-black">124<span className="text-lg text-brand-200">/2k</span></div>
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
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
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
            initial={{ x: 100, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
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

  return (
    <section id="testimonials" className="py-24 space-y-16 scroll-mt-24 overflow-hidden">
      <div className="flex flex-col items-center space-y-6 text-center px-6">
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-amber-500 font-bold bg-amber-50 px-4 sm:px-5 py-2 rounded-full border border-amber-100 shadow-sm animate-bounce-subtle">
            <Star className="w-4 h-4 fill-amber-500" />
            <span className="text-xs sm:text-sm tracking-tight text-center">4.8 average rating from 2,000+ aspirants</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">Trusted by Aspirants</h2>
          <div className="w-16 sm:w-24 h-1.5 premium-gradient rounded-full mx-auto" />
        </div>
        <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto">
          Hear from students who are actually using OdishaExamPrep to crack their dream exams.
        </p>
      </div>

      <div className="relative group">
        {/* Gradient Fades for Slider - Hidden on mobile for better reading area */}
        <div className="hidden sm:block absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
        <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />

        <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-12 px-6 sm:px-12 no-scrollbar snap-x snap-mandatory">
          {reviews.map((review, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="w-[85vw] sm:w-[320px] md:w-[380px] shrink-0 snap-center"
            >
              <Card className="p-6 sm:p-8 h-full flex flex-col justify-between space-y-4 sm:space-y-6 hover:shadow-2xl transition-all duration-500 border-white/40 hover:border-brand-200 text-left">
                <div className="space-y-4">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star 
                        key={star} 
                        className={cn(
                          "w-4 h-4",
                          star <= review.rating ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"
                        )} 
                      />
                    ))}
                  </div>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    "{review.text}"
                  </p>
                </div>
                
                <div className="flex items-center gap-4 pt-4 border-t border-slate-200/50">
                  <div className="relative">
                    <img 
                      src={review.avatar} 
                      alt={review.name} 
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" 
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{review.name}</h4>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{review.role}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
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
            <li><Link to="/privacy-policy" className="hover:text-brand-400 transition-colors duration-300 flex items-center gap-2 group"><ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-brand-500 transition-colors" /> Privacy Policy</Link></li>
            <li><Link to="/terms-of-service" className="hover:text-brand-400 transition-colors duration-300 flex items-center gap-2 group"><ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-brand-500 transition-colors" /> Terms of Service</Link></li>
            <li><Link to="/refund-policy" className="hover:text-brand-400 transition-colors duration-300 flex items-center gap-2 group"><ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-brand-500 transition-colors" /> Refund Policy</Link></li>
          </ul>
        </div>

        <div className="space-y-6">
          <h4 className="text-white font-black tracking-widest uppercase text-sm">Contact Us</h4>
          <ul className="space-y-4 font-medium text-slate-400">
            <li className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0"><Mail className="w-4 h-4 text-slate-300" /></div>
               <span className="break-all text-sm sm:text-base">odishaexamprep365@gmail.com</span>
            </li>
            <li className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0"><Phone className="w-4 h-4 text-slate-300" /></div>
               <span className="text-sm sm:text-base">+91 7377431715</span>
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
  onShowAdmin 
}: { 
  user: any, 
  isAdmin: boolean, 
  onSignIn?: () => void, 
  onShowAdmin?: () => void 
}) => {
  const { profile } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    
    if (window.location.pathname !== '/') {
      window.location.assign('/#' + id);
      return;
    }
    
    const element = document.getElementById(id);
    if (element) {
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 10);
    }
  };

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 md:px-10",
        scrolled 
          ? "py-3 bg-white/70 backdrop-blur-xl border-b border-slate-200/20 shadow-lg shadow-slate-900/5" 
          : "py-5 bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Logo */}
        <div 
          className="flex items-center gap-2.5 group cursor-pointer"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <div className="w-10 h-10 premium-gradient rounded-xl flex items-center justify-center premium-glow group-hover:scale-110 transition-transform duration-500">
            <BookOpen className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-2xl tracking-tighter text-slate-900">OdishaExamPrep</span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-10">
          <a 
            href="#exams" 
            onClick={(e) => scrollToSection(e, 'exams')}
            className="text-slate-600 font-medium hover:text-brand-600 transition-colors duration-300 relative group py-2"
          >
            Exams
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-500 transition-all duration-300 group-hover:w-full" />
          </a>
          <a 
            href="#how-it-works" 
            onClick={(e) => scrollToSection(e, 'how-it-works')}
            className="text-slate-600 font-medium hover:text-brand-600 transition-colors duration-300 relative group py-2"
          >
            How it Works
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-500 transition-all duration-300 group-hover:w-full" />
          </a>
          <a 
            href="#testimonials" 
            onClick={(e) => scrollToSection(e, 'testimonials')}
            className="text-slate-600 font-medium hover:text-brand-600 transition-colors duration-300 relative group py-2"
          >
            Testimonials
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-500 transition-all duration-300 group-hover:w-full" />
          </a>
          <Link 
            to="/blog"
            className="text-slate-600 font-medium hover:text-brand-600 transition-colors duration-300 relative group py-2"
          >
            Blog
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-500 transition-all duration-300 group-hover:w-full" />
          </Link>
          <a 
            href="#contact" 
            onClick={(e) => scrollToSection(e, 'contact')}
            className="text-slate-600 font-medium hover:text-brand-600 transition-colors duration-300 relative group py-2"
          >
            Contact
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-500 transition-all duration-300 group-hover:w-full" />
          </a>
          
          {user ? (
            <div className="flex items-center gap-4">
              {isAdmin && (
                <Link to="/admin" className="p-2.5 text-slate-500 hover:bg-brand-50 hover:text-brand-600 rounded-xl transition-all duration-300">
                  <Settings className="w-5 h-5 stroke-[1.5]" />
                </Link>
              )}
              <div className="w-10 h-10 rounded-xl bg-white p-0.5 shadow-sm border border-slate-200/50 overflow-hidden hover:scale-105 transition-transform duration-300">
                <img src={profile?.photoURL || user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(String(profile?.displayName || user?.user_metadata?.full_name || user?.email || 'U'))}`} alt="Profile" className="w-full h-full rounded-[10px] object-cover" referrerPolicy="no-referrer" />
              </div>
            </div>
          ) : (
            onSignIn && (
              <Button variant="primary" className="px-7 py-2.5 rounded-2xl text-sm font-semibold" onClick={onSignIn}>
                Sign In
              </Button>
            )
          )}
        </nav>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors duration-300"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6 stroke-[1.5]" /> : <Menu className="w-6 h-6 stroke-[1.5]" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 bg-white/98 backdrop-blur-2xl border-b border-slate-200/40 shadow-2xl overflow-hidden md:hidden"
          >
            <div className="p-6 flex flex-col gap-1">
              <a 
                href="#exams" 
                onClick={(e) => scrollToSection(e, 'exams')} 
                className="text-lg font-medium text-slate-900 p-4 hover:bg-brand-50 rounded-2xl transition-colors"
              >
                Exams
              </a>
              <a 
                href="#how-it-works" 
                onClick={(e) => scrollToSection(e, 'how-it-works')} 
                className="text-lg font-medium text-slate-900 p-4 hover:bg-brand-50 rounded-2xl transition-colors"
              >
                How it Works
              </a>
              <a 
                href="#testimonials" 
                onClick={(e) => scrollToSection(e, 'testimonials')} 
                className="text-lg font-medium text-slate-900 p-4 hover:bg-brand-50 rounded-2xl transition-colors"
              >
                Testimonials
              </a>
              <a 
                href="#contact" 
                onClick={(e) => scrollToSection(e, 'contact')} 
                className="text-lg font-medium text-slate-900 p-4 hover:bg-brand-50 rounded-2xl transition-colors"
              >
                Contact
              </a>
              {!user && onSignIn && (
                <div className="pt-4 px-4 pb-4">
                  <Button variant="primary" className="w-full py-4 rounded-2xl" onClick={() => { onSignIn(); setMobileMenuOpen(false); }}>
                    Sign In
                  </Button>
                </div>
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
      <Navbar user={user} isAdmin={false} onSignIn={() => setShowAuthModal(true)} />

      <main className="flex-1 p-4 sm:p-6 space-y-16 md:space-y-20 max-w-5xl mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center space-y-6 sm:space-y-8 pt-28 pb-12 sm:pt-32 sm:pb-20"
        >
          <div className="space-y-5 sm:space-y-6">
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold text-slate-950 tracking-tight leading-[1.1] sm:leading-[1.1]">
              Crack Odisha State Exams <br className="hidden sm:block" />
              <span className="premium-text-gradient">With Confidence</span>
            </h1>
            <p className="text-slate-500 text-base sm:text-lg md:text-xl max-w-3xl mx-auto font-medium leading-relaxed px-2">
              Prepare for OPSC, OSSC, OSSSC, and Police exams with topic-wise quizzes, full-length mock tests, and previous year questions (PYQs). Start practicing for free today!
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pt-6 px-4 sm:px-0">
            <Button 
              className="w-full sm:w-auto py-4 sm:py-5 px-8 sm:px-10 text-lg sm:text-xl rounded-xl sm:rounded-2xl" 
              onClick={() => {
                const el = document.getElementById('exams');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              Start Free Practice
            </Button>
            <Button 
              variant="outline" 
              className="w-full sm:w-auto py-4 sm:py-5 px-8 sm:px-10 text-lg sm:text-xl rounded-xl sm:rounded-2xl bg-white/50 backdrop-blur-sm"
              onClick={() => {
                const el = document.getElementById('test-series');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                } else {
                  // Fallback: If section doesn't exist yet, scroll to exams
                  document.getElementById('exams')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              View Test Series
            </Button>
          </div>
        </motion.div>

        <section id="exams" className="space-y-10 pb-20 scroll-mt-24">
          <div className="flex flex-col items-center space-y-4">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Explore Exams</h2>
              <div className="w-24 h-1.5 premium-gradient rounded-full mx-auto" />
            </div>
          </div>
          <DashboardContent isGuest={!user} onSignIn={() => setShowAuthModal(true)} />
        </section>

        <StatsSection />
        <HowItWorksSection />
        <ProductPreviewSection />
        <TestimonialsSection />
      </main>

      <Footer />

      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 bg-slate-950/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-md">
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
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

              <Button onClick={handleGoogleLogin} variant="outline" className="w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border-slate-200/60 bg-white/50 text-base">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                <span className="font-bold">Continue with Google</span>
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200/60" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-transparent px-4 text-slate-400 font-bold tracking-widest">Or use email</span></div>
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
                  <input 
                    type="password" 
                    placeholder="Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200/60 bg-white/50 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium text-base" 
                  />
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

const DashboardContent = ({ isGuest, onSignIn, mainTab = 'home', user }: { isGuest?: boolean, onSignIn?: () => void, mainTab?: string, user?: any }) => {
  const { profile, isAdmin, hasFullAccess, grantFullAccess, hasAccessTo, unlockItem, guestUsage, incrementGuestUsage } = useAuth();
  const navigate = useNavigate();
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [activeTest, setActiveTest] = useState<any | null>(null);
  const [testResults, setTestResults] = useState<any | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<'popular' | 'upcoming'>('upcoming');
  const [showPracticeConfig, setShowPracticeConfig] = useState(false);
  const [selectedBankType, setSelectedBankType] = useState<string | null>(null);
  const [selectedBankItem, setSelectedBankItem] = useState<any | null>(null);
  const [bankSearchQuery, setBankSearchQuery] = useState("");
  const [bankSortBy, setBankSortBy] = useState("Name");
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallPrice, setPaywallPrice] = useState(499);
  const [paywallOriginalPrice, setPaywallOriginalPrice] = useState(999);
  const [paywallItemTitle, setPaywallItemTitle] = useState('Full Access');
  const [paywallFeatures, setPaywallFeatures] = useState<string[]>([
    'Full Question Bank (10,000+ Qs)',
    'Unlimited Practice Mode',
    'Detailed Step-by-Step Solutions'
  ]);
  const [paywallItemId, setPaywallItemId] = useState<string | null>(null);
  const [loadingPractice, setLoadingPractice] = useState(false);
  const [topicMaxQuestions, setTopicMaxQuestions] = useState<number>(0);
  const [practiceSettings, setPracticeSettings] = useState({
    examId: '',
    category: '',
    topic: '',
    questions: '20',
    timeLimit: '30'
  });

  const [dynamicQuestionBanks, setDynamicQuestionBanks] = useState<Record<string, any[]>>({});
  const [exams, setExams] = useState<any[]>([]);
  const [testSeries, setTestSeries] = useState<any[]>([]);
  const [mockTests, setMockTests] = useState<any[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [selectedMockCategory, setSelectedMockCategory] = useState<string | null>(null);

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
      try {
        const [fetchedExams, fetchedBanks, fetchedSeries, fetchedTests] = await Promise.all([
          examService.getAllExams(),
          examService.getAllQuestionBanks(),
          examService.getAllTestSeries(),
          examService.getAllMockTests()
        ]);
        
        setTestSeries(fetchedSeries || []);
        setMockTests(fetchedTests || []);
        
        if (fetchedExams.length > 0) {
          setExams(fetchedExams);
        } else {
          // Fallback static data
          setExams([
            { id: 'opsc-aio', name: 'OPSC AIO', description: 'Odisha Public Service Commission All In One', icon: '🏛️', category: 'popular' }
          ]);
        }

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
            pdfUrl: bank.pdfUrl,
            hasPracticeMode: bank.hasPracticeMode
          });
        });
        setDynamicQuestionBanks(groupedBanks);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoadingExams(false);
      }
    };
    fetchDashboardData();
  }, []);

  const [examSearchQuery, setExamSearchQuery] = useState('');

  const filteredExams = exams.filter(exam => {
    if (exam.name === 'SYSTEM_SETTINGS_YOUTUBE_RESERVED') return false;
    if (exam.category === 'system' || exam.category === 'blog') return false;
    if (exam.category !== activeTab) return false;
    if (!examSearchQuery) return true;
    const q = examSearchQuery.toLowerCase();
    return exam.name.toLowerCase().includes(q) || (exam.description && exam.description.toLowerCase().includes(q));
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

  const [activeTestState, setActiveTestState] = useState<any>(null);

  const allActivities = useMemo(() => activityTracker.getActivities(user?.id, user?.user_metadata), [user, mainTab, activeTest]);

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

  const handleStartTest = (test: any) => {
    if (isGuest) {
      setShowLoginPrompt(true);
      return;
    }
    
    if (test.isPremium && !hasAccessTo(test.id)) {
      setPaywallPrice(test.price || 499);
      setPaywallOriginalPrice(test.originalPrice || ((test.price || 499) * 2));
      setPaywallItemTitle(test.title || 'Premium Test');
      setPaywallFeatures([
        `${test.durationMinutes || 60} Minutes Duration`,
        `${test.totalMarks || 100} Total Marks`,
        `Detailed Explanations & Analytics`,
      ]);
      setPaywallItemId(test.id);
      setShowPaywall(true);
      return;
    }

    if (isGuest) incrementGuestUsage('tests'); // This could be removed since we block guests entirely, but to avoid TS errors
    setActiveTestState({ resumeSessionId: `session-${Date.now()}` });
    setActiveTest({
      ...test,
      durationMinutes: test.durationMinutes || 60, // Fallback duration
    });
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
      if (topicBank?.isPremium && !hasAccessTo(topicBank.id)) {
        setPaywallPrice(topicBank.price || 499);
        setPaywallOriginalPrice(topicBank.originalPrice || ((topicBank.price || 499) * 2));
        setPaywallItemTitle(topicBank.title || 'Premium Bank');
        setPaywallFeatures([
          `${topicBank.questionCount || 500}+ Premium Questions`,
          topicBank.hasPracticeMode !== false ? 'Unlimited Practice Mode' : 'Instant PDF Access',
          'Detailed Step-by-Step Solutions',
        ]);
        setPaywallItemId(topicBank.id);
        setShowPaywall(true);
        setLoadingPractice(false);
        return;
      }
      const bankTopicName = topicBank ? topicBank.title : practiceSettings.topic;

      const { data, error } = await supabase.from('questions').select('*').eq('examId', selectedExam);
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
        isPremium: topicBank?.isPremium ?? false,
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
    return <TestResultsView results={testResults} onClose={() => setTestResults(null)} />;
  }

  if (activeTest) {
    return (
      <MockTestSystem 
        test={activeTest} 
        initialState={activeTestState}
        onExit={(progressState) => {
          setActiveTest(null);
          setActiveTestState(null);
          if (progressState && progressState.answers && Object.keys(progressState.answers).length > 0) {
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
          }
        }} 
        onComplete={(results) => {
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
            totalMarks: results.totalMarks,
            accuracy: (results.correct / (results.correct + results.incorrect)) * 100 || 0,
            metadata: {
              ...results,
              resumeSessionId: activeTestState?.resumeSessionId,
              examName: currentExamName,
              testCategory: testCategory
            }
          });
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

  if (mainTab === 'history') {
    return <HistoryView user={user} onViewResults={setTestResults} />;
  }

  if (!selectedExam) {
    let globalVideoIds: string[] = [
      'dQw4w9WgXcQ', 
      'jNQXAC9IVRw', 
      'EngW7tCbLHY', 
      'M7lc1UVf-VE', 
      'C0DPdy98e4c', 
      'V-_O7nl0Ii0'
    ];
    
    const sysSettings = exams.find(e => e.name === 'SYSTEM_SETTINGS_YOUTUBE_RESERVED');
    if (sysSettings && sysSettings.description) {
       try {
         const parsed = JSON.parse(sysSettings.description);
         if (parsed.videos && parsed.videos.length > 0) globalVideoIds = parsed.videos;
       } catch(e) {}
    }

    return (
      <div className="space-y-12">
        <YouTubeCarousel videoIds={globalVideoIds} />
        
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card 
              onClick={() => navigate('/admin')}
              className="p-6 bg-brand-600 text-white border-none shadow-xl shadow-brand-500/20 cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                    <Settings className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black">Admin Control Center</h3>
                    <p className="text-brand-100 font-medium">Manage exams, questions, and users</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 font-bold text-sm bg-white/20 px-4 py-2 rounded-xl backdrop-blur-md group-hover:bg-white group-hover:text-brand-600 transition-all">
                  Open Dashboard
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {!isGuest && incompleteTests.length > 0 && (
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Continue Practice</h2>
            <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 sm:pb-6 no-scrollbar snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
              {incompleteTests.map((a: any, i: number) => (
                <Card 
                  key={i} 
                  onClick={() => {
                    setActiveTestState({
                      ...a.metadata,
                      resumeSessionId: a.metadata.resumeSessionId || a.metadata.test?.id
                    });
                    setActiveTest(a.metadata.test);
                  }}
                  className="min-w-[280px] sm:min-w-[320px] max-w-[85vw] snap-center shrink-0 p-4 sm:p-6 flex gap-4 sm:gap-5 items-center hover:scale-[1.02] cursor-pointer group"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 premium-gradient rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 premium-glow group-hover:scale-110 transition-transform">
                    <Play className="text-white w-5 h-5 sm:w-7 sm:h-7 fill-white/20 ml-1" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base sm:text-lg text-slate-900 line-clamp-1">{a.title}</h4>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Last practiced {new Date(a.timestamp).toLocaleDateString()}</p>
                    {a.metadata?.testCategory && (
                       <p className="text-[9px] sm:text-[10px] text-brand-600 font-black mt-1 sm:mt-1.5 uppercase tracking-widest">{a.metadata.testCategory}</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="bg-slate-100/80 p-1.5 rounded-2xl flex gap-1 backdrop-blur-sm border border-slate-200/50 w-full md:w-auto">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={cn(
                  "flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300",
                  activeTab === 'upcoming' 
                    ? "premium-gradient text-white shadow-md shadow-brand-500/20" 
                    : "text-slate-600 hover:bg-white/50"
                )}
              >
                Upcoming
              </button>
              <button
                onClick={() => setActiveTab('popular')}
                className={cn(
                  "flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300",
                  activeTab === 'popular' 
                    ? "premium-gradient text-white shadow-md shadow-brand-500/20" 
                    : "text-slate-600 hover:bg-white/50"
                )}
              >
                Popular
              </button>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text"
                placeholder="Search exams..."
                value={examSearchQuery}
                onChange={(e) => setExamSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-sm font-semibold transition-all shadow-sm"
              />
              {examSearchQuery && (
                <button onClick={() => setExamSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="relative group -mx-2 px-2">
            {/* Top Fade */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#F8FAFC] to-transparent z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-3xl" />
            
            <div className="max-h-[460px] md:max-h-[600px] overflow-y-auto no-scrollbar scroll-smooth pb-16 pt-2">
              <motion.div 
                layout
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6"
              >
                <AnimatePresence mode="popLayout">
                  {loadingExams ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <motion.div
                        key={`skeleton-${i}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-32 md:h-56 rounded-[1.5rem] md:rounded-[2rem] bg-slate-100 animate-pulse border border-slate-200/50"
                      />
                    ))
                  ) : (
                    filteredExams.map((exam) => (
                      <motion.div 
                        key={exam.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        whileHover={{ y: -5 }}
                        onClick={() => setSelectedExam(exam.id)}
                        className="cursor-pointer h-full"
                      >
                        <Card className="p-4 sm:p-6 h-full hover:border-brand-300 group/card flex flex-col items-center text-center justify-center space-y-2 md:space-y-4 shadow-sm hover:shadow-xl transition-all duration-300 relative">
                          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover/card:bg-brand-500 group-hover/card:text-white transition-colors duration-300 shadow-[0_2px_10px_rgb(0,0,0,0.05)] border border-slate-100 group-hover/card:border-brand-500">
                            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover/card:translate-x-0.5 transition-transform" />
                          </div>

                          <div className="w-12 h-12 md:w-16 md:h-16 flex justify-center items-center shrink-0 transform group-hover/card:scale-110 transition-transform duration-500 mt-2 md:mt-0">
                            {exam.icon.startsWith('http') || exam.icon.startsWith('/') ? (
                              <img src={getDirectImageUrl(exam.icon)} alt={exam.name} className="w-full h-full object-contain drop-shadow-sm" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-4xl md:text-5xl">{exam.icon}</span>
                            )}
                          </div>
                          
                          <div className="flex-1 w-full flex flex-col justify-start">
                            <h3 className="text-[13px] md:text-lg lg:text-xl font-bold md:font-extrabold text-slate-900 group-hover/card:text-brand-600 transition-colors line-clamp-2 md:line-clamp-2 leading-snug tracking-tight">{exam.name}</h3>
                            <p className="hidden md:block text-slate-500 mt-2 text-sm font-medium line-clamp-2 leading-relaxed">{exam.description}</p>
                            {exam.examDate && exam.category === 'upcoming' && (
                              <div className="mt-auto pt-3 flex items-center justify-center gap-1 text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest hidden md:flex">
                                <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                {(() => {
                                  const d = new Date(exam.examDate);
                                  return `${d.getDate().toString().padStart(2, '0')} / ${(d.getMonth()+1).toString().padStart(2, '0')} / ${d.getFullYear()}`;
                                })()}
                              </div>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
            
            {/* Bottom Fade Mask */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/90 to-transparent z-20 pointer-events-none rounded-b-3xl" />
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {items.map((item) => {
            const isLocked = item.isPremium && !hasFullAccess;
            return (
              <Card 
                key={item.id} 
                onClick={() => setSelectedBankItem(item)}
                className="group cursor-pointer hover:border-brand-300 relative overflow-hidden"
              >
                <div className={cn("h-48 overflow-hidden relative", isLocked && "blur-[2px]")}>
                  <img 
                    src={getDirectImageUrl(item.image)} 
                    alt={item.title} 
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
                <div className={cn("p-6 space-y-4", isLocked && "opacity-60")}>
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-black text-slate-900">{item.title}</h3>
                    {isLocked && <Lock className="w-4 h-4 text-slate-400" />}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-500">
                      <HelpCircle className="w-4 h-4" />
                      <span className="text-xs font-bold">{item.questions} Questions</span>
                    </div>
                    <div className="flex items-center gap-2 text-brand-600 bg-brand-50/50 px-3 py-1.5 rounded-lg w-fit">
                      <Zap className="w-3.5 h-3.5 fill-brand-600" />
                      <span className="text-[11px] font-black uppercase tracking-wider">{item.tagline}</span>
                    </div>
                  </div>
                  <Button variant="secondary" className="w-full py-3 rounded-xl text-sm font-bold">
                    {isLocked ? 'Unlock to View' : 'View Details'}
                  </Button>
                </div>
              </Card>
            );
          })}
            </div>
          </div>
        </div>
        )}

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
                    <Button 
                      className="w-full h-12 rounded-xl text-sm font-black premium-gradient shadow-lg shadow-brand-500/20"
                      onClick={() => {
                        if (isGuest) {
                          setShowLoginPrompt(true);
                          return;
                        }
                        if (selectedBankItem.isPremium && !hasAccessTo(selectedBankItem.id)) {
                          setPaywallPrice(selectedBankItem.price || 499);
                          setPaywallOriginalPrice(selectedBankItem.originalPrice || ((selectedBankItem.price || 499) * 2));
                          setPaywallItemTitle(selectedBankItem.title || 'Premium Content');
                          setPaywallFeatures([
                            `${selectedBankItem.questions || selectedBankItem.questionCount || '500+'} Questions`,
                            selectedBankItem.hasPracticeMode !== false ? 'Interactive Practice Mode' : 'Instant PDF Access',
                            selectedBankItem.tagline || 'Detailed Solutions Provided',
                          ]);
                          setPaywallItemId(selectedBankItem.id);
                          setShowPaywall(true);
                        } else {
                          if (selectedBankItem.pdfUrl) {
                            const currentExamName = exams.find(e => e.id === selectedExam)?.name || 'General';
                            const bankCategories: Record<string, string> = {
                              'topic-wise': 'Topic-wise Question Bank',
                              'exam-focused': 'Exam-Focused Bank',
                              'revision-sets': 'Revision Sets',
                              'pyq-collections': 'PYQ Collection'
                            };
                            const specificCategory = selectedBankType ? (bankCategories[selectedBankType] || 'PDF Material') : 'PDF Material';

                            activityTracker.logActivity(user?.id, {
                              type: 'question_bank_accessed',
                              title: `Downloaded ${selectedBankItem.title} PDF`,
                              metadata: {
                                pdfUrl: selectedBankItem.pdfUrl,
                                examName: currentExamName,
                                testCategory: specificCategory
                              }
                            });
                            window.open(selectedBankItem.pdfUrl, '_blank');
                          } else {
                            alert("No PDF link available for this item.");
                          }
                        }
                      }}
                    >
                      {selectedBankItem.isPremium && !hasAccessTo(selectedBankItem.id) ? (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Unlock to Download
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </>
                      )}
                    </Button>
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

                        if (selectedBankItem.isPremium && !hasAccessTo(selectedBankItem.id)) {
                          setPaywallPrice(selectedBankItem.price || 499);
                          setPaywallOriginalPrice(selectedBankItem.originalPrice || ((selectedBankItem.price || 499) * 2));
                          setPaywallItemTitle(selectedBankItem.title || 'Premium Content');
                          setPaywallFeatures([
                            `${selectedBankItem.questions || selectedBankItem.questionCount || '500+'} Questions`,
                            selectedBankItem.hasPracticeMode !== false ? 'Interactive Practice Mode' : 'Instant PDF Access',
                            selectedBankItem.tagline || 'Detailed Solutions Provided',
                          ]);
                          setPaywallItemId(selectedBankItem.id);
                          setShowPaywall(true);
                        } else {
                          setSelectedBankItem(null);
                          setSelectedBankType(null);
                          setShowPracticeConfig(true);
                          setPracticeSettings({...practiceSettings, topic: selectedBankItem.id});
                          setTimeout(() => {
                            document.getElementById('practice-mode-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 100);
                        }
                      }}
                    >
                      {selectedBankItem.hasPracticeMode === false ? (
                        <>
                          <Clock className="w-4 h-4 mr-2" />
                          Coming Soon
                        </>
                      ) : selectedBankItem.isPremium && !hasFullAccess ? (
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
                  <div className="w-14 h-14 premium-gradient rounded-2xl flex items-center justify-center mx-auto premium-glow">
                    <Award className="text-white w-7 h-7" />
                  </div>
                  
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight px-2">{paywallItemTitle === 'Full Access' ? 'Unlock Full Access' : `Unlock ${paywallItemTitle}`}</h2>
                    <p className="text-slate-500 text-sm font-medium leading-tight">
                      {paywallItemTitle === 'Full Access' ? 'Get unlimited access to all premium question banks and features.' : `Get lifetime access to this ${paywallItemId?.includes('practice') || paywallItemId?.includes('series') ? 'content' : 'test'} and its detailed solutions.`}
                    </p>
                  </div>

                  <div className="space-y-2.5 text-left bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    {paywallFeatures.map((benefit, i) => (
                      <div key={i} className="flex items-center gap-3 text-slate-700 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-xs">{benefit}</span>
                      </div>
                    ))}
                  </div>

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
                      className="w-full h-12 rounded-xl text-base font-black premium-gradient shadow-lg shadow-brand-500/20"
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
                      Unlock Now
                      <ChevronRight className="w-5 h-5 ml-1" />
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
            <div className="fixed inset-0 bg-black/60 z-[200] flex items-end justify-center p-0 backdrop-blur-sm">
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="bg-white rounded-t-3xl w-full max-w-md p-8 space-y-6 shadow-2xl"
              >
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="text-indigo-600 w-8 h-8" />
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
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setSelectedExam(null)} className="p-3 rounded-2xl hover:bg-brand-50">
            <ChevronRight className="w-6 h-6 rotate-180 text-brand-600" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-slate-950 tracking-tight">
              {exams.find(e => e.id === selectedExam)?.name}
            </h1>
            <p className="text-slate-500 font-medium">Select your preparation path</p>
          </div>
        </div>
      </div>

      {/* Section 1: Download Question Bank */}
      <section className="space-y-8">
        <div className="relative pl-4">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 rounded-full" />
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Download Question Bank</h2>
          <p className="text-slate-500 font-medium mt-1">Premium resources for your preparation</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          {[
            { id: 'topic-wise', title: 'Topic-wise Question Bank', desc: 'Master specific subjects with curated questions.', icon: <Layers className="w-6 h-6 sm:w-7 sm:h-7" /> },
            { id: 'exam-focused', title: 'Exam-Focused Bank', desc: 'High-yield questions tailored for this exam.', icon: <Target className="w-6 h-6 sm:w-7 sm:h-7" /> },
            { id: 'revision-sets', title: 'Revision Sets', desc: 'Quick revision modules for last-minute prep.', icon: <BookMarked className="w-6 h-6 sm:w-7 sm:h-7" /> },
            { id: 'pyq-collections', title: 'PYQ Collections', desc: 'Previous Year Questions with detailed solutions.', icon: <History className="w-6 h-6 sm:w-7 sm:h-7" /> },
          ].map((item, i) => (
            <Card 
              key={i} 
              onClick={() => setSelectedBankType(item.id)}
              className="p-5 sm:p-6 lg:p-8 flex flex-col justify-between bg-gradient-to-br from-white to-slate-50/50 backdrop-blur-md border border-white/20 shadow-sm hover:shadow-2xl hover:shadow-brand-500/10 hover:-translate-y-1 transition-all duration-500 rounded-[1.5rem] cursor-pointer group relative overflow-hidden h-full"
            >
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl group-hover:bg-brand-500/10 transition-colors" />
              
              <div className="flex-1 pb-6">
                <div className="flex justify-between items-start mb-4 sm:mb-6">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 premium-gradient rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20 group-hover:scale-110 group-hover:premium-glow transition-all duration-500 shrink-0">
                    {item.icon}
                  </div>
                </div>
                <h4 className="font-extrabold text-base sm:text-lg lg:text-xl text-slate-900 mb-2 group-hover:text-brand-600 transition-colors tracking-tight line-clamp-2 md:line-clamp-none leading-snug">{item.title}</h4>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">{item.desc}</p>
              </div>
              
              <Button className="w-full py-3 sm:py-3.5 mt-auto rounded-xl flex items-center justify-center text-xs sm:text-sm font-black premium-gradient border-none shadow-md shadow-brand-500/10 group-hover:shadow-lg group-hover:shadow-brand-500/30 transition-all pointer-events-none">
                View Collection
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* Section 2: Practice Mode */}
      <section id="practice-mode-section" className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Practice Mode</h2>
        </div>
        
          <Card 
            onClick={() => setShowPracticeConfig(true)}
            className="p-5 sm:p-6 md:p-8 bg-gradient-to-br from-white to-indigo-50/40 border border-indigo-100/50 shadow-xl shadow-indigo-500/5 rounded-[1.5rem] md:rounded-[2rem] cursor-pointer group relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 hover:-translate-y-1"
          >
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors duration-700 pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl group-hover:bg-brand-500/10 transition-colors duration-700 pointer-events-none" />
            
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
                    options={exams.map(ex => ({ value: ex.id, label: ex.name }))}
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
                         label: `${item.title} ${item.isPremium && !hasAccessTo(item.id) ? '(Premium)' : ''}`
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
            <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 sm:text-slate-400 font-bold text-[11px] sm:text-sm bg-slate-50 px-3 sm:px-4 py-2 rounded-xl border border-slate-100 w-fit">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
              Updated for 2024 Exam Pattern
            </div>
          </div>
        </div>

        {(() => {
          const renderMockTestCard = (test: any) => {
            let isPremium = test.isPremium;
            let price = test.price || 499;
            if (isPremium === undefined || test.seriesId) {
              try { 
                const parsed = JSON.parse(test.seriesId);
                isPremium = parsed.isPremium || false; 
                price = parsed.price || 499;
              } catch(e) {}
            }
            const isLocked = isPremium && !hasFullAccess && !isAdmin;

            return (
            <Card 
              key={test.id} 
              className={cn("p-6 bg-white border-slate-200/60 shadow-lg shadow-slate-200/30 rounded-[1.5rem] hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-brand-500/10 hover:border-brand-200 group transition-all duration-300 cursor-pointer flex flex-col gap-6 relative overflow-hidden", isLocked && "border-amber-200/50 hover:border-amber-300")}
              onClick={() => {
                  if (!test.questions || test.questions.length === 0) {
                    alert("This mock test is empty. Questions are being added soon!");
                  } else {
                    handleStartTest({ ...test, isPremium, price });
                  }
              }}
            >
              <div className="flex items-start justify-between relative z-10 w-full">
                <div className="flex items-center gap-4">
                  <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-md text-white transition-transform group-hover:scale-110", isLocked ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-indigo-500 to-purple-600")}>
                    <Target className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-xl text-slate-950 tracking-tight">{test.title}</h4>
                </div>
                {isPremium && (
                  <div className="flex shrink-0">
                    {isLocked ? (
                      <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl border border-amber-100 flex items-center justify-center shadow-sm" aria-label="Premium Locked">
                        <Lock className="w-5 h-5 fill-amber-500/20" />
                      </div>
                    ) : (
                      <div className="bg-emerald-50 text-emerald-600 px-2 py-1 flex items-center gap-1 rounded-lg border border-emerald-100 text-[10px] font-black uppercase tracking-widest shadow-sm" aria-label="Premium Unlocked">
                        Unlocked
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="space-y-4 flex-1 relative z-10 pt-2">
                <div className="flex gap-4 text-xs font-bold text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded"><Clock className="w-3.5 h-3.5 text-brand-500"/> {test.durationMinutes} Mins</span>
                  <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded"><Award className="w-3.5 h-3.5 text-brand-500"/> {test.totalMarks} Marks</span>
                  <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded"><FileText className="w-3.5 h-3.5 text-brand-500"/> {test.questions?.length || 0} Qs</span>
                </div>
              </div>
              
              <Button 
                variant={isLocked ? "outline" : "primary"}
                className={cn("w-full h-[48px] rounded-xl font-black text-sm relative z-10 transition-all", !isLocked && "premium-gradient text-white shadow-lg shadow-brand-500/20 group-hover:premium-glow", isLocked && "border-amber-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700")}
              >
                {isLocked ? (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Unlock to Access
                  </>
                ) : (
                  <>
                    Start Test
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </Card>
          )};

          if (!selectedMockCategory) {
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:gap-8 gap-4 sm:gap-6">
                {[
                  { id: 'full-length', title: 'Full-Length Mock Tests', desc: 'Complete exam simulation with real-time ranking.', icon: <Award className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'from-amber-400 to-orange-500', tag: 'Most Popular' },
                  { id: 'sectional', title: 'Sectional Tests', desc: 'Focus on specific sections to improve your score.', icon: <Target className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'from-blue-400 to-indigo-500', tag: 'Recommended' },
                  { id: 'pyq', title: 'PYQ Tests', desc: 'Practice with actual previous year papers.', icon: <History className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'from-purple-400 to-pink-500', tag: 'High Yield' },
                  { id: 'daily', title: 'Daily / Weekly Tests', desc: 'Regular assessments to track your progress.', icon: <Clock className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'from-emerald-400 to-teal-500', tag: 'Consistency' },
                ].map((test, i) => (
                  <Card 
                    key={i} 
                    className="p-5 sm:p-6 lg:p-8 bg-white border-slate-200/60 shadow-lg shadow-slate-200/30 rounded-[1.5rem] hover:-translate-y-1 sm:hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-brand-500/10 hover:border-brand-200 group transition-all duration-300 cursor-pointer flex flex-col gap-4 sm:gap-6 relative overflow-hidden h-full"
                    onClick={() => setSelectedMockCategory(test.id)}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                      <div className={cn(
                        "w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 shadow-md bg-gradient-to-br text-white transition-transform group-hover:scale-110",
                        test.color
                      )}>
                        {test.icon}
                      </div>
                      <h4 className="font-extrabold text-lg sm:text-xl text-slate-950 tracking-tight leading-tight">{test.title}</h4>
                    </div>
                    
                    <div className="space-y-3 flex-1 relative z-10">
                      <p className="text-slate-500 font-medium text-xs sm:text-sm leading-relaxed">{test.desc}</p>
                      <div className="flex">
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2.5 sm:px-3 py-1 bg-slate-50 text-slate-400 rounded-full border border-slate-100 group-hover:bg-brand-50 group-hover:text-brand-600 group-hover:border-brand-100 transition-colors">
                          {test.tag}
                        </span>
                      </div>
                    </div>

                    <Button 
                      className="w-full h-[40px] sm:h-[48px] mt-2 rounded-xl flex items-center justify-center gap-1 font-black text-xs sm:text-sm premium-gradient text-white shadow-md shadow-brand-500/20 group-hover:premium-glow transition-all relative z-10 pointer-events-none"
                    >
                      View Tests
                      <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Card>
                ))}
              </div>
            );
          }

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

      {/* Login Prompt Popup */}
      <AnimatePresence>
        {showLoginPrompt && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-0 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-t-3xl w-full max-w-md p-8 space-y-6 shadow-2xl"
            >
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="text-indigo-600 w-8 h-8" />
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
    </div>
  );
};

// --- Main App ---

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const { user, loading, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState<'home' | 'courses' | 'history'>('home');

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
      <Routes>
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
                <Navbar user={user} isAdmin={isAdmin} />

                <main className="flex-1 p-6 max-w-5xl mx-auto w-full pt-24 overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={mainTab}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3 }}
                      className="w-full"
                    >
                      <DashboardContent mainTab={mainTab} user={user} />
                    </motion.div>
                  </AnimatePresence>
                </main>

                {/* Mobile Bottom Nav */}
                <nav className="glass border-t border-slate-200/50 px-8 py-4 flex justify-around items-center sticky bottom-0 z-30 rounded-t-[2rem]">
                  <button onClick={() => setMainTab('home')} className={`flex flex-col items-center gap-1.5 group ${mainTab === 'home' ? 'text-brand-600' : 'text-slate-400'}`}>
                    <div className={`p-2 rounded-xl group-hover:scale-110 transition-transform ${mainTab === 'home' ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                      <LayoutDashboard className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">Home</span>
                  </button>
                  <button onClick={() => setMainTab('courses')} className={`flex flex-col items-center gap-1.5 group ${mainTab === 'courses' ? 'text-brand-600' : 'text-slate-400'}`}>
                    <div className={`p-2 rounded-xl group-hover:scale-110 transition-transform ${mainTab === 'courses' ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">Courses</span>
                  </button>
                  <button onClick={() => setMainTab('history')} className={`flex flex-col items-center gap-1.5 group ${mainTab === 'history' ? 'text-brand-600' : 'text-slate-400'}`}>
                    <div className={`p-2 rounded-xl group-hover:scale-110 transition-transform ${mainTab === 'history' ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                      <History className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">History</span>
                  </button>
                  <button onClick={() => { logout(); navigate('/'); }} className="flex flex-col items-center gap-1.5 text-slate-400 group">
                    <div className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl group-hover:scale-110 transition-transform">
                      <LogOut className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">Exit</span>
                  </button>
                </nav>
              </div>
            )
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
