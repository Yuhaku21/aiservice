const state = { sources: [], messages: [] };
const messages = document.querySelector('#messages');
const chatForm = document.querySelector('#chat-form');
const messageInput = document.querySelector('#message-input');

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
}

function getTableCells(line) {
  const trimmedLine = line.trim();
  if (!trimmedLine.includes('|')) return null;
  const cellText = trimmedLine.replace(/^\|/, '').replace(/\|$/, '');
  const cells = cellText.split('|').map((cell) => cell.trim());
  return cells.length > 1 ? cells : null;
}

function isTableSeparator(line) {
  const cells = getTableCells(line);
  return cells && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function renderTable(rows) {
  const header = rows[0].map((cell) => `<th scope="col">${escapeHtml(cell)}</th>`).join('');
  const body = rows.slice(1).map((row) => {
    const cells = row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  return `<div class="table-wrap"><table class="response-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderAssistantContent(content) {
  const lines = content.replace(/\r/g, '').split('\n');
  let html = '';
  let index = 0;

  while (index < lines.length) {
    const header = getTableCells(lines[index]);
    if (header && isTableSeparator(lines[index + 1] || '')) {
      const rows = [header];
      index += 2;
      while (index < lines.length && getTableCells(lines[index]) && !isTableSeparator(lines[index])) {
        rows.push(getTableCells(lines[index]));
        index += 1;
      }
      html += renderTable(rows);
      if (index < lines.length) html += '<br>';
      continue;
    }

    html += escapeHtml(lines[index]);
    if (index < lines.length - 1) html += '<br>';
    index += 1;
  }

  return html;
}

function addMessage(role, content, loading = false) {
  const article = document.createElement('article');
  article.className = `message ${role === 'user' ? 'user-message' : 'assistant-message'}`;
  article.innerHTML = role === 'user'
    ? `<div class="message-body"><p>${escapeHtml(content)}</p></div>`
    : `<div class="avatar">a</div><div class="message-body"><p class="message-name">Ayowebku Assist <span>sekarang</span></p><p class="${loading ? 'loading' : ''}">${loading ? 'Sedang mencari informasi...' : renderAssistantContent(content)}</p></div>`;
  messages.appendChild(article);
  messages.scrollTop = messages.scrollHeight;
  return article;
}

async function loadAyowebkuSource() {
  try {
    const response = await fetch('/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Website belum dapat dibaca.');
    state.sources.push(...(result.sources || [result.source]));
  } catch (error) {}
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
    pending.querySelector('.message-body p:last-child').innerHTML = renderAssistantContent(result.answer);
    state.messages.push({ role: 'assistant', content: result.answer });
  } catch (error) {
    pending.querySelector('.message-body p:last-child').classList.remove('loading');
    pending.querySelector('.message-body p:last-child').textContent = error.message;
  } finally { submit.disabled = false; messages.scrollTop = messages.scrollHeight; }
});

messageInput.addEventListener('input', () => { messageInput.style.height = 'auto'; messageInput.style.height = `${Math.min(messageInput.scrollHeight, 120)}px`; });
messageInput.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); chatForm.requestSubmit(); } });
document.querySelector('#clear-chat')?.addEventListener('click', () => { state.messages = []; messages.innerHTML = ''; addMessage('assistant', 'Percakapan baru dimulai. Apa yang ingin kamu tanyakan tentang Ayowebku?'); });