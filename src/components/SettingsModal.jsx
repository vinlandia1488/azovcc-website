import { useState, useEffect } from 'react';
import { X, LogOut, Check, Lock, ZapOff, Ban, Snowflake, Ghost, Leaf, CreditCard, Palette, Shield, User, ImagePlus, Eye, EyeOff } from 'lucide-react';
import { setSession, upgradeToInternal, changePassword } from '@/lib/auth';
import { getBackendDb } from '@/lib/backend';
import BrandingMark from '@/components/BrandingMark';

const db = getBackendDb();

const PALETTE = [
  '#4db8ff', '#8b5cf6', '#4ade80', '#e11d48', '#f59e0b', 
  '#3b82f6', '#d946ef', '#ec4899', '#2dd4bf', '#f97316'
];

export default function SettingsModal({ session, onClose, onSaved, onLogout }) {
  const [activeTab, setActiveTab] = useState('profile');
  
  const [accent, setAccent] = useState(session.accent_color || '#6366f1');
  const [customColor, setCustomColor] = useState(session.accent_color || '#6366f1');
  const [saveFps, setSaveFps] = useState(() => localStorage.getItem('azov_saveFps') === 'true');
  const [currentPreset, setPreset] = useState(() => localStorage.getItem('azov_preset') || 'NONE');
  const [effectAmount, setEffectAmount] = useState(() => parseInt(localStorage.getItem('azov_effectAmount') || '30'));
  const [effectSpeed, setEffectSpeed] = useState(() => parseInt(localStorage.getItem('azov_effectSpeed') || '5'));
  const [brandingAnimation, setBrandingAnimation] = useState(() => localStorage.getItem('azov_brandingAnimation') || 'slide');
  const [brandingShowCc, setBrandingShowCc] = useState(() => localStorage.getItem('azov_brandingShowCc') === 'true');
  const [executorMode, setExecutorMode] = useState(session.executor_mode === true || session.is_executor === true);
  const [revealConsole, setRevealConsole] = useState(session.reveal_console === true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setExecutorMode(session.executor_mode === true || session.is_executor === true);
    setRevealConsole(session.reveal_console === true);
  }, [session]);
  const [profilePic, setProfilePic] = useState(session.profile_pic || '');
  
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

  useEffect(() => {
    localStorage.setItem('azov_brandingAnimation', brandingAnimation);
  }, [brandingAnimation]);

  useEffect(() => {
    localStorage.setItem('azov_brandingShowCc', brandingShowCc);
  }, [brandingShowCc]);

  async function saveSettings() {
    setSaving(true);
    try {
      const response = await fetch('/api/user-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: session.username,
          executor_mode: Boolean(executorMode),
          accent_color: accent,
          reveal_console: Boolean(revealConsole)
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to save');

      // Update the session in localStorage and call onSaved to refresh Dashboard
      const updates = { 
        ...session,
        accent_color: accent,
        executor_mode: Boolean(executorMode),
        is_executor: Boolean(executorMode),
        reveal_console: Boolean(revealConsole)
      };
      
      setSession(updates); // Update localStorage
      
      if (onSaved) await onSaved(updates);
      onClose();
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveColor() {
    await saveSettings();
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

  async function handlePfpUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSaving(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      setProfilePic(file_url);
      
      if (session?.id) {
        await db.entities.Account.update(session.id, { profile_pic: file_url });
      } else {
        const rows = await db.entities.Account.filter({ username: session?.username });
        if (rows && rows[0]?.id) {
          await db.entities.Account.update(rows[0].id, { profile_pic: file_url });
        }
      }
      setSession({ ...session, profile_pic: file_url });
      await onSaved();
    } catch (err) {
      alert('Failed to upload profile picture: ' + err.message);
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
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'profile' ? 'bg-zinc-800/80 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'}`}
            >
              <User size={16} />
              Profile
            </button>
            <button 
              onClick={() => setActiveTab('redeem')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'redeem' ? 'bg-zinc-800/80 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'}`}
            >
              <CreditCard size={16} />
              Redeem
            </button>
            <button 
              onClick={() => setActiveTab('software')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'software' ? 'bg-zinc-800/80 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'}`}
            >
              <ZapOff size={16} />
              Software
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

           {activeTab === 'profile' ? (
             <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
               <div className="flex flex-col items-center">
                 <div className="relative group">
                   <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-zinc-800/60 bg-zinc-900 flex items-center justify-center">
                     {profilePic ? (
                       <img src={profilePic} alt="PFP" className="w-full h-full object-cover" />
                     ) : (
                       <User size={40} className="text-zinc-700" />
                     )}
                   </div>
                   <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition">
                     <ImagePlus size={20} className="text-white" />
                     <input type="file" className="hidden" accept="image/*" onChange={handlePfpUpload} disabled={saving} />
                   </label>
                 </div>
                 <h3 className="text-white font-bold mt-4">{session.username}</h3>
                 <p className="text-zinc-500 text-xs">UID: #{session.unique_identifier || '0'}</p>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-[#111114] border border-zinc-800/60 rounded-2xl p-4">
                   <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest block mb-1">Rank</span>
                   <div className="flex flex-col">
                     <span className="text-white text-sm font-medium">{session.is_admin ? 'Administrator' : 'User'}</span>
                     <span className="text-zinc-500 text-[10px] uppercase tracking-tighter">
                       {session.internal_license ? 'Internal License' : (session.script_license ? 'Script License' : 'No License')}
                     </span>
                   </div>
                 </div>
                 <div className="bg-[#111114] border border-zinc-800/60 rounded-2xl p-4">
                   <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest block mb-1">Status</span>
                   <span className="text-green-500 text-sm font-medium">Active</span>
                 </div>
               </div>
             </div>
           ) : activeTab === 'redeem' ? (
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
                {!session.internal_license && session.assigned_internal_key && (
                  <div className="mb-3 p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10">
                    <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mb-1">Assigned Internal Key</p>
                    <p className="text-white text-xs break-all font-mono">{session.assigned_internal_key}</p>
                    <button
                      onClick={() => setInternalKey(session.assigned_internal_key)}
                      className="mt-2 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 hover:bg-indigo-500/30 transition"
                    >
                      USE ASSIGNED KEY
                    </button>
                  </div>
                )}
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
           ) : activeTab === 'software' ? (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
               <div>
                 <h3 className="text-white text-sm font-semibold mb-4">Software Settings</h3>
                 <div className="bg-[#111114] border border-zinc-800/60 rounded-2xl p-4 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center text-zinc-400">
                        <ZapOff size={18} />
                      </div>
                      <div>
                        <h4 className="text-white text-sm font-semibold">Executor Mode</h4>
                        <p className="text-zinc-500 text-xs mt-0.5">Don't load internal functions in software.</p>
                      </div>
                   </div>
                   <button
                      onClick={() => setExecutorMode(!executorMode)}
                      className={`w-10 h-5 rounded-full relative transition ${executorMode ? 'bg-white' : 'bg-zinc-700'}`}
                   >
                      <div className={`w-4 h-4 rounded-full absolute top-0.5 transition-all ${executorMode ? 'bg-black left-[22px]' : 'bg-zinc-400 left-0.5'}`} />
                   </button>
                 </div>

                 <div className="bg-[#111114] border border-zinc-800/60 rounded-2xl p-4 flex items-center justify-between mt-4">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center text-zinc-400">
                        <Eye size={18} />
                      </div>
                      <div>
                        <h4 className="text-white text-sm font-semibold">Reveal Console</h4>
                        <p className="text-zinc-500 text-xs mt-0.5">Show hidden console when clicking the button.</p>
                      </div>
                   </div>
                   <button
                      onClick={() => setRevealConsole(!revealConsole)}
                      className={`w-10 h-5 rounded-full relative transition ${revealConsole ? 'bg-white' : 'bg-zinc-700'}`}
                   >
                      <div className={`w-4 h-4 rounded-full absolute top-0.5 transition-all ${revealConsole ? 'bg-black left-[22px]' : 'bg-zinc-400 left-0.5'}`} />
                   </button>
                 </div>
               </div>
               
               <button 
                  onClick={saveSettings}
                  disabled={saving}
                  className="w-full mt-4 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl px-4 py-3 text-sm transition disabled:opacity-50"
               >
                  {saving ? 'Saving...' : 'Save Software Settings'}
               </button>
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
                 <h3 className="text-white text-sm font-semibold mb-4">Branding Animation</h3>
                 <div className="space-y-4">
                   <div className="bg-[#111114] border border-zinc-800/60 rounded-2xl p-4 grid grid-cols-2 gap-3">
                     <div>
                       <label className="text-zinc-400 text-[10px] uppercase tracking-widest block mb-2">Style</label>
                       <select
                         value={brandingAnimation}
                         onChange={(e) => setBrandingAnimation(e.target.value)}
                         className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-zinc-500 transition"
                       >
                         <option value="off">Off</option>
                         <option value="slide">Slide (A -&gt; ZOV)</option>
                         <option value="blur">Blur Fade</option>
                         <option value="pulse">Pulse</option>
                         <option value="blink">Blink</option>
                         <option value="shimmer">Shimmer</option>
                       </select>
                     </div>
                     <div className="flex items-end">
                       <button
                         type="button"
                         onClick={() => setBrandingShowCc(!brandingShowCc)}
                         className={`w-full h-[38px] rounded-xl border text-xs font-bold uppercase tracking-widest transition ${
                           brandingShowCc
                             ? 'bg-red-500/10 border-red-500/30 text-red-300'
                             : 'bg-zinc-900/60 border-zinc-800 text-zinc-500'
                         }`}
                       >
                         {brandingShowCc ? 'With .CC' : 'Without .CC'}
                       </button>
                     </div>
                   </div>
                   <p className="text-zinc-500 text-[10px]">js some fun animations to play around with</p>
                   <div className="grid grid-cols-2 gap-3">
                     {['off', 'slide', 'blur', 'pulse', 'blink', 'shimmer'].map((style) => (
                       <button
                         key={style}
                         type="button"
                         onClick={() => setBrandingAnimation(style)}
                         className={`bg-[#111114] border rounded-2xl p-3 transition text-left ${
                           brandingAnimation === style
                             ? 'border-zinc-500'
                             : 'border-zinc-800/60 hover:border-zinc-700/70'
                         }`}
                       >
                         <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">{style}</p>
                         <BrandingMark
                           animation={style}
                           showCc={brandingShowCc}
                           className="text-white text-sm font-black tracking-[0.16em] uppercase"
                           compact
                         />
                       </button>
                     ))}
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
