import React, { useState } from 'react';

export type EntitySpecies = 'truie' | 'verrat' | 'porcelet' | 'bande';
export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface EntityAvatarProps {
  species: EntitySpecies;
  photoUrl?: string | null;
  size?: AvatarSize;
  shortCode?: string;
  className?: string;
  /** Si true, utilise les portraits V73 photoréalistes par défaut quand `photoUrl` est absent. */
  useV73Defaults?: boolean;
}

const SIZE_PX: Record<AvatarSize, number> = { sm: 32, md: 48, lg: 64, xl: 96 };
const RADIUS_PX: Record<AvatarSize, number> = { sm: 12, md: 12, lg: 16, xl: 20 };

const PALETTE: Record<EntitySpecies, { bg: string; fg: string }> = {
  truie:    { bg: '#F4D4D4', fg: '#8B4744' },
  verrat:   { bg: '#C8D6E5', fg: '#3B5266' },
  porcelet: { bg: '#F5E9D8', fg: '#8B6E3D' },
  bande:    { bg: '#D4DFC8', fg: '#3D5C2C' },
};

const V73_PORTRAIT: Partial<Record<EntitySpecies, string>> = {
  truie: '/images/v73/avatars/truie.webp',
  verrat: '/images/v73/avatars/verrat.webp',
  porcelet: '/images/v73/avatars/porcelet.webp',
};

interface SvgProps {
  color: string;
}

const svgBaseProps = {
  viewBox: '0 0 64 64',
  width: '70%',
  height: '70%',
  xmlns: 'http://www.w3.org/2000/svg' as const,
  'aria-hidden': true,
};

const TruieSvg: React.FC<SvgProps> = ({ color }) => (
  <svg {...svgBaseProps} fill={color}>
    <path d="M14 28c0-5 4-9 9-9h18c5 0 9 4 9 9v10c0 4-3 7-7 7h-2v3c0 1-1 2-2 2s-2-1-2-2v-3H22v3c0-0 0 0 0 0 0 1-1 2-2 2s-2-1-2-2v-3.4c-2-1.2-3-3.3-3-5.6V28z" />
    <path d="M50 30l5-1.5c1-.3 2 .5 2 1.5v3c0 1-1 1.8-2 1.5L50 33z" />
    <path d="M44 22l2-5c.4-1 1.6-1 2 0l1.5 4z" />
    <path d="M22 22l-2-5c-.4-1-1.6-1-2 0l-1.5 4z" />
    <circle cx="48" cy="29" r="1.2" />
    <circle cx="26" cy="40" r="1" />
    <circle cx="32" cy="42" r="1" />
    <circle cx="38" cy="42" r="1" />
    <circle cx="44" cy="40" r="1" />
    <path d="M11 32c-1.5-1-1.5-3 0-3 1 0 1 1 .5 1.5-.5.5-.5 1 .5 1.5z" />
  </svg>
);

const VerratSvg: React.FC<SvgProps> = ({ color }) => (
  <svg {...svgBaseProps} fill={color}>
    <path d="M12 26c0-5 4-9 9-9h22c5 0 9 4 9 9v8c0 4-3 7-7 7h-1v4c0 1-1 2-2 2s-2-1-2-2v-4H23v4c0 1-1 2-2 2s-2-1-2-2v-4.5c-4-.7-7-4-7-8z" />
    <path d="M50 28l6-1.5c1-.3 2 .5 2 1.5v3c0 1-1 1.8-2 1.5L50 31z" />
    <path d="M45 19l2.5-5c.4-1 1.7-1 2.1 0l1.7 4z" />
    <path d="M21 19l-2.5-5c-.4-1-1.7-1-2.1 0l-1.7 4z" />
    <path d="M48 33l3 4c.3.4 0 1-.5 1l-4-1z" />
    <path d="M48 30l3-4c.3-.4 0-1-.5-1l-4 1z" />
    <circle cx="49" cy="27" r="1.4" />
  </svg>
);

const PorceletSvg: React.FC<SvgProps> = ({ color }) => (
  <svg {...svgBaseProps} fill={color}>
    <path d="M16 32c0-7 6-12 14-12h4c8 0 14 5 14 12v4c0 4-3 7-7 7h-1v3c0 1-1 1.8-1.8 1.8s-1.8-.8-1.8-1.8v-3H23v3c0 1-1 1.8-1.8 1.8s-1.8-.8-1.8-1.8v-3.5C16 41.5 14 38 14 35z" />
    <path d="M46 30l4-1c.8-.2 1.5.4 1.5 1.2v2c0 .8-.7 1.4-1.5 1.2L46 32.5z" />
    <path d="M44 18l1-4c.3-.8 1.5-.8 1.7 0l1 3.2z" />
    <path d="M22 18l-1-4c-.3-.8-1.5-.8-1.7 0l-1 3.2z" />
    <circle cx="46" cy="29" r="1" />
    <circle cx="49" cy="31" r=".6" />
  </svg>
);

const BandeSvg: React.FC<SvgProps> = ({ color }) => (
  <svg {...svgBaseProps} fill={color}>
    <g opacity="0.45">
      <path d="M6 22c0-3 2.5-6 6-6h14c3.5 0 6 3 6 6v6c0 2.5-2 4.5-4.5 4.5H10.5C8 32.5 6 30.5 6 28z" />
      <path d="M28 26l3-1c.5-.1 1 .2 1 .8v1.5c0 .5-.5 1-1 .8L28 27.5z" />
      <path d="M26 18l1-3c.2-.5 1-.5 1.2 0l.7 2.4z" />
    </g>
    <g opacity="0.7">
      <path d="M30 30c0-3.5 3-6.5 6.5-6.5h15c3.5 0 6.5 3 6.5 6.5v6.5c0 2.5-2 4.5-4.5 4.5H34.5C32 41 30 39 30 36.5z" />
      <path d="M52 34l3.5-1c.5-.1 1 .2 1 .8v1.5c0 .5-.5 1-1 .8L52 35.5z" />
      <path d="M50 26l1-3c.2-.5 1-.5 1.2 0l.7 2.4z" />
    </g>
    <g>
      <path d="M14 38c0-4 3-7 7-7h17c4 0 7 3 7 7v6c0 3-2 5-5 5H19c-3 0-5-2-5-5z" />
      <path d="M42 42l4-1c.6-.1 1.2.3 1.2 1v2c0 .6-.6 1.1-1.2 1L42 44z" />
      <path d="M40 33l1.2-3.2c.2-.6 1.2-.6 1.4 0l.9 2.7z" />
      <path d="M18 33l-1.2-3.2c-.2-.6-1.2-.6-1.4 0l-.9 2.7z" />
    </g>
  </svg>
);

const SVG_BY_SPECIES: Record<EntitySpecies, React.FC<SvgProps>> = {
  truie: TruieSvg,
  verrat: VerratSvg,
  porcelet: PorceletSvg,
  bande: BandeSvg,
};

export const EntityAvatar: React.FC<EntityAvatarProps> = ({
  species,
  photoUrl,
  size = 'md',
  shortCode,
  className,
  useV73Defaults = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const px = SIZE_PX[size];
  const radius = RADIUS_PX[size];
  const { bg, fg } = PALETTE[species];

  const fallbackUrl = useV73Defaults ? V73_PORTRAIT[species] ?? null : null;
  const effectiveUrl = photoUrl ?? fallbackUrl;
  const showPhoto = Boolean(effectiveUrl) && !imgError;
  const Svg = SVG_BY_SPECIES[species];

  return (
    <div
      className={className}
      style={{
        width: px,
        height: px,
        borderRadius: radius,
        background: bg,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      role="img"
      aria-label={shortCode ? `Avatar ${species} ${shortCode}` : `Avatar ${species}`}
    >
      {showPhoto ? (
        <img
          src={effectiveUrl ?? undefined}
          alt={shortCode ?? species}
          loading="lazy"
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <Svg color={fg} />
      )}
    </div>
  );
};

export default EntityAvatar;
