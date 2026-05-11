import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, ChevronLeft, X, CloudOff, RefreshCw } from 'lucide-react';
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

const ORB_SRC = '/images/v73/marius/orb-emeraude.webp';

/**
 * Rendu markdown ultra-light :
 *   - paragraphes, listes `- ...`, **gras**, `code inline`
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

// Styles inline alignés sur le mockup v76 (.marius-head / .marius-avatar /
// .chat / .typing). Ces classes ne sont pas dans v70-global.css → on inline
// ici (la mission interdit de toucher au CSS).

const headStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '14px 18px',
  borderBottom: '1px solid var(--pt-line)',
  background: 'var(--pt-bg)',
  flexShrink: 0,
  position: 'sticky',
  top: 0,
  zIndex: 10,
};

const headBtnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
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
  boxShadow: '0 0 14px rgba(52, 211, 153, 0.55)',
};

const headTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-display)',
  fontWeight: 900,
  fontSize: 18,
  textTransform: 'uppercase',
  letterSpacing: '-0.005em',
  lineHeight: 1,
  color: 'var(--pt-ink)',
};

const headSubStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-mono)',
  fontSize: 10.5,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: 'var(--pt-subtle)',
  marginTop: 3,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const headDotStyle = (online: boolean): React.CSSProperties => ({
  width: 6,
  height: 6,
  borderRadius: 99,
  background: online ? 'var(--pt-success)' : 'var(--pt-subtle)',
  boxShadow: online
    ? '0 0 0 3px rgba(74,122,47,0.18)'
    : '0 0 0 3px rgba(163,152,136,0.2)',
});

const chatStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '18px 18px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  background: 'var(--pt-bg-app)',
};

const chatTsStyle: React.CSSProperties = {
  alignSelf: 'center',
  fontFamily: 'var(--pt-font-mono)',
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: 'var(--pt-subtle)',
  padding: '6px 10px',
  marginTop: 6,
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
      alignItems: 'flex-start',
      gap: 12,
      margin: 16,
      width: 'calc(100% - 32px)',
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
        marginBottom: 4,
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
        fontSize: 13.5,
        color: 'rgba(245,233,216,0.78)',
        lineHeight: 1.5,
        margin: 0,
      }}
    >
      Reconnecte-toi à internet ou réessaie dans quelques minutes. Tes données restent enregistrées localement.
    </p>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6, width: '100%' }}>
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
          border: '1px solid rgba(245,233,216,0.32)',
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

function formatTimestamp(d: Date): string {
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `Aujourd'hui · ${hh}:${mm}`;
}

export const MariusChatFullscreen: React.FC = () => {
  const navigate = useNavigate();
  const farm = useFarm();
  const { userName } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [offline, setOffline] = useState(false);
  const [openedAt] = useState(() => new Date());

  const fieldRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Suggestions dynamiques + fallback (mêmes règles que ChatbotWidget).
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

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming, loading]);

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

  const inputHasContent = input.trim().length > 0 && !loading;
  const online = !offline;

  // Pas de wrapper `.pt-screen` ici : `.pt-screen .bubble` (badge notif 22px)
  // entre en collision avec `.bubble` (chat) côté CSS — mieux vaut un
  // container neutre pour préserver les bubbles chat.
  const renderHeader = (subtitle: string) => (
    <div style={headStyle}>
      <button
        type="button"
        onClick={handleClose}
        style={headBtnStyle}
        aria-label="Retour"
        title="Retour"
      >
        <ChevronLeft size={14} />
      </button>
      <img src={ORB_SRC} alt="" aria-hidden width={36} height={36} style={orbStyle} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={headTitleStyle}>Marius</div>
        <div style={headSubStyle}>
          <span style={headDotStyle(online)} />
          {subtitle}
        </div>
      </div>
      <button
        type="button"
        onClick={handleClose}
        style={headBtnStyle}
        aria-label="Fermer Marius"
        title="Fermer"
      >
        <X size={14} />
      </button>
    </div>
  );

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
        {renderHeader('Hors-ligne')}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MariusOffline onRetry={handleRetry} onClose={handleClose} />
        </div>
      </div>
    );
  }

  const headerSubtitle = offline ? 'Hors-ligne' : 'Assistant IA · en ligne';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--pt-bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {renderHeader(headerSubtitle)}

      {offline ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MariusOffline onRetry={handleRetry} onClose={handleClose} />
        </div>
      ) : (
        <>
          <div ref={scrollRef} aria-live="polite" style={chatStyle}>
            <div style={chatTsStyle}>{formatTimestamp(openedAt)}</div>

            {messages.length === 0 && (
              <div className="bubble bubble--marius">
                <h4>Bonjour {(userName || 'éleveur').split(' ')[0]}</h4>
                <p>
                  Pose-moi une question sur ton élevage. Je lis ton cheptel, tes bandes, tes
                  stocks et tes alertes en temps réel.
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
                  <div key={m.id} className="bubble bubble--user">
                    {m.content}
                  </div>
                );
              }
              return (
                <div key={m.id} className="bubble bubble--marius">
                  {m.content ? renderMarkdown(m.content) : null}
                </div>
              );
            })}

            {loading && !streaming && <TypingDots />}
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

          <div className="composer">
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
              title="Envoyer"
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
