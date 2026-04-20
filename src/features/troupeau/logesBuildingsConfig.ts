/**
 * logesBuildingsConfig — Helper de configuration des loges IsoBarn.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Centralise la construction du tableau `Building[]` consommé par
 * `IsoBarn` pour dessiner les 3 phases du workflow naisseur-engraisseur
 * (Ferme K13) :
 *   1. Maternité (9 loges)       · var(--gold)
 *   2. Post-sevrage (4 loges)    · var(--accent)  (fill ∝ répartition réelle /30)
 *   3. Croissance-finition (2)   · var(--amber)
 *
 * Un seul point de vérité pour la géométrie du plan iso, réutilisé par
 * `BatimentsView` (page dédiée) et `TroupeauLogesView` (sub-tab Troupeau).
 *
 * Pure / sans side-effects → sûr à appeler dans un `useMemo`.
 */
import type { Building, Arrow } from '../../components/agritech';
import { FARM_CONFIG } from '../../config/farm';

/** Tokens couleur pour chaque phase — alignés avec la palette agritech. */
export const LOGES_TONES = {
  maternite: 'var(--gold)',
  postSevrage: 'var(--teal, var(--accent))',
  engraissement: 'var(--amber)',
} as const;

/**
 * Construit la liste des bâtiments IsoBarn pour les 3 phases de la ferme K13.
 *
 * Le calcul est purement géométrique : aucune lecture de data live, seules
 * les constantes `FARM_CONFIG` sont consultées (capacités + répartition
 * post-sevrage manuelle).
 */
export function buildLogesBuildings(): Building[] {
  const out: Building[] = [];

  // ── Maternité : 9 loges alignées en 3×3 (gold) ──
  const MAT_COLS = 3;
  const MAT_X0 = -3.2;
  const MAT_Y0 = 4.2;
  const MAT_W = 1.3;
  const MAT_D = 1.1;
  const MAT_GAP_X = 0.25;
  const MAT_GAP_Y = 0.25;
  for (let i = 0; i < FARM_CONFIG.MATERNITE_LOGES_CAPACITY; i++) {
    const col = i % MAT_COLS;
    const row = Math.floor(i / MAT_COLS);
    out.push({
      id: `MAT-${i + 1}`,
      label: `Maternité ${i + 1}`,
      cap: `M${i + 1}`,
      x: MAT_X0 + col * (MAT_W + MAT_GAP_X),
      y: MAT_Y0 + row * (MAT_D + MAT_GAP_Y),
      w: MAT_W,
      d: MAT_D,
      h: 1.1,
      tone: LOGES_TONES.maternite,
      fill: 0.7,
    });
  }

  // ── Post-sevrage : 4 loges en rangée (teal/accent) ──
  const PS_X0 = -2.4;
  const PS_Y0 = 1.3;
  const PS_W = 1.3;
  const PS_D = 1.2;
  const PS_GAP = 0.25;
  for (let i = 0; i < FARM_CONFIG.POST_SEVRAGE_LOGES_CAPACITY; i++) {
    const rep = FARM_CONFIG.POST_SEVRAGE_LOGES_REPARTITION[i];
    const fill = rep ? Math.min(1, rep.porcelets / 30) : 0.5;
    out.push({
      id: `PS-${i + 1}`,
      label: `Post-sevrage ${i + 1}${rep ? ` · ${rep.porcelets} porcelets` : ''}`,
      cap: `PS${i + 1}`,
      x: PS_X0 + i * (PS_W + PS_GAP),
      y: PS_Y0,
      w: PS_W,
      d: PS_D,
      h: 1.25,
      tone: LOGES_TONES.postSevrage,
      fill,
    });
  }

  // ── Croissance-finition : 2 loges (amber), séparation M/F ──
  const CR_X0 = -1.6;
  const CR_Y0 = -1.6;
  const CR_W = 1.7;
  const CR_D = 1.6;
  const CR_GAP = 0.3;
  const CR_LABELS = ['Mâles', 'Femelles'];
  for (let i = 0; i < FARM_CONFIG.ENGRAISSEMENT_LOGES_CAPACITY; i++) {
    out.push({
      id: `CR-${i + 1}`,
      label: `Croissance · ${CR_LABELS[i] ?? i + 1}`,
      cap: i === 0 ? 'CR-M' : 'CR-F',
      x: CR_X0 + i * (CR_W + CR_GAP),
      y: CR_Y0,
      w: CR_W,
      d: CR_D,
      h: 1.4,
      tone: LOGES_TONES.engraissement,
      fill: 0.6,
    });
  }

  return out;
}

/**
 * Flèches de flux standard : maternité → post-sevrage → croissance-finition.
 * Pointe sur les loges médianes de chaque phase.
 */
export function buildLogesArrows(): Arrow[] {
  return [
    { from: 'MAT-5', to: 'PS-2' },
    { from: 'PS-2', to: 'CR-1' },
  ];
}
