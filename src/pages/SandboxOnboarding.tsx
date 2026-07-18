import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Navbar, Footer } from '../App';
import { 
  Cpu, 
  Sparkles, 
  Laptop, 
  ArrowRight, 
  CheckCircle2, 
  ShieldAlert, 
  Compass, 
  Play, 
  BookOpen, 
  Clock, 
  Award,
  ChevronRight,
  RefreshCw,
  Sliders,
  Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SandboxOnboarding() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  
  // Step 1: System Checks state
  const [systemChecks, setSystemChecks] = useState<Record<string, { status: string; label: string }>>({
    browser: { status: 'checking', label: 'Browser Compatibility' },
    connection: { status: 'checking', label: 'Network Integrity' },
    auth: { status: 'checking', label: 'User Verification' },
    hardware: { status: 'checking', label: 'Diagnostic Engine' }
  });
  const [isCheckComplete, setIsCheckComplete] = useState(false);

  // Step 3: Preferences state
  const [testPreference, setTestPreference] = useState({
    mode: 'timed', // timed, untimed
    sound: true,
    autoNext: true,
    fontSize: 'normal' // normal, large
  });

  useEffect(() => {
    // Set document title
    const originalTitle = document.title;
    document.title = 'Test Sandbox Onboarding | OdishaExamPrep';

    return () => {
      document.title = originalTitle;
    };
  }, []);

  // Simulate System Checks on Step 0
  useEffect(() => {
    if (activeStep !== 0) return;

    setIsCheckComplete(false);
    setSystemChecks({
      browser: { status: 'checking', label: 'Browser Compatibility' },
      connection: { status: 'checking', label: 'Network Integrity' },
      auth: { status: 'checking', label: 'User Verification' },
      hardware: { status: 'checking', label: 'Diagnostic Engine' }
    });

    const timers = [
      setTimeout(() => setSystemChecks(prev => ({ ...prev, browser: { ...prev.browser, status: 'success' } })), 600),
      setTimeout(() => setSystemChecks(prev => ({ ...prev, connection: { ...prev.connection, status: 'success' } })), 1200),
      setTimeout(() => setSystemChecks(prev => ({ ...prev, auth: { ...prev.auth, status: user ? 'success' : 'warning' } })), 1800),
      setTimeout(() => setSystemChecks(prev => ({ ...prev, hardware: { ...prev.hardware, status: 'success' } })), 2400),
      setTimeout(() => setIsCheckComplete(true), 2600)
    ];

    return () => timers.forEach(clearTimeout);
  }, [activeStep, user]);

  const handleNext = () => {
    if (activeStep < 2) {
      setActiveStep(prev => prev + 1);
    } else {
      navigate('/');
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  };

  const stepsInfo = [
    { title: 'System Diagnostics', desc: 'Verifying test engine' },
    { title: 'Exam Guidelines', desc: 'Interface walk-through' },
    { title: 'Preferences', desc: 'Tailor your session' }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
      <Navbar user={user} isAdmin={isAdmin} onHomeClick={() => navigate('/')} onSignIn={() => navigate('/')} />
      
      <main className="flex-1 max-w-5xl w-full mx-auto py-12 px-4 flex flex-col items-center">
        {/* Progress Stepper */}
        <div className="w-full max-w-3xl mb-10">
          <div className="flex justify-between items-center relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
            
            {stepsInfo.map((step, idx) => {
              const isCompleted = activeStep > idx;
              const isActive = activeStep === idx;
              return (
                <div key={idx} className="relative z-10 flex flex-col items-center">
                  <motion.div 
                    animate={{
                      scale: isActive ? 1.15 : 1,
                      backgroundColor: isCompleted || isActive ? '#3B82F6' : '#FFFFFF',
                      borderColor: isCompleted || isActive ? '#2563EB' : '#CBD5E1',
                      textColor: isCompleted || isActive ? '#FFFFFF' : '#64748B'
                    }}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm shadow-sm transition-colors duration-300`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : (
                      <span className={isActive ? 'text-white' : 'text-slate-500'}>{idx + 1}</span>
                    )}
                  </motion.div>
                  <div className="text-center mt-2 absolute top-12 -translate-x-1/2 left-1/2 w-32">
                    <p className={`text-xs font-black uppercase tracking-wider ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                      {step.title}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 leading-tight hidden sm:block">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Card Body */}
        <div className="w-full max-w-3xl bg-white border border-slate-200/80 rounded-[2.5rem] p-6 sm:p-10 md:p-12 shadow-xl shadow-slate-200/30 mt-8 relative overflow-hidden flex flex-col min-h-[460px]">
          {/* Decorative gradients */}
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-500/5 blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-slate-500/5 blur-[80px] pointer-events-none" />

          <div className="flex-1 relative z-10">
            <AnimatePresence mode="wait">
              {activeStep === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className="text-center sm:text-left">
                    <span className="px-3 py-1 bg-brand-50 text-brand-700 text-xs font-black uppercase tracking-wider rounded-lg border border-brand-100/60 inline-flex items-center gap-1.5 mb-3">
                      <Cpu className="w-3.5 h-3.5" /> Engine Checkup
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight uppercase">
                      Test Engine Integrity Check
                    </h2>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                      Before commencing, we check the OdishaExamPrep sandbox systems to ensure zero disruptions.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(systemChecks).map(([key, check]: [string, any]) => {
                      const isChecking = check.status === 'checking';
                      const isSuccess = check.status === 'success';
                      const isWarning = check.status === 'warning';
                      return (
                        <div key={key} className="p-5 border border-slate-100 rounded-2xl bg-slate-50/50 flex items-center justify-between shadow-2xs hover:border-slate-200 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${
                              isSuccess ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                              isWarning ? 'bg-amber-50 border-amber-100 text-amber-600' :
                              'bg-indigo-50 border-indigo-100 text-indigo-650'
                            }`}>
                              {isChecking ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                              ) : isSuccess ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <ShieldAlert className="w-5 h-5" />
                              )}
                            </div>
                            <div className="text-left">
                              <p className="font-extrabold text-sm text-slate-800 leading-none">{check.label}</p>
                              <p className={`text-[10px] font-black uppercase mt-1 tracking-wider ${
                                isSuccess ? 'text-emerald-600' : 
                                isWarning ? 'text-amber-600' : 
                                'text-brand-600 animate-pulse'
                              }`}>
                                {isChecking ? 'Verifying...' : isSuccess ? 'Operational' : 'Sign-In Recommended'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!user && (
                    <div className="p-4 bg-amber-50/80 border border-amber-250/50 rounded-2xl text-amber-850 flex items-start gap-3 text-xs leading-relaxed text-left">
                      <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-extrabold">Guest Mode Notice:</strong> You are not currently signed in. You can still test in the sandbox, but your attempts, progress tracking, and analytical reports will not be persisted to your dashboard.
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6 text-left"
                >
                  <div>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-wider rounded-lg border border-indigo-100/60 inline-flex items-center gap-1.5 mb-3">
                      <Compass className="w-3.5 h-3.5" /> Interface Rules
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight uppercase">
                      Exam Environment Guidelines
                    </h2>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                      OdishaExamPrep provides a state-of-the-art testing workspace. Ensure you understand the key functions.
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    <div className="flex gap-4 p-4 border border-slate-100 rounded-2xl hover:border-slate-200 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-3xs">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">Question Navigation</h4>
                        <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                          Use the collapsible <strong>Question Palette</strong> to jump directly to any question. Collapsing it optimizes spacing and places navigation choices dynamically at your screen corners.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 p-4 border border-slate-100 rounded-2xl hover:border-slate-200 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-3xs">
                        <Clock className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">Session Timing Rules</h4>
                        <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                          For Mock Tests, a countdown timer regulates execution. Practice mode sessions offer a comfortable <strong>1 minute per question</strong> pace. The system auto-saves every response as you type.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 p-4 border border-slate-100 rounded-2xl hover:border-slate-200 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-3xs">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">AI Mentor Integration</h4>
                        <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                          Need instant assistance? Activate OEP Buddy on the bottom-right corner. It reviews your active tab and coordinates helpful context prompts on the fly.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6 text-left"
                >
                  <div>
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-black uppercase tracking-wider rounded-lg border border-amber-100/60 inline-flex items-center gap-1.5 mb-3">
                      <Sliders className="w-3.5 h-3.5" /> Workspace Settings
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight uppercase">
                      Configure Workspace Preferences
                    </h2>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                      Define defaults for your testing engine to maximize focus.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 border border-slate-150 rounded-2xl bg-slate-50/20 flex flex-col justify-between gap-3 text-left">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">Timing Mode</h4>
                        <p className="text-slate-400 text-[10px] font-bold leading-tight mt-0.5">Define your default test pacing</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setTestPreference(prev => ({ ...prev, mode: 'timed' }))}
                          className={`flex-1 py-2 text-xs font-black rounded-lg uppercase tracking-wider transition-colors border ${
                            testPreference.mode === 'timed' 
                              ? 'bg-brand-500 border-brand-500 text-white shadow-xs' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Timed
                        </button>
                        <button 
                          onClick={() => setTestPreference(prev => ({ ...prev, mode: 'untimed' }))}
                          className={`flex-1 py-2 text-xs font-black rounded-lg uppercase tracking-wider transition-colors border ${
                            testPreference.mode === 'untimed' 
                              ? 'bg-brand-500 border-brand-500 text-white shadow-xs' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Untimed
                        </button>
                      </div>
                    </div>

                    <div className="p-4 border border-slate-150 rounded-2xl bg-slate-50/20 flex flex-col justify-between gap-3 text-left">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">Audio Notifications</h4>
                        <p className="text-slate-400 text-[10px] font-bold leading-tight mt-0.5">Toggle alert sound effects</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setTestPreference(prev => ({ ...prev, sound: true }))}
                          className={`flex-1 py-2 text-xs font-black rounded-lg uppercase tracking-wider transition-colors border flex items-center justify-center gap-1.5 ${
                            testPreference.sound 
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Volume2 className="w-3.5 h-3.5" /> Enabled
                        </button>
                        <button 
                          onClick={() => setTestPreference(prev => ({ ...prev, sound: false }))}
                          className={`flex-1 py-2 text-xs font-black rounded-lg uppercase tracking-wider transition-colors border ${
                            !testPreference.sound 
                              ? 'bg-slate-500 border-slate-500 text-white shadow-xs' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Muted
                        </button>
                      </div>
                    </div>

                    <div className="p-4 border border-slate-150 rounded-2xl bg-slate-50/20 flex flex-col justify-between gap-3 text-left">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">Auto-Advance Questions</h4>
                        <p className="text-slate-400 text-[10px] font-bold leading-tight mt-0.5">Move to next question after answer save</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setTestPreference(prev => ({ ...prev, autoNext: true }))}
                          className={`flex-1 py-2 text-xs font-black rounded-lg uppercase tracking-wider transition-colors border ${
                            testPreference.autoNext 
                              ? 'bg-brand-500 border-brand-500 text-white shadow-xs' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          On
                        </button>
                        <button 
                          onClick={() => setTestPreference(prev => ({ ...prev, autoNext: false }))}
                          className={`flex-1 py-2 text-xs font-black rounded-lg uppercase tracking-wider transition-colors border ${
                            !testPreference.autoNext 
                              ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' 
                              : 'bg-slate-500 border-slate-500 text-white shadow-xs'
                          }`}
                        >
                          Off
                        </button>
                      </div>
                    </div>

                    <div className="p-4 border border-slate-150 rounded-2xl bg-slate-50/20 flex flex-col justify-between gap-3 text-left">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">Text Sizing</h4>
                        <p className="text-slate-400 text-[10px] font-bold leading-tight mt-0.5">Increase question text size for reading</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setTestPreference(prev => ({ ...prev, fontSize: 'normal' }))}
                          className={`flex-1 py-2 text-xs font-black rounded-lg uppercase tracking-wider transition-colors border ${
                            testPreference.fontSize === 'normal' 
                              ? 'bg-brand-500 border-brand-500 text-white shadow-xs' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Normal
                        </button>
                        <button 
                          onClick={() => setTestPreference(prev => ({ ...prev, fontSize: 'large' }))}
                          className={`flex-1 py-2 text-xs font-black rounded-lg uppercase tracking-wider transition-colors border ${
                            testPreference.fontSize === 'large' 
                              ? 'bg-brand-500 border-brand-500 text-white shadow-xs' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Large
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Wizard Controls */}
          <div className="flex justify-between items-center pt-8 mt-10 border-t border-slate-100 relative z-10 shrink-0">
            <button
              onClick={handleBack}
              disabled={activeStep === 0}
              className={`px-6 h-[48px] rounded-xl font-black text-sm uppercase tracking-wider border transition-colors ${
                activeStep === 0 
                  ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50/50' 
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Back
            </button>

            <button
              onClick={handleNext}
              disabled={activeStep === 0 && !isCheckComplete}
              className={`px-6 h-[48px] rounded-xl font-black text-sm uppercase tracking-wider transition-all transform flex items-center gap-1.5 shadow-md ${
                activeStep === 0 && !isCheckComplete
                  ? 'bg-slate-100 border border-slate-250 text-slate-400 cursor-not-allowed shadow-none'
                  : activeStep === 2
                    ? 'bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600 hover:-translate-y-0.5 active:translate-y-0'
                    : 'premium-gradient text-white shadow-brand-500/20 hover:premium-glow hover:-translate-y-0.5 active:translate-y-0'
              }`}
            >
              <span>{activeStep === 2 ? 'Go to Lobby' : 'Continue'}</span>
              {activeStep < 2 ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-white/10" />
              )}
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
