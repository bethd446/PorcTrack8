/**
 * V72 — buildMariusSuggestions.
 *
 * Génère 3 suggestions de questions à afficher AU-DESSUS du chat Marius
 * (pré-remplissage 1-tap), DYNAMIQUEMENT à partir de l'état réel de la
 * ferme : mise-bas imminente, stocks en rupture, retour chaleur attendu,
 * échographie ouverte, surdensité, manque pesée, alertes critiques.
 *
 * Source de vérité : `FarmSnapshot` (cf. buildFarmContext.ts) — mêmes
 * collections que celles déjà injectées dans le bloc CONTEXTE FERME pour
 * que les suggestions soient cohérentes avec ce que Marius "voit".
 *
 * Fallback : si la ferme est calme (aucune règle déclenchée), on retombe
 * sur 3 suggestions générales (priorités du jour, tournée, ISSE).
 *
 * Pas d'emoji dans les libellés (DNA V70 strict).
 */
import type { Truie, BandePorcelets, Saillie } from '../../types/farm';
import type { FarmSnapshot } from './buildFarmContext';
import { safeDate } from '../../lib/truieHelpers';

export type SuggestionCategory =
  | 'mise-bas'
  | 'stocks'
  | 'cycles'
  | 'sante'
  | 'general';

export interface MariusSuggestion {
  id: string;
  question: string;
  /** 1 = critique, 2 = haute, 3 = normale, 4 = fallback général. */
  priority: number;
  category: SuggestionCategory;
}

/** Snapshot étendu : on a besoin des saillies pour les fenêtres écho/retour chaleur. */
export interface MariusSuggestionsInput extends FarmSnapshot {
  saillies?: Saillie[];
}

export interface BuildSuggestionsOptions {
  /** Date de référence — défaut `new Date()`. */
  now?: Date;
  /** Nombre max de suggestions retournées (défaut 3). */
  max?: number;
}

const MS_PER_DAY = 86400000;

/** Saillies considérées comme "actives" (en attente écho/MB). */
const SAILLIE_ACTIVE = new Set(['', 'CONFIRMEE', 'EN_ATTENTE', 'SAILLIE', 'PLEINE', 'ACTIVE']);

function diffDays(target: Date | null, now: Date): number | null {
  if (!target) return null;
  return Math.floor((target.getTime() - now.getTime()) / MS_PER_DAY);
}

function isStatusReformeOrMort(s: string | undefined | null): boolean {
  const v = (s || '').toLowerCase();
  return v.includes('réforme') || v.includes('reforme') || v.includes('mort');
}

function ruleMiseBasImminente(
  bandes: BandePorcelets[],
  truies: Truie[],
  now: Date,
): MariusSuggestion | null {
  // Une bande est "mise-bas imminente" si :
  //  - dateMB pas encore renseignée (sinon la MB a eu lieu)
  //  - une truie associée a une dateMBPrevue dans la fenêtre [-3 ; +2]
  // Mais le snapshot ne lie pas explicitement bande↔truie via dateMBPrevue ;
  // on se rabat sur la truie pour la fenêtre, et sur la bande pour le
  // libellé si elle existe (sinon le displayId de la truie).
  const candidatesTruies = truies
    .filter((t) => !isStatusReformeOrMort(t.statut))
    .filter((t) => {
      const d = safeDate(t.dateMBPrevue);
      const days = diffDays(d, now);
      return days !== null && days >= -3 && days <= 3;
    });
  if (candidatesTruies.length === 0) return null;

  // Trie par dateMBPrevue (plus proche en premier).
  candidatesTruies.sort((a, b) => {
    const da = safeDate(a.dateMBPrevue);
    const db = safeDate(b.dateMBPrevue);
    return (da?.getTime() ?? 0) - (db?.getTime() ?? 0);
  });

  const t = candidatesTruies[0];
  const days = diffDays(safeDate(t.dateMBPrevue), now) ?? 0;
  const codeRef = t.displayId || t.id;
  const jLabel = days === 0 ? 'aujourd\'hui' : days > 0 ? `J-${days}` : `J+${-days}`;
  return {
    id: `mb-imminente-${codeRef}`,
    question: `Quelle checklist pour la mise-bas de ${codeRef} (${jLabel}) ?`,
    priority: 1,
    category: 'mise-bas',
  };
}

function ruleStockRupture(snap: FarmSnapshot): MariusSuggestion | null {
  const ruptureAliment = snap.stockAliment.find(
    (s) => (s.statutStock || '').toUpperCase() === 'RUPTURE' || (s.stockActuel ?? 0) <= 0,
  );
  if (ruptureAliment) {
    return {
      id: `stock-rupture-${ruptureAliment.id}`,
      question: `Que commander en priorité ? ${ruptureAliment.libelle} est à zéro.`,
      priority: 1,
      category: 'stocks',
    };
  }
  const ruptureVeto = snap.stockVeto.find(
    (s) => (s.statutStock || '').toUpperCase() === 'RUPTURE' || (s.stockActuel ?? 0) <= 0,
  );
  if (ruptureVeto) {
    return {
      id: `stock-veto-rupture-${ruptureVeto.id}`,
      question: `Que commander en priorité ? ${ruptureVeto.produit} est à zéro.`,
      priority: 1,
      category: 'stocks',
    };
  }
  return null;
}

function ruleStockBas(snap: FarmSnapshot): MariusSuggestion | null {
  const bas = [...snap.stockAliment, ...snap.stockVeto].find((s) => {
    const statut = (s.statutStock || '').toUpperCase();
    if (statut === 'BAS') return true;
    return false;
  });
  if (!bas) return null;
  const libelle = 'libelle' in bas ? bas.libelle : bas.produit;
  return {
    id: `stock-bas-${bas.id}`,
    question: `Comment éviter la rupture sur ${libelle} (stock bas) ?`,
    priority: 2,
    category: 'stocks',
  };
}

function ruleRetourChaleur(
  truies: Truie[],
  bandes: BandePorcelets[],
  now: Date,
): MariusSuggestion | null {
  // Truies en attente saillie après sevrage récent (J+3 à J+10).
  // On déduit le sevrage le plus récent via les bandes (dateSevrageReelle)
  // dont la mère = displayId de la truie.
  const enAttente = truies.filter((t) => {
    const s = (t.statut || '').toLowerCase();
    return s.includes('attente saillie');
  });
  if (enAttente.length === 0) return null;

  let count = 0;
  for (const t of enAttente) {
    const code = t.displayId || t.id;
    const lastSevrage = bandes
      .filter((b) => (b.truie || '') === code && b.dateSevrageReelle)
      .map((b) => safeDate(b.dateSevrageReelle))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    if (!lastSevrage) continue;
    const days = Math.floor((now.getTime() - lastSevrage.getTime()) / MS_PER_DAY);
    if (days >= 3 && days <= 10) count += 1;
  }
  if (count === 0) return null;
  const plural = count > 1;
  return {
    id: 'retour-chaleur',
    question: `${count} truie${plural ? 's' : ''} attend${plural ? 'ent' : ''} retour chaleur. Comment détecter et saillir au bon moment ?`,
    priority: 2,
    category: 'cycles',
  };
}

function ruleEchographie(
  truies: Truie[],
  saillies: Saillie[],
  now: Date,
): MariusSuggestion | null {
  if (saillies.length === 0) return null;
  let count = 0;
  for (const t of truies) {
    if (isStatusReformeOrMort(t.statut)) continue;
    const idCandidates = [t.id, t.displayId].filter(Boolean);
    const active = saillies.find(
      (s) =>
        idCandidates.includes(s.truieId) &&
        SAILLIE_ACTIVE.has((s.statut ?? '').toUpperCase()),
    );
    if (!active) continue;
    const d = safeDate(active.dateSaillie);
    if (!d) continue;
    const days = Math.floor((now.getTime() - d.getTime()) / MS_PER_DAY);
    if (days >= 25 && days <= 35) count += 1;
  }
  if (count === 0) return null;
  return {
    id: 'echo-fenetre',
    question: `${count} échographie${count > 1 ? 's' : ''} à planifier (fenêtre J25-J35). Comment confirmer la gestation ?`,
    priority: 2,
    category: 'cycles',
  };
}

function ruleAlertesCritiques(snap: FarmSnapshot): MariusSuggestion | null {
  const critiques = snap.alerts.filter((a) => a.priority === 'CRITIQUE');
  if (critiques.length === 0) return null;
  return {
    id: 'alertes-critiques',
    question: `${critiques.length} alerte${critiques.length > 1 ? 's' : ''} critique${critiques.length > 1 ? 's' : ''} en cours. Par où commencer ?`,
    priority: 1,
    category: 'sante',
  };
}

function ruleSurdensiteEngraissement(bandes: BandePorcelets[]): MariusSuggestion | null {
  // R10 : >6 bandes en engraissement (config farm.ENGRAISSEMENT_LOGES_CAPACITY)
  const engrais = bandes.filter((b) => {
    const s = (b.statut || '').toUpperCase();
    return s.includes('CROISSANCE') || s.includes('FINITION') || s.includes('ENGRAISS');
  });
  if (engrais.length <= 6) return null;
  return {
    id: 'surdensite',
    question: `${engrais.length} bandes en engraissement. Comment gérer la surdensité ?`,
    priority: 2,
    category: 'cycles',
  };
}

function ruleSevrageProche(bandes: BandePorcelets[], now: Date): MariusSuggestion | null {
  // Bandes Sous mère à J21-J28.
  const proches = bandes.filter((b) => {
    const s = (b.statut || '').toLowerCase();
    if (!s.includes('sous mère') && !s.includes('sous mere')) return false;
    if (b.dateSevrageReelle) return false;
    const d = safeDate(b.dateMB);
    if (!d) return false;
    const age = Math.floor((now.getTime() - d.getTime()) / MS_PER_DAY);
    return age >= 21 && age <= 28;
  });
  if (proches.length === 0) return null;
  return {
    id: 'sevrage-proche',
    question: `${proches.length} bande${proches.length > 1 ? 's' : ''} bientôt sevrable${proches.length > 1 ? 's' : ''}. Quelle préparation post-sevrage ?`,
    priority: 3,
    category: 'cycles',
  };
}

const FALLBACK_SUGGESTIONS: MariusSuggestion[] = [
  {
    id: 'fallback-priorites',
    question: 'Que dois-je faire aujourd\'hui en priorité ?',
    priority: 4,
    category: 'general',
  },
  {
    id: 'fallback-tournee',
    question: 'Quelle tournée pour mes truies pleines ?',
    priority: 4,
    category: 'general',
  },
  {
    id: 'fallback-isse',
    question: 'Comment améliorer mon ISSE ?',
    priority: 4,
    category: 'general',
  },
];

/**
 * Génère jusqu'à `max` suggestions ordonnées par priorité (1 critique → 4
 * fallback). Si aucune règle métier n'est déclenchée, retourne uniquement
 * les suggestions générales.
 */
export function buildMariusSuggestions(
  input: MariusSuggestionsInput,
  options: BuildSuggestionsOptions = {},
): MariusSuggestion[] {
  const { now = new Date(), max = 3 } = options;
  const all: MariusSuggestion[] = [];

  // Règles critiques (priorité 1) — affichées en priorité.
  const mb = ruleMiseBasImminente(input.bandes, input.truies, now);
  if (mb) all.push(mb);

  const rupture = ruleStockRupture(input);
  if (rupture) all.push(rupture);

  const critiques = ruleAlertesCritiques(input);
  if (critiques) all.push(critiques);

  // Règles haute priorité (2).
  const retourCh = ruleRetourChaleur(input.truies, input.bandes, now);
  if (retourCh) all.push(retourCh);

  const echo = ruleEchographie(input.truies, input.saillies ?? [], now);
  if (echo) all.push(echo);

  const surdensite = ruleSurdensiteEngraissement(input.bandes);
  if (surdensite) all.push(surdensite);

  const stockBas = ruleStockBas(input);
  if (stockBas) all.push(stockBas);

  // Règles normales (3).
  const sevrage = ruleSevrageProche(input.bandes, now);
  if (sevrage) all.push(sevrage);

  // Fallback si aucune règle métier déclenchée.
  if (all.length === 0) {
    return FALLBACK_SUGGESTIONS.slice(0, max);
  }

  // Tri stable par priorité, puis slice.
  all.sort((a, b) => a.priority - b.priority);

  // Si on n'a pas assez de suggestions métier, on complète avec du fallback
  // (sans dupliquer les ids).
  const seen = new Set(all.map((s) => s.id));
  for (const fb of FALLBACK_SUGGESTIONS) {
    if (all.length >= max) break;
    if (!seen.has(fb.id)) all.push(fb);
  }

  return all.slice(0, max);
}
