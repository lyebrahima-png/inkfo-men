// Backend Gemini TaniHubungan. Jalankan dengan: npm install && npm start
const express = require('express');
const path = require('path');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  if (path.extname(req.path).toLowerCase() === '.php') return res.sendStatus(404);
  next();
});
app.use(express.static(__dirname));
app.post('/api/chat', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'API Key belum dipasang. Isi GEMINI_API_KEY di file .env.' });
    const messages = req.body && req.body.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 24) return res.status(400).json({ error: 'Format percakapan tidak valid.' });
    const contents = messages.map(m => {
      const role = m && m.role === 'model' ? 'model' : 'user';
      const text = Array.isArray(m && m.parts) ? m.parts.map(p => String(p && p.text || '')).join(' ').slice(0, 2000) : '';
      return { role, parts: [{ text }] };
    }).filter(m => m.parts[0].text.trim());
    if (!contents.length || contents[contents.length - 1].role !== 'user') return res.status(400).json({ error: 'Pesan terakhir harus berasal dari pengguna.' });
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'Kamu adalah Asisten AI TaniHubungan, pendamping pertanian yang ramah dan praktis. Jawab dalam bahasa Indonesia yang mudah dipahami. Bantu topik budidaya tanaman, pemupukan, hama dan penyakit, panen, pascapanen, harga dan pemasaran hasil pertanian. Berikan langkah yang jelas. Jangan mengarang harga pasar, data cuaca, atau diagnosis pasti. Untuk pestisida, tekankan mengikuti label resmi, dosis terdaftar, APD, dan konsultasi penyuluh. Jika informasi kurang, tanyakan detail tanaman, lokasi umum, umur tanaman, dan gejalanya. Jelaskan bahwa saran AI bukan pengganti penyuluh atau ahli.' }] },
        contents,
        generationConfig: { temperature: 0.65, maxOutputTokens: 900 }
      })
    });
    const result = await upstream.json();
    if (!upstream.ok) {
      const message = result && result.error && result.error.message ? result.error.message : 'Permintaan ke Gemini gagal.';
      return res.status(upstream.status === 429 ? 429 : 502).json({ error: message });
    }
    const reply = (result.candidates || []).flatMap(c => c.content && c.content.parts || []).map(p => p.text || '').join('').trim();
    if (!reply) return res.status(502).json({ error: 'Gemini tidak memberikan jawaban. Coba kirim pertanyaan lagi.' });
    res.json({ reply });
  } catch (error) {
    console.error('Gemini API error:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan pada server AI.' });
  }
});
app.listen(PORT, () => console.log(`TaniHubungan berjalan di http://localhost:${PORT}`));
