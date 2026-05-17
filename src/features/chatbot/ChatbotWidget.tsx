import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ArrowUp, X, Maximize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MARIUS_SYSTEM_PROMPT } from './mariusSystemPrompt';
import { useFarm } from '../../context/FarmContext';
import { useAuth } from '../../context/AuthContext';
import { buildFarmContextPrompt, type FarmSnapshot } from './buildFarmContext';
import { buildMariusSuggestions } from './buildMariusSuggestions';
import { kvGet } from '../../services/kvStore';
import { callMariusAPI, isMariusConfigured as isMariusConfiguredApi } from './mariusApi';

type Role = 'user' | 'assistant' | 'system';

interface Message {
  role: Role;
  content: string;
}

// 2026-05-17 — Migration sécurité critique : tout l'appel Marius passe
// désormais par l'Edge Function `marius-chat` (clé Mistral côté serveur).
// Plus aucune clé API n'est exposée dans le bundle client.
// La logique est centralisée dans `./mariusApi.ts`.
export const isMariusConfigured: boolean = isMariusConfiguredApi;

const ORB_SRC = '/images/v73/marius/orb-emeraude.webp';

/**
 * Vérifie si le mode debug Marius est actif.
 * Activé via :
 *   - URL : `?marius_debug=1`
 *   - kvStore : `pt:marius_debug = '1'`
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

/**
 * Rendu markdown ultra-light pour les réponses Marius.
 * Supporte : paragraphes, listes (- ou *), **gras**, `code inline`.
 * Tolère le streaming partiel.
 */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);
    let firstIdx = Number.POSITIVE_INFINITY;
    let kind: 'bold' | 'code' | null = null;
    if (boldMatch && boldMatch.index !== undefined && boldMatch.index < firstIdx) {
      firstIdx = boldMatch.index;
      kind = 'bold';
    }
    if (codeMatch && codeMatch.index !== undefined && codeMatch.index < firstIdx) {
      firstIdx = codeMatch.index;
      kind = 'code';
    }
    if (kind === null) {
      parts.push(<React.Fragment key={key}>{remaining}</React.Fragment>);
      break;
    }
    if (firstIdx > 0) {
      parts.push(<React.Fragment key={key++}>{remaining.slice(0, firstIdx)}</React.Fragment>);
    }
    if (kind === 'bold' && boldMatch) {
      parts.push(<b key={key++}>{boldMatch[1]}</b>);
      remaining = remaining.slice(firstIdx + boldMatch[0].length);
    } else if (kind === 'code' && codeMatch) {
      parts.push(<code key={key++}>{codeMatch[1]}</code>);
      remaining = remaining.slice(firstIdx + codeMatch[0].length);
    }
  }
  return <>{parts}</>;
}

function renderMariusMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];

  const flushList = () => {
    if (currentList.length === 0) return;
    elements.push(
      <ul key={`ul-${elements.length}`}>
        {currentList.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    currentList = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trimStart();
    const isItem = /^[-*]\s+/.test(trimmed);
    if (isItem) {
      currentList.push(trimmed.replace(/^[-*]\s+/, ''));
    } else if (trimmed === '') {
      flushList();
    } else {
      flushList();
      elements.push(<p key={`p-${elements.length}`}>{renderInline(trimmed)}</p>);
    }
  });
  flushList();

  return <>{elements}</>;
}

// ---- Styles inline alignés sur le mockup v76 (.marius-head / .marius-avatar
//      / .typing). Classes inexistantes côté CSS → inline (mission interdit
//      de toucher au CSS). Tailles compactées pour le format flyout.

const flyoutStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 80,
  right: 16,
  zIndex: 50,
  width: 340,
  maxHeight: 540,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  borderRadius: 18,
  background: 'var(--pt-bg)',
  border: '1px solid var(--pt-line-strong)',
  boxShadow: '0 24px 48px rgba(20,20,20,0.18), 0 8px 24px rgba(20,20,20,0.10)',
};

const headStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 14px',
  borderBottom: '1px solid var(--pt-line)',
  background: 'var(--pt-bg)',
  flexShrink: 0,
};

const headBtnStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: '1px solid var(--pt-line-strong)',
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--pt-ink)',
  cursor: 'pointer',
  flexShrink: 0,
  padding: 0,
};

const orbStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  objectFit: 'cover',
  flexShrink: 0,
  boxShadow: '0 0 12px rgba(52, 211, 153, 0.5)',
};

const headTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-display)',
  fontWeight: 900,
  fontSize: 16,
  textTransform: 'uppercase',
  letterSpacing: '-0.005em',
  lineHeight: 1,
  color: 'var(--pt-ink)',
};

const headSubStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: 'var(--pt-subtle)',
  marginTop: 3,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const headDotStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: 99,
  background: 'var(--pt-success)',
  boxShadow: '0 0 0 3px rgba(74,122,47,0.18)',
};

const chatStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '14px 14px 10px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  background: 'var(--pt-bg-app)',
  minHeight: 200,
};

const typingStyle: React.CSSProperties = {
  alignSelf: 'flex-start',
  display: 'flex',
  gap: 4,
  padding: '13px 14px',
  background: 'var(--pt-bg)',
  border: '1px solid var(--pt-line)',
  borderRadius: 14,
  borderBottomLeftRadius: 6,
};

const tdotStyle = (delay: number): React.CSSProperties => ({
  width: 6,
  height: 6,
  borderRadius: 99,
  background: 'var(--pt-subtle)',
  animation: `tdot 1.2s infinite ease-in-out`,
  animationDelay: `${delay}s`,
});

const TypingDots: React.FC = () => (
  <div style={typingStyle} aria-label="Marius rédige">
    <span style={tdotStyle(0)} />
    <span style={tdotStyle(0.18)} />
    <span style={tdotStyle(0.36)} />
  </div>
);

export const ChatbotWidget: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [lastInjectedContext, setLastInjectedContext] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Snapshot ferme pour enrichir le user message avant chaque envoi à Marius.
  const farm = useFarm();
  const { userName } = useAuth();
  const debugEnabled = isMariusDebug();

  useEffect(() => {
    const openHandler = () => setOpen(true);
    const closeHandler = () => {
      abortRef.current?.abort();
      setOpen(false);
    };
    window.addEventListener('open-chatbot', openHandler);
    window.addEventListener('close-chatbot', closeHandler);
    return () => {
      window.removeEventListener('open-chatbot', openHandler);
      window.removeEventListener('close-chatbot', closeHandler);
    };
  }, []);

  // V72 — Suggestions DYNAMIQUES dérivées du snapshot ferme.
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
    [
      farm.nomFerme,
      farm.pays,
      farm.truies,
      farm.verrats,
      farm.bandes,
      farm.stockAliment,
      farm.stockVeto,
      farm.alerts,
      farm.saillies,
    ],
  );

  useEffect(() => {
    if (open && isMariusConfigured) {
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
    setMessages((prev) => {
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
      setMessages((prev) => [
        ...prev,
        { role: 'system', content: 'Marius n\'est pas configuré sur cette instance.' },
      ]);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text },
      { role: 'assistant', content: '' },
    ]);
    setInput('');
    setLoading(true);
    setStreaming(false);

    try {
      // Marius RAG — préfixe le user message avec un bloc CONTEXTE FERME pour
      // ancrer la réponse sur les données réelles. L'UI affiche l'original.
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
              const openaiDelta = parsed.choices?.[0]?.delta?.content;
              if (typeof openaiDelta === 'string') {
                chunk = openaiDelta;
              } else if (typeof parsed.content === 'string') {
                chunk = parsed.content;
              } else if (parsed.choices?.[0]?.finish_reason) {
                continue;
              } else {
                continue;
              }
            } catch {
              // Texte brut hors JSON
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
      const errMsg = (err as { message?: string }).message ?? '';
      const status = (err as { status?: number }).status;
      let userMsg = 'Marius est temporairement indisponible. Réessaye dans quelques minutes.';
      if (status === 429 || /429|quota|rate.?limit/i.test(errMsg)) {
        userMsg = 'Marius reçoit beaucoup de questions en ce moment. Réessaye dans 1-2 minutes.';
      } else if (/CORS|network|fetch/i.test(errMsg)) {
        userMsg = 'Pas de réponse du serveur Marius. Vérifie ta connexion ou réessaye plus tard.';
      }
       
      console.error('[Marius] erreur réponse', { status, errMsg, err });
      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0 && next[next.length - 1].role === 'assistant' && !next[next.length - 1].content) {
          next.pop();
        }
        next.push({ role: 'system', content: userMsg });
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

  const handleFullscreen = () => {
    abortRef.current?.abort();
    setOpen(false);
    navigate('/marius');
  };

  if (!isMariusConfigured) return null;
  if (!open) return null;

  return (
    <div role="dialog" aria-label="Conversation avec Marius" style={flyoutStyle}>
      <div style={headStyle}>
        <img src={ORB_SRC} alt="" aria-hidden width={36} height={36} style={orbStyle} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={headTitleStyle}>Marius</div>
          <div style={headSubStyle}>
            <span style={headDotStyle} />
            Assistant IA · en ligne
          </div>
        </div>
        <button
          type="button"
          onClick={handleFullscreen}
          style={headBtnStyle}
          aria-label="Continuer la conversation en plein écran"
          title="Plein écran"
        >
          <Maximize2 size={13} />
        </button>
        <button
          type="button"
          onClick={handleClose}
          style={headBtnStyle}
          aria-label="Fermer la conversation"
          title="Fermer"
        >
          <X size={14} />
        </button>
      </div>

      <div aria-live="polite" style={chatStyle}>
        {messages.length === 0 && (
          <>
            <div className="bubble bubble--marius">
              <h4>Bonjour {(userName || 'éleveur').split(' ')[0]}</h4>
              <p>Pose-moi une question sur ton élevage.</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '4px 0 2px' }}>
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="suggestion"
                  onClick={() => {
                    setInput(s.question);
                    setTimeout(() => formRef.current?.requestSubmit(), 0);
                  }}
                >
                  {s.question}
                </button>
              ))}
            </div>
          </>
        )}
        {messages.map((m, i) => {
          if (m.role === 'system') {
            return (
              <div
                key={i}
                style={{
                  alignSelf: 'center',
                  fontSize: 12,
                  color: 'var(--pt-muted)',
                  background: 'var(--pt-bg)',
                  border: '1px solid var(--pt-line)',
                  borderRadius: 10,
                  padding: '6px 10px',
                  maxWidth: '90%',
                  textAlign: 'center',
                }}
              >
                {m.content}
              </div>
            );
          }
          if (m.role === 'user') {
            return (
              <div key={i} className="bubble bubble--user">
                {m.content}
              </div>
            );
          }
          return (
            <div key={i} className="bubble bubble--marius">
              {m.content ? renderMariusMarkdown(m.content) : null}
            </div>
          );
        })}
        {loading && !streaming && <TypingDots />}
        {debugEnabled && lastInjectedContext && (
          <details
            className="mt-3 mx-1 text-[10px] rounded-lg p-2 ft-code"
            style={{
              background: 'var(--pt-bg)',
              color: 'var(--pt-muted)',
              border: '1px dashed var(--pt-line)',
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
        ref={formRef}
        onSubmit={handleSubmit}
        className="composer"
        style={{ padding: '10px 14px 12px' }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Demande à Marius…"
          aria-label="Votre question pour Marius"
          disabled={loading}
          className="composer__field"
          style={{
            outline: 'none',
            fontFamily: 'var(--pt-font-body)',
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Envoyer"
          title="Envoyer"
          className="composer__send"
        >
          <ArrowUp size={16} />
        </button>
      </form>
    </div>
  );
};
