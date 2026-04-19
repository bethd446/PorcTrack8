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
  /**
   * Répartition manuelle des porcelets dans les 4 loges post-sevrage.
   * Source : relevé porcher du 19/04/2026 · à synchroniser via Sheets quand colonne dédiée.
   * Total attendu : 102 porcelets.
   */
  POST_SEVRAGE_LOGES_REPARTITION: [
    { id: 'Loge 1', porcelets: 23 },
    { id: 'Loge 2', porcelets: 22 },
    { id: 'Loge 3', porcelets: 28 },
    { id: 'Loge 4', porcelets: 29 },
  ] as const,
} as const;
