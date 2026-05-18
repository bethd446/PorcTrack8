/**
 * V70 — PigSilhouette icon
 *
 * Silhouette de cochon trait fin, style cohérent avec Lucide (strokeWidth 1.5,
 * stroke=currentColor, viewBox 0 0 24 24).
 *
 * Remplace les emojis cochon (jugés "AI-generated 2026" par règle anti-AI)
 * sur la BottomNav (tab Élevage) et l'illustration onboarding éducatif.
 *
 * Lucide n'expose ni Pig ni Boar ; PiggyBank renvoie une tirelire (mauvais
 * sens métier). On dessine donc notre propre silhouette inline.
 */
import React from 'react';

export interface PigSilhouetteProps {
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const PigSilhouette: React.FC<PigSilhouetteProps> = ({
  size = 18,
  strokeWidth = 1.5,
  color = 'currentColor',
  className,
  style,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden="true"
  >
    {/* Corps : ovale stylisé regardant à droite */}
    <path d="M4 13c0-3.3 3.1-6 7-6 2.4 0 4.6 1 6 2.7l2.5-1.2-.7 2.6c.4.6.7 1.3.8 2.1.2 1.6-.5 3.1-1.8 4.1l-.8 2.2-2.1-.4c-.6.2-1.2.3-1.9.3H11c-.9 0-1.7-.2-2.4-.5L7 20l-1-2.3C4.8 16.7 4 15 4 13Z" />
    {/* Oreille */}
    <path d="M7.5 9.5c-.4-.9-.2-1.9.5-2.6" />
    {/* Groin (deux narines) */}
    <circle cx="17.3" cy="12.4" r="0.5" fill={color} />
    <circle cx="17.8" cy="13.4" r="0.4" fill={color} />
    {/* Œil */}
    <circle cx="14.2" cy="11" r="0.5" fill={color} />
    {/* Queue en tire-bouchon */}
    <path d="M5 12c-.8-.4-1.4-1-1.4-1.7 0-.6.5-1 1-.7" />
  </svg>
);

export default PigSilhouette;
