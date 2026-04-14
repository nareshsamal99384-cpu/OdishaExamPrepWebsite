import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  LayoutDashboard, 
  History, 
  Settings, 
  LogOut, 
  ChevronRight, 
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
  HelpCircle
} from 'lucide-react';
import { useAuth } from './lib/AuthContext';
import { auth, googleProvider, db } from './lib/firebase';
import { signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDocFromServer, collection, getDocs, query, where } from 'firebase/firestore';
import { cn } from './lib/utils';
import AdminPanel from './AdminPanel';
import MockTestSystem from './MockTestSystem';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ProtectedRoute from './components/ProtectedRoute';

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
    { label: 'Total Tests Taken', value: '50,000+' },
    { label: 'Active Aspirants', value: '10,000+' },
    { label: 'Success Rate', value: '94%' }
  ];

  return (
    <section className="py-20 border-y border-slate-200/50 bg-white/30 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="space-y-2"
          >
            <div className="text-5xl md:text-6xl font-black premium-text-gradient tracking-tighter">
              {stat.value}
            </div>
            <div className="text-slate-500 font-bold uppercase tracking-widest text-sm">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const HowItWorksSection = () => {
  const steps = [
    { 
      step: '01',
      title: 'Start With Smart Practice', 
      desc: 'Start with topic-wise practice using our structured question bank to build strong fundamentals.',
      icon: <BookOpen className="w-8 h-8 text-brand-600" />
    },
    { 
      step: '02',
      title: 'Test Yourself Like Real Exam', 
      desc: 'Switch to full-length mock tests or timed practice mode to simulate real exam pressure.',
      icon: <Play className="w-8 h-8 text-brand-600" />
    },
    { 
      step: '03',
      title: 'Improve With Clear Insights', 
      desc: 'Get detailed performance analysis to identify weak areas and improve accuracy and speed.',
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
        {/* Connection Line (Desktop) */}
        <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
        
        {steps.map((step, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.2 }}
            className="relative z-10 group"
          >
            <Card className="p-8 h-full space-y-6 border-transparent hover:border-brand-200 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 bg-white/80 backdrop-blur-md">
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
            {i < 2 && (
              <div className="hidden md:flex absolute top-1/2 -right-5 transform -translate-y-1/2 z-20 w-10 h-10 bg-white rounded-full border border-slate-100 items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <ChevronRight className="w-6 h-6 text-brand-400" />
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
    <section className="py-24 space-y-16 overflow-hidden">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Experience the Platform</h2>
        <p className="text-slate-500 text-lg font-medium max-w-xl mx-auto">
          Built with a focus on speed, clarity, and performance.
        </p>
      </div>
      
      <div className="relative max-w-6xl mx-auto">
        {/* Mock Dashboard UI */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass rounded-3xl premium-shadow border-white/40 overflow-hidden aspect-video md:aspect-[21/9] relative"
        >
          <div className="absolute inset-0 bg-slate-50/50" />
          
          {/* Sidebar Mock */}
          <div className="absolute left-0 top-0 bottom-0 w-16 md:w-64 border-r border-slate-200/50 bg-white/80 hidden md:flex flex-col p-6 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 premium-gradient rounded-lg" />
              <div className="h-4 w-24 bg-slate-200 rounded-full" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-slate-100 rounded" />
                  <div className="h-3 w-32 bg-slate-100 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Content Mock */}
          <div className="absolute left-0 md:left-64 right-0 top-0 bottom-0 p-8 space-y-8">
            <div className="flex justify-between items-center">
              <div className="h-8 w-48 bg-slate-200 rounded-xl" />
              <div className="h-10 w-10 bg-slate-200 rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-white rounded-2xl premium-shadow border border-slate-100 p-4 space-y-3">
                  <div className="h-3 w-12 bg-slate-100 rounded-full" />
                  <div className="h-6 w-20 bg-slate-200 rounded-lg" />
                </div>
              ))}
            </div>
            <div className="h-64 bg-white rounded-3xl premium-shadow border border-slate-100 p-6 relative overflow-hidden">
              <div className="h-4 w-32 bg-slate-100 rounded-full mb-8" />
              {/* Mock Graph */}
              <div className="flex items-end gap-2 h-32">
                {[40, 70, 45, 90, 65, 80, 55, 85, 60, 95].map((h, i) => (
                  <motion.div 
                    key={i}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    className="flex-1 bg-brand-500/20 rounded-t-lg border-t-2 border-brand-500"
                  />
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
            className="absolute -right-20 top-20 w-80 glass rounded-2xl premium-shadow border-white/60 p-6 space-y-4 hidden lg:block"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 bg-slate-200 rounded-full" />
              <div className="h-6 w-16 bg-brand-50 rounded-lg" />
            </div>
            <div className="h-4 w-full bg-slate-100 rounded-full" />
            <div className="h-4 w-3/4 bg-slate-100 rounded-full" />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="h-10 bg-white rounded-xl border border-slate-100" />
              <div className="h-10 bg-brand-500 rounded-xl" />
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
          <div className="flex items-center justify-center gap-2 text-amber-500 font-bold bg-amber-50 px-5 py-2 rounded-full border border-amber-100 shadow-sm animate-bounce-subtle">
            <Star className="w-4 h-4 fill-amber-500" />
            <span className="text-sm tracking-tight">4.8 average rating from 2,000+ aspirants</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">Trusted by Aspirants</h2>
          <div className="w-24 h-1.5 premium-gradient rounded-full mx-auto" />
        </div>
        <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto">
          Hear from students who are actually using OdishaExamPrep to crack their dream exams.
        </p>
      </div>

      <div className="relative group">
        {/* Gradient Fades for Slider */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />

        <div className="flex gap-6 overflow-x-auto pb-12 px-12 no-scrollbar snap-x snap-mandatory">
          {reviews.map((review, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="min-w-[320px] md:min-w-[380px] snap-center"
            >
              <Card className="p-8 h-full flex flex-col justify-between space-y-6 hover:shadow-2xl transition-all duration-500 border-transparent hover:border-brand-100/50 bg-white/80 backdrop-blur-md">
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
    <footer className="bg-slate-950 text-slate-400 py-20 mt-20">
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 premium-gradient rounded-xl flex items-center justify-center">
              <BookOpen className="text-white w-6 h-6" />
            </div>
            <span className="font-extrabold text-2xl tracking-tighter text-white">OdishaExamPrep</span>
          </div>
          <p className="text-slate-500 font-medium leading-relaxed max-w-sm">
            Empowering aspirants with high-quality mock tests and real-time analytics to master competitive exams with confidence.
          </p>
        </div>
        
        <div className="space-y-6">
          <h4 className="text-white font-extrabold tracking-tight">Legal</h4>
          <ul className="space-y-4 font-medium">
            <li><a href="#" className="hover:text-brand-400 transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-brand-400 transition-colors">Terms of Service</a></li>
            <li><a href="#" className="hover:text-brand-400 transition-colors">Refund Policy</a></li>
          </ul>
        </div>

        <div className="space-y-6">
          <h4 className="text-white font-extrabold tracking-tight">Contact</h4>
          <ul className="space-y-4 font-medium">
            <li>support@preppro.com</li>
            <li>+91 98765 43210</li>
            <li className="flex gap-4 pt-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center hover:bg-brand-600 transition-colors cursor-pointer">
                <span className="text-xs font-bold">TW</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center hover:bg-brand-600 transition-colors cursor-pointer">
                <span className="text-xs font-bold">IN</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 pt-20 mt-20 border-t border-slate-900 text-center text-sm font-bold uppercase tracking-widest text-slate-700">
        © 2026 OdishaExamPrep Technologies. All rights reserved.
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
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    // Browser handles scroll via href + CSS scroll-behavior: smooth
    // scroll-mt-24 on sections handles the offset
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
            href="/#exams" 
            className="text-slate-600 font-medium hover:text-brand-600 transition-colors duration-300 relative group py-2"
          >
            Exams
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-500 transition-all duration-300 group-hover:w-full" />
          </a>
          <a 
            href="/#how-it-works" 
            className="text-slate-600 font-medium hover:text-brand-600 transition-colors duration-300 relative group py-2"
          >
            How it Works
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-500 transition-all duration-300 group-hover:w-full" />
          </a>
          <a 
            href="/#testimonials" 
            className="text-slate-600 font-medium hover:text-brand-600 transition-colors duration-300 relative group py-2"
          >
            Testimonials
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
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt="" className="w-full h-full rounded-[10px] object-cover" referrerPolicy="no-referrer" />
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
                onClick={() => scrollToSection('exams')} 
                className="text-lg font-medium text-slate-900 p-4 hover:bg-brand-50 rounded-2xl transition-colors"
              >
                Exams
              </a>
              <a 
                href="#how-it-works" 
                onClick={() => scrollToSection('how-it-works')} 
                className="text-lg font-medium text-slate-900 p-4 hover:bg-brand-50 rounded-2xl transition-colors"
              >
                How it Works
              </a>
              <a 
                href="#testimonials" 
                onClick={() => scrollToSection('testimonials')} 
                className="text-lg font-medium text-slate-900 p-4 hover:bg-brand-50 rounded-2xl transition-colors"
              >
                Testimonials
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
      await signInWithPopup(auth, googleProvider);
      setShowAuthModal(false);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      setShowAuthModal(false);
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Navbar user={user} isAdmin={false} onSignIn={() => setShowAuthModal(true)} />

      <main className="flex-1 p-6 space-y-20 max-w-5xl mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center space-y-8 py-20"
        >
          <div className="space-y-4">
            <h1 className="text-5xl md:text-8xl font-extrabold text-slate-950 tracking-tight leading-[1.1]">
              Master Your Exams <br />
              <span className="premium-text-gradient">With Confidence</span>
            </h1>
            <p className="text-slate-500 text-xl md:text-2xl max-w-2xl mx-auto font-medium leading-relaxed">
              The high-performance platform for serious aspirants. Access premium mock tests and real-time analytics.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-6 justify-center pt-4">
            <Button 
              className="py-5 px-10 text-xl rounded-2xl" 
              onClick={() => {
                const el = document.getElementById('exams');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              Start Free Practice
            </Button>
            <Button variant="outline" className="py-5 px-10 text-xl rounded-2xl">
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
          <DashboardContent isGuest={!user} />
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
              className="glass rounded-t-[2.5rem] sm:rounded-3xl w-full max-w-md p-10 space-y-8 shadow-2xl border-white/40"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {authMode === 'login' ? 'Welcome Back' : 'Join OdishaExamPrep'}
                </h3>
                <button onClick={() => setShowAuthModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <Button onClick={handleGoogleLogin} variant="outline" className="w-full py-4 rounded-2xl border-slate-200/60 bg-white/50">
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
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200/60 bg-white/50 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium" 
                  />
                  <input 
                    type="password" 
                    placeholder="Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200/60 bg-white/50 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium" 
                  />
                </div>
                <Button type="submit" className="w-full py-4 rounded-2xl text-lg">
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

const DashboardContent = ({ isGuest }: { isGuest?: boolean }) => {
  const { profile, isAdmin, hasFullAccess, grantFullAccess, guestUsage, incrementGuestUsage } = useAuth();
  const navigate = useNavigate();
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [activeTest, setActiveTest] = useState<any | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<'popular' | 'upcoming'>('popular');
  const [showPracticeConfig, setShowPracticeConfig] = useState(false);
  const [selectedBankType, setSelectedBankType] = useState<string | null>(null);
  const [selectedBankItem, setSelectedBankItem] = useState<any | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [practiceSettings, setPracticeSettings] = useState({
    topic: '',
    questions: '20'
  });

  const questionBanks: Record<string, any[]> = {
    'topic-wise': [
      { id: 'polity', title: 'Indian Polity', questions: 1200, tagline: 'Concept-Focused Practice', image: 'https://picsum.photos/seed/polity/400/250', isPremium: false },
      { id: 'history', title: 'Odisha History', questions: 850, tagline: 'Based on Previous Year Trends', image: 'https://picsum.photos/seed/history/400/250', isPremium: true },
      { id: 'geography', title: 'Geography', questions: 1100, tagline: 'High-Scoring Topics', image: 'https://picsum.photos/seed/geography/400/250', isPremium: true },
      { id: 'economy', title: 'Indian Economy', questions: 950, tagline: 'Updated Economic Trends', image: 'https://picsum.photos/seed/economy/400/250', isPremium: true },
    ],
    'exam-focused': [
      { id: 'opsc-special', title: 'OPSC ASO Special', questions: 2000, tagline: 'Exam-Pattern Aligned', image: 'https://picsum.photos/seed/opsc/400/250', isPremium: true },
      { id: 'ossc-capsule', title: 'OSSC CGL Capsule', questions: 1500, tagline: 'Quick Revision Ready', image: 'https://picsum.photos/seed/ossc/400/250', isPremium: true },
    ],
    'revision-sets': [
      { id: 'high-value', title: 'High Value Topics', questions: 500, tagline: 'High-Yield Topics', image: 'https://picsum.photos/seed/revision/400/250', isPremium: true },
    ],
    'pyq-collections': [
      { id: 'pyq-2023', title: '2023 Solved Papers', questions: 1200, tagline: 'Authentic Solved Papers', image: 'https://picsum.photos/seed/pyq/400/250', isPremium: true },
    ]
  };

  const exams = [
    { id: 'opsc-aio', name: 'OPSC AIO', description: 'Odisha Public Service Commission All In One', icon: '🏛️', category: 'popular' },
    { id: 'ssc-cgl', name: 'SSC CGL', description: 'Staff Selection Commission Combined Graduate Level', icon: '💼', category: 'popular' },
    { id: 'upsc-pre', name: 'UPSC Prelims', description: 'Union Public Service Commission Preliminary Exam', icon: '📜', category: 'popular' },
    { id: 'railway-ntpc', name: 'RRB NTPC', description: 'Railway Recruitment Board NTPC', icon: '🚂', category: 'upcoming', examDate: 'June 2024' },
    { id: 'bank-po', name: 'IBPS PO', description: 'Institute of Banking Personnel Selection PO', icon: '🏦', category: 'upcoming', examDate: 'Oct 2024' }
  ];

  const filteredExams = exams.filter(exam => exam.category === activeTab);

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

  const handleStartTest = (test: any) => {
    if (isGuest && guestUsage.tests >= 1) {
      setShowLoginPrompt(true);
      return;
    }
    
    if (test.isPremium && !profile?.purchasedSeries?.includes(test.seriesId) && !isAdmin) {
      handlePayment(test);
      return;
    }

    if (isGuest) incrementGuestUsage('tests');
    setActiveTest(test);
  };

  const handlePayment = async (test: any) => {
    const res = await loadRazorpay();
    if (!res) {
      alert('Razorpay SDK failed to load. Are you online?');
      return;
    }

    const options = {
      key: 'rzp_test_YOUR_KEY_ID', // Replace with real key
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

  if (activeTest) {
    return (
      <MockTestSystem 
        test={activeTest} 
        onExit={() => setActiveTest(null)} 
        onComplete={(results) => {
          setActiveTest(null);
          alert(`Test Completed! Score: ${results.score}/${results.total}`);
        }} 
      />
    );
  }

  if (!selectedExam) {
    return (
      <div className="space-y-12">
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

        {!isGuest && (
          <div className="space-y-6">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Continue Practice</h2>
            <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar">
              {[1, 2].map(i => (
                <Card key={i} className="min-w-[320px] p-6 flex gap-5 items-center hover:scale-[1.02] cursor-pointer group">
                  <div className="w-14 h-14 premium-gradient rounded-2xl flex items-center justify-center shrink-0 premium-glow group-hover:scale-110 transition-transform">
                    <Play className="text-white w-7 h-7 fill-white/20" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-lg text-slate-900">Polity Practice {i}</h4>
                    <p className="text-sm text-slate-500 font-medium">Last practiced 2 days ago</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col space-y-8">
          {/* Filter Tabs */}
          <div className="flex justify-center">
            <div className="bg-slate-100/80 p-1.5 rounded-2xl flex gap-1 backdrop-blur-sm border border-slate-200/50">
              <button
                onClick={() => setActiveTab('popular')}
                className={cn(
                  "px-8 py-2.5 rounded-xl font-bold text-sm transition-all duration-300",
                  activeTab === 'popular' 
                    ? "premium-gradient text-white shadow-md shadow-brand-500/20" 
                    : "text-slate-600 hover:bg-white/50"
                )}
              >
                Popular
              </button>
              <button
                onClick={() => setActiveTab('upcoming')}
                className={cn(
                  "px-8 py-2.5 rounded-xl font-bold text-sm transition-all duration-300",
                  activeTab === 'upcoming' 
                    ? "premium-gradient text-white shadow-md shadow-brand-500/20" 
                    : "text-slate-600 hover:bg-white/50"
                )}
              >
                Upcoming
              </button>
            </div>
          </div>

          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <AnimatePresence mode="popLayout">
              {filteredExams.map((exam) => (
                <motion.div 
                  key={exam.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -10 }}
                  onClick={() => setSelectedExam(exam.id)}
                  className="cursor-pointer"
                >
                  <Card className="p-8 h-full hover:border-brand-400 group relative bg-white/80 backdrop-blur-md">
                    <div className="absolute bottom-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-6 h-6 text-brand-600" />
                    </div>
                    <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-500">{exam.icon}</div>
                    <h3 className="text-2xl font-extrabold text-slate-900 group-hover:premium-text-gradient transition-all">{exam.name}</h3>
                    <p className="text-slate-500 mt-3 text-base font-medium leading-relaxed">{exam.description}</p>
                    {exam.examDate && (
                      <div className="mt-6 flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                        <Clock className="w-3.5 h-3.5" />
                        {exam.examDate}
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    );
  }

  if (selectedBankType) {
    const items = questionBanks[selectedBankType] || [];
    const bankTitle = selectedBankType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    return (
      <div className="space-y-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setSelectedBankType(null)} className="p-3 rounded-2xl hover:bg-brand-50">
            <ChevronRight className="w-6 h-6 rotate-180 text-brand-600" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-slate-950 tracking-tight">{bankTitle}</h1>
            <p className="text-slate-500 font-medium">Browse available question banks</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                    src={item.image} 
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
                    src={selectedBankItem.image} 
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
                        if (selectedBankItem.isPremium && !hasFullAccess) {
                          setShowPaywall(true);
                        } else {
                          // Download logic
                        }
                      }}
                    >
                      {selectedBankItem.isPremium && !hasFullAccess ? (
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
                      className="w-full h-12 rounded-xl text-sm font-black border-slate-200"
                      onClick={() => {
                        if (selectedBankItem.isPremium && !hasFullAccess) {
                          setShowPaywall(true);
                        } else {
                          setSelectedBankItem(null);
                          setSelectedBankType(null);
                          setShowPracticeConfig(true);
                          setPracticeSettings({...practiceSettings, topic: selectedBankItem.id});
                        }
                      }}
                    >
                      {selectedBankItem.isPremium && !hasFullAccess ? (
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
                  onClick={() => setShowPaywall(false)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="p-6 text-center space-y-5">
                  <div className="w-14 h-14 premium-gradient rounded-2xl flex items-center justify-center mx-auto premium-glow">
                    <Award className="text-white w-7 h-7" />
                  </div>
                  
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Unlock Full Access</h2>
                    <p className="text-slate-500 text-sm font-medium leading-tight line-clamp-2">Get unlimited access to all premium question banks and features.</p>
                  </div>

                  <div className="space-y-2.5 text-left bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    {[
                      'Full Question Bank (10,000+ Qs)',
                      'Unlimited Practice Mode',
                      'Detailed Step-by-Step Solutions'
                    ].map((benefit, i) => (
                      <div key={i} className="flex items-center gap-3 text-slate-700 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-xs">{benefit}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-3xl font-black text-slate-950">₹499</span>
                          <span className="text-sm font-bold text-slate-400 line-through">₹999</span>
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">50% OFF • Lifetime Access</span>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full h-12 rounded-xl text-base font-black premium-gradient shadow-lg shadow-brand-500/20"
                      onClick={async () => {
                        const res = await loadRazorpay();
                        if (res) {
                          const options = {
                            key: 'rzp_test_YOUR_KEY_ID',
                            amount: 49900,
                            currency: 'INR',
                            name: 'OdishaExamPrep Premium',
                            description: 'Unlock Full Access',
                            handler: async function () {
                              await grantFullAccess();
                              setShowPaywall(false);
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { id: 'topic-wise', title: 'Topic-wise Question Bank', desc: 'Master specific subjects with curated questions.', icon: <Layers className="w-7 h-7" /> },
            { id: 'exam-focused', title: 'Exam-Focused Bank', desc: 'High-yield questions tailored for this exam.', icon: <Target className="w-7 h-7" /> },
            { id: 'revision-sets', title: 'Revision Sets', desc: 'Quick revision modules for last-minute prep.', icon: <BookMarked className="w-7 h-7" /> },
            { id: 'pyq-collections', title: 'PYQ Collections', desc: 'Previous Year Questions with detailed solutions.', icon: <History className="w-7 h-7" /> },
          ].map((item, i) => (
            <Card 
              key={i} 
              onClick={() => setSelectedBankType(item.id)}
              className="p-8 flex flex-col justify-between bg-gradient-to-br from-white to-slate-50/50 backdrop-blur-md border border-white/20 shadow-sm hover:shadow-2xl hover:shadow-brand-500/10 hover:-translate-y-2 hover:border-brand-300/50 transition-all duration-500 rounded-[2rem] cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl group-hover:bg-brand-500/10 transition-colors" />
              
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-16 h-16 premium-gradient rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20 group-hover:scale-110 group-hover:premium-glow transition-all duration-500">
                    {item.icon}
                  </div>
                </div>
                <h4 className="font-black text-xl text-slate-900 mb-3 group-hover:text-brand-600 transition-colors">{item.title}</h4>
                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">{item.desc}</p>
              </div>
              
              <Button className="w-full py-4 rounded-2xl flex items-center justify-center text-sm font-black premium-gradient border-none shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 group-hover:scale-[1.02] group-hover:premium-glow transition-all pointer-events-none">
                View Collection
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* Section 2: Practice Mode */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Practice Mode</h2>
        </div>
        
        {!showPracticeConfig ? (
          <Card 
            onClick={() => setShowPracticeConfig(true)}
            className="p-6 bg-gradient-to-br from-white to-indigo-50/40 border border-indigo-100/50 shadow-xl shadow-indigo-500/5 rounded-2xl cursor-pointer group relative overflow-hidden flex flex-col gap-6"
          >
            {/* Abstract Background Shapes */}
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors duration-700" />
            <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl group-hover:bg-brand-500/10 transition-colors duration-700" />
            
            <div className="space-y-4 relative z-10">
              <div className="w-14 h-14 premium-gradient rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/10 group-hover:scale-110 group-hover:premium-glow transition-all duration-500">
                <Play className="w-6 h-6 text-white fill-white/20" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-950 tracking-tight">Start Practice Session</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">Customizable practice based on your needs</p>
              </div>
            </div>

            <Button className="w-full h-[52px] rounded-xl font-black text-base premium-gradient text-white shadow-lg shadow-brand-500/20 group-hover:premium-glow transition-all relative z-10">
              Start Practice
              <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-10 border-indigo-200 bg-indigo-50/30">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">Configure Practice</h3>
                  <p className="text-slate-500 font-medium">Set your preferences for this session</p>
                </div>
                <Button variant="ghost" onClick={() => setShowPracticeConfig(false)} className="p-2 hover:bg-slate-200 rounded-lg">
                  <X className="w-6 h-6 text-slate-400" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Select Topic / Unit</label>
                  <select 
                    value={practiceSettings.topic}
                    onChange={(e) => setPracticeSettings({...practiceSettings, topic: e.target.value})}
                    className="w-full p-4 rounded-2xl border border-slate-200 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700"
                  >
                    <option value="">Choose a topic...</option>
                    {Object.values(questionBanks).flat().filter(item => !item.isPremium || hasFullAccess).map(item => (
                      <option key={item.id} value={item.id}>{item.title}</option>
                    ))}
                    <option value="aptitude">General Aptitude</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Number of Questions</label>
                  <div className="flex gap-3">
                    {['10', '20', '50', 'Custom'].map((num) => (
                      <button
                        key={num}
                        onClick={() => setPracticeSettings({...practiceSettings, questions: num})}
                        className={cn(
                          "flex-1 py-4 rounded-2xl font-black text-sm transition-all",
                          practiceSettings.questions === num 
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                            : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-200"
                        )}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-10 flex justify-end">
                <Button 
                  disabled={!practiceSettings.topic}
                  className="px-12 py-4 rounded-2xl text-lg font-black bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none"
                  onClick={() => handleStartTest(sampleTest)}
                >
                  Start Practice Session
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </section>

      {/* Section 3: Mock Tests */}
      <section className="space-y-10">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-brand-600 font-black text-[10px] uppercase tracking-[0.2em] bg-brand-50 w-fit px-3 py-1 rounded-full border border-brand-100">
            <Award className="w-3 h-3" />
            Test Series
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-4xl font-black text-slate-950 tracking-tight">Full-Length Mock Tests</h2>
              <p className="text-slate-500 text-lg font-medium mt-2">Simulate the real exam environment with our expert-curated test series.</p>
            </div>
            <div className="flex items-center gap-2 text-slate-400 font-bold text-sm bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Updated for 2024 Exam Pattern
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { title: 'Full-Length Mock Tests', desc: 'Complete exam simulation with real-time ranking.', icon: <Award className="w-6 h-6" />, color: 'from-amber-400 to-orange-500', tag: 'Most Popular' },
            { title: 'Sectional Tests', desc: 'Focus on specific sections to improve your score.', icon: <Target className="w-6 h-6" />, color: 'from-blue-400 to-indigo-500', tag: 'Recommended' },
            { title: 'PYQ Tests', desc: 'Practice with actual previous year papers.', icon: <History className="w-6 h-6" />, color: 'from-purple-400 to-pink-500', tag: 'High Yield' },
            { title: 'Daily / Weekly Tests', desc: 'Regular assessments to track your progress.', icon: <Clock className="w-6 h-6" />, color: 'from-emerald-400 to-teal-500', tag: 'Consistency' },
          ].map((test, i) => (
            <Card 
              key={i} 
              className="p-6 bg-white border-slate-200/60 shadow-lg shadow-slate-200/30 rounded-[1.5rem] hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-brand-500/10 hover:border-brand-200 group transition-all duration-300 cursor-pointer flex flex-col gap-6 relative overflow-hidden"
              onClick={() => handleStartTest(sampleTest)}
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-md bg-gradient-to-br text-white transition-transform group-hover:scale-110",
                  test.color
                )}>
                  {test.icon}
                </div>
                <h4 className="font-black text-xl text-slate-950 tracking-tight">{test.title}</h4>
              </div>
              
              <div className="space-y-4 flex-1 relative z-10">
                <p className="text-slate-500 font-medium text-sm leading-relaxed">{test.desc}</p>
                <div className="flex">
                  <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-slate-50 text-slate-400 rounded-full border border-slate-100 group-hover:bg-brand-50 group-hover:text-brand-600 group-hover:border-brand-100 transition-colors">
                    {test.tag}
                  </span>
                </div>
              </div>

              <Button 
                className="w-full h-[48px] rounded-xl font-black text-sm premium-gradient text-white shadow-lg shadow-brand-500/20 group-hover:premium-glow transition-all relative z-10"
              >
                Start Test
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Card>
          ))}
        </div>
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
                <h3 className="text-2xl font-bold text-slate-900">Limit Reached</h3>
                <p className="text-slate-500">Please sign in to continue practicing and access premium content.</p>
              </div>
              <Button className="w-full py-4" onClick={() => window.location.reload()}>
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

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    }
    testConnection();
  }, []);

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

                <main className="flex-1 p-6 max-w-5xl mx-auto w-full pt-24">
                  <DashboardContent />
                </main>

                {/* Mobile Bottom Nav */}
                <nav className="glass border-t border-slate-200/50 px-8 py-4 flex justify-around items-center sticky bottom-0 z-30 rounded-t-[2rem]">
                  <button className="flex flex-col items-center gap-1.5 text-brand-600 group">
                    <div className="p-2 bg-brand-50 rounded-xl group-hover:scale-110 transition-transform">
                      <LayoutDashboard className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">Home</span>
                  </button>
                  <button className="flex flex-col items-center gap-1.5 text-slate-400 group">
                    <div className="p-2 hover:bg-slate-50 rounded-xl group-hover:scale-110 transition-transform">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">Courses</span>
                  </button>
                  <button className="flex flex-col items-center gap-1.5 text-slate-400 group">
                    <div className="p-2 hover:bg-slate-50 rounded-xl group-hover:scale-110 transition-transform">
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
