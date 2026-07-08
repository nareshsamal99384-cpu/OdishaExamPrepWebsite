import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Navbar, Footer } from '../App';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NotFoundPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Set document title
    const originalTitle = document.title;
    document.title = '404 - Page Not Found | OdishaExamPrep';

    // Set noindex, nofollow robots meta tag
    let meta = document.querySelector('meta[name="robots"]');
    const existed = !!meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    const originalContent = meta.getAttribute('content');
    meta.setAttribute('content', 'noindex, nofollow');

    return () => {
      document.title = originalTitle;
      if (existed) {
        if (originalContent) {
          meta.setAttribute('content', originalContent);
        } else {
          meta.removeAttribute('content');
        }
      } else {
        meta.remove();
      }
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
      <Navbar user={user} isAdmin={isAdmin} onHomeClick={() => navigate('/')} onSignIn={() => navigate('/')} />
      
      <main className="flex-1 flex items-center justify-center py-16 px-4 relative overflow-hidden">
        {/* Decorative background grid and orbs */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#2563eb_1px,transparent_1px),linear-gradient(to_bottom,#2563eb_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.02]" />
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-brand-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-slate-500/5 blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-md w-full bg-white border border-slate-200/80 rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-slate-200/40 text-center relative z-10 backdrop-blur-sm"
        >
          <div className="w-20 h-20 mx-auto rounded-3xl bg-brand-50 flex items-center justify-center mb-8 border border-brand-100/50 shadow-sm">
            <FileQuestion className="w-10 h-10 text-brand-600 animate-pulse" />
          </div>

          <h1 className="text-4xl md:text-5xl font-serif font-black text-slate-950 tracking-tight mb-4">
            404
          </h1>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight mb-4 uppercase">
            Page Not Found
          </h2>
          <p className="text-slate-500 font-medium text-sm md:text-base leading-relaxed mb-10">
            The page you are looking for might have been moved, renamed, or is temporarily unavailable.
          </p>

          <Link
            to="/"
            className="inline-flex w-full items-center justify-center gap-2 h-[56px] rounded-2xl font-black text-base premium-gradient text-white shadow-lg shadow-brand-500/20 hover:premium-glow transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Return to Homepage</span>
          </Link>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
