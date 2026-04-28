import { useMemo } from 'react';
import { useTroupeau } from '../context/TroupeauContext';
import { normaliseStatut } from '../lib/truieStatut';
import { isArchivedTruie } from '../lib/truieHelpers';
import type { TruieEtape } from '../components/truie/TruieStatutPipeline';

/**
 * Hook dédié aux statistiques du troupeau pour le pipeline de reproduction.
 * Centralise la logique de filtrage "À surveiller" et les compteurs du funnel.
 */
export function useTroupeauPipeline() {
  const { truies } = useTroupeau();

  const activeTruies = useMemo(
    () => truies.filter((t) => !isArchivedTruie(t.id)),
    [truies]
  );

  const pipelineEtapes = useMemo<TruieEtape[]>(() => {
    const getCount = (codes: string[]) =>
      activeTruies.filter(t => codes.includes(normaliseStatut(t.statut))).length;

    return [
      {
        key: 'attente',
        label: 'Attente',
        count: getCount(['VIDE', 'CHALEUR', 'FLUSHING']),
        tone: 'default'
      },
      {
        key: 'pleine',
        label: 'Pleines',
        count: getCount(['PLEINE']),
        tone: 'accent'
      },
      {
        key: 'maternite',
        label: 'Maternité',
        count: getCount(['MATERNITE']),
        tone: 'gold'
      },
      {
        key: 'surveiller',
        label: 'À surveiller',
        count: getCount(['SURVEILLANCE', 'REFORME']),
        tone: 'amber'
      },
    ];
  }, [activeTruies]);

  return {
    activeTruies,
    pipelineEtapes,
    total: activeTruies.length,
  };
}
