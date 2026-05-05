import { useState, useEffect } from 'react';
import { getBackendDb } from '@/lib/backend';
import { Plus, Play, RotateCcw, Trash2, Copy, Check, Eye, Wrench } from 'lucide-react';
import { getDefaultCloudConfig, getConfigTemplatesShared } from '@/lib/config-templates';
import { motion } from 'framer-motion';

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

  return (
    <div className="relative min-h-[600px] w-full rounded-2xl border border-zinc-800/60 overflow-hidden bg-[#07070a]">
      {/* ACTUAL Original UI - Faded in Background */}
      <div className="opacity-[0.06] blur-[2px] pointer-events-none select-none grayscale pt-4 flex gap-6 min-h-[600px] px-4 pb-4">
        {/* Editor */}
        <div className="flex-1 bg-[#111114] border border-zinc-800/60 rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-zinc-800/60">
            <span className="text-sm font-bold tracking-widest" style={{ color: accent }}>AZOV</span>
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 bg-[#1a1a1e] border border-zinc-700/50 text-zinc-400 px-3 py-1.5 rounded-lg text-xs"><RotateCcw size={12} /> RESET</button>
              <button className="flex items-center gap-1.5 border text-xs px-3 py-1.5 rounded-lg" style={{ background: `${accent}22`, borderColor: `${accent}66`, color: accent }}><Play size={12} /> EXECUTE</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex">
            <div className="py-3 px-3 text-right min-w-[3rem] text-zinc-600 text-xs font-mono leading-6 border-r border-zinc-800/40">
              {[...Array(20)].map((_, i) => <div key={i}>{i + 1}</div>)}
            </div>
            <div className="flex-1 p-3 text-zinc-200 text-xs font-mono leading-6">
              {editorContent.split('\n').map((line, i) => <div key={i}>{line}</div>)}
            </div>
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
          <div className="flex gap-2">
            <div className="flex-1 bg-[#111114] border border-zinc-700/50 h-9 rounded-lg" />
            <div className="bg-[#1a1a1e] border border-zinc-700/50 w-9 h-9 rounded-lg" />
          </div>
          <div className="space-y-2">
            {configs.length === 0 && <div className="h-12 bg-[#111114] border border-zinc-800/60 rounded-xl" />}
            {configs.map(cfg => (
              <div key={cfg.id} className="w-full bg-[#111114] border border-zinc-800/60 rounded-xl px-4 py-3">
                <div className="h-4 bg-zinc-800 w-2/3 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WIP Overlay Content */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[3px]">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] blur-[140px] opacity-20 rounded-full"
            style={{ background: accent }}
          />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center space-y-4"
        >
          <div className="space-y-2">
            <h2 className="text-white text-5xl font-black tracking-tighter uppercase italic drop-shadow-2xl">
              Cloud Configs
            </h2>
            <p className="text-zinc-500 text-xs font-black tracking-[0.4em] uppercase">
              Are Work In Progress
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}