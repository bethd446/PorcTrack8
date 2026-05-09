import type { Truie } from '../../types/farm';

const REFORM_RE = /réforme|reforme/i;
const PARITY_THRESHOLD = 6;
const AGE_MONTHS_THRESHOLD = 12;

export function isReformed(t: Pick<Truie, 'statut'>): boolean {
  return REFORM_RE.test(t.statut ?? '');
}

function ageInMonths(dateNaissance?: string): number | null {
  if (!dateNaissance) return null;
  const d = new Date(dateNaissance);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

export function needsReformConsideration(t: Pick<Truie, 'statut' | 'nbPortees' | 'dateNaissance'>): boolean {
  if (isReformed(t as Truie)) return false;
  const portees = t.nbPortees ?? 0;
  if (portees >= PARITY_THRESHOLD) return true;
  if (portees === 0) {
    const months = ageInMonths(t.dateNaissance);
    if (months !== null && months >= AGE_MONTHS_THRESHOLD) return true;
  }
  return false;
}

export function alreadySortedOut(t: Truie & { dateSortie?: string | null }): boolean {
  return Boolean(t.dateSortie);
}

export function reformReason(t: Pick<Truie, 'nbPortees' | 'dateNaissance'>): string {
  const portees = t.nbPortees ?? 0;
  if (portees >= PARITY_THRESHOLD) return 'Truie âgée — 6 portées ou plus';
  if (portees === 0) {
    const months = ageInMonths(t.dateNaissance);
    if (months !== null && months >= AGE_MONTHS_THRESHOLD) {
      return 'Trop âgée ou pas assez de portées';
    }
  }
  return 'À évaluer';
}
