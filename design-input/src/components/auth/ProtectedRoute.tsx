import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface Props {
  children: React.ReactNode;
}

export default function SupabaseProtectedRoute({ children }: Props) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-app)' }}>
        <div className="flex flex-col items-center gap-4">
          <img src="/images/icon.svg" alt="PorcTrack" className="w-12 h-12 rounded-xl animate-pulse" />
          <p className="text-xs opacity-50 uppercase tracking-widest" style={{ color: 'var(--color-accent-500)' }}>Vérification…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
