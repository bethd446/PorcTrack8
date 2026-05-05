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
import { useFarm } from '../../context/FarmContext';
import { BottomNavV70 } from '../components/v70/BottomNav';
import { UIPreferencesProvider } from '../context/UIPreferencesContext';
import { TodayV70 } from '../pages/TodayV70';
import { AnimalsV70 } from '../pages/AnimalsV70';
import { PerformanceV70 } from '../pages/PerformanceV70';
import { ReproV70 } from '../pages/ReproV70';
import { ReglagesV70 } from '../pages/ReglagesV70';
import { EncyclopediaPage } from '../pages/EncyclopediaPage';
import { OnboardingEduPage } from '../pages/OnboardingEduPage';

// Pages détail legacy réutilisées dans le shell V70 — câblage Option B
// (refonte fiches détail dédiées V70 = chantier V71+).
const TruieDetailView = React.lazy(() =>
  import('../../features/troupeau/TruieDetailView').then((m) => ({ default: m.default })),
);
const VerratDetailView = React.lazy(() =>
  import('../../features/troupeau/VerratDetailView').then((m) => ({ default: m.default })),
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
const SettingsPage = React.lazy(() =>
  import('../../components/SystemManagement').then((m) => ({ default: m.SettingsPage })),
);
const RessourcesHub = React.lazy(() =>
  import('../../features/hubs/RessourcesHub').then((m) => ({ default: m.default })),
);
const ProtocolsView = React.lazy(() =>
  import('../../features/protocoles/ProtocolsView').then((m) => ({ default: m.default })),
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
const PlanAlimentationView = React.lazy(() =>
  import('../../features/ressources/PlanAlimentationView').then((m) => ({ default: m.default })),
);
const FournisseursView = React.lazy(() =>
  import('../../features/ressources/FournisseursView').then((m) => ({ default: m.default })),
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
  const handleClose = useCallback(() => navigate(-1), [navigate]);
  const handleRefresh = useCallback(() => { void refreshData(true); }, [refreshData]);

  if (!bandeTyped) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: 'var(--pt-muted)', marginBottom: 16 }}>Bande introuvable</p>
        <button
          type="button"
          onClick={handleClose}
          style={{ padding: '10px 24px', background: 'var(--pt-primary)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
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
    <div className="v70-root" style={{ minHeight: '100vh', paddingBottom: 80, background: 'var(--pt-bg)' }}>
      <Suspense fallback={<div style={{ padding: 24 }}>Chargement…</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<TodayV70 />} />

          {/* Fiches détail legacy (réutilisées tant que V70 n'a pas de fiches dédiées) */}
          <Route path="/troupeau/truies/:id" element={<TruieDetailView />} />
          <Route path="/troupeau/verrats/:id" element={<VerratDetailView />} />
          <Route path="/troupeau/bandes/:bandeId" element={<BandeDetailRouteV70 />} />
          <Route path="/troupeau/loges/:id" element={<LogeDetailView />} />
          <Route path="/troupeau/*" element={<AnimalsV70 />} />

          <Route path="/reproduction/*" element={<ReproV70 />} />
          <Route path="/performance/*" element={<PerformanceV70 />} />

          <Route path="/reglages" element={<ReglagesV70 />} />
          <Route path="/reglages/encyclopedie" element={<EncyclopediaPage />} />
          <Route path="/reglages/onboarding" element={<OnboardingRoute />} />

          {/* Routes legacy critiques rendues dans shell V70 (câblage Option B) */}
          <Route path="/controle" element={<ControleQuotidien />} />
          <Route path="/reglages/systeme" element={<SettingsPage />} />
          <Route path="/protocoles" element={<ProtocolsView />} />
          <Route path="/alerts" element={<AlertsView />} />

          {/* Ressources */}
          <Route path="/ressources" element={<RessourcesHub />} />
          <Route path="/ressources/aliments" element={<AlimentsView />} />
          <Route path="/ressources/aliments/plan" element={<PlanAlimentationView />} />
          <Route path="/ressources/aliments/formules" element={<FormulesView />} />
          <Route path="/ressources/pharmacie" element={<PharmacieView />} />
          <Route path="/fournisseurs" element={<FournisseursView />} />

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

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
      </Suspense>
      <BottomNavV70 />
    </div>
  </UIPreferencesProvider>
);
