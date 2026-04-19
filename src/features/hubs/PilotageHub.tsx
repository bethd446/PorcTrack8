import React from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { TrendingUp, Coins, AlertTriangle, FileCheck, Settings } from 'lucide-react';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { HubTile, SectionDivider } from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';

/**
 * PilotageHub — outillage pilotage : Perf · Finances · Alertes · Audit · Réglages.
 */
const PilotageHub: React.FC = () => {
  const { criticalAlertCount, alertesServeur } = useFarm();

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader title="PILOTAGE" subtitle="Performance · Finances · Admin" />

          <div className="px-4 pt-4 flex flex-col gap-3">
            <SectionDivider label="Analyse" />

            <HubTile
              icon={<TrendingUp size={22} />}
              title="Performance"
              subtitle="Bientôt · GMQ · IC · productivité"
              to="/pilotage/perf"
              tone="accent"
            />
            <HubTile
              icon={<Coins size={22} />}
              title="Finances"
              subtitle="Bientôt · marges · charges"
              to="/pilotage/finances"
              tone="amber"
            />

            <SectionDivider label="Opérations" />

            <HubTile
              icon={<AlertTriangle size={22} />}
              title="Alertes"
              subtitle="À traiter"
              count={criticalAlertCount + alertesServeur.length}
              to="/pilotage/alertes"
            />
            <HubTile
              icon={<FileCheck size={22} />}
              title="Audit"
              subtitle="Historique actions terrain"
              to="/pilotage/audit"
            />
            <HubTile
              icon={<Settings size={22} />}
              title="Réglages"
              subtitle="Sync · config · utilisateur"
              to="/pilotage/reglages"
            />
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default PilotageHub;
