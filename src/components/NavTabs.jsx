import { Home, CloudUpload, Shield, Download, MessageSquare, GripVertical } from 'lucide-react';


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

export default function NavTabs({ activeTab, setActiveTab, accent, isAdmin }) {
  const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin);

  return (
    <div className="flex items-center gap-1 bg-[#111114]/90 backdrop-blur-md border border-zinc-800/60 rounded-full px-2 py-1.5 shadow-2xl">
      <div className="pl-1 pr-0.5 text-zinc-700 hidden md:block">
        <GripVertical size={14} />
      </div>

      {visibleTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const TabIcon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wider transition-all duration-200"
            style={isActive ? {
              background: accent,
              color: isLight(accent) ? '#000' : '#fff',
            } : {
              color: '#71717a',
              background: 'transparent',
            }}
          >
            <TabIcon size={13} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}