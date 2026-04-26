import React, { useMemo, useRef, useState } from 'react';
import { IonToast, IonSelect, IonSelectOption } from '@ionic/react';
import { Skull, Check, CheckCircle2, AlertTriangle, TrendingDown } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { useFarm } from '../../context/FarmContext';
import { filterRealPortees } from '../../services/bandesAggregator';
import { enqueueAppendRow, enqueueUpdateRow } from '../../services/offlineQueue';
import type { BandePorcelets } from '../../types/farm';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import { FARM_CONFIG } from '../../config/farm';

const CAUSE_OPTIONS = [
  { value: 'ECRASEMENT', label: 'Écrasement' },
  { value: 'MALADIE', label: 'Maladie / Sanitaire' },
  { value: 'INCONNUE', label: 'Cause Inconnue' },
  { value: 'AUTRE', label: 'Autre' },
];

/**
 * QuickMortalityForm — Déclaration rapide d'une mortalité porcelet post-sevrage.
 */
export interface QuickMortalityFormProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBandeId?: string;
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
  const { bandes, refreshData } = useFarm();

  const bandesDispo = useMemo(() => filterRealPortees(bandes), [bandes]);

  const [selectedBandeId, setSelectedBandeId] = useState<string>(defaultBandeId ?? '');
  const [nbMorts, setNbMorts] = useState<number>(MIN_DEATHS);
  const [cause, setCause] = useState<string>('INCONNUE');
  const [observation, setObservation] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [impactFCFA, setImpactFCFA] = useState<number>(0);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: '',
  });
  const [error, setError] = useState<string>('');

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Render-time sync
  const [lastDefault, setLastDefault] = useState<{
    isOpen: boolean;
    defaultBandeId: string | undefined;
  }>({ isOpen, defaultBandeId });
  if (
    lastDefault.isOpen !== isOpen ||
    lastDefault.defaultBandeId !== defaultBandeId
  ) {
    setLastDefault({ isOpen, defaultBandeId });
    if (isOpen && defaultBandeId) {
      setSelectedBandeId(defaultBandeId);
    }
  }

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

  useEscapeKey(isOpen && !saving, handleClose);
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

    const bande = bandesDispo.find(
      b => b.id === selectedBandeId || b.idPortee === selectedBandeId,
    );
    if (!bande) {
      setError('Bande introuvable');
      return;
    }

    setSaving(true);
    try {
      // Calcul impact financier
      const poidsEstime = 25;
      const perteParTete = poidsEstime * FARM_CONFIG.FINANCE_CONFIG.PRIX_VENTE_PORC_KG;
      const totalImpact = nb * perteParTete;
      setImpactFCFA(totalImpact);

      const { online } = await submitMortality(bande, nb, `[CAUSE: ${cause}] ${observation}`, {
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

      try {
        await refreshData(true);
      } catch {
        /* noop */
      }

      if (onSuccess) onSuccess();

      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSuccess(false);
        setNbMorts(MIN_DEATHS);
        setObservation('');
        onClose();
      }, 2000);
    } catch (e) {
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
          <div
            className="flex flex-col items-center justify-center py-20 animate-scale-in"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2
              size={64}
              className="text-coral mb-4"
              aria-hidden="true"
              strokeWidth={1.5}
            />
            <p className="agritech-heading text-[18px] uppercase tracking-wide">
              Mortalité enregistrée
            </p>
            <p className="mt-2 font-mono text-[12px] uppercase tracking-wide text-text-2 tabular-nums">
              {selectedBandeId} · {nbMorts} mort{nbMorts > 1 ? 's' : ''}
            </p>
            <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
               <div className="text-[10px] uppercase font-mono text-red-600 mb-1">Impact sur marge projetée</div>
               <div className="text-xl font-bold text-red-700">-{impactFCFA.toLocaleString('fr-FR')} FCFA</div>
            </div>
          </div>
        ) : (
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
                    aria-label="Sélectionner la bande concernée"
                    ref={firstFieldRef}
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
                    }}
                  >
                    {bandesDispo.map(b => (
                      <IonSelectOption key={b.id} value={b.id}>
                        {idBandeDisplay(b)}
                        {b.truie ? ` · ${b.truie}` : ''}
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

            <div className="space-y-2">
              <label
                htmlFor="mortality-cause"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Cause suspectée
              </label>
              <div className="w-full h-10 rounded-md bg-bg-0 border border-border focus-within:border-accent transition-colors">
                <IonSelect
                  id="mortality-cause"
                  className="agritech-select"
                  interface="popover"
                  value={cause}
                  onIonChange={e => setCause(e.detail.value)}
                  style={{
                    width: '100%',
                    minHeight: '2.5rem',
                    paddingInlineStart: '0.75rem',
                    fontFamily: 'var(--font-mono-jb)',
                    fontSize: '12px'
                  }}
                >
                  {CAUSE_OPTIONS.map(opt => (
                    <IonSelectOption key={opt.value} value={opt.value}>
                      {opt.label}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="mortality-count"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Nombre de morts (max {MAX_DEATHS})
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Diminuer le nombre de morts"
                  onClick={() => setNbMorts(n => clampDeaths(n - 1))}
                  disabled={saving || nbMorts <= MIN_DEATHS}
                  className="pressable h-10 w-10 rounded-md border bg-bg-0 text-text-1 border-border"
                >
                  −
                </button>
                <input
                  id="mortality-count"
                  aria-label="Nombre de porcelets morts"
                  aria-describedby="mortality-count-hint"
                  type="number"
                  inputMode="numeric"
                  className="flex-1 h-10 rounded-md px-3 text-center bg-bg-0 border text-text-0 font-mono text-[16px] font-bold tabular-nums"
                  value={nbMorts}
                  onChange={e => setNbMorts(clampDeaths(Number(e.target.value)))}
                  disabled={saving}
                />
                <button
                  type="button"
                  aria-label="Augmenter le nombre de morts"
                  onClick={() => setNbMorts(n => clampDeaths(n + 1))}
                  disabled={saving || nbMorts >= MAX_DEATHS}
                  className="pressable h-10 w-10 rounded-md border bg-bg-0 text-text-1 border-border"
                >
                  +
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="mortality-obs"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Observation (optionnel)
              </label>
              <span id="mortality-count-hint" className="sr-only">Entre 1 et le nombre total de vivants dans la bande</span>
              <textarea
                id="mortality-obs"
                aria-label="Observation sur la mortalité"
                aria-describedby="mortality-obs-hint"
                className="w-full rounded-md px-3 py-3 bg-bg-0 border border-border text-text-0 placeholder:text-text-2 font-mono text-[12px] min-h-[88px] resize-y"
                placeholder="Ex : mortalité écrasement loge 3"
                value={observation}
                onChange={e => setObservation(e.target.value)}
                disabled={saving}
                maxLength={240}
              />
              <span id="mortality-obs-hint" className="sr-only">Optionnel — description de la cause de mortalité</span>
            </div>

            {error && (
              <p id="mortality-error" className="font-mono text-[11px] text-red" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              aria-label="Enregistrer la mortalité"
              aria-busy={saving}
              onClick={handleSave}
              disabled={saving || !selectedBandeId || bandesDispo.length === 0}
              className="pressable w-full h-[52px] rounded-md bg-coral text-bg-0 font-mono text-[12px] font-bold uppercase tracking-wide disabled:opacity-40"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
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
