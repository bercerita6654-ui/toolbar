import React, { useState } from 'react';
import { getExtensionFilesList, generateAndDownloadExtensionZip } from '../services/extensionPackage';
import { ExtensionFileItem } from '../types/note';
import { 
  Download, 
  FileCode, 
  Copy, 
  Check, 
  FolderArchive, 
  ExternalLink, 
  HelpCircle,
  Sparkles,
  Layers
} from 'lucide-react';

interface ExtensionBuilderViewProps {
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const ExtensionBuilderView: React.FC<ExtensionBuilderViewProps> = ({
  onShowToast,
}) => {
  const files: ExtensionFileItem[] = getExtensionFilesList();
  const [selectedFileName, setSelectedFileName] = useState<string>(files[0]?.name || 'manifest.json');
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const currentFile = files.find((f) => f.name === selectedFileName) || files[0];

  const handleCopyCode = () => {
    if (currentFile) {
      navigator.clipboard.writeText(currentFile.content);
      setCopied(true);
      onShowToast(`Kode '${currentFile.name}' berhasil disalin ke papan klip!`, 'info');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    onShowToast('Menyiapkan paket ZIP Chrome Extension...', 'info');
    try {
      await generateAndDownloadExtensionZip();
      onShowToast('🎉 Berhasil mengunduh quicknotes-chrome-extension-v3.zip!', 'success');
    } catch (err: any) {
      console.error(err);
      onShowToast('Gagal membuat file ZIP ekstensi', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-50 via-white to-indigo-50 border border-sky-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sky-700 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Paket Siap Pasang di Google Chrome</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Source Code Ekstensi Chrome Manifest V3
          </h1>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            Semua file di bawah ini adalah file ekstensi Google Chrome asli. Anda dapat melihat, menyalin, atau mengunduh seluruh folder sebagai file <strong>.ZIP</strong> untuk langsung dipasang melalui menu <code>chrome://extensions</code>.
          </p>
        </div>

        <button
          onClick={handleDownloadZip}
          disabled={isDownloading}
          className="px-5 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>{isDownloading ? 'Membuat ZIP...' : 'Unduh Paket Ekstensi (.ZIP)'}</span>
        </button>
      </div>

      {/* Code Inspector & File List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row min-h-[500px]">
        {/* File Navigator Sidebar */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-3 space-y-1 shrink-0">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 py-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-600" />
            <span>Struktur Berkas Ekstensi</span>
          </div>

          {files.map((file) => (
            <button
              key={file.name}
              onClick={() => setSelectedFileName(file.name)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors ${
                selectedFileName === file.name
                  ? 'bg-sky-100 text-sky-800 border border-sky-300 font-semibold'
                  : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">{file.name}</span>
            </button>
          ))}
        </div>

        {/* Code Content Viewer */}
        <div className="flex-1 bg-white flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-mono text-xs text-slate-900 font-semibold">{currentFile.name}</span>
              <span className="text-[11px] text-slate-500 ml-2 hidden sm:inline">({currentFile.description})</span>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin Kode'}</span>
            </button>
          </div>

          <div className="flex-1 p-4 overflow-auto bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed">
            <pre className="whitespace-pre-wrap">{currentFile.content}</pre>
          </div>
        </div>
      </div>

      {/* Step-by-Step Chrome Installation Guide */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-sky-600" />
          <span>Panduan Memasang Ekstensi di Google Chrome (Load Unpacked)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-700">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-xs">
              1
            </div>
            <h3 className="font-semibold text-slate-900">Unduh & Ekstrak ZIP</h3>
            <p className="text-slate-600 leading-relaxed">
              Klik tombol <strong>"Unduh Paket Ekstensi (.ZIP)"</strong> di atas, lalu ekstrak ke dalam sebuah folder di laptop Anda (misal: <code>quicknotes-extension</code>).
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-xs">
              2
            </div>
            <h3 className="font-semibold text-slate-900">Buka chrome://extensions</h3>
            <p className="text-slate-600 leading-relaxed">
              Buka Google Chrome, ketik <code>chrome://extensions</code> di URL bar, lalu aktifkan toggle <strong>"Developer Mode"</strong> di sudut kanan atas.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-xs">
              3
            </div>
            <h3 className="font-semibold text-slate-900">Muat yang Belum Dibongkar</h3>
            <p className="text-slate-600 leading-relaxed">
              Klik tombol <strong>"Load Unpacked" (Muat yang belum dibongkar)</strong>, lalu pilih folder ekstrak tadi. Selesai! Ikon QuickNotes langsung aktif di toolbar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
