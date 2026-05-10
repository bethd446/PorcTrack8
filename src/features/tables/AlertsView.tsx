/**
 * AlertsView — Refonte V70 (Sprint Legacy 1, 2026-05-10)
 * ══════════════════════════════════════════════════════════════════
 * Pattern V70 natif : phone-content + PageHeader + chips + alert-card
 * (variantes crit/high/norm). Plus d'AgritechLayout / KpiCardV6 / TopBarSync.
 *
 * Logique métier préservée :
 *   - useFarm/usePilotage/useTroupeau/useMeta inchangés
 *   - alertEngine (FarmAlert) + alertesServeur inchangés
 *   - dismissAlert / getPendingConfirmations / ConfirmationModal inchangés
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  IonPage, IonContent,
  IonRefresher, IonRefresherContent,
  IonToast,
} from '@ionic/react';
import { CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMeta } from '../../context/FarmContext';
import { usePilotage } from '../../context/PilotageContext';
import { useTroupeau } from '../../context/TroupeauContext';
import { resolveAlertSubject, isAlertSubjectOrphan } from '../../utils/alertSubject';
import { Section } from '@/design-system';
import { type FarmAlert, type AlertPriority, type AlertCategory } from '../../services/alertEngine';
import { dismissAlert } from '../../services/alertDismissals';
import { getPendingConfirmations, type PendingConfirmation } from '../../services/confirmationQueue';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import type { AlerteServeur } from '../../types/farm';

// ─────────────────────────────────────────────────────────────────────────────
// Types & helpers
// ─────────────────────────────────────────────────────────────────────────────

interface DisplayAlert {
  id: string;
  priority: AlertPriority;
  category: AlertCategory;
  title: string;
  message: string;
  subjectLabel?: string;
  createdAt?: Date;
  requiresAction?: boolean;
  acknowledged?: boolean;
  groupedIds?: string[];
}

type AlertVariant = 'alert-card--danger' | 'alert-card--warning' | 'alert-card--info' | 'alert-card--success';

function severityClass(priority: AlertPriority): AlertVariant {
  if (priority === 'CRITIQUE') return 'alert-card--danger';
  if (priority === 'HAUTE') return 'alert-card--warning';
  if (priority === 'NORMALE') return 'alert-card--info';
  return 'alert-card--success';
}

function severityLabel(priority: AlertPriority): string {
  if (priority === 'CRITIQUE') return 'Critique';
  if (priority === 'HAUTE') return 'Haute';
  if (priority === 'NORMALE') return 'Normale';
  return 'Info';
}

function severityColor(priority: AlertPriority): string {
  if (priority === 'CRITIQUE') return 'var(--pt-danger)';
  if (priority === 'HAUTE') return 'var(--pt-warning)';
  if (priority === 'NORMALE') return 'var(--pt-info)';
  return 'var(--pt-muted)';
}

function groupStockAlerts(alerts: FarmAlert[]): DisplayAlert[] {
  const stockAlerts = alerts.filter(a => a.category === 'STOCK');
  const others: DisplayAlert[] = alerts
    .filter(a => a.category !== 'STOCK')
    .map(a => ({
      id: a.id,
      priority: a.priority,
      category: a.category,
      title: a.title,
      message: a.message,
      subjectLabel: a.subjectLabel,
      createdAt: a.createdAt,
      requiresAction: a.requiresAction,
      acknowledged: false,
    }));

  if (stockAlerts.length < 3) {
    return [
      ...others,
      ...stockAlerts.map(a => ({
        id: a.id,
        priority: a.priority,
        category: a.category,
        title: a.title,
        message: a.message,
        subjectLabel: a.subjectLabel,
        createdAt: a.createdAt,
        requiresAction: a.requiresAction,
        acknowledged: false,
      })),
    ];
  }

  const highestPriority: AlertPriority = stockAlerts.some(a => a.priority === 'CRITIQUE')
    ? 'CRITIQUE'
    : stockAlerts.some(a => a.priority === 'HAUTE')
      ? 'HAUTE'
      : stockAlerts.some(a => a.priority === 'NORMALE')
        ? 'NORMALE'
        : 'INFO';

  const samples = stockAlerts
    .slice(0, 3)
    .map(a => a.title.replace(/^Stock Bas\s*[—-]\s*/i, '').replace(/^Stock\s+/i, ''))
    .join(', ');

  const grouped: DisplayAlert = {
    id: 'group-stock',
    priority: highestPriority,
    category: 'STOCK',
    title: `${stockAlerts.length} stocks à surveiller`,
    message: samples + (stockAlerts.length > 3 ? '…' : ''),
    groupedIds: stockAlerts.map(a => a.id),
    requiresAction: false,
    acknowledged: false,
  };

  return [...others, grouped];
}

// Styles inline partagés (déduplication V77.1)
const META_LINE: React.CSSProperties = {
  fontFamily: 'var(--ff-mono)',
  fontSize: 11,
  color: 'var(--pt-muted)',
};

const DETAIL_LINE: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--pt-muted)',
  marginTop: 4,
};

const ACTIONS_ROW: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginTop: 10,
};

const STACK_COL: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  marginTop: 8,
};

const EMPTY_TITLE: React.CSSProperties = {
  fontFamily: 'var(--ff-display)',
  fontWeight: 900,
  fontSize: 22,
  textTransform: 'uppercase',
  letterSpacing: '-0.01em',
  color: 'var(--pt-ink)',
};

const EMPTY_SUB: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--pt-muted)',
};

const CONTENT_WRAP: React.CSSProperties = {
  padding: 24,
  maxWidth: 600,
  margin: '0 auto',
};

const PILLS_ROW: React.CSSProperties = { marginBottom: 12 };

const PILL_COUNT: React.CSSProperties = {
  fontFamily: 'var(--ff-mono)',
  marginLeft: 6,
};

// ─────────────────────────────────────────────────────────────────────────────
// Filter chips
// ─────────────────────────────────────────────────────────────────────────────

type FilterId = 'ALL' | AlertCategory | 'CRIT' | 'HIGH';

interface FilterDef {
  id: FilterId;
  label: string;
}

const FILTERS: FilterDef[] = [
  { id: 'ALL',    label: 'Toutes' },
  { id: 'CRIT',   label: 'Critique' },
  { id: 'HIGH',   label: 'Haute' },
  { id: 'STOCK',  label: 'Stocks' },
  { id: 'REPRO',  label: 'Repro' },
  { id: 'SANTE',  label: 'Mortalité' },
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
    const lot = bandeId ? `bande ${bandeId}` : 'bande inconnue';
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
// AlertsView — main component
// ─────────────────────────────────────────────────────────────────────────────

const AlertsView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { alerts, alertesServeur } = usePilotage();
  const { refreshData, recomputeAlerts } = useMeta();
  const { bandes, truies, verrats } = useTroupeau();
  const lookup = useMemo(() => ({ bandes, truies, verrats }), [bandes, truies, verrats]);
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<{ alert: FarmAlert; confirmId: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterId>('ALL');
  const [dismissToast, setDismissToast] = useState<{ show: boolean; message: string }>({
    show: false, message: '',
  });

  const handleAcknowledge = useCallback(async (alertId: string) => {
    if (!user) return;
    try {
      await dismissAlert(user.id, alertId, 'user_acknowledged');
      setDismissToast({ show: true, message: 'Alerte acquittée' });
      await recomputeAlerts();
    } catch (e) {
      console.warn('[AlertsView] acknowledge failed', e);
      setDismissToast({ show: true, message: 'Erreur lors de l’acquittement' });
    }
  }, [user, recomputeAlerts]);

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

  // Filtre les alertes orphelines (subject supprimé) pour ne pas afficher
  // d'identifiants techniques sans contexte (BUG-2).
  const liveAlerts = useMemo(
    () => alerts.filter(a => !isAlertSubjectOrphan(a.subjectId, a.category, lookup)),
    [alerts, lookup],
  );

  // Comptes par sévérité (header)
  const summary = useMemo(() => ({
    total: liveAlerts.length,
    critique: liveAlerts.filter(a => a.priority === 'CRITIQUE').length,
    haute:    liveAlerts.filter(a => a.priority === 'HAUTE').length,
  }), [liveAlerts]);

  const filteredAlerts = useMemo<DisplayAlert[]>(() => {
    let base: FarmAlert[];
    if (activeFilter === 'ALL') base = liveAlerts;
    else if (activeFilter === 'CRIT') base = liveAlerts.filter(a => a.priority === 'CRITIQUE');
    else if (activeFilter === 'HIGH') base = liveAlerts.filter(a => a.priority === 'HAUTE');
    else base = liveAlerts.filter(a => a.category === activeFilter);

    const grouped = activeFilter === 'STOCK' ? base.map<DisplayAlert>(a => ({
      id: a.id,
      priority: a.priority,
      category: a.category,
      title: a.title,
      message: a.message,
      subjectLabel: a.subjectLabel,
      createdAt: a.createdAt,
      requiresAction: a.requiresAction,
      acknowledged: false,
    })) : groupStockAlerts(base);

    const priorityRank: Record<AlertPriority, number> = {
      CRITIQUE: 0, HAUTE: 1, NORMALE: 2, INFO: 3,
    };
    return [...grouped].sort((a, b) => {
      const pa = priorityRank[a.priority] ?? 9;
      const pb = priorityRank[b.priority] ?? 9;
      if (pa !== pb) return pa - pb;
      const da = a.createdAt ? a.createdAt.getTime() : 0;
      const db = b.createdAt ? b.createdAt.getTime() : 0;
      return db - da;
    });
  }, [liveAlerts, activeFilter]);

  const handleViewAlert = useCallback((alert: DisplayAlert) => {
    if (alert.groupedIds) {
      navigate('/ressources?filter=stock-bas');
      return;
    }
    const original = alerts.find(a => a.id === alert.id);
    if (!original) return;
    if (original.requiresAction) {
      const confirm = pendingConfirmations.find(p => p.alertId === original.id);
      if (confirm) {
        setSelectedAlert({ alert: original, confirmId: confirm.id });
        return;
      }
    }
    // Fallback route par catégorie
    if (alert.category === 'STOCK') {
      navigate('/ressources?filter=stock-bas');
      return;
    }
    if (alert.category === 'BANDES') {
      const subj = original.subjectId;
      if (subj && bandes.some(b => b.id === subj || b.idPortee === subj)) {
        const bande = bandes.find(b => b.id === subj || b.idPortee === subj);
        navigate(`/troupeau/bandes/${bande?.id ?? subj}`);
        return;
      }
      navigate('/troupeau?view=bandes');
      return;
    }
    if (alert.category === 'REPRO') {
      const subj = original.subjectId;
      if (subj && truies.some(t => t.id === subj || t.displayId === subj)) {
        const truie = truies.find(t => t.id === subj || t.displayId === subj);
        navigate(`/troupeau/truies/${truie?.id ?? subj}`);
        return;
      }
      navigate('/troupeau');
    }
  }, [alerts, pendingConfirmations, bandes, truies, navigate]);

  const showEmpty = alerts.length === 0 && alertesServeur.length === 0;

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <IonRefresher
          slot="fixed"
          onIonRefresh={(e) => refreshData()
            .then(loadConfirmations)
            .then(() => e.detail.complete())
          }
        >
          <IonRefresherContent />
        </IonRefresher>

        <div className="pt-screen">
          <header className="ph--primary">
            <div className="eyebrow">Suivi technique</div>
            <h1>Alertes</h1>
            <div className="sub">
              {summary.total === 0
                ? 'Aucune alerte active'
                : `${summary.total} active${summary.total > 1 ? 's' : ''} · ${summary.critique} critique${summary.critique > 1 ? 's' : ''} · ${summary.haute} haute${summary.haute > 1 ? 's' : ''}`}
            </div>
          </header>

          <div className="phone-content" style={CONTENT_WRAP}>
          {/* ── Pills filtres ─────────────────────────────────────────── */}
          <div className="pills" role="tablist" aria-label="Filtres alertes" style={PILLS_ROW}>
            {FILTERS.map(f => {
              const active = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  className={`pill${active ? ' is-active' : ''}`}
                  aria-pressed={active}
                  aria-selected={active}
                  onClick={() => setActiveFilter(f.id)}
                >
                  {f.label}
                  {f.id === 'ALL' && (
                    <span style={PILL_COUNT}>{summary.total}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Alertes locales ───────────────────────────────────────── */}
          {alerts.length > 0 && (
            <Section
              label={`${filteredAlerts.length} alerte${filteredAlerts.length > 1 ? 's' : ''}`}
            />
          )}

          {alerts.length > 0 && filteredAlerts.length > 0 && (
            <div style={STACK_COL}>
              {filteredAlerts.map(alert => {
                const sev = severityClass(alert.priority);
                const sevLabel = severityLabel(alert.priority);
                const sevColor = severityColor(alert.priority);
                const isGrouped = !!alert.groupedIds;
                const original = isGrouped ? null : alerts.find(a => a.id === alert.id) ?? null;
                const title = original
                  ? resolveAlertSubject(original.title, lookup)
                  : alert.title;
                const detail = original
                  ? resolveAlertSubject(original.message, lookup)
                  : alert.message;
                const ruleLabel = `${alert.category}`;
                const timeAgo = alert.createdAt
                  ? formatDistanceToNow(alert.createdAt, { addSuffix: true, locale: fr })
                  : '';

                return (
                  <article
                    key={alert.id}
                    className={`alert-card ${sev}`}
                    role={alert.priority === 'CRITIQUE' ? 'alert' : 'listitem'}
                    onClick={() => handleViewAlert(alert)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="alert-card__head">
                      <h3 className="alert-card__title">{title}</h3>
                      <span className="eyebrow" style={{ color: sevColor, flexShrink: 0 }}>
                        {sevLabel}
                      </span>
                    </div>
                    <div style={META_LINE}>
                      {ruleLabel}{timeAgo ? ` · ${timeAgo}` : ''}
                    </div>
                    <div style={DETAIL_LINE}>
                      {detail}
                    </div>
                    {!isGrouped && original && (
                      <div style={ACTIONS_ROW}>
                        <button
                          type="button"
                          className="btn-ghost-sm"
                          data-testid="alert-card-ack"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleAcknowledge(original.id);
                          }}
                        >
                          Ignorer
                        </button>
                        <button
                          type="button"
                          className="btn-primary-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewAlert(alert);
                          }}
                        >
                          Voir
                        </button>
                      </div>
                    )}
                    {isGrouped && (
                      <div style={ACTIONS_ROW}>
                        <button
                          type="button"
                          className="btn-primary-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/ressources?filter=stock-bas');
                          }}
                        >
                          Voir le détail
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {/* ── Alertes serveur ───────────────────────────────────────── */}
          {alertesServeur.length > 0 && (
            <>
              <Section label={`Serveur · ${alertesServeur.length}`} />
              <div style={STACK_COL}>
                {alertesServeur.map((a, i) => {
                  const formatted = formatAlertServeurMessage(a);
                  const actionTrimmed = a.actionRequise?.trim() ?? '';
                  const actionIsJson = actionTrimmed.startsWith('{') && actionTrimmed.endsWith('}');
                  const description =
                    !actionIsJson && actionTrimmed.length > 0
                      ? `${formatted.description} — ${actionTrimmed}`
                      : formatted.description;
                  const sev = severityClass(a.priorite);
                  const sevLabel = severityLabel(a.priorite);
                  const sevColor = severityColor(a.priorite);
                  return (
                    <article
                      key={`srv-${i}-${a.sujet}-${a.date}`}
                      className={`alert-card ${sev}`}
                      role={a.priorite === 'CRITIQUE' ? 'alert' : 'listitem'}
                    >
                      <div className="alert-card__head">
                        <h3 className="alert-card__title">{formatted.title}</h3>
                        <span className="eyebrow" style={{ color: sevColor, flexShrink: 0 }}>
                          {sevLabel}
                        </span>
                      </div>
                      <div style={META_LINE}>
                        Serveur{a.date ? ` · ${a.date}` : ''}
                      </div>
                      <div style={DETAIL_LINE}>
                        {description}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}

          {/* ── En attente de confirmation ────────────────────────────── */}
          {pendingConfirmations.length > 0 && (
            <>
              <Section label={`En attente · ${pendingConfirmations.length}`} />
              <div style={STACK_COL}>
                {pendingConfirmations.map(pc => (
                  <article key={pc.id} className="alert-card alert-card--warning">
                    <div className="alert-card__head">
                      <h3 className="alert-card__title">
                        {resolveAlertSubject(pc.alertTitle, lookup)}
                      </h3>
                      <span className="eyebrow" style={{ color: 'var(--pt-warning)', flexShrink: 0 }}>
                        À confirmer
                      </span>
                    </div>
                    <div style={META_LINE}>
                      {formatDistanceToNow(new Date(pc.createdAt), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </div>
                    <div style={DETAIL_LINE}>
                      {resolveAlertSubject(pc.alertMessage, lookup)}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {/* ── Empty state ───────────────────────────────────────────── */}
          {(showEmpty || (alerts.length > 0 && filteredAlerts.length === 0)) && (
            <div className="empty-state">
              <CheckCircle2 size={48} strokeWidth={1.25} color="var(--pt-success)" aria-hidden="true" />
              <div style={EMPTY_TITLE}>
                {showEmpty ? 'Carnet vide' : 'Aucune alerte dans ce filtre'}
              </div>
              <div style={EMPTY_SUB}>
                {showEmpty
                  ? 'Toutes les alertes sont traitées. Bonne tournée.'
                  : 'Change de filtre ou reviens plus tard.'}
              </div>
            </div>
          )}
          </div>
        </div>

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

        <IonToast
          isOpen={dismissToast.show}
          message={dismissToast.message}
          duration={2200}
          position="bottom"
          onDidDismiss={() => setDismissToast({ show: false, message: '' })}
        />
      </IonContent>
    </IonPage>
  );
};

export default AlertsView;
