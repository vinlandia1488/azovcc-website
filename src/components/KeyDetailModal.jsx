import { useState } from 'react';
import { updateLicenseKeyRecord } from '@/lib/license-keys';
import { upgradeToInternal } from '@/lib/auth';
import { X, Key, ArrowUpCircle } from 'lucide-react';

function hashDisplay(str) {
  if (!str) return '—';
  return str.substring(0, 4) + '••••••••' + str.substring(str.length - 4);
}

export default function KeyDetailModal({ keyRecord, onClose, accent, onUpdate }) {
  const [updating, setUpdating] = useState(false);
  const [manualLicenseInput, setManualLicenseInput] = useState('');
  const [linkError, setLinkError] = useState('');

  if (!keyRecord) return null;

  async function handleLinkInternalKey() {
    const newInternal = manualLicenseInput.trim();
    if (!newInternal) return;
    setUpdating(true);
    setLinkError('');
    try {
      if (keyRecord.used_by_username) {
        await upgradeToInternal(keyRecord.used_by_username, newInternal, {
          updateSession: false,
        });
      } else {
        await updateLicenseKeyRecord(keyRecord.id, {
          internal_key: newInternal,
          type: 'internal',
        });
      }

      setManualLicenseInput('');
      if (onUpdate) await onUpdate();
      onClose();
    } catch (err) {
      setLinkError(err?.message || 'Failed to link internal key');
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
              <Key size={24} style={{ color: accent }} />
            </div>
            <div>
              <h3 className="text-white text-lg font-bold">Key Details</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${keyRecord.type === 'internal' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-zinc-800 border-zinc-700/50 text-zinc-400'}`}>
                  {keyRecord.type}
                </span>
                <span className={`text-[10px] uppercase font-bold ${keyRecord.used ? 'text-red-400' : 'text-green-400'}`}>
                  {keyRecord.used ? 'Redeemed' : 'Active'}
                </span>
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
        <div className="p-6 space-y-4">
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 space-y-3">
            {keyRecord.internal_key && (
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">Internal Key</span>
                <code className="text-zinc-300 text-sm font-mono break-all">{keyRecord.internal_key}</code>
              </div>
            )}
            {keyRecord.script_key && (
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">Script Key</span>
                <code className="text-zinc-300 text-sm font-mono break-all">{keyRecord.script_key}</code>
              </div>
            )}
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">Used By</span>
              <span className="text-white text-sm">{keyRecord.used_by_username ? `@${keyRecord.used_by_username}` : '—'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">Note</span>
              <span className="text-white text-sm">{keyRecord.note || '—'}</span>
            </div>
          </div>

          {/* Action: Link Internal Key for Script-only keys */}
          {keyRecord.type === 'script' && !keyRecord.internal_key && (
            <div className="pt-2">
              <p className="text-zinc-400 text-xs mb-3">
                {keyRecord.used_by_username
                  ? 'Enter an unused internal key from your Keys list to upgrade this user (same as redeem in Settings).'
                  : 'Attach an internal key string to this unused script key record (optional).'}
              </p>
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLinkInternalKey();
                }}
              >
                <div className="flex gap-2">
                  <input
                    value={manualLicenseInput}
                    onChange={(e) => {
                      setManualLicenseInput(e.target.value);
                      setLinkError('');
                    }}
                    placeholder="Type internal license key..."
                    className="flex-1 bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-xl px-4 py-2.5 text-xs font-mono placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50"
                  />
                  <button
                    type="submit"
                    disabled={updating || !manualLicenseInput.trim()}
                    className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 px-4 py-2.5 rounded-xl text-xs font-bold transition disabled:opacity-40 shrink-0"
                  >
                    <ArrowUpCircle size={14} />
                    {updating ? '…' : 'LINK'}
                  </button>
                </div>
                {linkError && <p className="text-red-400 text-[11px]">{linkError}</p>}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
