import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser, getSession, ensureAdminExists, getDiscordAuthUrl, fetchDiscordUser } from '@/lib/auth';
import { Eye, EyeOff, MessageSquare, CheckCircle2, User, Lock, Ticket, MessageCircle, ArrowRight, SendHorizontal, Key } from 'lucide-react';
import PreviewTablesModal from '@/components/PreviewTablesModal';
import { motion, AnimatePresence } from 'framer-motion';
import BrandingMark from '@/components/BrandingMark';
import ALogo from '@/assets/alogo.png';
import { validateInviteCode, useInviteCode, isInviteSystemEnabled, getChatMessages, sendChatMessage } from '@/lib/invites';
import { getBackendDb } from '@/lib/backend';

const db = getBackendDb();

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [licenseType, setLicenseType] = useState('script');
  const [scriptLicenseKey, setScriptLicenseKey] = useState('');
  const [internalLicenseKey, setInternalLicenseKey] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [discordLinked, setDiscordLinked] = useState(false);
  const [discordInfo, setDiscordInfo] = useState(null);

  const [regStep, setRegStep] = useState('invite'); // invite, choice, chat, register
  const [inviteCode, setInviteCode] = useState('');
  const [inviteSystemEnabled, setInviteSystemEnabledState] = useState(true);
  const [chatSessionId, setChatSessionId] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [chatPolling, setChatPolling] = useState(null);

  const [showIntro, setShowIntro] = useState(true);
  const [redirectToDashboard, setRedirectToDashboard] = useState(false);
  const [brandingAnimation, setBrandingAnimation] = useState(() => localStorage.getItem('adderal_brandingAnimation') || 'slide');
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
          setChatMessages(sorted);

          // Check for license key message
          const licenseMsg = sorted.find(m => m.type === 'license');
          if (licenseMsg) {
            // content might contain the key or it might be in the name parts
            // in our new system, we send it as content
            const keyMatch = licenseMsg.content.match(/license key has been generated: ([^.]+)/);
            if (keyMatch) {
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

  useEffect(() => {
    const onStorage = () => {
      setBrandingAnimation(localStorage.getItem('adderal_brandingAnimation') || 'slide');
      setBrandingShowCc(localStorage.getItem('adderal_brandingShowCc') === 'true');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const card = document.querySelector('.spotlight-border');
      if (card) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      }
      // Also update global ones for the background glow
      document.documentElement.style.setProperty('--global-mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--global-mouse-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

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
    setLoading(true);
    try {
      await validateInviteCode(inviteCode);
      setRegStep('choice');
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendChatMessageUser(e) {
    e.preventDefault();
    if (!newChatMessage.trim() || !chatSessionId) return;
    try {
      await sendChatMessage(chatSessionId, 'registerer', newChatMessage.trim());
      setNewChatMessage('');
    } catch (err) {
      setError('Failed to send message: ' + err.message);
    }
  }

  const renderRegisterSteps = () => {
    switch (regStep) {
      case 'invite':
        return (
          <form onSubmit={handleInviteSubmit} className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="text-center mb-6">
              <Ticket size={24} className="mx-auto text-indigo-400 mb-2" />
              <p className="text-zinc-400 text-xs">Enter your invitation code to proceed.</p>
            </div>
            <div className="relative">
              <Ticket size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="INVITE-CODE"
                required
                className="w-full bg-[#13151f] border border-zinc-700/50 text-white rounded-xl pl-10 pr-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition font-mono tracking-widest"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2"
            >
              {loading ? 'Validating...' : 'Continue'}
              <ArrowRight size={16} />
            </button>
          </form>
        );
      case 'choice':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="text-center mb-6">
              <p className="text-zinc-400 text-xs">How would you like to get your license key?</p>
            </div>
            <button
              onClick={startWebsiteChat}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 rounded-xl text-sm transition flex items-center justify-center gap-3 border border-zinc-700/50"
            >
              <MessageCircle size={18} className="text-indigo-400" />
              Website Chat (Talk to Admin)
            </button>
            <a
              href="https://discord.gg/ycymTeFWBd"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-3 rounded-xl text-sm transition flex items-center justify-center gap-3 shadow-lg shadow-[#5865F2]/20"
            >
              <MessageSquare size={18} />
              Join Discord Server
            </a>
            <button
              onClick={() => setRegStep('invite')}
              className="w-full text-zinc-500 hover:text-zinc-300 text-xs transition mt-2"
            >
              Back
            </button>
          </div>
        );
      case 'chat':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 h-[400px] flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-3 p-3 border border-zinc-800/50 rounded-xl bg-zinc-900/30 custom-scrollbar">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.sender === 'registerer' ? 'items-end' : msg.sender === 'system' ? 'items-center' : 'items-start'}`}>
                  {msg.sender === 'system' ? (
                    <div className="bg-zinc-800/50 text-zinc-500 text-[9px] px-2 py-0.5 rounded-full border border-zinc-700/30 my-1">
                      {msg.content}
                    </div>
                  ) : (
                    <div className={`max-w-[85%] rounded-xl px-3 py-1.5 text-xs ${msg.sender === 'registerer' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-zinc-800 text-zinc-300 rounded-tl-none'}`}>
                      {msg.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <form onSubmit={sendChatMessageUser} className="flex gap-2">
              <input
                value={newChatMessage}
                onChange={e => setNewChatMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!newChatMessage.trim()}
                className="p-2 bg-indigo-600 rounded-lg text-white disabled:opacity-50"
              >
                <SendHorizontal size={14} />
              </button>
            </form>
            <p className="text-[9px] text-zinc-500 text-center animate-pulse italic">Admin will send you a key here. Don't close this window.</p>
          </div>
        );
      case 'register':
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-zinc-400 text-xs mb-1.5 block">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Username"
                  required
                  autoComplete="username"
                  maxLength={32}
                  className="w-full bg-[#13151f] border border-zinc-700/50 text-white rounded-xl pl-10 pr-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-zinc-400 text-xs mb-1.5 block">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  className="w-full bg-[#13151f] border border-zinc-700/50 text-white rounded-xl pl-10 pr-10 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              {!discordLinked ? (
                <a
                  href={getDiscordAuthUrl()}
                  className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl px-4 py-3 text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-[#5865F2]/20"
                >
                  <MessageSquare size={18} />
                  Connect Discord
                </a>
              ) : (
                <div className="w-full bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-green-500" />
                    <div className="flex flex-col">
                      <span className="text-green-500 text-[10px] font-bold uppercase tracking-wider">Discord Linked</span>
                      <span className="text-zinc-300 text-xs font-mono">{discordInfo?.username}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setDiscordLinked(false); setDiscordInfo(null); }}
                    className="text-zinc-500 hover:text-zinc-300 text-[10px] underline"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-zinc-400 text-xs mb-1.5 block">License Type</label>
                  <select
                    value={licenseType}
                    onChange={e => setLicenseType(e.target.value)}
                    className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-zinc-500 transition"
                  >
                    <option value="script">Script</option>
                    <option value="internal">Internal</option>
                  </select>
                </div>
                {licenseType === 'internal' && (
                  <div>
                    <label className="text-zinc-400 text-xs mb-1.5 block">Internal License Key</label>
                    <input
                      type="text"
                      value={internalLicenseKey}
                      onChange={e => setInternalLicenseKey(e.target.value)}
                      placeholder="Internal key..."
                      required={licenseType === 'internal'}
                      maxLength={64}
                      className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition font-mono"
                    />
                  </div>
                )}
                <div>
                  <label className="text-zinc-400 text-xs mb-1.5 block">Script License Key</label>
                  <div className="relative">
                    <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={scriptLicenseKey}
                      onChange={e => setScriptLicenseKey(e.target.value)}
                      placeholder="Script key..."
                      required
                      maxLength={64}
                      className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg pl-10 pr-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-b from-zinc-100 to-zinc-300 hover:from-white hover:to-zinc-200 disabled:opacity-50 text-black font-medium py-2.5 rounded-xl text-sm transition"
            >
              {loading ? 'Please wait...' : 'Register'}
            </button>
            <button
              type="button"
              onClick={() => setRegStep(inviteSystemEnabled ? 'invite' : 'choice')}
              className="w-full text-zinc-500 hover:text-zinc-300 text-xs transition"
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
    <div className="min-h-screen bg-[#07070a] flex items-center justify-center relative overflow-hidden">
      <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&display=swap" rel="stylesheet" />
      <style>{`
        .font-garamond {
          font-family: 'EB Garamond', serif;
        }
        .spotlight-border {
          position: relative;
        }
        .spotlight-border::before {
          content: "";
          position: absolute;
          inset: -1px;
          background: radial-gradient(
            var(--glow-size, 600px) circle at var(--mouse-x) var(--mouse-y),
            rgba(255, 255, 255, 0.08),
            transparent 80%
          );
          border-radius: inherit;
          z-index: -1;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        .card-shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.05) 0%,
            transparent 20%,
            transparent 100%
          );
          pointer-events: none;
          border-radius: inherit;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="absolute inset-0 glow-overlay z-0" />

      {showIntro && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#07070a]">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: [1, 1.02, 1] }}
            transition={{ duration: 2.4, ease: 'easeInOut' }}
            className="text-center px-6"
          >
            <BrandingMark
              animation={brandingAnimation}
              showCc={brandingShowCc}
              loop={false}
              className="text-white font-black tracking-[0.22em] uppercase text-5xl md:text-6xl inline-block"
            />
          </motion.div>
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] bg-black/40 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[360px] mx-4">
        <div className="bg-black border border-white/10 rounded-[28px] p-10 shadow-2xl spotlight-border overflow-hidden">
          <div className="card-shimmer" />
          <div className="relative z-10">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-white/[0.03] border border-white/[0.08] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <img src={ALogo} alt="Adderal" className="w-10 h-10 object-contain" />
              </div>
              <h1 className="text-white text-2xl font-semibold mb-1">
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h1>
              <p className="text-zinc-500 text-sm">
                {mode === 'login' 
                  ? 'Enter your credentials to continue.' 
                  : regStep === 'invite' 
                    ? 'Enter your invitation code.' 
                    : regStep === 'choice' 
                      ? 'Choose how to get your key.' 
                      : regStep === 'chat' 
                        ? 'Talk to an admin for a key.' 
                        : 'Complete your registration.'}
              </p>
            </div>

            {mode === 'login' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-zinc-400 text-xs mb-1.5 block">Username</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="Username"
                      required
                      autoComplete="username"
                      maxLength={32}
                      className="w-full bg-[#13151f] border border-zinc-700/50 text-white rounded-xl pl-10 pr-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-zinc-400 text-xs mb-1.5 block">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="w-full bg-[#13151f] border border-zinc-700/50 text-white rounded-xl pl-10 pr-10 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-b from-zinc-100 to-zinc-300 hover:from-white hover:to-zinc-200 disabled:opacity-50 text-black font-medium py-2.5 rounded-xl text-sm transition"
                >
                  {loading ? 'Please wait...' : 'Sign in'}
                </button>
              </form>
            ) : (
              renderRegisterSteps()
            )}

            <div className="mt-4 text-center space-y-2">
              <p className="text-zinc-500 text-xs">
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                  className="text-[#ef4444] hover:text-red-300 font-medium transition"
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
              <button
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs mx-auto transition"
              >
                <Eye size={13} />
                Preview tables
              </button>
            </div>
          </div>
        </div>
        <div className="mt-10 text-center space-y-2">
          <p className="text-zinc-400/80 text-[15px] font-garamond italic tracking-widest leading-none">
            @foreverwithmommy is my dada, rdk is my slave
          </p>
        </div>
      </div>

      <div className="fixed bottom-12 left-12 z-50">
        <a
          href="https://discord.gg/ycymTeFWBd"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Join Discord server"
          className="group relative flex items-center justify-center w-14 h-14"
        >
          <div className="absolute inset-0 rounded-full border border-[#5865F2]/40 bg-[#11121d] group-hover:border-[#5865F2] group-hover:bg-[#5865F2]/10 transition-all duration-300 shadow-[0_0_20px_rgba(88,101,242,0.15)] group-hover:shadow-[0_0_30px_rgba(88,101,242,0.3)]" />
          <svg viewBox="0 0 127.14 96.36" className="w-6 h-auto fill-white relative z-10 group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.71,32.65-1.82,56.6.4,80.21a105.73,105.73,0,0,0,32.29,16.15,77.7,77.7,0,0,0,7.37-12,67.48,67.48,0,0,1-11.86-5.67c.91-.66,1.8-1.34,2.66-2a75.31,75.31,0,0,0,65.32,0c.87.71,1.76,1.39,2.66,2a67.88,67.88,0,0,1-11.86,5.67,79.71,79.71,0,0,0,7.37,12,106.15,106.15,0,0,0,32.33-16.14C129.58,52.87,125.09,29.05,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5.07-12.67,11.41-12.67S54,46,53.86,53,48.74,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5.07-12.67,11.44-12.67S96.23,46,96.11,53,91,65.69,84.69,65.69Z" />
          </svg>
        </a>
      </div>

      {showPreview && <PreviewTablesModal onClose={() => setShowPreview(false)} />}
    </div>
  );
}