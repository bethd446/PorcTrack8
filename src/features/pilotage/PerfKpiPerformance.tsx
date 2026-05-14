import React from 'react';
import { Card } from '@/design-system';

type StatTone = 'default' | 'accent' | 'danger';

interface PerfKpiPerformanceProps {
  isseMoyJours: number | null;
  iemMoyJours: number | null;
  tauxMBPct: number | null;
  tauxRenouvellementPct: number | null;
  intervalSevrageSaillieMoyJours: number | null;
  nbMbAVenir30j: number;
  isseTone: StatTone;
  iemTone: StatTone;
  tauxMBTone: StatTone;
  renouvTone: StatTone;
  formatNum: (n: number) => string;
}

const TONE_COLOR: Record<StatTone, string> = {
  default: 'var(--pt-ink)',
  accent: 'var(--pt-accent)',
  danger: 'var(--pt-danger)',
};

interface KpiLineProps {
  label: string;
  value: string;
  tone?: StatTone;
  cible?: string;
}

/** Ligne dense clé/valeur : le label métier à gauche, le chiffre tabular à
 *  droite teinté par son état, la cible en pied — lecture diagonale rapide. */
const KpiLine: React.FC<KpiLineProps> = ({ label, value, tone = 'default', cible }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12,
      padding: '10px 0',
      borderBottom: '1px solid var(--pt-line)',
    }}
  >
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13, color: 'var(--pt-ink)', fontWeight: 600 }}>{label}</div>
      {cible ? (
        <div
          style={{
            fontFamily: 'var(--pt-font-mono)',
            fontSize: 11,
            color: 'var(--pt-text-subtle)',
            marginTop: 1,
          }}
        >
          {cible}
        </div>
      ) : null}
    </div>
    <span
      className="num"
      style={{
        fontFamily: 'var(--pt-font-display)',
        fontWeight: 900,
        fontSize: 22,
        letterSpacing: '-0.01em',
        color: TONE_COLOR[tone],
        fontVariantNumeric: 'tabular-nums',
        flexShrink: 0,
      }}
    >
      {value}
    </span>
  </div>
);

/**
 * Performance technique repro. L'ISSE (intervalle sevrage → saillie) est le
 * KPI roi du naisseur — il passe en hero. Les autres indicateurs s'enchaînent
 * en lignes denses cible-en-pied, pas en grille où tout se vaut.
 */
const PerfKpiPerformance: React.FC<PerfKpiPerformanceProps> = ({
  isseMoyJours,
  iemMoyJours,
  tauxMBPct,
  tauxRenouvellementPct,
  intervalSevrageSaillieMoyJours,
  nbMbAVenir30j,
  isseTone,
  iemTone,
  tauxMBTone,
  renouvTone,
  formatNum,
}) => {
  const isseKnown = isseMoyJours !== null;
  return (
    <Card>
      <div style={{ marginBottom: 4 }}>
        <span
          style={{
            fontFamily: 'var(--pt-font-mono)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--pt-text-subtle)',
          }}
        >
          Sevrage › saillie · cible 3-7 j
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            className="num"
            style={{
              fontFamily: 'var(--pt-font-display)',
              fontWeight: 900,
              fontSize: 44,
              lineHeight: 0.9,
              letterSpacing: '-0.02em',
              color: isseKnown ? TONE_COLOR[isseTone] : 'var(--pt-text-subtle)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {isseKnown ? formatNum(isseMoyJours) : '—'}
          </span>
          {isseKnown ? (
            <span style={{ fontSize: 18, color: 'var(--pt-text-muted)' }}>jours</span>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <KpiLine
          label="Entre mises-bas"
          value={iemMoyJours !== null ? `${formatNum(iemMoyJours)} j` : '—'}
          tone={iemTone}
          cible="cible 140-150 j"
        />
        <KpiLine
          label="Saillies réussies"
          value={tauxMBPct !== null ? `${formatNum(tauxMBPct)} %` : '—'}
          tone={tauxMBTone}
          cible="cible ≥ 88 %"
        />
        <KpiLine
          label="Renouvellement annuel"
          value={tauxRenouvellementPct !== null ? `${formatNum(tauxRenouvellementPct)} %` : '—'}
          tone={renouvTone}
          cible="cible 30-40 %/an"
        />
        <KpiLine
          label="Intervalle sevrage-saillie médian"
          value={intervalSevrageSaillieMoyJours !== null
            ? `${formatNum(intervalSevrageSaillieMoyJours)} j`
            : '—'}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 0 0',
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--pt-ink)', fontWeight: 600 }}>
            Mises-bas sous 30 jours
          </div>
          <span
            className="num"
            style={{
              fontFamily: 'var(--pt-font-display)',
              fontWeight: 900,
              fontSize: 22,
              color: 'var(--pt-ink)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {nbMbAVenir30j}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default PerfKpiPerformance;
