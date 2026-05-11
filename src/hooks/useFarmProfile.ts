/**
 * V80 — Hook React qui expose le profil métier courant.
 *
 * Branché sur la metadata de la farm courante (`farms.metadata`). Source de
 * vérité : champ `profil` ∈ {naisseur, engraisseur, cycle_complet}, avec
 * fallback `cycle_complet` (= comportement historique).
 *
 * Lit la metadata via Supabase à chaque switch de ferme. Le résultat est
 * mémoisé pour éviter les re-renders des consommateurs (nav, FAB, KPIs).
 */
import { useEffect, useMemo, useState } from 'react';
import * as FarmContext from '../context/FarmContext';
import { supabase } from '../services/supabaseClient';
import {
  type FarmProfile,
  DEFAULT_FARM_PROFILE,
  readFarmProfile,
} from '../lib/farmProfile';

/**
 * V80 — Lit le profil ferme depuis `farms.metadata`.
 *
 * Le hook tolère deux contextes de rendu :
 *  1. Avec MetaProvider en amont (cas normal app) — on lit `currentFarmId`
 *     via useMeta() et on requête Supabase.
 *  2. Hors arbre / tests mockés sans MetaProvider — on retourne le profil
 *     par défaut (`cycle_complet`) sans crash. Important pour les tests
 *     unitaires de composants comme SaisirSheet qui mockent leur context
 *     propre.
 *
 * Pour gérer les deux cas sans modifier les mocks existants (interdit par
 * AGENT_CONTRACT §4), on isole l'appel à useMeta() dans un try/catch et on
 * détecte la signature du mock (ex: `useMeta() => ({ loading: false })`
 * sans currentFarmId → on saute l'I/O).
 */
function safeUseCurrentFarmId(): string | null {
  try {
    // Les tests existants mockent FarmContext avec un useMeta qui retourne
    // un objet partiel sans throw — l'appel direct fonctionne donc même
    // dans ce cas, et on récupère `currentFarmId` (potentiellement undefined).
    const meta = FarmContext.useMeta();
    return meta?.currentFarmId ?? null;
  } catch {
    // useMeta() throw quand MetaContext est undefined (rendu hors-provider).
    // Comportement attendu hors-app ; retombe sur défaut applicatif.
    return null;
  }
}

export function useFarmProfile(): FarmProfile {
  const currentFarmId = safeUseCurrentFarmId();
  const [metadata, setMetadata] = useState<unknown>(null);

  useEffect(() => {
    if (!currentFarmId) {
      setMetadata(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from('farms')
          .select('metadata')
          .eq('id', currentFarmId)
          .maybeSingle();
        if (!cancelled) setMetadata(data?.metadata ?? null);
      } catch {
        // RLS / offline : on retombe sur le défaut applicatif.
        if (!cancelled) setMetadata(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentFarmId]);

  return useMemo(
    () => (metadata ? readFarmProfile(metadata) : DEFAULT_FARM_PROFILE),
    [metadata],
  );
}
