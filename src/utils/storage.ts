import { Note, ViewMode } from '../types/note';
import { DEFAULT_NOTES } from '../data/defaultNotes';

const STORAGE_KEY = 'quicknotes_extension_data_v1';
const THEME_KEY = 'quicknotes_theme_pref';
const LAST_VIEW_MODE_KEY = 'quicknotes_last_view_mode';
const LAST_SELECTED_NOTE_KEY = 'quicknotes_last_selected_note';

export function getStoredNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_NOTES));
      return sortNotesWithPinnedFirst(DEFAULT_NOTES);
    }
    const parsed = JSON.parse(raw);
    const notesArray = Array.isArray(parsed) ? parsed : DEFAULT_NOTES;
    return sortNotesWithPinnedFirst(notesArray);
  } catch (error) {
    console.error('Error reading stored notes:', error);
    return sortNotesWithPinnedFirst(DEFAULT_NOTES);
  }
}

export function sortNotesWithPinnedFirst(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
      return a.isPinned ? -1 : 1;
    }
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
}

export function saveStoredNotes(notes: Note[]): void {
  try {
    const sorted = sortNotesWithPinnedFirst(notes);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    // Trigger a window event so all views update in real-time
    window.dispatchEvent(new Event('quicknotes-storage-change'));
  } catch (error) {
    console.error('Error saving notes to storage:', error);
  }
}

export function getLastViewMode(): ViewMode {
  try {
    const mode = localStorage.getItem(LAST_VIEW_MODE_KEY) as ViewMode;
    const validModes: ViewMode[] = ['dashboard', 'calendar', 'extension_popup', 'sidepanel', 'browser_clipper_demo', 'extension_builder'];
    return validModes.includes(mode) ? mode : 'dashboard';
  } catch {
    return 'dashboard';
  }
}

export function setLastViewMode(mode: ViewMode): void {
  try {
    localStorage.setItem(LAST_VIEW_MODE_KEY, mode);
  } catch (err) {
    console.error(err);
  }
}

export function getLastSelectedNoteId(): string | null {
  try {
    return localStorage.getItem(LAST_SELECTED_NOTE_KEY);
  } catch {
    return null;
  }
}

export function setLastSelectedNoteId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(LAST_SELECTED_NOTE_KEY, id);
    } else {
      localStorage.removeItem(LAST_SELECTED_NOTE_KEY);
    }
  } catch (err) {
    console.error(err);
  }
}

export function exportNotesToJSON(notes: Note[]): string {
  const exportPayload = {
    version: '1.0.0',
    app: 'QuickNotes Chrome Extension',
    exportedAt: new Date().toISOString(),
    notesCount: notes.length,
    notes,
  };
  return JSON.stringify(exportPayload, null, 2);
}

export function exportNotesToMarkdown(notes: Note[]): string {
  return notes
    .filter(n => !n.isDeleted)
    .map(n => {
      const dateStr = new Date(n.updatedAt).toLocaleString('id-ID');
      const tagsStr = n.tags.map(t => `#${t}`).join(' ');
      let body = n.content;

      if (n.todoItems && n.todoItems.length > 0) {
        const todoList = n.todoItems
          .map(t => `- [${t.completed ? 'x' : ' '}] ${t.text}`)
          .join('\n');
        body = `${body}\n\n${todoList}`;
      }

      if (n.clippedUrl) {
        body = `*Sumber Kliping: [${n.clippedTitle || n.clippedUrl}](${n.clippedUrl})*\n\n${body}`;
      }

      return `# ${n.title}\n*Kategori: ${n.category} | ${dateStr}*\n${tagsStr ? `*Tags: ${tagsStr}*\n` : ''}\n${body}\n\n---`;
    })
    .join('\n\n');
}

export function getThemePref(): 'dark' | 'light' {
  try {
    return (localStorage.getItem(THEME_KEY) as 'dark' | 'light') || 'light';
  } catch {
    return 'light';
  }
}

export function setThemePref(theme: 'dark' | 'light'): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (err) {
    console.error(err);
  }
}
