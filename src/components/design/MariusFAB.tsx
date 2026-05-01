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
      aria-label="Ouvrir Marius, l'assistant de l'élevage"
      className={`pressable ${className}`}
      style={{
        position: 'fixed',
        bottom: 18,
        right: 18,
        background: 'var(--amber-pork)',
        color: 'var(--ink)',
        borderRadius: '50%',
        width: 52,
        height: 52,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow:
          '0 4px 12px color-mix(in srgb, var(--amber-pork) 40%, transparent)',
        zIndex: 50,
        border: 0,
        cursor: 'pointer',
        transition: 'transform var(--duration-press, 160ms) var(--ease-emil, cubic-bezier(0.23,1,0.32,1))',
      }}
    >
      <Sparkles size={24} strokeWidth={2} aria-hidden="true" />
      {online && (
        <span
          aria-hidden="true"
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
