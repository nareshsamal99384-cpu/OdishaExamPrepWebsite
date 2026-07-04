import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Smartphone } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { toast } from 'react-hot-toast';


interface PushPermissionPromptProps {
  userId?: string;
  trigger?: 'auto' | 'manual'; // auto = show after first test, manual = always show
  onClose?: () => void;
}

const PushPermissionPrompt: React.FC<PushPermissionPromptProps> = ({
  userId,
  trigger = 'auto',
  onClose,
}) => {
  const [visible, setVisible] = useState(false);
  const {
    isSupported,
    isIOSDevice,
    isIOSInstalled,
    isSubscribed,
    isLoading,
    permissionState,
    subscribe,
  } = usePushNotifications(userId);

  useEffect(() => {
    if (!userId || isSubscribed) return;

    // For normal devices, don't show if already granted
    const isIOSNotInstalled = isIOSDevice && !isIOSInstalled;
    if (!isIOSNotInstalled) {
      if (!isSupported) return;
      if (permissionState === 'granted') return;
    }

    if (trigger !== 'auto') return;

    // Show after 3 seconds (only if user is logged in and hasn't subscribed)
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [isSupported, isIOSDevice, isIOSInstalled, isSubscribed, userId, permissionState, trigger]);

  // For manual trigger — show immediately
  useEffect(() => {
    if (trigger === 'manual' && userId && !isSubscribed) {
      const isIOSNotInstalled = isIOSDevice && !isIOSInstalled;
      if (isIOSNotInstalled) {
        setVisible(true);
      } else if (isSupported && permissionState !== 'granted') {
        setVisible(true);
      }
    }
  }, [trigger, isSupported, isIOSDevice, isIOSInstalled, userId, isSubscribed, permissionState]);

  // Automatically hide the panel if subscribed AND permission is granted (except for iOS safari instructions which hide when subscribed)
  useEffect(() => {
    const isIOSNotInstalled = isIOSDevice && !isIOSInstalled;
    if (!isIOSNotInstalled) {
      if (isSubscribed && permissionState === 'granted') {
        setVisible(false);
      }
    } else {
      if (isSubscribed) {
        setVisible(false);
      }
    }
  }, [isSubscribed, permissionState, isIOSDevice, isIOSInstalled]);

  const handleDismiss = () => {
    setVisible(false);
    onClose?.();
  };

  const handleAllow = async () => {
    let permission: NotificationPermission = 'default';
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'denied') {
          toast.error('Notifications blocked. Please enable them in your browser settings.', {
            duration: 5000,
          });
          setVisible(false);
          onClose?.();
          return;
        }
        permission = await Notification.requestPermission();
      }
    } catch (err) {
      console.error('[PushPermissionPrompt] Permission request failed:', err);
    }

    if (permission !== 'granted') {
      if (permission === 'denied') {
        toast.error('Notifications blocked. Please enable them in your browser settings.', {
          duration: 5000,
        });
      }
      setVisible(false);
      onClose?.();
      return;
    }

    // Permission granted! Close the prompt panel immediately
    setVisible(false);
    onClose?.();

    // Register push subscription in the background
    subscribe().then((success) => {
      if (success) {
        toast.success('🔔 Notifications enabled! You\'ll get alerts for new tests & exams.', {
          duration: 4000,
          style: { fontWeight: '700', borderRadius: '14px' },
        });
      }
    });
  };

  // iOS not installed as PWA — show instructions instead
  const isIOSNotInstalled = isIOSDevice && !isIOSInstalled;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-[200] backdrop-blur-sm"
            onClick={handleDismiss}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed bottom-0 left-0 right-0 z-[201] px-4 pb-6 sm:max-w-md sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:bottom-6"
          >
            <div className="bg-white rounded-3xl shadow-2xl shadow-slate-900/20 border border-slate-100 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#8A1C36] to-[#b83a55] px-5 pt-5 pb-4 relative">
                <button
                  onClick={handleDismiss}
                  className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-sm">
                    <Bell className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-black text-base leading-tight">Stay Ahead!</p>
                    <p className="text-white/80 text-xs font-semibold mt-0.5">OdishaExamPrep Alerts</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 py-4">
                {isIOSNotInstalled ? (
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-slate-800 leading-relaxed">
                      To receive push notifications on iPhone/iPad, add this site to your Home Screen:
                    </p>
                    <div className="space-y-2">
                      {[
                        '1. Tap the Share button (📤) in Safari',
                        '2. Scroll down and tap "Add to Home Screen"',
                        '3. Tap "Add" — then open the app from your Home Screen',
                      ].map((step) => (
                        <div key={step} className="flex items-start gap-2">
                          <Smartphone className="w-3.5 h-3.5 text-[#8A1C36] mt-0.5 shrink-0" />
                          <p className="text-xs font-semibold text-slate-600">{step}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleDismiss}
                      className="w-full py-3 rounded-2xl bg-slate-100 text-slate-700 text-sm font-black hover:bg-slate-200 transition-all mt-2"
                    >
                      Got it
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-slate-700 leading-relaxed">
                      Get instant alerts for new mock tests, exam notifications, and important updates — even when the app is closed.
                    </p>
                    <div className="flex gap-2.5 flex-wrap text-xs font-bold text-slate-500">
                      {['New Mock Tests', 'Exam Dates', 'Result Updates', 'Question Banks'].map((tag) => (
                        <span key={tag} className="px-2.5 py-1 bg-slate-50 rounded-full border border-slate-100">
                          🔔 {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2.5 pt-1">
                      <button
                        onClick={handleDismiss}
                        className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 text-sm font-black hover:bg-slate-200 transition-all"
                      >
                        Not Now
                      </button>
                      <button
                        onClick={handleAllow}
                        disabled={isLoading}
                        className="flex-[2] py-3 rounded-2xl bg-gradient-to-r from-[#8A1C36] to-[#b83a55] text-white text-sm font-black hover:shadow-lg hover:shadow-[#8A1C36]/20 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                      >
                        <Bell className="w-4 h-4" />
                        {isLoading ? 'Enabling...' : 'Allow Notifications'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PushPermissionPrompt;
