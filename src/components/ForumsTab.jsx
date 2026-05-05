import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Send, X, MessagesSquare, Search, MessageCircle, Trash2, ChevronDown } from 'lucide-react';
import { getBackendDb } from '@/lib/backend';

const db = getBackendDb();
const FORUM_POST_TYPE = '__FORUM_POST__';
const FORUM_COMMENT_TYPE = '__FORUM_COMMENT__';

function isLightColor(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length < 6) return false;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

export default function ForumsTab({ session, accent }) {
  const [posts, setPosts] = useState([]);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pendingImage, setPendingImage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openPostId, setOpenPostId] = useState(null);
  const fileInputRef = useRef(null);
  const replyTextByPostRef = useRef({});
  const replyImageByPostRef = useRef({});
  const replyFileInputByPostRef = useRef({});
  const [, forceRender] = useState(0);

  const accentText = isLightColor(accent) ? '#000' : '#fff';

  async function loadPosts() {
    try {
      const rows = await db.entities.CloudConfig.filter({ name: FORUM_POST_TYPE });
      const parsed = (rows || [])
        .map((r) => {
          try {
            const obj = JSON.parse(r.content);
            return { ...obj, id: r.id, created_at: r.created_date };
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setPosts(parsed);

      const commentRows = await db.entities.CloudConfig.filter({ name: FORUM_COMMENT_TYPE });
      const parsedComments = (commentRows || [])
        .map((r) => {
          try {
            const obj = JSON.parse(r.content);
            return { ...obj, id: r.id, created_at: r.created_date };
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      const bucket = {};
      for (const c of parsedComments) {
        const pid = c.post_id;
        if (!pid) continue;
        if (!bucket[pid]) bucket[pid] = [];
        bucket[pid].push(c);
      }
      setCommentsByPost(bucket);
    } catch (err) {
      console.error('Forums load failed:', err);
      setPosts([]);
      setCommentsByPost({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
    const interval = setInterval(loadPosts, 8000);
    return () => clearInterval(interval);
  }, []);

  async function createPost(e) {
    e.preventDefault();
    if (!title.trim() && !body.trim() && !pendingImage?.file) return;
    setPosting(true);
    let imageUrl = '';
    try {
      if (pendingImage?.file) {
        const { file_url } = await db.integrations.Core.UploadFile({ file: pendingImage.file });
        imageUrl = file_url;
      }

      const payload = {
        username: session.username,
        title: title.trim(),
        body: body.trim(),
        image_url: imageUrl,
        created_at: new Date().toISOString(),
        pfp: session.profile_pic || '',
      };

      await db.entities.CloudConfig.create({
        owner_username: session.username,
        name: FORUM_POST_TYPE,
        content: JSON.stringify(payload),
      });

      setTitle('');
      setBody('');
      if (pendingImage) {
        URL.revokeObjectURL(pendingImage.previewUrl);
        setPendingImage(null);
      }
      await loadPosts();
    } catch (err) {
      alert('Failed to create post: ' + (err?.message || 'Unknown error'));
    } finally {
      setPosting(false);
    }
  }

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) => {
      return (
        String(p.username || '').toLowerCase().includes(q) ||
        String(p.title || '').toLowerCase().includes(q) ||
        String(p.body || '').toLowerCase().includes(q)
      );
    });
  }, [posts, searchQuery]);

  async function createComment(postId) {
    const text = String(replyTextByPostRef.current[postId] || '').trim();
    const pendingReplyImg = replyImageByPostRef.current[postId] || null;
    if (!text && !pendingReplyImg?.file) return;

    let imageUrl = '';
    try {
      if (pendingReplyImg?.file) {
        const { file_url } = await db.integrations.Core.UploadFile({ file: pendingReplyImg.file });
        imageUrl = file_url;
      }

      const payload = {
        post_id: postId,
        username: session.username,
        content: text,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
        pfp: session.profile_pic || '',
      };

      await db.entities.CloudConfig.create({
        owner_username: session.username,
        name: FORUM_COMMENT_TYPE,
        content: JSON.stringify(payload),
      });

      replyTextByPostRef.current[postId] = '';
      if (pendingReplyImg?.previewUrl) URL.revokeObjectURL(pendingReplyImg.previewUrl);
      replyImageByPostRef.current[postId] = null;
      forceRender((v) => v + 1);

      await loadPosts();
    } catch (err) {
      alert('Failed to reply: ' + (err?.message || 'Unknown error'));
    }
  }

  async function deletePost(postId) {
    if (!session?.is_admin) return;
    try {
      const related = commentsByPost[postId] || [];
      await Promise.allSettled(related.map((c) => db.entities.CloudConfig.delete(c.id)));
      await db.entities.CloudConfig.delete(postId);
      if (openPostId === postId) setOpenPostId(null);
      await loadPosts();
    } catch (err) {
      alert('Failed to delete post: ' + (err?.message || 'Unknown error'));
    }
  }

  async function deleteComment(commentId) {
    if (!session?.is_admin) return;
    try {
      await db.entities.CloudConfig.delete(commentId);
      await loadPosts();
    } catch (err) {
      alert('Failed to delete reply: ' + (err?.message || 'Unknown error'));
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in zoom-in duration-300">
      <div className="bg-[#111114] border border-zinc-800/60 rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-6 py-5 border-b border-zinc-800/60 flex items-center justify-between bg-[#0c0c0e]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <MessagesSquare size={16} style={{ color: accent }} />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Forums</h3>
              <p className="text-zinc-600 text-[10px] uppercase tracking-widest">Post updates & images</p>
            </div>
          </div>

          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts..."
              className="bg-[#111114] border border-zinc-800/60 rounded-2xl pl-9 pr-4 py-2 text-[11px] text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition w-64"
            />
          </div>
        </div>

        <div className="p-6 bg-[#07070a]">
          {pendingImage && (
            <div className="mb-4 relative inline-block">
              <img src={pendingImage.previewUrl} alt="Preview" className="h-20 rounded-2xl object-cover border border-zinc-800/60" />
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(pendingImage.previewUrl);
                  setPendingImage(null);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-900 border border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X size={12} />
              </button>
            </div>
          )}

          <form onSubmit={createPost} className="space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full bg-[#111114] border border-zinc-800/60 text-white rounded-2xl px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition"
            />

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write something..."
              rows={4}
              className="w-full bg-[#111114] border border-zinc-800/60 text-white rounded-2xl px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition resize-none"
            />

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setPendingImage({ file, previewUrl: URL.createObjectURL(file) });
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[#111114] border border-zinc-800/60 text-zinc-400 hover:text-white hover:border-zinc-700/70 transition"
                aria-label="Attach image"
              >
                <ImagePlus size={18} />
              </button>

              <button
                type="submit"
                disabled={posting || (!title.trim() && !body.trim() && !pendingImage)}
                className="h-11 px-5 rounded-2xl text-xs font-black uppercase tracking-widest transition disabled:opacity-40 flex items-center gap-2"
                style={{ background: accent, color: accentText }}
              >
                <Send size={14} />
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-[#111114] border border-zinc-800/60 rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-zinc-800/60 bg-[#0c0c0e]">
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">
            {loading ? 'Loading...' : `${filteredPosts.length} post${filteredPosts.length === 1 ? '' : 's'}`}
          </p>
        </div>

        <div className="bg-[#07070a] max-h-[calc(100vh-340px)] overflow-y-auto custom-scrollbar p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-12 text-center text-zinc-600 text-sm">
              No posts yet.
            </div>
          ) : (
            filteredPosts.map((p) => (
              <div
                key={p.id}
                className={`bg-[#111114] border border-zinc-800/60 rounded-3xl p-5 transition ${
                  openPostId === p.id ? 'border-zinc-700/80' : 'hover:border-zinc-700/60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 shrink-0">
                    {p.pfp ? (
                      <img src={p.pfp} alt="pfp" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-600">
                        {String(p.username || '?').substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setOpenPostId((cur) => (cur === p.id ? null : p.id))}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-white text-sm font-bold truncate">{p.title || 'Untitled'}</p>
                          <p className="text-zinc-500 text-[10px] uppercase tracking-widest">
                            {p.username} • {new Date(p.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-2 text-zinc-500 text-[10px] uppercase tracking-widest font-bold">
                            <MessageCircle size={12} />
                            {(commentsByPost[p.id]?.length || 0)}
                          </div>
                          <ChevronDown
                            size={16}
                            className={`text-zinc-500 transition ${openPostId === p.id ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </div>
                    </button>

                    {session?.is_admin && (
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => deletePost(p.id)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/15 transition text-[11px] font-bold"
                        >
                          <Trash2 size={14} />
                          Delete post
                        </button>
                      </div>
                    )}

                    {openPostId === p.id && p.body && (
                      <p className="text-zinc-300 text-sm mt-3 whitespace-pre-wrap">
                        {p.body}
                      </p>
                    )}

                    {openPostId === p.id && p.image_url && (
                      <img
                        src={p.image_url}
                        alt="Attachment"
                        className="mt-4 max-w-full h-auto max-h-96 object-contain rounded-2xl border border-zinc-800/60 cursor-pointer"
                        onClick={() => window.open(p.image_url, '_blank')}
                      />
                    )}

                    {openPostId === p.id && (
                      <div className="mt-5 pt-4 border-t border-zinc-800/60 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-zinc-500 text-[10px] uppercase tracking-widest font-bold">
                            <MessageCircle size={12} />
                            {(commentsByPost[p.id]?.length || 0)} Replies
                          </div>
                        </div>

                        {(commentsByPost[p.id] || []).map((c) => (
                          <div key={c.id} className="flex items-start gap-3 bg-[#0c0c0e] border border-zinc-800/60 rounded-2xl p-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 shrink-0">
                            {c.pfp ? (
                              <img src={c.pfp} alt="pfp" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-600">
                                {String(c.username || '?').substring(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-zinc-300 text-[11px] font-bold truncate">{c.username}</p>
                              <div className="flex items-center gap-2 shrink-0">
                                <p className="text-zinc-600 text-[9px]">{new Date(c.created_at).toLocaleString()}</p>
                                {session?.is_admin && (
                                  <button
                                    type="button"
                                    onClick={() => deleteComment(c.id)}
                                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-300 hover:bg-red-500/10 transition"
                                    aria-label="Delete reply"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                            {c.content && (
                              <p className="text-zinc-300 text-sm mt-2 whitespace-pre-wrap">{c.content}</p>
                            )}
                            {c.image_url && (
                              <img
                                src={c.image_url}
                                alt="Reply attachment"
                                className="mt-3 max-w-full h-auto max-h-64 object-contain rounded-2xl border border-zinc-800/60 cursor-pointer"
                                onClick={() => window.open(c.image_url, '_blank')}
                              />
                            )}
                          </div>
                          </div>
                        ))}

                        <div className="bg-[#0c0c0e] border border-zinc-800/60 rounded-2xl p-3">
                        {replyImageByPostRef.current[p.id]?.previewUrl && (
                          <div className="mb-3 relative inline-block">
                            <img
                              src={replyImageByPostRef.current[p.id].previewUrl}
                              alt="Preview"
                              className="h-16 rounded-xl object-cover border border-zinc-800/60"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const prev = replyImageByPostRef.current[p.id];
                                if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
                                replyImageByPostRef.current[p.id] = null;
                                forceRender((v) => v + 1);
                              }}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-900 border border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white"
                              aria-label="Remove reply image"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}

                        <div className="flex items-end gap-3">
                          <textarea
                            value={replyTextByPostRef.current[p.id] || ''}
                            onChange={(e) => {
                              replyTextByPostRef.current[p.id] = e.target.value;
                              forceRender((v) => v + 1);
                            }}
                            placeholder="Write a reply..."
                            rows={1}
                            className="flex-1 bg-[#111114] border border-zinc-800/60 text-white rounded-2xl px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition resize-none"
                            style={{ maxHeight: '120px' }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                createComment(p.id);
                              }
                            }}
                          />

                          <input
                            ref={(el) => {
                              replyFileInputByPostRef.current[p.id] = el;
                            }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              replyImageByPostRef.current[p.id] = { file, previewUrl: URL.createObjectURL(file) };
                              forceRender((v) => v + 1);
                            }}
                          />

                          <button
                            type="button"
                            onClick={() => replyFileInputByPostRef.current[p.id]?.click()}
                            className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[#111114] border border-zinc-800/60 text-zinc-400 hover:text-white hover:border-zinc-700/70 transition"
                            aria-label="Attach reply image"
                          >
                            <ImagePlus size={18} />
                          </button>

                          <button
                            type="button"
                            onClick={() => createComment(p.id)}
                            disabled={false}
                            className="w-11 h-11 rounded-2xl flex items-center justify-center transition"
                            style={{ background: accent, color: accentText }}
                            aria-label="Send reply"
                          >
                            <Send size={16} />
                          </button>
                        </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

