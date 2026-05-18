/**
 * QuickActionsHost — Rendering des Quick Actions (modals + toast).
 *
 * Issu de la séparation logique/rendering effectuée au design reset
 * 2026-05-17 (ex `src/components/AgritechNavV2.tsx`).
 *
 * RESPONSABILITÉ :
 *   - Consomme `useQuickActions()` → lit `currentKind` + `closeAction()`
 *   - Render conditionnellement le bon `<QuickXForm>` selon `currentKind`
 *   - Gère le BottomSheet pour les actions `soin` et `note`
 *   - Maintient un state local `toast` pour les confirmations
 *
 * DOIT être monté à l'intérieur de `<QuickActionsProvider>` (sinon
 * `useQuickActions()` throw).
 *
 * Démolissable cosmétiquement au Lot 4 du design reset : le dev externe
 * peut remplacer BottomSheet/IonToast/les Quick*Form sans toucher au
 * context.
 */
import React, { useCallback, useState } from 'react';
import { IonToast } from '@ionic/react';

import { useQuickActions } from '../../context/QuickActionsContext';
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
// v3.4.4 — réutilisation du form A5 pour réception lot (engraisseur)
import QuickAddLotForm from '../forms/QuickAddLotForm';

interface ToastState {
  open: boolean;
  message: string;
}

export const QuickActionsHost: React.FC = () => {
  const { currentKind, closeAction } = useQuickActions();
  const [toast, setToast] = useState<ToastState>({ open: false, message: '' });

  const showToast = useCallback((message: string) => {
    setToast({ open: true, message });
  }, []);

  return (
    <>
      <QuickSaillieForm isOpen={currentKind === 'saillie'} onClose={closeAction} />
      <QuickEchographieForm
        isOpen={currentKind === 'echographie'}
        onClose={closeAction}
        onSuccess={() => showToast('Échographie enregistrée')}
      />
      <QuickPeseeForm isOpen={currentKind === 'pesee'} onClose={closeAction} />
      <QuickConsoAlimentForm
        isOpen={currentKind === 'conso'}
        onClose={closeAction}
        onSuccess={() => showToast('Conso aliment enregistrée')}
      />
      <QuickMortalityForm
        isOpen={currentKind === 'mortalite'}
        onClose={closeAction}
        onSuccess={() => {
          showToast('Mortalité enregistrée');
          closeAction();
        }}
      />
      <QuickMiseBasForm
        isOpen={currentKind === 'misebas'}
        onClose={closeAction}
        onSuccess={() => showToast('Mise-bas enregistrée')}
      />
      <QuickWeightDistForm
        isOpen={currentKind === 'tripoids'}
        onClose={closeAction}
        onSuccess={() => showToast('Tri par poids enregistré')}
      />
      <QuickSevrageForm
        isOpen={currentKind === 'sevrage'}
        onClose={closeAction}
        onSuccess={() => showToast('Sevrage enregistré')}
      />
      <QuickAdoptionForm
        isOpen={currentKind === 'adoption'}
        onClose={closeAction}
        onSuccess={() => showToast('Adoption enregistrée')}
      />

      <BottomSheet
        isOpen={currentKind === 'soin'}
        onClose={closeAction}
        title="Nouveau soin"
        height="full"
      >
        <QuickHealthForm
          subjectType="TRUIE"
          subjectId="GENERAL"
          onSuccess={() => {
            showToast('Soin enregistré');
            closeAction();
          }}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={currentKind === 'note'}
        onClose={closeAction}
        title="Nouvelle note"
      >
        <QuickNoteForm
          subjectType="TRUIE"
          subjectId="GENERAL"
          onSuccess={() => {
            showToast('Note enregistrée');
            closeAction();
          }}
        />
      </BottomSheet>

      <QuickAddLotForm
        isOpen={currentKind === 'receptionlot'}
        onClose={closeAction}
        onSuccess={() => {
          showToast('Lot réceptionné');
          closeAction();
        }}
      />

      <IonToast
        isOpen={toast.open}
        message={toast.message}
        duration={2200}
        position="top"
        onDidDismiss={() => setToast({ open: false, message: '' })}
      />
    </>
  );
};

export default QuickActionsHost;
