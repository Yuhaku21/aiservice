const state = { sources: [], messages: [] };
const sourceStatus = document.querySelector('#source-status');
const sourceList = document.querySelector('#source-list');
const messages = document.querySelector('#messages');
const chatForm = document.querySelector('#chat-form');
const messageInput = document.querySelector('#message-input');

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
}

function renderSources() {
  if (!state.sources.length) {
    sourceList.innerHTML = '<div class="source-empty">Data website belum tersedia.</div>';
    return;
  }
  sourceList.innerHTML = state.sources.map((source, index) => `
    <div class="source-card"><span class="source-favicon">a</span><div class="source-info"><strong>${escapeHtml(source.title)}</strong><small>Disinkronkan dari website resmi Ayowebku</small></div><span class="source-check">✓</span></div>
  `).join('');
}

function addMessage(role, content, loading = false) {
  const article = document.createElement('article');
  article.className = `message ${role === 'user' ? 'user-message' : 'assistant-message'}`;
  article.innerHTML = role === 'user'
    ? `<div class="message-body"><p>${escapeHtml(content)}</p></div>`
    : `<div class="avatar">a</div><div class="message-body"><p class="message-name">Ayowebku Assist <span>sekarang</span></p><p class="${loading ? 'loading' : ''}">${loading ? 'Sedang mencari informasi...' : escapeHtml(content).replace(/\n/g, '<br>')}</p></div>`;
  messages.appendChild(article);
  messages.scrollTop = messages.scrollHeight;
  return article;
}

async function loadAyowebkuSource() {
  sourceStatus.textContent = 'Mengambil informasi terbaru...';
  try {
    const response = await fetch('/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Website belum dapat dibaca.');
    state.sources.push(result.source);
    renderSources();
    sourceStatus.textContent = 'Informasi siap digunakan untuk menjawab pertanyaan.';
  } catch (error) {
    sourceStatus.textContent = 'Informasi website belum tersedia. Coba lagi nanti.';
  }
}

loadAyowebkuSource();

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const content = messageInput.value.trim();
  if (!content) return;
  messageInput.value = '';
  messageInput.style.height = 'auto';
  state.messages.push({ role: 'user', content });
  addMessage('user', content);
  const pending = addMessage('assistant', '', true);
  const submit = chatForm.querySelector('button');
  submit.disabled = true;
  try {
    const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: content, history: state.messages.slice(-8), sources: state.sources }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Terjadi kendala saat menghubungi AI.');
    pending.querySelector('.message-body p:last-child').classList.remove('loading');
    pending.querySelector('.message-body p:last-child').innerHTML = escapeHtml(result.answer).replace(/\n/g, '<br>');
    state.messages.push({ role: 'assistant', content: result.answer });
  } catch (error) {
    pending.querySelector('.message-body p:last-child').classList.remove('loading');
    pending.querySelector('.message-body p:last-child').textContent = error.message;
  } finally { submit.disabled = false; messages.scrollTop = messages.scrollHeight; }
});

messageInput.addEventListener('input', () => { messageInput.style.height = 'auto'; messageInput.style.height = `${Math.min(messageInput.scrollHeight, 120)}px`; });
messageInput.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); chatForm.requestSubmit(); } });
document.querySelector('#clear-chat').addEventListener('click', () => { state.messages = []; messages.innerHTML = ''; addMessage('assistant', 'Percakapan baru dimulai. Apa yang ingin kamu tanyakan tentang Ayowebku?'); });