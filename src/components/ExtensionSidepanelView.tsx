import React, { useState, useMemo } from 'react';
import { Note, NoteColor } from '../types/note';
import { RichTextEditor } from './RichTextEditor';
import { ReminderPicker } from './ReminderPicker';
import { formatReminderText } from '../services/reminderService';
import { processNoteWithAi, AiAction } from '../services/aiNoteService';
import { getStoredSiteRules, saveStoredSiteRules, extractCleanHostname } from '../utils/siteRulesStorage';
import { SiteRulesConfig, PinnedSiteRule } from '../types/siteRules';
import { StockListView } from './StockListView';
import { generateProductHtmlSnippet } from '../services/stockService';
import { 
  Pin, 
  Trash2, 
  Copy, 
  Check, 
  Globe, 
  ExternalLink, 
  Sparkles, 
  Search, 
  Plus, 
  BookOpen, 
  CheckCircle2, 
  FileText,
  Save,
  Bell,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Cloud,
  Settings,
  Layers,
  Bot,
  Loader2,
  Share2,
  Package,
  X
} from 'lucide-react';

interface ExtensionSidepanelViewProps {
  notes: Note[];
  onSaveNote: (note: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onTogglePin: (id: string) => void;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type SidepanelTab = 'editor' | 'list' | 'calendar' | 'stock' | 'settings';

interface CompanionArticle {
  id: string;
  url: string;
  title: string;
  badge: string;
  category: string;
  content: string;
  quote: string;
}

const COMPANION_ARTICLES: CompanionArticle[] = [
  {
    id: 'chrome-sidepanel',
    url: 'https://developer.chrome.com/docs/extensions/reference/sidePanel/',
    title: 'Chrome Side Panel API: Multitasking Pendamping Web',
    badge: 'Dokumentasi Chrome Dev',
    category: 'Teknologi Browser',
    content: 'Side Panel API pada Google Chrome Manifest V3 memungkinkan pengguna membuka catatan permanen di sisi kanan layar. Catatan tetap aktif saat pengguna berpindah antar tab, memudahkan pencatatan saat membaca dokumentasi atau riset tanpa kehilangan konteks.',
    quote: 'Side Panel adalah format paling ideal untuk ekstensi catatan karena tidak tertutup saat mengklik halaman web, berbeda dengan popup tradisional yang otomatis hilang.',
  },
  {
    id: 'ai-research',
    url: 'https://id.wikipedia.org/wiki/Pencatatan_digital',
    title: 'Evolusi Pencatatan Digital & Sistem Memo Cerdas',
    badge: 'Wikipedia Indonesia',
    category: 'Ensiklopedia Riset',
    content: 'Pencatatan modern memadukan penyimpanan cloud real-time, format teks kaya, dan sistem pengingat otomatis. Ekstensi browser berbasis Side Panel mempercepat pengumpulan kutipan dengan menghubungkan referensi URL sumber secara langsung ke database catatan.',
    quote: 'Kombinasi kliping satu-klik dan pengingat terjadwal meningkatkan efisiensi belajar dan riset profesional hingga lebih dari 60%.',
  },
  {
    id: 'github-workflow',
    url: 'https://github.com/features/productivity-notes',
    title: 'Alur Kerja Pengembang & Dokumentasi Repositori',
    badge: 'GitHub Developer Blog',
    category: 'Kode & Produktivitas',
    content: 'Menyimpan potongan kode (snippets), link issue, dan rencana kerja langsung di samping repositori memudahkan kolaborasi tim tanpa perlu berpindah-pindah aplikasi.',
    quote: 'Gunakan QuickNotes Side Panel untuk menyimpan to-do list tugas harian dan referensi API saat mengoding.',
  }
];

export const ExtensionSidepanelView: React.FC<ExtensionSidepanelViewProps> = ({
  notes,
  onSaveNote,
  onDeleteNote,
  onTogglePin,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<SidepanelTab>('editor');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('learning');
  const [color, setColor] = useState<NoteColor>('blue');
  const [reminderAt, setReminderAt] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Companion web article state
  const [selectedArticleIndex, setSelectedArticleIndex] = useState(0);
  const activeArticle = COMPANION_ARTICLES[selectedArticleIndex] || COMPANION_ARTICLES[0];

  // Calendar sub-view state inside Side Panel
  const [calDate, setCalDate] = useState<Date>(new Date());
  const [calSelectedDay, setCalSelectedDay] = useState<Date>(new Date());

  // Site rules state
  const [siteRules, setSiteRules] = useState<SiteRulesConfig>(() => getStoredSiteRules());

  const currentHost = useMemo(() => {
    return extractCleanHostname(activeArticle.url);
  }, [activeArticle.url]);

  const isCurrentHostPinned = useMemo(() => {
    return siteRules.pinnedSites.some(
      (s) => extractCleanHostname(s.domain) === currentHost && s.enabled
    );
  }, [currentHost, siteRules]);

  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const dayNames = ['S', 'S', 'R', 'K', 'J', 'S', 'M'];

  const handleTogglePinSite = () => {
    const existingIndex = siteRules.pinnedSites.findIndex(
      (s) => extractCleanHostname(s.domain) === currentHost
    );

    let updatedSites: PinnedSiteRule[];
    let nowEnabled = false;

    if (existingIndex >= 0) {
      nowEnabled = !siteRules.pinnedSites[existingIndex].enabled;
      updatedSites = siteRules.pinnedSites.map((s, idx) =>
        idx === existingIndex ? { ...s, enabled: nowEnabled } : s
      );
    } else {
      nowEnabled = true;
      const newRule: PinnedSiteRule = {
        id: 'site_' + Date.now(),
        domain: currentHost,
        name: activeArticle.badge,
        enabled: true,
        autoShowToolbar: true,
        position: 'right-center',
        addedAt: Date.now(),
      };
      updatedSites = [newRule, ...siteRules.pinnedSites];
    }

    const newConfig: SiteRulesConfig = {
      ...siteRules,
      mode: 'specific_sites',
      pinnedSites: updatedSites,
    };
    setSiteRules(newConfig);
    saveStoredSiteRules(newConfig);

    onShowToast(
      nowEnabled
        ? `📌 Situs ${currentHost} disematkan! Side Panel akan selalu mendampingi tab ini.`
        : `Situs ${currentHost} dilepas dari sematan.`,
      'info'
    );
  };

  const handleClipCurrentArticle = () => {
    setTitle(`Kliping: ${activeArticle.title}`);
    setContent(`<blockquote><strong>Kutipan dari ${activeArticle.badge}:</strong><br><em>"${activeArticle.quote}"</em></blockquote><p>Sumber: <a href="${activeArticle.url}" target="_blank" class="text-sky-600 underline">${activeArticle.url}</a></p>`);
    setActiveTab('editor');
    onShowToast(`Kutipan dari ${activeArticle.badge} berhasil dikliping ke Side Panel! 📌`, 'success');
  };

  const handleSaveSideNote = () => {
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    const cleanTitle = title.trim();

    if (!cleanTitle && !cleanContent) {
      onShowToast('Tulis judul atau isi catatan terlebih dahulu sebelum menyimpan.', 'error');
      return;
    }

    const finalTitle = cleanTitle || (cleanContent.length > 30 ? cleanContent.substring(0, 30) + '...' : cleanContent) || 'Catatan Side Panel';

    onSaveNote({
      id: editingNoteId || undefined,
      title: finalTitle,
      content: content || `<p>${cleanTitle}</p>`,
      category,
      color,
      tags: ['sidepanel', currentHost],
      noteType: 'clip',
      reminderAt: reminderAt || null,
      isReminderDismissed: false,
      clippedUrl: activeArticle.url,
      clippedTitle: activeArticle.title,
    });

    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 2500);

    onShowToast(
      editingNoteId 
        ? 'Catatan Side Panel berhasil diperbarui! 💾' 
        : 'Catatan berhasil disimpan ke Chrome Side Panel & Cloud! 🎉', 
      'success'
    );

    setEditingNoteId(null);
    setTitle('');
    setContent('');
    setReminderAt(null);
  };

  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category || 'learning');
    setColor(note.color || 'blue');
    setReminderAt(note.reminderAt || null);
    setActiveTab('editor');
  };

  const handleResetEditor = () => {
    setEditingNoteId(null);
    setTitle('');
    setContent('');
    setReminderAt(null);
    setActiveTab('editor');
  };

  const handleAiAction = async (action: AiAction) => {
    if (!content.trim() && !title.trim()) {
      onShowToast('Tulis isi catatan terlebih dahulu untuk dibantu AI.', 'error');
      return;
    }

    setIsAiLoading(true);
    try {
      const res = await processNoteWithAi({
        action,
        title,
        content,
        language: 'id',
      });
      if (res.success) {
        if (action === 'tags_and_title') {
          if (res.data?.title) setTitle(res.data.title);
          onShowToast('Judul dan tag otomatis berhasil dibuatkan oleh AI! ✨', 'success');
        } else if (res.text) {
          if (action === 'summarize') {
            setContent((prev) => `${prev}<blockquote><strong>📌 Ringkasan AI:</strong><br>${res.text}</blockquote>`);
          } else if (action === 'action_items') {
            setContent((prev) => `${prev}<h3>📋 Action Items (Tugas):</h3>${res.text?.replace(/\n/g, '<br>')}`);
          } else if (action === 'polish') {
            setContent(res.text.replace(/\n\n/g, '<br><br>'));
          } else if (action === 'expand_ideas') {
            setContent((prev) => `${prev}<h3>💡 Pengembangan Ide:</h3>${res.text?.replace(/\n/g, '<br>')}`);
          }
          onShowToast('Catatan berhasil diproses oleh AI Assistant! ✨', 'success');
        }
      } else {
        throw new Error(res.error || 'Gagal memproses AI');
      }
    } catch (err: any) {
      onShowToast('Gagal memproses AI: ' + err.message, 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => {
        if (n.isDeleted) return false;
        const q = search.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags?.some((t) => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
          return a.isPinned ? -1 : 1;
        }
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
  }, [notes, search]);

  // Mini Calendar grid calculation
  const miniCalendarGrid = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDay.getDate();
    const daysInPrev = new Date(calYear, calMonth, 0).getDate();

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      notes: Note[];
      hasReminder: boolean;
      hasOverdue: boolean;
    }> = [];

    const todayStr = new Date().toDateString();

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(calYear, calMonth - 1, daysInPrev - i);
      const dStr = d.toDateString();
      const dayNotes = notes.filter((n) => !n.isDeleted && new Date(n.reminderAt || n.createdAt).toDateString() === dStr);
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        notes: dayNotes,
        hasReminder: dayNotes.some((n) => Boolean(n.reminderAt)),
        hasOverdue: dayNotes.some((n) => n.reminderAt && n.reminderAt < Date.now() && !n.isReminderDismissed),
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(calYear, calMonth, day);
      const dStr = d.toDateString();
      const dayNotes = notes.filter((n) => !n.isDeleted && new Date(n.reminderAt || n.createdAt).toDateString() === dStr);
      days.push({
        date: d,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        notes: dayNotes,
        hasReminder: dayNotes.some((n) => Boolean(n.reminderAt)),
        hasOverdue: dayNotes.some((n) => n.reminderAt && n.reminderAt < Date.now() && !n.isReminderDismissed),
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(calYear, calMonth + 1, i);
      const dStr = d.toDateString();
      const dayNotes = notes.filter((n) => !n.isDeleted && new Date(n.reminderAt || n.createdAt).toDateString() === dStr);
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        notes: dayNotes,
        hasReminder: dayNotes.some((n) => Boolean(n.reminderAt)),
        hasOverdue: dayNotes.some((n) => n.reminderAt && n.reminderAt < Date.now() && !n.isReminderDismissed),
      });
    }

    return days;
  }, [calYear, calMonth, notes]);

  // Notes on selected calendar date
  const selectedDayNotes = useMemo(() => {
    const targetStr = calSelectedDay.toDateString();
    return notes.filter((n) => {
      if (n.isDeleted) return false;
      const targetTime = n.reminderAt || n.createdAt;
      return new Date(targetTime).toDateString() === targetStr;
    });
  }, [calSelectedDay, notes]);

  const colorPills: NoteColor[] = ['blue', 'amber', 'emerald', 'purple', 'rose', 'slate'];

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-4">
      {/* Informational Header & Mode Focus Banner */}
      <div className="bg-gradient-to-r from-sky-900 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <span className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-xl font-bold shrink-0">
            📌
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display font-bold text-lg text-white">
                QuickNotes Chrome Side Panel (Mode Utama)
              </h2>
              <span className="bg-sky-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                ⚡ Prioritas Utama
              </span>
            </div>
            <p className="text-xs text-sky-200 mt-1 max-w-2xl leading-relaxed">
              Side Panel tetap terbuka di sisi kanan layar saat Anda membaca artikel, dokumen, atau kode di web. Catatan, format teks, dan pengingat otomatis disinkronkan secara real-time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleClipCurrentArticle}
            className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Kliping Halaman Ini</span>
          </button>
        </div>
      </div>

      {/* Side-by-Side Split Viewport Container (Simulated Browser + Chrome Side Panel) */}
      <div className="bg-slate-100 border border-slate-300 rounded-2xl shadow-xl overflow-hidden flex flex-col lg:flex-row min-h-[670px]">
        
        {/* Left Column: Simulated Browser Tab Web Page Content */}
        <div className="flex-1 bg-white flex flex-col border-r border-slate-300 overflow-hidden">
          {/* Chrome Omnibox & Browser Top Bar */}
          <div className="bg-slate-200 px-4 py-2 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5 mr-2 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              {/* Simulated Tab Buttons */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {COMPANION_ARTICLES.map((art, idx) => (
                  <button
                    key={art.id}
                    onClick={() => setSelectedArticleIndex(idx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                      selectedArticleIndex === idx
                        ? 'bg-white text-slate-900 font-bold shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-300/60'
                    }`}
                  >
                    <span>{art.badge.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Omnibox Address & Pin Site toggle */}
            <div className="flex items-center gap-2 min-w-[260px]">
              <div className="flex-1 bg-white rounded-lg px-2.5 py-1 text-slate-800 border border-slate-300 flex items-center justify-between shadow-2xs gap-1.5">
                <span className="truncate text-[11px] font-mono">{activeArticle.url}</span>
                <span className="text-[10px] text-emerald-600 font-medium shrink-0">🔒</span>
              </div>
              <button
                onClick={handleTogglePinSite}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                  isCurrentHostPinned
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
                title={isCurrentHostPinned ? 'Lepas sematan situs ini' : 'Sematkan Side Panel untuk situs ini'}
              >
                <Pin className={`w-3 h-3 ${isCurrentHostPinned ? 'text-amber-600 rotate-45 fill-amber-500' : 'text-slate-400'}`} />
              </button>
            </div>
          </div>

          {/* Web Article Canvas */}
          <div className="p-8 max-w-2xl mx-auto space-y-4 text-slate-800 overflow-y-auto flex-1 select-text">
            <div className="flex items-center gap-2 text-xs text-sky-600 font-semibold">
              <BookOpen className="w-4 h-4" />
              <span>{activeArticle.badge}</span>
              <span>·</span>
              <span className="text-slate-500">{activeArticle.category}</span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {activeArticle.title}
            </h1>

            <p className="text-xs text-slate-500">
              Dipublikasikan 2026 · Kompatibel dengan Google Chrome Manifest V3 Side Panel
            </p>

            <div className="border-t border-slate-200 pt-4 space-y-4 text-sm leading-relaxed text-slate-700">
              <p className="p-3 bg-sky-50 border-l-4 border-sky-500 rounded-r-lg text-sky-900 text-xs leading-relaxed">
                💡 <strong>Kenyamanan Side Panel:</strong> Anda dapat mengetik ringkasan, membuat to-do list, atau menetapkan alarm pengingat di panel kanan tanpa menutup halaman ini.
              </p>

              <p>{activeArticle.content}</p>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Kutipan Utama Artikel:
                </span>
                <p className="italic text-slate-800 text-xs leading-relaxed">
                  "{activeArticle.quote}"
                </p>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={handleClipCurrentArticle}
                  className="px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  <span>Klip Kutipan Ini ke Side Panel →</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: The Actual 390px Native Chrome Side Panel Canvas */}
        <div className="w-full lg:w-[410px] bg-slate-50 flex flex-col shrink-0 border-t lg:border-t-0 lg:border-l border-slate-300">
          {/* Side Panel Title & 4 Navigation Sub-Tabs */}
          <div className="px-4 py-3 bg-white border-b border-slate-200 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-sky-600 flex items-center justify-center text-white text-xs font-bold shadow-2xs">
                  📌
                </span>
                <div>
                  <span className="font-display font-bold text-sm text-slate-900">QuickNotes Side Panel</span>
                  <span className="text-[10px] text-sky-600 font-mono font-semibold ml-1.5">v1.0</span>
                </div>
              </div>

              {editingNoteId && (
                <button
                  onClick={handleResetEditor}
                  className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-bold hover:bg-amber-200"
                >
                  + Mode Baru
                </button>
              )}
            </div>

            {/* 5 Interactive Sub-Tabs */}
            <div className="grid grid-cols-5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[10.5px] gap-0.5">
              <button
                onClick={() => setActiveTab('editor')}
                className={`py-1 rounded-lg font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'editor'
                    ? 'bg-white text-sky-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Editor Catatan"
              >
                <span>📝</span>
                <span className="hidden sm:inline">{editingNoteId ? 'Edit' : 'Tulis'}</span>
              </button>

              <button
                onClick={() => setActiveTab('list')}
                className={`py-1 rounded-lg font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'list'
                    ? 'bg-white text-sky-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Daftar Catatan"
              >
                <span>📋</span>
                <span className="hidden sm:inline">Catatan</span>
              </button>

              <button
                onClick={() => setActiveTab('calendar')}
                className={`py-1 rounded-lg font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'calendar'
                    ? 'bg-white text-sky-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Kalender"
              >
                <span>📅</span>
                <span className="hidden sm:inline">Kalender</span>
              </button>

              <button
                onClick={() => setActiveTab('stock')}
                className={`py-1 rounded-lg font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'stock'
                    ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                    : 'text-emerald-700 hover:text-emerald-900 font-semibold'
                }`}
                title="Katalog Stok Produk (Google Sheet)"
              >
                <Package className="w-3 h-3" />
                <span>Stok</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`py-1 rounded-lg font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-white text-sky-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Pengaturan & Aturan Situs"
              >
                <span>⚙️</span>
                <span className="hidden sm:inline">Aturan</span>
              </button>
            </div>
          </div>

          {/* Success Banner if just saved */}
          {isSavedSuccess && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center gap-2 text-xs font-semibold text-emerald-800 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Catatan berhasil disimpan ke Side Panel & Cloud!</span>
            </div>
          )}

          {/* Side Panel Content Body Based on Active Tab */}
          <div className="flex-1 overflow-y-auto p-3.5 bg-slate-50/80">
            
            {/* TAB 1: RICH TEXT EDITOR */}
            {activeTab === 'editor' && (
              <div className="space-y-3">
                {/* Note Title Input */}
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Judul catatan Side Panel (opsional)..."
                  className="w-full bg-white border border-slate-300 focus:border-sky-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none shadow-2xs"
                />

                {/* Rich Text Editor */}
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Tulis catatan, to-do list, atau kutipan sambil membaca web..."
                  minHeight="180px"
                />

                {/* AI Assist Toolbar for Side Panel */}
                <div className="p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-1 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 px-1">
                    <Sparkles className="w-3 h-3 text-sky-500" />
                    <span>AI Assistant:</span>
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      disabled={isAiLoading}
                      onClick={() => handleAiAction('summarize')}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 disabled:opacity-50 transition-colors"
                    >
                      Ringkas
                    </button>
                    <button
                      type="button"
                      disabled={isAiLoading}
                      onClick={() => handleAiAction('action_items')}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 disabled:opacity-50 transition-colors"
                    >
                      Poin Inti / To-Do
                    </button>
                    <button
                      type="button"
                      disabled={isAiLoading}
                      onClick={() => handleAiAction('polish')}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 disabled:opacity-50 transition-colors"
                    >
                      Rapikan
                    </button>
                    <button
                      type="button"
                      disabled={isAiLoading}
                      onClick={() => handleAiAction('expand_ideas')}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 disabled:opacity-50 transition-colors"
                    >
                      Ide +
                    </button>
                  </div>
                </div>

                {/* Color and Category Controls */}
                <div className="flex items-center justify-between pt-1">
                  {/* Color dots */}
                  <div className="flex items-center gap-1.5">
                    {colorPills.map((c) => {
                      const bg: Record<NoteColor, string> = {
                        blue: 'bg-sky-500',
                        amber: 'bg-amber-500',
                        emerald: 'bg-emerald-500',
                        purple: 'bg-purple-500',
                        rose: 'bg-rose-500',
                        slate: 'bg-slate-400',
                        default: 'bg-slate-400',
                      };
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={`w-4 h-4 rounded-full ${bg[c]} transition-transform ${
                            color === c ? 'scale-125 ring-2 ring-slate-800 ring-offset-1' : 'opacity-70 hover:opacity-100'
                          }`}
                          title={`Warna ${c}`}
                        />
                      );
                    })}
                  </div>

                  {/* Category select */}
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-white border border-slate-300 text-xs text-slate-800 rounded-lg px-2 py-1 outline-none shadow-2xs"
                  >
                    <option value="learning">📚 Belajar & Riset</option>
                    <option value="ideas">💡 Ide Proyek</option>
                    <option value="work">💼 Pekerjaan</option>
                    <option value="clips">🌐 Kliping</option>
                    <option value="personal">👤 Pribadi</option>
                  </select>
                </div>

                {/* Footer Action Bar with Reminder Picker and Save button */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                  <ReminderPicker
                    reminderAt={reminderAt}
                    onChangeReminder={(timestamp) => setReminderAt(timestamp)}
                  />

                  <button
                    onClick={handleSaveSideNote}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingNoteId ? 'Perbarui Catatan' : 'Simpan ke Notes'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: NOTES LIST IN SIDE PANEL */}
            {activeTab === 'list' && (
              <div className="space-y-2.5">
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari catatan Side Panel..."
                    className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none shadow-2xs focus:ring-1 focus:ring-sky-500"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {filteredNotes.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-600">Belum ada catatan.</p>
                    <p className="text-[11px] mt-0.5">Klik tab "+ Tulis" untuk mulai mencatat di panel samping.</p>
                  </div>
                ) : (
                  filteredNotes.map((note) => {
                    const reminderInfo = note.reminderAt ? formatReminderText(note.reminderAt) : null;
                    return (
                      <div
                        key={note.id}
                        onClick={() => handleEditNote(note)}
                        className="p-3 bg-white border border-slate-200 rounded-xl hover:border-sky-400 transition-all space-y-1.5 text-xs shadow-2xs cursor-pointer group relative"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 truncate">
                            {note.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                            <span className="font-semibold text-slate-900 truncate group-hover:text-sky-600">
                              {note.title || 'Catatan Tanpa Judul'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onTogglePin(note.id)}
                              className={`p-1 rounded text-[10px] ${note.isPinned ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}
                              title={note.isPinned ? 'Lepas Sematan' : 'Sematkan ke Atas'}
                            >
                              <Pin className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                const cleanText = note.content.replace(/<[^>]*>/g, '');
                                navigator.clipboard.writeText(`${note.title}\n\n${cleanText}`);
                                setCopiedId(note.id);
                                onShowToast('Disalin ke clipboard!', 'info');
                                setTimeout(() => setCopiedId(null), 1500);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-800"
                              title="Salin Catatan"
                            >
                              {copiedId === note.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => onDeleteNote(note.id)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                              title="Hapus"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Reminder Badge if set */}
                        {reminderInfo && (
                          <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            reminderInfo.isPast ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            <Bell className="w-2.5 h-2.5 fill-current" />
                            <span>{reminderInfo.label}</span>
                          </div>
                        )}

                        <div
                          className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: note.content }}
                        />

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                          <span className="text-slate-600 font-medium">#{note.category}</span>
                          <span>{new Date(note.updatedAt).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 3: MINI CALENDAR INSIDE SIDE PANEL */}
            {activeTab === 'calendar' && (
              <div className="space-y-3">
                {/* Mini Calendar Header */}
                <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-sky-600" />
                      <span>{monthNames[calMonth]} {calYear}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCalDate(new Date(calYear, calMonth - 1, 1))}
                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                        title="Bulan Lalu"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          const today = new Date();
                          setCalDate(today);
                          setCalSelectedDay(today);
                        }}
                        className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 rounded border border-slate-200"
                      >
                        Hari Ini
                      </button>
                      <button
                        onClick={() => setCalDate(new Date(calYear, calMonth + 1, 1))}
                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                        title="Bulan Depan"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Day Names Row */}
                  <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 mb-1">
                    {dayNames.map((d, i) => (
                      <div key={i} className={i >= 5 ? 'text-rose-400' : ''}>{d}</div>
                    ))}
                  </div>

                  {/* Mini Calendar 7-Column Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {miniCalendarGrid.map((cell, idx) => {
                      const isSelected = calSelectedDay.toDateString() === cell.date.toDateString();
                      return (
                        <button
                          key={idx}
                          onClick={() => setCalSelectedDay(cell.date)}
                          className={`h-7 rounded-lg text-xs font-medium relative flex items-center justify-center transition-all ${
                            cell.isToday
                              ? 'bg-sky-600 text-white font-bold shadow-2xs'
                              : isSelected
                              ? 'bg-sky-100 text-sky-800 font-bold border border-sky-300'
                              : cell.isCurrentMonth
                              ? 'text-slate-800 hover:bg-slate-100'
                              : 'text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span>{cell.date.getDate()}</span>
                          {cell.hasOverdue ? (
                            <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-rose-500" />
                          ) : cell.hasReminder ? (
                            <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-amber-500" />
                          ) : cell.notes.length > 0 ? (
                            <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-sky-400" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Date Header & Quick Action */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-slate-800">
                    📅 {calSelectedDay.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                  <button
                    onClick={() => {
                      const target = new Date(calSelectedDay);
                      target.setHours(9, 0, 0, 0);
                      setReminderAt(target.getTime());
                      setActiveTab('editor');
                    }}
                    className="text-[10px] text-sky-600 hover:underline font-semibold flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Jadwalkan Catatan</span>
                  </button>
                </div>

                {/* Selected Date Notes List */}
                <div className="space-y-2">
                  {selectedDayNotes.length === 0 ? (
                    <div className="bg-white rounded-xl p-4 text-center border border-slate-200 text-slate-400 text-xs">
                      <p>Tidak ada catatan pada tanggal ini.</p>
                      <button
                        onClick={() => {
                          const target = new Date(calSelectedDay);
                          target.setHours(9, 0, 0, 0);
                          setReminderAt(target.getTime());
                          setActiveTab('editor');
                        }}
                        className="mt-1.5 px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-[10px] font-semibold inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Tulis Catatan untuk Tanggal Ini</span>
                      </button>
                    </div>
                  ) : (
                    selectedDayNotes.map((note) => (
                      <div
                        key={note.id}
                        onClick={() => handleEditNote(note)}
                        className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs hover:border-sky-300 transition-all cursor-pointer shadow-2xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 truncate">{note.title}</span>
                          {note.reminderAt && (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                              ⏰ {new Date(note.reminderAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <div
                          className="text-[11px] text-slate-600 line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: note.content }}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: GOOGLE SHEETS STOCK LIST VIEWER */}
            {activeTab === 'stock' && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs min-h-[480px]">
                <StockListView
                  compact={true}
                  onInsertToNote={(snippetHtml) => {
                    setContent((prev) => `${prev}${snippetHtml}`);
                    setActiveTab('editor');
                  }}
                  onCreateNoteFromProduct={(product) => {
                    setTitle(`[${product.sku}] ${product.name}`);
                    setContent(generateProductHtmlSnippet(product));
                    setCategory('work');
                    setActiveTab('editor');
                  }}
                  onShowToast={onShowToast}
                />
              </div>
            )}

            {/* TAB 5: SETTINGS & SITE RULES */}
            {activeTab === 'settings' && (
              <div className="space-y-3 text-xs text-slate-700">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>📌</span>
                    <span>Status Penyematan Situs Ini</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Situs aktif: <strong className="text-slate-800">{currentHost}</strong>
                  </p>
                  <button
                    onClick={handleTogglePinSite}
                    className={`w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isCurrentHostPinned
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-sky-600 hover:bg-sky-500 text-white shadow-xs'
                    }`}
                  >
                    <Pin className={`w-3.5 h-3.5 ${isCurrentHostPinned ? 'rotate-45' : ''}`} />
                    <span>{isCurrentHostPinned ? 'Situs Sudah Di-Pin 📌' : 'Sematkan Side Panel di Situs Ini'}</span>
                  </button>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>☁️</span>
                    <span>Sinkronisasi & Backup</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Catatan otomatis tersinkronisasi antar perangkat saat Anda login dengan Akun Google di QuickNotes Pro.
                  </p>
                  <button
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `quicknotes_sidepanel_${Date.now()}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      onShowToast('Data catatan Side Panel berhasil diekspor ke JSON!', 'success');
                    }}
                    className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ekspor Cadangan JSON</span>
                  </button>
                </div>

                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-1">
                  <p className="font-bold text-sky-900 text-xs">Cara Pasang di Chrome:</p>
                  <ol className="list-decimal pl-4 text-[11px] text-sky-800 space-y-0.5">
                    <li>Unduh file ZIP via tombol <strong>Unduh .ZIP</strong> di bilah atas.</li>
                    <li>Buka <code>chrome://extensions</code> dan aktifkan Developer mode.</li>
                    <li>Klik <em>Load unpacked</em> dan pilih folder hasil ekstrak.</li>
                    <li>Sematkan ikon QuickNotes di toolbar Chrome!</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
