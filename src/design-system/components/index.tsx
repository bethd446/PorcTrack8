import React, { useCallback, useState } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import './components.css';

// ============================================================
// SECTION (alias SectionHeader)
// ============================================================
export function Section({ label, variant = 'primary', tone, className }: {
  label: string;
  variant?: 'primary' | 'accent' | 'danger';
  tone?: 'primary' | 'accent' | 'danger';
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

export const SectionHeader = Section;

// ============================================================
// CARD
// ============================================================
type CardLegacyVariant = 'default' | 'elevated' | 'alt' | 'insight' | 'warning' | 'danger';

export function Card({
  children, compact, insight, warning, danger, interactive, onClick, className = '',
  variant, style, role, ariaLabel,
}: {
  children: React.ReactNode;
  compact?: boolean;
  insight?: boolean;
  warning?: boolean;
  danger?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
  variant?: CardLegacyVariant;
  style?: React.CSSProperties;
  role?: string;
  ariaLabel?: string;
}) {
  const isInsight = insight || variant === 'insight';
  const isWarning = warning || variant === 'warning';
  const isDanger = danger || variant === 'danger';
  const isElevated = variant === 'elevated';
  const isAlt = variant === 'alt';
  const classes = ['pt-card',
    compact && 'pt-card--compact',
    isInsight && 'pt-card--insight',
    isWarning && 'pt-card--warning',
    isDanger && 'pt-card--danger',
    interactive && 'pt-card--interactive',
    className,
  ].filter(Boolean).join(' ');
  const inlineStyle: React.CSSProperties = {
    ...(isElevated ? { boxShadow: 'var(--pt-shadow-elevated)' } : {}),
    ...(isAlt ? { background: 'var(--pt-surface-alt)' } : {}),
    ...style,
  };
  // V43.4 — Card interactive : a11y semantic = button (role + tabIndex + keyboard)
  const isInteractive = Boolean(interactive && onClick);
  const a11yProps = isInteractive
    ? {
        role: role ?? 'button',
        tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        },
      }
    : { role };
  return (
    <div
      className={classes}
      style={Object.keys(inlineStyle).length ? inlineStyle : undefined}
      onClick={onClick}
      aria-label={ariaLabel}
      {...a11yProps}
    >
      {children}
    </div>
  );
}

// ============================================================
// INSIGHTCARD
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
// BUTTON
// ============================================================
type ButtonLegacyVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'destructive' | 'inverse';
type ButtonLegacySize = 'small' | 'medium' | 'sm' | 'md' | 'lg';

type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
  children: React.ReactNode;
  variant?: ButtonLegacyVariant;
  size?: ButtonLegacySize;
  fullWidth?: boolean;
  type?: 'button' | 'submit';
  ariaLabel?: string;
};

export function Button({
  children, variant = 'primary', size = 'medium', fullWidth, onClick,
  type = 'button', disabled, ariaLabel, className, style,
  ...rest
}: ButtonProps) {
  const v: 'primary' | 'secondary' | 'danger' =
    variant === 'ghost' ? 'secondary'
    : variant === 'destructive' ? 'danger'
    : variant === 'inverse' ? 'secondary'
    : variant;
  const isSmall = size === 'small' || size === 'sm';
  const classes = ['pt-btn', `pt-btn--${v}`,
    isSmall && 'pt-btn--small',
    fullWidth && 'pt-btn--full',
    variant === 'ghost' && 'pt-btn--ghost',
    variant === 'inverse' && 'pt-btn--inverse',
    className,
  ].filter(Boolean).join(' ');
  const ghostStyle: React.CSSProperties | undefined =
    variant === 'ghost' ? { background: 'transparent', border: 'none' }
    : variant === 'inverse' ? { background: 'var(--pt-surface)', color: 'var(--pt-primary)', border: '1.5px solid var(--pt-surface)' }
    : undefined;
  // data-pt="button" + inline borderRadius/textTransform : exposés pour la
  // compat des tests V29/V30 (ces tests vérifient l'attribut/style direct).
  const pillStyle: React.CSSProperties = {
    borderRadius: 'var(--ds-radius-pill)',
    textTransform: 'uppercase',
  };
  const { 'aria-label': _restAriaLabel, ...passthrough } = rest;
  const ariaLabelFinal = ariaLabel ?? _restAriaLabel;
  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabelFinal}
      data-pt="button"
      style={{ ...pillStyle, ...ghostStyle, ...style }}
      {...passthrough}
    >
      {children}
    </button>
  );
}

// ============================================================
// TAG
// ============================================================
type TagLegacyVariant = 'default' | 'primary' | 'accent' | 'soft' | 'danger' | 'warning' | 'success';

export function Tag({ children, variant = 'default', dot, className }: {
  children: React.ReactNode;
  variant?: TagLegacyVariant;
  dot?: boolean;
  className?: string;
}) {
  const v = variant === 'success' ? 'primary' : variant;
  return (
    <span className={`pt-tag ${v !== 'default' ? `pt-tag--${v}` : ''} ${className ?? ''}`}>
      {dot && <span className="pt-tag__dot" />}
      {children}
    </span>
  );
}

// ============================================================
// ICONBOX
// ============================================================
type IconBoxVariant = 'primary' | 'warm' | 'accent' | 'danger';

export function IconBox({ children, variant, tone, size = 'medium', className }: {
  children: React.ReactNode;
  variant?: IconBoxVariant;
  tone?: IconBoxVariant;
  size?: 'small' | 'medium' | number;
  className?: string;
}) {
  const v = tone ?? variant ?? 'primary';
  const sizeClass = size === 'small' ? 'pt-icon-box--small' : '';
  const sizeStyle: React.CSSProperties | undefined =
    typeof size === 'number' ? { width: size, height: size, fontSize: Math.round(size * 0.5) } : undefined;
  return (
    <div className={`pt-icon-box ${v !== 'primary' ? `pt-icon-box--${v}` : ''} ${sizeClass} ${className ?? ''}`} style={sizeStyle}>
      {children}
    </div>
  );
}

// ============================================================
// KEYVALUEROW
// ============================================================
export function KeyValueRow({ label, value, variant = 'default', tone }: {
  label: string;
  value: React.ReactNode;
  variant?: 'default' | 'muted' | 'accent';
  tone?: 'default' | 'muted' | 'accent';
}) {
  const v = tone ?? variant;
  return (
    <div className="pt-kv">
      <span className="pt-kv__key">{label}</span>
      <span className={`pt-kv__value ${v !== 'default' ? `pt-kv__value--${v}` : ''}`}>{value}</span>
    </div>
  );
}

// ============================================================
// STATS
// ============================================================
export function StatsGrid({ children, cols }: { children: React.ReactNode; cols?: number }) {
  const style: React.CSSProperties | undefined =
    cols ? { gridTemplateColumns: `repeat(${cols}, 1fr)` } : undefined;
  return <div className="pt-stats" style={style}>{children}</div>;
}

export function Stat({ value, label, tone }: {
  value: string | number;
  label: string;
  tone?: 'default' | 'accent' | 'danger';
}) {
  const valueStyle: React.CSSProperties | undefined =
    tone === 'accent' ? { color: 'var(--pt-accent-deep)' }
    : tone === 'danger' ? { color: 'var(--pt-danger)' }
    : undefined;
  return (
    <div className="pt-stat">
      <span className="pt-stat__value" style={valueStyle}>{value}</span>
      <span className="pt-stat__label">{label}</span>
    </div>
  );
}

// ============================================================
// TABS
// ============================================================
type TabOption = { value: string; label: string; count?: number };
type TabItem = { id: string; label: string; count?: number };

export function Tabs(props: {
  value: string;
  onChange: (v: string) => void;
  options?: TabOption[];
  items?: TabItem[];
  ariaLabel?: string;
}) {
  const opts: TabOption[] = props.options ?? (props.items?.map(i => ({ value: i.id, label: i.label, count: i.count })) ?? []);
  return (
    <div className="pt-tabs" role="tablist" aria-label={props.ariaLabel}>
      {opts.map(opt => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={props.value === opt.value}
          className={`pt-tab ${props.value === opt.value ? 'pt-tab--active' : ''}`}
          onClick={() => props.onChange(opt.value)}
        >
          {opt.label}
          {opt.count !== undefined && <span style={{ marginLeft: 6, fontWeight: 700, opacity: 0.85 }}>{opt.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// SEGMENT
// ============================================================
export function Segment<T extends string>({ value, onChange, options, ariaLabel }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  ariaLabel?: string;
}) {
  return (
    <div className="pt-segment" role="tablist" aria-label={ariaLabel}>
      {options.map(opt => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={value === opt.value}
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
export function Chip({ children, label, count, active, onClick }: {
  children?: React.ReactNode;
  label?: React.ReactNode;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button className={`pt-chip ${active ? 'pt-chip--active' : ''}`} onClick={onClick}>
      {children ?? label}
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

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ invalid, className, style, ...rest }, ref) => {
    const borderStyle: React.CSSProperties | undefined =
      invalid ? { borderColor: 'var(--pt-danger)' } : undefined;
    return (
      <input
        ref={ref}
        className={`pt-field__input ${className ?? ''}`}
        style={{ ...borderStyle, ...style }}
        {...rest}
      />
    );
  },
);
Input.displayName = 'Input';

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
          <button type="button" aria-label="Effacer la recherche" onClick={onClear} className="pt-search__clear">
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
export function ListItem({ icon, avatar, title, primary, subtitle, secondary, tag, trailing, onClick }: {
  icon?: React.ReactNode;
  avatar?: React.ReactNode;
  title?: string;
  primary?: React.ReactNode;
  subtitle?: string;
  secondary?: React.ReactNode;
  tag?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
}) {
  const lead = avatar ?? icon;
  const top = primary ?? title;
  const bottom = secondary ?? subtitle;
  return (
    <div className="pt-list-item" onClick={onClick}>
      {lead && (typeof lead === 'string'
        ? <IconBox variant="warm" size="small">{lead}</IconBox>
        : lead)}
      <div className="pt-list-item__main">
        <div className="pt-list-item__title">{top}</div>
        {bottom !== undefined && bottom !== null && <div className="pt-list-item__subtitle">{bottom}</div>}
      </div>
      {trailing ?? tag}
    </div>
  );
}

// ============================================================
// ACTION ROW
// ============================================================
export function ActionRow({ icon, title, subtitle, description, badge, trailing, destructive, onClick, ariaLabel }: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  description?: string;
  badge?: string | number;
  trailing?: React.ReactNode;
  destructive?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const sub = subtitle ?? description;
  const titleStyle: React.CSSProperties | undefined =
    destructive ? { color: 'var(--pt-danger)' } : undefined;
  return (
    <div
      className="pt-action"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel ?? title}
    >
      {icon && (typeof icon === 'string'
        ? <IconBox variant="primary" size="small">{icon}</IconBox>
        : icon)}
      <div className="pt-action__main">
        <div className="pt-action__title" style={titleStyle}>{title}</div>
        {sub && <div className="pt-action__sub">{sub}</div>}
      </div>
      {trailing || <span className="pt-action__chevron">›</span>}
      {badge !== undefined && <span className="pt-action__badge">{badge}</span>}
    </div>
  );
}

// ============================================================
// ALERT GROUP / ALERT ROW
// ============================================================
type AlertSeverity = 'critical' | 'warning' | 'urgent' | 'surveil';

const severityMap: Record<AlertSeverity, 'critical' | 'warning'> = {
  critical: 'critical',
  urgent: 'critical',
  warning: 'warning',
  surveil: 'warning',
};

export function AlertGroup({ severity, icon, title, count, subtitle, badge, action, children }: {
  severity: AlertSeverity;
  icon: React.ReactNode;
  title: string;
  count?: string | number;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  const sev = severityMap[severity];
  const countText = subtitle ?? (count !== undefined ? String(count) : '');
  return (
    <div className={`alert-group alert-group--${sev}`}>
      <div className="alert-group__head">
        <div className={`alert-group__icon alert-group__icon--${sev}`}>{icon}</div>
        <div className="alert-group__title-wrap">
          <div className="alert-group__title">{title}</div>
          {countText && <div className="alert-group__count">{countText}</div>}
        </div>
        {badge}
      </div>
      <div className="alert-group__body">
        {children}
        {action && (
          <div className="alert-group__action">
            <Button size="small" variant={sev === 'critical' ? 'primary' : 'secondary'} onClick={action.onClick}>
              {action.label} ›
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export interface AlertRowProps {
  name?: string;
  primary?: React.ReactNode;
  detail?: string;
  secondary?: React.ReactNode;
  value?: number | string;
  unit?: string;
  variant?: 'critical' | 'warning';
  valueDanger?: boolean;
  onClick?: () => void;
}

export const AlertRow: React.FC<AlertRowProps> = ({ name, primary, detail, secondary, value, unit, variant = 'critical', valueDanger, onClick }) => {
  const top = primary ?? name;
  const bottom = secondary ?? detail;
  const v = valueDanger ? 'critical' : variant;
  return (
    <div className="alert-row" onClick={onClick}>
      <div className="alert-row__main">
        <div className="alert-row__name">{top}</div>
        {bottom !== undefined && bottom !== null && bottom !== '' && <div className="alert-row__detail">{bottom}</div>}
      </div>
      {value !== undefined ? (
        <div className={`alert-row__value ${v === 'warning' ? 'alert-row__value--warning' : ''}`}>
          {value}
          {unit && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--pt-text-subtle)', marginLeft: 4 }}>{unit}</span>}
        </div>
      ) : onClick ? <span>›</span> : null}
    </div>
  );
};

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
// TOGGLE / SWITCH
// ============================================================
export function Toggle({ checked, onChange, label, description, disabled, ariaLabel }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`pt-toggle ${checked ? 'pt-toggle--on' : ''}`}
    >
      <span aria-hidden="true" className="pt-toggle__thumb" />
    </button>
  );
  if (!label && !description) return control;
  return (
    <div className="pt-toggle-row">
      <div className="pt-toggle-row__text">
        {label && <span className="pt-toggle-row__label">{label}</span>}
        {description && <span className="pt-toggle-row__desc">{description}</span>}
      </div>
      {control}
    </div>
  );
}

export const Switch = Toggle;

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
          {isLast ? completeLabel : 'Suivant ›'}
        </button>
      </footer>
    </div>
  );
};

// ============================================================
// CYCLE TIMELINE
// ============================================================
export type CycleStep = {
  label: string;
  day: number;
  done?: boolean;
  target?: boolean;
};

export function CycleTimeline({ currentDay, totalDays, steps, eyebrow }: {
  currentDay: number;
  totalDays: number;
  steps: CycleStep[];
  eyebrow?: string;
}) {
  const safeTotal = Math.max(totalDays, 1);
  const progressPct = Math.min(100, Math.max(0, (currentDay / safeTotal) * 100));
  const sorted = [...steps].sort((a, b) => a.day - b.day);
  // Si deux steps consécutifs sont espacés de moins de 18% du total, on alterne
  // les labels haut/bas pour éviter la superposition (corrige bug F6 du PDF V40).
  const positions = sorted.map((s) => Math.min(100, Math.max(0, (s.day / safeTotal) * 100)));
  const placements: ('below' | 'above')[] = [];
  positions.forEach((p, i) => {
    if (i === 0) {
      placements.push('below');
      return;
    }
    const tooClose = p - positions[i - 1] < 18;
    placements.push(tooClose && placements[i - 1] === 'below' ? 'above' : 'below');
  });
  return (
    <div className="pt-cycle">
      {eyebrow && (
        <div className="pt-cycle__eyebrow">
          {eyebrow} · jour {currentDay}/{totalDays}
        </div>
      )}
      <div className="pt-cycle__track" aria-hidden="true">
        <div className="pt-cycle__progress" style={{ width: `${progressPct}%` }} />
        {sorted.map((step, i) => {
          const left = positions[i];
          const stateClass = step.done
            ? 'pt-cycle__node--done'
            : step.target
              ? 'pt-cycle__node--target'
              : 'pt-cycle__node--idle';
          return (
            <div
              key={`${step.label}-${step.day}`}
              className={`pt-cycle__step pt-cycle__step--${placements[i]}`}
              style={{ left: `${left}%` }}
            >
              <span className={`pt-cycle__node ${stateClass}`}>
                {step.done && (
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                    <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="pt-cycle__label">{step.label}</span>
              <span className="pt-cycle__day">J{step.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// DATA TABLE
// ============================================================
export type Column<T> = {
  key: keyof T | string;
  label: string;
  width?: number;
  render?: (row: T) => React.ReactNode;
  format?: (value: unknown) => React.ReactNode;
};

export type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  ariaLabel?: string;
};

export function DataTable<T extends { id?: string | number }>({
  columns,
  rows,
  onRowClick,
  emptyMessage = 'Aucune donnée',
  ariaLabel,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <Empty>{emptyMessage}</Empty>;
  }
  return (
    <div className="pt-data-table">
      <table className="pt-data-table__table" aria-label={ariaLabel}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="pt-data-table__th"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.id ?? idx}
              className={`pt-data-table__tr ${onRowClick ? 'pt-data-table__tr--clickable' : ''}`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
            >
              {columns.map((col) => {
                const raw = (row as Record<string, unknown>)[col.key as string];
                let content: React.ReactNode;
                if (col.render) content = col.render(row);
                else if (col.format) content = col.format(raw);
                else content = raw as React.ReactNode;
                return (
                  <td
                    key={String(col.key)}
                    className="pt-data-table__td"
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// PAGE HEADER — V41 pattern canonique architecture de page
// ============================================================
// Pattern strict : eyebrow (1 mot UPPERCASE auto) + H1 (Big Shoulders) +
// subtitle 1 ligne max. Pas de prop "actions"/"cta" : un header ne contient
// JAMAIS de bouton (règle V41 LA 11e RÈGLE D'OR — ARCHITECTURE DE PAGE).
export function PageHeader({ eyebrow, title, subtitle }: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="pt-page-header">
      <div className="pt-page-header__eyebrow">
        <span className="pt-page-header__dot" aria-hidden="true" />
        <span>{eyebrow.toUpperCase()}</span>
      </div>
      <h1 className="pt-page-header__title">{title}</h1>
      {subtitle && <p className="pt-page-header__subtitle">{subtitle}</p>}
    </header>
  );
}
