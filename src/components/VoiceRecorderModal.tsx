import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Check, X, Sparkles, Volume2 } from 'lucide-react';

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveVoiceNote: (text: string, durationSeconds: number) => void;
}

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({
  isOpen,
  onClose,
  onSaveVoiceNote,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [duration, setDuration] = useState(0);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      handleStop();
      setTranscript('');
      setDuration(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'id-ID';

    recognition.onresult = (event: any) => {
      let current = '';
      for (let i = 0; i < event.results.length; i++) {
        current += event.results[i][0].transcript + ' ';
      }
      setTranscript(current.trim());
    };

    recognition.onerror = (err: any) => {
      console.error('Speech recognition error:', err);
      setIsRecording(false);
    };

    recognition.onend = () => {
      if (isRecording) {
        try {
          recognition.start();
        } catch {
          // ignore
        }
      }
    };

    recognitionRef.current = recognition;
  }, [isRecording]);

  const handleStart = () => {
    setTranscript('');
    setDuration(0);
    setIsRecording(true);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
      }
    }

    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  };

  const handleStop = () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const handleSave = () => {
    handleStop();
    if (transcript.trim()) {
      onSaveVoiceNote(transcript.trim(), duration);
    }
    onClose();
  };

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 text-center">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2 text-rose-600 font-semibold text-sm">
            <Mic className="w-4 h-4" />
            <span>Perekam Memo Suara Instan</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mic Visualizer Animation */}
        <div className="py-8 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            {isRecording && (
              <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
            )}
            <button
              onClick={isRecording ? handleStop : handleStart}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer ${
                isRecording
                  ? 'bg-rose-600 text-white hover:bg-rose-500 ring-4 ring-rose-300'
                  : 'bg-rose-50 text-rose-600 hover:bg-rose-100 ring-2 ring-rose-200'
              }`}
            >
              {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8 text-rose-600" />}
            </button>
          </div>

          <div className="font-mono text-lg font-bold text-slate-800">
            {formatTime(duration)}
          </div>

          <span className="text-xs text-slate-500">
            {isRecording ? 'Sedang mendengarkan... Ucapkan catatan Anda.' : 'Klik tombol mikrofon untuk mulai merekam.'}
          </span>
        </div>

        {/* Live Transcript Area */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left min-h-[100px] max-h-40 overflow-y-auto mb-4">
          <div className="text-[10px] text-slate-500 mb-1 font-mono uppercase tracking-wider flex items-center gap-1 font-semibold">
            <Sparkles className="w-3 h-3 text-sky-600" /> Hasil Transkripsi Teks:
          </div>
          <p className="text-xs text-slate-800 leading-relaxed italic">
            {transcript || (isRecording ? 'Mendengarkan ucapan...' : 'Belum ada suara terekam.')}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!transcript.trim()}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            Simpan ke Catatan
          </button>
        </div>
      </div>
    </div>
  );
};
