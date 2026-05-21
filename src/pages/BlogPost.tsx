import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ChevronLeft, BookMarked, Award, Zap, Sparkles, ChevronRight, Lock, CheckCircle2 } from 'lucide-react';
import { examService, Exam, MockTest, QuestionBank } from '../lib/examService';
import { getDirectImageUrl, cn } from '../lib/utils';

export default function BlogPost() {
  const { id } = useParams<{ id: string }>();
  const [blog, setBlog] = useState<Exam | null>(null);
  const [relatedBanks, setRelatedBanks] = useState<QuestionBank[]>([]);
  const [relatedTests, setRelatedTests] = useState<MockTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const exams = await examService.getAllExams();
        const found = exams.find(e => e.id === id && e.category === 'blog');
        setBlog(found || null);
        
        if (found) {
          // SEO Optimization
          const seoTitle = found.metaTitle || `${found.name} | OdishaExamPrep`;
          document.title = seoTitle;

          let metaDesc = document.querySelector('meta[name="description"]');
          if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.setAttribute('name', 'description');
            document.head.appendChild(metaDesc);
          }
          metaDesc.setAttribute('content', found.metaDescription || (found.description.replace(/<[^>]*>/g, '').substring(0, 160) + '...'));

          // JSON-LD
          const schemaJson = {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": found.name,
            "description": found.metaDescription || found.description.replace(/<[^>]*>/g, '').substring(0, 160),
            "image": getDirectImageUrl(found.icon),
            "datePublished": found.examDate || found.createdAt,
            "author": { "@type": "Organization", "name": "OdishaExamPrep" }
          };
          
          const script = document.createElement('script');
          script.type = 'application/ld+json';
          script.id = 'json-ld-schema';
          script.text = JSON.stringify(schemaJson);
          document.head.appendChild(script);

          // Fetch related promotional content
          if (found.targetExamId) {
            const [allBanks, allTests] = await Promise.all([
              examService.getAllQuestionBanks(),
              examService.getAllMockTests()
            ]);

            setRelatedBanks(allBanks.filter(b => b.examId === found.targetExamId).slice(0, 3));
            setRelatedTests(allTests.filter(t => {
               try {
                 return JSON.parse(t.seriesId).examId === found.targetExamId;
               } catch(e) { return false; }
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
    
    return () => { 
      document.title = 'OdishaExamPrep'; 
      document.getElementById('json-ld-schema')?.remove();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] pb-20">
        <h1 className="text-3xl font-black text-slate-800 mb-4">Post Not Found</h1>
        <Link to="/blog" className="px-6 py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all">
          Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-24">
      <div className="w-full h-64 sm:h-80 bg-slate-900 relative overflow-hidden flex items-end">
         {blog.icon ? (
            <img src={getDirectImageUrl(blog.icon)} alt={blog.name} className="absolute inset-0 w-full h-full object-cover opacity-30" />
         ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-indigo-950 opacity-90" />
         )}
         <div className="absolute inset-0 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/50 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 sm:-mt-40 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Main Content Area */}
          <div className="lg:col-span-8">
            <Link to="/blog" className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-bold mb-4 sm:mb-8 bg-white/50 backdrop-blur px-4 py-2 rounded-lg transition-colors shadow-sm w-fit border border-white/60 text-sm sm:text-base">
              <ChevronLeft className="w-4 h-4" /> Back to Articles
            </Link>

            <motion.article 
              initial={{ opacity: 0, y: -40 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="bg-white rounded-[2rem] sm:rounded-3xl p-6 sm:p-8 md:p-14 shadow-xl border border-slate-200/50"
            >
              <div className="flex items-center gap-2 sm:gap-3 text-slate-500 font-semibold mb-4 sm:mb-6 text-sm sm:text-base">
                 <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600" />
                 {blog.examDate ? new Date(blog.examDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recent Update'}
              </div>
              
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-8 sm:mb-12">
                {blog.name}
              </h1>

              <div 
                 className="prose prose-base sm:prose-lg prose-slate max-w-none 
                            prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900 
                            prose-p:text-slate-700 prose-p:leading-relaxed 
                            prose-a:text-brand-600 prose-a:font-semibold hover:prose-a:text-brand-700
                            prose-img:rounded-2xl prose-img:shadow-lg
                            prose-pre:bg-slate-900 prose-pre:rounded-xl"
                 dangerouslySetInnerHTML={{ __html: blog.description }} 
              />
            </motion.article>
          </div>

          {/* Promotion Sidebar */}
          <aside className="lg:col-span-4 space-y-8">
            {(relatedBanks.length > 0 || relatedTests.length > 0) ? (
              <div className="sticky top-24 pt-4 lg:pt-20">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 px-2">
                    <Sparkles className="w-5 h-5 text-brand-600" />
                    <h2 className="text-xl font-black text-slate-900">Recommended for You</h2>
                  </div>

                  {/* Question Banks */}
                  {relatedBanks.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-sm font-black text-slate-500 uppercase tracking-widest">Question Banks</span>
                      </div>
                      {relatedBanks.map(bank => (
                        <Link 
                          key={bank.id} 
                          to="/dashboard" 
                          className="group block bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-200 transition-all"
                        >
                          <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                              <BookMarked className="w-6 h-6 text-brand-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-extrabold text-slate-900 text-sm line-clamp-1 group-hover:text-brand-600 transition-colors">{bank.title}</h3>
                              <p className="text-xs text-slate-500 font-bold mt-0.5">{bank.questionCount}+ Questions</p>
                              <div className="flex items-center gap-2 mt-2">
                                {bank.isPremium ? (
                                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5" /> Premium
                                  </span>
                                ) : (
                                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <Zap className="w-2.5 h-2.5" /> Free
                                  </span>
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
                      <div className="flex items-center justify-between px-2">
                        <span className="text-sm font-black text-slate-500 uppercase tracking-widest">Mock Tests</span>
                      </div>
                      {relatedTests.map(test => {
                        let isPremium = false;
                        try { isPremium = JSON.parse(test.seriesId).isPremium; } catch(e){}
                        return (
                          <Link 
                            key={test.id} 
                            to="/dashboard" 
                            className="group block bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-200 transition-all"
                          >
                            <div className="flex gap-4">
                              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                                <Award className="w-6 h-6 text-indigo-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-extrabold text-slate-900 text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors">{test.title}</h3>
                                <p className="text-xs text-slate-500 font-bold mt-0.5">{test.durationMinutes} Mins • {test.totalMarks} Marks</p>
                                <div className="flex items-center gap-2 mt-2">
                                  {isPremium ? (
                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                      <Lock className="w-2.5 h-2.5" /> Premium
                                    </span>
                                  ) : (
                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                      <CheckCircle2 className="w-2.5 h-2.5" /> Free
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  <Link 
                    to="/dashboard" 
                    className="flex items-center justify-center gap-2 w-full py-4 bg-brand-600 text-white rounded-2xl font-black shadow-lg hover:shadow-xl hover:bg-brand-700 transition-all mt-4"
                  >
                    Explore All Content <ChevronRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="sticky top-24 pt-4 lg:pt-20">
                 <div className="bg-brand-600 rounded-3xl p-8 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                      <Zap className="w-24 h-24" />
                    </div>
                    <h3 className="text-2xl font-black mb-4 relative z-10">Start Your Journey with OEP</h3>
                    <p className="text-white/80 font-bold text-sm mb-6 relative z-10">Get access to 50k+ questions and premium mock tests tailored for Odisha excellence.</p>
                    <Link to="/dashboard" className="inline-flex items-center gap-2 bg-white text-brand-600 px-6 py-3 rounded-xl font-black text-sm hover:shadow-xl transition-all relative z-10">
                      Go to Dashboard <ChevronRight className="w-4 h-4" />
                    </Link>
                 </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
