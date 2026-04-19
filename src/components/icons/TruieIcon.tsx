import type { SVGProps } from "react";

export interface AgritechIconProps extends Omit<SVGProps<SVGSVGElement>, "size"> {
  size?: number;
  className?: string;
}

/**
 * TruieIcon — profil truie adulte (corps allongé, oreilles tombantes, mamelles).
 * Style "tracé ingénieur" : stroke 1.5, no fill, hérite currentColor.
 */
export function TruieIcon({ size = 20, className, ...props }: AgritechIconProps) {
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
      {/* Corps allongé */}
      <path d="M3.5 14.5 C3.5 11.5 6 10 9 10 L16.5 10 C18.5 10 20.5 11 20.5 13.5 L20.5 15 C20.5 16 19.8 16.5 19 16.5 L5 16.5 C4.2 16.5 3.5 16 3.5 15.2 Z" />
      {/* Tête + groin */}
      <path d="M20.5 13 L22 12.5 L22.5 13.5 L22 14.5 L20.5 14" />
      {/* Oreille tombante */}
      <path d="M19 10.5 L19.5 8.5 L21 9.5" />
      {/* Œil */}
      <circle cx="20.5" cy="12.5" r="0.35" fill="currentColor" stroke="none" />
      {/* Queue en tire-bouchon */}
      <path d="M3.5 13 C2.5 12.5 2.5 11.5 3.5 11.5 C4.2 11.5 4.2 12.5 3.2 12.5" />
      {/* Pattes */}
      <path d="M7 16.5 L7 20" />
      <path d="M10 16.5 L10 20" />
      <path d="M15 16.5 L15 20" />
      <path d="M18 16.5 L18 20" />
      {/* Mamelle (petit trait ventral) */}
      <path d="M11 16.5 L11 17.5" />
      <path d="M13 16.5 L13 17.5" />
    </svg>
  );
}

export default TruieIcon;
