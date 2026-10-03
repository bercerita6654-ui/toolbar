import React, { useState } from 'react';
import { Bell, Clock, Calendar, X, Check, AlertCircle } from 'lucide-react';
import { formatReminderText, requestNotificationPermission } from '../services/reminderService';

interface ReminderPickerProps {
  reminderAt?: number | null;
  onChangeReminder: (timestamp: number | null) => void;
}

export const ReminderPicker: React.FC<ReminderPickerProps> = ({
  reminderAt,
  onChangeReminder,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customDateTime, setCustomDateTime] = useState(() => {
    if (reminderAt) {
      const d = new Date(reminderAt);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    const d = new Date(Date.now() + 3600000); // 1 hour from now
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  const handleSetPreset = async (type: '1h' | 'tonight' | 'tomorrow_morning' | 'tomorrow_evening' | 'next_week') => {
    await requestNotificationPermission();
    const now = new Date();
    let target = new Date();

    if (type === '1h') {
      target = new Date(now.getTime() + 60 * 60 * 1000);
    } else if (type === 'tonight') {
      target.setHours(19, 0, 0, 0);
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
    } else if (type === 'tomorrow_morning') {
      target.setDate(now.getDate() + 1);
      target.setHours(9, 0, 0, 0);
    } else if (type === 'tomorrow_evening') {
      target.setDate(now.getDate() + 1);
      target.setHours(18, 0, 0, 0);
    } else if (type === 'next_week') {
      target.setDate(now.getDate() + 7);
      target.setHours(9, 0, 0, 0);
    }

    onChangeReminder(target.getTime());
    setIsOpen(false);
  };

  const handleApplyCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDateTime) return;
    await requestNotificationPermission();
    const timestamp = new Date(customDateTime).getTime();
    if (!isNaN(timestamp)) {
      onChangeReminder(timestamp);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onChangeReminder(null);
    setIsOpen(false);
  };

  const reminderInfo = reminderAt ? formatReminderText(reminderAt) : null;

  return (
    <div className="relative">
      {/* Trigger Button */}
      {reminderAt ? (
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 text-amber-900 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-2xs">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 hover:text-amber-700 cursor-pointer"
            title="Klik untuk ubah waktu pengingat"
          >
            <Bell className={`w-3.5 h-3.5 ${reminderInfo?.isPast ? 'text-rose-600 fill-rose-600 animate-bounce' : 'text-amber-600 fill-amber-500'}`} />
            <span className={reminderInfo?.isPast ? 'text-rose-700 font-bold' : ''}>
              {reminderInfo?.label}
            </span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 hover:bg-amber-200/60 rounded text-amber-700 cursor-pointer ml-1"
            title="Hapus pengingat"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer border border-slate-200"
          title="Pasang pengingat tanggal & waktu"
        >
          <Bell className="w-3.5 h-3.5 text-slate-500" />
          <span>+ Pengingat</span>
        </button>
      )}

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-800">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              Setel Waktu Pengingat
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1 mb-3">
            <button
              type="button"
              onClick={() => handleSetPreset('1h')}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-sky-50 text-xs text-slate-700 hover:text-sky-700 font-medium flex items-center justify-between transition-colors"
            >
              <span>⏳ 1 Jam Lagi</span>
              <span className="text-[10px] text-slate-400">
                {new Date(Date.now() + 3600000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('tonight')}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-sky-50 text-xs text-slate-700 hover:text-sky-700 font-medium flex items-center justify-between transition-colors"
            >
              <span>🌆 Nanti Malam</span>
              <span className="text-[10px] text-slate-400">19:00</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('tomorrow_morning')}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-sky-50 text-xs text-slate-700 hover:text-sky-700 font-medium flex items-center justify-between transition-colors"
            >
              <span>🌅 Besok Pagi</span>
              <span className="text-[10px] text-slate-400">09:00</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('tomorrow_evening')}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-sky-50 text-xs text-slate-700 hover:text-sky-700 font-medium flex items-center justify-between transition-colors"
            >
              <span>🌇 Besok Sore</span>
              <span className="text-[10px] text-slate-400">18:00</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('next_week')}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-sky-50 text-xs text-slate-700 hover:text-sky-700 font-medium flex items-center justify-between transition-colors"
            >
              <span>📅 Minggu Depan</span>
              <span className="text-[10px] text-slate-400">09:00</span>
            </button>
          </div>

          {/* Custom Date Time Picker Form */}
          <form onSubmit={handleApplyCustom} className="pt-2 border-t border-slate-100 space-y-2">
            <label className="text-[11px] font-semibold text-slate-600 block">
              Pilih Tanggal & Jam Kustom:
            </label>
            <input
              type="datetime-local"
              value={customDateTime}
              onChange={(e) => setCustomDateTime(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-sky-500"
              required
            />
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
              >
                Terapkan
              </button>
              {reminderAt && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold transition-colors"
                >
                  Hapus
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
