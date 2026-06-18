import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Button, Card } from '../App';
import { Lock, Mail, AlertCircle, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { fadeSlideUp } from '../lib/animations';
import PageLayout from '../components/PageLayout';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin, loginAsAdmin, loading: authLoading } = useAuth();

  if (user && isAdmin) return <Navigate to="/admin" replace />;

  const isAccessDenied = user && !isAdmin && !authLoading;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        try {
          const { error: supabaseAuthError } = await supabase.auth.signInWithPassword({ email, password });
          if (supabaseAuthError) {
            setError(supabaseAuthError.message || "Failed to authenticate with database client.");
            setLoading(false);
            return;
          }
        } catch (supabaseErr: any) {
          console.error("[Admin Login] Client-side Supabase authentication exception:", supabaseErr);
          setError(supabaseErr.message || "An exception occurred during Supabase login.");
          setLoading(false);
          return;
        }
        loginAsAdmin(data.user);
        navigate('/admin');
      } else {
        setError(data.message || 'Invalid email or password. Please try again.');
      }
    } catch (err: any) {
      setError('An error occurred during login. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading && !user) {
    return (
      <PageLayout className="flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </PageLayout>
    );
  }

  return (
    <PageLayout className="flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        {...fadeSlideUp}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex flex-col items-center mb-10 space-y-4">
          <div className="w-16 h-16 premium-gradient rounded-2xl flex items-center justify-center shadow-xl shadow-brand-500/20">
            <Lock className="text-white w-8 h-8" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black text-slate-950 tracking-tight">Admin <span className="premium-text-gradient">Login</span></h1>
            <p className="text-slate-500 font-medium mt-1">Secure access to OdishaExamPrep Control Center</p>
          </div>
        </div>

        <Card className="p-10 space-y-8 border-white/40 bg-white/80 backdrop-blur-xl">
          {(error || isAccessDenied) && (
            <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {isAccessDenied
                ? 'Access denied. Your account does not have administrator privileges.'
                : error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                  <input
                    type="email"
                    placeholder="Enter admin email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-14 pr-5 py-4 rounded-2xl border border-slate-200 bg-white/50 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-14 pr-14 py-4 rounded-2xl border border-slate-200 bg-white/50 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-brand-500 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl text-lg group"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In to Dashboard
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="text-center">
            <button
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-brand-600 text-sm font-bold transition-colors"
            >
              Back to Homepage
            </button>
          </div>
        </Card>
      </motion.div>
    </PageLayout>
  );
};

export default AdminLoginPage;
