import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Note } from '../types/note';
import { 
  googleSignIn, 
  googleLogout, 
  getAccessToken, 
  initAuth 
} from '../services/googleAuth';
import { 
  listDriveFolders, 
  createDriveFolder, 
  findOrCreateQuickNotesFolder, 
  syncNotesDatabaseToDrive, 
  pullNotesFromDrive, 
  DriveFolder 
} from '../services/googleDriveService';
import { 
  Cloud, 
  CloudUpload, 
  CloudDownload, 
  Folder, 
  FolderPlus, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  LogOut, 
  X,
  Search,
  Lock,
  ArrowRight
} from 'lucide-react';

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onNotesUpdated: (notes: Note[]) => void;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({
  isOpen,
  onClose,
  notes,
  onNotesUpdated,
  onShowToast,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<DriveFolder | null>(null);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [folderSearch, setFolderSearch] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    return localStorage.getItem('quicknotes_last_drive_sync');
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmOverwriteModal, setConfirmOverwriteModal] = useState<{
    show: boolean;
    pulledNotes?: Note[];
  }>({ show: false });

  // Init Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (authUser, authToken) => {
        setUser(authUser);
        setToken(authToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Fetch folders once token is available
  useEffect(() => {
    if (isOpen && token) {
      loadFolders(token);
    }
  }, [isOpen, token]);

  const loadFolders = async (authToken: string) => {
    setIsLoadingFolders(true);
    setErrorMsg(null);
    try {
      const defaultFolder = await findOrCreateQuickNotesFolder(authToken);
      setSelectedFolder(defaultFolder);

      const allFolders = await listDriveFolders(authToken);
      setFolders(allFolders);
    } catch (err: any) {
      console.error('Error loading drive folders:', err);
      setErrorMsg(err.message || 'Gagal memuat folder dari Google Drive');
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const handleSignIn = async () => {
    setIsLoadingAuth(true);
    setErrorMsg(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        onShowToast(`Berhasil masuk sebagai ${res.user.displayName || res.user.email}!`, 'success');
        await loadFolders(res.accessToken);
      }
    } catch (err: any) {
      console.error('Google sign in failed:', err);
      setErrorMsg(err.message || 'Otorisasi Google gagal. Silakan coba lagi.');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleLogout = async () => {
    try {
      await googleLogout();
      setUser(null);
      setToken(null);
      setFolders([]);
      setSelectedFolder(null);
      onShowToast('Berhasil keluar dari akun Google', 'info');
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newFolderName.trim()) return;

    try {
      setIsLoadingFolders(true);
      const newFolder = await createDriveFolder(token, newFolderName.trim());
      setFolders((prev) => [newFolder, ...prev]);
      setSelectedFolder(newFolder);
      setNewFolderName('');
      setShowCreateFolder(false);
      onShowToast(`Folder '${newFolder.name}' berhasil dibuat di Drive!`, 'success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membuat folder baru di Google Drive');
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const handleSyncToDrive = async () => {
    if (!token || !selectedFolder) {
      setErrorMsg('Pilih folder Google Drive terlebih dahulu.');
      return;
    }

    setIsSyncing(true);
    setErrorMsg(null);
    try {
      const res = await syncNotesDatabaseToDrive(token, selectedFolder.id, notes);
      if (res.success) {
        const timeString = new Date().toLocaleString('id-ID');
        setLastSyncedAt(timeString);
        localStorage.setItem('quicknotes_last_drive_sync', timeString);
        onShowToast(`🎉 ${notes.length} catatan berhasil disinkronkan ke folder '${selectedFolder.name}'!`, 'success');
      } else {
        throw new Error(res.error || 'Gagal menyinkronkan');
      }
    } catch (err: any) {
      console.error('Sync to Drive error:', err);
      setErrorMsg(err.message || 'Gagal mengunggah catatan ke Google Drive');
      onShowToast('Gagal sinkronisasi ke Google Drive', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromDrive = async () => {
    if (!token || !selectedFolder) {
      setErrorMsg('Pilih folder Google Drive terlebih dahulu.');
      return;
    }

    setIsSyncing(true);
    setErrorMsg(null);
    try {
      const res = await pullNotesFromDrive(token, selectedFolder.id);
      if (res.success && res.notes) {
        setConfirmOverwriteModal({
          show: true,
          pulledNotes: res.notes,
        });
      } else {
        throw new Error(res.error || 'Catatan tidak ditemukan di folder ini');
      }
    } catch (err: any) {
      console.error('Pull from Drive error:', err);
      setErrorMsg(err.message || 'Gagal mengambil catatan dari Google Drive');
      onShowToast(err.message || 'Gagal mengambil data dari Google Drive', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfirmOverwrite = () => {
    if (confirmOverwriteModal.pulledNotes) {
      onNotesUpdated(confirmOverwriteModal.pulledNotes);
      const timeString = new Date().toLocaleString('id-ID');
      setLastSyncedAt(timeString);
      localStorage.setItem('quicknotes_last_drive_sync', timeString);
      onShowToast(`✅ ${confirmOverwriteModal.pulledNotes.length} catatan berhasil dimuat dari Google Drive!`, 'success');
    }
    setConfirmOverwriteModal({ show: false });
  };

  if (!isOpen) return null;

  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(folderSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-slate-900 tracking-tight">
                Sinkronisasi Google Drive
              </h2>
              <p className="text-xs text-slate-500">
                Simpan & pulihkan catatan Anda secara aman di awan Google Drive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Error Message Box */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">
                <span className="font-semibold block mb-0.5">Terjadi Kendala:</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Auth State Section */}
          {!user ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-600 text-xl">
                ☁️
              </div>
              <div className="max-w-md">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Hubungkan ke Akun Google Anda
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Dengan otorisasi Google Drive, catatan ekstensi Anda akan tersimpan otomatis dan dapat diakses dari perangkat mana pun.
                </p>
              </div>

              {/* Official Google Sign-In Material Button */}
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isLoadingAuth}
                className="flex items-center gap-3 bg-white text-slate-800 hover:bg-slate-50 border border-slate-300 font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                {isLoadingAuth ? 'Menghubungkan...' : 'Sign in with Google'}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* User Profile Bar */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Google User'}
                      className="w-9 h-9 rounded-full ring-2 ring-emerald-400"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                      {user.displayName?.charAt(0) || 'G'}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      {user.displayName || 'Pengguna Google'}
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    </div>
                    <div className="text-[11px] text-slate-500">{user.email}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-2.5 py-1.5 text-xs text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Keluar
                </button>
              </div>

              {/* Folder Selector Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-amber-500" />
                    Pilih Folder Google Drive:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCreateFolder(!showCreateFolder)}
                    className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1 font-semibold"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    + Folder Baru
                  </button>
                </div>

                {/* Create folder inline form */}
                {showCreateFolder && (
                  <form onSubmit={handleCreateFolder} className="flex gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Nama folder baru..."
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 outline-none"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!newFolderName.trim()}
                      className="px-3 py-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                    >
                      Buat
                    </button>
                  </form>
                )}

                {/* Selected Folder Highlight */}
                {selectedFolder && (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-slate-900">{selectedFolder.name}</div>
                        <div className="text-[10px] text-slate-500">ID: {selectedFolder.id}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                      Folder Aktif
                    </span>
                  </div>
                )}

                {/* Folder List with Search */}
                <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                  <div className="p-2 border-b border-slate-200 flex items-center gap-2 bg-slate-50">
                    <Search className="w-3.5 h-3.5 text-slate-400 ml-1" />
                    <input
                      type="text"
                      value={folderSearch}
                      onChange={(e) => setFolderSearch(e.target.value)}
                      placeholder="Cari folder Drive..."
                      className="w-full bg-transparent text-xs text-slate-800 outline-none"
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto p-1 divide-y divide-slate-100">
                    {isLoadingFolders ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        Memuat folder dari Drive...
                      </div>
                    ) : filteredFolders.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        Tidak ada folder ditemukan.
                      </div>
                    ) : (
                      filteredFolders.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setSelectedFolder(f)}
                          className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                            selectedFolder?.id === f.id
                              ? 'bg-sky-50 text-sky-800 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{f.name}</span>
                          </div>
                          {selectedFolder?.id === f.id && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Sync Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSyncToDrive}
                  disabled={isSyncing || !selectedFolder}
                  className="p-3.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-xs font-semibold"
                >
                  <CloudUpload className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                  <span>Simpan Catatan ke Drive</span>
                </button>

                <button
                  type="button"
                  onClick={handlePullFromDrive}
                  disabled={isSyncing || !selectedFolder}
                  className="p-3.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 border border-slate-200 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-semibold"
                >
                  <CloudDownload className="w-4 h-4 text-sky-600" />
                  <span>Tarik Data dari Drive</span>
                </button>
              </div>

              {/* Last Sync Timestamp */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                <span>Total Catatan Lokal: {notes.length} item</span>
                <span>Terakhir Sync: {lastSyncedAt || 'Belum pernah'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Overwrite Confirmation Dialog */}
      {confirmOverwriteModal.show && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-rose-200 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Konfirmasi Pemulihan Data</h4>
                <p className="text-xs text-slate-500">Timpa catatan lokal dengan data dari Drive?</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              Ditemukan <strong>{confirmOverwriteModal.pulledNotes?.length || 0} catatan</strong> di Google Drive. Tindakan ini akan menggantikan catatan yang ada saat ini di browser.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmOverwriteModal({ show: false })}
                className="px-3.5 py-1.5 text-xs text-slate-500 hover:text-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmOverwrite}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-xs transition-colors"
              >
                Ya, Terapkan dari Drive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
