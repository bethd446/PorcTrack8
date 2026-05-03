/**
 * uuidGuard — V31-FIX-PACK-01
 * ════════════════════════════════════════════════════════════════════════════
 * Détecte les UUIDs (RFC 4122) dans les chaînes destinées à l'UI utilisateur.
 *
 * Pourquoi : un UUID brut (ex: 7e3f2a4c-…) ne signifie rien pour Christophe
 * l'éleveur. On veut afficher des codes lisibles (L5RM, T-001, "Ivermectine")
 * pas des hashs internes.
 *
 * Usage :
 *   - assertNoUUID(text, 'AuditView.alert.title')  → console.error en dev
 *   - useNoUUID(label, 'context')                  → hook React équivalent
 *
 * Non-fail en production : on ne casse pas l'UI, on log seulement en dev.
 */

import { useEffect } from 'react';

export const UUID_REGEX =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Vérifie qu'un texte ne contient pas d'UUID. En dev, log un error.
 * En production, no-op (zéro coût).
 */
export function assertNoUUID(text: string, context?: string): void {
  if (
    typeof process !== 'undefined' &&
    process.env?.NODE_ENV === 'development' &&
    UUID_REGEX.test(text)
  ) {
    // eslint-disable-next-line no-console
    console.error(
      `[UUID-GUARD] UUID détecté dans le texte: "${text.slice(0, 80)}..."`
        + ` (${context ?? 'unknown'})`,
    );
  }
}

/**
 * Hook React — log si le texte contient un UUID. À utiliser dans un composant
 * qui affiche du contenu dynamique (titre, sous-titre, label).
 */
export function useNoUUID(text: string, context?: string): void {
  useEffect(() => {
    assertNoUUID(text, context);
  }, [text, context]);
}

/**
 * Renvoie true si le texte contient un UUID. Utile pour les tests / filtres.
 */
export function containsUUID(text: string): boolean {
  return UUID_REGEX.test(text);
}
