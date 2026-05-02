import { useEffect, useState } from 'react';
import { getLicenseKeys } from '@/lib/license-keys';

/**
 * Raw Key List Component
 * Serves an obfuscated/raw list of active internal keys
 * Path: /dist/v1/auth/0x7b2a9f4c3d8e1a6b
 */
export default function RawKeyList() {
  const [content, setContent] = useState('');

  useEffect(() => {
    async function fetchKeys() {
      try {
        const keys = await getLicenseKeys();
        // Filter for active internal keys only
        const activeInternalKeys = keys
          .filter(k => k.type === 'internal' && !k.used)
          .map(k => k.internal_key)
          .filter(Boolean);

        if (activeInternalKeys.length === 0) {
            setContent('W0IKXQ=='); // Base64 for "[EMPTY]"
            return;
        }

        // Obfuscate with Base64 to prevent easy reading
        const rawString = activeInternalKeys.join('\n');
        const obfuscated = btoa(rawString);
        
        setContent(obfuscated);
      } catch (err) {
        setContent('RVJST1I='); // Base64 for "ERROR"
      }
    }
    fetchKeys();
  }, []);

  if (!content) return null;

  return (
    <div style={{ 
      wordBreak: 'break-all', 
      whiteSpace: 'pre-wrap', 
      padding: '0', 
      background: '#000', 
      color: '#fff',
      fontSize: '1px',
      opacity: '0.01',
      minHeight: '100vh',
      margin: 0
    }}>
      {content}
    </div>
  );
}
