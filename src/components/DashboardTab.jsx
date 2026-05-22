import { Eye, EyeOff, Copy, Check, Settings, Music, Plus, CalendarClock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getSpotifyUrl } from '@/lib/app-settings';
import { generateInviteCode, getUserInvites, isInviteSystemEnabled } from '@/lib/invites';


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
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [invites, setInvites] = useState([]);
  const [inviteEnabled, setInviteEnabled] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    async function load() {
      const [url, enabled, userInvites] = await Promise.all([
        getSpotifyUrl(),
        isInviteSystemEnabled(),
        getUserInvites(session.username)
      ]);
      
      let finalUrl = url;
      if (url.includes('spotify.com/playlist/') && !url.includes('/embed/')) {
        finalUrl = url.replace('spotify.com/playlist/', 'spotify.com/embed/playlist/');
      } else if (url.includes('spotify.com/track/') && !url.includes('/embed/')) {
        finalUrl = url.replace('spotify.com/track/', 'spotify.com/embed/track/');
      }
      setSpotifyUrl(finalUrl);
      setInviteEnabled(enabled);
      setInvites(userInvites || []);
    }
    load();
  }, [session.username]);

  async function handleGenerateInvite() {
    setInviteLoading(true);
    setInviteError('');
    try {
      const newInvite = await generateInviteCode(session);
      setInvites(prev => [newInvite, ...prev]);
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setInviteLoading(false);
    }
  }


  return (
    <div className="space-y-6 pt-4">
      {/* Header Spacer (since logo moved to top-left) */}
      <div className="h-12" />


      {/* User card */}
      <motion.div {...fadeUp(0.08)} className="bg-[#111114] border border-zinc-800/60 rounded-xl p-4 flex items-center justify-between"
        style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03), 0 4px 24px ${accent}10` }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#1a1a1e] border border-zinc-700/50 rounded-lg flex items-center justify-center overflow-hidden"
            style={{ boxShadow: `0 0 12px ${accent}30` }}>
            {session.profile_pic ? (
              <img src={session.profile_pic} alt="Avatar" className="w-full h-full object-cover" />
            ) : session.discord_avatar ? (
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
        <div className="text-white text-base font-medium leading-relaxed">
          {(() => {
            if (!announcement) return <p className="text-zinc-500 italic">No announcement yet.</p>;
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const parts = announcement.split(urlRegex);
            return parts.map((part, i) => {
              if (part.match(urlRegex)) {
                const isImage = part.match(/\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i);
                if (isImage) {
                  return (
                    <div key={i} className="my-3 rounded-xl overflow-hidden border border-zinc-800/80 shadow-2xl max-w-lg">
                      <img src={part} alt="Announcement Image" className="w-full h-auto object-cover" />
                    </div>
                  );
                }
                return (
                  <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline break-all">
                    {part}
                  </a>
                );
              }
              return <span key={i} className="whitespace-pre-wrap">{part}</span>;
            });
          })()}
        </div>
        <div className="mt-4 h-px w-full" style={{ background: `linear-gradient(to right, ${accent}80, transparent)` }} />
      </motion.div>


      {/* Licenses */}
      <motion.div {...fadeUp(0.2)} className="flex flex-col sm:flex-row gap-4">
        {internalLicense && (
          <MaskedField value={internalLicense} label="Internal License" copyable={false} accent={accent} />
        )}
        <MaskedField value={scriptLicense} label="Script License" copyable={true} accent={accent} />
      </motion.div>

      {/* Invites Section */}
      {inviteEnabled && (
        <motion.div {...fadeUp(0.26)} className="bg-[#111114] border border-zinc-800/60 rounded-xl p-5"
          style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03)` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarClock size={16} className="text-zinc-500" />
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest">Invites</p>
            </div>
            <button
              onClick={handleGenerateInvite}
              disabled={inviteLoading}
              className="flex items-center gap-2 bg-[#1a1a1e] border border-zinc-700/50 text-zinc-300 hover:text-white hover:border-zinc-500 px-3 py-1.5 rounded-lg text-[10px] font-bold transition disabled:opacity-50"
            >
              <Plus size={12} />
              {inviteLoading ? 'GENERATING...' : 'GENERATE CODE'}
            </button>
          </div>

          {inviteError && (
            <p className="text-red-400 text-[10px] mb-3 bg-red-500/10 border border-red-500/20 rounded px-3 py-1.5">
              {inviteError}
            </p>
          )}

          <div className="space-y-2">
            {invites.length === 0 ? (
              <p className="text-zinc-600 text-[11px] italic">You haven't generated any invite codes yet.</p>
            ) : (
              invites.map(inv => (
                <div key={inv.id} className="flex items-center justify-between bg-black/20 border border-zinc-800/40 rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <code className="text-indigo-400 font-mono text-xs">{inv.code}</code>
                    <span className="text-zinc-600 text-[9px] uppercase font-bold">
                      {inv.used_by ? `USED BY @${inv.used_by}` : 'AVAILABLE'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-700 text-[9px]">{new Date(inv.created_at).toLocaleDateString()}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inv.code);
                        // Optional: show toast
                      }}
                      className="text-zinc-600 hover:text-zinc-400 transition"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <p className="text-zinc-600 text-[9px] mt-4 italic">Note: Regular users can generate 1 invite code per week.</p>
        </motion.div>
      )}

    </div>
  );
}