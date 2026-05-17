/**
 * QuickActionsContext — Logique pure des Quick Actions (FAB Saisir).
 *
 * Issu de la séparation logique/rendering effectuée au design reset
 * 2026-05-17 (ex `src/components/AgritechNavV2.tsx`).
 *
 * RESPONSABILITÉ :
 *   - Maintient le `currentKind` (action sélectionnée OU null si fermé)
 *   - Expose `openAction(kind)` qui ouvre une action :
 *       · 4 kinds "navigation only" (ventelot, stockaliment, stockveto, finance)
 *         → navigate(path) puis return (pas de modal)
 *       · 11 kinds avec form modal → setCurrentKind(kind)
 *   - Expose `closeAction()` qui ferme le kind courant
 *   - Expose `useQuickActions()` hook pour les consommateurs (SaisirSheet, etc.)
 *
 * NON-RESPONSABILITÉ (déléguée à QuickActionsHost dans src/components/quick-actions/) :
 *   - Le rendering des 13 forms Quick*Form
 *   - Le rendering BottomSheet pour soin/note
 *   - Le rendering IonToast pour les confirmations
 *
 * Zone INTERDITE design (src/context/) — ne pas restyler.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';

export type QuickActionKind =
  | 'saillie'
  | 'echographie'
  | 'soin'
  | 'note'
  | 'pesee'
  | 'conso'
  | 'mortalite'
  | 'misebas'
  | 'sevrage'
  | 'tripoids'
  | 'adoption'
  // v3.4.4 — actions engraissement + transverses (PLAN_PROFIL_MULTI §5.2)
  | 'receptionlot'
  | 'ventelot'
  | 'stockaliment'
  | 'stockveto'
  | 'finance';

interface QuickActionsContextValue {
  /** Kind d'action actuellement ouvert (null si rien d'ouvert). */
  currentKind: QuickActionKind | null;
  /** Ouvre une action — modal ou navigation selon le kind. */
  openAction: (kind: QuickActionKind) => void;
  /** Ferme l'action courante (reset currentKind à null). */
  closeAction: () => void;
}

const QuickActionsCtx = createContext<QuickActionsContextValue | null>(null);

export const useQuickActions = (): QuickActionsContextValue => {
  const ctx = useContext(QuickActionsCtx);
  if (!ctx) {
    throw new Error('useQuickActions must be used within QuickActionsProvider');
  }
  return ctx;
};

export const QuickActionsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentKind, setCurrentKind] = useState<QuickActionKind | null>(null);
  const navigate = useNavigate();

  const openAction = useCallback(
    (k: QuickActionKind) => {
      // v3.4.4 — kinds "navigation only" : la saisie complète se fait dans
      // la page métier, pas dans un modal. On navigue et on ne touche pas
      // au currentKind (rien n'est ouvert).
      if (k === 'ventelot') {
        navigate('/engraissement');
        return;
      }
      if (k === 'stockaliment') {
        navigate('/ressources/aliments');
        return;
      }
      if (k === 'stockveto') {
        navigate('/ressources/pharmacie');
        return;
      }
      if (k === 'finance') {
        navigate('/pilotage/finances/details');
        return;
      }
      // Sinon : modal-kind, on l'enregistre comme courant → QuickActionsHost
      // rendra le form correspondant.
      setCurrentKind(k);
    },
    [navigate],
  );

  const closeAction = useCallback(() => setCurrentKind(null), []);

  const value = useMemo<QuickActionsContextValue>(
    () => ({ currentKind, openAction, closeAction }),
    [currentKind, openAction, closeAction],
  );

  return (
    <QuickActionsCtx.Provider value={value}>{children}</QuickActionsCtx.Provider>
  );
};
