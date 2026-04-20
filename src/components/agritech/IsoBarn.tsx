/**
 * IsoBarn — isometric diagram of a farm's buildings + animal flow.
 * ════════════════════════════════════════════════════════════════
 *
 * Pure SVG rendering (no external deps). Ported from
 * `docs/design-mockups/_shared/components/IsoBarn.jsx` with:
 *  - strict TypeScript types (Building, Arrow)
 *  - CSS var tokens only (no hardcoded hex)
 *  - a11y: role="img" + aria-label on the <svg>, tabIndex on tappable groups
 *
 * Grid coords (x right-forward, y left-forward, z up). U = unit size in px.
 * Projection uses the classic (cos30°, sin30°) ≈ (0.866, 0.5) isometric basis.
 */

import React from 'react';

/** Base unit in screen pixels — DO NOT change (proportions are calibrated). */
export const U = 22;
/** cos(30°) — isometric horizontal factor. */
export const COS = 0.866;
/** sin(30°) — isometric vertical factor. */
export const SIN = 0.5;

/** A 2D screen-space point after isometric projection. */
export type Point2D = readonly [number, number];

/**
 * Project a grid (gx, gy, gz) coordinate to screen (sx, sy).
 * Origin is centred by the caller via `offsetX` / `offsetY`.
 */
export function iso(gx: number, gy: number, gz = 0): Point2D {
  return [U * COS * (gx - gy), U * SIN * (gx + gy) - U * gz];
}

/** Build an SVG `d` path string "M x,y L x,y … Z" from a list of points. */
export function pathFrom(pts: readonly Point2D[]): string {
  return 'M ' + pts.map((p) => `${p[0]},${p[1]}`).join(' L ') + ' Z';
}

/**
 * A building on the iso grid.
 *
 * Units are grid units; screen size scales with {@link U}.
 *
 * @property id     Unique identifier (used for arrows + onTap callback).
 * @property label  Human-readable label (not currently rendered — reserved
 *                  for future tooltip/accessibility work; the short `cap`
 *                  code is what's drawn above the roof).
 * @property x,y    South-west footprint corner on the grid.
 * @property w,d    Width (x axis) and depth (y axis).
 * @property h      Height (z axis).
 * @property tone   CSS color expression (e.g. `var(--accent)`). Used for
 *                  the roof tint, cap label, and edges.
 * @property fill   Occupancy ratio [0..1]. Draws a parallelogram tint on
 *                  the roof from the back edge towards the front.
 * @property cap    Short code (e.g. `M1`, `PS3`) rendered above the roof.
 */
export interface Building {
  id: string;
  label?: string;
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  /** CSS color expression (e.g. `var(--accent)`). Defaults to `var(--accent)`. */
  tone?: string;
  /** Occupancy ratio [0..1]. Defaults to 0 (empty). */
  fill?: number;
  /** Short code rendered above the roof (monospace). */
  cap?: string;
}

/**
 * A directed flow arrow between two buildings. Drawn as a dashed quadratic
 * curve from the centre-top of `from` to the centre-top of `to`.
 */
export interface Arrow {
  from: Building['id'];
  to: Building['id'];
  /** Optional CSS color; defaults to `var(--text-2)`. */
  tone?: string;
}

// ── IsoBuilding ─────────────────────────────────────────────────────

interface IsoBuildingProps {
  b: Building;
  offsetX: number;
  offsetY: number;
  pulse?: boolean;
  onTap?: (id: string) => void;
}

const IsoBuilding: React.FC<IsoBuildingProps> = ({
  b,
  offsetX,
  offsetY,
  pulse = false,
  onTap,
}) => {
  const {
    x,
    y,
    w,
    d,
    h,
    tone = 'var(--accent)',
    fill = 0,
    cap,
    label,
  } = b;

  // Corner helper with global offset.
  const C = (gx: number, gy: number, gz: number): Point2D => {
    const [sx, sy] = iso(gx, gy, gz);
    return [sx + offsetX, sy + offsetY];
  };

  // Corners — floor (A,B,Cc,D) and roof (Ap,Bp,Cp,Dp)
  const A = C(x, y, 0);
  const B = C(x + w, y, 0);
  const Cc = C(x + w, y + d, 0);
  const D = C(x, y + d, 0);
  const Ap = C(x, y, h);
  const Bp = C(x + w, y, h);
  const Cp = C(x + w, y + d, h);
  const Dp = C(x, y + d, h);

  // Faces
  const topFace: Point2D[] = [Ap, Bp, Cp, Dp];
  const leftFace: Point2D[] = [Ap, Bp, B, A];
  const rightFace: Point2D[] = [Bp, Cp, Cc, B];

  // Occupancy parallelogram on the roof, grown along the y axis.
  const clampedFill = Math.max(0, Math.min(1, fill));
  const occDepth = d * clampedFill;
  const occA = C(x, y, h + 0.01);
  const occB = C(x + w, y, h + 0.01);
  const occC = C(x + w, y + occDepth, h + 0.01);
  const occD = C(x, y + occDepth, h + 0.01);

  // Door on the front (y=0) face.
  const doorW = Math.min(0.7, w * 0.35);
  const doorH = Math.min(1.0, h * 0.55);
  const doorCx = x + w / 2;
  const dA = C(doorCx - doorW / 2, y, 0);
  const dB = C(doorCx + doorW / 2, y, 0);
  const dC = C(doorCx + doorW / 2, y, doorH);
  const dD = C(doorCx - doorW / 2, y, doorH);

  // Roof vents (2 lines along x axis).
  const ventY1 = y + d * 0.33;
  const ventY2 = y + d * 0.66;
  const v1a = C(x + w * 0.15, ventY1, h + 0.02);
  const v1b = C(x + w * 0.85, ventY1, h + 0.02);
  const v2a = C(x + w * 0.15, ventY2, h + 0.02);
  const v2b = C(x + w * 0.85, ventY2, h + 0.02);

  const toneMix = `color-mix(in srgb, ${tone} 40%, var(--bg-2))`;
  const toneDim = `color-mix(in srgb, ${tone} 20%, var(--bg-1))`;
  const edgeCol = `color-mix(in srgb, ${tone} 60%, var(--border))`;

  const interactive = Boolean(onTap);
  const groupProps = interactive
    ? {
        role: 'button',
        tabIndex: 0,
        'aria-label': label ?? cap ?? b.id,
        onClick: () => onTap?.(b.id),
        onKeyDown: (e: React.KeyboardEvent<SVGGElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onTap?.(b.id);
          }
        },
        style: { cursor: 'pointer', outline: 'none' } as React.CSSProperties,
      }
    : {
        style: { cursor: 'default' } as React.CSSProperties,
      };

  const pulseR = U * Math.max(w, d) * 0.6;
  const pulseFrom = U * Math.max(w, d) * 0.45;
  const pulseTo = U * Math.max(w, d) * 0.9;

  return (
    <g {...groupProps}>
      {/* right face — darkest */}
      <path
        d={pathFrom(rightFace)}
        fill="var(--bg-1)"
        stroke={edgeCol}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* left face — mid */}
      <path
        d={pathFrom(leftFace)}
        fill={toneDim}
        stroke={edgeCol}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* top face — lightest */}
      <path
        d={pathFrom(topFace)}
        fill="var(--bg-2)"
        stroke={edgeCol}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* occupancy tint on top */}
      {clampedFill > 0 && (
        <path
          d={pathFrom([occA, occB, occC, occD])}
          fill={toneMix}
          opacity="0.85"
        />
      )}
      {/* vents */}
      <line
        x1={v1a[0]}
        y1={v1a[1]}
        x2={v1b[0]}
        y2={v1b[1]}
        stroke={edgeCol}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.7"
      />
      <line
        x1={v2a[0]}
        y1={v2a[1]}
        x2={v2b[0]}
        y2={v2b[1]}
        stroke={edgeCol}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.7"
      />
      {/* door */}
      <path
        d={pathFrom([dA, dB, dC, dD])}
        fill="var(--bg-0)"
        stroke={edgeCol}
        strokeWidth="0.8"
      />
      {/* pulse ring */}
      {pulse && (
        <circle
          cx={(Ap[0] + Cp[0]) / 2}
          cy={(Ap[1] + Cp[1]) / 2}
          r={pulseR}
          fill="none"
          stroke={tone}
          strokeWidth="1.5"
          opacity="0.7"
        >
          <animate
            attributeName="r"
            from={pulseFrom}
            to={pulseTo}
            dur="2.2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            from="0.7"
            to="0"
            dur="2.2s"
            repeatCount="indefinite"
          />
        </circle>
      )}
      {/* cap label (code) — above roof */}
      {cap && (
        <text
          x={(Ap[0] + Cp[0]) / 2}
          y={(Ap[1] + Cp[1]) / 2 - 4}
          fill={tone}
          fontFamily="var(--font-mono, 'DMMono', monospace)"
          fontSize="9"
          fontWeight="600"
          textAnchor="middle"
          style={{ letterSpacing: '0.06em' }}
        >
          {cap}
        </text>
      )}
    </g>
  );
};

// ── GroundPlane ─────────────────────────────────────────────────────

interface GroundPlaneProps {
  size?: number;
  offsetX: number;
  offsetY: number;
}

const GroundPlane: React.FC<GroundPlaneProps> = ({
  size = 10,
  offsetX,
  offsetY,
}) => {
  const lines: React.ReactNode[] = [];
  for (let i = 0; i <= size; i++) {
    const [x1, y1] = iso(0, i, 0);
    const [x2, y2] = iso(size, i, 0);
    lines.push(
      <line
        key={`x${i}`}
        x1={x1 + offsetX}
        y1={y1 + offsetY}
        x2={x2 + offsetX}
        y2={y2 + offsetY}
        stroke="var(--border)"
        strokeWidth="0.5"
        opacity="0.45"
      />,
    );
    const [x3, y3] = iso(i, 0, 0);
    const [x4, y4] = iso(i, size, 0);
    lines.push(
      <line
        key={`y${i}`}
        x1={x3 + offsetX}
        y1={y3 + offsetY}
        x2={x4 + offsetX}
        y2={y4 + offsetY}
        stroke="var(--border)"
        strokeWidth="0.5"
        opacity="0.45"
      />,
    );
  }
  return <g aria-hidden="true">{lines}</g>;
};

// ── FlowArrow ───────────────────────────────────────────────────────

interface FlowArrowProps {
  from: Building['id'];
  to: Building['id'];
  buildings: readonly Building[];
  offsetX: number;
  offsetY: number;
  tone?: string;
}

const FlowArrow: React.FC<FlowArrowProps> = ({
  from,
  to,
  buildings,
  offsetX,
  offsetY,
  tone = 'var(--text-2)',
}) => {
  const bFrom = buildings.find((b) => b.id === from);
  const bTo = buildings.find((b) => b.id === to);
  if (!bFrom || !bTo) return null;

  const [fx, fy] = iso(
    bFrom.x + bFrom.w / 2,
    bFrom.y + bFrom.d / 2,
    bFrom.h + 0.2,
  );
  const [tx, ty] = iso(bTo.x + bTo.w / 2, bTo.y + bTo.d / 2, bTo.h + 0.2);
  const sx = fx + offsetX;
  const sy = fy + offsetY;
  const ex = tx + offsetX;
  const ey = ty + offsetY;
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2 - 16;
  const d = `M ${sx},${sy} Q ${mx},${my} ${ex},${ey}`;
  const markerId = `arr-${from}-${to}`;

  return (
    <g aria-hidden="true">
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 0,0 L 10,5 L 0,10 Z" fill={tone} />
        </marker>
      </defs>
      <path
        d={d}
        fill="none"
        stroke={tone}
        strokeWidth="1.2"
        strokeDasharray="3 3"
        markerEnd={`url(#${markerId})`}
        opacity="0.75"
      />
    </g>
  );
};

// ── IsoBarn (main) ──────────────────────────────────────────────────

export interface IsoBarnProps {
  /** Buildings to render. */
  buildings: readonly Building[];
  /** Optional directed flow arrows between buildings. */
  arrows?: readonly Arrow[];
  /** Tap callback — when set, each building becomes keyboard-activatable. */
  onTap?: (id: string) => void;
  /** Optional building id to pulse (e.g. selected state). */
  highlight?: string | null;
  /** SVG viewBox width. Defaults to 340. */
  width?: number;
  /** SVG viewBox height. Defaults to 230. */
  height?: number;
  /** Accessible label for the whole diagram. */
  ariaLabel?: string;
  /** Optional className forwarded on the root <svg>. */
  className?: string;
}

/**
 * Isometric farm-barn diagram (pure SVG, no deps).
 *
 * Buildings are painter-sorted by front-to-back depth so occlusion is
 * correct for typical farm layouts. Arrows render under buildings so
 * they appear "between" them.
 */
const IsoBarn: React.FC<IsoBarnProps> = ({
  buildings,
  arrows = [],
  onTap,
  highlight,
  width = 340,
  height = 230,
  ariaLabel = 'Diagramme isométrique des bâtiments',
  className,
}) => {
  const offsetX = width / 2;
  const offsetY = height - 40;

  return (
    <svg
      className={className}
      role="img"
      aria-label={ariaLabel}
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
    >
      {/* subtle background halo */}
      <defs>
        <radialGradient id="iso-bg" cx="50%" cy="60%" r="70%">
          <stop
            offset="0%"
            stopColor="color-mix(in srgb, var(--accent) 6%, transparent)"
          />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill="url(#iso-bg)" />

      <GroundPlane size={8} offsetX={offsetX} offsetY={offsetY} />

      {/* arrows UNDER buildings so they appear between them */}
      {arrows.map((a, i) => (
        <FlowArrow
          key={`${a.from}-${a.to}-${i}`}
          from={a.from}
          to={a.to}
          buildings={buildings}
          offsetX={offsetX}
          offsetY={offsetY}
          tone={a.tone}
        />
      ))}

      {/* buildings sorted by front-to-back so "back" renders first */}
      {[...buildings]
        .sort((a, b) => a.y + a.d / 2 - (b.y + b.d / 2))
        .map((b) => (
          <IsoBuilding
            key={b.id}
            b={b}
            offsetX={offsetX}
            offsetY={offsetY}
            pulse={highlight === b.id}
            onTap={onTap}
          />
        ))}
    </svg>
  );
};

export default IsoBarn;
