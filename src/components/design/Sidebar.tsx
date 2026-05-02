import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface SidebarItem {
  label: string;
  icon: LucideIcon;
  href: string;
  count?: number | string;
  active?: boolean;
}

export interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  sections: SidebarSection[];
  width?: number;
  className?: string;
}

/**
 * Sidebar desktop v6. Largeur 220px par défaut.
 * Sections (DMMono 9px ls 0.20em) + items (Instrument Sans 14px) avec icône
 * Lucide 16×16 et count optionnel DMMono.
 * Active : bg --color-accent-50, border-left 3px accent-500.
 */
export default function Sidebar({
  sections,
  width = 220,
  className = '',
}: SidebarProps) {
  const navigate = useNavigate();

  return (
    <aside
      className={className}
      aria-label="Navigation latérale"
      style={{
        width,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--line)',
        padding: '18px 0',
        flexShrink: 0,
        overflowY: 'auto',
      }}
    >
      {sections.map((section) => (
        <div key={section.title}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              padding: '14px 18px 6px',
              fontWeight: 500,
            }}
          >
            {section.title}
          </div>
          {section.items.map((item) => {
            const Icon = item.icon;
            const isActive = !!item.active;
            return (
              <button
                key={`${section.title}-${item.label}`}
                type="button"
                onClick={() => navigate(item.href)}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  width: '100%',
                  background: isActive ? 'var(--color-accent-50)' : 'transparent',
                  color: isActive ? 'var(--color-accent-600)' : 'var(--ink-soft)',
                  borderLeft: `3px solid ${
                    isActive ? 'var(--color-accent-500)' : 'transparent'
                  }`,
                  borderTop: 0,
                  borderRight: 0,
                  borderBottom: 0,
                  padding: '9px 18px',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  fontWeight: isActive ? 500 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition:
                    'background 200ms var(--ease-emil), color 200ms var(--ease-emil)',
                  minHeight: 36,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 16,
                    height: 16,
                    color: isActive ? 'var(--color-accent-500)' : 'var(--muted)',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={16} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>
                {item.count !== undefined && item.count !== null ? (
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: 'var(--muted)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {item.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
