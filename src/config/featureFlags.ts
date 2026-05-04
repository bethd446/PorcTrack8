/**
 * Feature flags V70.
 *
 * Bascule entre l'ancien système (V44/V45) et le nouveau système V70.
 * Contrôlée via la variable d'environnement VITE_V70_ENABLED.
 *
 * - VITE_V70_ENABLED=true → routage V70 (5 onglets, src/v70/)
 * - VITE_V70_ENABLED=false (default) → routage legacy (V44/V45)
 *
 * Permet rollback instantané sans redéploiement (juste changer la var ENV).
 */

export const featureFlags = {
  /** Active le routage V70 + tokens v70-tokens.css. */
  v70Enabled: import.meta.env.VITE_V70_ENABLED === 'true',

  /** Pourcentage de rollout progressif (réservé V71+ pour A/B testing). */
  v70RolloutPercent: parseInt(
    import.meta.env.VITE_V70_ROLLOUT_PERCENT || '0',
    10,
  ),
} as const;

/**
 * Helper : booléen si V70 doit être actif pour cet utilisateur.
 *
 * Pour V70 strict, retourne featureFlags.v70Enabled. Pour V71+ avec rollout
 * progressif, ajouter logique de hash userId modulo 100 < rolloutPercent.
 */
export function isV70Active(): boolean {
  return featureFlags.v70Enabled;
}
