import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser, getSession, ensureAdminExists, getDiscordAuthUrl, fetchDiscordUser } from '@/lib/auth';
import { Eye, EyeOff, MessageSquare, CheckCircle2, ShieldCheck, ExternalLink } from 'lucide-react';
import PreviewTablesModal from '@/components/PreviewTablesModal';

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

  useEffect(() => {
    const session = getSession();
    if (session) navigate('/dashboard');
    ensureAdminExists().catch(() => {});

    // Handle Discord OAuth2 Redirect
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        setMode('register'); // Switch to register mode automatically
        setLoading(true);
        fetchDiscordUser(token)
          .then(info => {
            setDiscordInfo(info);
            setDiscordLinked(true);
            window.history.replaceState({}, document.title, "/"); // Clean URL
          })
          .catch(err => setError(err.message))
          .finally(() => setLoading(false));
      }
    }
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
        await loginUser(username, password);
      } else {
        await registerUser(username, password, {
          licenseType,
          scriptLicenseKey,
          internalLicenseKey,
          discord_id: discordInfo.id,
          discord_username: discordInfo.username,
        });
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    // Legacy - redirected to Discord OAuth2
  }

  function handleConnectDiscord() {
    window.location.href = getDiscordAuthUrl();
  }

  return (
    <div className="min-h-screen bg-[#07070a] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-zinc-800/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[420px] mx-4">
        <div className="bg-[#111114] border border-zinc-800/60 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
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
                className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition"
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
                  className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2.5 pr-10 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition"
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
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-[#5865F2]" />
                    <span className="text-zinc-300 text-xs font-semibold uppercase tracking-wider">Discord Authorization (v2)</span>
                  </div>
                  
                  {!discordLinked ? (
                    <div className="space-y-3">
                      <p className="text-zinc-500 text-[10px] leading-tight">
                        To hardlock your license, you must authorize our Discord application.
                      </p>
                      <a
                        href={getDiscordAuthUrl()}
                        className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg px-4 py-2.5 text-sm font-medium transition flex items-center justify-center gap-2 shadow-lg shadow-[#5865F2]/20"
                      >
                        <MessageSquare size={18} />
                        Connect Discord Account
                        <ExternalLink size={14} className="opacity-50" />
                      </a>
                    </div>
                  ) : (
                    <div className="w-full bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-green-500" />
                        <div className="flex flex-col">
                          <span className="text-green-500 text-[10px] font-bold uppercase tracking-wider">App Authorized</span>
                          <span className="text-zinc-300 text-xs font-mono">{discordInfo?.username}</span>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setDiscordLinked(false);
                          setDiscordInfo(null);
                        }}
                        className="text-zinc-500 hover:text-zinc-300 text-[10px] underline"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                  <p className="text-zinc-600 text-[10px] leading-tight text-center">
                    This will link your Azov account to your Discord identity.
                  </p>
                </div>
                
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
                      className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition font-mono"
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
                    className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition font-mono"
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Register'}
            </button>
          </form>

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

      {showPreview && <PreviewTablesModal onClose={() => setShowPreview(false)} />}
    </div>
  );
}