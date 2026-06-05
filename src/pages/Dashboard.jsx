import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getSession, clearSession, setSession, getCachedAccounts } from '@/lib/auth';
import { getAnnouncement } from '@/lib/app-settings';
import { getBackendDb } from '@/lib/backend';
import { getAllPosts } from '@/lib/forum';
import SettingsModal from '@/components/SettingsModal';
import BrandingMark from '@/components/BrandingMark';
import ForumSection from '@/components/ForumSection';
import ForumHomePanel from '@/components/ForumHomePanel';
import DashboardTab from '@/components/DashboardTab';
import PanelTab from '@/components/PanelTab';
import SupportTab from '@/components/SupportTab';
import DownloadsTab from '@/components/DownloadsTab';
import CloudConfigsTab from '@/components/CloudConfigsTab';
import SeasonalEffects from '@/components/SeasonalEffects';
import MusicWidget from '@/components/MusicWidget';
import { LogOut, Settings, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const db = getBackendDb();

const NAV_TABS = [
  { id: 'home', label: 'Home' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'downloads', label: 'Downloads' },
  { id: 'cloud-configs', label: 'Cloud Configs' },
  { id: 'chat', label: 'Chat' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [session, setSessionState] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [activeSection, setActiveSection] = useState(null); // { id, label, adminOnly }
  const [showSettings, setShowSettings] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [showIntro, setShowIntro] = useState(true);
  const [feedPosts, setFeedPosts] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [postCounts, setPostCounts] = useState({});
  const [latestPreviews, setLatestPreviews] = useState({});
  const [showForumsMenu, setShowForumsMenu] = useState(false);
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
      loadFeed();
    }
    init();
  }, []);

  useEffect(() => {
    if (!session) return;
    setShowIntro(true);
    const t = setTimeout(() => setShowIntro(false), 1500);
    return () => clearTimeout(t);
  }, [session?.username]);

  async function loadFeed() {
    setLoadingFeed(true);
    try {
      const posts = await getAllPosts();
      setFeedPosts(posts);
      
      // Update post counts and latest previews
      const counts = {};
      const latest = {};
      posts.forEach(p => {
        counts[p.section] = (counts[p.section] || 0) + 1;
        if (!latest[p.section] || new Date(p.created_at) > new Date(latest[p.section].created_at)) {
          latest[p.section] = p;
        }
      });
      setPostCounts(counts);
      setLatestPreviews(latest);
    } catch {
      setFeedPosts([]);
    } finally {
      setLoadingFeed(false);
    }
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
            {session.unique_identifier !== undefined && (
              <Link
                to={`/profiles/${session.unique_identifier}`}
                className="text-[10px] font-bold font-mono tracking-widest px-4 py-2 uppercase border bg-[#121215] text-zinc-300 border-[#222] hover:bg-[#1a1a1f] hover:text-white transition-all rounded-none"
              >
                MY PROFILE
              </Link>
            )}
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
              onClick={() => { setActiveTab(tab.id); setActiveSection(null); setShowForumsMenu(false); }}
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

          {/* Home Tab — Forum Selection */}
          {activeTab === 'home' && !activeSection && (
            <motion.div
              key="home-main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ForumHomePanel
                postCounts={postCounts}
                latestPreviews={latestPreviews}
                isAdmin={session.is_admin}
                showForumsMenu={showForumsMenu}
                onOpenForums={() => setShowForumsMenu(true)}
                onCloseForums={() => setShowForumsMenu(false)}
                onSelectSection={setActiveSection}
              />
            </motion.div>
          )}

          {/* Forum section view */}
          {activeTab === 'home' && activeSection && (
            <ForumSection
              key={`section-${activeSection.id}`}
              section={activeSection}
              session={session}
              onBack={() => { setActiveSection(null); setShowForumsMenu(true); }}
            />
          )}

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <DashboardTab session={session} onSettings={() => setShowSettings(true)} accent="#ffffff" announcement={announcement} />
            </motion.div>
          )}

          {/* Downloads Tab */}
          {activeTab === 'downloads' && (
            <motion.div key="downloads" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <DownloadsTab accent="#ffffff" session={session} />
            </motion.div>
          )}

          {/* Cloud Configs Tab */}
          {activeTab === 'cloud-configs' && (
            <motion.div key="cloud-configs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <CloudConfigsTab session={session} accent="#ffffff" />
            </motion.div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <SupportTab session={session} accent="#ffffff" />
            </motion.div>
          )}

          {/* Admin Panel Tab */}
          {activeTab === 'panel' && session.is_admin && (
            <motion.div key="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <PanelTab
                accent="#ffffff"
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

      <MusicWidget accent="#ffffff" />
    </div>
  );
}
