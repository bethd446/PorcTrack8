import React from 'react';
import { ChevronRight } from 'lucide-react';

import { useNoUUID } from '../../lib/uuidGuard';

export interface AlertRowProps {
  /** Texte primaire (ex : "Ivermectine"). */
  primary: string;
  /** Texte secondaire (ex : "Vermifuge injectable"). */
  secondary?: string;
  /** Valeur affichée à droite (ex : "0"). */
  value: string;
  /** Unité affichée après la valeur (ex : "ml" / "doses" / "kg"). */
  unit?: string;
  /** Si true, la valeur est rendue en couleur danger (rouge). */
  valueDanger?: boolean;
  /** Si fourni, la row devient cliquable et navigue vers cette URL au tap. */
  href?: string;
  /** Callback alternatif au href (ex : onClick custom). */
  onClick?: () => void;
}

/**
 * AlertRow V31 — ligne dans un AlertGroup.
 *
 * - primary : text body, secondary : muted small
 * - value + unit : aligné droite, valueDanger=true → rouge
 * - href / onClick → row cliquable avec chevron, sinon row passive
 * - Séparation : border-top 1px var(--pt-divider) sauf pour la première
 *   (gérée via :first-child via attribut data-pt="alert-row")
 *
 * Tap target ≥ 44px quand cliquable.
 */
const AlertRow: React.FC<AlertRowProps> = ({
  primary,
  secondary,
  value,
  unit,
  valueDanger = false,
  href,
  onClick,
}) => {
  // V31 — détection dev des UUIDs leakés dans le label (silencieux en prod).
  useNoUUID(primary, 'AlertRow.primary');
  useNoUUID(secondary ?? '', 'AlertRow.secondary');

  const interactive = Boolean(href ?? onClick);

  const handleClick = (): void => {
    if (onClick) {
      onClick();
      return;
    }
    if (href) {
      window.location.assign(href);
    }
  };

  const content = (
    <>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontFamily: 'var(--pt-font-body)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--pt-text)',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {primary}
        </div>
        {secondary ? (
          <div
            style={{
              fontFamily: 'var(--pt-font-body)',
              fontSize: 12,
              color: 'var(--pt-text-muted)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {secondary}
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 4,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--pt-font-display)',
            fontSize: 20,
            fontWeight: 700,
            color: valueDanger ? 'var(--pt-danger)' : 'var(--pt-text)',
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {unit ? (
          <span
            style={{
              fontFamily: 'var(--pt-font-body)',
              fontSize: 12,
              color: 'var(--pt-text-muted)',
              fontWeight: 500,
            }}
          >
            {unit}
          </span>
        ) : null}
        {interactive ? (
          <ChevronRight
            size={16}
            aria-hidden="true"
            style={{ color: 'var(--pt-text-subtle)', marginLeft: 4 }}
          />
        ) : null}
      </div>
    </>
  );

  const baseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--pt-space-3)',
    minHeight: 44,
    padding: '10px 0',
    borderTop: '1px solid var(--pt-divider)',
    background: 'transparent',
    width: '100%',
    textAlign: 'left',
    border: 'none',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  };

  // Border-top sur tout sauf la première row (CSS via sibling selector impossible
  // ici — on s'appuie sur data-pt="alert-row" + :first-child du parent dans un
  // global stylesheet, OU on neutralise la première via inline. Choix : style
  // sibling via parent — la première row est rendue en :first-child de
  // [data-pt="alert-group-rows"]. On ajoute donc un style global plus bas, mais
  // côté composant on rend simplement le borderTop. Le parent neutralise la
  // première via CSS inline-overide en passant un selector. Pour rester
  // 100% inline et indépendant, on retire le borderTop de la première row
  // côté CSS module non-disponible. Compromis : le borderTop reste, et le
  // parent l'écrase via :first-child {border-top:none}.
  // → on n'a pas de CSS modules → on injecte un style inline conditionnel
  // basé sur data-attribute consommé par le parent. Solution simple : laisser
  // le borderTop, le parent peut le neutraliser via une règle CSS dans un
  // fichier global. Ici on garde le comportement par défaut (toutes les rows
  // ont une ligne séparatrice — la première inclus pour visualiser le
  // découplage avec le header).

  if (interactive) {
    return (
      <button
        type="button"
        data-pt="alert-row"
        onClick={handleClick}
        aria-label={`${primary} — ${value}${unit ? ' ' + unit : ''}`}
        style={{
          ...baseStyle,
          cursor: 'pointer',
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <div data-pt="alert-row" style={baseStyle}>
      {content}
    </div>
  );
};

export default AlertRow;
