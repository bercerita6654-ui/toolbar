import React, { useState, useMemo } from 'react';
import { Note, Category, NoteColor } from '../types/note';
import { ReminderPicker } from './ReminderPicker';
import { formatReminderText } from '../services/reminderService';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  Bell, 
  Pin, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  FileText, 
  Globe, 
  Mic, 
  CheckSquare, 
  X, 
  Sparkles,
  ArrowRight,
  Maximize2
} from 'lucide-react';

interface CalendarViewProps {
  notes: Note[];
  categories: Category[];
  onSaveNote: (note: Partial<Note>) => void;
  onDeleteNote: (id: string, permanent?: boolean) => void;
  onTogglePin: (id: string) => void;
  onOpenNewNoteModal: (defaultReminderTimestamp?: number) => void;
  onSelectNoteToEdit: (note: Note) => void;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type CalendarTab = 'month' | 'week' | 'agenda';
type ReminderFilter = 'all' | 'reminders_only' | 'upcoming' | 'overdue';

export const CalendarView: React.FC<CalendarViewProps> = ({
  notes,
  categories,
  onSaveNote,
  onDeleteNote,
  onTogglePin,
  onOpenNewNoteModal,
  onSelectNoteToEdit,
  onShowToast,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<CalendarTab>('month');
  const [reminderFilter, setReminderFilter] = useState<ReminderFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [isDayDrawerOpen, setIsDayDrawerOpen] = useState(false);
  const [previewNote, setPreviewNote] = useState<Note | null>(null);

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today);
  };

  const goToPrevMonth = () => {
    if (activeTab === 'week') {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(prevWeek.getDate() - 7);
      setCurrentDate(prevWeek);
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const goToNextMonth = () => {
    if (activeTab === 'week') {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setCurrentDate(nextWeek);
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  // Map notes to effective date (either reminder date or creation date)
  const nonDeletedNotes = useMemo(() => {
    return notes.filter((n) => !n.isDeleted);
  }, [notes]);

  // Filtered notes based on search & category
  const filteredNotes = useMemo(() => {
    const now = Date.now();
    return nonDeletedNotes.filter((note) => {
      // Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'clips' && (note.noteType !== 'clip' && !note.clippedUrl)) return false;
        if (selectedCategory !== 'clips' && note.category !== selectedCategory) return false;
      }

      // Reminder filter
      if (reminderFilter === 'reminders_only' && !note.reminderAt) return false;
      if (reminderFilter === 'upcoming') {
        if (!note.reminderAt || note.reminderAt < now || note.isReminderDismissed) return false;
      }
      if (reminderFilter === 'overdue') {
        if (!note.reminderAt || note.reminderAt >= now || note.isReminderDismissed) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = note.title.toLowerCase().includes(q);
        const matchesContent = note.content.toLowerCase().includes(q);
        const matchesTags = note.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesContent && !matchesTags) return false;
      }

      return true;
    });
  }, [nonDeletedNotes, selectedCategory, reminderFilter, searchQuery]);

  // Calculate calendar grid for month view (Monday start)
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday-based day of week (0=Mon, 6=Sun)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      notes: Note[];
    }> = [];

    const todayStr = new Date().toDateString();

    // Previous month padding days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      const dStr = d.toDateString();
      const dayNotes = filteredNotes.filter((n) => {
        const targetTime = n.reminderAt || n.createdAt;
        return new Date(targetTime).toDateString() === dStr;
      });
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        notes: dayNotes,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dStr = d.toDateString();
      const dayNotes = filteredNotes.filter((n) => {
        const targetTime = n.reminderAt || n.createdAt;
        return new Date(targetTime).toDateString() === dStr;
      });
      days.push({
        date: d,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        notes: dayNotes,
      });
    }

    // Next month padding days to complete 35 or 42 grid cells
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i);
      const dStr = d.toDateString();
      const dayNotes = filteredNotes.filter((n) => {
        const targetTime = n.reminderAt || n.createdAt;
        return new Date(targetTime).toDateString() === dStr;
      });
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        notes: dayNotes,
      });
    }

    return days;
  }, [year, month, filteredNotes]);

  // Week View Days calculation (Monday to Sunday)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay();
    const distanceToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + distanceToMon);

    const days: Array<{
      date: Date;
      isToday: boolean;
      notes: Note[];
    }> = [];

    const todayStr = new Date().toDateString();

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = d.toDateString();
      const dayNotes = filteredNotes.filter((n) => {
        const targetTime = n.reminderAt || n.createdAt;
        return new Date(targetTime).toDateString() === dStr;
      });
      days.push({
        date: d,
        isToday: dStr === todayStr,
        notes: dayNotes,
      });
    }

    return days;
  }, [currentDate, filteredNotes]);

  // Agenda Groups calculation
  const agendaGroups = useMemo(() => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd = new Date(todayEnd);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    const thisWeekEnd = new Date(todayStart);
    thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);

    const overdue: Note[] = [];
    const today: Note[] = [];
    const tomorrow: Note[] = [];
    const thisWeek: Note[] = [];
    const future: Note[] = [];
    const noReminder: Note[] = [];

    // Sort notes by reminder date, or created date
    const sorted = [...filteredNotes].sort((a, b) => {
      const timeA = a.reminderAt || a.createdAt;
      const timeB = b.reminderAt || b.createdAt;
      return timeA - timeB;
    });

    sorted.forEach((note) => {
      if (note.reminderAt) {
        if (note.reminderAt < now && !note.isReminderDismissed) {
          overdue.push(note);
        } else if (note.reminderAt >= todayStart.getTime() && note.reminderAt <= todayEnd.getTime()) {
          today.push(note);
        } else if (note.reminderAt >= tomorrowStart.getTime() && note.reminderAt <= tomorrowEnd.getTime()) {
          tomorrow.push(note);
        } else if (note.reminderAt > tomorrowEnd.getTime() && note.reminderAt <= thisWeekEnd.getTime()) {
          thisWeek.push(note);
        } else {
          future.push(note);
        }
      } else {
        noReminder.push(note);
      }
    });

    return [
      { id: 'overdue', title: 'Terlewat / Overdue', count: overdue.length, notes: overdue, color: 'text-rose-600 bg-rose-50 border-rose-200' },
      { id: 'today', title: 'Hari Ini', count: today.length, notes: today, color: 'text-sky-700 bg-sky-50 border-sky-200' },
      { id: 'tomorrow', title: 'Besok', count: tomorrow.length, notes: tomorrow, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
      { id: 'this_week', title: 'Minggu Ini', count: thisWeek.length, notes: thisWeek, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
      { id: 'future', title: 'Mendatang Lainnya', count: future.length, notes: future, color: 'text-purple-700 bg-purple-50 border-purple-200' },
      { id: 'no_reminder', title: 'Catatan Lainnya (Berdasarkan Tanggal Dibuat)', count: noReminder.length, notes: noReminder, color: 'text-slate-700 bg-slate-100 border-slate-200' },
    ].filter((g) => g.count > 0);
  }, [filteredNotes]);

  // Statistics
  const totalReminders = nonDeletedNotes.filter((n) => Boolean(n.reminderAt)).length;
  const overdueCount = nonDeletedNotes.filter((n) => n.reminderAt && n.reminderAt < Date.now() && !n.isReminderDismissed).length;
  const todayRemindersCount = nonDeletedNotes.filter((n) => {
    if (!n.reminderAt) return false;
    return new Date(n.reminderAt).toDateString() === new Date().toDateString();
  }).length;

  const handleCreateNoteOnDate = (date: Date) => {
    const reminderDate = new Date(date);
    reminderDate.setHours(9, 0, 0, 0); // Default to 9:00 AM on that day
    onOpenNewNoteModal(reminderDate.getTime());
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

  // Color mapping helper
  const getColorClasses = (color?: NoteColor) => {
    switch (color) {
      case 'amber':
        return 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100';
      case 'emerald':
        return 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100';
      case 'blue':
        return 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100';
      case 'purple':
        return 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100';
      case 'rose':
        return 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100';
      case 'slate':
      default:
        return 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50';
    }
  };

  // Notes on selected day for day inspector drawer
  const selectedDayNotes = useMemo(() => {
    if (!selectedDay) return [];
    const targetStr = selectedDay.toDateString();
    return filteredNotes.filter((n) => {
      const targetTime = n.reminderAt || n.createdAt;
      return new Date(targetTime).toDateString() === targetStr;
    });
  }, [selectedDay, filteredNotes]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Top Header & Navigation Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Month Selector & Navigation */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-sky-100 text-sky-700 rounded-xl">
                <CalendarIcon className="w-5 h-5" />
              </span>
              <div>
                <h1 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
                  {monthNames[month]} {year}
                  {activeTab === 'week' && (
                    <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      Minggu ke-{Math.ceil(currentDate.getDate() / 7)}
                    </span>
                  )}
                </h1>
                <p className="text-xs text-slate-500">
                  {totalReminders} catatan berjadwal • {todayRemindersCount} hari ini
                  {overdueCount > 0 && (
                    <span className="text-rose-600 font-semibold ml-1.5">• {overdueCount} terlewat</span>
                  )}
                </p>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-1.5 ml-0 sm:ml-4 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={goToPrevMonth}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
                title="Bulan sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToToday}
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                onClick={goToNextMonth}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
                title="Bulan berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right: View Tabs & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search in Calendar */}
            <div className="relative min-w-[160px] sm:min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari di kalender..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-800 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Reminder Type Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setReminderFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  reminderFilter === 'all' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setReminderFilter('reminders_only')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                  reminderFilter === 'reminders_only' ? 'bg-white text-amber-700 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bell className="w-3 h-3 text-amber-500" />
                <span>Pengingat</span>
              </button>
              <button
                onClick={() => setReminderFilter('overdue')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                  reminderFilter === 'overdue' ? 'bg-white text-rose-700 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <AlertCircle className="w-3 h-3 text-rose-500" />
                <span>Terlewat</span>
              </button>
            </div>

            {/* View Mode Tabs (Month, Week, Agenda) */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveTab('month')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === 'month' ? 'bg-white text-sky-700 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bulan
              </button>
              <button
                onClick={() => setActiveTab('week')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === 'week' ? 'bg-white text-sky-700 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Minggu
              </button>
              <button
                onClick={() => setActiveTab('agenda')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === 'agenda' ? 'bg-white text-sky-700 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Agenda
              </button>
            </div>

            {/* Add Note Button */}
            <button
              onClick={() => onOpenNewNoteModal(Date.now())}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Jadwalkan Catatan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main View Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center: Active Calendar View */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 lg:p-6">
          {/* 1. MONTH VIEW */}
          {activeTab === 'month' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col flex-1 min-h-[600px] overflow-hidden">
              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-semibold text-slate-600 py-3">
                {dayNames.map((d, idx) => (
                  <div key={d} className={idx >= 5 ? 'text-rose-500 font-bold' : ''}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Month Grid Cells */}
              <div className="grid grid-cols-7 flex-1 auto-rows-fr divide-x divide-y divide-slate-100">
                {calendarGrid.map((dayItem, idx) => {
                  const isSelected = selectedDay && selectedDay.toDateString() === dayItem.date.toDateString();
                  const hasOverdue = dayItem.notes.some(
                    (n) => n.reminderAt && n.reminderAt < Date.now() && !n.isReminderDismissed
                  );
                  const hasUpcoming = dayItem.notes.some(
                    (n) => n.reminderAt && n.reminderAt >= Date.now() && !n.isReminderDismissed
                  );

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedDay(dayItem.date);
                        setIsDayDrawerOpen(true);
                      }}
                      className={`group relative p-2 min-h-[95px] flex flex-col transition-all cursor-pointer ${
                        !dayItem.isCurrentMonth
                          ? 'bg-slate-50/40 text-slate-400'
                          : isSelected
                          ? 'bg-sky-50/60 ring-2 ring-sky-400 ring-inset'
                          : 'bg-white hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Day Header */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium transition-all ${
                            dayItem.isToday
                              ? 'bg-sky-600 text-white font-bold shadow-xs'
                              : isSelected
                              ? 'bg-sky-200 text-sky-900 font-bold'
                              : dayItem.isCurrentMonth
                              ? 'text-slate-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {dayItem.date.getDate()}
                        </span>

                        <div className="flex items-center gap-1">
                          {/* Indicator dots */}
                          {hasOverdue && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Ada pengingat terlewat" />
                          )}
                          {hasUpcoming && (
                            <span className="w-2 h-2 rounded-full bg-amber-500" title="Ada pengingat terjadwal" />
                          )}

                          {/* Quick Add Button on Cell Hover */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateNoteOnDate(dayItem.date);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-sky-100 text-sky-600 rounded-md transition-opacity"
                            title={`Tambah catatan pada ${dayItem.date.toLocaleDateString('id-ID')}`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Day Notes List / Badges */}
                      <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                        {dayItem.notes.slice(0, 3).map((note) => {
                          const isOverdue = note.reminderAt && note.reminderAt < Date.now() && !note.isReminderDismissed;
                          return (
                            <div
                              key={note.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewNote(note);
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate border flex items-center gap-1 transition-all ${
                                isOverdue
                                  ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                                  : getColorClasses(note.color)
                              }`}
                              title={`${note.title} ${note.reminderAt ? '• ⏰ ' + new Date(note.reminderAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}`}
                            >
                              {note.isPinned && <Pin className="w-2.5 h-2.5 text-amber-600 shrink-0 rotate-45" />}
                              {note.reminderAt && (
                                <span className="text-[9px] font-mono text-amber-700 shrink-0">
                                  {new Date(note.reminderAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                              <span className="truncate">{note.title || 'Catatan'}</span>
                            </div>
                          );
                        })}

                        {dayItem.notes.length > 3 && (
                          <span className="text-[10px] font-semibold text-sky-600 px-1">
                            +{dayItem.notes.length - 3} lainnya
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. WEEK VIEW */}
          {activeTab === 'week' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col flex-1 min-h-[550px] overflow-hidden">
              <div className="grid grid-cols-7 divide-x divide-slate-200 flex-1">
                {weekDays.map((dayItem, idx) => {
                  const isSelected = selectedDay && selectedDay.toDateString() === dayItem.date.toDateString();
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col p-3 transition-colors ${
                        dayItem.isToday ? 'bg-sky-50/40' : isSelected ? 'bg-slate-50' : 'bg-white'
                      }`}
                    >
                      {/* Day Header */}
                      <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
                        <div>
                          <p className={`text-xs font-semibold uppercase ${dayItem.isToday ? 'text-sky-700' : 'text-slate-500'}`}>
                            {dayNames[idx]}
                          </p>
                          <p className={`text-lg font-bold ${dayItem.isToday ? 'text-sky-600' : 'text-slate-900'}`}>
                            {dayItem.date.getDate()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCreateNoteOnDate(dayItem.date)}
                          className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          title="Tambah catatan"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Day Notes Column */}
                      <div className="flex-1 py-3 space-y-2 overflow-y-auto max-h-[500px]">
                        {dayItem.notes.length === 0 ? (
                          <div className="text-center py-8 text-slate-300 text-xs italic">
                            Tidak ada jadwal
                          </div>
                        ) : (
                          dayItem.notes.map((note) => {
                            const isOverdue = note.reminderAt && note.reminderAt < Date.now() && !note.isReminderDismissed;
                            return (
                              <div
                                key={note.id}
                                onClick={() => setPreviewNote(note)}
                                className={`p-2.5 rounded-xl border text-xs cursor-pointer shadow-2xs hover:shadow-xs transition-all ${
                                  isOverdue ? 'bg-rose-50 border-rose-200 text-rose-900' : getColorClasses(note.color)
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  {note.reminderAt ? (
                                    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded">
                                      <Clock className="w-2.5 h-2.5" />
                                      {new Date(note.reminderAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-mono">Dibuat</span>
                                  )}
                                  {note.isPinned && <Pin className="w-3 h-3 text-amber-600 rotate-45" />}
                                </div>
                                <h4 className="font-semibold text-slate-900 text-xs line-clamp-1 mb-0.5">{note.title}</h4>
                                <div
                                  className="text-[11px] text-slate-600 line-clamp-2"
                                  dangerouslySetInnerHTML={{ __html: note.content || '<em>Kosong</em>' }}
                                />
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. AGENDA VIEW */}
          {activeTab === 'agenda' && (
            <div className="max-w-4xl w-full mx-auto space-y-6">
              {agendaGroups.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                  <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-800 mb-1">Tidak Ada Jadwal / Catatan yang Cocok</h3>
                  <p className="text-xs text-slate-500 mb-4">Coba sesuaikan filter atau tambahkan pengingat pada catatan Anda.</p>
                  <button
                    onClick={() => onOpenNewNoteModal(Date.now())}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Jadwalkan Catatan Baru</span>
                  </button>
                </div>
              ) : (
                agendaGroups.map((group) => (
                  <div key={group.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    {/* Section Header */}
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${group.color}`}>
                          {group.title}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">({group.count})</span>
                      </div>
                    </div>

                    {/* Section Notes List */}
                    <div className="divide-y divide-slate-100">
                      {group.notes.map((note) => {
                        const isOverdue = note.reminderAt && note.reminderAt < Date.now() && !note.isReminderDismissed;
                        const reminderInfo = note.reminderAt ? formatReminderText(note.reminderAt) : null;

                        return (
                          <div
                            key={note.id}
                            onClick={() => setPreviewNote(note)}
                            className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <span className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                                note.color === 'emerald' ? 'bg-emerald-500' :
                                note.color === 'blue' ? 'bg-sky-500' :
                                note.color === 'purple' ? 'bg-purple-500' :
                                note.color === 'rose' ? 'bg-rose-500' : 'bg-amber-500'
                              }`} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                  <h4 className="text-sm font-semibold text-slate-900 truncate">{note.title}</h4>
                                  {note.isPinned && <Pin className="w-3 h-3 text-amber-500 rotate-45 shrink-0" />}
                                  {note.noteType === 'clip' && <Globe className="w-3 h-3 text-sky-500 shrink-0" />}
                                  {note.noteType === 'voice' && <Mic className="w-3 h-3 text-rose-500 shrink-0" />}
                                </div>
                                <div
                                  className="text-xs text-slate-600 line-clamp-1 mb-1.5"
                                  dangerouslySetInnerHTML={{ __html: note.content || '<em>Kosong</em>' }}
                                />
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                                  <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                                    📁 {categories.find((c) => c.id === note.category)?.name || note.category}
                                  </span>
                                  {note.reminderAt && reminderInfo && (
                                    <span className={`px-2 py-0.5 rounded font-semibold flex items-center gap-1 ${
                                      isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      <Clock className="w-3 h-3" />
                                      <span>{reminderInfo.label}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                              {note.reminderAt && !note.isReminderDismissed && (
                                <>
                                  <button
                                    onClick={(e) => handleDismissReminder(note.id, e)}
                                    className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1"
                                    title="Tandai pengingat selesai"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Selesai</span>
                                  </button>
                                  <button
                                    onClick={(e) => handleSnooze10Min(note.id, e)}
                                    className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                    title="Tunda 10 Menit"
                                  >
                                    +10m
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => onSelectNoteToEdit(note)}
                                className="px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right: Selected Day Inspector Drawer (Opens when user clicks a date) */}
        {isDayDrawerOpen && selectedDay && (
          <aside className="w-80 lg:w-96 bg-white border-l border-slate-200 flex flex-col shadow-lg z-20">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">
                  {selectedDay.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
                <p className="text-xs text-slate-500">{selectedDayNotes.length} catatan pada tanggal ini</p>
              </div>
              <button
                onClick={() => setIsDayDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Add Button */}
            <div className="p-4 border-b border-slate-100">
              <button
                onClick={() => handleCreateNoteOnDate(selectedDay)}
                className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Buat Catatan di Tanggal Ini</span>
              </button>
            </div>

            {/* Day Notes List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedDayNotes.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>Tidak ada catatan atau pengingat untuk hari ini.</p>
                </div>
              ) : (
                selectedDayNotes.map((note) => {
                  const isOverdue = note.reminderAt && note.reminderAt < Date.now() && !note.isReminderDismissed;
                  return (
                    <div
                      key={note.id}
                      onClick={() => setPreviewNote(note)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer shadow-2xs hover:shadow-xs transition-all ${
                        isOverdue ? 'bg-rose-50 border-rose-200' : getColorClasses(note.color)
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="font-semibold text-slate-900 text-xs truncate">{note.title}</span>
                        {note.isPinned && <Pin className="w-3 h-3 text-amber-600 rotate-45 shrink-0" />}
                      </div>
                      <div
                        className="text-[11px] text-slate-600 line-clamp-3 mb-2"
                        dangerouslySetInnerHTML={{ __html: note.content || '<em>Kosong</em>' }}
                      />
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-[10px]">
                        {note.reminderAt ? (
                          <span className="text-amber-800 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(note.reminderAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-slate-400">Tanpa alarm</span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectNoteToEdit(note);
                          }}
                          className="text-sky-600 hover:text-sky-800 font-semibold"
                        >
                          Buka Catatan →
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Note Quick Preview Modal */}
      {previewNote && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${
                  previewNote.color === 'emerald' ? 'bg-emerald-500' :
                  previewNote.color === 'blue' ? 'bg-sky-500' :
                  previewNote.color === 'purple' ? 'bg-purple-500' :
                  previewNote.color === 'rose' ? 'bg-rose-500' : 'bg-amber-500'
                }`} />
                <h3 className="font-bold text-slate-900 text-sm truncate max-w-[280px]">
                  {previewNote.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewNote(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {/* Reminder info if set */}
              {previewNote.reminderAt && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="font-semibold">Waktu Pengingat:</p>
                      <p className="text-[11px] text-amber-800">{formatReminderText(previewNote.reminderAt).label}</p>
                    </div>
                  </div>
                  {!previewNote.isReminderDismissed && (
                    <button
                      onClick={(e) => {
                        handleDismissReminder(previewNote.id, e);
                        setPreviewNote({ ...previewNote, isReminderDismissed: true });
                      }}
                      className="px-2 py-1 bg-white text-emerald-700 border border-emerald-200 rounded-lg font-semibold text-[10px] hover:bg-emerald-50"
                    >
                      Tandai Selesai
                    </button>
                  )}
                </div>
              )}

              {/* Note Content */}
              <div
                className="text-xs leading-relaxed text-slate-700 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: previewNote.content || '<em>Catatan kosong</em>' }}
              />

              {/* Tags */}
              {previewNote.tags && previewNote.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {previewNote.tags.map((tag) => (
                    <span key={tag} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => {
                  onTogglePin(previewNote.id);
                  setPreviewNote({ ...previewNote, isPinned: !previewNote.isPinned });
                }}
                className={`px-3 py-1.5 text-xs rounded-lg font-semibold flex items-center gap-1.5 border transition-colors ${
                  previewNote.isPinned
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Pin className="w-3.5 h-3.5 rotate-45" />
                <span>{previewNote.isPinned ? 'Tersemat (Pinned)' : 'Sematkan (Pin)'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const target = previewNote;
                    setPreviewNote(null);
                    onSelectNoteToEdit(target);
                  }}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                >
                  Buka & Edit Catatan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
