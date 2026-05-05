import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useNavigate } from 'react-router-dom';
import { getSession, clearSession, setSession, getCachedAccounts } from '@/lib/auth';
import { getBackendDb } from '@/lib/backend';
import NavTabs from '@/components/NavTabs';
import DashboardTab from '@/components/DashboardTab';
import DownloadsTab from '@/components/DownloadsTab';
import CloudConfigsTab from '@/components/CloudConfigsTab';
import PanelTab from '@/components/PanelTab';
import SupportTab from '@/components/SupportTab';
import SettingsModal from '@/components/SettingsModal';
import SeasonalEffects from '@/components/SeasonalEffects';
import { getAnnouncement } from '@/lib/app-settings';

const db = getBackendDb();

export default function Dashboard() {
  const navigate = useNavigate();
  const [session, setSessionState] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [dock, setDock] = useState({ side: 'top', orientation: 'horizontal' });


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

  if (!session) return null;

  if (activeTab === 'panel' && !session.is_admin) {
    setActiveTab('dashboard');
    return null;
  }

  const accent = session.accent_color || '#ef4444';

  return (
    <div className="min-h-screen bg-[#07070a] text-white relative overflow-hidden">
      <SeasonalEffects />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-20 blur-3xl rounded-full"
          style={{ background: `radial-gradient(ellipse, ${accent}44, transparent)` }} />
      </div>

      {/* Top Left Logo */}
      <div className="fixed top-8 left-8 z-[60] flex items-center select-none pointer-events-none md:pointer-events-auto">
        <h1 className="text-2xl font-black tracking-[0.3em] text-white uppercase leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          AZOV
        </h1>
      </div>

      {/* Movable Bar */}
      <motion.div 
        drag
        dragMomentum={false}
        dragElastic={0.1}
        onDrag={(e, info) => {
          const { x } = info.point;
          const w = window.innerWidth;
          // Dynamically switch orientation preview during drag
          if (x < 160 || x > w - 160) {
            if (dock.orientation !== 'vertical') setDock(d => ({ ...d, orientation: 'vertical' }));
          } else {
            if (dock.orientation !== 'horizontal') setDock(d => ({ ...d, orientation: 'horizontal' }));
          }
        }}
        onDragEnd={(e, info) => {
          const { x, y } = info.point;
          const w = window.innerWidth;
          const h = window.innerHeight;
          if (x < 160) setDock({ side: 'left', orientation: 'vertical' });
          else if (x > w - 160) setDock({ side: 'right', orientation: 'vertical' });
          else if (y < 160) setDock({ side: 'top', orientation: 'horizontal' });
          else if (y > h - 160) setDock({ side: 'bottom', orientation: 'horizontal' });
          else setDock({ side: 'top', orientation: 'horizontal' });
        }}
        layout
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`fixed z-50 cursor-grab active:cursor-grabbing group hidden md:block ${
          dock.side === 'left' ? 'left-6 top-1/2 -translate-y-1/2' :
          dock.side === 'right' ? 'right-6 top-1/2 -translate-y-1/2' :
          dock.side === 'bottom' ? 'bottom-8 left-1/2 -translate-x-1/2' :
          'top-8 left-1/2 -translate-x-1/2'
        }`}
        style={{ touchAction: 'none' }}
      >
        <NavTabs activeTab={activeTab} setActiveTab={setActiveTab} accent={accent} isAdmin={session.is_admin} orientation={dock.orientation} />
      </motion.div>


      {/* Mobile Nav (Static) */}
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
                <DownloadsTab accent={accent} session={session} />
              )}
              {activeTab === 'cloud-configs' && (
                <CloudConfigsTab session={session} accent={accent} />
              )}
              {activeTab === 'chat' && (
                <SupportTab session={session} accent={accent} />
              )}
              {activeTab === 'panel' && session.is_admin && (
                <PanelTab
                  accent={accent}
                  session={session}
                  onAnnouncementSaved={async () => setAnnouncement(await getAnnouncement())}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>



      {showSettings && (
        <SettingsModal
          session={session}
          onClose={() => setShowSettings(false)}
          onSaved={refreshSession}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}