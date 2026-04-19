/**
 * Ferme K13 — configuration physique des loges (workflow naisseur-engraisseur).
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Workflow réel (validé terrain · 19/04/2026) :
 *  1. MATERNITÉ (9 loges, chauffage porcelets) :
 *     J0 mise-bas → J28 sevrage. 1 loge = 1 truie + sa portée sous-mère.
 *
 *  2. POST-SEVRAGE (4 loges · capacité actuelle 23/22/28/29 = 102 porcelets) :
 *     J28 → ~J60 (2 mois d'âge). Porcelets regroupés mixtes.
 *     Durée : ~32 jours après le sevrage.
 *
 *  3. CROISSANCE-FINITION (2 loges, séparation par sexe) :
 *     J60 (séparation M/F) → J180 (~abattage).
 *     Les porcelets restent dans la MÊME loge de croissance jusqu'à finition.
 *     1 loge pour les mâles, 1 loge pour les femelles.
 *
 * Ces capacités sont utilisées pour détecter une saturation (alertes visuelles
 * dans le Cockpit et le TroupeauHub) et pour le calcul de phase des bandes.
 */
export const FARM_CONFIG = {
  /** Identifiant court de la ferme (utilisé pour affichage UI). */
  FARM_ID: 'K13',
  /** Nom affiché de la ferme. */
  FARM_NAME: 'Ferme K13',
  /** Numéro WhatsApp par défaut du support (vide = non configuré, à saisir dans Réglages). */
  SUPPORT_WHATSAPP_DEFAULT: '',
  /** Nombre de loges de maternité (chauffage porcelets) — 1 loge = 1 truie + portée sous-mère J0→J28. */
  MATERNITE_LOGES_CAPACITY: 9,
  /** Nombre de loges post-sevrage — porcelets groupés après sevrage (J28), jusqu'à ~2 mois d'âge (J60). */
  POST_SEVRAGE_LOGES_CAPACITY: 4,
  /**
   * Nombre de loges croissance-finition — porcelets séparés par sexe (1 loge mâles, 1 loge femelles).
   * Même loge utilisée de la croissance (J60) à la finition (J180).
   * Nommée "engraissement" historiquement dans le code ; désigne la phase complète croissance→finition.
   */
  ENGRAISSEMENT_LOGES_CAPACITY: 2,
  /**
   * Âge au sevrage (jours depuis la mise-bas). Sortie de loge maternité.
   * Ferme K13 : sevrage à J28 (4 semaines).
   */
  SEVRAGE_AGE_JOURS: 28,
  /**
   * Âge au passage croissance-finition (jours depuis la mise-bas).
   * À cette date, les porcelets sortent de la loge post-sevrage et sont
   * répartis par sexe dans les loges croissance-finition.
   */
  CROISSANCE_AGE_JOURS: 60,
  /**
   * Durée en loge post-sevrage (jours après sevrage).
   * = CROISSANCE_AGE_JOURS - SEVRAGE_AGE_JOURS = 60 - 28 = 32 jours.
   */
  POST_SEVRAGE_DUREE_JOURS: 32,
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
