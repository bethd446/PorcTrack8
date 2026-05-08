/**
 * buildFarmContext — Marius RAG MVP (sans vecteurs).
 *
 * Injecte un bloc « CONTEXTE FERME » avant le message utilisateur envoyé à
 * Marius (Mistral cloud). Permet à Marius de répondre en référence aux
 * données réelles de la ferme courante (truies critiques, bandes en cours,
 * stocks en rupture, alertes prioritaires) plutôt que de produire une
 * réponse générique.
 *
 * Choix : enrichissement côté frontend (préfixe du user message) plutôt que
 * modification du system prompt llama-server (= redéploiement VPS).
 *
 * Sécurité : aucune PII (email/téléphone) injectée. Uniquement les codes
 * (T-XXX, V-XXX, B-XXX) et les statuts métier.
 *
 * Budget tokens : visé < 1000 tokens (~ 4000 caractères) pour ne pas saturer
 * le contexte Mistral-7B même en multi-tour.
 */
import type {
  Truie,
  Verrat,
  BandePorcelets,
  StockAliment,
  StockVeto,
} from '../../types/farm';
import type { FarmAlert, AlertPriority } from '../../services/alertEngine';

const DAYS_FR = [
  'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi',
];

/** Snapshot minimal exposé par useFarm() consommé pour bâtir le contexte. */
export interface FarmSnapshot {
  nomFerme: string;
  pays: string | null;
  truies: Truie[];
  verrats: Verrat[];
  bandes: BandePorcelets[];
  stockAliment: StockAliment[];
  stockVeto: StockVeto[];
  alerts: FarmAlert[];
}

export interface BuildContextOptions {
  /** Nom utilisateur (ex: profile.full_name). Pas d'email. */
  userName?: string;
  /** Date utilisée pour la mention « aujourd'hui ». Default: new Date(). */
  now?: Date;
  /** Limite max truies critiques à afficher (default 6). */
  maxTruies?: number;
  /** Limite max bandes à afficher (default 5). */
  maxBandes?: number;
  /** Limite max alertes (default 8). */
  maxAlerts?: number;
}

const PRIORITY_RANK: Record<AlertPriority, number> = {
  CRITIQUE: 0,
  HAUTE: 1,
  NORMALE: 2,
  INFO: 3,
};

function todayLabelFr(now: Date): string {
  const day = DAYS_FR[now.getDay()] ?? '';
  const iso = now.toISOString().slice(0, 10);
  return `${day} ${iso}`;
}

function formatTruie(t: Truie): string {
  const id = t.displayId || t.id;
  const stade = t.stade?.trim();
  const statut = t.statut?.trim() || '?';
  const stadePart = stade ? `${stade}, ${statut}` : statut;
  return `${id} (${stadePart})`;
}

function formatBande(b: BandePorcelets): string {
  const id = b.id || b.idPortee || '?';
  const truie = b.truie ? `mère ${b.truie}` : '';
  const nv = typeof b.nv === 'number' ? `${b.vivants ?? b.nv} porcelets` : '';
  const sevrage = b.dateSevragePrevue ? `sevrage ${b.dateSevragePrevue}` : '';
  const parts = [b.statut, truie, nv, sevrage].filter(Boolean).join(', ');
  return `${id} (${parts})`;
}

function formatStock(s: StockAliment | StockVeto): string {
  const libelle = 'libelle' in s ? s.libelle : s.produit;
  const stock = s.stockActuel ?? 0;
  const unite = s.unite || '';
  const statut = s.statutStock || (stock <= 0 ? 'RUPTURE' : 'OK');
  return `${libelle} ${stock}${unite} (${statut})`;
}

function formatAlert(a: FarmAlert): string {
  return `${a.priority} ${a.subjectLabel || a.subjectId} — ${a.title}`;
}

/**
 * Sélectionne les truies « critiques » : statuts terrain à surveiller
 * (mise-bas imminente, retour chaleur attendu, pleine hors normes…).
 * Heuristique simple : on trie par statut de criticité décroissante.
 */
function pickCriticalTruies(truies: Truie[], max: number): Truie[] {
  const score = (t: Truie): number => {
    const s = (t.statut || '').toLowerCase();
    if (s.includes('maternit')) return 0;
    if (s.includes('attente saillie')) return 1;
    if (s.includes('surveiller')) return 1;
    if (s.includes('pleine')) return 2;
    return 3;
  };
  return [...truies].sort((a, b) => score(a) - score(b)).slice(0, max);
}

function pickCriticalStocks(
  stocks: ReadonlyArray<StockAliment | StockVeto>,
): Array<StockAliment | StockVeto> {
  return stocks.filter((s) => {
    const statut = (s.statutStock || '').toUpperCase();
    if (statut === 'RUPTURE' || statut === 'BAS') return true;
    return (s.stockActuel ?? 0) <= 0;
  });
}

function pickPriorityAlerts(alerts: FarmAlert[], max: number): FarmAlert[] {
  return [...alerts]
    .sort((a, b) => {
      const pd = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (pd !== 0) return pd;
      // À priorité égale : daysOffset > 0 (en retard) en premier.
      return (b.daysOffset ?? 0) - (a.daysOffset ?? 0);
    })
    .filter((a) => a.priority === 'CRITIQUE' || a.priority === 'HAUTE')
    .slice(0, max);
}

/**
 * Génère un bloc texte dense (~ 30-40 lignes max) à préfixer au message
 * utilisateur. Mistral comprend les sections et y fait référence.
 *
 * Format : texte plat (pas de markdown, pas de JSON) — Mistral-7B ne traite
 * pas mieux le markdown, et le texte brut consomme moins de tokens.
 */
export function buildFarmContextPrompt(
  snapshot: FarmSnapshot,
  options: BuildContextOptions = {},
): string {
  const {
    userName = 'éleveur',
    now = new Date(),
    maxTruies = 6,
    maxBandes = 5,
    maxAlerts = 8,
  } = options;

  const truiesActives = snapshot.truies.filter((t) => {
    const s = (t.statut || '').toLowerCase();
    return !s.includes('réforme') && !s.includes('reforme') && !s.includes('mort');
  });
  const verratsActifs = snapshot.verrats.filter((v) => {
    const s = (v.statut || '').toLowerCase();
    return !s.includes('réforme') && !s.includes('reforme') && !s.includes('mort');
  });
  const bandesActives = snapshot.bandes.filter((b) => (b.statut || '').toUpperCase() !== 'RECAP');

  const totalPorcelets = bandesActives.reduce(
    (acc, b) => acc + (b.vivants ?? b.nv ?? 0),
    0,
  );

  const critTruies = pickCriticalTruies(truiesActives, maxTruies);
  const critBandes = bandesActives.slice(0, maxBandes);
  const stocksCrit = [
    ...pickCriticalStocks(snapshot.stockAliment),
    ...pickCriticalStocks(snapshot.stockVeto),
  ];
  const prioAlerts = pickPriorityAlerts(snapshot.alerts, maxAlerts);

  const lines: string[] = [];
  lines.push('[CONTEXTE FERME — ne pas afficher dans la réponse, utilise-le pour répondre]');
  lines.push(`Date : ${todayLabelFr(now)}. Utilisateur : ${userName}.`);
  lines.push(
    `Ferme : ${snapshot.nomFerme}${snapshot.pays ? ` (${snapshot.pays})` : ''}. ` +
      `Cheptel : ${truiesActives.length} truies actives, ${verratsActifs.length} verrats actifs, ` +
      `${bandesActives.length} bandes en cours, ${totalPorcelets} porcelets sous bandes.`,
  );

  if (critTruies.length > 0) {
    lines.push(`Truies à surveiller : ${critTruies.map(formatTruie).join(' · ')}.`);
  }

  if (critBandes.length > 0) {
    lines.push(`Bandes en cours : ${critBandes.map(formatBande).join(' · ')}.`);
  }

  if (stocksCrit.length > 0) {
    lines.push(`Stocks critiques : ${stocksCrit.map(formatStock).join(' · ')}.`);
  } else {
    lines.push('Stocks : OK (pas de rupture détectée).');
  }

  if (prioAlerts.length > 0) {
    lines.push(`Alertes prioritaires (${prioAlerts.length}) : ${prioAlerts.map(formatAlert).join(' · ')}.`);
  } else {
    lines.push('Alertes : aucune en priorité CRITIQUE/HAUTE.');
  }

  lines.push('[FIN CONTEXTE]');
  return lines.join('\n');
}

/**
 * Helper : préfixe un message utilisateur avec le bloc CONTEXTE FERME.
 * Utilisé par ChatbotWidget juste avant fetch().
 */
export function prefixWithFarmContext(
  userMessage: string,
  snapshot: FarmSnapshot,
  options?: BuildContextOptions,
): string {
  const ctx = buildFarmContextPrompt(snapshot, options);
  return `${ctx}\n\nQuestion utilisateur : ${userMessage}`;
}
