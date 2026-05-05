import { motion } from 'framer-motion';

function ccNode(showCc) {
  if (!showCc) return null;
  return (
    <span style={{ color: '#ef4444', textShadow: '0 0 12px rgba(239,68,68,0.55)' }}>
      .CC
    </span>
  );
}

export default function BrandingMark({ animation = 'off', showCc = true, className = '', compact = false }) {
  const mode = String(animation || 'off').toLowerCase();

  if (mode === 'off') {
    return <span className={className}>AZOV{ccNode(showCc)}</span>;
  }

  if (mode === 'slide') {
    return (
      <span className={className}>
        A
        <motion.span
          initial={{ x: -12, opacity: 0 }}
          animate={{ x: [0, 0], opacity: [0, 1] }}
          transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 1.1, ease: 'easeOut' }}
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
        animate={{ y: [0, -1, 0, 1, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
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
          textShadow: [
            '0 0 0 rgba(255,255,255,0)',
            '1px 0 0 rgba(239,68,68,0.45), -1px 0 0 rgba(59,130,246,0.35)',
            '0 0 0 rgba(255,255,255,0)',
          ],
        }}
        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1.2 }}
      >
        AZOV{ccNode(showCc)}
      </motion.span>
    );
  }

  return (
    <motion.span
      className={className}
      animate={compact ? { opacity: [0.82, 1, 0.82] } : { scale: [1, 1.02, 1], opacity: [0.9, 1, 0.9] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      AZOV{ccNode(showCc)}
    </motion.span>
  );
}

