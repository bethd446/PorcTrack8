export interface Question {
  id: string;
  text: string;
  options: string[];
  type: 'choice' | 'text' | 'mixed';
  placeholder?: string;
}

export const CONTROLE_QUESTIONS: Question[] = [
  {
    id: 'Q1',
    text: 'Gestantes imminentes : mise bas confirmée ?',
    options: ['Oui', 'Non', 'En cours'],
    type: 'choice'
  },
  {
    id: 'Q2',
    text: 'Mortalité / malades aujourd’hui ?',
    options: ['Oui', 'Non', 'En cours'],
    type: 'mixed',
    placeholder: 'Détails (ex: Case 4, 1 truie)'
  },
  {
    id: 'Q3',
    text: 'Stock critique (aliment ou véto) ?',
    options: ['Oui', 'Non', 'En cours'],
    type: 'mixed',
    placeholder: 'Précisez l’article manquant'
  }
];
