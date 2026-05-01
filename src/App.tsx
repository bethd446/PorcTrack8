import React, { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import { IonApp } from '@ionic/react';
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
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SupabaseProtectedRoute from './components/auth/ProtectedRoute';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import AuthCallback from './components/auth/AuthCallback';
import AdminRoute from './components/auth/AdminRoute';
import SmartRoot from './components/SmartRoot';
import About from './pages/About';
import Privacy from './pages/Privacy';
import CGU from './pages/CGU';
import NotFound from './pages/NotFound';

const AdminDashboard = React.lazy(() => import('./features/admin/AdminDashboard'));
import AgritechNavV2, { QuickActionsProvider } from './components/AgritechNavV2';
import { loadChecklistDefinitions } from './services/checklistService';
import { ChatbotWidget } from './features/chatbot';

// Lazy loading — chaque écran dans son propre chunk pour réduire le bundle initial
const TableView = React.lazy(() => import(/* webpackChunkName: "table-view" */ './features/tables/TableView'));
const BandesView = React.lazy(() => import(/* webpackChunkName: "bandes" */ './features/tables/BandesView'));
const CheptelView = React.lazy(() => import(/* webpackChunkName: "cheptel" */ './features/tables/CheptelView'));
const ControleQuotidien = React.lazy(() => import(/* webpackChunkName: "controle" */ './features/controle/ControleQuotidien'));
const ChecklistFlow = React.lazy(() => import(/* webpackChunkName: "checklist" */ './features/controle/ChecklistFlow'));
const AuditView = React.lazy(() => import(/* webpackChunkName: "audit" */ './features/controle/AuditView'));
const ProtocolsView = React.lazy(() => import(/* webpackChunkName: "protocoles" */ './features/protocoles/ProtocolsView'));
const AlertsView = React.lazy(() => import(/* webpackChunkName: "alertes" */ './features/tables/AlertsView'));
const SettingsPage = React.lazy(() => import(/* webpackChunkName: "settings" */ './components/SystemManagement').then(m => ({ default: m.SettingsPage })));

const TodayHub = React.lazy(() => import(/* webpackChunkName: "today-hub" */ './features/today/TodayHub'));
const TroupeauHub = React.lazy(() => import(/* webpackChunkName: "troupeau-hub" */ './features/hubs/TroupeauHub'));
const CyclesHub = React.lazy(() => import(/* webpackChunkName: "cycles-hub" */ './features/hubs/CyclesHub'));
const RessourcesHub = React.lazy(() => import(/* webpackChunkName: "ressources-hub" */ './features/hubs/RessourcesHub'));
const PilotageHub = React.lazy(() => import(/* webpackChunkName: "pilotage-hub" */ './features/hubs/PilotageHub'));

const TruiesListView = React.lazy(() => import(/* webpackChunkName: "truies-list" */ './features/troupeau/TruiesListView'));

const PlanAlimentationView = React.lazy(() => import(/* webpackChunkName: "plan-alim" */ './features/ressources/PlanAlimentationView'));
const FormulesView = React.lazy(() => import(/* webpackChunkName: "formules" */ './features/ressources/FormulesView'));
const PharmacieView = React.lazy(() => import(/* webpackChunkName: "pharmacie" */ './features/ressources/PharmacieView'));
const AlimentsView = React.lazy(() => import(/* webpackChunkName: "aliments" */ './features/ressources/AlimentsView'));

const PerfKpiView = React.lazy(() => import(/* webpackChunkName: "pilotage-perf" */ './features/pilotage/PerfKpiView'));
const FinancesView = React.lazy(() => import(/* webpackChunkName: "pilotage-finances" */ './features/pilotage/FinancesView'));
const BandeDetailView = React.lazy(() => import(/* webpackChunkName: "troupeau-bande-detail" */ './features/troupeau/BandeDetailView'));
const TruieDetailView = React.lazy(() => import(/* webpackChunkName: "troupeau-truie-detail" */ './features/troupeau/TruieDetailView'));
const VerratDetailView = React.lazy(() => import(/* webpackChunkName: "troupeau-verrat-detail" */ './features/troupeau/VerratDetailView'));
const BatimentsView = React.lazy(() => import(/* webpackChunkName: "troupeau-batiments" */ './features/troupeau/BatimentsView'));
const RapportFinancierView = React.lazy(() => import(/* webpackChunkName: "pilotage-rapport" */ './features/pilotage/RapportFinancierView'));
const ForecastView = React.lazy(() => import(/* webpackChunkName: "pilotage-previsions" */ './features/pilotage/ForecastView'));

const ReproCalendarView = React.lazy(() => import(/* webpackChunkName: "cycle-repro" */ './features/cycles/ReproCalendarView'));
const MaterniteView = React.lazy(() => import(/* webpackChunkName: "cycle-maternite" */ './features/cycles/MaterniteView'));
const PostSevrageView = React.lazy(() => import(/* webpackChunkName: "cycle-postsevrage" */ './features/cycles/PostSevrageView'));
const CroissanceView = React.lazy(() => import(/* webpackChunkName: "cycle-croissance" */ './features/cycles/CroissanceView'));
const EngraissementView = React.lazy(() => import(/* webpackChunkName: "cycle-engraissement" */ './features/cycles/EngraissementView'));
const FinitionView = React.lazy(() => import(/* webpackChunkName: "cycle-finition" */ './features/cycles/FinitionView'));
const SortieCalendarView = React.lazy(() => import(/* webpackChunkName: "cycle-sortie" */ './features/cycles/SortieCalendarView'));

const AideView = React.lazy(() => import(/* webpackChunkName: "aide" */ './features/help/AideView'));

const SuspenseFallback = () => (
  <div
    className="flex flex-col items-center justify-center h-screen"
    style={{ background: 'var(--bg-app, #f0f4f3)' }}
  >
    <div className="animate-pulse-soft flex flex-col items-center gap-5">
      <img src="/images/icon.svg" alt="PorcTrack" className="w-16 h-16 rounded-xl" />
      <div className="space-y-1 text-center">
        <p className="text-[18px] font-bold text-gray-900">PorcTrack</p>
        <p className="text-[12px] text-gray-400">Intelligence Terrain</p>
      </div>
    </div>
  </div>
);

const OnboardingRoute: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AgritechLayout withNav={false} withSidebar={false}>
      <OnboardingFlow onComplete={() => navigate('/today', { replace: true })} />
    </AgritechLayout>
  );
};

const AppShell: React.FC = () => (
  <>
    <Routes>
      <Route path="/" element={<Navigate to="/today" replace />} />
      <Route path="/today" element={<TodayHub />} />
      <Route path="/controle" element={<ControleQuotidien />} />

      <Route path="/sante" element={<TableView tableKey="JOURNAL_SANTE" />} />

      <Route path="/protocoles" element={<ProtocolsView />} />
      <Route path="/checklist/:name" element={<ChecklistFlow />} />
      <Route path="/audit" element={<AuditView />} />
      <Route path="/alerts" element={<AlertsView />} />
      <Route path="/more" element={<SettingsPage />} />
      <Route path="/aide" element={<AideView />} />

      {/* Agritech hubs */}
      <Route path="/troupeau" element={<TroupeauHub />} />
      <Route path="/cycles" element={<CyclesHub />} />
      <Route path="/ressources" element={<RessourcesHub />} />
      <Route
        path="/pilotage"
        element={
          <ProtectedRoute allowedRoles={['OWNER']}>
            <PilotageHub />
          </ProtectedRoute>
        }
      />

      {/* Troupeau sub-routes */}
      <Route path="/troupeau/truies" element={<TruiesListView />} />
      <Route path="/troupeau/verrats" element={<CheptelView initialTab="VERRAT" />} />
      <Route path="/troupeau/truies/:id" element={<TruieDetailView />} />
      <Route path="/troupeau/verrats/:id" element={<VerratDetailView />} />
      <Route path="/troupeau/bandes" element={<BandesView />} />
      <Route path="/troupeau/bandes/:bandeId" element={<BandeDetailView />} />
      <Route path="/troupeau/batiments" element={<BatimentsView />} />

      {/* Cycles sub-routes */}
      <Route path="/cycles/repro" element={<ReproCalendarView />} />
      <Route path="/cycles/maternite" element={<MaterniteView />} />
      <Route path="/cycles/post-sevrage" element={<PostSevrageView />} />
      <Route path="/cycles/croissance" element={<CroissanceView />} />
      <Route path="/cycles/engraissement" element={<EngraissementView />} />
      <Route path="/cycles/finition" element={<FinitionView />} />
      <Route path="/cycles/sortie" element={<SortieCalendarView />} />

      {/* Pilotage sub-routes */}
      <Route
        path="/pilotage/perf"
        element={
          <ProtectedRoute allowedRoles={['OWNER']}>
            <PerfKpiView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pilotage/finances"
        element={
          <ProtectedRoute allowedRoles={['OWNER']}>
            <FinancesView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pilotage/finances/rapport"
        element={
          <ProtectedRoute allowedRoles={['OWNER']}>
            <RapportFinancierView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pilotage/previsions"
        element={
          <ProtectedRoute allowedRoles={['OWNER']}>
            <ForecastView />
          </ProtectedRoute>
        }
      />

      {/* Ressources sub-routes */}
      <Route path="/ressources/aliments" element={<AlimentsView />} />
      <Route path="/ressources/aliments/plan" element={<PlanAlimentationView />} />
      <Route path="/ressources/aliments/formules" element={<FormulesView />} />
      <Route path="/ressources/pharmacie" element={<PharmacieView />} />

      {/* Admin (rôle ADMIN requis) */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />

      {/* Catch-all à l'intérieur de l'app (auth required) */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    <AgritechNavV2 />
    <ChatbotWidget />
  </>
);

const AppContent = () => {
  useEffect(() => {
    // Non-bloquant : si GAS échoue, on n'empêche pas le rendu de l'app.
    loadChecklistDefinitions().catch((err) => {
      console.warn('[App] loadChecklistDefinitions failed (non-fatal):', err);
    });
  }, []);

  return (
    <IonApp>
      <React.Suspense fallback={<SuspenseFallback />}>
        <QuickActionsProvider>
          <Routes>
            {/* ── Routes publiques ─────────────────────────────────────── */}
            <Route path="/" element={<SmartRoot />} />
            <Route path="/a-propos" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cgu" element={<CGU />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* ── Onboarding (route protégée distincte) ────────────────── */}
            <Route
              path="/onboarding"
              element={
                <SupabaseProtectedRoute>
                  <OnboardingRoute />
                </SupabaseProtectedRoute>
              }
            />

            {/* ── App protégée (toutes les autres routes) ──────────────── */}
            <Route
              path="*"
              element={
                <SupabaseProtectedRoute>
                  <AppShell />
                </SupabaseProtectedRoute>
              }
            />
          </Routes>
        </QuickActionsProvider>
      </React.Suspense>
    </IonApp>
  );
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <FarmProvider>
          <AppContent />
        </FarmProvider>
      </AuthProvider>
    </Router>
  );
}

