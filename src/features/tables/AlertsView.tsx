/**
 * AlertsView — Refonte v6 « Terrain Vivant » (2026-04-30)
 * ══════════════════════════════════════════════════════════════════
 * Light surface (--bg-app), tokens v6, KpiCard sparklines, Eyebrow,
 * TopBarSync, TimelineVerticale-like row markers.
 *
 * Logique métier préservée :
 *   - useFarm/usePilotage/useMeta inchangés
 *   - getPendingConfirmations + ConfirmationModal inchangés
 *   - alertEngine (FarmAlert) + alertesServeur (Sheets) inchangés
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  IonPage, IonContent,
  IonRefresher, IonRefresherContent,
} from '@ionic/react';
import {
  Bell, Heart, Package, Layers, Box,
  CheckCircle2, Clock, Server, AlertOctagon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { useMeta } from '../../context/FarmContext';
import { usePilotage } from '../../context/PilotageContext';
import AgritechLayout from '../../components/AgritechLayout';
import KpiCardV6 from '../../components/design/KpiCard';
import Eyebrow from '../../components/design/Eyebrow';
import TopBarSync from '../../components/design/TopBarSync';
import { type FarmAlert, type AlertPriority, type AlertCategory } from '../../services/alertEngine';
import { ALERT_PRIORITY_COLOR as PRIORITY_COLOR, ALERT_PRIORITY_BG as PRIORITY_BG } from '../../utils/alertColors';
import { getPendingConfirmations, type PendingConfirmation } from '../../services/confirmationQueue';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import type { AlerteServeur } from '../../types/farm';

// ─────────────────────────────────────────────────────────────────────────────
// Filter chips
// ─────────────────────────────────────────────────────────────────────────────

type FilterId = 'ALL' | AlertCategory;

interface FilterDef {
  id: FilterId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const FILTERS: FilterDef[] = [
  { id: 'ALL',    label: 'Toutes',  icon: Bell },
  { id: 'REPRO',  label: 'Repro',   icon: Heart },
  { id: 'SANTE',  label: 'Santé',   icon: Package },
  { id: 'BANDES', label: 'Bandes',  icon: Layers },
  { id: 'STOCK',  label: 'Stock',   icon: Box },
];

// ─────────────────────────────────────────────────────────────────────────────
// Serveur message helpers (inchangés)
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedAlertePayload {
  sujet?: string;
  message?: string;
  description?: string;
  priorite?: string;
  truieId?: string;
  truie?: string;
  bandeId?: string;
  bande?: string;
  produit?: string;
  quantite?: number | string;
  tauxMortalite?: number | string;
  taux?: number | string;
  jours?: number | string;
  date?: string;
  [k: string]: unknown;
}

const tryParseJson = (raw: string): ParsedAlertePayload | null => {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') return parsed as ParsedAlertePayload;
    return null;
  } catch {
    return null;
  }
};

const pickFirst = (...vals: Array<string | number | undefined | null>): string | undefined => {
  for (const v of vals) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s.length > 0) return s;
  }
  return undefined;
};

const humanizeSubject = (raw: string): string => {
  const cleaned = raw.replace(/[_-]+/g, ' ').toLowerCase().trim();
  if (!cleaned) return 'Alerte serveur';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

interface FormattedAlerte {
  title: string;
  description: string;
}

const formatAlertServeurMessage = (a: AlerteServeur): FormattedAlerte => {
  const parsedSujet = tryParseJson(a.sujet);
  const parsedDesc = tryParseJson(a.description);
  const parsedAction = tryParseJson(a.actionRequise);
  const merged: ParsedAlertePayload = {
    ...(parsedSujet ?? {}),
    ...(parsedDesc ?? {}),
    ...(parsedAction ?? {}),
  };

  const rawSujet = pickFirst(merged.sujet, parsedSujet ? undefined : a.sujet) ?? '';
  const sujetUpper = rawSujet.toUpperCase();

  const truieId = pickFirst(merged.truieId, merged.truie);
  const bandeId = pickFirst(merged.bandeId, merged.bande);
  const produit = pickFirst(merged.produit);
  const quantite = pickFirst(merged.quantite as string | number | undefined);
  const taux = pickFirst(
    merged.tauxMortalite as string | number | undefined,
    merged.taux as string | number | undefined,
  );
  const jours = pickFirst(merged.jours as string | number | undefined);
  const datePayload = pickFirst(merged.date, a.date);

  if (sujetUpper.includes('MISEBAS') || sujetUpper.includes('MISE_BAS') || sujetUpper.includes('MISE BAS')) {
    const who = truieId ?? 'truie inconnue';
    const when = datePayload ? ` le ${datePayload}` : '';
    return { title: 'Mise-bas prévue', description: `Mise-bas prévue pour ${who}${when}.` };
  }
  if (sujetUpper.includes('MORTALIT')) {
    const lot = bandeId ? `lot ${bandeId}` : 'lot inconnu';
    const tauxStr = taux !== undefined ? ` (${taux}%)` : '';
    return { title: 'Mortalité élevée', description: `Taux de mortalité élevé — ${lot}${tauxStr}.` };
  }
  if (sujetUpper.includes('STOCK')) {
    const prod = produit ? produit : 'aliment';
    const qte = quantite !== undefined ? ` — ${quantite} kg restants` : '';
    return { title: `Stock ${prod} critique`, description: `Stock ${prod} critique${qte}.` };
  }
  if (sujetUpper.includes('SEVRAGE')) {
    const lot = bandeId ? `bande ${bandeId}` : 'bande inconnue';
    const j = jours !== undefined ? ` (J+${jours})` : '';
    return { title: 'Sevrage à confirmer', description: `Sevrage à confirmer — ${lot}${j}.` };
  }
  if (sujetUpper.includes('RETOUR_CHALEUR') || sujetUpper.includes('RETOUR CHALEUR') || sujetUpper.includes('CHALEUR')) {
    const who = truieId ?? 'truie inconnue';
    return { title: 'Retour chaleur', description: `Retour chaleur à surveiller — ${who}.` };
  }
  if (sujetUpper.includes('ECHO')) {
    const who = truieId ?? 'truie inconnue';
    const j = jours !== undefined ? ` (${jours} jours post-saillie)` : '';
    return { title: 'Fenêtre échographie', description: `Fenêtre échographie — ${who}${j}.` };
  }

  const generic =
    pickFirst(merged.message, merged.description, parsedDesc ? undefined : a.description) ??
    pickFirst(parsedAction ? undefined : a.actionRequise) ??
    '';
  const titleGeneric = humanizeSubject(rawSujet || 'Alerte serveur');
  return { title: titleGeneric, description: generic || `${titleGeneric}.` };
};

// ─────────────────────────────────────────────────────────────────────────────
// AlertRow — vignette v6 (marker coloré + titre + description + meta)
// ─────────────────────────────────────────────────────────────────────────────

interface AlertRowProps {
  priority: AlertPriority;
  title: string;
  description: string;
  categoryLabel: string;
  metaLabel?: string;
  timeAgo?: string;
  serverTag?: boolean;
  actionLabel?: string;
  onClick?: () => void;
  ariaRole?: 'alert' | 'listitem';
}

const AlertRow: React.FC<AlertRowProps> = ({
  priority,
  title,
  description,
  categoryLabel,
  metaLabel,
  timeAgo,
  serverTag,
  actionLabel,
  onClick,
  ariaRole = 'listitem',
}) => {
  const interactive = typeof onClick === 'function';
  const Wrapper = interactive ? 'button' : 'div';
  return (
    <Wrapper
      {...(interactive ? { type: 'button', onClick } : {})}
      role={ariaRole}
      className="pressable"
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
        borderLeft: `3px solid ${PRIORITY_COLOR[priority]}`,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '100%',
        textAlign: 'left',
        border: 'none',
        borderLeftWidth: 3,
        borderLeftStyle: 'solid',
        borderLeftColor: PRIORITY_COLOR[priority],
        cursor: interactive ? 'pointer' : 'default',
        transition: 'transform 160ms var(--ease-emil)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: PRIORITY_BG[priority],
            color: PRIORITY_COLOR[priority],
            padding: '3px 9px',
            borderRadius: 'var(--radius-pill)',
            fontFamily: 'DMMono, ui-monospace, monospace',
            fontSize: 10,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          {priority}
        </span>
        <span
          style={{
            background: 'var(--bg-surface-2)',
            color: 'var(--ink-soft)',
            padding: '3px 9px',
            borderRadius: 'var(--radius-pill)',
            fontFamily: 'DMMono, ui-monospace, monospace',
            fontSize: 10,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            border: '0.5px solid var(--line)',
          }}
        >
          {categoryLabel}
        </span>
        {serverTag && (
          <span
            style={{
              background: 'var(--color-secondary-soft)',
              color: 'var(--color-secondary-deep)',
              padding: '3px 9px',
              borderRadius: 'var(--radius-pill)',
              fontFamily: 'DMMono, ui-monospace, monospace',
              fontSize: 10,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Server size={10} aria-hidden="true" />
            Serveur
          </span>
        )}
        {metaLabel && (
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'DMMono, ui-monospace, monospace',
              fontSize: 11,
              color: 'var(--muted)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {metaLabel}
          </span>
        )}
      </div>

      <h3
        style={{
          fontFamily: 'BigShoulders, system-ui, sans-serif',
          fontSize: 17,
          fontWeight: 600,
          color: 'var(--ink)',
          letterSpacing: '-0.005em',
          lineHeight: 1.3,
          margin: 0,
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontFamily: 'InstrumentSans, system-ui, sans-serif',
          fontSize: 13,
          color: 'var(--ink-soft)',
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {description}
      </p>

      {(timeAgo || actionLabel) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
          {timeAgo ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontFamily: 'DMMono, ui-monospace, monospace',
                fontSize: 10,
                color: 'var(--muted)',
                letterSpacing: '0.04em',
              }}
            >
              <Clock size={11} aria-hidden="true" />
              {timeAgo}
            </span>
          ) : <span />}
          {actionLabel && (
            <span
              style={{
                fontFamily: 'DMMono, ui-monospace, monospace',
                fontSize: 10,
                color: 'var(--color-accent-500)',
                fontWeight: 600,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
              }}
              aria-label="Action requise"
            >
              {actionLabel} →
            </span>
          )}
        </div>
      )}
    </Wrapper>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AlertsView — main component
// ─────────────────────────────────────────────────────────────────────────────

const AlertsView: React.FC = () => {
  const { alerts, alertesServeur } = usePilotage();
  const { refreshData } = useMeta();
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<{ alert: FarmAlert; confirmId: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterId>('ALL');

  const loadConfirmations = useCallback(async () => {
    const pc = await getPendingConfirmations();
    setPendingConfirmations(pc);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getPendingConfirmations().then(pc => {
      if (!cancelled) setPendingConfirmations(pc);
    });
    return () => { cancelled = true; };
  }, [alerts]);

  // ── Summary counts ────────────────────────────────────────────────────────
  const summary = useMemo(() => ({
    critique: alerts.filter(a => a.priority === 'CRITIQUE').length,
    haute:    alerts.filter(a => a.priority === 'HAUTE').length,
    normale:  alerts.filter(a => a.priority === 'NORMALE').length,
    info:     alerts.filter(a => a.priority === 'INFO').length,
  }), [alerts]);

  // ── Category counts ──────────────────────────────────────────────────────
  const categoryCounts = useMemo(() => {
    const counts: Record<FilterId, number> = {
      ALL: alerts.length,
      REPRO: 0, SANTE: 0, BANDES: 0, STOCK: 0, PLANNING: 0,
    };
    for (const a of alerts) counts[a.category] = (counts[a.category] ?? 0) + 1;
    return counts;
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    if (activeFilter === 'ALL') return alerts;
    return alerts.filter(a => a.category === activeFilter);
  }, [alerts, activeFilter]);

  const handleAction = useCallback((alert: FarmAlert) => {
    if (!alert.requiresAction) return;
    const confirm = pendingConfirmations.find(p => p.alertId === alert.id);
    if (confirm) {
      setSelectedAlert({ alert, confirmId: confirm.id });
    }
  }, [pendingConfirmations]);

  const hasPendingForAlert = useCallback(
    (alertId: string) => pendingConfirmations.some(p => p.alertId === alertId),
    [pendingConfirmations],
  );

  const showEmpty = alerts.length === 0 && alertesServeur.length === 0;

  // Spark dérivée déterministe (placeholder visuel — pas de vraie série tracée)
  const spark = (base: number) =>
    Array.from({ length: 7 }, (_, i) => Math.max(0, Math.round(base * (0.8 + 0.06 * i))));

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <IonRefresher
            slot="fixed"
            onIonRefresh={(e) => refreshData()
              .then(loadConfirmations)
              .then(() => e.detail.complete())
            }
          >
            <IonRefresherContent />
          </IonRefresher>

          <TopBarSync
            crumbs={['Pilotage', 'Alertes']}
            onMariusClick={() => {
              const evt = new CustomEvent('open-chatbot');
              window.dispatchEvent(evt);
            }}
          />

          <div className="px-4 pt-5 pb-32 flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
            {/* ── En-tête ───────────────────────────────────────────── */}
            <header>
              <Eyebrow dotColor="amber">Suivi terrain · Actions à valider</Eyebrow>
              <h1
                style={{
                  fontFamily: 'BigShoulders, system-ui, sans-serif',
                  fontSize: 34,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                  margin: '8px 0 4px',
                }}
              >
                Alertes
              </h1>
              <div
                style={{
                  fontFamily: 'InstrumentSans, system-ui, sans-serif',
                  fontSize: 13,
                  color: 'var(--muted)',
                }}
              >
                {alerts.length} alerte{alerts.length > 1 ? 's' : ''} locale{alerts.length > 1 ? 's' : ''}
                {alertesServeur.length > 0 && ` · ${alertesServeur.length} serveur`}
              </div>
            </header>

            {/* ── 4 KPI cards ───────────────────────────────────────── */}
            <section
              aria-label="Résumé des alertes locales"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 10,
              }}
            >
              <KpiCardV6
                label="Critique"
                value={summary.critique}
                trend={summary.critique > 0 ? 'À traiter' : 'Aucune'}
                trendDir={summary.critique > 0 ? 'down' : 'up'}
                spark={spark(summary.critique || 1)}
                accentColor="var(--color-danger)"
              />
              <KpiCardV6
                label="Haute"
                value={summary.haute}
                trend={summary.haute > 0 ? 'Surveiller' : 'Aucune'}
                trendDir={summary.haute > 0 ? 'down' : 'up'}
                spark={spark(summary.haute || 1)}
                accentColor="var(--color-pig)"
              />
              <KpiCardV6
                label="Normale"
                value={summary.normale}
                trend="Sous contrôle"
                spark={spark(summary.normale || 1)}
                accentColor="var(--amber-pork)"
              />
              <KpiCardV6
                label="Info"
                value={summary.info}
                trend="Pour mémoire"
                spark={spark(summary.info || 1)}
                accentColor="var(--color-info)"
              />
            </section>

            {/* ── Filter chips ──────────────────────────────────────── */}
            <div
              role="tablist"
              aria-label="Filtres par catégorie"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              {FILTERS.map(f => {
                const count = categoryCounts[f.id] ?? 0;
                const active = activeFilter === f.id;
                const Icon = f.icon;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={`Filtrer ${f.label} — ${count} alerte${count > 1 ? 's' : ''}`}
                    onClick={() => setActiveFilter(f.id)}
                    className="pressable"
                    style={{
                      minHeight: 44,
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-pill)',
                      background: active ? 'var(--color-accent-500)' : 'var(--bg-surface)',
                      color: active ? 'var(--bg-surface)' : 'var(--ink-soft)',
                      border: `1px solid ${active ? 'var(--color-accent-500)' : 'var(--line)'}`,
                      fontFamily: 'DMMono, ui-monospace, monospace',
                      fontSize: 11,
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'transform 160ms var(--ease-emil), background 200ms var(--ease-emil)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Icon size={13} aria-hidden="true" />
                    <span>{f.label}</span>
                    <span style={{ opacity: 0.7, fontSize: 10 }}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* ── Empty state ───────────────────────────────────────── */}
            {showEmpty && (
              <div
                role="status"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  padding: '56px 32px',
                  background: 'var(--bg-surface)',
                  borderRadius: 12,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'var(--color-accent-100)',
                    color: 'var(--color-accent-600)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2 size={32} aria-hidden="true" strokeWidth={2} />
                </div>
                <h3
                  style={{
                    fontFamily: 'BigShoulders, system-ui, sans-serif',
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'var(--ink)',
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Aucune alerte active
                </h3>
                <p
                  style={{
                    fontFamily: 'InstrumentSans, system-ui, sans-serif',
                    fontSize: 13,
                    color: 'var(--muted)',
                    maxWidth: 320,
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  Votre élevage tourne bien.
                </p>
              </div>
            )}

            {/* ── Section Serveur ───────────────────────────────────── */}
            {alertesServeur.length > 0 && (
              <section aria-label="Alertes serveur">
                <Eyebrow dotColor="terre">
                  Serveur · {alertesServeur.length}
                </Eyebrow>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '12px 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                  aria-label="Liste alertes serveur"
                >
                  {alertesServeur.map((a, i) => {
                    const formatted = formatAlertServeurMessage(a);
                    const actionTrimmed = a.actionRequise?.trim() ?? '';
                    const actionIsJson = actionTrimmed.startsWith('{') && actionTrimmed.endsWith('}');
                    const description =
                      !actionIsJson && actionTrimmed.length > 0
                        ? `${formatted.description} — ${actionTrimmed}`
                        : formatted.description;
                    return (
                      <li key={`srv-${i}-${a.sujet}-${a.date}`}>
                        <AlertRow
                          priority={a.priorite}
                          title={formatted.title}
                          description={description}
                          categoryLabel={a.categorie}
                          metaLabel={a.date || undefined}
                          serverTag
                          ariaRole={a.priorite === 'CRITIQUE' ? 'alert' : 'listitem'}
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* ── Section Locales ───────────────────────────────────── */}
            {alerts.length > 0 && (
              <section aria-label="Alertes locales GTTT">
                <Eyebrow dotColor="accent">
                  Locales · {filteredAlerts.length}
                  {activeFilter !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setActiveFilter('ALL')}
                      style={{
                        marginLeft: 8,
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-accent-500)',
                        fontFamily: 'DMMono, ui-monospace, monospace',
                        fontSize: 10,
                        letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Effacer filtre
                    </button>
                  )}
                </Eyebrow>
                {filteredAlerts.length === 0 ? (
                  <div
                    style={{
                      marginTop: 12,
                      background: 'var(--bg-surface)',
                      borderRadius: 12,
                      padding: '32px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <AlertOctagon size={22} color="var(--muted)" aria-hidden="true" />
                    <p
                      style={{
                        fontFamily: 'InstrumentSans, system-ui, sans-serif',
                        fontSize: 13,
                        color: 'var(--muted)',
                        margin: 0,
                      }}
                    >
                      Aucune alerte dans cette catégorie.
                    </p>
                  </div>
                ) : (
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: '12px 0 0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                    aria-label="Liste alertes locales"
                  >
                    {filteredAlerts.map(alert => {
                      const hasConfirm = hasPendingForAlert(alert.id);
                      return (
                        <li key={alert.id}>
                          <AlertRow
                            priority={alert.priority}
                            title={alert.title}
                            description={alert.message}
                            categoryLabel={alert.category}
                            metaLabel={alert.subjectLabel}
                            timeAgo={formatDistanceToNow(alert.createdAt, {
                              addSuffix: true,
                              locale: fr,
                            })}
                            actionLabel={
                              alert.requiresAction && hasConfirm
                                ? 'Action requise'
                                : alert.requiresAction
                                  ? 'Détails'
                                  : undefined
                            }
                            onClick={
                              alert.requiresAction && hasConfirm
                                ? () => handleAction(alert)
                                : undefined
                            }
                            ariaRole={alert.priority === 'CRITIQUE' ? 'alert' : 'listitem'}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}

            {/* ── En attente de confirmation ────────────────────────── */}
            {pendingConfirmations.length > 0 && (
              <section aria-label="Actions en attente de confirmation">
                <Eyebrow dotColor="amber">
                  En attente · {pendingConfirmations.length}
                </Eyebrow>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '12px 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                  aria-label="Actions à confirmer"
                >
                  {pendingConfirmations.map(pc => (
                    <li key={pc.id}>
                      <div
                        style={{
                          background: 'var(--bg-surface)',
                          borderRadius: 12,
                          boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
                          borderLeft: '3px solid var(--color-amber-pork)',
                          padding: '14px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              background: 'var(--color-amber-pork-soft)',
                              color: 'var(--color-amber-pork-deep)',
                              padding: '3px 9px',
                              borderRadius: 'var(--radius-pill)',
                              fontFamily: 'DMMono, ui-monospace, monospace',
                              fontSize: 10,
                              letterSpacing: '0.10em',
                              textTransform: 'uppercase',
                              fontWeight: 600,
                            }}
                          >
                            À confirmer
                          </span>
                          <span
                            style={{
                              marginLeft: 'auto',
                              fontFamily: 'DMMono, ui-monospace, monospace',
                              fontSize: 11,
                              color: 'var(--muted)',
                            }}
                          >
                            {formatDistanceToNow(new Date(pc.createdAt), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </span>
                        </div>
                        <h3
                          style={{
                            fontFamily: 'BigShoulders, system-ui, sans-serif',
                            fontSize: 17,
                            fontWeight: 600,
                            color: 'var(--ink)',
                            margin: '2px 0 0',
                            letterSpacing: '-0.005em',
                          }}
                        >
                          {pc.alertTitle}
                        </h3>
                        <p
                          style={{
                            fontFamily: 'InstrumentSans, system-ui, sans-serif',
                            fontSize: 13,
                            color: 'var(--ink-soft)',
                            lineHeight: 1.5,
                            margin: 0,
                          }}
                        >
                          {pc.alertMessage}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </AgritechLayout>

        <ConfirmationModal
          isOpen={!!selectedAlert}
          alert={selectedAlert?.alert || null}
          confirmationId={selectedAlert?.confirmId || null}
          onClose={() => setSelectedAlert(null)}
          onResolved={() => {
            void refreshData();
            void loadConfirmations();
          }}
        />
      </IonContent>
    </IonPage>
  );
};

export default AlertsView;
