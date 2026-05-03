import { useState, useEffect, useRef } from 'react';
import { Send, ImagePlus, User, Shield, Clock, X } from 'lucide-react';
import { getBackendDb } from '@/lib/backend';

const db = getBackendDb();

function isLightColor(hex) {
  const h = (hex || '').replace('#', '');
  if (h.length < 6) return false;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

export default function SupportTab({ session, accent }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [pendingImage, setPendingImage] = useState(null); // { file, previewUrl }
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  const userId = String(session.id || session.username);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function loadMessages() {
    try {
      const all = await db.entities.SupportMessage.filter({ user_id: userId });
      const sorted = (all || []).sort((a, b) => {
        const da = new Date(a.created_date || a.created_at || 0);
        const db2 = new Date(b.created_date || b.created_at || 0);
        return da - db2;
      });
      setMessages(sorted);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setPendingImage({ file, previewUrl });
    e.target.value = '';
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
        } catch {
          // Fallback: embed as base64 data URL if upload fails
          imageUrl = pendingImage.previewUrl;
        }
      }

      await db.entities.SupportMessage.create({
        user_id: userId,
        username: session.username,
        content: newMessage.trim(),
        image_url: imageUrl,
        sender_type: 'user',
        is_read: false,
      });

      setNewMessage('');
      if (pendingImage) {
        URL.revokeObjectURL(pendingImage.previewUrl);
        setPendingImage(null);
      }
      await loadMessages();
    } catch (err) {
      alert('Failed to send message: ' + (err?.message || 'Unknown error'));
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  }

  const sentColor = accent;
  const sentText = isLightColor(accent) ? '#000' : '#fff';

  return (
    <div className="flex flex-col bg-[#111114] border border-zinc-800/60 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300" style={{ height: 'calc(100vh - 160px)', minHeight: '500px' }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800/60 flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-zinc-800/50 flex items-center justify-center border border-zinc-700/30">
          <Shield size={18} style={{ color: accent }} />
        </div>
        <div>
          <h3 className="text-white font-bold text-sm tracking-tight">Support</h3>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-zinc-500 text-[10px]">Staff online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-30 space-y-3">
            <Send size={36} />
            <p className="text-zinc-400 text-sm max-w-[200px]">No messages yet. Start a conversation.</p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isUser = m.sender_type === 'user';
            return (
              <div key={m.id || idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-2.5 max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center border mt-0.5 ${isUser ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-900 border-zinc-700'}`}>
                    {isUser ? <User size={12} className="text-zinc-400" /> : <Shield size={12} className="text-blue-400" />}
                  </div>
                  <div className="space-y-1">
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm border border-zinc-800'}`}
                      style={isUser ? { background: sentColor, color: sentText } : { background: '#1a1a1e', color: '#d4d4d8' }}
                    >
                      {m.content && <p>{m.content}</p>}
                      {m.image_url && (
                        <div className={`${m.content ? 'mt-2' : ''} rounded-xl overflow-hidden`}>
                          <img
                            src={m.image_url}
                            alt="Shared"
                            className="max-w-full h-auto max-h-64 object-contain cursor-pointer"
                            onClick={() => window.open(m.image_url, '_blank')}
                          />
                        </div>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 text-[9px] text-zinc-600 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <Clock size={9} />
                      {new Date(m.created_date || m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="px-5 pb-5 pt-4 border-t border-zinc-800/60 shrink-0">
        {/* Pending image preview */}
        {pendingImage && (
          <div className="mb-3 relative inline-block">
            <img src={pendingImage.previewUrl} alt="Preview" className="h-20 rounded-xl object-cover border border-zinc-700" />
            <button
              onClick={() => { URL.revokeObjectURL(pendingImage.previewUrl); setPendingImage(null); }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-800 border border-zinc-600 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition"
            >
              <X size={10} />
            </button>
          </div>
        )}

        <form onSubmit={sendMessage} className="flex items-end gap-3">
          <div className="flex-1 bg-[#1a1a1e] border border-zinc-800/60 rounded-2xl px-4 py-3 focus-within:border-zinc-500 transition">
            <textarea
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              rows={1}
              className="w-full bg-transparent text-white text-sm placeholder-zinc-600 focus:outline-none resize-none"
              style={{ maxHeight: '120px', overflowY: 'auto' }}
            />
          </div>

          {/* Image Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-11 h-11 rounded-2xl flex items-center justify-center bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition shrink-0"
          >
            <ImagePlus size={18} />
          </button>

          {/* Send */}
          <button
            type="submit"
            disabled={sending || (!newMessage.trim() && !pendingImage)}
            className="w-11 h-11 rounded-2xl flex items-center justify-center transition disabled:opacity-40 shrink-0"
            style={{ background: accent }}
          >
            {sending
              ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: sentText }} />
              : <Send size={16} style={{ color: sentText }} />
            }
          </button>
        </form>
        <p className="text-[10px] text-zinc-600 mt-2.5 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
