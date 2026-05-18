/**
 * PorceletsReorgGate — Gate V72
 *
 * Au login, vérifie si la ferme courante a des porcelets en vrac (sans
 * batch_id). Si oui → redirige vers /porcelets-reorg (wizard "Création
 * manuelle de bandes"). Sinon, no-op.
 *
 * S'applique à TOUS les users (existants + nouveaux). Skip pour les routes
 * publiques (login/signup/auth) et pour la route wizard elle-même pour
 * éviter les boucles.
 *
 * v3.4.1 — La détection est centralisée dans FarmContext (1 req HEAD par
 * farm_id). Ce composant n'émet plus aucune requête : il lit `hasPorceletsVrac`
 * et déclenche la redirection si l'utilisateur est sur une route éligible.
 *
 * v3.6.1 — Mécanisme "Plus tard" : le user peut skipper le wizard pour la
 * session courante via sessionStorage (`pt:porcelets-reorg-skipped`). Au
 * prochain login le redirect réapparaît tant que des porcelets sont vrac.
 * Évite le piège de navigation pour les fermes avec données pré-existantes.
 */
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { useFarm } from '../../context/FarmContext';

export const PORCELETS_REORG_SKIP_KEY = 'pt:porcelets-reorg-skipped';

export const PorceletsReorgGate: React.FC = () => {
  const { user, profileLoaded } = useAuth();
  const { hasPorceletsVrac } = useFarm();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!user || !profileLoaded || !hasPorceletsVrac) return;
    // v3.6.1 : si user a cliqué "Plus tard" cette session, ne plus rediriger.
    try {
      if (sessionStorage.getItem(PORCELETS_REORG_SKIP_KEY) === '1') return;
    } catch { /* sessionStorage indispo (mode privé strict) — on continue. */ }
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
