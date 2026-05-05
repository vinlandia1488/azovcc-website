import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
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
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [isHidden, setIsHidden] = useState(false);
  const [hiddenEdge, setHiddenEdge] = useState('right'); // 'left' | 'right' | 'top' | 'bottom'

  function snapIntoView(edge) {
    const el = widgetRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 16;

    let dx = 0;
    let dy = 0;
    if (edge === 'left') dx = (margin - rect.left);
    if (edge === 'right') dx = (vw - margin - rect.right);
    if (edge === 'top') dy = (margin - rect.top);
    if (edge === 'bottom') dy = (vh - margin - rect.bottom);

    animate(x, x.get() + dx, { type: 'spring', stiffness: 380, damping: 34 });
    animate(y, y.get() + dy, { type: 'spring', stiffness: 380, damping: 34 });
  }

  function snapHidden(edge) {
    const el = widgetRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const visibleHandle = 14;

    let dx = 0;
    let dy = 0;
    if (edge === 'left') dx = (visibleHandle - rect.right);
    if (edge === 'right') dx = ((vw - visibleHandle) - rect.left);
    if (edge === 'top') dy = (visibleHandle - rect.bottom);
    if (edge === 'bottom') dy = ((vh - visibleHandle) - rect.top);

    animate(x, x.get() + dx, { type: 'spring', stiffness: 420, damping: 38 });
    animate(y, y.get() + dy, { type: 'spring', stiffness: 420, damping: 38 });
  }

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
    <>
      {/* Edge handle shown when player is hidden off-screen */}
      {isHidden && (
        <div
          className="fixed z-[120]"
          style={{
            left: hiddenEdge === 'left' ? 0 : undefined,
            right: hiddenEdge === 'right' ? 0 : undefined,
            top: hiddenEdge === 'top' ? 0 : hiddenEdge === 'bottom' ? undefined : '50%',
            bottom: hiddenEdge === 'bottom' ? 0 : undefined,
            transform:
              hiddenEdge === 'left' || hiddenEdge === 'right'
                ? 'translateY(-50%)'
                : undefined,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsHidden(false);
              snapIntoView(hiddenEdge);
            }}
            className={`pointer-events-auto ${
              hiddenEdge === 'left' || hiddenEdge === 'right'
                ? 'w-[14px] h-[84px]'
                : 'h-[14px] w-[84px]'
            } bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-xl transition`}
            style={{
              borderRadius: 0,
              ...(hiddenEdge === 'left'
                ? { borderTopRightRadius: 14, borderBottomRightRadius: 14 }
                : {}),
              ...(hiddenEdge === 'right'
                ? { borderTopLeftRadius: 14, borderBottomLeftRadius: 14 }
                : {}),
              ...(hiddenEdge === 'top'
                ? { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }
                : {}),
              ...(hiddenEdge === 'bottom'
                ? { borderTopLeftRadius: 14, borderTopRightRadius: 14 }
                : {}),
            }}
            aria-label="Show music player"
          />
        </div>
      )}

      <motion.div
        ref={widgetRef}
        drag
        dragMomentum={false}
        initial={{ x: 0, y: 0 }}
        className="fixed top-8 right-8 z-[100] cursor-default pointer-events-auto"
        style={{ touchAction: 'none', x, y, opacity: isHidden ? 0 : 1, pointerEvents: isHidden ? 'none' : 'auto' }}
        onDragEnd={() => {
          const el = widgetRef.current;
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const threshold = 120; // how close to edge before hiding (very forgiving)

          let edge = null;
          if (rect.left < threshold) edge = 'left';
          else if (rect.right > vw - threshold) edge = 'right';
          else if (rect.top < threshold) edge = 'top';
          else if (rect.bottom > vh - threshold) edge = 'bottom';

          if (edge) {
            setHiddenEdge(edge);
            setIsHidden(true);
            snapHidden(edge);
          }
        }}
      >


      <div className={`relative flex flex-col bg-[#111114]/90 backdrop-blur-xl border border-zinc-800/60 rounded-[2rem] shadow-2xl overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'w-[400px] h-[600px]' : 'w-[280px] h-[92px]'}`}>

        {/* Drag Handle & Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5 cursor-grab active:cursor-grabbing">
          <div className="flex items-center gap-2">
            <GripHorizontal size={14} className="text-zinc-600" />
            {!isExpanded && (
              <span className="text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase">Music</span>
            )}
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
        <div className={`flex-1 relative flex flex-col ${!isExpanded ? 'hidden' : ''}`}>
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
                allowFullScreen
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
          <div className="absolute inset-0 top-8 flex items-center px-4">
            <div className="w-full flex items-center justify-between">
              <a
                href="https://open.spotify.com/playlist/3CZnfcDJ9k7haY23nZKON6?si=dade772f4e1a4586&pt=b3a41fb566f63047d094a2d96dc3c43b"
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 truncate text-zinc-400 hover:text-white text-[11px] font-black uppercase tracking-[0.14em] transition select-none"
              >
                ADD TRACK
              </a>

              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="shrink-0 p-2 text-zinc-300 hover:text-white transition"
                aria-label="Open player"
              >
                <Play size={18} className="translate-x-[1px]" />
              </button>
            </div>
          </div>
        )}


      </div>
      </motion.div>
    </>
  );
}
