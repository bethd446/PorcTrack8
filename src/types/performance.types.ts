/**
 * performance.types.ts — Contrat de données pour l'analyse génétique
 */

export type ScoreProlificite = 'ELITE' | 'STANDARD' | 'SOUS_PERF';

export type DecisionReforme = 'GARDER' | 'A_SURVEILLER' | 'REFORMER';

export interface TruiePerformanceReport {
  score: ScoreProlificite;
  isseMoyen: number | null;
  tauxSurvieGlobal: number; // en %
  isDeclining: boolean;
  verdictBio: string;
  decision: DecisionReforme;
}
