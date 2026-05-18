/**
 * _formFields — primitives de champ partagées par les Quick*Form (Phase 1+3a).
 * ════════════════════════════════════════════════════════════════════════════
 * Regroupe :
 *  - `FieldError`     : rendu canonique d'un message d'erreur sous un champ
 *                       (remplace les `errMsg()` inline divergents).
 *  - `EntityPicker`   : sélecteur de truie / verrat. Supporte 2 modes via la
 *                       prop `mode` :
 *                         · `'chips'`        — `radio-chips--cards` (ex-Saillie)
 *                         · `'autocomplete'` — input + listbox filtrée (ex-MiseBas)
 *                       Factorise la duplication entre les ~10 forms qui
 *                       sélectionnent une entité animale.
 *
 * Le contrat (FORM_CONTRACT.md) recommande `'chips'` quand la liste est courte
 * (< ~8 entités) et `'autocomplete'` au-delà.
 *
 * Phase 3a — extensions `EntityPicker` :
 *  - `multi` : sélection MULTIPLE (mode `chips` uniquement). `value` devient
 *    `string[]` et `onChange` reçoit `(ids: string[])`. A11y : les chips
 *    passent en `role="checkbox"` + `aria-checked` (sémantique correcte d'une
 *    sélection multiple — un `radiogroup` n'autorise qu'un sélectionné).
 *  - `renderSubLabel` : sous-titre par chip (ex. `J+X · saillie du …`).
 *  - `getAriaLabel`   : `aria-label` paramétré par entité (fallback =
 *    `Sélectionner {entityLabel} {displayId}`, contractuel pour les tests).
 */
import React, { useMemo } from 'react';

/* ─────────────────────────────────────────────────────────────────────────
 * FieldError — message d'erreur canonique sous un champ.
 * ───────────────────────────────────────────────────────────────────────── */

export interface FieldErrorProps {
  /** Message d'erreur. Si falsy, le composant ne rend rien. */
  message?: string;
}

/**
 * Rendu standardisé d'une erreur de champ. `role="alert"` pour l'annonce
 * lecteur d'écran. Remplace les helpers `errMsg()` dupliqués dans chaque form.
 */
export const FieldError: React.FC<FieldErrorProps> = ({ message }) => {
  if (!message) return null;
  return (
    <span
      role="alert"
      style={{
        fontFamily: 'var(--pt-font-mono)',
        fontSize: 11,
        color: 'var(--pt-danger)',
      }}
    >
      {message}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
 * EntityPicker — sélecteur truie / verrat (chips ou autocomplete).
 * ───────────────────────────────────────────────────────────────────────── */

/** Forme minimale attendue d'une entité sélectionnable (truie ou verrat). */
export interface PickableEntity {
  id: string;
  displayId: string;
  nom?: string;
  boucle?: string;
}

/** Props communes à tous les modes / cardinalités de l'`EntityPicker`. */
interface EntityPickerCommonProps<T extends PickableEntity> {
  /** Entités disponibles (déjà filtrées par éligibilité métier). */
  entities: ReadonlyArray<T>;
  /**
   * Mot pour l'a11y : `'la truie'` / `'le verrat'`. Utilisé pour
   * `aria-label="Sélectionner {entityLabel} X"` (les tests s'y appuient).
   */
  entityLabel: string;
  /** `aria-label` du groupe / de l'input. */
  groupLabel: string;
  /** Texte affiché quand `entities` est vide. */
  emptyText: string;
  /** Verrouille les contrôles (pendant `saving`). */
  disabled?: boolean;
  /**
   * Sous-titre optionnel rendu sous le code de chaque chip (mode `chips`).
   * Ex. `J+12 · saillie du 03/05`. Ignoré en mode `autocomplete`.
   */
  renderSubLabel?: (entity: T) => React.ReactNode;
  /**
   * `aria-label` paramétré par entité. Fallback : `Sélectionner {entityLabel}
   * {displayId}` (forme contractuelle attendue par les tests existants —
   * ne PAS changer ce fallback).
   */
  getAriaLabel?: (entity: T) => string;
}

/** Props spécifiques au mode `autocomplete` (mono-sélection uniquement). */
interface EntityPickerAutocompleteProps<T extends PickableEntity>
  extends EntityPickerCommonProps<T> {
  mode: 'autocomplete';
  multi?: false;
  /** Code (`displayId`) actuellement sélectionné. */
  value: string;
  /** Callback de sélection — reçoit le `displayId`. */
  onChange: (displayId: string) => void;
  /** `id` HTML de l'input — pour `htmlFor` du label. */
  inputId?: string;
  /** Placeholder de l'input. */
  placeholder?: string;
  /** `true` si le champ est en erreur (→ `aria-invalid`). */
  invalid?: boolean;
  /** `ref` à poser sur l'input pour le focus auto. */
  inputRef?: React.RefObject<HTMLInputElement | null>;
  /**
   * Query de recherche courante (état contrôlé par le parent — permet de
   * pré-remplir / réinitialiser).
   */
  query?: string;
  /** Callback de changement de la query. */
  onQueryChange?: (q: string) => void;
  /** Nombre max de suggestions affichées (défaut 6). */
  maxSuggestions?: number;
}

/** Props du mode `chips` en mono-sélection (comportement Phase 1). */
interface EntityPickerChipsSingleProps<T extends PickableEntity>
  extends EntityPickerCommonProps<T> {
  mode: 'chips';
  multi?: false;
  /** Code (`displayId`) actuellement sélectionné. */
  value: string;
  /** Callback de sélection — reçoit le `displayId`. */
  onChange: (displayId: string) => void;
}

/** Props du mode `chips` en multi-sélection (Phase 3a). */
interface EntityPickerChipsMultiProps<T extends PickableEntity>
  extends EntityPickerCommonProps<T> {
  mode: 'chips';
  multi: true;
  /** Codes (`displayId`) actuellement sélectionnés. */
  value: ReadonlyArray<string>;
  /** Callback de sélection — reçoit la liste complète des `displayId`. */
  onChange: (displayIds: string[]) => void;
}

export type EntityPickerProps<T extends PickableEntity> =
  | EntityPickerAutocompleteProps<T>
  | EntityPickerChipsSingleProps<T>
  | EntityPickerChipsMultiProps<T>;

/**
 * Sélecteur d'entité animale partagé. Préserve les conventions a11y attendues
 * par les tests existants :
 *  - mode chips mono : `role="radiogroup"` > `role="radio"` + `aria-checked` +
 *    `aria-label="Sélectionner la truie X"`.
 *  - mode chips multi (Phase 3a) : `role="group"` > `role="checkbox"` +
 *    `aria-checked` (sélection multiple — un radiogroup serait sémantiquement
 *    faux). Le fallback d'`aria-label` reste `"Sélectionner {entityLabel} X"`.
 *  - mode autocomplete : `<input>` + `role="listbox"` > `role="option"`.
 */
export function EntityPicker<T extends PickableEntity>(
  props: EntityPickerProps<T>,
): React.ReactElement {
  const {
    mode,
    entities,
    entityLabel,
    groupLabel,
    emptyText,
    disabled = false,
    renderSubLabel,
    getAriaLabel,
  } = props;

  const ariaLabelFor = (e: T): string =>
    getAriaLabel ? getAriaLabel(e) : `Sélectionner ${entityLabel} ${e.displayId}`;

  const suggestions = useMemo<ReadonlyArray<T>>(() => {
    if (props.mode !== 'autocomplete') return entities;
    const q = (props.query ?? '').trim().toLowerCase();
    const max = props.maxSuggestions ?? 6;
    if (!q) return entities.slice(0, max);
    return entities
      .filter((e) => {
        const id = (e.displayId || e.id || '').toLowerCase();
        const b = (e.boucle || '').toLowerCase();
        return id.includes(q) || b.includes(q);
      })
      .slice(0, max);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.mode, entities, props.mode === 'autocomplete' ? props.query : '', props.mode === 'autocomplete' ? props.maxSuggestions : 0]);

  if (entities.length === 0) {
    return (
      <p style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 12, color: 'var(--pt-subtle)', margin: 0 }}>
        {emptyText}
      </p>
    );
  }

  if (mode === 'chips' && props.multi === true) {
    const { value, onChange } = props;
    const selected = new Set(value);
    const toggle = (id: string): void => {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onChange(Array.from(next));
    };
    return (
      <div className="radio-chips--cards" role="group" aria-label={groupLabel}>
        {entities.map((e) => {
          const isOn = selected.has(e.displayId);
          return (
            <button
              key={e.id}
              type="button"
              className={`radio-chip--card${isOn ? ' is-selected' : ''}`}
              role="checkbox"
              aria-checked={isOn}
              aria-label={ariaLabelFor(e)}
              onClick={() => toggle(e.displayId)}
              disabled={disabled}
            >
              <div className="radio-chip__code">{e.displayId}</div>
              {renderSubLabel ? (
                <div className="radio-chip__sub">{renderSubLabel(e)}</div>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }

  if (mode === 'chips') {
    const { value, onChange } = props;
    return (
      <div className="radio-chips--cards" role="radiogroup" aria-label={groupLabel}>
        {entities.map((e) => (
          <button
            key={e.id}
            type="button"
            className={`radio-chip--card${value === e.displayId ? ' is-selected' : ''}`}
            role="radio"
            aria-checked={value === e.displayId}
            aria-label={ariaLabelFor(e)}
            onClick={() => onChange(e.displayId)}
            disabled={disabled}
          >
            {renderSubLabel ? (
              <>
                <div className="radio-chip__code">{e.displayId}</div>
                <div className="radio-chip__sub">{renderSubLabel(e)}</div>
              </>
            ) : (
              e.displayId
            )}
          </button>
        ))}
      </div>
    );
  }

  // mode === 'autocomplete'
  const { value, onChange, inputId, placeholder, invalid = false, inputRef, query = '', onQueryChange } = props;
  return (
    <>
      <input
        id={inputId}
        ref={inputRef}
        className={`field__input mono${value ? ' filled' : ' field__input--ghost'}`}
        type="text"
        aria-label={groupLabel}
        aria-required="true"
        aria-invalid={invalid}
        placeholder={placeholder}
        value={query}
        onChange={(ev) => {
          onQueryChange?.(ev.target.value);
          if (ev.target.value === '') onChange('');
        }}
        disabled={disabled}
        autoComplete="off"
      />
      {suggestions.length > 0 && query !== value ? (
        <div
          role="listbox"
          aria-label={groupLabel}
          style={{ marginTop: 4, border: '1px solid var(--pt-line)', borderRadius: 10, background: 'var(--pt-bg)', maxHeight: 200, overflowY: 'auto' }}
        >
          {suggestions.map((e) => (
            <button
              key={e.id}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => {
                const code = e.displayId || e.id;
                onChange(code);
                onQueryChange?.(code);
              }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', fontFamily: 'var(--pt-font-mono)', fontSize: 12, color: 'var(--pt-ink)', cursor: 'pointer', minHeight: 44 }}
            >
              {e.displayId || e.id}
              {e.nom ? ` · ${e.nom}` : ''}
              {e.boucle ? ` (${e.boucle})` : ''}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
