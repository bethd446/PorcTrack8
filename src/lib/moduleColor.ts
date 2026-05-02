/**
 * moduleColor — Code couleur subtil par module fonctionnel (RT4).
 * ════════════════════════════════════════════════════════════════════════
 * Objectif : différencier visuellement les zones de l'app (nav active,
 * sidebar, eyebrows des hubs) sans casser le DS Terrain Vivant.
 *
 * Les couleurs vivent dans `src/styles/agritech-tokens.css` (variables
 * --module-*). Cette utility expose le mapping route → ton.
 *
 * Usage minimal et NON destructif : utilisé en accent (border-left,
 * underline, dot) PAR-DESSUS le style actuel — jamais en remplacement.
 */

export type ModuleKind =
  | 'naissage'
  | 'engraissement'
  | 'sanitaire'
  | 'stocks'
  | 'default';

export interface ModuleTone {
  /** Couleur foreground (border-left, dot, underline). CSS var. */
  fg: string;
  /** Couleur background subtile (10-20% opacity équiv). CSS var. */
  bg: string;
}

const TONES: Record<ModuleKind, ModuleTone> = {
  naissage: {
    fg: 'var(--module-naissage)',
    bg: 'var(--module-naissage-bg)',
  },
  engraissement: {
    fg: 'var(--module-engr)',
    bg: 'var(--module-engr-bg)',
  },
  sanitaire: {
    fg: 'var(--module-sanitaire)',
    bg: 'var(--module-sanitaire-bg)',
  },
  stocks: {
    fg: 'var(--module-stocks)',
    bg: 'var(--module-stocks-bg)',
  },
  default: {
    fg: 'var(--color-accent-500)',
    bg: 'var(--color-accent-100)',
  },
};

export function getModuleTone(kind: ModuleKind): ModuleTone {
  return TONES[kind];
}

/**
 * Déduit le module à partir du pathname courant.
 * Mapping (préfixe le plus spécifique d'abord) :
 *   /reproduction, /cycles/repro, /cycles/maternite           → naissage
 *   /cycles/croissance|engraissement|finition|sortie          → engraissement
 *   /sante, /pharmacie                                        → sanitaire
 *   /ressources, /aliments, /stocks, /fournisseurs            → stocks
 *   autres                                                    → default
 */
export function inferModuleFromPath(pathname: string): ModuleKind {
  const p = pathname || '';
  // naissage : repro + maternité
  if (
    p.startsWith('/reproduction') ||
    p.startsWith('/cycles/repro') ||
    p.startsWith('/cycles/maternite')
  ) {
    return 'naissage';
  }
  // engraissement : croissance → sortie
  if (
    p.startsWith('/cycles/croissance') ||
    p.startsWith('/cycles/engraissement') ||
    p.startsWith('/cycles/finition') ||
    p.startsWith('/cycles/sortie')
  ) {
    return 'engraissement';
  }
  // sanitaire
  if (p.startsWith('/sante') || p.startsWith('/pharmacie')) {
    return 'sanitaire';
  }
  // stocks
  if (
    p.startsWith('/ressources') ||
    p.startsWith('/aliments') ||
    p.startsWith('/stocks') ||
    p.startsWith('/fournisseurs')
  ) {
    return 'stocks';
  }
  return 'default';
}
