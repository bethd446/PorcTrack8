import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, X, CloudOff, RefreshCw } from 'lucide-react';
import { useFarm } from '../../context/FarmContext';
import { useAuth } from '../../context/AuthContext';
import { MARIUS_SYSTEM_PROMPT } from './mariusSystemPrompt';
import { buildFarmContextPrompt, type FarmSnapshot } from './buildFarmContext';
import { buildMariusSuggestions } from './buildMariusSuggestions';
import { callMariusAPI, isMariusConfigured, parseSseChunk, type MariusMessage } from './mariusApi';

type Role = MariusMessage['role'];

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
}

let __mid = 0;
const newId = () => `m-${Date.now()}-${++__mid}`;

/**
 * Rendu markdown ultra-light (pas de lib externe, suit la mission du Sprint 7) :
 *   - paragraphes
 *   - listes `- ...` ou `* ...`
 *   - **gras**
 *   - `code inline`
 * Tolère le streaming partiel.
 */
function renderInline(text: string): React.ReactNode {
  // Split sur **bold** et `code` simultanément, conserver l'ordre.
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

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let listBuf: string[] = [];

  const flushList = () => {
    if (listBuf.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`}>
        {listBuf.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    listBuf = [];
  };

  for (const raw of lines) {
    const line = raw.trimStart();
    const isItem = /^[-*]\s+/.test(line);
    if (isItem) {
      listBuf.push(line.replace(/^[-*]\s+/, ''));
      continue;
    }
    if (line === '') {
      flushList();
      continue;
    }
    flushList();
    blocks.push(<p key={`p-${blocks.length}`}>{renderInline(line)}</p>);
  }
  flushList();
  return <>{blocks}</>;
}

interface OfflineCardProps {
  onRetry: () => void;
  onClose: () => void;
}

const MariusOffline: React.FC<OfflineCardProps> = ({ onRetry, onClose }) => (
  <div
    className="card-ink"
    style={{
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: 12,
      margin: 16,
    }}
  >
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 14,
        background: 'rgba(245,233,216,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CloudOff size={28} color="var(--pt-accent-light)" />
    </div>
    <div
      className="eyebrow"
      style={{
        fontFamily: 'var(--pt-font-mono)',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        color: 'var(--pt-accent-light)',
      }}
    >
      Marius · Indisponible
    </div>
    <h3
      style={{
        fontFamily: 'var(--pt-font-display)',
        fontWeight: 900,
        fontSize: 18,
        textTransform: 'uppercase',
        letterSpacing: '-0.005em',
        color: 'var(--pt-warm)',
        margin: 0,
      }}
    >
      Marius est temporairement injoignable
    </h3>
    <p
      style={{
        fontSize: 13,
        color: 'rgba(245,233,216,0.78)',
        lineHeight: 1.5,
        margin: 0,
        maxWidth: '32ch',
      }}
    >
      Reconnecte-toi à internet ou réessaie dans quelques minutes. Tes données restent enregistrées localement.
    </p>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8, width: '100%' }}>
      <button
        type="button"
        onClick={onRetry}
        style={{
          background: 'var(--pt-warm)',
          color: 'var(--pt-ink)',
          border: 'none',
          borderRadius: 10,
          padding: '10px 12px',
          fontFamily: 'var(--pt-font-mono)',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          cursor: 'pointer',
        }}
      >
        <RefreshCw size={13} />
        Réessayer
      </button>
      <button
        type="button"
        onClick={onClose}
        style={{
          background: 'transparent',
          color: 'var(--pt-warm)',
          border: '1px solid rgba(245,233,216,0.3)',
          borderRadius: 10,
          padding: '10px 12px',
          fontFamily: 'var(--pt-font-mono)',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          cursor: 'pointer',
        }}
      >
        Continuer sans
      </button>
    </div>
  </div>
);

const FALLBACK_SUGGESTIONS = [
  'Quelles truies surveiller aujourd’hui ?',
  'Pourquoi mortalité allaitement haute ?',
  'T-026 · prête pour mise-bas ?',
  'Plan d’aliment optimal mai ?',
];

export const MariusChatFullscreen: React.FC = () => {
  const navigate = useNavigate();
  const farm = useFarm();
  const { userName } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [offline, setOffline] = useState(false);

  const fieldRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Suggestions dynamiques (mêmes règles que ChatbotWidget). Fallback sur les
  // 4 questions fournies par la mission Sprint 7 si aucune règle métier ne sort.
  const suggestions = useMemo(() => {
    const dyn = buildMariusSuggestions(
      {
        nomFerme: farm.nomFerme,
        pays: farm.pays,
        truies: farm.truies,
        verrats: farm.verrats,
        bandes: farm.bandes,
        stockAliment: farm.stockAliment,
        stockVeto: farm.stockVeto,
        alerts: farm.alerts,
        saillies: farm.saillies,
      },
      { max: 4 },
    ).map((s) => s.question);
    return dyn.length >= 3 ? dyn.slice(0, 4) : FALLBACK_SUGGESTIONS;
  }, [
    farm.nomFerme,
    farm.pays,
    farm.truies,
    farm.verrats,
    farm.bandes,
    farm.stockAliment,
    farm.stockVeto,
    farm.alerts,
    farm.saillies,
  ]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // Auto-scroll vers le bas à chaque nouveau message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

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

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      if (!isMariusConfigured) {
        setOffline(true);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMsg: ChatMessage = { id: newId(), role: 'user', content: trimmed };
      const assistantStub: ChatMessage = { id: newId(), role: 'assistant', content: '' };

      setMessages((prev) => [...prev, userMsg, assistantStub]);
      setInput('');
      if (fieldRef.current) fieldRef.current.textContent = '';
      setLoading(true);
      setStreaming(false);
      setOffline(false);

      try {
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
        const enriched = `${farmContext}\n\nQuestion utilisateur : ${trimmed}`;

        const history: MariusMessage[] = [
          ...messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: enriched },
        ].slice(-8);

        const response = await callMariusAPI(history, MARIUS_SYSTEM_PROMPT, controller.signal);

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
              const chunk = parseSseChunk(data);
              if (chunk === '[DONE]') {
                setLoading(false);
                setStreaming(false);
                return;
              }
              if (chunk === null) continue;
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
        // eslint-disable-next-line no-console
        console.error('[Marius] erreur', err);
        // Retire la stub assistant vide.
        setMessages((prev) => {
          const next = [...prev];
          if (next.length > 0 && next[next.length - 1].role === 'assistant' && !next[next.length - 1].content) {
            next.pop();
          }
          return next;
        });
        setOffline(true);
      } finally {
        setLoading(false);
        setStreaming(false);
      }
    },
    [appendToLastAssistant, farm, loading, messages, userName],
  );

  const handleSend = useCallback(() => {
    const value = fieldRef.current?.textContent ?? input;
    void sendMessage(value);
  }, [input, sendMessage]);

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    setInput(e.currentTarget.textContent ?? '');
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleClose = useCallback(() => {
    abortRef.current?.abort();
    navigate(-1);
  }, [navigate]);

  const handleRetry = useCallback(() => {
    setOffline(false);
  }, []);

  const inputHasContent = (input.trim().length > 0) && !loading;

  if (!isMariusConfigured) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--pt-bg)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--pt-line)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'var(--pt-bg)',
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fermer"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--pt-muted)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
          <div
            style={{
              fontFamily: 'var(--pt-font-display)',
              fontWeight: 900,
              fontSize: 18,
              textTransform: 'uppercase',
              color: 'var(--pt-ink)',
            }}
          >
            Marius
          </div>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MariusOffline onRetry={handleRetry} onClose={handleClose} />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--pt-bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--pt-line)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          position: 'sticky',
          top: 0,
          background: 'var(--pt-bg)',
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fermer Marius"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--pt-muted)',
            display: 'flex',
            alignItems: 'center',
            padding: 4,
          }}
        >
          <X size={18} />
        </button>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 99,
            background: 'var(--pt-accent)',
            color: 'var(--pt-warm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--pt-font-display)',
            fontWeight: 900,
            fontSize: 18,
          }}
          aria-hidden
        >
          M
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--pt-font-display)',
              fontWeight: 900,
              textTransform: 'uppercase',
              fontSize: 18,
              color: 'var(--pt-ink)',
              lineHeight: 1,
            }}
          >
            Marius
          </div>
          <div
            style={{
              fontFamily: 'var(--pt-font-mono)',
              fontSize: 10,
              color: 'var(--pt-subtle)',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              marginTop: 3,
            }}
          >
            {offline
              ? 'Hors-ligne'
              : 'Assistant IA · ton élevage en temps réel'}
          </div>
        </div>
      </header>

      {offline ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MariusOffline onRetry={handleRetry} onClose={handleClose} />
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            aria-live="polite"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: 16,
              paddingBottom: 24,
              overflowY: 'auto',
            }}
          >
            {messages.length === 0 && (
              <div
                className="bubble bubble--marius"
                style={{ alignSelf: 'flex-start' }}
              >
                <h4>Bonjour {(userName || 'éleveur').split(' ')[0]}</h4>
                <p>
                  Pose-moi une question sur ton élevage. Je lis ton cheptel, tes bandes,
                  tes stocks et tes alertes en temps réel.
                </p>
              </div>
            )}
            {messages.map((m) => {
              if (m.role === 'system') {
                return (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: 'center',
                      fontSize: 12,
                      color: 'var(--pt-muted)',
                      background: 'var(--pt-bg-app)',
                      borderRadius: 8,
                      padding: '6px 10px',
                      maxWidth: '90%',
                      textAlign: 'center',
                    }}
                  >
                    {m.content}
                  </div>
                );
              }
              return (
                <div key={m.id} className={`bubble bubble--${m.role === 'user' ? 'user' : 'marius'}`}>
                  {m.content
                    ? m.role === 'assistant'
                      ? renderMarkdown(m.content)
                      : m.content
                    : null}
                </div>
              );
            })}
            {loading && !streaming && (
              <div className="bubble bubble--marius" aria-label="Marius rédige">
                <span style={{ display: 'inline-flex', gap: 4 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 99,
                      background: 'var(--pt-muted)',
                      animation: 'tdot 1.2s infinite',
                      animationDelay: '0s',
                    }}
                  />
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 99,
                      background: 'var(--pt-muted)',
                      animation: 'tdot 1.2s infinite',
                      animationDelay: '0.15s',
                    }}
                  />
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 99,
                      background: 'var(--pt-muted)',
                      animation: 'tdot 1.2s infinite',
                      animationDelay: '0.3s',
                    }}
                  />
                </span>
              </div>
            )}
          </div>

          {messages.length === 0 && (
            <div className="suggestions">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="suggestion"
                  onClick={() => void sendMessage(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="composer" style={{ position: 'sticky', bottom: 0 }}>
            <div
              ref={fieldRef}
              role="textbox"
              aria-label="Demande à Marius"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Demande à Marius…"
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              className="composer__field"
            />
            <button
              type="button"
              className="composer__send"
              disabled={!inputHasContent}
              onClick={handleSend}
              aria-label="Envoyer"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MariusChatFullscreen;
