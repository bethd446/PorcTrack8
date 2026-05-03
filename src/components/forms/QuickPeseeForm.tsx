import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useIonAlert, IonSegment, IonSegmentButton, IonLabel } from '@ionic/react';
import { Search, CheckCircle2, ChevronRight, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFarm } from '../../context/FarmContext';
import { useAuth } from '../../context/AuthContext';
import {
  insertNote,
  updateSowByCode,
  updateBoarByCode,
} from '../../services/supabaseWrites';
import { safeDate } from '../../lib/truieHelpers';
import { BottomSheet, DataRow } from '../agritech';
import type { BandePorcelets, Truie, Verrat } from '../../types/farm';
import { extractPeseesForBande } from '../../services/growthAnalyzer';
import { markPeseeEffectuee } from '../../services/peseePlanifieesService';

type PeseeSubject = BandePorcelets | Truie | Verrat;
import { biologyValidators } from '../../utils/biologyValidators';
import { kvGet } from '../../services/kvStore';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '../ui/form';

/* ═════════════════════════════════════════════════════════════════════════
   QuickPeseeForm · Pesée rapide (Bande, Truie ou Verrat)
   ─────────────────────────────────────────────────────────────────────────
   Flow 3 étapes :
     1. Sélection type + sujet
     2. Saisie poids (+ nb/écart pour les bandes)
     3. Confirmation
   Persist : NOTES_TERRAIN (5-col) + Update poids (si animal individuel)
   Validation : RHF + Zod (peseeSchema)
   ═════════════════════════════════════════════════════════════════════════ */

interface QuickPeseeFormProps {
  isOpen: boolean;
  onClose: () => void;
  /** Si fourni, marque la pesée planifiée comme effectuée au submit final. */
  peseeId?: string;
  /** Sujet pré-sélectionné (saute l'étape 1 si fourni). */
  prefillSubject?: PeseeSubject;
}

type Step = 1 | 2 | 3 | 4;
type SubjectType = 'BANDE' | 'TRUIE' | 'VERRAT';

const peseeSchema = z.object({
  subjectType: z.enum(['BANDE', 'TRUIE', 'VERRAT']),
  nbPeses: z.string().min(1, 'Nombre > 0 requis'),
  poidsMoyen: z.string().min(1, 'Poids > 0 requis'),
  ecartType: z.string(),
  observation: z.string(),
  maxVivants: z.number().optional(),
}).superRefine((data, ctx) => {
  const nb = Number(data.nbPeses);
  if (!Number.isFinite(nb) || nb <= 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['nbPeses'],
      message: 'Nombre > 0 requis',
    });
  } else if (
    data.subjectType === 'BANDE' &&
    data.maxVivants !== undefined &&
    nb > data.maxVivants
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['nbPeses'],
      message: `Max ${data.maxVivants} vivants`,
    });
  }

  const poids = Number((data.poidsMoyen || '').replace(',', '.'));
  if (!Number.isFinite(poids) || poids <= 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['poidsMoyen'],
      message: 'Poids > 0 requis',
    });
  } else if (poids >= 500) {
    ctx.addIssue({
      code: 'custom',
      path: ['poidsMoyen'],
      message: 'Poids trop élevé (> 500kg)',
    });
  }

  const ecartRaw = (data.ecartType || '').trim();
  if (ecartRaw) {
    const ecart = Number(ecartRaw.replace(',', '.'));
    if (!Number.isFinite(ecart) || ecart < 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['ecartType'],
        message: 'Écart-type ≥ 0',
      });
    }
  }
});

type PeseeFormValues = z.infer<typeof peseeSchema>;

const INITIAL_VALUES: PeseeFormValues = {
  subjectType: 'BANDE',
  nbPeses: '',
  poidsMoyen: '',
  ecartType: '',
  observation: '',
  maxVivants: undefined,
};

function parseFrDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parts = value.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  return safeDate(`${y}-${m}-${d}`);
}

function jFrom(frDate: string | undefined): number | null {
  const dt = parseFrDate(frDate);
  if (!dt) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dt.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - dt.getTime()) / 86_400_000);
}

const QuickPeseeForm: React.FC<QuickPeseeFormProps> = ({ isOpen, onClose, peseeId, prefillSubject }) => {
  const { bandes, truies, verrats, notes, refreshData } = useFarm();
  const { user } = useAuth();
  const [presentAlert] = useIonAlert();

  const [step, setStep] = useState<Step>(1);
  const [query, setQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<PeseeSubject | null>(null);
  const [saving, setSaving] = useState(false);
  const [, setSubmitError] = useState<string>('');
  const [pendingValues, setPendingValues] = useState<PeseeFormValues | null>(null);

  const form = useForm<PeseeFormValues>({
    resolver: zodResolver(peseeSchema),
    defaultValues: INITIAL_VALUES,
    mode: 'onSubmit',
  });

  const subjectType = form.watch('subjectType');

  // ── Filtrage des sujets ──────────────────────────────────────────────
  const filteredSubjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (subjectType === 'BANDE') {
      return bandes.filter(b => {
        const isEligible = (b.statut || '').toLowerCase().match(/sous|sevr|croissance|finition|engraissement/);
        if (!isEligible) return false;
        if (!q) return true;
        return [b.idPortee, b.id, b.truie, b.boucleMere].some(v => String(v || '').toLowerCase().includes(q));
      });
    } else if (subjectType === 'TRUIE') {
      return truies.filter(t => {
        if (!q) return true;
        return [t.id, t.displayId, t.boucle, t.nom].some(v => String(v || '').toLowerCase().includes(q));
      });
    } else {
      return verrats.filter(v => {
        if (!q) return true;
        return [v.id, v.displayId, v.boucle, v.nom].some(val => String(val || '').toLowerCase().includes(q));
      });
    }
  }, [subjectType, query, bandes, truies, verrats]);

  // ── Handlers ─────────────────────────────────────────────────────────
  const resetAll = useCallback((): void => {
    setStep(1);
    setQuery('');
    setSelectedSubject(null);
    setSubmitError('');
    setSaving(false);
    setPendingValues(null);
    form.reset(INITIAL_VALUES);
  }, [form]);

  const handleClose = useCallback((): void => {
    resetAll();
    onClose();
  }, [onClose, resetAll]);

  const handleSelect = (s: PeseeSubject): void => {
    setSelectedSubject(s);
    if (subjectType === 'BANDE') {
      const sb = s as BandePorcelets;
      form.setValue('nbPeses', sb.vivants !== undefined ? String(sb.vivants) : '');
      form.setValue('maxVivants', sb.vivants);
    } else {
      form.setValue('nbPeses', '1');
      form.setValue('maxVivants', undefined);
    }
    form.clearErrors();
    setStep(2);
  };

  // Reset maxVivants si subjectType change pendant l'edit
  useEffect(() => {
    if (subjectType !== 'BANDE') {
      form.setValue('maxVivants', undefined);
    }
  }, [subjectType, form]);

  // ── Préfill depuis pesée planifiée ───────────────────────────────────
  useEffect(() => {
    if (!isOpen || !prefillSubject) return;
    setSelectedSubject(prefillSubject);
    const isBande = 'idPortee' in prefillSubject;
    if (isBande) {
      form.setValue('subjectType', 'BANDE');
      const sb = prefillSubject as BandePorcelets;
      form.setValue('nbPeses', sb.vivants !== undefined ? String(sb.vivants) : '');
      form.setValue('maxVivants', sb.vivants);
    } else {
      form.setValue('subjectType', 'TRUIE');
      form.setValue('nbPeses', '1');
    }
    setStep(2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, prefillSubject]);

  const executeSubmit = async (values: PeseeFormValues): Promise<void> => {
    if (!selectedSubject) return;
    setSaving(true);
    setSubmitError('');

    try {
      const nb = Number(values.nbPeses);
      const poids = Number(values.poidsMoyen.replace(',', '.'));
      const ecartRaw = (values.ecartType || '').trim();
      const ecart = ecartRaw ? Number(ecartRaw.replace(',', '.')) : null;
      const obs = (values.observation || '').trim();

      let note = '';
      if (subjectType === 'BANDE') {
        const jMB = jFrom((selectedSubject as BandePorcelets).dateMB);
        const jTag = jMB !== null ? ` · J+${jMB}` : '';
        const ecartTag = ecart !== null ? ` ±${ecart}` : '';
        note = `Pesée ${nb} porcelets · ${poids}kg moy${ecartTag}${jTag}`;
      } else {
        note = `Pesée individuelle · ${poids}kg`;
      }
      if (obs) note += ` · ${obs}`;

      // FIX V23-AUDIT-2 : author_id doit être un UUID (table notes.author_id uuid).
      // Avant : kvGet('user_name') = string littéral → HTTP 400 invalid_uuid.
      // user.id est l'UUID Supabase auth ; null si offline → on omet le champ.
      const authorId = user?.id ?? null;

      await insertNote({
        content: `[${subjectType}:${selectedSubject.id}] ${note}`,
        category: 'PESEE',
        author_id: authorId,
      });

      // Si animal individuel, on met à jour son poids dans la fiche signalétique.
      // Note: la table sows/boars n'a pas de colonne poids dédiée — on stocke
      // la dernière pesée en notes pour audit (le schéma DB ne porte pas ce champ).
      if (subjectType === 'TRUIE') {
        await updateSowByCode(selectedSubject.id, {
          notes: `Dernière pesée : ${poids} kg (${new Date().toISOString().slice(0, 10)})`,
        });
      } else if (subjectType === 'VERRAT') {
        await updateBoarByCode(selectedSubject.id, {
          notes: `Dernière pesée : ${poids} kg (${new Date().toISOString().slice(0, 10)})`,
        });
      }

      // Si la pesée était planifiée (V25), marque comme effectuée.
      if (peseeId) {
        try {
          await markPeseeEffectuee(peseeId);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[QuickPeseeForm] markPeseeEffectuee failed', e);
        }
      }

      setStep(4);
      try { await refreshData(true); } catch { /* noop */ }
    } catch (err) {
      // AUDIT-V1 P0-2 : log explicite sinon submit silencieux côté terrain.
      // eslint-disable-next-line no-console
      console.error('[QuickPeseeForm] insertNote failed', err);
      setSubmitError(err instanceof Error ? err.message : 'Erreur enregistrement pesée');
    } finally {
      setSaving(false);
    }
  };

  // AUDIT-V1 P0-2 : si validation Zod échoue, RHF appelle juste le 1er param,
  // pas le 2nd. On logge les erreurs de validation pour debug terrain.
  const onSubmit = form.handleSubmit(async (values) => {
    if (!selectedSubject) return;
    const poids = Number(values.poidsMoyen.replace(',', '.'));

    // Validation biologique uniquement pour les bandes (porcelets)
    if (subjectType === 'BANDE') {
      const b = selectedSubject as BandePorcelets;
      const jMB = jFrom(b.dateMB) ?? 0;
      const validation = biologyValidators.validatePoidsPlausible(poids, jMB);

      if (!validation.isValid) {
        presentAlert({
          header: 'Alerte Plausibilité',
          subHeader: 'Anomalie de poids détectée',
          message: validation.message,
          cssClass: 'agritech-alert',
          buttons: [
            { text: 'Annuler', role: 'cancel' },
            { text: 'Forcer la saisie', role: 'confirm', handler: () => {
              setPendingValues(values);
              setStep(3);
            } },
          ],
        });
        return;
      }
    }

    // Au lieu d'executer directement → step 3 récap pour confirmation explicite.
    setPendingValues(values);
    setStep(3);
  }, (errors) => {
    // AUDIT-V1 P0-2 : second callback de RHF.handleSubmit appelé sur
    // validation FAIL. Sans ça, l'utilisateur voit un submit silencieux.
    // eslint-disable-next-line no-console
    console.warn('[QuickPeseeForm] validation failed', errors);
    const firstError = Object.values(errors)[0]?.message;
    setSubmitError(firstError ? String(firstError) : 'Champs invalides — vérifie tes saisies');
  });

  // ── UI Helpers ───────────────────────────────────────────────────────
  const subjectDisplay = (s: PeseeSubject) => {
    const sb = s as BandePorcelets;
    const sr = s as Truie | Verrat;
    if (subjectType === 'BANDE') return (sb.idPortee || sb.id) + (sb.truie ? ` · ${sb.truie}` : '');
    return (sr.displayId || sr.id) + (sr.nom ? ` · ${sr.nom}` : '');
  };

  const watchedNb = form.watch('nbPeses');
  const watchedPoids = form.watch('poidsMoyen');

  const successSummary = useMemo(() => {
    if (step !== 4 || !selectedSubject) return null;
    const poids = (watchedPoids || '').replace(',', '.');
    if (subjectType === 'BANDE') {
      const nb = Number(watchedNb) || 0;
      return `${nb} porcelets · ${poids} kg moyen`;
    }
    return `${subjectDisplay(selectedSubject)} · ${poids} kg`;
  }, [step, selectedSubject, watchedNb, watchedPoids, subjectType]);

  // ─── Récap step 3 : ancien poids, écart, GMQ ───────────────────────────
  interface RecapStats {
    nouveauPoids: number;
    ancienPoids: number | null;
    ancienneDate: string | null;
    ecartKg: number | null;
    ecartPct: number | null;
    gmqGrammesParJour: number | null;
    joursEcart: number | null;
    /** vert | ambre | rouge */
    couleur: 'vert' | 'ambre' | 'rouge' | 'neutre';
    anormal: boolean;
  }

  const recapStats = useMemo<RecapStats | null>(() => {
    if (step !== 3 || !pendingValues || !selectedSubject) return null;
    const nouveau = Number((pendingValues.poidsMoyen || '').replace(',', '.'));
    if (!Number.isFinite(nouveau) || nouveau <= 0) return null;

    let ancienPoids: number | null = null;
    let ancienneDate: string | null = null;

    if (subjectType === 'BANDE') {
      const pesees = extractPeseesForBande(selectedSubject.id, notes);
      if (pesees.length > 0) {
        const last = pesees[pesees.length - 1];
        ancienPoids = last.poidsMoyen;
        ancienneDate = last.date;
      }
    } else {
      // Pour TRUIE/VERRAT, parse la dernière pesée depuis les notes individuelles.
      const regex = /(?:Dernière pesée|pes[ée]e?\s+individuelle)[^\d]*([\d.,]+)\s*kg/i;
      const subjectNotes = notes
        .filter(n => n.animalId === selectedSubject.id)
        .filter(n => regex.test(n.texte))
        .sort((a, b) => b.date.localeCompare(a.date));
      if (subjectNotes.length > 0) {
        const m = regex.exec(subjectNotes[0].texte);
        if (m) {
          const v = Number(m[1].replace(',', '.'));
          if (Number.isFinite(v) && v > 0) {
            ancienPoids = v;
            ancienneDate = subjectNotes[0].date;
          }
        }
      }
    }

    let ecartKg: number | null = null;
    let ecartPct: number | null = null;
    let gmq: number | null = null;
    let jours: number | null = null;
    if (ancienPoids !== null && ancienneDate !== null) {
      ecartKg = Math.round((nouveau - ancienPoids) * 10) / 10;
      ecartPct = Math.round(((nouveau - ancienPoids) / ancienPoids) * 1000) / 10;
      const from = new Date(ancienneDate);
      const today = new Date();
      const j = Math.round((today.getTime() - from.getTime()) / 86_400_000);
      if (j > 0) {
        jours = j;
        gmq = Math.round(((nouveau - ancienPoids) * 1000) / j);
      }
    }

    let couleur: RecapStats['couleur'] = 'neutre';
    let anormal = false;
    if (ecartPct !== null) {
      if (ecartPct < 0) couleur = 'rouge';
      else if (ecartPct < 2) couleur = 'ambre';
      else if (ecartPct > 5) couleur = 'vert';
      else couleur = 'ambre';
      // Anormal : gain > 50% ou perte > 10%
      if (ecartPct > 50 || ecartPct < -10) anormal = true;
    }

    return {
      nouveauPoids: nouveau,
      ancienPoids,
      ancienneDate,
      ecartKg,
      ecartPct,
      gmqGrammesParJour: gmq,
      joursEcart: jours,
      couleur,
      anormal,
    };
  }, [step, pendingValues, selectedSubject, subjectType, notes]);

  const handleConfirmRecap = useCallback(async (): Promise<void> => {
    if (!pendingValues) return;
    await executeSubmit(pendingValues);
    // executeSubmit place step=4 si succès
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingValues]); // executeSubmit closure stable assez

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Pesée rapide" height="full">
      <div role="dialog" className="space-y-5">
        {/* Stepper (1=sélection, 2=saisie, 3=récap, 4=succès) */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map(n => (
            <span key={n} className={['h-1.5 rounded-full transition-all duration-[220ms]', n === step ? 'w-8 bg-accent' : n < step ? 'w-4 bg-accent/60' : 'w-4 bg-border'].join(' ')} />
          ))}
        </div>

        {/* ÉTAPE 1 : Sélection */}
        {step === 1 && (
          <div className="space-y-4">
            <IonSegment
              value={subjectType}
              onIonChange={e => {
                form.setValue('subjectType', e.detail.value as SubjectType);
                setQuery('');
              }}
              className="premium-segment bg-bg-1 border border-border rounded-md"
            >
              <IonSegmentButton value="BANDE"><IonLabel className="text-[11px]">Bandes</IonLabel></IonSegmentButton>
              <IonSegmentButton value="TRUIE"><IonLabel className="text-[11px]">Truies</IonLabel></IonSegmentButton>
              <IonSegmentButton value="VERRAT"><IonLabel className="text-[11px]">Verrats</IonLabel></IonSegmentButton>
            </IonSegment>

            <div className="space-y-1.5">
              <label className="block text-mono-label text-text-2">Rechercher</label>
              <div className="flex items-center gap-2 h-11 px-3 rounded-md bg-bg-0 border border-border focus-within:border-accent">
                <Search size={14} className="text-text-2" />
                <input type="search" className="flex-1 bg-transparent outline-none text-[13px] text-text-0" placeholder="ID, Nom, Boucle…" value={query} onChange={e => setQuery(e.target.value)} />
              </div>
            </div>

            <ul className="card-dense !p-0 overflow-hidden max-h-[40vh] overflow-y-auto">
              {filteredSubjects.map(s => (
                <li key={s.id}>
                  <DataRow
                    primary={subjectDisplay(s)}
                    secondary={subjectType === 'BANDE' ? `${(s as BandePorcelets).vivants || 0} vivants` : `Boucle: ${(s as Truie | Verrat).boucle || '—'}`}
                    accessory={<ChevronRight size={14} className="text-text-2" />}
                    onClick={() => handleSelect(s)}
                  />
                </li>
              ))}
              {filteredSubjects.length === 0 && <li className="p-4 text-center text-text-2 text-[11px]">Aucun résultat</li>}
            </ul>
          </div>
        )}

        {/* ÉTAPE 2 : Saisie */}
        {step === 2 && selectedSubject && (
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="card-dense !p-3 flex items-center gap-3">
                <button type="button" onClick={() => setStep(1)} className="pressable h-9 w-9 flex items-center justify-center rounded-md bg-bg-2 text-text-1"><ArrowLeft size={14} /></button>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase text-text-2">{subjectType}</div>
                  <div className="truncate ft-code text-[13px] text-text-0">{subjectDisplay(selectedSubject)}</div>
                </div>
              </div>

              {subjectType === 'BANDE' && (
                <FormField
                  control={form.control}
                  name="nbPeses"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="block text-[11px] uppercase text-text-2">Nombre pesés</FormLabel>
                      <FormControl>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0 font-mono text-[20px] outline-none focus:border-accent"
                          value={field.value}
                          onChange={e => field.onChange(e.target.value.replace(/[^\d]/g, ''))}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage className="text-red text-[11px]" />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="poidsMoyen"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="block text-[11px] uppercase text-text-2">
                      Poids {subjectType === 'BANDE' ? 'moyen' : ''} (kg)
                    </FormLabel>
                    <FormControl>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full h-16 rounded-md px-4 bg-bg-0 border text-text-0 font-mono text-[28px] text-center outline-none focus:border-accent"
                        placeholder="0.0"
                        value={field.value}
                        onChange={e => field.onChange(e.target.value.replace(/[^\d.,]/g, ''))}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage className="text-red text-[11px]" />
                  </FormItem>
                )}
              />

              {subjectType === 'BANDE' && (
                <FormField
                  control={form.control}
                  name="ecartType"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="block text-[11px] uppercase text-text-2">
                        Écart-type (kg) · <span className="text-text-2 normal-case">opt</span>
                      </FormLabel>
                      <FormControl>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="w-full h-11 rounded-md px-3 bg-bg-0 border text-text-0 text-[14px] outline-none focus:border-accent"
                          placeholder="0.0"
                          value={field.value ?? ''}
                          onChange={e => field.onChange(e.target.value.replace(/[^\d.,]/g, ''))}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage className="text-red text-[11px]" />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="observation"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="block text-[11px] uppercase text-text-2">
                      Observation · <span className="text-text-2 normal-case">opt</span>
                    </FormLabel>
                    <FormControl>
                      <textarea
                        className="w-full rounded-md px-3 py-3 bg-bg-0 border text-text-0 text-[13px] outline-none focus:border-accent min-h-[80px]"
                        placeholder="Note terrain…"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage className="text-red text-[11px]" />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={handleClose} className="pressable flex-1 h-14 rounded-md bg-bg-1 border text-text-1 text-[12px] uppercase font-bold">Annuler</button>
                <button type="submit" disabled={saving} className="pressable flex-[2] h-14 rounded-md bg-accent text-bg-0 text-[13px] uppercase font-bold">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
              </div>
            </form>
          </Form>
        )}

        {/* ÉTAPE 3 : Récap & confirmation explicite */}
        {step === 3 && selectedSubject && recapStats && (
          <div data-testid="pesee-recap" className="space-y-4">
            <div className="card-dense !p-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="pressable h-9 w-9 flex items-center justify-center rounded-md bg-bg-2 text-text-1"
                aria-label="Retour à la saisie"
              >
                <ArrowLeft size={14} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase text-text-2">Récapitulatif · {subjectType}</div>
                <div className="truncate ft-code text-[13px] text-text-0">{subjectDisplay(selectedSubject)}</div>
              </div>
            </div>

            {/* Anciens / nouveaux poids */}
            <div className="grid grid-cols-2 gap-2">
              <div className="card-dense !p-3">
                <div className="text-[10px] uppercase text-text-2">Ancien poids</div>
                <div className="ft-values text-[18px] text-text-0 mt-1" data-testid="recap-ancien-poids">
                  {recapStats.ancienPoids !== null ? `${recapStats.ancienPoids} kg` : '—'}
                </div>
                {recapStats.ancienneDate && (
                  <div className="ft-code text-[10px] text-text-2 mt-0.5">{recapStats.ancienneDate}</div>
                )}
              </div>
              <div className="card-dense !p-3">
                <div className="text-[10px] uppercase text-text-2">Nouveau poids</div>
                <div className="ft-values text-[18px] text-text-0 mt-1" data-testid="recap-nouveau-poids">
                  {recapStats.nouveauPoids} kg
                </div>
              </div>
            </div>

            {/* Écarts (color coded) */}
            {recapStats.ecartKg !== null && recapStats.ecartPct !== null && (
              <div
                className="card-dense !p-3"
                data-testid="recap-ecart"
                style={{
                  borderLeft: `4px solid ${
                    recapStats.couleur === 'vert' ? 'var(--pt-primary)'
                    : recapStats.couleur === 'rouge' ? 'var(--pt-danger)'
                    : recapStats.couleur === 'ambre' ? 'var(--pt-accent-deep)'
                    : 'var(--pt-text-subtle)'
                  }`,
                }}
              >
                <div className="text-[10px] uppercase text-text-2">Écart</div>
                <div className="ft-values text-[16px] text-text-0 mt-1">
                  {recapStats.ecartKg > 0 ? '+' : ''}{recapStats.ecartKg} kg
                  {' · '}
                  <span data-testid="recap-ecart-pct">
                    {recapStats.ecartPct > 0 ? '+' : ''}{recapStats.ecartPct}%
                  </span>
                </div>
                {recapStats.gmqGrammesParJour !== null && (
                  <div className="text-[12px] text-text-2 mt-1" data-testid="recap-gmq">
                    GMQ : {recapStats.gmqGrammesParJour} g/j ({recapStats.joursEcart}j)
                  </div>
                )}
              </div>
            )}

            {recapStats.anormal && (
              <div
                role="alert"
                data-testid="recap-warning"
                className="card-dense !p-3 flex items-start gap-2"
                style={{ borderLeft: '4px solid var(--pt-danger)', background: 'rgba(220,38,38,0.06)' }}
              >
                <AlertTriangle size={16} className="text-red mt-0.5" />
                <div className="text-[12px] text-text-0">
                  Écart inhabituel — vérifie la pesée.
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="pressable flex-1 h-14 rounded-md bg-bg-1 border text-text-1 text-[12px] uppercase font-bold"
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={() => { void handleConfirmRecap(); }}
                disabled={saving}
                className="pressable flex-[2] h-14 rounded-md bg-accent text-bg-0 text-[13px] uppercase font-bold"
              >
                {saving ? 'Enregistrement…' : 'Confirmer le nouveau poids'}
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE 4 : Succès */}
        {step === 4 && (
          <div className="flex flex-col items-center justify-center py-16 animate-scale-in">
            <CheckCircle2 size={64} className="text-accent mb-4" strokeWidth={1.5} />
            <p className="agritech-heading text-[18px] uppercase">Pesée enregistrée</p>
            {successSummary && <p className="mt-2 text-[12px] text-text-2 text-center px-4">{successSummary}</p>}
            <button type="button" onClick={handleClose} className="pressable mt-8 h-12 px-8 rounded-md bg-accent text-bg-0 text-[12px] font-bold uppercase">OK</button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};

export default QuickPeseeForm;
