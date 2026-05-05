import { motion } from 'framer-motion';

function ccNode(showCc) {
  if (!showCc) return null;
  return (
    <span style={{ color: '#ef4444', textShadow: '0 0 12px rgba(239,68,68,0.55)' }}>
      .CC
    </span>
  );
}

export default function BrandingMark({ animation = 'pulse', showCc = true, className = '', compact = false, loop = true }) {
  const mode = String(animation || 'pulse').toLowerCase();

  if (mode === 'off') {
    return <span className={className}>AZOV{ccNode(showCc)}</span>;
  }

  if (mode === 'slide') {
    return (
      <span className={className}>
        A
        <motion.span
          initial={{ x: -30, opacity: 0, filter: 'blur(3px)' }}
          animate={{ x: [0, 0], opacity: [0, 1], filter: ['blur(3px)', 'blur(0px)'] }}
          transition={{ duration: 1.5, repeat: loop ? Infinity : 0, repeatDelay: 1.2, ease: 'easeOut' }}
          className="inline-block"
        >
          ZOV
        </motion.span>
        {ccNode(showCc)}
      </span>
    );
  }

  if (mode === 'wave') {
    const letters = ['A', 'Z', 'O', 'V'];
    return (
      <span className={className}>
        {letters.map((ch, idx) => (
          <motion.span
            key={`${ch}-${idx}`}
            className="inline-block"
            animate={{ y: [0, -8, 0, 8, 0], opacity: [0.9, 1, 0.9] }}
            transition={{
              duration: 1.8,
              delay: idx * 0.08,
              repeat: loop ? Infinity : 0,
              ease: 'easeInOut',
            }}
          >
            {ch}
          </motion.span>
        ))}
        {ccNode(showCc)}
      </span>
    );
  }

  if (mode === 'glitch') {
    return (
      <motion.span
        className={className}
        animate={{
          x: [0, -2, 2, -1, 1, 0],
          y: [0, 1, -1, 0],
          skewX: [0, -3, 3, 0],
          textShadow: [
            '0 0 0 rgba(255,255,255,0)',
            '3px 0 0 rgba(239,68,68,0.75), -3px 0 0 rgba(59,130,246,0.55)',
            '0 0 0 rgba(255,255,255,0)',
          ],
        }}
        transition={{ duration: 0.95, repeat: loop ? Infinity : 0, repeatDelay: 1.6 }}
      >
        AZOV{ccNode(showCc)}
      </motion.span>
    );
  }

  if (mode === 'pulse') {
    return (
      <motion.span
        className={className}
        animate={{
          scale: compact ? [1, 1.04, 1] : [1, 1.07, 1],
          opacity: [0.85, 1, 0.85],
          filter: [
            'drop-shadow(0 0 0 rgba(255,255,255,0))',
            'drop-shadow(0 0 14px rgba(255,255,255,0.35))',
            'drop-shadow(0 0 0 rgba(255,255,255,0))',
          ],
        }}
        transition={{ duration: 2.1, repeat: loop ? Infinity : 0, ease: 'easeInOut' }}
      >
        AZOV{ccNode(showCc)}
      </motion.span>
    );
  }

  return (
    <span className={className}>AZOV{ccNode(showCc)}</span>
  );
}

