import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Baby, AlertTriangle, Package } from 'lucide-react';
import { KpiCard as AgritechKpi } from '../agritech';

interface KpiGridMobileProps {
  loading: boolean;
  truiesCount: number;
  alertsCount: number;
  alertesServeurCount: number;
  stockAlimentCount: number;
  stockVetoCount: number;
  kpiPleines: number;
  kpiMaternite: number;
  kpiAlertesTotal: number;
  kpiStocksRuptures: number;
  pulse: boolean;
}

const KpiGridMobile: React.FC<KpiGridMobileProps> = ({
  loading,
  truiesCount,
  alertsCount,
  alertesServeurCount,
  stockAlimentCount,
  stockVetoCount,
  kpiPleines,
  kpiMaternite,
  kpiAlertesTotal,
  kpiStocksRuptures,
  pulse,
}) => {
  const navigate = useNavigate();
  return (
    <section
      aria-label="Indicateurs clés"
      role="region"
      className="grid grid-cols-2 gap-2.5"
    >
      <AgritechKpi
        label="Pleines"
        value={loading && truiesCount === 0 ? '—' : kpiPleines}
        icon={<Heart size={14} aria-hidden="true" />}
        tone="success"
        onClick={() => navigate('/troupeau/truies')}
      />
      <AgritechKpi
        label="Maternité"
        value={loading && truiesCount === 0 ? '—' : kpiMaternite}
        icon={<Baby size={14} aria-hidden="true" />}
        tone="warning"
        onClick={() => navigate('/troupeau/truies')}
      />
      <AgritechKpi
        label="Alertes"
        value={loading && alertsCount === 0 && alertesServeurCount === 0 ? '—' : kpiAlertesTotal}
        icon={<AlertTriangle size={14} aria-hidden="true" />}
        tone={kpiAlertesTotal > 0 ? 'warning' : 'default'}
        onClick={() => navigate('/alerts')}
        className={pulse ? 'animate-pulse' : ''}
      />
      <AgritechKpi
        label="Ruptures"
        value={loading && stockAlimentCount === 0 && stockVetoCount === 0 ? '—' : kpiStocksRuptures}
        icon={<Package size={14} aria-hidden="true" />}
        tone={kpiStocksRuptures > 0 ? 'critical' : 'default'}
        onClick={() => navigate('/ressources')}
      />
    </section>
  );
};

export default KpiGridMobile;
