import React from 'react';
import { cn } from '../../lib/utils';
import { type ChipTone } from './Chip';
import { Tag, Button } from '../../design-system';

export interface AnimalListItemBadge {
  label: string;
  tone: ChipTone;
}

// V40 T3-final : mapping ChipTone (legacy agritech) → Tag DS V2 variant.
// Ce mapping duplique celui de TroupeauTruiesView.tsx ; à factoriser en util
// partagé une fois tous les Chip migrés (V41).
type TagVariantKind = 'default' | 'primary' | 'accent' | 'soft' | 'danger' | 'warning';
function chipToneToTagVariant(tone: ChipTone): TagVariantKind {
  switch (tone) {
    case 'accent':  return 'primary';
    case 'gold':    return 'soft';
    case 'coral':   return 'warning';
    case 'red':     return 'accent';
    case 'amber':   return 'warning';
    case 'default':
    default:        return 'default';
  }
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

  // V45 P1B : avatar passé tel quel (EntityAvatar gère sa propre forme/taille).
  const inner = (
    <>
      {avatar ? (
        <span style={{ flexShrink: 0, display: 'inline-flex' }}>{avatar}</span>
      ) : null}

      <div className="flex-1 min-w-0">
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--pt-text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {primary}
        </div>
        {secondary ? (
          <div
            style={{
              fontSize: 12,
              color: 'var(--pt-text-muted)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {secondary}
          </div>
        ) : null}
        {badges && badges.length > 0 ? (
          <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {badges.map((b, i) => (
              <span key={`${b.label}-${i}`}>
                <Tag variant={chipToneToTagVariant(b.tone)}>{b.label}</Tag>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {meta !== undefined && meta !== null && meta !== '' ? (
        <div
          style={{
            flexShrink: 0,
            fontSize: 11,
            color: 'var(--pt-text-muted)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {meta}
        </div>
      ) : null}

      {chip ? <Tag variant={chipToneToTagVariant(chip.tone)}>{chip.label}</Tag> : null}

      {accessory ? <span style={{ flexShrink: 0 }}>{accessory}</span> : null}
    </>
  );

  // V40 align : padding aéré + séparateur fin via var(--pt-divider).
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    minHeight: 56,
    borderBottom: '1px solid var(--pt-divider)',
    background: 'transparent',
    width: '100%',
    textAlign: 'left',
  };
  const baseClass = 'animal-list-item';

  if (interactive) {
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(baseClass, 'pressable', className)}
        style={{ ...rowStyle, border: 'none', borderBottom: rowStyle.borderBottom, cursor: 'pointer', borderRadius: 0, textTransform: 'none', height: 'auto', justifyContent: 'flex-start' }}
      >
        {inner}
      </Button>
    );
  }

  return (
    <div
      aria-label={ariaLabel}
      className={cn(baseClass, className)}
      style={rowStyle}
    >
      {inner}
    </div>
  );
};

export default AnimalListItem;
