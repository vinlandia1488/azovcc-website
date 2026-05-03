import { useState, useEffect } from 'react';
import { X, LogOut, Check, Lock, ZapOff, Ban, Snowflake, Ghost, Leaf, CreditCard, Palette, Shield } from 'lucide-react';
import { setSession, upgradeToInternal, changePassword } from '@/lib/auth';
import { getBackendDb } from '@/lib/backend';

const db = getBackendDb();

const PALETTE = [
  '#4db8ff', '#8b5cf6', '#4ade80', '#e11d48', '#f59e0b', 
  '#3b82f6', '#d946ef', '#ec4899', '#2dd4bf', '#f97316'
];

export default function SettingsModal({ session, onClose, onSaved, onLogout }) {
  const [activeTab, setActiveTab] = useState('redeem');
  
  const [accent, setAccent] = useState(session.accent_color || '#6366f1');
  const [customColor, setCustomColor] = useState(session.accent_color || '#6366f1');
  const [saveFps, setSaveFps] = useState(() => localStorage.getItem('azov_saveFps') === 'true');
  const [currentPreset, setPreset] = useState(() => localStorage.getItem('azov_preset') || 'NONE');
  const [effectAmount, setEffectAmount] = useState(() => parseInt(localStorage.getItem('azov_effectAmount') || '30'));
  const [effectSpeed, setEffectSpeed] = useState(() => parseInt(localStorage.getItem('azov_effectSpeed') || '5'));
  const [saving, setSaving] = useState(false);
  
  const [internalKey, setInternalKey] = useState('');
  const [upgradeError, setUpgradeError] = useState('');
  const [upgradeSuccess, setUpgradeSuccess] = useState('');
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState('');

  useEffect(() => {
    localStorage.setItem('azov_saveFps', saveFps);
  }, [saveFps]);

  useEffect(() => {
    localStorage.setItem('azov_preset', currentPreset);
  }, [currentPreset]);

  useEffect(() => {
    localStorage.setItem('azov_effectAmount', effectAmount);
  }, [effectAmount]);

  useEffect(() => {
    localStorage.setItem('azov_effectSpeed', effectSpeed);
  }, [effectSpeed]);

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

  async function handleUpgrade() {
    setUpgradeError('');
    setUpgradeSuccess('');
    if (!internalKey.trim()) return;

    setSaving(true);
    try {
      await upgradeToInternal(session.username, internalKey.trim());
      setUpgradeSuccess('Successfully upgraded to Internal License!');
      setInternalKey('');
      await onSaved();
    } catch (err) {
      setUpgradeError(err.message || 'Upgrade failed');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange() {
    setSecurityError('');
    setSecuritySuccess('');
    if (!oldPassword || !newPassword || !confirmPassword) {
      setSecurityError('All fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setSecurityError('New password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await changePassword(session.username, oldPassword, newPassword);
      setSecuritySuccess('Password successfully updated!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await onSaved();
    } catch (err) {
      setSecurityError(err.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#111114] border border-zinc-800/60 rounded-3xl w-full max-w-3xl flex shadow-2xl min-h-[500px] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="w-64 border-r border-zinc-800/60 flex flex-col p-4 bg-[#111114]">
          <div className="mb-8 pl-2 mt-2">
            <h2 className="text-white font-bold text-lg">Settings</h2>
            <p className="text-zinc-500 text-xs mt-0.5">Manage your experience</p>
          </div>
          
          <div className="space-y-1">
            <button 
              onClick={() => setActiveTab('redeem')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'redeem' ? 'bg-zinc-800/80 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'}`}
            >
              <CreditCard size={16} />
              Redeem
            </button>
            <button 
              onClick={() => setActiveTab('themes')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'themes' ? 'bg-zinc-800/80 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'}`}
            >
              <Palette size={16} />
              Themes
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'security' ? 'bg-zinc-800/80 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'}`}
            >
              <Shield size={16} />
              Security
            </button>
          </div>
          
          <div className="mt-auto">
            <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium border border-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-800/40 transition">
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>

        <div className="flex-1 bg-[#0c0c0e] relative flex flex-col p-8">
           <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition">
              <X size={18} />
           </button>

           {activeTab === 'redeem' ? (
             <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
               <div>
                 <h3 className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-4">Your Products</h3>
                 <div className="space-y-3">
                   <div className="bg-[#111114] border border-zinc-800/60 rounded-xl p-4 flex items-center justify-between hover:border-zinc-700/50 transition">
                     <div>
                       <h4 className="text-white text-sm font-semibold">Azov Internal</h4>
                       <p className="text-zinc-500 text-xs">{session.internal_license ? '******************' : 'Not Owned'}</p>
                     </div>
                     {session.internal_license ? (
                       <div className="px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-bold flex items-center gap-1.5">
                         <Check size={12} />
                         OWNED
                       </div>
                     ) : (
                       <div className="px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-bold flex items-center gap-1.5">
                         <Lock size={12} />
                         LOCKED
                       </div>
                     )}
                   </div>
                   <div className="bg-[#111114] border border-zinc-800/60 rounded-xl p-4 flex items-center justify-between hover:border-zinc-700/50 transition">
                     <div>
                       <h4 className="text-white text-sm font-semibold">Azov Script</h4>
                       <p className="text-zinc-500 text-xs">{session.script_license ? '******************' : 'Not Owned'}</p>
                     </div>
                     {session.script_license ? (
                       <div className="px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-bold flex items-center gap-1.5">
                         <Check size={12} />
                         OWNED
                       </div>
                     ) : (
                       <div className="px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-bold flex items-center gap-1.5">
                         <Lock size={12} />
                         LOCKED
                       </div>
                     )}
                   </div>
                 </div>
               </div>
               <div className="h-px bg-zinc-800/60" />
               <div>
                 <h3 className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-4">License Key</h3>
                 <input 
                    type="text"
                    value={internalKey}
                    onChange={e => setInternalKey(e.target.value)}
                    placeholder="Enter Key..."
                    className="w-full bg-[#111114] border border-zinc-800/60 text-white rounded-xl px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition mb-3"
                 />
                 {upgradeError && <p className="text-red-400 text-[10px] mb-3">{upgradeError}</p>}
                 {upgradeSuccess && <p className="text-green-400 text-[10px] mb-3">{upgradeSuccess}</p>}
                 <button
                   onClick={handleUpgrade}
                   disabled={saving || !internalKey.trim()}
                   className="w-full bg-[#9ca3af] hover:bg-[#d4d4d8] text-black font-semibold rounded-xl px-4 py-3 text-sm transition disabled:opacity-50"
                 >
                   {saving ? 'Redeeming...' : 'Redeem Code'}
                 </button>
               </div>
             </div>
           ) : activeTab === 'themes' ? (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
               <div>
                 <h3 className="text-white text-sm font-semibold mb-4">Performance</h3>
                 <div className="bg-[#111114] border border-zinc-800/60 rounded-2xl p-4 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center text-zinc-400">
                        <ZapOff size={18} />
                      </div>
                      <div>
                        <h4 className="text-white text-sm font-semibold">Save FPS</h4>
                        <p className="text-zinc-500 text-xs mt-0.5">Disables visual effects to save resources.</p>
                      </div>
                   </div>
                   <button 
                      onClick={() => setSaveFps(!saveFps)}
                      className={`w-10 h-5 rounded-full relative transition ${saveFps ? 'bg-white' : 'bg-zinc-700'}`}
                   >
                      <div className={`w-4 h-4 rounded-full absolute top-0.5 transition-all ${saveFps ? 'bg-black left-[22px]' : 'bg-zinc-400 left-0.5'}`} />
                   </button>
                 </div>
               </div>
               <div className="h-px bg-zinc-800/60" />
               <div>
                 <h3 className="text-white text-sm font-semibold mb-4">Seasonal Presets</h3>
                 <div className="grid grid-cols-4 gap-3">
                    {['NONE', 'CHRISTMAS', 'HALLOWEEN', 'FALL'].map(preset => (
                      <button 
                        key={preset}
                        onClick={() => setPreset(preset)}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition ${currentPreset === preset ? 'bg-zinc-800 border-zinc-600' : 'bg-[#111114] border-zinc-800/60 hover:border-zinc-700/50'}`}
                      >
                        {preset === 'NONE' && <Ban size={20} className="text-zinc-500" />}
                        {preset === 'CHRISTMAS' && <Snowflake size={20} className="text-white" />}
                        {preset === 'HALLOWEEN' && <Ghost size={20} className="text-zinc-500" />}
                        {preset === 'FALL' && <Leaf size={20} className="text-zinc-500" />}
                        <span className="text-[9px] font-bold text-zinc-400 tracking-wider">{preset}</span>
                      </button>
                    ))}
                 </div>
                 <p className="text-zinc-500 text-[10px] mt-4 text-center">Presets automatically apply a theme and background effect.</p>
               </div>
               <div className="h-px bg-zinc-800/60" />
                <div>
                  <h3 className="text-white text-sm font-semibold mb-4">Effect Settings</h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Effect Amount</label>
                        <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-white text-[10px] font-bold border border-zinc-700">{effectAmount}%</span>
                      </div>
                      <div className="relative h-6 flex items-center">
                        <input 
                          type="range" 
                          min="1" max="100" 
                          value={effectAmount} 
                          onChange={(e) => setEffectAmount(parseInt(e.target.value))}
                          className="w-full custom-slider"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Effect Speed</label>
                        <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-white text-[10px] font-bold border border-zinc-700">{effectSpeed}x</span>
                      </div>
                      <div className="relative h-6 flex items-center">
                        <input 
                          type="range" 
                          min="1" max="10" 
                          value={effectSpeed} 
                          onChange={(e) => setEffectSpeed(parseInt(e.target.value))}
                          className="w-full custom-slider"
                        />
                      </div>
                    </div>
                  </div>
                </div>
               <div className="h-px bg-zinc-800/60" />
               <div>
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-white text-sm font-semibold">Color Palette</h3>
                   <span className="text-zinc-500 text-xs">Custom</span>
                 </div>
                 <div className="grid grid-cols-5 gap-3 mb-6">
                    {PALETTE.map(c => (
                       <button 
                         key={c}
                         onClick={() => { setAccent(c); setCustomColor(c); }}
                         className="w-10 h-10 rounded-full transition relative flex items-center justify-center"
                         style={{ background: c }}
                       >
                         {accent === c && <div className="absolute inset-0 rounded-full border-[3px] border-black/40" />}
                       </button>
                    ))}
                 </div>
                 <div className="flex items-center justify-between pt-4 border-t border-zinc-800/60">
                    <span className="text-zinc-400 text-xs">Primary</span>
                    <div className="flex items-center gap-3 bg-[#111114] border border-zinc-800/60 rounded-xl px-2 py-1.5">
                      <div className="w-6 h-6 rounded-md relative overflow-hidden" style={{ background: customColor }}>
                        <input 
                          type="color" 
                          value={customColor} 
                          onChange={e => { setCustomColor(e.target.value); setAccent(e.target.value); }}
                          className="absolute inset-[-10px] w-20 h-20 cursor-pointer opacity-0"
                        />
                      </div>
                      <span className="text-zinc-300 text-xs font-mono">{customColor}</span>
                    </div>
                 </div>
               </div>
               <button 
                  onClick={saveColor}
                  disabled={saving}
                  className="w-full mt-4 bg-transparent border border-zinc-800/60 hover:bg-zinc-800 text-white font-semibold rounded-xl px-4 py-3 text-sm transition disabled:opacity-50"
               >
                  {saving ? 'Applying Theme...' : 'Apply Theme'}
               </button>
             </div>
           ) : (
             <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
               <div>
                 <h3 className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-6">Change Password</h3>
                 <div className="space-y-4">
                   <div>
                     <label className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1.5 block">Current Password</label>
                     <input 
                       type="password"
                       value={oldPassword}
                       onChange={e => setOldPassword(e.target.value)}
                       placeholder="••••••••"
                       className="w-full bg-[#111114] border border-zinc-800/60 text-white rounded-xl px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                     />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1.5 block">New Password</label>
                       <input 
                         type="password"
                         value={newPassword}
                         onChange={e => setNewPassword(e.target.value)}
                         placeholder="••••••••"
                         className="w-full bg-[#111114] border border-zinc-800/60 text-white rounded-xl px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                       />
                     </div>
                     <div>
                       <label className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1.5 block">Confirm Password</label>
                       <input 
                         type="password"
                         value={confirmPassword}
                         onChange={e => setConfirmPassword(e.target.value)}
                         placeholder="••••••••"
                         className="w-full bg-[#111114] border border-zinc-800/60 text-white rounded-xl px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                       />
                     </div>
                   </div>
                 </div>
                 {securityError && <p className="text-red-400 text-[10px] mt-4">{securityError}</p>}
                 {securitySuccess && <p className="text-green-400 text-[10px] mt-4">{securitySuccess}</p>}
                 <button
                   onClick={handlePasswordChange}
                   disabled={saving}
                   className="w-full mt-6 bg-[#ef4444] hover:bg-[#dc2626] text-white font-semibold rounded-xl px-4 py-3 text-sm transition disabled:opacity-50"
                 >
                   {saving ? 'Updating...' : 'Update Password'}
                 </button>
               </div>
               <div className="h-px bg-zinc-800/60" />
               <div className="bg-[#111114]/50 border border-zinc-800/60 rounded-2xl p-6">
                 <div className="flex items-center gap-3 mb-3">
                   <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                     <Shield size={16} />
                   </div>
                   <h4 className="text-white text-sm font-semibold">Account Security</h4>
                 </div>
                 <p className="text-zinc-500 text-xs leading-relaxed">
                   Protect your account by using a strong password. We recommend a mix of letters, numbers, and symbols. 
                 </p>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
