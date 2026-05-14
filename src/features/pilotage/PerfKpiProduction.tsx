import React from 'react';
import { Card } from '@/design-system';
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
  POST_SEVRAGE: 'Post-sevrage',
  CROISSANCE: 'Croissance',
  ENGRAISSEMENT: 'Engraissement',
  FINITION: 'Finition',
};

const BlocLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontFamily: 'var(--pt-font-mono)',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--pt-text-subtle)',
      marginBottom: 8,
      marginTop: 18,
    }}
  >
    {children}
  </div>
);

interface ProdLineProps {
  label: string;
  value: string;
  cible?: string;
  danger?: boolean;
}

/** Ligne métier dense : label + cible discrète, chiffre tabular teinté. */
const ProdLine: React.FC<ProdLineProps> = ({ label, value, cible, danger }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12,
      padding: '9px 0',
      borderBottom: '1px solid var(--pt-line)',
    }}
  >
    <div style={{ minWidth: 0 }}>
      <span style={{ fontSize: 13, color: 'var(--pt-ink)', fontWeight: 600 }}>{label}</span>
      {cible ? (
        <span
          style={{
            fontFamily: 'var(--pt-font-mono)',
            fontSize: 11,
            color: 'var(--pt-text-subtle)',
            marginLeft: 8,
          }}
        >
          {cible}
        </span>
      ) : null}
    </div>
    <span
      className="num"
      style={{
        fontFamily: 'var(--pt-font-display)',
        fontWeight: 900,
        fontSize: 20,
        letterSpacing: '-0.01em',
        color: danger ? 'var(--pt-danger)' : 'var(--pt-ink)',
        fontVariantNumeric: 'tabular-nums',
        flexShrink: 0,
      }}
    >
      {value}
    </span>
  </div>
);

/**
 * Production — au lieu d'un mur de 12 cases uniformes, quatre blocs métier
 * que l'éleveur lit l'un après l'autre : ce que produisent ses truies, comment
 * l'aliment se convertit, le rythme de croissance, et où ses porcs meurent.
 */
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
  const tranches: TrancheAge[] = ['POST_SEVRAGE', 'CROISSANCE', 'ENGRAISSEMENT', 'FINITION'];
  return (
    <Card>
      <div style={{ marginTop: 2 }}>
        <BlocLabel>Ce que produit le cheptel</BlocLabel>
        <ProdLine
          label="Sevrés par truie / an"
          value={formatNum(sevresParTruieAn)}
          cible="cible ≥ 18"
          danger={sevresParTruieAn > 0 && sevresParTruieAn < 18}
        />
        <ProdLine label="Portées par truie / an" value={formatNum(porteesParTruieAn)} />
        <ProdLine label="Nés vivants par portée" value={formatNum(moyNV)} />
        <ProdLine
          label="Mortalité naissance › sevrage"
          value={`${formatNum(tauxMortaliteNaissanceSevrage)} %`}
          cible="seuil 15 %"
          danger={tauxMortaliteNaissanceSevrage > 15}
        />
      </div>

      <div>
        <BlocLabel>Conversion de l’aliment</BlocLabel>
        <ProdLine
          label="ICR — réel"
          value={icrKg !== null ? `${formatNum(icrKg)} kg/kg` : '—'}
          cible="cible 2.6-2.9"
        />
        <ProdLine
          label="IC global"
          value={icGlobal !== null ? `${formatNum(icGlobal)} kg/kg` : '—'}
        />
      </div>

      <div>
        <BlocLabel>GMQ par phase d’élevage</BlocLabel>
        {tranches.map((tr, i) => {
          const v = gmqParTranche[tr];
          const isLast = i === tranches.length - 1;
          return (
            <div
              key={tr}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 12,
                padding: '9px 0',
                borderBottom: isLast ? 'none' : '1px solid var(--pt-line)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 13, color: 'var(--pt-ink)', fontWeight: 600 }}>
                  {trancheLabel[tr]}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--pt-font-mono)',
                    fontSize: 11,
                    color: 'var(--pt-text-subtle)',
                    marginLeft: 8,
                  }}
                >
                  cible {GMQ_CIBLES[tr]}
                </span>
              </div>
              <span
                className="num"
                style={{
                  fontFamily: 'var(--pt-font-display)',
                  fontWeight: 900,
                  fontSize: 20,
                  letterSpacing: '-0.01em',
                  color: v !== null ? 'var(--pt-ink)' : 'var(--pt-text-subtle)',
                  fontVariantNumeric: 'tabular-nums',
                  flexShrink: 0,
                }}
              >
                {v !== null ? `${v} g/j` : '—'}
              </span>
            </div>
          );
        })}
      </div>

      <div>
        <BlocLabel>Où meurent les porcs</BlocLabel>
        <ProdLine
          label="Maternité"
          value={mortalite.maternitePct !== null ? `${formatNum(mortalite.maternitePct)} %` : '—'}
          cible="seuil 12 %"
          danger={mortalite.maternitePct !== null && mortalite.maternitePct > 15}
        />
        <ProdLine
          label="Post-sevrage"
          value={mortalite.postSevragePct !== null ? `${formatNum(mortalite.postSevragePct)} %` : '—'}
          cible="seuil 3 %"
        />
        <ProdLine
          label="Engraissement"
          value={mortalite.engraissementPct !== null ? `${formatNum(mortalite.engraissementPct)} %` : '—'}
          cible="seuil 2 %"
        />
        <ProdLine
          label="Finition"
          value={mortalite.finitionPct !== null ? `${formatNum(mortalite.finitionPct)} %` : '—'}
          cible="seuil 1.5 %"
        />
      </div>

      {(sevresParTruieAn === 0 || porteesParTruieAn === 0 || moyNV === 0) && (
        <p style={{ marginTop: 14, fontSize: 11, color: 'var(--pt-text-subtle)' }}>
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
