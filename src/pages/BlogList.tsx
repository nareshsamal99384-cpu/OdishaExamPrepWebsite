import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, ChevronRight, Search, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { examService, Exam } from '../lib/examService';
import { getDirectImageUrl } from '../lib/utils';

export default function BlogList() {
  const [blogs, setBlogs] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const exams = await examService.getAllExams();
        setBlogs(exams.filter(e => e.category === 'blog'));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  const filteredBlogs = blogs.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 sm:py-12 md:py-16 px-4 sm:px-6 lg:px-8 font-sans relative">
      
      <Link to="/" className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-bold mb-8 sm:absolute sm:top-8 sm:left-8 bg-white/80 backdrop-blur px-4 py-2 rounded-xl transition-all shadow-sm border border-brand-100 hover:shadow-md">
        <ChevronLeft className="w-4 h-4" /> Back to Home
      </Link>

      <div className="max-w-5xl mx-auto space-y-8 sm:space-y-12 mt-4 sm:mt-8">
        {/* Header */}
        <div className="text-center space-y-3 sm:space-y-4">
          <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="w-16 h-16 sm:w-20 sm:h-20 bg-brand-100 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-sm border border-brand-200/50">
            <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-brand-600" />
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }} className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">OEP <br className="sm:hidden" /><span className="premium-text-gradient">Knowledge Base</span></motion.h1>
          <motion.p initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }} className="text-sm sm:text-base md:text-lg text-slate-500 font-medium max-w-2xl mx-auto px-2">Latest insights, exam strategies, and announcements tailored for Odisha aspirants.</motion.p>
        </div>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }} className="relative max-w-xl mx-auto">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-11 pr-4 py-4 border-2 border-slate-200 rounded-2xl bg-white shadow-sm focus:border-brand-500 focus:ring-0 outline-none transition-all font-bold text-slate-700"
          />
        </motion.div>

        {/* Blog Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="text-center py-16 sm:py-20 text-slate-500 font-semibold space-y-3">
             <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto" />
             <p className="text-sm sm:text-base">No articles found.</p>
          </div>
        ) : (
          <div className="relative group mx-auto w-full max-w-5xl">
            {/* Top/Bottom Gradient Fades for Slider */}
            <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-[#F8FAFC] to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#F8FAFC] to-transparent z-10 pointer-events-none" />

            <div className="max-h-[650px] sm:max-h-[75vh] overflow-y-auto no-scrollbar pb-32 pt-6 px-1 lg:px-4 relative overscroll-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {filteredBlogs.map((blog, idx) => (
                  <motion.div
                    key={blog.id}
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut", delay: 0.4 + ((idx % 6) * 0.1) }}
                    className="h-[380px] sm:h-[420px] will-change-transform"
                  >
                    <Link to={`/blog/${blog.id}`} className="group block h-full bg-white rounded-3xl overflow-hidden shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                      <div className="h-[55%] sm:h-[60%] bg-slate-100 overflow-hidden relative">
                        {blog.icon ? (
                          <img src={getDirectImageUrl(blog.icon)} alt={blog.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex flex-col justify-center items-center bg-gradient-to-br from-brand-50 to-indigo-50">
                            <BookOpen className="w-12 h-12 text-brand-300 mb-2" />
                          </div>
                        )}
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur pb-0 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                          <Calendar className="w-3.5 h-3.5 text-brand-600" />
                          <span className="text-xs font-bold text-slate-700">{blog.examDate ? new Date(blog.examDate).toLocaleDateString() : 'Recent'}</span>
                        </div>
                      </div>
                      <div className="p-5 sm:p-6 h-[45%] sm:h-[40%] flex flex-col justify-between">
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-brand-600 transition-colors leading-tight line-clamp-3">{blog.name}</h3>
                        
                        <div className="flex items-center gap-2 text-brand-600 font-bold text-sm mt-4 shrink-0">
                          Read Article <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
