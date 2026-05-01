import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

interface Props {
  children: React.ReactNode;
}

/**
 * SupabaseProtectedRoute — vérifie la session Supabase Auth.
 * Si l'utilisateur n'est pas connecté → redirige vers /login.
 * Pendant la vérification → spinner sobre (évite flash de contenu).
 */
export default function SupabaseProtectedRoute({ children }: Props) {
  const [status, setStatus] = useState<'loading' | 'auth' | 'unauth'>('loading');

  useEffect(() => {
    // Vérification initiale de session
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? 'auth' : 'unauth');
    });

    // Écoute les changements de session (logout, expiry, refresh)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? 'auth' : 'unauth');
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-app)' }}>
        <div className="flex flex-col items-center gap-4">
          <img src="/images/icon.svg" alt="PorcTrack" className="w-12 h-12 rounded-xl animate-pulse" />
          <p className="text-xs opacity-50 uppercase tracking-widest" style={{ color: 'var(--color-accent-500)' }}>Vérification…</p>
        </div>
      </div>
    );
  }

  if (status === 'unauth') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
