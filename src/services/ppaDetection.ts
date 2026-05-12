/**
 * ppaDetection — Détection précoce de Peste Porcine Africaine (PPA)
 * ────────────────────────────────────────────────────────────────────────────
 * La PPA est la menace n°1 du marché porcin Côte d'Ivoire :
 *   - Épizootie 2024 = 100 000 têtes abattues, 20 Mds FCFA de pertes
 *   - Aucun vaccin commercial, mortalité ~100% sur formes virulentes
 *   - Transmission via viande, vêtements, tiques (Ornithodoros)
 *
 * Symptomatologie virulente (à détecter) :
 *   - Fièvre forte (>41°C)
 *   - Hémorragies cutanées (oreilles bleues, abdomen, pattes)
 *   - Perte d'appétit + apathie
 *   - Mortalité 2-10 jours
 *
 * Cette détection est conservative (false positive OK, false negative non) :
 *   on déclenche dès 2 symptômes typiques observés en <10 jours sur un même
 *   sujet, ou un cluster de mortalités inexpliquées (≥3 morts en 7 jours).
 *
 * NB : module isolé pour ne pas surcharger alertEngine. Sera branché en v3.6.
 */

import type { TraitementSante, Truie } from '../types/farm';

export interface PPADetectionInput {
  /** Animal observé (truie, verrat, ou porcelet). */
  animalId: string;
  /** Affichage user (boucle ou displayId). */
  animalLabel: string;
  /** Type d'animal pour le routing fiche détail. */
  animalType: 'TRUIE' | 'VERRAT' | 'PORCELET';
  /** Date d'observation. */
  observedAt: Date;
  /** Symptômes observés (texte libre, on parse les keywords PPA). */
  symptomesNotes: string;
}

export interface PPASuspect {
  level: 'CRITIQUE' | 'HAUTE';
  animalId: string;
  animalLabel: string;
  animalType: 'TRUIE' | 'VERRAT' | 'PORCELET';
  /** Symptômes typiques PPA détectés dans les notes. */
  flags: PPAFlag[];
  message: string;
  /** Actions recommandées en cas de suspicion. */
  actionsImmediate: string[];
}

export type PPAFlag =
  | 'fievre_forte'
  | 'hemorragies'
  | 'oreilles_bleues'
  | 'apathie_avec_fievre'
  | 'mortalite_rapide'
  | 'cluster_morts';

const KEYWORDS: Record<PPAFlag, RegExp[]> = {
  fievre_forte: [
    /fi[èe]vre\s+(forte|tr[èe]s|41|42)/i,
    /\b4[12](?:[.,]\d)?\s*°?/, // 41°C, 42.5°
    /hyperthermie/i,
  ],
  hemorragies: [
    /h[ée]morr/i,
    /sang.*peau|peau.*sang/i,
    /p[ée]t[ée]chies/i,
    /ecchymoses/i,
  ],
  oreilles_bleues: [
    /oreilles?\s+bleu/i,
    /cyanose/i,
    /cyanos[ée]/i,
  ],
  apathie_avec_fievre: [
    /apathie.*fi[èe]vre|fi[èe]vre.*apathie/i,
    /prostr[ée].*chaud/i,
  ],
  mortalite_rapide: [
    /mort.*([1-9]|10)\s*jours?/i,
    /d[ée]c[èe]s.*([1-9]|10)\s*jours?/i,
  ],
  cluster_morts: [], // détecté à part via comptage
};

/**
 * Analyse un texte de notes/symptômes pour détecter les marqueurs PPA.
 * Retourne tous les flags trouvés.
 */
export function detectPPAFlagsInNotes(notes: string): PPAFlag[] {
  if (!notes || notes.length < 5) return [];
  const flags = new Set<PPAFlag>();
  for (const [flag, patterns] of Object.entries(KEYWORDS) as [PPAFlag, RegExp[]][]) {
    if (patterns.length === 0) continue;
    for (const re of patterns) {
      if (re.test(notes)) {
        flags.add(flag);
        break;
      }
    }
  }
  return Array.from(flags);
}

/**
 * Détecte un cluster de mortalité suspect : ≥3 morts en 7 jours sur la même ferme
 * sans cause identifiée (ou cause "Inconnue" / "Subite").
 * Retourne true si suspicion.
 */
export function detectPPAMortalityCluster(
  deaths: Array<{ date: Date; cause?: string | null }>,
  today: Date,
  windowDays = 7,
  threshold = 3,
): boolean {
  const cutoff = new Date(today.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const recent = deaths.filter(d => d.date >= cutoff);
  if (recent.length < threshold) return false;
  // Si tous identifiés (cause connue ≠ Inconnue/Subite/Sans cause), pas suspect.
  const unknowns = recent.filter(d => {
    const c = (d.cause ?? '').trim().toLowerCase();
    return !c || c.includes('inconnu') || c.includes('subit') || c === 'mortalité' || c === 'autre';
  });
  return unknowns.length >= threshold;
}

/**
 * Évalue un animal pour suspicion PPA.
 * Renvoie null si pas de suspicion, sinon un objet PPASuspect.
 */
export function evaluatePPASuspect(input: PPADetectionInput): PPASuspect | null {
  const flags = detectPPAFlagsInNotes(input.symptomesNotes);
  if (flags.length === 0) return null;

  // Niveau CRITIQUE si combo fièvre + hémorragies/cyanose (signe pathognomonique).
  const isCritical =
    flags.includes('fievre_forte') &&
    (flags.includes('hemorragies') || flags.includes('oreilles_bleues'));

  // Niveau HAUTE si 1 flag majeur seul OU apathie+fièvre.
  const isHaut =
    flags.includes('hemorragies') ||
    flags.includes('oreilles_bleues') ||
    flags.includes('apathie_avec_fievre') ||
    flags.includes('mortalite_rapide');

  if (!isCritical && !isHaut) return null;

  return {
    level: isCritical ? 'CRITIQUE' : 'HAUTE',
    animalId: input.animalId,
    animalLabel: input.animalLabel,
    animalType: input.animalType,
    flags,
    message: buildPPAMessage(input.animalLabel, flags, isCritical),
    actionsImmediate: PPA_ACTIONS_IMMEDIATE,
  };
}

function buildPPAMessage(label: string, flags: PPAFlag[], critical: boolean): string {
  const flagsTxt = flags
    .map(f => FLAG_LABEL[f])
    .filter(Boolean)
    .join(' + ');
  if (critical) {
    return `⚠️ SUSPICION PESTE PORCINE AFRICAINE — ${label} présente ${flagsTxt}. ISOLATION IMMÉDIATE de la loge + contact vétérinaire + DSV.`;
  }
  return `${label} : symptômes compatibles PPA (${flagsTxt}). Surveiller, isoler si dégradation, prévoir véto.`;
}

const FLAG_LABEL: Record<PPAFlag, string> = {
  fievre_forte: 'fièvre forte',
  hemorragies: 'hémorragies cutanées',
  oreilles_bleues: 'cyanose (oreilles bleues)',
  apathie_avec_fievre: 'apathie + fièvre',
  mortalite_rapide: 'mortalité rapide',
  cluster_morts: 'cluster mortalité',
};

export const PPA_ACTIONS_IMMEDIATE: string[] = [
  '1. ISOLER la loge concernée (clôture physique + pédiluve).',
  '2. NE PAS déplacer les animaux ni leur viande.',
  '3. CONTACTER le vétérinaire et la DSV (Direction Services Vétérinaires) sous 24h.',
  '4. RESTREINDRE l\'accès des visiteurs à l\'élevage.',
  '5. DÉSINFECTER vêtements/bottes à l\'entrée/sortie.',
];

/**
 * Convertit une liste de traitements santé en inputs pour evaluatePPASuspect.
 * Helper pour brancher depuis les données existantes.
 */
export function ppaInputsFromTraitements(
  traitements: TraitementSante[],
  truies: Map<string, Truie>,
  since: Date,
): PPADetectionInput[] {
  return traitements
    .filter(t => {
      const d = t.date ? new Date(t.date) : null;
      return d && d >= since;
    })
    .map(t => {
      const truie = truies.get(t.cibleId);
      return {
        animalId: t.cibleId,
        animalLabel: truie?.boucle || truie?.displayId || t.cibleId,
        animalType: 'TRUIE' as const,
        observedAt: new Date(t.date ?? Date.now()),
        symptomesNotes: [t.observation, t.traitement, t.typeSoin].filter(Boolean).join(' · '),
      };
    });
}
