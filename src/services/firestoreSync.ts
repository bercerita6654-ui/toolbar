import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  getDoc,
  collection,
  writeBatch
} from 'firebase/firestore';
import { Note } from '../types/note';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

const BROADCAST_CHANNEL_NAME = 'quicknotes_live_channel';
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
} catch {
  // BroadcastChannel not available in all contexts
}

/**
 * Broadcast note update to other local tabs & extension views instantly
 */
export function broadcastLocalNotesUpdate(notes: Note[], source: string = 'app') {
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'NOTES_UPDATED', notes, timestamp: Date.now(), source });
    }
  } catch (e) {
    console.warn('BroadcastChannel error:', e);
  }
}

/**
 * Subscribe to local multi-tab broadcast updates
 */
export function subscribeToLocalBroadcast(onNotesUpdated: (notes: Note[]) => void): () => void {
  if (!broadcastChannel) return () => {};

  const handler = (event: MessageEvent) => {
    if (event.data && event.data.type === 'NOTES_UPDATED' && Array.isArray(event.data.notes)) {
      onNotesUpdated(event.data.notes);
    }
  };

  broadcastChannel.addEventListener('message', handler);
  return () => {
    broadcastChannel?.removeEventListener('message', handler);
  };
}

let activeFirestoreUnsubscribe: (() => void) | null = null;
let isSavingToFirestore = false;

/**
 * Listen to live real-time notes changes from Firestore for this user.
 * Whenever any computer / device updates notes, this callback triggers instantly.
 */
export function subscribeToUserNotesRealtime(
  userId: string,
  onNotesReceived: (notes: Note[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (activeFirestoreUnsubscribe) {
    activeFirestoreUnsubscribe();
    activeFirestoreUnsubscribe = null;
  }

  try {
    const userNotesDocRef = doc(db, 'users', userId, 'notes_data', 'all_notes');

    const unsubscribe = onSnapshot(
      userNotesDocRef,
      (snapshot) => {
        if (isSavingToFirestore) {
          // Skip incoming self-generated snapshot to avoid echo loops
          return;
        }

        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && Array.isArray(data.notes)) {
            onNotesReceived(data.notes);
          }
        }
      },
      (error) => {
        console.warn('Firestore realtime sync warning:', error);
        if (onError) onError(error);
      }
    );

    activeFirestoreUnsubscribe = unsubscribe;
    return unsubscribe;
  } catch (err: any) {
    console.error('Failed to subscribe to Firestore realtime:', err);
    if (onError) onError(err);
    return () => {};
  }
}

let firestoreSaveTimeout: any = null;

/**
 * Save user notes to Firestore cloud database (debounced to prevent throttling).
 * This makes sure that any edit on this computer is broadcast in real time to all other computers.
 */
export async function saveNotesToFirestoreRealtime(
  userId: string,
  notes: Note[],
  onSuccess?: () => void,
  onError?: (err: Error) => void
) {
  if (firestoreSaveTimeout) {
    clearTimeout(firestoreSaveTimeout);
  }

  firestoreSaveTimeout = setTimeout(async () => {
    try {
      isSavingToFirestore = true;
      const userNotesDocRef = doc(db, 'users', userId, 'notes_data', 'all_notes');
      
      await setDoc(userNotesDocRef, {
        notes,
        totalNotes: notes.length,
        updatedAt: Date.now(),
        lastUpdatedByComputer: typeof navigator !== 'undefined' ? navigator.userAgent : 'web-app',
      }, { merge: true });

      // Also broadcast locally across open tabs & windows
      broadcastLocalNotesUpdate(notes, 'firestore-save');

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error saving to Firestore:', err);
      if (onError) onError(err);
    } finally {
      setTimeout(() => {
        isSavingToFirestore = false;
      }, 500);
    }
  }, 800);
}
