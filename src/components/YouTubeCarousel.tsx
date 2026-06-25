import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, X, Youtube } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalBackdrop, modalContent } from '../lib/animations';
import { cn } from '../lib/utils';

const AUTO_SPEED = 0.6;  // px per animation frame (~36px/s at 60fps)
const RESUME_DELAY_MS = 2000; // ms after last user interaction before auto-scroll resumes

// Dynamic title and category resolver to eliminate AI generic slop
const getVideoTitle = (id: string) => {
  const mapping: Record<string, { title: string, category: string }> = {
    'jNQXAC9IVRw': { title: 'Averages Shortcut Tricks for OSSC & OSSSC', category: 'Aptitude' },
    'dQw4w9WgXcQ': { title: 'Exam Strategy & Time Management Guide', category: 'Strategy' },
    'EngW7tCbLHY': { title: 'General Studies: Odisha History & Heritage', category: 'General Studies' },
  };
  
  if (mapping[id]) return mapping[id];
  
  const fallbacks = [
    { title: 'Odisha History & Heritage Masterclass', category: 'General Studies' },
    { title: 'OSSC Quantitative Aptitude: Shortcut Tricks', category: 'Aptitude' },
    { title: 'OPSC Civil Services Preparation Roadmap', category: 'Strategy' },
    { title: 'Odia Grammar: High-scoring Rules & PYQs', category: 'Language' },
    { title: 'OSSSC RI/ARI General Awareness Practice Set', category: 'General Studies' },
    { title: 'Daily Current Affairs Analysis for OPSC Mains', category: 'Current Affairs' }
  ];
  
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return fallbacks[sum % fallbacks.length];
};

export default function YouTubeCarousel({ videoIds }: { videoIds?: string[] }) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cardWidth = isMobile ? 276 : 320;
  const cardGap   = isMobile ? 16 : 24;
  const itemStep  = cardWidth + cardGap;

  // Map dynamic videos to their academic titles and categories
  const sourceVideos = videoIds && videoIds.length > 0
    ? videoIds.map(id => {
        const meta = getVideoTitle(id);
        return { id, title: meta.title, category: meta.category };
      })
    : [];

  // Triple the array so we always have items on both sides for seamless looping
  const items = [...sourceVideos, ...sourceVideos, ...sourceVideos];
  const totalWidth = items.length * itemStep;

  // Refs
  const trackRef  = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);            // current scroll offset (px)
  const lastRenderedOffset = useRef(-1);  // prevent redundant style updates
  const rafRef    = useRef<number>(0);    // requestAnimationFrame id
  const isPaused  = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging  = useRef(false);
  const dragStartX  = useRef(0);
  const dragStartOffset = useRef(0);

  // Render helper
  const applyOffset = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    // Wrap offset into valid range [0, totalWidth/3] to create infinite loop
    const loopLen = totalWidth / 3;           // length of ONE copy of the array
    offsetRef.current = ((offsetRef.current % loopLen) + loopLen) % loopLen;

    if (offsetRef.current !== lastRenderedOffset.current) {
      track.style.transform = `translateX(-${offsetRef.current}px)`;
      lastRenderedOffset.current = offsetRef.current;
    }
  }, [totalWidth]);

  // Auto-scroll loop
  const tick = useCallback(() => {
    if (!isPaused.current && !isDragging.current) {
      offsetRef.current += AUTO_SPEED;
    }
    // Always render target offset in browser paint cycles
    applyOffset();
    rafRef.current = requestAnimationFrame(tick);
  }, [applyOffset]);

  useEffect(() => {
    // Start positioned at the middle copy so we can scroll in both directions
    offsetRef.current = totalWidth / 3;
    applyOffset();
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick, applyOffset, totalWidth]);

  // Pause / Resume helpers
  const pauseAuto = useCallback(() => {
    isPaused.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  const scheduleResume = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      isPaused.current = false;
    }, RESUME_DELAY_MS);
  }, []);

  // Mouse drag
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const delta = dragStartX.current - e.clientX;
    offsetRef.current = dragStartOffset.current + delta;
  }, []);

  const onMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    scheduleResume();
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup',   onMouseUp);
  }, [scheduleResume, onMouseMove]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartOffset.current = offsetRef.current;
    pauseAuto();
    e.preventDefault();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
  }, [pauseAuto, onMouseMove, onMouseUp]);

  // Touch drag
  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current) return;
    const delta = dragStartX.current - e.touches[0].clientX;
    offsetRef.current = dragStartOffset.current + delta;
    e.preventDefault(); // prevent page scroll while swiping the carousel
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    scheduleResume();
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend',  onTouchEnd);
  }, [scheduleResume, onTouchMove]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true;
    dragStartX.current = e.touches[0].clientX;
    dragStartOffset.current = offsetRef.current;
    pauseAuto();
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend',  onTouchEnd);
  }, [pauseAuto, onTouchMove, onTouchEnd]);

  // Cleanup window-level listeners on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend',  onTouchEnd);
    };
  }, [onMouseMove, onMouseUp, onTouchMove, onTouchEnd]);

  // Early return AFTER all hooks
  if (sourceVideos.length === 0) return null;

  return (
    <div className="w-full relative py-6 sm:py-12 overflow-hidden bg-[#F2EFE9] border-2 border-slate-900 rounded-[2.5rem] shadow-[8px_8px_0px_rgba(0,0,0,1)] select-none">
      {/* Editorial Decorative Grid overlay */}
      {!isMobile && <div className="absolute inset-0 grid-bg opacity-[0.02] pointer-events-none" />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 sm:px-10 mb-6 sm:mb-8 relative z-10">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#8A1C36] text-white rounded-xl flex items-center justify-center border-2 border-slate-900 shrink-0 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            <Youtube className="w-5.5 h-5.5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-2xl font-serif font-extrabold text-slate-900 tracking-tight leading-tight">Free Strategy Videos</h3>
            <p className="text-slate-600 font-medium text-[10px] sm:text-sm mt-0.5 line-clamp-1 sm:line-clamp-none">Watch free masterclasses and proven exam tips from our channel.</p>
          </div>
        </div>

        {/* YouTube Subscribe Button */}
        <a
          href="https://www.youtube.com/@OdishaExamPrep365?sub_confirmation=1"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 sm:px-6 sm:py-3.5 bg-[#FF0000] border-2 border-slate-900 text-white font-black uppercase text-[10px] sm:text-xs tracking-widest rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,1)] md:hover:shadow-none md:hover:translate-x-0.5 md:hover:translate-y-0.5 transition-all select-none cursor-pointer duration-200 shrink-0"
        >
          <Youtube className="w-4 h-4 text-white" />
          <span className="sm:hidden">Subscribe</span>
          <span className="hidden sm:inline">Subscribe on YouTube</span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
        </a>
      </div>

      {/* Draggable Track */}
      <div
        className="relative overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {/* Edge fade masks */}
        {!isMobile && (
          <>
            <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to right, #F2EFE9, transparent)' }} />
            <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to left, #F2EFE9, transparent)' }} />
          </>
        )}

        {/* Scrolling track */}
        <div
          ref={trackRef}
          className={cn("flex will-change-transform", isMobile ? "gap-4 pl-4" : "gap-6 pl-6")}
          style={{ width: `${totalWidth}px` }}
        >
          {items.map((video, idx) => (
              <div
                key={`${video.id}-${idx}`}
                onClick={() => {
                  if (!isDragging.current) setActiveVideo(video.id);
                }}
                className="relative shrink-0 rounded-2xl overflow-hidden border-2 border-slate-900 shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-[#FAF8F5] group/video md:hover:-translate-x-0.5 md:hover:-translate-y-0.5 md:hover:shadow-[6px_6px_0px_rgba(138,28,54,0.15)] transition-all cursor-pointer flex flex-col"
                style={{ width: cardWidth }}
              >
                {/* Thumbnail area with Aspect ratio */}
                <div className="relative w-full h-[160px] border-b-2 border-slate-900 overflow-hidden shrink-0">
                  <img
                    src={`https://i.ytimg.com/vi_webp/${video.id}/maxresdefault.webp`}
                    alt={`Odisha Exam Prep Strategy Video: ${video.title}`}
                    draggable={false}
                    className="w-full h-full object-cover transition-transform duration-700 md:group-hover/video:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        `https://i.ytimg.com/vi_webp/${video.id}/hqdefault.webp`;
                    }}
                  />

                  {/* Darken on hover */}
                  <div className="absolute inset-0 bg-slate-950/20 opacity-0 md:group-hover/video:opacity-100 transition-opacity duration-300" />
                  
                  {/* Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="w-11 h-11 bg-[#8A1C36] text-white rounded-full border-2 border-slate-900 flex items-center justify-center shadow-lg md:group-hover/video:scale-110 transition-transform duration-300">
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Text Meta section */}
                <div className="p-4 flex-1 flex flex-col justify-between bg-white">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="bg-slate-100 border border-slate-200 text-slate-700 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded leading-none">
                        {video.category}
                      </span>
                    </div>
                    <h3 className="text-slate-900 font-serif font-extrabold text-sm sm:text-base line-clamp-2 leading-snug md:group-hover/video:text-[#8A1C36] transition-colors">
                      {video.title}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 font-mono">
                    <span>Free Lecture</span>
                    <span className="text-[#8A1C36] flex items-center gap-1 font-bold">
                      Watch Now <Play className="w-3.5 h-3.5 fill-[#8A1C36] stroke-none" />
                    </span>
                  </div>
                </div>
              </div>
          ))}
        </div>
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div
            {...modalBackdrop}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-xl bg-slate-950/80"
          >
            <div className="absolute inset-0" onClick={() => setActiveVideo(null)} />
            <motion.div {...modalContent}
              className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-900"
            >
              <button
                onClick={() => setActiveVideo(null)}
                className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/50 hover:bg-[#8A1C36] backdrop-blur rounded-full flex items-center justify-center text-white transition-colors border border-white/20"
              >
                <X className="w-5 h-5" />
              </button>
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full absolute inset-0"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
