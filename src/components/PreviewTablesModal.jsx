import { useState, useEffect } from 'react';
import { X, FileText, Code2 } from 'lucide-react';
import { getPreviewConfig, getScriptPreviewConfig, getConfigTemplatesShared } from '@/lib/config-templates';

export default function PreviewTablesModal({ onClose }) {
  const [tab, setTab] = useState('internal');
  const [previewConfig, setPreviewConfig] = useState(getPreviewConfig());
  const [scriptPreviewConfig, setScriptPreviewConfig] = useState(getScriptPreviewConfig());

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const templates = await getConfigTemplatesShared();
        if (templates.previewConfig) {
          setPreviewConfig(templates.previewConfig);
        }
        if (templates.scriptPreviewConfig) {
          setScriptPreviewConfig(templates.scriptPreviewConfig);
        }
      } catch (err) {
        console.error('Failed to fetch preview config:', err);
      }
    }
    fetchTemplates();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111114] border border-zinc-800/60 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setTab('internal')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${tab === 'internal' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <FileText size={16} className={tab === 'internal' ? 'text-blue-400' : ''} />
              <span className="font-medium text-sm">Internal Table</span>
            </button>
            <button 
              onClick={() => setTab('script')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${tab === 'script' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Code2 size={16} className={tab === 'script' ? 'text-red-400' : ''} />
              <span className="font-medium text-sm">Script Table</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="text-zinc-400 hover:text-white text-sm transition">Back</button>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Label */}
        <div className="px-4 py-2 border-b border-zinc-800/60">
          <span className="text-zinc-500 text-xs">{tab === 'internal' ? 'internal' : 'script'} · read-only preview</span>
        </div>

        {/* Code */}
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-sm text-zinc-300 font-mono leading-relaxed whitespace-pre">
            <code>{tab === 'internal' ? previewConfig : scriptPreviewConfig}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}