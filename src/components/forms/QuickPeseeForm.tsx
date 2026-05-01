import React, { useMemo, useState, useCallback } from 'react';
import { useIonAlert, IonSegment, IonSegmentButton, IonLabel } from '@ionic/react';
import { Search, CheckCircle2, ChevronRight, ArrowLeft } from 'lucide-react';
import { useFarm } from '../../context/FarmContext';
import {
  insertNote,
  updateSowByCode,
  updateBoarByCode,
} from '../../services/supabaseWrites';
import { safeDate } from '../../lib/truieHelpers';
import { BottomSheet, DataRow } from '../agritech';
import type { BandePorcelets, Truie, Verrat } from '../../types/farm';

type PeseeSubject = BandePorcelets | Truie | Verrat;
import { biologyValidators } from '../../utils/biologyValidators';
import { kvGet } from '../../services/kvStore';

/* ═════════════════════════════════════════════════════════════════════════
   QuickPeseeForm · Pesée rapide (Bande, Truie ou Verrat)
   ─────────────────────────────────────────────────────────────────────────
   Flow 3 étapes :
     1. Sélection type + sujet
     2. Saisie poids (+ nb/écart pour les bandes)
     3. Confirmation
   Persist : NOTES_TERRAIN (5-col) + Update poids (si animal individuel)
   ═════════════════════════════════════════════════════════════════════════ */

interface QuickPeseeFormProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 1 | 2 | 3;
type SubjectType = 'BANDE' | 'TRUIE' | 'VERRAT';

interface PeseeFormState {
  nbPeses: string;
  poidsMoyen: string;
  ecartType: string;
  observation: string;
}

const INITIAL_STATE: PeseeFormState = {
  nbPeses: '',
  poidsMoyen: '',
  ecartType: '',
  observation: '',
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

const QuickPeseeForm: React.FC<QuickPeseeFormProps> = ({ isOpen, onClose }) => {
  const { bandes, truies, verrats, refreshData } = useFarm();
  const [presentAlert] = useIonAlert();

  const [step, setStep] = useState<Step>(1);
  const [subjectType, setSubjectType] = useState<SubjectType>('BANDE');
  const [query, setQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<BandePorcelets | Truie | Verrat | null>(null);
  const [form, setForm] = useState<PeseeFormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [, setSubmitError] = useState<string>('');

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
    setForm(INITIAL_STATE);
    setErrors({});
    setSubmitError('');
    setSaving(false);
  }, []);

  const handleClose = useCallback((): void => {
    resetAll();
    onClose();
  }, [onClose, resetAll]);

  const handleSelect = (s: PeseeSubject): void => {
    setSelectedSubject(s);
    if (subjectType === 'BANDE') {
      const sb = s as BandePorcelets;
      setForm(prev => ({
        ...prev,
        nbPeses: sb.vivants !== undefined ? String(sb.vivants) : '',
      }));
    } else {
      setForm(prev => ({ ...prev, nbPeses: '1' }));
    }
    setErrors({});
    setStep(2);
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const nb = Number(form.nbPeses);
    const poids = Number(form.poidsMoyen.replace(',', '.'));
    const ecart = form.ecartType.trim() ? Number(form.ecartType.replace(',', '.')) : null;

    if (!selectedSubject) next.subject = 'Sujet requis';
    if (!Number.isFinite(nb) || nb <= 0) {
      next.nbPeses = 'Nombre > 0 requis';
    } else if (subjectType === 'BANDE' && (selectedSubject as BandePorcelets).vivants !== undefined && nb > ((selectedSubject as BandePorcelets).vivants ?? 0)) {
      next.nbPeses = `Max ${(selectedSubject as BandePorcelets).vivants} vivants`;
    }

    if (!Number.isFinite(poids) || poids <= 0) {
      next.poidsMoyen = 'Poids > 0 requis';
    } else if (poids >= 500) {
      next.poidsMoyen = 'Poids trop élevé (> 500kg)';
    }

    if (ecart !== null && (!Number.isFinite(ecart) || ecart < 0)) {
      next.ecartType = 'Écart-type ≥ 0';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!selectedSubject) return;
    if (!validate()) return;

    const poids = Number(form.poidsMoyen.replace(',', '.'));

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
            { text: 'Forcer la saisie', role: 'confirm', handler: () => executeSubmit() },
          ],
        });
        return;
      }
    }

    await executeSubmit();
  };

  const executeSubmit = async (): Promise<void> => {
    if (!selectedSubject) return;
    setSaving(true);
    setSubmitError('');

    try {
      const nb = Number(form.nbPeses);
      const poids = Number(form.poidsMoyen.replace(',', '.'));
      const ecart = form.ecartType.trim() ? Number(form.ecartType.replace(',', '.')) : null;
      const obs = form.observation.trim();

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

      const author = kvGet('user_name') || 'Anonyme';

      await insertNote({
        content: `[${subjectType}:${selectedSubject.id}] ${note}`,
        category: 'PESEE',
        author_id: author,
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

      setStep(3);
      try { await refreshData(true); } catch { /* noop */ }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erreur enregistrement pesée');
    } finally {
      setSaving(false);
    }
  };

  // ── UI Helpers ───────────────────────────────────────────────────────
  const subjectDisplay = (s: PeseeSubject) => {
    const sb = s as BandePorcelets;
    const sr = s as Truie | Verrat;
    if (subjectType === 'BANDE') return (sb.idPortee || sb.id) + (sb.truie ? ` · ${sb.truie}` : '');
    return (sr.displayId || sr.id) + (sr.nom ? ` · ${sr.nom}` : '');
  };

  const successSummary = useMemo(() => {
    if (step !== 3 || !selectedSubject) return null;
    const poids = form.poidsMoyen.replace(',', '.');
    if (subjectType === 'BANDE') {
      const nb = Number(form.nbPeses) || 0;
      return `${nb} porcelets · ${poids} kg moyen`;
    }
    return `${subjectDisplay(selectedSubject)} · ${poids} kg`;
  }, [step, selectedSubject, form.nbPeses, form.poidsMoyen, subjectType]);

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Pesée rapide" height="full">
      <div role="dialog" className="space-y-5">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map(n => (
            <span key={n} className={['h-1.5 rounded-full transition-all duration-[220ms]', n === step ? 'w-8 bg-accent' : n < step ? 'w-4 bg-accent/60' : 'w-4 bg-border'].join(' ')} />
          ))}
        </div>

        {/* ÉTAPE 1 : Sélection */}
        {step === 1 && (
          <div className="space-y-4">
            <IonSegment value={subjectType} onIonChange={e => { setSubjectType(e.detail.value as SubjectType); setQuery(''); }} className="premium-segment bg-bg-1 border border-border rounded-md">
              <IonSegmentButton value="BANDE"><IonLabel className="text-[11px] font-mono">Bandes</IonLabel></IonSegmentButton>
              <IonSegmentButton value="TRUIE"><IonLabel className="text-[11px] font-mono">Truies</IonLabel></IonSegmentButton>
              <IonSegmentButton value="VERRAT"><IonLabel className="text-[11px] font-mono">Verrats</IonLabel></IonSegmentButton>
            </IonSegment>

            <div className="space-y-1.5">
              <label className="block font-mono text-[11px] uppercase tracking-wide text-text-2">Rechercher</label>
              <div className="flex items-center gap-2 h-11 px-3 rounded-md bg-bg-0 border border-border focus-within:border-accent">
                <Search size={14} className="text-text-2" />
                <input type="search" className="flex-1 bg-transparent outline-none font-mono text-[13px] text-text-0" placeholder="ID, Nom, Boucle…" value={query} onChange={e => setQuery(e.target.value)} />
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
              {filteredSubjects.length === 0 && <li className="p-4 text-center text-text-2 font-mono text-[11px]">Aucun résultat</li>}
            </ul>
          </div>
        )}

        {/* ÉTAPE 2 : Saisie */}
        {step === 2 && selectedSubject && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="card-dense !p-3 flex items-center gap-3">
              <button type="button" onClick={() => setStep(1)} className="pressable h-9 w-9 flex items-center justify-center rounded-md bg-bg-2 text-text-1"><ArrowLeft size={14} /></button>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10px] uppercase text-text-2">{subjectType}</div>
                <div className="truncate font-mono text-[13px] text-text-0">{subjectDisplay(selectedSubject)}</div>
              </div>
            </div>

            {subjectType === 'BANDE' && (
              <div className="space-y-1.5">
                <label className="block font-mono text-[11px] uppercase text-text-2">Nombre pesés</label>
                <input type="text" inputMode="numeric" className="w-full h-12 rounded-md px-3 bg-bg-0 border text-text-0 font-mono text-[20px] outline-none focus:border-accent" value={form.nbPeses} onChange={e => setForm(f => ({ ...f, nbPeses: e.target.value.replace(/[^\d]/g, '') }))} />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block font-mono text-[11px] uppercase text-text-2">Poids {subjectType === 'BANDE' ? 'moyen' : ''} (kg)</label>
              <input type="text" inputMode="decimal" className="w-full h-16 rounded-md px-4 bg-bg-0 border text-text-0 font-mono text-[28px] text-center outline-none focus:border-accent" placeholder="0.0" value={form.poidsMoyen} onChange={e => setForm(f => ({ ...f, poidsMoyen: e.target.value.replace(/[^\d.,]/g, '') }))} autoFocus />
              {errors.poidsMoyen && <p className="text-red font-mono text-[11px]">{errors.poidsMoyen}</p>}
            </div>

            {subjectType === 'BANDE' && (
              <div className="space-y-1.5">
                <label className="block font-mono text-[11px] uppercase text-text-2">Écart-type (kg) · <span className="text-text-2 normal-case">opt</span></label>
                <input type="text" inputMode="decimal" className="w-full h-11 rounded-md px-3 bg-bg-0 border text-text-0 font-mono text-[14px] outline-none focus:border-accent" placeholder="0.0" value={form.ecartType} onChange={e => setForm(f => ({ ...f, ecartType: e.target.value.replace(/[^\d.,]/g, '') }))} />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block font-mono text-[11px] uppercase text-text-2">Observation · <span className="text-text-2 normal-case">opt</span></label>
              <textarea className="w-full rounded-md px-3 py-3 bg-bg-0 border text-text-0 font-mono text-[13px] outline-none focus:border-accent min-h-[80px]" placeholder="Note terrain…" value={form.observation} onChange={e => setForm(f => ({ ...f, observation: e.target.value }))} />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={handleClose} className="pressable flex-1 h-14 rounded-md bg-bg-1 border text-text-1 font-mono text-[12px] uppercase font-bold">Annuler</button>
              <button type="submit" disabled={saving} className="pressable flex-[2] h-14 rounded-md bg-accent text-bg-0 font-mono text-[13px] uppercase font-bold">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            </div>
          </form>
        )}

        {/* ÉTAPE 3 : Succès */}
        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-16 animate-scale-in">
            <CheckCircle2 size={64} className="text-accent mb-4" strokeWidth={1.5} />
            <p className="agritech-heading text-[18px] uppercase">Pesée enregistrée</p>
            {successSummary && <p className="mt-2 font-mono text-[12px] text-text-2 text-center px-4">{successSummary}</p>}
            <button type="button" onClick={handleClose} className="pressable mt-8 h-12 px-8 rounded-md bg-accent text-bg-0 font-mono text-[12px] font-bold uppercase">OK</button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};

export default QuickPeseeForm;
