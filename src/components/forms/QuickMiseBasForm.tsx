/**
 * QuickMiseBasForm — Saisie rapide d'une mise-bas (naissance d'une portée)
 * ════════════════════════════════════════════════════════════════════════
 * BottomSheet : le porcher renseigne, au moment où la truie met bas :
 *   - La truie mère (parmi truies en maternité / pleine / surveillance)
 *   - Date + heure de mise-bas (défaut : maintenant)
 *   - Nés vivants / morts-nés (→ nés totaux auto-calculé mais éditable)
 *   - Poids moyen porcelet (kg, optionnel)
 *   - Notes (textarea 200 chars, optionnel)
 *
 * Submit (2 enqueues offline-first, dans l'ordre) :
 *   1. enqueueAppendRow('PORCELETS_BANDES_DETAIL', [...]) — nouvelle ligne
 *      portée au format canonique :
 *      [ID Portée, Truie, Boucle mère, Date MB (dd/MM/yyyy), NV, Morts,
 *       Vivants, Date sevrage prévue (J+28), Date sevrage réelle (""),
 *       Statut ("Sous mère"), Notes]
 *   2. enqueueUpdateRow('SUIVI_TRUIES_REPRODUCTION', 'ID', truie.id,
 *        { STATUT: 'Maternité' }) — bascule la truie en Maternité.
 *
 * Auto-génération ID portée : pattern strict `{YY}-T{N}-{SEQ:02}` (ex :
 * `26-T7-01`). Le compteur SEQ incrémente en regardant les portées existantes
 * pour la même truie sur la même année.
 *
 * Compagnon tests : QuickMiseBasForm.test.tsx
 *
 * Exports nommés (logique pure, testable en node-env) :
 *   - suggestIdPortee()
 *   - extractTruieNumber()
 *   - validateMiseBas()
 *   - buildMiseBasRow()
 *   - addDaysToSheetsDate()
 *   - submitMiseBas()
 *   - MISE_BAS_BOUNDS
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IonToast, IonSelect, IonSelectOption } from '@ionic/react';
import { Baby, Check, CheckCircle2 } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { enqueueAppendRow, enqueueUpdateRow, type SheetCell } from '../../services/offlineQueue';
import { useFarm } from '../../context/FarmContext';
import { normaliseStatut } from '../../lib/truieStatut';
import type { BandePorcelets, Truie } from '../../types/farm';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';

// ─── Types & bornes ──────────────────────────────────────────────────────────

export interface MiseBasDraft {
  /** ID truie mère (ex: "T07"). Obligatoire. */
  truieId: string;
  /** ID portée (ex: "26-T7-01"). Auto-suggéré mais éditable. */
  idPortee: string;
  /** Date ISO yyyy-MM-dd (input type=date). */
  dateIso: string;
  /** Heure "HH:mm" (input type=time). */
  heure: string;
  /** Nés vivants (0..25). */
  nesVivants: string;
  /** Morts-nés (0..25). */
  mortsNes: string;
  /** Nés totaux (0..50). Auto = nesVivants + mortsNes, mais éditable. */
  nesTotaux: string;
  /** Poids moyen porcelet en kg (0.5..3.0, optionnel). */
  poidsMoyen: string;
  /** Notes libres, max 200 chars. */
  notes: string;
}

export interface MiseBasValidationErrors {
  truieId?: string;
  idPortee?: string;
  nesVivants?: string;
  mortsNes?: string;
  nesTotaux?: string;
  poidsMoyen?: string;
  notes?: string;
  coherence?: string;
}

export interface MiseBasValidation {
  ok: boolean;
  errors: MiseBasValidationErrors;
  /** Valeurs numériques normalisées + dates prêtes pour Sheets. */
  normalized?: {
    nesVivants: number;
    mortsNes: number;
    nesTotaux: number;
    poidsMoyen?: number;
    dateMbSheets: string;        // dd/MM/yyyy
    dateSevragePrevue: string;   // dd/MM/yyyy (MB + 28j)
  };
}

export const MISE_BAS_BOUNDS = {
  minNes: 0,
  maxNes: 25,
  maxNesTotaux: 50,
  minPoids: 0.5,
  maxPoids: 3.0,
  maxNotes: 200,
  sevrageJours: 28,
} as const;

// ─── Pure helpers ────────────────────────────────────────────────────────────

/**
 * Extrait la partie numérique d'un ID truie ("T07" → 7, "T14" → 14).
 * Retourne 0 si l'ID ne contient pas de chiffres (cas bord).
 */
export function extractTruieNumber(truieId: string): number {
  const m = String(truieId ?? '').match(/(\d+)/);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Suggère un ID portée au format strict `{YY}-T{N}-{SEQ:02}`.
 *
 * - YY = 2 derniers chiffres de l'année de la mise-bas
 * - N  = numéro truie (sans zero-pad : T07 → "7", T14 → "14")
 * - SEQ = 2-digits, incrémenté en regardant les portées existantes de CETTE
 *         truie pour cette année. Démarre à "01".
 *
 * Match inclus : on regarde `idPortee` (ou `id`) des bandes existantes
 * pour la même truie, même année, et on prend max(SEQ) + 1.
 */
export function suggestIdPortee(
  truieId: string,
  bandes: ReadonlyArray<Pick<BandePorcelets, 'id' | 'idPortee' | 'truie'>>,
  when: Date = new Date(),
): string {
  const n = extractTruieNumber(truieId);
  if (!n) return '';
  const yy = String(when.getFullYear()).slice(-2);
  const prefix = `${yy}-T${n}-`;
  let maxSeq = 0;
  for (const b of bandes) {
    const candidate = b.idPortee || b.id || '';
    if (!candidate.startsWith(prefix)) continue;
    const tail = candidate.slice(prefix.length);
    const m = tail.match(/^(\d+)/);
    if (!m) continue;
    const s = parseInt(m[1], 10);
    if (Number.isFinite(s) && s > maxSeq) maxSeq = s;
  }
  const next = maxSeq + 1;
  return `${prefix}${String(next).padStart(2, '0')}`;
}

/**
 * Convertit ISO yyyy-MM-dd (+ heure optionnelle) en dd/MM/yyyy (format Sheets).
 * L'heure est ignorée pour la date Sheets (colonne Date MB = date pure),
 * mais on l'exploite en upstream si on veut stocker un horodatage en notes.
 */
export function isoToSheetsDate(iso: string): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/**
 * Ajoute `days` jours à une date Sheets `dd/MM/yyyy` et renvoie le même format.
 * Utilisé pour calculer Date sevrage prévue = dateMB + 28j.
 * Si le parsing échoue, retourne ''.
 */
export function addDaysToSheetsDate(ddmmyyyy: string, days: number): string {
  const m = ddmmyyyy.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return '';
  const d = new Date(
    Number(m[3]),
    Number(m[2]) - 1,
    Number(m[1]),
  );
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

/** Parse un entier strict (pas de virgule/décimale). null si invalide. */
function parseInteger(raw: string): number | null {
  const s = String(raw ?? '').trim();
  if (s === '') return null;
  if (!/^\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

/** Parse un float (accepte virgule FR). null si vide ou invalide. */
function parseFloatFr(raw: string): number | null {
  const s = String(raw ?? '').trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Validation de la saisie mise-bas.
 *
 * Règles :
 *   - truieId : non vide
 *   - idPortee : non vide (si vide, on refuse — on garde la suggestion éditable)
 *   - nesVivants : entier 0..25 (requis)
 *   - mortsNes : entier 0..25 (requis ; 0 autorisé)
 *   - nesTotaux : entier 0..50 (requis ; doit == vivants + mortsNes)
 *   - poidsMoyen : optionnel ; si fourni, 0.5..3.0
 *   - notes : <= 200 chars
 *   - dateIso : non vide, parsable
 */
export function validateMiseBas(draft: MiseBasDraft): MiseBasValidation {
  const errors: MiseBasValidationErrors = {};

  const truieId = String(draft.truieId ?? '').trim();
  if (!truieId) errors.truieId = 'Truie mère requise';

  const idPortee = String(draft.idPortee ?? '').trim();
  if (!idPortee) errors.idPortee = 'ID portée requis';

  const nv = parseInteger(draft.nesVivants);
  if (nv === null) {
    errors.nesVivants = 'Nés vivants requis';
  } else if (nv < MISE_BAS_BOUNDS.minNes || nv > MISE_BAS_BOUNDS.maxNes) {
    errors.nesVivants = `0 à ${MISE_BAS_BOUNDS.maxNes}`;
  }

  const mn = parseInteger(draft.mortsNes);
  if (mn === null) {
    errors.mortsNes = 'Morts-nés requis (0 si aucun)';
  } else if (mn < MISE_BAS_BOUNDS.minNes || mn > MISE_BAS_BOUNDS.maxNes) {
    errors.mortsNes = `0 à ${MISE_BAS_BOUNDS.maxNes}`;
  }

  const nt = parseInteger(draft.nesTotaux);
  if (nt === null) {
    errors.nesTotaux = 'Nés totaux requis';
  } else if (nt < 0 || nt > MISE_BAS_BOUNDS.maxNesTotaux) {
    errors.nesTotaux = `0 à ${MISE_BAS_BOUNDS.maxNesTotaux}`;
  }

  // Cohérence : nesTotaux == nesVivants + mortsNes
  if (nv !== null && mn !== null && nt !== null && nv + mn !== nt) {
    errors.coherence = `Incohérence : ${nv} vivants + ${mn} morts-nés ≠ ${nt} totaux`;
  }

  let poidsMoyenNum: number | undefined;
  const poidsRaw = String(draft.poidsMoyen ?? '').trim();
  if (poidsRaw !== '') {
    const p = parseFloatFr(draft.poidsMoyen);
    if (p === null) {
      errors.poidsMoyen = 'Poids invalide';
    } else if (p < MISE_BAS_BOUNDS.minPoids || p > MISE_BAS_BOUNDS.maxPoids) {
      errors.poidsMoyen = `${MISE_BAS_BOUNDS.minPoids} à ${MISE_BAS_BOUNDS.maxPoids} kg`;
    } else {
      poidsMoyenNum = p;
    }
  }

  if ((draft.notes ?? '').length > MISE_BAS_BOUNDS.maxNotes) {
    errors.notes = `Max ${MISE_BAS_BOUNDS.maxNotes} caractères`;
  }

  const dateMbSheets = isoToSheetsDate(draft.dateIso);
  if (!dateMbSheets) {
    errors.idPortee = errors.idPortee ?? '';
    // Un date invalide bloque aussi la suite
    return { ok: false, errors: { ...errors, idPortee: errors.idPortee || 'Date MB invalide' } };
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const dateSevragePrevue = addDaysToSheetsDate(dateMbSheets, MISE_BAS_BOUNDS.sevrageJours);

  return {
    ok: true,
    errors: {},
    normalized: {
      nesVivants: nv as number,
      mortsNes: mn as number,
      nesTotaux: nt as number,
      poidsMoyen: poidsMoyenNum,
      dateMbSheets,
      dateSevragePrevue,
    },
  };
}

/**
 * Construit la row Sheets pour `PORCELETS_BANDES_DETAIL` dans l'ordre canonique
 * des colonnes (cf. `SHEETS_AUDIT.md` + `mapBande` dans `src/mappers/index.ts`) :
 *
 *   [ID Portée, Truie, Boucle mère, Date MB, NV, Morts, Vivants,
 *    Date sevrage prévue, Date sevrage réelle, Statut, Notes]
 */
export function buildMiseBasRow(params: {
  idPortee: string;
  truieId: string;
  boucleMere: string;
  dateMbSheets: string;
  nv: number;
  mortsNes: number;
  vivants: number;
  dateSevragePrevue: string;
  notes: string;
  poidsMoyen?: number;
}): SheetCell[] {
  const noteParts: string[] = [];
  if (params.poidsMoyen !== undefined) {
    noteParts.push(`Poids moyen ${params.poidsMoyen.toFixed(2)} kg`);
  }
  if (params.notes.trim()) noteParts.push(params.notes.trim());
  const notes = noteParts.join(' · ');

  return [
    params.idPortee,           // ID Portée
    params.truieId,            // Truie
    params.boucleMere,         // Boucle mère
    params.dateMbSheets,       // Date MB (dd/MM/yyyy)
    params.nv,                 // NV (nés totaux)
    params.mortsNes,           // Morts
    params.vivants,            // Vivants (=nv - mortsNes)
    params.dateSevragePrevue,  // Date sevrage prévue
    '',                        // Date sevrage réelle
    'Sous mère',               // Statut
    notes,                     // Notes
  ];
}

/**
 * Orchestration submit : append PORCELETS_BANDES_DETAIL puis update
 * SUIVI_TRUIES_REPRODUCTION (passe truie en Maternité). Le append
 * précède l'update pour que, si l'update échoue, on garde au moins
 * la trace de la portée (audit).
 */
export async function submitMiseBas(
  validated: NonNullable<MiseBasValidation['normalized']>,
  params: {
    idPortee: string;
    truieId: string;
    boucleMere: string;
    notes: string;
  },
  deps: {
    appendRow: (sheet: string, values: SheetCell[]) => Promise<void>;
    updateRow: (
      sheet: string,
      idHeader: string,
      idValue: string,
      patch: Record<string, SheetCell>,
    ) => Promise<void>;
    isOnline: () => boolean;
  },
): Promise<{ online: boolean; idPortee: string }> {
  const vivants = Math.max(0, validated.nesTotaux - validated.mortsNes);

  const row = buildMiseBasRow({
    idPortee: params.idPortee,
    truieId: params.truieId,
    boucleMere: params.boucleMere,
    dateMbSheets: validated.dateMbSheets,
    nv: validated.nesTotaux,
    mortsNes: validated.mortsNes,
    vivants,
    dateSevragePrevue: validated.dateSevragePrevue,
    notes: params.notes,
    poidsMoyen: validated.poidsMoyen,
  });

  await deps.appendRow('PORCELETS_BANDES_DETAIL', row);
  await deps.updateRow(
    'SUIVI_TRUIES_REPRODUCTION',
    'ID',
    params.truieId,
    { STATUT: 'Maternité' },
  );

  return { online: deps.isOnline(), idPortee: params.idPortee };
}

// ─── Composant ───────────────────────────────────────────────────────────────

export interface QuickMiseBasFormProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pré-sélectionne une truie à l'ouverture (depuis MaterniteView row action). */
  defaultTruieId?: string;
  onSuccess?: () => void;
}

/** Format ISO yyyy-MM-dd en local (pas UTC) pour l'input date. */
function todayIsoLocal(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Format HH:mm courant en local. */
function nowHoursMinutes(d: Date = new Date()): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mi}`;
}

const QuickMiseBasForm: React.FC<QuickMiseBasFormProps> = ({
  isOpen,
  onClose,
  defaultTruieId,
  onSuccess,
}) => {
  const { truies, bandes, refreshData } = useFarm();

  // Truies éligibles pour saisir MB : maternité, pleine, surveillance, flushing
  // (exclut VIDE / CHALEUR / REFORME / INCONNU qui n'ont pas de raison de
  // mettre bas maintenant, mais le porcher peut toujours forcer via Notes).
  const truiesEligibles = useMemo<Truie[]>(() => {
    return truies.filter(t => {
      const c = normaliseStatut(t.statut);
      return c === 'MATERNITE' || c === 'PLEINE' || c === 'SURVEILLANCE';
    });
  }, [truies]);

  const [truieId, setTruieId] = useState<string>(defaultTruieId ?? '');
  const [dateIso, setDateIso] = useState<string>(todayIsoLocal());
  const [heure, setHeure] = useState<string>(nowHoursMinutes());
  const [nesVivants, setNesVivants] = useState<string>('');
  const [mortsNes, setMortsNes] = useState<string>('0');
  const [nesTotaux, setNesTotaux] = useState<string>('');
  const [nesTotauxEditedManually, setNesTotauxEditedManually] = useState(false);
  const [poidsMoyen, setPoidsMoyen] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<MiseBasValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: '',
  });

  // Ref timer fermeture auto (success)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-calcul nés totaux tant que l'utilisateur n'a pas saisi manuellement
  useEffect(() => {
    if (nesTotauxEditedManually) return;
    const v = parseInt(nesVivants, 10);
    const m = parseInt(mortsNes, 10);
    if (Number.isFinite(v) && Number.isFinite(m)) {
      setNesTotaux(String(v + m));
    } else if (Number.isFinite(v)) {
      setNesTotaux(String(v));
    }
  }, [nesVivants, mortsNes, nesTotauxEditedManually]);

  // ID portée auto-suggéré (dépend de la truie et des bandes courantes)
  const suggestedIdPortee = useMemo(() => {
    if (!truieId) return '';
    return suggestIdPortee(truieId, bandes);
  }, [truieId, bandes]);

  const [idPortee, setIdPortee] = useState<string>(suggestedIdPortee);
  const [idPorteeEditedManually, setIdPorteeEditedManually] = useState(false);

  // Resync ID portée si suggestion change et pas d'édition manuelle
  useEffect(() => {
    if (idPorteeEditedManually) return;
    setIdPortee(suggestedIdPortee);
  }, [suggestedIdPortee, idPorteeEditedManually]);

  // Reset à l'ouverture
  useEffect(() => {
    if (!isOpen) return;
    setTruieId(defaultTruieId ?? '');
    setDateIso(todayIsoLocal());
    setHeure(nowHoursMinutes());
    setNesVivants('');
    setMortsNes('0');
    setNesTotaux('');
    setNesTotauxEditedManually(false);
    setPoidsMoyen('');
    setNotes('');
    setIdPorteeEditedManually(false);
    setErrors({});
    setSuccess(false);
    setSaving(false);
  }, [isOpen, defaultTruieId]);

  // Cleanup timer au unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    if (saving) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    onClose();
  }, [onClose, saving]);

  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLSelectElement>(
    isOpen && !success,
  ) as unknown as React.RefObject<HTMLSelectElement>;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const draft: MiseBasDraft = {
      truieId,
      idPortee,
      dateIso,
      heure,
      nesVivants,
      mortsNes,
      nesTotaux,
      poidsMoyen,
      notes,
    };
    const result = validateMiseBas(draft);
    if (!result.ok || !result.normalized) {
      setErrors(result.errors);
      return;
    }
    setErrors({});

    const truie = truies.find(t => t.id === truieId);
    const boucleMere = truie?.boucle ?? '';

    setSaving(true);
    try {
      const { online } = await submitMiseBas(
        result.normalized,
        {
          idPortee,
          truieId,
          boucleMere,
          notes: heure ? `MB ${heure} · ${notes}`.trim() : notes,
        },
        {
          appendRow: (sheet, values) => enqueueAppendRow(sheet, values),
          updateRow: (sheet, idHeader, idValue, patch) =>
            enqueueUpdateRow(sheet, idHeader, idValue, patch),
          isOnline: () => typeof navigator !== 'undefined' && navigator.onLine,
        },
      );

      setSuccess(true);
      setToast({
        show: true,
        message: online
          ? `Mise-bas enregistrée · ${idPortee}`
          : `Mise-bas en file · sync auto`,
      });

      try {
        await refreshData();
      } catch {
        /* noop */
      }

      if (onSuccess) onSuccess();

      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[QuickMiseBasForm] enregistrement local échoué:', err);
      setToast({
        show: true,
        message:
          err instanceof Error
            ? `Erreur : ${err.message}`
            : 'Erreur enregistrement local',
      });
    } finally {
      setSaving(false);
    }
  };

  const displayTruie = (t: Truie): string => {
    const parts = [t.displayId];
    if (t.boucle) parts.push(`B.${t.boucle}`);
    if (t.nom) parts.push(t.nom);
    return parts.join(' · ');
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title="Saisir mise-bas"
        height="full"
      >
        {success ? (
          <div
            className="flex flex-col items-center justify-center py-20 animate-scale-in"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2
              size={64}
              className="text-accent mb-4"
              aria-hidden="true"
              strokeWidth={1.5}
            />
            <p className="agritech-heading text-[18px] uppercase tracking-wide">
              Portée créée
            </p>
            <p className="mt-2 font-mono text-[12px] uppercase tracking-wide text-text-2 tabular-nums">
              {idPortee}
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
            noValidate
            aria-label="Saisie d'une mise-bas"
          >
            {/* Intro */}
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
                <Baby size={18} aria-hidden="true" />
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wide text-text-1">
                  Nouvelle portée née sous la mère
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wide text-text-2 mt-0.5">
                  La truie passera automatiquement en Maternité
                </p>
              </div>
            </div>

            {/* Truie */}
            <div className="space-y-1.5">
              <label
                htmlFor="mb-truie"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Truie mère <span className="text-red normal-case">· obligatoire</span>
              </label>
              {truiesEligibles.length > 0 ? (
                <div
                  className={[
                    'w-full h-12 rounded-md',
                    'bg-bg-0 border text-text-0',
                    'font-mono text-[12px] uppercase tracking-wide tabular-nums',
                    'transition-colors duration-[160ms]',
                    'focus-within:border-accent focus-within:ring-1 focus-within:ring-accent',
                    errors.truieId ? 'border-red' : 'border-border',
                  ].join(' ')}
                >
                  <IonSelect
                    id="mb-truie"
                    ref={firstFieldRef}
                    aria-label="Sélectionner la truie mère"
                    aria-required="true"
                    aria-invalid={!!errors.truieId}
                    aria-describedby={errors.truieId ? 'mb-truie-error' : undefined}
                    className="agritech-select"
                    interface="popover"
                    placeholder="— Choisir une truie —"
                    value={truieId || undefined}
                    disabled={saving}
                    onIonChange={e => {
                      const v = (e.detail.value as string | null | undefined) ?? '';
                      setTruieId(v);
                    }}
                    style={{
                      width: '100%',
                      minHeight: '3rem',
                      paddingInlineStart: '0.75rem',
                      paddingInlineEnd: '0.75rem',
                      ['--padding-start' as string]: '0',
                      ['--padding-end' as string]: '0',
                    }}
                  >
                    {truiesEligibles.map(t => (
                      <IonSelectOption key={t.id} value={t.id}>
                        {displayTruie(t)}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </div>
              ) : (
                <p className="font-mono text-[11px] uppercase tracking-wide text-text-2">
                  Aucune truie éligible (pleine / maternité)
                </p>
              )}
              {errors.truieId ? (
                <p
                  id="mb-truie-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.truieId}
                </p>
              ) : null}
            </div>

            {/* ID portée (auto-suggéré, éditable) */}
            <div className="space-y-1.5">
              <label
                htmlFor="mb-id-portee"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                ID portée <span className="text-text-2 normal-case">· auto-suggéré</span>
              </label>
              <input
                id="mb-id-portee"
                type="text"
                maxLength={20}
                autoCapitalize="characters"
                aria-label="Identifiant de la portée (auto-suggéré)"
                aria-required="true"
                aria-invalid={!!errors.idPortee}
                aria-describedby={
                  errors.idPortee ? 'mb-id-portee-error' : 'mb-id-portee-hint'
                }
                className={[
                  'w-full h-12 rounded-md px-3',
                  'bg-bg-0 border text-text-0 placeholder:text-text-2',
                  'font-mono text-[14px] uppercase tabular-nums',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.idPortee ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
                placeholder="26-T7-01"
                value={idPortee}
                onChange={e => {
                  setIdPortee(e.target.value);
                  setIdPorteeEditedManually(true);
                }}
                disabled={saving || !truieId}
                autoComplete="off"
              />
              {errors.idPortee ? (
                <p
                  id="mb-id-portee-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.idPortee}
                </p>
              ) : (
                <p
                  id="mb-id-portee-hint"
                  className="font-mono text-[10px] text-text-2 tabular-nums"
                >
                  Format YY-T{'{N}'}-SEQ (ex: 26-T7-01)
                </p>
              )}
            </div>

            {/* Date + heure */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="mb-date"
                  className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
                >
                  Date MB
                </label>
                <input
                  id="mb-date"
                  type="date"
                  aria-label="Date de mise-bas"
                  className="w-full h-12 rounded-md px-3 bg-bg-0 border border-border text-text-0 font-mono text-[13px] tabular-nums outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  value={dateIso}
                  onChange={e => setDateIso(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="mb-heure"
                  className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
                >
                  Heure
                </label>
                <input
                  id="mb-heure"
                  type="time"
                  aria-label="Heure de mise-bas"
                  className="w-full h-12 rounded-md px-3 bg-bg-0 border border-border text-text-0 font-mono text-[13px] tabular-nums outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  value={heure}
                  onChange={e => setHeure(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Nés vivants / Morts-nés / Nés totaux */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="mb-nv"
                  className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
                >
                  Nés vivants
                </label>
                <input
                  id="mb-nv"
                  type="number"
                  inputMode="numeric"
                  min={MISE_BAS_BOUNDS.minNes}
                  max={MISE_BAS_BOUNDS.maxNes}
                  step={1}
                  aria-label="Nombre de porcelets nés vivants"
                  aria-required="true"
                  aria-invalid={!!errors.nesVivants}
                  aria-describedby={errors.nesVivants ? 'mb-nv-error' : undefined}
                  className={[
                    'w-full h-14 rounded-md px-3 text-center',
                    'bg-bg-0 border text-text-0',
                    'font-mono text-[20px] font-bold tabular-nums',
                    'outline-none transition-colors duration-[160ms]',
                    'focus:border-accent focus:ring-1 focus:ring-accent',
                    errors.nesVivants ? 'border-red' : 'border-border',
                  ].join(' ')}
                  placeholder="0"
                  value={nesVivants}
                  onChange={e => setNesVivants(e.target.value)}
                  disabled={saving}
                />
                {errors.nesVivants ? (
                  <p
                    id="mb-nv-error"
                    role="alert"
                    className="font-mono text-[10px] text-red"
                  >
                    {errors.nesVivants}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="mb-mn"
                  className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
                >
                  Morts-nés
                </label>
                <input
                  id="mb-mn"
                  type="number"
                  inputMode="numeric"
                  min={MISE_BAS_BOUNDS.minNes}
                  max={MISE_BAS_BOUNDS.maxNes}
                  step={1}
                  aria-label="Nombre de porcelets morts-nés"
                  aria-invalid={!!errors.mortsNes}
                  aria-describedby={errors.mortsNes ? 'mb-mn-error' : undefined}
                  className={[
                    'w-full h-14 rounded-md px-3 text-center',
                    'bg-bg-0 border text-text-0',
                    'font-mono text-[20px] font-bold tabular-nums',
                    'outline-none transition-colors duration-[160ms]',
                    'focus:border-accent focus:ring-1 focus:ring-accent',
                    errors.mortsNes ? 'border-red' : 'border-border',
                  ].join(' ')}
                  placeholder="0"
                  value={mortsNes}
                  onChange={e => setMortsNes(e.target.value)}
                  disabled={saving}
                />
                {errors.mortsNes ? (
                  <p
                    id="mb-mn-error"
                    role="alert"
                    className="font-mono text-[10px] text-red"
                  >
                    {errors.mortsNes}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="mb-nt"
                  className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
                >
                  Nés totaux
                </label>
                <input
                  id="mb-nt"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MISE_BAS_BOUNDS.maxNesTotaux}
                  step={1}
                  aria-label="Nombre total de porcelets nés (vivants + morts-nés)"
                  aria-invalid={!!errors.nesTotaux}
                  aria-describedby={
                    errors.nesTotaux ? 'mb-nt-error' : 'mb-nt-hint'
                  }
                  className={[
                    'w-full h-14 rounded-md px-3 text-center',
                    'bg-bg-0 border text-text-0',
                    'font-mono text-[20px] font-bold tabular-nums',
                    'outline-none transition-colors duration-[160ms]',
                    'focus:border-accent focus:ring-1 focus:ring-accent',
                    errors.nesTotaux ? 'border-red' : 'border-border',
                  ].join(' ')}
                  placeholder="0"
                  value={nesTotaux}
                  onChange={e => {
                    setNesTotaux(e.target.value);
                    setNesTotauxEditedManually(true);
                  }}
                  disabled={saving}
                />
                {errors.nesTotaux ? (
                  <p
                    id="mb-nt-error"
                    role="alert"
                    className="font-mono text-[10px] text-red"
                  >
                    {errors.nesTotaux}
                  </p>
                ) : (
                  <p
                    id="mb-nt-hint"
                    className="font-mono text-[9px] text-text-2 tabular-nums"
                  >
                    = vivants + morts-nés
                  </p>
                )}
              </div>
            </div>

            {errors.coherence ? (
              <p role="alert" className="font-mono text-[11px] text-red">
                {errors.coherence}
              </p>
            ) : null}

            {/* Poids moyen */}
            <div className="space-y-1.5">
              <label
                htmlFor="mb-poids"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Poids moyen porcelet (kg){' '}
                <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <input
                id="mb-poids"
                type="number"
                inputMode="decimal"
                min={MISE_BAS_BOUNDS.minPoids}
                max={MISE_BAS_BOUNDS.maxPoids}
                step={0.1}
                aria-label="Poids moyen d'un porcelet en kg (optionnel)"
                aria-invalid={!!errors.poidsMoyen}
                aria-describedby={
                  errors.poidsMoyen ? 'mb-poids-error' : 'mb-poids-hint'
                }
                className={[
                  'w-full h-12 rounded-md px-3 text-center',
                  'bg-bg-0 border text-text-0 placeholder:text-text-2',
                  'font-mono text-[16px] tabular-nums',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.poidsMoyen ? 'border-red' : 'border-border hover:border-text-2',
                ].join(' ')}
                placeholder="1.4"
                value={poidsMoyen}
                onChange={e => setPoidsMoyen(e.target.value)}
                disabled={saving}
              />
              {errors.poidsMoyen ? (
                <p
                  id="mb-poids-error"
                  role="alert"
                  className="font-mono text-[11px] text-red"
                >
                  {errors.poidsMoyen}
                </p>
              ) : (
                <p
                  id="mb-poids-hint"
                  className="font-mono text-[10px] text-text-2 tabular-nums"
                >
                  {MISE_BAS_BOUNDS.minPoids} à {MISE_BAS_BOUNDS.maxPoids} kg · stocké en Notes
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label
                htmlFor="mb-notes"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Notes <span className="text-text-2 normal-case">· optionnel</span>
              </label>
              <textarea
                id="mb-notes"
                aria-label="Notes de mise-bas (optionnel)"
                aria-invalid={!!errors.notes}
                aria-describedby="mb-notes-hint"
                className={[
                  'w-full rounded-md px-3 py-3',
                  'bg-bg-0 border text-text-0 placeholder:text-text-2',
                  'font-mono text-[12px]',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  'min-h-[88px] resize-y',
                  errors.notes ? 'border-red' : 'border-border',
                ].join(' ')}
                placeholder="Ex: MB sans assistance, portée homogène"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={saving}
                maxLength={MISE_BAS_BOUNDS.maxNotes}
              />
              <p
                id="mb-notes-hint"
                className="font-mono text-[10px] text-text-2 tabular-nums"
              >
                {notes.length}/{MISE_BAS_BOUNDS.maxNotes}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                aria-label="Annuler et fermer"
                className={[
                  'pressable flex-1 h-14 rounded-md',
                  'inline-flex items-center justify-center gap-2',
                  'bg-bg-1 border border-border text-text-1',
                  'font-mono text-[12px] font-bold uppercase tracking-wide',
                  'transition-colors duration-[160ms] hover:border-text-2',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                  saving ? 'opacity-40 cursor-not-allowed' : '',
                ].join(' ')}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving || !truieId || truiesEligibles.length === 0}
                aria-label="Enregistrer la mise-bas"
                aria-busy={saving}
                className={[
                  'pressable flex-[2] h-14 rounded-md',
                  'inline-flex items-center justify-center gap-2',
                  'bg-accent text-bg-0',
                  'font-mono text-[13px] font-bold uppercase tracking-wide',
                  'transition-colors duration-[160ms]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                  (saving || !truieId || truiesEligibles.length === 0)
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:brightness-110',
                ].join(' ')}
              >
                {saving ? (
                  <span className="animate-pulse">Enregistrement…</span>
                ) : (
                  <>
                    <Check size={16} aria-hidden="true" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </BottomSheet>

      <IonToast
        isOpen={toast.show}
        message={toast.message}
        duration={2400}
        onDidDismiss={() => setToast({ show: false, message: '' })}
        position="bottom"
      />
    </>
  );
};

export default QuickMiseBasForm;
