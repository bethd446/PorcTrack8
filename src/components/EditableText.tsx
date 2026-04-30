/**
 * EditableText — Inline edit pour valeurs texte (`string | null`).
 *
 * Variant `textarea` pour les notes longues. Pattern identique à
 * EditableNumber : tap → input/textarea (focus + select) → Enter (Cmd+Enter
 * pour textarea) ou blur → save.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

import type { WriteResult } from '../services/supabaseWrites';

interface Props {
  value: string | null;
  onSave: (newValue: string) => Promise<WriteResult>;
  maxLength?: number;
  multiline?: boolean;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
}

type Status = 'idle' | 'editing' | 'saving' | 'success' | 'error';

const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

const EditableText: React.FC<Props> = ({
  value,
  onSave,
  maxLength,
  multiline = false,
  ariaLabel,
  placeholder = '—',
  className = '',
}) => {
  const [status, setStatus] = useState<Status>('idle');
  const [draft, setDraft] = useState<string>(value ?? '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [displayValue, setDisplayValue] = useState<string | null>(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Mirror prop value into internal draft state when not actively editing.
  useEffect(() => {
    if (status === 'idle' || status === 'success') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayValue(value);
      setDraft(value ?? '');
    }
  }, [value, status]);

  useEffect(() => {
    if (status === 'editing' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'success') return;
    const t = setTimeout(() => setStatus('idle'), 1500);
    return () => clearTimeout(t);
  }, [status]);

  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(null), 3000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  const handleEnter = (): void => {
    setDraft(displayValue ?? '');
    setStatus('editing');
  };

  const commit = async (): Promise<void> => {
    const next = draft;
    if (next === (displayValue ?? '')) {
      setStatus('idle');
      return;
    }
    if (maxLength !== undefined && next.length > maxLength) {
      setErrorMsg(`Max ${maxLength} caractères`);
      setStatus('idle');
      setDraft(displayValue ?? '');
      return;
    }

    const previous = displayValue;
    setStatus('saving');
    setDisplayValue(next);
    const res = await onSave(next);
    if (res.success) {
      setStatus('success');
    } else {
      setDisplayValue(previous);
      setDraft(previous ?? '');
      setErrorMsg(res.error || 'Erreur de sauvegarde');
      setStatus('idle');
    }
  };

  const onKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void => {
    if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setStatus('idle');
      setDraft(displayValue ?? '');
    }
  };

  const flashBg = status === 'success' ? 'rgba(34, 197, 94, 0.10)' : 'transparent';

  const isEditing = status === 'editing' || status === 'saving';

  return (
    <span
      className={`inline-flex items-start gap-1.5 ${
        multiline ? 'flex w-full' : ''
      } ${className}`}
    >
      {isEditing ? (
        multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            aria-label={ariaLabel}
            value={draft}
            maxLength={maxLength}
            disabled={status === 'saving'}
            rows={3}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (status === 'editing') void commit();
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="w-full min-h-[64px] px-2 py-1.5 rounded-md border-2 bg-bg-0 text-text-0 outline-none text-sm leading-relaxed"
            style={{
              borderColor: 'var(--color-accent-500)',
              transition: `border-color 160ms ${EASE}`,
            }}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            aria-label={ariaLabel}
            value={draft}
            maxLength={maxLength}
            disabled={status === 'saving'}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (status === 'editing') void commit();
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="min-h-[44px] min-w-[120px] px-2 py-1 rounded-md border-2 bg-bg-0 text-text-0 outline-none text-sm"
            style={{
              borderColor: 'var(--color-accent-500)',
              transition: `border-color 160ms ${EASE}`,
            }}
          />
        )
      ) : (
        <button
          type="button"
          onClick={handleEnter}
          aria-label={ariaLabel}
          className={`min-h-[44px] inline-flex items-center gap-1 px-2 py-1 -mx-2 rounded-md hover:bg-bg-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 text-sm text-text-0 ${
            multiline ? 'w-full text-left items-start whitespace-pre-wrap' : ''
          }`}
          style={{
            backgroundColor: flashBg,
            transition: `background-color 200ms ${EASE}`,
          }}
        >
          {displayValue && displayValue.length > 0 ? (
            <span className={multiline ? 'whitespace-pre-wrap' : ''}>
              {displayValue}
            </span>
          ) : (
            <span className="text-text-2 italic">{placeholder}</span>
          )}
        </button>
      )}

      {status === 'saving' && (
        <Loader2
          size={14}
          className="motion-safe:animate-spin text-text-2 mt-2"
          aria-hidden="true"
        />
      )}
      {status === 'success' && (
        <Check
          size={14}
          aria-hidden="true"
          className="mt-2"
          style={{ color: 'var(--color-accent-500)' }}
        />
      )}

      {errorMsg && (
        <span
          role="alert"
          className="ml-2 text-xs font-mono px-2 py-0.5 rounded-md"
          style={{
            color: '#b91c1c',
            backgroundColor: 'rgba(220, 38, 38, 0.08)',
          }}
        >
          {errorMsg}
        </span>
      )}
    </span>
  );
};

export default EditableText;
