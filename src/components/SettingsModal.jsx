const db = globalThis.__B44_DB__ || globalThis.db || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from 'react';
import { X, Check, LogOut } from 'lucide-react';

import { sha256, setSession, clearSession } from '@/lib/auth';

const ACCENT_COLORS = [
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Violet', value: '#8b5cf6' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'White', value: '#ffffff' },
];

function isLightColor(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

export default function SettingsModal({ session, onClose, onSaved, onLogout }) {
  const [accent, setAccent] = useState(session.accent_color || '#ef4444');
  const [customColor, setCustomColor] = useState(session.accent_color || '#ef4444');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [saving, setSaving] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  async function saveColor() {
    setSaving(true);
    try {
      if (session?.id) {
        await db.entities.Account.update(session.id, { accent_color: accent });
      } else {
        const rows = await db.entities.Account.filter({ username: session?.username });
        if (rows && rows[0]?.id) {
          await db.entities.Account.update(rows[0].id, { accent_color: accent });
        }
      }
    } catch {}
    setSession({ ...session, accent_color: accent });
    await onSaved();
    setSaving(false);
  }

  async function changePassword() {
    setPassError('');
    setPassSuccess('');
    if (newPass !== confirmPass) return setPassError('Passwords do not match');
    if (newPass.length < 6) return setPassError('Password must be at least 6 characters');

    const currentHash = await sha256(currentPass);
    if (currentHash !== session.password_hash) return setPassError('Current password is incorrect');

    setSaving(true);
    const newHash = await sha256(newPass);
    await db.entities.Account.update(session.id, { password_hash: newHash });
    setSession({ ...session, password_hash: newHash });
    await onSaved();
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setPassSuccess('Password changed successfully!');
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111114] border border-zinc-800/60 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/60">
          <h2 className="text-white font-bold text-lg">Settings</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Accent Color */}
          <div>
            <h3 className="text-zinc-300 text-sm font-semibold mb-3">Accent Color</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {ACCENT_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => { setAccent(c.value); setCustomColor(c.value); }}
                  className="w-8 h-8 rounded-full border-2 transition flex items-center justify-center"
                  style={{
                    background: c.value,
                    borderColor: accent === c.value ? '#fff' : 'transparent',
                  }}
                  title={c.label}
                >
                  {accent === c.value && <Check size={12} className="text-black" />}
                </button>
              ))}
              <input
                type="color"
                value={customColor}
                onChange={e => { setCustomColor(e.target.value); setAccent(e.target.value); }}
                className="w-8 h-8 rounded-full cursor-pointer border-2 border-zinc-600"
                title="Custom color"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-3">
              <div className="w-4 h-4 rounded-full" style={{ background: accent }} />
              <span>Selected: {accent}</span>
            </div>
            <button
              onClick={saveColor}
              disabled={saving}
              className="w-full py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
              style={{
                background: accent,
                color: isLightColor(accent) ? '#000' : '#fff',
                border: isLightColor(accent) ? '1px solid #444' : 'none',
              }}
            >
              {saving ? 'Saving...' : 'Save Color'}
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-zinc-800/60" />

          {/* Logout */}
          <div>
            <h3 className="text-zinc-300 text-sm font-semibold mb-3">Session</h3>
            <button
              onClick={onLogout}
              className="w-full py-2 rounded-lg text-sm font-medium bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition flex items-center justify-center gap-2"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-zinc-800/60" />

          {/* Change Password */}
          <div>
            <h3 className="text-zinc-300 text-sm font-semibold mb-3">Change Password</h3>
            <div className="space-y-2">
              <input
                type="password"
                value={currentPass}
                onChange={e => setCurrentPass(e.target.value)}
                placeholder="Current password"
                className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition"
              />
              <input
                type="password"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="New password"
                className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition"
              />
              <input
                type="password"
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="Confirm new password"
                className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition"
              />
            </div>
            {passError && <p className="text-red-400 text-xs mt-2">{passError}</p>}
            {passSuccess && <p className="text-green-400 text-xs mt-2">{passSuccess}</p>}
            <button
              onClick={changePassword}
              disabled={saving || !currentPass || !newPass || !confirmPass}
              className="w-full mt-3 py-2 rounded-lg text-sm font-medium bg-zinc-700 hover:bg-zinc-600 text-white transition disabled:opacity-40"
            >
              Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}