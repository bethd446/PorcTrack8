import React, { useMemo, useRef, useState } from 'react';
import { IonToast, IonSelect, IonSelectOption } from '@ionic/react';
import { Skull, Check, CheckCircle2 } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { useFarm } from '../../context/FarmContext';
import { filterRealPortees } from '../../services/bandesAggregator';
import { enqueueAppendRow, enqueueUpdateRow } from '../../services/offlineQueue';
import type { BandePorcelets } from '../../types/farm';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';

/**
 * QuickMortalityForm — Déclaration rapide d'une mortalité porcelet post-sevrage.
 *
 * Contexte métier :
 *   Les divergences entre Sheets et terrain (ex : 106 sevrés vs 102 comptés) viennent
 *   de mortalités non enregistrées. Le porcher doit pouvoir déclarer en 2 taps le
 *   nombre de morts par bande pour que les compteurs se recollent.
 *
 * Pattern :
 *   - <BottomSheet> wrapper (cohérent avec QuickSaillieForm / QuickHealthForm)
 *   - Sélecteur bande (dropdown des bandes actives filtrées via filterRealPortees)
 *   - Input nombre de morts (min=1, max=20, défaut=1)
 *   - Textarea observation (optionnel)
 *   - Au submit :
 *       1) append JOURNAL_SANTE (audit trail)
 *       2) update PORCELETS_BANDES_DETAIL avec valeurs absolues (idempotent)
 *
 * Idempotence :
 *   On écrit des valeurs absolues (VIVANTS = currentVivants - nb, MORTS = currentMorts + nb)
 *   calculées au moment du submit. Si la queue offline rejoue le même job, la patch
 *   réécrit les mêmes valeurs → pas de double soustraction.
 */

export interface QuickMortalityFormProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pré-sélectionne une bande (ex. depuis BandeDetailView). Optionnel. */
  defaultBandeId?: string;
  /** Callback post-submit réussi (ex. refresh parent). */
  onSuccess?: () => void;
}

const MIN_DEATHS = 1;
const MAX_DEATHS = 20;

/** Calcule les nouvelles valeurs absolues pour la patch PORCELETS_BANDES_DETAIL. */
export function computeMortalityPatch(
  bande: Pick<BandePorcelets, 'vivants' | 'morts' | 'nv'>,
  nbMorts: number,
): { VIVANTS: number; MORTS: number } {
  const currentVivants = bande.vivants ?? 0;
  const currentMorts = bande.morts ?? Math.max(0, (bande.nv ?? 0) - currentVivants);
  return {
    VIVANTS: Math.max(0, currentVivants - nbMorts),
    MORTS: currentMorts + nbMorts,
  };
}

/** Normalise un input numérique (clamp min/max ; NaN -> MIN_DEATHS). */
export function clampDeaths(raw: number): number {
  if (!Number.isFinite(raw)) return MIN_DEATHS;
  return Math.max(MIN_DEATHS, Math.min(MAX_DEATHS, Math.floor(raw)));
}

export const MORTALITY_BOUNDS = { min: MIN_DEATHS, max: MAX_DEATHS } as const;

/** Construit la ligne JOURNAL_SANTE pour une mortalité. */
export function buildMortalityJournalRow(params: {
  bandeId: string;
  nbMorts: number;
  observation: string;
  auteur: string;
  now?: Date;
}): (string | number | boolean | null)[] {
  const { bandeId, nbMorts, observation, auteur, now = new Date() } = params;
  return [
    now.toISOString(),
    'BANDE',
    bandeId,
    'MORTALITE',
    `${nbMorts} mort${nbMorts > 1 ? 's' : ''}`,
    observation.trim(),
    auteur,
  ];
}

/**
 * Orchestration du submit : append JOURNAL_SANTE + update PORCELETS_BANDES_DETAIL.
 * Séparé du composant React pour permettre des tests unitaires sans DOM.
 * Retourne `online: boolean` pour aider l'UI à composer le toast.
 */
export async function submitMortality(
  bande: Pick<BandePorcelets, 'id' | 'vivants' | 'morts' | 'nv'>,
  nbMortsRaw: number,
  observation: string,
  deps: {
    appendRow: (sheet: string, values: (string | number | boolean | null)[]) => Promise<void>;
    updateRow: (
      sheet: string,
      idHeader: string,
      idValue: string,
      patch: Record<string, string | number | boolean | null>,
    ) => Promise<void>;
    getAuteur: () => string;
    isOnline: () => boolean;
    now?: () => Date;
  },
): Promise<{ online: boolean; nbMorts: number; patch: { VIVANTS: number; MORTS: number } }> {
  const nbMorts = clampDeaths(nbMortsRaw);
  const now = deps.now ? deps.now() : new Date();

  await deps.appendRow(
    'JOURNAL_SANTE',
    buildMortalityJournalRow({
      bandeId: bande.id,
      nbMorts,
      observation,
      auteur: deps.getAuteur(),
      now,
    }),
  );

  const patch = computeMortalityPatch(bande, nbMorts);
  await deps.updateRow('PORCELETS_BANDES_DETAIL', 'ID', bande.id, patch);

  return { online: deps.isOnline(), nbMorts, patch };
}

const QuickMortalityForm: React.FC<QuickMortalityFormProps> = ({
  isOpen,
  onClose,
  defaultBandeId,
  onSuccess,
}) => {
  const { bandes } = useFarm();

  const bandesDispo = useMemo(() => filterRealPortees(bandes), [bandes]);

  const [selectedBandeId, setSelectedBandeId] = useState<string>(defaultBandeId ?? '');
  const [nbMorts, setNbMorts] = useState<number>(MIN_DEATHS);
  const [observation, setObservation] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: '',
  });
  const [error, setError] = useState<string>('');

  /**
   * Ref du timer de fermeture auto (success state). Permet d'annuler le
   * setTimeout si l'utilisateur ferme via backdrop/Escape avant les 1500ms,
   * évitant un double appel à onClose().
   */
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resync default si prop change (ouverture depuis une bande précise)
  React.useEffect(() => {
    if (isOpen && defaultBandeId) {
      setSelectedBandeId(defaultBandeId);
    }
  }, [isOpen, defaultBandeId]);

  // Cleanup du timer à l'unmount (évite un onClose post-unmount)
  React.useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  const handleClose = (): void => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setSelectedBandeId(defaultBandeId ?? '');
    setNbMorts(MIN_DEATHS);
    setObservation('');
    setSuccess(false);
    setError('');
    onClose();
  };

  // ── A11y : Esc ferme la sheet + focus auto sur le 1er input ────────────
  useEscapeKey(isOpen && !saving, handleClose);
  // Note: l'élément réel est un <IonSelect> (web component). On déclare le
  // type comme HTMLSelectElement pour réutiliser le hook générique tout en
  // restant compat avec le ref passé au web component (qui l'ignore si pas
  // de focus() natif — l'a11y dégrade gracefully).
  const firstFieldRef = useFocusFirstInput<HTMLSelectElement>(
    isOpen && !success,
  ) as unknown as React.RefObject<HTMLSelectElement>;

  const handleSave = async (): Promise<void> => {
    setError('');
    if (!selectedBandeId) {
      setError('Sélectionne une bande');
      return;
    }
    const nb = clampDeaths(nbMorts);
    if (nb < MIN_DEATHS) {
      setError('Nombre de morts invalide');
      return;
    }

    const bande = bandesDispo.find(
      b => b.id === selectedBandeId || b.idPortee === selectedBandeId,
    );
    if (!bande) {
      // En dev, aide à diagnostiquer les cas où defaultBandeId ne correspond
      // à aucune bande filtrée (ex: bande RECAP exclue par filterRealPortees).
      if (import.meta.env?.DEV) {
        // eslint-disable-next-line no-console
        console.warn(
          '[QuickMortalityForm] Bande introuvable dans bandesDispo',
          { selectedBandeId, dispoIds: bandesDispo.map(b => b.id) },
        );
      }
      setError('Bande introuvable');
      return;
    }

    setSaving(true);
    try {
      const { online } = await submitMortality(bande, nb, observation, {
        appendRow: (sheet, values) => enqueueAppendRow(sheet, values),
        updateRow: (sheet, idHeader, idValue, patch) =>
          enqueueUpdateRow(sheet, idHeader, idValue, patch),
        getAuteur: () => localStorage.getItem('user_name') || 'Anonyme',
        isOnline: () => typeof navigator !== 'undefined' && navigator.onLine,
      });

      setSuccess(true);
      setToast({
        show: true,
        message: online
          ? `${nb} mortalité${nb > 1 ? 's' : ''} enregistrée${nb > 1 ? 's' : ''}`
          : `${nb} mortalité${nb > 1 ? 's' : ''} en file · sync auto`,
      });

      if (onSuccess) onSuccess();

      // Fermeture différée stockée dans un ref pour pouvoir être annulée
      // si l'utilisateur ferme manuellement avant la fin du délai.
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSuccess(false);
        setNbMorts(MIN_DEATHS);
        setObservation('');
        onClose();
      }, 1500);
    } catch (e) {
      // Log explicite en dev pour debug sur device (Chrome devtools distant).
      // eslint-disable-next-line no-console
      console.error('[QuickMortalityForm] enregistrement local échoué:', e);
      setError(
        'Erreur enregistrement local · réessaie ou redémarre l\'application',
      );
    } finally {
      setSaving(false);
    }
  };

  const idBandeDisplay = (b: BandePorcelets): string => b.idPortee || b.id;

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title="Déclarer mortalité porcelet"
        height="full"
      >
        {success ? (
          /* ── Success state ───────────────────────────────────────────── */
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
              Mortalité enregistrée
            </p>
            <p className="mt-2 font-mono text-[12px] uppercase tracking-wide text-text-2 tabular-nums">
              {selectedBandeId} · {nbMorts} mort{nbMorts > 1 ? 's' : ''}
            </p>
          </div>
        ) : (
          /* ── Form ────────────────────────────────────────────────────── */
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-coral">
                <Skull size={18} aria-hidden="true" />
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wide text-text-1">
                  Renseigne la bande concernée et le nombre
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wide text-text-2 mt-0.5">
                  Tu peux ajouter un détail (loge, cause…)
                </p>
              </div>
            </div>

            {/* ── Bande selection ────────────────────────────────────── */}
            <div className="space-y-2">
              <label
                htmlFor="mortality-bande"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Bande
              </label>
              {bandesDispo.length > 0 ? (
                <div
                  className={[
                    'w-full h-10 rounded-md',
                    'bg-bg-0 border text-text-0',
                    'font-mono text-[12px] uppercase tracking-wide tabular-nums',
                    'transition-colors duration-[160ms]',
                    'focus-within:border-accent focus-within:ring-1 focus-within:ring-accent',
                    error && !selectedBandeId ? 'border-coral' : 'border-border',
                  ].join(' ')}
                >
                  <IonSelect
                    id="mortality-bande"
                    ref={firstFieldRef}
                    aria-label="Sélectionner la bande concernée par la mortalité"
                    aria-required="true"
                    aria-invalid={!!(error && !selectedBandeId)}
                    aria-describedby={
                      error && !selectedBandeId ? 'mortality-error' : undefined
                    }
                    className="agritech-select"
                    interface="popover"
                    placeholder="— Choisir une bande —"
                    value={selectedBandeId || undefined}
                    disabled={saving}
                    onIonChange={e => {
                      const v = (e.detail.value as string | null | undefined) ?? '';
                      setSelectedBandeId(v);
                    }}
                    style={{
                      width: '100%',
                      minHeight: '2.5rem',
                      paddingInlineStart: '0.75rem',
                      paddingInlineEnd: '0.75rem',
                      ['--padding-start' as string]: '0',
                      ['--padding-end' as string]: '0',
                    }}
                  >
                    {bandesDispo.map(b => (
                      <IonSelectOption key={b.id} value={b.id}>
                        {idBandeDisplay(b)}
                        {b.truie ? ` · ${b.truie}` : ''}
                        {b.statut ? ` · ${b.statut}` : ''}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </div>
              ) : (
                <p className="font-mono text-[11px] uppercase tracking-wide text-text-2">
                  Aucune bande active
                </p>
              )}
            </div>

            {/* ── Nombre de morts ────────────────────────────────────── */}
            <div className="space-y-2">
              <label
                htmlFor="mortality-count"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Nombre de morts (max {MAX_DEATHS})
              </label>
              <p
                id="mortality-count-hint"
                className="sr-only"
              >
                Utilise les boutons plus et moins, ou saisis une valeur entre {MIN_DEATHS} et {MAX_DEATHS}.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Diminuer le nombre de morts"
                  onClick={() => setNbMorts(n => clampDeaths(n - 1))}
                  disabled={saving || nbMorts <= MIN_DEATHS}
                  className={[
                    'pressable h-10 w-10 rounded-md border',
                    'font-mono text-[16px] font-bold',
                    'bg-bg-0 text-text-1 border-border',
                    nbMorts <= MIN_DEATHS ? 'opacity-40 cursor-not-allowed' : 'hover:border-text-2',
                  ].join(' ')}
                >
                  −
                </button>
                <input
                  id="mortality-count"
                  type="number"
                  inputMode="numeric"
                  min={MIN_DEATHS}
                  max={MAX_DEATHS}
                  step={1}
                  aria-label="Nombre de porcelets morts à déclarer"
                  aria-describedby="mortality-count-hint"
                  aria-valuemin={MIN_DEATHS}
                  aria-valuemax={MAX_DEATHS}
                  aria-valuenow={nbMorts}
                  className={[
                    'flex-1 h-10 rounded-md px-3 text-center',
                    'bg-bg-0 border text-text-0',
                    'font-mono text-[16px] font-bold tabular-nums',
                    'outline-none transition-colors duration-[160ms]',
                    'focus:border-accent focus:ring-1 focus:ring-accent',
                    'border-border',
                  ].join(' ')}
                  value={nbMorts}
                  onChange={e => setNbMorts(clampDeaths(Number(e.target.value)))}
                  disabled={saving}
                />
                <button
                  type="button"
                  aria-label="Augmenter le nombre de morts"
                  onClick={() => setNbMorts(n => clampDeaths(n + 1))}
                  disabled={saving || nbMorts >= MAX_DEATHS}
                  className={[
                    'pressable h-10 w-10 rounded-md border',
                    'font-mono text-[16px] font-bold',
                    'bg-bg-0 text-text-1 border-border',
                    nbMorts >= MAX_DEATHS ? 'opacity-40 cursor-not-allowed' : 'hover:border-text-2',
                  ].join(' ')}
                >
                  +
                </button>
              </div>
            </div>

            {/* ── Observation ────────────────────────────────────────── */}
            <div className="space-y-2">
              <label
                htmlFor="mortality-obs"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Observation (optionnel)
              </label>
              <textarea
                id="mortality-obs"
                aria-label="Observation sur la mortalité (optionnel)"
                aria-describedby="mortality-obs-hint"
                className={[
                  'w-full rounded-md px-3 py-3',
                  'bg-bg-0 border border-border text-text-0 placeholder:text-text-2',
                  'font-mono text-[12px]',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  'min-h-[88px] resize-y',
                ].join(' ')}
                placeholder="Ex : mortalité écrasement loge 3"
                value={observation}
                onChange={e => setObservation(e.target.value)}
                disabled={saving}
                maxLength={240}
              />
              <p
                id="mortality-obs-hint"
                className="font-mono text-[10px] text-text-2 tabular-nums"
              >
                {observation.length}/240 · détail loge, cause, contexte
              </p>
            </div>

            {error && (
              <p
                id="mortality-error"
                role="alert"
                className="font-mono text-[11px] text-coral"
              >
                {error}
              </p>
            )}

            {/* ── Confirm ────────────────────────────────────────────── */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !selectedBandeId || bandesDispo.length === 0}
              aria-label="Enregistrer la mortalité"
              aria-busy={saving}
              aria-describedby={error ? 'mortality-error' : undefined}
              className={[
                'pressable w-full h-[52px] rounded-md',
                'inline-flex items-center justify-center gap-2',
                'bg-coral text-bg-0 font-mono text-[12px] font-bold uppercase tracking-wide',
                'transition-colors duration-[160ms]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-coral focus-visible:outline-offset-2',
                (saving || !selectedBandeId || bandesDispo.length === 0)
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
        )}
      </BottomSheet>

      <IonToast
        isOpen={toast.show}
        message={toast.message}
        duration={2800}
        onDidDismiss={() => setToast({ show: false, message: '' })}
        position="bottom"
      />
    </>
  );
};

export default QuickMortalityForm;
