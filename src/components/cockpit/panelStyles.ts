import type React from 'react';

export const panelStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  borderRadius: 12,
  boxShadow:
    '0 1px 2px rgba(17, 24, 39, 0.04), 0 1px 3px rgba(17, 24, 39, 0.06)',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
};

export const panelHeadStyle: React.CSSProperties = {
  padding: '14px 18px',
  borderBottom: '1px solid var(--line-2)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

export const panelTitleStyle: React.CSSProperties = {
  fontFamily: 'DMMono, ui-monospace, monospace',
  fontSize: 9.5,
  letterSpacing: '0.20em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
};

export const panelLinkStyle: React.CSSProperties = {
  fontFamily: 'DMMono, ui-monospace, monospace',
  fontSize: 10,
  color: 'var(--color-accent-500)',
  cursor: 'pointer',
  letterSpacing: '0.04em',
  background: 'none',
  border: 'none',
  padding: 0,
};

export const panelBodyStyle: React.CSSProperties = {
  padding: '14px 18px',
};
