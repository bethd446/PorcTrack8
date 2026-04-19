import type { SVGProps } from "react";

export interface AgritechIconProps extends Omit<SVGProps<SVGSVGElement>, "size"> {
  size?: number;
  className?: string;
}

/**
 * BalanceIcon — balance/pèse (plateau + fléau + affichage).
 * Complète Lucide qui n'a pas de pictogramme "pèse animal" adapté.
 */
export function BalanceIcon({ size = 20, className, ...props }: AgritechIconProps) {
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
      {/* Plateau principal */}
      <rect x="3" y="14" width="18" height="2.5" rx="0.5" />
      {/* Pieds du plateau */}
      <path d="M5 16.5 L5 18.5" />
      <path d="M19 16.5 L19 18.5" />
      <path d="M4 18.5 L20 18.5" />
      {/* Colonne montante */}
      <path d="M12 14 L12 7" />
      {/* Afficheur */}
      <rect x="8" y="3" width="8" height="4" rx="0.5" />
      {/* Segments de l'affichage */}
      <path d="M10 5 L10.8 5" />
      <path d="M12 5 L13 5" />
      <path d="M14 5 L14.8 5" />
    </svg>
  );
}

export default BalanceIcon;
