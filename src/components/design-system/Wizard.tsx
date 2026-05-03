import React, { useCallback, useState } from 'react';
import { X } from 'lucide-react';

export interface WizardStep {
  /** Label visible (h1 du header). */
  label: string;
  /** Render function de l'étape. */
  render: () => React.ReactNode;
  /** Optionnel : valide l'étape avant le passage à la suivante. */
  validate?: () => boolean | Promise<boolean>;
}

export interface WizardProps {
  steps: ReadonlyArray<WizardStep>;
  initialStep?: number;
  /** Eyebrow (au-dessus du titre). Ex : "ÉDITER · T18". */
  eyebrow?: string;
  /** Label du bouton d'enregistrement final. */
  completeLabel?: string;
  onCancel: () => void;
  onComplete: () => void | Promise<void>;
  /** Désactive les boutons (loading externe). */
  busy?: boolean;
  /** ID stable pour l'aria-labelledby du dialog. */
  id?: string;
}

/**
 * Wizard V32 — Wizard pill 3-step (DS V30).
 *
 * - Header : eyebrow + h1 Big Shoulders + bouton ✕
 * - Sous-titre "ÉTAPE n SUR N" Mono SMALL CAPS
 * - Progress bar (3 segments)
 * - Footer : "← Précédent" (ghost) + "Suivant →" / "Enregistrer" (primary pill)
 * - Tap targets ≥ 44px
 * - Tokens --pt-* uniquement
 *
 * Le rendu de chaque étape est délégué via `steps[i].render()`. Le wizard ne
 * gère que la navigation : la persistance et le state du form sont externes.
 */
const Wizard: React.FC<WizardProps> = ({
  steps,
  initialStep = 0,
  eyebrow,
  completeLabel = 'Enregistrer',
  onCancel,
  onComplete,
  busy = false,
  id,
}) => {
  const total = steps.length;
  const [step, setStep] = useState<number>(Math.max(0, Math.min(initialStep, total - 1)));
  const [navBusy, setNavBusy] = useState(false);

  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === total - 1;

  const handleNext = useCallback(async () => {
    if (busy || navBusy) return;
    if (current.validate) {
      const v = current.validate();
      let ok: boolean;
      if (typeof v === 'object' && v !== null && 'then' in v) {
        setNavBusy(true);
        try {
          ok = await v;
        } finally {
          setNavBusy(false);
        }
      } else {
        ok = v as boolean;
      }
      if (!ok) return;
    }
    if (isLast) {
      setNavBusy(true);
      try {
        await onComplete();
      } finally {
        setNavBusy(false);
      }
      return;
    }
    setStep((s) => Math.min(s + 1, total - 1));
  }, [busy, navBusy, current, isLast, onComplete, total]);

  const handlePrev = useCallback(() => {
    if (busy || navBusy) return;
    setStep((s) => Math.max(s - 1, 0));
  }, [busy, navBusy]);

  const labelledBy = id ? `${id}-title` : undefined;

  return (
    <div
      aria-labelledby={labelledBy}
      data-testid="wizard"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--pt-bg)',
        fontFamily: 'var(--pt-font-body)',
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '20px 22px 16px',
          borderBottom: '1px solid var(--pt-divider)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {eyebrow ? (
              <div
                style={{
                  fontFamily: 'var(--pt-font-mono)',
                  fontSize: 'var(--pt-text-label)',
                  letterSpacing: 'var(--pt-tracking-label)',
                  color: 'var(--pt-text-muted)',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                {eyebrow}
              </div>
            ) : null}
            <h1
              id={labelledBy}
              style={{
                fontFamily: 'var(--pt-font-display)',
                fontSize: 'var(--pt-text-h1)',
                fontWeight: 700,
                color: 'var(--pt-text)',
                letterSpacing: '-0.01em',
                margin: 0,
                lineHeight: 1.15,
                textTransform: 'uppercase',
              }}
            >
              {current.label}
            </h1>
            <div
              style={{
                marginTop: 6,
                fontFamily: 'var(--pt-font-mono)',
                fontSize: 'var(--pt-text-label)',
                letterSpacing: 'var(--pt-tracking-label)',
                color: 'var(--pt-text-subtle)',
                textTransform: 'uppercase',
              }}
              aria-live="polite"
            >
              Étape {step + 1} sur {total}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fermer le wizard"
            disabled={busy || navBusy}
            data-pt="button"
            style={{
              flexShrink: 0,
              minWidth: 44,
              minHeight: 44,
              borderRadius: 'var(--pt-radius-pill)',
              background: 'transparent',
              border: 'none',
              color: 'var(--pt-text-muted)',
              cursor: busy || navBusy ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: busy || navBusy ? 0.4 : 1,
            }}
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        {/* Progress bar (segments) */}
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={step + 1}
          aria-label={`Progression : étape ${step + 1} sur ${total}`}
          style={{
            display: 'flex',
            gap: 4,
            marginTop: 4,
          }}
        >
          {steps.map((_, i) => (
            <div
              key={i}
              data-active={i <= step}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 'var(--pt-radius-pill)',
                background:
                  i <= step ? 'var(--pt-primary)' : 'var(--pt-surface-alt)',
                transition: 'background 200ms ease',
              }}
            />
          ))}
        </div>
      </header>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 22px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {current.render()}
      </div>

      {/* Footer */}
      <footer
        style={{
          padding: '14px 22px',
          borderTop: '1px solid var(--pt-divider)',
          background: 'var(--pt-surface)',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          onClick={handlePrev}
          disabled={isFirst || busy || navBusy}
          aria-label="Étape précédente"
          data-pt="button"
          style={{
            minHeight: 44,
            padding: '12px 18px',
            borderRadius: 'var(--pt-radius-pill)',
            background: 'transparent',
            color: isFirst ? 'var(--pt-text-subtle)' : 'var(--pt-text)',
            border: '1px solid var(--pt-divider)',
            fontFamily: 'var(--pt-font-body)',
            fontSize: 12,
            letterSpacing: 'var(--pt-tracking-button)',
            textTransform: 'uppercase',
            fontWeight: 600,
            cursor: isFirst || busy || navBusy ? 'not-allowed' : 'pointer',
            opacity: isFirst ? 0.4 : 1,
          }}
        >
          ← Précédent
        </button>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={handleNext}
          disabled={busy || navBusy}
          aria-label={isLast ? completeLabel : 'Étape suivante'}
          aria-busy={busy || navBusy}
          data-pt="button"
          data-testid={isLast ? 'wizard-complete' : 'wizard-next'}
          style={{
            minHeight: 44,
            padding: '12px 22px',
            borderRadius: 'var(--pt-radius-pill)',
            background: 'var(--pt-primary)',
            color: 'var(--pt-primary-text)',
            border: 'none',
            fontFamily: 'var(--pt-font-body)',
            fontSize: 12,
            letterSpacing: 'var(--pt-tracking-button)',
            textTransform: 'uppercase',
            fontWeight: 600,
            cursor: busy || navBusy ? 'wait' : 'pointer',
            opacity: busy || navBusy ? 0.7 : 1,
          }}
        >
          {isLast ? completeLabel : 'Suivant →'}
        </button>
      </footer>
    </div>
  );
};

export default Wizard;
