import { motion, AnimatePresence } from 'framer-motion';
import { FORUM_SECTIONS, CATEGORY_HEADER, ROW_BASE } from '@/lib/forum-sections';

export default function ForumHomePanel({
  postCounts = {},
  latestPreviews = {},
  isAdmin = false,
  showForumsMenu,
  onOpenForums,
  onCloseForums,
  onSelectSection,
}) {
  const totalPosts = Object.values(postCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      <div className="pt-2">
        <h1 className="text-white font-black text-4xl tracking-tighter leading-none mb-1">
          adderall
        </h1>
      </div>

      <AnimatePresence mode="wait">
        {!showForumsMenu ? (
          <motion.div
            key="forums-entry"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 max-w-2xl"
          >
            {/* Community + Forums as one attached card */}
            <div className="border border-[#1f1f26] rounded-sm overflow-hidden">
              {/* COMMUNITY header row */}
              <div className="bg-[#121215] border-b border-[#1f1f26] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] bg-gradient-to-b from-white/[0.03] to-transparent px-5 py-2.5 text-[9px] font-bold tracking-[0.2em] text-zinc-500 uppercase">
                COMMUNITY
              </div>
              {/* FORUMS row */}
              <div
                onClick={onOpenForums}
                className="bg-[#0e0e11] shadow-[inset_0_1px_0_rgba(255,255,255,0.01)] p-6 flex items-center justify-between hover:bg-[#111115] transition-all cursor-pointer group"
              >
                <div className="pr-4">
                  <h3 className="text-zinc-200 font-black text-xl group-hover:text-white transition-all tracking-tight uppercase">
                    Forums
                  </h3>
                  <p className="text-[9px] text-zinc-600 mt-1.5 font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
                    Join the discussion, see updates and media
                  </p>
                </div>
                <div className="flex items-center gap-6 min-w-[100px] justify-end">
                  <div className="flex flex-col items-center">
                    <span className="text-xl font-black text-zinc-300 leading-none">{totalPosts}</span>
                    <span className="text-[7px] font-bold text-zinc-500 tracking-widest mt-1 uppercase font-mono">
                      Total Posts
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="forums-categories"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 max-w-2xl"
          >
            <button
              onClick={onCloseForums}
              className="text-zinc-600 hover:text-white text-[9px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 mb-4 transition-colors group"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span> Back
            </button>
            {FORUM_SECTIONS.map(cat => (
              <div key={cat.category} className="w-full">
                <div className={CATEGORY_HEADER}>{cat.category}</div>
                {cat.rows.map(row => {
                  const locked = row.adminOnly && !isAdmin;
                  const latest = latestPreviews[row.id];
                  return (
                    <div
                      key={row.id}
                      onClick={() => !locked && onSelectSection(row)}
                      className={`${ROW_BASE} ${locked ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                    >
                      <div className="pr-4">
                        <h3 className="text-zinc-200 font-bold text-sm group-hover:text-white transition-colors">
                          {row.label}
                        </h3>
                        {latest ? (
                          <p className="text-[10px] text-zinc-600 truncate max-w-[300px] mt-1 italic opacity-60 group-hover:opacity-100 transition-opacity">
                            Latest: {latest.title}
                          </p>
                        ) : (
                          <span className="text-[9px] text-zinc-700 uppercase font-mono tracking-wider mt-1 block">
                            No updates yet
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-8 min-w-[150px] justify-end">
                        <div className="flex flex-col items-center">
                          <span className="text-base font-bold text-zinc-300 leading-none">
                            {postCounts[row.id] ?? 0}
                          </span>
                          <span className="text-[7px] font-bold text-zinc-500 tracking-wider mt-1 uppercase font-mono">
                            Posts
                          </span>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-zinc-600 tracking-wider uppercase">
                          {postCounts[row.id] ? 'Active' : 'Empty'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
