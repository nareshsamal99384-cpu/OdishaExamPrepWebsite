import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, X, Youtube, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalBackdrop, modalContent } from '../lib/animations';
import { cn } from '../lib/utils';

const AUTO_SPEED = 0.6;  // px per animation frame (~36px/s at 60fps)
const RESUME_DELAY_MS = 2000; // ms after last user interaction before auto-scroll resumes

// Dynamic category resolver based on title keywords
const inferCategory = (title: string): string => {
  const t = title.toLowerCase();
  if (t.includes('aptitude') || t.includes('tricks') || t.includes('math') || t.includes('average') || t.includes('reasoning') || t.includes('series') || t.includes('quant')) return 'Aptitude';
  if (t.includes('strategy') || t.includes('guide') || t.includes('roadmap') || t.includes('tips') || t.includes('syllabus')) return 'Strategy';
  if (t.includes('history') || t.includes('heritage') || t.includes('computer') || t.includes('gk') || t.includes('awareness') || t.includes('gs') || t.includes('general') || t.includes('science') || t.includes('gate') || t.includes('concept')) return 'General Studies';
  if (t.includes('odia') || t.includes('english') || t.includes('grammar') || t.includes('language')) return 'Language';
  if (t.includes('current affairs') || t.includes('daily') || t.includes('news')) return 'Current Affairs';
  return 'General Studies';
};

const staticMapping: Record<string, { title: string, category: string }> = {
  'jNQXAC9IVRw': { title: 'Averages Shortcut Tricks for OSSC & OSSSC', category: 'Aptitude' },
  'dQw4w9WgXcQ': { title: 'Exam Strategy & Time Management Guide', category: 'Strategy' },
  'EngW7tCbLHY': { title: 'General Studies: Odisha History & Heritage', category: 'General Studies' },
};

// Category badge colour mapping for premium look
const categoryColours: Record<string, { bg: string; text: string; border: string }> = {
  'Aptitude':        { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  'Strategy':        { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  'General Studies': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Language':        { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
  'Current Affairs': { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200' },
};
const defaultCatStyle = { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };

export default function YouTubeCarousel({ videoIds }: { videoIds?: string[] }) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [fetchedTitles, setFetchedTitles] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch authentic YouTube titles dynamically via noembed endpoint
  const videoIdsKey = videoIds ? videoIds.join(',') : '';
  useEffect(() => {
    if (!videoIds || videoIds.length === 0) return;
    let isMounted = true;
    videoIds.forEach(id => {
      fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.title && isMounted) {
            setFetchedTitles(prev => ({ ...prev, [id]: data.title }));
          }
        })
        .catch(() => {});
    });
    return () => { isMounted = false; };
  }, [videoIdsKey]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // Mobile card width adjustment
  const cardWidth = isMobile ? 240 : 320;
  const cardGap   = isMobile ? 12 : 24;
  const itemStep  = cardWidth + cardGap;

  // Map dynamic videos to authentic fetched YouTube titles and categories
  const sourceVideos = videoIds && videoIds.length > 0
    ? videoIds.map(id => {
        const title = fetchedTitles[id] || staticMapping[id]?.title || `Odisha Exam Prep Masterclass`;
        const category = staticMapping[id]?.category || inferCategory(title);
        return { id, title, category };
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
    const isModalOpen = typeof document !== 'undefined' && 
      (document.body.getAttribute('data-premium-blur') === 'true' || 
       document.body.getAttribute('data-modal-open') === 'true');

    if (!isPaused.current && !isDragging.current && isVisible && !isModalOpen) {
      offsetRef.current += AUTO_SPEED;
      applyOffset();
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [applyOffset, isVisible]);

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
    applyOffset();
  }, [applyOffset]);

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
    applyOffset();
    e.preventDefault(); // prevent page scroll while swiping the carousel
  }, [applyOffset]);

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
    <div ref={containerRef} className="w-full relative py-3 sm:py-12 overflow-hidden bg-[#F2EFE9] border-2 border-slate-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-[6px_6px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_rgba(0,0,0,1)] select-none">
      {/* Editorial Decorative Grid overlay — desktop only */}
      {!isMobile && <div className="absolute inset-0 grid-bg opacity-[0.02] pointer-events-none" />}

      {/* ── MOBILE HEADER ─────────────────────────────────────────────── */}
      {isMobile ? (
        <div className="px-4 mb-3 relative z-10">
          {/* Single row: icon + title/subtitle + subscribe button */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#2563EB] text-white rounded-xl flex items-center justify-center border-2 border-slate-900 shrink-0 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <Youtube className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[13px] font-serif font-extrabold text-slate-900 tracking-tight leading-tight">
                Free Strategy Videos
              </h3>
              <p className="text-slate-500 font-medium text-[10px] leading-snug">
                Masterclasses &amp; exam tips — free
              </p>
            </div>
            {/* Subscribe pill — inline, right side */}
            <a
              href="https://www.youtube.com/@OdishaExamPrep365?sub_confirmation=1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#FF0000] border-2 border-slate-900 text-white font-black uppercase text-[9px] tracking-widest rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all duration-150 select-none cursor-pointer shrink-0"
            >
              <Youtube className="w-3 h-3 text-white shrink-0" />
              <span>Subscribe</span>
            </a>
          </div>
        </div>
      ) : (
        /* ── DESKTOP HEADER ───────────────────────────────────────────── */
        <div className="flex flex-row sm:items-center justify-between gap-4 px-10 mb-8 relative z-10">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 bg-[#2563EB] text-white rounded-xl flex items-center justify-center border-2 border-slate-900 shrink-0 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <Youtube className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-2xl font-serif font-extrabold text-slate-900 tracking-tight leading-tight">Free Strategy Videos</h3>
              <p className="text-slate-600 font-medium text-sm mt-0.5">Watch free masterclasses and proven exam tips from our channel.</p>
            </div>
          </div>

          <a
            href="https://www.youtube.com/@OdishaExamPrep365?sub_confirmation=1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#FF0000] border-2 border-slate-900 text-white font-black uppercase text-xs tracking-widest rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,1)] md:hover:shadow-none md:hover:translate-x-0.5 md:hover:translate-y-0.5 transition-all select-none cursor-pointer duration-200 shrink-0"
          >
            <Youtube className="w-4 h-4 text-white" />
            <span>Subscribe on YouTube</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
          </a>
        </div>
      )}

      {/* ── DRAGGABLE CAROUSEL TRACK ──────────────────────────────────── */}
      <div
        className="relative overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {/* Edge fade masks — desktop always, mobile soft version */}
        {!isMobile ? (
          <>
            <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to right, #F2EFE9, transparent)' }} />
            <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to left, #F2EFE9, transparent)' }} />
          </>
        ) : (
          <>
            {/* Soft left fade on mobile so partial cards look intentional */}
            <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to right, #F2EFE9 30%, transparent)' }} />
            <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to left, #F2EFE9 30%, transparent)' }} />
          </>
        )}

        {/* Scrolling track */}
        <div
          ref={trackRef}
          className={cn("flex will-change-transform", isMobile ? "gap-3 pl-5 pr-5 pb-1" : "gap-6 pl-6")}
          style={{ width: `${totalWidth}px` }}
        >
          {items.map((video, idx) => {
            const catStyle = categoryColours[video.category] ?? defaultCatStyle;
            return (
              <div
                key={`${video.id}-${idx}`}
                onClick={() => {
                  if (!isDragging.current) setActiveVideo(video.id);
                }}
                className={cn(
                  "relative shrink-0 rounded-2xl overflow-hidden border-2 border-slate-900 bg-[#FAF8F5] group/video transition-all cursor-pointer flex flex-col",
                  isMobile
                    ? "shadow-[3px_3px_0px_rgba(0,0,0,0.85)] active:shadow-[1px_1px_0px_rgba(0,0,0,0.85)] active:translate-x-[2px] active:translate-y-[2px]"
                    : "shadow-[4px_4px_0px_rgba(0,0,0,1)] md:hover:-translate-x-0.5 md:hover:-translate-y-0.5 md:hover:shadow-[6px_6px_0px_rgba(37,99,235,0.15)]"
                )}
                style={{ width: cardWidth }}
              >
                {/* Thumbnail with aspect ratio */}
                <div className={cn(
                  "relative w-full border-b-2 border-slate-900 overflow-hidden shrink-0",
                  isMobile ? "h-[110px]" : "h-[160px]"
                )}>
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

                  {/* Gradient overlay for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />

                  {/* Darken on hover — desktop only */}
                  <div className="absolute inset-0 bg-slate-950/20 opacity-0 md:group-hover/video:opacity-100 transition-opacity duration-300" />

                  {/* Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className={cn(
                      "bg-[#2563EB] text-white rounded-full border-2 border-slate-900 flex items-center justify-center shadow-lg transition-transform duration-300",
                      isMobile ? "w-10 h-10" : "w-11 h-11 md:group-hover/video:scale-110"
                    )}>
                      <Play className={cn("text-white fill-white ml-0.5", isMobile ? "w-4 h-4" : "w-5 h-5")} />
                    </div>
                  </div>
                </div>

                {/* Text Meta section */}
                <div className={cn(
                  "flex-1 flex flex-col justify-between bg-white",
                  isMobile ? "p-2.5" : "p-4"
                )}>
                  <div>
                    {/* Category badge — coloured on mobile for premium feel */}
                    <div className="mb-2">
                      <span className={cn(
                        "inline-flex items-center border font-black uppercase rounded-md leading-none",
                        isMobile ? "text-[9px] tracking-wider px-2 py-1" : "text-[8px] tracking-widest px-2 py-0.5",
                        catStyle.bg, catStyle.text, catStyle.border
                      )}>
                        {video.category}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className={cn(
                      "text-slate-900 font-serif font-extrabold line-clamp-2 leading-snug md:group-hover/video:text-[#2563EB] transition-colors",
                      isMobile ? "text-[12.5px]" : "text-base"
                    )}>
                      {video.title}
                    </h3>
                  </div>

                  {/* Footer row */}
                  <div className={cn(
                    "flex items-center justify-between border-t border-slate-100",
                    isMobile ? "pt-2.5 mt-3" : "pt-3 mt-4"
                  )}>
                    <span className={cn(
                      "font-black uppercase tracking-widest text-slate-400 font-mono",
                      isMobile ? "text-[8px]" : "text-[9px]"
                    )}>
                      Free Lecture
                    </span>
                    <span className={cn(
                      "text-[#2563EB] flex items-center gap-1 font-bold uppercase tracking-wider",
                      isMobile ? "text-[9px]" : "text-[9px]"
                    )}>
                      Watch Now <Play className="w-3 h-3 fill-[#2563EB] stroke-none" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Swipe hint for mobile — shown briefly ─────────────────────── */}
      {isMobile && (
        <div className="flex items-center justify-center gap-1.5 mt-3 px-5 pointer-events-none">
          <div className="h-px flex-1 bg-slate-300/60" />
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Swipe to explore</span>
          <div className="h-px flex-1 bg-slate-300/60" />
        </div>
      )}

      {/* ── VIDEO MODAL ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div
            {...modalBackdrop}
            className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 backdrop-blur-2xl bg-slate-950/85"
          >
            <div className="absolute inset-0" onClick={() => setActiveVideo(null)} />
            <motion.div
              {...modalContent}
              className="relative w-full max-w-5xl bg-slate-900 rounded-2xl sm:rounded-3xl border-2 border-slate-800 shadow-2xl overflow-hidden flex flex-col z-10"
            >
              {/* Modal Window Header Bar */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900 border-b border-slate-800/90 shrink-0">
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center shrink-0">
                    <Youtube className="w-4 h-4 fill-rose-500 text-rose-500" />
                  </div>
                  <h3 className="text-xs sm:text-sm md:text-base font-extrabold text-slate-100 truncate font-serif tracking-tight">
                    {sourceVideos.find(v => v.id === activeVideo)?.title || 'OdishaExamPrep Video Lecture'}
                  </h3>
                </div>

                {/* Integrated Close Button */}
                <button
                  onClick={() => setActiveVideo(null)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800/80 hover:bg-rose-600 text-slate-400 hover:text-white transition-all duration-200 flex items-center justify-center shrink-0 border border-slate-700/60 active:scale-95 cursor-pointer shadow-sm"
                  title="Close Video"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Video Player Frame */}
              <div className="w-full aspect-video relative bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1&mute=0&rel=0&modestbranding=1&origin=${encodeURIComponent(window.location.origin)}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full absolute inset-0"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
