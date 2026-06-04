import { useState, useEffect } from 'react';
import { X, LogOut, Ban, Snowflake, Leaf, Palette, User, ImagePlus, Shield, Globe, Clock } from 'lucide-react';
import { setSession } from '@/lib/auth';
import { getBackendDb } from '@/lib/backend';

const db = getBackendDb();

const PALETTE = [
  '#4db8ff', '#8b5cf6', '#4ade80', '#e11d48', '#f59e0b', 
  '#3b82f6', '#d946ef', '#ec4899', '#2dd4bf', '#f97316'
];

export default function SettingsModal({ session, onClose, onSaved, onLogout }) {
  const [activeTab, setActiveTab] = useState('profile');
  
  const [accent, setAccent] = useState(session.accent_color || '#6366f1');
  const [customColor, setCustomColor] = useState(session.accent_color || '#6366f1');
  const [currentPreset, setPreset] = useState(() => {
    const val = localStorage.getItem('adderal_preset') || 'NONE';
    return val === 'HALLOWEEN' ? 'NONE' : val;
  });
  const [effectAmount, setEffectAmount] = useState(() => parseInt(localStorage.getItem('adderal_effectAmount') || '30'));
  const [effectSpeed, setEffectSpeed] = useState(() => parseInt(localStorage.getItem('adderal_effectSpeed') || '5'));
  const [saving, setSaving] = useState(false);

  const [profilePic, setProfilePic] = useState(session.profile_pic || '');
  const [profileBanner, setProfileBanner] = useState(session.profile_banner || '');
  const [profileAccent, setProfileAccent] = useState(session.profile_accent || '#1a1a1a');

  useEffect(() => {
    localStorage.setItem('adderal_preset', currentPreset);
  }, [currentPreset]);

  useEffect(() => {
    localStorage.setItem('adderal_effectAmount', effectAmount);
  }, [effectAmount]);

  useEffect(() => {
    localStorage.setItem('adderal_effectSpeed', effectSpeed);
  }, [effectSpeed]);

  async function handlePfpUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSaving(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      setProfilePic(file_url);
    } catch (err) {
      alert('Failed to upload profile picture: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings(shouldClose = true) {
    setSaving(true);
    try {
      const payload = {
        accent_color: accent,
        profile_accent: profileAccent,
        profile_banner: profileBanner,
        profile_pic: profilePic
      };

      if (session?.id) {
        await db.entities.Account.update(session.id, payload);
      } else {
        const rows = await db.entities.Account.filter({ username: session?.username });
        if (rows && rows[0]?.id) {
          await db.entities.Account.update(rows[0].id, payload);
        }
      }

      const updates = { 
        ...session,
        ...payload
      };
      
      setSession(updates);
      
      if (onSaved) await onSaved(updates);
      if (shouldClose) onClose();
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleBannerUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSaving(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      setProfileBanner(file_url);
    } catch (err) {
      alert('Failed to upload banner: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveColor() {
    await saveSettings();
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-[#222] rounded-lg w-full max-w-3xl flex shadow-2xl min-h-[500px] overflow-hidden animate-in fade-in duration-200">
        
        <div className="w-64 border-r border-[#333] flex flex-col p-4 bg-[#111]">
          <div className="mb-8 pl-2 mt-2">
            <h2 className="text-white font-bold text-lg">Settings</h2>
            <p className="text-zinc-500 text-xs mt-0.5">Manage your experience</p>
          </div>
          
          <div className="space-y-1">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'profile' ? 'bg-zinc-800/80 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'}`}
            >
              <User size={16} />
              Profile
            </button>
            <button 
              onClick={() => setActiveTab('themes')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'themes' ? 'bg-zinc-800/80 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'}`}
            >
              <Palette size={16} />
              Themes
            </button>
          </div>
          
          <div className="mt-auto">
            <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium border border-[#333] text-zinc-400 hover:text-white hover:bg-zinc-800/40 transition">
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>

        <div className="flex-1 bg-[#1a1a1a] relative flex flex-col p-8">
           <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition">
              <X size={18} />
           </button>

           {activeTab === 'profile' ? (
             <div className="space-y-6 animate-in fade-in duration-300 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
               <div className="flex flex-col gap-6">
                 {/* Discord-style Profile Preview */}
                 <div className="bg-[#0b0b0d] rounded-2xl overflow-hidden shadow-2xl border border-white/5 relative w-full max-w-[400px] mx-auto group/preview">
                    {/* Banner */}
                    <div className="h-32 w-full relative bg-zinc-800 overflow-hidden">
                      {profileBanner ? (
                        <img src={profileBanner} alt="banner" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full" style={{ background: profileAccent }} />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity z-10">
                        <label className="flex flex-col items-center gap-2 cursor-pointer p-4">
                          <ImagePlus size={24} className="text-white" />
                          <span className="text-[10px] font-bold text-white uppercase tracking-widest">Change Banner</span>
                          <input type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} disabled={saving} />
                        </label>
                      </div>
                    </div>

                    {/* Avatar container */}
                    <div className="px-5 pb-6 relative bg-[#0b0b0d]">
                      <div className="absolute -top-12 left-5 z-20">
                        <div className="w-24 h-24 rounded-full bg-[#0b0b0d] p-1 shadow-xl relative group/avatar">
                          <div className="w-full h-full rounded-full bg-[#1a1a1a] border border-white/10 overflow-hidden">
                            {profilePic ? (
                              <img src={profilePic} alt="PFP" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl font-black text-zinc-700">
                                {session.username.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="absolute inset-1 flex items-center justify-center bg-black/60 opacity-0 group-hover/avatar:opacity-100 rounded-full transition-all duration-300 z-30">
                            <label className="cursor-pointer w-full h-full flex items-center justify-center">
                              <ImagePlus size={18} className="text-white" />
                              <input type="file" className="hidden" accept="image/*" onChange={handlePfpUpload} disabled={saving} />
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="mt-20 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h2 className="text-white text-xl font-black tracking-tight flex items-center gap-2 truncate">
                              {session.username}
                              {session.is_admin && <Shield size={16} className="text-blue-400 shrink-0" />}
                            </h2>
                            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                              {session.is_admin ? 'Staff Member' : 'Community Member'}
                            </p>
                          </div>
                          <div className="bg-[#16161a] px-3 py-1.5 rounded-lg border border-white/5 shrink-0">
                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">UID: #{session.unique_identifier || '0'}</span>
                          </div>
                        </div>

                        {/* Badges Preview */}
                        <div className="flex flex-wrap gap-1.5 pt-4 border-t border-white/5">
                          {session.is_admin && (
                            <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group/badge relative cursor-help">
                              <Shield size={14} className="text-blue-400" />
                              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[8px] font-bold px-2 py-1 rounded opacity-0 group-hover/badge:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none border border-white/10 shadow-xl">Staff</span>
                            </div>
                          )}
                          {session.internal_license && (
                            <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group/badge relative cursor-help">
                              <Globe size={14} className="text-purple-400" />
                              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[8px] font-bold px-2 py-1 rounded opacity-0 group-hover/badge:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none border border-white/10 shadow-xl">Internal</span>
                            </div>
                          )}
                          {session.script_license && (
                            <div className="w-8 h-8 rounded bg-green-500/10 flex items-center justify-center border border-green-500/20 group/badge relative cursor-help">
                              <Clock size={14} className="text-green-400" />
                              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[8px] font-bold px-2 py-1 rounded opacity-0 group-hover/badge:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none border border-white/10 shadow-xl">Script User</span>
                            </div>
                          )}
                          {session.badges?.map((badge, i) => (
                            <div key={i} className="group/badge relative cursor-help">
                              <div className="w-8 h-8 rounded bg-zinc-800/50 flex items-center justify-center border border-white/5 overflow-hidden">
                                <img src={badge} alt="badge" className="w-full h-full object-contain p-1" />
                              </div>
                              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[8px] font-bold px-2 py-1 rounded opacity-0 group-hover/badge:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none border border-white/10 shadow-xl">Special Badge</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                 </div>

                 {/* Profile Settings */}
                 <div className="bg-[#111] border border-[#222] rounded-xl p-5 space-y-4">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Accent Theme</h4>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2.5 flex-1">
                         <div className="w-6 h-6 rounded-md relative overflow-hidden ring-1 ring-white/10" style={{ background: profileAccent }}>
                           <input 
                             type="color" 
                             value={profileAccent} 
                             onChange={e => setProfileAccent(e.target.value)}
                             className="absolute inset-[-10px] w-20 h-20 cursor-pointer opacity-0"
                           />
                         </div>
                         <span className="text-zinc-300 text-xs font-mono uppercase tracking-wider font-bold">{profileAccent}</span>
                      </div>
                      <div className="text-[9px] text-zinc-500 max-w-[200px] leading-relaxed">
                        This color applies to your profile banner (if no image) and accent elements.
                      </div>
                    </div>
                 </div>
               </div>

               <button 
                  onClick={() => saveSettings(false)}
                  disabled={saving}
                  className="w-full bg-white text-black font-black text-[10px] tracking-[0.2em] uppercase rounded-lg h-12 hover:bg-zinc-200 transition disabled:opacity-50 mt-4 shadow-xl"
               >
                  {saving ? 'Saving Profile...' : 'Save Profile Settings'}
               </button>
             </div>
           ) : (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
                <div>
                  <h3 className="text-white text-sm font-semibold mb-4">Seasonal Presets</h3>
                  <div className="grid grid-cols-3 gap-3">
                     {['NONE', 'CHRISTMAS', 'FALL'].map(preset => (
                       <button 
                         key={preset}
                         onClick={() => setPreset(preset)}
                         className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border transition ${currentPreset === preset ? 'bg-zinc-800 border-[#333]' : 'bg-[#111] border-[#333] hover:border-[#444]'}`}
                       >
                         {preset === 'NONE' && <Ban size={20} className="text-zinc-500" />}
                         {preset === 'CHRISTMAS' && <Snowflake size={20} className="text-white" />}
                         {preset === 'FALL' && <Leaf size={20} className="text-zinc-500" />}
                         <span className="text-[9px] font-bold text-zinc-400 tracking-wider">{preset}</span>
                       </button>
                     ))}
                  </div>
                  <p className="text-zinc-500 text-[10px] mt-4 text-center">Presets automatically apply a theme and background effect.</p>
                </div>
                <div className="h-px bg-[#333]" />
                 <div>
                   <h3 className="text-white text-sm font-semibold mb-4">Effect Settings</h3>
                   <div className="space-y-6">
                     <div>
                       <div className="flex justify-between items-center mb-3">
                         <label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Effect Amount</label>
                         <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-white text-[10px] font-bold border border-[#333]">{effectAmount}%</span>
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
                         <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-white text-[10px] font-bold border border-[#333]">{effectSpeed}x</span>
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
                <div className="h-px bg-[#333]" />
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
                     <div className="flex items-center gap-3 bg-[#111] border border-[#333] rounded-lg px-2 py-1.5">
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
                   className="w-full mt-4 bg-zinc-800 border border-[#333] hover:bg-zinc-700 text-white font-semibold rounded-lg px-4 py-3 text-sm transition disabled:opacity-50"
                >
                   {saving ? 'Applying Theme...' : 'Apply Theme'}
                </button>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
