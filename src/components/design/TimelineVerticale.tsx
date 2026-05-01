import React from 'react';
import { Activity, Heart, Scale, FileText } from 'lucide-react';

export type TimelineItemType = 'repro' | 'health' | 'weight' | 'note';

export interface TimelineItem {
  type: TimelineItemType;
  date: string;
  tag: string;
  title: string;
  description: string;
  meta?: string;
}

interface TimelineVerticaleProps {
  items: TimelineItem[];
  className?: string;
}

const MARKER_BG: Record<TimelineItemType, string> = {
  repro: 'var(--pig)',
  health: 'var(--color-accent-500)',
  weight: 'var(--color-info)',
  note: 'var(--ink)',
};

const TAG_STYLE: Record<TimelineItemType, React.CSSProperties> = {
  repro: { background: 'var(--pig-soft)', color: 'var(--pig-deep)' },
  health: { background: 'var(--color-accent-100)', color: 'var(--color-accent-600)' },
  weight: { background: 'var(--color-accent-100)', color: 'var(--color-info)' },
  note: { background: 'var(--bg-surface-2)', color: 'var(--muted)' },
};

const ICONS: Record<TimelineItemType, React.ReactNode> = {
  repro: <Activity size={8} color="var(--bg-surface)" />,
  health: <Heart size={8} color="var(--bg-surface)" />,
  weight: <Scale size={8} color="var(--bg-surface)" />,
  note: <FileText size={8} color="var(--bg-surface)" />,
};

export default function TimelineVerticale({ items, className = '' }: TimelineVerticaleProps) {
  if (items.length === 0) {
    return (
      <div
        className={className}
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 12,
          padding: '24px 22px',
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--muted)',
          fontStyle: 'italic',
        }}
      >
        Aucun évènement enregistré
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 12,
        padding: '18px 22px 8px',
        boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04)',
      }}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <div
            key={`${item.date}-${i}`}
            style={{
              position: 'relative',
              padding: '0 0 22px 28px',
              borderLeft: isLast ? '1px solid transparent' : '1px solid var(--line)',
            }}
          >
            <span
              aria-hidden
              style={{
                position: 'absolute',
                left: -8,
                top: 2,
                width: 16,
                height: 16,
                background: MARKER_BG[item.type],
                border: `2px solid ${MARKER_BG[item.type]}`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {ICONS[item.type]}
            </span>

            <div
              style={{
                fontFamily: 'DMMono, ui-monospace, monospace',
                fontSize: 9.5,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontWeight: 500,
                  ...TAG_STYLE[item.type],
                }}
              >
                {item.tag}
              </span>
              <span>{item.date}</span>
            </div>

            <h4
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 16,
                color: 'var(--ink)',
                margin: '4px 0 4px',
                lineHeight: 1.3,
                fontWeight: 600,
                letterSpacing: '-0.005em',
              }}
            >
              {item.title}
            </h4>

            <p
              style={{
                fontSize: 12.5,
                color: 'var(--ink-soft)',
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {item.description}
            </p>

            {item.meta && (
              <div
                style={{
                  fontFamily: 'DMMono, ui-monospace, monospace',
                  fontSize: 9.5,
                  color: 'var(--muted)',
                  marginTop: 6,
                  letterSpacing: '0.04em',
                }}
              >
                {item.meta}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
