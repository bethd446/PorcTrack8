import React from 'react';
import { Sparkles } from 'lucide-react';

interface MariusPanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export default function MariusPanel({
  title = 'Lecture du dossier',
  children,
  className = '',
}: MariusPanelProps) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--amber-pork-soft)',
        borderRadius: 12,
        padding: '16px 18px',
        fontSize: 13,
        lineHeight: 1.6,
        color: 'var(--ink)',
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--amber-pork-deep)',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontWeight: 500,
        }}
      >
        <Sparkles size={11} strokeWidth={0} fill="currentColor" aria-hidden />
        {title}
      </div>
      <div className="marius-content">{children}</div>
      <style>{`
        .marius-content strong { color: var(--pig-deep); font-weight: 600; }
        .marius-content strong.ink { color: var(--ink); font-weight: 600; }
      `}</style>
    </div>
  );
}
