/**
 * V70 — Routes du nouveau système (5 onglets).
 *
 * Activé via VITE_V70_ENABLED=true. Sinon, App.tsx utilise les routes legacy.
 *
 * Phase 3 livrera les 5 pages réelles. En Phase 2, on stub avec des
 * placeholders pour valider le routage end-to-end.
 */
import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { BottomNavV70 } from '../components/v70/BottomNav';
import { UIPreferencesProvider } from '../context/UIPreferencesContext';

const TodayV70Stub: React.FC = () => (
  <div style={{ padding: 24 }}>
    <h1 style={{ fontFamily: 'var(--pt-font-display, sans-serif)', textTransform: 'uppercase' }}>
      Aujourd'hui (V70 Phase 3)
    </h1>
    <p>Page en construction. Phase 3 livrera le contenu.</p>
  </div>
);

const AnimalsV70Stub: React.FC = () => (
  <div style={{ padding: 24 }}>
    <h1 style={{ fontFamily: 'var(--pt-font-display, sans-serif)', textTransform: 'uppercase' }}>
      Mes animaux (V70 Phase 3)
    </h1>
    <p>Page en construction. Phase 3 livrera le contenu.</p>
  </div>
);

const ReproV70Stub: React.FC = () => (
  <div style={{ padding: 24 }}>
    <h1 style={{ fontFamily: 'var(--pt-font-display, sans-serif)', textTransform: 'uppercase' }}>
      Reproduction (V70 Phase 3)
    </h1>
    <p>Page en construction. Phase 3 livrera le contenu.</p>
  </div>
);

const PerformanceV70Stub: React.FC = () => (
  <div style={{ padding: 24 }}>
    <h1 style={{ fontFamily: 'var(--pt-font-display, sans-serif)', textTransform: 'uppercase' }}>
      Performance (V70 Phase 3)
    </h1>
    <p>Page en construction. Phase 3 livrera le contenu.</p>
  </div>
);

const ReglagesV70Stub: React.FC = () => (
  <div style={{ padding: 24 }}>
    <h1 style={{ fontFamily: 'var(--pt-font-display, sans-serif)', textTransform: 'uppercase' }}>
      Réglages (V70 Phase 3)
    </h1>
    <p>Page en construction. Phase 3 livrera le contenu.</p>
  </div>
);

export const V70Routes: React.FC = () => (
  <UIPreferencesProvider>
    <div className="v70-root" style={{ minHeight: '100vh', paddingBottom: 80, background: 'var(--pt-bg)' }}>
      <Suspense fallback={<div style={{ padding: 24 }}>Chargement…</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<TodayV70Stub />} />
          <Route path="/troupeau/*" element={<AnimalsV70Stub />} />
          <Route path="/reproduction/*" element={<ReproV70Stub />} />
          <Route path="/performance/*" element={<PerformanceV70Stub />} />
          <Route path="/reglages/*" element={<ReglagesV70Stub />} />

          {/* Redirects legacy → V70 (sera complété Phase 4) */}
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
