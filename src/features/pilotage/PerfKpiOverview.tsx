import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Card, Tag, StatsGrid, Stat, Empty } from '@/design-system';

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
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Tag variant={statutVariant}>{statutLabel}</Tag>
      </div>
      {hasData ? (
        <StatsGrid cols={3}>
          <Stat
            value={`${nbTruiesEnCycle}/${nbTruiesTotal}`}
            label={`Truies en cycle (${truiesEnCyclePct} %)`}
          />
          <Stat
            value={roiMoyen !== null ? `${roiMoyen} %` : '—'}
            label="ROI moyen estimé"
            tone={roiMoyen !== null && roiMoyen < 0 ? 'danger' : 'default'}
          />
          <Stat value={nbMbAVenir30j} label="Mises-bas 30 j" />
        </StatsGrid>
      ) : (
        <Empty>
          <TrendingUp size={32} aria-hidden="true" style={{ marginBottom: 8, color: 'var(--pt-text-subtle)' }} />
          <div>Saisie en cours.</div>
          <div style={{ fontSize: 12, color: 'var(--pt-text-subtle)', marginTop: 4 }}>
            Reviens dans 2-3 mois pour voir tes premières moyennes.
          </div>
        </Empty>
      )}
    </Card>
  );
};

export default PerfKpiOverview;
