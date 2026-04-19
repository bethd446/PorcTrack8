/**
 * AlertsView — Agritech Dark Cockpit
 * ══════════════════════════════════════════════════════════════════
 * Refonte dark (bg-0 / card-dense) de la vue Alertes.
 *
 *   1. Summary strip : 4 KpiCard (CRITIQUE / HAUTE / NORMALE / INFO)
 *   2. Filter chips horizontaux (Toutes / Repro / Santé / Bandes / Stock)
 *      → filtre catégorie sur les alertes LOCALES (alertEngine)
 *   3. Section "Serveur" (ALERTES_ACTIVES Sheets) avec chip SRV
 *   4. Section "Locales" — DataRow denses, border-left couleur priorité
 *   5. Section "En attente de confirmation" (PendingConfirmation)
 *
 * Comportement préservé : handleAction() ouvre ConfirmationModal
 * exactement comme avant. Zéro changement dans alertEngine /
 * confirmationQueue.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  IonPage, IonContent,
  IonRefresher, IonRefresherContent,
} from '@ionic/react';
import {
  Bell, Heart, Package, Layers, Box,
  CheckCircle2, Clock, AlertTriangle, Server,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { useFarm } from '../../context/FarmContext';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import AgritechNav from '../../components/AgritechNav';
import {
  KpiCard, Chip, SectionDivider,
} from '../../components/agritech';
import type { ChipTone } from '../../components/agritech';
import { type FarmAlert, type AlertPriority, type AlertCategory } from '../../services/alertEngine';
import { getPendingConfirmations, type PendingConfirmation } from '../../services/confirmationQueue';
import { ConfirmationModal } from '../../components/ConfirmationModal';

// ─────────────────────────────────────────────────────────────────────────────
// Priority → color (garde la map corrigée de l'ancien fichier)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Border-left couleur par priorité — valeurs hex alignées sur
 * `agritech-tokens.css` (red/amber/blue + text-2 pour INFO).
 */
const PRIORITY_BORDER: Record<AlertPriority, string> = {
  CRITIQUE: '#EF4444', // --color-red
  HAUTE:    '#F4A261', // --color-amber
  NORMALE:  '#60A5FA', // --color-blue
  INFO:     '#6B7880', // --color-text-2
};

const PRIORITY_CHIP_TONE: Record<AlertPriority, ChipTone> = {
  CRITIQUE: 'red',
  HAUTE:    'amber',
  NORMALE:  'blue',
  INFO:     'default',
};

// ─────────────────────────────────────────────────────────────────────────────
// Filter chips definition
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
// AlertDenseRow — line item dans les sections Serveur / Locales
// ─────────────────────────────────────────────────────────────────────────────

interface AlertDenseRowProps {
  priority: AlertPriority;
  title: string;
  description: string;
  categoryLabel: string;
  metaLabel?: string;                 // ex. "T-142" ou date serveur
  timeAgo?: string;                   // pour alertes locales
  extraChip?: { label: string; tone: ChipTone };
  actionLabel?: string;               // "Action requise" si confirmation en attente
  onClick?: () => void;
  ariaRole?: 'alert' | 'listitem';
}

const AlertDenseRow: React.FC<AlertDenseRowProps> = ({
  priority,
  title,
  description,
  categoryLabel,
  metaLabel,
  timeAgo,
  extraChip,
  actionLabel,
  onClick,
  ariaRole = 'listitem',
}) => {
  const interactive = typeof onClick === 'function';
  const Wrapper = interactive ? 'button' : 'div';
  const borderColor = PRIORITY_BORDER[priority];

  return (
    <Wrapper
      {...(interactive ? { type: 'button', onClick } : {})}
      role={ariaRole}
      className={[
        'w-full text-left',
        'card-dense',
        'pressable',
        'flex flex-col gap-2',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
      ].join(' ')}
      style={{
        borderLeft: `2px solid ${borderColor}`,
        padding: '12px 14px',
      }}
    >
      {/* Top line — chips + meta */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Chip label={priority} tone={PRIORITY_CHIP_TONE[priority]} size="xs" />
        <Chip label={categoryLabel} tone="default" size="xs" />
        {extraChip && (
          <Chip label={extraChip.label} tone={extraChip.tone} size="xs" />
        )}
        {metaLabel && (
          <span className="ml-auto font-mono text-[11px] text-text-2 tabular-nums">
            {metaLabel}
          </span>
        )}
      </div>

      {/* Title — ft-heading style but adapted to dark */}
      <div
        className="font-mono text-[13px] font-bold uppercase tracking-wide text-text-0 leading-snug line-clamp-2"
        style={{ fontFamily: 'var(--font-display), var(--font-mono-jb)' }}
      >
        {title}
      </div>

      {/* Description */}
      <p className="text-[12px] text-text-1 leading-snug line-clamp-2">
        {description}
      </p>

      {/* Footer row */}
      {(timeAgo || actionLabel) && (
        <div className="flex items-center justify-between mt-1">
          {timeAgo ? (
            <span className="flex items-center gap-1 text-[11px] text-text-2 font-mono">
              <Clock size={11} />
              {timeAgo}
            </span>
          ) : <span />}
          {actionLabel && (
            <span
              className="font-mono text-[11px] font-semibold text-accent uppercase tracking-wide"
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
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const AlertsView: React.FC = () => {
  const { alerts, alertesServeur, refreshData } = useFarm();
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

  // ── Category counts for filter chips ──────────────────────────────────────
  const categoryCounts = useMemo(() => {
    const counts: Record<FilterId, number> = {
      ALL: alerts.length,
      REPRO: 0, SANTE: 0, BANDES: 0, STOCK: 0, PLANNING: 0,
    };
    for (const a of alerts) counts[a.category] = (counts[a.category] ?? 0) + 1;
    return counts;
  }, [alerts]);

  // ── Filter local alerts ───────────────────────────────────────────────────
  const filteredAlerts = useMemo(() => {
    if (activeFilter === 'ALL') return alerts;
    return alerts.filter(a => a.category === activeFilter);
  }, [alerts, activeFilter]);

  // ── Click handler (preserved) ─────────────────────────────────────────────
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

  const totalLocal = filteredAlerts.length;
  const showEmpty = alerts.length === 0 && alertesServeur.length === 0;

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader title="ALERTES" subtitle="Suivi terrain · actions à valider">
            {/* Filter chips dans le slot header */}
            <div
              role="tablist"
              aria-label="Filtres par catégorie"
              className="flex gap-1.5 overflow-x-auto scroll-hide pb-0.5"
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
                    className={[
                      'pressable flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border whitespace-nowrap',
                      'transition-colors duration-[160ms]',
                      active
                        ? 'bg-accent text-bg-0 border-accent shadow-sm'
                        : 'bg-bg-1 text-text-1 border-border active:bg-bg-2',
                    ].join(' ')}
                  >
                    <Icon size={12} className="flex-shrink-0" />
                    <span className="ft-heading text-[11px] font-bold uppercase tracking-wide">
                      {f.label}
                    </span>
                    <span
                      className={[
                        'font-mono text-[10px] font-semibold px-1 py-px rounded',
                        active ? 'bg-bg-0/20 text-bg-0' : 'bg-bg-2 text-text-2',
                      ].join(' ')}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </AgritechHeader>

          <IonRefresher
            slot="fixed"
            onIonRefresh={(e) => refreshData()
              .then(loadConfirmations)
              .then(() => e.detail.complete())
            }
          >
            <IonRefresherContent />
          </IonRefresher>

          <div className="px-4 pt-4 pb-8 flex flex-col gap-4">

            {/* ── Summary strip ──────────────────────────────────────────── */}
            <section role="region" aria-label="Résumé des alertes locales">
              <div className="grid grid-cols-4 gap-2">
                <KpiCard
                  label="CRITIQUE"
                  value={summary.critique}
                  tone={summary.critique > 0 ? 'critical' : 'default'}
                />
                <KpiCard
                  label="HAUTE"
                  value={summary.haute}
                  tone={summary.haute > 0 ? 'warning' : 'default'}
                />
                <KpiCard
                  label="NORMALE"
                  value={summary.normale}
                  tone="default"
                />
                <KpiCard
                  label="INFO"
                  value={summary.info}
                  tone="default"
                />
              </div>
            </section>

            {/* ── Empty state global ────────────────────────────────────── */}
            {showEmpty && (
              <div
                className="flex flex-col items-center justify-center py-16 px-8 text-center animate-fade-in-up"
                role="status"
              >
                <div className="w-20 h-20 rounded-2xl bg-bg-1 border border-border flex items-center justify-center mb-4 text-accent">
                  <CheckCircle2 size={44} aria-hidden="true" />
                </div>
                <h3 className="ft-heading text-text-0 text-[18px] mb-2 uppercase tracking-wide">
                  Aucune alerte active
                </h3>
                <p className="text-text-2 text-[13px] max-w-xs leading-relaxed">
                  Votre élevage tourne bien. Le troupeau est sous contrôle.
                </p>
              </div>
            )}

            {/* ── Section Serveur ───────────────────────────────────────── */}
            {alertesServeur.length > 0 && (
              <section role="region" aria-label="Alertes serveur">
                <SectionDivider
                  label={`Serveur · ${alertesServeur.length}`}
                  action={
                    <span className="flex items-center gap-1 text-text-2 font-mono text-[10px] uppercase tracking-wide">
                      <Server size={11} />
                      Sheets
                    </span>
                  }
                />
                <ul className="flex flex-col gap-2" aria-label="Liste alertes serveur">
                  {alertesServeur.map((a, i) => (
                    <li key={`srv-${i}-${a.sujet}-${a.date}`}>
                      <AlertDenseRow
                        priority={a.priorite}
                        title={a.sujet}
                        description={
                          a.actionRequise
                            ? `${a.description} — ${a.actionRequise}`
                            : a.description
                        }
                        categoryLabel={a.categorie}
                        metaLabel={a.date || undefined}
                        extraChip={{ label: 'SRV', tone: 'blue' }}
                        ariaRole={a.priorite === 'CRITIQUE' ? 'alert' : 'listitem'}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ── Section Locales ───────────────────────────────────────── */}
            {alerts.length > 0 && (
              <section role="region" aria-label="Alertes locales GTTT">
                <SectionDivider
                  label={`Locales · ${totalLocal}`}
                  action={
                    activeFilter !== 'ALL' ? (
                      <button
                        type="button"
                        onClick={() => setActiveFilter('ALL')}
                        className="text-accent font-mono text-[10px] uppercase tracking-wide pressable"
                      >
                        Effacer filtre
                      </button>
                    ) : undefined
                  }
                />
                {filteredAlerts.length === 0 ? (
                  <div className="card-dense flex flex-col items-center gap-2 py-8 text-center">
                    <AlertTriangle size={24} className="text-text-2" />
                    <p className="text-[12px] text-text-2">
                      Aucune alerte dans cette catégorie.
                    </p>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2" aria-label="Liste alertes locales">
                    {filteredAlerts.map(alert => {
                      const hasConfirm = hasPendingForAlert(alert.id);
                      return (
                        <li key={alert.id}>
                          <AlertDenseRow
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

            {/* ── Section En attente de confirmation ────────────────────── */}
            {pendingConfirmations.length > 0 && (
              <section role="region" aria-label="Actions en attente de confirmation">
                <SectionDivider
                  label={`En attente · ${pendingConfirmations.length}`}
                />
                <ul className="flex flex-col gap-2" aria-label="Actions à confirmer">
                  {pendingConfirmations.map(pc => (
                    <li key={pc.id}>
                      <div
                        className="card-dense flex flex-col gap-1"
                        style={{ borderLeft: '2px solid var(--color-accent)', padding: '12px 14px' }}
                      >
                        <div className="flex items-center gap-1.5">
                          <Chip label="À confirmer" tone="accent" size="xs" />
                          <span className="ml-auto font-mono text-[11px] text-text-2">
                            {formatDistanceToNow(new Date(pc.createdAt), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </span>
                        </div>
                        <div
                          className="font-mono text-[13px] font-bold uppercase tracking-wide text-text-0 leading-snug line-clamp-2"
                          style={{ fontFamily: 'var(--font-display), var(--font-mono-jb)' }}
                        >
                          {pc.alertTitle}
                        </div>
                        <p className="text-[12px] text-text-1 leading-snug line-clamp-2">
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
        <AgritechNav />

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
