/**
 * V75-q B-1 — Formatters partagés (dates, poids, casse).
 *
 * - formatDateFr : ISO 'YYYY-MM-DD' → 'DD/MM/YYYY' (lisibilité éleveur FR).
 * - formatPoids  : kg → 'X.X kg' (toujours 1 décimale, cohérence visuelle).
 * - titleCase    : 'audit final' → 'Audit Final' (rendu pro profil OWNER).
 */

export function formatDateFr(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatPoids(kg?: number | null): string {
  if (kg == null) return '—';
  return `${kg.toFixed(1)} kg`;
}

export function titleCase(s?: string | null): string {
  if (!s) return '';
  return s
    .split(' ')
    .map(w => (w.length === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}
