import React from 'react';

interface SparklineProps {
  points: number[];
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
}

/**
 * Sparkline minimaliste. SVG 56×22 par défaut, viewBox normalisé.
 * Couleur héritée par défaut de `currentColor` pour suivre le contexte parent.
 */
export default function Sparkline({
  points,
  width = 56,
  height = 22,
  stroke = 'currentColor',
  strokeWidth = 1.5,
  className,
}: SparklineProps) {
  if (!points || points.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className={className}
        aria-hidden="true"
      />
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = points.length > 1 ? width / (points.length - 1) : 0;

  const polyPoints = points
    .map((v, i) => {
      const x = i * stepX;
      // Inversion verticale + petite marge top/bottom (3px)
      const y = height - 3 - ((v - min) / range) * (height - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <polyline
        points={polyPoints}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
