import React, { useMemo } from 'react';
import {
  IonPage, IonHeader, IonContent,
  IonRefresher, IonRefresherContent
} from '@ionic/react';
import { AlertTriangle, CheckCircle2, ChevronRight, Clock, Bell, Heart, Package, Layers, Box } from 'lucide-react';
import { useFarm } from '../../context/FarmContext';
import PremiumHeader from '../../components/PremiumHeader';
import { PremiumCard } from '../../components/PremiumUI';
import { alertPriorityColor, alertCategoryIcon, type FarmAlert } from '../../services/alertEngine';
import { getPendingConfirmations, type PendingConfirmation } from '../../services/confirmationQueue';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const AlertsView: React.FC = () => {
  const { alerts, refreshData, loading } = useFarm();
  const [pendingConfirmations, setPendingConfirmations] = React.useState<PendingConfirmation[]>([]);
  const [selectedAlert, setSelectedAlert] = React.useState<{ alert: FarmAlert, confirmId: string } | null>(null);

  React.useEffect(() => {
    getPendingConfirmations().then(setPendingConfirmations);
  }, [alerts]);

  const loadConfirmations = async () => {
    const pc = await getPendingConfirmations();
    setPendingConfirmations(pc);
  };

  const categories = [
    { id: 'ALL', label: 'Toutes', icon: Bell },
    { id: 'REPRO', label: 'Repro', icon: Heart },
    { id: 'SANTE', label: 'Santé', icon: Package },
    { id: 'BANDES', label: 'Bandes', icon: Layers },
    { id: 'STOCK', label: 'Stocks', icon: Box },
  ];

  const [activeCategory, setActiveCategory] = React.useState('ALL');

  const filteredAlerts = useMemo(() => {
    if (activeCategory === 'ALL') return alerts;
    return alerts.filter(a => a.category === activeCategory);
  }, [alerts, activeCategory]);

  // Smart summary counts
  const summary = useMemo(() => ({
    critique: alerts.filter(a => a.priority === 'CRITIQUE').length,
    haute: alerts.filter(a => a.priority === 'HAUTE').length,
    moyenne: alerts.filter(a => a.priority === 'MOYENNE').length,
    actions: alerts.filter(a => a.requiresAction).length,
  }), [alerts]);

  const handleAction = (alert: FarmAlert) => {
    if (!alert.requiresAction) return;
    const confirm = pendingConfirmations.find(p => p.alertId === alert.id);
    if (confirm) {
        setSelectedAlert({ alert, confirmId: confirm.id });
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <PremiumHeader title="Alertes" subtitle="Suivi Technique & Biologique">
          {/* Category filter tabs */}
          <div className="flex gap-2 overflow-x-auto scroll-hide">
            {categories.map(cat => {
              const count = cat.id === 'ALL' ? alerts.length : alerts.filter(a => a.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`pressable flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-colors border ${
                    activeCategory === cat.id
                      ? 'bg-accent-600 text-white border-accent-600 shadow-sm'
                      : 'bg-gray-50 text-gray-500 border-gray-100 active:bg-gray-200'
                  }`}
                >
                  <cat.icon size={14} className="flex-shrink-0" />
                  <span className="ft-heading text-[12px] font-bold uppercase">{cat.label}</span>
                  {count > 0 && (
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md leading-none ft-values ${
                      activeCategory === cat.id ? 'bg-white/20' : 'bg-gray-200'
                    }`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </PremiumHeader>
      </IonHeader>

      <IonContent className="bg-white">
        <IonRefresher slot="fixed" onIonRefresh={(e) => refreshData().then(loadConfirmations).then(() => e.detail.complete())}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="pt-4 pb-32 px-5 space-y-4">

          {/* ── Smart Summary Strip ─────────────────────────────────── */}
          {alerts.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex gap-2 overflow-x-auto scroll-hide">
                {summary.critique > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-100 flex-shrink-0 animate-fade-in-up">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[12px] font-bold text-red-500 ft-values">{summary.critique} critique{summary.critique > 1 ? 's' : ''}</span>
                </div>
              )}
              {summary.haute > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100 flex-shrink-0 animate-fade-in-up stagger-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[12px] font-bold text-amber-500 ft-values">{summary.haute} haute{summary.haute > 1 ? 's' : ''}</span>
                </div>
              )}
              {summary.actions > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent-50 border border-accent-100 flex-shrink-0 animate-fade-in-up stagger-2">
                  <div className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
                  <span className="text-[12px] font-bold text-accent-600 ft-values">{summary.actions} action{summary.actions > 1 ? 's' : ''}</span>
                </div>
              )}
              </div>
            </div>
          )}

          {/* ── Alert List ──────────────────────────────────────────── */}
          {filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CheckCircle2 size={48} className="text-accent-500 mb-4" />
              <p className="ft-heading font-bold text-[16px] text-gray-900 uppercase">Aucune alerte en cours</p>
              <p className="text-[13px] text-gray-400 mt-2">Le troupeau est sous contrôle</p>
            </div>
          ) : (
            filteredAlerts.map((alert, i) => {
              const hasConfirmation = pendingConfirmations.some(p => p.alertId === alert.id);
              const priorityConfig = {
                CRITIQUE: { bgClass: 'bg-red-50', borderClass: 'border-red-100', accentClass: 'text-red-500', accentBg: 'bg-red-500', accentBgLight: 'bg-red-500/10' },
                HAUTE:    { bgClass: 'bg-amber-50', borderClass: 'border-amber-100', accentClass: 'text-amber-500', accentBg: 'bg-amber-500', accentBgLight: 'bg-amber-500/10' },
                MOYENNE:  { bgClass: 'bg-accent-50', borderClass: 'border-accent-100', accentClass: 'text-accent-500', accentBg: 'bg-accent-500', accentBgLight: 'bg-accent-500/10' },
              }[alert.priority] ?? { bgClass: 'bg-gray-100', borderClass: 'border-gray-200', accentClass: 'text-gray-500', accentBg: 'bg-gray-500', accentBgLight: 'bg-gray-500/10' };

              return (
                <button
                  key={alert.id}
                  className={`w-full text-left rounded-xl border p-5 transition-transform duration-[160ms] active:scale-[0.97] animate-fade-in-up relative overflow-hidden pressable shadow-sm ${priorityConfig.bgClass} ${priorityConfig.borderClass}`}
                  style={{
                    animationDelay: `${i * 0.05}s`,
                    boxShadow: '0 1px 2px rgba(28,25,23,0.03)',
                    borderLeft: `3px solid var(--color-${alert.priority})`,
                  }}
                  onClick={() => handleAction(alert)}
                >
                  {/* Top row: icon + title + priority */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white ${priorityConfig.accentBg}`}>
                      {alertCategoryIcon(alert.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="ft-heading text-[14px] font-bold text-gray-900 leading-tight uppercase">{alert.title}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ft-code ${priorityConfig.accentClass} ${priorityConfig.accentBgLight}`}>
                          {alert.priority}
                        </span>
                        <span className="text-[11px] text-gray-400 ft-code">{alert.subjectLabel}</span>
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <p className="text-[13px] text-gray-600 leading-relaxed mb-4">{alert.message}</p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Clock size={12} />
                      <span className="text-[11px]">
                        {formatDistanceToNow(alert.createdAt, { addSuffix: true, locale: fr })}
                      </span>
                    </div>

                    {alert.requiresAction && hasConfirmation ? (
                      <div className={`flex items-center gap-1.5 font-bold text-[12px] px-2 py-1 rounded-lg animate-pulse ${priorityConfig.accentClass} ${priorityConfig.accentBgLight}`}>
                        <span>Action Requise</span>
                        <ChevronRight size={14} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-gray-400 text-[12px]">
                        <span>Détails</span>
                        <ChevronRight size={14} />
                      </div>
                    )}
                  </div>

                  {/* Due date badge */}
                  {alert.dueDate && (
                    <div className="absolute top-0 right-0 bg-gray-900 text-white px-3 py-1 rounded-bl-xl flex items-center gap-1.5">
                      <span className="text-[11px] font-medium ft-code">
                        {alert.dueDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        <ConfirmationModal
            isOpen={!!selectedAlert}
            alert={selectedAlert?.alert || null}
            confirmationId={selectedAlert?.confirmId || null}
            onClose={() => setSelectedAlert(null)}
            onResolved={() => {
                refreshData();
                loadConfirmations();
            }}
        />
      </IonContent>
    </IonPage>
  );
};

export default AlertsView;
