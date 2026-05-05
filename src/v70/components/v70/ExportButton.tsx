/**
 * V70 — ExportButton (Mode avancé)
 *
 * Génère un fichier CSV à partir d'un tableau d'objets et déclenche son
 * téléchargement via Blob + <a download>.
 */
import React from 'react';

export interface ExportButtonProps {
  data: Array<Record<string, unknown>>;
  filename?: string;
  label?: string;
}

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(data: Array<Record<string, unknown>>): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => escapeCsv(row[h])).join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  filename = 'export.csv',
  label = 'Export CSV',
}) => {
  const handleClick = () => {
    const csv = toCsv(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      onClick={handleClick}
      disabled={data.length === 0}
    >
      📥 {label}
    </button>
  );
};
