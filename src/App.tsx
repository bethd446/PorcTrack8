import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet } from '@ionic/react';

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
import Navigation from './components/Navigation';
import { loadChecklistDefinitions } from './services/checklistService';

// Lazy loading — chaque écran dans son propre chunk pour réduire le bundle initial
const Dashboard = React.lazy(() => import(/* webpackChunkName: "dashboard" */ './components/Dashboard'));
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

// Placeholder for missing components
const StockHub = () => (
  <TableView tableKey="STOCK_ALIMENTS" />
);

const AppContent = () => {
  useEffect(() => {
    loadChecklistDefinitions();
  }, []);

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
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/controle" element={<ControleQuotidien />} />
          <Route path="/cheptel" element={<CheptelView />} />
          <Route path="/cheptel/truie/:id" element={<AnimalDetailView mode="TRUIE" />} />
          <Route path="/cheptel/verrat/:id" element={<AnimalDetailView mode="VERRAT" />} />
          <Route path="/bandes" element={<BandesView />} />
          <Route path="/bandes/:bandeId" element={<BandesView />} />
          <Route path="/sante" element={<TableView tableKey="JOURNAL_SANTE" />} />
          <Route path="/stock" element={<StockHub />} />
          <Route path="/stock/aliments" element={<TableView tableKey="STOCK_ALIMENTS" />} />
          <Route path="/stock/veto" element={<TableView tableKey="STOCK_VETO" />} />
          <Route path="/protocoles" element={<ProtocolsView />} />
          <Route path="/checklist/:name" element={<ChecklistFlow />} />
          <Route path="/audit" element={<AuditView />} />
          <Route path="/alerts" element={<AlertsView />} />
          <Route path="/sync" element={<SyncView />} />
          <Route path="/more" element={<SettingsPage />} />
        </Routes>
      </React.Suspense>
      <Navigation />
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
