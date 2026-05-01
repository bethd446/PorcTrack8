export type StatusKey =
  | 'pleine'
  | 'maternite'
  | 'attente-saillie'
  | 'surveiller'
  | 'inactif'
  | 'reforme'
  | 'morte'
  | 'mort'
  | 'actif'
  | 'unknown';

export interface StatusConfig {
  key: StatusKey;
  label: string;
}

const STATUS_MAP: Array<[string, StatusConfig]> = [
  ['pleine',             { key: 'pleine',          label: 'Pleine' }],
  ['maternit',           { key: 'maternite',       label: 'En maternité' }],
  ['en attente saillie', { key: 'attente-saillie', label: 'En attente saillie' }],
  ['a surveiller',       { key: 'surveiller',      label: 'À surveiller' }],
  ['inactif',            { key: 'inactif',         label: 'Inactif' }],
  ['reforme',            { key: 'reforme',         label: 'Réforme' }],
  ['morte',              { key: 'morte',           label: 'Morte' }],
  ['mort',               { key: 'mort',            label: 'Mort' }],
  ['actif',              { key: 'actif',           label: 'Actif' }],
];

const STATUS_DEFAULT: StatusConfig = { key: 'unknown', label: '—' };

export function getStatusConfig(statut?: string): StatusConfig {
  if (!statut) return STATUS_DEFAULT;
  const key = statut.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim();
  for (const [needle, cfg] of STATUS_MAP) {
    if (key.includes(needle)) return cfg;
  }
  return STATUS_DEFAULT;
}
