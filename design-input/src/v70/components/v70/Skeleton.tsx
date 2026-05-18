/**
 * V70 — Skeleton (Sprint 8 patterns transverses)
 *
 * 4 variants de skeleton loading basés sur les classes CSS prêtes dans
 * v70-global.css : list-item (cascade 80ms), card-link, profile, chart.
 * Composant purement UI, pas de logique métier.
 */
import React from 'react';

export type SkeletonVariant = 'list-item' | 'card-link' | 'profile' | 'chart';

export interface SkeletonProps {
  variant: SkeletonVariant;
  /** Pour list-item et card-link : nombre de lignes/cards rendues. */
  count?: number;
  className?: string;
}

const ListItemSkeleton: React.FC<{ count: number }> = ({ count }) => (
  <div className="sk-list" role="status" aria-label="Chargement">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="sk-list__row">
        <div className="sk sk--strong sk-icon" />
        <div className="sk-lines">
          <div className="sk sk--strong sk-l1" />
          <div className="sk sk-l2" />
        </div>
        <div className="sk sk-pill" />
      </div>
    ))}
  </div>
);

const CardLinkSkeleton: React.FC<{ count: number }> = ({ count }) => (
  <div
    role="status"
    aria-label="Chargement"
    style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="sk-card">
        <div className="sk sk--strong sk-i" />
        <div className="sk-m">
          <div className="sk sk--strong sk-t" />
          <div className="sk sk-s" />
        </div>
        <div className="sk sk-c" />
      </div>
    ))}
  </div>
);

const ProfileSkeleton: React.FC = () => (
  <div className="sk-profil" role="status" aria-label="Chargement">
    <div className="sk sk--strong sk-av" />
    <div className="sk-m">
      <div className="sk sk--strong sk-t1" />
      <div className="sk sk-t2" />
      <div className="sk sk-t3" />
    </div>
  </div>
);

const ChartSkeleton: React.FC = () => (
  <div className="sk-chart" role="status" aria-label="Chargement">
    <div className="sk-chart__head">
      <div className="sk sk--strong sk-chart__h" />
      <div className="sk sk-chart__h2" />
    </div>
    <div className="sk-chart__bars">
      <span /><span /><span /><span /><span /><span /><span /><span />
    </div>
  </div>
);

export const Skeleton: React.FC<SkeletonProps> = ({
  variant,
  count = 3,
  className,
}) => {
  const wrap = (node: React.ReactNode) =>
    className ? <div className={className}>{node}</div> : <>{node}</>;

  switch (variant) {
    case 'list-item':
      return wrap(<ListItemSkeleton count={count} />);
    case 'card-link':
      return wrap(<CardLinkSkeleton count={count} />);
    case 'profile':
      return wrap(<ProfileSkeleton />);
    case 'chart':
      return wrap(<ChartSkeleton />);
  }
};
