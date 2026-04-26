/**
 * Relevé de pesées terrain — Ferme K13
 * Date: 25/04/2026
 */

export interface LogeReleve {
  id: string;
  weights: number[];
  moyenne: number;
  alerte: string;
}

export const WEIGHTS_RELEVE: Record<string, LogeReleve> = {
  LOGE_1: {
    id: 'Loge 1',
    weights: [12.0, 13.0, 13.0, 9.0, 11.5, 10.5, 11.5, 12.8, 10.6, 13.5, 12.5, 13.8, 11.0, 9.0, 10.0, 13.5, 12.5, 13.5, 11.0, 12.0, 12.0, 13.0, 13.5, 12.0],
    moyenne: 11.95,
    alerte: "Hétérogénéité modérée (9kg à 13,8kg) - 2 sujets en retard (9kg).",
  },
  LOGE_2: {
    id: 'Loge 2',
    weights: [16.0, 17.0, 16.0, 15.8, 17.5, 18.0, 19.5, 15.8, 16.0, 15.5, 16.0, 14.5, 16.0, 17.0, 16.5, 15.5, 17.0, 18.5, 16.0, 17.0, 16.5, 17.0],
    moyenne: 16.57,
    alerte: "Lot très performant et homogène. Prêt pour transition / engraissement.",
  },
  LOGE_3: {
    id: 'Loge 3',
    weights: [8.0, 7.0, 9.0, 10.0, 7.0, 8.4, 7.5, 9.0, 10.5, 7.8, 7.6, 8.0, 8.0, 9.0, 10.0, 8.3, 9.5, 7.8, 9.0, 7.5, 9.0, 8.0, 10.5, 10.0, 10.0, 9.5, 8.0],
    moyenne: 8.77,
    alerte: "Forte hétérogénéité (7kg à 10,5kg). Petit gabarit.",
  },
  LOGE_4: {
    id: 'Loge 4',
    weights: [8.0, 7.0, 8.0, 7.0, 6.0, 9.5, 8.5, 8.5, 7.5, 9.5, 11.5, 10.0, 8.0, 10.0, 7.0, 7.5, 8.5, 9.5, 8.0, 9.0, 9.0, 10.0, 11.5, 10.0, 9.5, 9.5, 8.5, 7.5, 8.0],
    moyenne: 8.71,
    alerte: "Retard de croissance global (Age : 43 jours / Moy : 8,7kg). Alerte sur le sujet à 6kg.",
  },
};

export const ANALYSE_RECOMMANDATIONS = [
  {
    titre: "Estimation GMQ (Loge 4)",
    constat: "GMQ Naissance-Pesée ~167 g/jour (Age: 43j, Poids: 8.7kg).",
    diagnostic: "Faible. On vise > 200g/j en post-sevrage.",
    action: "Optimisation alimentation (Bimestimul) ou check sanitaire.",
  },
  {
    titre: "Tri et Allotement",
    constat: "Hétérogénéité marquée dans les Loges 3 et 4 (sujets 6-7kg).",
    action: "Créer une loge 'infirmerie/rattrapage' pour isoler les petits gabarits.",
  },
];
