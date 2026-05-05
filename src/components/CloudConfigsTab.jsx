import { Wrench } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CloudConfigsTab({ accent }) {
  return (
    <div className="relative min-h-[500px] w-full flex items-center justify-center bg-[#07070a] rounded-2xl border border-zinc-800/60 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] blur-[120px] opacity-20 rounded-full"
          style={{ background: accent }}
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 text-center space-y-6"
      >
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-center shadow-2xl">
            <Wrench size={32} className="text-white" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-white text-4xl font-black tracking-tighter uppercase italic">
            Cloud Configs
          </h2>
          <p className="text-zinc-500 text-xs font-black tracking-[0.4em] uppercase">
            Are Work In Progress
          </p>
        </div>

        <div className="pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] text-zinc-400 font-bold tracking-widest uppercase">Development Phase</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}