import { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, User, Shield, Clock } from 'lucide-react';
import { getBackendDb } from '@/lib/backend';

const db = getBackendDb();

export default function SupportTab({ session, accent }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function loadMessages() {
    try {
      const all = await db.entities.SupportMessage.filter({ user_id: String(session.id || session.username) });
      const sorted = (all || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setMessages(sorted);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!newMessage.trim() && !imageUrl.trim()) return;

    const payload = {
      user_id: String(session.id || session.username),
      username: session.username,
      content: newMessage.trim(),
      image_url: imageUrl.trim(),
      sender_type: 'user',
      created_at: new Date().toISOString(),
      is_read: false
    };

    try {
      await db.entities.SupportMessage.create(payload);
      setNewMessage('');
      setImageUrl('');
      loadMessages();
    } catch (err) {
      alert('Failed to send message: ' + err.message);
    }
  }

  const handleImagePaste = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        // In a real app, we'd upload to S3/Cloudinary here.
        // For now, we'll ask for a URL or simulate a link.
        const url = prompt('Please enter the URL for the image you want to share:');
        if (url) setImageUrl(url);
      }
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-[#111114] border border-zinc-800/60 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800/60 bg-gradient-to-r from-zinc-900/50 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800/50 flex items-center justify-center text-zinc-400 border border-zinc-700/30">
            <Shield size={24} style={{ color: accent }} />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg tracking-tight">Azov Support</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-zinc-500 text-xs font-medium">Admins are Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#0c0c0e]/50"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
            <div className="w-16 h-16 rounded-full bg-zinc-800/30 flex items-center justify-center">
              <Send size={24} />
            </div>
            <p className="text-zinc-400 text-sm max-w-[200px]">No messages yet. Start a conversation with our staff.</p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isUser = m.sender_type === 'user';
            return (
              <div key={m.id || idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`flex gap-3 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center border ${isUser ? 'bg-zinc-800 border-zinc-700' : 'bg-blue-500/10 border-blue-500/20'}`}>
                    {isUser ? <User size={14} className="text-zinc-400" /> : <Shield size={14} className="text-blue-400" />}
                  </div>
                  <div className="space-y-1.5">
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      isUser 
                        ? 'bg-zinc-800 text-white rounded-tr-none' 
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none'
                    }`}>
                      {m.content}
                      {m.image_url && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-zinc-700/50">
                          <img src={m.image_url} alt="Shared content" className="max-w-full h-auto" />
                        </div>
                      )}
                    </div>
                    <div className={`flex items-center gap-1.5 text-[10px] text-zinc-600 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <Clock size={10} />
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-zinc-800/60 bg-zinc-900/30">
        <form onSubmit={sendMessage} className="relative">
          {imageUrl && (
            <div className="absolute bottom-full left-0 right-0 mb-4 p-2 bg-zinc-800 border border-zinc-700 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 truncate">
                <ImageIcon size={14} className="text-zinc-400" />
                <span className="text-[10px] text-zinc-400 truncate">{imageUrl}</span>
              </div>
              <button type="button" onClick={() => setImageUrl('')} className="text-zinc-500 hover:text-white transition">
                <X size={14} />
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input 
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onPaste={handleImagePaste}
                placeholder="Send a message..."
                className="w-full bg-[#111114] border border-zinc-800/60 text-white rounded-2xl pl-4 pr-12 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition shadow-inner"
              />
              <button 
                type="button"
                onClick={() => {
                  const url = prompt('Enter Image URL:');
                  if (url) setImageUrl(url);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition p-1"
              >
                <ImageIcon size={18} />
              </button>
            </div>
            <button 
              type="submit"
              disabled={!newMessage.trim() && !imageUrl.trim()}
              className="w-12 h-12 rounded-2xl flex items-center justify-center transition disabled:opacity-50 shadow-lg"
              style={{ background: accent }}
            >
              <Send size={18} className={isLightColor(accent) ? 'text-black' : 'text-white'} />
            </button>
          </div>
        </form>
        <p className="text-[10px] text-zinc-600 mt-3 text-center">Press Enter to send. Shift+Enter for new line.</p>
      </div>
    </div>
  );
}

function isLightColor(hex) {
  const h = (hex || '').replace('#', '');
  if (h.length < 6) return false;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

function X({ size }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}
