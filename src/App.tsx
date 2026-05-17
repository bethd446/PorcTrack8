import React, { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from 'react-router-dom';
import { IonApp } from '@ionic/react';

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
import { usePageFabConfig, Fab } from './design-system';
import { AuthProvider } from './context/AuthContext';
import SupabaseProtectedRoute from './components/auth/ProtectedRoute';
import { RootErrorBoundary } from './components/RootErrorBoundary';
import PorceletsReorgGate from './components/auth/PorceletsReorgGate';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import AuthCallback from './components/auth/AuthCallback';
const ResetPassword = React.lazy(() => import(/* webpackChunkName: "reset-password" */ './components/auth/ResetPassword'));
import SmartRoot from './components/SmartRoot';
import About from './pages/About';
import Privacy from './pages/Privacy';
import CGU from './pages/CGU';
const LandingScrollytelling = React.lazy(
  () =>
    import(
      /* webpackChunkName: "landing-v2" */ './pages/landing-v2/LandingScrollytelling'
    ),
);

// V70 — chargé via lazy import. v70Enabled est désormais true par défaut
// (commit 986414d). Le shell V70 est le routeur principal.
const V70Routes = React.lazy(() =>
  import(/* webpackChunkName: "v70-routes" */ './v70/router/V70Routes').then((m) => ({
    default: m.V70Routes,
  })),
);

// CSS V70 — préchargés au boot.
// Design reset 2026-05-17 (Lot 3) : v70-tokens.css supprimé → fallback
// neutre dans src/index.css. v70-global.css reste jusqu'au Lot 4.
void import('./v70/theme/v70-global.css');

import { QuickActionsProvider } from './context/QuickActionsContext';
import QuickActionsHost from './components/quick-actions/QuickActionsHost';
import { ToastProvider } from './context/ToastContext';
import { GlobalSearchProvider } from './context/GlobalSearchContext';
import { loadChecklistDefinitions } from './services/checklistService';

// Lazy : FAB et widgets non critiques au LCP, montés au shell mais ouverts uniquement sur interaction
const SaisirFAB = React.lazy(() => import(/* webpackChunkName: "saisir-fab" */ './components/SaisirFAB'));
import { NotificationsBridge } from './components/NotificationsBridge';
const ChatbotWidget = React.lazy(() =>
  import(/* webpackChunkName: "chatbot-widget" */ './features/chatbot').then(m => ({ default: m.ChatbotWidget })),
);

const SuspenseFallback = () => (
  <div
    className="flex flex-col items-center justify-center h-screen"
    style={{ background: 'var(--pt-bg-app)' }}
  >
    <div className="animate-pulse-soft flex flex-col items-center gap-5">
      <picture>
        <source srcSet="/images/v73/icons/app-icon-1024.webp" type="image/webp" />
        <img
          src="/images/v73/icons/app-icon-1024.jpg"
          alt="PorcTrack"
          className="w-20 h-20 rounded-2xl"
          style={{ boxShadow: '0 6px 24px rgba(6,78,59,0.18)' }}
        />
      </picture>
      <div className="space-y-1 text-center">
        <p className="text-[18px] font-bold text-gray-900">PorcTrack</p>
        <p className="text-[12px] text-gray-500">Intelligence Terrain</p>
      </div>
    </div>
  </div>
);

// v3.5.0 — Suppression nette des onboardings legacy (OnboardingFlow,
// OnboardingWizard, OnboardingV2Wizard, OnboardingV2Gate). Désormais le seul
// onboarding actif est le bandeau profil V80 A4 intégré dans /today
// (5 étapes minimaliste : Type d'élevage + races + capacités + check-list).

const SaisirFABMount: React.FC = () => {
  // V40 R3 : usePageFabConfig retourne null | true | {action, label}.
  //   null  => rien (page sans saisie ou contextuel désactivé)
  //   true  => SaisirFAB générique rond
  //   { action, label } => Fab DS V2 extended (ex: + MISE-BAS sur /reproduction)
  const config = usePageFabConfig();
  if (config === null) return null;
  if (config === true) {
    return (
      <React.Suspense fallback={null}>
        <SaisirFAB />
      </React.Suspense>
    );
  }
  return (
    <Fab
      label={config.label}
      onClick={() => window.dispatchEvent(new CustomEvent('pt-fab-action', { detail: config }))}
      ariaLabel={`Action contextuelle : ${config.label}`}
    />
  );
};

/**
 * AppShell — V70 routes (5 onglets).
 *
 * Le LegacyAppShell V44/V45 a été supprimé (cleanup V70 — 2026-05-07).
 * Pour rollback : restaurer depuis git history avant ce commit.
 */
const AppShell: React.FC = () => (
  <GlobalSearchProvider>
    <V70Routes />
    <NotificationsBridge />
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
      if (import.meta.env.DEV) { console.warn('[App] loadChecklistDefinitions failed (non-fatal):', err); }
    });
  }, []);

  return (
    <IonApp>
      <React.Suspense fallback={<SuspenseFallback />}>
        <QuickActionsProvider>
          <QuickActionsHost />
          <ToastProvider>
          {/* v3.5.0 : OnboardingGate + OnboardingV2Gate supprimés (forced redirect retiré).
              Le bandeau profil V80 A4 sur /today reste seul guide pour new user. */}
          <PorceletsReorgGate />
          <Routes>
            {/* ── Routes publiques ─────────────────────────────────────── */}
            <Route path="/" element={<SmartRoot />} />
            <Route path="/landing-v2" element={<LandingScrollytelling />} />
            <Route path="/a-propos" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cgu" element={<CGU />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* v3.5.0 : routes /onboarding et /onboarding-legacy supprimées.
                Le bandeau profil V80 A4 dans /today remplace les wizards. */}

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
          </ToastProvider>
        </QuickActionsProvider>
      </React.Suspense>
    </IonApp>
  );
};

export default function App() {
  return (
    <RootErrorBoundary>
      <Router>
        <AuthProvider>
          <FarmProvider>
            <AppContent />
          </FarmProvider>
        </AuthProvider>
      </Router>
    </RootErrorBoundary>
  );
}
