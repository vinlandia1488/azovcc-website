import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react'

// --- Utility: Local Storage Helper ---
const usePersistedState = (key, defaultValue) => {
  const [state, setState] = useState(() => {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : defaultValue
  })
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state))
  }, [key, state])
  return [state, setState]
}

// SHA-256 hashing for basic client-side obfuscation
const hashPassword = async (password) => {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Components ---

// Custom cursor removed to ensure 0ms hardware delay

const Toast = memo(({ message }) => (
  <motion.div 
    initial={{ opacity: 0, y: -20, x: "-50%" }}
    animate={{ opacity: 1, y: 0, x: "-50%" }}
    exit={{ opacity: 0, y: -20, x: "-50%" }}
    className="fixed top-12 left-1/2 px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-[10px] uppercase tracking-[0.2em] z-[500] shadow-2xl whitespace-nowrap"
  >
    {message}
  </motion.div>
))

const BackgroundEffects = memo(() => {
  return (
    <div className="background-effects-container">
      <div className="center-glow"></div>
    </div>
  )
})

const DefaultAvatar = memo(({ name, size = 'w-20 h-20' }) => {
  const getAvatarStyle = (seed) => {
    const colors = [
      ['#3b82f6', '#1d4ed8'], // Blue
      ['#06b6d4', '#0891b2'], // Cyan
      ['#10b981', '#047857'], // Emerald
      ['#8b5cf6', '#6d28d9'], // Violet
      ['#f43f5e', '#be123c'], // Rose
      ['#f59e0b', '#b45309'], // Amber
    ]
    
    // Hash function to get a consistent index from a string
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    const colorIndex = Math.abs(hash) % colors.length
    const [c1, c2] = colors[colorIndex]
    
    return {
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: '-0.05em',
      fontStyle: 'italic'
    }
  }

  const initial = name ? name.substring(0, 1).toUpperCase() : 'A'
  
  return (
    <div 
      className={`${size} rounded-2xl border border-white/10 shadow-2xl overflow-hidden`}
      style={getAvatarStyle(name || 'Azov')}
    >
      <span className="text-[1.5em]">{initial}</span>
    </div>
  )
})

const DashboardView = memo(({ user, isAdmin, loginKey, licenseKeys, configs, products, onToast, onOpenSettings, profilePic }) => {
  const [showKeys, setShowKeys] = useState({})

  const toggleKey = (id) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const copy = (text) => {
    if (!text || text === 'None') return
    navigator.clipboard.writeText(text)
    onToast('Copied to clipboard')
  }

  // Filter keys for the current user
  const userKeys = useMemo(() => licenseKeys.filter(k => 
    k.assignedAdmin?.toLowerCase() === user?.toLowerCase()
  ), [licenseKeys, user]);

  // Show only user-specific keys
  const displayKeys = useMemo(() => {
    let keys = [...userKeys];
    // If admin logged in with 'adminkey', prepend a virtual admin license if not present
    if (isAdmin && loginKey === 'adminkey') {
      const adminVirtualKey = { id: 'admin-master', key: 'adminkey', assignedAdmin: 'System', isMaster: true };
      if (!keys.some(k => k.key === 'adminkey')) {
        keys = [adminVirtualKey, ...keys];
      }
    }
    // Sort displayKeys to put the current loginKey first
    return keys.sort((a, b) => {
      if (a.key === loginKey) return -1;
      if (b.key === loginKey) return 1;
      return 0;
    });
  }, [userKeys, isAdmin, loginKey]);

  return (
    <div className="space-y-6">
      {/* Dynamic Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Licenses', value: displayKeys.length, color: 'text-blue-400' },
          { label: 'Cloud Configs', value: configs.length, color: 'text-cyan-400' },
          { label: 'Active Products', value: products.filter(p => p.status === 'Undetected').length, color: 'text-green-400' }
        ].map((stat, i) => (
          <div key={i} className="dashboard-card p-6 flex flex-col items-center justify-center border-white/[0.03] hover:border-white/10 transition-colors">
            <div className="text-[8px] uppercase tracking-widest text-zinc-600 mb-1 font-black">{stat.label}</div>
            <div className={`text-3xl font-bold ${stat.color} tracking-tighter`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Profile Card */}
      <div className="dashboard-card p-6 flex items-center justify-between border-white/[0.08] bg-zinc-900/20">
        <div className="flex items-center gap-6">
          <div className="relative">
            {profilePic ? (
              <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl">
                <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
              </div>
            ) : (
              <DefaultAvatar name={loginKey} />
            )}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-[4px] border-black shadow-[0_0_15px_rgba(34,197,94,0.6)]"></div>
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 font-black mb-1">Connected as</div>
              <div className="text-3xl font-bold text-white tracking-tight leading-none flex items-center gap-2">
                {user}
                {isAdmin && <span className="text-[8px] px-2 py-0.5 bg-white/10 text-white border border-white/20 rounded-full uppercase tracking-widest shadow-[0_0_10px_rgba(255,255,255,0.3)]">Admin</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[8px] uppercase tracking-widest text-zinc-500 font-black">Active License:</div>
              <div className="text-[10px] font-mono text-blue-400 tracking-wider bg-blue-400/5 px-2 py-0.5 rounded border border-blue-400/10 uppercase">
                {isAdmin && loginKey === 'adminkey' ? 'ADMIN-OVERRIDE' : (
                  <>
                    {loginKey.substring(0, Math.ceil(loginKey.length / 2))}
                    {'*'.repeat(Math.floor(loginKey.length / 2))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <button onClick={onOpenSettings} className="flex items-center gap-3 px-6 py-3.5 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all duration-500 group shadow-xl">
          <svg className="w-4 h-4 text-zinc-500 group-hover:rotate-180 transition-transform duration-1000" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-400 font-black">Account</span>
        </button>
      </div>

      {/* Licenses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayKeys.length === 0 ? (
          <div className="md:col-span-2 dashboard-card p-20 flex flex-col items-center justify-center border-white/[0.03]">
            <div className="text-zinc-700 uppercase tracking-[0.4em] text-[10px] font-black mb-4">No active licenses found</div>
            <div className="text-zinc-800 text-xs">Contact an administrator to assign a key to your identity</div>
          </div>
        ) : (
          displayKeys.map((k, idx) => (
            <div key={k.id} className={`dashboard-card p-10 relative overflow-hidden group border-white/[0.04] hover:border-white/10 transition-all duration-700 ${k.key === loginKey ? 'ring-1 ring-blue-500/30 bg-blue-500/[0.02]' : ''}`}>
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-black">
                      {k.isMaster ? 'Master License' : `${k.type || 'Standard'} License`}
                    </div>
                    {k.key === loginKey && <div className="text-[7px] uppercase tracking-widest text-blue-400 font-black">Currently in use</div>}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className={`text-xl font-light tracking-[0.2em] font-mono ${k.key === loginKey ? 'text-white' : 'text-zinc-400'}`}>
                  {showKeys[k.id] ? k.key : '•'.repeat(k.key.length)}
                </div>
                <div className="flex gap-5 text-zinc-500">
                  <button onClick={() => toggleKey(k.id)} className="hover:text-white transition-all duration-300 transform hover:scale-110">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                  <button onClick={() => copy(k.key)} className="hover:text-white transition-all duration-300 transform hover:scale-110">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                </div>
              </div>
              <div className="w-full h-[1.5px] bg-white/[0.03] relative mt-8 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${30 + (idx * 20)}%` }}
                  transition={{ duration: 1.5, delay: idx * 0.2, ease: "circOut" }}
                  className={`absolute top-0 left-0 h-full ${k.isMaster ? 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]'} group-hover:w-full transition-all duration-1000`}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
})

const ProductsView = memo(({ isAdmin, products, setProducts, onToast }) => {
  const [editing, setEditing] = useState(null)
  const fileInputRefs = useRef({})

  const handleUpdate = (id, field, value) => {
    setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const handleFileAttach = (id, e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        onToast('File too large (max 10MB)')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setProducts(products.map(p => p.id === id ? { 
          ...p, 
          fileData: reader.result, 
          fileName: file.name 
        } : p))
        onToast(`Attached: ${file.name}`)
      }
      reader.readAsDataURL(file)
    }
  }

  const downloadProduct = (prod) => {
    if (!prod.fileData) {
      onToast('No file attached to this product')
      return
    }
    const link = document.createElement('a')
    link.href = prod.fileData
    link.download = prod.fileName || 'product-file'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    onToast(`Downloading ${prod.fileName}...`)
  }

  const addProduct = () => {
    const newProd = {
      id: Date.now(),
      name: 'New Product',
      version: 'v1.0',
      type: 'Premium',
      status: 'Testing',
      fileData: null,
      fileName: ''
    }
    setProducts([...products, newProd])
    setEditing(newProd.id)
    onToast('New product added')
  }

  const deleteProduct = (id) => {
    setProducts(products.filter(p => p.id !== id))
    onToast('Product removed')
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {isAdmin && (
        <div className="flex justify-end">
          <button onClick={addProduct} className="px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-500 font-bold shadow-2xl flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Add Product
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((prod) => (
          <div key={prod.id} className="dashboard-card p-10 flex flex-col justify-between hover:border-white/20 transition-all duration-500 group relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                {isAdmin && editing === prod.id ? (
                  <select 
                    className="bg-black border border-zinc-800 rounded text-[10px] text-white px-2 py-1 outline-none font-black uppercase tracking-widest"
                    value={prod.type}
                    onChange={(e) => handleUpdate(prod.id, 'type', e.target.value)}
                  >
                    <option>Premium</option>
                    <option>Public</option>
                    <option>Beta</option>
                    <option>Internal</option>
                  </select>
                ) : (
                  <div className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-600">{prod.type}</div>
                )}
                
                {isAdmin && editing === prod.id ? (
                  <select 
                    className="bg-black border border-zinc-800 rounded text-[8px] text-white px-1 outline-none"
                    value={prod.status}
                    onChange={(e) => handleUpdate(prod.id, 'status', e.target.value)}
                  >
                    <option>Undetected</option>
                    <option>Online</option>
                    <option>Testing</option>
                    <option>Maintenance</option>
                  </select>
                ) : (
                  <div className={`text-[8px] px-2 py-0.5 rounded-full border border-white/10 ${prod.status === 'Undetected' ? 'text-green-400' : 'text-zinc-500'} uppercase tracking-widest`}>{prod.status}</div>
                )}
              </div>
              
              {isAdmin && editing === prod.id ? (
                <input 
                  className="bg-transparent border-b border-zinc-800 text-3xl font-light text-white mb-2 w-full outline-none focus:border-white/20"
                  value={prod.name}
                  onChange={(e) => handleUpdate(prod.id, 'name', e.target.value)}
                  autoFocus
                />
              ) : (
                <div className="text-3xl font-light text-zinc-100 mb-2">{prod.name}</div>
              )}

              {isAdmin && editing === prod.id ? (
                <input 
                  className="bg-transparent border-b border-zinc-800 text-[11px] text-zinc-600 font-mono tracking-wider w-full outline-none focus:border-white/20"
                  value={prod.version}
                  onChange={(e) => handleUpdate(prod.id, 'version', e.target.value)}
                />
              ) : (
                <div className="text-[11px] text-zinc-600 font-mono tracking-wider">{prod.version}</div>
              )}
              
              {prod.fileName && (
                <div className="mt-4 flex items-center gap-2 text-[8px] text-zinc-500 uppercase tracking-widest font-black">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  {prod.fileName}
                </div>
              )}
            </div>

            <div className="mt-12 flex justify-between items-center relative z-10">
              {isAdmin && (
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4">
                    <button 
                      onClick={() => {
                        if (editing === prod.id) {
                          setEditing(null)
                          onToast('Product updated')
                        } else {
                          setEditing(prod.id)
                        }
                      }}
                      className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white transition-colors font-bold"
                    >
                      {editing === prod.id ? 'Save' : 'Edit'}
                    </button>
                    <button 
                      onClick={() => deleteProduct(prod.id)}
                      className="text-[10px] uppercase tracking-widest text-red-500/40 hover:text-red-500 transition-colors font-bold"
                    >
                      Remove
                    </button>
                  </div>
                  {editing === prod.id && (
                    <>
                      <input 
                        type="file" 
                        className="hidden" 
                        ref={el => fileInputRefs.current[prod.id] = el}
                        onChange={(e) => handleFileAttach(prod.id, e)}
                      />
                      <button 
                        onClick={() => fileInputRefs.current[prod.id]?.click()}
                        className="text-[10px] uppercase tracking-widest text-blue-500/60 hover:text-blue-400 transition-colors font-bold flex items-center gap-2"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                        Attach File
                      </button>
                    </>
                  )}
                </div>
              )}
              <button 
                onClick={() => downloadProduct(prod)}
                className={`w-12 h-12 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center group-hover:bg-white group-hover:text-black group-hover:scale-110 transition-all duration-700 shadow-2xl ml-auto ${!prod.fileData ? 'opacity-20 cursor-not-allowed' : ''}`}
                title={prod.fileData ? `Download ${prod.fileName}` : 'No file attached'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              </button>
            </div>
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-700"></div>
          </div>
        ))}
      </div>
    </div>
  )
})

const GUNS_LIST = ['[Revolver]', '[Double-Barrel SG]', '[TacticalShotgun]', '[Knife]', '[Silencer]', '[Glock]', '[Shotgun]']

const DEFAULT_CONFIG_OBJECT = {
  globals: {
    "show hotkeys": true,
    hotkeys: {
      aimbot: 'C',
      silentaim: 'O',
      speed: 'Z',
      doubletap: 'E',
      triggerbot: 'X',
      "hitpart override": 'F',
      "silent aim target": 'Q',
      "trigger bot target": 'Q',
      "inventory sorter": 'R'
    },
    "target tracer": {
      enabled: true,
      thickness: 0.5,
      "effective color": "Color3.fromRGB(255, 85, 85)",
      "ineffective color": "Color3.fromRGB(0, 0, 0)"
    },
    "exploit tracer": {
      enabled: true,
      thickness: 0.5,
      color: "Color3.fromRGB(255, 85, 85)"
    }
  },
  aimbot: {
    enabled: true,
    toggle: 'C',
    point: 'Head',
    "closest point": { mode: 'advanced', scale: 0.93 },
    smoothing: {
      enabled: true,
      mode: 'auto',
      auto: { speed: { min: 0, max: 80 }, range: { min: 0.05, max: 0.30 } },
      ground: 0.08,
      air: 0.13
    },
    prediction: { enabled: false, mode: 'auto', auto: { speed: { min: 0, max: 80 }, range: { min: 0.05, max: 0.145 } }, ground: 0.1225, air: 0.1225 },
    fov: { enabled: true, size: 300 }
  },
  silentaim: {
    enabled: true,
    toggle: 'O',
    "target toggle": 'Q',
    mode: 'automatic',
    "max distance": "math.huge",
    yaxis: false,
    ystabilizer: 0,
    hitchance: 100,
    point: 'Head',
    "closest point": { mode: 'advanced', scale: 0.15 },
    "hitpart override": { enabled: false, toggle: 'F', part: 'head' },
    prediction: { enabled: false, mode: 'auto', auto: { speed: { min: 0, max: 80 }, range: { min: 0.05, max: 0.145 } }, ground: 0.118, air: 0.118, x: 0.118, y: 0.118, z: 0.118, scale: 1 },
    "client redirection": {
      enabled: false,
      weapons: ['[Revolver]', '[Silencer]', '[Glock]']
    },
    fov: {
      enabled: true,
      visible: true,
      sync: false,
      type: 'circle',
      box: [7, 7],
      "3d": [5, 7, 5],
      circle: 400,
      "hit scan": "math.huge",
      "weapon configs": {
        enabled: false,
        shotguns: { circle: 150, box: [5, 5] },
        pistols: { circle: 150, box: [4, 4] },
        others: { circle: 15, box: [2, 2] }
      }
    }
  },
  triggerbot: {
    enabled: false,
    toggle: 'X',
    "target toggle": 'Q',
    mode: 'automatic',
    "max distance": 250,
    radius: "math.huge",
    cooldown: 0,
    "limit gun range": false,
    activation: { input: 'keybind', type: 'toggle' },
    prediction: { enabled: false, value: 0.13 },
    fov: { visible: false, x: 3.3, y: 7, z: 3.6 }
  },
  exploits: {
    doubletap: { enabled: false, toggle: 'E', weapons: ['[Revolver]', '[Silencer]'] },
    "spread modifier": {
      enabled: true,
      value: 0,
      randomizer: { enabled: false, value: "0.1 + math.random() * 0.3" }
    },
    forcehit: {
      enabled: false,
      mode: 'full',
      toggle: 'H',
      type: 'toggle',
      selection: 'automatic',
      "target toggle": 'U'
    }
  },
  movement: {
    enabled: true,
    speed: { value: 300, toggle: 'Z', enabled: true, glide: false, mode: 'always' },
    jump: { value: 60, key: 'X', mode: 'hold' },
    "no tripping": false
  },
  conditions: {
    forcefield: true,
    visible: true,
    grabbed: true,
    knocked: true,
    moving: false,
    "tool equipped": false,
    selfknocked: false,
    "chat focused": true,
    shiftlocked: false,
    thirdperson: false
  },
  utilities: {
    "inventory helper": {
      enabled: false,
      toggle: 'R',
      order: ["[Double-Barrel SG]", "[Revolver]", "[TacticalShotgun]", "[Knife]"]
    }
  }
}

const serializeConfig = (obj) => {
  const formatValue = (v) => {
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'number') return v.toString();
    if (typeof v === 'string') {
      if (v.startsWith('Color3') || v.startsWith('math') || v.includes('math.random')) return v;
      return `'${v}'`;
    }
    if (Array.isArray(v)) {
      return `{ ${v.map(formatValue).join(', ')} }`;
    }
    if (typeof v === 'object' && v !== null) {
      return `{ ${Object.entries(v).map(([k, val]) => `["${k}"] = ${formatValue(val)}`).join(', ')} }`;
    }
    return 'nil';
  }

  return `shared.azov = { 
    ["globals"] = { 
        ["show hotkeys"] = ${formatValue(obj.globals["show hotkeys"])}, 
        ["hotkeys"] = { 
            ["aimbot"]             = ${formatValue(obj.globals.hotkeys.aimbot)}, 
            ["silentaim"]          = ${formatValue(obj.globals.hotkeys.silentaim)}, 
            ["speed"]              = ${formatValue(obj.globals.hotkeys.speed)}, 
            ["doubletap"]          = ${formatValue(obj.globals.hotkeys.doubletap)}, 
            ["triggerbot"]         = ${formatValue(obj.globals.hotkeys.triggerbot)}, 
            ["hitpart override"]   = ${formatValue(obj.globals.hotkeys["hitpart override"])}, 
            ["silent aim target"]  = ${formatValue(obj.globals.hotkeys["silent aim target"])}, 
            ["trigger bot target"] = ${formatValue(obj.globals.hotkeys["trigger bot target"])}, 
            ["inventory sorter"]   = ${formatValue(obj.globals.hotkeys["inventory sorter"])}, 
        }, 
        ["target tracer"] = { 
            ["enabled"]           = ${formatValue(obj.globals["target tracer"].enabled)}, 
            ["thickness"]         = ${formatValue(obj.globals["target tracer"].thickness)}, 
            ["effective color"]   = ${formatValue(obj.globals["target tracer"]["effective color"])}, 
            ["ineffective color"] = ${formatValue(obj.globals["target tracer"]["ineffective color"])}, 
        }, 
        ["exploit tracer"] = { 
            ["enabled"]   = ${formatValue(obj.globals["exploit tracer"].enabled)}, 
            ["thickness"] = ${formatValue(obj.globals["exploit tracer"].thickness)}, 
            ["color"]     = ${formatValue(obj.globals["exploit tracer"].color)}, 
        }, 
    }, 

    ["aimbot"] = { 
        ["enabled"] = ${formatValue(obj.aimbot.enabled)}, 
        ["toggle"] = ${formatValue(obj.aimbot.toggle)}, 
        ["point"] = ${formatValue(obj.aimbot.point)}, -- closest point, closest part, part name, part table 
        ["closest point"] = ${formatValue(obj.aimbot["closest point"])}, 
 
        ["smoothing"] = { 
            ["enabled"] = ${formatValue(obj.aimbot.smoothing.enabled)}, 
            ["mode"] = ${formatValue(obj.aimbot.smoothing.mode)}, -- auto / manual 
            ["auto"] = ${formatValue(obj.aimbot.smoothing.auto)}, 
            ["ground"] = ${formatValue(obj.aimbot.smoothing.ground)}, 
            ["air"] = ${formatValue(obj.aimbot.smoothing.air)}, 
        }, 
 
        ["prediction"] = ${formatValue(obj.aimbot.prediction)}, 
 
        ["fov"] = ${formatValue(obj.aimbot.fov)}, 
    }, 

    ["silentaim"] = { 
        ["enabled"] = ${formatValue(obj.silentaim.enabled)}, 
        ["toggle"] = ${formatValue(obj.silentaim.toggle)}, 
        ["target toggle"] = ${formatValue(obj.silentaim["target toggle"])}, 
        ["mode"] = ${formatValue(obj.silentaim.mode)}, -- automatic / target 
        ["max distance"] = ${formatValue(obj.silentaim["max distance"])}, 
        ["yaxis"] = ${formatValue(obj.silentaim.yaxis)}, 
 
        ["hitchance"] = ${formatValue(obj.silentaim.hitchance)}, 
        ["ystabilizer"] = ${formatValue(obj.silentaim.ystabilizer)}, 
 
        ["point"] = ${formatValue(obj.silentaim.point)}, -- closest point, closest part, part name, part table 
        ["closest point"] = ${formatValue(obj.silentaim["closest point"])}, 
        ["hitpart override"] = { ["enabled"] = ${formatValue(obj.silentaim["hitpart override"].enabled)}, ["toggle"] = ${formatValue(obj.silentaim["hitpart override"].toggle)}, ${formatValue(obj.silentaim["hitpart override"].part)} }, 
 
        ["prediction"] = ${formatValue(obj.silentaim.prediction)}, 
 
        ["client redirection"] = { 
            ["enabled"] = ${formatValue(obj.silentaim["client redirection"].enabled)}, 
            ["weapons"] = ${formatValue(obj.silentaim["client redirection"].weapons)}, 
        }, 
 
        ["fov"] = ${formatValue(obj.silentaim.fov)}, 
    }, 

    ["triggerbot"] = { 
        ["enabled"] = ${formatValue(obj.triggerbot.enabled)}, 
        ["toggle"] = ${formatValue(obj.triggerbot.toggle)}, 
        ["target toggle"] = ${formatValue(obj.triggerbot["target toggle"])}, 
        ["mode"] = ${formatValue(obj.triggerbot.mode)}, -- automatic / target 
        ["max distance"] = ${formatValue(obj.triggerbot["max distance"])}, 
 
        ["radius"] = ${formatValue(obj.triggerbot.radius)}, 
        ["cooldown"] = ${formatValue(obj.triggerbot.cooldown)}, 
        ["limit gun range"] = ${formatValue(obj.triggerbot["limit gun range"])}, -- only fire when target is within weapon's Range value 
 
        ["activation"] = ${formatValue(obj.triggerbot.activation)}, 
 
        ["prediction"] = { ["enabled"] = ${formatValue(obj.triggerbot.prediction.enabled)}, ${formatValue(obj.triggerbot.prediction.value)} }, 
 
        ["fov"] = ${formatValue(obj.triggerbot.fov)}, 
    }, 

    ["exploits"] = { -- Da Hood Specific 
        ["doubletap"] = { ["enabled"] = ${formatValue(obj.exploits.doubletap.enabled)}, ["toggle"] = ${formatValue(obj.exploits.doubletap.toggle)}, ${formatValue(obj.exploits.doubletap.weapons)} }, 
        ["spread modifier"] = ${formatValue(obj.exploits["spread modifier"])}, 
 
        ["forcehit"] = ${formatValue(obj.exploits.forcehit)}, 
    }, 

    ["movement"] = { 
        ["enabled"] = ${formatValue(obj.movement.enabled)}, 
        ["speed"] = ${formatValue(obj.movement.speed)}, -- toggle / hold / always 
        ["jump"]  = ${formatValue(obj.movement.jump)}, -- toggle / hold / always 
        ["no tripping"] = ${formatValue(obj.movement["no tripping"])}, 
    }, 

    ["conditions"] = ${formatValue(obj.conditions)}, 

    ["utilities"] = { 
        ["inventory helper"] = { 
            ["enabled"] = ${formatValue(obj.utilities["inventory helper"].enabled)}, 
            ["toggle"] = ${formatValue(obj.utilities["inventory helper"].toggle)}, 
            ["order"] = ${formatValue(obj.utilities["inventory helper"].order)}, 
        }, 
    }
  }`
}

const deepMerge = (target, source) => {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
};

const isObject = (item) => {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

const ConfigsView = ({ configs, setConfigs, onToast }) => {
  const [selectedConfigId, setSelectedConfigId] = useState(configs[0]?.id || null)
  const [editData, setEditData] = useState({ name: '', key: '', type: 'Internal', configObj: { ...DEFAULT_CONFIG_OBJECT } })
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [loadKey, setLoadKey] = useState('')
  const [newConfigName, setNewConfigName] = useState('')

  const editorConfig = configs.find(c => c.id === selectedConfigId)

  useEffect(() => {
    if (editorConfig) {
      // Ensure we have all the latest fields by merging with defaults
      const mergedConfig = deepMerge(DEFAULT_CONFIG_OBJECT, editorConfig.configObj || {});
      setEditData({ 
        name: editorConfig.name, 
        key: editorConfig.key || '', 
        type: editorConfig.type || 'Internal', 
        configObj: mergedConfig
      })
    }
  }, [selectedConfigId, editorConfig])

  // Mock "Cloud Database"
  const GLOBAL_CLOUD_CONFIGS = [
    { 
      id: 'cloud-1', 
      name: 'Pro Silent Aim V2', 
      key: 'SILENT-V2-PRO',
      type: 'Internal',
      configObj: { ...DEFAULT_CONFIG_OBJECT, silentaim: { ...DEFAULT_CONFIG_OBJECT.silentaim, hitchance: 100 } },
      date: 'Cloud Updated'
    },
    { 
      id: 'cloud-2', 
      name: 'Movement King (Glide)', 
      key: 'GLIDE-KING-99',
      type: 'Script',
      configObj: { ...DEFAULT_CONFIG_OBJECT, movement: { ...DEFAULT_CONFIG_OBJECT.movement, speed: { ...DEFAULT_CONFIG_OBJECT.movement.speed, glide: true } } },
      date: 'Cloud Updated'
    }
  ]

  const handleLoadConfig = () => {
    if (!loadKey) return onToast('Please enter an access key')
    if (configs.some(c => c.key === loadKey)) return onToast('Configuration already loaded')

    const found = GLOBAL_CLOUD_CONFIGS.find(c => c.key === loadKey)
    if (found) {
      const newConf = { ...found, id: Date.now(), content: serializeConfig(found.configObj) };
      setConfigs([...configs, newConf])
      setSelectedConfigId(newConf.id)
      onToast('Configuration loaded successfully')
      setShowLoadModal(false)
      setLoadKey('')
    } else {
      onToast('Invalid access key or configuration not found')
    }
  }

  const addConfig = () => {
    const name = newConfigName.trim() || `Config ${configs.length + 1}`
    const newConfig = { 
      id: Date.now(), 
      name: name, 
      key: `azov-${Math.random().toString(36).substring(2, 6).toLowerCase()}`,
      type: 'Internal',
      configObj: { ...DEFAULT_CONFIG_OBJECT },
      content: serializeConfig(DEFAULT_CONFIG_OBJECT),
      date: 'Just now' 
    }
    setConfigs([...configs, newConfig])
    setSelectedConfigId(newConfig.id)
    setNewConfigName('')
    onToast('Configuration created')
  }

  const deleteConfig = (id) => {
    const newConfigs = configs.filter(c => c.id !== id)
    setConfigs(newConfigs)
    if (selectedConfigId === id) {
      setSelectedConfigId(newConfigs[0]?.id || null)
    }
    onToast('Configuration deleted')
  }

  const saveEdit = (id) => {
    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const serialized = serializeConfig(editData.configObj)
    setConfigs(configs.map(c => c.id === id ? { 
      ...c, 
      name: editData.name, 
      key: editData.key, 
      type: editData.type, 
      configObj: editData.configObj,
      content: serialized, 
      date: `at ${timeStr}` 
    } : c))
    onToast('Configuration updated')
  }

  const updateConfigVal = useCallback((path, value) => {
    setEditData(prev => {
      const newObj = { ...prev.configObj };
      const parts = path.split('.');
      let current = newObj;
      
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        current[key] = { ...current[key] };
        current = current[key];
      }
      
      current[parts[parts.length - 1]] = value;
      return { ...prev, configObj: newObj };
    });
  }, []);

  const StealthInput = useMemo(() => {
    return memo(({ val, path, type, width, updateParent }) => {
      // Safety check for undefined values during state transitions or data migrations
      const safeVal = val !== undefined && val !== null ? val : (
        type === 'boolean' ? false :
        type === 'number' ? 0 :
        type === 'guns' ? [] :
        ''
      );

      const [localVal, setLocalVal] = useState(type === 'guns' ? safeVal.join(', ') : safeVal.toString());

      useEffect(() => {
        setLocalVal(type === 'guns' ? safeVal.join(', ') : safeVal.toString());
      }, [safeVal, type]);

      const handleKeyDown = (e) => {
        if (e.key === 'Enter') e.preventDefault();
        
        // Navigation logic for Up/Down arrows
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const allInputs = Array.from(document.querySelectorAll('.stealth-input-field'));
          const index = allInputs.indexOf(e.target);
          if (index === -1) return;

          const nextIndex = e.key === 'ArrowUp' ? index - 1 : index + 1;
          if (nextIndex >= 0 && nextIndex < allInputs.length) {
            allInputs[nextIndex].focus();
            setTimeout(() => {
              allInputs[nextIndex].setSelectionRange(allInputs[nextIndex].value.length, allInputs[nextIndex].value.length);
            }, 0);
          }
        }
      }

      const handleChange = (e) => {
        let v = e.target.value;
        const forbidden = ['print', 'return', 'function', 'while', 'for', 'if', 'then', 'end', 'os.', 'io.', 'require']
        forbidden.forEach(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'gi');
          v = v.replace(regex, '');
        });
        setLocalVal(v);

        let convertedValue = v;
        if (type === 'boolean') {
          if (v.toLowerCase() === 'true') convertedValue = true;
          else if (v.toLowerCase() === 'false') convertedValue = false;
          else return;
        } else if (type === 'number') {
          const num = parseFloat(v.replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) convertedValue = num;
          else return;
        } else if (type === 'keybind') {
          convertedValue = v.toUpperCase().substring(0, 1);
        } else if (type === 'guns') {
          convertedValue = v.split(',').map(s => s.trim()).filter(s => s !== '');
        }
        updateParent(path, convertedValue);
      }

      const colorClass = 
        type === 'boolean' ? 'text-emerald-400' :
        type === 'number' ? 'text-orange-400' :
        type === 'keybind' ? 'text-amber-300' :
        type === 'guns' ? 'text-amber-200' :
        'text-amber-200';

      return (
        <div className="inline-grid items-baseline relative min-w-0 max-w-fit">
          <span className="invisible whitespace-pre font-mono text-[11px] leading-none pointer-events-none col-start-1 row-start-1 select-none" aria-hidden="true">
            {localVal || ' '}
          </span>
          <input 
            className={`stealth-input-field bg-transparent border-none outline-none font-mono text-[11px] p-0 m-0 leading-none align-baseline transition-colors cursor-text selection:bg-blue-500/30 col-start-1 row-start-1 w-full h-full min-w-0 ${colorClass}`}
            value={localVal}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            spellCheck="false"
            size="1"
          />
        </div>
      )
    });
  }, []);

  return (
    <div className="flex gap-10 animate-in fade-in slide-in-from-bottom-6 duration-1000 max-h-[70vh]">
      {/* Main Area: Editor */}
      <div className="flex-1 flex flex-col bg-zinc-950/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative">
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-zinc-950 shrink-0">
          <div className="flex items-center gap-3 pl-2">
            <div className="text-[12px] font-black text-blue-500 tracking-[0.3em] uppercase brand-font">Azov</div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setEditData({ ...editData, configObj: { ...DEFAULT_CONFIG_OBJECT } });
                onToast('Configuration reset to default');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 rounded-lg text-[10px] uppercase tracking-widest font-bold text-zinc-500 hover:text-white transition-all group"
            >
              <svg className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Reset
            </button>
            <button 
              onClick={() => editorConfig && saveEdit(editorConfig.id)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 hover:bg-blue-600 border border-blue-500/20 rounded-lg text-[10px] uppercase tracking-widest font-black text-blue-500 hover:text-white transition-all group"
            >
              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              Execute
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {editorConfig ? (
            <div className="flex-1 flex overflow-auto custom-scrollbar bg-black/40 font-mono text-[12px] leading-7 selection:bg-blue-500/20">
              {/* Line Numbers Column */}
              <div className="w-12 flex flex-col items-center pt-8 bg-black/20 text-zinc-800 select-none border-r border-white/5 shrink-0">
                {Array.from({ length: 150 }).map((_, i) => (
                  <div key={i} className="h-7 leading-7">{i + 1}</div>
                ))}
              </div>

              {/* Code Area */}
              <div className="flex-1 p-8 relative">
                <div className="whitespace-nowrap text-white/90">shared.azov = {"{"}</div>
                
                {/* Globals Section */}
                <div className="relative pl-6 border-l border-white/5 mt-1 ml-1">
                  <div className="whitespace-nowrap text-purple-400">["globals"] = {"{"}</div>
                  <div className="relative pl-6 border-l border-white/5 ml-1">
                    <div className="flex items-center gap-1">
                      <span className="text-purple-400">["show hotkeys"]</span>
                      <span className="text-white/60">=</span>
                      <StealthInput val={editData.configObj.globals["show hotkeys"]} path="globals.show hotkeys" type="boolean" updateParent={updateConfigVal} />
                      <span className="text-white/40">,</span>
                    </div>
                    <div className="whitespace-nowrap text-purple-400">["hotkeys"] = {"{"}</div>
                    <div className="relative pl-6 border-l border-white/5 ml-1">
                      {Object.entries(editData.configObj.globals.hotkeys).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-1">
                          <span className="text-purple-400">["{k}"]</span>
                          <span className="text-white/60">= '</span>
                          <StealthInput val={v} path={`globals.hotkeys.${k}`} type="keybind" updateParent={updateConfigVal} />
                          <span className="text-white/40">',</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-white/60">{"},"}</div>
                    
                    <div className="whitespace-nowrap text-purple-400">["target tracer"] = {"{"}</div>
                    <div className="relative pl-6 border-l border-white/5 ml-1">
                      <div className="flex items-center gap-1">
                        <span className="text-purple-400">["enabled"]</span>
                        <span className="text-white/60">=</span>
                        <StealthInput val={editData.configObj.globals["target tracer"].enabled} path="globals.target tracer.enabled" type="boolean" updateParent={updateConfigVal} />
                        <span className="text-white/40">,</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-purple-400">["thickness"]</span>
                        <span className="text-white/60">=</span>
                        <StealthInput val={editData.configObj.globals["target tracer"].thickness} path="globals.target tracer.thickness" type="number" updateParent={updateConfigVal} />
                        <span className="text-white/40">,</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-purple-400">["effective color"]</span>
                        <span className="text-white/60">=</span>
                        <StealthInput val={editData.configObj.globals["target tracer"]["effective color"]} path="globals.target tracer.effective color" type="string" updateParent={updateConfigVal} />
                        <span className="text-white/40">,</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-purple-400">["ineffective color"]</span>
                        <span className="text-white/60">=</span>
                        <StealthInput val={editData.configObj.globals["target tracer"]["ineffective color"]} path="globals.target tracer.ineffective color" type="string" updateParent={updateConfigVal} />
                        <span className="text-white/40">,</span>
                      </div>
                    </div>
                    <div className="text-white/60">{"},"}</div>

                    <div className="whitespace-nowrap text-purple-400">["exploit tracer"] = {"{"}</div>
                    <div className="relative pl-6 border-l border-white/5 ml-1">
                      <div className="flex items-center gap-1">
                        <span className="text-purple-400">["enabled"]</span>
                        <span className="text-white/60">=</span>
                        <StealthInput val={editData.configObj.globals["exploit tracer"].enabled} path="globals.exploit tracer.enabled" type="boolean" updateParent={updateConfigVal} />
                        <span className="text-white/40">,</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-purple-400">["thickness"]</span>
                        <span className="text-white/60">=</span>
                        <StealthInput val={editData.configObj.globals["exploit tracer"].thickness} path="globals.exploit tracer.thickness" type="number" updateParent={updateConfigVal} />
                        <span className="text-white/40">,</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-purple-400">["color"]</span>
                        <span className="text-white/60">=</span>
                        <StealthInput val={editData.configObj.globals["exploit tracer"].color} path="globals.exploit tracer.color" type="string" updateParent={updateConfigVal} />
                        <span className="text-white/40">,</span>
                      </div>
                    </div>
                    <div className="text-white/60">{"},"}</div>
                  </div>
                  <div className="text-white/60">{"},"}</div>
                </div>

                {/* Aimbot Section */}
                <div className="relative pl-6 border-l border-white/5 mt-1 ml-1">
                  <div className="whitespace-nowrap text-purple-400">["aimbot"] = {"{"}</div>
                  <div className="relative pl-6 border-l border-white/5 ml-1">
                    <div className="flex items-center gap-1">
                      <span className="text-purple-400">["enabled"]</span>
                      <span className="text-white/60">=</span>
                      <StealthInput val={editData.configObj.aimbot.enabled} path="aimbot.enabled" type="boolean" updateParent={updateConfigVal} />
                      <span className="text-white/40">,</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-purple-400">["toggle"]</span>
                      <span className="text-white/60">= '</span>
                      <StealthInput val={editData.configObj.aimbot.toggle} path="aimbot.toggle" type="keybind" updateParent={updateConfigVal} />
                      <span className="text-white/40">',</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-purple-400">["point"]</span>
                      <span className="text-white/60">= '</span>
                      <StealthInput val={editData.configObj.aimbot.point} path="aimbot.point" type="string" updateParent={updateConfigVal} />
                      <span className="text-white/40">',</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-purple-400">["closest point"]</span>
                      <span className="text-white/60">= {"{ "}["mode"] = '</span>
                      <StealthInput val={editData.configObj.aimbot["closest point"].mode} path="aimbot.closest point.mode" type="string" updateParent={updateConfigVal} />
                      <span className="text-white/60">', ["scale"] = </span>
                      <StealthInput val={editData.configObj.aimbot["closest point"].scale} path="aimbot.closest point.scale" type="number" updateParent={updateConfigVal} />
                      <span className="text-white/40">{" },"}</span>
                    </div>
                    <div className="whitespace-nowrap text-purple-400">["smoothing"] = {"{"}</div>
                    <div className="relative pl-6 border-l border-white/5 ml-1">
                      <div className="flex items-center gap-1">
                        <span className="text-purple-400">["enabled"]</span>
                        <span className="text-white/60">=</span>
                        <StealthInput val={editData.configObj.aimbot.smoothing.enabled} path="aimbot.smoothing.enabled" type="boolean" updateParent={updateConfigVal} />
                        <span className="text-white/40">,</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-purple-400">["mode"]</span>
                        <span className="text-white/60">= '</span>
                        <StealthInput val={editData.configObj.aimbot.smoothing.mode} path="aimbot.smoothing.mode" type="string" updateParent={updateConfigVal} />
                        <span className="text-white/40">',</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-purple-400">["ground"]</span>
                        <span className="text-white/60">=</span>
                        <StealthInput val={editData.configObj.aimbot.smoothing.ground} path="aimbot.smoothing.ground" type="number" updateParent={updateConfigVal} />
                        <span className="text-white/40">,</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-purple-400">["air"]</span>
                        <span className="text-white/60">=</span>
                        <StealthInput val={editData.configObj.aimbot.smoothing.air} path="aimbot.smoothing.air" type="number" updateParent={updateConfigVal} />
                        <span className="text-white/40">,</span>
                      </div>
                    </div>
                    <div className="text-white/60">{"},"}</div>
                    <div className="flex items-center gap-1">
                      <span className="text-purple-400">["fov"]</span>
                      <span className="text-white/60">= {"{ "}["enabled"] = </span>
                      <StealthInput val={editData.configObj.aimbot.fov.enabled} path="aimbot.fov.enabled" type="boolean" updateParent={updateConfigVal} />
                      <span className="text-white/60">, ["size"] = </span>
                      <StealthInput val={editData.configObj.aimbot.fov.size} path="aimbot.fov.size" type="number" updateParent={updateConfigVal} />
                      <span className="text-white/40">{" },"}</span>
                    </div>
                  </div>
                  <div className="text-white/60">{"},"}</div>
                </div>

                {/* Silent Aim Section */}
                <div className="relative pl-6 border-l border-white/5 mt-1 ml-1">
                  <div className="whitespace-nowrap text-purple-400">["silentaim"] = {"{"}</div>
                  <div className="relative pl-6 border-l border-white/5 ml-1">
                    <div className="flex items-center gap-1">
                      <span className="text-purple-400">["enabled"]</span>
                      <span className="text-white/60">=</span>
                      <StealthInput val={editData.configObj.silentaim.enabled} path="silentaim.enabled" type="boolean" updateParent={updateConfigVal} />
                      <span className="text-white/40">,</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-purple-400">["toggle"]</span>
                      <span className="text-white/60">= '</span>
                      <StealthInput val={editData.configObj.silentaim.toggle} path="silentaim.toggle" type="keybind" updateParent={updateConfigVal} />
                      <span className="text-white/40">',</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-purple-400">["hitchance"]</span>
                      <span className="text-white/60">=</span>
                      <StealthInput val={editData.configObj.silentaim.hitchance} path="silentaim.hitchance" type="number" updateParent={updateConfigVal} />
                      <span className="text-white/40">,</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-purple-400">["point"]</span>
                      <span className="text-white/60">= '</span>
                      <StealthInput val={editData.configObj.silentaim.point} path="silentaim.point" type="string" updateParent={updateConfigVal} />
                      <span className="text-white/40">',</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-purple-400">["prediction"]</span>
                      <span className="text-white/60">= {"{ "}["enabled"] = </span>
                      <StealthInput val={editData.configObj.silentaim.prediction.enabled} path="silentaim.prediction.enabled" type="boolean" updateParent={updateConfigVal} />
                      <span className="text-white/60">, ["ground"] = </span>
                      <StealthInput val={editData.configObj.silentaim.prediction.ground} path="silentaim.prediction.ground" type="number" updateParent={updateConfigVal} />
                      <span className="text-white/40">{" },"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-purple-400">["client redirection"]</span>
                      <span className="text-white/60">= {"{ "}["enabled"] = </span>
                      <StealthInput val={editData.configObj.silentaim["client redirection"].enabled} path="silentaim.client redirection.enabled" type="boolean" updateParent={updateConfigVal} />
                      <span className="text-white/60">, ["weapons"] = </span>
                      <StealthInput val={editData.configObj.silentaim["client redirection"].weapons} path="silentaim.client redirection.weapons" type="guns" updateParent={updateConfigVal} />
                      <span className="text-white/40">{" },"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-purple-400">["fov"]</span>
                      <span className="text-white/60">= {"{ "}["enabled"] = </span>
                      <StealthInput val={editData.configObj.silentaim.fov.enabled} path="silentaim.fov.enabled" type="boolean" updateParent={updateConfigVal} />
                      <span className="text-white/60">, ["circle"] = </span>
                      <StealthInput val={editData.configObj.silentaim.fov.circle} path="silentaim.fov.circle" type="number" updateParent={updateConfigVal} />
                      <span className="text-white/40">{" },"}</span>
                    </div>
                  </div>
                  <div className="text-white/60">{"},"}</div>
                </div>

                {/* Triggerbot Section */}
                <div className="relative pl-6 border-l border-white/5 mt-1 ml-1">
                  <div className="whitespace-nowrap text-purple-400">["triggerbot"] = {"{"}</div>
                  <div className="relative pl-6 border-l border-white/5 ml-1">
                    <div className="flex items-center gap-1">
                      <span className="text-purple-400">["enabled"]</span>
                      <span className="text-white/60">=</span>
                      <StealthInput val={editData.configObj.triggerbot.enabled} path="triggerbot.enabled" type="boolean" updateParent={updateConfigVal} />
                      <span className="text-white/40">,</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-purple-400">["toggle"]</span>
                      <span className="text-white/60">= '</span>
                      <StealthInput val={editData.configObj.triggerbot.toggle} path="triggerbot.toggle" type="keybind" updateParent={updateConfigVal} />
                      <span className="text-white/40">',</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-purple-400">["cooldown"]</span>
                      <span className="text-white/60">=</span>
                      <StealthInput val={editData.configObj.triggerbot.cooldown} path="triggerbot.cooldown" type="number" updateParent={updateConfigVal} />
                      <span className="text-white/40">,</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-purple-400">["activation"]</span>
                      <span className="text-white/60">= {"{ "}["input"] = '</span>
                      <StealthInput val={editData.configObj.triggerbot.activation.input} path="triggerbot.activation.input" type="string" updateParent={updateConfigVal} />
                      <span className="text-white/60">', ["type"] = '</span>
                      <StealthInput val={editData.configObj.triggerbot.activation.type} path="triggerbot.activation.type" type="string" updateParent={updateConfigVal} />
                      <span className="text-white/40">{"' },"}</span>
                    </div>
                  </div>
                  <div className="text-white/60">{"},"}</div>
                </div>

                {/* Exploits Section */}
                <div className="relative pl-6 border-l border-white/5 mt-1 ml-1">
                  <div className="whitespace-nowrap text-purple-400">["exploits"] = {"{"}</div>
                  <div className="relative pl-6 border-l border-white/5 ml-1">
                    <div className="flex items-center gap-1">
                      <span className="text-purple-400">["doubletap"]</span>
                      <span className="text-white/60">= {"{ "}["enabled"] = </span>
                      <StealthInput val={editData.configObj.exploits.doubletap.enabled} path="exploits.doubletap.enabled" type="boolean" updateParent={updateConfigVal} />
                      <span className="text-white/60">, ["toggle"] = '</span>
                      <StealthInput val={editData.configObj.exploits.doubletap.toggle} path="exploits.doubletap.toggle" type="keybind" updateParent={updateConfigVal} />
                      <span className="text-white/60">', ["weapons"] = </span>
                      <StealthInput val={editData.configObj.exploits.doubletap.weapons} path="exploits.doubletap.weapons" type="guns" updateParent={updateConfigVal} />
                      <span className="text-white/40">{" },"}</span>
                    </div>
                    <div className="whitespace-nowrap text-purple-400">["spread modifier"] = {"{"}</div>
                    <div className="relative pl-6 border-l border-white/5 ml-1">
                      <div className="flex items-center gap-1">
                        <span className="text-purple-400">["enabled"]</span>
                        <span className="text-white/60">=</span>
                        <StealthInput val={editData.configObj.exploits["spread modifier"].enabled} path="exploits.spread modifier.enabled" type="boolean" updateParent={updateConfigVal} />
                        <span className="text-white/40">,</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-purple-400">["value"]</span>
                        <span className="text-white/60">=</span>
                        <StealthInput val={editData.configObj.exploits["spread modifier"].value} path="exploits.spread modifier.value" type="number" updateParent={updateConfigVal} />
                        <span className="text-white/40">,</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-purple-400">["randomizer"]</span>
                        <span className="text-white/60">= {"{ "}["enabled"] = </span>
                        <StealthInput val={editData.configObj.exploits["spread modifier"].randomizer.enabled} path="exploits.spread modifier.randomizer.enabled" type="boolean" updateParent={updateConfigVal} />
                        <span className="text-white/60">, ["value"] = </span>
                        <StealthInput val={editData.configObj.exploits["spread modifier"].randomizer.value} path="exploits.spread modifier.randomizer.value" type="string" updateParent={updateConfigVal} />
                        <span className="text-white/40">{" },"}</span>
                      </div>
                    </div>
                    <div className="text-white/60">{"},"}</div>
                  </div>
                  <div className="text-white/60">{"},"}</div>
                </div>

                {/* Movement Section */}
                <div className="relative pl-6 border-l border-white/5 mt-1 ml-1">
                  <div className="whitespace-nowrap text-purple-400">["movement"] = {"{"}</div>
                  <div className="relative pl-6 border-l border-white/5 ml-1">
                    <div className="flex items-center gap-1">
                      <span className="text-purple-400">["enabled"]</span>
                      <span className="text-white/60">=</span>
                      <StealthInput val={editData.configObj.movement.enabled} path="movement.enabled" type="boolean" updateParent={updateConfigVal} />
                      <span className="text-white/40">,</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-purple-400">["speed"]</span>
                      <span className="text-white/60">= {"{ "}["value"] = </span>
                      <StealthInput val={editData.configObj.movement.speed.value} path="movement.speed.value" type="number" updateParent={updateConfigVal} />
                      <span className="text-white/60">, ["glide"] = </span>
                      <StealthInput val={editData.configObj.movement.speed.glide} path="movement.speed.glide" type="boolean" updateParent={updateConfigVal} />
                      <span className="text-white/40">{" },"}</span>
                    </div>
                  </div>
                  <div className="text-white/60">{"},"}</div>
                </div>

                {/* Conditions Section */}
                <div className="relative pl-6 border-l border-white/5 mt-1 ml-1">
                  <div className="whitespace-nowrap text-purple-400">["conditions"] = {"{"}</div>
                  <div className="relative pl-6 border-l border-white/5 ml-1">
                    {Object.entries(editData.configObj.conditions).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-1">
                        <span className="text-purple-400">["{k}"]</span>
                        <span className="text-white/60">=</span>
                        <StealthInput val={v} path={`conditions.${k}`} type="boolean" updateParent={updateConfigVal} />
                        <span className="text-white/40">,</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-white/60">{"},"}</div>
                </div>

                {/* Utilities Section */}
                <div className="relative pl-6 border-l border-white/5 mt-1 ml-1">
                  <div className="whitespace-nowrap text-purple-400">["utilities"] = {"{"}</div>
                  <div className="relative pl-6 border-l border-white/5 ml-1">
                    <div className="whitespace-nowrap text-purple-400">["inventory helper"] = {"{"}</div>
                    <div className="relative pl-6 border-l border-white/5 ml-1">
                      <div className="flex items-center gap-1">
                        <span className="text-purple-400">["enabled"]</span>
                        <span className="text-white/60">=</span>
                        <StealthInput val={editData.configObj.utilities["inventory helper"].enabled} path="utilities.inventory helper.enabled" type="boolean" updateParent={updateConfigVal} />
                        <span className="text-white/40">,</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-purple-400">["toggle"]</span>
                        <span className="text-white/60">= '</span>
                        <StealthInput val={editData.configObj.utilities["inventory helper"].toggle} path="utilities.inventory helper.toggle" type="keybind" updateParent={updateConfigVal} />
                        <span className="text-white/40">',</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-purple-400">["order"]</span>
                        <span className="text-white/60">=</span>
                        <StealthInput val={editData.configObj.utilities["inventory helper"].order} path="utilities.inventory helper.order" type="guns" updateParent={updateConfigVal} />
                        <span className="text-white/40">,</span>
                      </div>
                    </div>
                    <div className="text-white/60">{"},"}</div>
                  </div>
                  <div className="text-white/60">{"},"}</div>
                </div>

                <div className="text-white/90">{"}"}</div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 uppercase tracking-[0.4em] text-[10px] font-black p-20 text-center">
              <svg className="w-12 h-12 mb-6 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Select a configuration<br/>to start editing
            </div>
          )}
        </div>
      </div>

      {/* Sidebar: Library */}
      <div className="w-80 flex flex-col gap-6">
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <h3 className="text-xl font-light tracking-widest uppercase text-white">Cloud Config</h3>
            <span className="text-[8px] uppercase tracking-widest text-zinc-600 font-black">Manage your saves</span>
          </div>
          <div className="space-y-4">
            <div className="relative group">
              <input 
                className="w-full bg-zinc-900/40 border border-white/5 rounded-xl px-4 py-3.5 text-[11px] text-zinc-100 outline-none focus:border-blue-500/30 transition-all placeholder:text-zinc-700"
                placeholder="New config name..."
                value={newConfigName}
                onChange={(e) => setNewConfigName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addConfig()}
              />
              <button onClick={addConfig} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white hover:text-black rounded-lg transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
              </button>
            </div>
            <button 
              onClick={() => setShowLoadModal(true)}
              className="w-full py-3.5 bg-zinc-900/40 border border-white/5 rounded-xl text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-black hover:border-blue-500/20 hover:text-blue-400 transition-all text-center"
            >
              Load via access key
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="text-[10px] uppercase tracking-[0.4em] text-zinc-700 font-black mb-6 px-1">Library</div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
            {configs.length === 0 ? (
              <div className="text-center py-10 text-zinc-800 uppercase tracking-widest text-[8px] font-black">Empty</div>
            ) : (
              configs.map((config) => (
                <div 
                  key={config.id} 
                  onClick={() => setSelectedConfigId(config.id)}
                  className={`group relative flex flex-col p-5 rounded-2xl border transition-all duration-500 cursor-pointer ${selectedConfigId === config.id ? 'bg-zinc-900/40 border-white/10 ring-1 ring-white/5 shadow-2xl' : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className={`text-sm font-light tracking-wide transition-colors ${selectedConfigId === config.id ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>{config.name}</div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteConfig(config.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 text-zinc-700 transition-all"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                  <div className="text-[9px] uppercase tracking-widest text-zinc-700 font-black">{config.date}</div>
                  {selectedConfigId === config.id && (
                    <motion.div layoutId="active-indicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Load Config Modal (Stays as modal) */}
      <AnimatePresence>
        {showLoadModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[500] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-3xl p-8 flex flex-col gap-6 shadow-2xl"
            >
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-black mb-2">Access Key Required</div>
                <div className="text-2xl font-light text-white tracking-wide">Enter configuration key</div>
              </div>
              <input 
                className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-4 text-zinc-100 outline-none focus:border-blue-500/50 transition-colors font-mono tracking-widest"
                placeholder="XXXX-XXXX-XXXX"
                value={loadKey}
                onChange={(e) => setLoadKey(e.target.value.toUpperCase())}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleLoadConfig()}
              />
              <div className="flex gap-4">
                <button 
                  onClick={() => { setShowLoadModal(false); setLoadKey('') }} 
                  className="flex-1 py-3 text-zinc-500 hover:text-white transition-colors text-[10px] uppercase tracking-widest font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleLoadConfig}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] uppercase tracking-widest font-black transition-all shadow-lg shadow-blue-600/20"
                >
                  Load Config
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


const PanelView = ({ keys, setKeys, users, setUsers, onToast }) => {
  const [editing, setEditing] = useState(null)
  const [editData, setEditData] = useState({ key: '', assignedAdmin: '', type: 'Internal', password: '' })
  const [isRegistering, setIsRegistering] = useState(false)
  const [regData, setRegData] = useState({ key: '', type: 'Internal' })

  const startEditing = (k) => {
    const userAcc = users.find(u => u.user.toLowerCase() === k.assignedAdmin.toLowerCase())
    setEditing(k.id)
    setEditData({ 
      key: k.key, 
      assignedAdmin: k.assignedAdmin, 
      type: k.type || 'Internal',
      password: userAcc ? userAcc.password : ''
    })
  }

  const saveEdit = (id) => {
    const oldKey = keys.find(k => k.id === id)
    
    // Update license
    setKeys(keys.map(k => k.id === id ? { 
      ...k, 
      key: editData.key, 
      assignedAdmin: editData.assignedAdmin, 
      type: editData.type 
    } : k))

    // Update or create user account if admin assigned a username/password
    if (editData.assignedAdmin !== 'None') {
      const userExists = users.some(u => u.user.toLowerCase() === editData.assignedAdmin.toLowerCase())
      if (userExists) {
        setUsers(users.map(u => u.user.toLowerCase() === editData.assignedAdmin.toLowerCase() ? {
          ...u,
          password: editData.password || u.password
        } : u))
      } else if (editData.password) {
        setUsers([...users, { user: editData.assignedAdmin, password: editData.password }])
      }
    }

    setEditing(null)
    onToast('License and Account updated')
  }

  const deleteKey = (id) => {
    setKeys(keys.filter(k => k.id !== id))
    onToast('License key deleted')
  }

  const generateRandomKey = () => {
    const k = `azov-${Math.random().toString(36).substring(2, 6).toLowerCase()}`
    setRegData({ ...regData, key: k })
  }

  const registerKey = () => {
    if (!regData.key) return onToast('Please provide or generate a key')
    const newKey = {
      id: Date.now().toString(),
      key: regData.key,
      assignedAdmin: 'None',
      type: regData.type
    }
    setKeys([...keys, newKey])
    setIsRegistering(false)
    setRegData({ key: '', type: 'Internal' })
    onToast('New license registered')
  }

  return (
    <div className="dashboard-card p-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center mb-10">
        <h3 className="text-2xl font-light tracking-widest uppercase text-white">Admin Panel</h3>
        <button 
          onClick={() => setIsRegistering(!isRegistering)} 
          className="px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-500 font-bold shadow-2xl"
        >
          {isRegistering ? 'Cancel' : 'Register New'}
        </button>
      </div>

      <AnimatePresence>
        {isRegistering && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-10 overflow-hidden"
          >
            <div className="p-8 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col md:flex-row gap-6 items-end">
              <div className="flex-1 space-y-2 w-full">
                <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-black">License Key</div>
                <div className="flex gap-2">
                  <input 
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 outline-none w-full focus:border-blue-500 transition-colors font-mono text-sm"
                    value={regData.key}
                    onChange={(e) => setRegData({ ...regData, key: e.target.value })}
                    placeholder="Enter or generate..."
                  />
                  <button onClick={generateRandomKey} className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  </button>
                </div>
              </div>
              <div className="w-full md:w-48 space-y-2">
                <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-black">Type</div>
                <select 
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 outline-none w-full focus:border-blue-500 transition-colors text-[10px] uppercase tracking-widest font-bold"
                  value={regData.type}
                  onChange={(e) => setRegData({ ...regData, type: e.target.value })}
                >
                  <option value="Internal">Internal</option>
                  <option value="Script">Script</option>
                </select>
              </div>
              <button 
                onClick={registerKey}
                className="w-full md:w-48 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] uppercase tracking-widest font-black transition-all shadow-lg shadow-blue-600/20"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 border-b border-zinc-800">
            <tr>
              <th className="pb-6 text-left font-bold">Identity</th>
              <th className="pb-6 text-left font-bold">Key</th>
              <th className="pb-6 text-left font-bold">Username</th>
              <th className="pb-6 text-left font-bold">Password</th>
              <th className="pb-6 text-left font-bold">Type</th>
              <th className="pb-6 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {keys.map((k) => (
              <tr key={k.id} className="border-b border-zinc-800/20 group hover:bg-white/[0.01] transition-colors">
                <td className="py-8">
                  <DefaultAvatar name={k.key} size="w-10 h-10" />
                </td>
                <td className="py-8">
                  {editing === k.id ? (
                    <input 
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 outline-none w-full focus:border-blue-500 transition-colors font-mono"
                      value={editData.key}
                      onChange={(e) => setEditData({ ...editData, key: e.target.value })}
                    />
                  ) : (
                    <span className="text-zinc-400 font-mono tracking-tighter text-sm">{k.key}</span>
                  )}
                </td>
                <td className="py-8">
                  {editing === k.id ? (
                    <input 
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 outline-none w-32 focus:border-blue-500 transition-colors"
                      value={editData.assignedAdmin}
                      onChange={(e) => setEditData({ ...editData, assignedAdmin: e.target.value })}
                      placeholder="Name..."
                    />
                  ) : (
                    <span className={`text-sm tracking-wide ${k.assignedAdmin !== 'None' ? 'text-blue-400 font-medium' : 'text-zinc-600'}`}>
                      {k.assignedAdmin}
                    </span>
                  )}
                </td>
                <td className="py-8">
                  {editing === k.id ? (
                    <input 
                      type="text"
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 outline-none w-32 focus:border-blue-500 transition-colors"
                      value={editData.password}
                      onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                      placeholder="Password..."
                    />
                  ) : (
                    <span className="text-zinc-600 italic">
                      {users.find(u => u.user.toLowerCase() === k.assignedAdmin.toLowerCase()) ? '********' : 'N/A'}
                    </span>
                  )}
                </td>
                <td className="py-8">
                  {editing === k.id ? (
                    <select 
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 outline-none w-32 focus:border-blue-500 transition-colors text-[10px] uppercase tracking-widest font-bold"
                      value={editData.type}
                      onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                    >
                      <option value="Internal">Internal</option>
                      <option value="Script">Script</option>
                    </select>
                  ) : (
                    <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">
                      {k.type || 'Standard'}
                    </span>
                  )}
                </td>
                <td className="py-8 text-right">
                  <div className="flex justify-end gap-3">
                    {editing === k.id ? (
                      <button onClick={() => saveEdit(k.id)} className="px-4 py-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg text-[10px] uppercase tracking-widest transition-all font-bold">Save</button>
                    ) : (
                      <button onClick={() => startEditing(k)} className="px-4 py-2 bg-zinc-900/50 text-zinc-500 hover:bg-white hover:text-black rounded-lg text-[10px] uppercase tracking-widest transition-all font-bold">Edit</button>
                    )}
                    <button onClick={() => deleteKey(k.id)} className="p-2.5 bg-red-500/5 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const SettingsView = ({ user, isAdmin, loginKey, licenseKeys, onToast, profilePic, setProfilePic, alwaysLoggedIn, setAlwaysLoggedIn, setSavedCredentials }) => {
    const fileInputRef = useRef(null)

  const maskKey = (key) => {
    if (!key || key === 'No Active License') return key;
    if (key === 'ADMIN-OVERRIDE') return key;
    return '•'.repeat(key.length);
  };

  const activeLicense = isAdmin ? 'ADMIN-OVERRIDE' : (licenseKeys.find(k => k.assignedAdmin.toLowerCase() === user.toLowerCase())?.key || 'No Active License');

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        onToast('Image too large (max 2MB)')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfilePic(reader.result)
        onToast('Profile picture updated')
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="dashboard-card p-10">
        <div className="flex items-center gap-6 mb-12">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange}
          />
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center overflow-hidden shadow-2xl relative group cursor-pointer"
          >
            {profilePic ? (
              <img src={profilePic} alt="Profile" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
            ) : (
              <DefaultAvatar name={activeLicense} size="w-full h-full" />
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 font-black mb-1">Account Identity</div>
            <div className="text-4xl font-light text-white tracking-tight leading-none">{user}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-black">Username</div>
              <input 
                readOnly
                className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3.5 text-zinc-400 outline-none cursor-not-allowed font-mono text-sm"
                value={user}
              />
            </div>
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-black">Active License</div>
              <div className="flex gap-2">
                <input 
                  readOnly
                  className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3.5 text-zinc-400 outline-none cursor-not-allowed font-mono text-sm"
                  value={maskKey(activeLicense)}
                />
                <button onClick={() => { 
                  if (activeLicense !== 'No Active License') {
                    navigator.clipboard.writeText(activeLicense); 
                    onToast('Key copied to clipboard');
                  }
                }} className="px-4 bg-zinc-900/50 border border-white/5 rounded-xl hover:bg-zinc-800 transition-colors">
                  <svg className="w-4 h-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-8 bg-white/[0.01] border border-white/5 rounded-2xl">
              <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 font-black mb-4">Security Stats</div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold">
                  <span className="text-zinc-500">Hardware ID</span>
                  <span className="text-green-500">Verified</span>
                </div>
                <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold">
                  <span className="text-zinc-500">Always Logged In</span>
                  <button 
                    onClick={() => {
                      const newState = !alwaysLoggedIn
                      setAlwaysLoggedIn(newState)
                      if (newState) {
                        setSavedCredentials({ user, key: loginKey })
                        onToast('Auto-login enabled')
                      } else {
                        setSavedCredentials(null)
                        onToast('Auto-login disabled')
                      }
                    }}
                    className={`px-3 py-1 rounded-md border transition-all duration-300 ${alwaysLoggedIn ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-red-500/10 border-red-500/50 text-red-500'}`}
                  >
                    {alwaysLoggedIn ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold">
                  <span className="text-zinc-500">Last Login IP</span>
                  <span className="text-zinc-100">192.168.*.*</span>
                </div>
              </div>
            </div>
            <button onClick={() => onToast('Security features coming soon')} className="w-full py-4 bg-zinc-900 hover:bg-white hover:text-black border border-zinc-800 rounded-xl text-[10px] uppercase tracking-[0.3em] font-black transition-all duration-500 shadow-xl">
              Change Security Settings
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex justify-center">
        <div className="text-[8px] uppercase tracking-[0.5em] text-zinc-800 font-bold">
          Protected by Azov Anti-Tamper Protocol
        </div>
      </div>
    </div>
  )
}

const Dashboard = ({ user, isAdmin, loginKey, products, setProducts, configs, setConfigs, licenseKeys, setLicenseKeys, users, setUsers, profilePic, setProfilePic, alwaysLoggedIn, setAlwaysLoggedIn, setSavedCredentials, onLogout }) => {
  const [activeTab, setActiveTab] = useState('DASHBOARD')
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  return (
    <div className={`w-full ${activeTab === 'CONFIGS' ? 'max-w-7xl' : 'max-w-5xl'} px-4 relative z-10 flex flex-col min-h-[90vh] transition-all duration-700`}>
      <AnimatePresence>
        {toast && <Toast key="toast" message={toast} />}
      </AnimatePresence>

      {/* Header Title */}
      <div className="flex flex-col items-center mb-16 pt-12">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white azov-text">
          azov
          <span className="cc-glow">.cc</span>
        </h1>
      </div>

      {/* Tab Content */}
      <div className="flex-1 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {activeTab === 'DASHBOARD' && <DashboardView user={user} isAdmin={isAdmin} loginKey={loginKey} licenseKeys={licenseKeys} configs={configs} products={products} onToast={showToast} onOpenSettings={() => setActiveTab('SETTINGS')} profilePic={profilePic} />}
            {activeTab === 'PRODUCTS' && <ProductsView isAdmin={isAdmin} products={products} setProducts={setProducts} onToast={showToast} />}
            {activeTab === 'CONFIGS' && <ConfigsView configs={configs} setConfigs={setConfigs} onToast={showToast} />}
            {activeTab === 'PANEL' && <PanelView keys={licenseKeys} setKeys={setLicenseKeys} users={users} setUsers={setUsers} onToast={showToast} />}
            {activeTab === 'SETTINGS' && <SettingsView user={user} isAdmin={isAdmin} loginKey={loginKey} licenseKeys={licenseKeys} onToast={showToast} profilePic={profilePic} setProfilePic={setProfilePic} alwaysLoggedIn={alwaysLoggedIn} setAlwaysLoggedIn={setAlwaysLoggedIn} setSavedCredentials={setSavedCredentials} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation - Moved to Bottom and Centered */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-fit px-4 z-[100]">
        <div className="flex items-center gap-1 p-1.5 bg-black/60 border border-white/10 rounded-2xl backdrop-blur-2xl shadow-2xl mx-auto">
          <button onClick={() => setActiveTab('DASHBOARD')} className={`nav-tab px-6 py-3 ${activeTab === 'DASHBOARD' ? 'active' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Dashboard
          </button>
          <button onClick={() => setActiveTab('PRODUCTS')} className={`nav-tab px-6 py-3 ${activeTab === 'PRODUCTS' ? 'active' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            Products
          </button>
          <button onClick={() => setActiveTab('CONFIGS')} className={`nav-tab px-6 py-3 ${activeTab === 'CONFIGS' ? 'active' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Cloud Configs
          </button>
          <button onClick={() => setActiveTab('SETTINGS')} className={`nav-tab px-6 py-3 ${activeTab === 'SETTINGS' ? 'active' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Settings
          </button>
          {isAdmin && (
            <button onClick={() => setActiveTab('PANEL')} className={`nav-tab px-6 py-3 ${activeTab === 'PANEL' ? 'active' : ''}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1-2 2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Panel
            </button>
          )}
          <div className="w-[1px] h-6 bg-white/10 mx-2" />
          <button onClick={onLogout} className="p-3 hover:text-red-500 transition-colors duration-300 text-zinc-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1-2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

const PreviewTables = memo(({ onClose }) => {
  const [view, setView] = useState('select') // 'select', 'internal', 'script'
  const [copied, setCopied] = useState(false)

  const internalCode = useMemo(() => serializeConfig(DEFAULT_CONFIG_OBJECT), [])

  const scriptCode = internalCode

  const handleCopy = useCallback(() => {
    const code = view === 'internal' ? internalCode : scriptCode
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [view, internalCode, scriptCode])

  const highlightedCode = useMemo(() => {
    const code = view === 'internal' ? internalCode : scriptCode;
    return code.split('\n').map((line, idx) => ({
      id: idx,
      content: line
    }));
  }, [view, internalCode, scriptCode]);

  const highlightLua = useCallback(() => {
    return highlightedCode.map((line) => (
      <div key={line.id} className="flex gap-10 group hover:bg-white/[0.01] transition-colors px-10">
        <span className="w-6 text-right text-zinc-900 select-none text-[10px] pt-1.5 font-mono leading-none">{line.id + 1}</span>
        <span className="font-mono text-[11px] tracking-tight leading-loose text-zinc-400 whitespace-pre">{line.content}</span>
      </div>
    ));
  }, [highlightedCode]);

  return (
    <motion.div 
      initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      animate={{ opacity: 1, backdropFilter: 'blur(30px)' }}
      exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 p-6"
    >
      <div className="bg-[#050505] border border-white/[0.03] rounded-[2rem] max-w-6xl w-full max-h-[90vh] relative overflow-hidden flex flex-col shadow-[0_0_200px_rgba(0,0,0,1)]">
        {/* Fixed Header Bar - Solid and Prominent */}
        <div className="flex justify-between items-center px-12 py-10 border-b border-white/[0.05] bg-[#0a0a0a] relative z-[110] shrink-0">
          <div className="flex items-center gap-8">
            <div>
              <div className="flex items-center gap-4 mb-1.5">
                <h3 className="text-[10px] uppercase tracking-[0.6em] text-zinc-500 font-black">PREVIEW TABLE</h3>
                {view !== 'select' && (
                  <>
                    <div className="w-1 h-1 rounded-full bg-zinc-800"></div>
                    <span className="text-[10px] uppercase tracking-[0.5em] text-zinc-700 font-black">AZOV_{view.toUpperCase()}.LUA</span>
                  </>
                )}
              </div>
              <div className="text-2xl font-light text-white tracking-wide uppercase">
                {view === 'select' ? 'Select table' : view}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-10">
            {view !== 'select' && (
              <button onClick={() => setView('select')} className="text-[10px] uppercase tracking-[0.5em] text-zinc-400 hover:text-white transition-all duration-500 font-black flex items-center gap-3 group">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:-translate-x-1 transition-transform"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                RETURN
              </button>
            )}
            <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-800 border border-white/[0.1] text-zinc-400 hover:text-white hover:border-white/30 transition-all shadow-xl">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-12 md:p-16 overflow-y-auto custom-scrollbar flex-1 relative z-10">
          {view === 'select' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {[
                { id: 'internal', title: 'Internal Table', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
                { id: 'script', title: 'Script Table', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }
              ].map((tier) => (
                <button 
                  key={tier.id}
                  onClick={() => setView(tier.id)}
                  className="group relative p-14 bg-white/[0.003] border border-white/[0.01] rounded-[2rem] hover:bg-white/[0.008] hover:border-white/5 transition-all duration-700 flex flex-col items-start text-left overflow-hidden"
                >
                  <div className="w-20 h-20 bg-zinc-900/40 rounded-2xl flex items-center justify-center text-zinc-600 group-hover:scale-110 group-hover:text-white group-hover:bg-zinc-800 transition-all duration-700 mb-12 border border-white/[0.02]">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d={tier.icon}/></svg>
                  </div>
                  <div className="space-y-3 relative z-10">
                    <h4 className="text-3xl font-light text-zinc-200 tracking-tight">{tier.title}</h4>
                  </div>
                  <div className="mt-12 flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-zinc-700 font-black group-hover:text-white transition-colors">
                    Preview Table <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col h-full"
            >
              <div className="bg-black/40 border border-white/[0.005] rounded-[1.5rem] overflow-hidden flex-1 shadow-2xl backdrop-blur-3xl py-16 text-zinc-400 overflow-y-auto custom-scrollbar">
                {highlightLua()}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
})

function App() {
  const [stage, setStage] = useState('intro') // 'intro', 'login', 'dashboard'
  const [credentials, setCredentials] = useState({ user: '', key: '' })
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loginTab, setLoginTab] = useState('login') // 'login' or 'register'
  const [regForm, setRegForm] = useState({ user: '', pass: '', key: '' })
  const [showPreviewTables, setShowPreviewTables] = useState(false)
  const [showPass, setShowPass] = useState(false)

  // --- Persistent State ---
  const [products, setProducts] = usePersistedState('azov_products', [
    { id: 1, name: 'Azov Executor', version: 'v2.4', type: 'Premium', status: 'Undetected' },
    { id: 2, name: 'Cloud Hub', version: 'v1.0', type: 'Public', status: 'Online' },
    { id: 3, name: 'Azov External', version: 'v0.9', type: 'Beta', status: 'Testing' },
  ])
  const [configs, setConfigs] = usePersistedState('azov_configs', [
    { 
      id: 1, 
      name: 'Default Azov Config', 
      date: 'Just now',
      key: 'AZOV-DEFAULT',
      type: 'Internal',
      configObj: { ...DEFAULT_CONFIG_OBJECT },
      content: serializeConfig(DEFAULT_CONFIG_OBJECT)
    }
  ])
  const [licenseKeys, setLicenseKeys] = usePersistedState('azov_keys', [
    { id: '1', key: 'Azov-93J-K22-P01', assignedAdmin: 'alex', type: 'Internal' },
    { id: '2', key: 'DZaNH-X88-Y92-L11', assignedAdmin: 'None', type: 'Script' },
  ])
  const [profilePic, setProfilePic] = usePersistedState('azov_pfp', null)
  const [alwaysLoggedIn, setAlwaysLoggedIn] = usePersistedState('azov_always_logged_in', false)
  const [savedCredentials, setSavedCredentials] = usePersistedState('azov_credentials', null)
  const [users, setUsers] = usePersistedState('azov_users', [
    { user: 'alex', password: 'password123' }
  ])

  useEffect(() => {
    const checkAutoLogin = async () => {
      if (alwaysLoggedIn && savedCredentials && stage === 'intro') {
        const { user, key } = savedCredentials || {}
        if (!user || !key) return
        
        const cleanUser = user.trim().toLowerCase()
        const cleanPass = key.trim()
        
        if (cleanUser === 'admin' && cleanPass === 'adminkey') {
          setIsAdmin(true)
          setCredentials(savedCredentials)
          setStage('dashboard')
        } else {
          const hashedPass = await hashPassword(cleanPass)
          const foundUser = users.find(u => 
            u.user.toLowerCase() === cleanUser && u.password === hashedPass
          )
          if (foundUser) {
            setIsAdmin(false)
            setCredentials(savedCredentials)
            setStage('dashboard')
          }
        }
      }
    }
    checkAutoLogin()
  }, [])

  useEffect(() => {
    if (stage === 'intro') {
      const timer = setTimeout(() => {
        setStage('login')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [stage])

  const handleLogin = async (e) => {
    e.preventDefault()
    const cleanUser = credentials.user.trim().toLowerCase()
    const cleanPass = credentials.key.trim() // key field used as password
    
    // Admin override
    if (cleanUser === 'admin' && cleanPass === 'adminkey') {
      setIsAdmin(true)
      setStage('dashboard')
      setError('')
      if (alwaysLoggedIn) setSavedCredentials({ user: credentials.user, key: credentials.key })
      return
    }

    const hashedPass = await hashPassword(cleanPass)

    // Check against persistent user accounts
    const foundUser = users.find(u => 
      u.user.toLowerCase() === cleanUser && u.password === hashedPass
    )

    if (foundUser) {
      setIsAdmin(false)
      setStage('dashboard')
      setError('')
      if (alwaysLoggedIn) setSavedCredentials({ user: credentials.user, key: credentials.key })
    } else {
      setError('Invalid Username or Password')
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    const cleanUser = regForm.user.trim()
    const cleanPass = regForm.pass.trim()
    const cleanKey = regForm.key.trim()

    if (!cleanUser || !cleanPass || !cleanKey) {
      setError('All fields are required')
      return
    }

    // Check if license key exists and is not already assigned
    const keyIndex = licenseKeys.findIndex(k => k.key === cleanKey)
    if (keyIndex === -1) {
      setError('Invalid License Key')
      return
    }

    if (licenseKeys[keyIndex].assignedAdmin !== 'None' && licenseKeys[keyIndex].assignedAdmin.toLowerCase() !== cleanUser.toLowerCase()) {
      setError('License key already assigned to another user')
      return
    }

    // Check if username is taken
    if (users.some(u => u.user.toLowerCase() === cleanUser.toLowerCase())) {
      setError('Username already taken')
      return
    }

    const hashedPass = await hashPassword(cleanPass)

    // Create account and update license assignment
    setUsers([...users, { user: cleanUser, password: hashedPass }])
    setLicenseKeys(licenseKeys.map((k, i) => i === keyIndex ? { ...k, assignedAdmin: cleanUser } : k))
    
    setLoginTab('login')
    setCredentials({ user: cleanUser, key: cleanPass })
    setError('Registration successful! Please login.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black overflow-hidden relative font-sans">
      <BackgroundEffects />

      <AnimatePresence mode="wait">
        {stage === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="flex items-center z-10"
          >
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="text-7xl font-bold tracking-tight text-white azov-text"
            >
              azov
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2, duration: 1.5 }}
                className="cc-glow"
              >
                .cc
              </motion.span>
            </motion.h1>
          </motion.div>
        )}

        {stage === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="w-full max-w-md px-6 z-10"
          >
            <div className="dashboard-card p-12 relative overflow-hidden flex flex-col items-center">
              <h2 className="text-3xl font-bold text-white mb-3 text-center tracking-tight">Welcome back</h2>
              <p className="text-zinc-500 text-sm mb-10 text-center tracking-wide">Enter your credentials to continue.</p>
              
              <div className="w-full space-y-6">
                {loginTab === 'login' ? (
                  <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[12px] text-zinc-500 font-medium ml-1">Username</label>
                      <input
                        type="text"
                        autoFocus
                        autoComplete="off"
                        className="login-input"
                        value={credentials.user}
                        onChange={(e) => setCredentials({ ...credentials, user: e.target.value })}
                        placeholder="Username"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[12px] text-zinc-500 font-medium ml-1">Password</label>
                      <div className="relative group">
                        <input
                          type={showPass ? "text" : "password"}
                          autoComplete="off"
                          className="login-input pr-12"
                          value={credentials.key}
                          onChange={(e) => setCredentials({ ...credentials, key: e.target.value })}
                          placeholder="••••••••"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                        >
                          {showPass ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <button type="submit" className="primary-button mt-4">
                      Sign In
                    </button>

                    <div className="text-center pt-2">
                      <span className="text-zinc-500 text-xs">Don't have an account? </span>
                      <button 
                        type="button"
                        onClick={() => { setLoginTab('register'); setError(''); }}
                        className="text-white text-xs font-bold hover:underline"
                      >
                        Sign up
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[12px] text-zinc-500 font-medium ml-1">Username</label>
                      <input
                        type="text"
                        autoFocus
                        autoComplete="off"
                        className="login-input"
                        value={regForm.user}
                        onChange={(e) => setRegForm({ ...regForm, user: e.target.value })}
                        placeholder="Username"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[12px] text-zinc-500 font-medium ml-1">Password</label>
                      <input
                        type="password"
                        autoComplete="off"
                        className="login-input"
                        value={regForm.pass}
                        onChange={(e) => setRegForm({ ...regForm, pass: e.target.value })}
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[12px] text-zinc-500 font-medium ml-1">License Key</label>
                      <input
                        type="text"
                        autoComplete="off"
                        className="login-input font-mono uppercase"
                        value={regForm.key}
                        onChange={(e) => setRegForm({ ...regForm, key: e.target.value })}
                        placeholder="XXXX-XXXX-XXXX"
                      />
                    </div>

                    <button type="submit" className="primary-button mt-4">
                      Sign Up
                    </button>

                    <div className="text-center pt-2">
                      <span className="text-zinc-500 text-xs">Already have an account? </span>
                      <button 
                        type="button"
                        onClick={() => { setLoginTab('login'); setError(''); }}
                        className="text-white text-xs font-bold hover:underline"
                      >
                        Sign in
                      </button>
                    </div>
                  </form>
                )}

                <div className="pt-2 flex justify-center">
                  <button 
                    onClick={() => setShowPreviewTables(true)}
                    className="flex items-center gap-2 text-xs text-zinc-500 hover:text-white transition-colors duration-300"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Preview tables
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-8 text-center text-[10px] uppercase tracking-widest font-bold ${error.includes('successful') ? 'text-green-500/60' : 'text-red-500/60'}`}
                >
                  {error}
                </motion.div>
              )}
            </div>
            <AnimatePresence>
              {showPreviewTables && <PreviewTables onClose={() => setShowPreviewTables(false)} />}
            </AnimatePresence>
          </motion.div>
        )}

        {stage === 'dashboard' && (
          <Dashboard 
            user={credentials.user} 
            isAdmin={isAdmin} 
            loginKey={credentials.key}
            products={products}
            setProducts={setProducts}
            configs={configs}
            setConfigs={setConfigs}
            licenseKeys={licenseKeys}
            setLicenseKeys={setLicenseKeys}
            users={users}
            setUsers={setUsers}
            profilePic={profilePic}
            setProfilePic={setProfilePic}
            alwaysLoggedIn={alwaysLoggedIn}
            setAlwaysLoggedIn={setAlwaysLoggedIn}
            setSavedCredentials={setSavedCredentials}
            onLogout={() => {
              setStage('login')
              setError('')
              setCredentials({ user: '', key: '' })
              if (!alwaysLoggedIn) setSavedCredentials(null)
            }} 
          />
        )}
      </AnimatePresence>

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.05] noise-bg z-0"></div>
    </div>
  )
}

export default App
