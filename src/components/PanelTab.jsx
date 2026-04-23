import { useState, useEffect } from 'react';
import { deleteUserAccount, generateInternalLicense, generateScriptLicense } from '@/lib/auth';
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
import { Copy, Check, Key, Users, Plus, Eye, EyeOff, Download, Trash2, Save, Megaphone, Shuffle, FileText } from 'lucide-react';

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
  const [tab, setTab] = useState('keys'); // 'keys' | 'users' | 'downloads' | 'announcement'
  const [revealedKeys, setRevealedKeys] = useState({});
  const [downloads, setDownloads] = useState([]);
  const [announcement, setAnnouncementState] = useState('');
  const [defaultCloudConfig, setDefaultCloudConfigState] = useState('');
  const [previewConfig, setPreviewConfigState] = useState('');
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
    const [keysResult, accountsResult, downloadsResult, announcementResult] = await Promise.allSettled([
      getLicenseKeys(),
      getEntityRows('Account'),
      getDownloadItems(),
      getAnnouncement(),
    ]);

    setKeys(keysResult.status === 'fulfilled' ? (keysResult.value || []) : []);
    setAccounts(accountsResult.status === 'fulfilled' && Array.isArray(accountsResult.value) ? accountsResult.value : []);
    setDownloads(downloadsResult.status === 'fulfilled' ? (downloadsResult.value || []) : []);
    setAnnouncementState(announcementResult.status === 'fulfilled' ? announcementResult.value : '');
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
    const internalKey = newKeyType === 'internal' ? (manualInternalKey || generateInternalLicense()).trim() : '';
    const scriptKey = (manualScriptKey || generateScriptLicense()).trim();
    await createLicenseKeyRecord({
      type: newKeyType,
      internal_key: internalKey,
      script_key: scriptKey,
      note: note.trim(),
      used: false,
    });
    setManualInternalKey('');
    setManualScriptKey('');
    setNote('');
    await loadData();
    setGenerating(false);
  }

  async function removeLicenseKey(id) {
    await deleteLicenseKeyRecord(id);
    await loadData();
  }

  function toggleReveal(id) {
    setRevealedKeys(prev => ({ ...prev, [id]: !prev[id] }));
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
          { id: 'downloads', label: 'Downloads', icon: Download },
          { id: 'announcement', label: 'Announcement', icon: Megaphone },
          { id: 'configs', label: 'Configs', icon: FileText },
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
                <span className="text-zinc-400 text-xs uppercase">{k.type || 'script'}</span>
                <div className="flex items-center gap-1 font-mono text-xs">
                  <span className="text-zinc-300">
                    {k.type === 'internal' ? (revealedKeys[k.id] ? k.internal_key : hashDisplay(k.internal_key)) : '—'}
                  </span>
                  {k.type === 'internal' && (
                    <>
                      <button onClick={() => toggleReveal(k.id)} className="text-zinc-600 hover:text-zinc-400 transition">
                        {revealedKeys[k.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                      </button>
                      {revealedKeys[k.id] && <CopyBtn value={k.internal_key} />}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 font-mono text-xs">
                  <span className="text-zinc-300">
                    {revealedKeys[`${k.id}-script`] ? k.script_key : hashDisplay(k.script_key)}
                  </span>
                  <button onClick={() => toggleReveal(`${k.id}-script`)} className="text-zinc-600 hover:text-zinc-400 transition">
                    {revealedKeys[`${k.id}-script`] ? <EyeOff size={11} /> : <Eye size={11} />}
                  </button>
                  {revealedKeys[`${k.id}-script`] && <CopyBtn value={k.script_key} />}
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
          <div className="grid grid-cols-6 px-4 py-2 border-b border-zinc-800/60 text-[10px] uppercase tracking-widest text-zinc-600">
            <span>UID</span>
            <span>Username</span>
            <span>Password Hash</span>
            <span>Internal License</span>
            <span>Last Login</span>
            <span>Action</span>
          </div>
          {accounts.length === 0 && (
            <p className="text-zinc-600 text-xs p-4">No accounts found.</p>
          )}
          {accounts.map(a => (
            <div key={a.id || a.username} className="grid grid-cols-6 px-4 py-3 border-b border-zinc-800/30 items-center hover:bg-zinc-800/10 transition">
              <span className="text-zinc-300 text-xs font-mono">{a.unique_identifier ?? '—'}</span>
              <span className="text-zinc-200 text-xs font-medium">{a.username}</span>
              <span className="text-zinc-500 text-[10px] font-mono truncate">{hashDisplay(a.password_hash)}</span>
              <span className="text-zinc-500 text-[10px] font-mono truncate">{hashDisplay(a.internal_license)}</span>
              <span className="text-zinc-500 text-xs">
                {a.last_login ? new Date(a.last_login).toLocaleDateString() : '—'}
              </span>
              {a.username === 'admin' ? (
                <span className="text-zinc-600 text-xs">Protected</span>
              ) : (
                <button
                  onClick={() => removeUser(a)}
                  className="justify-self-start flex items-center gap-1 bg-red-500/10 border border-red-500/30 text-red-400 hover:text-red-300 rounded-lg px-2 py-1 text-xs transition"
                >
                  <Trash2 size={11} />
                  Remove
                </button>
              )}
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
    </div>
  );
}