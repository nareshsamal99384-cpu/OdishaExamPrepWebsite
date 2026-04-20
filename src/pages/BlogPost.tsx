import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ChevronLeft } from 'lucide-react';
import { examService, Exam } from '../lib/examService';
import { getDirectImageUrl } from '../lib/utils';

export default function BlogPost() {
  const { id } = useParams<{ id: string }>();
  const [blog, setBlog] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const exams = await examService.getAllExams();
        const found = exams.find(e => e.id === id && e.category === 'blog');
        setBlog(found || null);
        
        // Dynamically update document title for SEO
        if (found) {
           document.title = `${found.name} | OdishaExamPrep`;
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBlog();
    
    // Cleanup title
    return () => { document.title = 'OdishaExamPrep'; };
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
      {/* Article Header Background */}
      <div className="w-full h-64 sm:h-80 bg-slate-900 relative overflow-hidden flex items-end">
         {blog.icon ? (
            <img src={getDirectImageUrl(blog.icon)} alt={blog.name} className="absolute inset-0 w-full h-full object-cover opacity-30" />
         ) : (
           <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-indigo-950 opacity-90" />
         )}
         <div className="absolute inset-0 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/50 to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-12 -mt-24 sm:-mt-40 relative z-10">
        <Link to="/blog" className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-bold mb-4 sm:mb-8 bg-white/50 backdrop-blur px-4 py-2 rounded-lg transition-colors shadow-sm w-fit border border-white/60 text-sm sm:text-base">
          <ChevronLeft className="w-4 h-4" /> Back to Articles
        </Link>

        <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="bg-white rounded-[2rem] sm:rounded-3xl p-6 sm:p-8 md:p-14 shadow-xl border border-slate-200/50">
          <div className="flex items-center gap-2 sm:gap-3 text-slate-500 font-semibold mb-4 sm:mb-6 text-sm sm:text-base">
             <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600" />
             {blog.examDate ? new Date(blog.examDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recent Update'}
          </div>
          
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-8 sm:mb-12">
            {blog.name}
          </h1>

          {/* HTML Injection block: Because the user will paste raw HTML in the admin panel */}
          <div 
             className="prose prose-base sm:prose-lg prose-slate max-w-none 
                        prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900 
                        prose-p:text-slate-700 prose-p:leading-relaxed 
                        prose-a:text-brand-600 prose-a:font-semibold hover:prose-a:text-brand-700
                        prose-img:rounded-2xl prose-img:shadow-lg
                        prose-pre:bg-slate-900 prose-pre:rounded-xl"
             dangerouslySetInnerHTML={{ __html: blog.description }} 
          />
        </motion.div>
      </div>
    </div>
  );
}
