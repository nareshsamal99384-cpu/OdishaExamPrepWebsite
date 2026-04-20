import React, { useState } from 'react';
import { Play, X, Youtube } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function YouTubeCarousel({ videoIds }: { videoIds?: string[] }) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  // Fallback to empty if no ids provided
  const sourceVideos = videoIds && videoIds.length > 0 ? videoIds.map(id => ({ id, title: 'Premium Video Content' })) : [];

  if (sourceVideos.length === 0) return null;

  // We duplicate the array to create a seamless infinite loop (if enough videos exist)
  const carouselItems = [...sourceVideos, ...sourceVideos, ...sourceVideos];

  return (
    <div className="w-full relative py-8 overflow-hidden bg-slate-900 rounded-[2rem] shadow-2xl">
      {/* Dynamic Background Accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-600/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex items-center gap-3 px-8 mb-8 relative z-10">
        <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20">
          <Youtube className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Latest from our Channel</h2>
          <p className="text-slate-400 font-medium text-sm">Watch the best tips and exam strategies free</p>
        </div>
      </div>

      {/* Marquee Container */}
      <div className="relative flex overflow-x-hidden group">
        <div className="flex animate-marquee-lr whitespace-nowrap gap-6 pl-6 hover:[animation-play-state:paused]">
          {carouselItems.map((video, idx) => (
            <motion.div
              key={`${video.id}-${idx}`}
              whileHover={{ scale: 1.05, y: -5 }}
              onClick={() => setActiveVideo(video.id)}
              className="relative w-64 sm:w-80 aspect-video rounded-2xl overflow-hidden cursor-pointer shrink-0 border border-slate-700/50 shadow-lg group/video bg-slate-800"
            >
              <img
                src={`https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`}
                alt={video.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover/video:scale-110 opacity-80 group-hover/video:opacity-100"
                onError={(e) => {
                  // Fallback for missing maxresdefault
                  (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
                }}
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent opacity-80" />
              
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 transition-transform">
                <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.5)] group-hover/video:scale-110 transition-transform duration-300">
                  <Play className="w-6 h-6 text-white fill-white ml-1" />
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                <h3 className="text-white font-bold text-sm line-clamp-1 whitespace-normal leading-snug">{video.title}</h3>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Embedded Video Modal */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-xl bg-slate-950/80"
          >
            <div className="absolute inset-0" onClick={() => setActiveVideo(null)} />
            
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
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
