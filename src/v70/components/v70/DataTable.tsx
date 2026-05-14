/**
 * V70 — DataTable (mode avancé)
 *
 * Tableau de données avec colonnes typées + tri optionnel.
 * Affiché uniquement quand UIPreferencesContext.advancedMode === true.
 *
 * Phase 7 V70 — Décision D Christophe : DataTable + ExportCSV livrés V70.
 * PDF et graphiques avancés reportés V71.
 */
import React, { useState, useMemo } from 'react';

export interface DataTableColumn<T> {
  key: keyof T & string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: DataTableColumn<T>[];
  emptyLabel?: string;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  emptyLabel = 'Aucune donnée',
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = av < bv ? -1 : 1;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (data.length === 0) {
    return (
      <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--pt-muted)' }}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        background: 'var(--pt-bg)',
        border: '1px solid var(--pt-line)',
        borderRadius: 12,
        overflow: 'auto',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--pt-line-strong)', background: 'var(--pt-bg-app)' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: col.sortable ? '14px 12px' : '12px 12px',
                  textAlign: col.align ?? 'left',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--pt-ink)',
                  cursor: col.sortable ? 'pointer' : 'default',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
                onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                {col.label}
                {col.sortable && (
                  <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.5 }}>
                    {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--pt-line)' }}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{
                    padding: '10px 12px',
                    textAlign: col.align ?? 'left',
                    color: 'var(--pt-ink)',
                  }}
                >
                  {col.render ? col.render(row) : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
