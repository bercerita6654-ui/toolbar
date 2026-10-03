import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  List, 
  ListOrdered, 
  Link as LinkIcon, 
  Unlink, 
  Heading1, 
  Heading2, 
  Quote, 
  Code, 
  RemoveFormatting, 
  Undo, 
  Redo,
  Check,
  X,
  Highlighter
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Mulai menulis catatan Anda di sini...',
  minHeight = '240px',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');
  const [linkText, setLinkText] = useState('');
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const isUpdatingRef = useRef(false);

  // Sync internal contentEditable with incoming `value` prop
  useEffect(() => {
    if (!editorRef.current) return;
    if (isUpdatingRef.current) return;

    let initialHtml = value;
    if (initialHtml && !initialHtml.includes('<') && !initialHtml.includes('>')) {
      initialHtml = initialHtml
        .split('\n\n')
        .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('');
    }

    if (editorRef.current.innerHTML !== initialHtml) {
      editorRef.current.innerHTML = initialHtml || '';
    }
  }, [value]);

  const handleInput = () => {
    if (!editorRef.current) return;
    isUpdatingRef.current = true;
    const html = editorRef.current.innerHTML;
    onChange(html);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 10);
  };

  const exec = (command: string, val: string | undefined = undefined) => {
    document.execCommand(command, false, val);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleInput();
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      setSavedRange(sel.getRangeAt(0));
      setLinkText(sel.toString() || '');
    }
  };

  const restoreSelection = () => {
    if (savedRange) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRange);
      }
    }
  };

  const openLinkModal = () => {
    saveSelection();
    setShowLinkModal(true);
  };

  const handleInsertLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    restoreSelection();
    let finalUrl = linkUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('mailto:')) {
      finalUrl = `https://${finalUrl}`;
    }

    if (linkText && savedRange && savedRange.collapsed) {
      const anchor = document.createElement('a');
      anchor.href = finalUrl;
      anchor.target = '_blank';
      anchor.rel = 'noreferrer';
      anchor.textContent = linkText;
      savedRange.insertNode(anchor);
    } else {
      document.execCommand('createLink', false, finalUrl);
      if (editorRef.current) {
        const links = editorRef.current.querySelectorAll('a');
        links.forEach((a) => {
          if (a.href === finalUrl) {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noreferrer');
            a.classList.add('text-sky-600', 'underline', 'hover:text-sky-700');
          }
        });
      }
    }

    setShowLinkModal(false);
    setLinkUrl('https://');
    setLinkText('');
    handleInput();
  };

  const handleRemoveLink = () => {
    exec('unlink');
  };

  const plainText = editorRef.current?.innerText || '';
  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
  const charCount = plainText.length;

  return (
    <div className="flex flex-col border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
      {/* Rich Text Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 text-slate-700 select-none">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1.5 mr-1">
          <button
            type="button"
            onClick={() => exec('undo')}
            className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded text-slate-600 transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => exec('redo')}
            className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded text-slate-600 transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Headings */}
        <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1.5 mr-1">
          <button
            type="button"
            onClick={() => exec('formatBlock', '<h1>')}
            className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded text-slate-600 transition-colors font-bold text-xs"
            title="Heading 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => exec('formatBlock', '<h2>')}
            className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded text-slate-600 transition-colors font-bold text-xs"
            title="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Basic Formats */}
        <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1.5 mr-1">
          <button
            type="button"
            onClick={() => exec('bold')}
            className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded text-slate-600 transition-colors"
            title="Tebal / Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5 font-bold" />
          </button>
          <button
            type="button"
            onClick={() => exec('italic')}
            className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded text-slate-600 transition-colors"
            title="Miring / Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5 italic" />
          </button>
          <button
            type="button"
            onClick={() => exec('underline')}
            className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded text-slate-600 transition-colors"
            title="Garis Bawah / Underline (Ctrl+U)"
          >
            <UnderlineIcon className="w-3.5 h-3.5 underline" />
          </button>
          <button
            type="button"
            onClick={() => exec('strikeThrough')}
            className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded text-slate-600 transition-colors"
            title="Coret / Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1.5 mr-1">
          <button
            type="button"
            onClick={() => exec('insertUnorderedList')}
            className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded text-slate-600 transition-colors"
            title="Daftar Berpoin / Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => exec('insertOrderedList')}
            className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded text-slate-600 transition-colors"
            title="Daftar Bernomor / Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Hyperlink Insertion */}
        <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1.5 mr-1">
          <button
            type="button"
            onClick={openLinkModal}
            className="p-1.5 hover:bg-slate-200 hover:text-sky-600 rounded text-slate-600 transition-colors flex items-center gap-1"
            title="Sisipkan Hyperlink (Ctrl+K)"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Link</span>
          </button>
          <button
            type="button"
            onClick={handleRemoveLink}
            className="p-1.5 hover:bg-slate-200 hover:text-rose-600 rounded text-slate-600 transition-colors"
            title="Hapus Link"
          >
            <Unlink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quotes, Code, Highlight, Clean */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => exec('formatBlock', '<blockquote>')}
            className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded text-slate-600 transition-colors"
            title="Kutipan / Blockquote"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => exec('formatBlock', '<pre>')}
            className="p-1.5 hover:bg-slate-200 hover:text-slate-900 rounded text-slate-600 transition-colors"
            title="Blok Kode / Code Snippet"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => exec('hiliteColor', '#fef08a')}
            className="p-1.5 hover:bg-slate-200 hover:text-amber-600 rounded text-slate-600 transition-colors"
            title="Sorot Kuning / Highlighter"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-500" />
          </button>
          <button
            type="button"
            onClick={() => exec('removeFormat')}
            className="p-1.5 hover:bg-slate-200 hover:text-rose-600 rounded text-slate-600 transition-colors"
            title="Bersihkan Format"
          >
            <RemoveFormatting className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Content Box */}
      <div className="relative flex-1 bg-white p-4">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          className="outline-none text-slate-900 text-sm leading-relaxed min-h-[180px] max-h-[450px] overflow-y-auto focus:ring-0 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:text-slate-900 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:text-slate-800 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-sky-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:my-2 [&_pre]:bg-slate-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:font-mono [&_pre]:text-xs [&_pre]:my-2 [&_pre]:text-slate-800 [&_a]:text-sky-600 [&_a]:underline"
          style={{ minHeight }}
          data-placeholder={placeholder}
        />
      </div>

      {/* Footer Word & Character Counter */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500">
        <div className="flex items-center gap-3">
          <span>{wordCount} kata</span>
          <span aria-hidden="true">·</span>
          <span>{charCount} karakter</span>
        </div>
        <span className="text-[10px] text-slate-400">Rich Text HTML Disimpan Otomatis</span>
      </div>

      {/* Insert Link Modal */}
      {showLinkModal && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-30 p-4">
          <form
            onSubmit={handleInsertLink}
            className="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-4 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-sky-600" />
                Sisipkan Hyperlink
              </span>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 mb-1 font-medium">Teks Tautan (Opsional)</label>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="misal: Dokumentasi Resmi"
                className="w-full bg-slate-50 border border-slate-300 focus:border-sky-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 mb-1 font-medium">URL Alamat Web</label>
              <input
                type="url"
                required
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-slate-50 border border-slate-300 focus:border-sky-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg flex items-center gap-1 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                Sisipkan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
