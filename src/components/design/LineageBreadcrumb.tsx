/**
 * LineageBreadcrumb - fil de lignee verrat -> truie -> bande -> lots.
 *
 * Composant DISTINCT du breadcrumb topbar : le breadcrumb classique
 * repond a "comment je suis arrive", celui-ci a "d'ou vient cette bande".
 *
 * Distinction visuelle :
 *  - separateurs « -> » (vs « / » du breadcrumb topbar)
 *  - IDs en Big Shoulders Display (vs DM Mono uppercase)
 *  - chips arrondis avec hover (vs texte plat)
 */

import React from 'react';
import { Link } from 'react-router-dom';

export interface LineageNode {
  /** Identifiant affiche (ex: "T19") */
  id: string;
  /** Label semantique (ex: "Truie - 4e portee") */
  label: string;
  /** Lien de navigation (omis si pas cliquable) */
  href?: string;
  /** Marquer comme noeud actif "vous etes ici" */
  current?: boolean;
}

interface Props {
  nodes: LineageNode[];
  /** Lien vers l'arbre genealogique complet (mode navigation) */
  treeHref?: string;
  /** Callback alternatif (mode modal). Prioritaire sur treeHref si fourni. */
  onTreeClick?: () => void;
}

const LineageBreadcrumb: React.FC<Props> = ({ nodes, treeHref, onTreeClick }) => {
  const treeLabel = 'Arbre genetique →';
  const treeStyle: React.CSSProperties = {
    marginLeft: 'auto',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--color-accent-500)',
    textDecoration: 'none',
    fontWeight: 600,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  };
  return (
    <section
      aria-label="Lignee"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 18px',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-card, 12px)',
        border: '1px solid var(--line)',
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          fontWeight: 600,
        }}
      >
        Lignee
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {nodes.map((node, i) => {
          const isCurrent = !!node.current;
          const inner = (
            <>
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: isCurrent ? 'var(--color-accent-500)' : 'var(--ink)',
                  lineHeight: 1,
                }}
              >
                {node.id}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  fontWeight: 500,
                  marginLeft: 6,
                }}
              >
                {node.label}
              </span>
            </>
          );
          const baseChipStyle: React.CSSProperties = {
            display: 'inline-flex',
            alignItems: 'baseline',
            padding: '6px 12px',
            borderRadius: 'var(--radius-pill, 9999px)',
            border: isCurrent ? '1.5px solid var(--color-accent-500)' : '1px solid var(--line)',
            background: isCurrent ? 'var(--color-accent-100)' : 'transparent',
            textDecoration: 'none',
            transition: 'background 160ms var(--ease-emil), transform 160ms var(--ease-emil)',
          };
          return (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {node.href && !isCurrent ? (
                <Link to={node.href} style={baseChipStyle}>{inner}</Link>
              ) : (
                <div
                  style={baseChipStyle}
                  aria-current={isCurrent ? 'true' : undefined}
                >
                  {inner}
                </div>
              )}
              {i < nodes.length - 1 && (
                <span
                  aria-hidden="true"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 18,
                    color: 'var(--muted)',
                    fontWeight: 500,
                  }}
                >
                  {'→'}
                </span>
              )}
            </span>
          );
        })}
      </div>
      {onTreeClick ? (
        <button type="button" onClick={onTreeClick} style={treeStyle}>
          {treeLabel}
        </button>
      ) : treeHref ? (
        <Link to={treeHref} style={treeStyle}>
          {treeLabel}
        </Link>
      ) : null}
    </section>
  );
};

export default LineageBreadcrumb;
