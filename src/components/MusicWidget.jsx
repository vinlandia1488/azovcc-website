import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, SkipBack, SkipForward, 
  Maximize2, Minimize2, Music, 
  Volume2, X, GripHorizontal, Search, List
} from 'lucide-react';
import { getSpotifyUrl } from '@/lib/app-settings';

export default function MusicWidget({ accent }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const widgetRef = useRef(null);

  useEffect(() => {
    async function load() {
      const url = await getSpotifyUrl();
      let finalUrl = url;
      // Force embed format
      if (url.includes('spotify.com/playlist/') && !url.includes('/embed/')) {
        finalUrl = url.replace('spotify.com/playlist/', 'spotify.com/embed/playlist/');
      } else if (url.includes('spotify.com/track/') && !url.includes('/embed/')) {
        finalUrl = url.replace('spotify.com/track/', 'spotify.com/embed/track/');
      } else if (url.includes('spotify.com/album/') && !url.includes('/embed/')) {
        finalUrl = url.replace('spotify.com/album/', 'spotify.com/embed/album/');
      }
      // Add theme parameter for a cleaner look
      if (finalUrl && !finalUrl.includes('utm_source')) {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'utm_source=generator&theme=0';
      }
      setSpotifyUrl(finalUrl);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ x: 0, y: 0 }}
      className="fixed top-8 right-8 z-[100] cursor-default pointer-events-auto"
      style={{ touchAction: 'none' }}
    >


      <div className={`relative flex flex-col bg-[#111114]/90 backdrop-blur-xl border border-zinc-800/60 rounded-[2rem] shadow-2xl overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'w-[400px] h-[600px]' : 'w-[280px] h-[80px]'}`}>
        
        {/* Drag Handle & Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5 cursor-grab active:cursor-grabbing">
          <div className="flex items-center gap-2">
            <GripHorizontal size={14} className="text-zinc-600" />
            <span className="text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase">Music Player</span>
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition"
            >
              {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative flex flex-col">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-t-2 border-white/20 animate-spin" style={{ borderColor: `${accent} transparent transparent transparent` }} />
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Syncing Spotify...</p>
            </div>
          ) : spotifyUrl ? (
            <div className="w-full h-full p-2">
               <iframe
                src={spotifyUrl}
                width="100%"
                height="100%"
                frameBorder="0"
                allowFullScreen=""
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="rounded-2xl"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2 p-4 text-center">
              <Music size={20} />
              <p className="text-[10px] font-bold uppercase tracking-tight">No Track Linked</p>
            </div>
          )}
        </div>

        {/* Mini Controls (Visible only when collapsed) */}
        {!isExpanded && !loading && spotifyUrl && (
          <div className="absolute inset-0 top-8 pointer-events-none flex items-center px-4">
             <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800/60 flex items-center justify-center shrink-0">
                  <Music size={16} className="text-zinc-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                     <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                     <p className="text-white text-[11px] font-bold truncate">Community Playlist</p>
                  </div>
                  <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-tighter truncate">Spotify Sync Active</p>
                </div>
                <div className="flex items-center gap-2 pointer-events-auto">
                   <button className="text-zinc-400 hover:text-white transition"><SkipBack size={14} /></button>
                   <button className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition">
                      <Play size={14} className="ml-0.5" fill="currentColor" />
                   </button>
                   <button className="text-zinc-400 hover:text-white transition"><SkipForward size={14} /></button>
                </div>
             </div>
          </div>
        )}

      </div>
    </motion.div>
  );
}
