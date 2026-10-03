import { Note } from '../types/note';

/**
 * Play gentle notification chime using Web Audio API
 */
export function playReminderChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonic bell chord: E5, G#5, B5
    const freqs = [659.25, 830.61, 987.77];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.85);
    });
  } catch (err) {
    console.warn('Audio playback not supported or user blocked:', err);
  }
}

/**
 * Request Browser Notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Show native Browser Notification
 */
export function showBrowserNotification(title: string, body: string, noteId?: string) {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification(title, {
        body,
        icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%230284c7"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>',
        tag: noteId || 'quicknotes_reminder',
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }
  } catch (err) {
    console.warn('Browser notification error:', err);
  }
}

/**
 * Format a reminder timestamp into clear human text
 */
export function formatReminderText(timestamp: number): { label: string; isPast: boolean; isDueToday: boolean } {
  const now = Date.now();
  const diff = timestamp - now;
  const isPast = diff <= 0;

  const date = new Date(timestamp);
  const nowDate = new Date();

  const isToday =
    date.getDate() === nowDate.getDate() &&
    date.getMonth() === nowDate.getMonth() &&
    date.getFullYear() === nowDate.getFullYear();

  const tomorrowDate = new Date(nowDate);
  tomorrowDate.setDate(nowDate.getDate() + 1);
  const isTomorrow =
    date.getDate() === tomorrowDate.getDate() &&
    date.getMonth() === tomorrowDate.getMonth() &&
    date.getFullYear() === tomorrowDate.getFullYear();

  const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  if (isPast) {
    const minutesAgo = Math.floor(Math.abs(diff) / 60000);
    if (minutesAgo < 1) return { label: 'Waktu Pengingat Tiba!', isPast: true, isDueToday: true };
    if (minutesAgo < 60) return { label: `Terlewat ${minutesAgo}m lalu (${timeStr})`, isPast: true, isDueToday: isToday };
    const hoursAgo = Math.floor(minutesAgo / 60);
    if (hoursAgo < 24 && isToday) return { label: `Terlewat ${hoursAgo}j lalu (${timeStr})`, isPast: true, isDueToday: true };
    return { label: `Terlewat (${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ${timeStr})`, isPast: true, isDueToday: isToday };
  }

  if (isToday) {
    return { label: `Hari ini, ${timeStr}`, isPast: false, isDueToday: true };
  }

  if (isTomorrow) {
    return { label: `Besok, ${timeStr}`, isPast: false, isDueToday: false };
  }

  return {
    label: `${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}, ${timeStr}`,
    isPast: false,
    isDueToday: false,
  };
}

/**
 * Get active reminders count
 */
export function getActiveReminders(notes: Note[]): Note[] {
  return notes.filter(
    (n) => !n.isDeleted && Boolean(n.reminderAt) && !n.isReminderDismissed
  );
}

/**
 * Check for due reminders
 */
export function getDueReminders(notes: Note[]): Note[] {
  const now = Date.now();
  return notes.filter(
    (n) => !n.isDeleted && Boolean(n.reminderAt) && (n.reminderAt as number) <= now && !n.isReminderDismissed
  );
}
