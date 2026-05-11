import React from 'react';
import { Card, StatsGrid, Stat } from '@/design-system';

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
  return (
    <Card>
      <StatsGrid cols={3}>
        <Stat
          value={isseMoyJours !== null ? `${formatNum(isseMoyJours)} j` : '—'}
          label="Sevrage › saillie"
          tone={isseTone}
        />
        <Stat
          value={iemMoyJours !== null ? `${formatNum(iemMoyJours)} j` : '—'}
          label="Entre mises-bas"
          tone={iemTone}
        />
        <Stat
          value={tauxMBPct !== null ? `${formatNum(tauxMBPct)} %` : '—'}
          label="% saillies réussies"
          tone={tauxMBTone}
        />
        <Stat
          value={tauxRenouvellementPct !== null ? `${formatNum(tauxRenouvellementPct)} %` : '—'}
          label="Renouv. annuel"
          tone={renouvTone}
        />
        <Stat
          value={intervalSevrageSaillieMoyJours !== null
            ? `${formatNum(intervalSevrageSaillieMoyJours)} j`
            : '—'}
          label="Interv. sev-sail."
        />
        <Stat value={nbMbAVenir30j} label="MB à venir 30 j" />
      </StatsGrid>
      <p style={{ marginTop: 12, fontSize: 11, color: 'var(--pt-text-subtle)' }}>
        Cibles : ISSE 3-7 j · IEM 140-150 j · Taux MB ≥ 88 % · Renouv. 30-40 %/an
      </p>
    </Card>
  );
};

export default PerfKpiPerformance;
