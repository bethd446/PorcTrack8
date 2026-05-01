import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Send, Loader2 } from 'lucide-react';

type Role = 'user' | 'assistant' | 'system';

interface Message {
  role: Role;
  content: string;
}

// SECURITY: VITE_* env vars are inlined into the client bundle at build time
// and visible to anyone inspecting the JS. Acceptable for MVP, but for prod
// route requests through a backend proxy that holds the real secret.
const API_BASE = import.meta.env.VITE_MARIUS_API_BASE as string | undefined;
const API_KEY = import.meta.env.VITE_MARIUS_API_KEY as string | undefined;

export const isMariusConfigured: boolean = Boolean(API_BASE && API_KEY);

function warnMixedContent(): void {
  if (typeof window === 'undefined' || !API_BASE) return;
  if (window.location.protocol === 'https:' && API_BASE.startsWith('http://')) {
    console.warn(
      '[Marius] Mixed Content: la page est servie en HTTPS mais API_BASE est en HTTP. ' +
        'Configure HTTPS sur ton VPS (Cloudflare Tunnel ou Caddy + Let\'s Encrypt).',
    );
  }
}

export const ChatbotWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-chatbot', handler);
    return () => window.removeEventListener('open-chatbot', handler);
  }, []);

  useEffect(() => {
    if (open && isMariusConfigured) {
      warnMixedContent();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const appendToLastAssistant = useCallback((delta: string) => {
    setMessages(prev => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.role === 'assistant') {
        next[next.length - 1] = { ...last, content: last.content + delta };
      }
      return next;
    });
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (!isMariusConfigured || !API_BASE || !API_KEY) {
      setMessages(prev => [
        ...prev,
        { role: 'system', content: 'Marius n\'est pas configuré sur cette instance.' },
      ]);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setMessages(prev => [
      ...prev,
      { role: 'user', content: text },
      { role: 'assistant', content: '' },
    ]);
    setInput('');
    setLoading(true);
    setStreaming(false);

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({ message: text }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let firstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const event of events) {
          for (const line of event.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') {
              setLoading(false);
              setStreaming(false);
              return;
            }
            let chunk = data;
            try {
              const parsed = JSON.parse(data) as {
                content?: string;
                choices?: Array<{
                  delta?: { content?: string };
                  message?: { content?: string };
                  finish_reason?: string | null;
                }>;
              };
              // 1. Format OpenAI/llama-server : choices[0].delta.content (streaming)
              const openaiDelta = parsed.choices?.[0]?.delta?.content;
              if (typeof openaiDelta === 'string') {
                chunk = openaiDelta;
              } else if (typeof parsed.content === 'string') {
                // 2. Format simple : { content: "..." }
                chunk = parsed.content;
              } else if (parsed.choices?.[0]?.finish_reason) {
                // Pas de delta sur les events de fin (finish_reason set sans content) → skip
                continue;
              } else {
                // Autre payload non reconnu — skip pour éviter d'afficher du JSON brut
                continue;
              }
            } catch {
              // Texte brut hors JSON, on l'utilise tel quel
            }
            if (firstChunk) {
              setStreaming(true);
              firstChunk = false;
            }
            appendToLastAssistant(chunk);
          }
        }
      }
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') return;
      setMessages(prev => {
        const next = [...prev];
        // remplace la bulle assistant vide par un message d'erreur
        if (next.length > 0 && next[next.length - 1].role === 'assistant' && !next[next.length - 1].content) {
          next.pop();
        }
        next.push({
          role: 'system',
          content: 'Marius est indisponible (vérifiez la connexion).',
        });
        return next;
      });
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }, [input, loading, appendToLastAssistant]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void handleSend();
  };

  const handleClose = () => {
    abortRef.current?.abort();
    setOpen(false);
  };

  if (!isMariusConfigured) {
    return null;
  }

  // FAB séparé retiré (V19 Sprint 1) — ouverture via SaisirSheet "Demander à
  // Marius" qui dispatch l'event 'open-chatbot' (handler dans le useEffect
  // ci-dessus). Le widget rend uniquement le panel quand open === true.
  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-label="Conversation avec Marius"
      className="fixed bottom-20 right-4 z-50 w-[340px] max-h-[520px]
                 rounded-2xl shadow-2xl flex flex-col overflow-hidden
                 border border-[var(--color-accent-100)]"
      style={{ background: 'var(--bg-surface)' }}
    >
      <div
        className="flex items-center justify-between px-4 py-3
                   bg-[var(--color-accent-500)] text-white"
      >
        <div className="flex items-center gap-2">
          <img src="/images/porc-mark.svg" alt="" className="w-6 h-6" />
          <span className="ft-heading text-sm uppercase tracking-wide">Marius</span>
        </div>
        <button onClick={handleClose} aria-label="Fermer la conversation">
          <X size={18} />
        </button>
      </div>

      <div
        aria-live="polite"
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-[200px]"
      >
        {messages.length === 0 && (
          <p className="text-xs text-center mt-8" style={{ color: 'var(--muted)' }}>
            Bonjour, je suis Marius.<br />
            Posez une question sur votre élevage.
          </p>
        )}
        {messages.map((m, i) => {
          if (m.role === 'system') {
            return (
              <div
                key={i}
                className="text-xs text-center px-3 py-2 rounded-lg mx-auto max-w-[90%]"
                style={{ background: 'var(--bg-surface-2)', color: 'var(--muted)' }}
              >
                {m.content}
              </div>
            );
          }
          return (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed
                  ${
                    m.role === 'user'
                      ? 'bg-[var(--color-accent-500)] text-white rounded-br-sm'
                      : 'rounded-bl-sm'
                  }`}
                style={
                  m.role === 'user'
                    ? undefined
                    : { background: 'var(--bg-surface-2)', color: 'var(--ink)' }
                }
              >
                {m.content || (loading && !streaming ? 'Marius reflechit…' : '')}
              </div>
            </div>
          );
        })}
        {loading && !streaming && (
          <div className="flex justify-start items-center gap-2 px-2">
            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--muted)' }} />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              Marius reflechit…
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-3 py-2 border-t"
        style={{ borderColor: 'var(--line)' }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Question pour Marius…"
          aria-label="Votre question pour Marius"
          disabled={loading}
          className="flex-1 text-sm rounded-full px-3 py-2 border outline-none
                     focus:border-[var(--color-accent-500)]"
          style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--line)' }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Envoyer"
          className="w-9 h-9 rounded-full bg-[var(--color-accent-500)] text-white
                     flex items-center justify-center
                     disabled:opacity-40 hover:bg-[var(--color-accent-600)]
                     transition-colors"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};
