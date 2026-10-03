import React, { useState, useMemo } from 'react';
import { Note, Category, NoteColor } from '../types/note';
import { RichTextEditor } from './RichTextEditor';
import { ReminderPicker } from './ReminderPicker';
import { formatReminderText } from '../services/reminderService';
import { processNoteWithAi, AiAction } from '../services/aiNoteService';
import { 
  Search, 
  Plus, 
  Folder, 
  Tag, 
  Pin, 
  Trash2, 
  Copy, 
  Check, 
  Download, 
  Cloud, 
  Sparkles, 
  Mic, 
  Globe, 
  CheckSquare, 
  Square,
  Clock, 
  FileText, 
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2,
  Share2,
  X,
  SlidersHorizontal,
  FileSearch,
  Bell,
  Calendar
} from 'lucide-react';

interface DashboardViewProps {
  notes: Note[];
  categories: Category[];
  activeCategory: string;
  onSelectCategory: (catId: string) => void;
  onSaveNote: (note: Partial<Note>) => void;
  onDeleteNote: (id: string, permanent?: boolean) => void;
  onRestoreNote: (id: string) => void;
  onTogglePin: (id: string) => void;
  onOpenNewNoteModal?: () => void;
  onOpenDriveSyncModal: () => void;
  onOpenVoiceModal: () => void;
  onOpenCalendar?: () => void;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  onOpenGlobalSearch?: () => void;
  selectedNoteId?: string | null;
  onSelectNote?: (id: string) => void;
  onSelectNoteId?: (id: string) => void;
  syncStatus?: string;
  isAuthenticated?: boolean;
  userEmail?: string | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  notes,
  categories,
  activeCategory,
  onSelectCategory,
  onSaveNote,
  onDeleteNote,
  onRestoreNote,
  onTogglePin,
  onOpenNewNoteModal,
  onOpenDriveSyncModal,
  onOpenVoiceModal,
  onOpenCalendar,
  onShowToast,
  onOpenGlobalSearch,
  selectedNoteId: controlledSelectedNoteId,
  onSelectNote,
  onSelectNoteId,
  syncStatus,
  isAuthenticated,
  userEmail,
}) => {
  const [internalSelectedNoteId, setInternalSelectedNoteId] = useState<string | null>(notes[0]?.id || null);
  const selectedNoteId = controlledSelectedNoteId !== undefined ? controlledSelectedNoteId : internalSelectedNoteId;

  const setSelectedNoteId = (id: string) => {
    if (onSelectNote) {
      onSelectNote(id);
    } else if (onSelectNoteId) {
      onSelectNoteId(id);
    }
    setInternalSelectedNoteId(id);
  };

  // Full-text search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'all' | 'title' | 'content' | 'tags' | 'clips'>('all');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeColor, setActiveColor] = useState<NoteColor | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Active selected note
  const selectedNote = notes.find((n) => n.id === selectedNoteId) || notes.find((n) => !n.isDeleted) || null;

  // Utility to strip HTML tags for plain-text search
  const stripHtml = (html: string) => {
    return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  // Real-time full-text search filter with scopes & pinned priority
  const filteredNotes = useMemo(() => {
    return notes
      .filter((note) => {
        // Category / Trash / Reminders filter
        if (activeCategory === 'trash') {
          if (!note.isDeleted) return false;
        } else if (activeCategory === 'reminders') {
          if (note.isDeleted || !note.reminderAt) return false;
        } else {
          if (note.isDeleted) return false;
          if (activeCategory === 'clips' && (note.noteType !== 'clip' && !note.clippedUrl)) return false;
          if (activeCategory !== 'all' && activeCategory !== 'clips' && note.category !== activeCategory) return false;
        }

        if (activeTag && !note.tags.includes(activeTag)) return false;
        if (activeColor !== 'all' && note.color !== activeColor) return false;

        // Real-time full-text search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const title = (note.title || '').toLowerCase();
          const cleanContent = stripHtml(note.content).toLowerCase();
          const tags = (note.tags || []).map((t) => t.toLowerCase());
          const clippedTitle = (note.clippedTitle || '').toLowerCase();
          const clippedUrl = (note.clippedUrl || '').toLowerCase();

          if (searchScope === 'title') {
            return title.includes(q);
          } else if (searchScope === 'content') {
            return cleanContent.includes(q);
          } else if (searchScope === 'tags') {
            return tags.some((t) => t.includes(q));
          } else if (searchScope === 'clips') {
            return clippedTitle.includes(q) || clippedUrl.includes(q) || note.noteType === 'clip';
          }

          // 'all' scope
          return (
            title.includes(q) ||
            cleanContent.includes(q) ||
            tags.some((t) => t.includes(q)) ||
            clippedTitle.includes(q) ||
            clippedUrl.includes(q)
          );
        }

        return true;
      })
      .sort((a, b) => {
        if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
          return a.isPinned ? -1 : 1;
        }
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
  }, [notes, activeCategory, activeTag, activeColor, searchQuery, searchScope]);

  // Extract all unique tags
  const allTags = useMemo(() => {
    return Array.from(
      new Set(notes.filter((n) => !n.isDeleted).flatMap((n) => n.tags || []))
    );
  }, [notes]);

  // Highlighting function for searched keywords
  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <mark key={i} className="bg-amber-200 text-amber-900 font-semibold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const getMatchSnippet = (content: string, q: string) => {
    const text = stripHtml(content);
    if (!q.trim()) return text.slice(0, 100) + (text.length > 100 ? '...' : '');

    const lower = text.toLowerCase();
    const index = lower.indexOf(q.toLowerCase().trim());
    if (index === -1) {
      return text.slice(0, 100) + (text.length > 100 ? '...' : '');
    }

    const start = Math.max(0, index - 30);
    const end = Math.min(text.length, index + q.length + 50);
    let snippet = text.slice(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    return snippet;
  };

  const handleUpdateActiveNote = (fields: Partial<Note>) => {
    if (!selectedNote) return;
    onSaveNote({
      id: selectedNote.id,
      ...fields,
      updatedAt: Date.now(),
    });
  };

  const handleCopyNote = (note: Note) => {
    const cleanText = stripHtml(note.content);
    const fullText = `${note.title}\n\n${cleanText}${note.clippedUrl ? `\n\nSumber: ${note.clippedUrl}` : ''}`;
    navigator.clipboard.writeText(fullText);
    setCopiedId(note.id);
    onShowToast('Catatan disalin ke papan klip!', 'info');
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleAiAction = async (action: AiAction) => {
    if (!selectedNote) return;
    const rawText = stripHtml(selectedNote.content);
    if (!rawText) {
      onShowToast('Catatan masih kosong untuk diproses AI.', 'info');
      return;
    }

    setIsAiProcessing(true);
    onShowToast('Sedang memproses dengan Gemini AI...', 'info');

    try {
      const res = await processNoteWithAi({
        action,
        title: selectedNote.title,
        content: rawText,
        language: 'id',
      });

      if (res.success) {
        if (action === 'tags_and_title' && res.data) {
          const newTags = Array.from(new Set([...selectedNote.tags, ...(res.data.tags || [])]));
          handleUpdateActiveNote({
            title: res.data.title || selectedNote.title,
            tags: newTags,
          });
          onShowToast('Judul dan tag otomatis diperbarui!', 'success');
        } else if (res.text) {
          if (action === 'summarize') {
            const updated = `${selectedNote.content}<blockquote><strong>📌 Ringkasan AI:</strong><br>${res.text}</blockquote>`;
            handleUpdateActiveNote({ content: updated });
          } else if (action === 'action_items') {
            const updated = `${selectedNote.content}<h3>📋 Action Items (Tugas):</h3>${res.text.replace(/\n/g, '<br>')}`;
            handleUpdateActiveNote({ content: updated });
          } else if (action === 'polish') {
            handleUpdateActiveNote({ content: res.text.replace(/\n\n/g, '<br><br>') });
          } else if (action === 'expand_ideas') {
            const updated = `${selectedNote.content}<h3>💡 Ide Pengembangan:</h3>${res.text.replace(/\n/g, '<br>')}`;
            handleUpdateActiveNote({ content: updated });
          }
          onShowToast('AI berhasil memproses catatan!', 'success');
        }
      } else {
        throw new Error(res.error || 'Gagal memproses dengan AI');
      }
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Gagal memproses dengan AI', 'error');
    } finally {
      setIsAiProcessing(false);
    }
  };

  const colorBorderMap: Record<NoteColor, string> = {
    amber: 'border-l-amber-500',
    emerald: 'border-l-emerald-500',
    blue: 'border-l-sky-500',
    purple: 'border-l-purple-500',
    rose: 'border-l-rose-500',
    slate: 'border-l-slate-400',
    default: 'border-l-slate-400',
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-60px)] bg-slate-50 text-slate-900">
      {/* 1. Left Sidebar: Categories & Filters */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-2xs">
        <div className="p-4 space-y-5">
          {/* New Note & Drive Sync Action */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={onOpenNewNoteModal}
              className="w-full py-2.5 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Catatan Baru</span>
            </button>

            <button
              type="button"
              onClick={onOpenDriveSyncModal}
              className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Cloud className="w-4 h-4 text-emerald-600" />
              <span>Google Drive Sync</span>
            </button>
          </div>

          {/* Categories Nav */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
              Folder & Kategori
            </div>
            {categories.map((cat) => {
              const count =
                cat.id === 'all'
                  ? notes.filter((n) => !n.isDeleted).length
                  : cat.id === 'clips'
                  ? notes.filter((n) => !n.isDeleted && (n.noteType === 'clip' || n.clippedUrl)).length
                  : notes.filter((n) => !n.isDeleted && n.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    onSelectCategory(cat.id);
                    setActiveTag(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-sky-50 text-sky-700 font-semibold border border-sky-200 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{count}</span>
                </button>
              );
            })}

            {/* Reminders Folder */}
            <button
              onClick={() => {
                onSelectCategory('reminders');
                setActiveTag(null);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                activeCategory === 'reminders'
                  ? 'bg-amber-50 text-amber-800 font-semibold border border-amber-300 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span>Pengingat (Reminders)</span>
              </span>
              <span className="text-[10px] text-amber-700 bg-amber-100 font-bold px-1.5 py-0.5 rounded-full font-mono">
                {notes.filter((n) => !n.isDeleted && Boolean(n.reminderAt)).length}
              </span>
            </button>

            {/* Calendar View Quick Link */}
            {onOpenCalendar && (
              <button
                onClick={onOpenCalendar}
                className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors text-sky-700 bg-sky-50/70 hover:bg-sky-100 border border-sky-200/80 font-medium"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" />
                  <span>Tampilan Kalender 📅</span>
                </span>
                <span className="text-[10px] text-sky-600 font-mono">Buka</span>
              </button>
            )}

            {/* Trash Folder */}
            <button
              onClick={() => onSelectCategory('trash')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                activeCategory === 'trash'
                  ? 'bg-rose-50 text-rose-700 font-semibold border border-rose-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Sampah</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {notes.filter((n) => n.isDeleted).length}
              </span>
            </button>
          </div>

          {/* Color Palette Filters */}
          <div className="space-y-1.5 pt-3 border-t border-slate-200">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1 flex items-center justify-between">
              <span>Filter Warna</span>
              {activeColor !== 'all' && (
                <button
                  onClick={() => setActiveColor('all')}
                  className="text-[10px] text-sky-600 hover:underline lowercase"
                >
                  reset
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 px-2">
              <button
                onClick={() => setActiveColor('all')}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                  activeColor === 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'text-slate-600 border-slate-300 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              {(['amber', 'emerald', 'blue', 'purple', 'rose'] as NoteColor[]).map((c) => {
                const bgColors: Record<NoteColor, string> = {
                  amber: 'bg-amber-500',
                  emerald: 'bg-emerald-500',
                  blue: 'bg-sky-500',
                  purple: 'bg-purple-500',
                  rose: 'bg-rose-500',
                  slate: 'bg-slate-400',
                  default: 'bg-slate-400',
                };
                return (
                  <button
                    key={c}
                    onClick={() => setActiveColor(activeColor === c ? 'all' : c)}
                    className={`w-4 h-4 rounded-full ${bgColors[c]} transition-transform ${
                      activeColor === c ? 'scale-125 ring-2 ring-slate-800 ring-offset-1 ring-offset-white' : 'opacity-70 hover:opacity-100'
                    }`}
                    title={`Filter warna ${c}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Tag Cloud Filter */}
          {allTags.length > 0 && (
            <div className="space-y-1.5 pt-3 border-t border-slate-200">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3 text-sky-600" />
                  <span>Filter Tag</span>
                </span>
                {activeTag && (
                  <button
                    onClick={() => setActiveTag(null)}
                    className="text-[10px] text-sky-600 hover:underline lowercase"
                  >
                    reset
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1 px-1">
                {allTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTag(activeTag === t ? null : t)}
                    className={`px-2 py-0.5 rounded-md text-[11px] transition-colors ${
                      activeTag === t
                        ? 'bg-sky-100 text-sky-800 border border-sky-300 font-medium'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 text-[11px] text-slate-400 flex items-center justify-between">
          <span>QuickNotes Pro</span>
          <span className="font-mono">v1.0 MV3</span>
        </div>
      </aside>

      {/* 2. Middle Column: Full-Text Search Console & Notes List */}
      <div className="w-full md:w-88 bg-white border-r border-slate-200 flex flex-col shrink-0">
        {/* Prominent Global Full-Text Search Header */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-2.5">
          {/* Main Full-Text Search Input Box */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-sky-600 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul, isi teks, #tag, tautan... (Real-time)"
              className="w-full bg-white border border-slate-300 focus:border-sky-500 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none transition-colors shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Scopes Bar */}
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'title', label: 'Judul' },
                { id: 'content', label: 'Isi' },
                { id: 'tags', label: 'Tag' },
                { id: 'clips', label: 'Kliping' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSearchScope(s.id as any)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors whitespace-nowrap ${
                    searchScope === s.id
                      ? 'bg-sky-600 text-white font-semibold shadow-2xs'
                      : 'bg-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {onOpenGlobalSearch && (
              <button
                type="button"
                onClick={onOpenGlobalSearch}
                className="text-[10px] text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1 whitespace-nowrap ml-2"
                title="Buka jendela pencarian global (Ctrl+K)"
              >
                <span>Spotlight ⌘K</span>
              </button>
            )}
          </div>

          {/* Search Results Summary / Quick Clear */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-0.5 border-t border-slate-200">
            <span className="font-mono text-slate-700 font-medium">
              {filteredNotes.length} Catatan Ditemukan
            </span>
            {(searchQuery || activeTag || activeColor !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveTag(null);
                  setActiveColor('all');
                  setSearchScope('all');
                }}
                className="text-sky-600 hover:underline text-[10px] font-medium"
              >
                Reset Semua Filter
              </button>
            )}
          </div>
        </div>

        {/* Note Cards Scroll List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/40">
          {filteredNotes.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
              <span className="text-3xl mb-2">🔍</span>
              <span className="font-semibold text-slate-700">Tidak ada catatan yang cocok</span>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                {searchQuery
                  ? `Tidak ditemukan hasil untuk "${searchQuery}". Coba ubah kata kunci atau lingkup filter.`
                  : 'Belum ada catatan di folder ini.'}
              </p>
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isSelected = selectedNote?.id === note.id;
              const borderClass = colorBorderMap[note.color || 'amber'];
              const snippet = getMatchSnippet(note.content, searchQuery);
              const reminderInfo = note.reminderAt ? formatReminderText(note.reminderAt) : null;

              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`p-3.5 rounded-xl border border-l-4 cursor-pointer transition-all ${borderClass} ${
                    isSelected
                      ? 'bg-sky-50/70 border-sky-300 shadow-xs ring-1 ring-sky-400/40'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900 truncate">
                      {note.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                      <span className="truncate">
                        {highlightMatch(note.title || 'Tanpa Judul', searchQuery)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin(note.id);
                        }}
                        className={`p-0.5 rounded text-xs ${note.isPinned ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Reminder Badge if present */}
                  {reminderInfo && (
                    <div className={`mb-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                      reminderInfo.isPast
                        ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                        : reminderInfo.isDueToday
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-sky-100 text-sky-800 border border-sky-200'
                    }`}>
                      <Bell className="w-2.5 h-2.5 fill-current shrink-0" />
                      <span>{reminderInfo.label}</span>
                    </div>
                  )}

                  {/* Clean text excerpt with search match highlight */}
                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed mb-2">
                    {highlightMatch(snippet, searchQuery)}
                  </p>

                  {/* Tags and Date */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    <span className="truncate">
                      {new Date(note.updatedAt).toLocaleDateString('id-ID', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <div className="flex items-center gap-1">
                      {note.tags && note.tags.slice(0, 2).map((t) => (
                        <span key={t} className="text-slate-600 font-medium">
                          #{highlightMatch(t, searchQuery)}
                        </span>
                      ))}
                      <span className="text-slate-400 font-mono">· {note.category}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Right Pane: Full Active Note Rich Text Editor & AI Tools */}
      <main className="flex-1 bg-white flex flex-col overflow-y-auto">
        {selectedNote ? (
          <div className="p-6 max-w-4xl w-full mx-auto space-y-5">
            {/* Note Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-slate-500 font-medium">Kategori:</span>
                <select
                  value={selectedNote.category}
                  onChange={(e) => handleUpdateActiveNote({ category: e.target.value })}
                  className="bg-slate-50 border border-slate-300 text-xs text-slate-800 rounded-lg px-2.5 py-1 outline-none"
                >
                  <option value="ideas">💡 Ide & Proyek</option>
                  <option value="work">💼 Pekerjaan & Kantor</option>
                  <option value="learning">📚 Belajar & Riset</option>
                  <option value="personal">👤 Pribadi & Harian</option>
                  <option value="clips">🌐 Kliping Web</option>
                </select>

                <ReminderPicker
                  reminderAt={selectedNote.reminderAt}
                  onChangeReminder={(timestamp) =>
                    handleUpdateActiveNote({ reminderAt: timestamp, isReminderDismissed: false })
                  }
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAiAction('summarize')}
                  disabled={isAiProcessing}
                  className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-indigo-100 transition-colors"
                  title="Ringkas catatan dengan AI"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Ringkas AI</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAiAction('action_items')}
                  disabled={isAiProcessing}
                  className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-indigo-100 transition-colors"
                  title="Ekstrak to-do items dari catatan"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Ekstrak To-Do</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyNote(selectedNote)}
                  className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                  title="Salin Catatan"
                >
                  {copiedId === selectedNote.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                {selectedNote.isDeleted ? (
                  <button
                    type="button"
                    onClick={() => onRestoreNote(selectedNote.id)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Pulihkan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onDeleteNote(selectedNote.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                    title="Hapus ke Sampah"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Note Title Input */}
            <div>
              <input
                type="text"
                value={selectedNote.title}
                onChange={(e) => handleUpdateActiveNote({ title: e.target.value })}
                placeholder="Judul Catatan..."
                className="w-full bg-transparent text-xl font-bold text-slate-900 placeholder-slate-400 outline-none"
              />
            </div>

            {/* Web Clip Link Header if present */}
            {selectedNote.clippedUrl && (
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between text-xs text-sky-800">
                <div className="flex items-center gap-2 truncate">
                  <Globe className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="truncate">Sumber: {selectedNote.clippedTitle || selectedNote.clippedUrl}</span>
                </div>
                <a
                  href={selectedNote.clippedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-sky-600 hover:text-sky-800"
                  title="Buka URL asli"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Rich Text Editor Component */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">
                Editor Teks Kaya (Format Tebal, Miring, Garis Bawah, Daftar, & Hyperlink):
              </label>
              <RichTextEditor
                value={selectedNote.content}
                onChange={(html) => handleUpdateActiveNote({ content: html })}
                minHeight="320px"
              />
            </div>

            {/* Tags management row */}
            <div className="flex items-center gap-2 pt-2">
              <Tag className="w-3.5 h-3.5 text-sky-600" />
              <input
                type="text"
                value={selectedNote.tags.join(', ')}
                onChange={(e) => {
                  const tags = e.target.value
                    .split(',')
                    .map((t) => t.trim().replace(/^#/, ''))
                    .filter(Boolean);
                  handleUpdateActiveNote({ tags });
                }}
                placeholder="Tambah tag (pisahkan koma: #kerja, #sprint)..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-sky-500 shadow-2xs"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
            <span className="text-4xl mb-3">📝</span>
            <h3 className="text-base font-semibold text-slate-700 mb-1">Tidak Ada Catatan yang Dipilih</h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              Pilih salah satu catatan dari daftar di sebelah kiri atau buat catatan baru.
            </p>
            <button
              onClick={onOpenNewNoteModal}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Buat Catatan Sekarang
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
