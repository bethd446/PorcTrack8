/**
 * quickAddBandeLogic — Pure helpers & types for QuickAddBandeForm
 * ════════════════════════════════════════════════════════════════════════
 * Logique pure pour la création manuelle d'une bande historique.
 *
 * NB : les bandes "fraîches" sont auto-créées via la mise-bas (Agent B).
 * Ce form est réservé à l'import de bandes historiques (avant que l'app
 * ne capture l'élevage).
 */

import { suggestIdPortee } from './quickMiseBasHelpers';
import type { BandePorcelets } from '../../types/farm';

// ─── Types ───────────────────────────────────────────────────────────────────

export type BandeStatutInitial = 'Sous mère' | 'Sevrés';

export const BANDE_STATUTS_INITIAUX: ReadonlyArray<BandeStatutInitial> = [
  'Sous mère',
  'Sevrés',
];

export interface AddBandeDraft {
  idPortee: string;
  truieId: string;
  verratId: string;
  dateMb: string;        // ISO yyyy-MM-dd
  nesVivants: string;
  mortsNes: string;
  mortsNesMales: string;
  mortsNesFemelles: string;
  statut: BandeStatutInitial;
  poidsKg: string;
  loge: string;
  notes: string;
}

export interface AddBandeValidation {
  ok: boolean;
  errors: {
    idPortee?: string;
    truieId?: string;
    verratId?: string;
    dateMb?: string;
    nesVivants?: string;
    mortsNes?: string;
    mortsNesMales?: string;
    mortsNesFemelles?: string;
    poidsKg?: string;
    loge?: string;
    notes?: string;
    coherence?: string;
  };
  values?: {
    code_id: string;
    sow_code_id: string;
    boar_code_id: string | null;
    date_mise_bas: string | null;       // ISO yyyy-MM-dd
    porcelets_nes_vivants: number;
    porcelets_nes_total: number;
    nb_mort_nes: number;
    statut: BandeStatutInitial;
    poids_initial_kg: number;
    loge: string | null;
    notes: string | null;
  };
}

const BOUNDS = {
  minNes: 0,
  maxNes: 25,
  maxNesTotaux: 50,
  maxNotes: 300,
  maxLoge: 30,
  minPoids: 0.5,
  maxPoids: 50,
  /** Poids naissance par défaut quand bande Sous mère sans pesée (kg). */
  defaultPoidsNaissance: 1.4,
} as const;

function parseInteger(raw: string): number | null {
  const s = String(raw ?? '').trim();
  if (s === '') return null;
  if (!/^\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Suggère un ID portée à partir de la truie sélectionnée + bandes existantes.
 * Réutilise le même algo que `quickMiseBasHelpers.suggestIdPortee`.
 */
export function suggestNextIdPortee(
  truieId: string,
  bandes: ReadonlyArray<Pick<BandePorcelets, 'id' | 'idPortee' | 'truie'>>,
  when: Date = new Date(),
): string {
  return suggestIdPortee(truieId, bandes, when);
}

export function validateAddBande(draft: AddBandeDraft): AddBandeValidation {
  const errors: AddBandeValidation['errors'] = {};

  const idPortee = String(draft.idPortee ?? '').trim();
  if (!idPortee) errors.idPortee = 'ID portée requis';
  else if (idPortee.length > 30) errors.idPortee = 'ID trop long (max 30)';

  const truieId = String(draft.truieId ?? '').trim();
  if (!truieId) errors.truieId = 'Truie mère requise';

  const verratId = String(draft.verratId ?? '').trim();

  const dateMb = String(draft.dateMb ?? '').trim();
  if (dateMb !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(dateMb)) {
    errors.dateMb = 'Date invalide (yyyy-MM-dd)';
  }

  const nesVivants = parseInteger(draft.nesVivants);
  if (nesVivants === null) {
    errors.nesVivants = 'Nés vivants requis';
  } else if (nesVivants < BOUNDS.minNes || nesVivants > BOUNDS.maxNes) {
    errors.nesVivants = `Entre ${BOUNDS.minNes} et ${BOUNDS.maxNes}`;
  }

  const mortsNes = draft.mortsNes.trim() === '' ? 0 : parseInteger(draft.mortsNes);
  if (mortsNes === null) {
    errors.mortsNes = 'Nombre invalide';
  } else if (mortsNes < BOUNDS.minNes || mortsNes > BOUNDS.maxNes) {
    errors.mortsNes = `Entre ${BOUNDS.minNes} et ${BOUNDS.maxNes}`;
  }

  const mortsM = draft.mortsNesMales.trim() === ''
    ? 0
    : parseInteger(draft.mortsNesMales);
  if (mortsM === null) {
    errors.mortsNesMales = 'Nombre invalide';
  } else if (mortsM < 0 || mortsM > BOUNDS.maxNes) {
    errors.mortsNesMales = `Entre 0 et ${BOUNDS.maxNes}`;
  }

  const mortsF = draft.mortsNesFemelles.trim() === ''
    ? 0
    : parseInteger(draft.mortsNesFemelles);
  if (mortsF === null) {
    errors.mortsNesFemelles = 'Nombre invalide';
  } else if (mortsF < 0 || mortsF > BOUNDS.maxNes) {
    errors.mortsNesFemelles = `Entre 0 et ${BOUNDS.maxNes}`;
  }

  const loge = String(draft.loge ?? '').trim();
  if (loge.length > BOUNDS.maxLoge) errors.loge = `Loge trop longue (max ${BOUNDS.maxLoge})`;

  // Poids initial : obligatoire si bande Sevrés (porcelets sevrés à l'import).
  // Si Sous mère, défaut naissance 1.4 kg quand vide.
  const poidsRaw = String(draft.poidsKg ?? '').trim().replace(',', '.');
  let poids: number | null = null;
  if (poidsRaw !== '') {
    const n = parseFloat(poidsRaw);
    if (!Number.isFinite(n)) {
      errors.poidsKg = 'Poids invalide';
    } else if (n < BOUNDS.minPoids || n > BOUNDS.maxPoids) {
      errors.poidsKg = `Entre ${BOUNDS.minPoids} et ${BOUNDS.maxPoids} kg`;
    } else {
      poids = n;
    }
  } else if (draft.statut === 'Sevrés') {
    errors.poidsKg = 'Poids moyen requis pour bande sevrée';
  } else {
    poids = BOUNDS.defaultPoidsNaissance;
  }

  const notes = String(draft.notes ?? '').trim();
  if (notes.length > BOUNDS.maxNotes) errors.notes = `Notes trop longues (max ${BOUNDS.maxNotes})`;

  // Cohérence : morts-nés mâles + femelles ≤ morts-nés total (si renseignés)
  if (
    mortsNes !== null &&
    mortsM !== null &&
    mortsF !== null &&
    mortsM + mortsF > mortsNes
  ) {
    errors.coherence = 'Mort-nés mâles + femelles dépasse mort-nés total';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const nesTotaux = (nesVivants as number) + (mortsNes as number);

  return {
    ok: true,
    errors: {},
    values: {
      code_id: idPortee,
      sow_code_id: truieId,
      boar_code_id: verratId || null,
      date_mise_bas: dateMb || null,
      porcelets_nes_vivants: nesVivants as number,
      porcelets_nes_total: nesTotaux,
      nb_mort_nes: mortsNes as number,
      statut: draft.statut ?? 'Sous mère',
      poids_initial_kg: poids as number,
      loge: loge || null,
      notes: notes || null,
    },
  };
}
