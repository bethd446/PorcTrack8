// Primitives for the PorcTrack 8 mobile UI kit.
// Globals: React. Exposes components on window.

const { useState, useEffect } = React;

// ── Icon wrapper (Lucide via CDN) ────────────────────────────────────
// lucide UMD exposes icons directly on `window.lucide.<PascalName>` as an
// array of child nodes: [ [tagName, attrs], [tagName, attrs], ... ].
function renderLucideNode(node, i) {
  if (!Array.isArray(node)) return null;
  const [tag, attrs, children] = node;
  // Convert kebab-case attrs to React's camelCase where needed.
  const reactAttrs = {};
  for (const k in attrs) {
    if (k === 'stroke-width') reactAttrs.strokeWidth = attrs[k];
    else if (k === 'stroke-linecap') reactAttrs.strokeLinecap = attrs[k];
    else if (k === 'stroke-linejoin') reactAttrs.strokeLinejoin = attrs[k];
    else if (k === 'clip-path') reactAttrs.clipPath = attrs[k];
    else if (k === 'fill-rule') reactAttrs.fillRule = attrs[k];
    else reactAttrs[k] = attrs[k];
  }
  const kids = Array.isArray(children) ? children.map(renderLucideNode) : null;
  return React.createElement(tag, { key: i, ...reactAttrs }, kids);
}

function Icon({ name, size = 20, stroke = 1.7, color = 'currentColor', style }) {
  const tree = window.lucide?.[name];
  const children = Array.isArray(tree) ? tree.map(renderLucideNode) : [<circle key="fb" cx="12" cy="12" r="3" />];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
    >
      {children}
    </svg>
  );
}

// ── Chip ────────────────────────────────────────────────────────────
function Chip({ tone = 'default', children, solid = false, style }) {
  const cls = solid ? 'chip chip--solid-accent' : (tone === 'default' ? 'chip' : `chip chip--${tone}`);
  return <span className={cls} style={style}>{children}</span>;
}

// ── Button ──────────────────────────────────────────────────────────
function Button({ variant = 'primary', children, onClick, style, compact = false, icon }) {
  const h = compact ? { minHeight: 36, padding: '0 14px', fontSize: 13 } : {};
  return (
    <button className={`btn btn-${variant}`} style={{ ...h, ...style }} onClick={onClick}>
      {icon && <Icon name={icon} size={compact ? 14 : 16} stroke={2} />}
      {children}
    </button>
  );
}

// ── Card ────────────────────────────────────────────────────────────
function Card({ children, flat = false, style, onClick }) {
  return (
    <div
      className={`${flat ? 'card-flat' : 'card-dense'} ${onClick ? 'pressable' : ''}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ── SectionDivider ──────────────────────────────────────────────────
function SectionDivider({ children, accent = 'var(--accent)', style }) {
  return (
    <div className="section-divider" style={{ '--accent': accent, ...style }}>
      <span className="label kpi-label" style={{ color: accent }}>{children}</span>
    </div>
  );
}

// ── KpiCard ─────────────────────────────────────────────────────────
function KpiCard({ label, value, tone = 'var(--text-0)', delta, icon }) {
  return (
    <Card style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && <span style={{ color: tone, display: 'inline-flex' }}><Icon name={icon} size={14} /></span>}
        <span className="kpi-label">{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 10 }}>
        <span className="ft-code" style={{ fontSize: 32, fontWeight: 700, color: tone, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        {delta && <span className="ft-code" style={{ fontSize: 11, color: 'var(--text-2)' }}>{delta}</span>}
      </div>
    </Card>
  );
}

// ── DataRow ─────────────────────────────────────────────────────────
function DataRow({ icon, iconTone = 'var(--accent)', primary, secondary, chip, onClick, accessory = 'ChevronRight' }) {
  return (
    <div className={`data-row ${onClick ? 'data-row--hover pressable' : ''}`} onClick={onClick}>
      {icon && (
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-1)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconTone, flexShrink: 0 }}>
          {typeof icon === 'string' ? <Icon name={icon} size={18} /> : icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span className="ft-code" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-0)', letterSpacing: 0 }}>{primary}</span>
          {chip}
        </div>
        {secondary && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{secondary}</div>}
      </div>
      {accessory && <Icon name={accessory} size={16} color="var(--text-2)" />}
    </div>
  );
}

// ── HubTile ─────────────────────────────────────────────────────────
function HubTile({ title, subtitle, count, icon, tone = 'var(--accent)', onClick }) {
  return (
    <div className="card-dense pressable" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 110 }} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-1)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tone }}>
          {typeof icon === 'string' ? <Icon name={icon} size={16} color={tone} /> : icon}
        </div>
        {count != null && <span className="ft-code" style={{ fontSize: 20, fontWeight: 700, color: tone, letterSpacing: '-0.01em' }}>{count}</span>}
      </div>
      <div>
        <div className="ft-heading" style={{ fontSize: 14, color: 'var(--text-0)', lineHeight: 1.1 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

Object.assign(window, { Icon, Chip, Button, Card, SectionDivider, KpiCard, DataRow, HubTile });
