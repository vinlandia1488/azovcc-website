import { useState, useEffect } from 'react';

export default function MaintenanceScreen({ from, to }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!to) return;
    const update = () => {
      const diff = new Date(to).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Maintenance is complete, waiting for server refresh...');
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      
      const parts = [];
      if (d > 0) parts.push(`${d}d`);
      if (h > 0) parts.push(`${h}h`);
      if (m > 0) parts.push(`${m}m`);
      if (s > 0 || parts.length === 0) parts.push(`${s}s`);
      
      setTimeLeft(parts.join(' '));
    };
    update();
    const int = setInterval(update, 1000);
    return () => clearInterval(int);
  }, [to]);

  return (
    <div className="fixed inset-0 bg-[#07070a] flex flex-col items-center justify-center text-white z-[9999]">
      <p className="text-white text-lg font-medium mb-2">azov is in maintenance</p>
      {to && (
        <p className="text-zinc-500 text-sm font-mono mt-2">
          {timeLeft}
        </p>
      )}
    </div>
  );
}
