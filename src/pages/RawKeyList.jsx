import { useEffect, useState } from 'react';
import { getLicenseKeys } from '@/lib/license-keys';

/**
 * Raw Key List Component
 * Serves an obfuscated/raw list of active internal keys
 * Path: /data/687832478326487236487236.txt (Simulated encrypted filename)
 */
export default function RawKeyList() {
  const [content, setContent] = useState('Loading...');

  useEffect(() => {
    async function fetchKeys() {
      try {
        const keys = await getLicenseKeys();
        // Filter for active internal keys only
        const activeInternalKeys = keys
          .filter(k => k.type === 'internal' && !k.used)
          .map(k => k.internal_key)
          .filter(Boolean);

        // Obfuscate with Base64 to prevent easy reading
        const rawString = activeInternalKeys.join('\n');
        const obfuscated = btoa(rawString);
        
        setContent(obfuscated);
      } catch (err) {
        setContent('Error loading data');
      }
    }
    fetchKeys();
  }, []);

  return (
    <pre style={{ 
      wordBreak: 'break-all', 
      whiteSpace: 'pre-wrap', 
      padding: '20px', 
      background: '#000', 
      color: '#0f0',
      minHeight: '100vh',
      margin: 0
    }}>
      {content}
    </pre>
  );
}
