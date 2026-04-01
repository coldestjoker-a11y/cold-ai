const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const statusBadge = document.getElementById('statusBadge');
const quickModeBtn = document.getElementById('quickModeBtn');
const deepModeBtn = document.getElementById('deepModeBtn');
const geminiProviderBtn = document.getElementById('geminiProviderBtn');
const claudeProviderBtn = document.getElementById('claudeProviderBtn');
const providerTitle = document.getElementById('providerTitle');

let currentMode = 'quick';
let currentProvider = 'gemini';

// ── Provider toggle ──
geminiProviderBtn.addEventListener('click', () => setProvider('gemini'));
claudeProviderBtn.addEventListener('click', () => setProvider('claude'));

function setProvider(provider) {
  currentProvider = provider;
  geminiProviderBtn.classList.toggle('active', provider === 'gemini');
  claudeProviderBtn.classList.toggle('active', provider === 'claude');
  providerTitle.textContent = 'Cold AI';

  const avatarPulse = document.querySelector('.avatar-pulse');
  if (provider === 'claude') {
    document.documentElement.style.setProperty('--active-accent', '#d97706');
    avatarPulse.classList.add('claude-active');
  } else {
    document.documentElement.style.setProperty('--active-accent', '#7c5cff');
    avatarPulse.classList.remove('claude-active');
  }
}

// ── Mode toggle ──
quickModeBtn.addEventListener('click', () => setMode('quick'));
deepModeBtn.addEventListener('click', () => setMode('deep'));

function setMode(mode) {
  currentMode = mode;
  quickModeBtn.classList.toggle('active', mode === 'quick');
  deepModeBtn.classList.toggle('active', mode === 'deep');
}

// ── Auto-resize textarea ──
userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
});

// ── Send on Enter (Shift+Enter for newline) ──
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

// ── Clear chat (also resets server memory) ──
clearBtn.addEventListener('click', async () => {
  chatMessages.innerHTML = '';
  addWelcome();
  // Reset server-side conversation memory
  try {
    await fetch('/clear', { method: 'POST' });
  } catch (e) {
    // Silent fail — server might not be running
  }
});

// ── Time helper ──
function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ──────────────────────────────────────────────────
//  MARKDOWN RENDERER
// ──────────────────────────────────────────────────

function renderMarkdown(text) {
  // Escape HTML first to prevent XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks: ```lang\ncode\n``` → <pre><code>
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const langLabel = lang ? `<span class="code-lang">${lang}</span>` : '';
    return `<div class="code-block">${langLabel}<pre><code>${code.trim()}</code></pre></div>`;
  });

  // Inline code: `code` → <code>
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Bold: **text** → <strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic: *text* → <em>
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Headings: ### text → <h4>, ## text → <h3> (keep them small in chat)
  html = html.replace(/^### (.+)$/gm, '<h4 class="md-heading">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="md-heading">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h3 class="md-heading">$1</h3>');

  // Numbered lists: 1. item → <ol><li>
  html = html.replace(/(?:^|\n)((?:\d+\.\s+.+\n?)+)/g, (match) => {
    const items = match.trim().split('\n')
      .filter(line => /^\d+\.\s/.test(line))
      .map(line => `<li>${line.replace(/^\d+\.\s+/, '')}</li>`)
      .join('');
    return `<ol class="md-list">${items}</ol>`;
  });

  // Bullet lists: - item or • item → <ul><li>
  html = html.replace(/(?:^|\n)((?:[-•]\s+.+\n?)+)/g, (match) => {
    const items = match.trim().split('\n')
      .filter(line => /^[-•]\s/.test(line))
      .map(line => `<li>${line.replace(/^[-•]\s+/, '')}</li>`)
      .join('');
    return `<ul class="md-list">${items}</ul>`;
  });

  // Line breaks: double newline → paragraph break
  html = html.replace(/\n\n/g, '<br><br>');
  // Single newline → <br>
  html = html.replace(/\n/g, '<br>');

  return html;
}


// ── Add message bubble ──
function addMessage(text, isUser) {
  // Remove welcome card if present
  const welcome = chatMessages.querySelector('.welcome-card');
  if (welcome) welcome.remove();

  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;

  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'msg-avatar';
  if (isUser) {
    avatarDiv.textContent = '👤';
  } else {
    const avatarImg = document.createElement('img');
    avatarImg.src = '1764824368660.jpg';
    avatarImg.alt = 'Cold AI';
    avatarImg.className = 'msg-avatar-img';
    avatarDiv.appendChild(avatarImg);
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.className = 'msg-body';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  if (isUser) {
    contentDiv.textContent = text;
  } else {
    // Render markdown for bot messages
    contentDiv.innerHTML = renderMarkdown(text);
  }

  const metaDiv = document.createElement('div');
  metaDiv.className = 'msg-meta';

  const timeDiv = document.createElement('div');
  timeDiv.className = 'msg-time';
  timeDiv.textContent = getTime();

  if (!isUser) {
    const providerTag = document.createElement('span');
    providerTag.className = `provider-tag ${currentProvider}`;
    providerTag.textContent = currentProvider === 'claude' ? 'Claude' : 'Gemini';
    metaDiv.appendChild(providerTag);

    const modeTag = document.createElement('span');
    modeTag.className = `mode-tag ${currentMode}`;
    modeTag.textContent = currentMode === 'deep' ? '🔍 Deep' : '⚡ Quick';
    metaDiv.appendChild(modeTag);
  }
  metaDiv.appendChild(timeDiv);

  bodyDiv.appendChild(contentDiv);
  bodyDiv.appendChild(metaDiv);
  msgDiv.appendChild(avatarDiv);
  msgDiv.appendChild(bodyDiv);

  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
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
  const typing = document.getElementById('typingIndicator');
  if (typing) typing.remove();
}

// ── Set status ──
function setStatus(text, color) {
  const dot = statusBadge.querySelector('.status-dot');
  statusBadge.childNodes[statusBadge.childNodes.length - 1].textContent = ' ' + text;
  dot.style.background = color;
  dot.style.boxShadow = `0 0 8px ${color}`;
  statusBadge.style.color = color;
}

// ── Send message ──
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
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, mode: currentMode, provider: currentProvider })
    });

    const data = await res.json();
    hideTyping();

    if (res.ok && data.reply) {
      addMessage(data.reply, false);
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

// ── Welcome card ──
function addWelcome() {
  chatMessages.innerHTML = `
    <div class="welcome-card">
      <div class="welcome-icon"><img src="1764824368660.jpg" alt="Cold AI" class="welcome-avatar"></div>
      <h2>Welcome to Cold AI</h2>
      <p>Your intelligent assistant powered by <strong>Gemini</strong> & <strong>Claude</strong>. I can help with coding, math, science, writing, business, and much more.</p>
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

userInput.focus();
