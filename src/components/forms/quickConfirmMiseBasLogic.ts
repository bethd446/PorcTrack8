/**
 * quickConfirmMiseBasLogic — Helpers purs pour confirmation MB rigoureuse.
 * ════════════════════════════════════════════════════════════════════════
 * Contexte métier :
 *   - Une saillie approche de J-3 à J+2 (cycle gestation 115j) → l'éleveur
 *     confirme la mise-bas en saisissant les chiffres réels.
 *   - On crée alors une bande `phase='SOUS_MERE'`, `validation_status='VALIDATED'`,
 *     en référençant truie + verrat + saillie d'origine.
 *
 * Toute la logique de validation/dérivation est ici, hors React, pour être
 * testée en pur sans Supabase ni DOM.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MiseBasDraft {
  dateMiseBas: string; // ISO yyyy-MM-dd
  nbTotal: string;
  nbVivants: string;
  poidsPorteeKg: string;
  nbMales: string;
  nbFemelles: string;
  logeId: string;
  /** ISO yyyy-MM-dd de la saillie préchargée — sert au garde-fou MB ≥ saillie. Optionnel. */
  dateSaillie?: string | null;
}

export interface MiseBasValidation {
  ok: boolean;
  errors: {
    dateMiseBas?: string;
    nbTotal?: string;
    nbVivants?: string;
    poidsPorteeKg?: string;
    nbMales?: string;
    nbFemelles?: string;
    logeId?: string;
  };
  values?: {
    dateMiseBas: string;
    nbTotal: number;
    nbVivants: number;
    nbMortNes: number;
    poidsPorteeKg: number | null;
    nbMales: number | null;
    nbFemelles: number | null;
    logeId: string;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Calcule le nombre de mort-nés à partir du total et des vivants.
 * Retourne 0 si l'opération donne un négatif (cas impossible mais safe).
 */
export function computeMortNes(nbTotal: number, nbVivants: number): number {
  if (!Number.isFinite(nbTotal) || !Number.isFinite(nbVivants)) return 0;
  return Math.max(0, nbTotal - nbVivants);
}

/**
 * Génère un code_id unique de la forme `B-YYYYMMDD-MB-{truie}`.
 * Convention identique à `generateBandeCodeId` mais préfixé MB pour
 * tracer l'origine "Mise Bas confirmée".
 */
export function generateMbCodeId(date: string, truieCode: string): string {
  const iso = /^\d{4}-\d{2}-\d{2}$/.exec(date);
  const ymd = iso ? iso[0].replace(/-/g, '') : date.replace(/[^0-9]/g, '');
  const safe = (truieCode || 'X')
    .trim()
    .replace(/[\s/]+/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '')
    .toUpperCase();
  return `B-${ymd}-MB-${safe}`;
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Valide la saisie de mise-bas. Règles :
 *   - dateMiseBas : ISO valide, non future
 *   - nbTotal : entier 1..25
 *   - nbVivants : entier 0..nbTotal
 *   - poidsPorteeKg : optionnel, 0.5..50 kg
 *   - nbMales / nbFemelles : optionnels, somme ≤ nbVivants
 *   - logeId : requis (UUID non vide)
 */
export function validateMiseBas(draft: MiseBasDraft): MiseBasValidation {
  const errors: MiseBasValidation['errors'] = {};

  // Date
  const date = draft.dateMiseBas.trim();
  if (!date) {
    errors.dateMiseBas = 'Date requise';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.dateMiseBas = 'Format ISO yyyy-mm-dd attendu';
  } else {
    const d = new Date(date + 'T00:00:00Z');
    if (Number.isNaN(d.getTime())) {
      errors.dateMiseBas = 'Date invalide';
    } else {
      const todayUtc = new Date();
      todayUtc.setUTCHours(23, 59, 59, 999);
      if (d.getTime() > todayUtc.getTime()) {
        errors.dateMiseBas = 'Date future interdite';
      } else if (draft.dateSaillie && /^\d{4}-\d{2}-\d{2}$/.test(draft.dateSaillie)) {
        const dSaillie = new Date(draft.dateSaillie + 'T00:00:00Z');
        if (Number.isFinite(dSaillie.getTime()) && d.getTime() < dSaillie.getTime()) {
          errors.dateMiseBas = `Mise-bas avant la saillie (${draft.dateSaillie}) impossible`;
        }
      }
    }
  }

  // nbTotal
  const total = Number(draft.nbTotal);
  if (!draft.nbTotal.trim()) {
    errors.nbTotal = 'Nombre total requis';
  } else if (!Number.isFinite(total) || !Number.isInteger(total) || total < 1 || total > 25) {
    errors.nbTotal = 'Total doit être entre 1 et 25';
  }

  // nbVivants
  const vivants = Number(draft.nbVivants);
  if (!draft.nbVivants.trim()) {
    errors.nbVivants = 'Nombre vivants requis';
  } else if (!Number.isFinite(vivants) || !Number.isInteger(vivants) || vivants < 0) {
    errors.nbVivants = 'Vivants doit être un entier ≥ 0';
  } else if (Number.isFinite(total) && vivants > total) {
    errors.nbVivants = 'Vivants ne peut dépasser le total';
  }

  // poids portée (optionnel)
  let poidsNum: number | null = null;
  const poidsRaw = String(draft.poidsPorteeKg ?? '').replace(',', '.').trim();
  if (poidsRaw) {
    const p = Number(poidsRaw);
    if (!Number.isFinite(p) || p < 0.5 || p > 50) {
      errors.poidsPorteeKg = 'Poids portée doit être entre 0.5 et 50 kg';
    } else {
      poidsNum = p;
    }
  }

  // males / femelles (optionnels)
  let nbMales: number | null = null;
  let nbFemelles: number | null = null;
  if (draft.nbMales.trim()) {
    const m = Number(draft.nbMales);
    if (!Number.isFinite(m) || !Number.isInteger(m) || m < 0) {
      errors.nbMales = 'Mâles doit être un entier ≥ 0';
    } else {
      nbMales = m;
    }
  }
  if (draft.nbFemelles.trim()) {
    const f = Number(draft.nbFemelles);
    if (!Number.isFinite(f) || !Number.isInteger(f) || f < 0) {
      errors.nbFemelles = 'Femelles doit être un entier ≥ 0';
    } else {
      nbFemelles = f;
    }
  }
  if (
    !errors.nbMales &&
    !errors.nbFemelles &&
    nbMales != null &&
    nbFemelles != null &&
    Number.isFinite(vivants) &&
    nbMales + nbFemelles > vivants
  ) {
    errors.nbMales = 'M + F doit être ≤ vivants';
  }

  // loge
  if (!draft.logeId || !draft.logeId.trim()) {
    errors.logeId = 'Loge requise';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    errors: {},
    values: {
      dateMiseBas: date,
      nbTotal: total,
      nbVivants: vivants,
      nbMortNes: computeMortNes(total, vivants),
      poidsPorteeKg: poidsNum,
      nbMales,
      nbFemelles,
      logeId: draft.logeId.trim(),
    },
  };
}

// ─── Sélection saillies proches mise-bas ─────────────────────────────────────

export interface SaillieLike {
  id: string;
  sow_id: string | null;
  boar_id: string | null;
  date_saillie: string | null;
  date_mb_prevue: string | null;
  statut?: string | null;
}

export interface SaillieProcheMB extends SaillieLike {
  /** Jours restants avant la date prévue (négatif si dépassé). */
  jours_avant_mb: number;
  date_mb_prevue: string;
}

/**
 * Filtre les saillies dont la mise-bas prévue tombe dans la fenêtre
 * `[dateRef - daysAfter, dateRef + daysBefore]`. Convention spec : J-3 à J+2.
 *
 * @param saillies liste brute
 * @param dateRef date d'aujourd'hui (par défaut now)
 * @param daysBefore jours avant la date prévue (par défaut 3)
 * @param daysAfter jours après la date prévue (par défaut 2)
 */
export function selectSailliesProchesMB(
  saillies: ReadonlyArray<SaillieLike>,
  dateRef: Date = new Date(),
  daysBefore = 3,
  daysAfter = 2,
): SaillieProcheMB[] {
  if (!Number.isFinite(dateRef.getTime())) return [];
  const refTs = dateRef.getTime();
  const out: SaillieProcheMB[] = [];
  for (const s of saillies) {
    // Calcul date_mb_prevue : utiliser date_mb_prevue si dispo, sinon
    // dériver depuis date_saillie + 115j (gestation standard).
    let prevueIso = s.date_mb_prevue;
    if (!prevueIso && s.date_saillie) {
      const ds = new Date(s.date_saillie);
      if (Number.isFinite(ds.getTime())) {
        prevueIso = new Date(ds.getTime() + 115 * 86400000)
          .toISOString()
          .slice(0, 10);
      }
    }
    if (!prevueIso) continue;
    const dp = new Date(prevueIso + 'T12:00:00Z');
    if (!Number.isFinite(dp.getTime())) continue;
    const joursAvant = Math.round((dp.getTime() - refTs) / 86400000);
    if (joursAvant <= daysBefore && joursAvant >= -daysAfter) {
      out.push({
        ...s,
        date_mb_prevue: prevueIso,
        jours_avant_mb: joursAvant,
      });
    }
  }
  // Tri : urgence décroissante (jours_avant_mb croissant ; négatif = retard = urgent)
  out.sort((a, b) => a.jours_avant_mb - b.jours_avant_mb);
  return out;
}
