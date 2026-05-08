import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Landing from '../pages/Landing';

// LandingScrollytelling (Apple-style) en pause — bug scènes 3-7 invisibles
// (animations scrub désaxées par useScrollUnlock + Lenis). À reprendre
// après refonte des animations en mode toggleActions partout. Fichier
// /landing-v2 reste accessible via App.tsx pour itération.
// const LandingScrollytelling = React.lazy(() =>
//   import(/* webpackChunkName: "landing-v2" */ '../pages/landing-v2/LandingScrollytelling')
// );

export default function SmartRoot() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: 'var(--pt-bg)' }}
      >
        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--pt-text-muted)' }}>
          Chargement…
        </p>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/today" replace />;
  }

  return <Landing />;
}
