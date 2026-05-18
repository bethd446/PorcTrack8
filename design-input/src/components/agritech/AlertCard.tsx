/**
 * AlertCard — carte d'alerte unifiée (Sprint E1 + V70 flat icons).
 *
 * Composant unique utilisé partout où une FarmAlert (ou une alerte serveur
 * normalisée) doit être affichée avec un bouton "OK ✓" d'acquittement explicite
 * et, optionnellement, un bouton d'action métier (ex: "Saisir pesée",
 * "Confirmer transition").
 *
 * - Icône flat WebP V70 selon la règle GTTT (R1..R16) si dispo, sinon Lucide
 *   selon priority (CRITIQUE / HAUTE / NORMALE / INFO).
 * - Titre + sous-titre (message)
 * - Timer "Depuis Xj" pour les alertes critiques/hautes datées
 * - 2 boutons côte à côte (min-h 44px) : "OK ✓" primary + Action secondary
 *
 * NB : ne fait PAS l'appel `dismissAlert(...)` lui-même — délègue au parent
 * pour rester contrôlé. Cela permet au parent de gérer toast/refresh/animation.
 */

import React from 'react';
import { AlertTriangle, Bell, Info, Check } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { FarmAlert, AlertPriority } from '../../services/alertEngine';
import { Button } from '@/design-system';

export interface AlertCardProps {
  alert: FarmAlert;
  onAcknowledge: (alertId: string) => void;
  /** Action métier optionnelle (ex: ouvrir un form, naviguer vers la fiche). */
  onAction?: () => void;
  /** Libellé du bouton d'action métier (requis si onAction fourni). */
  actionLabel?: string;
  /** ARIA role override (CRITIQUE → 'alert', sinon 'listitem'). */
  ariaRole?: 'alert' | 'listitem';
}

interface PriorityVisual {
  Icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;
  color: string;
  background: string;
  label: string;
}

const PRIORITY_VISUAL: Record<AlertPriority, PriorityVisual> = {
  CRITIQUE: {
    Icon: AlertTriangle,
    color: 'var(--pt-danger)',
    background: 'var(--pt-surface-danger)',
    label: 'Critique',
  },
  HAUTE: {
    Icon: Bell,
    color: 'var(--pt-accent-deep)',
    background: 'var(--pt-surface-warning)',
    label: 'Haute',
  },
  NORMALE: {
    Icon: Info,
    color: 'var(--pt-accent)',
    background: 'var(--pt-surface-warm)',
    label: 'Normale',
  },
  INFO: {
    Icon: Info,
    color: 'var(--pt-text-muted)',
    background: 'var(--pt-surface-alt)',
    label: 'Info',
  },
};

function formatDepuis(createdAt?: Date): string | null {
  if (!createdAt) return null;
  try {
    return `Depuis ${formatDistanceToNowStrict(createdAt, { locale: fr })}`;
  } catch {
    return null;
  }
}

/**
 * ruleIcon — résout l'icône flat V70 (16 règles GTTT) pour une alerte donnée.
 *
 * On dérive la règle depuis le préfixe de `alert.id` (cf. `alertId(prefix,...)`
 * dans alertEngine.ts) ou depuis l'id explicite (`surdensite-engraissement`,
 * `phase-poids-*`, `sortie-*`). Retourne `null` si aucun mapping (R7 écho
 * volontairement non couvert — fallback Lucide).
 */
const RULE_ICON_MAP: Record<string, string> = {
  // R1 — Mise-bas (alertId('MB', ...))
  MB: '/images/icons/r1-mise-bas.webp',
  MISE_BAS: '/images/icons/r1-mise-bas.webp',
  R1: '/images/icons/r1-mise-bas.webp',
  // R2 — Sevrage (alertId('SEV', ...))
  SEV: '/images/icons/r2-sevrage.webp',
  SEVRAGE: '/images/icons/r2-sevrage.webp',
  R2: '/images/icons/r2-sevrage.webp',
  // R3 — Retour chaleur (alertId('CHA', ...))
  CHA: '/images/icons/r3-retour-chaleur.webp',
  RETOUR_CHALEUR: '/images/icons/r3-retour-chaleur.webp',
  CHALEUR: '/images/icons/r3-retour-chaleur.webp',
  R3: '/images/icons/r3-retour-chaleur.webp',
  // R4 — Mortalité (alertId('MORT', ...))
  MORT: '/images/icons/r4-mortalite.webp',
  MORTALITE: '/images/icons/r4-mortalite.webp',
  R4: '/images/icons/r4-mortalite.webp',
  // R5 — Stock aliment (alertId('STK', ...))
  STK: '/images/icons/r5-stock-aliment.webp',
  STOCK_ALIMENT: '/images/icons/r5-stock-aliment.webp',
  R5: '/images/icons/r5-stock-aliment.webp',
  // R5b — Stock véto / pharmacie (alertId('VET', ...))
  VET: '/images/icons/r5b-stock-veto.webp',
  STOCK_VETO: '/images/icons/r5b-stock-veto.webp',
  PHARMACIE: '/images/icons/r5b-stock-veto.webp',
  R5B: '/images/icons/r5b-stock-veto.webp',
  // R6 — Regroupement bandes (alertId('REG', ...))
  REG: '/images/icons/r6-regroupement.webp',
  REGROUPEMENT: '/images/icons/r6-regroupement.webp',
  R6: '/images/icons/r6-regroupement.webp',
  // R7 — Échographie : pas d'icône dédiée, on garde le fallback Lucide.
  // R8 — Re-saillie (alertId('RSA', ...))
  RSA: '/images/icons/r8-saillie.webp',
  SAILLIE: '/images/icons/r8-saillie.webp',
  RE_SAILLIE: '/images/icons/r8-saillie.webp',
  R8: '/images/icons/r8-saillie.webp',
  // R9 — Retard phase (alertId('retard', ...))
  RETARD: '/images/icons/r9-retard-phase.webp',
  R9: '/images/icons/r9-retard-phase.webp',
  // R10 — Surdensité ('surdensite-engraissement')
  SURDENSITE: '/images/icons/r10-surdensite.webp',
  R10: '/images/icons/r10-surdensite.webp',
  // R11 — Réforme perf (alertId('REF', truie.id, motif))
  REF: '/images/icons/r11-reforme-perf.webp',
  REFORME_PERF: '/images/icons/r11-reforme-perf.webp',
  R11: '/images/icons/r11-reforme-perf.webp',
  // R12 — Inactivité (réforme par inactivité, partage REF mais via motif)
  INACTIVITE: '/images/icons/r12-inactivite.webp',
  R12: '/images/icons/r12-inactivite.webp',
  // R13 — Pesée (alertId('PES', ...))
  PES: '/images/icons/r13-pesee.webp',
  PESEE: '/images/icons/r13-pesee.webp',
  R13: '/images/icons/r13-pesee.webp',
  // R14 — Orpheline (alertId('ORPH', ...))
  ORPH: '/images/icons/r14-orpheline.webp',
  ORPHELINE: '/images/icons/r14-orpheline.webp',
  R14: '/images/icons/r14-orpheline.webp',
  // R15 — Transition phase ('phase-poids-...')
  TRANSITION: '/images/icons/r15-transition.webp',
  PASSAGE_PHASE: '/images/icons/r15-transition.webp',
  R15: '/images/icons/r15-transition.webp',
  // R16 — Sortie abattoir ('sortie-...')
  SORTIE: '/images/icons/r16-abattoir.webp',
  ABATTOIR: '/images/icons/r16-abattoir.webp',
  R16: '/images/icons/r16-abattoir.webp',
};

function ruleIconFromAlertId(id: string): string | null {
  if (!id) return null;
  const upper = id.toUpperCase();
  // IDs structurés à patterns spéciaux d'abord (multi-segments).
  if (upper.startsWith('PHASE-POIDS-')) return RULE_ICON_MAP.R15 ?? null;
  if (upper.startsWith('SORTIE-')) return RULE_ICON_MAP.R16 ?? null;
  if (upper.startsWith('SURDENSITE')) return RULE_ICON_MAP.R10 ?? null;
  // Sinon préfixe avant le premier '-'.
  const prefix = upper.split('-')[0];
  return RULE_ICON_MAP[prefix] ?? null;
}

const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onAcknowledge,
  onAction,
  actionLabel,
  ariaRole,
}) => {
  const visual = PRIORITY_VISUAL[alert.priority] ?? PRIORITY_VISUAL.INFO;
  const Icon = visual.Icon;
  const flatIconSrc = ruleIconFromAlertId(alert.id);
  const showTimer = alert.priority === 'CRITIQUE' || alert.priority === 'HAUTE';
  const depuis = showTimer ? formatDepuis(alert.createdAt) : null;
  const role = ariaRole ?? (alert.priority === 'CRITIQUE' ? 'alert' : 'listitem');
  const hasAction = typeof onAction === 'function' && !!actionLabel;

  return (
    <article
      role={role}
      data-testid="alert-card"
      data-priority={alert.priority}
      className="pressable"
      style={{
        background: 'var(--pt-surface)',
        border: '1px solid var(--pt-divider)',
        borderRadius: 'var(--pt-radius-md)',
        boxShadow: 'var(--pt-shadow-card)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {flatIconSrc ? (
          <img
            src={flatIconSrc}
            alt=""
            aria-hidden="true"
            width={36}
            height={36}
            loading="lazy"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              flexShrink: 0,
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <span
            aria-hidden="true"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: visual.background,
              color: visual.color,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={18} />
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontFamily: 'var(--pt-font-display)',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--pt-text)',
              margin: 0,
              letterSpacing: '-0.005em',
              lineHeight: 1.3,
            }}
          >
            {alert.title}
          </h3>
          {alert.message && (
            <p
              style={{
                fontFamily: 'var(--pt-font-body)',
                fontSize: 13,
                color: 'var(--pt-text-muted)',
                lineHeight: 1.5,
                margin: '4px 0 0',
              }}
            >
              {alert.message}
            </p>
          )}
        </div>
      </header>

      {depuis && (
        <div
          style={{
            fontFamily: 'var(--pt-font-body)',
            fontSize: 10,
            color: 'var(--pt-text-subtle)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {depuis}
        </div>
      )}

      <footer style={{ display: 'flex', gap: 8 }}>
        <Button
          type="button"
          variant="primary"
          aria-label="Acquitter cette alerte"
          data-testid="alert-card-ack"
          onClick={() => onAcknowledge(alert.id)}
          className="pressable"
          style={{
            flex: 1,
            minHeight: 44,
            padding: '10px 14px',
            borderRadius: 'var(--pt-radius-pill)',
            background: 'var(--pt-primary)',
            color: 'var(--pt-primary-text)',
            border: 'none',
            fontFamily: 'var(--pt-font-body)',
            fontSize: 12,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            height: 'auto',
          }}
        >
          <Check size={14} aria-hidden="true" />
          OK
        </Button>
        {hasAction && (
          <Button
            type="button"
            variant="secondary"
            data-testid="alert-card-action"
            onClick={onAction}
            className="pressable"
            style={{
              flex: 1,
              minHeight: 44,
              padding: '10px 14px',
              borderRadius: 'var(--pt-radius-pill)',
              background: 'var(--pt-surface)',
              color: 'var(--pt-text)',
              border: '1.5px solid var(--pt-divider)',
              fontFamily: 'var(--pt-font-body)',
              fontSize: 12,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              fontWeight: 600,
              cursor: 'pointer',
              height: 'auto',
            }}
          >
            {actionLabel}
          </Button>
        )}
      </footer>
    </article>
  );
};

export default AlertCard;
