import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Upload, 
  FileText, 
  Layers, 
  Users, 
  Settings,
  X,
  Check,
  AlertCircle,
  ChevronRight,
  Trash2,
  Edit2,
  LogOut
} from 'lucide-react';
import { examService, Question, TestSeries, MockTest } from './lib/examService';
import { cn } from './lib/utils';

// --- Admin Components ---

const AdminPanel = ({ onClose, onLogout }: { onClose: () => void, onLogout?: () => void }) => {
  const [activeTab, setActiveTab] = useState<'questions' | 'series' | 'tests' | 'users'>('questions');
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="fixed inset-0 bg-[#F8FAFC] z-50 flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 glass border-b border-slate-200/50 flex items-center justify-between px-6 shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-extrabold text-slate-950 tracking-tight">Admin <span className="premium-text-gradient">Control Center</span></h1>
          <div className="h-6 w-px bg-slate-200" />
          <nav className="flex gap-2">
            {[
              { id: 'questions', label: 'Questions', icon: FileText },
              { id: 'series', label: 'Series', icon: Layers },
              { id: 'tests', label: 'Tests', icon: Check },
              { id: 'users', label: 'Users', icon: Users },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold transition-all",
                  activeTab === tab.id ? "bg-brand-50 text-brand-700 shadow-sm border border-brand-100" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {onLogout && (
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl text-sm font-extrabold transition-all"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          )}
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-8 sm:p-12">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <h2 className="text-4xl font-extrabold text-slate-950 capitalize tracking-tight">{activeTab}</h2>
              <p className="text-slate-500 font-medium">Manage your {activeTab} bank and access controls.</p>
            </div>
            <div className="flex gap-4">
              <button className="flex items-center gap-2 px-6 py-2.5 glass border border-slate-200 rounded-xl text-sm font-extrabold hover:bg-white transition-all premium-shadow">
                <Upload className="w-4 h-4" /> Bulk Upload
              </button>
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-8 py-2.5 premium-gradient text-white rounded-xl text-sm font-extrabold hover:premium-glow shadow-lg shadow-brand-500/20 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" /> Add New
              </button>
            </div>
          </div>

          {/* Table/Grid View */}
          <div className="glass rounded-[2rem] border border-slate-200/50 shadow-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 border-b border-slate-200/50">
                <tr>
                  <th className="px-8 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-widest">Title / Name</th>
                  <th className="px-8 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-widest">Category</th>
                  <th className="px-8 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="hover:bg-brand-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="font-extrabold text-slate-900 text-lg">Sample {activeTab} Item {i}</div>
                      <div className="text-sm text-slate-500 font-medium mt-1">Last modified 2 hours ago</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-extrabold border border-slate-200">OPSC AIO</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-extrabold border border-green-100">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Published
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"><Edit2 className="w-5 h-5" /></button>
                        <button className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Modal Placeholder */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-950/40 z-[60] flex items-center justify-center p-6 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl border-white/40"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-extrabold text-2xl tracking-tight">Add New <span className="text-brand-600">{activeTab.slice(0, -1)}</span></h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-all"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-10 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Exam Category</label>
                    <select className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-bold bg-white">
                      <option>OPSC AIO</option>
                      <option>SSC CGL</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Access Type</label>
                    <select className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-bold bg-white">
                      <option value="free">Free Access</option>
                      <option value="premium">Premium Only</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Title / Question Text</label>
                  <textarea className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-bold bg-white min-h-[120px] text-lg" placeholder="Enter content here..." />
                </div>
                <div className="flex items-center gap-3 p-4 bg-brand-50 rounded-2xl border border-brand-100">
                  <input type="checkbox" id="isPremium" className="w-6 h-6 text-brand-600 rounded-lg border-slate-300 focus:ring-brand-500 transition-all cursor-pointer" />
                  <label htmlFor="isPremium" className="text-base font-extrabold text-brand-900 cursor-pointer">Mark as Premium Content</label>
                </div>
                <div className="flex justify-end gap-4 pt-4">
                  <button onClick={() => setShowAddModal(false)} className="px-8 py-3 rounded-xl border-2 border-slate-100 font-extrabold text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
                  <button className="px-10 py-3 rounded-xl premium-gradient text-white font-extrabold hover:premium-glow shadow-lg shadow-brand-500/20 transition-all active:scale-95">Save Changes</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPanel;
