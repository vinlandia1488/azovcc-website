import { Home, CloudUpload, Shield, Download, MessageSquare, GripVertical, MessagesSquare } from 'lucide-react';
import { motion } from 'framer-motion';

function isLight(hex) {
  const h = (hex || '').replace('#', '');
  if (h.length < 6) return false;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

const tabs = [
  { id: 'dashboard', label: 'DASHBOARD', icon: Home },
  { id: 'downloads', label: 'DOWNLOADS', icon: Download },
  { id: 'cloud-configs', label: 'CLOUD CONFIGS', icon: CloudUpload },
  { id: 'chat', label: 'CHAT', icon: MessageSquare },
  { id: 'panel', label: 'PANEL', icon: Shield, adminOnly: true },
];



export default function NavTabs({ activeTab, setActiveTab, accent, isAdmin, orientation = 'horizontal' }) {
  const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin);
  const isVertical = orientation === 'vertical';

  return (
    <motion.div 
      layout
      className={`flex ${isVertical ? 'flex-col p-3' : 'items-center px-2 py-1.5'} gap-1 bg-[#111]/90 backdrop-blur-md border border-[#222] rounded-lg shadow-2xl`}
    >
      <motion.div layout className={`text-zinc-700 hidden md:block ${isVertical ? 'mx-auto mb-2 rotate-90' : 'pl-1 pr-0.5'}`}>
        <GripVertical size={14} />
      </motion.div>


      {visibleTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const TabIcon = tab.icon;
        return (
          <motion.button
            layout
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wider ${isVertical ? 'w-full justify-center lg:justify-start' : ''}`}

            style={isActive ? {
              background: accent,
              color: isLight(accent) ? '#000' : '#fff',
            } : {
              color: '#71717a',
              background: 'transparent',
            }}
          >
            <TabIcon size={13} />
            <span className={isVertical ? 'hidden lg:inline' : 'inline'}>
              {tab.label}
            </span>
          </motion.button>
        );

      })}
    </motion.div>

  );
}