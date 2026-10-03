import React, { useState } from 'react';
import { Note, NoteColor } from '../types/note';
import { RichTextEditor } from './RichTextEditor';
import { ReminderPicker } from './ReminderPicker';
import { formatReminderText } from '../services/reminderService';
import { 
  Pin, 
  Trash2, 
  Copy, 
  Check, 
  Globe, 
  ExternalLink, 
  Sparkles, 
  Search, 
  Plus, 
  BookOpen, 
  CheckCircle2, 
  FileText,
  Save,
  Bell
} from 'lucide-react';

interface ExtensionSidepanelViewProps {
  notes: Note[];
  onSaveNote: (note: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onTogglePin: (id: string) => void;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const ExtensionSidepanelView: React.FC<ExtensionSidepanelViewProps> = ({
  notes,
  onSaveNote,
  onDeleteNote,
  onTogglePin,
  onShowToast,
}) => {
  const [activeSideTab, setActiveSideTab] = useState<'editor' | 'list'>('editor');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [sideTitle, setSideTitle] = useState('');
  const [sideContent, setSideContent] = useState('');
  const [sideCategory, setSideCategory] = useState('learning');
  const [sideColor, setSideColor] = useState<NoteColor>('blue');
  const [sideReminderAt, setSideReminderAt] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  const sampleArticleTitle = 'Arsitektur Web Modern 2026: Manifest V3 & AI Native Extensions';
  const sampleArticleUrl = 'https://developer.chrome.com/docs/extensions/mv3/side-panel/';

  const handleClipCurrentArticle = () => {
    setSideTitle(`Kliping: ${sampleArticleTitle}`);
    setSideContent(`<blockquote><strong>Kutipan dari Halaman Web:</strong><br><em>"Side Panel API pada Google Chrome Manifest V3 memungkinkan pengguna mempertahankan alur kerja multitasking tanpa harus berpindah tab."</em></blockquote><p>URL Sumber: <a href="${sampleArticleUrl}" target="_blank" class="text-sky-600 underline">${sampleArticleUrl}</a></p>`);
    setActiveSideTab('editor');
    onShowToast('Teks artikel berhasil disalin ke editor Side Panel! 📌', 'success');
  };

  const handleSaveSideNote = () => {
    const cleanContent = sideContent.replace(/<[^>]*>/g, '').trim();
    const cleanTitle = sideTitle.trim();

    // If both title and content are truly empty, give prompt
    if (!cleanTitle && !cleanContent) {
      onShowToast('Tulis judul atau isi catatan terlebih dahulu sebelum menyimpan.', 'error');
      return;
    }

    // Auto-derive title if not given
    const finalTitle = cleanTitle || (cleanContent.length > 30 ? cleanContent.substring(0, 30) + '...' : cleanContent) || 'Catatan Side Panel';

    onSaveNote({
      id: editingNoteId || undefined,
      title: finalTitle,
      content: sideContent || `<p>${cleanTitle}</p>`,
      category: sideCategory,
      color: sideColor,
      tags: ['sidepanel', 'web-clip'],
      noteType: 'clip',
      reminderAt: sideReminderAt,
      isReminderDismissed: false,
      clippedUrl: sampleArticleUrl,
      clippedTitle: sampleArticleTitle,
    });

    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 2500);

    onShowToast(editingNoteId ? 'Catatan berhasil diperbarui! 💾' : 'Catatan berhasil disimpan ke Side Panel & Cloud! 🎉', 'success');

    // Reset editor
    setEditingNoteId(null);
    setSideTitle('');
    setSideContent('');
    setSideReminderAt(null);
  };

  const handleEditExistingNote = (note: Note) => {
    setEditingNoteId(note.id);
    setSideTitle(note.title);
    setSideContent(note.content);
    setSideCategory(note.category || 'learning');
    setSideColor(note.color || 'blue');
    setSideReminderAt(note.reminderAt || null);
    setActiveSideTab('editor');
  };

  const handleCreateNew = () => {
    setEditingNoteId(null);
    setSideTitle('');
    setSideContent('');
    setSideReminderAt(null);
    setActiveSideTab('editor');
  };

  const filteredNotes = notes
    .filter(
      (n) =>
        !n.isDeleted &&
        (n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.content.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
        return a.isPinned ? -1 : 1;
      }
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-4">
      {/* Informational Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-700 shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 font-bold text-sm">
            📌
          </span>
          <div>
            <div className="font-semibold text-slate-900">Simulasi Chrome Side Panel (Manifest V3)</div>
            <div className="text-slate-500">
              Side Panel tetap terbuka di sisi kanan saat Anda membaca berbagai tab web. Catatan otomatis tersimpan ke Chrome Storage dan Cloud.
            </div>
          </div>
        </div>
        <button
          onClick={handleClipCurrentArticle}
          className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Klip Halaman Ini ke Side Panel</span>
        </button>
      </div>

      {/* Side-by-Side Browser Viewport Container */}
      <div className="bg-slate-100 border border-slate-300 rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[640px]">
        {/* Left Column: Simulated Browser Tab Web Page Content */}
        <div className="flex-1 bg-white flex flex-col border-r border-slate-300">
          {/* Chrome Omnibox Bar */}
          <div className="bg-slate-200 px-4 py-2 border-b border-slate-300 flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 mr-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 bg-white rounded-lg px-3 py-1 text-slate-800 border border-slate-300 flex items-center justify-between shadow-2xs">
              <span className="truncate">{sampleArticleUrl}</span>
              <span className="text-[10px] text-emerald-600 font-medium">🔒 HTTPS Verified</span>
            </div>
          </div>

          {/* Web Article Content */}
          <div className="p-8 max-w-2xl mx-auto space-y-4 text-slate-800 overflow-y-auto">
            <div className="flex items-center gap-2 text-xs text-sky-600 font-semibold">
              <BookOpen className="w-4 h-4" />
              <span>Dokumentasi Web Browser & Ekstensi</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {sampleArticleTitle}
            </h1>
            <p className="text-xs text-slate-500">
              Dipublikasikan 2026 · 4 menit membaca · Penulis: Chrome Dev Team
            </p>

            <div className="border-t border-slate-200 pt-4 space-y-4 text-sm leading-relaxed text-slate-700">
              <p className="p-3 bg-sky-50 border-l-4 border-sky-500 rounded-r-lg text-sky-900 text-xs">
                💡 <em>Tip: Anda dapat mengetik catatan di panel samping kanan lalu klik <strong>"Simpan ke Notes"</strong>. Catatan langsung tersimpan dan otomatis tersinkronisasi ke semua komputer!</em>
              </p>
              <p>
                Ekstensi modern kini tidak lagi hanya sekadar popup statis. Melalui <strong>Chrome Side Panel API</strong>, pengguna dapat membuka catatan permanen di sisi kanan layar dan tetap aktif mengetik saat menjelajahi materi riset.
              </p>
              <h2 className="text-base font-bold text-slate-900 pt-2">
                Kelebihan Menggunakan QuickNotes di Side Panel:
              </h2>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
                <li>Format Rich Text: Tebal, miring, garis bawah, dan hyperlink langsung tersimpan.</li>
                <li>Sinkronisasi otomatis dengan Google Drive dan Chrome Local Storage.</li>
                <li>Pembaruan real-time antar komputer dan tab secara instan.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: The Actual 380px Chrome Side Panel Frame */}
        <div className="w-full md:w-[390px] bg-slate-50 flex flex-col shrink-0 border-l border-slate-200">
          {/* Sidepanel Header */}
          <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-sky-600 flex items-center justify-center text-white text-[10px] font-bold shadow-2xs">
                📌
              </span>
              <span className="font-display font-bold text-sm text-slate-900">Side Panel QuickNotes</span>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
              <button
                onClick={handleCreateNew}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeSideTab === 'editor' && !editingNoteId ? 'bg-white text-sky-700 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                + Tulis
              </button>
              <button
                onClick={() => setActiveSideTab('list')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeSideTab === 'list' ? 'bg-white text-sky-700 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Daftar ({notes.filter((n) => !n.isDeleted).length})
              </button>
            </div>
          </div>

          {/* Success Banner if just saved */}
          {isSavedSuccess && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center gap-2 text-xs font-semibold text-emerald-800 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Catatan berhasil disimpan ke storage & cloud!</span>
            </div>
          )}

          {/* Sidepanel Body */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
            {activeSideTab === 'editor' ? (
              <div className="space-y-3">
                {editingNoteId && (
                  <div className="flex items-center justify-between text-xs bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-lg">
                    <span>Sedang mengedit catatan</span>
                    <button
                      onClick={handleCreateNew}
                      className="text-amber-900 font-bold underline hover:text-amber-700"
                    >
                      Batal (Buat Baru)
                    </button>
                  </div>
                )}

                <input
                  type="text"
                  value={sideTitle}
                  onChange={(e) => setSideTitle(e.target.value)}
                  placeholder="Judul catatan Side Panel (opsional)..."
                  className="w-full bg-white border border-slate-300 focus:border-sky-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none shadow-2xs"
                />

                <RichTextEditor
                  value={sideContent}
                  onChange={setSideContent}
                  placeholder="Tulis catatan, kutipan, atau ide sambil membaca web..."
                  minHeight="180px"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={sideCategory}
                      onChange={(e) => setSideCategory(e.target.value)}
                      className="bg-white border border-slate-300 text-xs text-slate-800 rounded-lg px-2.5 py-1.5 outline-none shadow-2xs"
                    >
                      <option value="learning">📚 Belajar & Riset</option>
                      <option value="ideas">💡 Ide Proyek</option>
                      <option value="work">💼 Pekerjaan</option>
                      <option value="clips">🌐 Kliping</option>
                    </select>

                    <ReminderPicker
                      reminderAt={sideReminderAt}
                      onChangeReminder={(timestamp) => setSideReminderAt(timestamp)}
                    />
                  </div>

                  <button
                    onClick={handleSaveSideNote}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingNoteId ? 'Perbarui Catatan' : 'Simpan ke Notes'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari catatan..."
                    className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-2 py-1 text-xs text-slate-800 outline-none shadow-2xs"
                  />
                </div>

                {filteredNotes.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Belum ada catatan. Klik "+ Tulis" untuk mulai mencatat.
                  </div>
                ) : (
                  filteredNotes.map((note) => {
                    const reminderInfo = note.reminderAt ? formatReminderText(note.reminderAt) : null;
                    return (
                      <div
                        key={note.id}
                        onClick={() => handleEditExistingNote(note)}
                        className="p-3 bg-white border border-slate-200 rounded-xl hover:border-sky-400 transition-all space-y-1.5 text-xs shadow-2xs cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 truncate group-hover:text-sky-600">
                            {note.isPinned && '📌 '}{note.title || 'Catatan Tanpa Judul'}
                          </span>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                const cleanText = note.content.replace(/<[^>]*>/g, '');
                                navigator.clipboard.writeText(`${note.title}\n\n${cleanText}`);
                                setCopiedId(note.id);
                                onShowToast('Disalin ke clipboard!', 'info');
                                setTimeout(() => setCopiedId(null), 1500);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-800"
                              title="Salin"
                            >
                              {copiedId === note.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => onDeleteNote(note.id)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Reminder Badge if active */}
                        {reminderInfo && (
                          <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            reminderInfo.isPast ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            <Bell className="w-2.5 h-2.5 fill-current" />
                            <span>{reminderInfo.label}</span>
                          </div>
                        )}

                        <div
                          className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: note.content }}
                        />
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                          <span className="text-slate-600 font-medium">#{note.category}</span>
                          <span>{new Date(note.updatedAt).toLocaleDateString('id-ID')}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
