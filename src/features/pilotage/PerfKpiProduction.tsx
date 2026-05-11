import React from 'react';
import { Card, StatsGrid, Stat } from '@/design-system';
import {
  GMQ_CIBLES,
  type TrancheAge,
} from '../../services/perfKpiAnalyzer';

interface PerfKpiProductionProps {
  sevresParTruieAn: number;
  porteesParTruieAn: number;
  moyNV: number;
  tauxMortaliteNaissanceSevrage: number;
  icrKg: number | null;
  icGlobal: number | null;
  gmqParTranche: Record<TrancheAge, number | null>;
  mortalite: {
    maternitePct: number | null;
    postSevragePct: number | null;
    engraissementPct: number | null;
    finitionPct: number | null;
  };
  nbBandes: number;
  nbPorteesSevrees12m: number;
  formatNum: (n: number) => string;
  emptyHint: (n: number) => string;
}

const trancheLabel: Record<TrancheAge, string> = {
  POST_SEVRAGE: 'GMQ post-sev',
  CROISSANCE: 'GMQ croissance',
  ENGRAISSEMENT: 'GMQ engr.',
  FINITION: 'GMQ finition',
};

const PerfKpiProduction: React.FC<PerfKpiProductionProps> = ({
  sevresParTruieAn,
  porteesParTruieAn,
  moyNV,
  tauxMortaliteNaissanceSevrage,
  icrKg,
  icGlobal,
  gmqParTranche,
  mortalite,
  nbBandes,
  nbPorteesSevrees12m,
  formatNum,
  emptyHint,
}) => {
  return (
    <Card>
      <StatsGrid cols={4}>
        <Stat
          value={formatNum(sevresParTruieAn)}
          label="Sevrés/truie/an"
          tone={sevresParTruieAn > 0 && sevresParTruieAn < 18 ? 'danger' : 'default'}
        />
        <Stat value={formatNum(porteesParTruieAn)} label="Portées/truie/an" />
        <Stat value={formatNum(moyNV)} label="NV moyen" />
        <Stat
          value={`${formatNum(tauxMortaliteNaissanceSevrage)} %`}
          label="Mort. naiss › sevrage"
          tone={tauxMortaliteNaissanceSevrage > 15 ? 'danger' : 'default'}
        />
        <Stat
          value={icrKg !== null ? `${formatNum(icrKg)} kg/kg` : '—'}
          label="ICR (cible 2.6-2.9)"
        />
        <Stat
          value={icGlobal !== null ? `${formatNum(icGlobal)} kg/kg` : '—'}
          label="IC global"
        />
        {(['POST_SEVRAGE', 'CROISSANCE', 'ENGRAISSEMENT', 'FINITION'] as TrancheAge[]).map((tr) => {
          const v = gmqParTranche[tr];
          return (
            <div key={tr}>
              <Stat
                value={v !== null ? `${v} g/j` : '—'}
                label={`${trancheLabel[tr]} (cible ${GMQ_CIBLES[tr]})`}
              />
            </div>
          );
        })}
        <Stat
          value={mortalite.maternitePct !== null
            ? `${formatNum(mortalite.maternitePct)} %`
            : '—'}
          label="Mort. maternité (< 12 %)"
          tone={mortalite.maternitePct !== null && mortalite.maternitePct > 15 ? 'danger' : 'default'}
        />
        <Stat
          value={mortalite.postSevragePct !== null
            ? `${formatNum(mortalite.postSevragePct)} %`
            : '—'}
          label="Mort. post-sev (< 3 %)"
        />
        <Stat
          value={mortalite.engraissementPct !== null
            ? `${formatNum(mortalite.engraissementPct)} %`
            : '—'}
          label="Mort. engr. (< 2 %)"
        />
        <Stat
          value={mortalite.finitionPct !== null
            ? `${formatNum(mortalite.finitionPct)} %`
            : '—'}
          label="Mort. finition (< 1.5 %)"
        />
      </StatsGrid>
      {(sevresParTruieAn === 0 || porteesParTruieAn === 0 || moyNV === 0) && (
        <p style={{ marginTop: 12, fontSize: 11, color: 'var(--pt-text-subtle)' }}>
          {emptyHint(nbBandes)}
        </p>
      )}
      {icrKg === null && (
        <p style={{ marginTop: 8, fontSize: 11, color: 'var(--pt-text-subtle)' }}>
          Saisie aliment manquante ({nbPorteesSevrees12m} portée{nbPorteesSevrees12m > 1 ? 's' : ''} sevrée{nbPorteesSevrees12m > 1 ? 's' : ''}).
        </p>
      )}
    </Card>
  );
};

export default PerfKpiProduction;
