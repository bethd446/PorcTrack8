/**
 * V70 — Tooltip pédagogique (réplique mockup .term-tip + .term-tip-icon)
 *
 * Charge la définition depuis docs/v70/educational-content/tooltips.json
 * (15 entrées V3 : saillie, échographie, mise-bas, sevrage, ISSE, IEM,
 * gestation, lactation, réforme, parité, lignée, tournée, pesée,
 * mortalité, vaccin).
 *
 * Phase 6 V70 — interaction complète :
 * - clic sur l'icône `?` ouvre une popover positionnée
 * - clic-extérieur ou Escape ferme la popover
 * - aria-expanded + aria-describedby pour accessibilité
 */
import React, { useState, useEffect, useRef } from 'react';
import tooltipsData from '../../../../docs/v70/educational-content/tooltips.json';

type TooltipKey = keyof typeof tooltipsData;

export interface TooltipProps {
  term: TooltipKey;
  children?: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ term, children }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const tooltip = tooltipsData[term];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  if (!tooltip) return <>{children}</>;

  const popoverId = `tooltip-${term}`;

  return (
    <span
      ref={ref}
      className="term-tip"
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {children ?? tooltip.label}
      <button
        type="button"
        className="term-tip-icon"
        aria-label={`Définition ${tooltip.label}`}
        aria-describedby={open ? popoverId : undefined}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        ?
      </button>
      {open && (
        <span
          id={popoverId}
          role="tooltip"
          className="term-tip-popover"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 8,
            padding: '12px 14px',
            maxWidth: 280,
            zIndex: 1000,
            whiteSpace: 'normal',
          }}
        >
          {tooltip.definition}
        </span>
      )}
    </span>
  );
};
