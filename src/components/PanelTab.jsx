import { useState, useEffect, useMemo } from 'react';
import { deleteUserAccount, generateInternalLicense, generateScriptLicense, normalizeAccountDiscordLink, upgradeToInternal } from '@/lib/auth';
import { getBackendDb } from '@/lib/backend';
import { getAnnouncement, setAnnouncement, getMaintenance, setMaintenance, getSpotifyUrl, setSpotifyUrl } from '@/lib/app-settings';

import {
  getDefaultCloudConfig,
  getPreviewConfig,
  getScriptPreviewConfig,
  setDefaultCloudConfig,
  setPreviewConfig,
  setScriptPreviewConfig,
  getConfigTemplatesShared,
  saveConfigTemplatesShared,
} from '@/lib/config-templates';
import { createLicenseKeyRecord, deleteLicenseKeyRecord, getLicenseKeys, updateLicenseKeyRecord } from '@/lib/license-keys';
import {
  createDownloadItem,
  deleteDownloadItem,
  DETECTION_STATUSES,
  DOWNLOAD_STATUSES,
  getDownloadItems,
  updateDownloadItem,
} from '@/lib/downloads';
import { Copy, Check, Key, Users, Plus, Eye, EyeOff, Download, Trash2, Save, Megaphone, Shuffle, FileText, ExternalLink, Shield, User, Search, Wrench, CalendarClock, StopCircle, ImagePlus, Music, SendHorizontal } from 'lucide-react';


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

export default function PanelTab({ accent, session, onAnnouncementSaved, onAction }) {
  const [keys, setKeys] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState('keys');
  const [revealedKeys, setRevealedKeys] = useState({});
  const [downloads, setDownloads] = useState([]);
  const [announcement, setAnnouncementState] = useState('');
  const [defaultCloudConfig, setDefaultCloudConfigState] = useState('');
  const [previewConfig, setPreviewConfigState] = useState('');
  const [scriptPreviewConfig, setScriptPreviewConfigState] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [note, setNote] = useState('');
  const [newKeyType, setNewKeyType] = useState('script');
  const [manualInternalKey, setManualInternalKey] = useState('');
  const [manualScriptKey, setManualScriptKey] = useState('');
  const [bulkScriptKeys, setBulkScriptKeys] = useState('');
  const [newDownload, setNewDownload] = useState({
    name: '',
    version: 'Version 1.0.0',
    status: 'stable',
    detection_status: 'UNSURE',
    action_label: 'download',
    file_url: '',
    open_url: '',
  });
  const [panelError, setPanelError] = useState('');
  const accentText = isLightColor(accent) ? '#000' : '#fff';
  const accentBorder = isLightColor(accent) ? '1px solid #444' : 'none';

  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [keySearchQuery, setKeySearchQuery] = useState('');
  const [confirmAdminTarget, setConfirmAdminTarget] = useState(null);
  const [assignInternalTarget, setAssignInternalTarget] = useState(null);
  const [assignInternalKeyId, setAssignInternalKeyId] = useState('');
  const [selectedKey, setSelectedKey] = useState(null);
  const [panelWorking, setPanelWorking] = useState(false);
  const [maintenance, setMaintenanceState] = useState({ active: false, from: '', to: '' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [spotifyUrl, setSpotifyUrlState] = useState('');



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

  const availableInternalKeys = useMemo(() => keys.filter(k => !k.used && k.type === 'internal' && !k.reserved_for_username), [keys]);

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
    const [keysResult, accountsResult, downloadsResult, announcementResult, spotifyResult] = await Promise.allSettled([
      getLicenseKeys(),
      getEntityRows('Account'),
      getDownloadItems(),
      getAnnouncement(),
      getSpotifyUrl(),
    ]);

    setKeys(keysResult.status === 'fulfilled' ? (keysResult.value || []) : []);
    setAccounts(
      accountsResult.status === 'fulfilled' && Array.isArray(accountsResult.value)
        ? accountsResult.value.map((row) => normalizeAccountDiscordLink(row))
        : []
    );
    setDownloads(downloadsResult.status === 'fulfilled' ? (downloadsResult.value || []) : []);
    setAnnouncementState(announcementResult.status === 'fulfilled' ? announcementResult.value : '');
    setSpotifyUrlState(spotifyResult.status === 'fulfilled' ? spotifyResult.value : '');

    try { const m = await getMaintenance(); setMaintenanceState(m); } catch {}

    const templates = await getConfigTemplatesShared();
    setDefaultCloudConfigState(String(templates.defaultCloudConfig || getDefaultCloudConfig()));
    setPreviewConfigState(String(templates.previewConfig || getPreviewConfig()));
    setScriptPreviewConfigState(String(templates.scriptPreviewConfig || getScriptPreviewConfig()));

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
      if (newKeyType === 'bulk') {
        const keysToCreate = bulkScriptKeys
          .split('\n')
          .map(k => k.trim())
          .filter(k => k.length > 0);
          
        if (keysToCreate.length === 0) {
          throw new Error('Please enter at least one key.');
        }

        await Promise.all(keysToCreate.map(scriptKey => {
          return createLicenseKeyRecord({
            type: 'script',
            internal_key: '',
            script_key: scriptKey,
            key: scriptKey,
            note: note.trim(),
            used: false,
          });
        }));

        setBulkScriptKeys('');
      } else {
        const internalKey = (newKeyType === 'internal' || newKeyType === 'internal_only') ? (manualInternalKey || generateInternalLicense()).trim() : '';
        const scriptKey = newKeyType === 'internal_only' ? internalKey : (manualScriptKey || generateScriptLicense()).trim();
        
        const payload = {
          type: (newKeyType === 'internal' || newKeyType === 'internal_only') ? 'internal' : 'script',
          internal_key: internalKey,
          script_key: scriptKey,
          key: scriptKey,
          note: note.trim(),
          used: false,
        };

        await createLicenseKeyRecord(payload);
      }
      
      setManualInternalKey('');
      setManualScriptKey('');
      setNote('');
      await loadData();
      if (typeof onAction === 'function') onAction();
    } catch (err) {

      console.error("Key generation failed:", err);
      setPanelError(err?.message || 'Failed to generate key(s).');
    } finally {
      setGenerating(false);
    }
  }

  async function removeLicenseKey(id) {
    await deleteLicenseKeyRecord(id);
    await loadData();
    if (typeof onAction === 'function') onAction();
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
        detection_status: 'UNSURE',
        action_label: 'download',
        file_url: '',
        open_url: '',
      });
      setPanelError('');
      await loadData();
      if (typeof onAction === 'function') onAction();
    } catch (error) {

      setPanelError(error?.message || 'Failed to create download item.');
    }
  }

  async function saveDownload(item) {
    try {
      await updateDownloadItem(item.id, item);
      setPanelError('');
      await loadData();
      if (typeof onAction === 'function') onAction();
    } catch (error) {

      setPanelError(error?.message || 'Failed to save download item.');
    }
  }

  async function removeDownload(id) {
    try {
      await deleteDownloadItem(id);
      setPanelError('');
      await loadData();
      if (typeof onAction === 'function') onAction();
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
    if (typeof onAction === 'function') onAction();
  }

  async function handleAnnouncementImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      setAnnouncementState(prev => prev + (prev ? '\n' : '') + file_url);
      if (typeof onAction === 'function') onAction();
    } catch (error) {
      setPanelError('Image upload failed: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  }



  function saveConfigTemplates() {
    (async () => {
      try {
        await Promise.all([
          saveConfigTemplatesShared({
            defaultCloudConfig,
            previewConfig,
            scriptPreviewConfig,
          }),
          setSpotifyUrl(spotifyUrl)
        ]);
        setPanelError('');
        if (typeof onAction === 'function') onAction();
      } catch (error) {
        setPanelError(error?.message || 'Failed to save configs.');
      }
    })();
  }


  async function removeUser(account) {
    if (!account?.username) return;
    if (account.username === 'admin') return;
    await deleteUserAccount(account);
    await loadData();
    if (typeof onAction === 'function') onAction();
  }

  async function assignInternalKeyToUser(account) {
    if (!account?.id || !account?.username || !assignInternalKeyId) return;
    setPanelWorking(true);
    setPanelError('');
    try {
      const keyRecord = keys.find((k) => k.id === assignInternalKeyId);
      if (!keyRecord || keyRecord.used || keyRecord.type !== 'internal') {
        throw new Error('Selected internal key is unavailable.');
      }
      await db.entities.Account.update(account.id, {
        assigned_internal_key: keyRecord.internal_key,
      });
      await updateLicenseKeyRecord(keyRecord.id, {
        reserved_for_username: account.username,
        note: `${keyRecord.note || ''}${keyRecord.note ? ' ' : ''}[ASSIGNED:${account.username}]`,
      });
      setAssignInternalTarget(null);
      setAssignInternalKeyId('');
      await loadData();
      if (typeof onAction === 'function') onAction();
    } catch (err) {
      setPanelError(err?.message || 'Failed to assign internal key.');
    } finally {
      setPanelWorking(false);
    }
  }


  async function handleInlineToggleAdmin(account) {
    if (!account?.id) return;
    setPanelWorking(true);
    try {
      await db.entities.Account.update(account.id, { is_admin: !account.is_admin });
      setConfirmAdminTarget(null);
      await loadData();
      if (typeof onAction === 'function') onAction();
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
          { id: 'keys', label: 'license keys', icon: Key },
          { id: 'users', label: 'users', icon: Users },
          { id: 'downloads', label: 'downloads', icon: Download },
          { id: 'announcement', label: 'announcement', icon: Megaphone },
          { id: 'configs', label: 'configs', icon: FileText },
          { id: 'music', label: 'music', icon: Music },
          { id: 'maintenance', label: 'maintenance', icon: Wrench },
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
              <h3 className="text-white font-bold text-lg">generate keys</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setNewKeyType('script')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${newKeyType === 'script' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-800/40'}`}
                >
                  script only
                </button>
                <button 
                  onClick={() => setNewKeyType('internal_only')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${newKeyType === 'internal_only' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-800/40'}`}
                >
                  internal only
                </button>
                <button 
                  onClick={() => setNewKeyType('internal')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${newKeyType === 'internal' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-800/40'}`}
                >
                  internal pair
                </button>
                <button 
                  onClick={() => setNewKeyType('bulk')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${newKeyType === 'bulk' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-800/40'}`}
                >
                  bulk add
                </button>
              </div>
            </div>

            {newKeyType === 'bulk' ? (
              <div className="space-y-3">
                <textarea
                  value={bulkScriptKeys}
                  onChange={(e) => setBulkScriptKeys(e.target.value)}
                  placeholder="paste script keys here (one per line)...&#10;scriptkey1&#10;scriptkey2&#10;scriptkey3"
                  className="w-full h-32 bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-xl px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 font-mono resize-y"
                />
                <input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="note (optional, applied to all keys)"
                  className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-xl px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-4 relative">
                  <input
                    value={manualInternalKey}
                    onChange={(e) => setManualInternalKey(e.target.value)}
                    placeholder="internal key (auto)"
                    disabled={newKeyType === 'script'}
                    className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-xl px-4 py-3 text-sm disabled:opacity-30 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                  {(newKeyType === 'internal' || newKeyType === 'internal_only') && (
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
                    placeholder="script key (auto)"
                    disabled={newKeyType === 'internal_only'}
                    className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-xl px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 disabled:opacity-30"
                  />
                  {newKeyType !== 'internal_only' && (
                    <button
                      onClick={() => setManualScriptKey(generateScriptLicense())}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"
                    >
                      <Shuffle size={14} />
                    </button>
                  )}
                </div>
                <div className="col-span-4">
                  <input
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="note"
                    className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-xl px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>
            )}

            <button
              onClick={generateKey}
              disabled={generating}
              className="w-full h-12 rounded-xl text-sm font-bold tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: accent, color: accentText }}
            >
              <Plus size={18} />
              {generating ? 'creating...' : 'create license key'}
            </button>
          </div>

          <div className="bg-[#111114] border border-zinc-800/60 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-zinc-800/60 bg-zinc-900/20 flex items-center justify-between">
              <h3 className="text-white text-sm font-bold tracking-wider">license keys</h3>
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
                    <th className="px-6 py-4">type</th>
                    <th className="px-6 py-4">key</th>
                    <th className="px-6 py-4">status</th>
                    <th className="px-6 py-4">used by</th>
                    <th className="px-6 py-4">note</th>
                    <th className="px-6 py-4 text-right">actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/30">
                  {filteredKeys.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-zinc-600 text-sm italic">
                        {keys.length === 0 ? 'no license keys found.' : 'no keys match your search.'}
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
                              {k.used ? 'redeemed' : 'active'}
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
                              title="view key details"
                            >
                              <ExternalLink size={14} />
                            </button>
                            <button
                              onClick={() => removeLicenseKey(k.id)}
                              className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                              title="delete key"
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
            <h3 className="text-white text-sm font-bold tracking-wider">user directory</h3>
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
                  <th className="px-6 py-4">uid</th>
                  <th className="px-6 py-4">username</th>
                  <th className="px-6 py-4">discord</th>
                  <th className="px-6 py-4">license</th>
                  <th className="px-6 py-4">last login</th>
                  <th className="px-6 py-4 text-right">actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-600 text-sm italic">
                      {accounts.length === 0 ? 'no users found.' : 'no users match your search.'}
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
                              {a.is_admin ? 'administrator' : 'user'}
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
                          <span className="text-zinc-700 text-xs italic">not linked</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 group/key">
                          <code className="text-zinc-500 text-[10px] font-mono">
                            {revealedKeys[`u-${a.username}-int`] ? (a.internal_license || 'no license') : hashDisplay(a.internal_license)}
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
                          {a.last_login ? new Date(a.last_login).toLocaleDateString() : 'never'}
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
                              title={a.is_admin ? 'revoke admin' : 'make admin'}
                            >
                              <Shield size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => openUserDetails(a)}
                            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                            title="view full profile"
                          >
                            <ExternalLink size={14} />
                          </button>
                          {a.username !== 'admin' && (
                            <button
                              onClick={() => {
                                setAssignInternalTarget(a);
                                setAssignInternalKeyId('');
                              }}
                              disabled={panelWorking || !!a.internal_license || availableInternalKeys.length === 0}
                              className="p-2 text-zinc-500 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition disabled:opacity-40"
                              title={a.internal_license ? 'user already has internal license' : 'assign internal key to user'}
                            >
                              <SendHorizontal size={14} />
                            </button>
                          )}
                          {a.username !== 'admin' && (
                            <button
                              onClick={() => removeUser(a)}
                              className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                              title="ban/remove user"
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
            {(newDownload.name || '').toLowerCase().includes('internal') ? (
              <select
                value={newDownload.detection_status || 'UNSURE'}
                onChange={(e) => setNewDownload((prev) => ({ ...prev, detection_status: e.target.value }))}
                className="bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-zinc-500 transition"
                title="Detection Status (Internal)"
              >
                {DETECTION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {`detection status: ${String(s).toLowerCase()}`}
                  </option>
                ))}
              </select>
            ) : (
              <div className="hidden md:block" />
            )}
            <input
              value={newDownload.action_label}
              onChange={(e) => setNewDownload((prev) => ({ ...prev, action_label: e.target.value }))}
              placeholder="Button Label"
              className="bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-xs placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition"
            />
            <input
              value={newDownload.file_url}
              onChange={(e) => setNewDownload((prev) => ({ ...prev, file_url: e.target.value }))}
              placeholder="download file url"
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
              placeholder="open url (optional)"
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
                  {String(item.name || '').toLowerCase().includes('internal') ? (
                    <select
                      value={item.detection_status || 'UNSURE'}
                      onChange={(e) => updateLocalDownload(item.id, { detection_status: e.target.value })}
                      className="bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-xs"
                      title="Detection Status (Internal)"
                    >
                      {DETECTION_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {`detection status: ${String(s).toLowerCase()}`}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="hidden md:block" />
                  )}
                  <input
                    value={item.action_label || ''}
                    onChange={(e) => updateLocalDownload(item.id, { action_label: e.target.value })}
                    className="bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-xs"
                  />
                  <input
                    value={item.file_url || ''}
                    onChange={(e) => updateLocalDownload(item.id, { file_url: e.target.value })}
                    className="bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-xs"
                    placeholder="download file url"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveDownload(item)}
                      className="flex-1 flex items-center justify-center gap-1 bg-[#1a1a1e] border border-zinc-700/50 text-zinc-200 hover:text-white hover:border-zinc-500 rounded-lg px-2 py-2 text-xs transition"
                    >
                      <Save size={11} />
                      save
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
                    placeholder="open url (optional)"
                  />
                </div>
              ))}
          </div>
        </div>
      )}

      {tab === 'announcement' && (
        <div className="bg-[#111114] border border-zinc-800/60 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-zinc-500 text-xs">this text replaces the dashboard "unique identifier" card.</p>
            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition ${uploadingImage ? 'opacity-50 cursor-not-allowed' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}>
              <ImagePlus size={12} />
              {uploadingImage ? 'uploading...' : 'attach image'}
              <input type="file" className="hidden" accept="image/*" onChange={handleAnnouncementImageUpload} disabled={uploadingImage} />
            </label>
          </div>
          <textarea
            value={announcement}
            onChange={(e) => setAnnouncementState(e.target.value)}
            placeholder="write announcement here..."
            className="w-full min-h-[120px] bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-3 py-2 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition resize-none"
          />
          <button
            onClick={async () => {
              setPanelWorking(true);
              await saveAnnouncementValue();
              setPanelWorking(false);
            }}
            disabled={panelWorking}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition shadow-lg disabled:opacity-50"
            style={{ background: accent, color: accentText, border: accentBorder }}
          >
            <Save size={13} />
            {panelWorking ? 'saving...' : 'save announcement'}
          </button>
        </div>
      )}


      {tab === 'configs' && (
        <div className="space-y-6">
          <div className="bg-[#111114] border border-zinc-800/60 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">Config Templates</h3>
              <button
                onClick={async () => {
                  setPanelWorking(true);
                  await saveConfigTemplates();
                  setPanelWorking(false);
                }}
                disabled={panelWorking}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition shadow-lg disabled:opacity-50"
                style={{ background: accent, color: accentText, border: accentBorder }}
              >
                <Save size={16} />
                {panelWorking ? 'Saving...' : 'Save All Templates'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {[
                { label: 'Default Cloud Config', state: defaultCloudConfig, setter: setDefaultCloudConfigState },
                { label: 'Preview Config', state: previewConfig, setter: setPreviewConfigState },
                { label: 'Script Preview Config', state: scriptPreviewConfig, setter: setScriptPreviewConfigState },
              ].map((cfg, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest">{cfg.label}</p>
                    <span className="text-[10px] text-zinc-600 font-mono italic">Editable Template</span>
                  </div>
                  <div className="bg-[#0b0b0e] border border-zinc-800/60 rounded-2xl overflow-hidden relative min-h-[300px] flex flex-col">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/40 bg-[#0d0d10]">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{cfg.label.replace(' Template', '')}</span>
                      <div className="w-10" />
                    </div>
                    <textarea
                      value={cfg.state}
                      onChange={(e) => cfg.setter(e.target.value)}
                      spellCheck="false"
                      className="flex-1 w-full bg-transparent text-zinc-200 p-4 text-xs font-mono focus:outline-none resize-none leading-relaxed selection:bg-zinc-700/50"
                      placeholder={`Enter ${cfg.label.toLowerCase()} content...`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {tab === 'music' && (
        <div className="bg-[#111114] border border-zinc-800/60 rounded-xl p-4 space-y-4">
          <div>
            <p className="text-zinc-400 text-xs mb-2 font-bold tracking-widest">global spotify player</p>
            <p className="text-zinc-500 text-[10px] mb-4">this url controls the floating draggable music widget for all users.</p>
            <input
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrlState(e.target.value)}
              placeholder="https://open.spotify.com/playlist/..."
              className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-lg px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition"
            />
            <p className="text-zinc-500 text-[10px] mt-2">paste a spotify playlist, album, or track link. it will automatically convert to an embed.</p>
          </div>
          <button
            onClick={async () => {
              setPanelWorking(true);
              await saveConfigTemplates();
              setPanelWorking(false);
            }}
            disabled={panelWorking}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition shadow-lg disabled:opacity-50"
            style={{ background: accent, color: accentText, border: accentBorder }}
          >
            <Save size={13} />
            {panelWorking ? 'saving...' : 'update player'}
          </button>
        </div>
      )}

      {tab === 'maintenance' && (() => {
        const isActive = maintenance.active;
        async function saveMaintenance(patch) {
          const next = { ...maintenance, ...patch };
          setMaintenanceState(next);
          try { 
            await setMaintenance(next); 
            if (typeof onAction === 'function') onAction();
          } catch (err) { setPanelError(err?.message || 'Failed to save maintenance settings.'); }
        }

        return (
          <div className="space-y-6">
            <div className={`rounded-2xl p-5 border flex items-center justify-between ${isActive ? 'bg-red-500/10 border-red-500/30' : 'bg-zinc-900/40 border-zinc-800/60'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isActive ? 'bg-red-500/20' : 'bg-zinc-800'}`}>
                  <Wrench size={20} className={isActive ? 'text-red-400' : 'text-zinc-500'} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">maintenance mode</p>
                  {isActive && (
                    <p className="text-xs font-semibold tracking-wider text-red-400">
                      currently active
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {isActive ? (
                  <button
                    onClick={() => saveMaintenance({ active: false })}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 text-xs font-bold transition"
                  >
                    <StopCircle size={14} />
                    stop maintenance
                  </button>
                ) : (
                  <button
                    onClick={() => saveMaintenance({ active: true })}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition"
                    style={{ background: accent, color: accentText }}
                  >
                    <Wrench size={14} />
                    activate maintenance
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#111114] border border-zinc-800/60 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <CalendarClock size={16} className="text-zinc-500" />
                <h3 className="text-white font-bold text-sm">maintenance window</h3>
              </div>
              <p className="text-zinc-500 text-xs">set the duration for maintenance. the countdown will be shown to users.</p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-bold tracking-widest text-zinc-500 block mb-2">duration</label>
                  <input
                    id="maint-duration"
                    type="number"
                    placeholder="e.g. 30"
                    defaultValue="30"
                    className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-500 transition"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold tracking-widest text-zinc-500 block mb-2">unit</label>
                  <select
                    id="maint-unit"
                    defaultValue="minutes"
                    className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-500 transition"
                  >
                    <option value="minutes">minutes</option>
                    <option value="hours">hours</option>
                    <option value="days">days</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => {
                  const duration = parseFloat(document.getElementById('maint-duration').value);
                  if (isNaN(duration) || duration <= 0) return alert('enter a valid duration');
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
        />
      )}

      {assignInternalTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setAssignInternalTarget(null)}>
          <div className="bg-[#111114] border border-indigo-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Key size={18} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Assign Internal Key</p>
                <p className="text-zinc-500 text-[11px]">User: @{assignInternalTarget.username}</p>
              </div>
            </div>

            <select
              value={assignInternalKeyId}
              onChange={(e) => setAssignInternalKeyId(e.target.value)}
              className="w-full bg-[#1a1a1e] border border-zinc-700/50 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-500 transition"
            >
              <option value="">Select available internal key...</option>
              {availableInternalKeys.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.internal_key}
                </option>
              ))}
            </select>

            <p className="text-zinc-500 text-[11px] mt-3">
              this reserves the key for this user. they can redeem it in settings to upgrade.
            </p>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => assignInternalKeyToUser(assignInternalTarget)}
                disabled={panelWorking || !assignInternalKeyId}
                className="flex-1 py-2.5 rounded-xl text-[11px] font-bold bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30 transition disabled:opacity-50"
              >
                {panelWorking ? 'assigning...' : 'assign key'}
              </button>
              <button
                onClick={() => setAssignInternalTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-[11px] font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition"
              >
                cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAdminTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setConfirmAdminTarget(null)}>
          <div className="bg-[#111114] border border-amber-500/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Shield size={18} className="text-amber-500" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">confirm action</p>
                <p className="text-zinc-500 text-[11px]">{confirmAdminTarget.is_admin ? 'revoke administrator' : 'grant administrator'} privileges</p>
              </div>
            </div>
            <p className="text-zinc-400 text-xs mb-5 leading-relaxed">
              are you sure you want to {confirmAdminTarget.is_admin ? <><span className="text-red-400 font-bold">revoke admin</span> from</> : <><span className="text-amber-400 font-bold">grant admin</span> to</>} <span className="text-white font-bold">@{confirmAdminTarget.username}</span>?
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
                {panelWorking ? 'working...' : confirmAdminTarget.is_admin ? 'yes, revoke admin' : 'yes, make admin'}
              </button>
              <button
                onClick={() => setConfirmAdminTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-[11px] font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition"
              >
                cancel
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
