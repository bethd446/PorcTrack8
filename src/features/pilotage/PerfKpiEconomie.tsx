import React from 'react';
import { Card } from '@/design-system';

interface PerfKpiEconomieProps {
  margeBruteParTruie: number | null;
  roiMoyen: number | null;
}

/**
 * Économie — la question que l'éleveur se pose à 6h du matin :
 * « est-ce que chaque truie me rapporte de l'argent ? »
 * Hiérarchie tranchée : la marge brute/truie est le chiffre roi (billboard
 * Big Shoulders), le ROI est sa lecture relative en dessous. Pas de grille
 * 2-up neutre où les deux chiffres se valent.
 */
const PerfKpiEconomie: React.FC<PerfKpiEconomieProps> = ({
  margeBruteParTruie,
  roiMoyen,
}) => {
  const margeKnown = margeBruteParTruie !== null;
  const roiKnown = roiMoyen !== null;
  const roiNeg = roiKnown && roiMoyen < 0;
  const margeNeg = margeKnown && margeBruteParTruie < 0;
  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
          Marge brute par truie · an
        </span>
        <span
          className="num"
          style={{
            fontFamily: 'var(--pt-font-display)',
            fontWeight: 900,
            fontSize: 40,
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
            color: !margeKnown
              ? 'var(--pt-text-subtle)'
              : margeNeg
                ? 'var(--pt-danger)'
                : 'var(--pt-primary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {margeKnown
            ? `${margeBruteParTruie.toLocaleString('fr-FR')} FCFA`
            : '—'}
        </span>
        <span
          className="num"
          style={{
            fontFamily: 'var(--pt-font-mono)',
            fontSize: 12,
            color: 'var(--pt-text-muted)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {roiKnown ? (
            <>
              ROI moyen{' '}
              <strong
                style={{
                  color: roiNeg ? 'var(--pt-danger)' : 'var(--pt-success)',
                }}
              >
                {roiMoyen > 0 ? '+' : ''}
                {roiMoyen} %
              </strong>
              {roiNeg ? ' · tu perds de l’argent sur le cycle' : ' sur le capital engagé'}
            </>
          ) : (
            'ROI calculé après le premier cycle clos'
          )}
        </span>
      </div>
    </Card>
  );
};

export default PerfKpiEconomie;
