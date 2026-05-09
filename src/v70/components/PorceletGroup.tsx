import React from 'react';
import type { BandePorcelets, PorceletIndividuel } from '../../types/farm';
import { Pill, type PillVariant } from './ds/Pill';
import { formatBandeName, derivePorceletPhase, type PorceletPhase } from '../lib';

const PHASE_LABEL: Record<PorceletPhase, string> = {
  SOUS_MERE: 'Sous mère',
  POST_SEVRAGE: 'Post-sevrage',
  CROISSANCE: 'Croissance',
  ENGRAISSEMENT: 'Engraissement',
  FINITION: 'Finition',
};

const PHASE_PILL: Record<PorceletPhase, PillVariant> = {
  SOUS_MERE: 'warm',
  POST_SEVRAGE: 'info',
  CROISSANCE: 'info',
  ENGRAISSEMENT: 'warm',
  FINITION: 'success',
};

const ACTIVE_STATUTS = new Set(['VIVANT', 'MALADE', 'QUARANTAINE']);

export type PorceletGroupProps = {
  bande: BandePorcelets;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigateToBande: (bandeId: string) => void;
};

export const PorceletGroup: React.FC<PorceletGroupProps> = ({
  bande,
  isExpanded,
  onToggle,
  onNavigateToBande,
}) => {
  const allPorcelets = bande.porcelets ?? [];
  const activePorcelets = allPorcelets.filter(p => ACTIVE_STATUTS.has(p.statut));
  const count = activePorcelets.length;
  const isEmpty = count === 0;
  const bandeName = formatBandeName({
    id: bande.id,
    idPortee: bande.idPortee,
    truieMere: bande.truie,
    dateMB: bande.dateMB,
  }, { compact: true });

  return (
    <div
      style={{
        background: 'var(--pt-bg)',
        border: '1px solid var(--pt-line)',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <button
          type="button"
          onClick={isEmpty ? undefined : onToggle}
          disabled={isEmpty}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Replier' : 'Déplier'} ${bandeName}`}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            background: 'transparent',
            border: 'none',
            textAlign: 'left',
            cursor: isEmpty ? 'default' : 'pointer',
            minHeight: 44,
            opacity: isEmpty ? 0.55 : 1,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 14, color: 'var(--pt-muted)', width: 14 }}>
            {isEmpty ? '·' : isExpanded ? '▾' : '▸'}
          </span>
          <span
            style={{
              flex: 1,
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              color: 'var(--pt-ink)',
            }}
          >
            {bandeName}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 12,
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--pt-muted)',
            }}
          >
            {isEmpty ? '0 vivants — bande terminée' : `${count} vivants`}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onNavigateToBande(bande.id)}
          aria-label={`Voir la fiche bande ${bandeName}`}
          style={{
            padding: '0 16px',
            background: 'transparent',
            border: 'none',
            borderLeft: '1px solid var(--pt-line)',
            cursor: 'pointer',
            color: 'var(--pt-muted)',
            fontSize: 16,
            minHeight: 44,
          }}
        >
          ›
        </button>
      </div>

      {isExpanded && !isEmpty && (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            borderTop: '1px solid var(--pt-line)',
            background: 'var(--pt-warm)',
          }}
        >
          {activePorcelets.map(p => {
            const phase = derivePorceletPhase(p, bande);
            return (
              <li
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 16px 10px 44px',
                  borderBottom: '1px solid var(--pt-line)',
                  fontSize: 13,
                }}
              >
                <span aria-hidden="true" style={{ color: 'var(--pt-muted)' }}>↳</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--pt-ink)',
                    minWidth: 90,
                  }}
                >
                  {p.boucle}
                </span>
                <span style={{ color: 'var(--pt-muted)', minWidth: 70 }}>
                  {p.poidsCourantKg != null ? `${p.poidsCourantKg} kg` : '—'}
                </span>
                <span style={{ color: 'var(--pt-muted)', minWidth: 24 }}>
                  {p.sexe === 'INCONNU' ? '—' : p.sexe}
                </span>
                <span style={{ flex: 1 }} />
                {phase && <Pill variant={PHASE_PILL[phase]}>{PHASE_LABEL[phase]}</Pill>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
