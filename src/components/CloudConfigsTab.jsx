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
    try {
      const all = await db.entities.CloudConfig.filter({ owner_username: session.username });
      const filtered = (all || []).filter(c => c.name !== '__SUPPORT_MSG__');
      setConfigs(filtered);
    } catch (e) {}
    setLoading(false);
  }

  return (
    <div className="relative min-h-[600px] w-full rounded-2xl border border-zinc-800/60 overflow-hidden bg-[#07070a]">
      {/* Original UI - Faded in Background */}
      <div className="absolute inset-0 opacity-[0.03] blur-[1px] pointer-events-none select-none grayscale flex gap-6 p-4">
        {/* Editor Mock */}
        <div className="flex-1 bg-[#111114] border border-zinc-800/60 rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-zinc-800/60">
            <span className="text-sm font-bold tracking-widest" style={{ color: accent }}>AZOV</span>
            <div className="flex gap-2">
              <div className="w-16 h-6 bg-zinc-800 rounded" />
              <div className="w-20 h-6 bg-zinc-800 rounded" />
            </div>
          </div>
          <div className="flex-1 p-4 space-y-2">
            {[...Array(15)].map((_, i) => (
              <div key={i} className="h-3 bg-zinc-800/50 rounded w-full" style={{ width: `${Math.random() * 40 + 60}%` }} />
            ))}
          </div>
        </div>

        {/* Sidebar Mock */}
        <div className="w-64 flex flex-col gap-4">
          <div className="h-20 bg-[#111114] border border-zinc-800/60 rounded-xl" />
          <div className="h-10 bg-[#111114] border border-zinc-800/60 rounded-xl" />
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-[#111114] border border-zinc-800/60 rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      {/* WIP Overlay Content */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
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
          className="relative z-10 text-center space-y-8"
        >
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-3xl bg-zinc-900/80 border border-white/5 flex items-center justify-center shadow-[0_24px_48px_rgba(0,0,0,0.5)]">
              <Wrench size={40} className="text-white" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-white text-5xl font-black tracking-tighter uppercase italic drop-shadow-2xl">
              Cloud Configs
            </h2>
            <p className="text-zinc-500 text-[10px] font-black tracking-[0.6em] uppercase">
              Are Work In Progress
            </p>
          </div>

          <div className="pt-4 flex flex-col items-center gap-4">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
              <span className="text-[9px] text-zinc-300 font-bold tracking-widest uppercase">System Under Development</span>
            </div>
            <p className="text-zinc-600 text-[9px] font-medium max-w-[280px] leading-relaxed">
              We are currently overhauling the cloud synchronization engine. This feature will be available in the next major update.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}