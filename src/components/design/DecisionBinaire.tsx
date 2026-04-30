import React from 'react';
import { Check, RotateCcw } from 'lucide-react';

interface DecisionBinaireProps {
  title: string;
  subtitle: string;
  hint: string;
  confirmLabel: string;
  returnLabel: string;
  onConfirm: () => void;
  onReturn: () => void;
  className?: string;
}

export default function DecisionBinaire({
  title,
  subtitle,
  hint,
  confirmLabel,
  returnLabel,
  onConfirm,
  onReturn,
  className = '',
}: DecisionBinaireProps) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--amber-pork-soft)',
        border: '1px solid var(--amber-pork)',
        borderRadius: 12,
        padding: '16px 18px',
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        gap: 14,
        alignItems: 'center',
      }}
    >
      <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.5 }}>
        <strong
          style={{
            fontFamily: 'BigShoulders, "Big Shoulders Display", sans-serif',
            fontWeight: 600,
            color: 'var(--amber-pork-deep)',
            fontSize: 15,
            display: 'block',
            marginBottom: 3,
            letterSpacing: '-0.005em',
          }}
        >
          {title}
        </strong>
        {subtitle}
      </div>

      <button
        type="button"
        onClick={onReturn}
        aria-label={returnLabel}
        style={pillStyle({
          background: 'var(--bg-surface)',
          color: 'var(--pig-deep)',
          border: '1px solid var(--pig-deep)',
        })}
      >
        <RotateCcw size={12} strokeWidth={2} />
        {returnLabel}
      </button>

      <button
        type="button"
        onClick={onConfirm}
        aria-label={confirmLabel}
        style={pillStyle({
          background: 'var(--color-accent-500)',
          color: 'var(--bg-surface)',
          border: '1px solid var(--color-accent-500)',
        })}
      >
        <Check size={12} strokeWidth={2} />
        {confirmLabel}
      </button>

      <div
        style={{
          gridColumn: '1 / -1',
          fontFamily: 'DMMono, ui-monospace, monospace',
          fontSize: 9.5,
          letterSpacing: '0.04em',
          color: 'var(--ink-soft)',
          paddingTop: 12,
          borderTop: '1px solid rgba(244, 162, 97, 0.4)',
          marginTop: 4,
          lineHeight: 1.6,
        }}
      >
        {hint}
      </div>
    </div>
  );
}

function pillStyle(extra: React.CSSProperties): React.CSSProperties {
  return {
    fontFamily: 'DMMono, ui-monospace, monospace',
    fontSize: 10.5,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    padding: '10px 14px',
    borderRadius: 9999,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontWeight: 500,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    transition: 'transform 160ms var(--ease-emil), background 200ms var(--ease-emil)',
    ...extra,
  };
}
