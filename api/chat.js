function send(response, status, body) {
  response.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(body));
}

async function resolveModel(apiKey) {
  const configuredModel = process.env.GROQ_MODEL?.trim();
  const modelResponse = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!modelResponse.ok) throw new Error('Daftar model Groq tidak dapat diakses. Periksa GROQ_API_KEY di Vercel.');
  const modelResult = await modelResponse.json();
  const availableModels = (modelResult.data || []).map((item) => item.id);
  const preferredModels = [configuredModel, 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-20b', 'qwen/qwen3-32b'].filter(Boolean);
  const model = preferredModels.find((candidate) => availableModels.includes(candidate));
  if (!model) throw new Error('Tidak ada model chat Groq yang tersedia untuk API key ini.');
  return model;
}

module.exports = async (request, response) => {
  if (request.method !== 'POST') return send(response, 405, { error: 'Method not allowed.' });
  if (!process.env.GROQ_API_KEY) return send(response, 500, { error: 'GROQ_API_KEY belum diset di environment Vercel.' });
  const { message, history = [], sources = [] } = request.body || {};
  if (!message) return send(response, 400, { error: 'Pesan wajib diisi.' });
  const sourceContext = sources.map((source) => `SUMBER RESMI AYOWEBKU: ${source.title} (${source.url})\n${source.text}`).join('\n\n');
  const context = (sourceContext || 'Data website resmi Ayowebku belum tersedia.').slice(0, 30000);
  const messages = [
    { role: 'system', content: `Kamu adalah Ayowebku Assist, customer service AI berbahasa Indonesia. Jawab dengan ramah, ringkas, dan jelas berdasarkan konteks website resmi Ayowebku saja. Jika informasi tidak ada di konteks, katakan bahwa kamu belum menemukan jawabannya dan arahkan pengguna untuk menghubungi tim Ayowebku melalui website resmi. Jangan mengarang harga, fitur, kebijakan, atau sumber.\n\nKONTEKS WEBSITE RESMI AYOWEBKU:\n${context}` },
    ...history.slice(0, -1).filter((item) => ['user', 'assistant'].includes(item.role)).map((item) => ({ role: item.role, content: item.content })).slice(-8),
    { role: 'user', content: message },
  ];
  try {
    const model = await resolveModel(process.env.GROQ_API_KEY);
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: JSON.stringify({ model, messages, temperature: 0.35, max_tokens: 700 }) });
    const result = await groqResponse.json();
    if (!groqResponse.ok) return send(response, groqResponse.status, { error: result.error?.message || 'Groq menolak permintaan.' });
    return send(response, 200, { answer: result.choices?.[0]?.message?.content || 'Belum ada jawaban.' });
  } catch (error) { return send(response, 502, { error: `Koneksi ke Groq gagal: ${error.message}` }); }
};