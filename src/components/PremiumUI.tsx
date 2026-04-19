/**
 * PremiumUI — Système de composants PorcTrack · Terroir
 * ─────────────────────────────────────────────────────────
 * Direction: Clean & Organic
 *   Arrondis    : 20px cartes | 14px boutons | 12px inputs
 *   Ombres      : subtiles et chaudes
 *   Palette     : sage #059669 | terre #F59E0B | warm whites
 *   Typo        : InstrumentSans body | BigShoulders display | DMMono data
 */

import React, { useState } from 'react';
import { IonSpinner } from '@ionic/react';
import { SkeletonLine, SkeletonBox } from './SkeletonCard';

// ═══════════════════════════════════════════════════════
// ICONS & ATOMS
// ═══════════════════════════════════════════════════════

export const PigIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.5 8c.17 0 .33.01.5.03V7c0-.55-.45-1-1-1h-1V4.5C18 3.12 16.88 2 15.5 2S13 3.12 13 4.5V6h-2V4.5C11 3.12 9.88 2 8.5 2S6 3.12 6 4.5V6H5c-.55 0-1 .45-1 1v1.03C4.17 8.01 4.33 8 4.5 8 3.12 8 2 9.12 2 10.5S3.12 13 4.5 13c.06 0 .12-.01.18-.01C5.07 14.19 5.96 15.12 7 15.68V18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-2.32c1.04-.56 1.93-1.49 2.32-2.69.06.01.12.01.18.01C20.88 13 22 11.88 22 10.5S20.88 8 19.5 8zM9 11.5c-.83 0-1.5-.67-1.5-1.5S8.17 8.5 9 8.5s1.5.67 1.5 1.5S9.83 11.5 9 11.5zm6 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
  </svg>
);

// ═══════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════

const T = {
  radius: { card: '20px', button: '14px', input: '14px', badge: '8px' },
  shadow: {
    card: '0 1px 2px rgba(28,25,23,0.03), 0 4px 12px rgba(28,25,23,0.04)',
    cardHover: '0 2px 4px rgba(28,25,23,0.05), 0 8px 24px rgba(28,25,23,0.08)',
    button: '0 4px 14px -2px rgba(45,106,79,0.3)',
  },
  color: {
    sage800: '#059669', sage700: '#10B981', sage600: '#10B981',
    sage100: '#EDF7F0', sage50: '#ECFDF5',
    terra400: '#F59E0B', terra100: '#FFFBEB',
    ink900: '#111827', ink700: '#374151', ink500: '#6B7280', ink400: '#9CA3AF', ink300: '#D1D5DB',
    warm200: '#E5E7EB', warm100: '#F3F4F6', warmWhite: '#FFFFFF',
  },
};

// ═══════════════════════════════════════════════════════
// PREMIUM CARD
// ═══════════════════════════════════════════════════════

export type CardVariant = 'default' | 'alert' | 'success' | 'offline' | 'glass' | 'pig';

interface PremiumCardProps {
  children?: React.ReactNode;
  variant?: CardVariant;
  loading?: boolean;
  skeletonHeight?: string;
  onClick?: () => void;
  className?: string;
  padding?: string;
}

const CARD_VARIANTS: Record<CardVariant, string> = {
  default:  'bg-white border-gray-100',
  alert:    'bg-red-50 border-red-100',
  success:  'bg-accent-50 border-accent-100',
  offline:  'bg-amber-50 border-amber-50',
  glass:    'bg-white/80 backdrop-blur-xl border-white/60',
  pig:      'bg-white border-l-[3px] border-l-amber-500 border-t-gray-200 border-r-gray-200 border-b-gray-200',
};

export const PremiumCard: React.FC<PremiumCardProps> = ({
  children,
  variant = 'default',
  loading = false,
  skeletonHeight = 'h-16',
  onClick,
  className = '',
  padding = 'p-5',
}) => {
  const base = `rounded-[20px] border transition-colors duration-200 ${CARD_VARIANTS[variant]}`;
  const interactive = onClick ? 'cursor-pointer active:scale-[0.97]' : '';

  if (loading) {
    return (
      <div className={`${base} ${padding} animate-pulse space-y-3 ${className}`} style={{ boxShadow: T.shadow.card }}>
        <div className="flex items-center gap-3">
          <SkeletonBox size="w-10 h-10" />
          <div className="flex-1 space-y-2">
            <SkeletonLine width="w-24" height="h-3" />
            <SkeletonLine width="w-16" height="h-2" />
          </div>
        </div>
        <div className={`${skeletonHeight} w-full bg-gray-50 rounded-xl`} />
      </div>
    );
  }

  return (
    <div
      className={`${base} ${padding} ${interactive} ${className}`}
      onClick={onClick}
      style={{ boxShadow: T.shadow.card }}
    >
      {children}
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// PREMIUM BUTTON
// ═══════════════════════════════════════════════════════

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'offline' | 'glass';
export type ButtonSize   = 'xs' | 'sm' | 'md' | 'lg';

interface PremiumButtonProps {
  children?: React.ReactNode;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconEnd?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  type?: 'button' | 'submit';
  className?: string;
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:   'bg-accent-600 text-white',
  secondary: 'bg-gray-50 text-gray-700',
  danger:    'bg-red-500 text-white',
  ghost:     'bg-transparent text-gray-500 border border-gray-100',
  offline:   'bg-amber-50 text-amber-600 border border-amber-50',
  glass:     'bg-white/15 backdrop-blur-md text-white border border-white/20',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  xs: 'h-8  px-3  text-[11px] rounded-[10px]',
  sm: 'h-10 px-4  text-[12px] rounded-[12px]',
  md: 'h-[48px] px-5 text-[13px] rounded-[14px]',
  lg: 'h-[54px] px-8 text-[14px] rounded-[16px]',
};

export const PremiumButton: React.FC<PremiumButtonProps> = ({
  children, label, variant = 'primary', size = 'md',
  icon, iconEnd, loading = false, disabled = false,
  fullWidth = false, onClick, type = 'button', className = '',
}) => {
  const base = 'font-bold flex items-center justify-center gap-2.5 transition-colors duration-200 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none select-none';
  const shadow = variant === 'primary' ? T.shadow.button : variant === 'danger' ? '0 4px 14px -2px rgba(230,57,70,0.3)' : 'none';
  const content = label ?? children;

  const renderIcon = (iconProp: React.ReactNode) => {
    if (!iconProp) return null;
    return <span className="text-base flex-shrink-0">{iconProp}</span>;
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${base} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{ boxShadow: shadow }}
    >
      {loading
        ? <IonSpinner name="bubbles" className="w-4 h-4" />
        : <>
            {renderIcon(icon)}
            {content && <span>{content}</span>}
            {renderIcon(iconEnd)}
          </>
      }
    </button>
  );
};

// ═══════════════════════════════════════════════════════
// PREMIUM INPUT
// ═══════════════════════════════════════════════════════

type InputType   = 'text' | 'number' | 'date' | 'email' | 'tel' | 'textarea';
type InputStatus = 'idle' | 'valid' | 'error';

interface PremiumInputProps {
  label: string;
  value: string | number;
  onChange: (val: string) => void;
  type?: InputType;
  placeholder?: string;
  status?: InputStatus;
  errorMsg?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  icon?: React.ReactNode;
  rows?: number;
  className?: string;
}

const INPUT_STATUS: Record<InputStatus, string> = {
  idle:  'border-gray-100 focus-within:border-accent-500',
  valid: 'border-accent-200 bg-accent-50',
  error: 'border-red-100 bg-red-50',
};

export const PremiumInput: React.FC<PremiumInputProps> = ({
  label, value, onChange, type = 'text', placeholder = '',
  status = 'idle', errorMsg, hint, disabled = false,
  required = false, icon, rows = 4, className = '',
}) => {
  const [focused, setFocused] = useState(false);
  const floatLabel = focused || (value !== '' && value !== undefined && value !== null);
  const containerCls = `relative rounded-[14px] border bg-white transition-colors duration-200 ${INPUT_STATUS[status]} ${disabled ? 'opacity-50' : ''}`;
  const inputCls = 'w-full bg-transparent outline-none text-gray-900 font-medium text-[14px] px-4 disabled:cursor-not-allowed';

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className={containerCls}>
        <label className={`absolute left-4 text-gray-400 font-medium pointer-events-none transition-colors duration-200
          ${floatLabel ? 'text-[11px] top-2' : 'text-[13px] top-1/2 -translate-y-1/2'}
          ${status === 'error' ? 'text-red-500' : status === 'valid' ? 'text-accent-500' : ''}`}>
          {label}{required && ' *'}
        </label>
        {icon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        {type === 'textarea' ? (
          <textarea
            value={value} rows={rows} disabled={disabled}
            placeholder={focused ? placeholder : ''}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            onChange={e => onChange(e.target.value)}
            className={`${inputCls} pt-7 pb-3 resize-none`}
          />
        ) : (
          <input
            type={type} value={value} disabled={disabled}
            placeholder={focused ? placeholder : ''}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            onChange={e => onChange(e.target.value)}
            className={`${inputCls} h-[52px] pt-5`}
            inputMode={type === 'number' ? 'numeric' : undefined}
          />
        )}
      </div>
      {status === 'error' && errorMsg && (
        <p className="text-[11px] font-medium text-red-500 px-2">{errorMsg}</p>
      )}
      {status !== 'error' && hint && (
        <p className="text-[11px] text-gray-400 px-2">{hint}</p>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// PREMIUM BADGE
// ═══════════════════════════════════════════════════════

export type BadgeVariant = 'emerald' | 'blue' | 'amber' | 'rose' | 'slate' | 'pork';

interface PremiumBadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

const BADGE_VARIANTS: Record<BadgeVariant, { bg: string; text: string; border: string; dotColor: string }> = {
  emerald: { bg: 'bg-accent-50', text: 'text-accent-600', border: 'border-accent-100', dotColor: 'bg-accent-500' },
  blue:    { bg: 'bg-blue-50', text: 'text-blue-500', border: 'border-blue-100', dotColor: 'bg-blue-500' },
  amber:   { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', dotColor: 'bg-amber-600' },
  rose:    { bg: 'bg-red-50', text: 'text-red-500', border: 'border-red-100', dotColor: 'bg-red-500' },
  slate:   { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-100', dotColor: 'bg-gray-400' },
  pork:    { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-50', dotColor: 'bg-amber-500' },
};

export const PremiumBadge: React.FC<PremiumBadgeProps> = ({ label, variant = 'slate', dot = false, className = '' }) => {
  const v = BADGE_VARIANTS[variant];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${v.bg} ${v.text} ${v.border} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${v.dotColor}`} />}
      {label}
    </span>
  );
};

// ═══════════════════════════════════════════════════════
// SECTION HEADER
// ═══════════════════════════════════════════════════════

interface SectionHeaderProps {
  title: string;
  action?: { label: string; onClick: () => void };
  count?: number;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, action, count, className = '' }) => (
  <div className={`flex items-center justify-between px-1 mb-3 ${className}`}>
    <div className="flex items-center gap-2">
      <h2 className="ft-heading text-[15px] font-bold text-gray-700">
        {title}
      </h2>
      {count !== undefined && count > 0 && (
        <span className="ft-values text-[11px] font-bold text-white bg-accent-600 px-2 py-0.5 rounded-md leading-none">{count}</span>
      )}
    </div>
    {action && (
      <button
        onClick={action.onClick}
        className="pressable text-[12px] font-medium text-accent-500 active:opacity-60"
      >
        {action.label}
      </button>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: { label: string; variant?: ButtonVariant; onClick: () => void };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle, action }) => (
  <div className="rounded-[20px] border-2 border-dashed border-gray-100 bg-gray-50 p-10 text-center space-y-4">
    <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center mx-auto border border-gray-100 text-gray-400">
      {icon}
    </div>
    <div className="space-y-1">
      <p className="ft-heading text-[14px] font-bold text-gray-600">{title}</p>
      {subtitle && <p className="text-[12px] text-gray-400">{subtitle}</p>}
    </div>
    {action && (
      <PremiumButton variant={action.variant ?? 'secondary'} size="sm" onClick={action.onClick} label={action.label} />
    )}
  </div>
);

// ═══════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════

interface StatCardProps {
  value: string | number;
  label: string;
  subLabel?: string;
  accentClass?: string;
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  value, label, subLabel, accentClass = 'text-gray-900', loading = false,
}) => (
  <PremiumCard loading={loading} skeletonHeight="h-12" className="text-center space-y-1" padding="p-4">
    <p className={`ft-values font-bold text-[28px] leading-none ${accentClass}`}>{value}</p>
    <p className="text-[11px] font-medium text-gray-500">{label}</p>
    {subLabel && <p className="text-[11px] text-gray-400">{subLabel}</p>}
  </PremiumCard>
);

// ═══════════════════════════════════════════════════════
// DATA SOURCE INDICATOR
// ═══════════════════════════════════════════════════════

interface DataSourceIndicatorProps {
  source: 'NETWORK' | 'CACHE' | 'FALLBACK' | null;
  onRefresh?: () => void;
  compact?: boolean;
}

export const DataSourceIndicator: React.FC<DataSourceIndicatorProps> = ({ source, onRefresh, compact = false }) => {
  if (!source || source === 'NETWORK') return null;

  const config = {
    CACHE:    { dot: 'bg-amber-500', label: 'Cache',      bg: 'bg-amber-50 border-amber-50', text: 'text-amber-600', btnBg: 'bg-amber-100 text-amber-600' },
    FALLBACK: { dot: 'bg-red-500', label: 'Hors ligne', bg: 'bg-red-50 border-red-100', text: 'text-red-500', btnBg: 'bg-red-100 text-red-500' },
  }[source];

  if (!config) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        <span className={`text-[11px] font-medium ${config.text}`}>{config.label}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-4 ${config.bg}`}>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dot}`} />
      <p className={`text-[12px] font-medium flex-1 ${config.text}`}>
        {source === 'FALLBACK' ? 'Hors ligne — données en cache' : 'Données en cache'}
      </p>
      {onRefresh && (
        <button onClick={onRefresh} className={`pressable text-[11px] font-bold px-3 py-1.5 rounded-lg ${config.btnBg}`}>
          Sync
        </button>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// STATUT ANIMAL
// ═══════════════════════════════════════════════════════

export interface StatusConfig {
  bg: string;
  text: string;
  dot: string;
  badge: string;
  label: string;
}

// Clés normalisées (sans accents, lowercase) utilisées pour la recherche par `includes()`.
// Label affiché = valeur Sheets exacte (accents + casse conservés).
const STATUS_MAP: Record<string, StatusConfig> = {
  // Truies — statuts cibles (schéma Sheets 2026)
  'pleine':              { bg: 'bg-accent-50', text: 'text-accent-600', dot: 'bg-accent-500', badge: 'bg-accent-50 text-accent-600 border-accent-100', label: 'Pleine' },
  'maternit':            { bg: 'bg-amber-50',  text: 'text-amber-600',  dot: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-600 border-amber-200',   label: 'En maternité' },
  'en attente saillie':  { bg: 'bg-gray-50',   text: 'text-gray-500',   dot: 'bg-gray-400',   badge: 'bg-gray-50 text-gray-500 border-gray-100',      label: 'En attente saillie' },
  'a surveiller':        { bg: 'bg-amber-50',  text: 'text-amber-600',  dot: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-600 border-amber-200',   label: 'À surveiller' },
  // Verrats + statuts transverses (ordre important : clés plus longues d'abord pour éviter
  // qu'un `includes()` partiel ne capture à tort, ex: 'inactif' doit matcher avant 'actif').
  'inactif':             { bg: 'bg-gray-50',   text: 'text-gray-500',   dot: 'bg-gray-300',   badge: 'bg-gray-50 text-gray-500 border-gray-100',      label: 'Inactif' },
  'reforme':             { bg: 'bg-red-50',    text: 'text-red-500',    dot: 'bg-red-500',    badge: 'bg-red-50 text-red-500 border-red-100',         label: 'Réforme' },
  'morte':               { bg: 'bg-gray-50',   text: 'text-gray-500',   dot: 'bg-gray-400',   badge: 'bg-gray-50 text-gray-500 border-gray-100',      label: 'Morte' },
  'mort':                { bg: 'bg-gray-50',   text: 'text-gray-500',   dot: 'bg-gray-400',   badge: 'bg-gray-50 text-gray-500 border-gray-100',      label: 'Mort' },
  'actif':               { bg: 'bg-accent-50', text: 'text-accent-600', dot: 'bg-accent-500', badge: 'bg-accent-50 text-accent-600 border-accent-100', label: 'Actif' },
};

const STATUS_DEFAULT: StatusConfig = {
  bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-300',
  badge: 'bg-gray-50 text-gray-500 border-gray-100', label: '—'
};

// eslint-disable-next-line react-refresh/only-export-components
export function getStatusConfig(statut?: string): StatusConfig {
  if (!statut) return STATUS_DEFAULT;
  const key = statut.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim();
  for (const [k, v] of Object.entries(STATUS_MAP)) {
    if (key.includes(k)) return v;
  }
  return STATUS_DEFAULT;
}

export const StatusBadge: React.FC<{ statut?: string; className?: string }> = ({ statut, className = '' }) => {
  const cfg = getStatusConfig(statut);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${cfg.badge} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label || statut || '—'}
    </span>
  );
};

// ═══════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════

export default {
  Card:                PremiumCard,
  Button:              PremiumButton,
  Input:               PremiumInput,
  Badge:               PremiumBadge,
  SectionHeader,
  EmptyState,
  StatCard,
  DataSourceIndicator,
  StatusBadge,
  getStatusConfig,
};
