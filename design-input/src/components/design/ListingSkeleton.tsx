/**
 * ListingSkeleton — V74 Vague V
 * ════════════════════════════════════════════════════════════════════════════
 * Skeleton générique pour les listings pendant le chargement initial. Couplé
 * avec `useListingLoadingGuard`, élimine les faux empty states.
 *
 * DS V70 strict : pas d'emoji, pas d'animation framer-motion, juste un
 * `animate-pulse` Tailwind sur des blocs de hauteur cohérente avec
 * `AnimalListItem` / `ListItem` (~64 px).
 */
import React from 'react';

export interface ListingSkeletonProps {
  /** Nombre de rows fantômes (défaut 3). */
  count?: number;
  /** Hauteur de chaque row (défaut 64 px). */
  rowHeight?: number;
}

const ListingSkeleton: React.FC<ListingSkeletonProps> = ({
  count = 3,
  rowHeight = 64,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Chargement en cours"
      className="flex flex-col gap-2"
      data-testid="listing-skeleton"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-md bg-bg-2 animate-pulse"
          style={{ height: rowHeight }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
};

export default ListingSkeleton;
