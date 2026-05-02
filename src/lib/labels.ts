/**
 * labels.ts — Canonisation des libellés statuts (UI uniquement).
 *
 * Le but est d'afficher UN seul terme par concept côté utilisateur, alors que
 * la base / les services manipulent plusieurs alias historiques (Lactation,
 * Maternité, Allaitante…). Ne PAS utiliser pour les comparaisons en service
 * (alertEngine, phaseEngine, perfKpiAnalyzer) — ces moteurs comparent des
 * strings DB exactes.
 *
 * Convention :
 *  - Truie en train d'allaiter → "Allaitante"
 *  - Bande sous mère          → "Sous mère"
 *  - Groupe de porcelets      → "Bande" (nav) / "Portée" (timeline biologique)
 */

export const STATUT_TRUIE_LABEL: Record<string, string> = {
  Allaitante: 'Allaitante',
  Lactation: 'Allaitante',
  Maternité: 'Allaitante',
  'En maternité': 'Allaitante',
  Pleine: 'Pleine',
  Gestation: 'Pleine',
  Vide: 'Vide',
  'En attente saillie': 'En attente saillie',
  Chaleur: 'Chaleur',
  Flushing: 'Flushing',
  Surveillance: 'Surveillance',
  'À surveiller': 'À surveiller',
  Réforme: 'Réforme',
  Morte: 'Morte',
};

export const STATUT_BANDE_LABEL: Record<string, string> = {
  'Sous mère': 'Sous mère',
  Maternité: 'Sous mère',
  Allaitante: 'Sous mère',
  Sevrés: 'Sevrés',
  'En croissance': 'En croissance',
  'En finition': 'En finition',
  RECAP: 'RECAP',
};

export function labelStatutTruie(s: string | null | undefined): string {
  if (!s) return '—';
  return STATUT_TRUIE_LABEL[s] ?? s;
}

export function labelStatutBande(s: string | null | undefined): string {
  if (!s) return '—';
  return STATUT_BANDE_LABEL[s] ?? s;
}
