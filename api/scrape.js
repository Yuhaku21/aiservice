function send(response, status, body) {
  response.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(body));
}

function cleanHtml(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<svg[\s\S]*?<\/svg>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&#39;|&apos;/gi, "'").replace(/&quot;/gi, '"').replace(/\s+/g, ' ').trim();
}

const DEFAULT_AYOWEBKU_URL = 'https://ayowebku.vercel.app/';
const MAX_SOURCES = 8;

function getSourceUrls(requestBody) {
  const configuredUrls = process.env.AYOWEBKU_URLS?.split(',').map((url) => url.trim()).filter(Boolean);
  const requestedUrls = Array.isArray(requestBody?.urls) ? requestBody.urls : [];
  return [...new Set((configuredUrls?.length ? configuredUrls : requestedUrls.length ? requestedUrls : [DEFAULT_AYOWEBKU_URL]).slice(0, MAX_SOURCES))];
}

async function scrapePage(url) {
  const parsed = new URL(url);
  if (parsed.hostname !== 'ayowebku.vercel.app') throw new Error(`URL tidak diizinkan: ${parsed.hostname}`);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Gunakan URL http atau https.');
  const pageResponse = await fetch(parsed, { headers: { 'User-Agent': 'AyowebkuAssist/1.0 official knowledge reader' } });
  if (!pageResponse.ok) throw new Error(`Halaman merespons dengan status ${pageResponse.status}.`);
  const html = await pageResponse.text();
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || parsed.hostname;
  const text = cleanHtml(html).slice(0, 10000);
  if (text.length < 40) throw new Error('Teks yang bisa dibaca dari halaman terlalu sedikit.');
  return { url: parsed.href, title: cleanHtml(title).slice(0, 100), text };
}

module.exports = async (request, response) => {
  if (request.method !== 'POST') return send(response, 405, { error: 'Method not allowed.' });
  try {
    const urls = getSourceUrls(request.body || {});
    const results = await Promise.allSettled(urls.map(scrapePage));
    const sources = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
    if (!sources.length) throw new Error('Tidak ada halaman Ayowebku yang berhasil dibaca.');
    return send(response, 200, { sources, source: sources[0] });
  } catch (error) { return send(response, 400, { error: error.message || 'URL tidak dapat dibaca.' }); }
};