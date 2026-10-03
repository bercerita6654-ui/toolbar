import { Note } from '../types/note';
import { getAccessToken } from './googleAuth';
import { 
  findOrCreateQuickNotesFolder, 
  syncNotesDatabaseToDrive, 
  pullNotesFromDrive, 
  DriveFolder 
} from './googleDriveService';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface CloudAutoSyncState {
  enabled: boolean;
  status: SyncStatus;
  lastSyncedAt: string | null;
  activeFolder: DriveFolder | null;
  errorMessage: string | null;
}

const AUTO_SYNC_ENABLED_KEY = 'quicknotes_auto_sync_enabled';
const LAST_SYNCED_TIMESTAMP_KEY = 'quicknotes_last_synced_timestamp';

export function getAutoSyncPref(): boolean {
  try {
    const val = localStorage.getItem(AUTO_SYNC_ENABLED_KEY);
    return val !== null ? JSON.parse(val) : true; // Enabled by default
  } catch {
    return true;
  }
}

export function setAutoSyncPref(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_SYNC_ENABLED_KEY, JSON.stringify(enabled));
  } catch (err) {
    console.error(err);
  }
}

let syncTimeout: any = null;

/**
 * Trigger debounced cloud auto-save to Google Drive
 */
export function triggerDebouncedCloudSync(
  notes: Note[],
  onStatusChange?: (status: SyncStatus, error?: string) => void
) {
  if (!getAutoSyncPref()) return;

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  onStatusChange?.('syncing');

  // Debounce 2 seconds so fast typing doesn't spam API requests
  syncTimeout = setTimeout(async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        onStatusChange?.('idle');
        return;
      }

      const folder = await findOrCreateQuickNotesFolder(token);
      const res = await syncNotesDatabaseToDrive(token, folder.id, notes);

      if (res.success) {
        const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        localStorage.setItem(LAST_SYNCED_TIMESTAMP_KEY, time);
        onStatusChange?.('synced');
      } else {
        // Handle token expiration or failure gracefully without spamming error toasts
        onStatusChange?.('idle');
      }
    } catch (err: any) {
      console.warn('Auto sync skipped / session expired:', err?.message || err);
      onStatusChange?.('idle');
    }
  }, 1800);
}

/**
 * Check and pull latest notes from Google Drive on app startup or focus
 */
export async function pullLatestFromCloud(
  currentNotes: Note[],
  onNotesPulled: (notes: Note[]) => void,
  onStatusChange?: (status: SyncStatus, error?: string) => void
): Promise<boolean> {
  try {
    const token = await getAccessToken();
    if (!token) {
      onStatusChange?.('idle');
      return false;
    }

    onStatusChange?.('syncing');
    const folder = await findOrCreateQuickNotesFolder(token);
    const res = await pullNotesFromDrive(token, folder.id);

    if (res.success && res.notes) {
      // Compare if incoming notes from cloud are newer than local
      const cloudLatestTime = Math.max(...res.notes.map((n) => n.updatedAt || 0), 0);
      const localLatestTime = Math.max(...currentNotes.map((n) => n.updatedAt || 0), 0);

      if (cloudLatestTime > localLatestTime || currentNotes.length === 0) {
        onNotesPulled(res.notes);
      }
      onStatusChange?.('synced');
      return true;
    } else {
      onStatusChange?.('idle');
      return false;
    }
  } catch (err: any) {
    console.warn('Pull latest cloud skipped / session expired:', err?.message || err);
    onStatusChange?.('idle');
    return false;
  }
}
