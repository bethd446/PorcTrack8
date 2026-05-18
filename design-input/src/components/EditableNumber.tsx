/**
 * EditableNumber — Inline edit pour valeurs numériques.
 *
 * Pattern : tap → input (focus + selectAll) → Enter/blur → save.
 * Feedback : spinner pendant save, check + flash vert succès, revert + toast erreur.
 *
 * Tokens : `var(--color-accent-500)` pour focus border, pas de hex hardcodé.
 * Animations : `cubic-bezier(0.23, 1, 0.32, 1)` 160ms (Emil Kowalski).
 * A11y : aria-label requis, prefers-reduced-motion respecté, tap area ≥ 44px.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

import type { WriteResult } from '../services/supabaseWrites';
import { Button } from '@/design-system';

interface Props {
  value: number | null;
  onSave: (newValue: number) => Promise<WriteResult>;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
}

type Status = 'idle' | 'editing' | 'saving' | 'success' | 'error';

const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

const EditableNumber: React.FC<Props> = ({
  value,
  onSave,
  min,
  max,
  step = 1,
  unit,
  ariaLabel,
  placeholder = '—',
  className = '',
}) => {
  const [status, setStatus] = useState<Status>('idle');
  const [draft, setDraft] = useState<string>(value === null ? '' : String(value));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [displayValue, setDisplayValue] = useState<number | null>(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes (e.g. après refreshData) — required to mirror prop into internal draft.
  useEffect(() => {
    if (status === 'idle' || status === 'success') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayValue(value);
      setDraft(value === null ? '' : String(value));
    }
  }, [value, status]);

  // Focus + select-all en mode édition
  useEffect(() => {
    if (status === 'editing' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [status]);

  // Auto-clear success après 1.5s
  useEffect(() => {
    if (status !== 'success') return;
    const t = setTimeout(() => setStatus('idle'), 1500);
    return () => clearTimeout(t);
  }, [status]);

  // Auto-clear error toast après 3s
  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(null), 3000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  const handleEnter = (): void => {
    setDraft(displayValue === null ? '' : String(displayValue));
    setStatus('editing');
  };

  const commit = async (): Promise<void> => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      // Empty → revert
      setStatus('idle');
      setDraft(displayValue === null ? '' : String(displayValue));
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setErrorMsg('Valeur invalide');
      setStatus('idle');
      setDraft(displayValue === null ? '' : String(displayValue));
      return;
    }
    if (min !== undefined && parsed < min) {
      setErrorMsg(`Min ${min}`);
      setStatus('idle');
      setDraft(displayValue === null ? '' : String(displayValue));
      return;
    }
    if (max !== undefined && parsed > max) {
      setErrorMsg(`Max ${max}`);
      setStatus('idle');
      setDraft(displayValue === null ? '' : String(displayValue));
      return;
    }
    if (parsed === displayValue) {
      // No-op
      setStatus('idle');
      return;
    }

    const previous = displayValue;
    setStatus('saving');
    setDisplayValue(parsed); // optimistic
    const res = await onSave(parsed);
    if (res.success) {
      setStatus('success');
    } else {
      setDisplayValue(previous); // revert
      setDraft(previous === null ? '' : String(previous));
      setErrorMsg(res.error || 'Erreur de sauvegarde');
      setStatus('idle');
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setStatus('idle');
      setDraft(displayValue === null ? '' : String(displayValue));
    }
  };

  const flashBg = status === 'success' ? 'rgba(34, 197, 94, 0.10)' : 'transparent';

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {status === 'editing' || status === 'saving' ? (
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          aria-label={ariaLabel}
          value={draft}
          min={min}
          max={max}
          step={step}
          disabled={status === 'saving'}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (status === 'editing') void commit();
          }}
          onKeyDown={onKeyDown}
          className="min-h-[44px] min-w-[64px] px-2 py-1 rounded-md border-2 bg-bg-0 tabular-nums text-right text-text-0 outline-none"
          style={{
            borderColor: 'var(--color-accent-500)',
            transition: `border-color 160ms ${EASE}, background-color 160ms ${EASE}`,
          }}
        />
      ) : (
        <Button
          type="button"
          variant="ghost"
          onClick={handleEnter}
          aria-label={ariaLabel}
          className="min-h-[44px] inline-flex items-center justify-end gap-1 px-2 py-1 -mx-2 hover:bg-bg-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            backgroundColor: flashBg,
            transition: `background-color 200ms ${EASE}`,
            borderRadius: '0.375rem',
            textTransform: 'none',
            height: 'auto',
            justifyContent: 'flex-end',
          }}
        >
          <span className="tabular-nums text-text-0">
            {displayValue === null || displayValue === undefined
              ? placeholder
              : displayValue}
          </span>
          {unit && (
            <span className="text-xs text-text-2">{unit}</span>
          )}
        </Button>
      )}

      {status === 'saving' && (
        <Loader2
          size={14}
          className="motion-safe:animate-spin text-text-2"
          aria-hidden="true"
        />
      )}
      {status === 'success' && (
        <Check
          size={14}
          aria-hidden="true"
          style={{ color: 'var(--color-accent-500)' }}
        />
      )}

      {errorMsg && (
        <span
          role="alert"
          className="ml-2 text-xs px-2 py-0.5 rounded-md"
          style={{
            color: 'var(--pt-danger)',
            backgroundColor: 'rgba(220, 38, 38, 0.08)',
          }}
        >
          {errorMsg}
        </span>
      )}
    </span>
  );
};

export default EditableNumber;
