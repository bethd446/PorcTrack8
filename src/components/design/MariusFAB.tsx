import React from 'react';
import { Sparkles } from 'lucide-react';

interface MariusFABProps {
  online?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function MariusFAB({ online = true, onClick, className = '' }: MariusFABProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ouvrir Marius"
      className={className}
      style={{
        position: 'absolute',
        bottom: 18,
        right: 18,
        background: 'var(--amber-pork)',
        color: 'var(--ink)',
        borderRadius: '50%',
        width: 52,
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(244, 162, 97, 0.4)',
        zIndex: 5,
        border: 'none',
        cursor: 'pointer',
        transition: 'transform 160ms var(--ease-emil)',
      }}
    >
      <Sparkles size={24} strokeWidth={2} aria-hidden />
      {online && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 10,
            height: 10,
            background: 'var(--color-accent-500)',
            borderRadius: '50%',
            border: '2px solid var(--amber-pork)',
          }}
        />
      )}
    </button>
  );
}
