import React, { useCallback, useState } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import './components.css';

// ============================================================
// SECTION
// ============================================================
export function Section({ label, variant = 'primary', tone, className }: {
  label: string;
  variant?: 'primary' | 'accent' | 'danger';
  tone?: 'primary' | 'accent';
  className?: string;
}) {
  const v = tone ?? variant;
  const labelStyle: React.CSSProperties | undefined =
    v === 'danger' ? { color: 'var(--pt-danger)' }
    : v === 'accent' ? { color: 'var(--pt-accent-deep)' }
    : undefined;
  return (
    <div className={`pt-section ${className ?? ''}`}>
      <span className={`pt-section__bullet ${v !== 'primary' ? `pt-section__bullet--${v}` : ''}`} />
      <span className="pt-section__label" style={labelStyle}>{label}</span>
      <hr className="pt-section__line" />
    </div>
  );
}

// Alias historique
export const SectionHeader = Section;

// ============================================================
// CARD
// ============================================================
export function Card({
  children, compact, insight, warning, danger, interactive, onClick, className = '',
}: {
  children: React.ReactNode;
  compact?: boolean;
  insight?: boolean;
  warning?: boolean;
  danger?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const classes = ['pt-card',
    compact && 'pt-card--compact',
    insight && 'pt-card--insight',
    warning && 'pt-card--warning',
    danger && 'pt-card--danger',
    interactive && 'pt-card--interactive',
    className,
  ].filter(Boolean).join(' ');
  return <div className={classes} onClick={onClick}>{children}</div>;
}

// ============================================================
// INSIGHTCARD (variante de Card avec titre + corps)
// ============================================================
export function InsightCard({ title, children, className, style }: {
  title: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`pt-insight ${className ?? ''}`} style={style}>
      <div className="pt-insight__title">
        <span aria-hidden="true">✨</span>
        <span>{title}</span>
      </div>
      <div className="pt-insight__body">{children}</div>
    </div>
  );
}

// ============================================================
// BUTTON — Le SEUL bouton autorisé dans l'app
// ============================================================
export function Button({
  children, variant = 'primary', size = 'medium', fullWidth, onClick,
  type = 'button', disabled, ariaLabel,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const classes = ['pt-btn', `pt-btn--${variant}`,
    size === 'small' && 'pt-btn--small',
    fullWidth && 'pt-btn--full',
  ].filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  );
}

// ============================================================
// TAG
// ============================================================
export function Tag({ children, variant = 'default', dot }: {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'accent' | 'soft' | 'danger' | 'warning';
  dot?: boolean;
}) {
  return (
    <span className={`pt-tag ${variant !== 'default' ? `pt-tag--${variant}` : ''}`}>
      {dot && <span className="pt-tag__dot" />}
      {children}
    </span>
  );
}

// ============================================================
// ICONBOX
// ============================================================
export function IconBox({ children, variant = 'primary', size = 'medium' }: {
  children: React.ReactNode;
  variant?: 'primary' | 'warm' | 'accent' | 'danger';
  size?: 'small' | 'medium';
}) {
  return (
    <div className={`pt-icon-box ${variant !== 'primary' ? `pt-icon-box--${variant}` : ''} ${size === 'small' ? 'pt-icon-box--small' : ''}`}>
      {children}
    </div>
  );
}

// ============================================================
// KEYVALUEROW
// ============================================================
export function KeyValueRow({ label, value, variant = 'default' }: {
  label: string;
  value: React.ReactNode;
  variant?: 'default' | 'muted' | 'accent';
}) {
  return (
    <div className="pt-kv">
      <span className="pt-kv__key">{label}</span>
      <span className={`pt-kv__value ${variant !== 'default' ? `pt-kv__value--${variant}` : ''}`}>{value}</span>
    </div>
  );
}

// ============================================================
// STATS
// ============================================================
export function StatsGrid({ children }: { children: React.ReactNode }) {
  return <div className="pt-stats">{children}</div>;
}

export function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="pt-stat">
      <span className="pt-stat__value">{value}</span>
      <span className="pt-stat__label">{label}</span>
    </div>
  );
}

// ============================================================
// TABS
// ============================================================
export function Tabs<T extends string>({ value, onChange, options }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="pt-tabs">
      {options.map(opt => (
        <button
          key={opt.value}
          className={`pt-tab ${value === opt.value ? 'pt-tab--active' : ''}`}
          onClick={() => onChange(opt.value)}
        >{opt.label}</button>
      ))}
    </div>
  );
}

// ============================================================
// SEGMENT
// ============================================================
export function Segment<T extends string>({ value, onChange, options }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
}) {
  return (
    <div className="pt-segment">
      {options.map(opt => (
        <button
          key={opt.value}
          className={`pt-segment__item ${value === opt.value ? 'pt-segment__item--active' : ''}`}
          onClick={() => onChange(opt.value)}
        >{opt.label}</button>
      ))}
    </div>
  );
}

// ============================================================
// CHIP
// ============================================================
export function Chip({ children, count, active, onClick }: {
  children: React.ReactNode;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button className={`pt-chip ${active ? 'pt-chip--active' : ''}`} onClick={onClick}>
      {children}
      {count !== undefined && <span className="pt-chip__count">{count}</span>}
    </button>
  );
}

// ============================================================
// FORM
// ============================================================
export function FormField({ label, required, hint, error, children }: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pt-field">
      <label className="pt-field__label">
        {label}{required && <span className="req"> · requis</span>}
      </label>
      {children}
      {hint && !error && <div className="pt-field__hint">{hint}</div>}
      {error && <div className="pt-field__hint" style={{ color: 'var(--pt-danger)' }}>{error}</div>}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="pt-field__input" {...props} />;
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="pt-field__select" {...props}>{children}</select>;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="pt-field__input" style={{ borderRadius: 16, minHeight: 80, resize: 'vertical' }} {...props} />;
}

// ============================================================
// SEARCH
// ============================================================
export interface SearchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
}

export const Search = React.forwardRef<HTMLInputElement, SearchProps>(
  ({ onClear, className, style, value, ...rest }, ref) => {
    const showClear = Boolean(onClear) && Boolean(value);
    return (
      <div className={`pt-search ${className ?? ''}`} style={style}>
        <SearchIcon size={16} aria-hidden="true" className="pt-search__icon" />
        <input ref={ref} type="search" className="pt-search__input" value={value} {...rest} />
        {showClear ? (
          <button
            type="button"
            aria-label="Effacer la recherche"
            onClick={onClear}
            className="pt-search__clear"
          >
            <X size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    );
  },
);
Search.displayName = 'Search';

// ============================================================
// LIST ITEM
// ============================================================
export function ListItem({ icon, title, subtitle, tag, onClick }: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  tag?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div className="pt-list-item" onClick={onClick}>
      {icon && <IconBox variant="warm" size="small">{icon}</IconBox>}
      <div className="pt-list-item__main">
        <div className="pt-list-item__title">{title}</div>
        {subtitle && <div className="pt-list-item__subtitle">{subtitle}</div>}
      </div>
      {tag}
    </div>
  );
}

// ============================================================
// ACTION ROW
// ============================================================
export function ActionRow({ icon, title, subtitle, badge, trailing, onClick }: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string | number;
  trailing?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div className="pt-action" onClick={onClick}>
      {icon && <IconBox variant="primary" size="small">{icon}</IconBox>}
      <div className="pt-action__main">
        <div className="pt-action__title">{title}</div>
        {subtitle && <div className="pt-action__sub">{subtitle}</div>}
      </div>
      {trailing || <span className="pt-action__chevron">›</span>}
      {badge !== undefined && <span className="pt-action__badge">{badge}</span>}
    </div>
  );
}

// ============================================================
// ALERT GROUP / ALERT ROW
// ============================================================
export function AlertGroup({ severity, icon, title, count, badge, action, children }: {
  severity: 'critical' | 'warning';
  icon: React.ReactNode;
  title: string;
  count: string;
  badge?: React.ReactNode;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <div className={`alert-group alert-group--${severity}`}>
      <div className="alert-group__head">
        <div className={`alert-group__icon alert-group__icon--${severity}`}>{icon}</div>
        <div className="alert-group__title-wrap">
          <div className="alert-group__title">{title}</div>
          <div className="alert-group__count">{count}</div>
        </div>
        {badge}
      </div>
      <div className="alert-group__body">
        {children}
        {action && (
          <div className="alert-group__action">
            <Button size="small" variant={severity === 'critical' ? 'primary' : 'secondary'} onClick={action.onClick}>
              {action.label} →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function AlertRow({ name, detail, value, unit, variant = 'critical', onClick }: {
  name: string;
  detail?: string;
  value?: number | string;
  unit?: string;
  variant?: 'critical' | 'warning';
  onClick?: () => void;
}) {
  return (
    <div className="alert-row" onClick={onClick}>
      <div className="alert-row__main">
        <div className="alert-row__name">{name}</div>
        {detail && <div className="alert-row__detail">{detail}</div>}
      </div>
      {value !== undefined ? (
        <div className={`alert-row__value ${variant === 'warning' ? 'alert-row__value--warning' : ''}`}>
          {value}
          {unit && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--pt-text-subtle)', marginLeft: 4 }}>{unit}</span>}
        </div>
      ) : onClick ? <span>›</span> : null}
    </div>
  );
}

// ============================================================
// FAB
// ============================================================
export function Fab({ children = '+', label, onClick, ariaLabel = 'Ajouter' }: {
  children?: React.ReactNode;
  label?: string;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      className={`pt-fab ${label ? 'pt-fab--extended' : ''}`}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <span>{children}</span>
      {label && <span>{label}</span>}
    </button>
  );
}

// ============================================================
// EMPTY
// ============================================================
export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="pt-empty">{children}</div>;
}

// ============================================================
// WIZARD
// ============================================================
export interface WizardStep {
  label: string;
  render: () => React.ReactNode;
  validate?: () => boolean | Promise<boolean>;
}

export interface WizardProps {
  steps: ReadonlyArray<WizardStep>;
  initialStep?: number;
  eyebrow?: string;
  completeLabel?: string;
  onCancel: () => void;
  onComplete: () => void | Promise<void>;
  busy?: boolean;
  id?: string;
}

export const Wizard: React.FC<WizardProps> = ({
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
        try { ok = await v; } finally { setNavBusy(false); }
      } else {
        ok = v as boolean;
      }
      if (!ok) return;
    }
    if (isLast) {
      setNavBusy(true);
      try { await onComplete(); } finally { setNavBusy(false); }
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
    <div aria-labelledby={labelledBy} data-testid="wizard" className="pt-wizard">
      <header className="pt-wizard__header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {eyebrow ? (
              <div style={{
                fontFamily: 'var(--pt-font-body)',
                fontSize: 'var(--pt-text-label)',
                letterSpacing: 'var(--pt-tracking-label)',
                color: 'var(--pt-text-muted)',
                textTransform: 'uppercase',
                marginBottom: 6,
                fontWeight: 600,
              }}>{eyebrow}</div>
            ) : null}
            <h1 id={labelledBy} style={{
              fontFamily: 'var(--pt-font-display)',
              fontSize: 'var(--pt-text-h1)',
              fontWeight: 700,
              color: 'var(--pt-text)',
              letterSpacing: '-0.01em',
              margin: 0,
              lineHeight: 1.15,
              textTransform: 'uppercase',
            }}>{current.label}</h1>
            <div style={{
              marginTop: 6,
              fontFamily: 'var(--pt-font-body)',
              fontSize: 'var(--pt-text-label)',
              letterSpacing: 'var(--pt-tracking-label)',
              color: 'var(--pt-text-subtle)',
              textTransform: 'uppercase',
              fontWeight: 600,
            }} aria-live="polite">
              Étape {step + 1} sur {total}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fermer le wizard"
            disabled={busy || navBusy}
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

        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={step + 1}
          aria-label={`Progression : étape ${step + 1} sur ${total}`}
          className="pt-wizard-progress"
        >
          {steps.map((_, i) => (
            <div key={i} className={`pt-wizard-step ${i <= step ? 'pt-wizard-step--done' : ''}`} />
          ))}
        </div>
      </header>

      <div className="pt-wizard__body">{current.render()}</div>

      <footer className="pt-wizard__footer">
        <button
          type="button"
          onClick={handlePrev}
          disabled={isFirst || busy || navBusy}
          aria-label="Étape précédente"
          className="pt-btn pt-btn--secondary"
          style={{ opacity: isFirst ? 0.4 : 1 }}
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
          data-testid={isLast ? 'wizard-complete' : 'wizard-next'}
          className="pt-btn pt-btn--primary"
          style={{ opacity: busy || navBusy ? 0.7 : 1 }}
        >
          {isLast ? completeLabel : 'Suivant →'}
        </button>
      </footer>
    </div>
  );
};
