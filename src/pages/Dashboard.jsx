import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';


import { useNavigate } from 'react-router-dom';
import { getSession, clearSession, setSession, getCachedAccounts } from '@/lib/auth';
import { getBackendDb } from '@/lib/backend';
import NavTabs from '@/components/NavTabs';
import DashboardTab from '@/components/DashboardTab';
import DownloadsTab from '@/components/DownloadsTab';
import CloudConfigsTab from '@/components/CloudConfigsTab';
import PanelTab from '@/components/PanelTab';
import SupportTab from '@/components/SupportTab';
import ForumsTab from '@/components/ForumsTab';
import MusicWidget from '@/components/MusicWidget';
import SettingsModal from '@/components/SettingsModal';
import BrandingMark from '@/components/BrandingMark';


import SeasonalEffects from '@/components/SeasonalEffects';
import { getAnnouncement } from '@/lib/app-settings';

const db = getBackendDb();

export default function Dashboard() {
  const navigate = useNavigate();
  const [session, setSessionState] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [feedbackActive, setFeedbackActive] = useState(false);
  const [dock, setDock] = useState({ side: 'left', orientation: 'vertical' });
  const [showIntro, setShowIntro] = useState(true);
  const [brandingAnimation, setBrandingAnimation] = useState(() => localStorage.getItem('azov_brandingAnimation') || 'slide');
  const [brandingShowCc, setBrandingShowCc] = useState(() => localStorage.getItem('azov_brandingShowCc') === 'true');


  const constraintsRef = useRef(null);
  const barRef = useRef(null);
  const navControls = useAnimation();

  useEffect(() => {
    if (barRef.current) {
      const h = window.innerHeight;
      const barH = barRef.current.offsetHeight;
      navControls.set({ x: 24, y: h / 2 - barH / 2 });
    }
  }, [session]);




  useEffect(() => {
    async function init() {
      const s = getSession();
      if (!s) { navigate('/'); return; }
      const cached = getCachedAccounts();
      const cacheMatch = cached.find((row) =>
        (s.id && row.id && row.id === s.id) || (s.username && row.username === s.username)
      );
      setSessionState({ ...cacheMatch, ...s });
      setAnnouncement(await getAnnouncement());
      refreshSession();
    }
    init();
  }, []);

  useEffect(() => {
    if (!session) return;
    setBrandingAnimation(localStorage.getItem('azov_brandingAnimation') || 'slide');
    setBrandingShowCc(localStorage.getItem('azov_brandingShowCc') === 'true');
    setShowIntro(true);
    const timeout = setTimeout(() => setShowIntro(false), 1800);
    return () => clearTimeout(timeout);
  }, [session]);

  function handleLogout() {
    clearSession();
    navigate('/');
  }

  async function refreshSession() {
    const s = getSession();
    if (!s) return;
    setSessionState(s);
    const accounts = await db.entities.Account.filter({ username: s.username });
    if (accounts && accounts.length > 0) {
      const updated = {
        ...accounts[0],
        username: accounts[0].username || s.username,
        internal_license: accounts[0].internal_license || s.internal_license || '',
        script_license: accounts[0].script_license || s.script_license || '',
        unique_identifier: accounts[0].unique_identifier ?? s.unique_identifier ?? 0,
        profile_pic: accounts[0].profile_pic || s.profile_pic || '',
        is_admin: typeof accounts[0].is_admin === 'boolean' ? accounts[0].is_admin : Boolean(s.is_admin),
        accent_color: s.accent_color || accounts[0].accent_color || '#ef4444',
      };
      setSession(updated);
      setSessionState(updated);
    }
  }
  
  function triggerFeedback() {
    setFeedbackActive(true);
    setTimeout(() => setFeedbackActive(false), 2000);
  }

  if (!session) return null;


  if (activeTab === 'panel' && !session.is_admin) {
    setActiveTab('dashboard');
    return null;
  }

  const accent = session.accent_color || '#ef4444';

  return (
    <div ref={constraintsRef} className="min-h-screen bg-[#07070a] text-white relative overflow-hidden">
      {showIntro && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-[#07070a]">
          <BrandingMark
            animation={brandingAnimation}
            showCc={brandingShowCc}
            loop={false}
            className="text-white font-black tracking-[0.22em] uppercase text-5xl md:text-6xl"
          />
        </div>
      )}
      <SeasonalEffects />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-20 blur-3xl rounded-full"
          style={{ background: `radial-gradient(ellipse, ${accent}44, transparent)` }} />
      </div>

      <div className="fixed top-8 left-8 z-[60] flex items-center select-none pointer-events-none md:pointer-events-auto">
        <h1 className="text-2xl font-black tracking-[0.3em] text-white uppercase leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          AZOV
        </h1>
      </div>

      <motion.div 
        drag
        dragConstraints={constraintsRef}
        dragMomentum={false}
        dragElastic={0.1}
        animate={navControls}
        onDrag={(e, info) => {
          const { x, y } = info.point;
          const w = window.innerWidth;
          const h = window.innerHeight;
          
          if (x < 180) {
            if (dock.side !== 'left') setDock({ side: 'left', orientation: 'vertical' });
          } else if (x > w - 180) {
            if (dock.side !== 'right') setDock({ side: 'right', orientation: 'vertical' });
          } else if (y < 150) {
            if (dock.side !== 'top') setDock({ side: 'top', orientation: 'horizontal' });
          } else if (y > h - 150) {
            if (dock.side !== 'bottom') setDock({ side: 'bottom', orientation: 'horizontal' });
          } else {
             if (dock.side !== 'top') setDock({ side: 'top', orientation: 'horizontal' });
          }
        }}
        onDragEnd={(e, info) => {
          const { x, y } = info.point;
          const w = window.innerWidth;
          const h = window.innerHeight;
          const barW = barRef.current?.offsetWidth || 400;
          const barH = barRef.current?.offsetHeight || 50;
          
          if (x < 180) {
            navControls.start({ x: 24, y: h / 2 - barH / 2, transition: { type: 'spring', damping: 20 } });
            setDock({ side: 'left', orientation: 'vertical' });
          } else if (x > w - 180) {
            navControls.start({ x: w - barW - 24, y: h / 2 - barH / 2, transition: { type: 'spring', damping: 20 } });
            setDock({ side: 'right', orientation: 'vertical' });
          } else if (y > h - 180) {
            navControls.start({ x: w / 2 - barW / 2, y: h - barH - 32, transition: { type: 'spring', damping: 20 } });
            setDock({ side: 'bottom', orientation: 'horizontal' });
          } else {
            navControls.start({ x: w / 2 - barW / 2, y: 32, transition: { type: 'spring', damping: 20 } });
            setDock({ side: 'top', orientation: 'horizontal' });
          }
        }}
        className="fixed z-50 top-0 left-0 cursor-grab active:cursor-grabbing group hidden md:block"
        style={{ touchAction: 'none' }}
      >
        <div ref={barRef}>
          <NavTabs activeTab={activeTab} setActiveTab={setActiveTab} accent={accent} isAdmin={session.is_admin} orientation={dock.orientation} />
        </div>
      </motion.div>



      <div className="relative z-10 pt-6 pb-4 flex justify-center md:hidden">
        <NavTabs activeTab={activeTab} setActiveTab={setActiveTab} accent={accent} isAdmin={session.is_admin} />
      </div>

      <div className={`relative z-10 transition-all duration-700 ease-in-out ${
        dock.side === 'left' ? 'md:pl-20' : 
        dock.side === 'right' ? 'md:pr-20' : 
        ''
      }`}>
        <div className={`max-w-5xl mx-auto px-4 pb-16 transition-all duration-700 ${
          dock.orientation === 'vertical' ? 'pt-12' : 'pt-12 md:pt-32'
        }`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && (
                <DashboardTab session={session} onSettings={() => setShowSettings(true)} accent={accent} announcement={announcement} />
              )}
              {activeTab === 'downloads' && (
                <DownloadsTab accent={accent} session={session} onAction={triggerFeedback} />
              )}
              {activeTab === 'forums' && (
                <ForumsTab accent={accent} session={session} />
              )}
              {activeTab === 'cloud-configs' && (
                <CloudConfigsTab session={session} accent={accent} onAction={triggerFeedback} />
              )}
              {activeTab === 'chat' && (
                <SupportTab session={session} accent={accent} />
              )}

              {activeTab === 'panel' && session.is_admin && (

                <PanelTab
                  accent={accent}
                  session={session}
                  onAnnouncementSaved={async () => {
                    setAnnouncement(await getAnnouncement());
                    triggerFeedback();
                  }}
                  onAction={triggerFeedback}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {feedbackActive && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-12 left-1/2 z-[100] bg-zinc-900/90 border border-zinc-800/60 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-white text-xs font-bold tracking-widest uppercase">Change applied!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {showSettings && (
        <SettingsModal
          session={session}
          onClose={() => setShowSettings(false)}
          onSaved={() => { refreshSession(); triggerFeedback(); }}
          onLogout={handleLogout}
        />
      )}

      <MusicWidget accent={accent} />

    </div>

  );
}