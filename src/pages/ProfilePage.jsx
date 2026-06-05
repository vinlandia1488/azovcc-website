import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Shield, Key, Code, ArrowLeft, Send, Trash2, MessageSquare, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { getProfileByUid, getPostsByAuthor, getProfileComments, addProfileComment, deleteProfileComment } from '@/lib/profile';
import { getSession } from '@/lib/auth';
import BrandingMark from '@/components/BrandingMark';

const FORUM_SECTION_LABELS = {
  announcements: 'Announcements',
  updates: 'Updates',
  general: 'General',
  media: 'Media',
  support: 'Support',
  staff: 'Staff',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProfilePage() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const session = getSession();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, [uid]);

  async function load() {
    setLoading(true);
    try {
      const p = await getProfileByUid(uid);
      if (!p) { setNotFound(true); return; }
      setProfile(p);
      const [userPosts, userComments] = await Promise.all([
        getPostsByAuthor(p.username),
        getProfileComments(p.unique_identifier),
      ]);
      setPosts(userPosts);
      setComments(userComments);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleComment(e) {
    e.preventDefault();
    if (!commentText.trim() || !session) return;
    setSubmitting(true);
    try {
      await addProfileComment({
        profileUid: profile.unique_identifier,
        author: session.username,
        authorUid: session.unique_identifier,
        body: commentText.trim(),
      });
      setCommentText('');
      const updated = await getProfileComments(profile.unique_identifier);
      setComments(updated);
    } catch (err) {
      alert('Failed to post comment: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId) {
    if (!confirm('Delete this comment?')) return;
    try {
      await deleteProfileComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  }

  const accent = profile?.profile_accent || '#111111';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07070a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#07070a] text-white flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-500 text-sm">Profile not found</p>
        <button onClick={() => navigate(-1)} className="text-zinc-400 hover:text-white text-xs flex items-center gap-1 transition">
          <ArrowLeft size={13} /> Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07070a] text-white font-sans">
      {/* Header */}
      <header className="w-full bg-[#0b0b0d] border-b border-[#1c1c22] z-50">
        <div className="max-w-[900px] mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="text-white font-black tracking-[0.25em] text-xl uppercase hover:opacity-80 transition">
            ADDERALL
          </Link>
          {session && (
            <button onClick={() => navigate('/dashboard')} className="text-zinc-500 hover:text-white text-xs flex items-center gap-1.5 transition">
              <ArrowLeft size={13} /> Dashboard
            </button>
          )}
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-6 py-8">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl overflow-hidden border border-[#1f1f26] mb-8 shadow-2xl"
        >
          {/* Banner */}
          <div className="h-40 w-full relative bg-zinc-900">
            {profile.profile_banner ? (
              <img
                src={profile.profile_banner}
                alt="banner"
                className="w-full h-full object-cover"
                style={{ objectPosition: profile.profile_banner_position || '50% 50%' }}
              />
            ) : (
              <div className="w-full h-full bg-zinc-900" />
            )}
          </div>

          {/* Body */}
          <div style={{ background: accent }}>
            <div className="px-6 pb-6 pt-2">
              {/* Avatar row */}
              <div className="flex items-end justify-between -mt-12 mb-4">
                <div className="w-24 h-24 rounded-xl border-4 border-[#0b0b0d] bg-[#1a1a1a] overflow-hidden shadow-xl">
                  {profile.profile_pic ? (
                    <img
                      src={profile.profile_pic}
                      alt="pfp"
                      className="w-full h-full object-cover"
                      style={{ objectPosition: profile.profile_pic_position || '50% 50%' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-black text-zinc-600">
                      {profile.username.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="text-right pb-1">
                  <span className="text-zinc-400 text-[10px] font-mono">#{profile.unique_identifier || '0'}</span>
                </div>
              </div>

              {/* Name + badges */}
              <h1 className="text-white text-2xl font-black flex items-center gap-2 mb-1">
                {profile.username}
                {profile.is_admin && <Shield size={18} className="text-blue-400" />}
              </h1>

              <div className="flex flex-wrap gap-2 mb-4">
                {profile.is_admin && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[9px] text-blue-400 font-bold uppercase">
                    <Shield size={10} /> Staff
                  </span>
                )}
                {profile.internal_license && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-[9px] text-purple-400 font-bold uppercase">
                    <Key size={10} /> Internal
                  </span>
                )}
                {profile.script_license && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-[9px] text-green-400 font-bold uppercase">
                    <Code size={10} /> Script
                  </span>
                )}
                {(profile.badges || []).map((b, i) => (
                  <img key={i} src={b} alt="badge" className="w-5 h-5 object-contain rounded" />
                ))}
              </div>

              {profile.description && (
                <p className="text-zinc-300 text-sm leading-relaxed bg-black/20 border border-white/5 rounded-lg px-4 py-3 max-w-xl">
                  {profile.description}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#111] border border-[#222] rounded-lg p-1 w-fit">
          {[
            { id: 'posts', label: 'Posts', icon: FileText, count: posts.length },
            { id: 'comments', label: 'Comments', icon: MessageSquare, count: comments.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold tracking-wider transition-all ${
                activeTab === tab.id ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${activeTab === tab.id ? 'bg-black/10' : 'bg-zinc-800'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Posts tab */}
        {activeTab === 'posts' && (
          <motion.div key="posts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {posts.length === 0 ? (
              <p className="text-zinc-600 text-sm italic text-center py-12">No posts yet.</p>
            ) : (
              posts.map(post => (
                <div key={post.id} className="bg-[#111] border border-[#1f1f26] rounded-xl p-5 hover:border-[#2a2a30] transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                        {FORUM_SECTION_LABELS[post.section] || post.section}
                      </span>
                      <h3 className="text-white font-bold text-base mt-0.5 truncate">{post.title}</h3>
                      {post.body && (
                        <p className="text-zinc-500 text-xs mt-1 line-clamp-2 leading-relaxed">{post.body}</p>
                      )}
                    </div>
                    <span className="text-zinc-600 text-[10px] font-mono shrink-0">{timeAgo(post.created_at || post.created_date)}</span>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {/* Comments tab */}
        {activeTab === 'comments' && (
          <motion.div key="comments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Leave a comment */}
            {session ? (
              <form onSubmit={handleComment} className="bg-[#111] border border-[#1f1f26] rounded-xl p-4 flex gap-3">
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder={`Leave a comment on ${profile.username}'s profile...`}
                  rows={2}
                  className="flex-1 bg-[#0a0a0a] border border-[#222] text-white rounded-lg px-3 py-2 text-sm placeholder-zinc-600 focus:outline-none focus:border-[#444] transition resize-none"
                />
                <button
                  type="submit"
                  disabled={submitting || !commentText.trim()}
                  className="flex items-center gap-1.5 bg-white text-black text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-zinc-200 transition disabled:opacity-40 self-end"
                >
                  <Send size={12} />
                  Post
                </button>
              </form>
            ) : (
              <p className="text-zinc-600 text-xs text-center py-4">
                <Link to="/" className="text-zinc-400 hover:text-white underline">Sign in</Link> to leave a comment.
              </p>
            )}

            {comments.length === 0 ? (
              <p className="text-zinc-600 text-sm italic text-center py-8">No comments yet. Be the first!</p>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="bg-[#111] border border-[#1f1f26] rounded-xl px-5 py-4 flex gap-3 items-start">
                  <Link
                    to={`/profiles/${comment.author_uid}`}
                    className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#333] flex items-center justify-center text-[10px] font-black text-zinc-500 hover:border-zinc-500 transition shrink-0"
                  >
                    {(comment.author || '?').substring(0, 2).toUpperCase()}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link to={`/profiles/${comment.author_uid}`} className="text-zinc-300 text-xs font-bold hover:text-white transition">
                        {comment.author}
                      </Link>
                      <span className="text-zinc-700 text-[9px] font-mono">{timeAgo(comment.created_at)}</span>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed break-words">{comment.body}</p>
                  </div>
                  {(session?.username === comment.author || session?.is_admin) && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-zinc-700 hover:text-red-400 transition shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
