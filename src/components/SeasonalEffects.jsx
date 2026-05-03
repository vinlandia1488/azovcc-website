import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Snowflake, Ghost, Leaf } from 'lucide-react';

export default function SeasonalEffects() {
  const [preset, setPreset] = useState(() => localStorage.getItem('azov_preset') || 'NONE');
  const [saveFps, setSaveFps] = useState(() => localStorage.getItem('azov_saveFps') === 'true');
  const [effectAmount, setEffectAmount] = useState(() => parseInt(localStorage.getItem('azov_effectAmount') || '30'));
  const [effectSpeed, setEffectSpeed] = useState(() => parseInt(localStorage.getItem('azov_effectSpeed') || '5'));
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentPreset = localStorage.getItem('azov_preset') || 'NONE';
      const currentFps = localStorage.getItem('azov_saveFps') === 'true';
      const currentAmount = parseInt(localStorage.getItem('azov_effectAmount') || '30');
      const currentSpeed = parseInt(localStorage.getItem('azov_effectSpeed') || '5');
      
      if (currentPreset !== preset) setPreset(currentPreset);
      if (currentFps !== saveFps) setSaveFps(currentFps);
      if (currentAmount !== effectAmount) setEffectAmount(currentAmount);
      if (currentSpeed !== effectSpeed) setEffectSpeed(currentSpeed);
    }, 500);

    return () => clearInterval(interval);
  }, [preset, saveFps, effectAmount, effectSpeed]);

  useEffect(() => {
    if (preset === 'NONE' || saveFps) {
      setParticles([]);
      return;
    }

    // Map speed (1-10) to duration (Fastest Speed 10 -> 2s, Slowest Speed 1 -> 20s)
    const baseDuration = (11 - effectSpeed) * 2;

    // Create particles based on effectAmount
    const newParticles = Array.from({ length: effectAmount }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 20 + 10,
      duration: baseDuration + (Math.random() * baseDuration * 0.5),
      delay: Math.random() * baseDuration,
    }));

    setParticles(newParticles);
  }, [preset, saveFps, effectAmount, effectSpeed]);

  if (preset === 'NONE' || saveFps) return null;

  return (
    <div className={`fixed inset-0 pointer-events-none z-[1] overflow-hidden transition-colors duration-1000 ${preset === 'HALLOWEEN' ? 'bg-black/20' : ''}`}>
      {/* Halloween Vibe Overlay */}
      {preset === 'HALLOWEEN' && (
        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/10 via-transparent to-black/40 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
      )}

      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ y: -50, x: `${p.x}vw`, opacity: 0, rotate: 0 }}
            animate={{ 
              y: '110vh', 
              opacity: [0, 1, 1, 0],
              rotate: preset === 'CHRISTMAS' ? 0 : 360,
              x: [`${p.x}vw`, `${p.x + 5}vw`, `${p.x - 5}vw`, `${p.x}vw`]
            }}
            transition={{ 
              duration: p.duration, 
              repeat: Infinity, 
              delay: p.delay,
              ease: "linear"
            }}
            className="absolute"
          >
            {preset === 'CHRISTMAS' && (
              <div 
                className="bg-white rounded-full blur-[1px]" 
                style={{ width: p.size / 4, height: p.size / 4, opacity: 0.6 }} 
              />
            )}
            {preset === 'HALLOWEEN' && (
              <div className="text-orange-500/30">
                <Ghost size={p.size} />
              </div>
            )}
            {preset === 'FALL' && (
              <div className="text-orange-700/40">
                <Leaf size={p.size} />
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Spooky Fog for Halloween */}
      {preset === 'HALLOWEEN' && (
        <motion.div 
          animate={{ x: ['-10%', '10%'] }}
          transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
          className="absolute bottom-0 left-[-20%] right-[-20%] h-64 bg-gradient-to-t from-zinc-900/40 to-transparent blur-3xl opacity-50"
        />
      )}
    </div>
  );
}
