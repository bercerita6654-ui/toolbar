import React from 'react';
import { Bell, Clock, Check, X, ArrowRight, CornerDownRight } from 'lucide-react';
import { Note } from '../types/note';

interface ReminderNotificationBannerProps {
  dueNotes: Note[];
  onSelectNote: (noteId: string) => void;
  onDismissReminder: (noteId: string) => void;
  onSnoozeReminder: (noteId: string, minutes: number) => void;
}

export const ReminderNotificationBanner: React.FC<ReminderNotificationBannerProps> = ({
  dueNotes,
  onSelectNote,
  onDismissReminder,
  onSnoozeReminder,
}) => {
  if (!dueNotes || dueNotes.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full animate-in slide-in-from-bottom-5 duration-300">
      {dueNotes.map((note) => (
        <div
          key={note.id}
          className="bg-white border-2 border-amber-500 rounded-2xl p-4 shadow-2xl flex flex-col gap-2.5 text-slate-900 ring-4 ring-amber-400/20"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 animate-bounce">
                <Bell className="w-4 h-4 fill-amber-500" />
              </span>
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                ⏰ Pengingat Catatan!
              </span>
            </div>
            <button
              onClick={() => onDismissReminder(note.id)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Note Title & Content Preview */}
          <div
            onClick={() => onSelectNote(note.id)}
            className="cursor-pointer group hover:bg-slate-50 p-2 rounded-xl transition-colors"
          >
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors truncate">
              {note.title || 'Catatan Tanpa Judul'}
            </h4>
            <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
              {note.content.replace(/<[^>]*>/g, '') || 'Tidak ada deskripsi teks.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <button
              onClick={() => onSnoozeReminder(note.id, 10)}
              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors font-medium flex items-center gap-1 cursor-pointer"
            >
              <Clock className="w-3 h-3" />
              <span>Tunda 10m</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onDismissReminder(note.id)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                Selesai
              </button>
              <button
                onClick={() => onSelectNote(note.id)}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Buka</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
