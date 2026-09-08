function send(response, status, body) {
  response.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(body));
}

function cleanHtml(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<svg[\s\S]*?<\/svg>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&#39;|&apos;/gi, "'").replace(/&quot;/gi, '"').replace(/\s+/g, ' ').trim();
}

const AYOWEBKU_URL = 'https://ayowebku.vercel.app/';

module.exports = async (request, response) => {
  if (request.method !== 'POST') return send(response, 405, { error: 'Method not allowed.' });
  try {
    const { url = AYOWEBKU_URL } = request.body || {};
    const parsed = new URL(url);
    if (parsed.hostname !== 'ayowebku.vercel.app') throw new Error('Sumber hanya boleh berasal dari website Ayowebku.');
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Gunakan URL http atau https.');
    const pageResponse = await fetch(parsed, { headers: { 'User-Agent': 'AyowebkuAssist/1.0 official knowledge reader' } });
    if (!pageResponse.ok) throw new Error(`Halaman merespons dengan status ${pageResponse.status}.`);
    const html = await pageResponse.text();
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || parsed.hostname;
    const text = cleanHtml(html).slice(0, 14000);
    if (text.length < 40) throw new Error('Teks yang bisa dibaca dari halaman terlalu sedikit.');
    return send(response, 200, { source: { url: parsed.href, title: cleanHtml(title).slice(0, 100), text } });
  } catch (error) { return send(response, 400, { error: error.message || 'URL tidak dapat dibaca.' }); }
};