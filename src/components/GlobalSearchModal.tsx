import React, { useState, useEffect, useRef } from 'react';
import { Note } from '../types/note';
import { 
  Search, 
  FileText, 
  Tag, 
  Globe, 
  CheckSquare, 
  ArrowRight, 
  X, 
  Pin,
  Sparkles,
  Command,
  CornerDownLeft
} from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onSelectNote: (noteId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  notes,
  onSelectNote,
}) => {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'title' | 'content' | 'tags' | 'clips'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const stripHtml = (html: string) => {
    return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const filteredNotes = notes.filter((n) => {
    if (n.isDeleted) return false;
    if (!query.trim()) return true;

    const q = query.toLowerCase().trim();
    const cleanContent = stripHtml(n.content).toLowerCase();
    const title = (n.title || '').toLowerCase();
    const tags = (n.tags || []).map((t) => t.toLowerCase());
    const clippedTitle = (n.clippedTitle || '').toLowerCase();
    const clippedUrl = (n.clippedUrl || '').toLowerCase();

    if (scope === 'title') {
      return title.includes(q);
    } else if (scope === 'content') {
      return cleanContent.includes(q);
    } else if (scope === 'tags') {
      return tags.some((t) => t.includes(q));
    } else if (scope === 'clips') {
      return clippedTitle.includes(q) || clippedUrl.includes(q) || n.noteType === 'clip';
    }

    return (
      title.includes(q) ||
      cleanContent.includes(q) ||
      tags.some((t) => t.includes(q)) ||
      clippedTitle.includes(q) ||
      clippedUrl.includes(q)
    );
  });

  const getMatchSnippet = (content: string, q: string) => {
    const text = stripHtml(content);
    if (!q) return text.slice(0, 120) + (text.length > 120 ? '...' : '');

    const lower = text.toLowerCase();
    const index = lower.indexOf(q.toLowerCase());
    if (index === -1) {
      return text.slice(0, 120) + (text.length > 120 ? '...' : '');
    }

    const start = Math.max(0, index - 40);
    const end = Math.min(text.length, index + q.length + 60);
    let snippet = text.slice(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    return snippet;
  };

  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <mark key={i} className="bg-amber-200 text-amber-900 font-semibold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filteredNotes.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredNotes.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredNotes[selectedIndex]) {
        onSelectNote(filteredNotes[selectedIndex].id);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 p-4">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
          <Search className="w-5 h-5 text-sky-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Cari teks lengkap, judul, kata di dalam catatan, atau #tag..."
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono shadow-2xs">
            <span>ESC</span>
          </div>
        </div>

        {/* Search Scope Filter Buttons */}
        <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center justify-between text-xs overflow-x-auto gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-500 mr-1">Cari Di:</span>
            {[
              { id: 'all', label: 'Semua Bidang' },
              { id: 'title', label: 'Judul Saja' },
              { id: 'content', label: 'Isi Teks' },
              { id: 'tags', label: 'Tag (#)' },
              { id: 'clips', label: 'Kliping Web' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setScope(s.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  scope === s.id
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-500 font-mono whitespace-nowrap">
            {filteredNotes.length} Hasil
          </span>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 max-h-[400px] bg-slate-50/40">
          {filteredNotes.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <span className="text-3xl">🔍</span>
              <p className="text-xs font-semibold text-slate-700">Tidak ada catatan yang cocok</p>
              <p className="text-[11px] text-slate-500">
                Coba gunakan kata kunci yang lebih umum atau ubah opsi lingkup pencarian.
              </p>
            </div>
          ) : (
            filteredNotes.map((note, index) => {
              const isSelected = index === selectedIndex;
              const snippet = getMatchSnippet(note.content, query);

              return (
                <div
                  key={note.id}
                  onClick={() => {
                    onSelectNote(note.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-sky-50 border border-sky-300 shadow-2xs'
                      : 'hover:bg-white border border-transparent'
                  }`}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {note.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                      <span className="font-semibold text-xs text-slate-900 truncate">
                        {highlightMatch(note.title || 'Tanpa Judul', query)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        #{note.category}
                      </span>
                    </div>

                    {/* Matching Content Snippet */}
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {highlightMatch(snippet, query)}
                    </p>

                    {/* Matching Tags */}
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {note.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.2 rounded"
                          >
                            #{highlightMatch(tag, query)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 shrink-0 self-center">
                    <span className="text-[10px] hidden sm:inline">
                      {new Date(note.updatedAt).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                    </span>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-md bg-sky-600 text-white flex items-center justify-center text-xs shadow-2xs">
                        <CornerDownLeft className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Hotkey Hint */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 select-none">
          <div className="flex items-center gap-3">
            <span><kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 shadow-2xs">↑</kbd> <kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 shadow-2xs">↓</kbd> Navigasi</span>
            <span><kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 shadow-2xs">Enter</kbd> Buka Catatan</span>
            <span><kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 shadow-2xs">ESC</kbd> Tutup</span>
          </div>
          <span className="text-sky-600 font-semibold">QuickNotes Full-Text Engine</span>
        </div>
      </div>
    </div>
  );
};
