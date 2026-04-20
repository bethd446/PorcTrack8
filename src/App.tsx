import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { IonApp } from '@ionic/react';
import { kvGet } from './services/kvStore';
import OnboardingFlow from './features/onboarding/OnboardingFlow';
import AgritechLayout from './components/AgritechLayout';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

import { FarmProvider } from './context/FarmContext';
import AgritechNavV2, { QuickActionsProvider } from './components/AgritechNavV2';
import { loadChecklistDefinitions } from './services/checklistService';

// Lazy loading — chaque écran dans son propre chunk pour réduire le bundle initial
// Cockpit agritech remplace Dashboard (Dashboard legacy supprimé — Cockpit = route `/`).
const Cockpit = React.lazy(() => import(/* webpackChunkName: "cockpit" */ './components/Cockpit'));
const TableView = React.lazy(() => import(/* webpackChunkName: "table-view" */ './features/tables/TableView'));
const BandesView = React.lazy(() => import(/* webpackChunkName: "bandes" */ './features/tables/BandesView'));
const CheptelView = React.lazy(() => import(/* webpackChunkName: "cheptel" */ './features/tables/CheptelView'));
const AnimalDetailView = React.lazy(() => import(/* webpackChunkName: "animal-detail" */ './features/tables/AnimalDetailView'));
const ControleQuotidien = React.lazy(() => import(/* webpackChunkName: "controle" */ './features/controle/ControleQuotidien'));
const ChecklistFlow = React.lazy(() => import(/* webpackChunkName: "checklist" */ './features/controle/ChecklistFlow'));
const AuditView = React.lazy(() => import(/* webpackChunkName: "audit" */ './features/controle/AuditView'));
const SyncView = React.lazy(() => import(/* webpackChunkName: "sync" */ './features/controle/SyncView'));
const ProtocolsView = React.lazy(() => import(/* webpackChunkName: "protocoles" */ './features/protocoles/ProtocolsView'));
const AlertsView = React.lazy(() => import(/* webpackChunkName: "alertes" */ './features/tables/AlertsView'));
const SettingsPage = React.lazy(() => import(/* webpackChunkName: "settings" */ './components/SystemManagement').then(m => ({ default: m.SettingsPage })));

// New agritech hub placeholders (lazy).
const TroupeauHub = React.lazy(() => import(/* webpackChunkName: "troupeau-hub" */ './features/hubs/TroupeauHub'));
const CyclesHub = React.lazy(() => import(/* webpackChunkName: "cycles-hub" */ './features/hubs/CyclesHub'));
const RessourcesHub = React.lazy(() => import(/* webpackChunkName: "ressources-hub" */ './features/hubs/RessourcesHub'));
const PilotageHub = React.lazy(() => import(/* webpackChunkName: "pilotage-hub" */ './features/hubs/PilotageHub'));

// Agritech troupeau sub-screens (new dense lists — coexist with /cheptel).
const TruiesListView = React.lazy(() => import(/* webpackChunkName: "truies-list" */ './features/troupeau/TruiesListView'));

// Agritech ressources sub-screens.
const PlanAlimentationView = React.lazy(() => import(/* webpackChunkName: "plan-alim" */ './features/ressources/PlanAlimentationView'));
const FormulesView = React.lazy(() => import(/* webpackChunkName: "formules" */ './features/ressources/FormulesView'));
const PharmacieView = React.lazy(() => import(/* webpackChunkName: "pharmacie" */ './features/ressources/PharmacieView'));
const AlimentsView = React.lazy(() => import(/* webpackChunkName: "aliments" */ './features/ressources/AlimentsView'));

// Agritech pilotage sub-screens (Sprint 3 livrés).
const PerfKpiView = React.lazy(() => import(/* webpackChunkName: "pilotage-perf" */ './features/pilotage/PerfKpiView'));
const FinancesView = React.lazy(() => import(/* webpackChunkName: "pilotage-finances" */ './features/pilotage/FinancesView'));
const BandeDetailView = React.lazy(() => import(/* webpackChunkName: "troupeau-bande-detail" */ './features/troupeau/BandeDetailView'));
const RapportFinancierView = React.lazy(() => import(/* webpackChunkName: "pilotage-rapport" */ './features/pilotage/RapportFinancierView'));
const ForecastView = React.lazy(() => import(/* webpackChunkName: "pilotage-previsions" */ './features/pilotage/ForecastView'));

// Agritech cycles sub-screens (Sprint 2 livrés).
const ReproCalendarView = React.lazy(() => import(/* webpackChunkName: "cycle-repro" */ './features/cycles/ReproCalendarView'));
const MaterniteView = React.lazy(() => import(/* webpackChunkName: "cycle-maternite" */ './features/cycles/MaterniteView'));
const PostSevrageView = React.lazy(() => import(/* webpackChunkName: "cycle-postsevrage" */ './features/cycles/PostSevrageView'));
const EngraissementView = React.lazy(() => import(/* webpackChunkName: "cycle-engraissement" */ './features/cycles/EngraissementView'));
const FinitionView = React.lazy(() => import(/* webpackChunkName: "cycle-finition" */ './features/cycles/FinitionView'));

// Aide / Support (non lazy : petit, consulté fréquemment par porcher).
const AideView = React.lazy(() => import(/* webpackChunkName: "aide" */ './features/help/AideView'));

const AppContent = () => {
  useEffect(() => {
    loadChecklistDefinitions();
  }, []);

  const [showOnboarding, setShowOnboarding] = useState<boolean>(
    () => kvGet('onboarding_done') !== '1'
  );

  if (showOnboarding) {
    return (
      <IonApp>
        <AgritechLayout withNav={false}>
          <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
        </AgritechLayout>
      </IonApp>
    );
  }

  return (
    <IonApp>
      <React.Suspense fallback={
        <div className="flex flex-col items-center justify-center h-screen bg-white">
          <div className="animate-pulse-soft flex flex-col items-center gap-5">
            <img src="/images/icon.svg" alt="PorcTrack" className="w-16 h-16 rounded-xl" />
            <div className="space-y-1 text-center">
              <p className="text-[18px] font-bold text-gray-900">PorcTrack</p>
              <p className="text-[12px] text-gray-400">Intelligence Terrain</p>
            </div>
          </div>
        </div>
      }>
        <QuickActionsProvider>
        <Routes>
          {/* ── Legacy routes (preserved for compat) ─────────────────── */}
          <Route path="/" element={<Cockpit />} />
          <Route path="/controle" element={<ControleQuotidien />} />
          <Route path="/cheptel" element={<CheptelView />} />
          <Route path="/cheptel/truie/:id" element={<AnimalDetailView mode="TRUIE" />} />
          <Route path="/cheptel/verrat/:id" element={<AnimalDetailView mode="VERRAT" />} />
          <Route path="/bandes" element={<BandesView />} />
          <Route path="/bandes/:bandeId" element={<BandesView />} />
          <Route path="/sante" element={<TableView tableKey="JOURNAL_SANTE" />} />
          <Route path="/stock" element={<AlimentsView />} />
          <Route path="/stock/aliments" element={<AlimentsView />} />
          <Route path="/stock/veto" element={<TableView tableKey="STOCK_VETO" />} />
          <Route path="/protocoles" element={<ProtocolsView />} />
          <Route path="/checklist/:name" element={<ChecklistFlow />} />
          <Route path="/audit" element={<AuditView />} />
          <Route path="/alerts" element={<AlertsView />} />
          <Route path="/sync" element={<SyncView />} />
          <Route path="/more" element={<SettingsPage />} />
          <Route path="/aide" element={<AideView />} />

          {/* ── New agritech hubs ─────────────────────────────────────── */}
          <Route path="/troupeau" element={<TroupeauHub />} />
          <Route path="/cycles" element={<CyclesHub />} />
          <Route path="/ressources" element={<RessourcesHub />} />
          <Route path="/pilotage" element={<PilotageHub />} />

          {/* ── Troupeau sub-routes (new dense lists — coexist with /cheptel) ── */}
          <Route path="/troupeau/truies" element={<TruiesListView />} />
          <Route path="/troupeau/verrats" element={<CheptelView initialTab="VERRAT" />} />
          <Route path="/troupeau/truies/:id" element={<AnimalDetailView mode="TRUIE" />} />
          <Route path="/troupeau/verrats/:id" element={<AnimalDetailView mode="VERRAT" />} />
          <Route path="/troupeau/bandes" element={<BandesView />} />
          <Route path="/troupeau/bandes/:bandeId" element={<BandeDetailView />} />

          {/* ── Cycles sub-routes (Sprint 2 livrés — vues opérationnelles) ─ */}
          <Route path="/cycles/repro" element={<ReproCalendarView />} />
          <Route path="/cycles/maternite" element={<MaterniteView />} />
          <Route path="/cycles/post-sevrage" element={<PostSevrageView />} />
          <Route path="/cycles/engraissement" element={<EngraissementView />} />
          <Route path="/cycles/finition" element={<FinitionView />} />

          {/* ── Pilotage sub-routes (redirects onto legacy + ComingSoon) ── */}
          <Route path="/pilotage/alertes" element={<Navigate to="/alerts" replace />} />
          <Route path="/pilotage/reglages" element={<Navigate to="/more" replace />} />
          <Route path="/pilotage/audit" element={<Navigate to="/audit" replace />} />
          <Route path="/pilotage/perf" element={<PerfKpiView />} />
          <Route path="/pilotage/finances" element={<FinancesView />} />
          <Route path="/pilotage/finances/rapport" element={<RapportFinancierView />} />
          <Route path="/pilotage/rapports" element={<RapportFinancierView />} />
          <Route path="/pilotage/previsions" element={<ForecastView />} />

          {/* ── Ressources sub-routes ─────────────────────────────────── */}
          <Route path="/ressources/aliments" element={<AlimentsView />} />
          <Route path="/ressources/aliments/plan" element={<PlanAlimentationView />} />
          <Route path="/ressources/aliments/formules" element={<FormulesView />} />
          <Route path="/ressources/veto" element={<TableView tableKey="STOCK_VETO" />} />
          <Route path="/ressources/pharmacie" element={<PharmacieView />} />
        </Routes>
        <AgritechNavV2 />
        </QuickActionsProvider>
      </React.Suspense>
    </IonApp>
  );
};

export default function App() {
  return (
    <Router>
      <FarmProvider>
        <AppContent />
      </FarmProvider>
    </Router>
  );
}
