/**
 * LineageTree — arbre généalogique cliquable.
 *
 * Affiche : truie root → ses saillies (verrats) + ses bandes filles,
 * ou bande root → truie mère + bandes sœurs.
 * Profondeur max 3 niveaux pour rester lisible et borner les coûts.
 *
 * Utilisé via le bouton « Arbre génétique → » du LineageBreadcrumb,
 * généralement monté dans une IonModal par les vues détail.
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Truie, Verrat, BandePorcelets, Saillie } from '../../types/farm';
import Eyebrow from './Eyebrow';

// ─── Types arbre ──────────────────────────────────────────────────────────────

export type LineageNodeType = 'truie' | 'verrat' | 'bande';

export interface LineageTreeNode {
  type: LineageNodeType;
  id: string;
  displayId: string;
  label: string;
  href?: string;
  children: LineageTreeNode[];
  /** Métriques de performance, affichées en chips si présentes. */
  perf?: {
    nbPortees?: number;
    tauxSurvie?: number;
    nv?: number;
    vivants?: number;
  };
  /** Note libre (ex. « En cours · J+45 maternité »). */
  hint?: string;
}

interface BuildOpts {
  rootTruieId?: string;
  rootBandeId?: string;
  truies: Truie[];
  verrats: Verrat[];
  bandes: BandePorcelets[];
  saillies: Saillie[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findTruie(truies: Truie[], idOrDisplay: string): Truie | undefined {
  return truies.find((t) => t.id === idOrDisplay || t.displayId === idOrDisplay);
}

function findVerrat(verrats: Verrat[], idOrDisplay: string): Verrat | undefined {
  return verrats.find((v) => v.id === idOrDisplay || v.displayId === idOrDisplay);
}

function bandesOfTruie(bandes: BandePorcelets[], truie: Truie): BandePorcelets[] {
  return bandes.filter(
    (b) =>
      b.truie === truie.id ||
      b.truie === truie.displayId ||
      (!!truie.boucle && b.boucleMere === truie.boucle),
  );
}

function tauxSurvie(b: BandePorcelets): number | undefined {
  if (!b.nv || b.nv <= 0) return undefined;
  const v = b.vivants ?? Math.max(0, b.nv - (b.morts ?? 0));
  return Math.round((v / b.nv) * 100);
}

function bandeNode(b: BandePorcelets): LineageTreeNode {
  const display = b.idPortee || b.id;
  const survie = tauxSurvie(b);
  const hint = !b.dateSevrageReelle
    ? 'En cours'
    : `Sevrée ${b.dateSevrageReelle}`;
  return {
    type: 'bande',
    id: b.id,
    displayId: display,
    label: 'Bande',
    href: `/troupeau/bandes/${encodeURIComponent(b.id)}`,
    perf: { nv: b.nv, vivants: b.vivants, tauxSurvie: survie },
    hint,
    children: [],
  };
}

// ─── Construction ─────────────────────────────────────────────────────────────

export function buildLineageTree(opts: BuildOpts): LineageTreeNode | null {
  const { rootTruieId, rootBandeId, truies, verrats, bandes, saillies } = opts;

  // Cas 1 : root truie
  if (rootTruieId) {
    const truie = findTruie(truies, rootTruieId);
    if (!truie) return null;

    const children: LineageTreeNode[] = [];

    // Saillies → verrats utilisés (dédupliqués)
    const truieSaillies = saillies.filter(
      (s) => s.truieId === truie.id || s.truieId === truie.displayId,
    );
    const verratIds = Array.from(new Set(truieSaillies.map((s) => s.verratId).filter(Boolean)));
    for (const vid of verratIds) {
      const verratRef = findVerrat(verrats, vid);
      const lastSaillie = [...truieSaillies]
        .filter((s) => s.verratId === vid)
        .sort((a, b) => (b.dateSaillie || '').localeCompare(a.dateSaillie || ''))[0];

      // Sous-niveau : autres truies saillies par ce verrat (compteur)
      const otherTruieIds = Array.from(
        new Set(
          saillies
            .filter((s) => s.verratId === vid)
            .map((s) => s.truieId)
            .filter((tid) => tid && tid !== truie.id && tid !== truie.displayId),
        ),
      );
      const otherChildren: LineageTreeNode[] = otherTruieIds.slice(0, 4).map((tid) => {
        const tr = findTruie(truies, tid);
        return {
          type: 'truie' as const,
          id: tr?.id ?? tid,
          displayId: tr?.displayId ?? tid,
          label: tr?.nbPortees ? `${tr.nbPortees} portées` : 'Saillie',
          href: tr ? `/troupeau/truies/${tr.id}` : undefined,
          children: [],
        };
      });

      children.push({
        type: 'verrat',
        id: verratRef?.id ?? vid,
        displayId: verratRef?.displayId ?? vid,
        label: verratRef?.nom
          ? `${verratRef.nom}${lastSaillie?.dateSaillie ? ` · ${lastSaillie.dateSaillie}` : ''}`
          : `Verrat${lastSaillie?.dateSaillie ? ` · ${lastSaillie.dateSaillie}` : ''}`,
        href: verratRef ? `/troupeau/verrats/${verratRef.id}` : undefined,
        children: otherChildren,
      });
    }

    // Bandes filles
    for (const b of bandesOfTruie(bandes, truie)) {
      children.push(bandeNode(b));
    }

    return {
      type: 'truie',
      id: truie.id,
      displayId: truie.displayId,
      label: [truie.nom, truie.race, truie.nbPortees ? `${truie.nbPortees}e portée` : null]
        .filter(Boolean)
        .join(' · '),
      href: `/troupeau/truies/${truie.id}`,
      perf: { nbPortees: truie.nbPortees },
      children,
    };
  }

  // Cas 2 : root bande
  if (rootBandeId) {
    const bande = bandes.find((b) => b.id === rootBandeId || b.idPortee === rootBandeId);
    if (!bande) return null;

    const children: LineageTreeNode[] = [];
    const truieRef = bande.truie ? findTruie(truies, bande.truie) : undefined;

    if (truieRef) {
      // Bandes sœurs (autres portées de la même mère)
      const sisters = bandesOfTruie(bandes, truieRef).filter((b) => b.id !== bande.id);
      const truieChild: LineageTreeNode = {
        type: 'truie',
        id: truieRef.id,
        displayId: truieRef.displayId,
        label: [truieRef.nom, truieRef.race].filter(Boolean).join(' · ') || 'Truie mère',
        href: `/troupeau/truies/${truieRef.id}`,
        perf: { nbPortees: truieRef.nbPortees },
        children: sisters.slice(0, 6).map(bandeNode),
      };
      children.push(truieChild);
    }

    const root = bandeNode(bande);
    return {
      ...root,
      label: 'Bande (origine)',
      children,
    };
  }

  return null;
}

// ─── Rendu ────────────────────────────────────────────────────────────────────

const TYPE_BULLET: Record<LineageNodeType, string> = {
  truie: '●',
  verrat: '◆',
  bande: '▪',
};

const TYPE_DOT_COLOR: Record<LineageNodeType, string> = {
  truie: 'var(--color-pig, var(--color-accent-500))',
  verrat: 'var(--color-amber-pork)',
  bande: 'var(--color-accent-500)',
};

function survieTone(taux: number): { bg: string; fg: string } {
  if (taux >= 90) return { bg: 'var(--color-accent-100)', fg: 'var(--color-accent-700)' };
  if (taux >= 75) return { bg: 'rgba(244, 162, 97, 0.18)', fg: 'var(--color-amber-pork-deep)' };
  return { bg: 'rgba(220, 38, 38, 0.15)', fg: 'var(--color-pig-deep)' };
}

interface TreeNodeProps {
  node: LineageTreeNode;
  depth: number;
  isLast?: boolean;
}

const PerfChips: React.FC<{ perf: NonNullable<LineageTreeNode['perf']> }> = ({ perf }) => {
  const chips: React.ReactNode[] = [];
  if (typeof perf.nv === 'number') {
    chips.push(
      <span key="nv" style={chipBase}>
        {perf.nv} nés
      </span>,
    );
  }
  if (typeof perf.vivants === 'number' && perf.nv !== perf.vivants) {
    chips.push(
      <span key="v" style={chipBase}>
        {perf.vivants} viv.
      </span>,
    );
  }
  if (typeof perf.tauxSurvie === 'number') {
    const tone = survieTone(perf.tauxSurvie);
    chips.push(
      <span
        key="surv"
        style={{ ...chipBase, background: tone.bg, color: tone.fg, borderColor: 'transparent' }}
      >
        {perf.tauxSurvie}% survie
      </span>,
    );
  }
  if (typeof perf.nbPortees === 'number') {
    chips.push(
      <span key="np" style={chipBase}>
        {perf.nbPortees} portées
      </span>,
    );
  }
  return <>{chips}</>;
};

const chipBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: 9999,
  border: '1px solid var(--line)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.04em',
  color: 'var(--ink)',
  background: 'var(--bg-app, transparent)',
};

const TreeNode: React.FC<TreeNodeProps> = ({ node, depth }) => {
  const indent = depth * 24;
  const innerLabel = (
    <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
      <span
        aria-hidden="true"
        style={{ color: TYPE_DOT_COLOR[node.type], fontSize: 14, lineHeight: 1 }}
      >
        {TYPE_BULLET[node.type]}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: 'var(--ink)',
        }}
      >
        {node.displayId}
      </span>
      {node.label && (
        <span
          style={{
            fontSize: 10,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            fontWeight: 500,
          }}
        >
          {node.label}
        </span>
      )}
      {node.perf && <PerfChips perf={node.perf} />}
      {node.hint && (
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            color: 'var(--muted)',
          }}
        >
          {node.hint}
        </span>
      )}
    </span>
  );

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 10px',
    marginLeft: indent,
    borderRadius: 10,
    textDecoration: 'none',
    color: 'inherit',
    borderLeft: depth > 0 ? '1px solid var(--line)' : 'none',
    transition: 'background 140ms var(--ease-emil, ease)',
  };

  return (
    <li style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {node.href ? (
        <Link to={node.href} style={rowStyle}>
          {innerLabel}
        </Link>
      ) : (
        <div style={rowStyle}>{innerLabel}</div>
      )}
      {node.children.length > 0 && (
        <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {node.children.map((child) => (
            <TreeNode key={`${child.type}-${child.id}`} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
};

interface Props {
  rootTruieId?: string;
  rootBandeId?: string;
  truies: Truie[];
  verrats: Verrat[];
  bandes: BandePorcelets[];
  saillies: Saillie[];
}

const LineageTree: React.FC<Props> = ({
  rootTruieId,
  rootBandeId,
  truies,
  verrats,
  bandes,
  saillies,
}) => {
  const tree = useMemo(
    () =>
      buildLineageTree({
        rootTruieId,
        rootBandeId,
        truies,
        verrats,
        bandes,
        saillies,
      }),
    [rootTruieId, rootBandeId, truies, verrats, bandes, saillies],
  );

  if (!tree) {
    return (
      <section aria-label="Arbre généalogique" style={{ padding: 18 }}>
        <Eyebrow>Lignée généalogique</Eyebrow>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--muted)',
            marginTop: 8,
          }}
        >
          Aucune lignée à afficher.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Arbre généalogique"
      style={{
        padding: 18,
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-card, 12px)',
        border: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div>
        <Eyebrow>Lignée généalogique</Eyebrow>
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            margin: '6px 0 0',
            color: 'var(--ink)',
          }}
        >
          Arbre {tree.displayId}
        </h2>
      </div>
      <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TreeNode node={tree} depth={0} />
      </ul>
    </section>
  );
};

export default LineageTree;
