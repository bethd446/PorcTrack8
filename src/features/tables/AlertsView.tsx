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
  IonToast,
} from '@ionic/react';
import {
  Bell, Heart, Package, Layers, Box,
  CheckCircle2, Clock, Server, AlertOctagon, X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMeta } from '../../context/FarmContext';
import { usePilotage } from '../../context/PilotageContext';
import { useTroupeau } from '../../context/TroupeauContext';
import { resolveAlertSubject, isAlertSubjectOrphan } from '../../utils/alertSubject';
import AgritechLayout from '../../components/AgritechLayout';
import KpiCardV6 from '../../components/design/KpiCard';
import Eyebrow from '../../components/design/Eyebrow';
import EmptyState from '../../components/design/EmptyState';
import TopBarSync from '../../components/design/TopBarSync';
import AlertCard from '../../components/agritech/AlertCard';
import { Button } from '@/design-system';
import { type FarmAlert, type AlertPriority, type AlertCategory } from '../../services/alertEngine';
import { dismissAlert } from '../../services/alertDismissals';
import { getPendingConfirmations, type PendingConfirmation } from '../../services/confirmationQueue';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import type { AlerteServeur } from '../../types/farm';

// ─────────────────────────────────────────────────────────────────────────────
// Treatment hierarchy — urgent / normal / resolu
// ─────────────────────────────────────────────────────────────────────────────

type AlertTreatment = 'urgent' | 'normal' | 'resolu';

interface ClassifiableAlert {
  priority: AlertPriority;
  acknowledged?: boolean;
}

function classifyAlertTreatment(alert: ClassifiableAlert): AlertTreatment {
  if (alert.priority === 'CRITIQUE' || alert.priority === 'HAUTE') return 'urgent';
  if (alert.priority === 'INFO' || alert.acknowledged) return 'resolu';
  return 'normal';
}

const TREATMENT_ORDER: Record<AlertTreatment, number> = {
  urgent: 0,
  normal: 1,
  resolu: 2,
};

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
// AlertRow — 3 treatments visuels (urgent / normal / resolu)
// ─────────────────────────────────────────────────────────────────────────────

interface AlertRowProps {
  treatment: AlertTreatment;
  priority: AlertPriority;
  title: string;
  description: string;
  categoryLabel: string;
  metaLabel?: string;
  timeAgo?: string;
  serverTag?: boolean;
  actionLabel?: string;
  onClick?: () => void;
  onDismiss?: () => void;
  ariaRole?: 'alert' | 'listitem';
}

const TREATMENT_DOT: Record<AlertTreatment, string> = {
  urgent: 'var(--color-pig-deep)',
  normal: 'var(--color-amber-pork-deep)',
  resolu: 'var(--muted)',
};

const AlertRow: React.FC<AlertRowProps> = ({
  treatment,
  priority,
  title,
  description,
  categoryLabel,
  metaLabel,
  timeAgo,
  serverTag,
  actionLabel,
  onClick,
  onDismiss,
  ariaRole = 'listitem',
}) => {
  const interactive = typeof onClick === 'function';
  const hasDismiss = typeof onDismiss === 'function';
  // Si on a un dismiss button, on ne peut pas wrapper en <button> (boutons
  // imbriqués invalides). On utilise un <div> avec onClick à la place.
  const Wrapper: 'button' | 'div' = hasDismiss ? 'div' : (interactive ? 'button' : 'div');

  const isUrgent = treatment === 'urgent';
  const isResolu = treatment === 'resolu';

  const background = isResolu ? 'var(--bg-surface-2)' : 'var(--bg-surface)';
  const border = isUrgent
    ? '1px solid var(--color-pig-soft)'
    : isResolu
      ? '1px solid var(--line-2)'
      : '1px solid var(--line)';
  const titleSize = isUrgent ? 16 : 14;
  const titleWeight = 600;
  const dotColor = TREATMENT_DOT[treatment];

  const wrapperProps: React.HTMLAttributes<HTMLElement> & { type?: 'button' } = hasDismiss
    ? { onClick: interactive ? onClick : undefined }
    : (interactive ? { type: 'button', onClick } : {});

  return (
    <Wrapper
      {...wrapperProps}
      role={ariaRole}
      className="pressable"
      style={{
        position: 'relative',
        background,
        borderRadius: 12,
        border,
        boxShadow: isResolu ? 'none' : '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        width: '100%',
        textAlign: 'left',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'transform 160ms var(--ease-emil)',
        opacity: isResolu ? 0.65 : 1,
      }}
    >
      {hasDismiss && !isResolu && (
        <Button
          type="button"
          variant="ghost"
          size="small"
          onClick={(e) => {
            e?.stopPropagation();
            onDismiss?.();
          }}
          aria-label="Ignorer cette alerte pour 30 jours"
          className="pressable"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: 'none',
            background: 'transparent',
            color: 'var(--muted)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <X size={14} aria-hidden="true" />
        </Button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: dotColor,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: dotColor,
              flexShrink: 0,
            }}
          />
          {priority} · {categoryLabel}
        </span>
        {serverTag && (
          <span
            style={{
              color: 'var(--color-secondary-deep)',
              fontFamily: 'var(--font-mono)',
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
              fontFamily: 'var(--font-mono)',
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
          fontFamily: 'var(--font-heading)',
          fontSize: titleSize,
          fontWeight: titleWeight,
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
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          color: 'var(--ink-soft)',
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {description}
      </p>

      {(timeAgo || (actionLabel && !isResolu)) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
          {timeAgo ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--muted)',
                letterSpacing: '0.04em',
              }}
            >
              <Clock size={11} aria-hidden="true" />
              {timeAgo}
            </span>
          ) : <span />}
          {actionLabel && !isResolu && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: isUrgent ? 'var(--color-accent-500)' : 'var(--muted)',
                fontWeight: 600,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
              }}
              aria-label="Action requise"
            >
              {actionLabel} ›
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

  const handleDismiss = useCallback(async (alertId: string) => {
    if (!user) return;
    try {
      await dismissAlert(user.id, alertId, 'manual');
      setDismissToast({ show: true, message: 'Alerte ignorée pour 30 jours' });
      await recomputeAlerts();
    } catch (e) {
      console.warn('[AlertsView] dismiss failed', e);
      setDismissToast({ show: true, message: 'Erreur lors de l\'ignorance' });
    }
  }, [user, recomputeAlerts]);

  // Sprint E1 : acquittement uniforme "OK ✓" via AlertCard.
  const handleAcknowledge = useCallback(async (alertId: string) => {
    if (!user) return;
    try {
      await dismissAlert(user.id, alertId, 'user_acknowledged');
      setDismissToast({ show: true, message: 'Alerte acquittée' });
      await recomputeAlerts();
    } catch (e) {
      console.warn('[AlertsView] acknowledge failed', e);
      setDismissToast({ show: true, message: 'Erreur lors de l\'acquittement' });
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

  // V36-A — Filtre les alertes orphelines (subject supprimé) pour ne pas
  // afficher d'identifiants techniques sans contexte (BUG-2).
  const liveAlerts = useMemo(
    () => alerts.filter(a => !isAlertSubjectOrphan(a.subjectId, a.category, lookup)),
    [alerts, lookup],
  );

  // ── Summary counts ────────────────────────────────────────────────────────
  const summary = useMemo(() => ({
    critique: liveAlerts.filter(a => a.priority === 'CRITIQUE').length,
    haute:    liveAlerts.filter(a => a.priority === 'HAUTE').length,
    normale:  liveAlerts.filter(a => a.priority === 'NORMALE').length,
    info:     liveAlerts.filter(a => a.priority === 'INFO').length,
  }), [liveAlerts]);

  // ── Category counts ──────────────────────────────────────────────────────
  const categoryCounts = useMemo(() => {
    const counts: Record<FilterId, number> = {
      ALL: liveAlerts.length,
      REPRO: 0, SANTE: 0, BANDES: 0, STOCK: 0, PLANNING: 0,
    };
    for (const a of liveAlerts) counts[a.category] = (counts[a.category] ?? 0) + 1;
    return counts;
  }, [liveAlerts]);

  const filteredAlerts = useMemo<DisplayAlert[]>(() => {
    const base = activeFilter === 'ALL' ? liveAlerts : liveAlerts.filter(a => a.category === activeFilter);
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
    return [...grouped].sort((a, b) => {
      const ta = TREATMENT_ORDER[classifyAlertTreatment(a)];
      const tb = TREATMENT_ORDER[classifyAlertTreatment(b)];
      if (ta !== tb) return ta - tb;
      const da = a.createdAt ? a.createdAt.getTime() : 0;
      const db = b.createdAt ? b.createdAt.getTime() : 0;
      return db - da;
    });
  }, [liveAlerts, activeFilter]);

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
                  fontFamily: 'var(--font-heading)',
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
                  fontFamily: 'var(--font-body)',
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
                accentColor="var(--color-danger)"
              />
              <KpiCardV6
                label="Haute"
                value={summary.haute}
                trend={summary.haute > 0 ? 'Surveiller' : 'Aucune'}
                trendDir={summary.haute > 0 ? 'down' : 'up'}
                accentColor="var(--color-pig)"
              />
              <KpiCardV6
                label="Normale"
                value={summary.normale}
                trend="Sous contrôle"
                accentColor="var(--amber-pork)"
              />
              <KpiCardV6
                label="Info"
                value={summary.info}
                trend="Pour mémoire"
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
                  <Button
                    key={f.id}
                    type="button"
                    variant={active ? 'primary' : 'secondary'}
                    size="small"
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
                      fontFamily: 'var(--font-mono)',
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
                  </Button>
                );
              })}
            </div>

            {/* ── Empty state ───────────────────────────────────────── */}
            {showEmpty && (
              <EmptyState
                size="lg"
                icon={<CheckCircle2 size={32} aria-hidden="true" strokeWidth={2} />}
                title="Aucune alerte active"
                description="Ton élevage tourne bien."
              />
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
                    const treatment = classifyAlertTreatment({ priority: a.priorite });
                    return (
                      <li key={`srv-${i}-${a.sujet}-${a.date}`}>
                        <AlertRow
                          treatment={treatment}
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="small"
                      onClick={() => setActiveFilter('ALL')}
                      style={{
                        marginLeft: 8,
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-accent-500)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Effacer filtre
                    </Button>
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
                        fontFamily: 'var(--font-body)',
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
                      const isGrouped = !!alert.groupedIds;
                      const hasConfirm = !isGrouped && hasPendingForAlert(alert.id);
                      const treatment = classifyAlertTreatment(alert);
                      const originalAlert = isGrouped ? null : alerts.find(a => a.id === alert.id) ?? null;

                      // Route fallback par catégorie (BUG #1 utilisateur — cards non cliquables).
                      const fallbackRoute = ((): string | null => {
                        if (alert.category === 'STOCK') return '/ressources?filter=stock-bas';
                        const subj = originalAlert?.subjectId;
                        if (alert.category === 'BANDES') {
                          if (subj && bandes.some(b => b.id === subj || b.idPortee === subj)) {
                            const bande = bandes.find(b => b.id === subj || b.idPortee === subj);
                            return `/troupeau/bandes/${bande?.id ?? subj}`;
                          }
                          return '/troupeau?view=bandes';
                        }
                        if (alert.category === 'REPRO') {
                          if (subj && truies.some(t => t.id === subj || t.displayId === subj)) {
                            const truie = truies.find(t => t.id === subj || t.displayId === subj);
                            return `/troupeau/truies/${truie?.id ?? subj}`;
                          }
                          return '/troupeau';
                        }
                        return null;
                      })();

                      // Sprint E1 — alertes locales individuelles (non groupées) :
                      // utilisent AlertCard avec bouton "OK ✓" d'acquittement uniforme.
                      if (!isGrouped && originalAlert) {
                        const onAction = originalAlert.requiresAction && hasConfirm
                          ? () => handleAction(originalAlert)
                          : fallbackRoute
                            ? () => navigate(fallbackRoute)
                            : undefined;

                        const actionLabel = originalAlert.requiresAction && hasConfirm
                          ? 'Action requise'
                          : originalAlert.requiresAction
                            ? "Voir l'alerte"
                            : fallbackRoute
                              ? 'Ouvrir'
                              : undefined;

                        const resolvedAlert: FarmAlert = {
                          ...originalAlert,
                          title: resolveAlertSubject(originalAlert.title, lookup),
                          message: resolveAlertSubject(originalAlert.message, lookup),
                        };

                        return (
                          <li key={alert.id} data-alert-id={alert.id}>
                            <AlertCard
                              alert={resolvedAlert}
                              onAcknowledge={(id) => void handleAcknowledge(id)}
                              onAction={onAction}
                              actionLabel={actionLabel}
                            />
                          </li>
                        );
                      }

                      // Groupes (stock fusionné) : conserve AlertRow custom (multi-cibles).
                      const onClick = (): void => {
                        navigate('/ressources?filter=stock-bas');
                      };

                      return (
                        <li key={alert.id}>
                          <AlertRow
                            treatment={treatment}
                            priority={alert.priority}
                            title={alert.title}
                            description={alert.message}
                            categoryLabel={alert.category}
                            metaLabel={`${alert.groupedIds?.length ?? 0} entrées`}
                            actionLabel="Voir le détail des stocks"
                            onClick={onClick}
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
                              fontFamily: 'var(--font-mono)',
                              fontSize: 10,
                              letterSpacing: '0.10em',
                              textTransform: 'uppercase',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <span
                              aria-hidden="true"
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: 'var(--color-amber-pork-deep)',
                                flexShrink: 0,
                              }}
                            />
                            À confirmer
                          </span>
                          <span
                            style={{
                              marginLeft: 'auto',
                              fontFamily: 'var(--font-mono)',
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
                            fontFamily: 'var(--font-heading)',
                            fontSize: 17,
                            fontWeight: 600,
                            color: 'var(--ink)',
                            margin: '2px 0 0',
                            letterSpacing: '-0.005em',
                          }}
                        >
                          {resolveAlertSubject(pc.alertTitle, lookup)}
                        </h3>
                        <p
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: 13,
                            color: 'var(--ink-soft)',
                            lineHeight: 1.5,
                            margin: 0,
                          }}
                        >
                          {resolveAlertSubject(pc.alertMessage, lookup)}
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
