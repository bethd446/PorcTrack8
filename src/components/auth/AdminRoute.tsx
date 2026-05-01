import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

interface Props {
  children: React.ReactNode;
}

type Status = 'loading' | 'admin' | 'not-admin' | 'unauth';

/**
 * AdminRoute — vérifie session Supabase + rôle ADMIN dans la table `profiles`.
 * - Pas de session        → /login
 * - Session mais pas ADMIN → / (dashboard)
 * - Session + ADMIN        → contenu rendu
 */
export default function AdminRoute({ children }: Props) {
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    const check = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session) {
        setStatus('unauth');
        return;
      }

      // Vérifier le rôle dans la table profiles
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error || !profile || profile.role !== 'ADMIN') {
        setStatus('not-admin');
      } else {
        setStatus('admin');
      }
    };

    check();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-app)' }}>
        <div className="flex flex-col items-center gap-4">
          <img src="/images/icon.svg" alt="PorcTrack" className="w-12 h-12 rounded-xl animate-pulse" />
          <p className="text-xs opacity-50 uppercase tracking-widest" style={{ color: 'var(--color-accent-500)' }}>Vérification accès…</p>
        </div>
      </div>
    );
  }

  if (status === 'unauth') return <Navigate to="/login" replace />;
  if (status === 'not-admin') return <Navigate to="/" replace />;

  return <>{children}</>;
}
