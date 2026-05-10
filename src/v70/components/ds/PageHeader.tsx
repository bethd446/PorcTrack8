/**
 * V70 — PageHeader (réplique mockup ligne 238-277)
 *
 * Référence pixel-perfect : docs/v70/v70-mockup.html
 * - .page-header (l. 238-240) : margin-bottom 16px
 * - .page-eyebrow (l. 242-261) : JetBrains Mono 10px UPPERCASE + puce 4px verte
 * - .page-title (l. 263-271) : Big Shoulders Display 36px black UPPERCASE
 * - .page-subtitle (l. 273-277) : 13px muted
 * - .breadcrumb (l. 847-857) : 11px muted, séparateur "/"
 */
import React from 'react';
import { ChevronLeft } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href: string;
}

export interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  /** Affiche un bouton retour explicite au-dessus de l'eyebrow (V75-aa F-14). */
  onBack?: () => void;
  /** Label du bouton retour (defaut "Retour"). */
  backLabel?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  breadcrumbs,
  onBack,
  backLabel = 'Retour',
}) => {
  return (
    <div className="page-header">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            padding: '4px 0',
            marginBottom: 8,
            color: 'var(--pt-muted)',
            fontFamily: 'var(--pt-font-mono)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          <ChevronLeft size={14} strokeWidth={1.75} aria-hidden />
          {backLabel}
        </button>
      )}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="breadcrumb" aria-label="breadcrumb">
          {breadcrumbs.map((item, idx) => (
            <React.Fragment key={`${item.href}-${idx}`}>
              {idx > 0 && <span className="breadcrumb-sep">/</span>}
              <a href={item.href}>{item.label}</a>
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="page-eyebrow">{eyebrow}</div>
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
  );
};
