import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Eye, Clock, AlertCircle } from 'lucide-react';
import {
  getPendingValidations,
  validateAction,
  rejectAction,
  type PendingValidation,
} from '../../services/validationWorkflow';
import { useAuth } from '../../context/AuthContext';

const CARD_STYLE: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--radius-card)',
  boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04), 0 1px 3px rgba(17, 24, 39, 0.06)',
  overflow: 'hidden',
};

const SECTION_HEADER_STYLE: React.CSSProperties = {
  padding: '14px 20px',
  borderBottom: '1px solid var(--line-2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};

const SECTION_TITLE_STYLE: React.CSSProperties = {
  fontFamily: 'DMMono, ui-monospace, monospace',
  fontSize: 11,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--ink-soft)',
  fontWeight: 500,
};

const COUNT_PILL_STYLE: React.CSSProperties = {
  fontFamily: 'DMMono, ui-monospace, monospace',
  fontSize: 11,
  padding: '3px 10px',
  borderRadius: 'var(--radius-pill)',
  background: 'var(--amber-pork-soft, #fde7d3)',
  color: 'var(--amber-pork-deep, #c2662b)',
  fontWeight: 500,
};

const TYPE_LABEL: Record<PendingValidation['type'], string> = {
  MORTALITE: 'MORTALITÉ',
  VENTE: 'VENTE',
  SOIN: 'SOIN',
  BATCH: 'BANDE',
  FINANCE: 'FINANCE',
};

function formatRelative(iso: string): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const diffSec = Math.floor((Date.now() - t) / 1000);
  if (diffSec < 60) return 'à l\'instant';
  if (diffSec < 3600) return `il y a ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `il y a ${Math.floor(diffSec / 3600)} h`;
  if (diffSec < 86400 * 2) return 'hier';
  return `il y a ${Math.floor(diffSec / 86400)} j`;
}

function navigateToTarget(
  navigate: ReturnType<typeof useNavigate>,
  item: PendingValidation,
): void {
  if (item.table === 'batches') {
    const code = (item.data as { code_id?: string }).code_id;
    if (code) navigate(`/bandes/${encodeURIComponent(code)}`);
    else navigate('/bandes');
  } else if (item.table === 'health_logs') {
    const animalCode = (item.data as { animal_code?: string }).animal_code;
    if (animalCode) navigate(`/bandes/${encodeURIComponent(animalCode)}`);
    else navigate('/sante');
  } else {
    navigate('/finances');
  }
}

interface PendingValidationsViewProps {
  /** Si fourni, affichage en mode embedded (sans header). */
  embedded?: boolean;
  /** Callback appelé après chaque action (pour refresh externe). */
  onChange?: () => void;
}

export default function PendingValidationsView({ embedded, onChange }: PendingValidationsViewProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const approverId = user?.id ?? null;

  const [items, setItems] = useState<PendingValidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getPendingValidations();
      setItems(list);
    } catch (e) {
      console.error('[PendingValidationsView] load failed', e);
      setError('Impossible de charger les actions en attente.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  };

  const handleValidate = async (item: PendingValidation) => {
    if (!approverId) {
      showToast('Session invalide. Reconnecte-toi.');
      return;
    }
    setActingId(item.id);
    try {
      await validateAction(item.table, item.id, approverId);
      setItems((prev) => prev.filter((x) => x.id !== item.id));
      showToast(`Action validée — ${TYPE_LABEL[item.type]}`);
      onChange?.();
    } catch (e) {
      console.error('[PendingValidationsView] validate failed', e);
      showToast('Erreur de validation.');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (item: PendingValidation) => {
    if (!approverId) {
      showToast('Session invalide. Reconnecte-toi.');
      return;
    }
    const reason = window.prompt('Motif du rejet (optionnel) :') ?? undefined;
    setActingId(item.id);
    try {
      await rejectAction(item.table, item.id, approverId, reason);
      setItems((prev) => prev.filter((x) => x.id !== item.id));
      showToast(`Action rejetée — ${TYPE_LABEL[item.type]}`);
      onChange?.();
    } catch (e) {
      console.error('[PendingValidationsView] reject failed', e);
      showToast('Erreur de rejet.');
    } finally {
      setActingId(null);
    }
  };

  const content = (
    <div>
      <div style={SECTION_HEADER_STYLE}>
        <span style={SECTION_TITLE_STYLE}>À valider</span>
        <span style={COUNT_PILL_STYLE}>{items.length}</span>
      </div>

      {loading && (
        <p style={{ padding: '32px 24px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
          Chargement…
        </p>
      )}

      {!loading && error && (
        <p
          role="alert"
          style={{
            padding: '16px 24px',
            fontSize: 13,
            color: 'var(--color-pig-deep, #c0392b)',
            background: 'var(--color-pig-soft, #fdecea)',
          }}
        >
          {error}
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <div
          data-testid="pending-empty"
          style={{
            padding: '40px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            color: 'var(--muted)',
            fontSize: 13,
          }}
        >
          <Check size={28} strokeWidth={1.5} color="var(--color-accent-500)" />
          <span>Aucune action en attente.</span>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map((item, i) => (
            <li
              key={`${item.table}:${item.id}`}
              data-testid="pending-item"
              style={{
                padding: '14px 20px',
                borderBottom: i < items.length - 1 ? '1px solid var(--line-2)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontFamily: 'DMMono, ui-monospace, monospace',
                    fontSize: 10,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--amber-pork-deep, #c2662b)',
                    background: 'var(--amber-pork-soft, #fde7d3)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                    fontWeight: 600,
                  }}
                >
                  {TYPE_LABEL[item.type]}
                </span>
                <span
                  style={{
                    fontFamily: 'DMMono, ui-monospace, monospace',
                    fontSize: 11,
                    color: 'var(--muted)',
                    marginLeft: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Clock size={11} strokeWidth={1.75} />
                  {formatRelative(item.saisi_le)}
                </span>
              </div>

              <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.4 }}>
                {item.subject}
              </div>

              <div
                style={{
                  fontFamily: 'DMMono, ui-monospace, monospace',
                  fontSize: 11,
                  color: 'var(--muted)',
                }}
              >
                Saisi par {item.saisi_par}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                <button
                  type="button"
                  aria-label={`Valider ${TYPE_LABEL[item.type]}`}
                  disabled={actingId === item.id}
                  onClick={() => handleValidate(item)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-pill)',
                    border: 'none',
                    fontFamily: 'DMMono, ui-monospace, monospace',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    cursor: actingId === item.id ? 'not-allowed' : 'pointer',
                    background: 'var(--color-accent-500)',
                    color: '#fff',
                    opacity: actingId === item.id ? 0.5 : 1,
                  }}
                >
                  <Check size={12} strokeWidth={2} />
                  Valider
                </button>

                <button
                  type="button"
                  aria-label={`Rejeter ${TYPE_LABEL[item.type]}`}
                  disabled={actingId === item.id}
                  onClick={() => handleReject(item)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid var(--color-pig, #f5c6c0)',
                    fontFamily: 'DMMono, ui-monospace, monospace',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    cursor: actingId === item.id ? 'not-allowed' : 'pointer',
                    background: 'var(--color-pig-soft, #fdecea)',
                    color: 'var(--color-pig-deep, #c0392b)',
                    opacity: actingId === item.id ? 0.5 : 1,
                  }}
                >
                  <X size={12} strokeWidth={2} />
                  Rejeter
                </button>

                <button
                  type="button"
                  aria-label="Voir détails"
                  onClick={() => navigateToTarget(navigate, item)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid var(--line)',
                    fontFamily: 'DMMono, ui-monospace, monospace',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    background: 'transparent',
                    color: 'var(--ink-soft)',
                  }}
                >
                  <Eye size={12} strokeWidth={1.75} />
                  Détails
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 18px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--ink, #111827)',
            color: '#fff',
            fontSize: 13,
            zIndex: 1000,
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );

  if (embedded) {
    return <div style={CARD_STYLE}>{content}</div>;
  }

  return (
    <section style={CARD_STYLE} aria-label="Actions en attente de validation">
      <div
        style={{
          padding: '12px 20px',
          background: 'var(--amber-pork-soft, #fde7d3)',
          borderBottom: '1px solid var(--line-2)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--amber-pork-deep, #c2662b)',
          fontSize: 12,
        }}
      >
        <AlertCircle size={14} strokeWidth={1.75} />
        <span style={{ fontFamily: 'DMMono, ui-monospace, monospace', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>
          Validation requise
        </span>
      </div>
      {content}
    </section>
  );
}
