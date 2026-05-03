import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Snowflake, Ghost, Leaf } from 'lucide-react';

export default function SeasonalEffects() {
  const [preset, setPreset] = useState(() => localStorage.getItem('azov_preset') || 'NONE');
  const [saveFps, setSaveFps] = useState(() => localStorage.getItem('azov_saveFps') === 'true');
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Poll for changes in localStorage since it might change from SettingsModal
    const interval = setInterval(() => {
      const currentPreset = localStorage.getItem('azov_preset') || 'NONE';
      const currentFps = localStorage.getItem('azov_saveFps') === 'true';
      if (currentPreset !== preset) setPreset(currentPreset);
      if (currentFps !== saveFps) setSaveFps(currentFps);
    }, 500);

    return () => clearInterval(interval);
  }, [preset, saveFps]);

  useEffect(() => {
    if (preset === 'NONE' || saveFps) {
      setParticles([]);
      return;
    }

    // Create initial particles
    const particleCount = preset === 'CHRISTMAS' ? 30 : 15;
    const newParticles = Array.from({ length: particleCount }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 20 + 10,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 20,
    }));

    setParticles(newParticles);
  }, [preset, saveFps]);

  if (preset === 'NONE' || saveFps) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ y: -50, x: `${p.x}vw`, opacity: 0, rotate: 0 }}
            animate={{ 
              y: '110vh', 
              opacity: [0, 1, 1, 0],
              rotate: preset === 'CHRISTMAS' ? 360 : 180,
              x: `${p.x + (Math.random() * 10 - 5)}vw`
            }}
            transition={{ 
              duration: p.duration, 
              repeat: Infinity, 
              delay: p.delay,
              ease: "linear"
            }}
            className="absolute text-white/20"
          >
            {preset === 'CHRISTMAS' && <Snowflake size={p.size} />}
            {preset === 'HALLOWEEN' && <Ghost size={p.size} />}
            {preset === 'FALL' && <Leaf size={p.size} />}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
