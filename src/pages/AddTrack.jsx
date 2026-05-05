import { useNavigate } from 'react-router-dom';
import { Music, ArrowLeft } from 'lucide-react';

export default function AddTrack() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#07070a] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-[#111114]/90 backdrop-blur-xl border border-zinc-800/60 rounded-3xl shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Music size={18} className="text-zinc-300" />
          </div>
          <div>
            <p className="text-white font-black tracking-wider uppercase text-sm">Add Track</p>
            <p className="text-zinc-500 text-xs">Set a Spotify URL for the player.</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
          <p>
            Paste a Spotify Track / Playlist / Album URL into the Admin Panel under the <span className="text-white font-bold">Music</span> tab.
          </p>
          <p className="text-zinc-500 text-xs">
            If you’re not an admin, ask an admin to update the global player link.
          </p>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex-1 h-11 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 hover:border-zinc-700/80 text-white text-xs font-bold uppercase tracking-widest transition flex items-center justify-center gap-2"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

