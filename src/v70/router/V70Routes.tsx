/**
 * V70 — Routes du nouveau système (5 onglets).
 *
 * Activé via VITE_V70_ENABLED=true. Sinon, App.tsx utilise les routes legacy.
 *
 * Phase 3E : sous-routes /reglages livrées (page principale + encyclopédie +
 * tutoriel onboarding).
 */
import React, { Suspense, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { differenceInCalendarDays } from 'date-fns';
import { useFarm } from '../../context/FarmContext';
import { safeDate } from '../../lib/truieHelpers';
import { useEntityWithRetry } from '../../hooks/useEntityWithRetry';
import { SpinnerCenter, EntityNotFoundCard } from '../components/v70/EntityNotFoundGuard';
import { BottomNavV70 } from '../components/v70/BottomNav';
import { UIPreferencesProvider } from '../context/UIPreferencesContext';
import { V70ErrorBoundary } from '../components/V70ErrorBoundary';
import { TodayV70 } from '../pages/TodayV70';
import { AnimalsV70 } from '../pages/AnimalsV70';
import { PerformanceV70 } from '../pages/PerformanceV70';
import { ReproV70 } from '../pages/ReproV70';
import { ReglagesV70 } from '../pages/ReglagesV70';
import { MaFermeV70 } from '../pages/MaFermeV70';
import { MonEquipeV70 } from '../pages/MonEquipeV70';
import { EncyclopediaPage } from '../pages/EncyclopediaPage';
import { OnboardingEduPage } from '../pages/OnboardingEduPage';
import { SynchronisationV70 } from '../pages/SynchronisationV70';

// V80 P0 #2 — page Engraissement (lots / pesées hebdo / GMQ / mortalité).
const EngraissementV70 = React.lazy(() =>
  import('../pages/EngraissementV70').then((m) => ({ default: m.EngraissementV70 })),
);

// Pages détail legacy réutilisées dans le shell V70 — câblage Option B
// (refonte fiches détail dédiées V70 = chantier V71+).
const TruieDetailView = React.lazy(() =>
  import('../../features/troupeau/TruieDetailView').then((m) => ({ default: m.default })),
);
const VerratDetailView = React.lazy(() =>
  import('../../features/troupeau/VerratDetailView').then((m) => ({ default: m.default })),
);
const PorceletDetailView = React.lazy(() =>
  import('../../features/troupeau/PorceletDetailView').then((m) => ({ default: m.default })),
);
const BandeDetailView = React.lazy(() =>
  import('../../features/tables/bandes/BandeDetailView').then((m) => ({ default: m.default })),
);
const LogeDetailView = React.lazy(() =>
  import('../../features/troupeau/LogeDetailView').then((m) => ({ default: m.default })),
);
const ControleQuotidien = React.lazy(() =>
  import('../../features/controle/ControleQuotidien').then((m) => ({ default: m.default })),
);
const PorceletsReorgWizard = React.lazy(() =>
  import('../../features/onboarding/PorceletsReorgWizard').then((m) => ({ default: m.default })),
);
// v3.5.0 — OnboardingV2Wizard supprimé (suppression onboardings legacy).
const SettingsPage = React.lazy(() =>
  import('../../components/SystemManagement').then((m) => ({ default: m.SettingsPage })),
);
const RessourcesHub = React.lazy(() =>
  import('../../features/hubs/RessourcesHub').then((m) => ({ default: m.default })),
);
const ProtocolsView = React.lazy(() =>
  import('../../features/protocoles/ProtocolsView').then((m) => ({ default: m.default })),
);
const ProtocolDetailView = React.lazy(() =>
  import('../../features/protocoles/ProtocolDetailView').then((m) => ({ default: m.default })),
);
const AlimentsView = React.lazy(() =>
  import('../../features/ressources/AlimentsView').then((m) => ({ default: m.default })),
);
const PharmacieView = React.lazy(() =>
  import('../../features/ressources/PharmacieView').then((m) => ({ default: m.default })),
);
const FormulesView = React.lazy(() =>
  import('../../features/ressources/FormulesView').then((m) => ({ default: m.default })),
);
const FormuleDetailView = React.lazy(() =>
  import('../../features/ressources/FormuleDetailView').then((m) => ({ default: m.default })),
);
const PlanAlimentationView = React.lazy(() =>
  import('../../features/ressources/PlanAlimentationView').then((m) => ({ default: m.default })),
);
const FournisseursView = React.lazy(() =>
  import('../../features/ressources/FournisseursView').then((m) => ({ default: m.default })),
);
const FournisseurDetailView = React.lazy(() =>
  import('../../features/ressources/FournisseurDetailView').then((m) => ({ default: m.default })),
);
const AlertsView = React.lazy(() =>
  import('../../features/tables/AlertsView').then((m) => ({ default: m.default })),
);
const FinancesView = React.lazy(() =>
  import('../../features/pilotage/FinancesView').then((m) => ({ default: m.default })),
);
const RapportFinancierView = React.lazy(() =>
  import('../../features/pilotage/RapportFinancierView').then((m) => ({ default: m.default })),
);
const MariusChatFullscreen = React.lazy(() =>
  import('../../features/chatbot/MariusChatFullscreen').then((m) => ({
    default: m.default,
  })),
);

const OnboardingRoute: React.FC = () => {
  const navigate = useNavigate();
  return <OnboardingEduPage onComplete={() => navigate('/reglages')} />;
};

/**
 * BandeDetailRoute V70 — wrapper qui agrège la prop `bande` attendue par
 * BandeDetailView (cf. App.tsx ligne 303 pour le wrapper legacy équivalent).
 */
const BandeDetailRouteV70: React.FC = () => {
  const { bandeId = '' } = useParams<{ bandeId: string }>();
  const navigate = useNavigate();
  const { getBandeById, refreshData } = useFarm();
  const bandeTyped = getBandeById(bandeId);
  const guard = useEntityWithRetry(bandeTyped);
  const handleClose = useCallback(() => navigate(-1), [navigate]);
  const handleRefresh = useCallback(() => { void refreshData(true); }, [refreshData]);

  if (guard.state === 'loading') return <SpinnerCenter />;
  if (guard.state === 'not-found') return <EntityNotFoundCard label="bande" onBack={handleClose} />;

  const bandeReady = guard.entity;
  const dateMBParsed = safeDate(bandeReady.dateMB);
  const ageDays = dateMBParsed
    ? Math.max(0, differenceInCalendarDays(new Date(), dateMBParsed))
    : null;
  const aggregated = {
    id: bandeReady.id,
    count: 1,
    truie: bandeReady.truie ?? null,
    boucleMere: bandeReady.boucleMere ?? null,
    dateMB: bandeReady.dateMB ?? null,
    age: ageDays,
    nv: bandeReady.nv ?? 0,
    morts: bandeReady.morts ?? 0,
    vivants: bandeReady.vivants ?? bandeReady.nv ?? 0,
    status: bandeReady.statut ?? null,
    hasAlert: false,
    rows: [],
  };

  return (
    <BandeDetailView
      bande={aggregated as never}
      header={[]}
      meta={null}
      onClose={handleClose}
      onRefresh={handleRefresh}
    />
  );
};

export const V70Routes: React.FC = () => (
  <UIPreferencesProvider>
    <div
      className="v70-root"
      style={{
        // V71 P1.6 — body Ionic est position:fixed + overflow:hidden, donc il faut
        // récupérer le scroll ICI (sinon contenu débordé jamais accessible).
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px) + 16px)',
        background: 'var(--pt-bg)',
      }}
    >
      <Suspense fallback={<div style={{ padding: 24 }}>Chargement…</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<V70ErrorBoundary pageName="Aujourd'hui"><TodayV70 /></V70ErrorBoundary>} />

          {/* Fiches détail legacy (réutilisées tant que V70 n'a pas de fiches dédiées) */}
          <Route path="/troupeau/truies/:id" element={<TruieDetailView />} />
          <Route path="/troupeau/verrats/:id" element={<VerratDetailView />} />
          <Route path="/troupeau/porcelets/:id" element={<PorceletDetailView />} />
          <Route path="/troupeau/bandes/:bandeId" element={<BandeDetailRouteV70 />} />
          <Route path="/troupeau/loges/:id" element={<LogeDetailView />} />
          <Route path="/troupeau/*" element={<V70ErrorBoundary pageName="Elevage"><AnimalsV70 /></V70ErrorBoundary>} />

          <Route path="/reproduction/*" element={<V70ErrorBoundary pageName="Reproduction"><ReproV70 /></V70ErrorBoundary>} />
          <Route path="/performance/*" element={<V70ErrorBoundary pageName="Performance"><PerformanceV70 /></V70ErrorBoundary>} />

          {/* V80 P0 #2 — Module Engraissement (lots, pesées, GMQ, mortalité). */}
          <Route path="/engraissement" element={<V70ErrorBoundary pageName="Engraissement"><EngraissementV70 /></V70ErrorBoundary>} />
          <Route path="/lots" element={<Navigate to="/engraissement" replace />} />

          <Route path="/reglages" element={<V70ErrorBoundary pageName="Reglages"><ReglagesV70 /></V70ErrorBoundary>} />
          <Route path="/reglages/ma-ferme" element={<V70ErrorBoundary pageName="Ma ferme"><MaFermeV70 /></V70ErrorBoundary>} />
          <Route path="/reglages/mon-equipe" element={<V70ErrorBoundary pageName="Mon équipe"><MonEquipeV70 /></V70ErrorBoundary>} />
          <Route path="/reglages/encyclopedie" element={<EncyclopediaPage />} />
          <Route path="/reglages/onboarding" element={<OnboardingRoute />} />
          <Route path="/reglages/sync" element={<V70ErrorBoundary pageName="Synchronisation"><SynchronisationV70 /></V70ErrorBoundary>} />

          {/* V71-P3 — Wizard ré-organisation porcelets→bandes→loges (bloquant) */}
          <Route path="/porcelets-reorg" element={<PorceletsReorgWizard />} />
          {/* v3.5.0 : route /onboarding-v2 supprimée — bandeau /today V80 A4 remplace. */}

          {/* Routes legacy critiques rendues dans shell V70 (câblage Option B) */}
          <Route path="/controle" element={<ControleQuotidien />} />
          <Route path="/reglages/systeme" element={<SettingsPage />} />
          <Route path="/protocoles" element={<ProtocolsView />} />
          <Route path="/protocoles/:id" element={<ProtocolDetailView />} />
          <Route path="/alerts" element={<AlertsView />} />
          {/* V77 — /audit fusionné dans /alerts (doublon sémantique supprimé) */}
          <Route path="/audit" element={<Navigate to="/alerts" replace />} />

          {/* Ressources */}
          <Route path="/ressources" element={<RessourcesHub />} />
          <Route path="/ressources/aliments" element={<AlimentsView />} />
          <Route path="/ressources/aliments/plan" element={<PlanAlimentationView />} />
          <Route path="/ressources/aliments/formules" element={<FormulesView />} />
          <Route path="/ressources/formules" element={<FormulesView />} />
          <Route path="/ressources/formules/:id" element={<FormuleDetailView />} />
          <Route path="/ressources/pharmacie" element={<PharmacieView />} />
          <Route path="/ressources/fournisseurs" element={<FournisseursView />} />
          <Route path="/ressources/fournisseurs/:id" element={<FournisseurDetailView />} />
          <Route path="/fournisseurs" element={<Navigate to="/ressources/fournisseurs" replace />} />

          {/* Pilotage détail (rapport, finances V70 réutilisent legacy) */}
          <Route path="/pilotage/finances/details" element={<FinancesView />} />
          <Route path="/pilotage/rapport" element={<RapportFinancierView />} />

          {/* Redirects legacy V44/V45 → V70 (Phase 4) */}
          {/* /cycles/* legacy → /reproduction?tab=...&phase=* (V71 FIX #4) */}
          <Route path="/cycles" element={<Navigate to="/reproduction?tab=agenda" replace />} />
          <Route path="/cycles/repro" element={<Navigate to="/reproduction?tab=agenda" replace />} />
          <Route path="/cycles/maternite" element={<Navigate to="/reproduction?tab=en-cours&phase=maternite" replace />} />
          <Route path="/cycles/post-sevrage" element={<Navigate to="/reproduction?tab=en-cours&phase=post-sevrage" replace />} />
          <Route path="/cycles/croissance" element={<Navigate to="/reproduction?tab=en-cours&phase=croissance" replace />} />
          <Route path="/cycles/finition" element={<Navigate to="/reproduction?tab=en-cours&phase=finition" replace />} />
          <Route path="/cycles/engraissement" element={<Navigate to="/reproduction?tab=en-cours&phase=engraissement" replace />} />
          <Route path="/cycles/sortie" element={<Navigate to="/reproduction?tab=historique" replace />} />

          {/* /pilotage/* → /performance */}
          <Route path="/pilotage" element={<Navigate to="/performance" replace />} />
          <Route path="/pilotage/perf" element={<Navigate to="/performance?tab=kpis" replace />} />
          <Route path="/pilotage/finances" element={<Navigate to="/performance?tab=finances" replace />} />
          <Route path="/pilotage/previsions" element={<Navigate to="/performance?tab=previsions" replace />} />

          {/* Aliases vers V70 */}
          <Route path="/repro" element={<Navigate to="/reproduction" replace />} />
          <Route path="/more" element={<Navigate to="/reglages" replace />} />
          <Route path="/admin" element={<Navigate to="/reglages" replace />} />
          <Route path="/aide" element={<Navigate to="/reglages/encyclopedie" replace />} />
          <Route path="/notes" element={<Navigate to="/reglages" replace />} />

          {/* Conservés Phase 2 */}
          <Route path="/plus" element={<Navigate to="/reglages" replace />} />
          <Route path="/outils" element={<Navigate to="/today" replace />} />
          <Route path="/alertes" element={<Navigate to="/today" replace />} />

          {/* V77 — Marius chat plein écran (Sprint 7 livrable, route câblée P1-1) */}
          <Route path="/marius" element={<MariusChatFullscreen />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
      </Suspense>
      <BottomNavV70 />
    </div>
  </UIPreferencesProvider>
);
