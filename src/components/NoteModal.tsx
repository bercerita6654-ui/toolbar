import React, { useState, useEffect } from 'react';
import { Note, NoteColor, NoteType } from '../types/note';
import { RichTextEditor } from './RichTextEditor';
import { ReminderPicker } from './ReminderPicker';
import { processNoteWithAi, AiAction } from '../services/aiNoteService';
import { 
  X, 
  Check, 
  Sparkles, 
  Tag, 
  Folder, 
  Pin, 
  Globe, 
  Mic, 
  Bot, 
  Loader2,
  CheckSquare,
  FileText,
  Bell
} from 'lucide-react';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note?: Note | null;
  defaultReminderAt?: number | null;
  onSave: (noteData: Partial<Note>) => void;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  onOpenVoiceModal: () => void;
}

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  note,
  defaultReminderAt,
  onSave,
  onShowToast,
  onOpenVoiceModal,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('ideas');
  const [color, setColor] = useState<NoteColor>('amber');
  const [tagsInput, setTagsInput] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [reminderAt, setReminderAt] = useState<number | null>(null);
  const [noteType, setNoteType] = useState<NoteType>('standard');
  const [clippedUrl, setClippedUrl] = useState('');
  const [clippedTitle, setClippedTitle] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setCategory(note.category || 'ideas');
      setColor(note.color || 'amber');
      setTagsInput(note.tags ? note.tags.join(', ') : '');
      setIsPinned(Boolean(note.isPinned));
      setReminderAt(note.reminderAt || null);
      setNoteType(note.noteType || 'standard');
      setClippedUrl(note.clippedUrl || '');
      setClippedTitle(note.clippedTitle || '');
    } else {
      setTitle('');
      setContent('');
      setCategory('ideas');
      setColor('amber');
      setTagsInput('');
      setIsPinned(false);
      setReminderAt(defaultReminderAt || null);
      setNoteType('standard');
      setClippedUrl('');
      setClippedTitle('');
    }
  }, [note, defaultReminderAt, isOpen]);

  if (!isOpen) return null;

  const handleAiAction = async (action: AiAction) => {
    const rawText = content.replace(/<[^>]*>/g, '').trim();
    if (!rawText && !title.trim()) {
      onShowToast('Tulis isi catatan terlebih dahulu untuk dianalisis oleh AI.', 'info');
      return;
    }

    setIsAiLoading(true);
    setShowAiMenu(false);
    onShowToast('Sedang memproses catatan dengan Gemini AI...', 'info');

    try {
      const res = await processNoteWithAi({
        action,
        title,
        content: rawText,
        language: 'id',
      });

      if (res.success) {
        if (action === 'tags_and_title' && res.data) {
          if (res.data.title && !title) setTitle(res.data.title);
          if (res.data.tags && res.data.tags.length > 0) {
            setTagsInput(res.data.tags.join(', '));
          }
          onShowToast('Judul dan tag otomatis berhasil dibuat!', 'success');
        } else if (res.text) {
          if (action === 'summarize') {
            setContent((prev) => `${prev}<blockquote><strong>📌 Ringkasan AI:</strong><br>${res.text}</blockquote>`);
          } else if (action === 'action_items') {
            setContent((prev) => `${prev}<h3>📋 Action Items (Tugas):</h3>${res.text?.replace(/\n/g, '<br>')}`);
          } else if (action === 'polish') {
            setContent(res.text.replace(/\n\n/g, '<br><br>'));
          } else if (action === 'expand_ideas') {
            setContent((prev) => `${prev}<h3>💡 Pengembangan Ide:</h3>${res.text?.replace(/\n/g, '<br>')}`);
          }
          onShowToast('AI berhasil memproses catatan!', 'success');
        }
      } else {
        throw new Error(res.error || 'Gagal memproses dengan AI');
      }
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Gagal menggunakan fitur AI', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) {
      onShowToast('Harap isi judul atau konten catatan!', 'info');
      return;
    }

    const tagsArray = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    onSave({
      ...(note?.id ? { id: note.id } : {}),
      title: title.trim() || 'Catatan Tanpa Judul',
      content,
      category,
      color,
      tags: tagsArray,
      isPinned,
      reminderAt,
      isReminderDismissed: false,
      noteType,
      clippedUrl: clippedUrl.trim() || undefined,
      clippedTitle: clippedTitle.trim() || undefined,
    });

    onClose();
    onShowToast('Catatan berhasil disimpan! ✨', 'success');
  };

  const colors: NoteColor[] = ['amber', 'emerald', 'blue', 'purple', 'rose', 'slate'];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📝</span>
            <h3 className="font-display font-bold text-base text-slate-900 tracking-tight">
              {note?.id ? 'Edit Catatan' : 'Buat Catatan Baru'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Reminder Picker Trigger */}
            <ReminderPicker
              reminderAt={reminderAt}
              onChangeReminder={(timestamp) => setReminderAt(timestamp)}
            />

            {/* AI Assistant dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAiMenu(!showAiMenu)}
                disabled={isAiLoading}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
                <span>Asisten AI</span>
              </button>

              {showAiMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-40 text-xs">
                  <button
                    type="button"
                    onClick={() => handleAiAction('summarize')}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-100 text-slate-800 flex items-center gap-2"
                  >
                    <span>📌 Ringkas Catatan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAiAction('action_items')}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-100 text-slate-800 flex items-center gap-2"
                  >
                    <span>📋 Ekstrak To-Do / Action Items</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAiAction('polish')}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-100 text-slate-800 flex items-center gap-2"
                  >
                    <span>✨ Sempurnakan Tata Bahasa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAiAction('tags_and_title')}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-100 text-slate-800 flex items-center gap-2"
                  >
                    <span>🏷️ Buat Judul & Tag Otomatis</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAiAction('expand_ideas')}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-100 text-slate-800 flex items-center gap-2"
                  >
                    <span>💡 Kembangkan Ide</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Title Input */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul Catatan..."
              className="w-full bg-slate-50 border border-slate-300 focus:border-sky-500 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none transition-colors"
              autoFocus
            />
          </div>

          {/* Rich Text Editor */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Isi Catatan (Format Teks Kaya / Rich Text):
            </label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Tulis catatan, buat list, atur tebal miring, dan sisipkan hyperlink..."
              minHeight="220px"
            />
          </div>

          {/* Web Clip Fields */}
          {clippedUrl && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-sky-800 font-semibold">
                <Globe className="w-3.5 h-3.5" /> Sumber Kliping Web:
              </div>
              <input
                type="text"
                value={clippedUrl}
                onChange={(e) => setClippedUrl(e.target.value)}
                placeholder="URL Kliping..."
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-sky-700 outline-none"
              />
            </div>
          )}

          {/* Metadata Row: Category, Tags, Colors, Pin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
            {/* Category & Tags */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1 flex items-center gap-1 font-medium">
                  <Folder className="w-3.5 h-3.5 text-amber-500" /> Kategori:
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none"
                >
                  <option value="ideas">💡 Ide & Proyek</option>
                  <option value="work">💼 Pekerjaan & Kantor</option>
                  <option value="learning">📚 Belajar & Riset</option>
                  <option value="personal">👤 Pribadi & Harian</option>
                  <option value="clips">🌐 Kliping Web</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1 flex items-center gap-1 font-medium">
                  <Tag className="w-3.5 h-3.5 text-sky-600" /> Tag (pisahkan koma):
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="misal: meeting, sprint, chrome"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-sky-500 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none"
                />
              </div>
            </div>

            {/* Colors & Pin */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">Pilihan Warna Aksen:</label>
                <div className="flex items-center gap-2 pt-1">
                  {colors.map((c) => {
                    const bgClass: Record<NoteColor, string> = {
                      amber: 'bg-amber-500',
                      emerald: 'bg-emerald-500',
                      blue: 'bg-sky-500',
                      purple: 'bg-purple-500',
                      rose: 'bg-rose-500',
                      slate: 'bg-slate-400',
                      default: 'bg-slate-400',
                    };
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full ${bgClass[c]} transition-transform ${
                          color === c ? 'scale-125 ring-2 ring-slate-800 ring-offset-1 ring-offset-white' : 'opacity-70 hover:opacity-100'
                        }`}
                        title={c}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="rounded border-slate-300 bg-white text-sky-600 focus:ring-0"
                  />
                  <Pin className="w-3.5 h-3.5 text-amber-500" />
                  <span>Sematkan catatan ini di posisi paling atas</span>
                </label>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onOpenVoiceModal}
              className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1.5 font-medium px-2 py-1 rounded hover:bg-rose-50"
            >
              <Mic className="w-3.5 h-3.5" />
              Rekam Memo Suara
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Simpan Catatan
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
