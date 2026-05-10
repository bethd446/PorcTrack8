/**
 * V70 — ListItem (réplique mockup ligne 474-536)
 *
 * Référence pixel-perfect : docs/v70/v70-mockup.html
 * - .list-item (l. 475-486) : flex avatar + info + action,
 *   padding 10px, white bg, border, radius 12px
 * - .list-info (l. 512) : flex 1, min-width 0
 * - .list-title (l. 513-517) : JetBrains Mono 13px semibold
 * - .list-sub (l. 518-522) : 11px muted
 * - .list-action (l. 524-530) : flex column, gap 4px
 */
import React from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export interface ListItemPointerHandlers {
  onPointerDown?: (e: ReactPointerEvent) => void;
  onPointerUp?: (e: ReactPointerEvent) => void;
  onPointerLeave?: (e: ReactPointerEvent) => void;
  onPointerCancel?: (e: ReactPointerEvent) => void;
}

export interface ListItemProps {
  avatar?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  pointerHandlers?: ListItemPointerHandlers;
}

export const ListItem: React.FC<ListItemProps> = ({
  avatar,
  title,
  subtitle,
  trailing,
  onClick,
  pointerHandlers,
}) => {
  return (
    <div
      className="list-item"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      {...(pointerHandlers ?? {})}
    >
      {avatar}
      <div className="list-info">
        <div className="list-title">{title}</div>
        {subtitle && <div className="list-sub">{subtitle}</div>}
      </div>
      {trailing && <div className="list-action">{trailing}</div>}
    </div>
  );
};
