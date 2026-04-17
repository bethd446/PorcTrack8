/**
 * PorcTrack — Modal de suppression sécurisée
 * ════════════════════════════════════════════
 * Utilisé dans CheptelView (truies/verrats) et BandesView (bandes/portées).
 *
 * Workflow :
 *   1. Porcher swipe-left ou appuie longuement sur une ligne → modal apparaît
 *   2. Il voit ce qui va être supprimé (nom + ID)
 *   3. Il entre une RAISON obligatoire (ex: "Mort", "Vendu", "Erreur saisie")
 *   4. Il confirme → `deleteRowById` → cache invalidé → Sheets mis à jour
 *   5. UI rafraîchie automatiquement
 */

import React, { useState } from 'react';
import { IonModal, IonSpinner, IonToast } from '@ionic/react';
import { Trash2, X, AlertTriangle } from 'lucide-react';
import { deleteRowById } from '../services/googleSheets';

export interface DeleteTarget {
  sheet:    string;    // ex: 'SUIVI_TRUIES_REPRODUCTION'
  idHeader: string;    // ex: 'ID'
  idValue:  string;    // ex: 'T01'
  label:    string;    // ex: 'Truie T01 — Monette'
  type:     'TRUIE' | 'VERRAT' | 'BANDE';
}

interface DeleteModalProps {
  target:    DeleteTarget | null;
  isOpen:    boolean;
  onClose:   () => void;
  onDeleted: () => void;
}

const REASON_PRESETS: Record<DeleteTarget['type'], string[]> = {
  TRUIE:  ['Mort naturelle', 'Abattage', 'Vendue', 'Erreur de saisie', 'Réforme définitive'],
  VERRAT: ['Mort naturelle', 'Abattage', 'Vendu', 'Erreur de saisie', 'Réforme définitive'],
  BANDE:  ['Lot clôturé', 'Erreur de saisie', 'Doublon', 'Lot vide', 'Correction manuelle'],
};

const DeleteModal: React.FC<DeleteModalProps> = ({ target, isOpen, onClose, onDeleted }) => {
  const [reason, setReason]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState<{ show: boolean; message: string; success: boolean }>({
    show: false, message: '', success: true,
  });

  if (!target) return null;
  const presets = REASON_PRESETS[target.type] ?? REASON_PRESETS.TRUIE;

  const handleDelete = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      const result = await deleteRowById(target.sheet, target.idHeader, target.idValue, reason.trim());
      if (result.success) {
        setToast({ show: true, message: `${target.label} supprimé(e)`, success: true });
        setTimeout(() => { onDeleted(); onClose(); setReason(''); }, 1000);
      } else {
        setToast({ show: true, message: `${result.message}`, success: false });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={() => { onClose(); setReason(''); }}
      initialBreakpoint={0.65}
      breakpoints={[0, 0.65]}
    >
      <div className="bg-white rounded-t-[32px] flex flex-col h-full overflow-hidden">
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mt-3 mb-0" />

        {/* Header danger */}
        <div className="bg-red-500 px-5 pt-5 pb-6 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-black/10" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center">
              <Trash2 size={22} className="text-white" />
            </div>
            <div>
              <h2 className="ft-heading text-white uppercase" style={{fontSize:'16px',letterSpacing:'0.02em'}}>
                Supprimer
              </h2>
              <p className="ft-code text-white/70 mt-0.5" style={{fontSize:'10px'}}>{target.label}</p>
            </div>
            <button onClick={onClose} className="pressable ml-auto w-8 h-8 rounded-full bg-white/15 flex items-center justify-center" aria-label="Fermer">
              <X size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Avertissement */}
          <div className="flex items-start gap-3 bg-red-50 rounded-xl border border-red-100 p-4">
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="ft-heading text-red-800 uppercase" style={{fontSize:'11px'}}>Action irréversible</p>
              <p className="ft-code text-red-700 leading-relaxed mt-0.5" style={{fontSize:'9px'}}>
                La ligne sera supprimée de Google Sheets. La raison sera tracée dans ZZ_LOGS.
              </p>
            </div>
          </div>

          {/* Raison obligatoire */}
          <div className="space-y-3">
            <label className="ft-code text-gray-500 uppercase" style={{fontSize:'9px',letterSpacing:'0.1em'}}>
              Raison de la suppression *
            </label>

            {/* Presets rapides */}
            <div className="flex flex-wrap gap-2">
              {presets.map(p => (
                <button
                  key={p}
                  onClick={() => setReason(p)}
                  className={`pressable px-3 py-1.5 rounded-xl border ft-code transition-colors ${
                    reason === p
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-white text-gray-600 border-gray-200 active:bg-gray-50'
                  }`}
                  style={{fontSize:'9px'}}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Champ libre */}
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ou saisir une raison personnalisée..."
              rows={2}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 ft-code text-gray-700 outline-none focus:border-red-300 resize-none placeholder-gray-300"
              style={{fontSize:'11px'}}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-4 space-y-3 border-t border-gray-100 bg-white flex-shrink-0">
          <button
            onClick={handleDelete}
            disabled={loading || !reason.trim()}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-red-500 text-white ft-heading uppercase active:scale-[0.97] transition-transform duration-[160ms] disabled:opacity-40 shadow-lg shadow-red-500/15 pressable"
            style={{fontSize:'12px',letterSpacing:'0.06em'}}
          >
            {loading ? <IonSpinner name="bubbles" className="w-5 h-5" /> : (
              <>
                <Trash2 size={18} />
                Confirmer la suppression
              </>
            )}
          </button>
          <button onClick={onClose} className="pressable w-full py-3 ft-code text-gray-400 uppercase active:opacity-70" style={{fontSize:'9px'}}>
            Annuler
          </button>
        </div>
      </div>

      <IonToast
        isOpen={toast.show}
        message={toast.message}
        duration={2500}
        onDidDismiss={() => setToast(t => ({ ...t, show: false }))}
        position="top"
        color={toast.success ? 'success' : 'danger'}
      />
    </IonModal>
  );
};

export default DeleteModal;
