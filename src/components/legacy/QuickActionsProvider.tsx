/**
 * QuickActionsProvider — extrait depuis l'ancien AgritechNavV2 (vague mécanique 2026-05-18).
 *
 * Le composant Nav legacy (AgritechNavV2) n'était plus monté nulle part (le
 * shell V70 utilise BottomNavV70). On conserve uniquement le provider
 * QuickActions / hook useQuickActions / type QuickActionKind, qui sont encore
 * utilisés par App.tsx et SaisirSheet.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { IonToast } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { BottomSheet } from '../agritech';
import QuickSaillieForm from '../forms/QuickSaillieForm';
import QuickPeseeForm from '../forms/QuickPeseeForm';
import QuickHealthForm from '../forms/QuickHealthForm';
import QuickNoteForm from '../forms/QuickNoteForm';
import QuickMortalityForm from '../forms/QuickMortalityForm';
import QuickMiseBasForm from '../forms/QuickMiseBasForm';
import QuickSevrageForm from '../forms/QuickSevrageForm';
import QuickEchographieForm from '../forms/QuickEchographieForm';
import QuickWeightDistForm from '../forms/QuickWeightDistForm';
import QuickConsoAlimentForm from '../forms/QuickConsoAlimentForm';
import QuickAdoptionForm from '../forms/QuickAdoptionForm';
import QuickAddLotForm from '../forms/QuickAddLotForm';

/* ── QuickActions Context ────────────────────────────────────────────────── */

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
  | 'receptionlot'
  | 'ventelot'
  | 'stockaliment'
  | 'stockveto'
  | 'finance';

interface QuickActionsContextValue {
  openAction: (kind: QuickActionKind) => void;
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
  const [kind, setKind] = useState<QuickActionKind | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });
  const providerNavigate = useNavigate();

  const openAction = useCallback((k: QuickActionKind) => {
    if (k === 'ventelot') {
      providerNavigate('/engraissement');
      setToast({ open: true, message: 'Sélectionner le lot à vendre dans la liste' });
      return;
    }
    if (k === 'stockaliment') {
      providerNavigate('/ressources/aliments');
      return;
    }
    if (k === 'stockveto') {
      providerNavigate('/ressources/pharmacie');
      return;
    }
    if (k === 'finance') {
      providerNavigate('/pilotage/finances/details');
      return;
    }
    setKind(k);
  }, [providerNavigate]);

  const closeSheet = useCallback(() => setKind(null), []);

  const value = useMemo<QuickActionsContextValue>(
    () => ({ openAction }),
    [openAction]
  );

  return (
    <QuickActionsCtx.Provider value={value}>
      {children}

      <QuickSaillieForm isOpen={kind === 'saillie'} onClose={closeSheet} />
      <QuickEchographieForm
        isOpen={kind === 'echographie'}
        onClose={closeSheet}
        onSuccess={() => {
          setToast({ open: true, message: 'Échographie enregistrée' });
        }}
      />
      <QuickPeseeForm isOpen={kind === 'pesee'} onClose={closeSheet} />
      <QuickConsoAlimentForm
        isOpen={kind === 'conso'}
        onClose={closeSheet}
        onSuccess={() => {
          setToast({ open: true, message: 'Conso aliment enregistrée' });
        }}
      />
      <QuickMortalityForm
        isOpen={kind === 'mortalite'}
        onClose={closeSheet}
        onSuccess={() => {
          setToast({ open: true, message: 'Mortalité enregistrée' });
          closeSheet();
        }}
      />
      <QuickMiseBasForm
        isOpen={kind === 'misebas'}
        onClose={closeSheet}
        onSuccess={() => {
          setToast({ open: true, message: 'Mise-bas enregistrée' });
        }}
      />
      <QuickWeightDistForm
        isOpen={kind === 'tripoids'}
        onClose={closeSheet}
        onSuccess={() => {
          setToast({ open: true, message: 'Tri par poids enregistré' });
        }}
      />
      <QuickSevrageForm
        isOpen={kind === 'sevrage'}
        onClose={closeSheet}
        onSuccess={() => {
          setToast({ open: true, message: 'Sevrage enregistré' });
        }}
      />
      <QuickAdoptionForm
        isOpen={kind === 'adoption'}
        onClose={closeSheet}
        onSuccess={() => {
          setToast({ open: true, message: 'Adoption enregistrée' });
        }}
      />

      <BottomSheet
        isOpen={kind === 'soin'}
        onClose={closeSheet}
        title="Nouveau soin"
        height="full"
      >
        <QuickHealthForm
          subjectType="TRUIE"
          subjectId="GENERAL"
          onSuccess={() => {
            setToast({ open: true, message: 'Soin enregistré' });
            closeSheet();
          }}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={kind === 'note'}
        onClose={closeSheet}
        title="Nouvelle note"
      >
        <QuickNoteForm
          subjectType="TRUIE"
          subjectId="GENERAL"
          onSuccess={() => {
            setToast({ open: true, message: 'Note enregistrée' });
            closeSheet();
          }}
        />
      </BottomSheet>

      <QuickAddLotForm
        isOpen={kind === 'receptionlot'}
        onClose={closeSheet}
        onSuccess={() => {
          setToast({ open: true, message: 'Lot réceptionné' });
          closeSheet();
        }}
      />

      <IonToast
        isOpen={toast.open}
        message={toast.message}
        duration={2200}
        position="top"
        onDidDismiss={() => setToast({ open: false, message: '' })}
      />
    </QuickActionsCtx.Provider>
  );
};
