/**
 * V70 — Page Synchronisation (route /reglages/sync)
 *
 * Mission V72 — File d'attente offline visible : éleveur peut voir les
 * actions en attente, retry individuel ou bulk, vider la file, consulter
 * les actions échouées (archive).
 *
 * Pas de nouvelle dépendance UI — DS V70 strict (tokens var(--pt-*),
 * Lucide icons, pas d'emoji).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trash2, AlertTriangle, CheckCircle2, ChevronRight, Cloud, CloudOff } from 'lucide-react';
import { PageHeader } from '../components/ds/PageHeader';
import { Section } from '../components/ds/Section';
import {
  flushQueue,
  getQueueItems,
  getArchivedItems,
  retryItem,
  retryAll,
  clearQueue,
  clearArchive,
  isOnline,
  type QueueItem,
  type ArchivedQueueItem,
  type QueuedMutation,
} from '../../services/offlineQueue';

const POLL_INTERVAL_MS = 1500;

function formatMutationLabel(m: QueuedMutation): string {
  const tableLabels: Record<string, string> = {
    sows: 'Truie',
    boars: 'Verrat',
    batches: 'Bande',
    notes: 'Note',
    health_logs: 'Santé',
    saillies: 'Saillie',
    finances: 'Finance',
    produits_aliments: 'Aliment',
    produits_veto: 'Vétérinaire',
    pesees: 'Pesée',
    porcelets_individuels: 'Porcelet',
    loges: 'Loge',
    loge_movements: 'Mouvement loge',
    daily_checks_mb: 'Check maternité',
    weight_distributions: 'Distribution poids',
    feed_consumption_logs: 'Consommation aliment',
  };
  const table = tableLabels[m.table] ?? m.table;
  switch (m.kind) {
    case 'insert':
      return `Création ${table}`;
    case 'update':
      return `Modification ${table}`;
    case 'updateByCode':
      return `Modification ${table} (code)`;
    case 'delete':
      return `Suppression ${table}`;
  }
}

function formatRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return iso;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `il y a ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d}j`;
}

interface ItemStatus {
  label: string;
  color: string;
  bg: string;
}

function statusForItem(it: QueueItem): ItemStatus {
  if (it.tries === 0) {
    return { label: 'En attente', color: 'var(--pt-muted)', bg: 'var(--pt-bg-app)' };
  }
  if (typeof it.nextAttemptAt === 'number' && it.nextAttemptAt > Date.now()) {
    const wait = Math.max(0, Math.ceil((it.nextAttemptAt - Date.now()) / 1000));
    return {
      label: `Retry ${it.tries}/5 dans ${wait < 60 ? `${wait}s` : `${Math.ceil(wait / 60)}min`}`,
      color: '#92400e',
      bg: '#fef3c7',
    };
  }
  return {
    label: `Retry ${it.tries}/5`,
    color: '#92400e',
    bg: '#fef3c7',
  };
}

export const SynchronisationV70: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<QueueItem[]>(() => getQueueItems());
  const [archive, setArchive] = useState<ArchivedQueueItem[]>(() => getArchivedItems());
  const [online, setOnline] = useState<boolean>(() => isOnline());
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    setItems(getQueueItems());
    setArchive(getArchivedItems());
    setOnline(isOnline());
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, POLL_INTERVAL_MS);
    const onOnline = () => refresh();
    const onOffline = () => refresh();
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [refresh]);

  const handleRetryAll = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await retryAll();
      await flushQueue();
    } catch (e) {
      console.warn('[SynchronisationV70] retry all failed', e);
    } finally {
      setBusy(false);
      refresh();
    }
  }, [busy, refresh]);

  const handleRetryOne = useCallback(async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await retryItem(id);
      await flushQueue();
    } finally {
      setBusy(false);
      refresh();
    }
  }, [busy, refresh]);

  const handleClearQueue = useCallback(async () => {
    if (busy) return;
    if (!window.confirm('Vider la file ? Les actions en attente seront perdues définitivement.')) return;
    setBusy(true);
    try {
      await clearQueue();
    } finally {
      setBusy(false);
      refresh();
    }
  }, [busy, refresh]);

  const handleClearArchive = useCallback(async () => {
    if (busy) return;
    if (!window.confirm("Effacer l'historique des erreurs ?")) return;
    setBusy(true);
    try {
      await clearArchive();
    } finally {
      setBusy(false);
      refresh();
    }
  }, [busy, refresh]);

  const totalPending = items.length;
  const totalErrors = items.filter((i) => i.tries > 0).length;

  return (
    <div
      className="phone-content"
      style={{ padding: 24, maxWidth: 600, margin: '0 auto', minHeight: '100%' }}
    >
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Retour"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'transparent',
          border: 'none',
          color: 'var(--pt-muted)',
          fontSize: 13,
          padding: '4px 0',
          marginBottom: 8,
          cursor: 'pointer',
        }}
      >
        <ArrowLeft size={16} aria-hidden /> Retour
      </button>

      <PageHeader
        eyebrow="Synchronisation"
        title="File d'attente"
        subtitle={
          totalPending === 0
            ? 'Tout est synchronisé.'
            : `${totalPending} action${totalPending > 1 ? 's' : ''} en attente${totalErrors > 0 ? ` · ${totalErrors} en erreur` : ''}`
        }
      />

      {/* Bandeau état réseau */}
      <div
        role="status"
        aria-live="polite"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          borderRadius: 12,
          background: online ? 'var(--pt-bg-app)' : '#fef3c7',
          border: `1px solid ${online ? 'var(--pt-line)' : '#fde68a'}`,
          fontFamily: 'var(--pt-font-body)',
          fontSize: 13,
          color: online ? 'var(--pt-ink)' : '#92400e',
          marginBottom: 16,
        }}
      >
        {online ? (
          <Cloud size={16} aria-hidden color="var(--pt-primary, #064e3b)" />
        ) : (
          <CloudOff size={16} aria-hidden color="#92400e" />
        )}
        <span>
          {online ? 'Réseau disponible' : 'Hors ligne — la file se drainera au retour réseau'}
        </span>
      </div>

      {/* Actions globales */}
      {totalPending > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleRetryAll}
            disabled={busy || !online}
            aria-label="Tout retry maintenant"
            style={btnPrimaryStyle(busy || !online)}
          >
            <RefreshCw size={14} aria-hidden /> Tout retry
          </button>
          <button
            type="button"
            onClick={handleClearQueue}
            disabled={busy}
            aria-label="Vider la file"
            style={btnDangerStyle(busy)}
          >
            <Trash2 size={14} aria-hidden /> Vider la file
          </button>
        </div>
      )}

      <Section label={totalPending > 0 ? 'Actions en attente' : 'Aucune action en attente'}>
        {totalPending === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '16px 14px',
              borderRadius: 12,
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              fontSize: 13,
            }}
          >
            <CheckCircle2 size={16} aria-hidden /> Tout est synchronisé.
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {items.map((it) => {
              const status = statusForItem(it);
              return (
                <li
                  key={it.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 0',
                    borderBottom: '1px solid var(--pt-line)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: 'var(--pt-font-display)',
                        fontWeight: 700,
                        fontSize: 14,
                        color: 'var(--pt-ink)',
                      }}
                    >
                      {formatMutationLabel(it.mutation)}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--pt-font-body)',
                        fontSize: 11,
                        color: 'var(--pt-muted)',
                        marginTop: 2,
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>{formatRelativeTime(it.timestamp)}</span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: status.bg,
                          color: status.color,
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {status.label}
                      </span>
                    </div>
                    {it.lastError && (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 11,
                          color: '#9f1239',
                          fontFamily: 'var(--pt-font-mono, monospace)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                        }}
                        title={it.lastError}
                      >
                        {it.lastError}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRetryOne(it.id)}
                    disabled={busy || !online}
                    aria-label={`Retry ${formatMutationLabel(it.mutation)}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: 'var(--pt-bg-app)',
                      border: '1px solid var(--pt-line)',
                      color: 'var(--pt-ink)',
                      fontSize: 12,
                      cursor: busy || !online ? 'not-allowed' : 'pointer',
                      opacity: busy || !online ? 0.5 : 1,
                      flexShrink: 0,
                    }}
                  >
                    <RefreshCw size={12} aria-hidden /> Retry
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* Archive */}
      <Section label={archive.length > 0 ? `Erreurs définitives (${archive.length})` : 'Aucune erreur définitive'}>
        {archive.length === 0 ? (
          <p style={{ color: 'var(--pt-muted)', fontSize: 13, marginTop: 8 }}>
            Pas d'action abandonnée. Les retries se sont tous résolus.
          </p>
        ) : (
          <>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {archive.slice().reverse().map((it) => (
                <li
                  key={it.id}
                  style={{
                    padding: '10px 0',
                    borderBottom: '1px solid var(--pt-line)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      color: '#9f1239',
                      fontFamily: 'var(--pt-font-display)',
                      fontWeight: 700,
                    }}
                  >
                    <AlertTriangle size={14} aria-hidden />
                    {formatMutationLabel(it.mutation)}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--pt-muted)',
                      marginTop: 2,
                    }}
                  >
                    Abandonnée {formatRelativeTime(it.archivedAt)}
                  </div>
                  {it.lastError && (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 11,
                        color: '#9f1239',
                        fontFamily: 'var(--pt-font-mono, monospace)',
                        wordBreak: 'break-word',
                      }}
                    >
                      {it.lastError}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={handleClearArchive}
              disabled={busy}
              aria-label="Effacer l'historique des erreurs"
              style={{
                marginTop: 12,
                ...btnDangerStyle(busy),
              }}
            >
              <Trash2 size={14} aria-hidden /> Effacer l'historique
            </button>
          </>
        )}
      </Section>

      {/* Lien diag */}
      <div style={{ marginTop: 24, fontSize: 11, color: 'var(--pt-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>Stockage local : Capacitor Preferences</span>
        <ChevronRight size={12} aria-hidden />
        <span>5 retries max · backoff 1s/5s/30s/5min/30min</span>
      </div>
    </div>
  );
};

function btnPrimaryStyle(disabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 14px',
    borderRadius: 10,
    background: 'var(--pt-primary, #064e3b)',
    color: 'white',
    border: 'none',
    fontFamily: 'var(--pt-font-body)',
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}

function btnDangerStyle(disabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 14px',
    borderRadius: 10,
    background: 'transparent',
    color: '#9f1239',
    border: '1px solid #fecdd3',
    fontFamily: 'var(--pt-font-body)',
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}

export default SynchronisationV70;
