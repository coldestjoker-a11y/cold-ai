// ══════════════════════════════════════════════════
//  Cold AI — script.js  (Chat History + Full UI)
// ══════════════════════════════════════════════════

// ── DOM refs ──
const chatMessages    = document.getElementById('chatMessages');
const userInput       = document.getElementById('userInput');
const sendBtn         = document.getElementById('sendBtn');
const clearBtn        = document.getElementById('clearBtn');
const statusBadge     = document.getElementById('statusBadge');
const quickModeBtn    = document.getElementById('quickModeBtn');
const deepModeBtn     = document.getElementById('deepModeBtn');
const geminiProviderBtn = document.getElementById('geminiProviderBtn');
const claudeProviderBtn = document.getElementById('claudeProviderBtn');
const providerTitle   = document.getElementById('providerTitle');
const avatarPulse     = document.getElementById('avatarPulse');

// Sidebar
const sidebar         = document.getElementById('sidebar');
const sidebarToggleBtn= document.getElementById('sidebarToggleBtn');
const sidebarOpenBtn  = document.getElementById('sidebarOpenBtn');
const newChatBtn      = document.getElementById('newChatBtn');
const historyList     = document.getElementById('historyList');
const historySearch   = document.getElementById('historySearch');
const clearAllBtn     = document.getElementById('clearAllBtn');

// Modal
const renameModal     = document.getElementById('renameModal');
const renameInput     = document.getElementById('renameInput');
const renameCancelBtn = document.getElementById('renameCancelBtn');
const renameConfirmBtn= document.getElementById('renameConfirmBtn');

// ── State ──
let currentMode       = 'quick';
let currentProvider   = 'gemini';
let currentConvId     = null;   // active conversation ID
let allConversations  = [];     // fetched from /conversations
let renamingConvId    = null;   // which conv is being renamed
let sidebarVisible    = true;

// ══════════════════════════════════════════════════
//  SIDEBAR TOGGLE
// ══════════════════════════════════════════════════

function setSidebarVisible(visible) {
  sidebarVisible = visible;
  sidebar.classList.toggle('collapsed', !visible);
  sidebarOpenBtn.classList.toggle('visible', !visible);
  localStorage.setItem('cold_sidebar_visible', visible ? '1' : '0');
}

sidebarToggleBtn.addEventListener('click', () => setSidebarVisible(false));
sidebarOpenBtn.addEventListener('click', () => setSidebarVisible(true));

// Restore sidebar state from local storage
if (localStorage.getItem('cold_sidebar_visible') === '0') {
  setSidebarVisible(false);
}

// ══════════════════════════════════════════════════
//  TOAST NOTIFICATION
// ══════════════════════════════════════════════════

let toastTimer = null;
function showToast(msg) {
  let toast = document.getElementById('toastEl');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastEl';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ══════════════════════════════════════════════════
//  PROVIDER & MODE TOGGLE
// ══════════════════════════════════════════════════

geminiProviderBtn.addEventListener('click', () => setProvider('gemini'));
claudeProviderBtn.addEventListener('click', () => setProvider('claude'));

function setProvider(provider) {
  currentProvider = provider;
  geminiProviderBtn.classList.toggle('active', provider === 'gemini');
  claudeProviderBtn.classList.toggle('active', provider === 'claude');

  if (provider === 'claude') {
    document.documentElement.style.setProperty('--active-accent', '#d97706');
    avatarPulse.classList.add('claude-active');
  } else {
    document.documentElement.style.setProperty('--active-accent', '#7c5cff');
    avatarPulse.classList.remove('claude-active');
  }
}

quickModeBtn.addEventListener('click', () => setMode('quick'));
deepModeBtn.addEventListener('click', () => setMode('deep'));

function setMode(mode) {
  currentMode = mode;
  quickModeBtn.classList.toggle('active', mode === 'quick');
  deepModeBtn.classList.toggle('active', mode === 'deep');
}

// ══════════════════════════════════════════════════
//  CHAT HISTORY — FETCH & RENDER
// ══════════════════════════════════════════════════

async function loadConversations() {
  try {
    const res = await fetch('/conversations');
    const data = await res.json();
    allConversations = data.conversations || [];
    renderHistoryList(allConversations);
  } catch (e) {
    // Server may not be running yet; silently ignore
  }
}

function formatRelativeDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1)  return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24)  return `${diffHr}h ago`;
  if (diffDay < 7)  return `${diffDay}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function groupByDate(conversations) {
  const groups = { today: [], yesterday: [], older: [] };
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yestStr = yesterday.toDateString();

  for (const conv of conversations) {
    const d = new Date(conv.updated_at);
    if (d.toDateString() === todayStr) groups.today.push(conv);
    else if (d.toDateString() === yestStr) groups.yesterday.push(conv);
    else groups.older.push(conv);
  }
  return groups;
}

function renderHistoryList(conversations) {
  historyList.innerHTML = '';

  const query = historySearch.value.trim().toLowerCase();
  const filtered = query
    ? conversations.filter(c => c.title.toLowerCase().includes(query))
    : conversations;

  if (filtered.length === 0) {
    historyList.innerHTML = `
      <div class="sidebar-empty" id="historyEmpty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3;margin-bottom:8px">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>${query ? 'No results found' : 'No conversations yet'}</span>
      </div>`;
    return;
  }

  if (query) {
    // Flat list when searching
    filtered.forEach(conv => historyList.appendChild(buildHistoryItem(conv)));
    return;
  }

  const groups = groupByDate(filtered);
  const labels = { today: 'Today', yesterday: 'Yesterday', older: 'Older' };

  for (const [key, label] of Object.entries(labels)) {
    if (groups[key].length === 0) continue;
    const section = document.createElement('div');
    section.className = 'sidebar-section-label';
    section.textContent = label;
    historyList.appendChild(section);
    groups[key].forEach(conv => historyList.appendChild(buildHistoryItem(conv)));
  }
}

function buildHistoryItem(conv) {
  const item = document.createElement('div');
  item.className = 'history-item' + (conv.id === currentConvId ? ' active' : '');
  item.dataset.id = conv.id;

  item.innerHTML = `
    <div class="history-item-info">
      <span class="history-item-title">${escapeHtml(conv.title)}</span>
      <span class="history-item-date">${formatRelativeDate(conv.updated_at)}</span>
    </div>
    <div class="history-item-actions">
      <button class="history-action-btn rename" title="Rename">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button class="history-action-btn delete" title="Delete">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
  `;

  // Click on item → load conversation
  item.querySelector('.history-item-info').addEventListener('click', () => loadConversation(conv.id));

  // Rename button
  item.querySelector('.rename').addEventListener('click', (e) => {
    e.stopPropagation();
    openRenameModal(conv.id, conv.title);
  });

  // Delete button
  item.querySelector('.delete').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteConversation(conv.id);
  });

  return item;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Search ──
historySearch.addEventListener('input', () => renderHistoryList(allConversations));

// ══════════════════════════════════════════════════
//  LOAD A CONVERSATION (switch to it)
// ══════════════════════════════════════════════════

async function loadConversation(convId) {
  if (convId === currentConvId) return;

  try {
    const res = await fetch(`/conversations/${convId}`);
    if (!res.ok) return;
    const data = await res.json();

    const conv = data.conversation;
    const messages = data.messages;

    currentConvId = convId;

    // Sync mode/provider to the conversation's last settings
    if (conv.provider && ['gemini','claude'].includes(conv.provider)) setProvider(conv.provider);
    if (conv.mode && ['quick','deep'].includes(conv.mode)) setMode(conv.mode);

    // Render messages
    chatMessages.innerHTML = '';
    if (messages.length === 0) {
      addWelcome();
    } else {
      for (const msg of messages) {
        addMessageFromHistory(msg.content, msg.role === 'user', msg.provider, msg.mode, msg.created_at);
      }
    }

    // Highlight active in sidebar
    updateActiveItem(convId);

    // On mobile, close sidebar after selecting
    if (window.innerWidth <= 768) setSidebarVisible(false);

  } catch (e) {
    showToast('Failed to load conversation');
  }
}

function addMessageFromHistory(text, isUser, provider, mode, createdAt) {
  const welcome = chatMessages.querySelector('.welcome-card');
  if (welcome) welcome.remove();

  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;

  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'msg-avatar';
  if (isUser) {
    avatarDiv.textContent = '👤';
  } else {
    const img = document.createElement('img');
    img.src = '1764824368660.jpg';
    img.alt = 'Cold AI';
    img.className = 'msg-avatar-img';
    avatarDiv.appendChild(img);
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.className = 'msg-body';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  if (isUser) {
    contentDiv.textContent = text;
  } else {
    contentDiv.innerHTML = renderMarkdown(text);
  }

  const metaDiv = document.createElement('div');
  metaDiv.className = 'msg-meta';

  if (!isUser) {
    const prov = provider || currentProvider;
    const md   = mode    || currentMode;
    const pt = document.createElement('span');
    pt.className = `provider-tag ${prov}`;
    pt.textContent = prov === 'claude' ? 'Claude' : 'Gemini';
    metaDiv.appendChild(pt);

    const mt = document.createElement('span');
    mt.className = `mode-tag ${md}`;
    mt.textContent = md === 'deep' ? '🔍 Deep' : '⚡ Quick';
    metaDiv.appendChild(mt);
  }

  const timeDiv = document.createElement('div');
  timeDiv.className = 'msg-time';
  if (createdAt) {
    timeDiv.textContent = new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    timeDiv.textContent = getTime();
  }
  metaDiv.appendChild(timeDiv);

  bodyDiv.appendChild(contentDiv);
  bodyDiv.appendChild(metaDiv);
  msgDiv.appendChild(avatarDiv);
  msgDiv.appendChild(bodyDiv);
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateActiveItem(convId) {
  document.querySelectorAll('.history-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === convId);
  });
}

// ══════════════════════════════════════════════════
//  NEW CHAT
// ══════════════════════════════════════════════════

newChatBtn.addEventListener('click', startNewChat);

function startNewChat() {
  currentConvId = null;
  chatMessages.innerHTML = '';
  addWelcome();
  updateActiveItem(null);
  userInput.focus();
}

// ══════════════════════════════════════════════════
//  DELETE CONVERSATION
// ══════════════════════════════════════════════════

async function deleteConversation(convId) {
  try {
    await fetch(`/conversations/${convId}`, { method: 'DELETE' });
    allConversations = allConversations.filter(c => c.id !== convId);
    renderHistoryList(allConversations);

    // If we deleted the active one, start a new chat
    if (convId === currentConvId) startNewChat();
    showToast('Conversation deleted');
  } catch (e) {
    showToast('Failed to delete conversation');
  }
}

// ══════════════════════════════════════════════════
//  RENAME CONVERSATION
// ══════════════════════════════════════════════════

function openRenameModal(convId, currentTitle) {
  renamingConvId = convId;
  renameInput.value = currentTitle;
  renameModal.classList.add('open');
  setTimeout(() => renameInput.select(), 50);
}

function closeRenameModal() {
  renameModal.classList.remove('open');
  renamingConvId = null;
}

renameCancelBtn.addEventListener('click', closeRenameModal);
renameModal.addEventListener('click', (e) => { if (e.target === renameModal) closeRenameModal(); });

renameConfirmBtn.addEventListener('click', confirmRename);
renameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') closeRenameModal(); });

async function confirmRename() {
  const newTitle = renameInput.value.trim();
  if (!newTitle || !renamingConvId) return;

  try {
    await fetch(`/conversations/${renamingConvId}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle })
    });

    // Update local cache
    const conv = allConversations.find(c => c.id === renamingConvId);
    if (conv) conv.title = newTitle;
    renderHistoryList(allConversations);
    showToast('Conversation renamed');
  } catch (e) {
    showToast('Failed to rename conversation');
  }

  closeRenameModal();
}

// ══════════════════════════════════════════════════
//  CLEAR ALL HISTORY
// ══════════════════════════════════════════════════

clearAllBtn.addEventListener('click', async () => {
  if (!confirm('Delete ALL conversations? This cannot be undone.')) return;
  try {
    await fetch('/history/clear', { method: 'POST' });
    allConversations = [];
    renderHistoryList([]);
    startNewChat();
    showToast('All history cleared');
  } catch (e) {
    showToast('Failed to clear history');
  }
});

// ══════════════════════════════════════════════════
//  CLEAR CURRENT CHAT
// ══════════════════════════════════════════════════

clearBtn.addEventListener('click', () => {
  startNewChat();
  try { fetch('/clear', { method: 'POST' }); } catch (_) {}
});

// ══════════════════════════════════════════════════
//  AUTO-RESIZE TEXTAREA
// ══════════════════════════════════════════════════

userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
});

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener('click', sendMessage);

// ── Suggestion chips ──
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    userInput.value = chip.dataset.msg;
    sendMessage();
  });
});

// ── Time helper ──
function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ══════════════════════════════════════════════════
//  MARKDOWN RENDERER
// ══════════════════════════════════════════════════

function renderMarkdown(text) {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const langLabel = lang ? `<span class="code-lang">${lang}</span>` : '';
    return `<div class="code-block">${langLabel}<pre><code>${code.trim()}</code></pre></div>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h4 class="md-heading">$1</h4>');
  html = html.replace(/^## (.+)$/gm,  '<h3 class="md-heading">$1</h3>');
  html = html.replace(/^# (.+)$/gm,   '<h3 class="md-heading">$1</h3>');

  // Numbered lists
  html = html.replace(/(?:^|\n)((?:\d+\.\s+.+\n?)+)/g, (match) => {
    const items = match.trim().split('\n')
      .filter(line => /^\d+\.\s/.test(line))
      .map(line => `<li>${line.replace(/^\d+\.\s+/, '')}</li>`)
      .join('');
    return `<ol class="md-list">${items}</ol>`;
  });

  // Bullet lists
  html = html.replace(/(?:^|\n)((?:[-•]\s+.+\n?)+)/g, (match) => {
    const items = match.trim().split('\n')
      .filter(line => /^[-•]\s/.test(line))
      .map(line => `<li>${line.replace(/^[-•]\s+/, '')}</li>`)
      .join('');
    return `<ul class="md-list">${items}</ul>`;
  });

  // Paragraphs
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

// ══════════════════════════════════════════════════
//  ADD MESSAGE BUBBLE
// ══════════════════════════════════════════════════

function addMessage(text, isUser) {
  addMessageFromHistory(text, isUser, currentProvider, currentMode, null);
}

// ── Typing indicator ──
function showTyping() {
  const typing = document.createElement('div');
  typing.className = 'typing-indicator';
  typing.id = 'typingIndicator';
  typing.innerHTML = `
    <div class="msg-avatar"><img src="1764824368660.jpg" alt="Cold AI" class="msg-avatar-img"></div>
    <div class="typing-dots">
      <span></span><span></span><span></span>
    </div>
  `;
  chatMessages.appendChild(typing);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
  const t = document.getElementById('typingIndicator');
  if (t) t.remove();
}

// ── Set status ──
function setStatus(text, color) {
  const dot = statusBadge.querySelector('.status-dot');
  statusBadge.childNodes[statusBadge.childNodes.length - 1].textContent = ' ' + text;
  dot.style.background = color;
  dot.style.boxShadow = `0 0 8px ${color}`;
  statusBadge.style.color = color;
}

// ══════════════════════════════════════════════════
//  SEND MESSAGE
// ══════════════════════════════════════════════════

async function sendMessage() {
  const message = userInput.value.trim();
  if (!message) return;

  addMessage(message, true);
  userInput.value = '';
  userInput.style.height = 'auto';

  sendBtn.disabled = true;
  userInput.disabled = true;

  const providerLabel = currentProvider === 'claude' ? 'Claude' : 'Gemini';
  const modeLabel = currentMode === 'deep' ? 'Deep thinking' : 'Thinking';
  setStatus(`${modeLabel} (${providerLabel})...`, '#ffaa00');
  showTyping();

  try {
    const body = {
      message,
      mode: currentMode,
      provider: currentProvider,
    };
    if (currentConvId) {
      body.conversation_id = currentConvId;
    }

    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    hideTyping();

    if (res.ok && data.reply) {
      addMessage(data.reply, false);

      // Update conversation ID from server response
      if (data.conversation_id) {
        const isNewConv = !currentConvId;
        currentConvId = data.conversation_id;

        // Update sidebar: add or update this conversation
        await refreshConversationInSidebar(data.conversation_id, data.conversation_title || 'New Chat', isNewConv);
      }
    } else {
      addMessage('⚠️ ' + (data.error || 'Something went wrong.'), false);
    }
  } catch (err) {
    hideTyping();
    addMessage('⚠️ Could not reach the server. Make sure app.py is running.', false);
  }

  sendBtn.disabled = false;
  userInput.disabled = false;
  userInput.focus();
  setStatus('Online', '#00d4aa');
}

// ── Update the sidebar after sending a message ──
async function refreshConversationInSidebar(convId, title, isNew) {
  if (isNew) {
    // Prepend to local cache
    allConversations.unshift({
      id: convId,
      title,
      provider: currentProvider,
      mode: currentMode,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } else {
    // Update existing entry
    const conv = allConversations.find(c => c.id === convId);
    if (conv) {
      conv.title = title;
      conv.updated_at = new Date().toISOString();
      // Move to front
      allConversations = [conv, ...allConversations.filter(c => c.id !== convId)];
    } else {
      // Fell out of cache, re-fetch
      await loadConversations();
      return;
    }
  }
  renderHistoryList(allConversations);
  updateActiveItem(convId);
}

// ══════════════════════════════════════════════════
//  WELCOME CARD
// ══════════════════════════════════════════════════

function addWelcome() {
  chatMessages.innerHTML = `
    <div class="welcome-card">
      <div class="welcome-icon"><img src="1764824368660.jpg" alt="Cold AI" class="welcome-avatar"></div>
      <h2>Welcome to Cold AI</h2>
      <p>Your intelligent assistant powered by <strong>Gemini</strong> &amp; <strong>Claude</strong>. I can help with coding, math, science, writing, business, and much more.</p>
      <div class="suggestion-chips">
        <button class="chip" data-msg="Write a Python function to sort a list of dictionaries by a specific key">🐍 Python help</button>
        <button class="chip" data-msg="Explain quantum computing in simple terms">🔬 Quantum computing</button>
        <button class="chip" data-msg="Help me write a professional email to a client about a project delay">✉️ Write an email</button>
        <button class="chip" data-msg="What's the difference between SQL and NoSQL databases?">🗄️ SQL vs NoSQL</button>
        <button class="chip" data-msg="Create a workout plan for beginners">💪 Workout plan</button>
        <button class="chip" data-msg="Explain the theory of relativity like I'm 10">🌌 Relativity</button>
      </div>
    </div>
  `;
  // Re-attach chip listeners
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      userInput.value = chip.dataset.msg;
      sendMessage();
    });
  });
}

// ══════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════

userInput.focus();
loadConversations();
