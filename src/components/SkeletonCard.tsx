import React from 'react';

// ─────────────────────────────────────────────
// Pulse animation (inline — pas besoin de CSS externe)
// ─────────────────────────────────────────────
const pulse = 'animate-pulse bg-gray-100 rounded-xl';

// ─────────────────────────────────────────────
// Skeletons atomiques
// ─────────────────────────────────────────────

/** Ligne de texte pulsante */
export const SkeletonLine: React.FC<{ width?: string; height?: string; className?: string }> = ({
  width = 'w-full', height = 'h-3', className = ''
}) => (
  <div className={`${pulse} ${width} ${height} ${className}`} />
);

/** Carré / icône pulsant */
export const SkeletonBox: React.FC<{ size?: string; rounded?: string; className?: string }> = ({
  size = 'w-10 h-10', rounded = 'rounded-xl', className = ''
}) => (
  <div className={`${pulse} ${size} ${rounded} ${className}`} />
);

// ─────────────────────────────────────────────
// Skeleton d'une carte de navigation (grille dashboard)
// ─────────────────────────────────────────────
export const SkeletonNavCard: React.FC = () => (
  <div className="premium-card p-5 bg-white border-gray-100 space-y-3 shadow-sm">
    <SkeletonBox size="w-10 h-10" />
    <SkeletonLine width="w-16" height="h-2.5" />
  </div>
);

// ─────────────────────────────────────────────
// Skeleton d'une carte alerte
// ─────────────────────────────────────────────
export const SkeletonAlertCard: React.FC = () => (
  <div className="bg-gray-100 p-4 rounded-xl min-w-[160px] flex items-center gap-3 animate-pulse">
    <div className="bg-gray-200 w-10 h-10 rounded-xl flex-shrink-0" />
    <div className="space-y-2 flex-1">
      <div className="bg-gray-200 h-2.5 w-3/4 rounded" />
      <div className="bg-gray-200 h-2 w-1/2 rounded" />
    </div>
  </div>
);

// ─────────────────────────────────────────────
// Skeleton d'une carte "hero" pleine largeur
// ─────────────────────────────────────────────
export const SkeletonHeroCard: React.FC = () => (
  <div className="col-span-2 premium-card p-6 bg-white border-gray-100 flex items-center gap-4 shadow-sm animate-pulse">
    <SkeletonBox size="w-12 h-12" rounded="rounded-xl" />
    <div className="flex-1 space-y-2">
      <SkeletonLine width="w-32" height="h-3" />
      <SkeletonLine width="w-20" height="h-2" />
    </div>
  </div>
);

// ─────────────────────────────────────────────
// Skeleton d'une fiche animal (liste cheptel)
// ─────────────────────────────────────────────
export const SkeletonAnimalRow: React.FC = () => (
  <div className="premium-card p-4 bg-white border-gray-100 flex items-center gap-4 shadow-sm animate-pulse">
    <SkeletonBox size="w-12 h-12" rounded="rounded-xl" />
    <div className="flex-1 space-y-2">
      <SkeletonLine width="w-20" height="h-3" />
      <SkeletonLine width="w-28" height="h-2" />
    </div>
    <SkeletonBox size="w-16 h-6" rounded="rounded-full" />
  </div>
);

// ─────────────────────────────────────────────
// Skeleton page complète (grille dashboard)
// ─────────────────────────────────────────────
export const DashboardSkeleton: React.FC = () => (
  <div className="px-5 pb-32 mt-8 space-y-10">
    {/* Section alertes */}
    <div className="space-y-3">
      <SkeletonLine width="w-36" height="h-2.5" />
      <div className="flex gap-3 overflow-x-auto pb-2">
        <SkeletonAlertCard />
        <SkeletonAlertCard />
      </div>
    </div>

    {/* Grille navigation */}
    <div className="grid grid-cols-2 gap-4">
      <SkeletonHeroCard />
      <SkeletonHeroCard />
      <SkeletonNavCard />
      <SkeletonNavCard />
      <SkeletonNavCard />
      <SkeletonNavCard />
    </div>

    {/* Section planning */}
    <div className="space-y-4">
      <SkeletonLine width="w-32" height="h-2.5" />
      <SkeletonHeroCard />
    </div>
  </div>
);

export default DashboardSkeleton;
