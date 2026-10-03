import { Note, Category } from '../types/note';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'all', name: 'Semua Catatan', iconName: 'FileText' },
  { id: 'work', name: 'Pekerjaan & Kantor', iconName: 'Briefcase' },
  { id: 'ideas', name: 'Ide & Proyek', iconName: 'Lightbulb' },
  { id: 'learning', name: 'Belajar & Riset', iconName: 'BookOpen' },
  { id: 'personal', name: 'Pribadi & Harian', iconName: 'User' },
  { id: 'clips', name: 'Kliping Web Browser', iconName: 'Globe' },
];

export const DEFAULT_NOTES: Note[] = [
  {
    id: 'note-1',
    title: '✨ Selamat Datang di QuickNotes Chrome Extension!',
    content: `QuickNotes adalah ekstensi Google Chrome modern untuk mencatat ide kilat, membuat todo list, dan menyimpan kliping dari halaman web mana pun saat menjelajah internet.

Fitur Unggulan:
- ⚡ Akses Cepat Toolbar Popup (Alt + Shift + N)
- 📌 Chrome Side Panel untuk mencatat berdampingan saat browsing
- 🌐 Web Clipper: Blok teks di web > Klik Kanan > "Simpan ke QuickNotes"
- 🤖 Asisten AI: Ringkas catatan, perbaiki tata bahasa, buat to-do otomatis
- 📦 Ekspor Ekstensi: Unduh file ZIP dan pasang langsung di Google Chrome!`,
    noteType: 'standard',
    category: 'ideas',
    tags: ['panduan', 'fitur', 'chrome-extension'],
    color: 'amber',
    isPinned: true,
    isFavorite: true,
    isArchived: false,
    isDeleted: false,
    createdAt: Date.now() - 3600000 * 24 * 2,
    updatedAt: Date.now() - 3600000 * 4,
  },
  {
    id: 'note-2',
    title: '🌐 Kliping Riset: Tren Arsitektur AI & Web Apps',
    content: `Kutipan Penting dari Halaman Web:
"Kombinasi AI berbasis browser dan ekstensi Manifest V3 memungkinkan pencatatan kontekstual tanpa meninggalkan alur kerja aktif pengguna."

Poin Penting:
1. Manifest V3 Chrome Extension mendukung Service Worker dan Side Panel API.
2. Simpan sumber URL otomatis untuk referensi sitasi riset.
3. Sinkronisasi cepat via chrome.storage.local.`,
    noteType: 'clip',
    category: 'clips',
    tags: ['ai', 'riset', 'web-dev'],
    color: 'blue',
    isPinned: true,
    isFavorite: false,
    isArchived: false,
    isDeleted: false,
    createdAt: Date.now() - 3600000 * 18,
    updatedAt: Date.now() - 3600000 * 2,
    clippedUrl: 'https://developer.chrome.com/docs/extensions/mv3/',
    clippedTitle: 'Chrome Extension Manifest V3 Developer Guide',
    clippedFavicon: '🌐',
  },
  {
    id: 'note-3',
    title: '✅ Daftar Tugas Sprint & Rilis Ekstensi',
    content: 'Checklist persiapan rilis ekstensi ke Chrome Web Store:',
    noteType: 'todo',
    category: 'work',
    tags: ['todo', 'sprint', 'checklist'],
    color: 'emerald',
    isPinned: false,
    isFavorite: true,
    isArchived: false,
    isDeleted: false,
    createdAt: Date.now() - 3600000 * 12,
    updatedAt: Date.now() - 3600000 * 1,
    todoItems: [
      { id: 'td-1', text: 'Uji popup view pada resolusi 380px x 560px', completed: true },
      { id: 'td-2', text: 'Cek integrasi Chrome Sidepanel API Manifest V3', completed: true },
      { id: 'td-3', text: 'Validasi contextMenus web clipper saat highlight teks', completed: true },
      { id: 'td-4', text: 'Buat icon 16x16, 48x48, dan 128x128 beresolusi tajam', completed: false },
      { id: 'td-5', text: 'Test export file .zip & load unpacked di chrome://extensions', completed: false },
    ],
  },
  {
    id: 'note-4',
    title: '💻 Snippet Kode: Chrome Storage Sync Helper',
    content: `// Helper ringkas untuk simpan dan ambil catatan dari Chrome Storage
async function saveNoteToChromeStorage(note) {
  const { notes = [] } = await chrome.storage.local.get(['notes']);
  const updatedNotes = [note, ...notes.filter(n => n.id !== note.id)];
  await chrome.storage.local.set({ notes: updatedNotes });
  console.log('Catatan berhasil disimpan ke storage lokal Chrome!');
}`,
    noteType: 'code',
    category: 'learning',
    tags: ['javascript', 'chrome-api', 'snippets'],
    color: 'purple',
    isPinned: false,
    isFavorite: false,
    isArchived: false,
    isDeleted: false,
    createdAt: Date.now() - 3600000 * 8,
    updatedAt: Date.now() - 3600000 * 3,
    codeLanguage: 'javascript',
  },
  {
    id: 'note-5',
    title: '🎙️ Catatan Suara: Ide Fitur Smart Tags AI',
    content: `Hasil transkripsi memo suara:
"Bagus jika pengguna bisa sekali klik 'Auto-Tag' lalu AI langsung menganalisis teks catatan dan menyematkan tag serta merapikan struktur paragrafnya."`,
    noteType: 'voice',
    category: 'ideas',
    tags: ['voice-memo', 'ide-ai', 'brainstorm'],
    color: 'rose',
    isPinned: false,
    isFavorite: false,
    isArchived: false,
    isDeleted: false,
    createdAt: Date.now() - 3600000 * 5,
    updatedAt: Date.now() - 3600000 * 5,
    voiceDurationSeconds: 14,
  },
];
