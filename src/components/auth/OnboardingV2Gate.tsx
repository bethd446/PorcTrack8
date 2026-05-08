/**
 * OnboardingV2Gate — Gate V71-P3 nouveau onboarding obligatoire (5 étapes)
 *
 * Au login, vérifie si la farm courante a complété le nouveau onboarding
 * (farm.metadata.onboarding_v2.completed_at non NULL). Sinon → redirect
 * vers /onboarding-v2 (wizard bloquant).
 *
 * Backfill : tous les users existants ont été marqués `auto-skip-v1` via
 * la migration v71_p3_onboarding_v2_metadata. Donc seuls les nouveaux
 * users (créés après l'apply) déclencheront le wizard.
 *
 * Skip pour : routes publiques, onboarding-v2 lui-même, porcelets-reorg,
 * onboarding legacy. Le porcelets-reorg passe en priorité (gate plus
 * spécifique).
 */
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';

export const OnboardingV2Gate: React.FC = () => {
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
      pathname.startsWith('/auth/');
    if (skip) return;

    let cancelled = false;
    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('farms')
          .select('metadata')
          .eq('id', user.id)
          .maybeSingle();
        if (cancelled || error || !data) return;
        const completedAt = data.metadata?.onboarding_v2?.completed_at;
        if (!completedAt) {
          navigate('/onboarding-v2', { replace: true });
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

export default OnboardingV2Gate;
