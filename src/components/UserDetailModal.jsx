import { useState, useEffect } from 'react';
import { X, Copy, Check, Eye, EyeOff, User, Shield, Key, Calendar, Fingerprint, MessageSquare, ArrowUpCircle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { normalizeAccountDiscordLink, upgradeToInternal } from '@/lib/auth';
import { getBackendDb } from '@/lib/backend';
import { getLicenseKeys } from '@/lib/license-keys';

const db = getBackendDb();

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

export default function UserDetailModal({ user, onClose, accent, onUpdate }) {
  const [updating, setUpdating] = useState(false);
  const [availableKeys, setAvailableKeys] = useState([]);
  const [showAdminConfirm, setShowAdminConfirm] = useState(false);
  const [manualLicenseInput, setManualLicenseInput] = useState('');

  useEffect(() => {
    loadKeys();
  }, []);

  if (!user) return null;
  const u = normalizeAccountDiscordLink(user);

  async function loadKeys() {
    const all = await getLicenseKeys();
    setAvailableKeys(all.filter(k => !k.used && k.type === 'internal'));
  }

  async function handleUpgrade() {
    if (availableKeys.length === 0) {
      alert("No available internal keys found. Please generate one first.");
      return;
    }
    
    const keyToUse = availableKeys[0].internal_key;
    if (!confirm(`Upgrade ${u.username} to Internal using key: ${keyToUse}?`)) return;

    setUpdating(true);
    try {
      await upgradeToInternal(u.username, keyToUse, { updateSession: false });
      if (onUpdate) await onUpdate();
      alert("Successfully upgraded user to Internal!");
    } catch (err) {
      alert("Upgrade failed: " + err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function handleDirectAssign() {
    const key = manualLicenseInput.trim();
    if (!key) return;
    setUpdating(true);
    try {
      // Write the internal license directly to the user account
      const oldLicense = u.license_key || '';
      let discordInfoPacked = '';
      if (oldLicense.includes('|+|')) {
        const parts = oldLicense.split('|+|');
        if (parts.length >= 5)
          discordInfoPacked = '|+|' + (parts[2] || '') + '|+|' + (parts[3] || '') + '|+|' + (parts[4] || '');
      }
      const scriptLicense = u.script_license || '';
      await db.entities.Account.update(u.id, {
        internal_license: key,
        script_license: scriptLicense,
        license_key: key + '|+|' + scriptLicense + discordInfoPacked,
      });
      setManualLicenseInput('');
      if (onUpdate) await onUpdate();
    } catch (err) {
      alert('Failed to assign license: ' + err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function toggleAdmin() {
    setUpdating(true);
    try {
      const newAdminStatus = !u.is_admin;
      await db.entities.Account.update(u.id, { is_admin: newAdminStatus });
      if (onUpdate) await onUpdate();
      setShowAdminConfirm(false);
    } catch (err) {
      alert("Failed to update admin status: " + err.message);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-[#111114] border border-zinc-800/60 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800/60 flex items-center justify-between bg-gradient-to-br from-zinc-900/50 to-transparent">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden shrink-0"
              style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}
            >
              {u.discord_avatar ? (
                <img src={`https://cdn.discordapp.com/avatars/${u.discord_id}/${u.discord_avatar}.png`} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={24} style={{ color: accent }} />
              )}
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
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="flex gap-2 mb-2">
            {!u.internal_license && (
              <div className="flex gap-2 mb-2">
                <input
                  value={manualLicenseInput}
                  onChange={e => setManualLicenseInput(e.target.value)}
                  placeholder="Type internal license key..."
                  className="flex-1 bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-xl px-4 py-2.5 text-xs font-mono placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50"
                />
                <button
                  onClick={handleDirectAssign}
                  disabled={updating || !manualLicenseInput.trim()}
                  className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 px-4 py-2.5 rounded-xl text-xs font-bold transition disabled:opacity-40"
                >
                  <ArrowUpCircle size={14} />
                  ASSIGN
                </button>
              </div>
            )}
              {u.username !== 'admin' && (
                <button
                  onClick={() => setShowAdminConfirm(true)}
                  disabled={updating}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition disabled:opacity-50 ${u.is_admin ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20' : 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20'}`}
                >
                  <Shield size={14} />
                  {u.is_admin ? 'REVOKE ADMIN' : 'MAKE ADMIN'}
                </button>
              )}
            </div>

            {showAdminConfirm && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3 mb-3 text-amber-500">
                  <ShieldAlert size={18} />
                  <p className="text-sm font-bold uppercase tracking-tight">Confirm Action?</p>
                </div>
                <p className="text-zinc-400 text-xs mb-4">
                  Are you sure you want to {u.is_admin ? 'remove' : 'grant'} administrator privileges {u.is_admin ? 'from' : 'to'} <strong>{u.username}</strong>?
                </p>
                <div className="flex gap-2">
                  <button onClick={toggleAdmin} className="flex-1 bg-amber-500 text-black text-[10px] font-bold py-2 rounded-lg hover:bg-amber-400 transition">YES, CONFIRM</button>
                  <button onClick={() => setShowAdminConfirm(false)} className="flex-1 bg-zinc-800 text-white text-[10px] font-bold py-2 rounded-lg hover:bg-zinc-700 transition">CANCEL</button>
                </div>
              </div>
            )}

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
