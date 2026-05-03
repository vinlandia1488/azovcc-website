import { useState } from 'react';
import { Eye, EyeOff, Copy, Check, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: 'easeOut' },
});

function MaskedField({ value, label, copyable, accent }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);

  const masked = value
    ? '•'.repeat(16)
    : '—';

  function copyVal() {
    navigator.clipboard.writeText(value || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="bg-[#111114] border border-zinc-800/60 rounded-xl p-5 flex-1" style={{ boxShadow: accent ? `0 0 0 1px rgba(255,255,255,0.02), 0 2px 16px ${accent}0d` : undefined }}>
      <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2">{label}</p>
      <div className="flex items-center justify-between">
        <p className="text-white text-base font-mono tracking-wide">
          {shown ? value : masked}
        </p>
        <div className="flex items-center gap-2 ml-3">
          <button onClick={() => setShown(!shown)} className="text-zinc-500 hover:text-zinc-300 transition">
            {shown ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
          {copyable && (
            <button onClick={copyVal} className="text-zinc-500 hover:text-zinc-300 transition">
              {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 h-px w-full bg-gradient-to-r from-blue-500/60 to-purple-500/20" />
    </div>
  );
}

export default function DashboardTab({ session, onSettings, accent, announcement }) {
  const displayUsername = session.username || session.user_name || 'Unknown';
  const internalLicense = session.internal_license || session.internalKey || '';
  const scriptLicense = session.script_license || session.scriptKey || '';

  return (
    <div className="space-y-6 pt-4">
      {/* Big logo */}
      <motion.div className="text-center py-8" {...fadeUp(0)}>
        <h1
          className="text-7xl font-black tracking-widest uppercase select-none"
          style={{
            background: `linear-gradient(180deg, #ffffff 0%, #888 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: `drop-shadow(0 0 40px ${accent}55)`,
          }}
        >
          AZOV
        </h1>
        <div className="w-16 h-px mx-auto mt-2" style={{ background: `linear-gradient(to right, transparent, ${accent}, transparent)` }} />
        {/* glow orb */}
        <div
          className="w-64 h-8 mx-auto mt-0 blur-2xl opacity-30 rounded-full"
          style={{ background: accent }}
        />
      </motion.div>

      {/* User card */}
      <motion.div {...fadeUp(0.08)} className="bg-[#111114] border border-zinc-800/60 rounded-xl p-4 flex items-center justify-between"
        style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03), 0 4px 24px ${accent}10` }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#1a1a1e] border border-zinc-700/50 rounded-lg flex items-center justify-center overflow-hidden"
            style={{ boxShadow: `0 0 12px ${accent}30` }}>
            {session.discord_avatar ? (
              <img src={`https://cdn.discordapp.com/avatars/${session.discord_id}/${session.discord_avatar}.png`} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-xs font-bold tracking-widest">
                {displayUsername.substring(0, 4).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest flex items-center">
              Connected as <span className="ml-2 px-1.5 py-0.5 rounded bg-zinc-800/50 text-zinc-400 font-mono text-[9px] border border-zinc-700/30">UID {String(session.unique_identifier || 0).padStart(3, '0')}</span>
            </p>
            <p className="text-white font-semibold text-lg">
              {displayUsername}
            </p>
          </div>
          <div className="w-2 h-2 rounded-full bg-green-400 ml-1 self-start mt-2 shadow-[0_0_6px_#4ade80]" />
        </div>
        <button
          onClick={onSettings}
          className="flex items-center gap-2 bg-[#1a1a1e] border border-zinc-700/50 text-zinc-300 hover:text-white hover:border-zinc-500 px-4 py-2 rounded-lg text-xs transition"
        >
          <Settings size={13} />
          SETTINGS
        </button>
      </motion.div>

      {/* Announcement */}
      <motion.div {...fadeUp(0.14)} className="bg-[#111114] border border-zinc-800/60 rounded-xl p-5"
        style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03)` }}
      >
        <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2">Announcement</p>
        <p className="text-white text-lg font-semibold">{announcement || 'No announcement yet.'}</p>
        <div className="mt-3 h-px w-full" style={{ background: `linear-gradient(to right, ${accent}80, transparent)` }} />
      </motion.div>

      {/* Licenses */}
      <motion.div {...fadeUp(0.2)} className="flex flex-col sm:flex-row gap-4">
        {internalLicense && (
          <MaskedField value={internalLicense} label="Internal License" copyable={false} accent={accent} />
        )}
        <MaskedField value={scriptLicense} label="Script License" copyable={true} accent={accent} />
      </motion.div>

    </div>
  );
}