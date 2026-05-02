/**
 * farmDataLoader — singleton d'orchestration des données Supabase pour PorcTrack.
 *
 * Rôle : centraliser les appels vers `services/supabaseService.ts`, conserver le
 * dernier instantané en mémoire, et notifier les Providers abonnés domaine par
 * domaine. Cela permet de splitter `FarmContext` en sous-contextes (Troupeau,
 * Ressources, Pilotage) sans dupliquer la logique de fetch / SWR / alert engine.
 *
 * API :
 *  - `subscribe(domain, listener)` → s'abonner à un slice précis
 *  - `refreshAll()` → relancer un fetch complet
 *  - `processQueueAndRefresh()` → flush la queue offline puis refresh
 *
 * La logique (moteur d'alertes, notifications locales, confirmation queue)
 * est identique — seule la source de données change (Supabase au lieu de GAS).
 */

import {
  getTruies, getVerrats, getBandes, getJournalSante,
  getStockAliments, getStockVeto, getNotesTerrain,
  getSaillies, getFinances,
} from './supabaseService';

// ── Stubs pour fonctions GAS abandonnées (retournent données vides) ──────────
// getAlertesServeur : alertes serveur remplacées par le moteur local (alertEngine)
// getAlimentFormules : formules utilisent la config locale (config/aliments)
// readTypedTable : HISTORIQUE_TRANSITIONS sans équivalent Supabase pour l'instant
async function getAlertesServeur(
  cb?: (data: AlerteServeur[]) => void
): Promise<{ success: boolean; data: AlerteServeur[]; header: string[]; source: DataSource }> {
  cb?.([]);
  return { success: true, data: [], header: [], source: 'NETWORK' };
}
async function getAlimentFormules(
  cb?: (data: FormuleRowSheets[]) => void
): Promise<{ success: boolean; data: FormuleRowSheets[]; header: string[]; source: DataSource }> {
  cb?.([]);
  return { success: true, data: [], header: [], source: 'NETWORK' };
}
async function readTypedTable<T>(
  _table: string,
  _ttl: number,
  cb?: (data: T[]) => void
): Promise<{ success: boolean; data: T[]; header: string[]; source: DataSource }> {
  cb?.([]);
  return { success: true, data: [], header: [], source: 'NETWORK' };
}
import {
  FORMULES_ALIMENT_FALLBACK,
  aggregateFormulesFromRows,
  type FormuleAliment,
} from '../config/aliments';
import { getQueueStatus, processQueue } from './offlineQueue';
import { runAlertEngine, type FarmAlert } from './alertEngine';
import { fetchDismissedAlertIds } from './alertDismissals';
import { supabase } from './supabaseClient';
import { enqueueAlert } from './confirmationQueue';
import { logger } from './logger';
import { scheduleFromAlerts, schedulePeseeReminders } from './notifications';
import { listPeseePending } from './peseePlanifieesService';
import type {
  Truie, Verrat, BandePorcelets, TraitementSante,
  StockAliment, StockVeto, AlerteServeur, Saillie, FinanceEntry,
  FormuleRowSheets, DataSource, SyncStatus, TransitionBande
} from '../types/farm';
import type { Note } from '../types';

// ── Snapshots par domaine ──────────────────────────────────────────────────
export interface TroupeauSnapshot {
  truies: Truie[];
  verrats: Verrat[];
  bandes: BandePorcelets[];
  transitions: TransitionBande[];
  truiesHeader: string[];
  verratsHeader: string[];
  bandesHeader: string[];
}

export interface RessourcesSnapshot {
  sante: TraitementSante[];
  stockAliment: StockAliment[];
  stockVeto: StockVeto[];
  santeHeader: string[];
  stockAlimentHeader: string[];
  stockVetoHeader: string[];
  notes: Note[];
  alimentFormules: FormuleAliment[];
}

export interface PilotageSnapshot {
  alerts: FarmAlert[];
  alertesServeur: AlerteServeur[];
  saillies: Saillie[];
  finances: FinanceEntry[];
}

export interface MetaSnapshot {
  loading: boolean;
  dataSource: DataSource | null;
  syncStatus: SyncStatus;
  lastUpdate: number;
}

type DomainMap = {
  troupeau: TroupeauSnapshot;
  ressources: RessourcesSnapshot;
  pilotage: PilotageSnapshot;
  meta: MetaSnapshot;
};

type Listener<K extends keyof DomainMap> = (snap: DomainMap[K]) => void;

// ── État interne ────────────────────────────────────────────────────────────
const state: DomainMap = {
  troupeau: {
    truies: [], verrats: [], bandes: [], transitions: [],
    truiesHeader: [], verratsHeader: [], bandesHeader: [],
  },
  ressources: {
    sante: [], stockAliment: [], stockVeto: [],
    santeHeader: [], stockAlimentHeader: [], stockVetoHeader: [],
    notes: [],
    alimentFormules: FORMULES_ALIMENT_FALLBACK,
  },
  pilotage: {
    alerts: [], alertesServeur: [], saillies: [], finances: [],
  },
  meta: {
    loading: true, dataSource: null, syncStatus: 'synced', lastUpdate: 0,
  },
};

const listeners: { [K in keyof DomainMap]: Set<Listener<K>> } = {
  troupeau: new Set(),
  ressources: new Set(),
  pilotage: new Set(),
  meta: new Set(),
};

function emit<K extends keyof DomainMap>(domain: K) {
  listeners[domain].forEach(l => l(state[domain]));
}

function patch<K extends keyof DomainMap>(domain: K, next: Partial<DomainMap[K]>) {
  state[domain] = { ...state[domain], ...next } as DomainMap[K];
  emit(domain);
}

// ── API publique ────────────────────────────────────────────────────────────
export function subscribe<K extends keyof DomainMap>(
  domain: K,
  listener: Listener<K>,
): () => void {
  listeners[domain].add(listener);
  // Push immédiat du snapshot courant (évite le flash vide à l'initial mount)
  listener(state[domain]);
  return () => listeners[domain].delete(listener);
}

export function getSnapshot<K extends keyof DomainMap>(domain: K): DomainMap[K] {
  return state[domain];
}

/**
 * Fetch complet (équivalent de l'ancien refreshData). Déclenche les fetchers
 * SWR de `googleSheets.ts` : chaque callback intermédiaire pousse un patch
 * partiel au Provider concerné, puis une mise-à-jour finale synchrone dès que
 * `Promise.allSettled` termine.
 */
export async function refreshAll(): Promise<void> {
  patch('meta', { loading: true });

  try {
    const qStatus = getQueueStatus();
    patch('meta', { syncStatus: qStatus.pending > 0 ? 'pending' : 'synced' });

    const results = await Promise.allSettled([
      getTruies((data, header) => {
        patch('troupeau', {
          truies: data,
          truiesHeader: header.length > 0 ? header : state.troupeau.truiesHeader,
        });
      }),
      getVerrats((data, header) => {
        patch('troupeau', {
          verrats: data,
          verratsHeader: header.length > 0 ? header : state.troupeau.verratsHeader,
        });
      }),
      getBandes((data, header) => {
        patch('troupeau', {
          bandes: data,
          bandesHeader: header.length > 0 ? header : state.troupeau.bandesHeader,
        });
      }),
      readTypedTable<TransitionBande>('HISTORIQUE_TRANSITIONS', 30 * 60 * 1000, (data) => {
        patch('troupeau', { transitions: data });
      }),
      getJournalSante((data, header) => {
        patch('ressources', {
          sante: data,
          santeHeader: header.length > 0 ? header : state.ressources.santeHeader,
        });
      }),
      getStockAliments((data, header) => {
        patch('ressources', {
          stockAliment: data,
          stockAlimentHeader: header.length > 0 ? header : state.ressources.stockAlimentHeader,
        });
      }),
      getStockVeto((data, header) => {
        patch('ressources', {
          stockVeto: data,
          stockVetoHeader: header.length > 0 ? header : state.ressources.stockVetoHeader,
        });
      }),
      getNotesTerrain((data) => patch('ressources', { notes: data })),
      getAlertesServeur((data) => patch('pilotage', { alertesServeur: data })),
      getSaillies((data) => patch('pilotage', { saillies: data })),
      getFinances((data) => patch('pilotage', { finances: data })),
      getAlimentFormules((data) => {
        const aggregated = aggregateFormulesFromRows(data);
        patch('ressources', {
          alimentFormules: aggregated.length > 0 ? aggregated : FORMULES_ALIMENT_FALLBACK,
        });
      }),
    ]);

    const empty = { success: false, data: [] as unknown[], header: [] as string[], source: ('FALL' + 'BACK') as DataSource };
    const [
      truieRes, verratRes, bandeRes, transitionRes,
      santeRes, stockARes, stockVRes, notesRes, alertesServeurRes, sailliesRes, financesRes, formulesRes,
    ] = results.map(r => r.status === 'fulfilled' ? r.value : empty) as [
      { success: boolean; data: Truie[];             header: string[]; source: DataSource },
      { success: boolean; data: Verrat[];            header: string[]; source: DataSource },
      { success: boolean; data: BandePorcelets[];    header: string[]; source: DataSource },
      { success: boolean; data: TransitionBande[];   header: string[]; source: DataSource },
      { success: boolean; data: TraitementSante[];   header: string[]; source: DataSource },
      { success: boolean; data: StockAliment[];      header: string[]; source: DataSource },
      { success: boolean; data: StockVeto[];         header: string[]; source: DataSource },
      { success: boolean; data: Note[];              header: string[]; source: DataSource },
      { success: boolean; data: AlerteServeur[];     header: string[]; source: DataSource },
      { success: boolean; data: Saillie[];           header: string[]; source: DataSource },
      { success: boolean; data: FinanceEntry[];      header: string[]; source: DataSource },
      { success: boolean; data: FormuleRowSheets[];  header: string[]; source: DataSource },
    ];

    // ── Publication synchrone des snapshots finaux ────────────────────────
    patch('meta', { dataSource: truieRes.source, lastUpdate: Date.now() });

    patch('troupeau', {
      truies: truieRes.data,
      verrats: verratRes.data,
      bandes: bandeRes.data,
      transitions: transitionRes.data,
      truiesHeader: truieRes.header.length > 0 ? truieRes.header : state.troupeau.truiesHeader,
      verratsHeader: verratRes.header.length > 0 ? verratRes.header : state.troupeau.verratsHeader,
      bandesHeader: bandeRes.header.length > 0 ? bandeRes.header : state.troupeau.bandesHeader,
    });

    patch('ressources', {
      sante: santeRes.data,
      stockAliment: stockARes.data,
      stockVeto: stockVRes.data,
      santeHeader: santeRes.header.length > 0 ? santeRes.header : state.ressources.santeHeader,
      stockAlimentHeader: stockARes.header.length > 0 ? stockARes.header : state.ressources.stockAlimentHeader,
      stockVetoHeader: stockVRes.header.length > 0 ? stockVRes.header : state.ressources.stockVetoHeader,
      notes: notesRes.data,
    });

    // Alertes serveur / saillies / finances — avec logs d'erreurs explicites
    const alertesServeurFinal =
      results[7].status === 'rejected'
        ? (logger.error('farmDataLoader', 'alertesServeur fetch failed', results[7].reason), [] as AlerteServeur[])
        : alertesServeurRes.data;
    const sailliesFinal =
      results[8].status === 'rejected'
        ? (logger.error('farmDataLoader', 'saillies fetch failed', results[8].reason), [] as Saillie[])
        : sailliesRes.data;
    const financesFinal =
      results[9].status === 'rejected'
        ? (logger.error('farmDataLoader', 'finances fetch failed', results[9].reason), [] as FinanceEntry[])
        : financesRes.data;

    // Formules aliment : fallback local si vide/échec
    const formulesFinal = (() => {
      if (results[10].status === 'rejected') {
        logger.error('farmDataLoader', 'alimentFormules fetch failed', results[10].reason);
        return FORMULES_ALIMENT_FALLBACK;
      }
      const aggregated = aggregateFormulesFromRows(formulesRes.data);
      return aggregated.length > 0 ? aggregated : FORMULES_ALIMENT_FALLBACK;
    })();
    patch('ressources', { alimentFormules: formulesFinal });

    // Moteur d'alertes GTTT — s'exécute après chaque refresh complet
    const rawAlerts = runAlertEngine({
      truies: truieRes.data,
      bandes: bandeRes.data,
      sante: santeRes.data,
      stockAliments: stockARes.data,
      stockVetos: stockVRes.data,
      saillies: sailliesFinal,
      notes: notesRes.data,
    });
    const newAlerts = await applyDismissals(rawAlerts);

    patch('pilotage', {
      alerts: newAlerts,
      alertesServeur: alertesServeurFinal,
      saillies: sailliesFinal,
      finances: financesFinal,
    });

    // Synchro notifs locales natives (R1/R3/R5 critiques/hautes)
    scheduleFromAlerts(newAlerts).catch(e =>
      logger.error('farmDataLoader', 'scheduleFromAlerts failed', e)
    );

    // V25 — Pesées planifiées : notifs date_prévue + rappels J+1/J+3.
    listPeseePending()
      .then(pesees => schedulePeseeReminders(pesees))
      .catch(e =>
        logger.error('farmDataLoader', 'schedulePeseeReminders failed', e)
      );

    // Queue de confirmation pour les alertes demandant une action
    for (const alert of newAlerts.filter(a => a.requiresAction)) {
      const primaryAction = alert.actions.find(a => a.type !== 'DISMISS');
      if (primaryAction) {
        enqueueAlert(alert, primaryAction).catch(e =>
          logger.error('farmDataLoader', 'enqueueAlert failed', e)
        );
      }
    }

  } catch (e) {
    console.error('Initial refresh error:', e);
    patch('meta', { dataSource: 'FALLBACK' });
  } finally {
    patch('meta', { loading: false });
  }
}

/** Flush la queue offline puis relance un refresh. */
export async function processQueueAndRefresh(): Promise<void> {
  await processQueue();
  await refreshAll();
}

/**
 * Relance le moteur d'alertes GTTT sur les données actuellement en mémoire
 * et notifie les abonnés 'pilotage'. Utile pour rafraîchir les compteurs
 * (ex: sevrage en retard qui change à minuit) sans fetch réseau.
 */
export async function recomputeAlerts(): Promise<void> {
  const rawAlerts = runAlertEngine({
    truies: state.troupeau.truies,
    bandes: state.troupeau.bandes,
    sante: state.ressources.sante,
    stockAliments: state.ressources.stockAliment,
    stockVetos: state.ressources.stockVeto,
    saillies: state.pilotage.saillies,
    notes: state.ressources.notes,
  });
  const newAlerts = await applyDismissals(rawAlerts);

  patch('pilotage', { alerts: newAlerts });
}

/**
 * Filtre les alertes ignorées (table `alert_dismissals`). Si l'utilisateur
 * n'est pas connecté ou que le fetch échoue, retourne la liste brute.
 */
async function applyDismissals(alerts: FarmAlert[]): Promise<FarmAlert[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alerts;
    const dismissed = await fetchDismissedAlertIds(user.id);
    if (dismissed.size === 0) return alerts;
    return alerts.filter(a => !dismissed.has(a.id));
  } catch (e) {
    logger.error('farmDataLoader', 'applyDismissals failed', e);
    return alerts;
  }
}

// ── Helpers testables ───────────────────────────────────────────────────────
/**
 * Remet à zéro le singleton — uniquement utilisé dans les tests pour isoler
 * chaque cas. À NE PAS appeler depuis le code applicatif.
 */
export function __resetForTests(): void {
  state.troupeau = {
    truies: [], verrats: [], bandes: [], transitions: [],
    truiesHeader: [], verratsHeader: [], bandesHeader: [],
  };
  state.ressources = {
    sante: [], stockAliment: [], stockVeto: [],
    santeHeader: [], stockAlimentHeader: [], stockVetoHeader: [],
    notes: [],
    alimentFormules: FORMULES_ALIMENT_FALLBACK,
  };
  state.pilotage = { alerts: [], alertesServeur: [], saillies: [], finances: [] };
  state.meta = { loading: true, dataSource: null, syncStatus: 'synced', lastUpdate: 0 };
  (Object.keys(listeners) as Array<keyof DomainMap>).forEach(k => listeners[k].clear());
}
