/**
 * V70 — EmptyState (Sprint 8 patterns transverses)
 *
 * Empty state générique : icône Lucide + titre + description optionnelle
 * + CTA optionnel. Utilise la classe CSS .empty (déjà dans v70-global.css).
 * Différent de EmptyEdu (qui est l'empty state pédagogique pour la couche
 * éducative).
 *
 * Enrichi V80 A3 : accepte `iconNode` (ReactNode) en plus de `icon` (LucideIcon)
 * pour permettre la migration des consumers legacy (EntityAvatar, etc.).
 * `action` (ReactNode) ajouté comme alternative à `cta` pour compatibilité.
 * `size` ajouté pour contrôle padding (comme l'ancienne design/EmptyState).
 */
import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateCta {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  /** Icône Lucide (composant, pas instance). Incompatible avec `iconNode`. */
  icon?: LucideIcon;
  /** Nœud React arbitraire en guise d'icône (EntityAvatar, etc.). Prioritaire sur `icon`. */
  iconNode?: React.ReactNode;
  iconColor?: string;
  title: string;
  description?: string;
  cta?: EmptyStateCta;
  /** Nœud React CTA alternatif (boutons custom, etc.). Prioritaire sur `cta`. */
  action?: React.ReactNode;
  /** Contrôle le padding vertical : 'sm' = compact, 'md' = standard, 'lg' = large. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  iconNode,
  iconColor,
  title,
  description,
  cta,
  action,
  size = 'md',
  className,
}) => {
  const paddingY = size === 'sm' ? '24px 16px' : size === 'lg' ? '56px 32px' : '40px 24px';
  return (
    <div
      className={className ? `empty ${className}` : 'empty'}
      style={size !== 'md' ? { padding: paddingY } : undefined}
    >
      {iconNode ?? (Icon && (
        <Icon
          size={38}
          strokeWidth={2}
          aria-hidden="true"
        />
      ))}
      <div className="empty__title">{title}</div>
      {description && (
        <div className="empty__desc">{description}</div>
      )}
      {action ?? (cta && (
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={cta.onClick}
          style={{ marginTop: 4 }}
        >
          {cta.label}
        </button>
      ))}
    </div>
  );
};
