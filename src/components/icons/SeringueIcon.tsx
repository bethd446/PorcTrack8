import type { SVGProps } from "react";

export interface AgritechIconProps extends Omit<SVGProps<SVGSVGElement>, "size"> {
  size?: number;
  className?: string;
}

/**
 * SeringueIcon — seringue vétérinaire inclinée, graduations visibles.
 * Plus spécifique que Lucide Syringe (graduations + piston explicite).
 */
export function SeringueIcon({ size = 20, className, ...props }: AgritechIconProps) {
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
      {/* Corps principal (diagonale) */}
      <path d="M4.5 19.5 L13.5 10.5" />
      {/* Réservoir (corps de la seringue) */}
      <path d="M9 6 L18 15" />
      <path d="M7.5 7.5 L16.5 16.5" />
      {/* Embouts */}
      <path d="M9 6 L10.5 4.5" />
      <path d="M7.5 7.5 L6 6" />
      {/* Piston */}
      <path d="M15 13.5 L18.5 17" />
      <path d="M17 11.5 L20.5 15" />
      {/* Poignée du piston */}
      <path d="M18.5 17 L20.5 15" />
      {/* Aiguille */}
      <path d="M4.5 19.5 L2.5 21.5" />
      {/* Graduations */}
      <path d="M10.5 12 L11.3 11.3" />
      <path d="M12 13.5 L12.8 12.8" />
      <path d="M13.5 15 L14.3 14.3" />
      {/* Goutte (optionnelle : mini détail au bout) */}
      <circle cx="3" cy="21" r="0.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default SeringueIcon;
