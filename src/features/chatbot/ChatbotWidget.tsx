import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/design-system';
import { MARIUS_SYSTEM_PROMPT } from './mariusSystemPrompt';
import { useFarm } from '../../context/FarmContext';
import { useAuth } from '../../context/AuthContext';
import { buildFarmContextPrompt, type FarmSnapshot } from './buildFarmContext';
import { buildMariusSuggestions } from './buildMariusSuggestions';
import { kvGet } from '../../services/kvStore';

type Role = 'user' | 'assistant' | 'system';

interface Message {
  role: Role;
  content: string;
}

// Mistral cloud API (bascule officielle 2026-05-07)
// Le VPS llama-server custom ignorait le system prompt — Mistral cloud l'applique correctement.
// SECURITY: VITE_MISTRAL_API_KEY est inlinée dans le bundle client (visible).
// À migrer vers Supabase Edge Function pour la prod long terme.
const MISTRAL_API_BASE = 'https://api.mistral.ai/v1';
const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY as string | undefined;
const MISTRAL_MODEL = 'mistral-small-latest';

// VPS Hostinger en backup (legacy, system prompt non appliqué — fallback uniquement si Mistral KO)
const VPS_API_BASE = import.meta.env.VITE_MARIUS_API_BASE as string | undefined;
const VPS_API_KEY = import.meta.env.VITE_MARIUS_API_KEY as string | undefined;

export const isMariusConfigured: boolean = Boolean(
  MISTRAL_API_KEY || (VPS_API_BASE && VPS_API_KEY),
);

function warnMixedContent(): void {
  if (typeof window === 'undefined' || !VPS_API_BASE) return;
  if (window.location.protocol === 'https:' && VPS_API_BASE.startsWith('http://')) {
    console.warn(
      '[Marius] Mixed Content: la page est servie en HTTPS mais VPS_API_BASE est en HTTP. ' +
        'Configure HTTPS sur ton VPS (Cloudflare Tunnel ou Caddy + Let\'s Encrypt).',
    );
  }
}

async function callMariusAPI(
  messages: Message[],
  systemPrompt: string,
  signal: AbortSignal,
): Promise<Response> {
  // Tentative 1 : Mistral cloud (system prompt appliqué)
  if (MISTRAL_API_KEY) {
    try {
      const res = await fetch(`${MISTRAL_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MISTRAL_API_KEY}`,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          model: MISTRAL_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
              .filter((m) => m.role !== 'system')
              .map((m) => ({ role: m.role, content: m.content })),
          ],
          stream: true,
          max_tokens: 800,
          temperature: 0.7,
        }),
        signal,
      });
      if (res.ok && res.body) return res;
      console.warn('[Marius] Mistral cloud failed, falling back to VPS', res.status);
    } catch (err) {
      console.warn('[Marius] Mistral cloud error, falling back to VPS', err);
    }
  }

  // Fallback : VPS Hostinger (system prompt ignoré mais répond)
  if (!VPS_API_BASE || !VPS_API_KEY) {
    throw new Error('Aucune API Marius configurée');
  }
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  return await fetch(`${VPS_API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': VPS_API_KEY,
    },
    body: JSON.stringify({ message: lastUser }),
    signal,
  });
}

/**
 * Vérifie si le mode debug Marius est actif.
 * Activé via :
 *   - URL : `?marius_debug=1`
 *   - kvStore : `pt:marius_debug = '1'`
 * En debug, le bloc CONTEXTE FERME injecté dans la dernière requête est
 * affiché en bas du chat (texte gris, mono).
 */
function isMariusDebug(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('marius_debug') === '1') return true;
  } catch {
    /* noop */
  }
  return kvGet('pt:marius_debug') === '1';
}

export const ChatbotWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [lastInjectedContext, setLastInjectedContext] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Snapshot ferme pour enrichir le user message avant chaque envoi à Marius.
  const farm = useFarm();
  const { userName } = useAuth();
  const debugEnabled = isMariusDebug();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-chatbot', handler);
    return () => window.removeEventListener('open-chatbot', handler);
  }, []);

  // V72 — Suggestions DYNAMIQUES dérivées du snapshot ferme (mise-bas
  // imminente, stocks rupture, retour chaleur, écho, etc.). Fallback
  // général si la ferme est calme.
  const suggestions = useMemo(
    () =>
      buildMariusSuggestions({
        nomFerme: farm.nomFerme,
        pays: farm.pays,
        truies: farm.truies,
        verrats: farm.verrats,
        bandes: farm.bandes,
        stockAliment: farm.stockAliment,
        stockVeto: farm.stockVeto,
        alerts: farm.alerts,
        saillies: farm.saillies,
      }),
    [farm.nomFerme, farm.pays, farm.truies, farm.verrats, farm.bandes, farm.stockAliment, farm.stockVeto, farm.alerts, farm.saillies],
  );

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

    if (!isMariusConfigured) {
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
      // Marius RAG MVP — préfixe le user message avec un bloc CONTEXTE FERME
      // (truies critiques, bandes, stocks, alertes) pour que la réponse soit
      // ancrée sur les données réelles de la ferme courante. L'UI continue
      // d'afficher le texte original (cf. setMessages plus haut), seul l'API
      // call reçoit la version enrichie.
      const snapshot: FarmSnapshot = {
        nomFerme: farm.nomFerme,
        pays: farm.pays,
        truies: farm.truies,
        verrats: farm.verrats,
        bandes: farm.bandes,
        stockAliment: farm.stockAliment,
        stockVeto: farm.stockVeto,
        alerts: farm.alerts,
      };
      const farmContext = buildFarmContextPrompt(snapshot, { userName });
      setLastInjectedContext(farmContext);

      const enrichedUserContent = `${farmContext}\n\nQuestion utilisateur : ${text}`;
      const userMessage: Message = { role: 'user', content: enrichedUserContent };
      const updatedMessages = [
        ...messages.filter((m) => m.role !== 'system'),
        userMessage,
      ];

      const response = await callMariusAPI(
        updatedMessages.slice(-8),
        MARIUS_SYSTEM_PROMPT,
        controller.signal,
      );

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
  }, [input, loading, messages, appendToLastAssistant, farm, userName]);

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
          <img
            src="/images/marius-avatar.webp"
            alt=""
            aria-hidden
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="ft-heading text-sm uppercase tracking-wide">Marius</span>
        </div>
        <Button variant="ghost" size="small" onClick={handleClose} aria-label="Fermer la conversation">
          <X size={18} />
        </Button>
      </div>

      <div
        aria-live="polite"
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-[200px]"
      >
        {messages.length === 0 && (
          <div className="text-center mt-6 px-2">
            <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
              Bonjour, je suis Marius.<br />
              Posez-moi une question sur votre élevage.
            </p>
            <div className="flex flex-col gap-2 mt-4">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setInput(s.question);
                    setTimeout(() => inputRef.current?.focus(), 0);
                  }}
                  className="text-xs text-left px-3 py-2 rounded-xl transition-colors hover:bg-[var(--bg-surface-2)]"
                  style={{
                    background: 'var(--bg-surface-2)',
                    color: 'var(--ink)',
                    border: '1px solid var(--line)',
                  }}
                >
                  {s.question}
                </button>
              ))}
            </div>
          </div>
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
        {debugEnabled && lastInjectedContext && (
          <details
            className="mt-3 mx-1 text-[10px] rounded-lg p-2 ft-code"
            style={{
              background: 'var(--bg-surface-2)',
              color: 'var(--muted)',
              border: '1px dashed var(--line)',
            }}
          >
            <summary className="cursor-pointer select-none">
              Marius debug — contexte injecté ({lastInjectedContext.length} car.)
            </summary>
            <pre className="mt-2 whitespace-pre-wrap leading-tight">{lastInjectedContext}</pre>
          </details>
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
          placeholder="Posez votre question…"
          aria-label="Votre question pour Marius"
          disabled={loading}
          className="flex-1 text-sm rounded-full px-3 py-2 border outline-none
                     focus:border-[var(--color-accent-500)]"
          style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--line)' }}
        />
        <Button
          type="submit"
          variant="primary"
          size="small"
          disabled={loading || !input.trim()}
          aria-label="Envoyer"
          className="w-9 h-9 rounded-full bg-[var(--color-accent-500)] text-white
                     flex items-center justify-center
                     disabled:opacity-40 hover:bg-[var(--color-accent-600)]
                     transition-colors"
        >
          <Send size={15} />
        </Button>
      </form>
    </div>
  );
};
