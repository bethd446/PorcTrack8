import React from 'react';
import { Button } from '@/design-system';

interface MariusFABProps {
  online?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function MariusFAB({ online = true, onClick, className = '' }: MariusFABProps) {
  return (
    <Button
      type="button"
      variant="primary"
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
        width: 56,
        height: 56,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow:
          '0 4px 12px color-mix(in srgb, var(--amber-pork) 40%, transparent)',
        zIndex: 50,
        border: 0,
        cursor: 'pointer',
        transition: 'transform var(--duration-press, 160ms) var(--ease-emil, cubic-bezier(0.23,1,0.32,1))',
        textTransform: 'none',
        padding: 0,
      }}
    >
      <img
        src="/images/marius-avatar.webp"
        alt=""
        aria-hidden="true"
        width={36}
        height={36}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          objectFit: 'cover',
        }}
      />
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
    </Button>
  );
}
