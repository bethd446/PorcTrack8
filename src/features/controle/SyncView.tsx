import React, { useState, useEffect } from 'react';
import {
  IonPage, IonHeader, IonContent, IonSpinner, IonToast
} from '@ionic/react';
import { RefreshCw, CloudCheck, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getQueueStatus, flushQueue, clearQueue } from '../../services/offlineQueue';
import PremiumHeader from '../../components/PremiumHeader';

const SyncView: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState(getQueueStatus());
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState('');

  const refresh = () => setStatus(getQueueStatus());

  const handleFlush = async () => {
    setSyncing(true);
    try {
      const res = await flushQueue();
      refresh();
      if (res.processed > 0) {
          setToast(`${res.processed} actions synchronisées !`);
      } else if (res.remaining > 0) {
          setToast('Certaines actions n\'ont pas pu être envoyées.');
      }
    } catch (e) {
      setToast('Erreur de synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const handleClearQueue = async () => {
    await clearQueue();
    refresh();
    setToast('File d\'attente vidée.');
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <PremiumHeader title="Synchronisation" subtitle={`${status.pending} actions en attente`} showStatus={false} />
      </IonHeader>

      <IonContent className="bg-white">
        <div className="px-5 py-8 pb-32">

            <div className="premium-card p-8 bg-white border-gray-100 mb-8 text-center shadow-sm">
                <div className={`w-20 h-20 mx-auto rounded-[24px] flex items-center justify-center mb-6 ${status.pending > 0 ? 'bg-amber-50 text-amber-600' : 'bg-accent-50 text-accent-600'}`}>
                    {status.pending > 0 ? <RefreshCw size={32} className={syncing ? 'animate-spin' : ''} /> : <CloudCheck size={32} />}
                </div>
                <h2 className="ft-heading text-xl mb-2">
                    {status.pending > 0 ? 'Actions Différées' : 'Base à jour'}
                </h2>
                <p className="text-[13px] text-gray-600 leading-relaxed mb-8">
                    {status.pending > 0
                        ? `Vous avez ${status.pending} modifications enregistrées localement qui attendent une connexion stable.`
                        : 'Toutes vos saisies terrain ont été transmises au serveur Google Sheets.'}
                </p>

                {status.pending > 0 && (
                    <button
                        onClick={handleFlush}
                        disabled={syncing}
                        className="pressable premium-btn premium-btn-primary w-full shadow-xl shadow-accent-600/15"
                    >
                        {syncing ? <IonSpinner name="bubbles" /> : <><RefreshCw size={18} /><span>Forcer l'envoi</span></>}
                    </button>
                )}
            </div>

            {status.items.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[13px] font-bold text-gray-700">Détail de la file</h3>
                        <button onClick={handleClearQueue} className="pressable text-[12px] font-medium text-red-500">Tout effacer</button>
                    </div>
                    {status.items.map((item) => (
                        <div key={item.id} className="premium-card p-4 bg-white border-gray-100 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500">
                                    {item.action === 'append_row' ? <ArrowRight size={18} /> : <RefreshCw size={18} />}
                                </div>
                                <div>
                                    <p className="text-[13px] font-bold text-gray-900 leading-none mb-1">{item.payload.sheet}</p>
                                    <div className="flex items-center gap-2">
                                        <Clock size={11} className="text-gray-400" />
                                        <p className="text-[11px] font-bold text-gray-500 uppercase">{new Date(item.timestamp).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                            </div>
                            {item.tries > 0 && (
                                <div className="flex items-center gap-1 text-red-500">
                                    <AlertCircle size={14} />
                                    <span className="text-[11px] font-bold">{item.tries}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>

        <IonToast isOpen={!!toast} message={toast} duration={3000} onDidDismiss={() => setToast('')} className="premium-toast" />
      </IonContent>
    </IonPage>
  );
};

export default SyncView;
