import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, X, Youtube, ExternalLink } from 'lucide-react';
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

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mobile card is narrower so it feels complete and doesn't feel cut off
  const cardWidth = isMobile ? 240 : 320;
  const cardGap   = isMobile ? 12 : 24;
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
    <div className="w-full relative py-5 sm:py-12 overflow-hidden bg-[#F2EFE9] border-2 border-slate-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-[6px_6px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_rgba(0,0,0,1)] select-none">
      {/* Editorial Decorative Grid overlay — desktop only */}
      {!isMobile && <div className="absolute inset-0 grid-bg opacity-[0.02] pointer-events-none" />}

      {/* ── MOBILE HEADER ─────────────────────────────────────────────── */}
      {isMobile ? (
        <div className="px-5 mb-5 relative z-10">
          {/* Top row: icon + title */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-[#8A1C36] text-white rounded-xl flex items-center justify-center border-2 border-slate-900 shrink-0 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <Youtube className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-serif font-extrabold text-slate-900 tracking-tight leading-tight">
                Free Strategy Videos
              </h3>
              <p className="text-slate-500 font-medium text-[11px] mt-0.5 leading-snug">
                Masterclasses &amp; proven exam tips — free
              </p>
            </div>
          </div>

          {/* Subscribe button — compact, inline, premium pill style */}
          <a
            href="https://www.youtube.com/@OdishaExamPrep365?sub_confirmation=1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF0000] border-2 border-slate-900 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all duration-150 select-none cursor-pointer"
          >
            <Youtube className="w-3.5 h-3.5 text-white shrink-0" />
            <span>Subscribe</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
          </a>
        </div>
      ) : (
        /* ── DESKTOP HEADER ───────────────────────────────────────────── */
        <div className="flex flex-row sm:items-center justify-between gap-4 px-10 mb-8 relative z-10">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 bg-[#8A1C36] text-white rounded-xl flex items-center justify-center border-2 border-slate-900 shrink-0 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
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
                    : "shadow-[4px_4px_0px_rgba(0,0,0,1)] md:hover:-translate-x-0.5 md:hover:-translate-y-0.5 md:hover:shadow-[6px_6px_0px_rgba(138,28,54,0.15)]"
                )}
                style={{ width: cardWidth }}
              >
                {/* Thumbnail with aspect ratio */}
                <div className={cn(
                  "relative w-full border-b-2 border-slate-900 overflow-hidden shrink-0",
                  isMobile ? "h-[135px]" : "h-[160px]"
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
                      "bg-[#8A1C36] text-white rounded-full border-2 border-slate-900 flex items-center justify-center shadow-lg transition-transform duration-300",
                      isMobile ? "w-10 h-10" : "w-11 h-11 md:group-hover/video:scale-110"
                    )}>
                      <Play className={cn("text-white fill-white ml-0.5", isMobile ? "w-4 h-4" : "w-5 h-5")} />
                    </div>
                  </div>
                </div>

                {/* Text Meta section */}
                <div className={cn(
                  "flex-1 flex flex-col justify-between bg-white",
                  isMobile ? "p-3" : "p-4"
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
                      "text-slate-900 font-serif font-extrabold line-clamp-2 leading-snug md:group-hover/video:text-[#8A1C36] transition-colors",
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
                      "text-[#8A1C36] flex items-center gap-1 font-bold uppercase tracking-wider",
                      isMobile ? "text-[9px]" : "text-[9px]"
                    )}>
                      Watch Now <Play className="w-3 h-3 fill-[#8A1C36] stroke-none" />
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
