import React from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { Heart, Baby, Sprout, Scale } from 'lucide-react';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { HubTile, SectionDivider } from '../../components/agritech';

/**
 * CyclesHub — entrée sous-hubs du cycle productif.
 * Les sous-écrans (repro, maternité…) sont en cours de développement.
 */
const CyclesHub: React.FC = () => {
  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader title="CYCLES" subtitle="Reproduction · Maternité · Engraissement" />

          <div className="px-4 pt-4 flex flex-col gap-3">
            <SectionDivider label="Cycle productif" />

            <HubTile
              icon={<Heart size={22} />}
              title="Reproduction"
              subtitle="Bientôt · saillies · retours"
              to="/cycles/repro"
              tone="accent"
            />
            <HubTile
              icon={<Baby size={22} />}
              title="Maternité"
              subtitle="Bientôt · pesées J3·J7·J14·J21"
              to="/cycles/maternite"
              tone="amber"
            />
            <HubTile
              icon={<Sprout size={22} />}
              title="Post-sevrage"
              subtitle="Bientôt · suivi lots"
              to="/cycles/post-sevrage"
            />
            <HubTile
              icon={<Scale size={22} />}
              title="Engraissement"
              subtitle="Bientôt · poids de sortie"
              to="/cycles/engraissement"
            />
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default CyclesHub;
