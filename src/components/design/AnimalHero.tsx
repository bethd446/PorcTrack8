import React from 'react';
import { Plus, Printer } from 'lucide-react';
import Eyebrow from './Eyebrow';
import Chip from './Chip';
import Button from './Button';

export interface AnimalHeroChip {
  label: string;
  tone: 'green' | 'amber' | 'terre' | 'pig' | 'neutral';
}

export interface AnimalHeroProps {
  eyebrow: string;
  chips?: AnimalHeroChip[];
  name: string;
  subtitle?: string;
  tagline?: string;
  photoUrl?: string;
  photoStamp?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
  /** Icône custom pour le secondary CTA (défaut: Printer). */
  secondaryIcon?: React.ReactNode;
  /** Action tertiaire optionnelle (ex: "Modifier" depuis le hero). */
  onTertiaryAction?: () => void;
  tertiaryLabel?: string;
  tertiaryIcon?: React.ReactNode;
  /** Icône SVG silhouette à afficher quand `photoUrl` est absent. */
  fallbackIcon?: React.ReactNode;
  /** Callback du bouton "+ Ajouter une photo" sur le placeholder. */
  onUploadClick?: () => void;
}

/**
 * Hero unifié pour fiches détail d'animaux (truies, verrats, …).
 * Anciennement `SowHero` — renommé en `AnimalHero` pour usage transverse.
 * `SowHero.tsx` reste exporté en alias rétro-compatible.
 */
export default function AnimalHero({
  eyebrow,
  chips = [],
  name,
  subtitle,
  tagline,
  photoUrl,
  photoStamp,
  onPrimaryAction,
  onSecondaryAction,
  primaryLabel = 'Saisir événement',
  secondaryLabel,
  secondaryIcon,
  onTertiaryAction,
  tertiaryLabel,
  tertiaryIcon,
  fallbackIcon,
  onUploadClick,
}: AnimalHeroProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 240px) 1fr',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--line)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
      className="sow-hero"
    >
      <div
        style={{
          position: 'relative',
          background: photoUrl ? 'var(--color-secondary-deep)' : 'var(--bg-surface-soft, #f5f4f1)',
          minHeight: 280,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              padding: 24,
              color: 'var(--muted)',
              opacity: 0.85,
            }}
          >
            {fallbackIcon ? (
              <span style={{ display: 'inline-flex', opacity: 0.4 }} aria-hidden="true">
                {fallbackIcon}
              </span>
            ) : (
              <img
                src="/images/porc-mark.svg"
                alt=""
                aria-hidden="true"
                style={{ width: 84, height: 84, opacity: 0.3 }}
              />
            )}
            {onUploadClick && (
              <button
                type="button"
                onClick={onUploadClick}
                style={{
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--color-accent-600, var(--amber-pork-deep))',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  fontWeight: 500,
                }}
              >
                + Ajouter une photo
              </button>
            )}
          </div>
        )}
        {photoStamp && photoUrl && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              background: 'var(--bg-surface)',
              color: 'var(--ink)',
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              letterSpacing: '0.10em',
              padding: '4px 8px',
              textTransform: 'uppercase',
              borderRadius: 4,
            }}
          >
            {photoStamp}
          </div>
        )}
      </div>

      <div
        style={{
          padding: '24px 28px 22px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 14,
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: 12,
            }}
          >
            <Eyebrow withRule={false}>{eyebrow}</Eyebrow>
            {chips.map((c, i) => (
              <Chip
                key={`${c.label}-${i}`}
                tone={c.tone}
                className={`chip--${c.tone === 'green' ? 'accent' : c.tone}`}
              >
                {c.label}
              </Chip>
            ))}
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 44,
              lineHeight: 1,
              fontWeight: 700,
              margin: '0 0 6px',
              color: 'var(--ink)',
              letterSpacing: '-0.02em',
            }}
          >
            {name}
            {subtitle && (
              <span
                style={{
                  display: 'inline-block',
                  fontFamily: 'var(--font-body)',
                  fontSize: 18,
                  fontWeight: 400,
                  color: 'var(--muted)',
                  marginLeft: 12,
                }}
              >
                {subtitle}
              </span>
            )}
          </h1>

          {tagline && (
            <p
              style={{
                fontSize: 13,
                color: 'var(--ink-soft)',
                lineHeight: 1.5,
                maxWidth: 480,
                margin: '8px 0 14px',
              }}
            >
              {tagline}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="primary" size="md" onClick={onPrimaryAction}>
            <Plus size={13} strokeWidth={2} aria-hidden />
            {primaryLabel}
          </Button>
          {onSecondaryAction && secondaryLabel ? (
            <Button variant="secondary" size="md" onClick={onSecondaryAction}>
              {secondaryIcon ?? <Printer size={13} strokeWidth={2} aria-hidden />}
              {secondaryLabel}
            </Button>
          ) : null}
          {onTertiaryAction && tertiaryLabel ? (
            <Button variant="secondary" size="md" onClick={onTertiaryAction}>
              {tertiaryIcon}
              {tertiaryLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
