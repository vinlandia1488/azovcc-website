export const FORUM_SECTIONS = [
  {
    category: 'ADDERALL',
    rows: [
      { id: 'updates-news', label: 'Updates & News', adminOnly: true },
    ],
  },
  {
    category: 'COMMUNITY & FORUMS',
    rows: [
      { id: 'media', label: 'Media', adminOnly: false },
    ],
  },
  {
    category: 'PURCHASE',
    rows: [
      { id: 'store-licenses', label: 'Store & Licenses', adminOnly: true },
    ],
  },
];

export const CATEGORY_HEADER =
  'bg-[#121215] border border-[#1f1f26] border-t-[#2a2a2f] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] bg-gradient-to-b from-white/[0.03] to-transparent px-5 py-3 text-[10px] font-bold tracking-widest text-zinc-400 uppercase rounded-t-sm';

export const ROW_BASE =
  'bg-[#0e0e11] border-x border-b border-[#1f1f26] shadow-[inset_0_1px_0_rgba(255,255,255,0.01)] p-5 flex items-center justify-between hover:bg-[#111115] transition-colors cursor-pointer group';
