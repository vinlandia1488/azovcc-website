import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { Send, ImagePlus, User, Shield, Clock, X, Globe, MessageSquare, Search, Trash2, Key, Code } from 'lucide-react';
import { getBackendDb } from '@/lib/backend';

const db = getBackendDb();
const SUPPORT_MSG_TYPE = "__SUPPORT_MSG__";
const GLOBAL_MSG_TYPE = "__GLOBAL_MSG__";
const GLOBAL_OWNER = "admin";

const LS_KEY_GLOBAL = "azov_global_chat";
const LS_KEY_SUPPORT = "azov_support_chat";

function lsGet(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function isBackendError(err) {
  return (err?.message || '').includes('Backend is not configured');
} 

function isLightColor(hex) {
  const h = (hex || '').replace('#', '');
  if (h.length < 6) return false;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

export default function SupportTab({ session, accent }) {
  const [activeTab, setActiveTab] = useState('global'); 
  const [messages, setMessages] = useState([]);
  const [globalMessages, setGlobalMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [pendingImage, setPendingImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null); 
  const [userList, setUserList] = useState([]); 
  const [viewedProfileUser, setViewedProfileUser] = useState(null); 
  const [loadingProfile, setLoadingProfile] = useState(false);
  
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 5000);
    return () => clearInterval(interval);
  }, [selectedUser]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!shouldStickToBottomRef.current) return;
    requestAnimationFrame(() => {
      const el2 = scrollRef.current;
      if (!el2) return;
      el2.scrollTop = el2.scrollHeight;
    });
  }, [messages, globalMessages, activeTab, selectedUser, loading]);

  async function loadAll() {
    await Promise.all([
      loadGlobalMessages(),
      session.is_admin ? loadUserList() : loadSupportMessages(session.username),
      (session.is_admin && selectedUser) ? loadSupportMessages(selectedUser.username) : Promise.resolve()
    ]);
    setLoading(false);
  }

  async function loadGlobalMessages() {
    try {
      const rows = await db.entities.CloudConfig.filter({ 
        owner_username: GLOBAL_OWNER,
        name: GLOBAL_MSG_TYPE 
      });
      const parsed = (rows || []).map(r => {
        try { return { ...JSON.parse(r.content), id: r.id, created_at: r.created_date }; }
        catch { return null; }
      }).filter(Boolean);
      setGlobalMessages(parsed.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
    } catch (err) {
      if (isBackendError(err)) {
        setGlobalMessages(lsGet(LS_KEY_GLOBAL));
      } else {
        console.error('Global load failed:', err);
      }
    }
  }

  async function loadSupportMessages(username) {
    if (!username) return;
    try {
      const rows = await db.entities.CloudConfig.filter({ 
        owner_username: username,
        name: SUPPORT_MSG_TYPE 
      });
      const parsed = (rows || []).map(r => {
        try { return { ...JSON.parse(r.content), id: r.id, created_at: r.created_date }; }
        catch { return null; }
      }).filter(Boolean);
      const sorted = parsed.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      if (!session.is_admin || (session.is_admin && selectedUser?.username === username)) {
         const unread = sorted.filter(m => !m.is_read && m.sender_type !== (session.is_admin ? 'admin' : 'user'));
         if (unread.length > 0) {
            for (const m of unread) {
              await db.entities.CloudConfig.update(m.id, { content: JSON.stringify({ ...m, is_read: true, id: undefined, created_at: undefined }) });
            }
         }
      }

      if (session.is_admin) {
        if (selectedUser?.username === username) setMessages(sorted);
      } else {
        setMessages(sorted);
      }
    } catch (err) {
      if (isBackendError(err)) {
        const all = lsGet(LS_KEY_SUPPORT);
        const filtered = all.filter(m => m.owner_username === username);
        const sorted = filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        if (session.is_admin) {
          if (selectedUser?.username === username) setMessages(sorted);
        } else {
          setMessages(sorted);
        }
      } else {
        console.error('Chat load failed:', err);
      }
    }
  }

  async function loadUserList() {
    try {
      const accounts = await db.entities.Account.list();
      
      const allMsgs = await db.entities.CloudConfig.filter({ name: SUPPORT_MSG_TYPE });
      const msgStatus = {};
      (allMsgs || []).forEach(r => {
        try {
          const m = JSON.parse(r.content);
          if (!msgStatus[r.owner_username] || new Date(m.created_at) > new Date(msgStatus[r.owner_username].last_msg)) {
            msgStatus[r.owner_username] = {
              last_msg: m.created_at,
              unread: !m.is_read && m.sender_type === 'user'
            };
          } else if (!m.is_read && m.sender_type === 'user') {
            msgStatus[r.owner_username].unread = true;
          }
        } catch {}
      });

      const processedList = accounts.map(acc => ({
        username: acc.username,
        last_msg: msgStatus[acc.username]?.last_msg || '1970-01-01T00:00:00Z',
        unread: msgStatus[acc.username]?.unread || false
      })).filter(u => u.username !== session.username);

      setUserList(processedList.sort((a, b) => new Date(b.last_msg) - new Date(a.last_msg)));
    } catch (err) {
      if (isBackendError(err)) {
        setUserList([]);
      } else {
        console.error('User list load failed:', err);
      }
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!newMessage.trim() && !pendingImage) return;
    setSending(true);

    let imageUrl = '';
    try {
      if (pendingImage?.file) {
        try {
          const { file_url } = await db.integrations.Core.UploadFile({ file: pendingImage.file });
          imageUrl = file_url;
        } catch (uploadErr) {
          if (isBackendError(uploadErr)) {
            imageUrl = pendingImage.previewUrl;
          } else {
            throw uploadErr;
          }
        }
      }

      const isGlobal = activeTab === 'global';
      const payload = {
        username: session.username,
        content: newMessage.trim(),
        image_url: imageUrl,
        sender_type: session.is_admin ? 'admin' : 'user',
        is_read: false,
        created_at: new Date().toISOString(),
        pfp: session.profile_pic || ''
      };

      const targetUser = isGlobal ? GLOBAL_OWNER : (session.is_admin ? selectedUser.username : session.username);
      const msgType = isGlobal ? GLOBAL_MSG_TYPE : SUPPORT_MSG_TYPE;

      try {
        await db.entities.CloudConfig.create({
          owner_username: targetUser,
          name: msgType,
          content: JSON.stringify(payload)
        });
      } catch (createErr) {
        if (isBackendError(createErr)) {
          const msgWithId = { ...payload, id: 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), owner_username: targetUser };
          if (isGlobal) {
            const existing = lsGet(LS_KEY_GLOBAL);
            existing.push(msgWithId);
            lsSet(LS_KEY_GLOBAL, existing);
          } else {
            const existing = lsGet(LS_KEY_SUPPORT);
            existing.push(msgWithId);
            lsSet(LS_KEY_SUPPORT, existing);
          }
        } else {
          throw createErr;
        }
      }

      setNewMessage('');
      if (pendingImage) {
        URL.revokeObjectURL(pendingImage.previewUrl);
        setPendingImage(null);
      }
      await loadAll();
    } catch (err) {
      alert('Failed to send message: ' + (err?.message || 'Unknown error'));
    } finally {
      setSending(false);
    }
  }

  async function deleteMessage(msgId, ownerUsername, msgType) {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await db.entities.CloudConfig.delete(msgId);
      await loadAll();
    } catch (err) {
      if (isBackendError(err)) {
        const key = msgType === GLOBAL_MSG_TYPE ? LS_KEY_GLOBAL : LS_KEY_SUPPORT;
        const existing = lsGet(key);
        const filtered = existing.filter(m => m.id !== msgId);
        lsSet(key, filtered);
        await loadAll();
      } else {
        alert('Failed to delete message: ' + (err?.message || 'Unknown error'));
      }
    }
  }

  async function fetchUserProfile(username) {
    setLoadingProfile(true);
    try {
      const rows = await db.entities.Account.filter({ username });
      if (rows && rows.length > 0) {
        setViewedProfileUser(rows[0]);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  }

  const filteredUsers = useMemo(() => {
    return userList.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [userList, searchQuery]);

  const displayMessages = activeTab === 'global' ? globalMessages : messages;
  const sentColor = accent;
  const sentText = isLightColor(accent) ? '#000' : '#fff';

  return (
    <div className="flex bg-[#111] border border-[#222] rounded-lg overflow-hidden shadow-2xl animate-in fade-in duration-300" style={{ height: 'calc(100vh - 160px)', minHeight: '600px' }}>
      
      <div className="w-64 border-r border-[#333] flex flex-col bg-[#1a1a1a]">
        <div className="p-4 space-y-1">
          <button 
            onClick={() => setActiveTab('global')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold tracking-wider transition ${activeTab === 'global' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'}`}
          >
            <Globe size={14} />
            GLOBAL CHAT
          </button>
          <button 
            onClick={() => setActiveTab('support')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold tracking-wider transition ${activeTab === 'support' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'}`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare size={14} />
              {session.is_admin ? 'DIRECT MESSAGES' : 'STAFF CHAT'}
            </div>
            {!session.is_admin && messages.some(m => !m.is_read && m.sender_type === 'admin') && (
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            )}
          </button>
        </div>

        {session.is_admin && activeTab === 'support' && (
          <div className="flex-1 flex flex-col min-h-0 border-t border-[#333]">
            <div className="p-3">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input 
                  type="text"
                  placeholder="Search all users..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg pl-8 pr-3 py-1.5 text-[10px] text-white focus:outline-none focus:border-[#444]"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {filteredUsers.map(u => (
                <button
                  key={u.username}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[11px] font-medium transition ${selectedUser?.username === u.username ? 'bg-zinc-800/60 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20'}`}
                >
                  <span className="truncate">{u.username}</span>
                  {u.unread && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 ml-2" />}
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-[10px] text-zinc-600 text-center py-4">No users found</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col relative bg-[#0a0a0a]">
        <div className="px-6 py-4 border-b border-[#333] flex items-center justify-between shrink-0 bg-[#1a1a1a]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center border border-[#333]">
              {activeTab === 'global' ? <Globe size={14} style={{ color: accent }} /> : <Shield size={14} style={{ color: accent }} />}
            </div>
            <div>
              <h3 className="text-white font-bold text-sm tracking-tight">
                {activeTab === 'global' ? 'Global Channel' : (session.is_admin ? (selectedUser ? `Chat: ${selectedUser.username}` : 'Select a user') : 'Staff Chat')}
              </h3>
              <p className="text-zinc-600 text-[9px] uppercase tracking-widest">
                {activeTab === 'global' ? 'Public Community' : 'Private Encryption'}
              </p>
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
          onScroll={() => {
            const el = scrollRef.current;
            if (!el) return;
            const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
            shouldStickToBottomRef.current = distanceFromBottom < 80;
          }}
        >
          {(activeTab === 'support' && session.is_admin && !selectedUser) ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-30 space-y-3">
              <Search size={36} />
              <p className="text-zinc-400 text-sm">Search for a user to start a DM</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-5 h-5 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
            </div>
          ) : displayMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-30 space-y-3">
              <Send size={36} />
              <p className="text-zinc-400 text-sm">No messages yet</p>
            </div>
          ) : (
            displayMessages.map((m, idx) => {
              const isMe = m.username === session.username;
              return (
                <div key={m.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div 
                      className="w-8 h-8 rounded-full overflow-hidden border border-[#333] bg-[#1a1a1a] shrink-0 mt-1 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => fetchUserProfile(m.username)}
                    >
                      {m.pfp ? (
                        <img src={m.pfp} alt="pfp" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-600">
                          {m.username.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className={`space-y-1 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className="flex items-center gap-2 px-1">
                        <span className={`text-[10px] font-bold ${m.sender_type === 'admin' ? 'text-blue-400' : 'text-zinc-400'}`}>
                          {m.username}
                          {m.sender_type === 'admin' && <span className="ml-1 text-[8px] bg-blue-500/20 px-1 rounded text-blue-300">STAFF</span>}
                        </span>
                        <span className="text-[8px] text-zinc-600">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div
                        className={`px-4 py-2.5 rounded-lg text-sm leading-relaxed relative group/msg ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm border border-[#333]'}`}
                        style={isMe ? { background: sentColor, color: sentText } : { background: '#1a1a1a', color: '#d4d4d8' }}
                      >
                        {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                        {m.image_url && (
                          <img
                            src={m.image_url}
                            alt="Shared"
                            className="max-w-full h-auto max-h-64 object-contain rounded-lg mt-2"
                          />
                        )}
                        
                        {(session.is_admin || isMe) && (
                          <button
                            onClick={() => deleteMessage(m.id, m.owner_username, activeTab === 'global' ? GLOBAL_MSG_TYPE : SUPPORT_MSG_TYPE)}
                            className={`absolute top-1/2 -translate-y-1/2 p-1.5 rounded bg-black/60 text-white opacity-0 group-hover/msg:opacity-100 transition-opacity hover:text-red-400 ${isMe ? '-left-10' : '-right-10'}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {(!session.is_admin || activeTab === 'global' || selectedUser) && (
          <div className="px-5 pb-5 pt-4 border-t border-[#333] shrink-0 bg-[#1a1a1a]">
            {pendingImage && (
              <div className="mb-3 relative inline-block">
                <img src={pendingImage.previewUrl} alt="Preview" className="h-16 rounded-lg object-cover border border-[#333]" />
                <button
                  onClick={() => { URL.revokeObjectURL(pendingImage.previewUrl); setPendingImage(null); }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-zinc-800 border border-[#333] rounded-full flex items-center justify-center text-zinc-400 hover:text-white"
                >
                  <X size={8} />
                </button>
              </div>
            )}
            <form onSubmit={sendMessage} className="flex items-end gap-3">
              <div className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 focus-within:border-[#444] transition">
                <textarea
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage(e))}
                  placeholder="Send a message..."
                  rows={1}
                  className="w-full bg-transparent text-white text-sm placeholder-zinc-600 focus:outline-none resize-none"
                  style={{ maxHeight: '120px' }}
                />
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
                const file = e.target.files?.[0];
                if (file) setPendingImage({ file, previewUrl: URL.createObjectURL(file) });
              }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-11 h-11 rounded-lg flex items-center justify-center bg-zinc-800 border border-[#333] text-zinc-400 hover:text-white transition">
                <ImagePlus size={18} />
              </button>
              <button type="submit" disabled={sending || (!newMessage.trim() && !pendingImage)} className="w-11 h-11 rounded-lg flex items-center justify-center transition disabled:opacity-40" style={{ background: accent }}>
                {sending ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: sentText }} /> : <Send size={16} style={{ color: sentText }} />}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {viewedProfileUser && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div 
            className="w-full max-w-[420px] bg-[#0a0a0a] rounded-2xl overflow-hidden shadow-2xl border border-[#222] relative"
          >
            {/* Banner */}
            <div className="h-32 w-full relative bg-zinc-900 overflow-hidden">
              {viewedProfileUser.profile_banner ? (
                <img src={viewedProfileUser.profile_banner} alt="banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{ background: viewedProfileUser.profile_accent || '#1a1a1a' }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent opacity-80" />
            </div>

            {/* Close button */}
            <button 
              onClick={() => setViewedProfileUser(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-all z-50 bg-black/30 hover:bg-black/50 p-2 rounded-lg backdrop-blur-sm"
            >
              <X size={18} />
            </button>

            {/* Content */}
            <div className="px-6 pb-6 relative bg-[#0a0a0a]">
              {/* Avatar */}
              <div className="relative -mt-12 mb-4">
                <div className="w-20 h-20 rounded-xl bg-[#0a0a0a] p-1.5 shadow-xl border border-[#333]">
                  <div className="w-full h-full rounded-lg bg-[#1a1a1a] overflow-hidden">
                    {viewedProfileUser.profile_pic ? (
                      <img src={viewedProfileUser.profile_pic} alt="pfp" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-bold text-zinc-600">
                        {viewedProfileUser.username.substring(0, 5).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-white text-xl font-bold flex items-center gap-2 truncate">
                      {viewedProfileUser.username}
                      {viewedProfileUser.is_admin && <Shield size={16} className="text-blue-400 shrink-0" />}
                    </h2>
                    <p className="text-zinc-500 text-xs uppercase tracking-wider mt-1">
                      {viewedProfileUser.is_admin ? 'Staff Member' : 'Community Member'}
                    </p>
                  </div>
                  <div className="bg-[#1a1a1a] px-2.5 py-1 rounded-lg border border-[#333] shrink-0">
                    <span className="text-[10px] font-mono text-zinc-400">#{viewedProfileUser.unique_identifier || '0'}</span>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {viewedProfileUser.is_admin && (
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20" title="Staff Member">
                      <Shield size={14} className="text-blue-400" />
                    </div>
                  )}
                  {viewedProfileUser.internal_license && (
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20" title="Internal User">
                      <Key size={14} className="text-purple-400" />
                    </div>
                  )}
                  {viewedProfileUser.script_license && (
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20" title="Script User">
                      <Code size={14} className="text-green-400" />
                    </div>
                  )}
                  {viewedProfileUser.badges?.map((badge, i) => (
                    <div key={i} className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center border border-[#333] overflow-hidden" title="Verified Member">
                      <img src={badge} alt="badge" className="w-full h-full object-contain p-1" />
                    </div>
                  ))}
                </div>

                {/* Description */}
                {viewedProfileUser.description && (
                  <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#333]">
                    <p className="text-zinc-400 text-sm leading-relaxed">{viewedProfileUser.description}</p>
                  </div>
                )}

                {/* Stats/About */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#16161a] rounded-[1rem] p-4 border border-white/5 shadow-inner">
                    <h4 className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Member Since</h4>
                    <p className="text-white text-xs font-bold tracking-tight">
                      {new Date(viewedProfileUser.created_date || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="bg-[#16161a] rounded-[1rem] p-4 border border-white/5 shadow-inner">
                    <h4 className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Status</h4>
                    <p className="text-white text-xs font-bold tracking-tight flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Online
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
