import React, { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
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

import { FarmProvider } from './context/FarmContext';
import { usePageFabConfig, Fab } from './design-system';
import { AuthProvider } from './context/AuthContext';
import SupabaseProtectedRoute from './components/auth/ProtectedRoute';
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
void import('./v70/theme/v70-tokens.css');
void import('./v70/theme/v70-global.css');

import { QuickActionsProvider } from './components/AgritechNavV2';
import { ToastProvider } from './context/ToastContext';
import { GlobalSearchProvider } from './context/GlobalSearchContext';
import { loadChecklistDefinitions } from './services/checklistService';

// Lazy : FAB et widgets non critiques au LCP, montés au shell mais ouverts uniquement sur interaction
const SaisirFAB = React.lazy(() => import(/* webpackChunkName: "saisir-fab" */ './components/SaisirFAB'));
const ChatbotWidget = React.lazy(() =>
  import(/* webpackChunkName: "chatbot-widget" */ './features/chatbot').then(m => ({ default: m.ChatbotWidget })),
);

const OnboardingWizard = React.lazy(() => import(/* webpackChunkName: "onboarding-wizard" */ './features/onboarding/OnboardingWizard'));

const SuspenseFallback = () => (
  <div
    className="flex flex-col items-center justify-center h-screen"
    style={{ background: 'var(--bg-app)' }}
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
          <ToastProvider>
          <OnboardingGate />
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
          </ToastProvider>
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
