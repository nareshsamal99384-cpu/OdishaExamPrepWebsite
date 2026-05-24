import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, X, Youtube } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalBackdrop, modalContent } from '../lib/animations';

const CARD_WIDTH = 320;  // px — card + gap
const CARD_GAP   = 24;   // px
const ITEM_STEP  = CARD_WIDTH + CARD_GAP;
const AUTO_SPEED = 0.6;  // px per animation frame (~36px/s at 60fps)
const RESUME_DELAY_MS = 2000; // ms after last user interaction before auto-scroll resumes

export default function YouTubeCarousel({ videoIds }: { videoIds?: string[] }) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  // Fallback to empty if no ids provided
  const sourceVideos = videoIds && videoIds.length > 0
    ? videoIds.map(id => ({ id, title: 'Premium Video Content' }))
    : [];

  // Triple the array so we always have items on both sides for seamless looping
  const items = [...sourceVideos, ...sourceVideos, ...sourceVideos];
  const totalWidth = items.length * ITEM_STEP;

  // ── Refs ──────────────────────────────────────────────────────────────────
  // NOTE: All hooks must be declared before any conditional returns (Rules of Hooks)
  const trackRef  = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);            // current scroll offset (px)
  const rafRef    = useRef<number>(0);    // requestAnimationFrame id
  const isPaused  = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging  = useRef(false);
  const dragStartX  = useRef(0);
  const dragStartOffset = useRef(0);

  // ── Render helper ─────────────────────────────────────────────────────────
  const applyOffset = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    // Wrap offset into valid range [0, totalWidth/3] to create infinite loop
    const loopLen = totalWidth / 3;           // length of ONE copy of the array
    offsetRef.current = ((offsetRef.current % loopLen) + loopLen) % loopLen;

    track.style.transform = `translateX(-${offsetRef.current}px)`;
  }, [totalWidth]);

  // ── Auto-scroll loop ──────────────────────────────────────────────────────
  const tick = useCallback(() => {
    if (!isPaused.current && !isDragging.current) {
      offsetRef.current += AUTO_SPEED;
      applyOffset();
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [applyOffset]);

  useEffect(() => {
    // Start positioned at the middle copy so we can scroll in both directions
    offsetRef.current = totalWidth / 3;
    applyOffset();
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick, applyOffset, totalWidth]);

  // ── Pause / Resume helpers ────────────────────────────────────────────────
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

  // ── Mouse drag ────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartOffset.current = offsetRef.current;
    pauseAuto();
    e.preventDefault();
  }, [pauseAuto]);

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
  }, [scheduleResume]);

  // ── Touch drag ────────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true;
    dragStartX.current = e.touches[0].clientX;
    dragStartOffset.current = offsetRef.current;
    pauseAuto();
  }, [pauseAuto]);

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
  }, [scheduleResume]);

  // Attach window-level listeners so drag works even if cursor leaves the track
  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend',  onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend',  onTouchEnd);
    };
  }, [onMouseMove, onMouseUp, onTouchMove, onTouchEnd]);

  // ── Render ────────────────────────────────────────────────────────────────
  // Early return AFTER all hooks (Rules of Hooks)
  if (sourceVideos.length === 0) return null;

  return (
    <div className="w-full relative py-8 overflow-hidden bg-slate-900 rounded-[2rem] shadow-2xl select-none">
      {/* Background Accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-600/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-3 px-5 sm:px-8 mb-8 relative z-10">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20 shrink-0">
            <Youtube className="w-5.5 h-5.5 sm:w-6 sm:h-6 text-red-500" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-2xl font-black text-white tracking-tight leading-tight">Latest from our Channel</h2>
            <p className="text-slate-400 font-medium text-[10px] sm:text-sm mt-0.5 line-clamp-1 sm:line-clamp-none">Watch the best tips and exam strategies free</p>
          </div>
        </div>

        {/* YouTube Subscribe Button */}
        <a
          href="https://www.youtube.com/@OdishaExamPrep365?sub_confirmation=1"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-5 sm:py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-extrabold text-[10px] sm:text-sm rounded-full shadow-[0_4px_12px_rgba(220,38,38,0.25)] hover:shadow-[0_4px_20px_rgba(220,38,38,0.45)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 border border-red-500/20 shrink-0 select-none cursor-pointer premium-shine-container"
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-white"
          >
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          <span className="sm:hidden">Subscribe</span>
          <span className="hidden sm:inline">Subscribe on YouTube</span>
          <span className="inline-block w-1 h-1 rounded-full bg-red-200 animate-ping shrink-0" />
        </a>
      </div>

      {/* Draggable Track */}
      <div
        className="relative overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {/* Edge fade masks */}
        <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, #0f172a, transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, #0f172a, transparent)' }} />

        {/* Scrolling track — translated by JS, NOT CSS animation */}
        <div
          ref={trackRef}
          className="flex gap-6 pl-6 will-change-transform"
          style={{ width: `${totalWidth}px` }}
        >
          {items.map((video, idx) => (
            <div
              key={`${video.id}-${idx}`}
              onClick={() => {
                if (!isDragging.current) setActiveVideo(video.id);
              }}
              className="relative shrink-0 rounded-2xl overflow-hidden border border-slate-700/50 shadow-lg bg-slate-800 group/video"
              style={{ width: CARD_WIDTH, aspectRatio: '16/9' }}
            >
              <img
                src={`https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`}
                alt={video.title}
                draggable={false}
                className="w-full h-full object-cover transition-transform duration-700 group-hover/video:scale-110 opacity-80 group-hover/video:opacity-100"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent opacity-80" />
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.5)] group-hover/video:scale-110 transition-transform duration-300 pointer-events-none">
                  <Play className="w-6 h-6 text-white fill-white ml-1" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 z-20 pointer-events-none">
                <h3 className="text-white font-bold text-sm line-clamp-1 leading-snug">{video.title}</h3>
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
              className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            >
              <button
                onClick={() => setActiveVideo(null)}
                className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/50 hover:bg-red-600 backdrop-blur rounded-full flex items-center justify-center text-white transition-colors"
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
