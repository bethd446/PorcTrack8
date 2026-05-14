/**
 * _formFields — primitives de champ partagées par les Quick*Form (Phase 1).
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

export interface EntityPickerProps<T extends PickableEntity> {
  /** Mode de sélection. */
  mode: 'chips' | 'autocomplete';
  /** Entités disponibles (déjà filtrées par éligibilité métier). */
  entities: ReadonlyArray<T>;
  /** Code (`displayId`) actuellement sélectionné. */
  value: string;
  /** Callback de sélection — reçoit le `displayId`. */
  onChange: (displayId: string) => void;
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
  /** `id` HTML de l'input (mode autocomplete) — pour `htmlFor` du label. */
  inputId?: string;
  /** Placeholder de l'input (mode autocomplete). */
  placeholder?: string;
  /** `true` si le champ est en erreur (mode autocomplete → `aria-invalid`). */
  invalid?: boolean;
  /** `ref` à poser sur l'input (mode autocomplete) pour le focus auto. */
  inputRef?: React.RefObject<HTMLInputElement | null>;
  /**
   * Mode autocomplete uniquement : query de recherche courante (état contrôlé
   * par le parent — permet de pré-remplir / réinitialiser).
   */
  query?: string;
  /** Mode autocomplete : callback de changement de la query. */
  onQueryChange?: (q: string) => void;
  /** Mode autocomplete : nombre max de suggestions affichées (défaut 6). */
  maxSuggestions?: number;
}

/**
 * Sélecteur d'entité animale partagé. Préserve les conventions a11y attendues
 * par les tests existants :
 *  - mode chips : `role="radiogroup"` > `role="radio"` + `aria-checked` +
 *    `aria-label="Sélectionner la truie X"`.
 *  - mode autocomplete : `<input>` + `role="listbox"` > `role="option"`.
 */
export function EntityPicker<T extends PickableEntity>({
  mode,
  entities,
  value,
  onChange,
  entityLabel,
  groupLabel,
  emptyText,
  disabled = false,
  inputId,
  placeholder,
  invalid = false,
  inputRef,
  query = '',
  onQueryChange,
  maxSuggestions = 6,
}: EntityPickerProps<T>): React.ReactElement {
  const suggestions = useMemo<ReadonlyArray<T>>(() => {
    if (mode !== 'autocomplete') return entities;
    const q = query.trim().toLowerCase();
    if (!q) return entities.slice(0, maxSuggestions);
    return entities
      .filter((e) => {
        const id = (e.displayId || e.id || '').toLowerCase();
        const b = (e.boucle || '').toLowerCase();
        return id.includes(q) || b.includes(q);
      })
      .slice(0, maxSuggestions);
  }, [mode, entities, query, maxSuggestions]);

  if (entities.length === 0) {
    return (
      <p style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 12, color: 'var(--pt-subtle)', margin: 0 }}>
        {emptyText}
      </p>
    );
  }

  if (mode === 'chips') {
    return (
      <div className="radio-chips--cards" role="radiogroup" aria-label={groupLabel}>
        {entities.map((e) => (
          <button
            key={e.id}
            type="button"
            className={`radio-chip--card${value === e.displayId ? ' is-selected' : ''}`}
            role="radio"
            aria-checked={value === e.displayId}
            aria-label={`Sélectionner ${entityLabel} ${e.displayId}`}
            onClick={() => onChange(e.displayId)}
            disabled={disabled}
          >
            {e.displayId}
          </button>
        ))}
      </div>
    );
  }

  // mode === 'autocomplete'
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
