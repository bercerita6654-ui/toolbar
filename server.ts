import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy init Gemini client
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// AI Note Operations API Endpoint
app.post('/api/ai/process-note', async (req, res) => {
  try {
    const { action, title, content, language = 'id' } = req.body;
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(500).json({
        error: 'Gemini API key is not configured. Silakan periksa pengaturan Secrets.',
      });
    }

    let prompt = '';
    const langInstruction = language === 'id' ? 'Gunakan Bahasa Indonesia yang rapi, ringkas, dan jelas.' : 'Use clear, concise English.';

    switch (action) {
      case 'summarize':
        prompt = `Ringkas catatan berikut dalam 2-4 kalimat padat poin utama yang mudah dipahami.\n${langInstruction}\n\nJudul: ${title || 'Tanpa Judul'}\n\nIsi Catatan:\n${content}`;
        break;

      case 'action_items':
        prompt = `Ekstrak daftar tugas / checklist tindakan nyata (action items) dari catatan berikut dalam format bullet list markdown (- [ ] tugas).\n${langInstruction}\n\nCatatan:\n${content}`;
        break;

      case 'polish':
        prompt = `Perbaiki tata bahasa, kerapian struktur, ejaan, dan kejelasan tulisan berikut tanpa mengubah makna inti aslinya. Sajikan dalam format Markdown yang indah dengan paragraf dan bullet point jika relevan.\n${langInstruction}\n\nTulisan:\n${content}`;
        break;

      case 'tags_and_title':
        prompt = `Analisis catatan berikut dan berikan:
1. Rekomendasi Judul Singkat (maksimal 6 kata)
2. 3-5 Kategori/Tag Relevan (misal: #kerja, #ide, #belajar, #meeting, #teknologi)
3. Ringkasan 1 kalimat

Format respon harus JSON murni:
{
  "title": "...",
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "..."
}

Catatan:
${content}`;
        break;

      case 'expand_ideas':
        prompt = `Bantu kembangkan ide catatan singkat berikut dengan 3-5 poin saran atau tindak lanjut relevan secara terstruktur dan kreatif.\n${langInstruction}\n\nCatatan dasar:\n${content}`;
        break;

      default:
        prompt = `Perbaiki dan sempurnakan catatan berikut secara terstruktur:\n${content}`;
        break;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: action === 'tags_and_title' ? { responseMimeType: 'application/json' } : undefined,
    });

    const resultText = response.text || '';

    if (action === 'tags_and_title') {
      try {
        const parsed = JSON.parse(resultText);
        return res.json({ success: true, data: parsed });
      } catch {
        return res.json({ success: true, text: resultText });
      }
    }

    return res.json({ success: true, text: resultText });
  } catch (error: any) {
    console.error('AI Processing Error:', error);
    return res.status(500).json({
      error: error?.message || 'Gagal memproses catatan dengan AI',
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server ready on http://localhost:${PORT}`);
  });
}

startServer();
