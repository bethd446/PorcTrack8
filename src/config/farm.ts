/**
 * Ferme A130 — configuration physique des loges.
 * ══════════════════════════════════════════════
 *
 * Réalité terrain (ferme naisseur-engraisseur) :
 *  - 9 loges de maternité : chauffage porcelet, accueillent une truie + sa
 *    portée pendant la phase "sous mère" (de la mise-bas jusqu'au sevrage,
 *    ~21 jours). 1 loge = 1 truie en maternité.
 *  - 4 loges post-sevrage : accueillent les porcelets sevrés regroupés en
 *    lots, jusqu'à ~2 mois post-sevrage (séparation par sexe).
 *  - 2 loges engraissement : après séparation par sexe (~60 jours post-sevrage),
 *    les porcelets rejoignent les loges d'engraissement jusqu'à la finition.
 *
 * Ces capacités sont utilisées pour détecter une saturation (alertes visuelles
 * dans le Cockpit et le TroupeauHub).
 */
export const FARM_CONFIG = {
  /** Nombre de loges de maternité (chauffage porcelets) — 1 loge = 1 truie + sa portée sous-mère J0→J21. */
  MATERNITE_LOGES_CAPACITY: 9,
  /** Nombre de loges post-sevrage — porcelets groupés après J21, jusqu'à ~2 mois post-sevrage. */
  POST_SEVRAGE_LOGES_CAPACITY: 4,
  /** Nombre de loges engraissement — porcelets séparés par sexe, jusqu'à finition. */
  ENGRAISSEMENT_LOGES_CAPACITY: 2,
  /** Jours après sevrage avant passage en phase engraissement (séparation par sexe). */
  POST_SEVRAGE_DUREE_JOURS: 60,
} as const;
