/**
 * Ferme K13 — configuration physique des loges.
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
  /** Identifiant court de la ferme (utilisé pour affichage UI). */
  FARM_ID: 'K13',
  /** Nom affiché de la ferme. */
  FARM_NAME: 'Ferme K13',
  /** Numéro WhatsApp par défaut du support (vide = non configuré, à saisir dans Réglages). */
  SUPPORT_WHATSAPP_DEFAULT: '',
  /** Nombre de loges de maternité (chauffage porcelets) — 1 loge = 1 truie + sa portée sous-mère J0→J21. */
  MATERNITE_LOGES_CAPACITY: 9,
  /** Nombre de loges post-sevrage — porcelets groupés après J21, jusqu'à ~2 mois 10 jours post-sevrage. */
  POST_SEVRAGE_LOGES_CAPACITY: 4,
  /** Nombre de loges engraissement — porcelets séparés par sexe, jusqu'à finition. */
  ENGRAISSEMENT_LOGES_CAPACITY: 2,
  /** Jours après sevrage avant passage en phase engraissement (séparation par sexe). 2 mois 10 jours = 70 j. */
  POST_SEVRAGE_DUREE_JOURS: 70,
} as const;
