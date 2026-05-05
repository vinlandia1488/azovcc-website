import { useState, useEffect } from 'react';
import { Music, ExternalLink, RefreshCw } from 'lucide-react';
import { getSpotifyUrl } from '@/lib/app-settings';

export default function MusicTab({ accent }) {
  const [spotifyUrl, setSpotifyUrlState] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const url = await getSpotifyUrl();
      // Ensure it's an embed URL
      let finalUrl = url;
      if (url.includes('spotify.com/playlist/') && !url.includes('/embed/')) {
        finalUrl = url.replace('spotify.com/playlist/', 'spotify.com/embed/playlist/');
      } else if (url.includes('spotify.com/track/') && !url.includes('/embed/')) {
        finalUrl = url.replace('spotify.com/track/', 'spotify.com/embed/track/');
      } else if (url.includes('spotify.com/album/') && !url.includes('/embed/')) {
        finalUrl = url.replace('spotify.com/album/', 'spotify.com/embed/album/');
      }
      setSpotifyUrlState(finalUrl);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white text-2xl font-bold mb-1">Music</h2>
          <p className="text-zinc-500 text-sm">Listen to the community vibe.</p>
        </div>
        <button 
          onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 500); }}
          className="p-2 rounded-lg bg-zinc-800/40 text-zinc-400 hover:text-white transition"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="relative aspect-video w-full max-w-4xl mx-auto bg-black/40 border border-zinc-800/60 rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
             <div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-white/20 animate-spin" style={{ borderColor: `${accent} transparent transparent transparent` }} />
             <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">Loading Player...</p>
          </div>
        ) : spotifyUrl ? (
          <iframe
            src={spotifyUrl}
            width="100%"
            height="100%"
            frameBorder="0"
            allowFullScreen=""
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="w-full h-full"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-8">
             <div className="w-16 h-16 rounded-2xl bg-zinc-800/40 flex items-center justify-center text-zinc-600 mb-2">
               <Music size={32} />
             </div>
             <p className="text-white font-bold">No Spotify URL Configured</p>
             <p className="text-zinc-500 text-xs max-w-xs">Administrators can set a community playlist in the Admin Panel.</p>
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111114] border border-zinc-800/60 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500">
            <Music size={20} />
          </div>
          <div>
            <h4 className="text-white text-sm font-bold">Azov Beats</h4>
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest">Global Community Sync</p>
          </div>
        </div>
        <div className="bg-[#111114] border border-zinc-800/60 rounded-2xl p-6 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-800/40 flex items-center justify-center text-zinc-500">
                <ExternalLink size={20} />
              </div>
              <div>
                <h4 className="text-white text-sm font-bold">Spotify Web</h4>
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest">Open in Spotify App</p>
              </div>
           </div>
           <a 
            href={spotifyUrl?.replace('/embed/', '/')} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
           >
             <ExternalLink size={16} />
           </a>
        </div>
      </div>
    </div>
  );
}
