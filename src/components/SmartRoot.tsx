import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LandingScrollytelling = React.lazy(() =>
  import(/* webpackChunkName: "landing-v2" */ '../pages/landing-v2/LandingScrollytelling'),
);

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

  return <LandingScrollytelling />;
}
