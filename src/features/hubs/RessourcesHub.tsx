import React from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { Wheat, Syringe, Calculator, ClipboardList } from 'lucide-react';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { HubTile } from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';

/**
 * RessourcesHub — entrée stocks : Aliments · Véto.
 */
const RessourcesHub: React.FC = () => {
  const { stockAliment, stockVeto } = useFarm();

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader title="RESSOURCES" subtitle="Aliments · Pharmacie · Protocoles" />

          <div className="px-4 pt-4 flex flex-col gap-3">
            <HubTile
              icon={<Wheat size={22} />}
              title="Aliments"
              subtitle="Stocks · plan d'alimentation"
              count={stockAliment.length}
              to="/ressources/aliments"
              tone="amber"
            />
            <HubTile
              icon={<Calculator size={22} />}
              title="Plan Alim"
              subtitle="Couverture · rations/j"
              to="/ressources/aliments/plan"
              tone="accent"
            />
            <HubTile
              icon={<ClipboardList size={22} />}
              title="Formules"
              subtitle="5 recettes validées"
              count={5}
              to="/ressources/aliments/formules"
              tone="amber"
            />
            <HubTile
              icon={<Syringe size={22} />}
              title="Véto"
              subtitle="Pharmacie · protocoles"
              count={stockVeto.length}
              to="/ressources/veto"
              tone="accent"
            />
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default RessourcesHub;
