/**
 * V70 — Routes du nouveau système (5 onglets).
 *
 * Activé via VITE_V70_ENABLED=true. Sinon, App.tsx utilise les routes legacy.
 *
 * Phase 3E : sous-routes /reglages livrées (page principale + encyclopédie +
 * tutoriel onboarding).
 */
import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { BottomNavV70 } from '../components/v70/BottomNav';
import { UIPreferencesProvider } from '../context/UIPreferencesContext';
import { TodayV70 } from '../pages/TodayV70';
import { AnimalsV70 } from '../pages/AnimalsV70';
import { PerformanceV70 } from '../pages/PerformanceV70';
import { ReproV70 } from '../pages/ReproV70';
import { ReglagesV70 } from '../pages/ReglagesV70';
import { EncyclopediaPage } from '../pages/EncyclopediaPage';
import { OnboardingEduPage } from '../pages/OnboardingEduPage';

const OnboardingRoute: React.FC = () => {
  const navigate = useNavigate();
  return <OnboardingEduPage onComplete={() => navigate('/reglages')} />;
};

export const V70Routes: React.FC = () => (
  <UIPreferencesProvider>
    <div className="v70-root" style={{ minHeight: '100vh', paddingBottom: 80, background: 'var(--pt-bg)' }}>
      <Suspense fallback={<div style={{ padding: 24 }}>Chargement…</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<TodayV70 />} />
          <Route path="/troupeau/*" element={<AnimalsV70 />} />
          <Route path="/reproduction/*" element={<ReproV70 />} />
          <Route path="/performance/*" element={<PerformanceV70 />} />
          <Route path="/reglages" element={<ReglagesV70 />} />
          <Route path="/reglages/encyclopedie" element={<EncyclopediaPage />} />
          <Route path="/reglages/onboarding" element={<OnboardingRoute />} />

          {/* Redirects legacy V44/V45 → V70 (Phase 4) */}
          {/* /cycles/* → /reproduction?phase=* */}
          <Route path="/cycles" element={<Navigate to="/reproduction?phase=saillie" replace />} />
          <Route path="/cycles/repro" element={<Navigate to="/reproduction?phase=saillie" replace />} />
          <Route path="/cycles/maternite" element={<Navigate to="/reproduction?phase=maternite" replace />} />
          <Route path="/cycles/post-sevrage" element={<Navigate to="/reproduction?phase=post-sevrage" replace />} />
          <Route path="/cycles/croissance" element={<Navigate to="/reproduction?phase=croissance" replace />} />
          <Route path="/cycles/finition" element={<Navigate to="/reproduction?phase=finition" replace />} />
          <Route path="/cycles/engraissement" element={<Navigate to="/reproduction?phase=engraissement" replace />} />
          <Route path="/cycles/sortie" element={<Navigate to="/reproduction?phase=sortie" replace />} />

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
