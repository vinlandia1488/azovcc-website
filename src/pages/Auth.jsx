import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser, getSession, ensureAdminExists, getDiscordAuthUrl, fetchDiscordUser } from '@/lib/auth';
import { Eye, EyeOff, MessageSquare, CheckCircle2 } from 'lucide-react';
import PreviewTablesModal from '@/components/PreviewTablesModal';
import { motion } from 'framer-motion';

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

  const [showIntro, setShowIntro] = useState(true);
  const [redirectToDashboard, setRedirectToDashboard] = useState(false);

  useEffect(() => {
    const session = getSession();
    const hasSession = !!session;
    setRedirectToDashboard(hasSession);
    ensureAdminExists().catch(() => {});

    const timeout = setTimeout(() => {
      setShowIntro(false);
      if (hasSession) navigate('/dashboard');
    }, 2200);

    if (!hasSession) {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const token = hashParams.get('access_token');

      if (code || token) {
        setMode('register');
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
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07070a] flex items-center justify-center relative overflow-hidden">
      {showIntro && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#07070a]">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: [1, 1.02, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
            className="text-center px-6"
          >
            <div className="text-white font-black tracking-[0.22em] uppercase text-5xl md:text-6xl">
              <span style={{ textShadow: '0 0 14px rgba(255,255,255,0.08)' }}>AZOV</span>
              <motion.span
                className="inline-block text-[#ef4444]"
                animate={{
                  filter: [
                    'drop-shadow(0 0 0 rgba(239,68,68,0))',
                    'drop-shadow(0 0 16px rgba(239,68,68,0.7))',
                    'drop-shadow(0 0 30px rgba(239,68,68,0.35))',
                  ],
                }}
                transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
              >
                CC
              </motion.span>
            </div>
            <div className="mt-6 flex items-center justify-center gap-3 text-zinc-500 text-sm uppercase tracking-widest font-bold">
              <span className="w-2 h-2 rounded-full bg-[#a855f7] shadow-[0_0_18px_rgba(168,85,247,0.6)] animate-pulse" />
              Initializing
            </div>
            <motion.div
              className="mt-5 mx-auto w-[220px] h-1.5 rounded-full bg-white/10 overflow-hidden"
              initial={{ opacity: 0.6, scaleX: 0.7 }}
              animate={{ opacity: 1, scaleX: [0.7, 1, 0.7] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="h-full w-full bg-gradient-to-r from-[#a855f7] via-[#c084fc] to-[#a855f7] animate-[pulse_1.4s_ease-in-out_infinite]" />
            </motion.div>
          </motion.div>
        </div>
      )}
      <a
        href="https://discord.gg/ycymTeFWBd"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-5 right-5 z-20 px-4 py-2 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/30 text-[#b9c9ff] hover:text-white hover:bg-[#5865F2]/20 transition text-xs font-bold uppercase tracking-widest"
      >
        discord
      </a>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-zinc-800/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[420px] mx-4">
        <div className="bg-[#111114] border border-[#a855f7]/30 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <motion.h1
              className="text-white text-3xl font-black tracking-[0.22em] uppercase"
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: [1, 1.01, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
              style={{ textShadow: '0 0 14px rgba(255,255,255,0.08)' }}
            >
              <span style={{ textShadow: 'none' }}>AZOV</span>
              <motion.span
                className="inline-block text-[#ef4444]"
                animate={{ filter: ['drop-shadow(0 0 0 rgba(239,68,68,0))', 'drop-shadow(0 0 12px rgba(239,68,68,0.6))', 'drop-shadow(0 0 22px rgba(239,68,68,0.3))'] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                style={{ letterSpacing: '0.02em' }}
              >
                CC
              </motion.span>
            </motion.h1>
            <h1 className="text-white text-2xl font-semibold mb-1">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-zinc-500 text-sm">
              {mode === 'login' ? 'Enter your credentials to continue.' : 'Register with your license key.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-zinc-400 text-xs mb-1.5 block">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Username"
                required
                autoComplete="username"
                maxLength={32}
                className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-[#a855f7] transition"
              />
            </div>

            <div>
              <label className="text-zinc-400 text-xs mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2.5 pr-10 text-sm placeholder-zinc-600 focus:outline-none focus:border-[#a855f7] transition"
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

            {mode === 'register' && (
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
            )}

            {mode === 'register' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-zinc-400 text-xs mb-1.5 block">License Type</label>
                    <select
                      value={licenseType}
                      onChange={e => setLicenseType(e.target.value)}
                      className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#a855f7] transition"
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
                        className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-[#a855f7] transition font-mono"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-zinc-400 text-xs mb-1.5 block">Script License Key</label>
                    <input
                      type="text"
                      value={scriptLicenseKey}
                      onChange={e => setScriptLicenseKey(e.target.value)}
                      placeholder="Script key..."
                      required
                      maxLength={64}
                      className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-[#a855f7] transition font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Register'}
            </button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <p className="text-zinc-500 text-xs">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                className="text-[#a855f7] hover:text-[#c084fc] font-medium transition"
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

      {showPreview && <PreviewTablesModal onClose={() => setShowPreview(false)} />}
    </div>
  );
}