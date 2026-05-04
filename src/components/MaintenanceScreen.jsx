import { Wrench, Clock } from 'lucide-react';

export default function MaintenanceScreen({ from, to }) {
  function fmt(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="fixed inset-0 bg-[#07070a] flex flex-col items-center justify-center text-white z-[9999] px-6">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-20 blur-3xl rounded-full bg-red-500 pointer-events-none" />

      <div className="relative flex flex-col items-center text-center max-w-md">
        {/* Icon */}
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 shadow-2xl shadow-red-500/10">
          <Wrench size={36} className="text-red-400 animate-pulse" />
        </div>

        {/* Wordmark */}
        <p className="text-red-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-3">azov</p>

        <h1 className="text-3xl font-bold text-white mb-3 leading-tight">
          Azov's website is currently in maintenance.
        </h1>

        <p className="text-zinc-400 text-base mb-6">
          Check back later!
        </p>

        {(from || to) && (
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 border border-zinc-800">
            <Clock size={14} className="text-zinc-500 shrink-0" />
            <span className="text-zinc-300 text-sm font-mono">
              {fmt(from) || '?'}
              <span className="text-zinc-600 mx-2">—</span>
              {fmt(to) || '?'}
            </span>
          </div>
        )}

        <p className="text-zinc-700 text-xs mt-8">
          If you're an admin, log in to access the panel.
        </p>
      </div>
    </div>
  );
}
