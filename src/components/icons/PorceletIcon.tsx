import type { SVGProps } from "react";

export interface AgritechIconProps extends Omit<SVGProps<SVGSVGElement>, "size"> {
  size?: number;
  className?: string;
}

/**
 * PorceletIcon — profil porcelet (silhouette plus petite, trapue, queue
 * en tire-bouchon marquée). Style "tracé ingénieur".
 */
export function PorceletIcon({ size = 20, className, ...props }: AgritechIconProps) {
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
      {/* Corps compact */}
      <path d="M6 15 C6 13 7.5 12 9.5 12 L15 12 C17 12 18.5 13 18.5 14.5 L18.5 16 C18.5 16.7 18 17 17.5 17 L7 17 C6.5 17 6 16.7 6 16 Z" />
      {/* Tête / groin */}
      <path d="M18.5 14 L20 13.5 L20.3 14.5 L20 15.3 L18.5 15" />
      {/* Oreille */}
      <path d="M17 12.3 L17.3 11 L18.3 11.7" />
      {/* Œil */}
      <circle cx="18.8" cy="14" r="0.3" fill="currentColor" stroke="none" />
      {/* Queue en tire-bouchon */}
      <path d="M6 14 C5 13.8 4.8 13 5.5 12.8 C6 12.7 6 13.5 5.3 13.5" />
      {/* Petites pattes */}
      <path d="M8.5 17 L8.5 20" />
      <path d="M10.5 17 L10.5 20" />
      <path d="M14 17 L14 20" />
      <path d="M16 17 L16 20" />
    </svg>
  );
}

export default PorceletIcon;
