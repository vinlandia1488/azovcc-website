import { useState, useEffect } from 'react';
import { getBackendDb } from '@/lib/backend';

import { Plus, Play, RotateCcw, Trash2, Copy, Check, Eye } from 'lucide-react';
import { getDefaultCloudConfig, getConfigTemplatesShared } from '@/lib/config-templates';

const db = getBackendDb();

export default function CloudConfigsTab({ session, accent }) {
  const [defaultConfig, setDefaultConfig] = useState(getDefaultCloudConfig());
  const [configs, setConfigs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editorContent, setEditorContent] = useState(getDefaultCloudConfig());
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    (async () => {
      const shared = await getConfigTemplatesShared();
      const template = String(shared?.defaultCloudConfig || getDefaultCloudConfig());
      setDefaultConfig(template);
      setEditorContent((prev) => (prev ? prev : template));
      loadConfigs();
    })();
  }, []);

  async function loadConfigs() {
    setLoading(true);
    const all = await db.entities.CloudConfig.filter({ owner_username: session.username });
    const filtered = (all || []).filter(c => c.name !== '__SUPPORT_MSG__');
    setConfigs(filtered);
    setLoading(false);
  }

  function selectConfig(cfg) {
    setSelected(cfg);
    setEditorContent(cfg.content || defaultConfig);
  }

  async function saveNewConfig() {
    if (!newName.trim()) return;
    if (configs.length >= 10) return alert('Max 10 configs reached');
    setSaving(true);
    const created = await db.entities.CloudConfig.create({
      name: newName.trim(),
      content: defaultConfig,
      owner_username: session.username,
    });
    const updated = [...configs, created];
    setConfigs(updated);
    setNewName('');
    setSelected(created);
    setEditorContent(defaultConfig);
    setSaving(false);
  }

  async function updateConfig() {
    if (!selected) return;
    setSaving(true);
    try {
      // 1. Update the CloudConfig entity itself
      await db.entities.CloudConfig.update(selected.id, { content: editorContent });
      
      // 2. Update the user's Account to mark this as the currently selected execution config
      const userAccount = await db.entities.Account.filter({ username: session.username });
      if (userAccount && userAccount.length > 0) {
        await db.entities.Account.update(userAccount[0].id, { 
          selected_config_content: editorContent 
        });
      }

      setConfigs(configs.map(c => c.id === selected.id ? { ...c, content: editorContent } : c));
      setSelected({ ...selected, content: editorContent });
    } catch (error) {
      console.error('Failed to update config:', error);
      alert('Failed to save config to account.');
    }
    setSaving(false);
  }

  async function deleteConfig(cfg, e) {
    e.stopPropagation();
    await db.entities.CloudConfig.delete(cfg.id);
    const updated = configs.filter(c => c.id !== cfg.id);
    setConfigs(updated);
    if (selected?.id === cfg.id) {
      setSelected(null);
      setEditorContent(defaultConfig);
    }
  }

  function handleReset() {
    setEditorContent(defaultConfig);
  }

  function copyId(id, e) {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function viewDetail(cfg, e) {
    e.stopPropagation();
    const fullId = cfg.id;
    const shortId = fullId.split('-')[0];
    alert(`Config Details:\n\nName: ${cfg.name}\nFull ID: ${fullId}\nShort ID: ${shortId}\nCreated: ${cfg.created_date ? new Date(cfg.created_date).toLocaleString() : 'N/A'}`);
  }

  return (
    <div className="pt-4 flex gap-6 min-h-[600px]">
      {/* Editor */}
      <div className="flex-1 bg-[#111114] border border-zinc-800/60 rounded-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-zinc-800/60">
          <span className="text-sm font-bold tracking-widest" style={{ color: accent }}>AZOV</span>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 bg-[#1a1a1e] border border-zinc-700/50 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg text-xs transition"
            >
              <RotateCcw size={12} /> RESET
            </button>
            <button
              onClick={updateConfig}
              disabled={!selected || saving}
              className="flex items-center gap-1.5 border text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-40"
              style={{ background: `${accent}22`, borderColor: `${accent}66`, color: accent }}
            >
              <Play size={12} /> {saving ? 'SAVING...' : 'EXECUTE'}
            </button>
          </div>
        </div>

        {/* Code editor with line numbers */}
        <div className="flex-1 overflow-auto flex">
          <div className="py-3 px-3 text-right min-w-[3rem] text-zinc-600 text-xs font-mono leading-6 select-none border-r border-zinc-800/40">
            {editorContent.split('\n').map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            value={editorContent}
            onChange={e => setEditorContent(e.target.value)}
            className="flex-1 bg-transparent text-zinc-200 text-xs font-mono leading-6 p-3 resize-none focus:outline-none"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-64 flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-white font-bold text-lg">Cloud Configs</h2>
            <span className="text-zinc-500 text-sm">{configs.length}/10</span>
          </div>
          <p className="text-zinc-500 text-xs">Manage your saved presets.</p>
        </div>

        {/* New config */}
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveNewConfig()}
            placeholder="New config name..."
            className="flex-1 bg-[#111114] border border-zinc-700/50 text-white text-sm rounded-lg px-3 py-2 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition"
          />
          <button
            onClick={saveNewConfig}
            disabled={saving || !newName.trim()}
            className="bg-[#1a1a1e] border border-zinc-700/50 hover:border-zinc-500 text-white w-9 h-9 rounded-lg flex items-center justify-center transition disabled:opacity-40"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Library */}
        <div>
          <p className="text-zinc-600 text-[10px] uppercase tracking-widest mb-2">Library</p>
          <div className="space-y-2">
            {loading && <p className="text-zinc-600 text-xs">Loading...</p>}
            {!loading && configs.length === 0 && (
              <p className="text-zinc-600 text-xs">No configs yet. Create one above.</p>
            )}
            {configs.map(cfg => (
              <button
                key={cfg.id}
                onClick={() => selectConfig(cfg)}
                className="w-full text-left bg-[#111114] border rounded-xl px-4 py-3 transition group"
                style={selected?.id === cfg.id
                  ? { borderColor: `${accent}60`, background: `${accent}11` }
                  : { borderColor: 'rgb(39 39 42 / 0.6)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium">{cfg.name}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => copyId(cfg.id.split('-')[0], e)}
                      className="flex items-center gap-1 text-[9px] font-mono text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 transition"
                      title="Click to copy short ID"
                    >
                      {copiedId === cfg.id.split('-')[0] ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                      {cfg.id.split('-')[0]}
                    </button>
                    <button
                      onClick={(e) => viewDetail(cfg, e)}
                      className="text-zinc-600 hover:text-blue-400 transition p-1"
                      title="View full details"
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      onClick={(e) => deleteConfig(cfg, e)}
                      className="text-zinc-600 hover:text-red-400 transition p-1"
                      title="Delete config"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className="text-zinc-600 text-[11px] mt-0.5">
                  {cfg.created_date ? new Date(cfg.created_date).toLocaleDateString() : ''}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}