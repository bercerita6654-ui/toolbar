import React, { useState } from 'react';
import { 
  SiteRulesConfig, 
  PinnedSiteRule, 
  ToolbarDisplayMode 
} from '../types/siteRules';
import { extractCleanHostname } from '../utils/siteRulesStorage';
import { 
  Globe, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  ShieldCheck, 
  Sparkles,
  ExternalLink,
  Settings,
  Pin
} from 'lucide-react';

interface SiteRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SiteRulesConfig;
  onSaveConfig: (updated: SiteRulesConfig) => void;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const SiteRulesModal: React.FC<SiteRulesModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onShowToast,
}) => {
  const [mode, setMode] = useState<ToolbarDisplayMode>(config.mode);
  const [pinnedSites, setPinnedSites] = useState<PinnedSiteRule[]>(config.pinnedSites);
  const [newDomain, setNewDomain] = useState('');
  const [newName, setNewName] = useState('');
  const [defaultPosition, setDefaultPosition] = useState(config.defaultPosition);

  if (!isOpen) return null;

  const handleAddSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    const clean = extractCleanHostname(newDomain);
    if (!clean) {
      onShowToast('Domain atau URL tidak valid!', 'error');
      return;
    }

    if (pinnedSites.some((s) => extractCleanHostname(s.domain) === clean)) {
      onShowToast(`Situs ${clean} sudah ada di dalam daftar!`, 'info');
      return;
    }

    const newRule: PinnedSiteRule = {
      id: 'site_' + Date.now(),
      domain: clean,
      name: newName.trim() || clean,
      enabled: true,
      autoShowToolbar: true,
      position: defaultPosition,
      addedAt: Date.now(),
    };

    const updated = [newRule, ...pinnedSites];
    setPinnedSites(updated);
    setNewDomain('');
    setNewName('');
    onShowToast(`Situs ${clean} berhasil ditambahkan ke daftar Pin Toolbar! 📌`, 'success');
  };

  const handleToggleSite = (id: string) => {
    setPinnedSites((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleDeleteSite = (id: string) => {
    setPinnedSites((prev) => prev.filter((s) => s.id !== id));
    onShowToast('Situs dihapus dari daftar aturan.', 'info');
  };

  const handleSaveAndApply = () => {
    const newConfig: SiteRulesConfig = {
      mode,
      pinnedSites,
      defaultPosition,
      shortcutKey: config.shortcutKey || 'Alt+Shift+N',
    };
    onSaveConfig(newConfig);
    onShowToast('Pengaturan aturan situs & Pin Toolbar berhasil disimpan! ⚙️', 'success');
    onClose();
  };

  const popularPresetSites = [
    { domain: 'notion.so', name: 'Notion Workspace' },
    { domain: 'stackoverflow.com', name: 'Stack Overflow' },
    { domain: 'detik.com', name: 'Detikcom Berita' },
    { domain: 'kompas.com', name: 'Kompas.com' },
    { domain: 'reddit.com', name: 'Reddit Discussions' },
  ];

  const handleAddPreset = (domain: string, name: string) => {
    const clean = extractCleanHostname(domain);
    if (pinnedSites.some((s) => extractCleanHostname(s.domain) === clean)) {
      onShowToast(`Situs ${clean} sudah aktif!`, 'info');
      return;
    }

    const newRule: PinnedSiteRule = {
      id: 'site_' + Date.now(),
      domain: clean,
      name,
      enabled: true,
      autoShowToolbar: true,
      position: defaultPosition,
      addedAt: Date.now(),
    };

    setPinnedSites((prev) => [newRule, ...prev]);
    onShowToast(`Situs ${name} berhasil ditambahkan! 📌`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <Pin className="w-4 h-4" />
            </span>
            <div>
              <h2 className="font-display font-bold text-slate-900 text-base">
                Pengaturan Pin Toolbar di Situs Tertentu
              </h2>
              <p className="text-xs text-slate-500">
                Pilih website/situs web di mana toolbar quick note & clipper otomatis muncul
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* 1. Mode Selector */}
          <div className="space-y-2">
            <label className="font-bold text-slate-900 block text-xs uppercase tracking-wider text-[11px]">
              Mode Muncul Toolbar di Browser
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Specific sites mode */}
              <div
                onClick={() => setMode('specific_sites')}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  mode === 'specific_sites'
                    ? 'bg-sky-50/80 border-sky-400 ring-2 ring-sky-300/50 text-sky-950 font-medium'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <span>🎯</span>
                    <span>Situs Tertentu</span>
                  </span>
                  {mode === 'specific_sites' && (
                    <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Hanya muncul otomatis di domain/situs yang Anda pilih di bawah.
                </p>
              </div>

              {/* All sites mode */}
              <div
                onClick={() => setMode('all_sites')}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  mode === 'all_sites'
                    ? 'bg-sky-50/80 border-sky-400 ring-2 ring-sky-300/50 text-sky-950 font-medium'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <span>🌐</span>
                    <span>Semua Situs</span>
                  </span>
                  {mode === 'all_sites' && (
                    <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Selalu muncul di setiap situs web yang Anda kunjungi.
                </p>
              </div>

              {/* Manual trigger mode */}
              <div
                onClick={() => setMode('manual_trigger')}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  mode === 'manual_trigger'
                    ? 'bg-sky-50/80 border-sky-400 ring-2 ring-sky-300/50 text-sky-950 font-medium'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <span>⌨️</span>
                    <span>Manual Saja</span>
                  </span>
                  {mode === 'manual_trigger' && (
                    <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Hanya muncul saat ditekan Alt+Shift+N atau klik kanan.
                </p>
              </div>
            </div>
          </div>

          {/* 2. Add New Website Input Form */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-sky-600" />
              <span>Tambah Situs Baru ke Daftar Pin Toolbar</span>
            </h4>
            <form onSubmit={handleAddSite} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="Domain/URL (contoh: github.com atau https://medium.com)..."
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-500"
              />
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nama Label (opsional)..."
                className="sm:w-44 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="submit"
                disabled={!newDomain.trim()}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah</span>
              </button>
            </form>

            {/* Quick Popular Presets */}
            <div className="pt-2 flex items-center gap-1.5 flex-wrap text-[11px]">
              <span className="text-slate-500 font-medium">Preset Cepat:</span>
              {popularPresetSites.map((p) => {
                const isAdded = pinnedSites.some((s) => extractCleanHostname(s.domain) === p.domain);
                return (
                  <button
                    key={p.domain}
                    type="button"
                    disabled={isAdded}
                    onClick={() => handleAddPreset(p.domain, p.name)}
                    className={`px-2 py-0.5 rounded-md border text-[10px] font-medium transition-colors ${
                      isAdded
                        ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                        : 'bg-white text-sky-700 border-sky-200 hover:bg-sky-100/70 cursor-pointer'
                    }`}
                  >
                    + {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Pinned Sites List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 block text-xs uppercase tracking-wider text-[11px]">
                Daftar Situs Terpilih ({pinnedSites.filter((s) => s.enabled).length} Aktif dari {pinnedSites.length})
              </label>
              <span className="text-[11px] text-slate-400">
                {mode === 'specific_sites' ? '📌 Mode Aktif' : 'ℹ️ Mode sedang diabaikan'}
              </span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto bg-white">
              {pinnedSites.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Belum ada situs yang ditambahkan. Tambahkan situs di atas.
                </div>
              ) : (
                pinnedSites.map((site) => {
                  return (
                    <div
                      key={site.id}
                      className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                        site.enabled ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={site.enabled}
                          onChange={() => handleToggleSite(site.id)}
                          className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                          title={site.enabled ? 'Nonaktifkan situs ini' : 'Aktifkan situs ini'}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-xs truncate">
                              {site.name}
                            </span>
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                              {site.domain}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {site.enabled ? '🟢 Toolbar otomatis muncul' : '⚪ Toolbar dinonaktifkan'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleDeleteSite(site.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus dari daftar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={handleSaveAndApply}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Simpan & Terapkan Aturan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
