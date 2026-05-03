import { useState } from 'react';
import { X, Copy, Check, Eye, EyeOff, User, Shield, Key, Calendar, Fingerprint, MessageSquare } from 'lucide-react';
import { normalizeAccountDiscordLink } from '@/lib/auth';

function InfoRow({ label, value, icon: Icon, isSensitive = false, onCopy }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayValue = isSensitive ? (revealed ? value : '••••••••••••••••') : value;

  const handleCopy = () => {
    navigator.clipboard.writeText(value || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    if (onCopy) onCopy();
  };

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#1a1a1e]/50 border border-zinc-800/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-500">
          {Icon && <Icon size={14} />}
          <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {isSensitive && (
            <button
              onClick={() => setRevealed(!revealed)}
              className="text-zinc-500 hover:text-zinc-300 transition"
            >
              {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="text-zinc-500 hover:text-zinc-300 transition"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>
        </div>
      </div>
      <div className="text-zinc-200 text-sm font-mono break-all leading-relaxed">
        {displayValue || '—'}
      </div>
    </div>
  );
}

export default function UserDetailModal({ user, onClose, accent }) {
  if (!user) return null;
  const u = normalizeAccountDiscordLink(user);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-[#111114] border border-zinc-800/60 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800/60 flex items-center justify-between bg-gradient-to-br from-zinc-900/50 to-transparent">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}
            >
              <User size={24} style={{ color: accent }} />
            </div>
            <div>
              <h3 className="text-white text-xl font-bold">{u.username}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-zinc-500 text-xs">UID: {u.unique_identifier ?? '—'}</span>
                {u.is_admin && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-bold uppercase tracking-wider">
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <InfoRow 
              label="Password Hash" 
              value={u.password_hash} 
              icon={Shield} 
              isSensitive={true} 
            />
            <div className="grid grid-cols-2 gap-4">
              <InfoRow 
                label="Internal License" 
                value={u.internal_license} 
                icon={Fingerprint} 
                isSensitive={true} 
              />
              <InfoRow 
                label="Script License" 
                value={u.script_license} 
                icon={Key} 
                isSensitive={true} 
              />
            </div>
            <InfoRow 
              label="Registration Key" 
              value={u.license_key} 
              icon={Key} 
              isSensitive={true} 
            />
            <InfoRow 
              label="Discord Username" 
              value={u.discord_username || 'Not Connected'} 
              icon={MessageSquare} 
            />
            <InfoRow 
              label="Discord ID" 
              value={u.discord_id || 'Not Connected'} 
              icon={Shield} 
            />
            <div className="grid grid-cols-2 gap-4">
              <InfoRow 
                label="Last Login" 
                value={u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'} 
                icon={Calendar} 
              />
              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#1a1a1e]/50 border border-zinc-800/50">
                <div className="flex items-center gap-2 text-zinc-500">
                  <div className="w-3.5 h-3.5 rounded-full" style={{ background: u.accent_color || accent }} />
                  <span className="text-[10px] uppercase tracking-wider font-semibold">Theme Color</span>
                </div>
                <div className="text-zinc-200 text-sm font-mono">
                  {u.accent_color || accent}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-900/30 border-t border-zinc-800/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
