import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Note, Category, ViewMode } from './types/note';
import { DEFAULT_CATEGORIES } from './data/defaultNotes';
import { 
  getStoredNotes, 
  saveStoredNotes, 
  getLastViewMode, 
  setLastViewMode, 
  getLastSelectedNoteId, 
  setLastSelectedNoteId,
  sortNotesWithPinnedFirst
} from './utils/storage';
import { generateAndDownloadExtensionZip } from './services/extensionPackage';
import { initAuth } from './services/googleAuth';
import { 
  triggerDebouncedCloudSync, 
  pullLatestFromCloud, 
  SyncStatus, 
  getAutoSyncPref 
} from './services/cloudAutoSync';
import { 
  subscribeToUserNotesRealtime, 
  saveNotesToFirestoreRealtime, 
  subscribeToLocalBroadcast,
  broadcastLocalNotesUpdate
} from './services/firestoreSync';
import {
  getDueReminders,
  playReminderChime,
  showBrowserNotification
} from './services/reminderService';

import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { CalendarView } from './components/CalendarView';
import { ExtensionPopupView } from './components/ExtensionPopupView';
import { ExtensionSidepanelView } from './components/ExtensionSidepanelView';
import { BrowserClipperDemo } from './components/BrowserClipperDemo';
import { ExtensionBuilderView } from './components/ExtensionBuilderView';
import { NoteModal } from './components/NoteModal';
import { VoiceRecorderModal } from './components/VoiceRecorderModal';
import { GoogleDriveSyncModal } from './components/GoogleDriveSyncModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { ReminderNotificationBanner } from './components/ReminderNotificationBanner';
import { ToastContainer, ToastMessage } from './components/Toast';

export default function App() {
  const [notes, setNotes] = useState<Note[]>(() => getStoredNotes());
  const [categories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [currentMode, setCurrentModeState] = useState<ViewMode>(() => getLastViewMode());
  const [selectedNoteId, setSelectedNoteIdState] = useState<string | null>(() => {
    const lastId = getLastSelectedNoteId();
    const stored = getStoredNotes();
    if (lastId && stored.some(n => n.id === lastId && !n.isDeleted)) {
      return lastId;
    }
    return stored[0]?.id || null;
  });

  const setCurrentMode = (mode: ViewMode) => {
    setCurrentModeState(mode);
    setLastViewMode(mode);
  };

  const setSelectedNoteId = (id: string | null) => {
    setSelectedNoteIdState(id);
    setLastSelectedNoteId(id);
  };

  // Auth & Cloud Sync state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  // Modals state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [modalReminderTimestamp, setModalReminderTimestamp] = useState<number | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  // Reminders state
  const [dueNotes, setDueNotes] = useState<Note[]>([]);
  const notifiedReminderIds = useRef<Set<string>>(new Set());

  // Toasts state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const isInitialCloudLoad = useRef(true);

  const showToast = useCallback(
    (text: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      setToasts((prev) => [...prev, { id, text, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync to local storage & trigger background cloud sync (Firestore + Google Drive)
  const updateAndPersistNotes = useCallback(
    (updated: Note[], skipCloudSync: boolean = false) => {
      setNotes(updated);
      saveStoredNotes(updated);
      broadcastLocalNotesUpdate(updated, 'app-local');

      if (!skipCloudSync && currentUser?.uid) {
        setSyncStatus('syncing');

        // 1. Instant Realtime Cloud DB Sync (Instant update across any other logged-in computer)
        saveNotesToFirestoreRealtime(
          currentUser.uid,
          updated,
          () => {
            setSyncStatus('synced');
          },
          (err) => {
            console.warn('Firestore real-time sync notification:', err);
          }
        );

        // 2. Google Drive Cloud Backup (Debounced file storage)
        triggerDebouncedCloudSync(updated, (status, err) => {
          setSyncStatus(status);
          if (status === 'error' && err) {
            console.warn('Google Drive auto-sync warning:', err);
          }
        });
      }
    },
    [currentUser]
  );

  // Listen to Auth state and connect Firestore Realtime Listener
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setSyncStatus('syncing');

        // Connect Realtime Firestore snapshot listener for multi-device sync
        unsubscribeFirestore = subscribeToUserNotesRealtime(
          user.uid,
          (cloudNotes) => {
            if (Array.isArray(cloudNotes) && cloudNotes.length > 0) {
              setNotes(cloudNotes);
              saveStoredNotes(cloudNotes);
              setSyncStatus('synced');
              if (isInitialCloudLoad.current) {
                isInitialCloudLoad.current = false;
                showToast(`⚡ Tersinkronisasi otomatis dengan akun ${user.email || 'Google'}!`, 'success');
              }
            } else if (cloudNotes.length === 0 && notes.length > 0) {
              // Initial push to cloud if cloud is empty
              saveNotesToFirestoreRealtime(user.uid, notes);
            }
          },
          (err) => {
            console.warn('Firestore subscription status:', err);
          }
        );

        // Also check Google Drive if token available
        if (token) {
          pullLatestFromCloud(
            notes,
            (driveNotes) => {
              updateAndPersistNotes(driveNotes, true);
            },
            (status) => setSyncStatus(status)
          );
        } else {
          setSyncStatus('synced');
        }
      },
      () => {
        setCurrentUser(null);
        setSyncStatus('idle');
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
          unsubscribeFirestore = null;
        }
      }
    );

    return () => {
      if (typeof unsubscribeAuth === 'function') unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // Multi-tab instant synchronization
  useEffect(() => {
    const unsubscribeBroadcast = subscribeToLocalBroadcast((broadcastedNotes) => {
      setNotes(broadcastedNotes);
      saveStoredNotes(broadcastedNotes);
    });

    const handleStorageChange = () => {
      setNotes(getStoredNotes());
    };
    window.addEventListener('quicknotes-storage-change', handleStorageChange);

    return () => {
      unsubscribeBroadcast();
      window.removeEventListener('quicknotes-storage-change', handleStorageChange);
    };
  }, []);

  // Window Focus Auto-Sync Listener (checks if updates happened from other tab/computer)
  useEffect(() => {
    const handleWindowFocus = () => {
      if (currentUser && getAutoSyncPref()) {
        pullLatestFromCloud(
          notes,
          (cloudNotes) => {
            updateAndPersistNotes(cloudNotes, true);
          },
          (status) => setSyncStatus(status)
        );
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [currentUser, notes, updateAndPersistNotes]);

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K for Global Search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Periodic Reminder Checker (checks every 5 seconds)
  useEffect(() => {
    const checkReminders = () => {
      const due = getDueReminders(notes);
      setDueNotes(due);

      due.forEach((note) => {
        if (!notifiedReminderIds.current.has(note.id)) {
          notifiedReminderIds.current.add(note.id);
          playReminderChime();
          showBrowserNotification(
            `⏰ Pengingat: ${note.title || 'Catatan'}`,
            note.content.replace(/<[^>]*>/g, '').slice(0, 100) || 'Waktu pengingat catatan telah tiba.',
            note.id
          );
        }
      });
    };

    checkReminders();
    const interval = setInterval(checkReminders, 5000);
    return () => clearInterval(interval);
  }, [notes]);

  const handleDismissReminder = (noteId: string) => {
    const updated = notes.map((n) =>
      n.id === noteId ? { ...n, isReminderDismissed: true, updatedAt: Date.now() } : n
    );
    updateAndPersistNotes(updated);
    setDueNotes((prev) => prev.filter((n) => n.id !== noteId));
    showToast('Pengingat ditandai selesai.', 'info');
  };

  const handleSnoozeReminder = (noteId: string, minutes: number = 10) => {
    const newTime = Date.now() + minutes * 60 * 1000;
    const updated = notes.map((n) =>
      n.id === noteId ? { ...n, reminderAt: newTime, isReminderDismissed: false, updatedAt: Date.now() } : n
    );
    updateAndPersistNotes(updated);
    notifiedReminderIds.current.delete(noteId);
    setDueNotes((prev) => prev.filter((n) => n.id !== noteId));
    showToast(`Pengingat ditunda ${minutes} menit! ⏳`, 'info');
  };

  const handleSaveNote = (noteData: Partial<Note>) => {
    if (noteData.id) {
      // Update existing
      const updated = notes.map((n) =>
        n.id === noteData.id
          ? {
              ...n,
              ...noteData,
              updatedAt: Date.now(),
            }
          : n
      );
      updateAndPersistNotes(updated);
    } else {
      // Create new
      const newNote: Note = {
        id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        title: noteData.title || 'Catatan Tanpa Judul',
        content: noteData.content || '',
        category: noteData.category || 'ideas',
        tags: noteData.tags || [],
        color: noteData.color || 'amber',
        noteType: noteData.noteType || 'standard',
        isPinned: Boolean(noteData.isPinned),
        isFavorite: Boolean(noteData.isFavorite),
        isArchived: false,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        clippedUrl: noteData.clippedUrl,
        clippedTitle: noteData.clippedTitle,
      };
      updateAndPersistNotes([newNote, ...notes]);
      setSelectedNoteId(newNote.id);
    }
  };

  const handleDeleteNote = (id: string, permanent: boolean = false) => {
    if (permanent) {
      const updated = notes.filter((n) => n.id !== id);
      updateAndPersistNotes(updated);
      showToast('Catatan dihapus secara permanen.', 'info');
    } else {
      const updated = notes.map((n) =>
        n.id === id ? { ...n, isDeleted: true, updatedAt: Date.now() } : n
      );
      updateAndPersistNotes(updated);
      showToast('Catatan dipindahkan ke Sampah.', 'info');
    }
  };

  const handleRestoreNote = (id: string) => {
    const updated = notes.map((n) =>
      n.id === id ? { ...n, isDeleted: false, updatedAt: Date.now() } : n
    );
    updateAndPersistNotes(updated);
    showToast('Catatan berhasil dipulihkan dari Sampah! ✨', 'success');
  };

  const handleTogglePin = (id: string) => {
    let nowPinned = false;
    const updated = notes.map((n) => {
      if (n.id === id) {
        nowPinned = !n.isPinned;
        return { ...n, isPinned: nowPinned, updatedAt: Date.now() };
      }
      return n;
    });
    const sorted = sortNotesWithPinnedFirst(updated);
    updateAndPersistNotes(sorted);
    showToast(
      nowPinned 
        ? '📌 Catatan disematkan ke posisi teratas (selalu muncul saat browser dibuka)!' 
        : 'Catatan dilepas dari sematan.',
      'info'
    );
  };

  const handleDownloadExtension = async () => {
    try {
      showToast('Menyiapkan paket ekstensi ZIP Chrome...', 'info');
      await generateAndDownloadExtensionZip();
      showToast('🎉 Paket Ekstensi Manifest V3 berhasil diunduh!', 'success');
    } catch (err: any) {
      showToast('Gagal mengunduh ekstensi: ' + err.message, 'error');
    }
  };

  const handleSaveVoiceNote = (transcript: string, durationSeconds: number) => {
    handleSaveNote({
      title: '🎙️ Memo Suara ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      content: `<p><strong>Transkripsi Suara (${durationSeconds}s):</strong></p><blockquote>${transcript}</blockquote>`,
      noteType: 'voice',
      category: 'personal',
      color: 'rose',
      tags: ['voice-memo'],
    });
    showToast('Memo suara berhasil disimpan ke catatan!', 'success');
  };

  const handleSelectNoteFromSearch = (noteId: string) => {
    setSelectedNoteId(noteId);
    setCurrentMode('dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Top Bar following 3-zone contract with Multi-Device Sync Indicator */}
      <Header
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        onOpenNewNoteModal={() => {
          setEditingNote(null);
          setModalReminderTimestamp(null);
          setIsNoteModalOpen(true);
        }}
        onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
        onOpenDriveSyncModal={() => setIsDriveModalOpen(true)}
        onDownloadExtension={handleDownloadExtension}
        notesCount={notes.filter((n) => !n.isDeleted).length}
        remindersCount={notes.filter((n) => !n.isDeleted && Boolean(n.reminderAt)).length}
        syncStatus={syncStatus}
        isAuthenticated={Boolean(currentUser)}
        userEmail={currentUser?.email || null}
      />

      {/* Main Content Area Based on Current View Mode */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentMode === 'dashboard' && (
          <DashboardView
            notes={notes}
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            selectedNoteId={selectedNoteId}
            onSelectNote={setSelectedNoteId}
            onSaveNote={handleSaveNote}
            onDeleteNote={handleDeleteNote}
            onRestoreNote={handleRestoreNote}
            onTogglePin={handleTogglePin}
            onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
            onOpenDriveSyncModal={() => setIsDriveModalOpen(true)}
            onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
            onOpenCalendar={() => setCurrentMode('calendar')}
            onShowToast={showToast}
            syncStatus={syncStatus}
            isAuthenticated={Boolean(currentUser)}
            userEmail={currentUser?.email || null}
          />
        )}

        {currentMode === 'calendar' && (
          <CalendarView
            notes={notes}
            categories={categories}
            onSaveNote={handleSaveNote}
            onDeleteNote={handleDeleteNote}
            onTogglePin={handleTogglePin}
            onOpenNewNoteModal={(defaultTimestamp) => {
              setEditingNote(null);
              setModalReminderTimestamp(defaultTimestamp || null);
              setIsNoteModalOpen(true);
            }}
            onSelectNoteToEdit={(note) => {
              setEditingNote(note);
              setModalReminderTimestamp(note.reminderAt || null);
              setIsNoteModalOpen(true);
            }}
            onShowToast={showToast}
          />
        )}

        {currentMode === 'extension_popup' && (
          <ExtensionPopupView
            notes={notes}
            onSaveNote={handleSaveNote}
            onDeleteNote={handleDeleteNote}
            onTogglePin={handleTogglePin}
            onShowToast={showToast}
            onOpenSidePanel={() => setCurrentMode('sidepanel')}
          />
        )}

        {currentMode === 'sidepanel' && (
          <ExtensionSidepanelView
            notes={notes}
            onSaveNote={handleSaveNote}
            onDeleteNote={handleDeleteNote}
            onTogglePin={handleTogglePin}
            onShowToast={showToast}
          />
        )}

        {currentMode === 'browser_clipper_demo' && (
          <BrowserClipperDemo
            onSaveNote={(note) => {
              handleSaveNote(note);
              showToast('Teks berhasil dikliping ke QuickNotes! ✂️', 'success');
            }}
            onShowToast={showToast}
          />
        )}

        {currentMode === 'extension_builder' && (
          <ExtensionBuilderView onShowToast={showToast} />
        )}
      </main>

      {/* Rich Text Editor Note Creation / Edit Modal */}
      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => {
          setIsNoteModalOpen(false);
          setEditingNote(null);
          setModalReminderTimestamp(null);
        }}
        note={editingNote}
        defaultReminderAt={modalReminderTimestamp}
        onSave={(data) => {
          handleSaveNote(data);
          setIsNoteModalOpen(false);
          setEditingNote(null);
          setModalReminderTimestamp(null);
          showToast('Catatan berhasil disimpan! 📝', 'success');
        }}
        onShowToast={showToast}
        onOpenVoiceModal={() => {
          setIsNoteModalOpen(false);
          setIsVoiceModalOpen(true);
        }}
      />

      {/* Voice Recorder Modal */}
      <VoiceRecorderModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSaveVoiceNote={handleSaveVoiceNote}
      />

      {/* Google Drive Multi-Device Cloud Sync Modal */}
      <GoogleDriveSyncModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        notes={notes}
        onNotesUpdated={(updated) => updateAndPersistNotes(updated, true)}
        onShowToast={showToast}
      />

      {/* Global Full-Text Search Modal */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        notes={notes}
        onSelectNote={handleSelectNoteFromSearch}
      />

      {/* Real-time Reminder Alert Notification Banner */}
      <ReminderNotificationBanner
        dueNotes={dueNotes}
        onSelectNote={handleSelectNoteFromSearch}
        onDismissReminder={handleDismissReminder}
        onSnoozeReminder={handleSnoozeReminder}
      />

      {/* Toast Notification Stack */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
