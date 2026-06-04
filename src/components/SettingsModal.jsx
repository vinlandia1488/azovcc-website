import { useState, useEffect } from 'react';
import { X, LogOut, Ban, Snowflake, Leaf, Palette, User, ImagePlus, Shield, Globe, Clock, Key, Code } from 'lucide-react';
import { setSession } from '@/lib/auth';
import { getBackendDb } from '@/lib/backend';

const db = getBackendDb();

export default function SettingsModal({ session, onClose, onSaved, onLogout }) {
  const [activeTab, setActiveTab] = useState('profile');
  
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
  const [profileDescription, setProfileDescription] = useState(session.description || '');

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
        profile_accent: profileAccent,
        profile_banner: profileBanner,
        profile_pic: profilePic,
        description: profileDescription
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-[#222] rounded-lg w-full max-w-4xl flex shadow-2xl min-h-[600px] overflow-hidden animate-in fade-in duration-200">
        
        <div className="w-64 border-r border-[#333] flex flex-col p-6 bg-[#111]">
          <div className="mb-10 pl-2 mt-2">
            <h2 className="text-white font-black text-2xl tracking-tighter">Settings</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60">Control Panel</p>
          </div>
          
          <div className="space-y-1">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold tracking-widest uppercase transition ${activeTab === 'profile' ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/40'}`}
            >
              <User size={14} />
              Profile
            </button>
            <button 
              onClick={() => setActiveTab('themes')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold tracking-widest uppercase transition ${activeTab === 'themes' ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/40'}`}
            >
              <Palette size={14} />
              Effects
            </button>
          </div>
          
          <div className="mt-auto pt-6 border-t border-[#222]">
            <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold tracking-widest uppercase border border-[#333] text-zinc-500 hover:text-white hover:bg-red-500/10 hover:border-red-500/30 transition-all">
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>

        <div className="flex-1 bg-[#0a0a0a] relative flex flex-col p-10">
           <button onClick={onClose} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors">
              <X size={20} />
           </button>

           {activeTab === 'profile' ? (
             <div className="animate-in fade-in slide-in-from-bottom-2 duration-400 flex flex-col h-full">
               <div className="flex gap-10 flex-1 min-h-0 pt-4">
                 {/* Left: Preview */}
                 <div className="flex-1 flex flex-col items-center justify-start">
                    <div className="bg-[#0b0b0d] rounded-2xl overflow-hidden shadow-2xl border border-white/5 relative w-full max-w-[340px] group/preview">
                        {/* Banner */}
                        <div className="h-28 w-full relative bg-zinc-800 overflow-hidden">
                          {profileBanner ? (
                            <img src={profileBanner} alt="banner" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full" style={{ background: profileAccent }} />
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity z-10">
                            <label className="flex flex-col items-center gap-2 cursor-pointer p-4">
                              <ImagePlus size={20} className="text-white" />
                              <span className="text-[9px] font-black text-white uppercase tracking-widest">Change Banner</span>
                              <input type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} disabled={saving} />
                            </label>
                          </div>
                        </div>

                        {/* Avatar container */}
                        <div className="px-5 pb-6 relative bg-[#0b0b0d]">
                          <div className="absolute -top-10 left-5 z-20">
                            <div className="w-20 h-20 rounded-full bg-[#0b0b0d] p-1 shadow-2xl relative group/avatar">
                              <div className="w-full h-full rounded-full bg-[#1a1a1a] border border-white/10 overflow-hidden shadow-inner">
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
                                  <ImagePlus size={16} className="text-white" />
                                  <input type="file" className="hidden" accept="image/*" onChange={handlePfpUpload} disabled={saving} />
                                </label>
                              </div>
                            </div>
                          </div>

                          <div className="mt-14 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <h2 className="text-white text-lg font-bold flex items-center gap-2 truncate">
                                  {session.username}
                                  {session.is_admin && <Shield size={14} className="text-blue-400 shrink-0" />}
                                </h2>
                                <p className="text-zinc-500 text-xs uppercase tracking-wider mt-1">
                                  {session.is_admin ? 'Staff Member' : 'Community Member'}
                                </p>
                              </div>
                              <div className="bg-[#1a1a1a] px-2.5 py-1 rounded-lg border border-[#333] shrink-0">
                                <span className="text-[10px] font-mono text-zinc-400">#{session.unique_identifier || '0'}</span>
                              </div>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2">
                              {session.is_admin && (
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20" title="Staff Member">
                                  <Shield size={14} className="text-blue-400" />
                                </div>
                              )}
                              {session.internal_license && (
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20" title="Internal User">
                                  <Key size={14} className="text-purple-400" />
                                </div>
                              )}
                              {session.script_license && (
                                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20" title="Script User">
                                  <Code size={14} className="text-green-400" />
                                </div>
                              )}
                              {session.badges?.map((badge, i) => (
                                <div key={i} className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center border border-[#333] overflow-hidden" title="Verified Member">
                                  <img src={badge} alt="badge" className="w-full h-full object-contain p-1" />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                    </div>
                 </div>

                 {/* Right: Controls */}
                 <div className="w-96 flex flex-col gap-6">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Profile Details</h4>
                      <div className="bg-[#111] border border-[#222] rounded-xl p-5 space-y-4">
                         <div className="flex flex-col gap-3">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Description</label>
                            <textarea
                              value={profileDescription}
                              onChange={e => setProfileDescription(e.target.value)}
                              placeholder="Write a short bio..."
                              className="w-full bg-[#1a1a1a] border border-[#333] text-white rounded-lg px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-[#444] transition resize-none h-24"
                              maxLength={200}
                            />
                         </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Profile Theme</h4>
                        <div className="bg-[#111] border border-[#222] rounded-xl p-5 space-y-4">
                           <div className="flex flex-col gap-3">
                              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Banner Accent</label>
                              <div className="flex items-center gap-3 bg-[#0a0a0a] border border-[#222] rounded-lg px-4 py-3 group hover:border-[#333] transition-colors">
                                 <div className="w-7 h-7 rounded-md relative overflow-hidden ring-1 ring-white/10 shadow-lg" style={{ background: profileAccent }}>
                                   <input 
                                     type="color" 
                                     value={profileAccent} 
                                     onChange={e => setProfileAccent(e.target.value)}
                                     className="absolute inset-[-10px] w-24 h-24 cursor-pointer opacity-0"
                                   />
                                 </div>
                                 <span className="text-zinc-300 text-xs font-mono uppercase tracking-widest font-bold flex-1">{profileAccent}</span>
                              </div>
                           </div>
                           <p className="text-[9px] text-zinc-600 leading-relaxed italic">
                             This color is used when no banner image is uploaded and for profile accents.
                           </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <button 
                         onClick={() => saveSettings(false)}
                         disabled={saving}
                         className="w-full bg-white text-black font-black text-[10px] tracking-[0.2em] uppercase rounded-xl h-14 hover:bg-zinc-200 transition-all disabled:opacity-50 shadow-[0_0_30px_rgba(255,255,255,0.05)] active:scale-[0.98]"
                      >
                         {saving ? 'Updating Profile...' : 'Save Changes'}
                      </button>
                    </div>
                 </div>
               </div>
             </div>
           ) : (
             <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-400 max-h-[70vh] overflow-y-auto custom-scrollbar pr-4">
                <div className="mb-2">
                  <h3 className="text-white text-xl font-black tracking-tight">Interface Effects</h3>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Adjust your local visual experience</p>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-4">Seasonal Presets</h4>
                      <div className="grid grid-cols-1 gap-3">
                         {['NONE', 'CHRISTMAS', 'FALL'].map(preset => (
                           <button 
                             key={preset}
                             onClick={() => setPreset(preset)}
                             className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${currentPreset === preset ? 'bg-white text-black border-white' : 'bg-[#111] border-[#222] text-zinc-400 hover:border-[#333]'}`}
                           >
                             <div className={`p-2 rounded-lg ${currentPreset === preset ? 'bg-black/10' : 'bg-[#0a0a0a]'}`}>
                               {preset === 'NONE' && <Ban size={18} />}
                               {preset === 'CHRISTMAS' && <Snowflake size={18} />}
                               {preset === 'FALL' && <Leaf size={18} />}
                             </div>
                             <div className="text-left">
                               <span className="text-[11px] font-black tracking-widest uppercase block">{preset}</span>
                               <span className="text-[9px] opacity-60 font-bold uppercase tracking-widest">
                                 {preset === 'NONE' ? 'Standard UI' : preset === 'CHRISTMAS' ? 'Snowfall effect' : 'Falling leaves'}
                               </span>
                             </div>
                           </button>
                         ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Fine Tuning</h4>
                    <div className="bg-[#111] border border-[#222] rounded-2xl p-6 space-y-8">
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <label className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Density</label>
                          <span className="px-2 py-1 rounded-md bg-[#0a0a0a] text-white text-[10px] font-mono border border-[#222]">{effectAmount}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="1" max="100" 
                          value={effectAmount} 
                          onChange={(e) => setEffectAmount(parseInt(e.target.value))}
                          className="w-full custom-slider"
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <label className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Velocity</label>
                          <span className="px-2 py-1 rounded-md bg-[#0a0a0a] text-white text-[10px] font-mono border border-[#222]">{effectSpeed}x</span>
                        </div>
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

                <div className="pt-4">
                   <p className="text-[9px] text-zinc-600 text-center font-bold uppercase tracking-[0.3em] opacity-40">Changes apply instantly to the current session</p>
                </div>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}

