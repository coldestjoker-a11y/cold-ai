import sqlite3
import os
import uuid
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chat_history.db")


def get_connection():
    """Get a SQLite connection with WAL mode for better concurrency."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Initialize the database schema."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT 'New Chat',
            provider TEXT NOT NULL DEFAULT 'gemini',
            mode TEXT NOT NULL DEFAULT 'quick',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            provider TEXT,
            mode TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_messages_conversation
        ON messages(conversation_id)
    """)

    conn.commit()
    conn.close()


def create_conversation(provider='gemini', mode='quick'):
    """Create a new conversation and return its ID."""
    conv_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()

    conn = get_connection()
    conn.execute(
        "INSERT INTO conversations (id, title, provider, mode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        (conv_id, "New Chat", provider, mode, now, now)
    )
    conn.commit()
    conn.close()
    return conv_id


def list_conversations(limit=50):
    """List all conversations, most recent first."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, title, provider, mode, created_at, updated_at FROM conversations ORDER BY updated_at DESC LIMIT ?",
        (limit,)
    ).fetchall()
    conn.close()

    return [dict(row) for row in rows]


def get_conversation(conv_id):
    """Get a single conversation's metadata."""
    conn = get_connection()
    row = conn.execute(
        "SELECT id, title, provider, mode, created_at, updated_at FROM conversations WHERE id = ?",
        (conv_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def rename_conversation(conv_id, new_title):
    """Rename a conversation."""
    conn = get_connection()
    conn.execute(
        "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
        (new_title, datetime.now().isoformat(), conv_id)
    )
    conn.commit()
    conn.close()


def delete_conversation(conv_id):
    """Delete a conversation and all its messages."""
    conn = get_connection()
    conn.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
    conn.commit()
    conn.close()


def save_message(conv_id, role, content, provider=None, mode=None):
    """Save a message to a conversation."""
    now = datetime.now().isoformat()
    conn = get_connection()

    conn.execute(
        "INSERT INTO messages (conversation_id, role, content, provider, mode, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (conv_id, role, content, provider, mode, now)
    )

    # Update conversation's updated_at timestamp
    conn.execute(
        "UPDATE conversations SET updated_at = ? WHERE id = ?",
        (now, conv_id)
    )

    # Auto-title: if this is the first user message and title is still "New Chat"
    if role == "user":
        conv = conn.execute(
            "SELECT title FROM conversations WHERE id = ?", (conv_id,)
        ).fetchone()
        if conv and conv["title"] == "New Chat":
            # Use first 50 chars of the message as the title
            title = content[:50].strip()
            if len(content) > 50:
                title += "…"
            conn.execute(
                "UPDATE conversations SET title = ? WHERE id = ?",
                (title, conv_id)
            )

    conn.commit()
    conn.close()


def get_messages(conv_id):
    """Get all messages for a conversation."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, role, content, provider, mode, created_at FROM messages WHERE conversation_id = ? ORDER BY id ASC",
        (conv_id,)
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_messages_for_api(conv_id):
    """Get messages formatted for the OpenRouter API (role + content only)."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT role, content FROM messages WHERE conversation_id = ? AND role IN ('user', 'assistant') ORDER BY id ASC",
        (conv_id,)
    ).fetchall()
    conn.close()
    return [{"role": row["role"], "content": row["content"]} for row in rows]


def clear_all():
    """Delete ALL conversations and messages."""
    conn = get_connection()
    conn.execute("DELETE FROM messages")
    conn.execute("DELETE FROM conversations")
    conn.commit()
    conn.close()


# Initialize DB on module import
init_db()
