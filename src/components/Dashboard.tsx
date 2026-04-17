import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonHeader, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import {
  ShieldCheck, ChevronRight, Calendar, AlertTriangle, Syringe,
  StickyNote, Heart, CheckCircle2, CloudOff, RefreshCw, Layers, Leaf, Package
} from 'lucide-react';
import { useFarm } from '../context/FarmContext';
import { getQueueStatus } from '../services/offlineQueue';
import PremiumHeader from './PremiumHeader';
import { DashboardSkeleton } from './SkeletonCard';
import QuickSaillieForm from './forms/QuickSaillieForm';

/* ═════════════════════════════════════════════════════════════════════════
   DASHBOARD "AUJOURD'HUI"
   ─────────────────────────────────────────────────────────────────────────
   Principe UX : cet écran guide le porcher dans sa journée.
   Il ne montre pas des données — il montre QUOI FAIRE.

   Hiérarchie :
   1. Checklist matin (action primaire, impossible à rater)
   2. Actions urgentes du jour (max 3, avec boutons d'action)
   3. Quick actions terrain (Soin, Note, Saillie)
   4. Résumé rapide troupeau (info secondaire, pas prioritaire)
   ═════════════════════════════════════════════════════════════════════════ */

const Dashboard = () => {
  const { truies, verrats, bandes, stockAliment, sante, loading, refreshData, dataSource, alerts, criticalAlertCount } = useFarm();
  const navigate = useNavigate();
  const userRole = localStorage.getItem('user_role') || 'PORCHER';
  const userName = localStorage.getItem('user_name') || '';
  const pendingCount = getQueueStatus().pending;
  const [showSaillie, setShowSaillie] = useState(false);

  // ── Checklist du jour faite ? ──────────────────────────────────────────
  const checklistDone = useMemo(() => sante.some(h =>
    h.typeSoin === 'CHECKLIST_DONE' && h.cibleId === 'DAILY' &&
    h.date === new Date().toLocaleDateString('fr-FR')
  ), [sante]);

  // ── Actions urgentes (max 3 les plus critiques) ────────────────────────
  const urgentActions = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      description: string;
      action: string;
      route: string;
      priority: 'critical' | 'high' | 'normal';
      icon: React.ReactNode;
    }> = [];

    // Stocks épuisés → action : aller vérifier les stocks
    const stocksCritiques = stockAliment.filter(s => s.statut !== 'OK').length;
    if (stocksCritiques > 0) {
      items.push({
        id: 'stock',
        title: `${stocksCritiques} stock${stocksCritiques > 1 ? 's' : ''} en rupture`,
        description: 'Aliments ou véto à réapprovisionner',
        action: 'Voir les stocks',
        route: '/stock',
        priority: 'critical',
        icon: <Package size={18} className="text-white" />,
      });
    }

    // Mises-bas imminentes → action : préparer la salle
    const today = new Date();
    const mbImminentes = truies.filter(t => {
      if (!t.dateMBPrevue) return false;
      const p = t.dateMBPrevue.split('/');
      if (p.length !== 3) return false;
      const d = (new Date(+p[2], +p[1]-1, +p[0]).getTime() - today.getTime()) / 86400000;
      return d >= -2 && d <= 3;
    });
    if (mbImminentes.length > 0) {
      items.push({
        id: 'mb',
        title: `${mbImminentes.length} mise${mbImminentes.length > 1 ? 's' : ''}-bas imminente${mbImminentes.length > 1 ? 's' : ''}`,
        description: mbImminentes.map(t => t.displayId).slice(0, 3).join(', '),
        action: 'Voir les truies',
        route: '/cheptel',
        priority: 'high',
        icon: <Heart size={18} className="text-white" />,
      });
    }

    // Mortalité sur bandes → action : investiguer
    const bandesMortalite = bandes.filter(b => (b.morts ?? 0) > 0).length;
    if (bandesMortalite > 0) {
      items.push({
        id: 'mortalite',
        title: `Mortalité sur ${bandesMortalite} bande${bandesMortalite > 1 ? 's' : ''}`,
        description: 'Vérifier et enregistrer les causes',
        action: 'Voir les bandes',
        route: '/bandes',
        priority: 'high',
        icon: <AlertTriangle size={18} className="text-white" />,
      });
    }

    // Alertes GTTT non traitées
    const alertesAction = alerts.filter(a => a.requiresAction).length;
    if (alertesAction > 0 && items.length < 3) {
      items.push({
        id: 'alertes',
        title: `${alertesAction} alerte${alertesAction > 1 ? 's' : ''} à confirmer`,
        description: 'Actions terrain en attente de validation',
        action: 'Traiter les alertes',
        route: '/alerts',
        priority: 'normal',
        icon: <AlertTriangle size={18} className="text-white" />,
      });
    }

    return items.slice(0, 3);
  }, [stockAliment, truies, bandes, alerts]);

  // ── Résumé troupeau (compact) ──────────────────────────────────────────
  const herdSummary = useMemo(() => ({
    truies: truies.length,
    verrats: verrats.length,
    bandes: bandes.length,
    gestantes: truies.filter(t => t.statut?.toUpperCase().includes('GEST')).length,
  }), [truies, verrats, bandes]);

  // ── Greeting basé sur l'heure avec emoji météo ────────────────────────
  const { greeting, emoji } = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return { greeting: 'Bonjour', emoji: '☀️' };
    if (h < 18) return { greeting: 'Bon après-midi', emoji: '🌤️' };
    return { greeting: 'Bonsoir', emoji: '🌙' };
  }, []);

  const priorityColors = {
    critical: { bg: '#EF4444', light: '#FEF2F2', border: '#FECDD3' },
    high:     { bg: '#D97706', light: '#FFFBEB', border: '#FDE68A' },
    normal:   { bg: '#059669', light: '#ECFDF5', border: '#D1FAE5' },
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <PremiumHeader
          title={`${emoji} ${greeting}${userName ? `, ${userName}` : ''}`}
          subtitle={`Ferme A130 · ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
        />
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={(e) => refreshData().then(() => e.detail.complete())}>
          <IonRefresherContent />
        </IonRefresher>

        {loading && truies.length === 0 ? (
          <DashboardSkeleton />
        ) : (
          <div className="px-5 pb-32 pt-4 space-y-6">

            {/* ── Offline banner ─────────────────────────────────────── */}
            {dataSource && dataSource !== 'NETWORK' && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                dataSource === 'FALLBACK' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
              }`}>
                {dataSource === 'FALLBACK'
                  ? <CloudOff size={16} className="text-red-500 flex-shrink-0" />
                  : <RefreshCw size={16} className="text-amber-500 flex-shrink-0" />
                }
                <p className={`text-[13px] flex-1 ${dataSource === 'FALLBACK' ? 'text-red-500' : 'text-amber-600'}`}>
                  {dataSource === 'FALLBACK' ? 'Hors ligne — données en cache' : 'Données en cache'}
                </p>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                ÉTAPE 1 : CHECKLIST QUOTIDIENNE
                C'est LA première action de la journée. Impossible à rater.
                ═══════════════════════════════════════════════════════════ */}
            {!checklistDone ? (
              <button
                onClick={() => navigate('/checklist/DAILY')}
                className="pressable w-full rounded-xl p-6 text-left active:scale-[0.97] transition-transform duration-[160ms] animate-fade-in-up stagger-1 bg-gradient-to-br from-accent-700 to-accent-600"
                style={{
                  boxShadow: '0 8px 32px -4px rgba(27,67,50,0.4)',
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/10">
                    <ShieldCheck size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="ft-heading text-[18px] text-white leading-tight">
                      Commencer votre tour
                    </p>
                    <p className="text-[14px] text-white/60 mt-1">
                      Eau, température, mortalité, anomalies
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-white/40 flex-shrink-0 mt-1" />
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-pork animate-pulse" />
                  <span className="text-[12px] text-white/40">Audit terrain non réalisé aujourd'hui</span>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-4 bg-accent-50 border border-accent-100 rounded-xl px-5 py-4 animate-fade-in-up stagger-1">
                <CheckCircle2 size={22} className="text-accent-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="ft-heading text-[15px] text-accent-700">Tour réalisé</p>
                  <p className="text-[12px] text-accent-400">Checklist complétée aujourd'hui</p>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                ÉTAPE 2 : ACTIONS URGENTES DU JOUR
                Max 3 items. Chaque item dit QUOI faire et a un bouton.
                ═══════════════════════════════════════════════════════════ */}
            {urgentActions.length > 0 && (
              <div className="space-y-3 animate-fade-in-up stagger-2">
                <h2 className="ft-heading text-[15px] text-gray-700 px-1 uppercase">
                  À traiter aujourd'hui
                </h2>
                {urgentActions.map((item) => {
                  const colors = priorityColors[item.priority];
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.route)}
                      className="pressable w-full rounded-xl border p-4 flex items-center gap-3 text-left active:scale-[0.97] transition-transform duration-[160ms]"
                      style={{ background: colors.light, borderColor: colors.border }}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: colors.bg }}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="ft-heading text-[14px] text-gray-900">{item.title}</p>
                        <p className="text-[12px] text-gray-500 mt-0.5">{item.description}</p>
                      </div>
                      <span className="text-[12px] font-bold text-accent-600 flex-shrink-0 whitespace-nowrap">
                        {item.action}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                ÉTAPE 3 : ACTIONS RAPIDES TERRAIN
                Les 3 choses que le porcher fait après le tour :
                enregistrer un soin, noter une observation, signaler une saillie
                ═══════════════════════════════════════════════════════════ */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 animate-fade-in-up stagger-3">
              <h2 className="ft-heading text-[15px] text-gray-700 px-1 uppercase">
                Actions rapides
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => navigate('/sante')}
                  className="pressable rounded-xl border border-gray-100 bg-white p-4 flex flex-col items-center gap-2 active:scale-[0.97] transition-transform duration-[160ms]"
                  style={{ boxShadow: '0 1px 3px rgba(28,25,23,0.04)' }}
                >
                  <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
                    <Syringe size={20} className="text-red-500" />
                  </div>
                  <span className="ft-heading text-[13px] text-gray-900">Soin</span>
                  <span className="text-[11px] text-gray-400">Traitement</span>
                </button>

                <button
                  onClick={() => navigate('/controle')}
                  className="pressable rounded-xl border border-gray-100 bg-white p-4 flex flex-col items-center gap-2 active:scale-[0.97] transition-transform duration-[160ms]"
                  style={{ boxShadow: '0 1px 3px rgba(28,25,23,0.04)' }}
                >
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                    <StickyNote size={20} className="text-blue-500" />
                  </div>
                  <span className="ft-heading text-[13px] text-gray-900">Note</span>
                  <span className="text-[11px] text-gray-400">Observation</span>
                </button>

                <button
                  onClick={() => setShowSaillie(true)}
                  className="pressable rounded-xl border border-gray-100 bg-white p-4 flex flex-col items-center gap-2 active:scale-[0.97] transition-transform duration-[160ms]"
                  style={{ boxShadow: '0 1px 3px rgba(28,25,23,0.04)' }}
                >
                  <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Heart size={20} className="text-purple-500" />
                  </div>
                  <span className="ft-heading text-[13px] text-gray-900">Saillie</span>
                  <span className="text-[11px] text-gray-400">Reproduction</span>
                </button>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                INFO SECONDAIRE : Résumé troupeau avec barres de progression
                Compact, pas prioritaire, juste un coup d'œil rapide
                ═══════════════════════════════════════════════════════════ */}
            {herdSummary.truies > 0 && (
              <div className="space-y-3 animate-fade-in-up stagger-4">
                <h2 className="ft-heading text-[15px] text-gray-700 px-1 uppercase">
                  Mon élevage
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {/* Truies avec barre gestantes */}
                  <button onClick={() => navigate('/cheptel')} className="pressable rounded-xl bg-white border border-gray-200 p-4 text-center active:scale-[0.97] transition-transform duration-[160ms]" style={{ boxShadow: '0 1px 3px rgba(28,25,23,0.04)' }}>
                    <p className="ft-values font-bold text-[22px] text-accent-600">{herdSummary.truies}</p>
                    <p className="text-[11px] text-gray-500 mt-1">Truies</p>
                    {herdSummary.gestantes > 0 && (
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-accent-600 font-semibold">{herdSummary.gestantes} gestantes</span>
                        </div>
                        <div className="h-1.5 bg-accent-50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent-500 rounded-full transition-transform duration-[160ms]"
                            style={{ width: `${(herdSummary.gestantes / herdSummary.truies) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </button>
                  {/* Bandes */}
                  <button onClick={() => navigate('/bandes')} className="pressable rounded-xl bg-white border border-gray-200 p-4 text-center active:scale-[0.97] transition-transform duration-[160ms]" style={{ boxShadow: '0 1px 3px rgba(28,25,23,0.04)' }}>
                    <p className="ft-values font-bold text-[22px] text-blue-500">{herdSummary.bandes}</p>
                    <p className="text-[11px] text-gray-500 mt-1">Bandes</p>
                  </button>
                  {/* Verrats */}
                  <button onClick={() => navigate('/cheptel')} className="pressable rounded-xl bg-white border border-gray-200 p-4 text-center active:scale-[0.97] transition-transform duration-[160ms]" style={{ boxShadow: '0 1px 3px rgba(28,25,23,0.04)' }}>
                    <p className="ft-values font-bold text-[22px] text-gray-700">{herdSummary.verrats}</p>
                    <p className="text-[11px] text-gray-500 mt-1">Verrats</p>
                  </button>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-center gap-2 pt-4">
              <div className={`w-1.5 h-1.5 rounded-full ${
                dataSource === 'NETWORK' ? 'bg-accent-500' : dataSource === 'FALLBACK' ? 'bg-red-500' : 'bg-amber-500'
              }`} />
              <p className="text-[11px] text-gray-400">
                PorcTrack · {new Date().toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        )}
      </IonContent>
      <QuickSaillieForm isOpen={showSaillie} onClose={() => setShowSaillie(false)} />
    </IonPage>
  );
};

export default Dashboard;
