/**
 * dbError — P0 STAB
 *
 * Wrapper d'erreur global qui mappe les codes Postgres en messages user FR
 * + dispatche un toast (via callback injecté).
 *
 * Pattern toast existant : `useToast()` depuis `src/context/ToastContext.tsx`
 *   const { showToast } = useToast();
 *   await withDbError(supabase.from('...').insert(...), (m) => showToast(m, 'error'));
 *
 * Note : ce module est pur (pas de dépendance React) — le toast est injecté
 * par le call-site sous forme de callback `(msg: string) => void`. Les
 * autres agents intégreront aux call-sites.
 */

export function mapPgError(error: { code?: string; message?: string }): string {
  const code = error?.code;
  const msg = error?.message || '';
  if (code === '23514') {
    if (msg.includes('finances_type_check')) return 'Type comptable invalide (Variable/Fixe attendu)';
    if (msg.includes('batches_phase_chk')) return 'Phase de bande invalide';
    if (msg.includes('sows_statut_chk')) return 'Statut truie invalide';
    return 'Donnée invalide (contrainte CHECK)';
  }
  if (code === '23502') return 'Champ obligatoire manquant';
  if (code === '23503') return 'Référence invalide (FK)';
  if (code === '22P02') {
    if (msg.includes('uuid')) return 'Identifiant invalide';
    return 'Format de donnée invalide';
  }
  if (code === '23505') return 'Doublon détecté (unique)';
  if (code === '428C9') return 'Champ généré automatiquement (à retirer du payload)';
  return msg || 'Erreur inconnue';
}

export async function withDbError<T>(promise: Promise<T>, toast?: (msg: string) => void): Promise<T> {
  try {
    return await promise;
  } catch (e: any) {
    const msg = mapPgError(e);
    if (toast) toast(msg);
    throw e;
  }
}
