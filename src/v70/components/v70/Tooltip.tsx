/**
 * V70 — Tooltip pédagogique (réplique mockup .term-tip + .term-tip-icon)
 *
 * Charge la définition depuis docs/v70/educational-content/tooltips.json
 * (15 entrées V3 : saillie, échographie, mise-bas, sevrage, ISSE, IEM,
 * gestation, lactation, réforme, parité, lignée, tournée, pesée,
 * mortalité, vaccin).
 */
import React from 'react';
import tooltipsData from '../../../../docs/v70/educational-content/tooltips.json';

type TooltipKey = keyof typeof tooltipsData;

export interface TooltipProps {
  term: TooltipKey;
  children?: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ term, children }) => {
  const tooltip = tooltipsData[term];
  if (!tooltip) return <>{children}</>;

  return (
    <span className="term-tip" title={tooltip.definition}>
      {children ?? tooltip.label}
      <button
        type="button"
        className="term-tip-icon"
        aria-label={`Définition ${tooltip.label}`}
      >
        ?
      </button>
    </span>
  );
};
