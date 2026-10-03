import React, { useState, useMemo } from 'react';
import { Note, NoteColor } from '../types/note';
import { ReminderPicker } from './ReminderPicker';
import { formatReminderText } from '../services/reminderService';
import { 
  Pin, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink, 
  Search, 
  Globe, 
  CheckSquare, 
  Download,
  CheckCircle2, 
  Sparkles,
  Bell,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  X
} from 'lucide-react';

interface ExtensionPopupViewProps {
  notes: Note[];
  onSaveNote: (note: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onTogglePin: (id: string) => void;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  onOpenSidePanel: () => void;
}

export const ExtensionPopupView: React.FC<ExtensionPopupViewProps> = ({
  notes,
  onSaveNote,
  onDeleteNote,
  onTogglePin,
  onShowToast,
  onOpenSidePanel,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('ideas');
  const [color, setColor] = useState<NoteColor>('amber');
  const [reminderAt, setReminderAt] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'calendar' | 'clips' | 'todo'>('all');

  // Mini Calendar State
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date>(new Date());

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
  ];
  const dayNames = ['S', 'S', 'R', 'K', 'J', 'S', 'M'];

  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();

  const goToPrevMonth = () => {
    setCalendarDate(new Date(calYear, calMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCalendarDate(new Date(calYear, calMonth + 1, 1));
  };

  const handleQuickSave = () => {
    if (!title.trim() && !content.trim()) return;

    onSaveNote({
      title: title.trim() || 'Catatan Kilat',
      content: content.trim(),
      category,
      color,
      reminderAt: reminderAt || null,
      isReminderDismissed: false,
      noteType: content.includes('- [ ]') || content.includes('1.') ? 'todo' : 'standard',
      tags: [category],
    });

    setTitle('');
    setContent('');
    setReminderAt(null);
    onShowToast(
      reminderAt 
        ? 'Catatan & Pengingat berhasil dijadwalkan! ⏰' 
        : 'Catatan berhasil disimpan ke Chrome Storage! 💾',
      'success'
    );
  };

  const handleCopyNote = (note: Note) => {
    const text = `${note.title}\n\n${note.content.replace(/<[^>]*>/g, '')}${note.clippedUrl ? `\n\nSumber: ${note.clippedUrl}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedId(note.id);
    onShowToast('Teks disalin ke papan klip!', 'info');
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleDismissReminder = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = notes.find((n) => n.id === noteId);
    if (target) {
      onSaveNote({ ...target, isReminderDismissed: true });
      onShowToast('Pengingat ditandai selesai! ✅', 'info');
    }
  };

  const handleSnooze10Min = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = notes.find((n) => n.id === noteId);
    if (target) {
      const newTime = Date.now() + 10 * 60 * 1000;
      onSaveNote({ ...target, reminderAt: newTime, isReminderDismissed: false });
      onShowToast('Pengingat ditunda 10 menit! ⏳', 'info');
    }
  };

  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => {
        if (n.isDeleted) return false;
        const matchesSearch =
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.content.toLowerCase().includes(search.toLowerCase()) ||
          n.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

        if (!matchesSearch) return false;

        if (activeTab === 'todo') return n.noteType === 'todo' || (n.todoItems && n.todoItems.length > 0);
        if (activeTab === 'clips') return n.noteType === 'clip' || !!n.clippedUrl;
        return true;
      })
      .sort((a, b) => {
        if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
          return a.isPinned ? -1 : 1;
        }
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
  }, [notes, search, activeTab]);

  // Mini Calendar grid calculation (Monday start)
  const miniCalendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDay.getDate();
    const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      hasNotes: boolean;
      hasReminders: boolean;
      hasOverdue: boolean;
      notes: Note[];
    }> = [];

    const todayStr = new Date().toDateString();

    // Previous month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(calYear, calMonth - 1, daysInPrevMonth - i);
      const dStr = d.toDateString();
      const dayNotes = notes.filter((n) => {
        if (n.isDeleted) return false;
        const targetTime = n.reminderAt || n.createdAt;
        return new Date(targetTime).toDateString() === dStr;
      });
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        hasNotes: dayNotes.length > 0,
        hasReminders: dayNotes.some((n) => Boolean(n.reminderAt)),
        hasOverdue: dayNotes.some((n) => n.reminderAt && n.reminderAt < Date.now() && !n.isReminderDismissed),
        notes: dayNotes,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(calYear, calMonth, day);
      const dStr = d.toDateString();
      const dayNotes = notes.filter((n) => {
        if (n.isDeleted) return false;
        const targetTime = n.reminderAt || n.createdAt;
        return new Date(targetTime).toDateString() === dStr;
      });
      days.push({
        date: d,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        hasNotes: dayNotes.length > 0,
        hasReminders: dayNotes.some((n) => Boolean(n.reminderAt)),
        hasOverdue: dayNotes.some((n) => n.reminderAt && n.reminderAt < Date.now() && !n.isReminderDismissed),
        notes: dayNotes,
      });
    }

    // Next month padding
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(calYear, calMonth + 1, i);
      const dStr = d.toDateString();
      const dayNotes = notes.filter((n) => {
        if (n.isDeleted) return false;
        const targetTime = n.reminderAt || n.createdAt;
        return new Date(targetTime).toDateString() === dStr;
      });
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        hasNotes: dayNotes.length > 0,
        hasReminders: dayNotes.some((n) => Boolean(n.reminderAt)),
        hasOverdue: dayNotes.some((n) => n.reminderAt && n.reminderAt < Date.now() && !n.isReminderDismissed),
        notes: dayNotes,
      });
    }

    return days;
  }, [calYear, calMonth, notes]);

  // Notes on selected calendar date
  const selectedDateNotes = useMemo(() => {
    const targetStr = selectedCalendarDay.toDateString();
    return notes.filter((n) => {
      if (n.isDeleted) return false;
      const targetTime = n.reminderAt || n.createdAt;
      return new Date(targetTime).toDateString() === targetStr;
    });
  }, [selectedCalendarDay, notes]);

  const colorClasses: Record<NoteColor, { border: string; bg: string; dot: string }> = {
    default: { border: 'border-l-slate-400', bg: 'bg-white', dot: 'bg-slate-400' },
    amber: { border: 'border-l-amber-500', bg: 'bg-amber-50/50', dot: 'bg-amber-500' },
    emerald: { border: 'border-l-emerald-500', bg: 'bg-emerald-50/50', dot: 'bg-emerald-500' },
    blue: { border: 'border-l-sky-500', bg: 'bg-sky-50/50', dot: 'bg-sky-500' },
    purple: { border: 'border-l-purple-500', bg: 'bg-purple-50/50', dot: 'bg-purple-500' },
    rose: { border: 'border-l-rose-500', bg: 'bg-rose-50/50', dot: 'bg-rose-500' },
    slate: { border: 'border-l-slate-400', bg: 'bg-white', dot: 'bg-slate-400' },
  };

  const totalRemindersCount = notes.filter((n) => !n.isDeleted && Boolean(n.reminderAt)).length;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 flex flex-col items-center">
      {/* Educational Banner */}
      <div className="w-full max-w-xl mb-6 bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between text-xs text-slate-700 shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 text-sm font-bold">
            ⚡
          </span>
          <div>
            <div className="font-semibold text-slate-900">Simulasi Chrome Extension Toolbar Popup</div>
            <div className="text-slate-500">Tekan ikon ekstensi di toolbar browser untuk membuka menu popup & kalender ini.</div>
          </div>
        </div>
        <div className="font-mono text-[11px] bg-slate-100 text-sky-700 px-2 py-1 rounded border border-slate-200">
          Alt+Shift+N
        </div>
      </div>

      {/* Simulated Browser Window Frame */}
      <div className="w-full max-w-xl bg-slate-100 border border-slate-300 rounded-2xl shadow-xl overflow-hidden">
        {/* Chrome Mock Browser Bar */}
        <div className="bg-slate-200 px-4 py-2.5 border-b border-slate-300 flex items-center gap-3 select-none">
          {/* Mac/Chrome Window Dots */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>

          {/* Omnibox Address Bar */}
          <div className="flex-1 bg-white rounded-lg px-3 py-1 text-xs text-slate-600 border border-slate-300 flex items-center gap-2">
            <span className="text-emerald-600">🔒</span>
            <span className="text-slate-700 truncate">chrome-extension://quicknotes-pro/popup.html</span>
          </div>

          {/* Extension Toolbar Pinned Icon */}
          <div className="flex items-center gap-1.5">
            <button 
              className="p-1.5 rounded-lg bg-sky-100 text-sky-700 border border-sky-300 relative shadow-2xs"
              title="QuickNotes Pro Extension (Active)"
            >
              <span className="text-xs font-bold">⚡</span>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-sky-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {notes.filter(n => !n.isDeleted).length}
              </span>
            </button>
          </div>
        </div>

        {/* The Actual 380px Extension Popup Canvas */}
        <div className="w-full bg-slate-100/60 flex flex-col justify-center items-center py-6 px-4">
          <div className="w-[390px] max-w-full bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px]">
            {/* Extension Popup Top Bar */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-sky-600 flex items-center justify-center text-white text-[10px] font-bold shadow-2xs">
                  ⚡
                </div>
                <span className="font-display font-bold text-sm text-slate-900 tracking-tight">QuickNotes</span>
                <span className="text-[10px] text-sky-600 font-mono font-semibold">v1.0</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={onOpenSidePanel}
                  className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded text-xs transition-colors font-medium"
                  title="Beralih ke Chrome Side Panel"
                >
                  📌 Side Panel
                </button>
              </div>
            </div>

            {/* Quick Note Input Box */}
            <div className="p-3 bg-white border-b border-slate-200 flex flex-col gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Judul catatan baru..."
                className="w-full bg-slate-50 border border-slate-300 focus:border-sky-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    document.getElementById('popup-content-area')?.focus();
                  }
                }}
              />
              <textarea
                id="popup-content-area"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tulis ide, ringkasan, atau tempel teks di sini..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-300 focus:border-sky-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none resize-none transition-colors"
              />

              {/* Controls bar */}
              <div className="flex items-center justify-between pt-1 gap-2">
                {/* Color dots */}
                <div className="flex items-center gap-1">
                  {(['amber', 'emerald', 'blue', 'purple', 'rose'] as NoteColor[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-3.5 h-3.5 rounded-full ${colorClasses[c].dot} transition-transform ${
                        color === c ? 'scale-125 ring-2 ring-slate-800 ring-offset-1 ring-offset-white' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={`Warna ${c}`}
                    />
                  ))}
                </div>

                {/* Reminder Picker Trigger inside popup input */}
                <div className="flex items-center gap-1.5">
                  <ReminderPicker
                    reminderAt={reminderAt}
                    onChangeReminder={(ts) => setReminderAt(ts)}
                  />

                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[11px] text-slate-800 outline-none"
                  >
                    <option value="ideas">💡 Ide</option>
                    <option value="work">💼 Kerja</option>
                    <option value="learning">📚 Belajar</option>
                    <option value="personal">👤 Pribadi</option>
                    <option value="clips">🌐 Klip</option>
                  </select>

                  <button
                    onClick={handleQuickSave}
                    disabled={!title.trim() && !content.trim()}
                    className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Tabs including dedicated Kalender Tab */}
            <div className="px-3 pt-2 pb-1 bg-slate-50 flex items-center justify-between border-b border-slate-200 text-[11px]">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                    activeTab === 'all' ? 'bg-white text-sky-700 font-semibold border border-slate-200 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({notes.filter(n => !n.isDeleted).length})
                </button>

                <button
                  onClick={() => setActiveTab('calendar')}
                  className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 whitespace-nowrap ${
                    activeTab === 'calendar' ? 'bg-white text-sky-700 font-semibold border border-slate-200 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CalendarIcon className="w-3 h-3 text-sky-600" />
                  <span>Kalender</span>
                  {totalRemindersCount > 0 && (
                    <span className="bg-amber-500 text-white text-[9px] px-1 rounded-full font-bold">
                      {totalRemindersCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('clips')}
                  className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                    activeTab === 'clips' ? 'bg-white text-sky-700 font-semibold border border-slate-200 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Klip
                </button>

                <button
                  onClick={() => setActiveTab('todo')}
                  className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                    activeTab === 'todo' ? 'bg-white text-sky-700 font-semibold border border-slate-200 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todo
                </button>
              </div>

              {activeTab !== 'calendar' && (
                <div className="relative w-24 ml-1">
                  <Search className="w-2.5 h-2.5 absolute left-1.5 top-2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari..."
                    className="w-full bg-white border border-slate-300 rounded pl-5 pr-1.5 py-0.5 text-[10px] text-slate-800 placeholder-slate-400 outline-none"
                  />
                </div>
              )}
            </div>

            {/* TAB CONTENT: 1. KALENDER VIEW INSIDE POPUP */}
            {activeTab === 'calendar' ? (
              <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50/60 p-2.5 space-y-2.5">
                {/* Mini Calendar Header */}
                <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-sky-600" />
                      <span>{monthNames[calMonth]} {calYear}</span>
                    </h4>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={goToPrevMonth}
                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                        title="Bulan lalu"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          const today = new Date();
                          setCalendarDate(today);
                          setSelectedCalendarDay(today);
                        }}
                        className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 rounded border border-slate-200"
                      >
                        Hari Ini
                      </button>
                      <button
                        onClick={goToNextMonth}
                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                        title="Bulan depan"
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
                    {miniCalendarDays.map((cell, idx) => {
                      const isSelected = selectedCalendarDay.toDateString() === cell.date.toDateString();
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedCalendarDay(cell.date)}
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
                          {/* Marker dots */}
                          {cell.hasOverdue ? (
                            <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-rose-500" />
                          ) : cell.hasReminders ? (
                            <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-amber-500" />
                          ) : cell.hasNotes ? (
                            <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-sky-400" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes on Selected Date Header */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-slate-700">
                    📅 {selectedCalendarDay.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                  <button
                    onClick={() => {
                      const presetTime = new Date(selectedCalendarDay);
                      presetTime.setHours(9, 0, 0, 0);
                      setReminderAt(presetTime.getTime());
                      document.getElementById('popup-content-area')?.focus();
                      onShowToast(`Pengingat diset untuk ${selectedCalendarDay.toLocaleDateString('id-ID')}`, 'info');
                    }}
                    className="text-[10px] text-sky-600 hover:underline font-semibold flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Jadwalkan di sini</span>
                  </button>
                </div>

                {/* Selected Date Notes List */}
                <div className="space-y-1.5">
                  {selectedDateNotes.length === 0 ? (
                    <div className="bg-white rounded-xl p-4 text-center border border-slate-200 text-slate-400 text-xs">
                      <p>Tidak ada catatan pada tanggal ini.</p>
                      <button
                        onClick={() => {
                          const presetTime = new Date(selectedCalendarDay);
                          presetTime.setHours(9, 0, 0, 0);
                          setReminderAt(presetTime.getTime());
                          document.getElementById('popup-content-area')?.focus();
                        }}
                        className="mt-1.5 px-2 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded text-[10px] font-semibold inline-flex items-center gap-1"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>Tulis Catatan untuk Tanggal Ini</span>
                      </button>
                    </div>
                  ) : (
                    selectedDateNotes.map((note) => {
                      const style = colorClasses[note.color || 'amber'];
                      const isOverdue = note.reminderAt && note.reminderAt < Date.now() && !note.isReminderDismissed;
                      return (
                        <div
                          key={note.id}
                          className={`p-2 rounded-xl border border-slate-200 border-l-[3.5px] ${style.border} ${style.bg} text-left flex flex-col gap-1 shadow-2xs`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 truncate">
                              {note.isPinned && <Pin className="w-2.5 h-2.5 text-amber-500 shrink-0" />}
                              <span className="font-semibold text-xs text-slate-900 truncate">{note.title}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {note.reminderAt && !note.isReminderDismissed && (
                                <button
                                  onClick={(e) => handleDismissReminder(note.id, e)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-100 rounded text-[10px]"
                                  title="Tandai selesai"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                onClick={() => handleCopyNote(note)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded"
                                title="Salin"
                              >
                                {copiedId === note.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              </button>
                              <button
                                onClick={() => onDeleteNote(note.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                title="Hapus"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-600 line-clamp-2">
                            {note.content.replace(/<[^>]*>/g, ' ')}
                          </p>

                          {note.reminderAt && (
                            <div className="flex items-center justify-between pt-0.5 text-[10px]">
                              <span className={`px-1.5 py-0.2 rounded font-semibold flex items-center gap-1 ${
                                isOverdue ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                <Clock className="w-2.5 h-2.5" />
                                <span>{formatReminderText(note.reminderAt).label}</span>
                              </span>
                              {!note.isReminderDismissed && (
                                <button
                                  onClick={(e) => handleSnooze10Min(note.id, e)}
                                  className="text-[9px] text-slate-500 hover:text-slate-800 underline"
                                >
                                  +10m
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* TAB CONTENT: 2. STANDARD NOTES LIST SCROLL AREA */
              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/60">
                {filteredNotes.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
                    <span className="text-2xl mb-2">📝</span>
                    <span className="text-slate-700 font-medium">Belum ada catatan di folder ini.</span>
                    <span className="text-[10px] text-slate-500 mt-1">Ketik di kotak atas untuk membuat catatan kilat.</span>
                  </div>
                ) : (
                  filteredNotes.map((note) => {
                    const style = colorClasses[note.color || 'amber'];
                    return (
                      <div
                        key={note.id}
                        className={`p-2.5 rounded-xl border border-slate-200 border-l-[3.5px] ${style.border} ${style.bg} hover:border-slate-300 transition-all flex flex-col gap-1 text-left relative group shadow-2xs`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 truncate">
                            {note.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                            <span className="font-semibold text-xs text-slate-900 truncate">{note.title || 'Tanpa Judul'}</span>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onTogglePin(note.id)}
                              className={`p-1 rounded text-[10px] ${note.isPinned ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}
                              title={note.isPinned ? 'Lepas Sematan' : 'Sematkan ke Atas'}
                            >
                              <Pin className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleCopyNote(note)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded"
                              title="Salin Catatan"
                            >
                              {copiedId === note.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => onDeleteNote(note.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Hapus"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                          {note.content.replace(/<[^>]*>/g, ' ')}
                        </p>

                        {/* Reminder Badge */}
                        {note.reminderAt && (() => {
                          const rem = formatReminderText(note.reminderAt);
                          return (
                            <div className={`mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold w-fit ${
                              rem.isPast ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              <Bell className="w-2.5 h-2.5 fill-current" />
                              <span>{rem.label}</span>
                            </div>
                          );
                        })()}

                        {/* Web Clip Link if available */}
                        {note.clippedUrl && (
                          <a
                            href={note.clippedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[10px] text-sky-600 hover:underline pt-0.5 truncate font-medium"
                          >
                            <Globe className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{note.clippedTitle || note.clippedUrl}</span>
                          </a>
                        )}

                        {/* Footer info */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                          <span>{new Date(note.updatedAt).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-slate-600 font-medium">#{note.category}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Extension Footer */}
            <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
              <span>{notes.filter(n => !n.isDeleted).length} Catatan ({totalRemindersCount} Pengingat)</span>
              <button 
                onClick={() => {
                  const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `quicknotes_export_${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  onShowToast('Data catatan berhasil diekspor ke JSON!', 'success');
                }}
                className="hover:text-slate-800 flex items-center gap-1 font-medium text-slate-600 cursor-pointer"
              >
                <Download className="w-3 h-3" /> Backup JSON
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
