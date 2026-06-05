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
  const [saveError, setSaveError] = useState('');

  const [profilePic, setProfilePic] = useState(session.profile_pic || '');
  const [profileBanner, setProfileBanner] = useState(session.profile_banner || '');
  const [picPosition, setPicPosition] = useState(session.profile_pic_position || '50% 50%');
  const [bannerPosition, setBannerPosition] = useState(session.profile_banner_position || '50% 50%');

  // Profile accent — gradient only (covers the full body area below the banner)
  const [profileCardAccentType] = useState('gradient');
  const [profileCardAccentColor1, setProfileCardAccentColor1] = useState(() => {
    const a = session.profile_accent || '#111111';
    if (a.includes('gradient')) {
      const m = a.match(/#[0-9a-fA-F]{6}/g);
      return m?.[0] || '#111111';
    }
    return a;
  });
  const [profileCardAccentColor2, setProfileCardAccentColor2] = useState(() => {
    const a = session.profile_accent || '#111111';
    if (a.includes('gradient')) {
      const m = a.match(/#[0-9a-fA-F]{6}/g);
      return m?.[1] || '#1a1a2e';
    }
    return '#1a1a2e';
  });
  const [profileCardAccentAngle, setProfileCardAccentAngle] = useState(() => {
    const a = session.profile_accent || '';
    if (a.includes('gradient')) {
      const m = a.match(/(\d+)deg/);
      return m ? parseInt(m[1]) : 135;
    }
    return 135;
  });

  const profileCardAccent = profileCardAccentType === 'gradient'
    ? `linear-gradient(${profileCardAccentAngle}deg, ${profileCardAccentColor1}, ${profileCardAccentColor2})`
    : profileCardAccentColor1;

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
    setSaveError('');
    try {
      const payload = {
        profile_accent: profileCardAccent,
        profile_banner: profileBanner,
        profile_banner_position: bannerPosition,
        profile_pic: profilePic,
        profile_pic_position: picPosition,
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
      <div className="bg-[#111] border border-[#222] rounded-lg w-full max-w-4xl flex shadow-2xl h-[680px] max-h-[90vh] overflow-hidden animate-in fade-in duration-200">
        
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

        <div className="flex-1 bg-[#0a0a0a] relative flex flex-col overflow-hidden">
           <div className="px-10 pt-10 pb-0 flex-shrink-0 flex items-start justify-between">
             <div />
             <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
               <X size={20} />
             </button>
           </div>

           {activeTab === 'profile' ? (
             <div className="flex-1 overflow-y-auto custom-scrollbar px-10 pb-10 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
               <div className="mb-6">
                 <h3 className="text-white text-xl font-black tracking-tight">Profile</h3>
                 <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Customize how others see you</p>
               </div>

               <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden mb-6">
                 <div className="h-28 relative bg-zinc-800 group/banner">
                   {profileBanner ? (
                     <img src={profileBanner} alt="banner" className="w-full h-full object-cover" style={{ objectPosition: bannerPosition }} />
                   ) : (
                     <div className="w-full h-full bg-zinc-800" />
                   )}
                   <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/banner:opacity-100 transition-opacity cursor-pointer">
                     <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white">
                       <ImagePlus size={14} /> Change Banner
                     </span>
                     <input type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} disabled={saving} />
                   </label>
                 </div>

                 {/* Profile accent covers the full body below the banner */}
                 <div style={{ background: profileCardAccent }}>
                   <div className="px-5 pb-5 pt-3 flex gap-4 items-start">
                     <div className="relative -mt-10 shrink-0 group/avatar">
                       <div className="w-16 h-16 rounded-full border-2 border-[#111] bg-[#1a1a1a] overflow-hidden">
                         {profilePic ? (
                           <img src={profilePic} alt="PFP" className="w-full h-full object-cover" style={{ objectPosition: picPosition }} />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-sm font-black text-zinc-600">
                             {session.username.substring(0, 2).toUpperCase()}
                           </div>
                         )}
                       </div>
                       <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/avatar:opacity-100 rounded-full cursor-pointer transition-opacity">
                         <ImagePlus size={14} className="text-white" />
                         <input type="file" className="hidden" accept="image/*" onChange={handlePfpUpload} disabled={saving} />
                       </label>
                     </div>

                     <div className="flex-1 min-w-0 pt-1">
                       <h2 className="text-white text-base font-bold flex items-center gap-2 truncate">
                         {session.username}
                         {session.is_admin && <Shield size={13} className="text-blue-400 shrink-0" />}
                       </h2>
                       <p className="text-zinc-400 text-[11px] font-mono mt-0.5">#{session.unique_identifier || '0'}</p>
                       <div className="flex flex-wrap gap-1.5 mt-2">
                         {session.is_admin && (
                           <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[9px] text-blue-400 font-bold uppercase">
                             <Shield size={10} /> Staff
                           </span>
                         )}
                         {session.internal_license && (
                           <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-[9px] text-purple-400 font-bold uppercase">
                             <Key size={10} /> Internal
                           </span>
                         )}
                         {session.script_license && (
                           <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-[9px] text-green-400 font-bold uppercase">
                             <Code size={10} /> Script
                           </span>
                         )}
                       </div>
                     </div>
                   </div>

                   {profileDescription && (
                     <div className="px-5 pb-5 -mt-1">
                       <p className="text-zinc-300 text-xs leading-relaxed bg-black/20 border border-white/5 rounded-lg px-3 py-2.5">
                         {profileDescription}
                       </p>
                     </div>
                   )}
                 </div>
               </div>

               <div className="space-y-4">
                 <div className="bg-[#111] border border-[#222] rounded-xl p-5">
                   <h3 className="text-white text-sm font-bold mb-3 flex items-center gap-2">
                     <User size={15} className="text-zinc-500" />
                     About Me
                   </h3>
                   <textarea
                     value={profileDescription}
                     onChange={e => setProfileDescription(e.target.value)}
                     placeholder="Tell us about yourself..."
                     className="w-full bg-[#0a0a0a] border border-[#222] text-white rounded-lg px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-[#444] transition resize-none h-28"
                   />
                 </div>

                 {/* Profile Accent — covers the full body below the banner */}
                 <div className="bg-[#111] border border-[#222] rounded-xl p-5">
                   <h3 className="text-white text-sm font-bold mb-1 flex items-center gap-2">
                     <Palette size={15} className="text-zinc-500" />
                     Image Position
                   </h3>
                   <p className="text-[9px] text-zinc-600 mb-4">Adjust how your profile picture and banner are cropped.</p>
                   <div className="space-y-4">
                     {profilePic && (
                       <div>
                         <div className="flex justify-between items-center mb-1">
                           <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Picture Position X</span>
                           <span className="text-[9px] font-mono text-zinc-300">{picPosition.split(' ')[0]}</span>
                         </div>
                         <input type="range" min="0" max="100" value={parseInt(picPosition.split(' ')[0])} onChange={e => setPicPosition(`${e.target.value}% ${picPosition.split(' ')[1]}`)} className="w-full custom-slider" />
                         <div className="flex justify-between items-center mt-2 mb-1">
                           <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Picture Position Y</span>
                           <span className="text-[9px] font-mono text-zinc-300">{picPosition.split(' ')[1]}</span>
                         </div>
                         <input type="range" min="0" max="100" value={parseInt(picPosition.split(' ')[1])} onChange={e => setPicPosition(`${picPosition.split(' ')[0]} ${e.target.value}%`)} className="w-full custom-slider" />
                       </div>
                     )}
                     {profileBanner && (
                       <div>
                         <div className="flex justify-between items-center mb-1">
                           <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Banner Position X</span>
                           <span className="text-[9px] font-mono text-zinc-300">{bannerPosition.split(' ')[0]}</span>
                         </div>
                         <input type="range" min="0" max="100" value={parseInt(bannerPosition.split(' ')[0])} onChange={e => setBannerPosition(`${e.target.value}% ${bannerPosition.split(' ')[1]}`)} className="w-full custom-slider" />
                         <div className="flex justify-between items-center mt-2 mb-1">
                           <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Banner Position Y</span>
                           <span className="text-[9px] font-mono text-zinc-300">{bannerPosition.split(' ')[1]}</span>
                         </div>
                         <input type="range" min="0" max="100" value={parseInt(bannerPosition.split(' ')[1])} onChange={e => setBannerPosition(`${bannerPosition.split(' ')[0]} ${e.target.value}%`)} className="w-full custom-slider" />
                       </div>
                     )}
                     {!profilePic && !profileBanner && <p className="text-[9px] text-zinc-600 italic">Upload a picture or banner to adjust positioning.</p>}
                   </div>
                 </div>

                 {/* Profile Accent — gradient only, covers the full body below the banner */}
                 <div className="bg-[#111] border border-[#222] rounded-xl p-5">
                   <h3 className="text-white text-sm font-bold mb-3 flex items-center gap-2">
                     <Palette size={15} className="text-zinc-500" />
                     Profile Accent
                   </h3>
                   <p className="text-[9px] text-zinc-600 mb-4">Background gradient for the profile card area below the banner.</p>

                   <div className="space-y-3">
                     <div className="flex items-center gap-3 bg-[#0a0a0a] border border-[#222] rounded-lg px-4 py-3">
                       <div className="w-8 h-8 rounded-md relative overflow-hidden ring-1 ring-white/10 shrink-0" style={{ background: profileCardAccentColor1 }}>
                         <input type="color" value={profileCardAccentColor1} onChange={e => setProfileCardAccentColor1(e.target.value)} className="absolute inset-[-8px] w-20 h-20 cursor-pointer opacity-0" />
                       </div>
                       <span className="text-zinc-300 text-xs font-mono uppercase tracking-widest font-bold flex-1">{profileCardAccentColor1}</span>
                       <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">Start</span>
                     </div>

                     <div className="flex items-center gap-3 bg-[#0a0a0a] border border-[#222] rounded-lg px-4 py-3">
                       <div className="w-8 h-8 rounded-md relative overflow-hidden ring-1 ring-white/10 shrink-0" style={{ background: profileCardAccentColor2 }}>
                         <input type="color" value={profileCardAccentColor2} onChange={e => setProfileCardAccentColor2(e.target.value)} className="absolute inset-[-8px] w-20 h-20 cursor-pointer opacity-0" />
                       </div>
                       <span className="text-zinc-300 text-xs font-mono uppercase tracking-widest font-bold flex-1">{profileCardAccentColor2}</span>
                       <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">End</span>
                     </div>

                     <div className="bg-[#0a0a0a] border border-[#222] rounded-lg px-4 py-3">
                       <div className="flex justify-between items-center mb-2">
                         <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Angle</span>
                         <span className="text-[9px] font-mono text-zinc-300">{profileCardAccentAngle}°</span>
                       </div>
                       <input type="range" min="0" max="360" value={profileCardAccentAngle} onChange={e => setProfileCardAccentAngle(parseInt(e.target.value))} className="w-full custom-slider" />
                     </div>

                     {/* Live preview strip */}
                     <div className="h-3 rounded-full ring-1 ring-white/5" style={{ background: profileCardAccent }} />
                   </div>
                 </div>

                 <button
                   onClick={() => saveSettings(false)}
                   disabled={saving}
                   className="w-full bg-white text-black font-black text-[10px] tracking-[0.2em] uppercase rounded-xl h-11 hover:bg-zinc-200 transition-all disabled:opacity-50 active:scale-[0.98]"
                 >
                   {saving ? 'Saving...' : 'Save Changes'}
                 </button>
               </div>
             </div>
           ) : (
             <div className="flex-1 overflow-y-auto custom-scrollbar px-10 pb-10 pt-4 space-y-8 animate-in fade-in slide-in-from-right-2 duration-400">
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

