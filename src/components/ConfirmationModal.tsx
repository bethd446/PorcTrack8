/**
 * PorcTrack — Modal de Confirmation d'Actions Terrain
 * ════════════════════════════════════════════════════
 * Affiché quand le moteur d'alertes détecte une action requise.
 * Le porcher peut :
 *   - Confirmer l'action (écrit dans Google Sheets)
 *   - Ajouter une note optionnelle
 *   - Rejeter / reporter
 */

import React, { useState } from 'react';
import {
  IonModal, IonSpinner, IonToast
} from '@ionic/react';
import {
  AlertCircle, CheckCircle2,
  X, FileText,
  Heart, Layers, Stethoscope,
  Box, Calendar, AlertTriangle
} from 'lucide-react';
import { PremiumButton } from './PremiumUI';
import { confirmAction, dismissAction } from '../services/confirmationQueue';
import type { FarmAlert } from '../services/alertEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Icône par catégorie
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, React.FC<{size: number; className?: string}>> = {
  REPRO:    Heart,
  SANTE:    Stethoscope,
  BANDES:   Layers,
  STOCK:    Box,
  PLANNING: Calendar,
};

const PRIORITY_CONFIG = {
  CRITIQUE: { bg: 'bg-red-500',    text: 'text-red-700',   badge: 'bg-red-50 border-red-200',   label: 'CRITIQUE' },
  HAUTE:    { bg: 'bg-amber-500',   text: 'text-amber-600',  badge: 'bg-amber-50 border-amber-50', label: 'HAUTE' },
  NORMALE:  { bg: 'bg-blue-500',    text: 'text-blue-600',   badge: 'bg-blue-50 border-blue-200',   label: 'NORMALE' },
  INFO:     { bg: 'bg-gray-400',   text: 'text-gray-500',  badge: 'bg-gray-50 border-gray-200', label: 'INFO' },
} as const;

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
    show: false, message: '', success: true
  });

  if (!alert || !confirmationId) return null;

  const priorityCfg = PRIORITY_CONFIG[alert.priority];
  const categoryIcon = CATEGORY_ICONS[alert.category] ?? AlertCircle;
  const primaryAction = alert.actions.find(a => a.variant === 'primary' || a.type !== 'DISMISS');
  const secondaryActions = alert.actions.filter(a => a.type === 'DISMISS' || a.variant === 'secondary');

  const handleConfirm = async () => {
    if (!primaryAction) return;
    setLoading(true);
    try {
      const result = await confirmAction(confirmationId, note || undefined);
      if (result.success) {
        setToast({ show: true, message: 'Action confirmée et enregistrée dans Sheets', success: true });
        setTimeout(() => { onResolved(); onClose(); }, 1200);
      } else {
        setToast({ show: true, message: `Erreur : ${result.error}`, success: false });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    await dismissAction(confirmationId, note || undefined);
    onClose();
    onResolved();
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      initialBreakpoint={0.75}
      breakpoints={[0, 0.5, 0.75, 0.95]}
      className="premium-modal"
    >
      <div className="bg-white rounded-t-[32px] h-full flex flex-col overflow-hidden">

        {/* Header coloré */}
        <div className={`${priorityCfg.bg} px-5 pt-8 pb-6 relative overflow-hidden flex-shrink-0`}>
          <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-black/5" />

          {/* Barre de drag */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/30" />

          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
              {React.createElement(categoryIcon, { size: 22, className: 'text-white' })}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white/60 text-[11px] font-bold uppercase">{alert.category}</span>
                <span className="text-white/40 text-[11px]">•</span>
                <span className="text-white/60 text-[11px] font-bold uppercase">{priorityCfg.label}</span>
              </div>
              <h2 className="text-white font-bold text-sm leading-tight">{alert.title}</h2>
              <p className="text-white/70 text-[11px] font-semibold mt-1">{alert.subjectLabel}</p>
            </div>
            <button onClick={onClose} className="pressable w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0" aria-label="Fermer">
              <X size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">

          {/* Message */}
          <div className={`rounded-xl border p-4 ${priorityCfg.badge}`}>
            <p className="text-xs font-semibold text-gray-700 leading-relaxed">{alert.message}</p>
            {alert.dueDate && (
              <div className="flex items-center gap-1.5 mt-2">
                <Calendar size={14} className={`${priorityCfg.text}`} />
                <span className={`text-[11px] font-bold uppercase ${priorityCfg.text}`}>
                  {alert.daysOffset !== undefined && alert.daysOffset > 0
                    ? `${alert.daysOffset} jour(s) de retard`
                    : alert.daysOffset !== undefined && alert.daysOffset < 0
                    ? `Dans ${Math.abs(alert.daysOffset)} jour(s)`
                    : "Aujourd'hui"
                  }
                </span>
              </div>
            )}
          </div>

          {/* Détails de l'action principale */}
          {primaryAction && primaryAction.payload && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={14} className="text-gray-400" />
                <span className="ft-code text-[11px] font-bold text-gray-400 uppercase">Action dans Google Sheets</span>
              </div>
              {primaryAction.payload.sheet && (
                <div className="flex justify-between items-center">
                  <span className="ft-code text-[11px] font-bold text-gray-400 uppercase">Table</span>
                  <span className="ft-code text-[11px] font-bold text-gray-700 bg-gray-50 px-2 py-0.5 rounded-lg">{primaryAction.payload.sheet}</span>
                </div>
              )}
              {primaryAction.payload.idValue && (
                <div className="flex justify-between items-center">
                  <span className="ft-code text-[11px] font-bold text-gray-400 uppercase">ID concerné</span>
                  <span className="ft-code text-[11px] font-bold text-accent-700 bg-accent-50 px-2 py-0.5 rounded-lg">{primaryAction.payload.idValue}</span>
                </div>
              )}
              {primaryAction.payload.patch && Object.entries(primaryAction.payload.patch).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="ft-code text-[11px] font-bold text-gray-400 uppercase">{key}</span>
                  <span className="ft-code text-[11px] font-bold text-gray-700">{String(val)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Zone de note optionnelle */}
          <div className="space-y-2">
            <label className="ft-code text-[11px] font-bold text-gray-400 uppercase px-1">
              Note du Porcher (optionnel)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ajouter un commentaire, une observation..."
              rows={3}
              className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-xs font-medium text-gray-700 outline-none focus:border-accent-300 resize-none placeholder-gray-300"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-8 pt-4 flex-shrink-0 space-y-3 border-t border-gray-100 bg-white">
          {primaryAction && primaryAction.type !== 'DISMISS' && (
            <PremiumButton
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              icon={CheckCircle2}
              label={primaryAction.label}
              onClick={handleConfirm}
            />
          )}
          {secondaryActions.map(action => (
            <PremiumButton
              key={action.type}
              variant="ghost"
              size="sm"
              fullWidth
              label={action.label}
              onClick={handleDismiss}
            />
          ))}
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
      onClick={onClick}
      className="pressable relative flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 border border-white/20 active:scale-[0.95] transition-transform duration-[160ms]"
    >
      <AlertTriangle size={18} className="text-white" />
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border border-white">
        <span className="ft-values text-[11px] font-bold text-white">{count > 9 ? '9+' : count}</span>
      </div>
    </button>
  );
};

export default ConfirmationModal;
