import React, { useState } from 'react';
import {
  IonPage, IonContent, IonSpinner, IonToast
} from '@ionic/react';
import { RefreshCw, CloudCheck, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { getQueueStatus, flushQueue, clearQueue } from '../../services/offlineQueue';
import AgritechLayout from '../../components/AgritechLayout';
import AgritechHeader from '../../components/AgritechHeader';
import { Chip, SectionDivider } from '../../components/agritech';

const SyncView: React.FC = () => {
  const [status, setStatus] = useState(getQueueStatus());
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState('');

  const refresh = (): void => setStatus(getQueueStatus());

  const handleFlush = async (): Promise<void> => {
    setSyncing(true);
    try {
      const res = await flushQueue();
      refresh();
      if (res.processed > 0) {
        setToast(`${res.processed} actions synchronisées !`);
      } else if (res.remaining > 0) {
        setToast("Certaines actions n'ont pas pu être envoyées.");
      }
    } catch {
      setToast('Erreur de synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const handleClearQueue = async (): Promise<void> => {
    await clearQueue();
    refresh();
    setToast("File d'attente vidée.");
  };

  const isEmpty = status.pending === 0;

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout withNav={true}>
          <AgritechHeader
            title="Synchronisation"
            subtitle={`${status.pending} action${status.pending > 1 ? 's' : ''} en attente`}
            backTo="/"
          />

          <div className="px-4 pt-4 pb-8 space-y-5">
            {/* ── État global ─────────────────────────────────────────── */}
            <section aria-label="État de la synchronisation" role="region">
              <div
                className={
                  'card-dense flex flex-col items-center text-center py-8 border-l-2 ' +
                  (isEmpty ? 'border-l-accent' : 'border-l-amber')
                }
              >
                <div
                  className={
                    'inline-flex h-16 w-16 items-center justify-center rounded-md bg-bg-2 mb-4 ' +
                    (isEmpty ? 'text-accent' : 'text-amber')
                  }
                  aria-hidden="true"
                >
                  {isEmpty ? (
                    <CloudCheck size={28} />
                  ) : (
                    <RefreshCw
                      size={28}
                      className={syncing ? 'animate-spin' : ''}
                    />
                  )}
                </div>
                <h2 className="agritech-heading text-[22px] uppercase leading-none mb-2">
                  {isEmpty ? 'Base à jour' : 'Actions différées'}
                </h2>
                <p className="font-mono text-[12px] text-text-2 leading-relaxed max-w-sm mb-6">
                  {isEmpty
                    ? 'Toutes vos saisies terrain ont été transmises au serveur Google Sheets.'
                    : `Vous avez ${status.pending} modifications enregistrées localement qui attendent une connexion stable.`}
                </p>

                {!isEmpty && (
                  <button
                    type="button"
                    onClick={handleFlush}
                    disabled={syncing}
                    className="pressable inline-flex items-center justify-center gap-2 h-11 px-6 rounded-md bg-accent text-bg-0 text-[13px] font-semibold active:scale-[0.97] disabled:opacity-40 transition-[transform,opacity] duration-150 hover:bg-[color:var(--color-accent-dim)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    {syncing ? (
                      <IonSpinner name="crescent" />
                    ) : (
                      <>
                        <RefreshCw size={14} aria-hidden="true" />
                        <span>Forcer l'envoi</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </section>

            {/* ── File d'attente ──────────────────────────────────────── */}
            {status.items.length > 0 && (
              <section aria-label="File d'attente" role="region">
                <SectionDivider
                  label="Détail de la file"
                  action={
                    <button
                      type="button"
                      onClick={handleClearQueue}
                      className="pressable font-mono text-[11px] uppercase tracking-wide text-red rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-red focus-visible:outline-offset-2"
                    >
                      Tout effacer
                    </button>
                  }
                />
                <ul className="card-dense !p-0 overflow-hidden" aria-label="Actions en attente">
                  {status.items.map((item, idx) => {
                    const isAppend = item.action === 'append_row';
                    const retryFailed = item.tries > 0;
                    return (
                      <li
                        key={item.id}
                        className={
                          'flex items-center justify-between gap-3 px-3 py-3 ' +
                          (idx < status.items.length - 1
                            ? 'border-b border-border'
                            : '')
                        }
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-2 text-text-2"
                            aria-hidden="true"
                          >
                            {isAppend ? (
                              <ArrowRight size={14} />
                            ) : (
                              <RefreshCw size={14} />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-mono text-[13px] font-semibold text-text-0">
                              {item.payload.sheet}
                            </p>
                            <div className="mt-0.5 flex items-center gap-1.5 text-text-2">
                              <Clock size={10} aria-hidden="true" />
                              <span className="font-mono text-[11px] tabular-nums">
                                {new Date(item.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {retryFailed ? (
                          <Chip
                            label={`RETRY ${item.tries}`}
                            tone="red"
                            size="xs"
                            className="shrink-0"
                          />
                        ) : (
                          <Chip
                            label="PENDING"
                            tone="amber"
                            size="xs"
                            className="shrink-0"
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {status.items.length === 0 && !isEmpty && (
              <div className="card-dense flex items-center gap-3">
                <AlertCircle
                  size={16}
                  className="text-amber shrink-0"
                  aria-hidden="true"
                />
                <p className="font-mono text-[12px] text-text-1">
                  Compteur en avance — actualiser pour relire la file.
                </p>
              </div>
            )}
          </div>
        </AgritechLayout>

        <IonToast
          isOpen={!!toast}
          message={toast}
          duration={3000}
          onDidDismiss={() => setToast('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default SyncView;
