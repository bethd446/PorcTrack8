import type { SVGProps } from "react";

export interface AgritechIconProps extends Omit<SVGProps<SVGSVGElement>, "size"> {
  size?: number;
  className?: string;
}

/**
 * BandeIcon — 3 porcelets alignés représentant un lot / bande.
 * Style "tracé ingénieur".
 */
export function BandeIcon({ size = 20, className, ...props }: AgritechIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Porcelet arrière (plus petit, en profondeur) */}
      <path d="M2.5 12 L2.5 13.5 L6.5 13.5 L6.5 12" />
      <path d="M6.5 12.5 L7.5 12.2 L7.7 12.9 L7.5 13.4 L6.5 13.2" />
      <path d="M3 13.5 L3 15" />
      <path d="M5.5 13.5 L5.5 15" />

      {/* Porcelet central */}
      <path d="M7.5 14 L7.5 15.8 L13.5 15.8 L13.5 14" />
      <path d="M13.5 14.5 L14.8 14.2 L15 15 L14.8 15.7 L13.5 15.5" />
      <path d="M8.5 15.8 L8.5 17.5" />
      <path d="M12 15.8 L12 17.5" />

      {/* Porcelet avant (plus grand) */}
      <path d="M14.5 15 L14.5 17.5 L21 17.5 L21 15" />
      <path d="M21 15.5 L22.6 15.2 L23 16.2 L22.6 17.3 L21 17" />
      <path d="M15.8 17.5 L15.8 19.5" />
      <path d="M20 17.5 L20 19.5" />

      {/* Yeux pour signifier 3 individus */}
      <circle cx="6.7" cy="12.8" r="0.25" fill="currentColor" stroke="none" />
      <circle cx="14.2" cy="14.7" r="0.3" fill="currentColor" stroke="none" />
      <circle cx="21.5" cy="16" r="0.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default BandeIcon;
