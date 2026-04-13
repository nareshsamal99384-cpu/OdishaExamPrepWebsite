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
  LogOut,
  BookOpen,
  Download,
  Play,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { db, storage, auth } from './lib/firebase';
import { supabase } from './lib/supabase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { cn } from './lib/utils';

// --- Admin Components ---

const AdminPanel = ({ onClose, onLogout }: { onClose: () => void, onLogout?: () => void }) => {
  const [activeTab, setActiveTab] = useState<'subjects' | 'questions' | 'series' | 'tests' | 'users'>('subjects');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    tagline: '',
    category: 'topic-wise',
    questionsCount: 0,
    isPremium: false,
    canDownload: true,
    canPractice: true,
    price: 499,
    image: '',
    pdfUrl: '',
    driveUrl: ''
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'subjects'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subjectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSubjects(subjectsData);
    }, (error) => {
      console.error("Firestore Error in AdminPanel subjects listener:", error);
    });
    return () => unsubscribe();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pdfFile && !formData.pdfUrl && !formData.driveUrl) {
      alert('Please either upload a PDF or provide a Google Drive link.');
      return;
    }

    setLoading(true);
    try {
      let finalPdfUrl = formData.pdfUrl;

      if (pdfFile) {
        try {
          // Try Firebase Storage first
          if (!auth.currentUser) {
            throw new Error('Firebase Auth not initialized');
          }

          const storageRef = ref(storage, `subjects/pdfs/${Date.now()}_${pdfFile.name}`);
          const uploadTask = uploadBytesResumable(storageRef, pdfFile);
          
          await new Promise((resolve, reject) => {
            uploadTask.on('state_changed', 
              null, 
              (error) => reject(error), 
              () => resolve(true)
            );
          });

          finalPdfUrl = await getDownloadURL(storageRef);
        } catch (firebaseError: any) {
          console.warn("Firebase Storage failed, attempting Supabase fallback:", firebaseError);
          
          // Fallback to Supabase Storage
          const fileExt = pdfFile.name.split('.').pop();
          const fileName = `${Date.now()}.${fileExt}`;
          const filePath = `subjects/${fileName}`;

          const { data, error: supabaseError } = await supabase.storage
            .from('pdfs')
            .upload(filePath, pdfFile);

          if (supabaseError) {
            console.error("Supabase Storage also failed:", supabaseError);
            throw new Error('Both Firebase and Supabase storage failed. Please check your connection or use a Google Drive link.');
          }

          const { data: { publicUrl } } = supabase.storage
            .from('pdfs')
            .getPublicUrl(filePath);
          
          finalPdfUrl = publicUrl;
        }
      }

      const subjectData = {
        ...formData,
        pdfUrl: finalPdfUrl,
        updatedAt: Timestamp.now()
      };

      if (editingSubject) {
        await updateDoc(doc(db, 'subjects', editingSubject.id), subjectData);
        setSuccessMessage('Subject updated successfully!');
      } else {
        await addDoc(collection(db, 'subjects'), {
          ...subjectData,
          createdAt: Timestamp.now()
        });
        setSuccessMessage('Subject created successfully!');
      }

      setShowAddModal(false);
      setEditingSubject(null);
      setFormData({
        title: '',
        tagline: '',
        category: 'topic-wise',
        questionsCount: 0,
        isPremium: false,
        canDownload: true,
        canPractice: true,
        price: 499,
        image: '',
        pdfUrl: '',
        driveUrl: ''
      });
      setPdfFile(null);
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("Error saving subject:", error);
      alert('Failed to save subject. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (subject: any) => {
    setEditingSubject(subject);
    setFormData({
      title: subject.title,
      tagline: subject.tagline || '',
      category: subject.category,
      questionsCount: subject.questionsCount || 0,
      isPremium: subject.isPremium || false,
      canDownload: subject.canDownload !== undefined ? subject.canDownload : true,
      canPractice: subject.canPractice !== undefined ? subject.canPractice : true,
      price: subject.price || 499,
      image: subject.image || '',
      pdfUrl: subject.pdfUrl || '',
      driveUrl: subject.driveUrl || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this subject?")) {
      try {
        await deleteDoc(doc(db, 'subjects', id));
      } catch (error) {
        console.error("Error deleting subject:", error);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-[#F8FAFC] z-50 flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 glass border-b border-slate-200/50 flex items-center justify-between px-6 shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-extrabold text-slate-950 tracking-tight">Admin <span className="premium-text-gradient">Control Center</span></h1>
          <div className="h-6 w-px bg-slate-200" />
          <nav className="flex gap-2">
            {[
              { id: 'subjects', label: 'Subjects', icon: BookOpen },
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
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Supabase Fallback Active</span>
          </div>
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
                onClick={() => {
                  setEditingSubject(null);
                  setFormData({
                    title: '',
                    tagline: '',
                    category: 'topic-wise',
                    questionsCount: 0,
                    isPremium: false,
                    canDownload: true,
                    canPractice: true,
                    price: 499,
                    image: '',
                    pdfUrl: ''
                  });
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-8 py-2.5 premium-gradient text-white rounded-xl text-sm font-extrabold hover:premium-glow shadow-lg shadow-brand-500/20 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" /> Add New
              </button>
            </div>
          </div>

          {activeTab === 'subjects' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject) => (
                <div key={subject.id} className="glass rounded-3xl border border-slate-200/50 overflow-hidden group hover:shadow-2xl transition-all duration-500">
                  <div className="aspect-video relative overflow-hidden">
                    <img 
                      src={subject.image || 'https://picsum.photos/seed/subject/400/250'} 
                      alt={subject.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                    <div className="absolute top-4 right-4 flex gap-2">
                      {subject.isPremium && (
                        <span className="px-3 py-1 bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">Premium</span>
                      )}
                      <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">{subject.category}</span>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">{subject.title}</h3>
                      <p className="text-slate-500 font-medium text-sm line-clamp-1">{subject.tagline}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4" /> {subject.questionsCount} Questions
                      </div>
                      <div className="flex items-center gap-3">
                        {subject.canDownload && <Download className="w-4 h-4 text-brand-500" />}
                        {subject.canPractice && <Play className="w-4 h-4 text-indigo-500" />}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => handleEdit(subject)}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-brand-50 hover:text-brand-600 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(subject.id)}
                        className="p-2.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
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
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-950/40 z-[60] flex items-center justify-center p-6 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-2xl border-white/40 my-8"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-extrabold text-2xl tracking-tight">
                  {editingSubject ? 'Edit' : 'Add New'} <span className="text-brand-600">Subject</span>
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-all"><X className="w-6 h-6" /></button>
              </div>
              
              <form onSubmit={handleSave} className="p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Basic Info */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Subject Title</label>
                      <input 
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-bold bg-white"
                        placeholder="e.g. Indian Polity"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Tagline / Description</label>
                      <input 
                        type="text"
                        value={formData.tagline}
                        onChange={(e) => setFormData({...formData, tagline: e.target.value})}
                        className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-bold bg-white"
                        placeholder="e.g. Concept-Focused Practice"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                        <select 
                          value={formData.category}
                          onChange={(e) => setFormData({...formData, category: e.target.value})}
                          className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-bold bg-white"
                        >
                          <option value="topic-wise">Topic-wise</option>
                          <option value="exam-focused">Exam-focused</option>
                          <option value="revision-sets">Revision Sets</option>
                          <option value="pyq-collections">PYQ Collections</option>
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Questions</label>
                        <input 
                          type="number"
                          value={formData.questionsCount || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setFormData({...formData, questionsCount: isNaN(val) ? 0 : val});
                          }}
                          className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-bold bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Media & Controls */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Image URL</label>
                      <div className="relative">
                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                          type="text"
                          value={formData.image}
                          onChange={(e) => setFormData({...formData, image: e.target.value})}
                          className="w-full pl-12 pr-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-bold bg-white"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Upload PDF Study Material</label>
                      <div className="relative">
                        <input 
                          type="file"
                          accept=".pdf"
                          onChange={handleFileChange}
                          className="hidden"
                          id="pdf-upload"
                        />
                        <label 
                          htmlFor="pdf-upload"
                          className="w-full flex items-center gap-3 px-5 py-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-brand-500 hover:bg-brand-50 transition-all cursor-pointer font-bold text-slate-600"
                        >
                          <Upload className="w-5 h-5" />
                          {pdfFile ? pdfFile.name : (formData.pdfUrl ? 'Replace existing PDF' : 'Choose PDF file')}
                        </label>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">OR Google Drive PDF Link</label>
                      <div className="relative">
                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                          type="url"
                          value={formData.driveUrl}
                          onChange={(e) => setFormData({...formData, driveUrl: e.target.value})}
                          className="w-full pl-12 pr-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-bold bg-white"
                          placeholder="https://drive.google.com/..."
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <input 
                          type="checkbox" 
                          id="canDownload" 
                          checked={formData.canDownload}
                          onChange={(e) => setFormData({...formData, canDownload: e.target.checked})}
                          className="w-5 h-5 text-brand-600 rounded-lg border-slate-300 focus:ring-brand-500 transition-all cursor-pointer" 
                        />
                        <label htmlFor="canDownload" className="text-xs font-black text-slate-600 cursor-pointer">Download</label>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <input 
                          type="checkbox" 
                          id="canPractice" 
                          checked={formData.canPractice}
                          onChange={(e) => setFormData({...formData, canPractice: e.target.checked})}
                          className="w-5 h-5 text-brand-600 rounded-lg border-slate-300 focus:ring-brand-500 transition-all cursor-pointer" 
                        />
                        <label htmlFor="canPractice" className="text-xs font-black text-slate-600 cursor-pointer">Practice</label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-6 bg-brand-50 rounded-[2rem] border border-brand-100">
                  <div className="flex items-center gap-4">
                    <input 
                      type="checkbox" 
                      id="isPremium" 
                      checked={formData.isPremium}
                      onChange={(e) => setFormData({...formData, isPremium: e.target.checked})}
                      className="w-8 h-8 text-brand-600 rounded-xl border-slate-300 focus:ring-brand-500 transition-all cursor-pointer" 
                    />
                    <div>
                      <label htmlFor="isPremium" className="text-lg font-black text-brand-900 cursor-pointer">Premium Content</label>
                      <p className="text-xs font-bold text-brand-600">Requires active subscription to access</p>
                    </div>
                  </div>
                    {formData.isPremium && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-slate-400">Price:</span>
                        <input 
                          type="number"
                          value={formData.price || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setFormData({...formData, price: isNaN(val) ? 0 : val});
                          }}
                          className="w-24 px-4 py-2 rounded-xl border-2 border-brand-200 outline-none focus:border-brand-500 transition-all font-black text-brand-700 text-center"
                        />
                      </div>
                    )}
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)} 
                    className="px-8 py-3 rounded-xl border-2 border-slate-100 font-extrabold text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="px-10 py-3 rounded-xl premium-gradient text-white font-extrabold hover:premium-glow shadow-lg shadow-brand-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                    {editingSubject ? 'Update Subject' : 'Create Subject'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Notification */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold"
          >
            <Check className="w-6 h-6" />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPanel;
