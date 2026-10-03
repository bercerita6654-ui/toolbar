import { Note } from '../types/note';

export interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  createdTime?: string;
  modifiedTime?: string;
}

export interface DriveSyncResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  totalSynced?: number;
  error?: string;
}

export interface DrivePullResult {
  success: boolean;
  notes?: Note[];
  folderName?: string;
  error?: string;
}

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';

// Helper to handle API response and extract clear human-friendly error messages
async function handleDriveResponse(res: Response) {
  if (!res.ok) {
    let errorMsg = `Google Drive Error (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson?.error?.message) {
        errorMsg = errJson.error.message;
      }
    } catch {
      // fallback
    }

    if (res.status === 401) {
      throw new Error('Sesi Google Drive telah kedaluwarsa. Silakan klik tombol Masuk kembali.');
    } else if (res.status === 403) {
      throw new Error(`Izin Google Drive terbatas atau kuota penuh: ${errorMsg}`);
    } else if (res.status === 404) {
      throw new Error('Folder atau file di Google Drive tidak ditemukan.');
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

/**
 * List folders in Google Drive
 */
export async function listDriveFolders(accessToken: string): Promise<DriveFolder[]> {
  try {
    const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    const url = `${DRIVE_API_URL}/files?q=${query}&fields=files(id,name,mimeType,parents,modifiedTime)&pageSize=100&orderBy=name_natural`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await handleDriveResponse(res);
    return data.files || [];
  } catch (error: any) {
    console.error('listDriveFolders error:', error);
    throw error;
  }
}

/**
 * Create a new folder in Google Drive
 */
export async function createDriveFolder(
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<DriveFolder> {
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  const res = await fetch(`${DRIVE_API_URL}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  return await handleDriveResponse(res);
}

/**
 * Find or create default "QuickNotes App" folder in user's Drive root
 */
export async function findOrCreateQuickNotesFolder(accessToken: string): Promise<DriveFolder> {
  try {
    const query = encodeURIComponent(
      "mimeType = 'application/vnd.google-apps.folder' and name = 'QuickNotes App' and trashed = false"
    );
    const url = `${DRIVE_API_URL}/files?q=${query}&fields=files(id,name,mimeType,parents)`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await handleDriveResponse(res);
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }

    return await createDriveFolder(accessToken, 'QuickNotes App');
  } catch (err) {
    console.warn('findOrCreateQuickNotesFolder fallback, attempting create:', err);
    return await createDriveFolder(accessToken, 'QuickNotes App');
  }
}

/**
 * Find existing file in a folder by name
 */
export async function findFileInFolder(
  accessToken: string,
  folderId: string,
  fileName: string
): Promise<{ id: string; name: string } | null> {
  try {
    const query = encodeURIComponent(`'${folderId}' in parents and name = '${fileName}' and trashed = false`);
    const url = `${DRIVE_API_URL}/files?q=${query}&fields=files(id,name)`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await handleDriveResponse(res);
    return data.files && data.files.length > 0 ? data.files[0] : null;
  } catch {
    return null;
  }
}

/**
 * Save / Sync all notes database to a selected Drive folder
 * Uses robust 2-step metadata + media upload for 100% browser reliability
 */
export async function syncNotesDatabaseToDrive(
  accessToken: string,
  folderId: string,
  notes: Note[]
): Promise<DriveSyncResult> {
  try {
    const fileName = 'quicknotes_database.json';
    const payload = {
      app: 'QuickNotes Pro Chrome Extension',
      version: '1.0.0',
      syncedAt: new Date().toISOString(),
      totalNotes: notes.length,
      notes: notes,
    };

    const fileContent = JSON.stringify(payload, null, 2);
    let targetFileId: string | null = null;

    // 1. Check if file already exists in this folder
    const existingFile = await findFileInFolder(accessToken, folderId, fileName);

    if (existingFile) {
      targetFileId = existingFile.id;
    } else {
      // Create file entry first
      const createRes = await fetch(`${DRIVE_API_URL}/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: fileName,
          mimeType: 'application/json',
          parents: [folderId],
        }),
      });

      const newFile = await handleDriveResponse(createRes);
      targetFileId = newFile.id;
    }

    if (!targetFileId) {
      throw new Error('Gagal menyiapkan ID file di Google Drive.');
    }

    // 2. Upload file content directly via media upload endpoint
    const uploadUrl = `${DRIVE_UPLOAD_URL}/files/${targetFileId}?uploadType=media`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: fileContent,
    });

    await handleDriveResponse(uploadRes);

    return {
      success: true,
      fileId: targetFileId,
      fileName,
      totalSynced: notes.length,
    };
  } catch (error: any) {
    console.error('Error syncing notes to Drive:', error);
    return {
      success: false,
      error: error?.message || 'Gagal menyinkronkan catatan ke Google Drive',
    };
  }
}

/**
 * Pull and retrieve notes from the selected Google Drive folder
 */
export async function pullNotesFromDrive(
  accessToken: string,
  folderId: string
): Promise<DrivePullResult> {
  try {
    const existingFile = await findFileInFolder(accessToken, folderId, 'quicknotes_database.json');
    if (!existingFile) {
      return {
        success: false,
        error: 'File cadangan (quicknotes_database.json) belum ada di folder ini. Lakukan sinkronisasi pertama kali untuk menyimpannya.',
      };
    }

    const downloadUrl = `${DRIVE_API_URL}/files/${existingFile.id}?alt=media`;
    const res = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      await handleDriveResponse(res);
    }

    const data = await res.json();
    if (data && Array.isArray(data.notes)) {
      return {
        success: true,
        notes: data.notes,
      };
    } else {
      return {
        success: false,
        error: 'Format berkas catatan di Google Drive tidak sesuai.',
      };
    }
  } catch (error: any) {
    console.error('Error pulling notes from Drive:', error);
    return {
      success: false,
      error: error?.message || 'Gagal mengambil data catatan dari Google Drive',
    };
  }
}
