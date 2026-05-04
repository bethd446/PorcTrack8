import React from 'react';
import { Card, Button, StatsGrid, Stat } from '@/design-system';
import { FARM_CONFIG } from '../../config/farm';

interface BatimentsSummaryProps {
  onSeeAll: () => void;
}

const BatimentsSummary: React.FC<BatimentsSummaryProps> = ({ onSeeAll }) => {
  const stats = [
    { label: 'Maternité', cap: FARM_CONFIG.MATERNITE_LOGES_CAPACITY },
    { label: 'Post-sevrage', cap: FARM_CONFIG.POST_SEVRAGE_LOGES_CAPACITY },
    { label: 'Engraissement', cap: FARM_CONFIG.ENGRAISSEMENT_LOGES_CAPACITY },
  ];
  return (
    <Card>
      <StatsGrid cols={3}>
        {stats.map((s) => (
          <div key={s.label}>
            <Stat value={s.cap} label={`${s.label} (loges)`} />
          </div>
        ))}
      </StatsGrid>
      <div style={{ marginTop: 16 }}>
        <Button variant="secondary" size="sm" onClick={onSeeAll}>
          Voir le plan complet
        </Button>
      </div>
    </Card>
  );
};

export default BatimentsSummary;
