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
 *
 * v3.4.1 — La détection est centralisée dans FarmContext (1 req HEAD par
 * farm_id). Ce composant n'émet plus aucune requête : il lit `hasPorceletsVrac`
 * et déclenche la redirection si l'utilisateur est sur une route éligible.
 * Avant le patch : 24 req/session (ERR_ABORTED en cascade).
 */
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { useFarm } from '../../context/FarmContext';

export const PorceletsReorgGate: React.FC = () => {
  const { user, profileLoaded } = useAuth();
  const { hasPorceletsVrac } = useFarm();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!user || !profileLoaded || !hasPorceletsVrac) return;
    const skip =
      pathname.startsWith('/onboarding') ||
      pathname.startsWith('/porcelets-reorg') ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/signup') ||
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/reglages');
    if (skip) return;
    navigate('/porcelets-reorg', { replace: true });
  }, [hasPorceletsVrac, pathname, navigate, user, profileLoaded]);

  return null;
};

export default PorceletsReorgGate;
