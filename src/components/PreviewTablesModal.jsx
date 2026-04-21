import { useMemo } from 'react';
import { X, FileText } from 'lucide-react';
import { getPreviewConfig } from '@/lib/config-templates';

export default function PreviewTablesModal({ onClose }) {
  const previewConfig = useMemo(() => getPreviewConfig(), []);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111114] border border-zinc-800/60 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-blue-400" />
            <span className="text-white font-medium">Internal Table</span>
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
          <span className="text-zinc-500 text-xs">internal · read-only preview</span>
        </div>

        {/* Code */}
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-sm text-zinc-300 font-mono leading-relaxed whitespace-pre">
            <code>{previewConfig}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}