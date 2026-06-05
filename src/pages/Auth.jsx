import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { loginUser, registerUser, getSession, ensureAdminExists, getDiscordAuthUrl, fetchDiscordUser } from '@/lib/auth';
import { Eye, EyeOff, MessageSquare, CheckCircle2, User, Lock, Ticket, MessageCircle, ArrowRight, SendHorizontal, Key, ImagePlus, X, Paperclip } from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import BrandingMark from '@/components/BrandingMark';
import ForumHomePanel from '@/components/ForumHomePanel';
import ALogo from '@/assets/alogo.png';
import { validateInviteCode, useInviteCode, isInviteSystemEnabled, getChatMessages, sendChatMessage } from '@/lib/invites';
import { getAllPosts } from '@/lib/forum';
import { getBackendDb } from '@/lib/backend';

const db = getBackendDb();

export default function Auth() {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const [activeView, setActiveView] = useState('forum'); // 'forum', 'login', 'register'
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [licenseType, setLicenseType] = useState('script');
  const [scriptLicenseKey, setScriptLicenseKey] = useState('');
  const [internalLicenseKey, setInternalLicenseKey] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [discordLinked, setDiscordLinked] = useState(false);
  const [discordInfo, setDiscordInfo] = useState(null);

  const [regStep, setRegStep] = useState('invite'); // invite, choice, chat, register
  const [inviteCode, setInviteCode] = useState('');
  const [inviteSystemEnabled, setInviteSystemEnabledState] = useState(true);
  const [chatSessionId, setChatSessionId] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [chatPolling, setChatPolling] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [feedPosts, setFeedPosts] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [latestPreviews, setLatestPreviews] = useState({});
  const [postCounts, setPostCounts] = useState({});
  const [selectedSection, setSelectedSection] = useState(null);
  const [showForumsMenu, setShowForumsMenu] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    loadFeed();
  }, []);

  async function loadFeed() {
    setLoadingFeed(true);
    try {
      const posts = await getAllPosts();
      setFeedPosts(posts);

      // Update previews for categories
      const latest = {};
      const counts = {};
      posts.forEach(p => {
        counts[p.section] = (counts[p.section] || 0) + 1;
        if (!latest[p.section] || new Date(p.created_at) > new Date(latest[p.section].created_at)) {
          latest[p.section] = p;
        }
      });
      setLatestPreviews(latest);
      setPostCounts(counts);
    } catch {
      setFeedPosts([]);
    } finally {
      setLoadingFeed(false);
    }
  }

  // Captcha removed — always passes
  const captchaVerified = true;

  useEffect(() => {
    if (chatId) {
      setMode('register');
      setRegStep('chat');
      setChatSessionId(chatId);
      setActiveView('register');
    }
  }, [chatId]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const [showIntro, setShowIntro] = useState(true);
  const [redirectToDashboard, setRedirectToDashboard] = useState(false);
  const [brandingAnimation, setBrandingAnimation] = useState('fade');
  const [brandingShowCc, setBrandingShowCc] = useState(() => localStorage.getItem('adderal_brandingShowCc') === 'true');

  useEffect(() => {
    const session = getSession();
    const hasSession = !!session;
    setRedirectToDashboard(hasSession);
    ensureAdminExists().catch(() => { });

    const timeout = setTimeout(() => {
      setShowIntro(false);
      if (hasSession) navigate('/dashboard');
    }, 2200);

    if (!hasSession) {
      isInviteSystemEnabled().then(setInviteSystemEnabledState);
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const token = hashParams.get('access_token');

      if (code || token) {
        setMode('register');
        setRegStep('register'); // Skip steps if returning from Discord
        setActiveView('register');
        setLoading(true);
        fetchDiscordUser(token || code)
          .then(info => {
            setDiscordInfo(info);
            setDiscordLinked(true);
            window.history.replaceState({}, document.title, '/');
          })
          .catch(err => setError(err.message))
          .finally(() => setLoading(false));
      }
    }

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (regStep === 'chat' && chatSessionId) {
      const poll = setInterval(async () => {
        try {
          const sorted = await getChatMessages(chatSessionId);
          if (!Array.isArray(sorted)) return;
          setChatMessages(sorted);

          // Check for license key message
          const licenseMsg = sorted.find(m => m && m.type === 'license');
          if (licenseMsg && typeof licenseMsg.content === 'string') {
            const keyMatch = licenseMsg.content.match(/license key has been generated: ([^.]+)/);
            if (keyMatch && keyMatch[1]) {
              setScriptLicenseKey(keyMatch[1]);
              setRegStep('register');
              clearInterval(poll);
            }
          }
        } catch (err) {
          console.error('Chat polling error:', err);
        }
      }, 3000);
      setChatPolling(poll);
      return () => clearInterval(poll);
    }
  }, [regStep, chatSessionId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!captchaVerified) {
      setError('Please verify you are human by completing the CAPTCHA.');
      return;
    }

    if (mode === 'register' && !discordLinked) {
      setError('You must connect your Discord account to register.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await loginUser(username, password, discordLinked ? discordInfo : null);
      } else {
        await registerUser(username, password, {
          licenseType,
          scriptLicenseKey,
          internalLicenseKey,
          discord_id: discordInfo.id,
          discord_username: discordInfo.username,
          discord_avatar: discordInfo.avatar,
        });
        
        if (inviteSystemEnabled && inviteCode) {
          await useInviteCode(inviteCode, username);
        }
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleInviteSubmit(e) {
    e.preventDefault();
    setError('');
    
    if (!captchaVerified) {
      setError('Please verify you are human by completing the CAPTCHA.');
      return;
    }

    setLoading(true);
    try {
      await validateInviteCode(inviteCode);
      setRegStep('choice');
      // Reset captcha for the final registration form
      // captcha removed
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function startWebsiteChat() {
    setError('');
    setLoading(true);
    try {
      const sessionId = `reg_${Math.random().toString(36).substring(2, 15)}`;
      setChatSessionId(sessionId);
      await sendChatMessage(sessionId, 'system', 'Registration chat started. Please wait for an admin to assist you.', 'system');
      setRegStep('chat');
      navigate(`/register/chat/${sessionId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !chatSessionId) return;
    
    setUploadingImage(true);
    try {
      let file_url = '';
      try {
        const result = await db.integrations.Core.UploadFile({ file });
        file_url = result.file_url;
      } catch (uploadErr) {
        if ((uploadErr?.message || '').includes('Backend is not configured')) {
          file_url = URL.createObjectURL(file);
        } else {
          throw uploadErr;
        }
      }
      await sendChatMessage(chatSessionId, 'registerer', file_url, 'image');
    } catch (err) {
      if (!(err?.message || '').includes('Backend is not configured')) {
        setError('Failed to upload image: ' + err.message);
      }
    } finally {
      setUploadingImage(false);
    }
  }

  async function sendChatMessageUser(e) {
    e.preventDefault();
    if (!newChatMessage.trim() || !chatSessionId) return;
    try {
      await sendChatMessage(chatSessionId, 'registerer', newChatMessage.trim());
      setNewChatMessage('');
    } catch (err) {
      if (!(err?.message || '').includes('Backend is not configured')) {
        setError('Failed to send message: ' + err.message);
      }
    }
  }

  // Turnstile CAPTCHA removed
  const renderCaptcha = () => null;

  const renderRegisterSteps = () => {
    switch (regStep) {
      case 'invite':
        return (
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div className="text-center mb-6">
              <p className="text-zinc-400 text-xs">Enter your invitation code to proceed.</p>
            </div>
            <div>
              <label className="text-zinc-400 text-[10px] font-bold tracking-wider mb-1.5 block uppercase">Invite Code</label>
              <input
                type="text"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="INVITE-CODE"
                required
                className="w-full bg-[#0b0b0d] border border-[#222] text-white rounded-none pl-3 pr-3 py-2.5 text-xs placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors font-mono tracking-widest"
              />
            </div>
            {renderCaptcha()}
            {error && (
              <p className="text-red-400 text-[10px] bg-red-400/10 border border-red-400/20 rounded-none px-3 py-2 font-mono">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3 rounded-none text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 outline outline-1 outline-white/30 outline-offset-2"
            >
              {loading ? 'Validating...' : 'Continue'}
              <ArrowRight size={14} />
            </button>
          </form>
        );
      case 'choice':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <p className="text-zinc-400 text-xs">How would you like to get your license key?</p>
            </div>
            <button
              onClick={startWebsiteChat}
              className="w-full bg-[#18181b] hover:bg-[#222] text-white font-bold py-3 rounded-none text-xs tracking-widest transition-colors flex items-center justify-center gap-3 border border-[#222] uppercase"
            >
              <MessageCircle size={16} className="text-zinc-400" />
              Website Chat (Talk to Admin)
            </button>
            <a
              href="https://discord.gg/ycymTeFWBd"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#18181b] hover:bg-[#222] text-white font-bold py-3 rounded-none text-xs tracking-widest transition-colors flex items-center justify-center gap-3 border border-[#222] uppercase"
            >
              <MessageSquare size={16} />
              Join Discord Server
            </a>
            <button
              onClick={() => setRegStep('invite')}
              className="w-full text-zinc-500 hover:text-zinc-300 text-[10px] tracking-wider transition-colors mt-2 uppercase font-mono"
            >
              Back
            </button>
          </div>
        );
      case 'chat':
        return (
          <div className="space-y-4 h-[500px] flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-4 p-4 border border-[#222] rounded-none bg-[#0e0e11] custom-scrollbar">
              {(chatMessages || []).map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg?.sender === 'registerer' ? 'items-end' : msg?.sender === 'system' ? 'items-center' : 'items-start'}`}>
                  {msg?.sender === 'system' ? (
                    <div className="bg-zinc-900/50 text-zinc-500 text-[9px] px-3 py-1 rounded-none border border-[#222] my-2 font-mono uppercase tracking-widest">
                      {msg?.content || '—'}
                    </div>
                  ) : (
                    <div className={`max-w-[75%] rounded-none px-4 py-2.5 text-xs ${msg?.sender === 'registerer' ? 'bg-zinc-800 text-white border border-zinc-700' : 'bg-[#18181b] text-zinc-200 border border-[#222]'}`}>
                      {msg?.type === 'image' ? (
                        <div className="overflow-hidden border border-white/5">
                          <img 
                            src={msg?.content} 
                            alt="Sent image" 
                            className="max-w-full h-auto cursor-pointer hover:scale-[1.01] transition-transform" 
                            onClick={() => msg?.content && window.open(msg.content, '_blank')}
                          />
                        </div>
                      ) : (
                        msg?.content || '—'
                      )}
                    </div>
                  )}
                  <span className="text-[8px] text-zinc-600 mt-1 px-1 font-mono">
                    {msg?.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="flex flex-col gap-2 pt-2">
              {error && (
                <p className="text-red-400 text-[9px] bg-red-400/5 border border-red-400/10 rounded-none px-3 py-1.5 flex items-center justify-between font-mono">
                  {error}
                  <button onClick={() => setError('')}><X size={10} /></button>
                </p>
              )}
              <form onSubmit={sendChatMessageUser} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    value={newChatMessage}
                    onChange={e => setNewChatMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full bg-[#0b0b0d] border border-[#222] text-white rounded-none pl-4 pr-10 py-3 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                  />
                  <label className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-zinc-500 hover:text-zinc-300 transition-colors">
                    <Paperclip size={16} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={!newChatMessage.trim() || uploadingImage}
                  className="p-3 bg-white text-black disabled:opacity-50 hover:bg-zinc-200 transition-colors rounded-none"
                >
                  <SendHorizontal size={18} />
                </button>
              </form>
              <div className="flex items-center justify-center gap-4 text-[9px] text-zinc-600 font-bold uppercase tracking-wider font-mono">
                <span className="animate-pulse flex items-center gap-1 italic"><User size={9} /> Admin is viewing</span>
              </div>
            </div>
          </div>
        );
      case 'register':
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-zinc-400 text-[10px] font-bold tracking-wider mb-1.5 block uppercase">Username</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  autoComplete="username"
                  maxLength={32}
                  className="w-full bg-[#0b0b0d] border border-[#222] text-white rounded-none pl-9 pr-3 py-2.5 text-xs placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-zinc-400 text-[10px] font-bold tracking-wider mb-1.5 block uppercase">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  className="w-full bg-[#0b0b0d] border border-[#222] text-white rounded-none pl-9 pr-10 py-2.5 text-xs placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {!discordLinked ? (
                <a
                  href={getDiscordAuthUrl()}
                  className="w-full bg-[#18181b] border border-[#222] hover:bg-[#222] text-white rounded-none px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 discord-glow hover:shadow-[0_0_25px_rgba(88,101,242,0.4)]"
                >
                  <MessageSquare size={16} />
                  Connect Discord
                </a>
              ) : (
                <div className="w-full bg-[#141416] border border-[#222] rounded-none px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-zinc-400" />
                    <div className="flex flex-col">
                      <span className="text-zinc-500 text-[8px] font-bold uppercase tracking-widest">Discord Linked</span>
                      <span className="text-zinc-300 text-xs font-mono">{discordInfo?.username}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setDiscordLinked(false); setDiscordInfo(null); }}
                    className="text-zinc-500 hover:text-zinc-300 text-[10px] underline font-mono uppercase"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-zinc-400 text-[10px] font-bold tracking-wider mb-1.5 block uppercase">License Type</label>
                  <select
                    value={licenseType}
                    onChange={e => setLicenseType(e.target.value)}
                    className="w-full bg-[#0b0b0d] border border-[#222] text-white rounded-none px-3 py-2.5 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                  >
                    <option value="script">Script</option>
                    <option value="internal">Internal</option>
                  </select>
                </div>
                {licenseType === 'internal' && (
                  <div>
                    <label className="text-zinc-400 text-[10px] font-bold tracking-wider mb-1.5 block uppercase">Internal License Key</label>
                    <input
                      type="text"
                      value={internalLicenseKey}
                      onChange={e => setInternalLicenseKey(e.target.value)}
                      placeholder="Internal key..."
                      required={licenseType === 'internal'}
                      maxLength={64}
                      className="w-full bg-[#0b0b0d] border border-[#222] text-white rounded-none px-3 py-2.5 text-xs placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors font-mono"
                    />
                  </div>
                )}
                <div>
                  <label className="text-zinc-400 text-[10px] font-bold tracking-wider mb-1.5 block uppercase">Script License Key</label>
                  <div className="relative">
                    <Key size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input
                      type="text"
                      value={scriptLicenseKey}
                      onChange={e => setScriptLicenseKey(e.target.value)}
                      placeholder="Script key..."
                      required
                      maxLength={64}
                      className="w-full bg-[#0b0b0d] border border-[#222] text-white rounded-none pl-9 pr-3 py-2.5 text-xs placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {renderCaptcha()}

            {error && (
              <p className="text-red-400 text-xs bg-red-400/5 border border-red-400/10 rounded-none px-3 py-2 font-mono">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white hover:bg-zinc-200 disabled:opacity-50 text-black font-bold py-3 rounded-none text-xs uppercase tracking-widest transition-colors outline outline-1 outline-white/30 outline-offset-2"
            >
              {loading ? 'Please wait...' : 'Register'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!inviteSystemEnabled) {
                  setMode('login');
                  setActiveView('login');
                } else {
                  setRegStep('choice');
                }
              }}
              className="w-full text-zinc-500 hover:text-zinc-300 text-[10px] tracking-wider transition-colors uppercase font-mono"
            >
              Back
            </button>
          </form>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-white flex flex-col relative overflow-y-auto grid-bg font-sans">
      
      {/* Intro Animation Overlay */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
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

      {/* Main Header Container */}
      <header className="w-full bg-[#0b0b0d] border-b border-[#1c1c22] z-50">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo / Brand Name */}
          <button 
            onClick={() => setActiveView('forum')}
            className="text-white font-black tracking-[0.25em] text-xl md:text-2xl uppercase hover:opacity-90 transition-opacity font-sans focus:outline-none"
          >
            ADDERALL
          </button>
          {/* Right Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMode('login');
                setActiveView('login');
                // captcha removed
                setError('');
              }}
              className={`text-[10px] font-bold font-mono tracking-widest px-4 py-2 uppercase border transition-all rounded-none ${
                activeView === 'login' 
                  ? 'bg-white text-black border-white' 
                  : 'bg-[#121215] text-zinc-300 border-[#222] hover:bg-[#1a1a1f] hover:text-white'
              }`}
            >
              LOGIN
            </button>
            <button
              onClick={() => {
                setMode('register');
                setRegStep(inviteSystemEnabled ? 'invite' : 'register');
                setActiveView('register');
                // captcha removed
                setError('');
              }}
              className={`text-[10px] font-bold font-mono tracking-widest px-4 py-2 uppercase border transition-all rounded-none ${
                activeView === 'register' 
                  ? 'bg-white text-black border-white' 
                  : 'bg-[#121215] text-zinc-300 border-[#222] hover:bg-[#1a1a1f] hover:text-white'
              }`}
            >
              REGISTER
            </button>
            <a
              href="https://discord.gg/ycymTeFWBd"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-bold font-mono tracking-widest px-4 py-2 uppercase border bg-[#121215] text-zinc-300 border-[#222] hover:bg-[#1a1a1f] hover:text-white transition-all rounded-none flex items-center justify-center gap-1.5 discord-glow hover:shadow-[0_0_20px_rgba(88,101,242,0.4)] hover:border-[#5865F2]"
            >
              DISCORD
            </a>
          </div>
        </div>
      </header>

      {/* Sub Navigation Bar */}
      <nav className="w-full bg-[#141416] border-b border-[#1c1c22] py-3.5 z-40 select-none">
        <div className="max-w-[1200px] mx-auto px-6 flex items-center">
          <button
            onClick={() => setActiveView('forum')}
            className={`text-xs font-bold tracking-wider transition-colors hover:text-white uppercase ${
              activeView === 'forum' ? 'text-white border-b border-white pb-0.5' : 'text-zinc-500'
            }`}
          >
            Home
          </button>
        </div>
      </nav>

      {/* Body View Render area */}
      <main className="flex-1 flex flex-col max-w-[1200px] w-full mx-auto px-6 py-10 z-30">
        <AnimatePresence mode="wait">
          
          {/* View 1: Forum List View (Categories) */}
          {activeView === 'forum' && !selectedSection && (
            <motion.div
              key="forum-categories"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <ForumHomePanel
                postCounts={postCounts}
                latestPreviews={latestPreviews}
                isAdmin={false}
                showForumsMenu={showForumsMenu}
                onOpenForums={() => setShowForumsMenu(true)}
                onCloseForums={() => setShowForumsMenu(false)}
                onSelectSection={setSelectedSection}
              />
            </motion.div>
          )}

          {/* View 1b: Specific Section Posts */}
          {activeView === 'forum' && selectedSection && (
            <motion.div
              key="forum-section"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 w-full max-w-4xl"
            >
              <button
                onClick={() => { setSelectedSection(null); setShowForumsMenu(true); }}
                className="text-zinc-500 hover:text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-4 transition-colors"
              >
                ← Back to Forums
              </button>
              
              <div className="border-b border-[#1f1f26] pb-4">
                <h2 className="text-white font-black text-3xl tracking-tight uppercase">{selectedSection.label}</h2>
                <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mt-1">Community Feed</p>
              </div>

              <div className="space-y-6">
                {feedPosts.filter(p => p.section === selectedSection.id).length === 0 ? (
                  <div className="py-20 text-center border border-[#1f1f26] bg-[#0e0e11]/40 rounded-sm">
                    <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest">No entries found.</p>
                  </div>
                ) : (
                  feedPosts.filter(p => p.section === selectedSection.id).map((post, i) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 10 }}
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
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* View 2: Authentication Form overlays */}
          {(activeView === 'login' || activeView === 'register') && (
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className={`w-full flex-1 flex items-center justify-center py-6 transition-all duration-300`}
            >
              <div className={`glass-panel outline outline-1 outline-white/5 outline-offset-8 p-8 md:p-10 shadow-2xl relative z-10 w-full transition-all duration-300 ${regStep === 'chat' && mode === 'register' ? 'max-w-[800px]' : 'max-w-[420px]'}`}>
                <div className="text-center mb-8 flex flex-col items-center">
                  <img src={ALogo} alt="Adderall Logo" className="h-12 w-auto mb-4 object-contain opacity-90" />
                  <h1 className="text-white text-2xl font-black tracking-wider uppercase leading-none font-sans">
                    {mode === 'login' ? 'LOGIN' : 'REGISTER'}
                  </h1>
                  <span className="text-red-500 text-[10px] font-bold tracking-[0.25em] uppercase mt-1.5 block">
                    ADDERALL
                  </span>
                </div>

                {mode === 'login' ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-zinc-400 text-[10px] font-bold tracking-wider mb-1.5 block uppercase">Username</label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input
                          type="text"
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                          placeholder="Enter username"
                          required
                          autoComplete="username"
                          maxLength={32}
                          className="w-full bg-[#0b0b0d] border border-[#222] text-white rounded-none pl-9 pr-3 py-2.5 text-xs placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-zinc-400 text-[10px] font-bold tracking-wider mb-1.5 block uppercase">Password</label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input
                          type={showPass ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          autoComplete="current-password"
                          className="w-full bg-[#0b0b0d] border border-[#222] text-white rounded-none pl-9 pr-10 py-2.5 text-xs placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                        >
                          {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    {renderCaptcha()}

                    {error && (
                      <p className="text-red-400 text-xs bg-red-400/5 border border-red-400/10 rounded-none px-3 py-2 font-mono">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-white hover:bg-zinc-200 disabled:opacity-50 text-black font-bold py-3 rounded-none text-xs uppercase tracking-widest transition-colors outline outline-1 outline-white/30 outline-offset-2"
                    >
                      {loading ? 'Please wait...' : 'Sign in'}
                    </button>
                  </form>
                ) : (
                  renderRegisterSteps()
                )}

                <div className="mt-6 text-center space-y-3">
                  <button
                    onClick={() => { 
                      const newMode = mode === 'login' ? 'register' : 'login';
                      setMode(newMode); 
                      setError('');
                      // captcha removed
                      if (newMode === 'register') {
                        setRegStep(inviteSystemEnabled ? 'invite' : 'register');
                        setActiveView('register');
                      } else {
                        setActiveView('login');
                      }
                    }}
                    className="text-zinc-400 hover:text-white font-mono text-[10px] tracking-wider uppercase transition-colors"
                  >
                    {mode === 'login' ? "NOT A MEMBER? Register" : "MEMBER? Login"}
                  </button>

                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <div className="py-6 text-center mt-auto border-t border-[#141416]/50">
        <p className="text-zinc-600 text-[11px] font-garamond italic tracking-widest">
          @foreverwithmommy is my pup
        </p>
      </div>

      {/* Footer copyright */}
      <footer className="py-4 text-center select-none opacity-40">
        <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">
          ADDERALL © 2026
        </span>
      </footer>

      {/* Fixed discord popup launcher */}
      <div className="fixed bottom-10 left-10 z-50">
        <a
          href="https://discord.gg/ycymTeFWBd"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Join Discord server"
          className="group relative flex items-center justify-center w-12 h-12"
        >
          <div className="absolute inset-0 rounded-none border border-[#222] bg-[#121215] group-hover:border-zinc-500 group-hover:bg-[#1a1a1f] transition-all duration-200" />
          <svg viewBox="0 0 127.14 96.36" className="w-5 h-auto fill-zinc-400 relative z-10 group-hover:fill-white group-hover:scale-105 transition-all duration-200" aria-hidden="true">
            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.71,32.65-1.82,56.6.4,80.21a105.73,105.73,0,0,0,32.29,16.15,77.7,77.7,0,0,0,7.37-12,67.48,67.48,0,0,1-11.86-5.67c.91-.66,1.8-1.34,2.66-2a75.31,75.31,0,0,0,65.32,0c.87.71,1.76,1.39,2.66,2a67.88,67.88,0,0,1-11.86,5.67,79.71,79.71,0,0,0,7.37,12,106.15,106.15,0,0,0,32.33-16.14C129.58,52.87,125.09,29.05,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5.07-12.67,11.41-12.67S54,46,53.86,53,48.74,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5.07-12.67,11.44-12.67S96.23,46,96.11,53,91,65.69,84.69,65.69Z" />
          </svg>
        </a>
      </div>

    </div>
  );
}
