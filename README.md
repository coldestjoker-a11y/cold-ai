# Cold AI — Chat

A sleek, dual-provider AI chat application powered by **Google Gemini** and **Anthropic Claude**. Features a premium dark UI with Quick and Deep response modes.

## Features

- 🤖 **Dual AI Providers** — Switch between Gemini and Claude on the fly
- ⚡ **Quick Mode** — Fast, concise answers (Gemini 1.5 Flash / Claude Haiku)
- 🧠 **Deep Mode** — Exhaustive, expert-level responses (Claude Sonnet)
- 💬 **Conversation Memory** — Remembers context throughout your session
- 🎨 **Premium Dark UI** — Glassmorphism design with smooth animations
- 🔄 **Clear Chat** — Reset conversation memory anytime

## Setup

### 1. Clone the repo
```bash
git clone https://github.com/coldjoker/cold-ai.git
cd cold-ai
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure API keys
```bash
cp .env.example .env
```
Edit `.env` and add your keys:
- **Gemini key** → [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- **Claude key** → [console.anthropic.com](https://console.anthropic.com)

### 4. Run
```bash
python app.py
```

Open **http://localhost:5000** in your browser.

## Tech Stack

- **Backend** — Python / Flask
- **AI** — Google Gemini API + Anthropic Claude API
- **Frontend** — Vanilla HTML / CSS / JavaScript
