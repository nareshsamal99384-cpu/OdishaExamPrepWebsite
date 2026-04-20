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
  ChevronDown,
  Search,
  Trash2,
  Edit2,
  LogOut,
  Award,
  BookMarked
} from 'lucide-react';
import { examService, Question, TestSeries, MockTest, Exam } from './lib/examService';
import { cn } from './lib/utils';
import { supabase } from './lib/supabase';

// --- Custom Components ---
const SearchableDropdown = ({ value, onChange, options, placeholder, required, disabled }: { value: string, onChange: (v: string) => void, options: {value: string, label: string}[], placeholder: string, required?: boolean, disabled?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(searchTerm.toLowerCase()));
  const selectedLabel = options.find(o => o.value === value)?.label || '';

  return (
    <div ref={dropdownRef} className="relative w-full">
      <div className="absolute inset-0 overflow-hidden opacity-0 pointer-events-none w-0 h-0">
        <input type="text" required={required} value={value} onChange={() => {}} tabIndex={-1} />
      </div>
      <div 
        className={cn(
          "w-full px-5 py-3 rounded-2xl border-2 outline-none transition-all font-bold bg-white cursor-pointer flex justify-between items-center group", 
          isOpen ? "border-brand-500 ring-2 ring-brand-500/20" : "border-slate-100 hover:border-slate-200", 
          disabled && "opacity-50 select-none pointer-events-none"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={selectedLabel ? "text-slate-900 line-clamp-1 text-left" : "text-slate-500"}>{selectedLabel || placeholder}</span>
        <ChevronDown className={cn("w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-transform shrink-0", isOpen && "rotate-180")} />
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}
            className="absolute z-[100] mt-2 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Search items..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm font-bold outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all text-slate-700"
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar p-2 space-y-1">
              <div
                className={cn("px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-colors", !value ? "bg-brand-50 text-brand-600" : "text-slate-600 hover:bg-slate-50")}
                onClick={() => { onChange(''); setIsOpen(false); setSearchTerm(''); }}
              >
                {placeholder}
              </div>
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-400 text-center font-bold">No results found</div>
              ) : (
                filteredOptions.map(o => (
                  <div
                    key={o.value}
                    onClick={() => { onChange(o.value); setIsOpen(false); setSearchTerm(''); }}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-colors", 
                      value === o.value ? "bg-brand-50 text-brand-600" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    {o.label}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Admin Components ---

const AdminPanel = ({ onClose, onLogout }: { onClose: () => void, onLogout?: () => void }) => {
  const [activeTab, setActiveTab] = useState<'questions' | 'series' | 'tests' | 'exams' | 'banks' | 'users'>('exams');
  const [questionFilter, setQuestionFilter] = useState<'all' | 'practice' | 'mock'>('all');
  const [examFilter, setExamFilter] = useState<'all' | 'popular' | 'upcoming'>('all');
  const [testFilter, setTestFilter] = useState<'all' | 'full-length' | 'sectional' | 'pyq' | 'daily'>('all');
  const [bankFilter, setBankFilter] = useState<'all' | 'topic-wise' | 'exam-focused' | 'revision-sets' | 'pyq-collections'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExamId, setFilterExamId] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showMockUploadModal, setShowMockUploadModal] = useState(false);
  const [attachMockTestId, setAttachMockTestId] = useState<string | null>(null);
  const [bulkExamId, setBulkExamId] = useState('');
  const [bulkTopic, setBulkTopic] = useState('');
  const [bulkFileContent, setBulkFileContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Data State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [series, setSeries] = useState<TestSeries[]>([]);
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<any>(null);
  const [newPasswordValue, setNewPasswordValue] = useState("");

  // Comprehensive Form State
  const initialFormData = {
    // Exam
    name: '',
    icon: '🏛️',
    examCategory: 'popular',
    examDate: '',
    
    // Generic
    title: '',
    description: '',
    
    // Bank
    type: 'topic-wise',
    questionCount: 0,
    tagline: '',
    image: '',
    isPremium: false,
    pdfUrl: '',
    hasPracticeMode: true,
    
    // Series / Test
    examId: '',
    seriesId: '',
    mockCategory: 'full-length',
    mockSubject: '',
    price: 0,
    originalPrice: 0,
    durationDays: 30,
    durationMinutes: 60,
    totalMarks: 100,
    
    // Question
    topic: '',
    difficulty: 'medium',
    questionText: '',
    options: ['', '', '', ''],
    correctAnswerIndex: 0,
    explanation: ''
  };

  const [formData, setFormData] = useState<any>(initialFormData);
  const [youtubeVideosInput, setYoutubeVideosInput] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      let usersFetchPromise = supabase.from('users').select('*').then(res => res.data || []);
      const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseServiceKey) {
         try {
           const { createClient } = await import('@supabase/supabase-js');
           const supabaseAdminLocal = createClient(import.meta.env.VITE_SUPABASE_URL, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } });
           
           usersFetchPromise = Promise.all([
             supabaseAdminLocal.auth.admin.listUsers().then(res => res.data.users || []),
             supabaseAdminLocal.from('users').select('*').then(res => res.data || [])
           ]).then(([authUsers, publicUsers]) => {
              // Merge Auth users with their Public profiles (or fallback data)
              return authUsers.map(au => {
                 const pu = publicUsers.find(p => p.uid === au.id) || {};
                 return {
                    uid: au.id,
                    email: au.email,
                    displayName: pu.displayName || au.user_metadata?.full_name || au.user_metadata?.name || au.email?.split('@')[0],
                    photoURL: pu.photoURL || au.user_metadata?.avatar_url || au.user_metadata?.picture,
                    role: pu.role || 'user',
                    hasFullAccess: !!pu.hasFullAccess,
                    purchasedSeries: pu.purchasedSeries || []
                 };
              });
           });
         } catch(e) {}
      }

      const [qs, ss, ts, ex, bks, fetchedUsers] = await Promise.all([
        examService.getAllQuestions(),
        examService.getAllTestSeries(),
        examService.getAllMockTests(),
        examService.getAllExams(),
        examService.getAllQuestionBanks(),
        usersFetchPromise
      ]);
      setQuestions(qs);
      setSeries(ss);
      setMockTests(ts);
      setExams(ex);
      setBanks(bks);
      setUsers(fetchedUsers);

      const settingsExam = ex.find(e => e.name === 'SYSTEM_SETTINGS_YOUTUBE_RESERVED');
      if (settingsExam && settingsExam.description) {
        try {
          const parsed = JSON.parse(settingsExam.description);
          if (parsed.videos) setYoutubeVideosInput(parsed.videos.join('\n'));
        } catch(e) {}
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      if (activeTab === 'questions') await examService.deleteQuestion(id);
      else if (activeTab === 'series') await examService.deleteTestSeries(id);
      else if (activeTab === 'tests') await examService.deleteMockTest(id);
      else if (activeTab === 'exams' || activeTab === 'blogs') await examService.deleteExam(id);
      else if (activeTab === 'banks') await examService.deleteQuestionBank(id);
      await fetchData();
    } catch (error) {
      alert('Error deleting item');
    }
  };

  const handleEditClick = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(item.id);
    
    let newData = { ...initialFormData };
    if (activeTab === 'banks') {
      let parsedTagline = { text: item.tagline || '', price: 499 };
      try { 
        if (item.tagline && item.tagline.includes('{"text"')) {
           parsedTagline = JSON.parse(item.tagline);
        }
      } catch(e) {}

      newData = {
        ...newData,
        examId: item.examId || '',
        type: item.type || 'topic-wise',
        title: item.title || '',
        questionCount: item.questionCount || 0,
        tagline: parsedTagline.text,
        price: parsedTagline.price || 499,
        originalPrice: parsedTagline.originalPrice || ((parsedTagline.price || 499) * 2),
        image: item.image || '',
        isPremium: item.isPremium || false,
        pdfUrl: item.pdfUrl || '',
        hasPracticeMode: item.hasPracticeMode ?? true
      };
    } else if (activeTab === 'exams') {
      newData = {
        ...newData,
        name: item.name || '',
        description: item.description || '',
        icon: item.icon || 'BookOpen',
        examCategory: item.category || 'popular',
        examDate: item.examDate || ''
      };
    } else if (activeTab === 'questions') {
      let mockCategory = 'full-length';
      const t = (item.topic || '').toLowerCase();
      if (t.startsWith('mocktest__')) {
        const testId = item.topic.split('__')[1];
        const mt = mockTests.find(m => m.id === testId);
        if (mt && mt.seriesId) {
          try { mockCategory = JSON.parse(mt.seriesId).category || 'full-length'; } catch(e){}
        }
      }

      newData = {
        ...newData,
        examId: item.examId || '',
        topic: item.topic || '',
        mockCategory: mockCategory,
        difficulty: item.difficulty || 'medium',
        questionText: item.questionText || '',
        options: item.options || ['', '', '', ''],
        correctAnswerIndex: item.correctAnswerIndex || 0,
        explanation: item.explanation || ''
      };
    } else if (activeTab === 'series') {
      newData = {
        ...newData,
        examId: item.examId || '',
        title: item.title || '',
        description: item.description || '',
        price: item.price || 499,
        durationDays: item.durationDays || 30
      };
    } else if (activeTab === 'tests') {
      let parsedMockConfig = { examId: '', category: 'full-length', subject: '', isPremium: false, price: 499 };
      try {
        if (item.seriesId) parsedMockConfig = JSON.parse(item.seriesId);
      } catch(e) {}
      
      newData = {
        ...newData,
        examId: parsedMockConfig.examId || '',
        mockCategory: parsedMockConfig.category || 'full-length',
        mockSubject: parsedMockConfig.subject || '',
        isPremium: parsedMockConfig.isPremium || false,
        price: parsedMockConfig.price || 499,
        originalPrice: parsedMockConfig.originalPrice || ((parsedMockConfig.price || 499) * 2),
        seriesId: item.seriesId || '',
        title: item.title || '',
        durationMinutes: item.durationMinutes || 60,
        totalMarks: item.totalMarks || 100
      };
    }
    
    setFormData(newData);
    setShowAddModal(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeTab === 'questions') {
        if (!formData.examId) { alert("Please select an exam."); return; }
        const payload = {
          examId: formData.examId,
          topic: formData.topic,
          difficulty: formData.difficulty as 'easy' | 'medium' | 'hard',
          questionText: formData.questionText,
          options: formData.options,
          correctAnswerIndex: Number(formData.correctAnswerIndex),
          explanation: formData.explanation
        };
        if (editingId) await examService.updateQuestion(editingId, payload);
        else await examService.addQuestion(payload);
      } else if (activeTab === 'series') {
        if (!formData.examId) { alert("Please select an exam."); return; }
        await examService.createTestSeries({
          examId: formData.examId,
          title: formData.title,
          description: formData.description,
          price: Number(formData.price),
          durationDays: Number(formData.durationDays),
          testIds: []
        });
      } else if (activeTab === 'tests') {
        if (!formData.examId) { alert("Please select an exam."); return; }
        const mockConfig = JSON.stringify({
           examId: formData.examId,
           category: formData.mockCategory,
           subject: formData.mockCategory === 'sectional' ? formData.mockSubject : null,
           isPremium: formData.isPremium,
           price: Number(formData.price) || 499,
           originalPrice: Number(formData.originalPrice) || ((Number(formData.price) || 499) * 2)
        });

        const payload = {
          seriesId: mockConfig,
          title: formData.title,
          durationMinutes: Number(formData.durationMinutes),
          totalMarks: Number(formData.totalMarks)
        };
        if (editingId) await examService.updateMockTest(editingId, payload);
        else await examService.createMockTest(payload);
      } else if (activeTab === 'exams' || activeTab === 'blogs') {
        const payload = {
          name: formData.name,
          description: formData.description,
          icon: formData.icon,
          category: activeTab === 'blogs' ? 'blog' : (formData.examCategory as 'popular' | 'upcoming' | 'blog' | 'system'),
          examDate: formData.examDate
        };
        if (editingId) await examService.updateExam(editingId, payload);
        else await examService.addExam(payload);
      } else if (activeTab === 'banks') {
        if (!formData.examId) { alert("Please select an exam."); return; }
        const payload = {
          examId: formData.examId,
          type: formData.type,
          title: formData.title,
          questionCount: Number(formData.questionCount),
          tagline: formData.isPremium ? JSON.stringify({ text: formData.tagline, price: Number(formData.price) || 499, originalPrice: Number(formData.originalPrice) || ((Number(formData.price) || 499) * 2) }) : formData.tagline,
          image: formData.image,
          isPremium: formData.isPremium,
          pdfUrl: formData.pdfUrl,
          hasPracticeMode: formData.hasPracticeMode
        };
        if (editingId) await examService.updateQuestionBank(editingId, payload);
        else await examService.createQuestionBank(payload);
      }
      setShowAddModal(false);
      setFormData(initialFormData);
      await fetchData();
    } catch (error: any) {
      console.error(error);
      alert('Error adding item: ' + (error.message || 'Unknown error'));
    }
  };

  const handleMockBulkUpload = async () => {
    try {
      if (!attachMockTestId) {
         alert("Please select a Mock Test.");
         return;
      }
      if (!bulkFileContent) {
         alert("Please upload a file or paste JSON.");
         return;
      }
      
      let parsed;
      try {
        parsed = JSON.parse(bulkFileContent);
      } catch (e) {
        try {
          parsed = new Function('return ' + bulkFileContent)();
        } catch (e2) {
          alert("Invalid format. Please ensure the file is valid JSON or a JavaScript array.");
          return;
        }
      }
      
      if (!Array.isArray(parsed)) {
        alert("The JSON must be an array of question objects.");
        return;
      }
      
      const targetTest = mockTests.find(mt => mt.id === attachMockTestId);
      let targetExamId = 'generic';
      try {
        if (targetTest && targetTest.seriesId) {
          targetExamId = JSON.parse(targetTest.seriesId).examId || 'generic';
        }
      } catch(e) {}
      
      await examService.addQuestionsToMockTest(attachMockTestId, targetExamId, parsed);
      alert(`Successfully added ${parsed.length} questions to Mock Test!`);
      setShowMockUploadModal(false);
      setBulkFileContent('');
      setAttachMockTestId(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error occurred during Mock Test bulk upload');
    }
  };

  const handleBulkUpload = async () => {
    try {
      if (!bulkExamId || !bulkTopic) {
         alert("Please select an exam and topic.");
         return;
      }
      if (!bulkFileContent) {
         alert("Please upload a file or paste JSON.");
         return;
      }
      
      let parsed;
      try {
        parsed = JSON.parse(bulkFileContent);
      } catch (e) {
        try {
          parsed = new Function('return ' + bulkFileContent)();
        } catch (e2) {
          alert("Invalid format. Please ensure the file is valid JSON or a JavaScript array.");
          return;
        }
      }
      
      if (!Array.isArray(parsed)) {
        alert("The JSON must be an array of question objects.");
        return;
      }
      
      const formatted = parsed.map(q => ({
        examId: bulkExamId,
        topic: bulkTopic,
        difficulty: q.difficulty || 'medium',
        questionText: q.questionText || q.question || '',
        options: Array.isArray(q.options) ? q.options : ['', '', '', ''],
        correctAnswerIndex: Number(q.correctAnswerIndex) || 0,
        explanation: q.explanation || ''
      }));
      
      await examService.addQuestionsBulk(formatted);
      alert(`Successfully added ${formatted.length} questions!`);
      setShowBulkUploadModal(false);
      setBulkFileContent('');
      setBulkExamId('');
      setBulkTopic('');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error occurred during bulk upload');
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const items = React.useMemo(() => {
    if (activeTab === 'questions') {
      let filtered = questions;
      
      if (questionFilter === 'practice') {
        filtered = filtered.filter(q => !(q.topic || '').toLowerCase().startsWith('mocktest__'));
      } else if (questionFilter === 'mock') {
        filtered = filtered.filter(q => (q.topic || '').toLowerCase().startsWith('mocktest__'));
      }
      
      if (filterExamId !== 'all') {
        filtered = filtered.filter(q => q.examId === filterExamId);
      }
      
      if (searchQuery.trim()) {
        const lowerQ = searchQuery.toLowerCase();
        filtered = filtered.filter(q => {
          const textMatch = (q.questionText || '').toLowerCase().includes(lowerQ);
          const topicMatch = (q.topic || '').toLowerCase().includes(lowerQ);
          
          let examNameMatch = false;
          let mockTitleMatch = false;
          
          if (q.examId) {
             const ex = exams.find(e => e.id === q.examId);
             if (ex && ex.name.toLowerCase().includes(lowerQ)) examNameMatch = true;
          }
          
          if ((q.topic || '').toLowerCase().startsWith('mocktest__')) {
            const testId = q.topic.split('__')[1];
            const mt = mockTests.find(m => m.id === testId);
            if (mt && mt.title.toLowerCase().includes(lowerQ)) mockTitleMatch = true;
          }

          return textMatch || topicMatch || examNameMatch || mockTitleMatch;
        });
      }
      
      return filtered;
    }
    if (activeTab === 'series') return series;
    if (activeTab === 'tests') {
      let filtered = mockTests;
      if (testFilter !== 'all') {
        filtered = filtered.filter(mt => {
          let cat = 'full-length';
          try { if (mt.seriesId) cat = JSON.parse(mt.seriesId).category || 'full-length'; } catch(e){}
          return cat === testFilter;
        });
      }
      if (filterExamId !== 'all') {
        filtered = filtered.filter(mt => {
          let mtExam = '';
          try { if (mt.seriesId) mtExam = JSON.parse(mt.seriesId).examId || ''; } catch(e){}
          return mtExam === filterExamId;
        });
      }
      if (searchQuery.trim()) {
        const lowerQ = searchQuery.toLowerCase();
        filtered = filtered.filter(mt => {
          const titleMatch = (mt.title || '').toLowerCase().includes(lowerQ);
          let examNameMatch = false;
          let catMatch = false;
          try {
            if (mt.seriesId) {
              const parsed = JSON.parse(mt.seriesId);
              const ex = exams.find(e => e.id === parsed.examId);
              if (ex && ex.name.toLowerCase().includes(lowerQ)) examNameMatch = true;
              if (parsed.category && parsed.category.toLowerCase().includes(lowerQ)) catMatch = true;
            }
          } catch(e){}
          
          return titleMatch || examNameMatch || catMatch;
        });
      }
      return filtered;
    }
    if (activeTab === 'exams') {
      let filtered = exams.filter(e => e.name !== 'SYSTEM_SETTINGS_YOUTUBE_RESERVED' && e.category !== 'blog');
      if (examFilter !== 'all') {
        filtered = filtered.filter(e => e.category === examFilter);
      }
      if (searchQuery.trim()) {
        const lowerQ = searchQuery.toLowerCase();
        filtered = filtered.filter(e => 
          (e.name || '').toLowerCase().includes(lowerQ)
        );
      }
      return filtered;
    }
    if (activeTab === 'blogs') {
      let filtered = exams.filter(e => e.category === 'blog');
      if (searchQuery.trim()) {
        const lowerQ = searchQuery.toLowerCase();
        filtered = filtered.filter(e => 
          (e.name || '').toLowerCase().includes(lowerQ)
        );
      }
      return filtered;
    }
    if (activeTab === 'banks') {
      let filtered = banks;
      if (bankFilter !== 'all') {
        filtered = filtered.filter(b => b.type === bankFilter);
      }
      if (filterExamId !== 'all') {
        filtered = filtered.filter(b => b.examId === filterExamId);
      }
      if (searchQuery.trim()) {
        const lowerQ = searchQuery.toLowerCase();
        filtered = filtered.filter(b => {
          const titleMatch = (b.title || '').toLowerCase().includes(lowerQ);
          let examNameMatch = false;
          let catMatch = false;
          if (b.examId) {
             const ex = exams.find(e => e.id === b.examId);
             if (ex && ex.name.toLowerCase().includes(lowerQ)) examNameMatch = true;
          }
          if (b.type && b.type.toLowerCase().includes(lowerQ)) catMatch = true;
          return titleMatch || examNameMatch || catMatch;
        });
      }
      return filtered;
    }
    if (activeTab === 'users') {
      let filtered = users;
      if (searchQuery.trim()) {
        const lowerQ = searchQuery.toLowerCase();
        filtered = filtered.filter(u => 
          (u.email || '').toLowerCase().includes(lowerQ) || 
          (u.displayName || '').toLowerCase().includes(lowerQ)
        );
      }
      return filtered;
    }
    return [];
  }, [activeTab, questions, series, mockTests, exams, banks, users, questionFilter, testFilter, bankFilter, examFilter, filterExamId, searchQuery]);

  // Render modal forms dynamically
  const renderFormFields = () => {
    switch (activeTab) {
      case 'exams':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Exam Name *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold" placeholder="e.g. OPSC Civil Services" />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Category</label>
                <select value={formData.examCategory} onChange={e => setFormData({ ...formData, examCategory: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold bg-white">
                  <option value="popular">Popular</option>
                  <option value="upcoming">Upcoming</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Icon (Emoji or Image URL)</label>
                <input required type="text" value={formData.icon} onChange={e => setFormData({ ...formData, icon: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold" placeholder="🏛️ or https://..." />
              </div>
              {formData.examCategory === 'upcoming' && (
                <div className="space-y-3">
                  <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Exam Date</label>
                  <input type="date" value={formData.examDate} onChange={e => setFormData({ ...formData, examDate: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold" />
                </div>
              )}
            </div>
            <div className="space-y-3 mt-6">
              <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Description *</label>
              <textarea required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold min-h-[100px]" placeholder="Exam details..."></textarea>
            </div>
          </>
        );
      case 'blogs':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Blog Title *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold" placeholder="e.g. How to Crack OPSC 2026" />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Cover Image URL *</label>
                <input required type="url" value={formData.icon} onChange={e => setFormData({ ...formData, icon: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold" placeholder="https://..." />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Publish Date *</label>
                <input required type="date" value={formData.examDate} onChange={e => setFormData({ ...formData, examDate: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold" />
              </div>
            </div>
            <div className="space-y-3 mt-6">
              <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">HTML/Code Content *</label>
              <textarea required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-brand-500 transition-all font-mono min-h-[350px] shadow-inner text-sm" placeholder="<h1>Main Strategy</h1><p>Here is how...</p>"></textarea>
              <p className="text-xs font-semibold text-slate-500">Paste raw HTML here. The frontend will render it automatically.</p>
            </div>
          </>
        );
      case 'series':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Select Exam *</label>
                <SearchableDropdown 
                  required 
                  value={formData.examId} 
                  onChange={v => setFormData({ ...formData, examId: v })} 
                  options={exams.map(ex => ({ value: ex.id as string, label: ex.name }))}
                  placeholder="-- Choose Exam --"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Series Title *</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold" placeholder="e.g. Advanced Mock Series" />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Price (₹) *</label>
                <input required type="number" min="0" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold" />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Duration (Days) *</label>
                <input required type="number" min="1" value={formData.durationDays} onChange={e => setFormData({ ...formData, durationDays: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold" />
              </div>
            </div>
            <div className="space-y-3 mt-6">
              <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Description *</label>
              <textarea required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold min-h-[100px]" placeholder="Series details..."></textarea>
            </div>
          </>
        );
      case 'tests':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Select Exam *</label>
                <SearchableDropdown 
                  required 
                  value={formData.examId} 
                  onChange={v => setFormData({ ...formData, examId: v })} 
                  options={exams.map(ex => ({ value: ex.id as string, label: ex.name }))}
                  placeholder="-- Choose Exam --"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Select Category *</label>
                <select required value={formData.mockCategory} onChange={e => setFormData({ ...formData, mockCategory: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold bg-white">
                  <option value="full-length">Full-Length Mock Tests</option>
                  <option value="sectional">Sectional Tests</option>
                  <option value="pyq">PYQ Tests</option>
                  <option value="daily">Daily / Weekly Tests</option>
                </select>
              </div>
              
              {formData.mockCategory === 'sectional' && (
                <div className="space-y-3">
                  <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Select Subject *</label>
                  <select required value={formData.mockSubject} onChange={e => setFormData({ ...formData, mockSubject: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold bg-white disabled:opacity-50" disabled={!formData.examId}>
                    <option value="">-- Choose Subject --</option>
                    {banks.filter((b: any) => b.examId === formData.examId).map((bank: any) => (
                      <option key={bank.id} value={bank.title}>{bank.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Test Title *</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold" placeholder="e.g. Full Length Mock 1" />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Duration (Mins) *</label>
                <input required type="number" min="1" value={formData.durationMinutes} onChange={e => setFormData({ ...formData, durationMinutes: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold" />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Total Marks *</label>
                <input required type="number" min="1" value={formData.totalMarks} onChange={e => setFormData({ ...formData, totalMarks: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold" />
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="isPremiumTest" checked={formData.isPremium} onChange={e => setFormData({ ...formData, isPremium: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                <label htmlFor="isPremiumTest" className="text-sm font-extrabold text-slate-700 uppercase tracking-wider cursor-pointer">Is Premium / Locked Content?</label>
              </div>
              {formData.isPremium && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
                  <div className="space-y-3">
                    <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Original Price (₹) *</label>
                    <input required type="number" min="0" value={formData.originalPrice} onChange={e => setFormData({ ...formData, originalPrice: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-200 outline-none focus:border-slate-400 transition-all font-bold bg-slate-50" placeholder="e.g. 999" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-extrabold text-brand-700 uppercase tracking-wider">Discounted Price (₹) *</label>
                    <input required type="number" min="0" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-brand-100 outline-none focus:border-brand-500 transition-all font-bold bg-white" placeholder="e.g. 499" />
                  </div>
                </div>
              )}
            </div>
          </>
        );
      case 'banks':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Select Exam *</label>
                <SearchableDropdown 
                  required 
                  value={formData.examId} 
                  onChange={v => setFormData({ ...formData, examId: v })} 
                  options={exams.map(ex => ({ value: ex.id as string, label: ex.name }))}
                  placeholder="-- Choose Exam --"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Bank Title *</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold" placeholder="e.g. Indian Polity" />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Bank Type *</label>
                <select required value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold bg-white">
                  <option value="topic-wise">Topic-wise</option>
                  <option value="exam-focused">Exam-Focused</option>
                  <option value="revision-sets">Revision Sets</option>
                  <option value="pyq-collections">PYQ Collections</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Questions Count</label>
                <input type="number" value={formData.questionCount} onChange={e => setFormData({ ...formData, questionCount: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold" />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Tagline</label>
                <input type="text" value={formData.tagline} onChange={e => setFormData({ ...formData, tagline: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold" placeholder="e.g. Concept-Focused Practice" />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Image URL</label>
                <input type="text" value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold" placeholder="https://..." />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">PDF Download URL</label>
                <input type="text" value={formData.pdfUrl} onChange={e => setFormData({ ...formData, pdfUrl: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold" placeholder="Link to PDF..." />
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="isPremium" checked={formData.isPremium} onChange={e => setFormData({ ...formData, isPremium: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                <label htmlFor="isPremium" className="text-sm font-extrabold text-slate-700 uppercase tracking-wider cursor-pointer">Is Premium / Locked Content?</label>
              </div>
              {formData.isPremium && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
                  <div className="space-y-3">
                    <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Original Price (₹) *</label>
                    <input required type="number" min="0" value={formData.originalPrice} onChange={e => setFormData({ ...formData, originalPrice: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-200 outline-none focus:border-slate-400 transition-all font-bold bg-slate-50" placeholder="e.g. 999" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-extrabold text-brand-700 uppercase tracking-wider">Discounted Price (₹) *</label>
                    <input required type="number" min="0" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-brand-100 outline-none focus:border-brand-500 transition-all font-bold bg-white" placeholder="e.g. 499" />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                <input type="checkbox" id="hasPracticeMode" checked={formData.hasPracticeMode} onChange={e => setFormData({ ...formData, hasPracticeMode: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                <label htmlFor="hasPracticeMode" className="text-sm font-extrabold text-slate-700 uppercase tracking-wider cursor-pointer">Enable "Practice Now" Feature?</label>
              </div>
            </div>
          </>
        );
      case 'questions':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Select Exam *</label>
                <SearchableDropdown 
                  required 
                  value={formData.examId} 
                  onChange={v => setFormData({ ...formData, examId: v })} 
                  options={exams.map(ex => ({ value: ex.id as string, label: ex.name }))}
                  placeholder="-- Choose Exam --"
                />
              </div>
              { ((formData.topic || '').toLowerCase().startsWith('mocktest__') || questionFilter === 'mock') ? (
                <>
                  <div className="space-y-3">
                    <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Select Category *</label>
                    <select 
                      required 
                      value={formData.mockCategory || 'full-length'} 
                      onChange={e => setFormData({ ...formData, mockCategory: e.target.value })} 
                      className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold bg-white"
                    >
                      <option value="full-length">Full-Length Mock Tests</option>
                      <option value="sectional">Sectional Tests</option>
                      <option value="pyq">PYQ Tests</option>
                      <option value="daily">Daily / Weekly Tests</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Test Title *</label>
                    <select 
                      required 
                      value={formData.topic} 
                      onChange={e => setFormData({ ...formData, topic: e.target.value })} 
                      className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold bg-white disabled:opacity-50"
                      disabled={!formData.examId}
                    >
                      <option value="">-- Choose Mock Test --</option>
                      {mockTests
                        .filter((mt: any) => {
                           let cat = 'full-length';
                           let mExam = '';
                           try { 
                             if (mt.seriesId) {
                               const parsed = JSON.parse(mt.seriesId);
                               cat = parsed.category || 'full-length';
                               mExam = parsed.examId || '';
                             }
                           } catch(e){}
                           return mExam === formData.examId && cat === (formData.mockCategory || 'full-length');
                        })
                        .map((mt: any) => (
                        <option key={mt.id} value={`mockTest__${mt.id}`}>{mt.title}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Topic *</label>
                    <select 
                      required 
                      value={formData.topic} 
                      onChange={e => setFormData({ ...formData, topic: e.target.value })} 
                      className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold bg-white disabled:opacity-50"
                      disabled={!formData.examId}
                    >
                      <option value="">-- Choose Topic --</option>
                      {banks.filter((b: any) => b.examId === formData.examId).map((bank: any) => (
                        <option key={bank.id} value={bank.title}>{bank.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Difficulty *</label>
                    <select required value={formData.difficulty} onChange={e => setFormData({ ...formData, difficulty: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold bg-white">
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="space-y-3">
              <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Question Text *</label>
              <textarea required value={formData.questionText} onChange={e => setFormData({ ...formData, questionText: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold min-h-[80px]" placeholder="Enter question..." />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Option {i + 1}</label>
                  <input required type="text" value={formData.options[i]} onChange={e => handleOptionChange(i, e.target.value)} className="w-full px-4 py-2 rounded-xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold" />
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Correct Answer *</label>
              <select required value={formData.correctAnswerIndex} onChange={e => setFormData({ ...formData, correctAnswerIndex: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold bg-white">
                <option value={0}>Option 1</option>
                <option value={1}>Option 2</option>
                <option value={2}>Option 3</option>
                <option value={3}>Option 4</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Explanation *</label>
              <textarea required value={formData.explanation} onChange={e => setFormData({ ...formData, explanation: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold min-h-[80px]" placeholder="Explain the answer..." />
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  // Column helper
  const renderTableRow = (item: any) => {
    let title = '';
    let category = '';
    let details = '';

    if (activeTab === 'questions') {
      title = item.questionText;
      
      const examObj = exams.find(e => e.id === item.examId);
      const examName = examObj ? examObj.name : 'Unknown Exam';
      
      const t = (item.topic || '').toLowerCase();
      if (t.startsWith('mocktest__')) {
        const testId = item.topic.split('__')[1];
        const mt = mockTests.find(m => m.id === testId);
        if (mt) {
          category = `${examName} > Mock Test > ${mt.title}`;
        } else {
          category = `${examName} > Mock Test (Orphaned)`;
        }
      } else {
        category = `${examName} > ${item.topic}`;
      }
      
      details = `Diff: ${item.difficulty}`;
    } else if (activeTab === 'series') {
      title = item.title;
      category = `Duration: ${item.durationDays}d`;
      details = `Price: ₹${item.price}`;
    } else if (activeTab === 'tests') {
      title = item.title;
      category = `${item.durationMinutes} mins`;
      let isPremium = false;
      try { if (item.seriesId) isPremium = JSON.parse(item.seriesId).isPremium; } catch(e){}
      details = `Marks: ${item.totalMarks} | ${isPremium ? 'Premium' : 'Free'}`;
    } else if (activeTab === 'exams') {
      title = item.name;
      category = item.category;
      details = item.examDate || 'No Date';
    } else if (activeTab === 'blogs') {
      title = item.name;
      category = 'Blog Post';
      details = item.examDate || 'No Date';
    } else if (activeTab === 'banks') {
      title = item.title;
      category = item.type;
      details = item.isPremium ? 'Premium' : 'Free';
    }

    if (activeTab === 'users') {
      return (
        <tr key={item.uid} className="hover:bg-brand-50/30 transition-colors group border-b border-slate-100">
          <td className="px-8 py-6">
            <div className="flex items-center gap-4">
              {item.photoURL ? (
                <img src={item.photoURL} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">
                  {(item.displayName || item.email || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-extrabold text-slate-900">{item.displayName || 'Unnamed User'}</div>
                <div className="text-sm text-slate-500">{item.email}</div>
              </div>
            </div>
          </td>
          <td className="px-8 py-6">
            <span className={cn("px-3 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider text-nowrap", item.role === 'admin' ? "bg-purple-100 text-purple-700 border border-purple-200" : "bg-slate-100 text-slate-600 border border-slate-200")}>
              {item.role === 'admin' ? 'Admin' : 'Student'}
            </span>
            <div className="mt-2 text-xs font-bold text-slate-500">
               Global Access: {item.hasFullAccess ? <span className="text-green-600">Full</span> : 'Restricted'}
            </div>
          </td>
          <td className="px-8 py-6 text-sm text-slate-700">
            <div className="font-bold mb-2 text-xs uppercase text-slate-500">Purchases ({item.purchasedSeries?.length || 0}):</div>
            <div className="flex gap-2 flex-wrap max-w-xs cursor-pointer">
              {item.purchasedSeries?.length === 0 && <span className="text-slate-400 font-medium italic text-xs">No active purchases.</span>}
              {(item.purchasedSeries || []).map((p: string) => {
                const s = series.find(x => x.id === p);
                const b = banks.find(x => x.id === p);
                const m = mockTests.find(x => x.id === p);
                const name = s?.title || b?.title || m?.title || p;
                return (
                  <span key={p} className="flex flex-col bg-brand-50 border border-brand-200 text-brand-700 px-2 py-1 rounded-md text-xs font-bold shadow-sm">
                    <span className="line-clamp-2" title={name}>{name}</span>
                    <button onClick={async (e) => {
                       e.stopPropagation();
                       if (!confirm(`Are you manually revoking content access to ${name} for ${item.email}?`)) return;
                       const newPurchased = item.purchasedSeries.filter((id: string) => id !== p);
                       await supabase.from('users').update({ purchasedSeries: newPurchased }).eq('uid', item.uid);
                       alert('Access revoked successfully.');
                       fetchData();
                    }} className="text-red-500 hover:text-red-700 text-[10px] uppercase mt-1 border-t border-brand-200/50 pt-0.5 self-start">Revoke</button>
                  </span>
                );
              })}
            </div>
          </td>
          <td className="px-8 py-6 text-right">
            <div className="flex flex-col gap-2 justify-end items-end w-44 ml-auto">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setPasswordTargetUser(item);
                  setNewPasswordValue("");
                  setShowPasswordModal(true);
                }}
                className="px-3 py-1.5 text-brand-600 bg-brand-50 hover:text-white hover:bg-brand-600 rounded-lg transition-all text-[10px] uppercase font-black border border-brand-200 shadow-sm whitespace-nowrap"
              >
                Force Set Password
              </button>
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm(`Are you sure you want to globally ${item.hasFullAccess ? 'revoke' : 'grant'} full system access to ${item.email}?`)) return;
                  const newAccess = !item.hasFullAccess;
                  await supabase.from('users').update({ hasFullAccess: newAccess }).eq('uid', item.uid);
                  fetchData();
                }}
                className="w-full text-center px-3 py-1.5 text-slate-600 bg-slate-50 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-all text-xs font-bold border border-slate-200 shadow-sm"
              >
                {item.hasFullAccess ? 'Revoke Master Access' : 'Grant Master Access'}
              </button>
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr key={item.id} className="hover:bg-brand-50/30 transition-colors group">
        <td className="px-8 py-6">
          <div className="font-extrabold text-slate-900 text-lg line-clamp-2 max-w-md">
            {title}
          </div>
          <div className="text-sm text-slate-500 font-medium mt-1">
            ID: {item.id?.slice(0, 8)}...
          </div>
        </td>
        <td className="px-8 py-6">
          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-extrabold border border-slate-200 uppercase tracking-wider">
            {category}
          </span>
        </td>
        <td className="px-8 py-6 text-sm font-bold text-slate-700">
          {details}
        </td>
        <td className="px-8 py-6 text-right">
          <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            {['tests', 'series'].includes(activeTab) && (
              <button 
                onClick={async (e) => {
                   e.stopPropagation();
                   if (!confirm('DANGER ZONE: Are you sure you want to revoke access to this content for EVERY SINGLE USER who purchased it? They will need to repurchase it if you add it to a new cycle.')) return;
                   
                   let count = 0;
                   for (const u of users) {
                      if (u.purchasedSeries?.includes(item.id)) {
                         const newPurchased = u.purchasedSeries.filter((p: string) => p !== item.id);
                         await supabase.from('users').update({ purchasedSeries: newPurchased }).eq('uid', u.uid);
                         count++;
                      }
                   }
                   if (count > 0) alert(`Successfully revoked access from ${count} users.`);
                   else alert('No users currently hold access to this item.');
                   fetchData();
                }}
                className="p-2.5 text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition-all"
                title="Revoke Content for All Users"
              >
                <Users className="w-5 h-5 pointer-events-none" />
              </button>
            )}
            {activeTab === 'tests' && (
              <button 
                onClick={() => {
                   setAttachMockTestId(item.id);
                   setShowMockUploadModal(true);
                }}
                className="p-2.5 text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-xl transition-all"
                title="Upload Questions JSON"
              >
                <Upload className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={(e) => handleEditClick(item, e)}
              className="p-2.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button 
              onClick={(e) => handleDelete(item.id, e)}
              className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="fixed inset-0 bg-[#F8FAFC] z-50 flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 glass border-b border-slate-200/50 flex items-center justify-between px-6 shrink-0 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-extrabold text-slate-950 tracking-tight">Admin <span className="premium-text-gradient">Control Center</span></h1>
          <div className="h-6 w-px bg-slate-200" />
          <nav className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
             {[
              { id: 'exams', label: 'Exams', icon: Award },
              { id: 'blogs', label: 'Blog Posts', icon: FileText },
              { id: 'banks', label: 'Content Banks', icon: BookMarked },
              { id: 'series', label: 'Test Series', icon: Layers },
              { id: 'tests', label: 'Mock Tests', icon: Check },
              { id: 'questions', label: 'Questions', icon: FileText },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'settings', label: 'Site Settings', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold transition-all whitespace-nowrap",
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
           <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 shadow-sm">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-8 sm:p-12">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <h2 className="text-4xl font-extrabold text-slate-950 capitalize tracking-tight">{activeTab} Manager</h2>
              <p className="text-slate-500 font-medium text-lg">Manage your {activeTab} data efficiently.</p>
            </div>
            <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2 items-center flex-nowrap">
              {['questions', 'tests', 'banks', 'exams', 'series', 'blogs'].includes(activeTab) && (
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium w-40 outline-none focus:border-brand-500 bg-white flex-shrink-0"
                />
              )}
              {['questions', 'tests', 'banks', 'series'].includes(activeTab) && (
                <select
                  value={filterExamId}
                  onChange={(e) => setFilterExamId(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold bg-white text-slate-700 outline-none focus:border-brand-500 w-32 flex-shrink-0"
                >
                  <option value="all">All Exams</option>
                  {exams.map(ex => <option key={ex.id} value={ex.id as string}>{ex.name}</option>)}
                </select>
              )}
              {activeTab === 'questions' && (
                <>
                  <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl mr-2 h-10 border border-slate-200/50 flex-shrink-0">
                    <button onClick={() => setQuestionFilter('all')} className={cn("px-4 py-1.5 rounded-lg text-sm font-bold transition-all h-full", questionFilter === 'all' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>All</button>
                    <button onClick={() => setQuestionFilter('practice')} className={cn("px-4 py-1.5 rounded-lg text-sm font-bold transition-all h-full", questionFilter === 'practice' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>Practice</button>
                    <button onClick={() => setQuestionFilter('mock')} className={cn("px-4 py-1.5 rounded-lg text-sm font-bold transition-all h-full", questionFilter === 'mock' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>Mock Tests</button>
                  </div>
                  <button 
                    onClick={() => setShowBulkUploadModal(true)}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 glass border border-slate-200 rounded-xl text-sm font-extrabold hover:bg-white transition-all premium-shadow flex-shrink-0"
                  >
                    <Upload className="w-4 h-4" /> Bulk Upload
                  </button>
                </>
              )}
              {activeTab === 'tests' && (
                <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl mr-2 h-10 border border-slate-200/50 flex-shrink-0">
                  <button onClick={() => setTestFilter('all')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all h-full", testFilter === 'all' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>All</button>
                  <button onClick={() => setTestFilter('full-length')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all h-full", testFilter === 'full-length' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>Full-Length</button>
                  <button onClick={() => setTestFilter('sectional')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all h-full", testFilter === 'sectional' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>Sectional</button>
                  <button onClick={() => setTestFilter('pyq')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all h-full", testFilter === 'pyq' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>PYQ</button>
                  <button onClick={() => setTestFilter('daily')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all h-full", testFilter === 'daily' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>Daily</button>
                </div>
              )}
              {activeTab === 'banks' && (
                <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl mr-2 h-10 border border-slate-200/50 flex-shrink-0">
                  <button onClick={() => setBankFilter('all')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all h-full", bankFilter === 'all' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>All</button>
                  <button onClick={() => setBankFilter('topic-wise')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all h-full", bankFilter === 'topic-wise' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>Topic-Wise</button>
                  <button onClick={() => setBankFilter('exam-focused')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all h-full", bankFilter === 'exam-focused' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>Exam-Focused</button>
                  <button onClick={() => setBankFilter('revision-sets')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all h-full", bankFilter === 'revision-sets' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>Revision Sets</button>
                  <button onClick={() => setBankFilter('pyq-collections')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all h-full", bankFilter === 'pyq-collections' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>PYQ</button>
                </div>
              )}
              {activeTab === 'exams' && (
                <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl mr-2 h-10 border border-slate-200/50 flex-shrink-0">
                  <button onClick={() => setExamFilter('all')} className={cn("px-4 py-1.5 rounded-lg text-sm font-bold transition-all h-full", examFilter === 'all' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>All</button>
                  <button onClick={() => setExamFilter('popular')} className={cn("px-4 py-1.5 rounded-lg text-sm font-bold transition-all h-full", examFilter === 'popular' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>Popular</button>
                  <button onClick={() => setExamFilter('upcoming')} className={cn("px-4 py-1.5 rounded-lg text-sm font-bold transition-all h-full", examFilter === 'upcoming' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>Upcoming</button>
                </div>
              )}
              <button 
                onClick={() => {
                  setEditingId(null);
                  setFormData(initialFormData);
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-8 py-2.5 premium-gradient text-white rounded-xl text-sm font-extrabold hover:premium-glow shadow-lg shadow-brand-500/20 transition-all active:scale-95"
              >
                <Plus className="w-5 h-5" /> Add New
              </button>
            </div>
          </div>

          {/* Table View */}
          {activeTab === 'settings' ? (
             <div className="glass rounded-[2rem] border border-slate-200/50 shadow-xl overflow-hidden bg-white/70 p-8 sm:p-12 space-y-8">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">YouTube Carousel Integration</h3>
                  <p className="text-slate-500 font-medium mt-2 text-lg">Manage the YouTube videos displayed on the main student dashboard.</p>
                </div>
                
                <div className="bg-brand-50 p-5 rounded-2xl border border-brand-100 flex gap-4 items-start shadow-sm">
                  <AlertCircle className="w-6 h-6 text-brand-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-extrabold text-slate-800">You can paste full YouTube links securely!</p>
                    <p className="text-sm font-medium text-slate-600">
                      Just paste the <b>full YouTube URL</b> (e.g. <span className="text-brand-600 font-mono">https://youtu.be/dQw4w9WgXcQ?si=RandomTracker</span>). The system will automatically extract the secure <span className="text-brand-600 font-mono">11-character</span> Video ID. Put one link per line.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Active Video IDs</label>
                  <textarea 
                     rows={8}
                     className="w-full px-6 py-5 rounded-2xl border-2 border-slate-200 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-mono shadow-inner bg-white text-slate-700 font-bold"
                     placeholder="dQw4w9WgXcQ&#10;jNQXAC9IVRw&#10;EngW7tCbLHY"
                     value={youtubeVideosInput}
                     onChange={e => setYoutubeVideosInput(e.target.value)}
                  />
                </div>
                
                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button onClick={async () => {
                     try {
                        const parsedIds = youtubeVideosInput.split('\n')
                           .map(s => {
                              const str = s.trim();
                              if (!str) return null;
                              
                              // Extract exactly 11 characters from any standard youtube URL
                              const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\n]{11})/);
                              if (match && match[1]) return match[1];
                              
                              // If they pasted just the 11 character string directly
                              if (str.length === 11) return str;
                              
                              return 'INVALID';
                           })
                           .filter(Boolean);
                           
                        if (parsedIds.includes('INVALID')) {
                           alert('Error: One or more of your lines is not a valid 11-character YouTube Video ID or URL. (Do not paste the 16-character tracking ID!). Please paste the FULL YouTube links instead to let the system extract it automatically.');
                           return;
                        }

                        const updated = {
                           name: 'SYSTEM_SETTINGS_YOUTUBE_RESERVED',
                           description: JSON.stringify({ videos: parsedIds }),
                           icon: '⚙️',
                           category: 'upcoming' as const
                        };
                        const exists = exams.find(e => e.name === 'SYSTEM_SETTINGS_YOUTUBE_RESERVED');
                        if (exists && exists.id) {
                           await examService.updateExam(exists.id, updated);
                        } else {
                           await examService.addExam(updated);
                        }
                        alert("Great! Your YouTube configuration was securely saved and published globally.");
                     } catch(err: any) { alert(`Failed to save settings: ${err.message || 'Unknown error'}`); }
                  }} className="px-10 py-3.5 premium-gradient text-white font-extrabold rounded-xl shadow-lg shadow-brand-500/20 hover:premium-glow transition-all active:scale-95 text-lg">Save YouTube Library</button>
                </div>
             </div>
          ) : (
          <div className="glass rounded-[2rem] border border-slate-200/50 shadow-xl overflow-hidden bg-white/70">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100/50 border-b border-slate-200/60">
                <tr>
                  <th className="px-8 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-widest w-1/2">Basic Info</th>
                  <th className="px-8 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-widest w-1/4">Category/Topic</th>
                  <th className="px-8 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-widest">Details</th>
                  <th className="px-8 py-5 text-xs font-extrabold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center gap-4 text-slate-400">
                        <AlertCircle className="w-12 h-12 text-slate-300" />
                        <p className="font-extrabold text-xl text-slate-500">No items found in {activeTab}</p>
                        <button onClick={() => { setEditingId(null); setFormData(initialFormData); setShowAddModal(true); }} className="text-brand-600 hover:text-brand-700 font-extrabold text-sm underline mt-2">Create the first record</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map(renderTableRow)
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </main>

      {/* Bulk Upload Modal */}
      <AnimatePresence>
        {showBulkUploadModal && (
          <div className="fixed inset-0 bg-slate-950/40 z-[60] flex items-center justify-center p-4 backdrop-blur-sm pt-20">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto premium-shadow border border-slate-100 my-auto"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                      <Upload className="w-5 h-5 text-brand-600" />
                    </div>
                    Bulk Upload Questions
                  </h3>
                  <button onClick={() => setShowBulkUploadModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Target Exam *</label>
                      <SearchableDropdown 
                        required 
                        value={bulkExamId} 
                        onChange={v => setBulkExamId(v)} 
                        options={exams.map(ex => ({ value: ex.id as string, label: ex.name }))}
                        placeholder="-- Choose Exam --"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Target Topic *</label>
                      <select 
                        required 
                        value={bulkTopic} 
                        onChange={e => setBulkTopic(e.target.value)} 
                        className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold bg-white disabled:opacity-50"
                        disabled={!bulkExamId}
                      >
                        <option value="">-- Choose Topic --</option>
                        {banks.filter((b: any) => b.examId === bulkExamId).map((bank: any) => (
                          <option key={bank.id} value={bank.title}>{bank.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Upload JSON File</label>
                    <div className="relative p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
                      <input 
                        type="file" 
                        accept=".json"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (event) => setBulkFileContent(event.target?.result as string);
                          reader.readAsText(file);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2 group-hover:text-brand-500 transition-colors" />
                      <p className="text-sm font-extrabold text-slate-700">Click or drag JSON file here</p>
                      <p className="text-xs text-slate-500 mt-2 font-medium">Or paste JSON directly below</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Pasted JSON Content</label>
                    <textarea 
                      value={bulkFileContent}
                      onChange={(e) => setBulkFileContent(e.target.value)}
                      className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-mono text-sm min-h-[150px] bg-slate-50" 
                      placeholder="[ { &quot;questionText&quot;: &quot;...&quot;, &quot;options&quot;: [&quot;A&quot;, &quot;B&quot;, &quot;C&quot;], &quot;correctAnswerIndex&quot;: 0, &quot;explanation&quot;: &quot;&quot; } ]"
                    />
                    <p className="text-xs font-bold text-brand-600 bg-brand-50 p-3 rounded-xl border border-brand-100">
                      Format: JSON Array of Objects with keys: questionText, options (array of strings), correctAnswerIndex (0-3), explanation (optional).
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                  <button onClick={() => setShowBulkUploadModal(false)} className="px-6 py-3 rounded-xl font-extrabold text-slate-600 hover:bg-slate-100 transition-all border-2 border-slate-200">Cancel</button>
                  <button onClick={handleBulkUpload} className="px-8 py-3 premium-gradient text-white rounded-xl font-extrabold shadow-lg shadow-brand-500/20 hover:premium-glow transition-all">Upload & Save</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-950/40 z-[60] flex items-center justify-center p-6 backdrop-blur-sm overflow-y-auto pt-20">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className={cn(
                "glass rounded-[2rem] w-full overflow-hidden shadow-2xl border-white/60 bg-white my-auto",
                activeTab === 'questions' ? 'max-w-4xl' : 'max-w-3xl'
              )}
            >
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-brand-100 text-brand-600 rounded-lg">
                      <Plus className="w-5 h-5" />
                   </div>
                   <h3 className="font-extrabold text-2xl tracking-tight text-slate-900">
                     {editingId ? 'Edit ' : 'Add New '}
                     <span className="text-brand-600 capitalize">{activeTab}</span>
                   </h3>
                </div>
                <button type="button" onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-800 rounded-xl transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAdd} className="p-8 sm:p-10">
                
                {renderFormFields()}

                <div className="flex justify-end gap-4 mt-10 pt-6 border-t border-slate-100">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-8 py-3 rounded-xl border-2 border-slate-200 font-extrabold text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all">Cancel</button>
                  <button type="submit" className="px-10 py-3 rounded-xl premium-gradient text-white font-extrabold hover:premium-glow shadow-lg shadow-brand-500/20 transition-all active:scale-95">Save {activeTab}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mock Test Bulk Upload Modal */}
      <AnimatePresence>
        {showMockUploadModal && (
          <div className="fixed inset-0 bg-slate-950/40 z-[70] flex items-center justify-center p-6 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="glass rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl border-white/60 bg-white"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-brand-100 text-brand-600 rounded-lg">
                      <Upload className="w-5 h-5" />
                   </div>
                   <h3 className="font-extrabold text-xl text-slate-900 tracking-tight">Upload Mock Test Questions</h3>
                </div>
                <button onClick={() => setShowMockUploadModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-xl">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                
                <div className="space-y-3">
                  <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider flex justify-between">
                    <span>Paste JSON Array</span>
                  </label>
                  <textarea 
                    value={bulkFileContent} 
                    onChange={e => setBulkFileContent(e.target.value)}
                    className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 focus:border-brand-500 min-h-[250px] font-mono text-sm" 
                    placeholder="[ { questionText: '...', options: ['A','B','C','D'], correctAnswerIndex: 0, explanation: '...' } ]" 
                  />
                </div>
                
                <div className="flex justify-end gap-4 pt-4 border-t border-slate-100">
                  <button onClick={() => setShowMockUploadModal(false)} className="px-8 py-3 rounded-xl border-2 border-slate-200 font-extrabold text-slate-600 hover:bg-slate-100 relative">Cancel</button>
                  <button onClick={handleMockBulkUpload} className="px-10 py-3 rounded-xl premium-gradient text-white font-extrabold hover:premium-glow shadow-lg transition-all">Upload Questions</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Force Set Password Modal */}
      <AnimatePresence>
        {showPasswordModal && passwordTargetUser && (
          <div className="fixed inset-0 bg-slate-950/40 z-[80] flex items-center justify-center p-6 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="glass rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border-white/60 bg-white"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                      <AlertCircle className="w-5 h-5" />
                   </div>
                   <h3 className="font-extrabold text-xl text-slate-900 tracking-tight">Force Set Password</h3>
                </div>
                <button onClick={() => setShowPasswordModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-xl">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                   <p className="text-sm font-bold text-red-800">You are manually overriding the password for:</p>
                   <p className="text-sm font-mono text-red-600 mt-1">{passwordTargetUser.email}</p>
                   <p className="text-xs text-red-700/80 mt-2 font-medium">To enforce security policies, you MUST have the Service Role Key configured in your environment to perform this administrative override.</p>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">New Password</label>
                  <input 
                    type="text"
                    value={newPasswordValue}
                    onChange={e => setNewPasswordValue(e.target.value)}
                    className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 focus:border-brand-500 font-bold" 
                    placeholder="Enter new secure password" 
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button onClick={() => setShowPasswordModal(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 font-extrabold text-slate-600 hover:bg-slate-100">Cancel</button>
                  <button onClick={async () => {
                     if (!newPasswordValue || newPasswordValue.length < 6) return alert('Password must be at least 6 characters.');
                     
                     // Requires Service Role Key to bypass Auth limits
                     const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
                     if (!supabaseServiceKey) {
                        return alert('ACTION REQUIRED: To force-change user passwords directly from the browser, you MUST add "VITE_SUPABASE_SERVICE_ROLE_KEY" to your .env file. The Anon key does not have permission to modify other users credentials.');
                     }
                     
                     try {
                        const { createClient } = await import('@supabase/supabase-js');
                        const supabaseAdminLocal = createClient(import.meta.env.VITE_SUPABASE_URL, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } });
                        
                        const { error } = await supabaseAdminLocal.auth.admin.updateUserById(
                           passwordTargetUser.uid,
                           { password: newPasswordValue }
                        );
                        if (error) throw error;
                        
                        alert(`Success! Password for ${passwordTargetUser.email} has been forcibly changed to: ${newPasswordValue}`);
                        setShowPasswordModal(false);
                     } catch(err: any) {
                        alert(`Error: ${err.message}`);
                     }
                  }} className="px-8 py-2.5 bg-red-600 text-white font-extrabold rounded-xl hover:bg-red-700 shadow-sm transition-all">Update Password</button>
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
