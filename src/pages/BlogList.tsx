import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, ChevronRight, Search, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { examService, Exam } from '../lib/examService';
import { getDirectImageUrl } from '../lib/utils';
import { fadeSlideDown, fadeSlideUp, durations } from '../lib/animations';
import PageLayout from '../components/PageLayout';

// Helpers for Reading Time and Snippet extraction
export const calculateReadingTime = (htmlContent: string): number => {
  const text = (htmlContent || '').replace(/<[^>]*>/g, '');
  const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  return Math.max(1, Math.round(words / 200));
};

export const getSnippet = (htmlContent: string, maxLength = 120): string => {
  const text = (htmlContent || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ');
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

export const getBlogCategory = (blog: Exam): string => {
  const text = ((blog.name || '') + ' ' + (blog.keywords || '') + ' ' + (blog.metaDescription || '')).toLowerCase();
  if (text.includes('strategy') || text.includes('how to') || text.includes('tips') || text.includes('crack') || text.includes('guide')) {
    return 'Exam Strategy';
  }
  if (text.includes('notification') || text.includes('admit') || text.includes('date') || text.includes('announce') || text.includes('job') || text.includes('recruitment')) {
    return 'Notifications';
  }
  if (text.includes('current') || text.includes('affairs') || text.includes('news') || text.includes('daily') || text.includes('monthly')) {
    return 'Current Affairs';
  }
  if (text.includes('syllabus') || text.includes('prep') || text.includes('subject') || text.includes('math') || text.includes('gs') || text.includes('history')) {
    return 'Subject Prep';
  }
  return 'Latest Updates';
};

const CATEGORIES = ['All', 'Exam Strategy', 'Notifications', 'Current Affairs', 'Subject Prep', 'Latest Updates'];

export default function BlogList() {
  const [blogs, setBlogs] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const exams = await examService.getAllExams();
        const blogItems = exams.filter(e => e.category === 'blog');
        
        // Sort blogs by date descending, fallback to creation
        const sortedBlogs = [...blogItems].sort((a, b) => {
          const dateA = a.examDate ? new Date(a.examDate).getTime() : 0;
          const dateB = b.examDate ? new Date(b.examDate).getTime() : 0;
          return dateB - dateA;
        });
        
        setBlogs(sortedBlogs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  // SEO Optimization for Blog Home page
  useEffect(() => {
    const seoTitle = 'OEP Knowledge Base & Prep Blog | OdishaExamPrep';
    const seoDesc = 'Expert strategy guides, syllabus breakdowns, recruitment updates, current affairs, and comprehensive preparation strategies for OPSC, OSSC, and OSSSC aspirants in Odisha.';
    document.title = seoTitle;

    // Inject/Update Description
    let metaDesc = document.querySelector('meta[name="description"]');
    const createdMetaDesc = !metaDesc;
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    const prevDesc = metaDesc.getAttribute('content');
    metaDesc.setAttribute('content', seoDesc);

    // Inject/Update Keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    const createdMetaKeywords = !metaKeywords;
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    const prevKeywords = metaKeywords.getAttribute('content');
    metaKeywords.setAttribute('content', 'odisha exam preparation, opsc cse blog, ossc cgl tips, osssc ri amin prep, current affairs odisha, exam syllabus, how to crack opsc');

    // Inject/Update Open Graph Tags
    const ogTags = [
      { property: 'og:title', content: seoTitle },
      { property: 'og:description', content: seoDesc },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: window.location.href },
    ];
    const createdOgTags: HTMLMetaElement[] = [];
    ogTags.forEach(tag => {
      let el = document.querySelector(`meta[property="${tag.property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', tag.property);
        document.head.appendChild(el);
        createdOgTags.push(el as HTMLMetaElement);
      }
      el.setAttribute('content', tag.content);
    });

    return () => {
      document.title = 'OdishaExamPrep';
      if (createdMetaDesc && metaDesc) metaDesc.remove();
      else if (metaDesc && prevDesc) metaDesc.setAttribute('content', prevDesc);

      if (createdMetaKeywords && metaKeywords) metaKeywords.remove();
      else if (metaKeywords && prevKeywords) metaKeywords.setAttribute('content', prevKeywords);

      createdOgTags.forEach(el => el.remove());
    };
  }, []);

  const filteredBlogs = blogs.filter(blog => {
    const matchesSearch = blog.name.toLowerCase().includes(search.toLowerCase()) || 
                          (blog.keywords || '').toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || getBlogCategory(blog) === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Extract featured post (newest post when there's no active search/category filter)
  const isSearchActive = search.trim() !== '';
  const isCategoryFilterActive = selectedCategory !== 'All';
  const showFeaturedSection = !isSearchActive && !isCategoryFilterActive && filteredBlogs.length > 0;
  
  const featuredBlog = showFeaturedSection ? filteredBlogs[0] : null;
  const gridBlogs = showFeaturedSection ? filteredBlogs.slice(1) : filteredBlogs;

  return (
    <PageLayout backTo={{ path: '/', label: 'Back to Home' }}>
      <div className="py-8 sm:py-12 md:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10 sm:space-y-16">
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <motion.div 
            {...fadeSlideDown} 
            transition={{ ...fadeSlideDown.transition, duration: durations.slow }} 
            className="w-16 h-16 sm:w-20 sm:h-20 bg-brand-100/80 backdrop-blur rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-brand-200/50"
          >
            <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-brand-600 animate-pulse" />
          </motion.div>
          <motion.h1 
            {...fadeSlideDown} 
            transition={{ ...fadeSlideDown.transition, duration: durations.slow, delay: 0.1 }} 
            className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-none"
          >
            OEP <span className="premium-text-gradient">Knowledge Base</span>
          </motion.h1>
          <motion.p 
            {...fadeSlideDown} 
            transition={{ ...fadeSlideDown.transition, duration: durations.slow, delay: 0.2 }} 
            className="text-base sm:text-lg text-slate-500 font-semibold leading-relaxed"
          >
            Latest insights, detailed exam strategies, recruitment schedules, and study material designed for Odisha excellence.
          </motion.p>
        </div>

        {/* Search and Categories controls */}
        <motion.div 
          {...fadeSlideDown} 
          transition={{ ...fadeSlideDown.transition, duration: durations.slow, delay: 0.3 }} 
          className="space-y-6 max-w-4xl mx-auto"
        >
          {/* Search bar */}
          <div className="relative max-w-xl mx-auto shadow-sm hover:shadow-md transition-shadow duration-350 rounded-2xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search articles, keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-11 pr-4 py-4 border-2 border-slate-200 rounded-2xl bg-white focus:border-brand-500 focus:ring-0 outline-none transition-all font-bold text-slate-700 placeholder-slate-400"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex justify-start sm:justify-center overflow-x-auto no-scrollbar py-2 gap-2 scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0">
            {CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full font-black text-sm transition-all duration-300 border-2 ${
                  selectedCategory === category
                    ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-200/50 scale-105'
                    : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300 hover:text-slate-900 shadow-sm'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Loading state */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredBlogs.length === 0 ? (
          /* Empty state */
          <motion.div 
            {...fadeSlideUp}
            className="text-center py-20 text-slate-500 bg-white rounded-3xl border border-slate-200/60 max-w-2xl mx-auto shadow-sm space-y-4 p-8"
          >
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-xl font-extrabold text-slate-800">No articles found</h3>
            <p className="text-sm text-slate-400 font-bold max-w-md mx-auto">We couldn't find any articles matching your search filters. Try selecting another category or typing another keyword.</p>
            <button 
              onClick={() => { setSearch(''); setSelectedCategory('All'); }}
              className="mt-2 px-5 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 font-black text-sm rounded-xl transition-colors"
            >
              Reset Filters
            </button>
          </motion.div>
        ) : (
          /* Main Blog Content */
          <div className="space-y-12">
            
            {/* Featured Post (Latest) */}
            {featuredBlog && (
              <motion.div 
                {...fadeSlideUp}
                transition={{ duration: durations.slow }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-brand-600/5 to-indigo-600/5 rounded-[1.75rem] sm:rounded-[2.5rem] blur-2xl -z-10 group-hover:opacity-100 transition-opacity" />
                <Link 
                  to={`/blog/${featuredBlog.id}`} 
                  className="flex flex-col lg:flex-row bg-white rounded-[1.75rem] sm:rounded-[2.5rem] border border-slate-200/80 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-350 min-h-[420px]"
                >
                  {/* Featured Image */}
                  <div className="w-full lg:w-[55%] h-64 sm:h-80 lg:h-auto bg-slate-100 relative overflow-hidden shrink-0">
                    {featuredBlog.icon ? (
                      <img 
                        src={getDirectImageUrl(featuredBlog.icon)} 
                        alt={featuredBlog.name} 
                        loading="eager"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col justify-center items-center bg-gradient-to-br from-brand-50 to-indigo-50">
                        <BookOpen className="w-16 h-16 text-brand-300" />
                      </div>
                    )}
                    {/* Category Overlay */}
                    <div className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-brand-600 text-white font-black text-xs uppercase tracking-widest px-4 py-2 rounded-xl shadow-md">
                      Featured • {getBlogCategory(featuredBlog)}
                    </div>
                  </div>

                  {/* Featured Content details */}
                  <div className="p-5 sm:p-8 md:p-12 lg:w-[45%] flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      {/* Meta information */}
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-brand-500" />
                          <span>{featuredBlog.examDate ? new Date(featuredBlog.examDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recent'}</span>
                        </div>
                        <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>{calculateReadingTime(featuredBlog.description)} min read</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 group-hover:text-brand-600 transition-colors leading-tight tracking-tight font-serif">
                        {featuredBlog.name}
                      </h2>

                      {/* Excerpt */}
                      <p className="text-sm sm:text-base text-slate-500 font-semibold leading-relaxed line-clamp-3">
                        {getSnippet(featuredBlog.description, 180)}
                      </p>
                    </div>

                    {/* Action */}
                    <div className="flex items-center gap-2 text-brand-600 font-black text-sm group-hover:gap-3 transition-all">
                      Read Full Strategy <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

            {/* Standard Grid of articles */}
            {gridBlogs.length > 0 && (
              <div className="space-y-6 sm:space-y-8">
                {showFeaturedSection && (
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight border-b border-slate-100 pb-3 flex items-center gap-2">
                    Latest Articles
                  </h3>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-10">
                  {gridBlogs.map((blog, idx) => {
                    const category = getBlogCategory(blog);
                    const readTime = calculateReadingTime(blog.description);
                    const excerpt = getSnippet(blog.description, 95);

                    return (
                      <motion.div
                        key={blog.id}
                        {...fadeSlideUp}
                        transition={{ duration: durations.slow, delay: (idx % 6) * 0.1 }}
                        className="flex"
                      >
                        <Link 
                          to={`/blog/${blog.id}`} 
                          className="group flex flex-col bg-white rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden border border-slate-200/80 shadow-md hover:shadow-2xl transition-all duration-350 w-full"
                        >
                          {/* Card Image */}
                          <div className="h-48 sm:h-52 bg-slate-100 overflow-hidden relative shrink-0">
                            {blog.icon ? (
                              <img 
                                src={getDirectImageUrl(blog.icon)} 
                                alt={blog.name} 
                                loading="lazy" 
                                className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" 
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col justify-center items-center bg-gradient-to-br from-brand-50 to-indigo-50">
                                <BookOpen className="w-12 h-12 text-brand-300" />
                              </div>
                            )}

                            {/* Tags overlay */}
                            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl flex items-center shadow-sm">
                              <span className="text-[10px] font-black text-brand-700 uppercase tracking-wider">{category}</span>
                            </div>
                          </div>

                          {/* Card Content details */}
                          <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                            <div className="space-y-3">
                              {/* Metadata */}
                              <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{blog.examDate ? new Date(blog.examDate).toLocaleDateString() : 'Recent'}</span>
                                </div>
                                <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{readTime} min read</span>
                                </div>
                              </div>

                              {/* Title */}
                              <h4 className="text-base sm:text-lg font-extrabold font-serif text-slate-900 group-hover:text-brand-600 transition-colors leading-snug line-clamp-2">
                                {blog.name}
                              </h4>

                              {/* Text Excerpt */}
                              <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed line-clamp-2">
                                {excerpt}
                              </p>
                            </div>

                            {/* CTA */}
                            <div className="flex items-center gap-1.5 text-brand-600 font-extrabold text-xs group-hover:gap-2.5 transition-all pt-2 shrink-0">
                              Read Strategy <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
