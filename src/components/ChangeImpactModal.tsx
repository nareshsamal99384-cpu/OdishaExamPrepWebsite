import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Users, BookOpen, ShieldAlert, X } from 'lucide-react';
import { modalContent, scaleIn } from '../lib/animations';
import { cn } from '../lib/utils';

export interface ChangeImpactReport {
  targetName: string;
  actionType: 'delete' | 'archive' | 'pricing_change' | 'edit_exam';
  activePurchasesCount: number;
  orphanedItemsCount?: number;
  hasHighRisk: boolean;
  warnings: string[];
}

interface ChangeImpactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  report: ChangeImpactReport | null;
}

const ChangeImpactModal: React.FC<ChangeImpactModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  report
}) => {
  const [typedVerification, setTypedVerification] = useState('');
  
  if (!isOpen || !report) return null;

  const requiresTypedConfirm = report.hasHighRisk || report.activePurchasesCount > 0;
  const canProceed = !requiresTypedConfirm || typedVerification.toUpperCase() === 'CONFIRM';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/70 z-[999] flex items-center justify-center p-4 backdrop-blur-md">
        <motion.div
          {...modalContent}
          className="bg-white border border-slate-200 rounded-[2.2rem] w-full max-w-lg p-6 sm:p-8 shadow-2xl relative overflow-y-auto no-scrollbar flex flex-col gap-6 max-h-[90vh]"
        >
          {/* Top warning strip */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-rose-500 to-red-600" />

          {/* Close button */}
          <button 
            onClick={onClose} 
            className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-all text-slate-400 hover:text-slate-600 z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-4 mt-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Dry-Run Impact Analysis</h3>
              <p className="text-slate-500 text-xs font-semibold uppercase mt-0.5 tracking-wider">
                Simulating: {report.actionType.replace('_', ' ')}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-3.5">
              <p className="text-sm font-bold text-slate-700">
                You are about to run a modification on <span className="text-slate-900 font-extrabold">"{report.targetName}"</span>.
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mt-1">
                <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex flex-col">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 mb-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" /> Active Owners
                  </span>
                  <span className="text-xl font-black text-slate-900">
                    {report.activePurchasesCount} student{report.activePurchasesCount !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex flex-col">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 mb-1">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" /> Nested Items
                  </span>
                  <span className="text-xl font-black text-slate-900">
                    {report.orphanedItemsCount ?? 0} child item{report.orphanedItemsCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Warnings list */}
            {report.warnings.length > 0 && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-rose-500 block">
                  Risks & Impact Checked
                </label>
                <div className="max-h-[140px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                  {report.warnings.map((warn, i) => (
                    <div key={i} className="flex gap-2.5 items-start p-3 bg-rose-50/50 border border-rose-100/60 rounded-xl text-xs text-rose-700 font-medium leading-relaxed">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verification text field */}
            {requiresTypedConfirm && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                  To proceed, type <span className="text-slate-900 font-black">"CONFIRM"</span>
                </label>
                <input
                  type="text"
                  placeholder="Type CONFIRM to authorize..."
                  value={typedVerification}
                  onChange={(e) => setTypedVerification(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-bold text-sm"
                />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="w-1/3 py-3 rounded-xl border border-slate-200 font-extrabold text-slate-600 hover:bg-slate-50 transition-all text-sm"
            >
              Cancel
            </button>
            <button
              disabled={!canProceed}
              onClick={() => {
                onConfirm();
                setTypedVerification('');
              }}
              className={cn(
                "flex-1 text-white font-extrabold rounded-xl py-3 text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                report.hasHighRisk || report.activePurchasesCount > 0
                  ? "bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                  : "bg-brand-600 hover:bg-brand-700"
              )}
            >
              Confirm and Save
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ChangeImpactModal;
