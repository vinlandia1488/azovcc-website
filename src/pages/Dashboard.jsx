import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getSession, clearSession, setSession, getCachedAccounts } from '@/lib/auth';
import { getAnnouncement } from '@/lib/app-settings';
import { getAllPostCounts } from '@/lib/forum';
import SettingsModal from '@/components/SettingsModal';
import BrandingMark from '@/components/BrandingMark';
import ForumSection from '@/components/ForumSection';
import DashboardTab from '@/components/DashboardTab';
import PanelTab from '@/components/PanelTab';
import SupportTab from '@/components/SupportTab';
import DownloadsTab from '@/components/DownloadsTab';
import CloudConfigsTab from '@/components/CloudConfigsTab';
import SeasonalEffects from '@/components/SeasonalEffects';
import MusicWidget from '@/components/MusicWidget';
import { LogOut, Settings } from 'lucide-react';

const FORUM_SECTIONS = [
  {
    category: 'ADDERALL',
    rows: [
      { id: 'updates-news', label: 'Updates & News', adminOnly: true },
    ],
  },
  {
    category: 'COMMUNITY',
    rows: [
      { id: 'media', label: 'Media', adminOnly: false },
    ],
  },
  {
    category: 'PURCHASE',
    rows: [
      { id: 'store-licenses', label: 'Store & Licenses', adminOnly: true },
    ],
  },
];

const NAV_TABS = [
  { id: 'home', label: 'Home' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'downloads', label: 'Downloads' },
  { id: 'cloud-configs', label: 'Cloud Configs' },
  { id: 'chat', label: 'Chat' },
];

const CATEGORY_HEADER = 'bg-[#121215] border border-[#1f1f26] border-t-[#2a2a2f] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] bg-gradient-to-b from-white/[0.03] to-transparent px-5 py-3 text-[10px] font-bold tracking-widest text-zinc-400 uppercase';
const ROW_BASE = 'bg-[#0e0e11] border-x border-b border-[#1f1f26] shadow-[inset_0_1px_0_rgba(255,255,255,0.01)] p-5 flex items-center justify-between hover:bg-[#111115] transition-colors cursor-pointer group';

export default function Dashboard() {
  const navigate = useNavigate();
  const [session, setSessionState] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [activeSection, setActiveSection] = useState(null); // { id, label, adminOnly }
  const [showSettings, setShowSettings] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [showIntro, setShowIntro] = useState(true);
  const [postCounts, setPostCounts] = useState({});
  const [brandingShowCc] = useState(() => localStorage.getItem('adderal_brandingShowCc') === 'true');

  useEffect(() => {
    async function init() {
      const s = getSession();
      if (!s) { navigate('/'); return; }
      const cached = getCachedAccounts();
      const cacheMatch = cached.find(row =>
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
    setShowIntro(true);
    const t = setTimeout(() => setShowIntro(false), 1500);
    return () => clearTimeout(t);
  }, [session?.username]);

  useEffect(() => {
    loadPostCounts();
  }, []);

  async function loadPostCounts() {
    try {
      const counts = await getAllPostCounts();
      setPostCounts(counts);
    } catch {}
  }

  async function refreshSession() {
    const s = getSession();
    if (!s) return;
    try {
      const accounts = await db.entities.Account.filter({ username: s.username });
      if (accounts?.length > 0) {
        const updated = {
          ...accounts[0],
          username: accounts[0].username || s.username,
          internal_license: accounts[0].internal_license || s.internal_license || '',
          script_license: accounts[0].script_license || s.script_license || '',
          unique_identifier: accounts[0].unique_identifier ?? s.unique_identifier ?? 0,
          profile_pic: accounts[0].profile_pic || s.profile_pic || '',
          is_admin: typeof accounts[0].is_admin === 'boolean' ? accounts[0].is_admin : Boolean(s.is_admin),
          accent_color: accounts[0].accent_color || s.accent_color || '#ef4444',
          executor_mode: accounts[0].executor_mode === true,
          reveal_console: accounts[0].reveal_console === true,
        };
        setSession(updated);
        setSessionState(updated);
      }
    } catch {}
  }

  function handleLogout() {
    clearSession();
    navigate('/');
  }

  if (!session) return null;

  const displayUsername = session.username || 'Unknown';
  const accent = session.accent_color || '#ef4444';

  return (
    <div className="min-h-screen bg-[#07070a] text-white flex flex-col grid-bg font-sans">
      {/* Intro overlay */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-[#07070a]"
          >
            <BrandingMark
              animation="off"
              showCc={brandingShowCc}
              loop={false}
              className="text-white font-black tracking-[0.22em] uppercase text-5xl md:text-6xl inline-block"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <SeasonalEffects />

      {/* ── Top Header ── */}
      <header className="w-full bg-[#0b0b0d] border-b border-[#1c1c22] z-50 select-none">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          {/* Brand */}
          <button
            onClick={() => { setActiveTab('home'); setActiveSection(null); }}
            className="text-white font-black tracking-[0.25em] text-xl md:text-2xl uppercase hover:opacity-90 transition-opacity font-sans focus:outline-none"
          >
            ADDERALL
          </button>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {session.is_admin && (
              <button
                onClick={() => { setActiveTab('panel'); setActiveSection(null); }}
                className={`text-[10px] font-bold font-mono tracking-widest px-4 py-2 uppercase border transition-all rounded-none ${
                  activeTab === 'panel'
                    ? 'bg-white text-black border-white'
                    : 'bg-[#121215] text-zinc-300 border-[#222] hover:bg-[#1a1a1f] hover:text-white'
                }`}
              >
                ADMIN PANEL
              </button>
            )}
            <a
              href="https://discord.gg/ycymTeFWBd"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-bold font-mono tracking-widest px-4 py-2 uppercase border bg-[#121215] text-zinc-300 border-[#222] hover:bg-[#1a1a1f] hover:text-white transition-all rounded-none discord-glow hover:shadow-[0_0_20px_rgba(88,101,242,0.4)] hover:border-[#5865F2]"
            >
              DISCORD
            </a>
            <button
              onClick={() => setShowSettings(true)}
              className="text-[10px] font-bold font-mono tracking-widest px-3 py-2 uppercase border bg-[#121215] text-zinc-300 border-[#222] hover:bg-[#1a1a1f] hover:text-white transition-all rounded-none"
            >
              <Settings size={13} />
            </button>
            <button
              onClick={handleLogout}
              className="text-[10px] font-bold font-mono tracking-widest px-3 py-2 uppercase border bg-[#121215] text-zinc-400 border-[#222] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all rounded-none"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Sub Nav ── */}
      <nav className="w-full bg-[#141416] border-b border-[#1c1c22] z-40 select-none">
        <div className="max-w-[1200px] mx-auto px-6 flex items-center gap-6">
          {NAV_TABS.filter(t => t.id !== 'panel').map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setActiveSection(null); }}
              className={`text-xs font-bold tracking-wider transition-colors hover:text-white uppercase py-3.5 border-b-2 -mb-px ${
                activeTab === tab.id && !activeSection
                  ? 'text-white border-white'
                  : 'text-zinc-500 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Body ── */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-8 z-30">
        <AnimatePresence mode="wait">

          {/* Home Tab — Forum */}
          {activeTab === 'home' && !activeSection && (
            <motion.div
              key="home-forum"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Welcome row */}
              <div className="bg-[#0e0e11] border border-[#1f1f26] px-6 py-4">
                <p className="text-sm text-zinc-300">
                  Welcome, <span className="font-black text-white" style={{ color: accent }}>{displayUsername}</span>
                </p>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono mt-1">
                  Status: <span className="text-zinc-400 font-bold">{session.is_admin ? 'ADMIN' : 'MEMBER'}</span>
                </p>
              </div>

              {/* Forum categories */}
              <div className="space-y-6">
                {FORUM_SECTIONS.map(cat => (
                  <div key={cat.category} className="w-full">
                    <div className={CATEGORY_HEADER}>{cat.category}</div>
                    {cat.rows.map(row => {
                      const locked = row.adminOnly && !session.is_admin;
                      return (
                        <div
                          key={row.id}
                          onClick={() => !locked && setActiveSection(row)}
                          className={`${ROW_BASE} ${locked ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                          <div className="pr-4">
                            <h3 className="text-zinc-200 font-bold text-sm group-hover:text-white transition-colors">
                              {row.label}
                            </h3>
                            {row.adminOnly && (
                              <span className="text-[9px] text-zinc-600 uppercase font-mono tracking-wider">Admin only</span>
                            )}
                          </div>
                          <div className="flex items-center gap-8 min-w-[150px] justify-end">
                            <div className="flex flex-col items-center">
                              <span className="text-base font-bold text-zinc-300 leading-none">{postCounts[row.id] ?? 0}</span>
                              <span className="text-[7px] font-bold text-zinc-500 tracking-wider mt-1 uppercase font-mono">Posts</span>
                            </div>
                            <span className="text-[9px] font-mono font-bold text-zinc-600 tracking-wider uppercase">
                              {postCounts[row.id] ? 'Active' : 'No Activity'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Forum section view */}
          {activeTab === 'home' && activeSection && (
            <ForumSection
              key={`section-${activeSection.id}`}
              section={activeSection}
              session={session}
              onBack={() => setActiveSection(null)}
            />
          )}

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <DashboardTab session={session} onSettings={() => setShowSettings(true)} accent={accent} announcement={announcement} />
            </motion.div>
          )}

          {/* Downloads Tab */}
          {activeTab === 'downloads' && (
            <motion.div key="downloads" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <DownloadsTab accent={accent} session={session} />
            </motion.div>
          )}

          {/* Cloud Configs Tab */}
          {activeTab === 'cloud-configs' && (
            <motion.div key="cloud-configs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <CloudConfigsTab session={session} accent={accent} />
            </motion.div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <SupportTab session={session} accent={accent} />
            </motion.div>
          )}

          {/* Admin Panel Tab */}
          {activeTab === 'panel' && session.is_admin && (
            <motion.div key="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <PanelTab
                accent={accent}
                session={session}
                onAnnouncementSaved={async () => setAnnouncement(await getAnnouncement())}
                onAction={() => {}}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#1c1c22] py-4 z-30">
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">
          <span className="text-zinc-700 text-[10px] font-mono uppercase tracking-widest">ADDERALL © {new Date().getFullYear()}</span>
          <span className="text-zinc-700 text-[10px] font-mono italic">@foreverwithmommy is my pup</span>
        </div>
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          session={session}
          onClose={() => setShowSettings(false)}
          onSaved={async (updatedData) => {
            if (updatedData) { setSession(updatedData); setSessionState(updatedData); }
            else await refreshSession();
          }}
          onLogout={handleLogout}
        />
      )}

      <MusicWidget accent={accent} />
    </div>
  );
}
