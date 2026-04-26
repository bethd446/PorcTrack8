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
  /**
   * Numéro WhatsApp par défaut du support (placeholder).
   * Pré-rempli au premier boot via `main.tsx` si aucun numéro n'est configuré.
   * Format libre — `buildWhatsappUrl` normalise (ne garde que les chiffres).
   * Admin peut surcharger dans Réglages → Contact support.
   */
  SUPPORT_WHATSAPP_DEFAULT: '+225 07 07 07 07 07',
  /** Nombre de loges de maternité (chauffage porcelets) — 1 loge = 1 truie + portée sous-mère J0→J28. */
  MATERNITE_LOGES_CAPACITY: 9,
  /** Nombre de loges post-sevrage — porcelets groupés après sevrage (J28), jusqu'à ~2 mois d'âge (J60). */
  POST_SEVRAGE_LOGES_CAPACITY: 6,
  /**
   * Nombre de loges croissance-finition — porcelets séparés par sexe (1 loge mâles, 1 loge femelles).
   * Même loge utilisée de la croissance (J60) à la finition (J180).
   * Nommée "engraissement" historiquement dans le code ; désigne la phase complète croissance→finition.
   */
  ENGRAISSEMENT_LOGES_CAPACITY: 6,
  /**
   * Âge au sevrage (jours depuis la mise-bas). Sortie de loge maternité.
   * Ferme K13 : sevrage à J28 (4 semaines).
   */
  SEVRAGE_AGE_JOURS: 28,
  /**
   * Âge au passage croissance (jours depuis la mise-bas).
   * À cette date, les porcelets sortent de la loge post-sevrage et sont
   * répartis par sexe dans les loges de croissance.
   */
  CROISSANCE_AGE_JOURS: 63,
  /**
   * Durée en loge post-sevrage (jours après sevrage).
   * = CROISSANCE_AGE_JOURS - SEVRAGE_AGE_JOURS = 63 - 28 = 35 jours.
   */
  POST_SEVRAGE_DUREE_JOURS: 35,
  /**
   * Durée de la phase de croissance (jours).
   * De J63 à J100 environ.
   */
  CROISSANCE_DUREE_JOURS: 37,
  /**
   * Âge au passage en engraissement (jours depuis la mise-bas).
   */
  ENGRAISSEMENT_AGE_JOURS: 100,
  /**
   * Durée de la phase d'engraissement (jours).
   * De J100 à J180 environ.
   */
  ENGRAISSEMENT_DUREE_JOURS: 80,
  /**
   * Âge au passage en finition (jours depuis la mise-bas).
   * Seuil de poids commercial atteint (110kg+).
   */
  FINITION_AGE_JOURS: 180,
  /**
   * Poids minimum (kg) pour passer en phase FINITION.
   * En dessous : l'animal est en ENGRAISSEMENT standard.
   */
  FINITION_POIDS_MIN_KG: 100,
  /**
   * Poids commercial cible pour l'abattage (kg).
   * Au-dessus : l'animal est prêt pour la sortie.
   */
  FINITION_POIDS_MAX_KG: 110,

  /** PLAN D'ALIMENTATION (Conduite Multiphase) */
  FEED_CONFIG: {
    DEMARRAGE_1: {
      poids_max_kg: 15,
      label: 'Pré-sevrage / Démarrage 1',
      formule: { romelko: 50, mais: 34, tourteau_soja: 10, kpc_5: 3, son_ble: 3 },
      additifs: { enzymes_g_t: 300, lysine_kg_t: 1, methionine_kg_t: 0.5 }
    },
    DEMARRAGE_2: {
      poids_max_kg: 25,
      label: 'Démarrage 2 (Post-sevrage)',
      formule: { mais: 55, tourteau_soja: 22, son_ble: 15, kpc_5: 8 },
      additifs: { enzymes_g_t: 300, lysine_kg_t: 1 }
    },
    CROISSANCE: {
      poids_max_kg: 70,
      label: 'Croissance',
      formule: { mais: 68, tourteau_soja: 17, son_ble: 10, kpc_5: 5 },
      additifs: { enzymes_g_t: 250, lysine_kg_t: 1 }
    },
    FINITION: {
      poids_max_kg: 120,
      label: 'Finition',
      formule: { mais: 70, son_ble: 15, tourteau_soja: 10, kpc_5: 5 },
      additifs: { enzymes_g_t: 200, lysine_kg_t: 0.5 }
    },
    TRUIE_GESTATION: {
      poids_max_kg: 250,
      label: 'Gestation (115j)',
      formule: { mais: 58, son_ble: 30, tourteau_soja: 7, kpc_5: 5 },
      additifs: { enzymes_g_t: 200 }
    },
    TRUIE_LACTATION: {
      poids_max_kg: 250,
      label: 'Lactation (21-28j)',
      formule: { mais: 58, tourteau_soja: 18, son_ble: 18, kpc_5: 6 },
      additifs: { enzymes_g_t: 300, lysine_kg_t: 1 }
    }
  } as const,

  /** CONFIGURATION FINANCIÈRE (FCFA) */
  FINANCE_CONFIG: {
    PRIX_VENTE_PORC_KG: 2100,
    COUTS_FIXES_PAR_PORC: 5000, // Eau, élec, vaccins de base, amortissement
    /** Prix au kilo par formule (moyenne marché CI 2026) */
    COUT_ALIMENT_KG: {
      DEMARRAGE_1: 500,
      DEMARRAGE_2: 450,
      CROISSANCE: 350,
      FINITION: 300,
      TRUIE_GESTATION: 280,
      TRUIE_LACTATION: 320
    },
    /** Consommation Moyenne Journalière Théorique (kg/jour/animal) */
    CONSO_MOYENNE_J: {
      DEMARRAGE_1: 0.3,
      DEMARRAGE_2: 0.8,
      CROISSANCE: 1.8,
      FINITION: 2.8
    }
  } as const,

  /**
   * Répartition manuelle des porcelets dans les 6 loges post-sevrage.
   * Source : relevé porcher du 25/04/2026 · à synchroniser via Sheets quand colonne dédiée.
   * Total attendu : 102 porcelets (sur les 4 premières).
   */
  POST_SEVRAGE_LOGES_REPARTITION: [
    { id: 'Loge 1', porcelets: 23, aliment: 'DEMARRAGE_2', debutAliment: '28/03/2026' },
    { id: 'Loge 2', porcelets: 22, aliment: 'DEMARRAGE_2', debutAliment: '28/03/2026' },
    { id: 'Loge 3', porcelets: 28, aliment: 'DEMARRAGE_2', debutAliment: '01/04/2026' },
    { id: 'Loge 4', porcelets: 29, aliment: 'DEMARRAGE_2', debutAliment: '25/04/2026' },
    { id: 'Loge 5', porcelets: 0 },
    { id: 'Loge 6', porcelets: 0 },
  ] as const,
} as const;
