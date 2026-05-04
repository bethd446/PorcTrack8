/**
 * ReproductionLotsView — /reproduction/lots
 * ══════════════════════════════════════════════════════════════════════════
 * Sous-hub catégoriel V44 — Archétype 2 (PageHeader + Section/StatsGrid + Tabs).
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
import { Heart, Stethoscope, Baby, Home } from 'lucide-react';

import {
  Button,
  Card,
  PageHeader,
  Section,
  Stat,
  StatsGrid,
  Tabs,
} from '@/design-system';
import AgritechLayout from '../../components/AgritechLayout';
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
    bg: 'var(--bg-surface-2)',
    fg: 'var(--ink)',
    label: 'En saillie',
  },
  GESTATION: {
    bg: 'var(--color-accent-100)',
    fg: 'var(--color-accent-600)',
    label: 'Gestation',
  },
  MATERNITE: {
    bg: 'var(--color-amber-pork-bg)',
    fg: 'var(--color-amber-deep)',
    label: 'Maternité',
  },
  SEVRE: {
    bg: 'var(--color-success-bg)',
    fg: 'var(--color-success-fg)',
    label: 'Sevré',
  },
  TERMINE: {
    bg: 'var(--bg-surface-2)',
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
const SEGMENT_ACTIVE_BG = 'var(--color-accent-500)';
const SEGMENT_INACTIVE_BG = 'var(--bg-surface-2)';
const SEGMENT_ACTIVE_FG = 'var(--bg-surface)';
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
  <Button
    variant="secondary"
    size="small"
    onClick={onClick}
    style={{ whiteSpace: 'nowrap' }}
  >
    {label}
  </Button>
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

  const tabOptions = useMemo(
    () =>
      FILTER_ORDER.map(value => ({
        value,
        label: FILTER_LABEL[value],
        count: counts[value],
      })),
    [counts],
  );

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <div
            className="pt-page"
            style={{ padding: '8px 18px 24px', maxWidth: 1100, margin: '0 auto' }}
          >
            <PageHeader
              eyebrow="Reproduction"
              title="Lots de saillies"
              subtitle="Vagues regroupées par fenêtre de 5 jours"
            />

            <Section label="VUE D'ENSEMBLE" />
            <Card>
              <StatsGrid cols={4}>
                <Stat value={counts.TOUS} label="Lots" />
                <Stat value={counts.EN_SAILLIE} label="En saillie" />
                <Stat value={counts.GESTATION} label="Gestation" tone="accent" />
                <Stat value={counts.SEVRE} label="Sevrés" />
              </StatsGrid>
            </Card>

            <Section label="FILTRE STATUT" />
            <Tabs
              value={statutFilter}
              onChange={(v) => setStatutFilter(v as FilterValue)}
              options={tabOptions}
              ariaLabel="Filtre statut"
            />

            <Section label="LOTS" />
            {batches.length === 0 ? (
              <EmptyState
                icon={<Heart size={28} aria-hidden="true" />}
                title="Aucun lot"
                description="Aucune saillie enregistrée. Ajoutez une saillie depuis la page Reproduction."
                action={
                  <Button variant="secondary" onClick={() => navigate('/reproduction')}>
                    Aller à Reproduction
                  </Button>
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
