const db = globalThis.__B44_DB__ || globalThis.db || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession, clearSession, setSession, getCachedAccounts } from '@/lib/auth';
import NavTabs from '@/components/NavTabs';
import DashboardTab from '@/components/DashboardTab';
import DownloadsTab from '@/components/DownloadsTab';
import CloudConfigsTab from '@/components/CloudConfigsTab';
import PanelTab from '@/components/PanelTab';
import SettingsModal from '@/components/SettingsModal';
import { getAnnouncement } from '@/lib/app-settings';

export default function Dashboard() {
  const navigate = useNavigate();
  const [session, setSessionState] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [announcement, setAnnouncement] = useState('');

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
        is_admin: typeof accounts[0].is_admin === 'boolean' ? accounts[0].is_admin : Boolean(s.is_admin),
        accent_color: s.accent_color || accounts[0].accent_color || '#ef4444',
      };
      setSession(updated);
      setSessionState(updated);
    }
  }

  if (!session) return null;

  const accent = session.accent_color || '#ef4444';

  return (
    <div className="min-h-screen bg-[#07070a] text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-20 blur-3xl rounded-full"
          style={{ background: `radial-gradient(ellipse, ${accent}44, transparent)` }} />
      </div>

      {/* Nav */}
      <div className="relative z-10 pt-6 pb-4 flex justify-center">
        <NavTabs activeTab={activeTab} setActiveTab={setActiveTab} accent={accent} isAdmin={session.is_admin} />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 pb-16">
        {activeTab === 'dashboard' && (
          <DashboardTab session={session} onSettings={() => setShowSettings(true)} accent={accent} announcement={announcement} />
        )}
        {activeTab === 'downloads' && (
          <DownloadsTab accent={accent} />
        )}
        {activeTab === 'cloud-configs' && (
          <CloudConfigsTab session={session} accent={accent} />
        )}
        {activeTab === 'panel' && session.is_admin && (
          <PanelTab
            accent={accent}
            session={session}
            onAnnouncementSaved={async () => setAnnouncement(await getAnnouncement())}
          />
        )}
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