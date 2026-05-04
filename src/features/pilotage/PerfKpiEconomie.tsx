import React from 'react';
import { Card, StatsGrid, Stat } from '@/design-system';

interface PerfKpiEconomieProps {
  margeBruteParTruie: number | null;
  roiMoyen: number | null;
}

const PerfKpiEconomie: React.FC<PerfKpiEconomieProps> = ({
  margeBruteParTruie,
  roiMoyen,
}) => {
  return (
    <Card>
      <StatsGrid cols={2}>
        <Stat
          value={margeBruteParTruie !== null
            ? `${margeBruteParTruie} €/an`
            : '—'}
          label="Marge brute / truie"
        />
        <Stat
          value={roiMoyen !== null ? `${roiMoyen} %` : '—'}
          label="ROI moyen"
          tone={roiMoyen !== null && roiMoyen < 0 ? 'danger' : 'default'}
        />
      </StatsGrid>
    </Card>
  );
};

export default PerfKpiEconomie;
