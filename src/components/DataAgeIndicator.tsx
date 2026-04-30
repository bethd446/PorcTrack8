/**
 * DataAgeIndicator — Indicateur "Mis à jour il y a X" pour les en-têtes de hub.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Affiche l'âge de la dernière synchro (`lastUpdate` depuis `useMeta()`) au
 * format relatif FR (`il y a 5 minutes`). Re-render local toutes les 60 s
 * pour rester à jour sans déranger les autres composants.
 *
 * Usage :
 *   <AgritechHeader title="TROUPEAU" subtitle={...} action={<DataAgeIndicator />} />
 *
 * - Format compact, font-mono 11px, text-text-2 (cohérent avec les sous-titres).
 * - Si `lastUpdate === 0` (pas encore chargé), affiche "Chargement…".
 */
import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMeta } from '../context/FarmContext';

const TICK_MS = 60_000;

const DataAgeIndicator: React.FC = () => {
  const { lastUpdate } = useMeta();
  const [, setTick] = useState(0);

  // Re-render toutes les 60 s pour rafraîchir le label relatif.
  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((n) => n + 1);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  if (!lastUpdate) {
    return (
      <span
        className="font-mono text-[11px] text-text-2 leading-none"
        aria-label="Données en cours de chargement"
      >
        Chargement…
      </span>
    );
  }

  const distance = formatDistanceToNow(new Date(lastUpdate), {
    locale: fr,
    addSuffix: false,
  });

  return (
    <span
      className="font-mono text-[11px] text-text-2 leading-none whitespace-nowrap"
      aria-label={`Données mises à jour il y a ${distance}`}
      title={new Date(lastUpdate).toLocaleString('fr-FR')}
    >
      Maj il y a {distance}
    </span>
  );
};

export default DataAgeIndicator;
