import React, { useState, useEffect, useMemo } from 'react';
import { Note } from '../types/note';
import { SiteRulesConfig, DEFAULT_SITE_RULES_CONFIG, PinnedSiteRule } from '../types/siteRules';
import { getStoredSiteRules, saveStoredSiteRules, shouldShowToolbarOnSite, extractCleanHostname } from '../utils/siteRulesStorage';
import { SiteRulesModal } from './SiteRulesModal';
import { 
  Globe, 
  Sparkles, 
  MousePointerClick, 
  Check, 
  ExternalLink,
  BookOpen,
  HelpCircle,
  Pin,
  Settings,
  Plus,
  Clock,
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  Sliders,
  ChevronDown,
  Layers,
  Search,
  Eye,
  EyeOff
} from 'lucide-react';

interface BrowserClipperDemoProps {
  onSaveNote: (note: Partial<Note>) => void;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

interface SimulatedPage {
  id: string;
  url: string;
  title: string;
  badge: string;
  category: string;
  content: string;
  sampleQuote: string;
}

const SIMULATED_PAGES: SimulatedPage[] = [
  {
    id: 'wiki',
    url: 'https://id.wikipedia.org/wiki/Kecerdasan_buatan',
    title: 'Kecerdasan Buatan & Efisiensi Pencatatan Digital',
    badge: 'Wikipedia Indonesia',
    category: 'Ensiklopedia Bebas',
    content: 'Kecerdasan buatan telah mengubah cara para profesional dan pelajar mengumpulkan data. Alih-alih menyalin secara manual ke aplikasi terpisah, integrasi ekstensi Google Chrome memungkinkan kliping data instan langsung dari dokumen sumber dengan mencantumkan URL dan timestamp secara otomatis.',
    sampleQuote: 'Penggunaan sistem penyimpanan awan terintegrasi seperti Google Drive yang dikombinasikan dengan editor teks kaya memungkinkan fleksibilitas tinggi bagi pengguna untuk menyusun catatan terstruktur.',
  },
  {
    id: 'github',
    url: 'https://github.com/reactjs/react-notes-extension',
    title: 'QuickNotes Manifest V3 Pro Source Repository',
    badge: 'GitHub Developer Repository',
    category: 'Kode & Repositori',
    content: 'Repository ini berisi arsitektur Chrome Extension Manifest V3 dengan dukungan Background Service Worker, Chrome Side Panel API, declarative content scripts, serta sinkronisasi multi-perangkat real-time.',
    sampleQuote: 'Ekstensi ini dibangun dengan standar Manifest V3 modern, memastikan performa tinggi dan keamanan isolasi script pada setiap domain yang diizinkan pengguna.',
  },
  {
    id: 'gdocs',
    url: 'https://docs.google.com/document/d/1vA9kZ8-proyek-strategis',
    title: 'Dokumen Rencana Kerja & Catatan Rapat Kuartal 4',
    badge: 'Google Docs Workspace',
    category: 'Dokumen Tim',
    content: 'Ringkasan agenda strategi digital: Evaluasi fitur pengingat, penyesuaian aturan situs untuk toolbar mengambang, dan sinkronisasi lintas browser untuk mempermudah alur kerja harian.',
    sampleQuote: 'Prioritaskan otomasi pencatatan kilat pada tab aktif tanpa mengganggu fokus membaca dokumen utama.',
  },
  {
    id: 'medium',
    url: 'https://medium.com/tech-insights/best-productivity-tools-2026',
    title: '10 Panduan Produktivitas Riset Web Modern di 2026',
    badge: 'Medium Tech Blog',
    category: 'Artikel & Panduan',
    content: 'Mengapa membatasi ekstensi browser hanya pada situs tertentu adalah langkah tepat: Menghemat memori RAM browser, menjaga privasi, dan menghilangkan elemen antarmuka yang tidak diinginkan pada situs santai.',
    sampleQuote: 'Fitur Pin Toolbar pada domain tertentu memberikan kontrol penuh kepada pengguna kapan dan di mana widget pencatatan harus muncul.',
  },
  {
    id: 'detik',
    url: 'https://news.detik.com/teknologi/perkembangan-browser-ai',
    title: 'Tren Ekstensi Browser & Produktivitas Digital',
    badge: 'Portal Berita Detikcom',
    category: 'Berita Teknologi',
    content: 'Pengguna browser modern semakin menyukai personalisasi alat bantu pencatatan yang cerdas dan hemat daya baterai.',
    sampleQuote: 'Kemampuan memilih situs mana saja yang menampilkan tombol floating memo mempermudah pengumpulan berita dan fakta terverifikasi.',
  },
];

export const BrowserClipperDemo: React.FC<BrowserClipperDemoProps> = ({
  onSaveNote,
  onShowToast,
}) => {
  const [siteRules, setSiteRules] = useState<SiteRulesConfig>(() => getStoredSiteRules());
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  
  // Active simulated page
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [customUrlInput, setCustomUrlInput] = useState(SIMULATED_PAGES[0].url);
  const [selectedText, setSelectedText] = useState('');
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const [quickNoteTitle, setQuickNoteTitle] = useState('');
  const [quickNoteContent, setQuickNoteContent] = useState('');

  const activePage = SIMULATED_PAGES[activePageIndex] || {
    id: 'custom',
    url: customUrlInput,
    title: 'Halaman Web Kustom',
    badge: 'Situs Web Pengguna',
    category: 'Kustom',
    content: 'Ini adalah simulasi halaman web kustom berdasarkan URL yang Anda masukkan.',
    sampleQuote: 'Anda dapat menguji apakah toolbar mengambang muncul atau tersembunyi pada domain ini sesuai aturan yang telah Anda tetapkan.',
  };

  const currentHostname = useMemo(() => {
    return extractCleanHostname(activePage.url);
  }, [activePage.url]);

  // Determine if pinned toolbar should appear on current website
  const isToolbarVisibleOnCurrentSite = useMemo(() => {
    return shouldShowToolbarOnSite(activePage.url, siteRules);
  }, [activePage.url, siteRules]);

  // Is current website explicitly in the pinned list?
  const isCurrentSitePinned = useMemo(() => {
    return siteRules.pinnedSites.some(
      (s) => extractCleanHostname(s.domain) === currentHostname && s.enabled
    );
  }, [currentHostname, siteRules]);

  const handleTogglePinCurrentSite = () => {
    const existingIndex = siteRules.pinnedSites.findIndex(
      (s) => extractCleanHostname(s.domain) === currentHostname
    );

    let updatedSites: PinnedSiteRule[];
    let nowEnabled = false;

    if (existingIndex >= 0) {
      // Toggle existing
      nowEnabled = !siteRules.pinnedSites[existingIndex].enabled;
      updatedSites = siteRules.pinnedSites.map((s, idx) =>
        idx === existingIndex ? { ...s, enabled: nowEnabled, autoShowToolbar: nowEnabled } : s
      );
    } else {
      // Add new site
      nowEnabled = true;
      const newSite: PinnedSiteRule = {
        id: 'site_' + Date.now(),
        domain: currentHostname,
        name: activePage.title.slice(0, 30),
        enabled: true,
        autoShowToolbar: true,
        position: siteRules.defaultPosition || 'right-center',
        addedAt: Date.now(),
      };
      updatedSites = [newSite, ...siteRules.pinnedSites];
    }

    const newConfig: SiteRulesConfig = {
      ...siteRules,
      mode: 'specific_sites', // Ensure specific_sites mode is set
      pinnedSites: updatedSites,
    };

    setSiteRules(newConfig);
    saveStoredSiteRules(newConfig);

    onShowToast(
      nowEnabled
        ? `📌 Toolbar disematkan di ${currentHostname}! Toolbar akan otomatis muncul saat mengunjungi situs ini.`
        : `Toolbar dinonaktifkan dari ${currentHostname}.`,
      nowEnabled ? 'success' : 'info'
    );
  };

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim()) {
      setSelectedText(sel.toString().trim());
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : '';
    if (text) {
      e.preventDefault();
      setSelectedText(text);
      setContextMenuPos({ x: e.clientX, y: e.clientY });
    } else {
      setContextMenuPos(null);
    }
  };

  const handleClipSelection = () => {
    if (!selectedText) return;

    onSaveNote({
      title: `Kliping: ${activePage.title}`,
      content: `<blockquote><strong>Teks Terpilih dari ${currentHostname}:</strong><br>${selectedText}</blockquote><p>Sumber: <a href="${activePage.url}" target="_blank" class="text-sky-600 underline">${activePage.url}</a></p>`,
      category: 'clips',
      color: 'blue',
      tags: ['web-clip', currentHostname],
      noteType: 'clip',
      clippedUrl: activePage.url,
      clippedTitle: activePage.title,
    });

    setContextMenuPos(null);
    setToastMessage('🎉 Berhasil dikliping ke QuickNotes!');
    onShowToast(`Teks dari ${currentHostname} berhasil disimpan ke QuickNotes! 🌐`, 'success');

    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleSaveQuickFloatingNote = () => {
    if (!quickNoteTitle.trim() && !quickNoteContent.trim()) return;

    onSaveNote({
      title: quickNoteTitle.trim() || `Catatan dari ${currentHostname}`,
      content: `<p>${quickNoteContent.trim()}</p><p><em>Dibuat di situs: <a href="${activePage.url}" target="_blank">${activePage.url}</a></em></p>`,
      category: 'work',
      color: 'amber',
      tags: ['floating-toolbar', currentHostname],
      noteType: 'standard',
      clippedUrl: activePage.url,
      clippedTitle: activePage.title,
    });

    setQuickNoteTitle('');
    setQuickNoteContent('');
    setIsQuickNoteOpen(false);
    onShowToast('Catatan kilat dari toolbar berhasil disimpan! ⚡', 'success');
  };

  return (
    <div
      className="max-w-5xl mx-auto py-6 px-4 space-y-4"
      onClick={() => setContextMenuPos(null)}
    >
      {/* Educational Banner with Site Rules Management Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-slate-700 shadow-xs">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 font-bold text-base shrink-0">
            🎯
          </span>
          <div>
            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>Pengaturan Pin Toolbar di Situs Pilihan</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                siteRules.mode === 'specific_sites'
                  ? 'bg-sky-100 text-sky-800'
                  : siteRules.mode === 'all_sites'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                Mode: {siteRules.mode === 'specific_sites' ? 'Situs Tertentu' : siteRules.mode === 'all_sites' ? 'Semua Situs' : 'Manual'}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
              Anda dapat memilih situs mana saja yang otomatis memunculkan <strong>Pin Toolbar & Web Clipper</strong>. Cobalah beralih situs di bawah untuk melihat perbedaan perilakunya!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsRulesModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-600" />
            <span>Kelola Daftar Situs ({siteRules.pinnedSites.filter((s) => s.enabled).length} Aktif)</span>
          </button>
        </div>
      </div>

      {/* Simulated Browser Web Page Frame */}
      <div className="bg-slate-100 border border-slate-300 rounded-2xl shadow-xl overflow-hidden relative flex flex-col min-h-[620px]">
        {/* Chrome Window Header with Interactive Omnibox & Pin Button */}
        <div className="bg-slate-200 px-4 py-2.5 border-b border-slate-300 flex flex-wrap items-center gap-3 select-none">
          {/* Mac/Chrome Window Dots */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>

          {/* Quick Simulated Website Switcher Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {SIMULATED_PAGES.map((page, idx) => {
              const isPagePinned = siteRules.pinnedSites.some(
                (s) => extractCleanHostname(s.domain) === extractCleanHostname(page.url) && s.enabled
              );
              return (
                <button
                  key={page.id}
                  onClick={() => {
                    setActivePageIndex(idx);
                    setCustomUrlInput(page.url);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activePageIndex === idx
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:bg-slate-300/60'
                  }`}
                >
                  <span>{page.badge.split(' ')[0]}</span>
                  {isPagePinned && <span className="text-[10px]" title="Toolbar Disematkan di situs ini">📌</span>}
                </button>
              );
            })}
          </div>

          {/* Omnibox Address Bar with Direct Pin Toggle */}
          <div className="flex-1 min-w-[280px] bg-white rounded-xl px-3 py-1.5 text-xs text-slate-700 border border-slate-300 flex items-center justify-between shadow-2xs gap-2">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-emerald-600 text-xs">🔒</span>
              <span className="font-mono text-slate-800 truncate text-[11px]">{activePage.url}</span>
            </div>

            {/* Direct Pin Toolbar in This Website Toggle */}
            <button
              onClick={handleTogglePinCurrentSite}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs shrink-0 ${
                isCurrentSitePinned
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
              }`}
              title={
                isCurrentSitePinned
                  ? `Klik untuk melepas pin toolbar di ${currentHostname}`
                  : `Klik untuk menyematkan pin toolbar di ${currentHostname}`
              }
            >
              <Pin className={`w-3 h-3 ${isCurrentSitePinned ? 'text-amber-600 rotate-45' : 'text-slate-400'}`} />
              <span>{isCurrentSitePinned ? 'Toolbar Tersemat 📌' : 'Pin Toolbar di Situs Ini'}</span>
            </button>
          </div>
        </div>

        {/* Site Pin Status Notification Bar */}
        <div className={`px-4 py-2 border-b text-xs flex items-center justify-between transition-colors ${
          isToolbarVisibleOnCurrentSite
            ? 'bg-sky-50 text-sky-800 border-sky-200'
            : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            {isToolbarVisibleOnCurrentSite ? (
              <>
                <Eye className="w-3.5 h-3.5 text-sky-600" />
                <span>
                  <strong>Toolbar Aktif:</strong> Mengambang di sisi kanan halaman karena situs <code>{currentHostname}</code> masuk dalam daftar pin aturan Anda.
                </span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  <strong>Toolbar Tersembunyi:</strong> Situs <code>{currentHostname}</code> tidak di-pin. Toolbar tidak muncul di web ini.
                </span>
              </>
            )}
          </div>

          <button
            onClick={handleTogglePinCurrentSite}
            className="text-[11px] font-bold text-sky-700 hover:underline cursor-pointer shrink-0 ml-2"
          >
            {isToolbarVisibleOnCurrentSite ? 'Nonaktifkan di Situs Ini' : 'Aktifkan Toolbar di Sini →'}
          </button>
        </div>

        {/* Web Article Canvas */}
        <div
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
          className="p-8 max-w-3xl mx-auto bg-white text-slate-800 flex-1 w-full select-text relative"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">{activePage.badge}</span>
              <span aria-hidden="true">·</span>
              <span>{activePage.category}</span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {activePage.title}
            </h1>

            <p className="text-sm leading-relaxed text-slate-700">
              {activePage.content}
            </p>

            <div className="p-4 bg-slate-50 border-l-4 border-sky-500 rounded-r-xl space-y-2 border border-slate-200">
              <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider">
                Paragraf Pilihan (Coba Blok Kalimat Ini untuk Menguji Kliping):
              </h3>
              <p className="text-sm italic text-slate-700 leading-relaxed">
                "{activePage.sampleQuote}"
              </p>
            </div>

            <p className="text-sm leading-relaxed text-slate-700">
              Dengan ekstensi <strong>QuickNotes Pro</strong>, setiap situs yang Anda beri tanda pin akan secara cerdas memuat toolbar mengambang, sehingga Anda dapat membuat catatan kilat, menyimpan kutipan, atau menetapkan pengingat tanpa meninggalkan tab yang sedang dibaca.
            </p>
          </div>

          {/* In-page Floating Web Clipper on Text Selection */}
          {selectedText && (
            <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-40 bg-white border border-sky-500 rounded-2xl shadow-2xl p-3 flex items-center gap-3 animate-fade-in">
              <span className="text-xs text-slate-700 max-w-xs truncate font-medium">
                Teks terpilih: <strong>"{selectedText}"</strong>
              </span>
              <button
                onClick={handleClipSelection}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Simpan ke QuickNotes
              </button>
            </div>
          )}

          {/* Injected Content Script Toast Banner */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 bg-white border border-emerald-500 text-emerald-800 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-bounce">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{toastMessage}</span>
            </div>
          )}
        </div>

        {/* 🌟 THE REAL FLOATING PIN TOOLBAR (Appears if current site is enabled!) */}
        {isToolbarVisibleOnCurrentSite && (
          <aside className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center bg-white/95 backdrop-blur-md border border-slate-300 rounded-2xl shadow-2xl p-2 gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="flex items-center gap-1 pb-1 border-b border-slate-200 w-full justify-center">
              <span className="text-[10px] font-bold text-sky-700">⚡ QuickNotes</span>
            </div>

            {/* Quick Clip current page button */}
            <button
              onClick={() => {
                onSaveNote({
                  title: `Klip: ${activePage.title}`,
                  content: `<p>Halaman dikliping dari: <a href="${activePage.url}" target="_blank">${activePage.url}</a></p>`,
                  category: 'clips',
                  color: 'blue',
                  tags: ['quick-clip', currentHostname],
                  noteType: 'clip',
                  clippedUrl: activePage.url,
                  clippedTitle: activePage.title,
                });
                onShowToast(`Halaman ${currentHostname} berhasil disimpan! 🌐`, 'success');
              }}
              className="p-2 text-slate-700 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors relative group"
              title="Kliping URL halaman ini"
            >
              <Globe className="w-4 h-4" />
              <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                Klip Halaman Ini
              </span>
            </button>

            {/* Quick Note creation button */}
            <button
              onClick={() => setIsQuickNoteOpen((prev) => !prev)}
              className={`p-2 rounded-xl transition-colors relative group ${
                isQuickNoteOpen ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-700 hover:text-sky-600 hover:bg-sky-50'
              }`}
              title="Tulis Catatan Kilat di Web Ini"
            >
              <FileText className="w-4 h-4" />
              <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                Catatan Kilat
              </span>
            </button>

            {/* Pin Toggle on Toolbar */}
            <button
              onClick={handleTogglePinCurrentSite}
              className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors relative group"
              title="Sematkan / Lepas Pin Situs Ini"
            >
              <Pin className="w-4 h-4 rotate-45 fill-amber-400" />
              <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                Atur Pin di {currentHostname}
              </span>
            </button>

            {/* Site Rules Settings modal trigger */}
            <button
              onClick={() => setIsRulesModalOpen(true)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors relative group"
              title="Pengaturan Aturan Situs"
            >
              <Settings className="w-4 h-4" />
              <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                Kelola Situs Tersemat
              </span>
            </button>
          </aside>
        )}

        {/* Quick Floating Note Popover */}
        {isQuickNoteOpen && isToolbarVisibleOnCurrentSite && (
          <div className="absolute right-16 top-1/2 -translate-y-1/2 z-40 bg-white border border-slate-300 rounded-2xl shadow-2xl p-4 w-72 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <span>📝</span>
                <span>Catatan Cepat ({currentHostname})</span>
              </span>
              <button
                onClick={() => setIsQuickNoteOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              value={quickNoteTitle}
              onChange={(e) => setQuickNoteTitle(e.target.value)}
              placeholder="Judul catatan..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-sky-500"
            />

            <textarea
              value={quickNoteContent}
              onChange={(e) => setQuickNoteContent(e.target.value)}
              placeholder="Tulis ide atau kutipan dari situs ini..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 outline-none resize-none focus:ring-1 focus:ring-sky-500"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-400 font-mono">#{currentHostname}</span>
              <button
                onClick={handleSaveQuickFloatingNote}
                disabled={!quickNoteTitle.trim() && !quickNoteContent.trim()}
                className="px-3 py-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Simpan
              </button>
            </div>
          </div>
        )}

        {/* Right-Click Context Menu Mockup */}
        {contextMenuPos && (
          <div
            style={{ top: contextMenuPos.y - 80, left: contextMenuPos.x - 40 }}
            className="fixed z-50 bg-white border border-slate-300 rounded-xl shadow-2xl py-1 w-64 text-xs select-none"
          >
            <div className="px-3 py-1.5 text-[10px] text-slate-500 border-b border-slate-100 font-semibold">
              Menu Konteks Browser
            </div>
            <button
              onClick={handleClipSelection}
              className="w-full text-left px-3 py-2 hover:bg-sky-50 text-sky-700 font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>⚡ Simpan teks terpilih ke QuickNotes</span>
            </button>
            <div className="border-t border-slate-100 my-1" />
            <div className="px-3 py-1.5 text-slate-600">Salin (Ctrl+C)</div>
            <div className="px-3 py-1.5 text-slate-600">Cari di Google</div>
          </div>
        )}
      </div>

      {/* Site Rules Management Modal */}
      <SiteRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        config={siteRules}
        onSaveConfig={(updated) => {
          setSiteRules(updated);
          saveStoredSiteRules(updated);
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
};
