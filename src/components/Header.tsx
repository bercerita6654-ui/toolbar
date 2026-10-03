import React from 'react';
import { ViewMode } from '../types/note';
import { Download, Plus, Search, Cloud, RefreshCw, CheckCircle2, AlertCircle, Calendar, Package } from 'lucide-react';
import { SyncStatus } from '../services/cloudAutoSync';

interface HeaderProps {
  currentMode: ViewMode;
  onSelectMode: (mode: ViewMode) => void;
  onOpenNewNoteModal: () => void;
  onOpenGlobalSearch: () => void;
  onOpenDriveSyncModal: () => void;
  onDownloadExtension: () => void;
  notesCount: number;
  remindersCount?: number;
  syncStatus: SyncStatus;
  isAuthenticated: boolean;
  userEmail?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  onOpenNewNoteModal,
  onOpenGlobalSearch,
  onOpenDriveSyncModal,
  onDownloadExtension,
  remindersCount = 0,
  syncStatus,
  isAuthenticated,
  userEmail,
}) => {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            onSelectMode('dashboard');
          }}
          className="font-display text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-xs">
            ⚡
          </span>
          QuickNotes Pro
        </a>
      </div>

      {/* Zone 2: 4-6 clean single-line navigation links + Global Search Button */}
      <div className="flex items-center gap-2">
        <nav className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            onClick={() => onSelectMode('sidepanel')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              currentMode === 'sidepanel'
                ? 'bg-sky-600 text-white shadow-xs font-bold'
                : 'text-slate-700 hover:text-slate-900 bg-white/70 font-semibold'
            }`}
          >
            <span>📌</span>
            <span>Chrome Side Panel</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${
              currentMode === 'sidepanel' ? 'bg-white text-sky-700' : 'bg-sky-100 text-sky-700'
            }`}>
              Utama
            </span>
          </button>

          <button
            onClick={() => onSelectMode('dashboard')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              currentMode === 'dashboard'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Studio Catatan
          </button>

          <button
            onClick={() => onSelectMode('calendar')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              currentMode === 'calendar'
                ? 'bg-white text-sky-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-sky-600" />
            <span>Kalender</span>
            {remindersCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {remindersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectMode('stock')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              currentMode === 'stock'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-emerald-700 hover:text-emerald-900 font-semibold bg-emerald-50/80 border border-emerald-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Stok Google Sheet</span>
          </button>

          <button
            onClick={() => onSelectMode('extension_popup')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              currentMode === 'extension_popup'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Toolbar Popup
          </button>

          <button
            onClick={() => onSelectMode('browser_clipper_demo')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              currentMode === 'browser_clipper_demo'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Web Clipper & Aturan Situs
          </button>

          <button
            onClick={() => onSelectMode('extension_builder')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              currentMode === 'extension_builder'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Source Manifest V3
          </button>
        </nav>

        {/* Global Search Quick Trigger */}
        <button
          onClick={onOpenGlobalSearch}
          className="hidden sm:flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
          title="Buka Pencarian Global (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-sky-600" />
          <span className="text-slate-600">Cari...</span>
          <kbd className="bg-white px-1.5 py-0.5 rounded text-[10px] text-slate-500 border border-slate-300 font-mono shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Zone 3: Real-Time Cross-Device Sync Indicator & Primary actions */}
      <div className="flex items-center gap-2">
        {/* Live Cloud Multi-Device Sync Indicator */}
        <button
          onClick={onOpenDriveSyncModal}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
            isAuthenticated
              ? syncStatus === 'syncing'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : syncStatus === 'error'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
          title={
            isAuthenticated
              ? `Login sebagai: ${userEmail}\nTersinkronisasi otomatis antar komputer.`
              : 'Klik untuk masuk dengan Akun Google agar tersinkronisasi otomatis saat login di komputer lain'
          }
        >
          {isAuthenticated ? (
            syncStatus === 'syncing' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                <span className="hidden xl:inline">Menyinkronkan...</span>
              </>
            ) : syncStatus === 'error' ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden xl:inline">Periksa Sync</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden xl:inline">Auto-Sync Komputer Lain</span>
                <span className="xl:hidden">Sync</span>
              </>
            )
          ) : (
            <>
              <Cloud className="w-3.5 h-3.5 text-sky-600" />
              <span className="hidden xl:inline">Sync Komputer Lain</span>
              <span className="xl:hidden">Sync</span>
            </>
          )}
        </button>

        <button
          onClick={onDownloadExtension}
          className="hidden md:flex px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors items-center gap-1.5 whitespace-nowrap"
          title="Unduh paket ZIP ekstensi untuk dipasang di Chrome"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Unduh .ZIP</span>
        </button>

        <button
          onClick={onOpenNewNoteModal}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-xs hover:shadow transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Catatan</span>
        </button>
      </div>
    </header>
  );
};
