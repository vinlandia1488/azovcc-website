import { useState, useEffect } from 'react';
import { deleteUserAccount, generateInternalLicense, generateScriptLicense, normalizeAccountDiscordLink } from '@/lib/auth';
import { getBackendDb } from '@/lib/backend';
import { getAnnouncement, setAnnouncement } from '@/lib/app-settings';
import {
  getDefaultCloudConfig,
  getPreviewConfig,
  setDefaultCloudConfig,
  setPreviewConfig,
  getConfigTemplatesShared,
  saveConfigTemplatesShared,
} from '@/lib/config-templates';
import { createLicenseKeyRecord, deleteLicenseKeyRecord, getLicenseKeys } from '@/lib/license-keys';
import {
  createDownloadItem,
  deleteDownloadItem,
  DOWNLOAD_STATUSES,
  getDownloadItems,
  updateDownloadItem,
} from '@/lib/downloads';
import { Copy, Check, Key, Users, Plus, Eye, EyeOff, Download, Trash2, Save, Megaphone, Shuffle, FileText, ExternalLink, MessageSquare, Send, Image as ImageIcon } from 'lucide-react';
import UserDetailModal from '@/components/UserDetailModal';

const db = getBackendDb();

function hashDisplay(str) {
  if (!str) return '—';
  return str.substring(0, 4) + '••••••••' + str.substring(str.length - 4);
}

function isLightColor(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length < 6) return false;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button onClick={copy} className="text-zinc-500 hover:text-zinc-300 transition ml-1">
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  );
}

export default function PanelTab({ accent, session, onAnnouncementSaved }) {
  const [keys, setKeys] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState('keys'); // 'keys' | 'users' | 'downloads' | 'announcement' | 'support'
  const [revealedKeys, setRevealedKeys] = useState({});
  const [downloads, setDownloads] = useState([]);
  const [supportMessages, setSupportMessages] = useState([]);
  const [announcement, setAnnouncementState] = useState('');
  const [defaultCloudConfig, setDefaultCloudConfigState] = useState('');
  const [previewConfig, setPreviewConfigState] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [note, setNote] = useState('');
  const [newKeyType, setNewKeyType] = useState('script');
  const [manualInternalKey, setManualInternalKey] = useState('');
  const [manualScriptKey, setManualScriptKey] = useState('');
  const [newDownload, setNewDownload] = useState({
    name: '',
    version: 'Version 1.0.0',
    status: 'stable',
    action_label: 'DOWNLOAD',
    file_url: '',
    open_url: '',
  });
  const [panelError, setPanelError] = useState('');
  const accentText = isLightColor(accent) ? '#000' : '#fff';
  const accentBorder = isLightColor(accent) ? '1px solid #444' : 'none';

  useEffect(() => {
    loadData();
  }, []);

  async function getEntityRows(entityName) {
    const entity = db.entities[entityName];
    if (!entity) return [];
    if (typeof entity.list === 'function') {
      const rows = await entity.list('-created_date', 100);
      return Array.isArray(rows) ? rows : [];
    }
    if (typeof entity.filter === 'function') {
      const rows = await entity.filter({});
      return Array.isArray(rows) ? rows : [];
    }
    return [];
  }

  async function loadData() {
    const [keysResult, accountsResult, downloadsResult, announcementResult, supportResult] = await Promise.allSettled([
      getLicenseKeys(),
      getEntityRows('Account'),
      getDownloadItems(),
      getAnnouncement(),
      getEntityRows('SupportMessage')
    ]);

    setKeys(keysResult.status === 'fulfilled' ? (keysResult.value || []) : []);
    setAccounts(
      accountsResult.status === 'fulfilled' && Array.isArray(accountsResult.value)
        ? accountsResult.value.map((row) => normalizeAccountDiscordLink(row))
        : []
    );
    setDownloads(downloadsResult.status === 'fulfilled' ? (downloadsResult.value || []) : []);
    setAnnouncementState(announcementResult.status === 'fulfilled' ? announcementResult.value : '');
    setSupportMessages(supportResult.status === 'fulfilled' ? (supportResult.value || []) : []);
    const templates = await getConfigTemplatesShared();
    setDefaultCloudConfigState(String(templates.defaultCloudConfig || getDefaultCloudConfig()));
    setPreviewConfigState(String(templates.previewConfig || getPreviewConfig()));

    const failures = [keysResult, accountsResult, downloadsResult, announcementResult].filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      setPanelError(failures[0].reason?.message || 'Some admin data failed to load.');
    } else {
      setPanelError('');
    }
  }

  async function generateKey() {
    setGenerating(true);
    setPanelError('');
    try {
      const internalKey = newKeyType === 'internal' ? (manualInternalKey || generateInternalLicense()).trim() : '';
      const scriptKey = (manualScriptKey || generateScriptLicense()).trim();
      
      const payload = {
        type: newKeyType,
        internal_key: internalKey,
        script_key: scriptKey,
        key: scriptKey,
        note: note.trim(),
        used: false,
      };

      await createLicenseKeyRecord(payload);
      
      setManualInternalKey('');
      setManualScriptKey('');
      setNote('');
      await loadData();
    } catch (err) {
      console.error("Key generation failed:", err);
      setPanelError(err?.message || 'Failed to generate key.');
    } finally {
      setGenerating(false);
    }
  }

  async function removeLicenseKey(id) {
    await deleteLicenseKeyRecord(id);
    await loadData();
  }

  function toggleReveal(id) {
    setRevealedKeys(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function openUserDetails(a) {
    if (!a?.id) {
      setSelectedUser(normalizeAccountDiscordLink(a));
      return;
    }
    try {
      if (typeof db.entities.Account.get === 'function') {
        const full = await db.entities.Account.get(a.id);
        setSelectedUser(normalizeAccountDiscordLink({ ...a, ...(full && typeof full === 'object' ? full : {}) }));
        return;
      }
    } catch (e) {
      console.error('Failed to load full account for admin details', e);
    }
    setSelectedUser(normalizeAccountDiscordLink(a));
  }

  async function addDownload() {
    if (!newDownload.name.trim()) return;
    try {
      await createDownloadItem({
        ...newDownload,
        name: newDownload.name.trim(),
        sort_order: downloads.length,
      });
      setNewDownload({
        name: '',
        version: 'Version 1.0.0',
        status: 'stable',
        action_label: 'DOWNLOAD',
        file_url: '',
        open_url: '',
      });
      setPanelError('');
      await loadData();
    } catch (error) {
      setPanelError(error?.message || 'Failed to create download item.');
    }
  }

  async function saveDownload(item) {
    try {
      await updateDownloadItem(item.id, item);
      setPanelError('');
      await loadData();
    } catch (error) {
      setPanelError(error?.message || 'Failed to save download item.');
    }
  }

  async function removeDownload(id) {
    try {
      await deleteDownloadItem(id);
      setPanelError('');
      await loadData();
    } catch (error) {
      setPanelError(error?.message || 'Failed to delete download item.');
    }
  }

  function updateLocalDownload(id, patch) {
    setDownloads((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function saveAnnouncementValue() {
    await setAnnouncement(announcement);
    if (typeof onAnnouncementSaved === 'function') {
      await onAnnouncementSaved();
    }
  }

  function saveConfigTemplates() {
    (async () => {
      try {
        await saveConfigTemplatesShared({
          defaultCloudConfig,
          previewConfig,
        });
        setPanelError('');
      } catch (error) {
        setPanelError(error?.message || 'Failed to save config templates.');
      }
    })();
  }

  async function removeUser(account) {
    if (!account?.username) return;
    if (account.username === 'admin') return;
    await deleteUserAccount(account);
    await loadData();
  }

  return (
    <div className="pt-4 space-y-6">
      <div>
        <h2 className="text-white text-2xl font-bold mb-1">Admin Panel</h2>
        <p className="text-zinc-500 text-sm">Manage license keys and users.</p>
        {panelError && (
          <p className="mt-2 text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {panelError}
          </p>
        )}
      </div>

      {/* Sub tabs */}
      <div className="flex gap-2">
        {[
          { id: 'keys', label: 'License Keys', icon: Key },
          { id: 'users', label: 'Users', icon: Users },
          {id: 'downloads', label: 'Downloads', icon: Download },
          { id: 'announcement', label: 'Announcement', icon: Megaphone },
          { id: 'configs', label: 'Configs', icon: FileText },
          { id: 'support', label: 'Support', icon: MessageSquare },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition"
            style={tab === t.id
              ? { background: accent, color: accentText, border: accentBorder }
              : { background: '#1a1a1e', color: '#71717a', border: '1px solid rgb(39 39 42 / 0.6)' }}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'keys' && (
        <div className="space-y-4">
          <div className="bg-[#111114] border border-zinc-800/60 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <select
                value={newKeyType}
                onChange={(e) => setNewKeyType(e.target.value)}
                className="bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-xs"
              >
                <option value="script">Script key only</option>
                <option value="internal">Internal + Script pair</option>
              </select>
              {newKeyType === 'internal' && (
                <div className="col-span-3 flex gap-2">
                  <input
                    value={manualInternalKey}
                    onChange={(e) => setManualInternalKey(e.target.value)}
                    placeholder="Internal key (leave empty to randomize)"
                    className="flex-1 bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-xs"
                  />
                  <button
                    onClick={() => setManualInternalKey(generateInternalLicense())}
                    className="bg-[#1a1a1e] border border-zinc-700/50 text-zinc-300 hover:text-white rounded-lg px-3 py-2 text-xs"
                  >
                    <Shuffle size={12} />
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={manualScriptKey}
                onChange={(e) => setManualScriptKey(e.target.value)}
                placeholder="Script key (leave empty to randomize)"
                className="flex-1 bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-xs"
              />
              <button
                onClick={() => setManualScriptKey(generateScriptLicense())}
                className="bg-[#1a1a1e] border border-zinc-700/50 text-zinc-300 hover:text-white rounded-lg px-3 py-2 text-xs"
              >
                <Shuffle size={12} />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Note (optional)"
                className="flex-1 bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition"
              />
              <button
                onClick={generateKey}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                style={{ background: accent, color: accentText, border: accentBorder }}
              >
                <Plus size={14} />
                {generating ? 'Generating...' : 'Create Key'}
              </button>
            </div>
          </div>

          {/* Keys list */}
          <div className="bg-[#111114] border border-zinc-800/60 rounded-xl overflow-hidden">
            <div className="grid grid-cols-7 px-4 py-2 border-b border-zinc-800/60 text-[10px] uppercase tracking-widest text-zinc-600">
              <span>Type</span>
              <span>Internal Key</span>
              <span>Script Key</span>
              <span>Status</span>
              <span>Used By</span>
              <span>Note</span>
              <span>Action</span>
            </div>
            {keys.length === 0 && (
              <p className="text-zinc-600 text-xs p-4">No keys generated yet.</p>
            )}
            {keys.map(k => (
              <div key={k.id} className="grid grid-cols-7 px-4 py-3 border-b border-zinc-800/30 items-center hover:bg-zinc-800/10 transition">
                <span className="text-zinc-400 text-xs uppercase">{k.type}</span>
                <div className="flex items-center gap-1 font-mono text-xs">
                  <span className="text-zinc-300">
                    {k.internal_key ? (revealedKeys[`${k.id}-int`] ? k.internal_key : hashDisplay(k.internal_key)) : '—'}
                  </span>
                  {k.internal_key && (
                    <>
                      <button onClick={() => toggleReveal(`${k.id}-int`)} className="text-zinc-600 hover:text-zinc-400 transition">
                        {revealedKeys[`${k.id}-int`] ? <EyeOff size={11} /> : <Eye size={11} />}
                      </button>
                      {revealedKeys[`${k.id}-int`] && <CopyBtn value={k.internal_key} />}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 font-mono text-xs">
                  <span className="text-zinc-300">
                    {revealedKeys[`${k.id}-scr`] ? k.script_key : hashDisplay(k.script_key)}
                  </span>
                  <button onClick={() => toggleReveal(`${k.id}-scr`)} className="text-zinc-600 hover:text-zinc-400 transition">
                    {revealedKeys[`${k.id}-scr`] ? <EyeOff size={11} /> : <Eye size={11} />}
                  </button>
                  {revealedKeys[`${k.id}-scr`] && <CopyBtn value={k.script_key} />}
                </div>
                <span className={`text-xs font-medium ${k.used ? 'text-red-400' : 'text-green-400'}`}>
                  {k.used ? 'Used' : 'Available'}
                </span>
                <span className="text-zinc-400 text-xs">{k.used_by_username || '—'}</span>
                <span className="text-zinc-500 text-xs truncate">{k.note || '—'}</span>
                <button
                  onClick={() => removeLicenseKey(k.id)}
                  className="justify-self-start flex items-center gap-1 bg-red-500/10 border border-red-500/30 text-red-400 hover:text-red-300 rounded-lg px-2 py-1 text-xs transition"
                >
                  <Trash2 size={11} />
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-[#111114] border border-zinc-800/60 rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 px-4 py-2 border-b border-zinc-800/60 text-[10px] uppercase tracking-widest text-zinc-600">
            <span>UID</span>
            <span>Username</span>
            <span className="min-w-0">Discord</span>
            <span>Internal License</span>
            <span>Last Login</span>
            <span className="col-span-2">Actions</span>
          </div>
          {accounts.length === 0 && (
            <p className="text-zinc-600 text-xs p-4">No accounts found.</p>
          )}
          {accounts.map(a => (
            <div key={a.id || a.username} className="grid grid-cols-7 px-4 py-3 border-b border-zinc-800/30 items-center hover:bg-zinc-800/10 transition gap-1">
              <span className="text-zinc-300 text-xs font-mono">{a.unique_identifier ?? '—'}</span>
              <span className="text-zinc-200 text-xs font-medium truncate min-w-0">{a.username}</span>
              <span className="text-zinc-400 text-[10px] font-mono truncate min-w-0" title={a.discord_id ? `${a.discord_username || ''} (${a.discord_id})` : ''}>
                {a.discord_username || (a.discord_id ? `ID:${a.discord_id}` : '—')}
              </span>
              <div className="flex items-center gap-1 font-mono text-[10px] min-w-0">
                <span className="text-zinc-500 truncate max-w-[120px]">
                  {revealedKeys[`u-${a.username}-int`] ? a.internal_license : hashDisplay(a.internal_license)}
                </span>
                <button onClick={() => toggleReveal(`u-${a.username}-int`)} className="text-zinc-600 hover:text-zinc-400 transition shrink-0">
                  {revealedKeys[`u-${a.username}-int`] ? <EyeOff size={11} /> : <Eye size={11} />}
                </button>
              </div>
              <span className="text-zinc-500 text-xs">
                {a.last_login ? new Date(a.last_login).toLocaleDateString() : '—'}
              </span>
              <div className="col-span-2 flex gap-2">
                <button
                  onClick={() => openUserDetails(a)}
                  className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg px-3 py-1.5 text-xs transition"
                >
                  <ExternalLink size={12} />
                  View Details
                </button>
                {a.username !== 'admin' && (
                  <button
                    onClick={() => removeUser(a)}
                    className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 text-red-400 hover:text-red-300 rounded-lg px-2 py-1 text-xs transition"
                  >
                    <Trash2 size={11} />
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'downloads' && (
        <div className="space-y-4">
          <div className="bg-[#111114] border border-zinc-800/60 rounded-xl p-4 grid grid-cols-6 gap-2">
            <input
              value={newDownload.name}
              onChange={(e) => setNewDownload((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Name"
              className="bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-xs placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition"
            />
            <input
              value={newDownload.version}
              onChange={(e) => setNewDownload((prev) => ({ ...prev, version: e.target.value }))}
              placeholder="Version"
              className="bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-xs placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition"
            />
            <select
              value={newDownload.status}
              onChange={(e) => setNewDownload((prev) => ({ ...prev, status: e.target.value }))}
              className="bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-zinc-500 transition"
            >
              {DOWNLOAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <input
              value={newDownload.action_label}
              onChange={(e) => setNewDownload((prev) => ({ ...prev, action_label: e.target.value }))}
              placeholder="Button Label"
              className="bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-xs placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition"
            />
            <input
              value={newDownload.file_url}
              onChange={(e) => setNewDownload((prev) => ({ ...prev, file_url: e.target.value }))}
              placeholder="Download File URL"
              className="bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-xs placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition"
            />
            <button
              onClick={addDownload}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition"
              style={{ background: accent, color: accentText, border: accentBorder }}
            >
              <Plus size={12} />
              Add
            </button>
            <input
              value={newDownload.open_url}
              onChange={(e) => setNewDownload((prev) => ({ ...prev, open_url: e.target.value }))}
              placeholder="Open URL (optional)"
              className="col-span-6 bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-xs placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition"
            />
          </div>

          <div className="space-y-3">
            {downloads.length === 0 && (
              <div className="bg-[#111114] border border-zinc-800/60 rounded-xl p-4 text-zinc-600 text-xs">
                No downloads configured yet.
              </div>
            )}
            {[...downloads]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((item) => (
                <div key={item.id} className="bg-[#111114] border border-zinc-800/60 rounded-xl p-4 grid grid-cols-6 gap-2">
                  <input
                    value={item.name || ''}
                    onChange={(e) => updateLocalDownload(item.id, { name: e.target.value })}
                    className="bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-xs"
                  />
                  <input
                    value={item.version || ''}
                    onChange={(e) => updateLocalDownload(item.id, { version: e.target.value })}
                    className="bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-xs"
                  />
                  <select
                    value={item.status || 'stable'}
                    onChange={(e) => updateLocalDownload(item.id, { status: e.target.value })}
                    className="bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-xs"
                  >
                    {DOWNLOAD_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <input
                    value={item.action_label || ''}
                    onChange={(e) => updateLocalDownload(item.id, { action_label: e.target.value })}
                    className="bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-xs"
                  />
                  <input
                    value={item.file_url || ''}
                    onChange={(e) => updateLocalDownload(item.id, { file_url: e.target.value })}
                    className="bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-xs"
                    placeholder="Download File URL"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveDownload(item)}
                      className="flex-1 flex items-center justify-center gap-1 bg-[#1a1a1e] border border-zinc-700/50 text-zinc-200 hover:text-white hover:border-zinc-500 rounded-lg px-2 py-2 text-xs transition"
                    >
                      <Save size={11} />
                      Save
                    </button>
                    <button
                      onClick={() => removeDownload(item.id)}
                      className="flex items-center justify-center bg-red-500/10 border border-red-500/30 text-red-400 hover:text-red-300 rounded-lg px-2 py-2 text-xs transition"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                  <input
                    value={item.open_url || ''}
                    onChange={(e) => updateLocalDownload(item.id, { open_url: e.target.value })}
                    className="col-span-6 bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-xs"
                    placeholder="Open URL (optional)"
                  />
                </div>
              ))}
          </div>
        </div>
      )}

      {tab === 'announcement' && (
        <div className="bg-[#111114] border border-zinc-800/60 rounded-xl p-4 space-y-3">
          <p className="text-zinc-500 text-xs">This text replaces the dashboard "Unique Identifier" card.</p>
          <textarea
            value={announcement}
            onChange={(e) => setAnnouncementState(e.target.value)}
            placeholder="Write announcement here..."
            className="w-full min-h-[120px] bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition"
          />
          <button
            onClick={saveAnnouncementValue}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition"
            style={{ background: accent, color: accentText, border: accentBorder }}
          >
            <Save size={13} />
            Save Announcement
          </button>
        </div>
      )}

      {tab === 'configs' && (
        <div className="bg-[#111114] border border-zinc-800/60 rounded-xl p-4 space-y-4">
          <div>
            <p className="text-zinc-400 text-xs mb-2">Default Cloud Config Template</p>
            <textarea
              value={defaultCloudConfig}
              onChange={(e) => setDefaultCloudConfigState(e.target.value)}
              className="w-full min-h-[180px] bg-[#1a1a1e] border border-zinc-700/50 text-zinc-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-zinc-500 transition"
            />
          </div>
          <div>
            <p className="text-zinc-400 text-xs mb-2">Preview Config Template</p>
            <textarea
              value={previewConfig}
              onChange={(e) => setPreviewConfigState(e.target.value)}
              className="w-full min-h-[180px] bg-[#1a1a1e] border border-zinc-700/50 text-zinc-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-zinc-500 transition"
            />
          </div>
          <button
            onClick={saveConfigTemplates}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition"
            style={{ background: accent, color: accentText, border: accentBorder }}
          >
            <Save size={13} />
            Save Config Templates
          </button>
        </div>
      )}
      {tab === 'support' && (
        <div className="flex bg-[#111114] border border-zinc-800/60 rounded-xl overflow-hidden h-[600px] shadow-2xl">
          {/* Channel-like User List */}
          <div className="w-72 border-r border-zinc-800/60 flex flex-col bg-[#0c0c0e]/50">
            <div className="p-4 border-b border-zinc-800/60 bg-zinc-900/20">
              <h3 className="text-white text-[10px] font-bold uppercase tracking-widest text-zinc-500">Active Support</h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {Array.from(new Set(supportMessages.map(m => m.user_id))).map(uid => {
                const userMsgs = supportMessages.filter(m => m.user_id === uid);
                const lastMsg = userMsgs[userMsgs.length - 1];
                const unreadCount = userMsgs.filter(m => !m.is_read && m.sender_type === 'user').length;
                const isActive = selectedUser?.id === uid || selectedUser?.username === uid;
                const userData = accounts.find(a => String(a.id || a.username) === uid);
                
                return (
                  <button 
                    key={uid}
                    onClick={() => setSelectedUser(userData || { username: uid })}
                    className={`w-full p-4 text-left border-b border-zinc-800/20 transition group relative ${isActive ? 'bg-zinc-800/40' : 'hover:bg-zinc-800/20'}`}
                  >
                    {isActive && <div className="absolute left-0 top-2 bottom-2 w-1 bg-white rounded-r-full" style={{ background: accent }} />}
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                        @{userData?.username || uid}
                      </span>
                      {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-zinc-500 text-[10px] truncate max-w-[140px]">
                        {lastMsg?.content || (lastMsg?.image_url ? 'Sent an image' : 'Empty message')}
                      </p>
                      <span className="text-[9px] text-zinc-600 shrink-0">
                        {new Date(lastMsg?.created_date || lastMsg?.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </button>
                );
              })}
              {supportMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center opacity-20">
                  <MessageSquare size={32} className="mb-2" />
                  <p className="text-xs italic">No support tickets.</p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className="flex-1 flex flex-col bg-[#0c0c0e]/30 relative">
            {selectedUser ? (
              <>
                <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between bg-zinc-900/40 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 border border-zinc-700/50">
                      <User size={16} />
                    </div>
                    <div>
                      <span className="text-white text-sm font-bold">Support: {selectedUser.username}</span>
                      <p className="text-green-500 text-[9px] font-medium tracking-wide uppercase">Active Conversation</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedUser(null)} className="text-zinc-500 hover:text-white transition p-2">
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth">
                  {supportMessages
                    .filter(m => m.user_id === String(selectedUser.id || selectedUser.username))
                    .sort((a, b) => new Date(a.created_date || a.created_at) - new Date(b.created_date || b.created_at))
                    .map((m, idx) => {
                      const isAdminMsg = m.sender_type === 'admin';
                      return (
                        <div key={m.id || idx} className={`flex ${isAdminMsg ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex gap-3 max-w-[80%] ${isAdminMsg ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center border ${isAdminMsg ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-900 border-zinc-800'}`}>
                              {isAdminMsg ? <Shield size={14} className="text-blue-400" /> : <User size={14} className="text-zinc-400" />}
                            </div>
                            <div className="space-y-1.5">
                              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                                isAdminMsg 
                                  ? 'bg-zinc-800 text-white rounded-tr-none shadow-lg' 
                                  : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none'
                              }`}>
                                {m.content && <p>{m.content}</p>}
                                {m.image_url && (
                                  <div className="mt-2 rounded-xl overflow-hidden border border-zinc-700/50 shadow-inner">
                                    <img 
                                      src={m.image_url} 
                                      className="max-w-full max-h-80 object-contain cursor-pointer hover:opacity-90 transition" 
                                      onClick={() => window.open(m.image_url, '_blank')}
                                    />
                                  </div>
                                )}
                              </div>
                              <div className={`flex items-center gap-1.5 text-[9px] text-zinc-600 ${isAdminMsg ? 'justify-end' : 'justify-start'}`}>
                                <Clock size={10} />
                                {new Date(m.created_date || m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="p-6 border-t border-zinc-800/60 bg-zinc-900/60 backdrop-blur-sm">
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.target;
                      const msgInput = form.reply;
                      const fileInput = form.file;
                      const content = msgInput.value.trim();
                      const file = fileInput.files[0];

                      if (!content && !file) return;

                      let imageUrl = '';
                      if (file) {
                        try {
                          const upload = await db.integrations.Core.UploadFile({ file });
                          imageUrl = upload.file_url;
                        } catch (err) {
                          alert("Upload failed, but sending message...");
                        }
                      }

                      await db.entities.SupportMessage.create({
                        user_id: String(selectedUser.id || selectedUser.username),
                        username: 'Staff',
                        content,
                        image_url: imageUrl,
                        sender_type: 'admin',
                        is_read: true
                      });
                      
                      form.reset();
                      await loadData();
                    }}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <textarea 
                          name="reply"
                          rows="1"
                          placeholder={`Message @${selectedUser.username}`}
                          className="w-full bg-[#111114] border border-zinc-800/60 text-white rounded-xl px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition resize-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              e.target.form.requestSubmit();
                            }
                          }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <label className="w-12 h-12 bg-zinc-800 border border-zinc-700 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-500 cursor-pointer transition">
                          <ImageIcon size={20} />
                          <input type="file" name="file" className="hidden" accept="image/*" />
                        </label>
                        <button 
                          type="submit"
                          className="w-12 h-12 rounded-xl flex items-center justify-center transition shadow-lg"
                          style={{ background: accent }}
                        >
                          <Send size={18} style={{ color: isLightColor(accent) ? '#000' : '#fff' }} />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-600 text-center">Images are uploaded directly to the server.</p>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center opacity-20">
                <div className="w-24 h-24 rounded-full bg-zinc-800/50 flex items-center justify-center mb-6">
                  <MessageSquare size={48} />
                </div>
                <h4 className="text-white text-lg font-bold mb-2">Support Center</h4>
                <p className="text-zinc-400 text-sm">Select a user conversation from the left to begin.</p>
              </div>
            )}
          </div>
        </div>
      )}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          accent={accent}
        />
      )}
    </div>
  );
}