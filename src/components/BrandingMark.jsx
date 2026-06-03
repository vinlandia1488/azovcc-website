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
    return <span className={className}>ADDERALL{ccNode(showCc)}</span>;
  }

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: loop ? [0.6, 1, 0.6] : 1 }}
      transition={{ duration: 2.2, repeat: loop ? Infinity : 0, ease: 'easeInOut' }}
    >
      ADDERALL{ccNode(showCc)}
    </motion.span>
  );
}

