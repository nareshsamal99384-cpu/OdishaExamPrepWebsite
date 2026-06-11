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
  BookMarked,
  GripVertical,
  Bell
} from 'lucide-react';
import { Reorder } from 'framer-motion';
import { examService, Question, TestSeries, MockTest, Exam } from './lib/examService';
import { cn } from './lib/utils';
import { supabase } from './lib/supabase';
import { dropdown, modalContent, scaleIn } from './lib/animations';

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
          <motion.div {...dropdown}
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
  const [activeTab, setActiveTab] = useState<'questions' | 'series' | 'tests' | 'exams' | 'banks' | 'users' | 'updates'>('exams');
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
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantTargetUser, setGrantTargetUser] = useState<any>(null);
  const [grantSelectedExamId, setGrantSelectedExamId] = useState("");
  const [grantSelectedCategory, setGrantSelectedCategory] = useState("bundle");
  const [grantSelectedContentId, setGrantSelectedContentId] = useState("");
  const [items, setItems] = useState<any[]>([]);

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
    pdfLinks: [] as { title: string; url: string }[],
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
    negativeMarking: 0,
    
    // Question
    topic: '',
    difficulty: 'medium',
    questionText: '',
    options: ['', '', '', ''],
    correctAnswerIndex: 0,
    explanation: '',
    targetExamId: '',
    
    // SEO
    metaTitle: '',
    metaDescription: '',
    keywords: ''
  };

  const [formData, setFormData] = useState<any>(initialFormData);
  const [youtubeVideosInput, setYoutubeVideosInput] = useState('');
  const [newsUpdatesInput, setNewsUpdatesInput] = useState('');

  // Hero Card state
  const DEFAULT_HERO_CARD = {
    examLabel: 'OPSC Prelims Mock',
    questionNumber: 'Q. 42',
    questionText: 'The historical Sun Temple of Konark, a UNESCO World Heritage site, was constructed by which ruler of the Eastern Ganga Dynasty?',
    options: ['Anantavarman Chodagangadeva', 'Narasimhadeva I', 'Kapilendradeva', 'Purushottamadeva'],
    correctIndex: 1,
    explanation: 'King Langula Narasimhadeva I built the Konark Sun Temple in the 13th century (circa 1250 CE) to celebrate his military victories.',
    marks: 1.00,
    penalty: 0.25,
  };
  const [heroCard, setHeroCard] = useState<any>(DEFAULT_HERO_CARD);
  
  const DEFAULT_NEWS_UPDATES = [
    `🚀 New Mock Test Series released for OSSC CGL ${new Date().getFullYear()}`,
    "📅 OPSC Prelims exam dates announced - Check latest schedule",
    "⭐ 500+ New PYQs added for OSSSC recruitment exams",
    "🔥 Weekly Current Affairs PDF now available for download",
    "✅ Real-time rank analysis enabled for all premium mock tests"
  ].join('\n');

  const fetchData = async () => {
    setLoading(true);
    try {
      let usersFetchPromise = Promise.resolve([] as any[]);
      const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseServiceKey) {
         try {
           const { createClient } = await import('@supabase/supabase-js');
           const supabaseAdminLocal = createClient(import.meta.env.VITE_SUPABASE_URL, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } });
           
           usersFetchPromise = supabaseAdminLocal.auth.admin.listUsers().then(res => res.data.users || []).then(authUsers => {
              return authUsers.map(au => ({
                 uid: au.id,
                 email: au.email,
                 displayName: au.user_metadata?.displayName || au.user_metadata?.full_name || au.user_metadata?.name || au.email?.split('@')[0],
                 photoURL: au.user_metadata?.photoURL || au.user_metadata?.avatar_url || au.user_metadata?.picture,
                 role: au.user_metadata?.role || 'user',
                 hasFullAccess: !!au.user_metadata?.hasFullAccess,
                 purchasedSeries: au.user_metadata?.purchasedSeries || []
              }));
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

      const newsSettings = ex.find(e => e.name === 'SYSTEM_SETTINGS_NEWS_TICKER');
      if (newsSettings && newsSettings.description) {
        try {
          const parsed = JSON.parse(newsSettings.description);
          if (parsed.updates) setNewsUpdatesInput(parsed.updates.join('\n'));
        } catch(e) {}
      } else {
        setNewsUpdatesInput(DEFAULT_NEWS_UPDATES);
      }

      const heroSettings = ex.find(e => e.name === 'SYSTEM_SETTINGS_HERO_CARD');
      if (heroSettings && heroSettings.description) {
        try {
          const parsed = JSON.parse(heroSettings.description);
          setHeroCard({ ...DEFAULT_HERO_CARD, ...parsed });
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

  useEffect(() => {
    let list: any[] = [];
    if (activeTab === 'questions') {
      let filtered = questions;
      if (questionFilter === 'practice') {
        filtered = filtered.filter(q => !(q.topic || '').toLowerCase().startsWith('mocktest__'));
      } else if (questionFilter === 'mock') {
        filtered = filtered.filter(q => (q.topic || '').toLowerCase().startsWith('mocktest__'));
      }
      if (filterExamId !== 'all') filtered = filtered.filter(q => q.examId === filterExamId);
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
      list = filtered;
    } else if (activeTab === 'series') {
       let filtered = series;
       if (filterExamId !== 'all') filtered = filtered.filter(s => s.examId === filterExamId);
       if (searchQuery.trim()) {
         const lowerQ = searchQuery.toLowerCase();
         filtered = filtered.filter(s => (s.title || '').toLowerCase().includes(lowerQ));
       }
       list = filtered;
    } else if (activeTab === 'tests') {
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
      list = filtered;
    } else if (activeTab === 'exams') {
      let filtered = exams.filter(e => e.name !== 'SYSTEM_SETTINGS_YOUTUBE_RESERVED' && e.category !== 'blog');
      if (examFilter !== 'all') filtered = filtered.filter(e => e.category === examFilter);
      if (searchQuery.trim()) {
        const lowerQ = searchQuery.toLowerCase();
        filtered = filtered.filter(e => (e.name || '').toLowerCase().includes(lowerQ));
      }
      list = filtered;
    } else if (activeTab === 'blogs') {
      let filtered = exams.filter(e => e.category === 'blog');
      if (searchQuery.trim()) {
        const lowerQ = searchQuery.toLowerCase();
        filtered = filtered.filter(e => (e.name || '').toLowerCase().includes(lowerQ));
      }
      list = filtered;
    } else if (activeTab === 'banks') {
      let filtered = banks;
      if (bankFilter !== 'all') filtered = filtered.filter(b => b.type === bankFilter);
      if (filterExamId !== 'all') filtered = filtered.filter(b => b.examId === filterExamId);
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
      list = filtered;
    } else if (activeTab === 'users') {
      let filtered = users;
      if (searchQuery.trim()) {
        const lowerQ = searchQuery.toLowerCase();
        filtered = filtered.filter(u => 
          (u.email || '').toLowerCase().includes(lowerQ) || 
          (u.displayName || '').toLowerCase().includes(lowerQ)
        );
      }
      list = filtered;
    }
    
    // Sort local items by sortOrder if available
    const sorted = [...list].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    setItems(sorted);
  }, [activeTab, questions, series, mockTests, exams, banks, users, filterExamId, searchQuery, examFilter, questionFilter, testFilter, bankFilter]);

  const actualExams = React.useMemo(() => {
    return exams.filter(e => e.category !== 'blog' && e.category !== 'system' && e.name !== 'SYSTEM_SETTINGS_YOUTUBE_RESERVED');
  }, [exams]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    // Optimistic UI update: instantly remove from the local state arrays
    if (activeTab === 'questions') setQuestions(prev => prev.filter(q => q.id !== id));
    else if (activeTab === 'series') setSeries(prev => prev.filter(s => s.id !== id));
    else if (activeTab === 'tests') setMockTests(prev => prev.filter(t => t.id !== id));
    else if (activeTab === 'exams' || activeTab === 'blogs') setExams(prev => prev.filter(ex => ex.id !== id));
    else if (activeTab === 'banks') setBanks(prev => prev.filter(b => b.id !== id));

    try {
      if (activeTab === 'questions') await examService.deleteQuestion(id);
      else if (activeTab === 'series') await examService.deleteTestSeries(id);
      else if (activeTab === 'tests') await examService.deleteMockTest(id);
      else if (activeTab === 'exams' || activeTab === 'blogs') await examService.deleteExam(id);
      else if (activeTab === 'banks') await examService.deleteQuestionBank(id);
      
      // Fetch data in the background to ensure consistency, without blocking the UI
      fetchData();
    } catch (error: any) {
      alert('Error deleting item: ' + (error.message || error));
      console.error("Delete Error:", error);
      // If error occurs, re-fetch to restore the item in the UI
      fetchData();
    }
  };

  const handleEditClick = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(item.id);
    
    let newData = { ...initialFormData };
    if (activeTab === 'banks') {
      let parsedTagline = { text: '', price: 499, originalPrice: 999 };
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
        pdfLinks: (() => {
          if (!item.pdfUrl) return [];
          try {
            const parsed = JSON.parse(item.pdfUrl);
            if (Array.isArray(parsed)) return parsed;
            return [{ title: 'Download PDF', url: item.pdfUrl }];
          } catch (e) {
            return [{ title: 'Download PDF', url: item.pdfUrl }];
          }
        })(),
        hasPracticeMode: item.hasPracticeMode ?? true
      };
    } else if (activeTab === 'exams') {
      newData = {
        ...newData,
        name: item.name || '',
        icon: item.icon || 'BookOpen',
        metaDescription: item.metaDescription || '',
        keywords: item.keywords || '',
        targetExamId: item.targetExamId || '',
        isPremium: (item.description || '').startsWith('JSON_METADATA_'),
        price: (() => {
          if (!(item.description || '').startsWith('JSON_METADATA_')) return 499;
          try { return JSON.parse(item.description.replace('JSON_METADATA_', '')).price || 499; } catch(e) { return 499; }
        })(),
        originalPrice: (() => {
          if (!(item.description || '').startsWith('JSON_METADATA_')) return 999;
          try { return JSON.parse(item.description.replace('JSON_METADATA_', '')).originalPrice || 999; } catch(e) { return 999; }
        })(),
        description: (() => {
          if (!(item.description || '').startsWith('JSON_METADATA_')) return item.description || '';
          try { return JSON.parse(item.description.replace('JSON_METADATA_', '')).description || ''; } catch(e) { return item.description || ''; }
        })()
      };
    } else if (activeTab === 'blogs') {
      newData = {
        ...newData,
        name: item.name || '',
        description: item.description || '',
        icon: item.icon || '',
        examDate: item.examDate || '',
        metaTitle: item.metaTitle || '',
        metaDescription: item.metaDescription || '',
        keywords: item.keywords || '',
        targetExamId: item.targetExamId || ''
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
      let parsedMockConfig = { examId: '', category: 'full-length', subject: '', isPremium: false, price: 499, originalPrice: 999 };
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
        totalMarks: item.totalMarks || 100,
        negativeMarking: item.negativeMarking || 0
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
        const payload = {
          examId: formData.examId,
          title: formData.title,
          description: formData.description,
          price: Number(formData.price),
          durationDays: Number(formData.durationDays),
          testIds: []
        };
        if (editingId) await examService.updateTestSeries(editingId, payload);
        else await examService.createTestSeries(payload);
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
          totalMarks: Number(formData.totalMarks),
          negativeMarking: Number(formData.negativeMarking) || 0
        };
        if (editingId) await examService.updateMockTest(editingId, payload);
        else await examService.createMockTest(payload);
      } else if (activeTab === 'exams' || activeTab === 'blogs') {
        const payload = {
          name: formData.name,
          description: formData.isPremium 
            ? `JSON_METADATA_${JSON.stringify({ price: Number(formData.price), originalPrice: Number(formData.originalPrice), description: formData.description })}`
            : formData.description,
          icon: formData.icon,
          category: activeTab === 'blogs' ? 'blog' : (formData.examCategory as 'popular' | 'upcoming' | 'blog' | 'system'),
          examDate: formData.examDate || null,
          metaTitle: formData.metaTitle,
          metaDescription: formData.metaDescription,
          keywords: formData.keywords,
          targetExamId: formData.targetExamId
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
          pdfUrl: JSON.stringify(formData.pdfLinks),
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

  const handleReorder = async (newOrder: any[]) => {
    // 1. Update local state immediately for smooth UI
    setItems(newOrder);

    // 2. Persist new sortOrder to DB
    try {
      const promises = newOrder.map((item, index) => {
        const targetOrder = index + 1; // 1-based order
        if (activeTab === 'questions') return examService.updateQuestion(item.id, { sortOrder: targetOrder });
        if (activeTab === 'series') return examService.updateTestSeries(item.id, { sortOrder: targetOrder });
        if (activeTab === 'tests') return examService.updateMockTest(item.id, { sortOrder: targetOrder });
        if (activeTab === 'exams' || activeTab === 'blogs') return examService.updateExam(item.id, { sortOrder: targetOrder });
        if (activeTab === 'banks') return examService.updateQuestionBank(item.id, { sortOrder: targetOrder });
        return Promise.resolve();
      });

      await Promise.all(promises);
      // Optional: Refresh data to ensure everything is synced
      // await fetchData();
    } catch (e) {
      console.error("Reorder failed", e);
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
            
            <div className="md:col-span-2 p-6 bg-brand-50 rounded-3xl border border-brand-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <label className="text-base font-black text-slate-900 leading-tight">Full Exam Access Bundle</label>
                    <p className="text-xs font-bold text-slate-500 italic">Allow users to unlock ALL question banks and mock tests for this exam at once</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={formData.isPremium} onChange={e => setFormData({ ...formData, isPremium: e.target.checked })} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                </label>
              </div>
              {formData.isPremium && (
                <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Bundle Price (₹)</label>
                    <input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold text-sm" placeholder="e.g. 499" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Original Price (₹)</label>
                    <input type="number" value={formData.originalPrice} onChange={e => setFormData({ ...formData, originalPrice: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold text-sm" placeholder="e.g. 999" />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 md:col-span-2">
              <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Exam Description / Detailed Content</label>
              <textarea 
                rows={4} 
                value={formData.description} 
                onChange={e => setFormData({ ...formData, description: e.target.value })} 
                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-medium text-sm leading-relaxed" 
                placeholder="Describe the exam and what's included in the bundle..."
              />
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
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Related Exam (For Promotion)</label>
                <SearchableDropdown 
                  value={formData.targetExamId} 
                  onChange={v => setFormData({ ...formData, targetExamId: v })} 
                  options={actualExams.map(ex => ({ value: ex.id as string, label: ex.name }))}
                  placeholder="-- No Related Exam --"
                />
                <p className="text-[10px] font-bold text-slate-400">If selected, this blog will promote Question Banks & Mock Tests for this exam.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mt-8 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-5 h-5 text-brand-600" />
                <h3 className="text-lg font-black text-slate-900 tracking-tight">SEO Options</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Meta Title</label>
                  <input type="text" value={formData.metaTitle} onChange={e => setFormData({ ...formData, metaTitle: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-200 outline-none focus:border-brand-500 transition-all font-bold bg-white" placeholder="SEO Title Tag" />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Meta Keywords</label>
                  <input type="text" value={formData.keywords} onChange={e => setFormData({ ...formData, keywords: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-200 outline-none focus:border-brand-500 transition-all font-bold bg-white" placeholder="odisha, exams, prep..." />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Meta Description</label>
                <textarea value={formData.metaDescription} onChange={e => setFormData({ ...formData, metaDescription: e.target.value })} className="w-full px-5 py-3 rounded-2xl border-2 border-slate-200 outline-none focus:border-brand-500 transition-all font-bold min-h-[80px] bg-white" placeholder="Search result snippet..."></textarea>
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
                  options={actualExams.map(ex => ({ value: ex.id as string, label: ex.name }))}
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
                  options={actualExams.map(ex => ({ value: ex.id as string, label: ex.name }))}
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
              <div className="space-y-3">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Negative Marking Per Incorrect Answer *</label>
                <input 
                  required 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  value={formData.negativeMarking} 
                  onChange={e => setFormData({ ...formData, negativeMarking: e.target.value })} 
                  className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold" 
                  placeholder="e.g. 0.25" 
                />
                <div className="flex gap-2 flex-wrap">
                  {[0, 0.25, 0.33, 0.5, 1].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormData({ ...formData, negativeMarking: val })}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-bold transition-all border",
                        Number(formData.negativeMarking) === val 
                          ? "bg-brand-500 text-white border-brand-500" 
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {val === 0 ? "None (0.00)" : '-' + val}
                    </button>
                  ))}
                </div>
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
                  options={actualExams.map(ex => ({ value: ex.id as string, label: ex.name }))}
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
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">PDF Download Links</label>
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, pdfLinks: [...formData.pdfLinks, { title: '', url: '' }] })}
                    className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-600 rounded-xl text-xs font-black hover:bg-brand-100 transition-all"
                  >
                    <Plus className="w-4 h-4" /> Add New Link
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formData.pdfLinks.length === 0 ? (
                    <div className="py-8 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                      <FileText className="w-8 h-8 mb-2 opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">No PDF links added yet</p>
                    </div>
                  ) : (
                    formData.pdfLinks.map((link: any, idx: number) => (
                      <div key={idx} className="flex gap-3 items-end bg-white p-4 rounded-2xl border-2 border-slate-50 shadow-sm relative group">
                        <div className="flex-1 space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Link Title</label>
                          <input 
                            type="text" 
                            value={link.title} 
                            onChange={e => {
                              const newLinks = [...formData.pdfLinks];
                              newLinks[idx].title = e.target.value;
                              setFormData({ ...formData, pdfLinks: newLinks });
                            }} 
                            placeholder="e.g. Question Bank Vol. 1" 
                            className="w-full px-4 py-2 rounded-xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold text-sm" 
                          />
                        </div>
                        <div className="flex-[2] space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">PDF URL</label>
                          <input 
                            type="text" 
                            value={link.url} 
                            onChange={e => {
                              const newLinks = [...formData.pdfLinks];
                              newLinks[idx].url = e.target.value;
                              setFormData({ ...formData, pdfLinks: newLinks });
                            }} 
                            placeholder="https://..." 
                            className="w-full px-4 py-2 rounded-xl border-2 border-slate-100 outline-none focus:border-brand-500 transition-all font-bold text-sm font-mono" 
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            const newLinks = formData.pdfLinks.filter((_: any, i: number) => i !== idx);
                            setFormData({ ...formData, pdfLinks: newLinks });
                          }}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all mb-1"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-[10px] font-bold text-slate-400 italic">Adding multiple links allows students to download separate files for questions, answers, or different parts.</p>
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
                  options={actualExams.map(ex => ({ value: ex.id as string, label: ex.name }))}
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
                <img src={item.photoURL} alt="avatar" loading="lazy" className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-100" />
              ) : (
                <div className="w-10 h-10 rounded-full premium-gradient text-white flex items-center justify-center font-black text-sm shadow-inner uppercase select-none">
                  <span className="drop-shadow-md">{(item.displayName || item.email || '?').charAt(0)}</span>
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
                       
                       let activeClient = supabase;
                       const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
                       if (serviceKey) {
                          const { createClient } = await import('@supabase/supabase-js');
                          activeClient = createClient(import.meta.env.VITE_SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
                       }
                       
                       const { error } = await activeClient.auth.admin.updateUserById(item.uid, { user_metadata: { purchasedSeries: newPurchased } });
                       if (error) alert(`Failed to revoke access: ${error.message}`);
                       else alert('Access revoked successfully.');
                       
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
                  setGrantTargetUser(item);
                  setGrantSelectedExamId("");
                  setGrantSelectedCategory("bundle");
                  setGrantSelectedContentId("");
                  setShowGrantModal(true);
                }}
                className="w-full text-center px-3 py-1.5 text-brand-700 bg-brand-100 hover:text-white hover:bg-brand-600 rounded-lg transition-all text-[10px] uppercase font-black border border-brand-200 shadow-sm whitespace-nowrap"
              >
                Grant Content
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setPasswordTargetUser(item);
                  setNewPasswordValue("");
                  setShowPasswordModal(true);
                }}
                className="w-full text-center px-3 py-1.5 text-brand-600 bg-brand-50 hover:text-white hover:bg-brand-600 rounded-lg transition-all text-[10px] uppercase font-black border border-brand-200 shadow-sm whitespace-nowrap"
              >
                Force Set Password
              </button>
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm(`Are you sure you want to globally ${item.hasFullAccess ? 'revoke' : 'grant'} full system access to ${item.email}?`)) return;
                  const newAccess = !item.hasFullAccess;
                  
                  let activeClient = supabase;
                  const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
                  if (serviceKey) {
                     const { createClient } = await import('@supabase/supabase-js');
                     activeClient = createClient(import.meta.env.VITE_SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
                  }
                  
                  const { error } = await activeClient.auth.admin.updateUserById(item.uid, { user_metadata: { hasFullAccess: newAccess } });
                  if (error) alert(`Failed to update access: ${error.message}`);
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
            {['tests', 'series', 'banks'].includes(activeTab) && (
              <button 
                onClick={async (e) => {
                   e.stopPropagation();
                   if (!confirm('DANGER ZONE: Are you sure you want to revoke access to this content for EVERY SINGLE USER who purchased it? They will need to repurchase it if you add it to a new cycle.')) return;
                   
                   let count = 0;
                   let activeClient = supabase;
                   const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
                   if (serviceKey) {
                      const { createClient } = await import('@supabase/supabase-js');
                      activeClient = createClient(import.meta.env.VITE_SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
                   }
                   
                   let errorCount = 0;
                   for (const u of users) {
                      if (u.purchasedSeries?.includes(item.id)) {
                         const newPurchased = u.purchasedSeries.filter((p: string) => p !== item.id);
                         const { error } = await activeClient.auth.admin.updateUserById(u.uid, { user_metadata: { purchasedSeries: newPurchased } });
                         if (error) errorCount++;
                         else count++;
                      }
                   }
                   
                   if (errorCount > 0) alert(`Revoked from ${count} users, but failed for ${errorCount} users.`);
                   else if (count > 0) alert(`Successfully revoked access from ${count} users.`);
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
              className="p-2.5 text-slate-300 group-hover:text-slate-400 cursor-grab active:cursor-grabbing"
              title="Hold and drag to reorder"
            >
              <GripVertical className="w-5 h-5" />
            </button>

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
              { id: 'updates', label: 'Exam Updates', icon: Bell },
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
              {['questions', 'tests', 'banks', 'exams', 'series', 'blogs', 'users'].includes(activeTab) && (
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
                  {actualExams.map(ex => <option key={ex.id} value={ex.id as string}>{ex.name}</option>)}
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
                  {(() => {
                     if (items.length === 0 || filterExamId === 'all') return null;
                     const targetExamId = items[0].examId;
                     const targetTopic = items[0].topic;
                     // Only show button if all displayed items fall under the EXACT same exam and topic.
                     const isSpecificSelection = items.every((q: any) => q.examId === targetExamId && q.topic === targetTopic);
                     if (!isSpecificSelection) return null;
                     
                     return (
                       <button 
                         onClick={async () => {
                            const subjectName = (targetTopic || '').toLowerCase().startsWith('mocktest__') ? 'this Mock Test' : `the subject '${targetTopic}'`;
                            const confirmMessage = `WARNING: Are you sure you want to delete ALL ${items.length} questions for ${subjectName}?\n\nThis action cannot be undone.`;
                            if (!confirm(confirmMessage)) return;
                            
                            try {
                                const promises = items.map((item: any) => examService.deleteQuestion(item.id));
                                await Promise.all(promises);
                                alert(`Successfully deleted ${items.length} questions.`);
                                fetchData();
                            } catch(e: any) {
                                alert(`Failed to delete some or all questions: ${e.message}`);
                                fetchData();
                            }
                         }}
                         className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-extrabold hover:bg-red-100 transition-all premium-shadow flex-shrink-0"
                       >
                         <Trash2 className="w-4 h-4" /> Bulk Delete Filtered
                       </button>
                     );
                  })()}
                </>
              )}
              {activeTab === 'tests' && (
                <>
                  <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl mr-2 h-10 border border-slate-200/50 flex-shrink-0">
                    <button onClick={() => setTestFilter('all')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all h-full", testFilter === 'all' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>All</button>
                    <button onClick={() => setTestFilter('full-length')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all h-full", testFilter === 'full-length' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>Full-Length</button>
                    <button onClick={() => setTestFilter('sectional')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all h-full", testFilter === 'sectional' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>Sectional</button>
                    <button onClick={() => setTestFilter('pyq')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all h-full", testFilter === 'pyq' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>PYQ</button>
                    <button onClick={() => setTestFilter('daily')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all h-full", testFilter === 'daily' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>Daily</button>
                  </div>
                  <button 
                    onClick={() => setShowMockUploadModal(true)}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 glass border border-slate-200 rounded-xl text-sm font-extrabold hover:bg-white transition-all premium-shadow flex-shrink-0"
                  >
                    <Upload className="w-4 h-4" /> Bulk Upload Questions
                  </button>
                  {(() => {
                     if (items.length === 0 || filterExamId === 'all') return null;
                     return (
                       <button 
                         onClick={async () => {
                            const confirmMessage = `WARNING: Are you sure you want to delete ALL ${items.length} Mock Tests currently displayed?\n\nThis will permanently delete the test configurations. This action cannot be undone.`;
                            if (!confirm(confirmMessage)) return;
                            
                            try {
                                const promises = items.map((item: any) => examService.deleteMockTest(item.id));
                                await Promise.all(promises);
                                alert(`Successfully deleted ${items.length} Mock Tests.`);
                                fetchData();
                            } catch(e: any) {
                                alert(`Failed to delete some or all tests: ${e.message}`);
                                fetchData();
                            }
                         }}
                         className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-extrabold hover:bg-red-100 transition-all premium-shadow flex-shrink-0"
                       >
                         <Trash2 className="w-4 h-4" /> Bulk Delete Filtered
                       </button>
                     );
                  })()}
                </>
              )}
              {activeTab === 'banks' && (
                <>
                  <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl mr-2 h-10 border border-slate-200/50 flex-shrink-0">
                    <button onClick={() => setBankFilter('all')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all h-full", bankFilter === 'all' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>All</button>
                    <button onClick={() => setBankFilter('topic-wise')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all h-full", bankFilter === 'topic-wise' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>Topic-Wise</button>
                    <button onClick={() => setBankFilter('exam-focused')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all h-full", bankFilter === 'exam-focused' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>Exam-Focused</button>
                    <button onClick={() => setBankFilter('revision-sets')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all h-full", bankFilter === 'revision-sets' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>Revision Sets</button>
                    <button onClick={() => setBankFilter('pyq-collections')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all h-full", bankFilter === 'pyq-collections' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>PYQ</button>
                  </div>
                  {(() => {
                     if (items.length === 0 || filterExamId === 'all') return null;
                     return (
                       <button 
                         onClick={async () => {
                            const confirmMessage = `WARNING: Are you sure you want to delete ALL ${items.length} Question Banks currently displayed?\n\nThis will permanently delete the bank configurations. This action cannot be undone.`;
                            if (!confirm(confirmMessage)) return;
                            
                            try {
                                const promises = items.map((item: any) => examService.deleteQuestionBank(item.id));
                                await Promise.all(promises);
                                alert(`Successfully deleted ${items.length} Question Banks.`);
                                fetchData();
                            } catch(e: any) {
                                alert(`Failed to delete some or all banks: ${e.message}`);
                                fetchData();
                            }
                         }}
                         className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-extrabold hover:bg-red-100 transition-all premium-shadow flex-shrink-0"
                       >
                         <Trash2 className="w-4 h-4" /> Bulk Delete Filtered
                       </button>
                      );
                  })()}
                </>
              )}
              {activeTab === 'exams' && (
                <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl mr-2 h-10 border border-slate-200/50 flex-shrink-0">
                  <button onClick={() => setExamFilter('all')} className={cn("px-4 py-1.5 rounded-lg text-sm font-bold transition-all h-full", examFilter === 'all' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>All</button>
                  <button onClick={() => setExamFilter('popular')} className={cn("px-4 py-1.5 rounded-lg text-sm font-bold transition-all h-full", examFilter === 'popular' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>Popular</button>
                  <button onClick={() => setExamFilter('upcoming')} className={cn("px-4 py-1.5 rounded-lg text-sm font-bold transition-all h-full", examFilter === 'upcoming' ? "bg-white shadow-sm text-brand-600" : "text-slate-500 hover:text-slate-700")}>Upcoming</button>
                </div>
              )}
              {['questions', 'tests', 'banks', 'exams', 'series', 'blogs'].includes(activeTab) && (
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
              )}
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
                           category: 'system' as const
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
              {/* ── Hero Card Editor ── */}
              <div className="mt-10 border-t-2 border-dashed border-slate-200 pt-10 space-y-8">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">🃏 Hero Card Editor</h3>
                  <p className="text-slate-500 font-medium mt-2 text-lg">Customize the interactive question card displayed on the homepage hero section.</p>
                </div>

                {/* Info banner */}
                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex gap-4 items-start shadow-sm">
                  <AlertCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-extrabold text-slate-800">Live on homepage after save!</p>
                    <p className="text-sm font-medium text-slate-600">
                      Changes publish instantly to the home page hero card. Students will see the new question next time they load the page.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {/* LEFT: Form */}
                  <div className="space-y-6">
                    {/* Row 1: Exam Label + Question Number */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Exam Label</label>
                        <input
                          type="text"
                          value={heroCard.examLabel}
                          onChange={e => setHeroCard((h: any) => ({ ...h, examLabel: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-bold text-sm bg-white"
                          placeholder="OPSC Prelims Mock"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Question Number</label>
                        <input
                          type="text"
                          value={heroCard.questionNumber}
                          onChange={e => setHeroCard((h: any) => ({ ...h, questionNumber: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-bold text-sm bg-white"
                          placeholder="Q. 42"
                        />
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Question Text *</label>
                      <textarea
                        rows={3}
                        value={heroCard.questionText}
                        onChange={e => setHeroCard((h: any) => ({ ...h, questionText: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-bold text-sm bg-white resize-none"
                        placeholder="Enter the question..."
                      />
                    </div>

                    {/* Options A-D */}
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Answer Options — click the radio to set correct answer</label>
                      {['A', 'B', 'C', 'D'].map((letter, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setHeroCard((h: any) => ({ ...h, correctIndex: idx }))}
                            className={cn(
                              "shrink-0 w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center border-2 transition-all",
                              heroCard.correctIndex === idx
                                ? "bg-emerald-500 text-white border-emerald-500 shadow-md"
                                : "bg-slate-100 text-slate-500 border-slate-200 hover:border-brand-400"
                            )}
                            title={heroCard.correctIndex === idx ? "Correct answer" : "Click to set as correct"}
                          >
                            {heroCard.correctIndex === idx ? '✓' : letter}
                          </button>
                          <input
                            type="text"
                            value={heroCard.options[idx] || ''}
                            onChange={e => {
                              const newOptions = [...heroCard.options];
                              newOptions[idx] = e.target.value;
                              setHeroCard((h: any) => ({ ...h, options: newOptions }));
                            }}
                            className={cn(
                              "flex-1 px-4 py-2.5 rounded-xl border-2 outline-none transition-all font-bold text-sm bg-white",
                              heroCard.correctIndex === idx
                                ? "border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-emerald-50/50"
                                : "border-slate-100 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                            )}
                            placeholder={`Option ${letter}`}
                          />
                        </div>
                      ))}
                      <p className="text-xs text-slate-400 font-semibold pt-1">
                        🟢 Green button = correct answer. Click any button to change.
                      </p>
                    </div>

                    {/* Explanation */}
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Explanation</label>
                      <textarea
                        rows={3}
                        value={heroCard.explanation}
                        onChange={e => setHeroCard((h: any) => ({ ...h, explanation: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-bold text-sm bg-white resize-none"
                        placeholder="Explain the correct answer..."
                      />
                    </div>

                    {/* Marks + Penalty */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Marks per Q</label>
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          value={heroCard.marks}
                          onChange={e => setHeroCard((h: any) => ({ ...h, marks: parseFloat(e.target.value) || 1 }))}
                          className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-bold text-sm bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Negative Marking</label>
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          value={heroCard.penalty}
                          onChange={e => setHeroCard((h: any) => ({ ...h, penalty: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-bold text-sm bg-white"
                        />
                      </div>
                    </div>

                    {/* Save */}
                    <div className="flex justify-end pt-2 border-t border-slate-100">
                      <button
                        onClick={async () => {
                          try {
                            const updated = {
                              name: 'SYSTEM_SETTINGS_HERO_CARD',
                              description: JSON.stringify(heroCard),
                              icon: '🃏',
                              category: 'system' as const
                            };
                            const exists = exams.find(e => e.name === 'SYSTEM_SETTINGS_HERO_CARD');
                            if (exists && exists.id) {
                              await examService.updateExam(exists.id, updated);
                            } else {
                              await examService.addExam(updated);
                            }
                            await fetchData();
                            alert('✅ Hero card saved and published to homepage!');
                          } catch (err: any) { alert(`Failed to save: ${err.message || 'Unknown error'}`); }
                        }}
                        className="px-10 py-3.5 premium-gradient text-white font-extrabold rounded-xl shadow-lg shadow-brand-500/20 hover:premium-glow transition-all active:scale-95 text-lg"
                      >
                        Save Hero Card
                      </button>
                    </div>
                  </div>

                  {/* RIGHT: Live Preview */}
                  <div className="space-y-3">
                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Live Preview</label>
                    <div className="w-full bg-white border-2 border-slate-900/80 rounded-[1.5rem] p-6 shadow-[6px_6px_0px_rgba(138,28,54,1)] relative overflow-hidden font-sans">
                      <div className="absolute inset-0 pointer-events-none opacity-[0.03] grid-bg" />

                      {/* Card Header */}
                      <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-[#8A1C36] rounded-full" />
                          <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest">{heroCard.examLabel || 'EXAM LABEL'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">⏱ 08:42</span>
                          <span className="text-[10px] font-extrabold text-[#8A1C36] bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">{heroCard.questionNumber || 'Q. 1'}</span>
                        </div>
                      </div>

                      {/* Question */}
                      <p className="text-xs font-bold text-slate-900 leading-relaxed mb-3 line-clamp-3">{heroCard.questionText || 'Question text will appear here...'}</p>

                      {/* Options */}
                      <div className="space-y-1.5 mb-3">
                        {(heroCard.options || []).map((opt: string, idx: number) => (
                          <div
                            key={idx}
                            className={cn(
                              "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold",
                              idx === heroCard.correctIndex
                                ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                                : "border-slate-200 bg-slate-50 text-slate-700"
                            )}
                          >
                            <span className={cn(
                              "w-5 h-5 rounded flex items-center justify-center font-black text-[9px] shrink-0",
                              idx === heroCard.correctIndex ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                            )}>
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="truncate">{opt || `Option ${String.fromCharCode(65 + idx)}`}</span>
                          </div>
                        ))}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Marks: {heroCard.marks?.toFixed(2)}</span>
                        <span>Penalty: {heroCard.penalty?.toFixed(2)}</span>
                        <span>Status: Interactive Demo</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 font-semibold text-center">Preview updates as you type. Green = correct answer.</p>
                  </div>
                </div>
              </div>
             </div>
          ) : activeTab === 'updates' ? (
            <div className="glass rounded-[2rem] border border-slate-200/50 shadow-xl overflow-hidden bg-white/70 p-8 sm:p-12 space-y-8">
               <div>
                 <h3 className="text-3xl font-black text-slate-900 tracking-tight">Exam Updates & News Ticker</h3>
                 <p className="text-slate-500 font-medium mt-2 text-lg">Manage the flashing news updates shown at the top of the website.</p>
               </div>
               
               <div className="bg-brand-50 p-5 rounded-2xl border border-brand-100 flex gap-4 items-start shadow-sm">
                 <Bell className="w-6 h-6 text-brand-600 shrink-0 mt-0.5" />
                 <div className="space-y-1">
                   <p className="font-extrabold text-slate-800">Ticker Instructions</p>
                   <p className="text-sm font-medium text-slate-600">
                     Enter each news update or announcement on a **new line**. These will be displayed in a continuous loop in the top announcement bar.
                   </p>
                 </div>
               </div>

               <div className="space-y-3">
                 <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Active Announcements</label>
                 <textarea 
                    rows={10}
                    className="w-full px-6 py-5 rounded-2xl border-2 border-slate-200 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all shadow-inner bg-white text-slate-700 font-bold"
                    placeholder="OPSC Prelims Exam Dates Announced...&#10;500+ New PYQs Added...&#10;Weekly Current Affairs PDF..."
                    value={newsUpdatesInput}
                    onChange={e => setNewsUpdatesInput(e.target.value)}
                 />
               </div>
               
               <div className="flex justify-end pt-4 border-t border-slate-100">
                 <button onClick={async () => {
                    try {
                       const updates = newsUpdatesInput.split('\n')
                          .map(s => s.trim())
                          .filter(s => s.length > 0);
                          
                       if (updates.length === 0) {
                          alert('Please enter at least one announcement.');
                          return;
                       }

                       const updated = {
                          name: 'SYSTEM_SETTINGS_NEWS_TICKER',
                          description: JSON.stringify({ updates }),
                          icon: '📢',
                          category: 'system' as const
                       };
                       const exists = exams.find(e => e.name === 'SYSTEM_SETTINGS_NEWS_TICKER');
                       if (exists && exists.id) {
                          await examService.updateExam(exists.id, updated);
                       } else {
                          await examService.addExam(updated);
                       }
                       alert("Exam updates successfully published to the live ticker!");
                    } catch(err: any) { alert(`Failed to save updates: ${err.message || 'Unknown error'}`); }
                 }} className="px-10 py-3.5 premium-gradient text-white font-extrabold rounded-xl shadow-lg shadow-brand-500/20 hover:premium-glow transition-all active:scale-95 text-lg">Publish Live Updates</button>
               </div>
            </div>
          ) : activeTab === 'users' ? (
              <div className="glass rounded-[2rem] border border-slate-200/50 shadow-xl overflow-hidden bg-white/70">
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100/50 border-b border-slate-200/60 font-black text-xs uppercase text-slate-500 tracking-widest">
                      <tr>
                         <th className="px-8 py-5">User</th>
                         <th className="px-8 py-5">Status</th>
                         <th className="px-8 py-5 text-right pr-12">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                      {items.length === 0 ? (
                         <tr><td colSpan={3} className="px-8 py-20 text-center text-slate-400">No users found.</td></tr>
                      ) : (
                         items.map(renderTableRow)
                      )}
                    </tbody>
                 </table>
              </div>
          ) : (
              <div className="glass rounded-[2rem] border border-slate-200/50 shadow-xl overflow-hidden bg-white/70">
                 <div className="grid grid-cols-12 bg-slate-100/50 border-b border-slate-200/60 px-8 py-5 text-xs font-black uppercase text-slate-500 tracking-widest">
                    <div className="col-span-6">Basic Info</div>
                    <div className="col-span-3">Details</div>
                    <div className="col-span-3 text-right pr-4">Actions</div>
                 </div>

                 {items.length === 0 ? (
                    <div className="px-8 py-24 text-center">
                       <div className="flex flex-col items-center gap-4 text-slate-400">
                         <AlertCircle className="w-12 h-12 text-slate-300" />
                         <p className="font-extrabold text-xl text-slate-500">No items found in {activeTab}</p>
                         <button onClick={() => { setEditingId(null); setFormData(initialFormData); setShowAddModal(true); }} className="text-brand-600 hover:text-brand-700 font-extrabold text-sm underline mt-2">Create the first record</button>
                       </div>
                    </div>
                 ) : (
                   <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="divide-y divide-slate-100">
                     {items.map((item) => (
                       <Reorder.Item key={item.id} value={item} className="bg-white/50">
                          <div className="hover:bg-brand-50/30 transition-colors group px-8 py-6 grid grid-cols-12 items-center">
                             <div className="col-span-6">
                                <div className="font-extrabold text-slate-900 text-lg line-clamp-2 pr-4">{item.name || item.title || item.questionText || 'Untitled'}</div>
                                <div className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">{item.category || item.type || item.difficulty || 'Default'}</div>
                             </div>
                             <div className="col-span-3">
                                <div className="text-sm font-bold text-slate-600">
                                   {(() => {
                                      if (activeTab === 'questions') return `${item.options?.length || 0} Options`;
                                      if (activeTab === 'series') return `₹${item.price} • ${item.durationDays} Days`;
                                      if (activeTab === 'tests') return `${item.durationMinutes} Min • ${item.totalMarks} Marks`;
                                      if (activeTab === 'exams' || activeTab === 'blogs') {
                                        return item.examDate ? new Date(item.examDate).toLocaleDateString() : '-';
                                      }
                                      if (activeTab === 'banks') return `${item.questionCount} Qs • ${item.isPremium ? 'Premium' : 'Free'}`;
                                      return '-';
                                   })()}
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">ID: {item.id?.slice(0, 8)}</div>
                             </div>
                             <div className="col-span-3 flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                {['tests', 'series', 'banks'].includes(activeTab) && (
                                  <button 
                                    onClick={async (e) => {
                                       e.stopPropagation();
                                       if (!confirm('DANGER ZONE: Are you sure you want to revoke access to this content for EVERY SINGLE USER who purchased it?')) return;
                                       
                                       let count = 0;
                                       let activeClient = supabase;
                                       const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
                                       if (serviceKey) {
                                          const { createClient } = await import('@supabase/supabase-js');
                                          activeClient = createClient(import.meta.env.VITE_SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
                                       }
                                       
                                       let errorCount = 0;
                                       for (const u of users) {
                                          if (u.purchasedSeries?.includes(item.id)) {
                                             const newPurchased = u.purchasedSeries.filter((p: string) => p !== item.id);
                                             const { error } = await activeClient.auth.admin.updateUserById(u.uid, { user_metadata: { purchasedSeries: newPurchased } });
                                             if (error) errorCount++;
                                             else count++;
                                          }
                                       }
                                       alert(`Access revoked from ${count} users.` + (errorCount > 0 ? ` Failed for ${errorCount}.` : ''));
                                       fetchData();
                                    }}
                                    className="p-2.5 text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition-all"
                                    title="Revoke Content for All Users"
                                  >
                                    <Users className="w-5 h-5 pointer-events-none" />
                                  </button>
                                )}
                                {activeTab === 'exams' && (
                                  <button 
                                    onClick={async (e) => {
                                       e.stopPropagation();
                                       if (!confirm('DANGER ZONE / END CYCLE: Are you sure you want to REVOKE ALL ACCESS to this Exam for EVERY SINGLE USER? This instantly removes access to the Exam Bundle, all individual Mock Tests, and Question Banks under this exam. This action cannot be undone and users will need to purchase again for the next cycle.')) return;
                                       
                                       const relatedIds = [
                                          `exam_bundle_${item.id}`,
                                          ...mockTests.filter((t: any) => t.examId === item.id).map((t: any) => t.id),
                                          ...banks.filter((b: any) => b.examId === item.id).map((b: any) => b.id)
                                       ];
                                       
                                       let count = 0;
                                       let activeClient = supabase;
                                       const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
                                       if (serviceKey) {
                                          const { createClient } = await import('@supabase/supabase-js');
                                          activeClient = createClient(import.meta.env.VITE_SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
                                       }
                                       
                                       let errorCount = 0;
                                       for (const u of users) {
                                          let hasAny = false;
                                          if (u.purchasedSeries) {
                                            for (const rid of relatedIds) {
                                              if (u.purchasedSeries.includes(rid)) hasAny = true;
                                            }
                                          }
                                          if (hasAny) {
                                             const newPurchased = u.purchasedSeries.filter((p: string) => !relatedIds.includes(p));
                                             const { error } = await activeClient.auth.admin.updateUserById(u.uid, { user_metadata: { purchasedSeries: newPurchased } });
                                             if (error) errorCount++;
                                             else count++;
                                          }
                                       }
                                       alert(`Cycle Reset Complete: Exam Access revoked from ${count} users.` + (errorCount > 0 ? ` Failed for ${errorCount}.` : ''));
                                       fetchData();
                                    }}
                                    className="p-2.5 text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition-all"
                                    title="End Cycle: Revoke All Exam Content Access"
                                  >
                                    <Users className="w-5 h-5 pointer-events-none" />
                                  </button>
                                )}
                                {activeTab === 'tests' && (
                                  <button 
                                    onClick={(e) => {
                                       e.stopPropagation();
                                       setAttachMockTestId(item.id);
                                       setShowMockUploadModal(true);
                                    }}
                                    className="p-2.5 text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-xl transition-all"
                                    title="Upload Questions JSON"
                                  >
                                    <Upload className="w-5 h-5" />
                                  </button>
                                )}
                                <div className="p-2.5 text-slate-300 group-hover:text-slate-400 cursor-grab active:cursor-grabbing" title="Drag to reorder">
                                  <GripVertical className="w-5 h-5" />
                                </div>
                                <button onClick={(e) => handleEditClick(item, e)} className="p-2.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"><Edit2 className="w-5 h-5" /></button>
                                <button onClick={(e) => handleDelete(item.id, e)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                             </div>
                          </div>
                       </Reorder.Item>
                     ))}
                   </Reorder.Group>
                 )}
              </div>
          )}
        </div>
      </main>

      {/* Bulk Upload Modal */}
      <AnimatePresence>
        {showBulkUploadModal && (
          <div className="fixed inset-0 bg-slate-950/40 z-[60] flex items-center justify-center p-4 backdrop-blur-sm pt-20">
            <motion.div {...modalContent}
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
                        options={actualExams.map(ex => ({ value: ex.id as string, label: ex.name }))}
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
            <motion.div {...modalContent}
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
            <motion.div {...modalContent}
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
                  <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Target Mock Test *</label>
                  <select 
                    value={attachMockTestId || ''} 
                    onChange={e => setAttachMockTestId(e.target.value)}
                    className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 focus:border-brand-500 font-bold bg-white"
                  >
                    <option value="">-- Select Mock Test --</option>
                    {mockTests.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>

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
            <motion.div {...modalContent}
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

        {/* Grant Content Modal */}
        {showGrantModal && grantTargetUser && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div {...scaleIn}
              className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                  <span className="p-2 bg-brand-100 text-brand-600 rounded-lg">
                    <BookMarked className="w-5 h-5" />
                  </span>
                  Manual Content Grant
                </h3>
                <button onClick={() => setShowGrantModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Target Account</p>
                   <p className="font-extrabold text-slate-900 text-lg truncate" title={grantTargetUser.email}>{grantTargetUser.email}</p>
                   {grantTargetUser.displayName && <p className="text-sm font-medium text-slate-600">{grantTargetUser.displayName}</p>}
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Select Exam *</label>
                  <select 
                    value={grantSelectedExamId} 
                    onChange={e => {
                        setGrantSelectedExamId(e.target.value);
                        setGrantSelectedContentId("");
                    }} 
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 outline-none focus:border-brand-500 font-bold text-sm bg-white shadow-inner"
                  >
                    <option value="">-- Choose Exam --</option>
                    {actualExams.map(ex => <option key={ex.id} value={ex.id as string}>{ex.name}</option>)}
                  </select>
                </div>
                
                {grantSelectedExamId && (
                    <div className="space-y-3">
                      <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Select Category *</label>
                      <select 
                        value={grantSelectedCategory} 
                        onChange={e => {
                            setGrantSelectedCategory(e.target.value);
                            setGrantSelectedContentId("");
                        }} 
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 outline-none focus:border-brand-500 font-bold text-sm bg-white shadow-inner"
                      >
                        <option value="bundle">Full Exam Bundle (All Content)</option>
                        <option value="mock">Mock Tests</option>
                        <option value="bank">Question Banks</option>
                        <option value="series">Custom Test Series</option>
                      </select>
                    </div>
                )}
                
                {grantSelectedExamId && grantSelectedCategory !== 'bundle' && (
                    <div className="space-y-3">
                      <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Select Specific Content *</label>
                      <select 
                        value={grantSelectedContentId} 
                        onChange={e => setGrantSelectedContentId(e.target.value)} 
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 outline-none focus:border-brand-500 font-bold text-sm bg-white shadow-inner"
                      >
                        <option value="">-- Choose Specific Content --</option>
                        {grantSelectedCategory === 'mock' && mockTests.filter(m => {
                            if (m.examId !== grantSelectedExamId) return false;
                            try { if (m.seriesId) return JSON.parse(m.seriesId).isPremium === true; } catch(e){}
                            return false;
                        }).map(m => (
                            <option key={m.id} value={m.id}>{m.title}</option>
                        ))}
                        {grantSelectedCategory === 'bank' && banks.filter(b => b.examId === grantSelectedExamId && b.isPremium === true).map(b => (
                            <option key={b.id} value={b.id}>{b.title}</option>
                        ))}
                        {grantSelectedCategory === 'series' && series.filter(s => s.examId === grantSelectedExamId).map(s => (
                            <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                      </select>
                    </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button onClick={() => setShowGrantModal(false)} className="w-1/3 py-3 rounded-xl border border-slate-200 font-extrabold text-slate-600 hover:bg-slate-100 transition-all">Cancel</button>
                  <button 
                    disabled={!grantSelectedExamId || (grantSelectedCategory !== 'bundle' && !grantSelectedContentId)}
                    onClick={async () => {
                        const contentIdToGrant = grantSelectedCategory === 'bundle' ? `exam_bundle_${grantSelectedExamId}` : grantSelectedContentId;
                        const examName = actualExams.find(ex => ex.id === grantSelectedExamId)?.name || "Exam";
                        const targetContentTitle = grantSelectedCategory === 'bundle' 
                            ? `Full Access Bundle: ${examName}` 
                            : (series.find(s => s.id === contentIdToGrant)?.title || mockTests.find(m => m.id === contentIdToGrant)?.title || banks.find(b => b.id === contentIdToGrant)?.title || "Selected Content");
                            
                        const confirmMsg = `Are you sure you want to permanently unlock "${targetContentTitle}" for ${grantTargetUser.email}?`;
                        if (!confirm(confirmMsg)) return;

                        const currentPurchased = grantTargetUser.purchasedSeries || [];
                        if (currentPurchased.includes(contentIdToGrant)) {
                           alert('This user already has access to this content.');
                           return;
                        }

                        const newPurchased = [...currentPurchased, contentIdToGrant];
                        let activeClient = supabase;
                        const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
                        if (serviceKey) {
                           const { createClient } = await import('@supabase/supabase-js');
                           activeClient = createClient(import.meta.env.VITE_SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
                        }
                        
                        const { error } = await activeClient.auth.admin.updateUserById(grantTargetUser.uid, { user_metadata: { purchasedSeries: newPurchased } });
                        if (error) {
                           alert(`Failed to grant access: ${error.message}`);
                        } else {
                           alert('Access granted successfully.');
                           setShowGrantModal(false);
                           fetchData();
                        }
                    }} 
                    className="flex-1 bg-brand-600 text-white font-extrabold rounded-xl py-3 hover:bg-brand-700 disabled:opacity-50 shadow-lg shadow-brand-500/20 transition-all active:scale-[0.98]"
                  >
                    Grant Access
                  </button>
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
