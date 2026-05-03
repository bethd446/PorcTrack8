import React from 'react';
import { cn } from '../../lib/utils';
import Chip, { type ChipTone } from './Chip';

export interface AnimalListItemBadge {
  label: string;
  tone: ChipTone;
}

export interface AnimalListItemProps {
  /** Visuel à gauche : photo, icône silhouette, ou élément custom. */
  avatar?: React.ReactNode;
  /** Texte primaire — ex: "T-001 · Bella" (semibold body-lg). */
  primary: React.ReactNode;
  /** Texte secondaire — ex: "Gestation · J+45" (mono muted). */
  secondary?: React.ReactNode;
  /** Meta mono à droite — ex: "Bât A". */
  meta?: React.ReactNode;
  /** Chip de statut affiché à droite. */
  chip?: AnimalListItemBadge;
  /** Petits badges supplémentaires (ex: alertes) sous le secondary. */
  badges?: AnimalListItemBadge[];
  /** Accessoire à droite après chip (ex: chevron, bouton). */
  accessory?: React.ReactNode;
  /** Click handler — transforme le row en bouton. */
  onClick?: () => void;
  /** aria-label override (sinon dérivé de primary). */
  ariaLabel?: string;
  /** Style supplémentaire. */
  className?: string;
}

/**
 * Row unifié pour listes d'animaux (truies, verrats, bandes…).
 * - min-h 56px (tap target WCAG)
 * - avatar 40×40 rounded-full
 * - bordure bottom border-border ; dernier sans border via `last:border-b-0`
 * - structure : avatar | (primary / secondary / badges) | (meta) | chip | accessory
 */
const AnimalListItem: React.FC<AnimalListItemProps> = ({
  avatar,
  primary,
  secondary,
  meta,
  chip,
  badges,
  accessory,
  onClick,
  ariaLabel,
  className,
}) => {
  const interactive = typeof onClick === 'function';

  const inner = (
    <>
      {avatar ? (
        <div className="shrink-0 w-10 h-10 rounded-full bg-bg-2 border border-border flex items-center justify-center overflow-hidden text-text-1">
          {avatar}
        </div>
      ) : null}

      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold text-text-0 leading-snug truncate">
          {primary}
        </div>
        {secondary ? (
          <div className="mt-0.5 text-[11px] text-text-2 leading-relaxed truncate">
            {secondary}
          </div>
        ) : null}
        {badges && badges.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {badges.map((b, i) => (
              <Chip key={`${b.label}-${i}`} label={b.label} tone={b.tone} size="xs" />
            ))}
          </div>
        ) : null}
      </div>

      {meta !== undefined && meta !== null && meta !== '' ? (
        <div className="shrink-0 text-[11px] tabular-nums text-text-1">
          {meta}
        </div>
      ) : null}

      {chip ? <Chip label={chip.label} tone={chip.tone} size="xs" /> : null}

      {accessory ? <div className="shrink-0">{accessory}</div> : null}
    </>
  );

  const baseClass =
    'flex w-full items-center gap-3 px-3 py-3 min-h-[56px] border-b border-border last:border-b-0';

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(
          'animal-list-item pressable text-left',
          baseClass,
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]',
          className,
        )}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      aria-label={ariaLabel}
      className={cn('animal-list-item', baseClass, className)}
    >
      {inner}
    </div>
  );
};

export default AnimalListItem;
