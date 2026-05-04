import { useState, useEffect, useMemo } from 'react';
import { deleteUserAccount, generateInternalLicense, generateScriptLicense, normalizeAccountDiscordLink, upgradeToInternal } from '@/lib/auth';
import { getBackendDb } from '@/lib/backend';
import { getAnnouncement, setAnnouncement, getMaintenance, setMaintenance } from '@/lib/app-settings';
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
import { Copy, Check, Key, Users, Plus, Eye, EyeOff, Download, Trash2, Save, Megaphone, Shuffle, FileText, ExternalLink, MessageSquare, Send, Image as ImageIcon, X, Clock, Shield, User, Search, Wrench, AlertTriangle, CalendarClock, StopCircle } from 'lucide-react';
import UserDetailModal from '@/components/UserDetailModal';
import KeyDetailModal from '@/components/KeyDetailModal';

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
  const [selectedUser, setSelectedUser] = useState(null); // For detail modal
  const [activeSupportUser, setActiveSupportUser] = useState(null); // For support chat
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

  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [keySearchQuery, setKeySearchQuery] = useState('');
  const [confirmAdminTarget, setConfirmAdminTarget] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [panelWorking, setPanelWorking] = useState(false);
  const [maintenance, setMaintenanceState] = useState({ active: false, from: '', to: '' });

  const filteredAccounts = useMemo(() => {
    if (!userSearchQuery.trim()) return accounts;
    const q = userSearchQuery.toLowerCase();
    return accounts.filter(a =>
      a.username.toLowerCase().includes(q) ||
      (a.discord_username && a.discord_username.toLowerCase().includes(q)) ||
      (a.discord_id && a.discord_id.toLowerCase().includes(q)) ||
      (String(a.unique_identifier).includes(q))
    );
  }, [accounts, userSearchQuery]);

  const filteredKeys = useMemo(() => {
    if (!keySearchQuery.trim()) return keys;
    const q = keySearchQuery.toLowerCase();
    return keys.filter(k =>
      (k.script_key && k.script_key.toLowerCase().includes(q)) ||
      (k.internal_key && k.internal_key.toLowerCase().includes(q)) ||
      (k.note && k.note.toLowerCase().includes(q)) ||
      (k.used_by_username && k.used_by_username.toLowerCase().includes(q)) ||
      (k.type && k.type.toLowerCase().includes(q))
    );
  }, [keys, keySearchQuery]);

  const availableInternalKeys = useMemo(() => keys.filter(k => !k.used && k.type === 'internal'), [keys]);

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
    setAccounts(
      accountsResult.status === 'fulfilled' && Array.isArray(accountsResult.value)
        ? accountsResult.value.map((row) => normalizeAccountDiscordLink(row))
        : []
    );
    setDownloads(downloadsResult.status === 'fulfilled' ? (downloadsResult.value || []) : []);
    setAnnouncementState(announcementResult.status === 'fulfilled' ? announcementResult.value : '');
    try { const m = await getMaintenance(); setMaintenanceState(m); } catch {}
    
    // Fetch support messages from CloudConfig
    try {
      const supportRows = await db.entities.CloudConfig.filter({ name: "__SUPPORT_MSG__" });
      const parsed = (supportRows || []).map(r => {
        try {
          return { ...JSON.parse(r.content), id: r.id, owner_username: r.owner_username, created_at: r.created_date };
        } catch {
          return null;
        }
      }).filter(Boolean);
      setSupportMessages(parsed);
    } catch (e) {
      console.error("Failed to load support messages from CloudConfig", e);
      setSupportMessages([]);
    }

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

  async function handleInlineToggleAdmin(account) {
    if (!account?.id) return;
    setPanelWorking(true);
    try {
      await db.entities.Account.update(account.id, { is_admin: !account.is_admin });
      setConfirmAdminTarget(null);
      await loadData();
    } catch (err) {
      setPanelError(err?.message || 'Failed to update admin status.');
    } finally {
      setPanelWorking(false);
    }
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

      
      <div className="flex gap-2">
        {[
          { id: 'keys', label: 'License Keys', icon: Key },
          { id: 'users', label: 'Users', icon: Users },
          {id: 'downloads', label: 'Downloads', icon: Download },
          { id: 'announcement', label: 'Announcement', icon: Megaphone },
          { id: 'configs', label: 'Configs', icon: FileText },
          { id: 'support', label: 'Support', icon: MessageSquare },
          { id: 'maintenance', label: 'Maintenance', icon: Wrench },
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
        <div className="space-y-6">
          <div className="bg-[#111114] border border-zinc-800/60 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">Generate Keys</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setNewKeyType('script')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${newKeyType === 'script' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-800/40'}`}
                >
                  SCRIPT ONLY
                </button>
                <button 
                  onClick={() => setNewKeyType('internal')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${newKeyType === 'internal' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-800/40'}`}
                >
                  INTERNAL PAIR
                </button>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-4 relative">
                <input
                  value={manualInternalKey}
                  onChange={(e) => setManualInternalKey(e.target.value)}
                  placeholder="Internal Key (Auto)"
                  disabled={newKeyType === 'script'}
                  className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-xl px-4 py-3 text-sm disabled:opacity-30 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
                {newKeyType === 'internal' && (
                  <button
                    onClick={() => setManualInternalKey(generateInternalLicense())}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"
                  >
                    <Shuffle size={14} />
                  </button>
                )}
              </div>
              <div className="col-span-4 relative">
                <input
                  value={manualScriptKey}
                  onChange={(e) => setManualScriptKey(e.target.value)}
                  placeholder="Script Key (Auto)"
                  className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-xl px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
                <button
                  onClick={() => setManualScriptKey(generateScriptLicense())}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"
                >
                  <Shuffle size={14} />
                </button>
              </div>
              <div className="col-span-4">
                <input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Note / Tag"
                  className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-xl px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            <button
              onClick={generateKey}
              disabled={generating}
              className="w-full h-12 rounded-xl text-sm font-bold tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: accent, color: accentText }}
            >
              <Plus size={18} />
              {generating ? 'CREATING...' : 'CREATE LICENSE KEY'}
            </button>
          </div>

          <div className="bg-[#111114] border border-zinc-800/60 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-zinc-800/60 bg-zinc-900/20 flex items-center justify-between">
              <h3 className="text-white text-sm font-bold uppercase tracking-wider">License Keys</h3>
              <div className="flex items-center gap-3">
                <span className="text-zinc-600 text-[10px] font-bold">{keys.filter(k => !k.used).length} available / {keys.length} total</span>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input
                    type="text"
                    value={keySearchQuery}
                    onChange={e => setKeySearchQuery(e.target.value)}
                    placeholder="Search keys..."
                    className="bg-[#1a1a1e] border border-zinc-800/60 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-600 w-64"
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/60 text-[10px] uppercase font-bold tracking-widest text-zinc-600">
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Key</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Used By</th>
                    <th className="px-6 py-4">Note</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/30">
                  {filteredKeys.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-zinc-600 text-sm italic">
                        {keys.length === 0 ? 'No license keys found.' : 'No keys match your search.'}
                      </td>
                    </tr>
                  ) : (
                    filteredKeys.map(k => (
                      <tr key={k.id} className="hover:bg-zinc-800/10 transition group">
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-tighter ${k.type === 'internal' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700/50'}`}>
                            {k.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 group/key">
                            <code className="text-zinc-400 text-[11px] font-mono">
                              {revealedKeys[k.id] ? (k.internal_key || k.script_key) : hashDisplay(k.internal_key || k.script_key)}
                            </code>
                            <button onClick={() => toggleReveal(k.id)} className="text-zinc-600 hover:text-white transition opacity-0 group-hover/key:opacity-100">
                              {revealedKeys[k.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                            </button>
                            {revealedKeys[k.id] && <CopyBtn value={k.internal_key || k.script_key} />}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${k.used ? 'bg-red-500' : 'bg-green-500'}`} />
                            <span className={`text-[11px] font-bold uppercase ${k.used ? 'text-red-400' : 'text-green-400'}`}>
                              {k.used ? 'Redeemed' : 'Active'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {k.used_by_username ? (
                            <button
                              onClick={() => openUserDetails(accounts.find(a => a.username === k.used_by_username) || { username: k.used_by_username })}
                              className="text-indigo-400 hover:text-indigo-300 text-xs font-medium hover:underline transition text-left"
                            >
                              @{k.used_by_username}
                            </button>
                          ) : (
                            <span className="text-zinc-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-zinc-500 text-[11px] max-w-[150px] truncate block">
                            {k.note || <span className="italic text-zinc-700">—</span>}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedKey(k)}
                              className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                              title="View Key Details"
                            >
                              <ExternalLink size={14} />
                            </button>
                            <button
                              onClick={() => removeLicenseKey(k.id)}
                              className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                              title="Delete Key"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-[#111114] border border-zinc-800/60 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800/60 bg-zinc-900/20 flex items-center justify-between">
            <h3 className="text-white text-sm font-bold uppercase tracking-wider">User Directory</h3>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input 
                type="text"
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="bg-[#1a1a1e] border border-zinc-800/60 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-600 w-64"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/60 text-[10px] uppercase font-bold tracking-widest text-zinc-600">
                  <th className="px-6 py-4">UID</th>
                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4">Discord</th>
                  <th className="px-6 py-4">License</th>
                  <th className="px-6 py-4">Last Login</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-600 text-sm italic">
                      {accounts.length === 0 ? 'No users found.' : 'No users match your search.'}
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map(a => (
                    <tr key={a.id || a.username} className="hover:bg-zinc-800/10 transition group">
                      <td className="px-6 py-4">
                        <span className="text-zinc-500 text-[11px] font-mono">#{String(a.unique_identifier || 0).padStart(3, '0')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 border border-zinc-700/50">
                            <User size={14} />
                          </div>
                          <div>
                            <div className="text-white text-xs font-bold flex items-center gap-2">
                              {a.username}
                              {a.is_admin && <Shield size={10} className="text-amber-500" />}
                            </div>
                            <span className="text-[10px] text-zinc-600 uppercase tracking-tighter">
                              {a.is_admin ? 'Administrator' : 'User'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {a.discord_id ? (
                          <div className="flex flex-col">
                            <span className="text-zinc-300 text-xs truncate max-w-[120px]">{a.discord_username}</span>
                            <span className="text-[9px] text-zinc-600 font-mono">{a.discord_id}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-700 text-xs italic">Not linked</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 group/key">
                          <code className="text-zinc-500 text-[10px] font-mono">
                            {revealedKeys[`u-${a.username}-int`] ? (a.internal_license || 'NO LICENSE') : hashDisplay(a.internal_license)}
                          </code>
                          {a.internal_license && (
                            <button onClick={() => toggleReveal(`u-${a.username}-int`)} className="text-zinc-600 hover:text-white transition opacity-0 group-hover/key:opacity-100">
                              {revealedKeys[`u-${a.username}-int`] ? <EyeOff size={11} /> : <Eye size={11} />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-zinc-500 text-[11px]">
                          {a.last_login ? new Date(a.last_login).toLocaleDateString() : 'Never'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">

                          {a.username !== 'admin' && (
                            <button
                              onClick={() => setConfirmAdminTarget(a)}
                              disabled={panelWorking}
                              className={`p-2 rounded-lg transition disabled:opacity-40 ${
                                a.is_admin
                                  ? 'text-amber-500 hover:text-amber-300 hover:bg-amber-500/10'
                                  : 'text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10'
                              }`}
                              title={a.is_admin ? 'Revoke Admin' : 'Make Admin'}
                            >
                              <Shield size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => openUserDetails(a)}
                            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                            title="View Full Profile"
                          >
                            <ExternalLink size={14} />
                          </button>
                          {a.username !== 'admin' && (
                            <button
                              onClick={() => removeUser(a)}
                              className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                              title="Ban/Remove User"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
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
            className="w-full min-h-[120px] bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition resize-none"
          />
          <button
            onClick={saveAnnouncementValue}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition shadow-lg"
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
            <p className="text-zinc-400 text-xs mb-2 uppercase font-bold tracking-widest">Default Cloud Config Template</p>
            <textarea
              value={defaultCloudConfig}
              onChange={(e) => setDefaultCloudConfigState(e.target.value)}
              className="w-full min-h-[180px] bg-[#1a1a1e] border border-zinc-700/50 text-zinc-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-zinc-500 transition resize-none"
            />
          </div>
          <div>
            <p className="text-zinc-400 text-xs mb-2 uppercase font-bold tracking-widest">Preview Config Template</p>
            <textarea
              value={previewConfig}
              onChange={(e) => setPreviewConfigState(e.target.value)}
              className="w-full min-h-[180px] bg-[#1a1a1e] border border-zinc-700/50 text-zinc-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-zinc-500 transition resize-none"
            />
          </div>
          <button
            onClick={saveConfigTemplates}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition shadow-lg"
            style={{ background: accent, color: accentText, border: accentBorder }}
          >
            <Save size={13} />
            Save Config Templates
          </button>
        </div>
      )}
      {tab === 'support' && (
        <div className="flex bg-[#111114] border border-zinc-800/60 rounded-2xl overflow-hidden h-[600px] shadow-2xl">
          
          <div className="w-72 border-r border-zinc-800/60 flex flex-col bg-[#0c0c0e]/50">
            <div className="p-4 border-b border-zinc-800/60 bg-zinc-900/20">
              <h3 className="text-white text-[10px] font-bold uppercase tracking-widest text-zinc-500">Active Support</h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {Array.from(new Set(supportMessages.map(m => m.owner_username))).map(uid => {
                const userMsgs = supportMessages.filter(m => m.owner_username === uid);
                const lastMsg = userMsgs[userMsgs.length - 1];
                const unreadCount = userMsgs.filter(m => !m.is_read && m.sender_type === 'user').length;
                const isActive = activeSupportUser?.username === uid;
                const userData = accounts.find(a => String(a.username) === uid);
                
                return (
                  <button 
                    key={uid}
                    onClick={() => setActiveSupportUser(userData || { username: uid })}
                    className={`w-full p-4 text-left border-b border-zinc-800/20 transition group relative ${isActive ? 'bg-zinc-800/40' : 'hover:bg-zinc-800/20'}`}
                  >
                    {isActive && <div className="absolute left-0 top-2 bottom-2 w-1 bg-white rounded-r-full" style={{ background: accent }} />}
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                        @{uid} <span className="text-[9px] opacity-40 ml-1">#{String(userData?.unique_identifier || 0).padStart(3, '0')}</span>
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
                        {new Date(lastMsg?.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
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

          
          <div className="flex-1 flex flex-col bg-[#0c0c0e]/30 relative">
            {activeSupportUser ? (
              <>
                <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between bg-zinc-900/40 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 border border-zinc-700/50">
                      <User size={16} />
                    </div>
                    <div>
                      <span className="text-white text-sm font-bold">Support: {activeSupportUser.username}</span>
                      <p className="text-green-500 text-[9px] font-medium tracking-wide uppercase">Active Conversation</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => openUserDetails(activeSupportUser)}
                      className="text-zinc-500 hover:text-white transition p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
                      title="View User Profile"
                    >
                      <ExternalLink size={16} />
                    </button>
                    <button onClick={() => setActiveSupportUser(null)} className="text-zinc-500 hover:text-white transition p-2">
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth">
                  {supportMessages
                    .filter(m => m.owner_username === activeSupportUser.username)
                    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
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
                                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

                      const payload = {
                        username: 'Staff',
                        content,
                        image_url: imageUrl,
                        sender_type: 'admin',
                        is_read: true,
                        created_at: new Date().toISOString()
                      };

                      await db.entities.CloudConfig.create({
                        owner_username: activeSupportUser.username,
                        name: "__SUPPORT_MSG__",
                        content: JSON.stringify(payload)
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
                          placeholder={`Message @${activeSupportUser.username}`}
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

      {tab === 'maintenance' && (() => {
        const isActive = maintenance.active;
        async function saveMaintenance(patch) {
          const next = { ...maintenance, ...patch };
          setMaintenanceState(next);
          try { await setMaintenance(next); } catch (err) { setPanelError(err?.message || 'Failed to save maintenance settings.'); }
        }
        return (
          <div className="space-y-6">
            {/* Status Banner */}
            <div className={`rounded-2xl p-5 border flex items-center justify-between ${isActive ? 'bg-red-500/10 border-red-500/30' : 'bg-zinc-900/40 border-zinc-800/60'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isActive ? 'bg-red-500/20' : 'bg-zinc-800'}`}>
                  <Wrench size={20} className={isActive ? 'text-red-400' : 'text-zinc-500'} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Maintenance Mode</p>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isActive ? 'text-red-400' : 'text-zinc-500'}`}>
                    {isActive ? '🔴 Currently Active — Site is locked' : '🟢 Inactive — Site is live'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {isActive ? (
                  <button
                    onClick={() => saveMaintenance({ active: false })}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 text-xs font-bold transition"
                  >
                    <StopCircle size={14} />
                    STOP MAINTENANCE
                  </button>
                ) : (
                  <button
                    onClick={() => saveMaintenance({ active: true })}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition"
                    style={{ background: accent, color: accentText }}
                  >
                    <Wrench size={14} />
                    ACTIVATE MAINTENANCE
                  </button>
                )}
              </div>
            </div>

            {/* Time Range */}
            <div className="bg-[#111114] border border-zinc-800/60 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <CalendarClock size={16} className="text-zinc-500" />
                <h3 className="text-white font-bold text-sm">Maintenance Window</h3>
              </div>
              <p className="text-zinc-500 text-xs">Set the duration for the maintenance. The countdown will be shown to users.</p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-2">Duration</label>
                  <input
                    id="maint-duration"
                    type="number"
                    placeholder="e.g. 30"
                    defaultValue="30"
                    className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-500 transition"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-2">Unit</label>
                  <select
                    id="maint-unit"
                    defaultValue="minutes"
                    className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-500 transition"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => {
                  const duration = parseFloat(document.getElementById('maint-duration').value);
                  if (isNaN(duration) || duration <= 0) return alert('Enter a valid duration');
                  const unit = document.getElementById('maint-unit').value;
                  const now = new Date();
                  const end = new Date(now.getTime());
                  if (unit === 'minutes') end.setMinutes(end.getMinutes() + duration);
                  if (unit === 'hours') end.setHours(end.getHours() + duration);
                  if (unit === 'days') end.setDate(end.getDate() + duration);
                  
                  saveMaintenance({ active: true, from: now.toISOString(), to: end.toISOString() });
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition"
                style={{ background: accent, color: accentText }}
              >
                <Save size={14} />
                Start Maintenance Window
              </button>
            </div>

            {/* Preview */}
            <div className="bg-[#111114] border border-zinc-800/60 rounded-2xl p-6 space-y-3">
              <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Banner Preview</p>
              <div className="rounded-xl bg-[#07070a] border border-zinc-800 p-8 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-1">
                  <Wrench size={28} className="text-red-400" />
                </div>
                <h2 className="text-white text-xl font-bold">Azov's website is currently in maintenance.</h2>
                <p className="text-zinc-400 text-sm">Check back later!</p>
                {(maintenance.from || maintenance.to) && (
                  <div className="flex items-center gap-2 mt-1 px-4 py-2 rounded-full bg-zinc-800/60 border border-zinc-700/40">
                    <Clock size={13} className="text-zinc-500" />
                    <span className="text-zinc-300 text-xs font-mono">
                      {maintenance.from ? new Date(maintenance.from).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '?'}
                      {' — '}
                      {maintenance.to ? new Date(maintenance.to).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '?'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          accent={accent}
          onUpdate={loadData}
        />
      )}

      {selectedKey && (
        <KeyDetailModal
          keyRecord={selectedKey}
          onClose={() => setSelectedKey(null)}
          accent={accent}
          onUpdate={loadData}
          accounts={accounts}
        />
      )}

      {/* Confirm Admin Toggle Modal */}
      {confirmAdminTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setConfirmAdminTarget(null)}>
          <div className="bg-[#111114] border border-amber-500/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Shield size={18} className="text-amber-500" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Confirm Action</p>
                <p className="text-zinc-500 text-[11px]">{confirmAdminTarget.is_admin ? 'Revoke administrator' : 'Grant administrator'} privileges</p>
              </div>
            </div>
            <p className="text-zinc-400 text-xs mb-5 leading-relaxed">
              Are you sure you want to {confirmAdminTarget.is_admin ? <><span className="text-red-400 font-bold">revoke admin</span> from</> : <><span className="text-amber-400 font-bold">grant admin</span> to</>} <span className="text-white font-bold">@{confirmAdminTarget.username}</span>?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleInlineToggleAdmin(confirmAdminTarget)}
                disabled={panelWorking}
                className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold transition disabled:opacity-50 ${
                  confirmAdminTarget.is_admin
                    ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30'
                    : 'bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30'
                }`}
              >
                {panelWorking ? 'WORKING...' : confirmAdminTarget.is_admin ? 'YES, REVOKE ADMIN' : 'YES, MAKE ADMIN'}
              </button>
              <button
                onClick={() => setConfirmAdminTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-[11px] font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
