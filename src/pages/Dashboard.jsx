import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getSession, clearSession, setSession, getCachedAccounts } from '@/lib/auth';
import { getAnnouncement } from '@/lib/app-settings';
import { getAllPosts } from '@/lib/forum';
import SettingsModal from '@/components/SettingsModal';
import BrandingMark from '@/components/BrandingMark';
import ForumSection from '@/components/ForumSection';
import DashboardTab from '@/components/DashboardTab';
import PanelTab from '@/components/PanelTab';
import SupportTab from '@/components/SupportTab';
import DownloadsTab from '@/components/DownloadsTab';
import CloudConfigsTab from '@/components/CloudConfigsTab';
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
  const [feedPosts, setFeedPosts] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
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
              className="space-y-12"
            >
              {/* Atomic Header */}
              <div className="pt-4 pb-2">
                <span className="text-[10px] font-black tracking-[0.3em] text-blue-400/80 uppercase block mb-2">THE FEED</span>
                <h1 className="text-white font-black text-6xl md:text-7xl tracking-tighter leading-none mb-4">
                  adderall
                </h1>
                <p className="text-zinc-600 text-sm md:text-base font-medium tracking-tight">
                  updates, fixes and idk.
                </p>
              </div>

              {/* Feed Content */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#1f1f26] pb-4">
                  <h2 className="text-white font-bold text-xs uppercase tracking-widest">Latest Updates</h2>
                  {session.is_admin && (
                    <button 
                      onClick={() => setActiveSection({ id: 'updates-news', label: 'Updates & News', adminOnly: true })}
                      className="text-zinc-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                    >
                      <Plus size={12} /> Manage Feed
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {loadingFeed ? (
                    <div className="py-20 text-center text-zinc-600 text-[10px] font-mono uppercase tracking-widest animate-pulse">
                      Syncing with the feed...
                    </div>
                  ) : feedPosts.length === 0 ? (
                    <div className="py-20 text-center border border-[#1f1f26] bg-[#0e0e11]/40 rounded-sm">
                      <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest">No entries found.</p>
                    </div>
                  ) : (
                    feedPosts.map((post, i) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-[#0e0e11] border border-[#1f1f26] p-8 group hover:border-[#2a2a35] transition-all relative overflow-hidden"
                      >
                        {post.is_pinned && (
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500/30" />
                        )}
                        
                        <div className="flex flex-col gap-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-zinc-400 uppercase">
                                <span className={`w-2 h-2 rounded-full ${post.is_admin ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]' : 'bg-zinc-600'}`} />
                                {post.tag || (post.is_admin ? 'NEWS' : 'COMMUNITY')}
                              </span>
                              {post.is_pinned && (
                                <span className="text-[9px] font-black tracking-[0.25em] bg-blue-500/10 text-blue-400 px-3 py-1 rounded-none uppercase">
                                  PINNED
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-black tracking-[0.25em] text-zinc-600 uppercase font-mono">
                              {post.created_at ? new Date(post.created_at).toLocaleDateString() : 'RECENT'}
                            </span>
                          </div>

                          <div className="space-y-4">
                            <h3 className="text-white font-black text-2xl md:text-3xl tracking-tight leading-none group-hover:text-zinc-200 transition-colors">
                              {post.title}
                            </h3>
                            {post.body && (
                              <p className="text-zinc-500 text-sm md:text-base mt-4 leading-relaxed font-medium max-w-3xl">
                                {post.body}
                              </p>
                            )}
                            
                            {post.image_url && (
                              <div className="mt-8 overflow-hidden border border-white/5 bg-black/40">
                                <img
                                  src={post.image_url}
                                  alt="Media"
                                  className="w-full h-auto max-h-[600px] object-contain"
                                />
                              </div>
                            )}

                            <div className="flex items-center gap-3 mt-8 pt-6 border-t border-white/5">
                              <div className="w-8 h-8 rounded-full bg-[#16161a] border border-white/10 flex items-center justify-center text-[10px] font-black text-zinc-400 uppercase">
                                {post.author?.charAt(0) || 'U'}
                              </div>
                              <span className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                POSTED BY <span className="text-zinc-200">@{post.author}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
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
