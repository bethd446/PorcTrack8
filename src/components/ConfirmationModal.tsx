/**
 * PorcTrack — Modal de Confirmation d'Actions Terrain (Agritech Dark)
 * ═══════════════════════════════════════════════════════════════════
 * Affiché quand le moteur d'alertes détecte une action requise.
 * Le porcher peut :
 *   - Confirmer l'action (écrit dans Google Sheets)
 *   - Ajouter une note optionnelle
 *   - Rejeter / reporter
 *
 * Rendu en overlay dark centré (modal) — pas un BottomSheet.
 */

import React, { useEffect, useId, useState } from 'react';
import { IonToast } from '@ionic/react';
import {
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  Heart,
  Layers,
  Stethoscope,
  Box,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { Chip } from './agritech';
import type { ChipTone } from './agritech';
import { confirmAction, dismissAction } from '../services/confirmationQueue';
import type { FarmAlert, AlertPriority } from '../services/alertEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Icône par catégorie
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, React.FC<{ size: number; className?: string }>> = {
  REPRO: Heart,
  SANTE: Stethoscope,
  BANDES: Layers,
  STOCK: Box,
  PLANNING: Calendar,
};

const PRIORITY_TONE: Record<AlertPriority, ChipTone> = {
  CRITIQUE: 'red',
  HAUTE: 'amber',
  NORMALE: 'blue',
  INFO: 'default',
};

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

interface ConfirmationModalProps {
  alert: FarmAlert | null;
  confirmationId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onResolved: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  alert,
  confirmationId,
  isOpen,
  onClose,
  onResolved,
}) => {
  const [note, setNote] = useState('');
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
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !alert || !confirmationId) return null;

  const priorityTone = PRIORITY_TONE[alert.priority];
  const categoryIcon = CATEGORY_ICONS[alert.category] ?? AlertCircle;
  const primaryAction = alert.actions.find(a => a.variant === 'primary' || a.type !== 'DISMISS');
  const secondaryActions = alert.actions.filter(
    a => a.type === 'DISMISS' || a.variant === 'secondary',
  );

  const handleConfirm = async (): Promise<void> => {
    if (!primaryAction) return;
    setLoading(true);
    try {
      const result = await confirmAction(confirmationId, note || undefined);
      if (result.success) {
        setToast({ show: true, message: 'Action confirmée et enregistrée dans Sheets', success: true });
        setTimeout(() => {
          onResolved();
          onClose();
        }, 1200);
      } else {
        setToast({ show: true, message: `Erreur : ${result.error}`, success: false });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (): Promise<void> => {
    await dismissAction(confirmationId, note || undefined);
    onClose();
    onResolved();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6"
        onClick={onClose}
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
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-1 border border-border text-accent flex-shrink-0">
                {React.createElement(categoryIcon, { size: 20, className: '' })}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Chip label={alert.category} size="xs" />
                  <Chip label={alert.priority} tone={priorityTone} size="xs" />
                </div>
                <h2
                  id={titleId}
                  className="agritech-heading text-[16px] uppercase tracking-wide leading-tight"
                >
                  {alert.title}
                </h2>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-text-2 tabular-nums truncate">
                  {alert.subjectLabel}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
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
            {/* Message */}
            <div
              id={descId}
              className="rounded-md border border-border bg-bg-0 p-4"
            >
              <p className="font-mono text-[12px] text-text-1 leading-relaxed">
                {alert.message}
              </p>
              {alert.dueDate && alert.daysOffset !== undefined && (
                <div className="flex items-center gap-1.5 mt-3">
                  <Calendar size={12} className="text-text-2" aria-hidden="true" />
                  <span className="font-mono text-[11px] uppercase tracking-wide text-text-2 tabular-nums">
                    {alert.daysOffset > 0
                      ? `${alert.daysOffset} jour(s) de retard`
                      : alert.daysOffset < 0
                        ? `Dans ${Math.abs(alert.daysOffset)} jour(s)`
                        : "Aujourd'hui"}
                  </span>
                </div>
              )}
            </div>

            {/* Détails action */}
            {primaryAction && primaryAction.payload && (
              <div className="rounded-md border border-border bg-bg-0 p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={12} className="text-text-2" aria-hidden="true" />
                  <span className="font-mono text-[11px] uppercase tracking-wide text-text-2">
                    Action dans Google Sheets
                  </span>
                </div>
                {primaryAction.payload.sheet && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-wide text-text-2">
                      Table
                    </span>
                    <span className="font-mono text-[11px] text-text-0 bg-bg-2 px-2 py-0.5 rounded tabular-nums">
                      {primaryAction.payload.sheet}
                    </span>
                  </div>
                )}
                {primaryAction.payload.idValue && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-wide text-text-2">
                      ID concerné
                    </span>
                    <span className="font-mono text-[11px] text-accent bg-bg-2 px-2 py-0.5 rounded tabular-nums">
                      {primaryAction.payload.idValue}
                    </span>
                  </div>
                )}
                {primaryAction.payload.patch &&
                  Object.entries(primaryAction.payload.patch).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center gap-2">
                      <span className="font-mono text-[11px] uppercase tracking-wide text-text-2">
                        {key}
                      </span>
                      <span className="font-mono text-[11px] text-text-0 tabular-nums truncate max-w-[60%]">
                        {String(val)}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {/* Note optionnelle */}
            <div className="space-y-1.5">
              <label
                htmlFor="confirm-note"
                className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
              >
                Note du porcher (optionnel)
              </label>
              <textarea
                id="confirm-note"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Ajouter un commentaire, une observation…"
                rows={3}
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
            {primaryAction && primaryAction.type !== 'DISMISS' && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                aria-label={primaryAction.label}
                className={[
                  'pressable w-full h-[48px] rounded-md',
                  'inline-flex items-center justify-center gap-2',
                  'bg-accent text-bg-0 font-mono text-[12px] font-bold uppercase tracking-wide',
                  'transition-colors duration-[160ms]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                  loading ? 'opacity-40 cursor-not-allowed' : '',
                ].join(' ')}
              >
                {loading ? (
                  <span className="animate-pulse">Enregistrement…</span>
                ) : (
                  <>
                    <CheckCircle2 size={16} aria-hidden="true" />
                    {primaryAction.label}
                  </>
                )}
              </button>
            )}
            {secondaryActions.map(action => (
              <button
                key={action.type}
                type="button"
                onClick={handleDismiss}
                aria-label={action.label}
                className={[
                  'pressable w-full h-[44px] rounded-md',
                  'inline-flex items-center justify-center',
                  'bg-bg-1 border border-border text-text-1',
                  'font-mono text-[12px] uppercase tracking-wide',
                  'hover:bg-bg-2 hover:text-text-0 transition-colors duration-[160ms]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                ].join(' ')}
              >
                {action.label}
              </button>
            ))}
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

// ─────────────────────────────────────────────────────────────────────────────
// Panneau liste des alertes (badge + liste déployable dans le header)
// ─────────────────────────────────────────────────────────────────────────────

interface AlertBadgeProps {
  count: number;
  onClick: () => void;
}

export const AlertBadge: React.FC<AlertBadgeProps> = ({ count, onClick }) => {
  if (count === 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Voir ${count} alerte${count > 1 ? 's' : ''}`}
      className={[
        'pressable relative inline-flex items-center justify-center h-9 w-9 rounded-md',
        'bg-bg-2 border border-border text-text-1',
        'hover:bg-bg-1 hover:text-text-0 transition-colors duration-[160ms]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
      ].join(' ')}
    >
      <AlertTriangle size={16} aria-hidden="true" />
      <span
        className={[
          'absolute -top-1 -right-1 inline-flex h-4 min-w-4 px-1 items-center justify-center rounded-full',
          'bg-red text-text-0 border border-bg-1',
          'font-mono text-[10px] font-bold tabular-nums leading-none',
        ].join(' ')}
      >
        {count > 9 ? '9+' : count}
      </span>
    </button>
  );
};

export default ConfirmationModal;
