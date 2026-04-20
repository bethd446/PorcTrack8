// IsoBarn — isometric diagram of the farm's buildings + animal flow.
// Field-view style: technical, restrained, color-coded by building accent.
//
// Props:
//   buildings: [{ id, label, x, y, w, d, h, tone, fill, cap }]
//   arrows:    [{ from: id, to: id }]
//   onTap:     (id) => void
//   highlight: id to pulse
//
// Grid coords (x right-forward, y left-forward, z up). U = unit size in px.

const U = 22;           // base unit
const COS = 0.866;
const SIN = 0.5;

// project (gx, gy, gz) → screen (sx, sy)
function iso(gx, gy, gz = 0) {
  return [ U * COS * (gx - gy), U * SIN * (gx + gy) - U * gz ];
}

// Build an SVG path "M x,y L x,y L x,y Z" from an array of points.
function pathFrom(pts) {
  return 'M ' + pts.map(p => p.join(',')).join(' L ') + ' Z';
}

// ── One building ────────────────────────────────────────────────────
function IsoBuilding({ b, offsetX, offsetY, pulse = false, onTap }) {
  const { x, y, w, d, h, tone = 'var(--accent)', fill = 0, cap } = b;

  // Corner helper with global offset
  const C = (gx, gy, gz) => {
    const [sx, sy] = iso(gx, gy, gz);
    return [sx + offsetX, sy + offsetY];
  };

  // Corners — floor (A,B,C,D) and roof (A',B',C',D')
  const A  = C(x,     y,     0);
  const B  = C(x + w, y,     0);
  const Cc = C(x + w, y + d, 0);
  const D  = C(x,     y + d, 0);
  const Ap = C(x,     y,     h);
  const Bp = C(x + w, y,     h);
  const Cp = C(x + w, y + d, h);
  const Dp = C(x,     y + d, h);

  // Faces
  const topFace   = [Ap, Bp, Cp, Dp];      // roof
  const leftFace  = [Ap, Bp, B,  A];       // y=0 side
  const rightFace = [Bp, Cp, Cc, B];       // x=w side

  // Occupancy bar — draws on the TOP face, as a parallelogram fill from back to front
  // along the y-axis (shorter = emptier).
  const occDepth = d * Math.max(0, Math.min(1, fill));
  const occA = C(x,     y,         h + 0.01);
  const occB = C(x + w, y,         h + 0.01);
  const occC = C(x + w, y + occDepth, h + 0.01);
  const occD = C(x,     y + occDepth, h + 0.01);

  // Door on the front face (center of y=0 side), small rectangle
  const doorW = Math.min(0.7, w * 0.35);
  const doorH = Math.min(1.0, h * 0.55);
  const doorCx = x + w / 2;
  const dA = C(doorCx - doorW / 2, y, 0);
  const dB = C(doorCx + doorW / 2, y, 0);
  const dC = C(doorCx + doorW / 2, y, doorH);
  const dD = C(doorCx - doorW / 2, y, doorH);

  // Subtle vent strips on the roof (2 lines parallel to x axis)
  const ventY1 = y + d * 0.33;
  const ventY2 = y + d * 0.66;
  const v1a = C(x + w * 0.15, ventY1, h + 0.02);
  const v1b = C(x + w * 0.85, ventY1, h + 0.02);
  const v2a = C(x + w * 0.15, ventY2, h + 0.02);
  const v2b = C(x + w * 0.85, ventY2, h + 0.02);

  const toneMix = `color-mix(in srgb, ${tone} 40%, var(--bg-2))`;
  const toneDim = `color-mix(in srgb, ${tone} 20%, var(--bg-1))`;
  const edgeCol = `color-mix(in srgb, ${tone} 60%, var(--border))`;

  return (
    <g
      onClick={onTap ? () => onTap(b.id) : undefined}
      style={{ cursor: onTap ? 'pointer' : 'default' }}
    >
      {/* right face — darkest */}
      <path d={pathFrom(rightFace)} fill="var(--bg-1)" stroke={edgeCol} strokeWidth="1" strokeLinejoin="round" />
      {/* left face — mid */}
      <path d={pathFrom(leftFace)}  fill={toneDim}     stroke={edgeCol} strokeWidth="1" strokeLinejoin="round" />
      {/* top face — lightest */}
      <path d={pathFrom(topFace)}   fill="var(--bg-2)" stroke={edgeCol} strokeWidth="1" strokeLinejoin="round" />
      {/* occupancy tint on top */}
      {fill > 0 && (
        <path d={pathFrom([occA, occB, occC, occD])} fill={toneMix} opacity="0.85" />
      )}
      {/* vents */}
      <line x1={v1a[0]} y1={v1a[1]} x2={v1b[0]} y2={v1b[1]} stroke={edgeCol} strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      <line x1={v2a[0]} y1={v2a[1]} x2={v2b[0]} y2={v2b[1]} stroke={edgeCol} strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      {/* door */}
      <path d={pathFrom([dA, dB, dC, dD])} fill="var(--bg-0)" stroke={edgeCol} strokeWidth="0.8" />
      {/* pulse ring */}
      {pulse && (
        <circle
          cx={(Ap[0] + Cp[0]) / 2}
          cy={(Ap[1] + Cp[1]) / 2}
          r={U * Math.max(w, d) * 0.6}
          fill="none"
          stroke={tone}
          strokeWidth="1.5"
          opacity="0.7"
        >
          <animate attributeName="r" from={U * Math.max(w, d) * 0.45} to={U * Math.max(w, d) * 0.9} dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.7" to="0" dur="2.2s" repeatCount="indefinite" />
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
}

// ── Ground plane (subtle grid) ──────────────────────────────────────
function GroundPlane({ size = 10, offsetX, offsetY }) {
  const lines = [];
  for (let i = 0; i <= size; i++) {
    // lines along x
    const [x1, y1] = iso(0, i, 0);
    const [x2, y2] = iso(size, i, 0);
    lines.push(<line key={`x${i}`} x1={x1 + offsetX} y1={y1 + offsetY} x2={x2 + offsetX} y2={y2 + offsetY} stroke="var(--border)" strokeWidth="0.5" opacity="0.45" />);
    // lines along y
    const [x3, y3] = iso(i, 0, 0);
    const [x4, y4] = iso(i, size, 0);
    lines.push(<line key={`y${i}`} x1={x3 + offsetX} y1={y3 + offsetY} x2={x4 + offsetX} y2={y4 + offsetY} stroke="var(--border)" strokeWidth="0.5" opacity="0.45" />);
  }
  return <g>{lines}</g>;
}

// ── Flow arrow between two buildings (centers) ─────────────────────
function FlowArrow({ from, to, buildings, offsetX, offsetY, tone = 'var(--text-2)' }) {
  const bFrom = buildings.find(b => b.id === from);
  const bTo   = buildings.find(b => b.id === to);
  if (!bFrom || !bTo) return null;
  const [fx, fy] = iso(bFrom.x + bFrom.w / 2, bFrom.y + bFrom.d / 2, bFrom.h + 0.2);
  const [tx, ty] = iso(bTo.x + bTo.w / 2,     bTo.y + bTo.d / 2,     bTo.h + 0.2);
  const sx = fx + offsetX, sy = fy + offsetY;
  const ex = tx + offsetX, ey = ty + offsetY;
  // Mid control point above
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2 - 16;
  const d = `M ${sx},${sy} Q ${mx},${my} ${ex},${ey}`;
  const id = `arr-${from}-${to}`;
  return (
    <g>
      <defs>
        <marker id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0,0 L 10,5 L 0,10 Z" fill={tone} />
        </marker>
      </defs>
      <path d={d} fill="none" stroke={tone} strokeWidth="1.2" strokeDasharray="3 3" markerEnd={`url(#${id})`} opacity="0.75" />
    </g>
  );
}

// ── Main component ──────────────────────────────────────────────────
function IsoBarn({ buildings, arrows = [], onTap, highlight, width = 340, height = 230 }) {
  // Center the layout
  const offsetX = width / 2;
  const offsetY = height - 40;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {/* subtle background */}
      <defs>
        <radialGradient id="iso-bg" cx="50%" cy="60%" r="70%">
          <stop offset="0%" stopColor="color-mix(in srgb, var(--accent) 6%, transparent)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill="url(#iso-bg)" />
      <GroundPlane size={8} offsetX={offsetX} offsetY={offsetY} />
      {/* arrows UNDER buildings so they appear between them */}
      {arrows.map((a, i) => (
        <FlowArrow key={i} from={a.from} to={a.to} buildings={buildings} offsetX={offsetX} offsetY={offsetY} tone={a.tone} />
      ))}
      {/* buildings sorted by y descending so "back" renders first */}
      {[...buildings].sort((a, b) => (a.y + a.d / 2) - (b.y + b.d / 2)).map(b => (
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
}

window.IsoBarn = IsoBarn;
