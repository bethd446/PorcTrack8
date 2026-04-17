import React, { useState } from 'react';
import {
  IonPage, IonHeader, IonContent, IonSegment, IonSegmentButton, IonLabel,
  IonCard
} from '@ionic/react';
import { Apple } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PremiumHeader from '../../components/PremiumHeader';

const ProtocolsView: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('biosecurite');

  const protocols = {
    biosecurite: [
      { id: 1, title: 'Accès Zone Élevage', content: 'Changement de bottes obligatoire. Pédiluve avec solution désinfectante active.', priority: 'HAUTE' },
      { id: 2, title: 'Quarantaine', content: 'Tout nouvel animal doit rester 3 semaines en zone tampon isolée.', priority: 'HAUTE' },
      { id: 3, title: 'Lutte contre les nuisibles', content: 'Vérification hebdomadaire des postes d\'appâtage. Nettoyage des abords.', priority: 'MOYENNE' }
    ],
    rations: [
      { id: 1, title: 'Truies Gestantes', content: '2.5kg / jour (AMV 5%). Ajuster selon état corporel (NEC).', priority: 'REFERENCE' },
      { id: 2, title: 'Maternité (Lactation)', content: 'Libre service après 3 jours post-MB. Viser 6-8kg/jour.', priority: 'REFERENCE' },
      { id: 3, title: 'Porcelets 1er âge', content: 'Pre-starter en petites quantités 4x/jour pour stimuler la curiosité.', priority: 'REFERENCE' }
    ],
    checklists: [
      { id: 1, title: 'Contrôle Quotidien', tasks: ['Température salles', 'Fonctionnement abreuvoirs', 'Observation état général'] },
      { id: 2, title: 'Hebdomadaire', tasks: ['Inventaire pharmacie', 'Nettoyage couloirs', 'Entretien matériel'] }
    ]
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <PremiumHeader title="Guide Métier" subtitle="Protocoles Élevage">
            <IonSegment value={tab} onIonChange={e => setTab(e.detail.value as string)} className="premium-segment rounded-xl bg-white/15 backdrop-blur-md overflow-hidden border border-white/10">
                <IonSegmentButton value="biosecurite">
                    <IonLabel className="text-[11px] font-bold uppercase">Biosécurité</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="rations">
                    <IonLabel className="text-[11px] font-bold uppercase">Rations</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="checklists">
                    <IonLabel className="text-[11px] font-bold uppercase">Listes</IonLabel>
                </IonSegmentButton>
            </IonSegment>
        </PremiumHeader>
      </IonHeader>

      <IonContent className="bg-white">
        <div className="px-5 py-6 pb-32">
          {tab === 'biosecurite' && (
            <div className="space-y-4">
              {protocols.biosecurite.map(p => (
                <div key={p.id} className="premium-card p-6 bg-white border-gray-100 shadow-sm border-l-4 border-l-accent-500">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="ft-heading text-sm uppercase tracking-tight">{p.title}</h3>
                    <span className="text-[11px] font-bold bg-accent-50 text-accent-700 px-1.5 py-0.5 rounded uppercase">{p.priority}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed font-medium">{p.content}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'rations' && (
            <div className="space-y-4">
              {protocols.rations.map(r => (
                <div key={r.id} className="premium-card p-6 bg-white border-gray-100 shadow-sm border-l-4 border-l-amber-500">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                        <Apple size={18} className="text-amber-600" />
                    </div>
                    <h3 className="ft-heading text-sm uppercase tracking-tight">{r.title}</h3>
                  </div>
                  <p className="ft-code text-[11px] text-gray-800 font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">{r.content}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'checklists' && (
            <div className="space-y-6">
              {protocols.checklists.map(c => (
                <div key={c.id} className="space-y-3">
                   <h3 className="text-[11px] font-bold text-gray-500 uppercase px-2">{c.title}</h3>
                   <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden">
                      {c.tasks.map((task, idx) => (
                        <div key={idx} className={`p-5 flex items-center gap-4 ${idx < c.tasks.length - 1 ? 'border-b border-gray-100' : ''} active:bg-gray-50`}>
                           <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                           </div>
                           <span className="text-xs font-bold text-gray-700">{task}</span>
                        </div>
                      ))}
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ProtocolsView;
