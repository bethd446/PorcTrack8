/**
 * PorcTrack — Modal de suppression sécurisée (Agritech Dark)
 * ══════════════════════════════════════════════════════════
 * Utilisé dans CheptelView (truies/verrats) et BandesView (bandes/portées).
 *
 * Workflow :
 *   1. Porcher swipe-left ou appuie longuement sur une ligne → modal apparaît
 *   2. Il voit ce qui va être supprimé (nom + ID)
 *   3. Il entre une RAISON obligatoire (ex: "Mort", "Vendu", "Erreur saisie")
 *   4. Il confirme → `deleteRowById` → cache invalidé → Sheets mis à jour
 *   5. UI rafraîchie automatiquement
 *
 * Rendu en overlay dark centré.
 */

import React, { useEffect, useId, useState } from 'react';
import { IonSpinner, IonToast } from '@ionic/react';
import { Trash2, X, AlertOctagon } from 'lucide-react';
import { deleteRowById } from '../services/googleSheets';

export interface DeleteTarget {
  sheet: string; // ex: 'SUIVI_TRUIES_REPRODUCTION'
  idHeader: string; // ex: 'ID'
  idValue: string; // ex: 'T01'
  label: string; // ex: 'Truie T01 — Monette'
  type: 'TRUIE' | 'VERRAT' | 'BANDE';
}

interface DeleteModalProps {
  target: DeleteTarget | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

const REASON_PRESETS: Record<DeleteTarget['type'], string[]> = {
  TRUIE: ['Mort naturelle', 'Abattage', 'Vendue', 'Erreur de saisie', 'Réforme définitive'],
  VERRAT: ['Mort naturelle', 'Abattage', 'Vendu', 'Erreur de saisie', 'Réforme définitive'],
  BANDE: ['Lot clôturé', 'Erreur de saisie', 'Doublon', 'Lot vide', 'Correction manuelle'],
};

const DeleteModal: React.FC<DeleteModalProps> = ({ target, isOpen, onClose, onDeleted }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; success: boolean }>({
    show: false,
    message: '',
    success: true,
  });

  const titleId = useId();
  const descId = useId();

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setReason('');
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !target) return null;
  const presets = REASON_PRESETS[target.type] ?? REASON_PRESETS.TRUIE;

  const handleClose = (): void => {
    setReason('');
    onClose();
  };

  const handleDelete = async (): Promise<void> => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      const result = await deleteRowById(target.sheet, target.idHeader, target.idValue, reason.trim());
      if (result.success) {
        setToast({ show: true, message: `${target.label} supprimé(e)`, success: true });
        setTimeout(() => {
          onDeleted();
          setReason('');
          onClose();
        }, 1000);
      } else {
        setToast({ show: true, message: `${result.message}`, success: false });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6"
        onClick={handleClose}
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          onClick={e => e.stopPropagation()}
          className={[
            'agritech-root w-full max-w-md max-h-[90vh] flex flex-col',
            'bg-bg-1 border border-border rounded-md',
            'shadow-2xl overflow-hidden',
            'animate-scale-in',
          ].join(' ')}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* ── Header ────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-3 border-b border-border bg-bg-2 px-5 py-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-1 border border-border text-red flex-shrink-0">
                <AlertOctagon size={20} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  id={titleId}
                  className="agritech-heading text-[16px] uppercase tracking-wide leading-tight"
                >
                  Confirmer la suppression
                </h2>
                <p
                  id={descId}
                  className="mt-1 font-mono text-[11px] uppercase tracking-wide text-text-2 tabular-nums truncate"
                >
                  {target.label}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Fermer"
              className={[
                'pressable inline-flex h-9 w-9 items-center justify-center rounded-md flex-shrink-0',
                'bg-bg-1 border border-border text-text-1',
                'hover:bg-bg-2 transition-colors duration-[160ms]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
              ].join(' ')}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          {/* ── Body ──────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {/* Warning */}
            <div
              className="flex items-start gap-3 rounded-md border border-red/30 bg-bg-0 p-4"
              role="alert"
            >
              <AlertOctagon size={18} className="text-red flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-red">
                  Action irréversible
                </p>
                <p className="mt-1 font-mono text-[11px] text-text-1 leading-relaxed">
                  La ligne sera supprimée de Google Sheets. La raison sera tracée dans ZZ_LOGS.
                </p>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-3">
              <label
                htmlFor="delete-reason"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Raison de la suppression *
              </label>

              {/* Presets */}
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Raisons prédéfinies">
                {presets.map(p => {
                  const isSelected = reason === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setReason(p)}
                      className={[
                        'pressable inline-flex items-center h-8 px-3 rounded-md border',
                        'font-mono text-[11px] uppercase tracking-wide',
                        'transition-colors duration-[160ms]',
                        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                        isSelected
                          ? 'bg-red text-text-0 border-red'
                          : 'bg-bg-0 text-text-1 border-border hover:border-text-2',
                      ].join(' ')}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              {/* Custom text */}
              <textarea
                id="delete-reason"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Ou saisir une raison personnalisée..."
                rows={2}
                aria-label="Raison de la suppression"
                className={[
                  'w-full rounded-md px-3 py-2.5',
                  'bg-bg-0 border border-border text-text-0 placeholder:text-text-2',
                  'font-mono text-[12px]',
                  'outline-none transition-colors duration-[160ms]',
                  'focus:border-accent focus:ring-1 focus:ring-accent',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-1px]',
                  'resize-none',
                ].join(' ')}
              />
            </div>
          </div>

          {/* ── Footer actions ────────────────────────────────────────── */}
          <div className="flex-shrink-0 border-t border-border bg-bg-2 px-5 py-4 space-y-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || !reason.trim()}
              aria-label="Confirmer la suppression"
              className={[
                'pressable w-full h-[48px] rounded-md',
                'inline-flex items-center justify-center gap-2',
                'bg-red text-text-0 font-mono text-[12px] font-bold uppercase tracking-wide',
                'transition-colors duration-[160ms]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-red focus-visible:outline-offset-2',
                (loading || !reason.trim())
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:brightness-110',
              ].join(' ')}
            >
              {loading ? (
                <IonSpinner name="bubbles" className="w-5 h-5" aria-hidden="true" />
              ) : (
                <>
                  <Trash2 size={16} aria-hidden="true" />
                  Confirmer la suppression
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Annuler la suppression"
              className={[
                'pressable w-full h-[44px] rounded-md',
                'inline-flex items-center justify-center',
                'bg-bg-1 border border-border text-text-1',
                'font-mono text-[12px] uppercase tracking-wide',
                'hover:bg-bg-2 hover:text-text-0 transition-colors duration-[160ms]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
              ].join(' ')}
            >
              Annuler
            </button>
          </div>
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
    </>
  );
};

export default DeleteModal;
