import React, { useCallback, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
} from 'react-router-dom';
import { IonApp } from '@ionic/react';
import OnboardingFlow from './features/onboarding/OnboardingFlow';
import AgritechLayout from './components/AgritechLayout';
import { supabase } from './services/supabaseClient';
import { useAuth } from './context/AuthContext';

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

import { FarmProvider, useFarm } from './context/FarmContext';
import { usePageFab } from './lib/usePageFab';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SupabaseProtectedRoute from './components/auth/ProtectedRoute';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import AuthCallback from './components/auth/AuthCallback';
import AdminRoute from './components/auth/AdminRoute';
const ResetPassword = React.lazy(() => import(/* webpackChunkName: "reset-password" */ './components/auth/ResetPassword'));
import SmartRoot from './components/SmartRoot';
import About from './pages/About';
import Privacy from './pages/Privacy';
import CGU from './pages/CGU';
import NotFound from './pages/NotFound';

const AdminDashboard = React.lazy(() => import('./features/admin/AdminDashboard'));
import AgritechNavV2, { QuickActionsProvider } from './components/AgritechNavV2';
import { GlobalSearchProvider } from './context/GlobalSearchContext';
import { loadChecklistDefinitions } from './services/checklistService';
import PendingBandesBanner from './components/onboarding/PendingBandesBanner';

// Lazy : FAB et widgets non critiques au LCP, montés au shell mais ouverts uniquement sur interaction
const SaisirFAB = React.lazy(() => import(/* webpackChunkName: "saisir-fab" */ './components/SaisirFAB'));
const ChatbotWidget = React.lazy(() =>
  import(/* webpackChunkName: "chatbot-widget" */ './features/chatbot').then(m => ({ default: m.ChatbotWidget })),
);

// Lazy loading — chaque écran dans son propre chunk pour réduire le bundle initial
const TableView = React.lazy(() => import(/* webpackChunkName: "table-view" */ './features/tables/TableView'));
// CheptelView retirée des routes (AUDIT-3). Conservée @deprecated dans
// features/tables/CheptelView.tsx pour archive — plus aucun import.
const ControleQuotidien = React.lazy(() => import(/* webpackChunkName: "controle" */ './features/controle/ControleQuotidien'));
const ChecklistFlow = React.lazy(() => import(/* webpackChunkName: "checklist" */ './features/controle/ChecklistFlow'));
const AuditView = React.lazy(() => import(/* webpackChunkName: "audit" */ './features/controle/AuditView'));
const ProtocolsView = React.lazy(() => import(/* webpackChunkName: "protocoles" */ './features/protocoles/ProtocolsView'));
const AlertsView = React.lazy(() => import(/* webpackChunkName: "alertes" */ './features/tables/AlertsView'));
const SettingsPage = React.lazy(() => import(/* webpackChunkName: "settings" */ './components/SystemManagement').then(m => ({ default: m.SettingsPage })));

const TodayHub = React.lazy(() => import(/* webpackChunkName: "today-hub" */ './features/today/TodayHub'));
const DesignSystemView = React.lazy(() => import(/* webpackChunkName: "design-system" */ './features/design-system/DesignSystemView'));
const OutilsView = React.lazy(() => import(/* webpackChunkName: "outils" */ './features/outils/OutilsView'));
const TroupeauHub = React.lazy(() => import(/* webpackChunkName: "troupeau-hub" */ './features/hubs/TroupeauHub'));
const CyclesHub = React.lazy(() => import(/* webpackChunkName: "cycles-hub" */ './features/hubs/CyclesHub'));
const RessourcesHub = React.lazy(() => import(/* webpackChunkName: "ressources-hub" */ './features/hubs/RessourcesHub'));
const PilotageHub = React.lazy(() => import(/* webpackChunkName: "pilotage-hub" */ './features/hubs/PilotageHub'));

const PlanAlimentationView = React.lazy(() => import(/* webpackChunkName: "plan-alim" */ './features/ressources/PlanAlimentationView'));
const FormulesView = React.lazy(() => import(/* webpackChunkName: "formules" */ './features/ressources/FormulesView'));
const PharmacieView = React.lazy(() => import(/* webpackChunkName: "pharmacie" */ './features/ressources/PharmacieView'));
const AlimentsView = React.lazy(() => import(/* webpackChunkName: "aliments" */ './features/ressources/AlimentsView'));
const FournisseursView = React.lazy(() => import(/* webpackChunkName: "fournisseurs" */ './features/ressources/FournisseursView'));

const PerfKpiView = React.lazy(() => import(/* webpackChunkName: "pilotage-perf" */ './features/pilotage/PerfKpiView'));
const FinancesView = React.lazy(() => import(/* webpackChunkName: "pilotage-finances" */ './features/pilotage/FinancesView'));
// AUDIT-V25-FIX : route pointe désormais vers tables/bandes/BandeDetailView
// qui contient les sections V6-B (sources/loge) + V25 Sprint B+D (porcelets
// individuels + signalement maladie). features/troupeau/BandeDetailView.tsx
// est legacy orphelin à supprimer en cleanup futur.
const BandeDetailView = React.lazy(() => import(/* webpackChunkName: "troupeau-bande-detail" */ './features/tables/bandes/BandeDetailView'));
const TruieDetailView = React.lazy(() => import(/* webpackChunkName: "troupeau-truie-detail" */ './features/troupeau/TruieDetailView'));
const VerratDetailView = React.lazy(() => import(/* webpackChunkName: "troupeau-verrat-detail" */ './features/troupeau/VerratDetailView'));
const BatimentsView = React.lazy(() => import(/* webpackChunkName: "troupeau-batiments" */ './features/troupeau/BatimentsView'));
const LogeDetailView = React.lazy(() => import(/* webpackChunkName: "troupeau-loge-detail" */ './features/troupeau/LogeDetailView'));
const RapportFinancierView = React.lazy(() => import(/* webpackChunkName: "pilotage-rapport" */ './features/pilotage/RapportFinancierView'));
const ForecastView = React.lazy(() => import(/* webpackChunkName: "pilotage-previsions" */ './features/pilotage/ForecastView'));

const ReproCalendarView = React.lazy(() => import(/* webpackChunkName: "cycle-repro" */ './features/cycles/ReproCalendarView'));
const ReproductionHub = React.lazy(() => import(/* webpackChunkName: "reproduction-hub" */ './features/reproduction/ReproductionHub'));
const ReproductionLotsView = React.lazy(() => import(/* webpackChunkName: "reproduction-lots" */ './features/reproduction/ReproductionLotsView'));
const ClassementView = React.lazy(() => import(/* webpackChunkName: "troupeau-classement" */ './features/troupeau/ClassementView'));
const MaterniteView = React.lazy(() => import(/* webpackChunkName: "cycle-maternite" */ './features/cycles/MaterniteView'));
const PostSevrageView = React.lazy(() => import(/* webpackChunkName: "cycle-postsevrage" */ './features/cycles/PostSevrageView'));
const CroissanceView = React.lazy(() => import(/* webpackChunkName: "cycle-croissance" */ './features/cycles/CroissanceView'));
const EngraissementView = React.lazy(() => import(/* webpackChunkName: "cycle-engraissement" */ './features/cycles/EngraissementView'));
const FinitionView = React.lazy(() => import(/* webpackChunkName: "cycle-finition" */ './features/cycles/FinitionView'));
const SortieCalendarView = React.lazy(() => import(/* webpackChunkName: "cycle-sortie" */ './features/cycles/SortieCalendarView'));

const AideView = React.lazy(() => import(/* webpackChunkName: "aide" */ './features/help/AideView'));
const OnboardingWizard = React.lazy(() => import(/* webpackChunkName: "onboarding-wizard" */ './features/onboarding/OnboardingWizard'));
const PendingBandesView = React.lazy(() => import(/* webpackChunkName: "pending-bandes-view" */ './features/onboarding/PendingBandesView'));

// V27 — Mise Bas confirmation + Daily check Sous mère (forms montés en plein écran via routes dédiées)
const QuickConfirmMiseBasForm = React.lazy(() => import(/* webpackChunkName: "v27-confirm-mb" */ './components/forms/QuickConfirmMiseBasForm'));
const DailyMBChecklistForm = React.lazy(() => import(/* webpackChunkName: "v27-daily-mb" */ './components/forms/DailyMBChecklistForm'));

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

/**
 * Wizard 10 questions (RT5). Route `/onboarding` lazy : route protégée
 * distincte rendue sans navigation/sidebar.
 */
const OnboardingWizardRoute: React.FC = () => (
  <AgritechLayout withNav={false} withSidebar={false}>
    <OnboardingWizard />
  </AgritechLayout>
);

/**
 * Effet : au login, vérifie si l'onboarding a été complété (col
 * `troupeaux.onboarding_completed_at`). Sinon redirige vers `/onboarding`.
 * Ne s'exécute que si l'utilisateur n'est pas déjà sur /onboarding ou sur
 * une route publique.
 */
const OnboardingGate: React.FC = () => {
  const { user, profileLoaded } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    if (!user || !profileLoaded) return;
    const skip =
      pathname.startsWith('/onboarding') ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/signup') ||
      pathname.startsWith('/auth/');
    if (skip) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await supabase
          .from('troupeaux')
          .select('onboarding_completed_at')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cancelled) return;
        if (!data?.onboarding_completed_at) {
          navigate('/onboarding', { replace: true });
        }
      } catch {
        // Silencieux : si la requête échoue (offline, RLS), on ne bloque pas.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, profileLoaded, pathname, navigate]);
  return null;
};

/**
 * Redirige `/troupeau/truies?statut=...` vers `/troupeau?view=truies&statut=...`.
 * On consolide la liste des truies dans TroupeauHub (onglet TRUIES) avec CTA + nouvelle truie.
 */
const TroupeauTruiesRedirect: React.FC = () => {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.set('view', 'truies');
  return <Navigate to={`/troupeau?${params.toString()}`} replace />;
};

const SaisirFABMount: React.FC = () => {
  // V31-FIX-PACK-01 : présence contextuelle via usePageFab.
  // Le FAB n'est plus monté partout — uniquement sur les pages où la saisie
  // est l'action principale (élevage, repro, cycles, stocks véto/aliments).
  const enabled = usePageFab();
  if (!enabled) return null;
  return (
    <React.Suspense fallback={null}>
      <SaisirFAB />
    </React.Suspense>
  );
};

/**
 * BannerMount — affiche le PendingBandesBanner uniquement sur les écrans
 * Hub principaux (Today + hubs racine). Pas sur les détails ou parcours
 * guidés (checklist), sinon il devient envahissant.
 */
const BannerMount: React.FC = () => {
  const { pathname } = useLocation();
  const isHubRoot =
    pathname === '/today' ||
    pathname === '/troupeau' ||
    pathname === '/cycles' ||
    pathname === '/ressources' ||
    pathname === '/pilotage';
  if (!isHubRoot) return null;
  return <PendingBandesBanner />;
};

/**
 * V27 — Wrappers route plein écran pour les forms MB / Daily Check.
 * Ouvre le form en mode "isOpen=true permanent" tant que la route est montée ;
 * fermeture = navigate back.
 */
const ConfirmMiseBasRoute: React.FC = () => {
  const { saillieId = '' } = useParams<{ saillieId: string }>();
  const navigate = useNavigate();
  const handleClose = useCallback(() => {
    navigate(-1);
  }, [navigate]);
  return (
    <QuickConfirmMiseBasForm
      isOpen={true}
      onClose={handleClose}
      saillieId={saillieId}
      onSuccess={() => navigate('/cycles/maternite', { replace: true })}
    />
  );
};

const DailyCheckRoute: React.FC = () => {
  const { batchId = '' } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const handleClose = useCallback(() => {
    navigate(-1);
  }, [navigate]);
  return (
    <DailyMBChecklistForm
      isOpen={true}
      onClose={handleClose}
      batchId={batchId}
      onSuccess={() => navigate(-1)}
    />
  );
};

/**
 * V28-FIX — wrapper pour route /troupeau/bandes/:bandeId
 *
 * AVANT : la route rendait <BandeDetailView /> sans props → crash JS
 * "Cannot read properties of undefined (reading 'id')" car le composant
 * exige bande/header/meta/onClose/onRefresh.
 *
 * APRÈS : récupère la bande via useFarm(), construit une AggregatedBande
 * minimaliste (le composant utilise principalement bande.id et fait son
 * propre fetch interne via getBandeById()), et passe les props requises.
 */
const BandeDetailRoute: React.FC = () => {
  const { bandeId = '' } = useParams<{ bandeId: string }>();
  const navigate = useNavigate();
  const { getBandeById, refreshData } = useFarm();
  const bandeTyped = getBandeById(bandeId);
  const handleClose = useCallback(() => navigate(-1), [navigate]);
  const handleRefresh = useCallback(() => {
    void refreshData(true);
  }, [refreshData]);

  if (!bandeTyped) {
    return (
      <div className="agritech-root p-10 text-center flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-[14px] uppercase text-text-1">Bande introuvable</p>
        <button
          type="button"
          onClick={handleClose}
          className="pressable h-11 px-6 rounded-md bg-accent text-bg-0 text-[12px] uppercase tracking-wide"
        >
          Retour
        </button>
      </div>
    );
  }

  const aggregated = {
    id: bandeTyped.id,
    count: 1,
    truie: bandeTyped.truie ?? null,
    boucleMere: bandeTyped.boucleMere ?? null,
    dateMB: bandeTyped.dateMB ?? null,
    age: null,
    nv: bandeTyped.nv ?? 0,
    morts: bandeTyped.morts ?? 0,
    vivants: bandeTyped.vivants ?? bandeTyped.nv ?? 0,
    status: bandeTyped.statut ?? null,
    hasAlert: false,
    rows: [],
  };

  return (
    <BandeDetailView
      bande={aggregated}
      header={[]}
      meta={null}
      onClose={handleClose}
      onRefresh={handleRefresh}
    />
  );
};

const AppShell: React.FC = () => (
  <GlobalSearchProvider>
    <BannerMount />
    <Routes>
      <Route path="/" element={<Navigate to="/today" replace />} />
      <Route path="/today" element={<TodayHub />} />
      <Route path="/controle" element={<ControleQuotidien />} />

      <Route path="/sante" element={<TableView tableKey="JOURNAL_SANTE" />} />

      <Route path="/protocoles" element={<ProtocolsView />} />
      <Route path="/checklist/:name" element={<ChecklistFlow />} />
      <Route path="/audit" element={<AuditView />} />
      <Route path="/alerts" element={<AlertsView />} />
      <Route path="/alertes" element={<Navigate to="/alerts" replace />} />
      <Route path="/more" element={<SettingsPage />} />
      <Route path="/outils" element={<OutilsView />} />
      <Route path="/aide" element={<AideView />} />
      <Route path="/design-system" element={<DesignSystemView />} />

      {/* V27-VALIDATION : écran de validation des bandes PENDING */}
      <Route path="/onboarding/bandes-pending" element={<PendingBandesView />} />

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
      <Route path="/troupeau/truies" element={<TroupeauTruiesRedirect />} />
      {/* AUDIT-3 : redirige vers le hub unifié TroupeauHub onglet VERRATS
          pour cohérence visuelle (CheptelView legacy a un layout différent
          des autres tabs cheptel). CheptelView reste @deprecated. */}
      <Route path="/troupeau/verrats" element={<Navigate to="/troupeau?view=verrats" replace />} />
      <Route path="/troupeau/truies/:id" element={<TruieDetailView />} />
      <Route path="/troupeau/verrats/:id" element={<VerratDetailView />} />
      {/* Route legacy /troupeau/bandes : la vue Sheets BandesView est cassée
          (config colonne Portée). On redirige vers le hub TROUPEAU onglet
          BANDES qui consomme bandes Supabase. BandesView reste @deprecated. */}
      <Route path="/troupeau/bandes" element={<Navigate to="/troupeau?view=bandes" replace />} />
      <Route path="/troupeau/bandes/:bandeId" element={<BandeDetailRoute />} />
      {/* AUDIT-3 : redirige vers le hub unifié pour cohérence visuelle. */}
      <Route path="/troupeau/batiments" element={<Navigate to="/troupeau?view=batiments" replace />} />
      <Route path="/troupeau/classement" element={<ClassementView />} />
      {/* V6-C : page détail loge (référentiel V24) */}
      <Route path="/troupeau/loges/:id" element={<LogeDetailView />} />

      {/* Reproduction (V22-B3 hub fil conducteur) */}
      <Route path="/repro" element={<Navigate to="/reproduction" replace />} />
      <Route path="/reproduction" element={<ReproductionHub />} />
      <Route path="/reproduction/lots" element={<ReproductionLotsView />} />

      {/* Cycles sub-routes */}
      <Route path="/cycles/repro" element={<ReproCalendarView />} />
      <Route path="/cycles/maternite" element={<MaterniteView />} />
      <Route path="/cycles/post-sevrage" element={<PostSevrageView />} />
      <Route path="/cycles/croissance" element={<CroissanceView />} />
      <Route path="/cycles/engraissement" element={<EngraissementView />} />
      <Route path="/cycles/finition" element={<FinitionView />} />
      <Route path="/cycles/sortie" element={<SortieCalendarView />} />

      {/* V27 — Confirmation MB rigoureuse (plein écran via route dédiée) */}
      <Route path="/cycles/confirmer-mb/:saillieId" element={<ConfirmMiseBasRoute />} />
      {/* V27 — Daily check 10 questions pour bandes "Sous mère" */}
      <Route path="/troupeau/daily-check/:batchId" element={<DailyCheckRoute />} />

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

      {/* Carnet fournisseurs (V21-D1) */}
      <Route path="/fournisseurs" element={<FournisseursView />} />

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
    <React.Suspense fallback={null}>
      <ChatbotWidget />
    </React.Suspense>
    <SaisirFABMount />
  </GlobalSearchProvider>
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
          <OnboardingGate />
          <Routes>
            {/* ── Routes publiques ─────────────────────────────────────── */}
            <Route path="/" element={<SmartRoot />} />
            <Route path="/a-propos" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cgu" element={<CGU />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* ── Onboarding (route protégée distincte) ────────────────── */}
            <Route
              path="/onboarding"
              element={
                <SupabaseProtectedRoute>
                  <OnboardingWizardRoute />
                </SupabaseProtectedRoute>
              }
            />
            <Route
              path="/onboarding-legacy"
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

