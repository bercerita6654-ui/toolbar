export type NoteType = 'standard' | 'todo' | 'code' | 'clip' | 'voice';

export type NoteColor = 'default' | 'amber' | 'emerald' | 'blue' | 'purple' | 'rose' | 'slate';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  noteType: NoteType;
  category: string;
  tags: string[];
  color: NoteColor;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  createdAt: number;
  updatedAt: number;
  clippedUrl?: string;
  clippedTitle?: string;
  clippedFavicon?: string;
  todoItems?: TodoItem[];
  codeLanguage?: string;
  voiceDurationSeconds?: number;
  reminderAt?: number | null;
  isReminderDismissed?: boolean;
}

export interface Category {
  id: string;
  name: string;
  iconName: string;
  color?: string;
}

export type ViewMode = 
  | 'dashboard' 
  | 'calendar'
  | 'extension_popup' 
  | 'sidepanel' 
  | 'browser_clipper_demo' 
  | 'extension_builder';

export interface FilterOptions {
  searchQuery: string;
  category: string;
  tag: string;
  color: string;
  noteType: string;
  isPinnedOnly: boolean;
  isFavoriteOnly: boolean;
  isArchivedOnly: boolean;
  isTrash: boolean;
  sortBy: 'updated' | 'created' | 'title';
  sortOrder: 'asc' | 'desc';
}

export interface ExtensionFileItem {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}
