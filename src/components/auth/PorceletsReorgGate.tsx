/**
 * PorceletsReorgGate — Gate V72
 *
 * Au login, vérifie si la ferme courante a des porcelets en vrac (sans
 * batch_id). Si oui → redirige vers /porcelets-reorg (wizard bloquant
 * "Création manuelle de bandes"). Sinon, no-op.
 *
 * S'applique à TOUS les users (existants + nouveaux). Skip pour les routes
 * publiques (login/signup/auth) et pour la route wizard elle-même pour
 * éviter les boucles.
 */
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';

export const PorceletsReorgGate: React.FC = () => {
  const { user, profileLoaded } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!user || !profileLoaded) return;
    const skip =
      pathname.startsWith('/onboarding') ||
      pathname.startsWith('/porcelets-reorg') ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/signup') ||
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/reglages');
    if (skip) return;

    let cancelled = false;
    void (async () => {
      try {
        // Porcelets en vrac (batch_id NULL) sur la farm courante
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count, error } = await (supabase as any)
          .from('porcelets_individuels')
          .select('id', { count: 'exact', head: true })
          .eq('farm_id', user.id)
          .is('batch_id', null);
        if (cancelled) return;
        if (error) return; // silencieux : on ne bloque pas si la requête échoue
        if ((count ?? 0) > 0) {
          navigate('/porcelets-reorg', { replace: true });
        }
      } catch {
        // silencieux
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, profileLoaded, pathname, navigate]);

  return null;
};

export default PorceletsReorgGate;
