import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, X, ImagePlus, Send, Trash2 } from 'lucide-react';
import { getPostsBySection, createPost, deletePost, uploadImage } from '@/lib/forum';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ForumSection({ section, session, onBack }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImg, setUploadingImg] = useState(false);

  const canPost = section.adminOnly ? session?.is_admin : true;

  async function loadPosts() {
    setLoading(true);
    try {
      setPosts(await getPostsBySection(section.id));
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPosts(); }, [section.id]);

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      setImageUrl(await uploadImage(file));
    } catch {
      setError('Failed to upload image.');
    } finally {
      setUploadingImg(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await createPost({
        section: section.id,
        title: title.trim(),
        body: body.trim(),
        image_url: imageUrl,
        author: session.username,
        is_admin: session.is_admin || false,
      });
      setTitle(''); setBody(''); setImageUrl('');
      setShowForm(false);
      await loadPosts();
    } catch (err) {
      setError(err.message || 'Failed to post.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(postId) {
    if (!session?.is_admin) return;
    try {
      await deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch {}
  }

  return (
    <motion.div
      key="forum-section"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Section header */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-zinc-500 hover:text-white transition-colors flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold font-mono"
          >
            <ArrowLeft size={13} /> Back
          </button>
          <span className="text-zinc-700 text-xs">·</span>
          <h2 className="text-white font-bold text-sm uppercase tracking-widest">{section.label}</h2>
          {section.adminOnly && (
            <span className="text-[9px] font-bold uppercase tracking-widest text-red-500/80 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5">
              ADMIN ONLY
            </span>
          )}
        </div>
        {canPost && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-white text-black hover:bg-zinc-200 text-[10px] font-bold uppercase tracking-widest px-4 py-2 transition-colors outline outline-1 outline-white/20 outline-offset-2"
          >
            <Plus size={12} />
            New Post
          </button>
        )}
      </div>

      {/* New Post Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            key="post-form"
            initial={{ opacity: 0, scaleY: 0.95, transformOrigin: 'top' }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0.95 }}
            transition={{ duration: 0.15 }}
            onSubmit={handleSubmit}
            className="bg-[#111114] border border-[#222] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">New Post</span>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(''); }}
                className="text-zinc-600 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div>
              <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Post title..."
                maxLength={120}
                className="w-full bg-[#0b0b0d] border border-[#222] text-white rounded-none px-3 py-2.5 text-xs placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block mb-1.5">Content</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write something..."
                rows={4}
                className="w-full bg-[#0b0b0d] border border-[#222] text-white rounded-none px-3 py-2.5 text-xs placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
              />
            </div>

            <div>
              <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block mb-1.5">Image <span className="text-zinc-700">(optional)</span></label>
              {imageUrl ? (
                <div className="relative inline-block">
                  <img src={imageUrl} alt="Preview" className="max-h-40 border border-[#333] object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-1 right-1 bg-black/70 text-white p-0.5 hover:bg-red-500/80 transition-colors"
                  >
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <label className="inline-flex items-center gap-2 cursor-pointer bg-[#0b0b0d] border border-[#222] px-3 py-2 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors text-xs">
                  <ImagePlus size={13} />
                  {uploadingImg ? 'Uploading...' : 'Attach Image'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImg}
                  />
                </label>
              )}
            </div>

            {error && (
              <p className="text-red-400 text-[10px] bg-red-400/5 border border-red-400/10 px-3 py-2 font-mono">{error}</p>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors outline outline-1 outline-white/20 outline-offset-2"
              >
                <Send size={11} />
                {submitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Post list */}
      <div className="w-full space-y-4">
        {loading ? (
          <div className="p-10 text-center text-zinc-600 text-[10px] font-mono uppercase tracking-widest animate-pulse">
            Loading Feed...
          </div>
        ) : posts.length === 0 ? (
          <div className="p-10 text-center border border-[#1f1f26] bg-[#0e0e11]/40">
            <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest">No updates found.</p>
          </div>
        ) : (
          posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[#0e0e11] border border-[#1f1f26] p-5 group hover:border-[#2a2a35] transition-all relative overflow-hidden"
            >
              {post.is_pinned && (
                <div className="absolute top-0 left-0 w-1 h-full bg-white/20" />
              )}
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[8px] font-black tracking-[0.15em] text-zinc-500 uppercase">
                      <span className={`w-1 h-1 rounded-full ${post.is_admin ? 'bg-white' : 'bg-zinc-700'}`} />
                      {post.tag || (post.is_admin ? 'NEWS' : 'COMMUNITY')}
                    </span>
                    {post.is_pinned && (
                      <span className="text-[7px] font-black tracking-[0.2em] bg-white/10 text-white/80 px-1.5 py-0.5 rounded-none uppercase">
                        PINNED
                      </span>
                    )}
                  </div>
                  <span className="text-[8px] font-black tracking-[0.2em] text-zinc-600 uppercase font-mono">
                    {timeAgo(post.created_at)}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-base md:text-lg tracking-tight leading-tight group-hover:text-zinc-200 transition-colors">
                      {post.title}
                    </h3>
                    {post.body && (
                      <p className="text-zinc-500 text-xs mt-2 leading-relaxed whitespace-pre-wrap font-medium max-w-2xl line-clamp-3">
                        {post.body}
                      </p>
                    )}
                    
                    {post.image_url && (
                      <div className="mt-4 overflow-hidden border border-white/5 bg-black/40 max-w-sm">
                        <img
                          src={post.image_url}
                          alt="Post media"
                          className="w-full h-auto max-h-[300px] object-contain cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => window.open(post.image_url, '_blank')}
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-4">
                      <span className="text-zinc-700 text-[9px] font-bold uppercase tracking-widest">
                        BY <span className="text-zinc-500">@{post.author}</span>
                      </span>
                    </div>
                  </div>

                  {session?.is_admin && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="text-zinc-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0 p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
