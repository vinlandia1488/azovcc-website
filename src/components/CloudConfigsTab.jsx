import { useState, useEffect, useRef, useMemo } from 'react';
import { getBackendDb } from '@/lib/backend';
import { 
  Plus, Play, RotateCcw, Trash2, Copy, Check, 
  Search, X, ChevronUp, ChevronDown, Save, Eye,
  Layout, FileCode, History, Settings
} from 'lucide-react';
import { getDefaultCloudConfig, getConfigTemplatesShared } from '@/lib/config-templates';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

const db = getBackendDb();

// Simple Lua syntax highlighter
const highlightLua = (code, accent) => {
  if (!code) return '';
  
  // Escape HTML
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const tokens = [
    { type: 'comment', regex: /--.*/ },
    { type: 'string',  regex: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/ },
    { type: 'keyword', regex: /\b(?:local|function|return|end|for|in|do|if|then|else|elseif|while|repeat|until|true|false|nil)\b/ },
    { type: 'builtin', regex: /\b(?:print|pairs|ipairs|table|string|math|wait|task|spawn|delay|Color3|Vector3|Instance|game|script|workspace)\b/ },
    { type: 'number',  regex: /\b\d+\b/ }
  ];

  const combinedRegex = new RegExp(tokens.map(t => `(${t.regex.source})`).join('|'), 'g');

  return html.replace(combinedRegex, (...args) => {
    const match = args[0];
    for (let i = 0; i < tokens.length; i++) {
      if (args[i + 1] !== undefined) {
        const type = tokens[i].type;
        if (type === 'comment') return `<span class="text-zinc-500 italic">${match}</span>`;
        if (type === 'string')  return `<span class="text-emerald-400">${match}</span>`;
        if (type === 'keyword') return `<span style="color: ${accent}">${match}</span>`;
        if (type === 'builtin') return `<span class="text-sky-400">${match}</span>`;
        if (type === 'number')  return `<span class="text-orange-400">${match}</span>`;
      }
    }
    return match;
  });
};

export default function CloudConfigsTab({ session, accent }) {
  const [defaultConfig, setDefaultConfig] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [configs, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [configName, setConfigName] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeConfigId, setActiveConfigId] = useState(null);
  
  const textAreaRef = useRef(null);
  const preRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const shared = await getConfigTemplatesShared();
        const template = String(shared?.defaultCloudConfig || getDefaultCloudConfig());
        setDefaultConfig(template);
        
        // Load user's configs
        await loadConfigs();
        
        // Load active config from account if exists
        const accounts = await db.entities.Account.filter({ username: session.username });
        if (accounts && accounts.length > 0) {
          const acc = accounts[0];
          setActiveConfigId(acc.active_config_id);
          if (acc.selected_config_content) {
            setEditorContent(acc.selected_config_content);
            // Try to find which config this content belongs to for selection
            const userConfigs = await db.entities.CloudConfig.filter({ owner_username: session.username });
            const matching = userConfigs.find(c => c.id === acc.active_config_id);
            if (matching) {
              setSelectedConfig(matching);
              setConfigName(matching.name);
            }
            return;
          }
        }

        // Default to the admin template if no config is selected
        setEditorContent(template);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function loadConfigs() {
    const all = await db.entities.CloudConfig.filter({ owner_username: session.username });
    const filtered = (all || []).filter(c => c.name !== '__SUPPORT_MSG__' && c.name !== '__config_templates__');
    setConfigs(filtered);
  }

  const handleReset = () => {
    setEditorContent(defaultConfig);
    setSelectedConfig(null);
    setConfigName('');
    toast.success('Reset to default template');
  };

  const handleSave = async () => {
    if (!editorContent.trim()) return toast.error('Config cannot be empty');
    
    let name = configName;
    if (!name) {
      name = prompt('Enter a name for this config:');
      if (!name) return;
      setConfigName(name);
    }

    setSaving(true);
    try {
      if (selectedConfig) {
        await db.entities.CloudConfig.update(selectedConfig.id, { 
          content: editorContent,
          name: name 
        });
        toast.success('Config updated');
      } else {
        const newCfg = await db.entities.CloudConfig.create({
          name: name,
          content: editorContent,
          owner_username: session.username
        });
        setSelectedConfig(newCfg);
        toast.success('Config saved');
      }
      await loadConfigs();
    } catch (err) {
      toast.error('Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    try {
      await handleSave();
      
      // Update account with the current config content, a new run_id, and active_config_id
      const accounts = await db.entities.Account.filter({ username: session.username });
      if (accounts && accounts.length > 0) {
        const updateData = {
          selected_config_content: editorContent,
          run_id: Math.random().toString(36).substring(7)
        };

        // If we have a selected config, save its ID as active
        if (selectedConfig) {
          updateData.active_config_id = selectedConfig.id;
          setActiveConfigId(selectedConfig.id);
        }

        await db.entities.Account.update(accounts[0].id, updateData);
        toast.success('Config sent to software!');
      }
    } catch (err) {
      console.error('Failed to run config:', err);
      toast.error('Failed to apply config to software');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this config?')) return;
    try {
      await db.entities.CloudConfig.delete(id);
      if (selectedConfig?.id === id) {
        setSelectedConfig(null);
        setConfigName('');
        setEditorContent(defaultConfig);
      }
      await loadConfigs();
      toast.success('Deleted successfully');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editorContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  const syncScroll = (e) => {
    if (preRef.current) {
      preRef.current.scrollTop = e.target.scrollTop;
      preRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  const lines = editorContent.split('\n').length;
  const lineNumbers = useMemo(() => Array.from({ length: Math.max(lines, 16) }, (_, i) => i + 1), [lines]);

  const highlightedCode = useMemo(() => highlightLua(editorContent, accent), [editorContent, accent]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: accent }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Status removed as requested */}
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSidebar(!showSidebar)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              showSidebar ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
            )}
          >
            <History size={14} />
            Saved Configs
          </button>
        </div>
      </div>

      <div className="flex gap-4 min-h-[600px]">
        {/* Main Editor Window */}
        <div className="flex-1 flex flex-col bg-[#0b0b0e] border border-zinc-800/60 rounded-2xl overflow-hidden shadow-2xl relative">
          
          {/* Title Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/40 bg-[#0d0d10]">
            <div className="flex items-center gap-2">
              {/* Traffic lights removed */}
            </div>
            
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-zinc-500">
              <FileCode size={18} className="text-zinc-600" />
            </div>

            <div className="flex items-center gap-3 text-zinc-500">
              <button onClick={() => setShowSearch(!showSearch)} className={cn("transition-colors hover:text-white", showSearch && "text-white")}>
                <Search size={16} />
              </button>
              <button onClick={handleCopy} className="hover:text-white transition-colors">
                {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
              <button onClick={handleReset} className="hover:text-white transition-colors" title="Reset to default">
                <RotateCcw size={16} />
              </button>
            </div>
          </div>

          {/* Editor Container */}
          <div className="flex-1 relative flex overflow-hidden">
            
            {/* Search Bar Overlay */}
            <AnimatePresence>
              {showSearch && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-[#16161a] border border-zinc-700/50 rounded-lg p-1 shadow-xl"
                >
                  <div className="flex items-center gap-2 px-2 text-zinc-500">
                    <Search size={14} />
                    <input 
                      type="text" 
                      placeholder="Find..." 
                      className="bg-transparent border-none outline-none text-xs text-zinc-200 w-32"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center border-l border-zinc-700/50 pl-2 pr-1 gap-1">
                    <span className="text-[10px] text-zinc-600 font-mono mr-2">0/0</span>
                    <button className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500"><ChevronUp size={14} /></button>
                    <button className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500"><ChevronDown size={14} /></button>
                    <button onClick={() => setShowSearch(false)} className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500"><X size={14} /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Line Numbers */}
            <div className="w-12 bg-[#0d0d10] text-right py-4 pr-3 text-zinc-600 font-mono text-[11px] select-none border-r border-zinc-800/40">
              {lineNumbers.map(n => (
                <div key={n} className="leading-6 h-6">{n}</div>
              ))}
            </div>

            {/* Code Area */}
            <div className="flex-1 relative bg-transparent font-mono text-[12px] overflow-hidden">
              <pre 
                ref={preRef}
                className="absolute inset-0 p-4 m-0 leading-6 pointer-events-none overflow-hidden whitespace-pre"
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
              />
              <textarea
                ref={textAreaRef}
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                onScroll={syncScroll}
                spellCheck="false"
                autoComplete="off"
                autoCapitalize="off"
                className="absolute inset-0 w-full h-full p-4 m-0 leading-6 bg-transparent text-transparent caret-white outline-none resize-none overflow-auto whitespace-pre font-mono selection:bg-white/10"
              />
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="px-4 py-3 border-t border-zinc-800/40 bg-[#0d0d10] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input 
                  type="text"
                  placeholder="Config Name..."
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  className="bg-zinc-900/50 border border-zinc-800 text-xs px-3 py-1.5 rounded-lg text-zinc-300 outline-none focus:border-zinc-700 transition-colors w-40"
                />
              </div>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-medium transition-colors"
              >
                <Save size={14} />
                {saving ? 'Saving...' : 'Save Config'}
              </button>
              <button 
                onClick={() => setShowPreview(!showPreview)}
                className={cn(
                  "flex items-center gap-2 text-xs font-medium transition-colors",
                  showPreview ? "text-white" : "text-zinc-400 hover:text-white"
                )}
              >
                <Eye size={14} />
                Preview
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={handleRun}
                className="flex items-center gap-2 bg-white text-black px-6 py-2 rounded-xl text-sm font-bold hover:bg-zinc-200 transition-all active:scale-95 shadow-lg shadow-white/5"
              >
                <Play size={16} fill="black" />
                Run
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar for saved configs */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex flex-col bg-[#0b0b0e] border border-zinc-800/60 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-zinc-800/40 flex items-center justify-between">
                <h3 className="text-white font-bold text-sm">Your Configs</h3>
                <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 uppercase tracking-tighter">
                  {configs.length} / 20
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {configs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                    <FileCode size={32} className="text-zinc-800 mb-2" />
                    <p className="text-zinc-500 text-xs italic">No saved configs yet.</p>
                  </div>
                ) : (
                  configs.map(cfg => (
                    <div 
                      key={cfg.id}
                      onClick={() => {
                        setSelectedConfig(cfg);
                        setEditorContent(cfg.content);
                        setConfigName(cfg.name);
                      }}
                      className={cn(
                        "group p-3 rounded-xl border transition-all cursor-pointer relative",
                        selectedConfig?.id === cfg.id 
                          ? "bg-zinc-800/40 border-zinc-700/50" 
                          : "bg-zinc-900/20 border-zinc-800/40 hover:bg-zinc-900/40 hover:border-zinc-700/30"
                      )}
                    >
                      {activeConfigId === cfg.id && (
                        <div className="absolute -top-1 -right-1 flex items-center gap-1 bg-emerald-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg shadow-emerald-500/20 z-10">
                          <div className="w-1 h-1 bg-black rounded-full animate-pulse" />
                          ACTIVE
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-xs font-bold truncate pr-2">{cfg.name}</span>
                        <button 
                          onClick={(e) => handleDelete(cfg.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 hover:text-red-500 rounded transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-500 line-clamp-1 font-mono">
                        {cfg.content.substring(0, 50)}...
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Preview Modal/Overlay */}
      <AnimatePresence>
        {showPreview && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
            onClick={() => setShowPreview(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#0b0b0e] border border-zinc-800/60 rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800/40 flex items-center justify-between bg-[#0d0d10]">
                <div>
                  <h3 className="text-white font-bold text-xl mb-1">Config Preview</h3>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest font-medium">How your config will appear in-game</p>
                </div>
                <button 
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 rounded-full" style={{ background: accent }} />
                    <h4 className="text-white font-bold uppercase tracking-wider text-sm">Applied Configuration</h4>
                  </div>
                  
                  <div className="bg-zinc-900/20 border border-zinc-800/40 rounded-2xl p-4 font-mono text-[11px] text-zinc-400 whitespace-pre overflow-x-auto">
                    {editorContent}
                  </div>
                </div>
              </div>
              <div className="p-4 bg-zinc-900/50 border-t border-zinc-800/40 flex justify-end gap-3">
                <button 
                  onClick={() => setShowPreview(false)}
                  className="px-6 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    setShowPreview(false);
                    handleSave();
                  }}
                  className="px-6 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-all"
                >
                  Save & Apply
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}