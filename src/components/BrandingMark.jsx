import { motion } from 'framer-motion';

function ccNode(showCc) {
  if (!showCc) return null;
  return (
    <span style={{ color: '#ef4444', textShadow: '0 0 12px rgba(239,68,68,0.55)' }}>
      .CC
    </span>
  );
}

export default function BrandingMark({ animation = 'slide', showCc = false, className = '', compact = false, loop = true }) {
  const mode = String(animation || 'slide').toLowerCase();

  if (mode === 'off') {
    return <span className={className}>ADDERAL{ccNode(showCc)}</span>;
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

  if (mode === 'blur') {
    return (
      <span className={className}>
        <motion.span
          className="inline-block"
          animate={{
            filter: ['blur(2.8px)', 'blur(0px)', 'blur(2.8px)'],
            opacity: [0.78, 1, 0.78],
          }}
          transition={{ duration: 2.4, repeat: loop ? Infinity : 0, ease: 'easeInOut' }}
        >
          ADDERAL
        </motion.span>
        {ccNode(showCc)}
      </span>
    );
  }

  if (mode === 'zoom') {
    return (
      <motion.span
        className={className}
        animate={{
          scale: compact ? [1, 1.06, 1] : [1, 1.09, 1],
          opacity: [0.86, 1, 0.86],
        }}
        transition={{ duration: 2.1, repeat: loop ? Infinity : 0, ease: 'easeInOut' }}
      >
        ADDERAL{ccNode(showCc)}
      </motion.span>
    );
  }

  if (mode === 'blink') {
    return (
      <motion.span
        className={className}
        animate={{ opacity: [1, 0.25, 1] }}
        transition={{ duration: 1.2, repeat: loop ? Infinity : 0, repeatDelay: 0.4 }}
      >
        ADDERAL{ccNode(showCc)}
      </motion.span>
    );
  }

  if (mode === 'drift') {
    return (
      <motion.span
        className={className}
        animate={{ x: [0, 6, 0, -6, 0], rotate: [0, 0.2, 0, -0.2, 0] }}
        transition={{ duration: 3.2, repeat: loop ? Infinity : 0, ease: 'easeInOut' }}
      >
        ADDERAL{ccNode(showCc)}
      </motion.span>
    );
  }

  if (mode === 'shimmer') {
    return (
      <motion.span
        className={className}
        animate={{
          backgroundPositionX: ['0%', '100%', '0%'],
          opacity: [0.85, 1, 0.85],
        }}
        transition={{ duration: 2.8, repeat: loop ? Infinity : 0, ease: 'easeInOut' }}
        style={{
          backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.68), rgba(255,255,255,1), rgba(255,255,255,0.68))',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          backgroundSize: '200% 100%',
        }}
      >
        ADDERAL
        {showCc ? (
          <span style={{ color: '#ef4444', textShadow: '0 0 12px rgba(239,68,68,0.55)' }}>.CC</span>
        ) : null}
      </motion.span>
    );
  }

  if (mode === 'type') {
    return (
      <span className={className}>
        <motion.span
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: ['0ch', '4ch'], opacity: [0, 1] }}
          transition={{ duration: 1.2, repeat: loop ? Infinity : 0, repeatDelay: 1.5, ease: 'easeOut' }}
          className="inline-block overflow-hidden whitespace-nowrap align-bottom"
        >
          ADDERAL
        </motion.span>
        {ccNode(showCc)}
      </span>
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
        ADDERAL{ccNode(showCc)}
      </motion.span>
    );
  }

  return (
    <span className={className}>ADDERAL{ccNode(showCc)}</span>
  );
}

