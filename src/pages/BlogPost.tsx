import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import { 
  Calendar, 
  ChevronLeft, 
  BookMarked, 
  Award, 
  Zap, 
  Sparkles, 
  ChevronRight, 
  Lock, 
  CheckCircle2, 
  Clock, 
  Share2, 
  ThumbsUp, 
  ThumbsDown, 
  ArrowUp, 
  Copy, 
  Check, 
  BookOpen
} from 'lucide-react';
import { examService, Exam, MockTest, QuestionBank } from '../lib/examService';
import { getDirectImageUrl, cn } from '../lib/utils';
import { fadeSlideDown, durations } from '../lib/animations';
import PageLayout from '../components/PageLayout';
import { calculateReadingTime, getBlogCategory } from './BlogList';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export default function BlogPost() {
  const { id } = useParams<{ id: string }>();
  const [blog, setBlog] = useState<Exam | null>(null);
  const [relatedBanks, setRelatedBanks] = useState<QuestionBank[]>([]);
  const [relatedTests, setRelatedTests] = useState<MockTest[]>([]);
  const [loading, setLoading] = useState(true);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackLike, setFeedbackLike] = useState<boolean | null>(null);
  const [likesCount, setLikesCount] = useState(0);

  const [processedDescription, setProcessedDescription] = useState('');
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const isManualScrolling = React.useRef(false);
  const manualScrollTimeout = React.useRef<number | null>(null);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if ((window as any).isProgrammaticScrolling) {
            ticking = false;
            return;
          }
          const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
          if (totalHeight > 0) {
            setScrollProgress((window.scrollY / totalHeight) * 100);
          }
          setShowBackToTop(window.scrollY > 400);

          // Bottom of page detection to highlight last TOC item
          if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 50) {
            if (toc.length > 0 && !isManualScrolling.current) {
              setActiveId(toc[toc.length - 1].id);
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [toc]);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const exams = await examService.getAllExams();
        const found = exams.find(e => e.id === id && e.category === 'blog');
        setBlog(found || null);

        if (found) {
          const storedLikes = localStorage.getItem(`oep_likes_${found.id}`);
          if (storedLikes) {
            setLikesCount(parseInt(storedLikes, 10));
          } else {
            const seed = found.id ? found.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 42;
            const initialLikes = (seed % 30) + 15;
            setLikesCount(initialLikes);
            localStorage.setItem(`oep_likes_${found.id}`, initialLikes.toString());
          }

          if (found.targetExamId) {
            const [allBanks, allTests] = await Promise.all([
              examService.getAllQuestionBanks(),
              examService.getAllMockTestsLite()
            ]);

            setRelatedBanks(allBanks.filter(b => b.examId === found.targetExamId).slice(0, 3));
            setRelatedTests(allTests.filter(t => {
               try { return JSON.parse(t.seriesId).examId === found.targetExamId; } catch(e) { return false; }
            }).slice(0, 3));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBlog();
  }, [id]);

  useEffect(() => {
    if (!blog?.description) {
      setProcessedDescription('');
      setToc([]);
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(blog.description, 'text/html');
    const headings = doc.querySelectorAll('h2, h3');
    const items: TocItem[] = [];

    headings.forEach((heading, index) => {
      const text = heading.textContent || '';
      const anchorId = `section-${index}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      heading.setAttribute('id', anchorId);
      heading.classList.add('scroll-mt-24');

      items.push({
        id: anchorId,
        text,
        level: heading.tagName.toLowerCase() === 'h2' ? 2 : 3
      });
    });

    setToc(items);
    setProcessedDescription(doc.body.innerHTML);
  }, [blog?.description]);

  useEffect(() => {
    if (toc.length === 0 || !processedDescription) return;

    const observer = new IntersectionObserver((entries) => {
      if (isManualScrolling.current) return; // Ignore observer updates during click scroll
      
      entries.forEach(entry => {
        if (entry.isIntersecting) setActiveId(entry.target.id);
      });
    }, { root: null, rootMargin: '-85px 0px -65% 0px', threshold: 0 });

    toc.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
      if (manualScrollTimeout.current) clearTimeout(manualScrollTimeout.current);
    };
  }, [toc, processedDescription]);

  useEffect(() => {
    if (!blog) return;

    const seoTitle = blog.metaTitle || `${blog.name} | OdishaExamPrep`;
    const seoDesc = blog.metaDescription || (blog.description.replace(/<[^>]*>/g, '').substring(0, 155).trim() + '...');
    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;
    const imageUrl = blog.icon ? getDirectImageUrl(blog.icon) : '';

    document.title = seoTitle;
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', seoDesc);

    const schemaJson = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": blog.name,
      "description": seoDesc,
      "image": imageUrl || "https://odishaexamprep.in/og-image.jpg",
      "datePublished": blog.examDate || blog.createdAt,
      "author": { "@type": "Organization", "name": "OdishaExamPrep" }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'json-ld-schema';
    script.text = JSON.stringify(schemaJson);
    document.head.appendChild(script);

    return () => {
      document.getElementById('json-ld-schema')?.remove();
    };
  }, [blog]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFeedback = (isHelpful: boolean) => {
    setFeedbackSubmitted(true);
    setFeedbackLike(isHelpful);
    if (isHelpful && blog?.id) {
        const nextLikes = likesCount + 1;
        setLikesCount(nextLikes);
        localStorage.setItem(`oep_likes_${blog.id}`, nextLikes.toString());
    }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    
    // Instantly highlight the clicked TOC item and block observer overrides
    isManualScrolling.current = true;
    setActiveId(id);
    if (manualScrollTimeout.current) window.clearTimeout(manualScrollTimeout.current);

    const targetY = el.getBoundingClientRect().top + window.scrollY - 100; // 100px offset for padding/header
    const startY = window.scrollY;
    const difference = targetY - startY;
    const duration = 800; // Duration in milliseconds
    let start: number | null = null;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      const percentage = Math.min(progress / duration, 1);
      
      // Easing: easeInOutCubic
      const ease = percentage < 0.5 
        ? 4 * percentage * percentage * percentage 
        : 1 - Math.pow(-2 * percentage + 2, 3) / 2;

      window.scrollTo(0, startY + difference * ease);

      if (progress < duration) {
        window.requestAnimationFrame(step);
      } else {
        // Unlock observer scrolling after settles
        manualScrollTimeout.current = window.setTimeout(() => {
          isManualScrolling.current = false;
        }, 100);
      }
    };

    window.requestAnimationFrame(step);
  };

  if (loading) return <PageLayout className="flex items-center justify-center min-h-screen"><div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></PageLayout>;

  if (!blog) return <PageLayout className="flex flex-col items-center justify-center py-24 px-4 text-center"><div className="bg-white p-12 rounded-3xl border border-slate-200/80 shadow-md max-w-md"><BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" /><h1 className="text-3xl font-black text-slate-800">Article Not Found</h1><Link to="/blog" className="mt-6 inline-block bg-brand-600 text-white px-6 py-3 rounded-xl font-black">Back to Blog</Link></div></PageLayout>;

  const category = getBlogCategory(blog);
  const readingTime = calculateReadingTime(blog.description);

  return (
    <PageLayout>
      <div className="fixed top-0 left-0 h-1 bg-brand-600 z-[100] transition-all duration-75" style={{ width: `${scrollProgress}%` }} />
      <div className="w-full h-80 sm:h-[420px] bg-slate-950 relative overflow-hidden flex items-end">
        {blog.icon ? <img src={getDirectImageUrl(blog.icon)} alt={blog.name} className="absolute inset-0 w-full h-full object-cover opacity-35" /> : <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-indigo-950 opacity-90" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/30 to-slate-950/20" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 sm:-mt-40 relative z-10 pb-20">
        <div className="flex flex-row items-center justify-between gap-3 mb-6 sm:mb-8">
          <nav className="flex items-center gap-1.5 text-[10px] sm:text-xs font-black bg-white/90 backdrop-blur px-3 py-2 rounded-xl shadow-sm border border-slate-100/80 min-w-0">
            <Link to="/" className="hover:text-brand-600 shrink-0">Home</Link>
            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
            <Link to="/blog" className="hover:text-brand-600 shrink-0">Blog</Link>
            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-slate-400 truncate max-w-[80px] xs:max-w-[120px] sm:max-w-[200px]">{blog.name}</span>
          </nav>
          <Link to="/blog" className="inline-flex items-center gap-1 text-slate-650 hover:text-brand-600 font-extrabold bg-white/95 backdrop-blur px-3 py-2 rounded-xl shadow-sm border border-slate-100 text-xs sm:text-sm shrink-0">
            <ChevronLeft className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Back</span><span className="hidden sm:inline"> to Articles</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          <div className="lg:col-span-8 space-y-8">
            <motion.article {...fadeSlideDown} className="bg-white rounded-[1.75rem] sm:rounded-[2.5rem] p-5 sm:p-10 md:p-14 shadow-xl border border-slate-100">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-bold text-slate-400 mb-5 sm:mb-6 uppercase tracking-wider">
                <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-xl">{category}</span>
                <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {blog.examDate ? new Date(blog.examDate).toLocaleDateString() : 'Recent Update'}</div>
                <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {readingTime} min read</div>
              </div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6 sm:mb-8 leading-tight font-serif">{blog.name}</h1>
              <div className="prose max-w-none prose-headings:font-black prose-p:text-slate-600 prose-img:rounded-3xl" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processedDescription || blog.description) }} />
            </motion.article>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Share Box */}
              <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-100 shadow-lg space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-brand-600 animate-bounce" />
                    <h4 className="text-lg font-black text-slate-800">Share Strategy</h4>
                  </div>
                  <p className="text-xs font-semibold text-slate-400 mt-2">Knowledge grows when shared. Support fellow Odisha exam aspirants.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {/* Share on WhatsApp */}
                  <a 
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(blog.name + ' - ' + window.location.href)}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 rounded-2xl transition-all shadow-sm"
                    title="Share on WhatsApp"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12.012 2c-5.506 0-9.988 4.482-9.988 9.988 0 1.838.498 3.56 1.366 5.048L2 22l5.12-1.34c1.424.776 3.036 1.216 4.75 1.216 5.506 0 9.988-4.482 9.988-9.988C22 6.482 17.518 2 12.012 2zm6.2 14.168c-.254.716-1.47 1.408-2.022 1.476-.504.06-1.15.1-3.376-.826-2.846-1.182-4.664-4.088-4.806-4.276-.14-.188-1.144-1.522-1.144-2.906 0-1.386.726-2.062.982-2.332.256-.27.564-.338.75-.338.19 0 .378.002.542.01.17.008.396-.064.62.484.228.56.778 1.9.846 2.04.068.138.114.3.022.484-.092.186-.138.302-.276.464-.136.162-.288.362-.41.488-.138.138-.282.288-.12.568.162.28 1.14 1.884 2.454 3.056 1.692 1.51 3.116 1.978 3.556 2.16.44.182.7.15.962-.15.264-.3.1.5-.044.782z"/>
                    </svg>
                  </a>
                  
                  {/* Share on Twitter/X */}
                  <a 
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.name)}&url=${encodeURIComponent(window.location.href)}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl transition-all shadow-sm"
                    title="Share on Twitter/X"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>

                  {/* Share on Telegram */}
                  <a 
                    href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(blog.name)}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center p-3 bg-sky-50 hover:bg-sky-100 border border-sky-100 text-sky-700 rounded-2xl transition-all shadow-sm"
                    title="Share on Telegram"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-1-.65-.35-1 .22-1.58.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.24-5.54 3.65-.52.36-.99.54-1.41.53-.46-.01-1.34-.26-2-.48-.8-.27-1.44-.41-1.39-.87.03-.24.36-.49.99-.75 3.88-1.69 6.46-2.8 7.74-3.33 3.68-1.53 4.44-1.8 4.94-1.8.11 0 .35.02.5.15.13.11.17.27.18.37 0 .09-.01.2-.02.27z"/>
                    </svg>
                  </a>

                  {/* Copy Link */}
                  <button 
                    onClick={handleCopyLink} 
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-3 border rounded-2xl transition-all font-black text-xs shadow-sm flex-1 justify-center",
                      copied ? "bg-green-50 border-green-200 text-green-700" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Copied!" : "Copy Link"}
                  </button>
                </div>
              </div>

              {/* Feedback Box */}
              <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-100 shadow-lg flex flex-col justify-between min-h-[160px]">
                <AnimatePresence mode="wait">
                  {!feedbackSubmitted ? (
                    <motion.div 
                      key="feedback-form"
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <h4 className="text-lg font-black text-slate-800">Was this helpful?</h4>
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => handleFeedback(true)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-50 hover:bg-brand-100 border border-brand-100 text-brand-700 font-extrabold text-sm rounded-2xl transition-colors shadow-sm"><ThumbsUp className="w-4 h-4" /> Yes</button>
                        <button onClick={() => handleFeedback(false)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-extrabold text-sm rounded-2xl transition-colors shadow-sm"><ThumbsDown className="w-4 h-4" /> No</button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="feedback-thanks"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-4 space-y-3 flex-1 flex flex-col justify-center items-center"
                    >
                      <CheckCircle2 className="w-10 h-10 text-green-500 animate-pulse" />
                      <h4 className="text-base font-black text-slate-800">Thank you for your feedback!</h4>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="text-[11px] font-bold text-slate-400 border-t border-slate-100 pt-3.5 mt-4">Liked by {likesCount} aspirants</div>
              </div>
            </div>
          </div>
          <aside className="lg:col-span-4 space-y-8">
            <div className="sticky top-24 space-y-8">
              {toc.length > 0 && (
                <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-100 shadow-lg space-y-4">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-50 pb-2">Table of Contents</h4>
                  <nav className="max-h-64 overflow-y-auto no-scrollbar py-1 space-y-2.5">
                    {toc.map(item => (
                      <a 
                        key={item.id} 
                        href={`#${item.id}`} 
                        onClick={(e) => {
                          e.preventDefault();
                          scrollToSection(item.id);
                        }}
                        className={cn(
                          "block text-xs font-bold leading-snug transition-all",
                          item.level === 3 ? "pl-4 text-[11px]" : "",
                          activeId === item.id ? "text-brand-600 font-black translate-x-1" : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        {item.text}
                      </a>
                    ))}
                  </nav>
                </div>
              )}

              {/* Recommended Items */}
              {(relatedBanks.length > 0 || relatedTests.length > 0) ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 px-2">
                    <Sparkles className="w-5 h-5 text-brand-600 animate-pulse" />
                    <h2 className="text-lg font-black text-slate-900">Recommended for You</h2>
                  </div>

                  {/* Question Banks */}
                  {relatedBanks.length > 0 && (
                    <div className="space-y-4">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2 block">Question Banks</span>
                      {relatedBanks.map(bank => (
                        <Link
                          key={bank.id}
                          to="/"
                          className="group block bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-brand-200 transition-all duration-300"
                        >
                          <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                              <BookMarked className="w-6 h-6 text-brand-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-extrabold text-slate-900 text-sm line-clamp-1 group-hover:text-brand-600 transition-colors">{bank.title}</h3>
                              <p className="text-[11px] text-slate-400 font-bold mt-0.5">{bank.questionCount || bank.questions || bank.question_count || bank.questioncount || 0}+ Practice Sets</p>
                              <div className="flex items-center gap-2 mt-2">
                                {bank.isPremium ? (
                                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Premium</span>
                                ) : (
                                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-emerald-100"><Zap className="w-2.5 h-2.5 animate-pulse" /> Free</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Mock Tests */}
                  {relatedTests.length > 0 && (
                    <div className="space-y-4">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2 block">Mock Tests</span>
                      {relatedTests.map(test => {
                        let isPremium = false;
                        try { isPremium = JSON.parse(test.seriesId).isPremium; } catch(e){}
                        return (
                          <Link
                            key={test.id}
                            to="/"
                            className="group block bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-brand-200 transition-all duration-300"
                          >
                            <div className="flex gap-4">
                              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                                <Award className="w-6 h-6 text-indigo-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-extrabold text-slate-900 text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors">{test.title}</h3>
                                <p className="text-[11px] text-slate-400 font-bold mt-0.5">{test.durationMinutes} Mins • {test.totalMarks} Marks</p>
                                <div className="flex items-center gap-2 mt-2">
                                  {isPremium ? (
                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Premium</span>
                                  ) : (
                                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-blue-100"><CheckCircle2 className="w-2.5 h-2.5" /> Free</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  <Link to="/" className="flex items-center justify-center gap-2 w-full py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-black shadow-lg transition-all duration-300 mt-4 text-sm">Explore All Content <ChevronRight className="w-4 h-4" /></Link>
                </div>
              ) : (
                /* Fallback OEP Master Pass Card */
                <div className="bg-gradient-to-br from-brand-600 to-indigo-600 rounded-[2rem] p-8 text-white relative overflow-hidden group shadow-xl">
                  <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-white/10 blur-xl group-hover:scale-125 transition-transform" />
                  <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-brand-500/30 blur-lg" />
                  <div className="absolute top-6 right-6 p-1.5 bg-white/10 backdrop-blur rounded-xl opacity-80 group-hover:rotate-12 transition-transform">
                    <Zap className="w-8 h-8 text-amber-300 animate-bounce" />
                  </div>
                  <span className="bg-white/20 backdrop-blur text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">OEP Master Pass</span>
                  <h3 className="text-2xl font-black mt-4 mb-3 leading-tight relative z-10">Start Your Journey with OEP</h3>
                  <p className="text-white/80 font-bold text-xs mb-6 leading-relaxed relative z-10">Get access to 50k+ questions, 200+ mock tests, performance metrics, and revision notes.</p>
                  <ul className="text-xs font-semibold space-y-2 mb-8 relative z-10 text-white/90">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" /><span>OPSC, OSSC, OSSSC Syllabus Covered</span></li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" /><span>State Rank & Real-time Analysis</span></li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" /><span>PDF study material & practice packs</span></li>
                  </ul>
                  <Link to="/" className="inline-flex items-center justify-center gap-2 w-full bg-white hover:bg-slate-50 text-brand-600 px-6 py-4.5 rounded-2xl font-black text-sm hover:shadow-2xl transition-all duration-300 relative z-10">Get Premium Access <ChevronRight className="w-4 h-4" /></Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
      <AnimatePresence>
        {showBackToTop && <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={scrollToTop} className="fixed bottom-6 right-6 p-4 bg-brand-600 text-white rounded-full shadow-xl z-50"><ArrowUp className="w-5 h-5" /></motion.button>}
      </AnimatePresence>
    </PageLayout>
  );
}
