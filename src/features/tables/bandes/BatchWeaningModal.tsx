import React, { useState } from 'react';
import { IonContent } from '@ionic/react';
import { Calendar, CheckCheck, TrendingUp, X } from 'lucide-react';
import {
  insertNote,
  updateBatch,
  updateSowByCode,
  resolveBatchIdByCode,
} from '../../../services/supabaseWrites';
import { kvGet } from '../../../services/kvStore';
import type { AggregatedBande, DebugMeta } from './types';

interface BatchWeaningModalProps {
  selectedBandes: AggregatedBande[];
  onClose: () => void;
  onSuccess: () => void;
  meta: DebugMeta;
  header: string[];
}

const BatchWeaningModal: React.FC<BatchWeaningModalProps> = ({
  selectedBandes,
  onClose,
  onSuccess,
  header,
}) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: selectedBandes.length, phase: '' });
  const [errors, setErrors] = useState<string[]>([]);

  const [dateSevrage, setDateSevrage] = useState(new Date().toISOString().split('T')[0]);
  const [poidsMoyen, setPoidsMoyen] = useState('');
  const [note, setNote] = useState('');
  const [pointHebdo, setPointHebdo] = useState(true);

  const handleConfirm = async (): Promise<void> => {
    setLoading(true);
    setErrors([]);
    const totalSteps = selectedBandes.length + (pointHebdo ? 1 : 0);
    let currentStep = 0;

    try {
      for (const bande of selectedBandes) {
        currentStep++;
        setProgress({ current: currentStep, total: totalSteps, phase: `Sevrage lot ${bande.id}...` });

        try {
          const batchId = await resolveBatchIdByCode(bande.id);
          if (!batchId) throw new Error(`Bande ${bande.id} introuvable côté Supabase`);

          const patch: Record<string, unknown> = {
            statut: 'SEVRÉ',
            date_sevrage: dateSevrage,
          };
          if (poidsMoyen) patch.poids_moyen_sevrage_kg = parseFloat(poidsMoyen);
          if (note) {
            const prevNotes = bande.rows[0]
              ? String(bande.rows[0][header.findIndex(h => h.toUpperCase().includes('NOTE'))] ?? '')
              : '';
            patch.notes = `${prevNotes ? prevNotes + ' | ' : ''}[SEVRAGE ${dateSevrage}] ${note}`.trim();
          }

          const res = await updateBatch(batchId, patch);
          if (!res.success) throw new Error(res.error || 'updateBatch failed');

          if (bande.boucleMere) {
            const truieCode = String(bande.truie || bande.boucleMere);
            await updateSowByCode(truieCode, {
              statut: 'En attente saillie',
              notes: `[SEVRAGE ${dateSevrage}] ${note}`.trim(),
            });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setErrors(prev => [...prev, `Erreur sur ${bande.id}: ${msg}`]);
        }
      }

      if (pointHebdo) {
        currentStep++;
        setProgress({ current: currentStep, total: totalSteps, phase: 'Génération du Point Hebdo...' });

        const summary = `Sevrage groupé de ${selectedBandes.length} lots. Poids moy: ${poidsMoyen || '?'}kg. Notes: ${note || 'N/A'} — par ${kvGet('user_name') || 'Système'}`;

        await insertNote({
          content: summary,
          category: 'POINT_HEBDO',
        });
      }

      if (errors.length === 0) {
        onSuccess();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrors(prev => [...prev, `Erreur critique: ${msg}`]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="agritech-root h-full flex flex-col items-center justify-center p-10 space-y-6">
        <div className="relative">
          <div className="w-28 h-28 rounded-full border-2 border-border border-t-accent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-[18px] font-semibold text-accent tabular-nums">
              {Math.round((progress.current / progress.total) * 100)}%
            </span>
          </div>
        </div>
        <div className="text-center space-y-2">
          <h3 className="agritech-heading text-[14px] uppercase">Traitement en cours</h3>
          <p className="font-mono text-[11px] uppercase tracking-wide text-text-2 animate-pulse">{progress.phase}</p>
          <p className="font-mono text-[12px] text-accent tabular-nums">{progress.current} / {progress.total}</p>
        </div>
        {errors.length > 0 && (
          <div className="w-full max-w-sm card-dense border-l-2 border-l-red max-h-40 overflow-y-auto">
            {errors.map((err, i) => (
              <p key={i} className="font-mono text-[11px] text-red mb-1">{err}</p>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="agritech-root h-full flex flex-col">
      <header className="bg-bg-0 border-b border-border px-4 pt-4 pb-4">
        <div className="flex justify-between items-start mb-4">
          <div className="min-w-0 flex-1">
            <h2 className="agritech-heading uppercase leading-none" style={{ fontSize: 'clamp(20px, 5vw, 24px)' }}>
              Clôture sevrage
            </h2>
            <p className="mt-1 font-mono text-[11px] text-text-2 leading-none">
              {selectedBandes.length} portée{selectedBandes.length > 1 ? 's' : ''} sélectionnée{selectedBandes.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="pressable inline-flex h-9 w-9 items-center justify-center rounded-md bg-bg-2 text-text-1 transition-colors"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="card-dense flex items-center gap-3 !py-3">
          <div className="w-10 h-10 rounded-md bg-accent text-bg-0 flex items-center justify-center font-mono text-[16px] font-semibold tabular-nums">
            {selectedBandes.length}
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wide text-text-2">Lots prêts</p>
            <p className="text-[12px] text-text-0 font-medium">Pour le sevrage</p>
          </div>
        </div>
      </header>

      <IonContent className="ion-no-padding">
        <div className="agritech-root px-4 py-5 space-y-4">
          {errors.length > 0 && (
            <div className="card-dense border-l-2 border-l-red">
              <h4 className="font-mono text-[11px] font-semibold uppercase tracking-wide text-red mb-2">
                Erreurs lors de la dernière tentative
              </h4>
              {errors.map((err, i) => (
                <p key={i} className="font-mono text-[11px] text-red mb-1">• {err}</p>
              ))}
            </div>
          )}

          <div className="card-dense space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={14} className="text-accent" />
              <h4 className="kpi-label">Paramètres sevrage</h4>
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wide text-text-2 mb-2">
                Date de sevrage
              </label>
              <input
                type="date"
                value={dateSevrage}
                onChange={e => setDateSevrage(e.target.value)}
                className="w-full bg-bg-2 border border-border rounded-md px-3 h-11 font-mono text-[13px] text-text-0 outline-none focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wide text-text-2 mb-2">
                Poids moyen du lot (kg)
              </label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Ex: 7.5"
                value={poidsMoyen}
                onChange={e => setPoidsMoyen(e.target.value)}
                className="w-full bg-bg-2 border border-border rounded-md px-3 h-11 font-mono text-[13px] text-text-0 placeholder-text-2 outline-none focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wide text-text-2 mb-2">
                Observations
              </label>
              <textarea
                placeholder="Notes sur l'état des porcelets, homogénéité..."
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full bg-bg-2 border border-border rounded-md px-3 py-3 text-[13px] text-text-0 placeholder-text-2 outline-none focus:border-accent transition-colors h-24 resize-none"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPointHebdo(!pointHebdo)}
            className={`pressable card-dense w-full flex items-center justify-between transition-colors text-left ${
              pointHebdo ? 'border-accent-dim' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors ${
                pointHebdo ? 'bg-accent text-bg-0' : 'bg-bg-2 text-text-2 border border-border'
              }`}>
                <TrendingUp size={16} />
              </div>
              <div>
                <h4 className={`font-mono text-[11px] uppercase tracking-wide ${pointHebdo ? 'text-text-0' : 'text-text-1'}`}>
                  Rapport d'activité
                </h4>
                <p className="font-mono text-[10px] uppercase tracking-wide text-text-2">
                  Générer Point Hebdo auto
                </p>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              pointHebdo ? 'bg-accent border-accent text-bg-0' : 'border-border bg-bg-2'
            }`}>
              {pointHebdo && <CheckCheck size={12} />}
            </div>
          </button>
        </div>
      </IonContent>

      <div className="agritech-root px-4 py-4 bg-bg-0 border-t border-border space-y-2">
        <button
          disabled={loading}
          onClick={handleConfirm}
          className="pressable w-full h-14 rounded-md bg-accent text-bg-0 flex items-center justify-center gap-3 transition-transform active:scale-[0.98]"
        >
          <CheckCheck size={18} />
          <span className="font-mono text-[12px] uppercase tracking-wide font-semibold">
            Lancer le sevrage
          </span>
        </button>
        <button
          onClick={onClose}
          className="pressable w-full h-11 rounded-md bg-bg-1 border border-border text-text-1 font-mono text-[11px] uppercase tracking-wide transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  );
};

export default BatchWeaningModal;
