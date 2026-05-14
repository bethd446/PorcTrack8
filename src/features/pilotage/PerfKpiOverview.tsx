import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Card, Tag, Empty } from '@/design-system';

type TagVariant = 'default' | 'primary' | 'accent' | 'soft' | 'danger' | 'warning' | 'success';

interface PerfKpiOverviewProps {
  hasData: boolean;
  statutLabel: string;
  statutVariant: TagVariant;
  nbTruiesEnCycle: number;
  nbTruiesTotal: number;
  truiesEnCyclePct: number;
  roiMoyen: number | null;
  nbMbAVenir30j: number;
}

/**
 * Vue d'ensemble — le ratio « combien de mes truies travaillent vraiment »
 * est le chiffre dominant ; ROI et mises-bas à venir sont des appuis en pied
 * de carte, pas trois cases d'égale importance.
 */
const PerfKpiOverview: React.FC<PerfKpiOverviewProps> = ({
  hasData,
  statutLabel,
  statutVariant,
  nbTruiesEnCycle,
  nbTruiesTotal,
  truiesEnCyclePct,
  roiMoyen,
  nbMbAVenir30j,
}) => {
  const cyclePct = Math.max(0, Math.min(100, truiesEnCyclePct));
  const cycleBas = cyclePct < 70;
  const roiKnown = roiMoyen !== null;
  const roiNeg = roiKnown && roiMoyen < 0;
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Tag variant={statutVariant}>{statutLabel}</Tag>
      </div>
      {hasData ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span
              className="num"
              style={{
                fontFamily: 'var(--pt-font-display)',
                fontWeight: 900,
                fontSize: 44,
                lineHeight: 0.9,
                letterSpacing: '-0.02em',
                color: cycleBas ? 'var(--pt-warning)' : 'var(--pt-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {nbTruiesEnCycle}
              <span style={{ fontSize: 24, color: 'var(--pt-text-subtle)' }}>
                /{nbTruiesTotal}
              </span>
            </span>
            <span
              style={{
                fontFamily: 'var(--pt-font-mono)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--pt-text-muted)',
              }}
            >
              truies en cycle
              <br />
              {cyclePct} % du cheptel
            </span>
          </div>
          <div
            aria-hidden
            style={{
              marginTop: 10,
              height: 6,
              borderRadius: 99,
              background: 'var(--pt-line)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${cyclePct}%`,
                height: '100%',
                background: cycleBas ? 'var(--pt-warning)' : 'var(--pt-primary)',
              }}
            />
          </div>
          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: '1px solid var(--pt-line)',
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: 'var(--pt-font-mono)',
              fontSize: 12,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span style={{ color: 'var(--pt-text-muted)' }}>
              ROI estimé{' '}
              <strong style={{ color: roiNeg ? 'var(--pt-danger)' : 'var(--pt-ink)' }}>
                {roiKnown ? `${roiMoyen > 0 ? '+' : ''}${roiMoyen} %` : '—'}
              </strong>
            </span>
            <span style={{ color: 'var(--pt-text-muted)' }}>
              <strong style={{ color: 'var(--pt-ink)' }}>{nbMbAVenir30j}</strong>{' '}
              mises-bas sous 30 j
            </span>
          </div>
        </>
      ) : (
        <Empty>
          <TrendingUp size={30} aria-hidden="true" style={{ marginBottom: 8, color: 'var(--pt-text-subtle)' }} />
          <div>Pas encore de moyennes.</div>
          <div style={{ fontSize: 12, color: 'var(--pt-text-subtle)', marginTop: 4 }}>
            Saisis tes saillies et mises-bas — les KPIs s’affichent dès le premier cycle clos.
          </div>
        </Empty>
      )}
    </Card>
  );
};

export default PerfKpiOverview;
