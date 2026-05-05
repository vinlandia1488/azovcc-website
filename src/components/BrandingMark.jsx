import { motion } from 'framer-motion';

function ccNode(showCc) {
  if (!showCc) return null;
  return (
    <span style={{ color: '#ef4444', textShadow: '0 0 12px rgba(239,68,68,0.55)' }}>
      .CC
    </span>
  );
}

export default function BrandingMark({ animation = 'off', showCc = true, className = '', compact = false, loop = true }) {
  const mode = String(animation || 'off').toLowerCase();

  if (mode === 'off') {
    return <span className={className}>AZOV{ccNode(showCc)}</span>;
  }

  if (mode === 'slide') {
    return (
      <span className={className}>
        A
        <motion.span
          initial={{ x: -18, opacity: 0 }}
          animate={{ x: [0, 0], opacity: [0, 1] }}
          transition={{ duration: 1.4, repeat: loop ? Infinity : 0, repeatDelay: 1.4, ease: 'easeOut' }}
          className="inline-block"
        >
          ZOV
        </motion.span>
        {ccNode(showCc)}
      </span>
    );
  }

  if (mode === 'wave') {
    return (
      <motion.span
        className={className}
        animate={{ y: [0, -5, 0, 5, 0] }}
        transition={{ duration: 2.8, repeat: loop ? Infinity : 0, ease: 'easeInOut' }}
      >
        AZOV{ccNode(showCc)}
      </motion.span>
    );
  }

  if (mode === 'glitch') {
    return (
      <motion.span
        className={className}
        animate={{
          x: [0, -1, 1, 0],
          skewX: [0, -2, 2, 0],
          textShadow: [
            '0 0 0 rgba(255,255,255,0)',
            '2px 0 0 rgba(239,68,68,0.7), -2px 0 0 rgba(59,130,246,0.5)',
            '0 0 0 rgba(255,255,255,0)',
          ],
        }}
        transition={{ duration: 0.9, repeat: loop ? Infinity : 0, repeatDelay: 2.2 }}
      >
        AZOV{ccNode(showCc)}
      </motion.span>
    );
  }

  return (
    <motion.span
      className={className}
      animate={compact ? { scale: [1, 1.05, 1], opacity: [0.78, 1, 0.78] } : { scale: [1, 1.06, 1], opacity: [0.88, 1, 0.88] }}
      transition={{ duration: 2.8, repeat: loop ? Infinity : 0, ease: 'easeInOut' }}
    >
      AZOV{ccNode(showCc)}
    </motion.span>
  );
}

