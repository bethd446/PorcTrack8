/**
 * ReproductionLotsView — /reproduction/lots
 * ══════════════════════════════════════════════════════════════════════════
 * Vagues de saillies regroupées par fenêtre temporelle. Chaque batch agrège
 * les truies saillies dans une fenêtre de 5 jours (windowDays par défaut),
 * affiche son statut courant (EN_SAILLIE → TERMINE) et la progression dans
 * les 4 étapes du cycle (saillie → écho → MB → sevrage).
 *
 * Source : `buildReproBatches` (V23-S2 / agent S2-A).
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { ChevronLeft, Heart, Stethoscope, Baby, Home, Filter } from 'lucide-react';

import AgritechLayout from '../../components/AgritechLayout';
import Eyebrow from '../../components/design/Eyebrow';
import EmptyState from '../../components/design/EmptyState';
import { useFarm } from '../../context/FarmContext';
import {
  buildReproBatches,
  formatBatchLabel,
  type ReproBatch,
  type ReproBatchStatut,
} from '../../services/reproductionBatchAnalyzer';

// ─── Constantes UI ───────────────────────────────────────────────────────────

type FilterValue = ReproBatchStatut | 'TOUS';

const FILTER_ORDER: FilterValue[] = [
  'TOUS',
  'EN_SAILLIE',
  'GESTATION',
  'MATERNITE',
  'SEVRE',
  'TERMINE',
];

const FILTER_LABEL: Record<FilterValue, string> = {
  TOUS: 'Tous',
  EN_SAILLIE: 'En saillie',
  GESTATION: 'Gestation',
  MATERNITE: 'Maternité',
  SEVRE: 'Sevré',
  TERMINE: 'Terminé',
};

const STATUT_BADGE: Record<
  ReproBatchStatut,
  { bg: string; fg: string; label: string }
> = {
  EN_SAILLIE: {
    bg: 'var(--bg-surface-2, #eef1ee)',
    fg: 'var(--ink)',
    label: 'En saillie',
  },
  GESTATION: {
    bg: 'var(--color-accent-100, #d6efe2)',
    fg: 'var(--color-accent-600, #047857)',
    label: 'Gestation',
  },
  MATERNITE: {
    bg: 'var(--color-amber-pork-bg, #fde9d4)',
    fg: 'var(--color-amber-deep, #c2662b)',
    label: 'Maternité',
  },
  SEVRE: {
    bg: 'var(--color-success-bg, #d1fae5)',
    fg: 'var(--color-success-fg, #065f46)',
    label: 'Sevré',
  },
  TERMINE: {
    bg: 'var(--bg-surface-2, #eef1ee)',
    fg: 'var(--text-2, var(--muted))',
    label: 'Terminé',
  },
};

const STEP_ICONS = {
  saillies: Heart,
  echos: Stethoscope,
  miseBas: Baby,
  sevrages: Home,
} as const;

const STEP_LABELS = {
  saillies: 'Saillies',
  echos: 'Écho',
  miseBas: 'MB',
  sevrages: 'Sevrage',
} as const;

// Couleurs de progression : un segment "actif" (≥1) prend la teinte accent,
// un segment "inactif" reste neutre.
const SEGMENT_ACTIVE_BG = 'var(--color-accent-500, #047857)';
const SEGMENT_INACTIVE_BG = 'var(--bg-surface-2, #eef1ee)';
const SEGMENT_ACTIVE_FG = 'var(--bg-surface, #fff)';
const SEGMENT_INACTIVE_FG = 'var(--muted)';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countByStatut(batches: ReproBatch[]): Record<FilterValue, number> {
  const out: Record<FilterValue, number> = {
    TOUS: batches.length,
    EN_SAILLIE: 0,
    GESTATION: 0,
    MATERNITE: 0,
    SEVRE: 0,
    TERMINE: 0,
  };
  for (const b of batches) {
    out[b.statut] += 1;
  }
  return out;
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

const FilterChip: React.FC<{
  value: FilterValue;
  active: boolean;
  count: number;
  onSelect: (v: FilterValue) => void;
}> = ({ value, active, count, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(value)}
    className="pressable"
    aria-pressed={active}
    style={{
      minHeight: 36,
      padding: '6px 12px',
      borderRadius: 'var(--radius-pill, 999px)',
      border: '1px solid var(--line)',
      background: active ? 'var(--color-accent-500, #047857)' : 'var(--bg-surface)',
      color: active ? 'var(--bg-surface)' : 'var(--ink)',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontWeight: 600,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    }}
  >
    {FILTER_LABEL[value]} ({count})
  </button>
);

const ProgressSegment: React.FC<{
  stepKey: keyof ReproBatch['progression'];
  count: number;
}> = ({ stepKey, count }) => {
  const active = count > 0;
  const Icon = STEP_ICONS[stepKey];
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        background: active ? SEGMENT_ACTIVE_BG : SEGMENT_INACTIVE_BG,
        color: active ? SEGMENT_ACTIVE_FG : SEGMENT_INACTIVE_FG,
        borderRadius: 8,
        padding: '8px 4px',
        minWidth: 0,
      }}
    >
      <Icon size={14} aria-hidden="true" />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {count}
      </span>
      <span
        className="text-[10px] uppercase"
        style={{
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.08em',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {STEP_LABELS[stepKey]}
      </span>
    </div>
  );
};

const TruieChip: React.FC<{
  truieId: string;
  label: string;
  onClick: () => void;
}> = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="pressable"
    style={{
      minHeight: 32,
      padding: '4px 10px',
      borderRadius: 'var(--radius-pill, 999px)',
      border: '1px solid var(--line)',
      background: 'var(--bg-surface)',
      color: 'var(--ink)',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.04em',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </button>
);

const BatchCard: React.FC<{
  batch: ReproBatch;
  onTruieClick: (truieId: string) => void;
}> = ({ batch, onTruieClick }) => {
  const badge = STATUT_BADGE[batch.statut];
  return (
    <article
      className="p-3"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          justifyContent: 'space-between',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: 'var(--ink)',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {formatBatchLabel(batch)}
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--muted)',
              letterSpacing: '0.06em',
              margin: '4px 0 0',
            }}
          >
            {batch.truies.length} truies · {batch.nbPortees} portées · {batch.porceletsVivants} porcelets
          </p>
        </div>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: 'var(--radius-pill, 999px)',
            background: badge.bg,
            color: badge.fg,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {badge.label}
        </span>
      </header>

      {/* Progression 4 segments */}
      <div className="grid grid-cols-4 gap-1" aria-label="Progression du lot">
        <ProgressSegment stepKey="saillies" count={batch.progression.saillies} />
        <ProgressSegment stepKey="echos" count={batch.progression.echos} />
        <ProgressSegment stepKey="miseBas" count={batch.progression.miseBas} />
        <ProgressSegment stepKey="sevrages" count={batch.progression.sevrages} />
      </div>

      {/* Truies impliquées */}
      {batch.truies.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Truies impliquées">
          {batch.truies.map(t => (
            <TruieChip
              key={t.id}
              truieId={t.id}
              label={t.nom ? `${t.displayId} (${t.nom})` : t.displayId}
              onClick={() => onTruieClick(t.id)}
            />
          ))}
        </div>
      )}
    </article>
  );
};

// ─── Composant principal ─────────────────────────────────────────────────────

const ReproductionLotsView: React.FC = () => {
  const navigate = useNavigate();
  const { truies, saillies, bandes } = useFarm();

  const today = useMemo(() => new Date(), []);
  const batches = useMemo(
    () => buildReproBatches({ truies, saillies, bandes, today }),
    [truies, saillies, bandes, today],
  );

  const [statutFilter, setStatutFilter] = useState<FilterValue>('TOUS');
  const counts = useMemo(() => countByStatut(batches), [batches]);
  const filteredBatches = useMemo(
    () =>
      statutFilter === 'TOUS'
        ? batches
        : batches.filter(b => b.statut === statutFilter),
    [batches, statutFilter],
  );

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <div
            className="px-4 pt-5 pb-32 flex flex-col gap-5"
            style={{ maxWidth: 1100, margin: '0 auto' }}
          >
            {/* ── Header ───────────────────────────────────────────── */}
            <header>
              <Eyebrow dotColor="accent">Reproduction · Lots</Eyebrow>
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
                Lots de saillies
              </h1>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  color: 'var(--muted)',
                  margin: 0,
                }}
              >
                Vagues de saillies regroupées par fenêtre de 5 jours
              </p>
            </header>

            {/* ── Bouton retour ────────────────────────────────────── */}
            <div>
              <button
                type="button"
                onClick={() => navigate('/reproduction')}
                className="pressable"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  minHeight: 36,
                  padding: '6px 12px',
                  background: 'transparent',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-pill, 999px)',
                  color: 'var(--ink)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <ChevronLeft size={14} aria-hidden="true" />
                Reproduction
              </button>
            </div>

            {/* ── Filtre statut ────────────────────────────────────── */}
            <section aria-label="Filtre statut">
              <div
                className="flex items-center gap-2"
                style={{ marginBottom: 8, color: 'var(--muted)' }}
              >
                <Filter size={14} aria-hidden="true" />
                <Eyebrow dotColor="muted">Filtre</Eyebrow>
              </div>
              <div className="flex flex-wrap gap-2">
                {FILTER_ORDER.map(value => (
                  <FilterChip
                    key={value}
                    value={value}
                    active={statutFilter === value}
                    count={counts[value]}
                    onSelect={setStatutFilter}
                  />
                ))}
              </div>
            </section>

            {/* ── Liste / Empty state ──────────────────────────────── */}
            {batches.length === 0 ? (
              <EmptyState
                icon={<Heart size={28} aria-hidden="true" />}
                title="Aucun lot"
                description="Aucune saillie enregistrée. Ajoutez une saillie depuis la page Reproduction."
                action={
                  <button
                    type="button"
                    onClick={() => navigate('/reproduction')}
                    className="pressable"
                    style={{
                      minHeight: 44,
                      padding: '10px 18px',
                      borderRadius: 'var(--radius-pill, 999px)',
                      background: 'var(--bg-surface)',
                      color: 'var(--ink)',
                      border: '1px solid var(--line)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Aller à Reproduction
                  </button>
                }
              />
            ) : filteredBatches.length === 0 ? (
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  color: 'var(--muted)',
                  padding: '12px 14px',
                  background: 'var(--bg-surface)',
                  border: '1px dashed var(--line)',
                  borderRadius: 12,
                  margin: 0,
                }}
              >
                Aucun lot ne correspond à ce filtre.
              </p>
            ) : (
              <section
                aria-label="Liste des lots"
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                {filteredBatches.map(batch => (
                  <BatchCard
                    key={batch.id}
                    batch={batch}
                    onTruieClick={truieId => navigate(`/troupeau/truies/${truieId}`)}
                  />
                ))}
              </section>
            )}
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default ReproductionLotsView;
