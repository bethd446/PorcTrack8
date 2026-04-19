import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Truie, Verrat, BandePorcelets, TraitementSante,
  StockAliment, StockVeto, FarmState, AlerteServeur, Saillie, DataSource
} from '../types/farm';
import { Animal, Note } from '../types';
import {
  getTruies, getVerrats, getBandes, getJournalSante,
  getStockAliments, getStockVeto, getNotesTerrain, getAlertesServeur, getSaillies
} from '../services/googleSheets';
import { getQueueStatus, processQueue } from '../services/offlineQueue';
import { runAlertEngine, type FarmAlert } from '../services/alertEngine';
import { enqueueAlert } from '../services/confirmationQueue';
import { logger } from '../services/logger';
import { scheduleFromAlerts } from '../services/notifications';

interface FarmContextType extends FarmState {
  loading: boolean;
  notes: Note[];
  /** Alertes générées par le moteur automatique (GTTT) */
  alerts: FarmAlert[];
  /** Alertes publiées par le backend Sheets (feuille ALERTES_ACTIVES). Coexistent avec `alerts`. */
  alertesServeur: AlerteServeur[];
  /** Saillies actives (feuille SUIVI_REPRODUCTION_ACTUEL). Utilisées par performanceAnalyzer. */
  saillies: Saillie[];
  /** Nombre d'alertes nécessitant une action immédiate */
  criticalAlertCount: number;
  /** Source de la dernière lecture : NETWORK = frais, CACHE = cache valide, FALLBACK = cache expiré (offline) */
  dataSource: 'NETWORK' | 'CACHE' | 'FALLBACK' | null;
  refreshData: (force?: boolean) => Promise<void>;
  // Accès par ID typé
  getTruieById: (id: string) => Truie | undefined;
  getVerratById: (id: string) => Verrat | undefined;
  getBandeById: (id: string) => BandePorcelets | undefined;
  /** Unifie truies + verrats → Animal (utilisé par AnimalDetailView) */
  getAnimalById: (id: string, type: 'TRUIE' | 'VERRAT') => Animal | undefined;
  /** Retourne les soins/traitements d'un animal */
  getHealthForAnimal: (id: string, type: 'TRUIE' | 'VERRAT') => TraitementSante[];
  getHealthForSubject: (id: string, type: string) => TraitementSante[];
  /** Retourne les notes terrain d'un animal */
  getNotesForAnimal: (id: string, type: 'TRUIE' | 'VERRAT') => Note[];
  getNotesForSubject: (id: string, type: string) => TraitementSante[];
  pullData: () => Promise<void>;
  processQueue: () => Promise<void>;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

/** Convertit une Truie vers le type générique Animal */
function truieToAnimal(t: Truie): Animal {
  return {
    id: t.id,
    displayId: t.displayId,
    boucle: t.boucle,
    nom: t.nom || '',
    race: '',
    statut: t.statut,
    type: 'TRUIE',
    ration: t.ration,
    stade: t.stade,
    nbPortees: t.nbPortees,
    derniereNV: t.derniereNV,
    dateMBPrevue: t.dateMBPrevue,
    notes: t.notes,
    raw: t.raw,
  };
}

/** Convertit un Verrat vers le type générique Animal */
function verratToAnimal(v: Verrat): Animal {
  return {
    id: v.id,
    displayId: v.displayId,
    boucle: v.boucle,
    nom: v.nom || '',
    race: '',
    statut: v.statut,
    type: 'VERRAT',
    ration: v.ration,
    origine: v.origine,
    alimentation: v.alimentation,
    notes: v.notes,
    raw: v.raw,
  };
}

export const FarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<FarmState>({
    truies: [],
    verrats: [],
    bandes: [],
    sante: [],
    stockAliment: [],
    stockVeto: [],
    truiesHeader: [],
    verratsHeader: [],
    bandesHeader: [],
    santeHeader: [],
    stockAlimentHeader: [],
    stockVetoHeader: [],
    lastUpdate: 0,
    syncStatus: 'synced'
  });
  const [notes, setNotes] = useState<Note[]>([]);
  const [alerts, setAlerts] = useState<FarmAlert[]>([]);
  const [alertesServeur, setAlertesServeur] = useState<AlerteServeur[]>([]);
  const [saillies, setSaillies] = useState<Saillie[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'NETWORK' | 'CACHE' | 'FALLBACK' | null>(null);

  const refreshData = useCallback(async (_force: boolean = false) => {
    // 1. CHARGEMENT INSTANTANÉ (Cache SWR)
    // On récupère ce qu'on a en local immédiatement
    setLoading(true);

    const updateDataAndHeader = (
      domain: string,
      headerDomain: string,
      data: any[],
      header: string[]
    ) => {
      setState(prev => ({
        ...prev,
        [domain]: data,
        [headerDomain]: header.length > 0 ? header : prev[headerDomain as keyof FarmState],
        lastUpdate: Date.now(),
      }));
    };

    try {
      const qStatus = getQueueStatus();
      setState(prev => ({ ...prev, syncStatus: qStatus.pending > 0 ? 'pending' : 'synced' }));

      // Lecture initiale (retourne le cache si présent, et lance le refresh background)
      const results = await Promise.allSettled([
        getTruies((data, header) => updateDataAndHeader('truies', 'truiesHeader', data, header)),
        getVerrats((data, header) => updateDataAndHeader('verrats', 'verratsHeader', data, header)),
        getBandes((data, header) => updateDataAndHeader('bandes', 'bandesHeader', data, header)),
        getJournalSante((data, header) => updateDataAndHeader('sante', 'santeHeader', data, header)),
        getStockAliments((data, header) => updateDataAndHeader('stockAliment', 'stockAlimentHeader', data, header)),
        getStockVeto((data, header) => updateDataAndHeader('stockVeto', 'stockVetoHeader', data, header)),
        getNotesTerrain((data) => setNotes(data)),
        getAlertesServeur((data) => setAlertesServeur(data)),
        getSaillies((data) => setSaillies(data)),
      ]);

      const empty = { success: false, data: [] as any[], header: [] as string[], source: ('FALL' + 'BACK') as DataSource };
      const [
        truieRes, verratRes, bandeRes,
        santeRes, stockARes, stockVRes, notesRes, alertesServeurRes, sailliesRes
      ] = results.map(r => r.status === 'fulfilled' ? r.value : empty) as [
        { success: boolean; data: Truie[];             header: string[]; source: DataSource },
        { success: boolean; data: Verrat[];            header: string[]; source: DataSource },
        { success: boolean; data: BandePorcelets[];    header: string[]; source: DataSource },
        { success: boolean; data: TraitementSante[];   header: string[]; source: DataSource },
        { success: boolean; data: StockAliment[];      header: string[]; source: DataSource },
        { success: boolean; data: StockVeto[];         header: string[]; source: DataSource },
        { success: boolean; data: Note[];              header: string[]; source: DataSource },
        { success: boolean; data: AlerteServeur[];     header: string[]; source: DataSource },
        { success: boolean; data: Saillie[];           header: string[]; source: DataSource },
      ];

      // Mise à jour synchrone immédiate (depuis cache)
      setDataSource(truieRes.source);
      setState(prev => ({
        ...prev,
        truies: truieRes.data,
        verrats: verratRes.data,
        bandes: bandeRes.data,
        sante: santeRes.data,
        stockAliment: stockARes.data,
        stockVeto: stockVRes.data,
        truiesHeader: truieRes.header.length > 0 ? truieRes.header : prev.truiesHeader,
        verratsHeader: verratRes.header.length > 0 ? verratRes.header : prev.verratsHeader,
        bandesHeader: bandeRes.header.length > 0 ? bandeRes.header : prev.bandesHeader,
        santeHeader: santeRes.header.length > 0 ? santeRes.header : prev.santeHeader,
        stockAlimentHeader: stockARes.header.length > 0 ? stockARes.header : prev.stockAlimentHeader,
        stockVetoHeader: stockVRes.header.length > 0 ? stockVRes.header : prev.stockVetoHeader,
        lastUpdate: Date.now()
      }));
      setNotes(notesRes.data);

      // Alertes serveur (Sheets) : rejet explicite = log + []
      const alertesServeurSettled = results[7];
      if (alertesServeurSettled.status === 'rejected') {
        logger.error('FarmContext', 'alertesServeur fetch failed', alertesServeurSettled.reason);
        setAlertesServeur([]);
      } else {
        setAlertesServeur(alertesServeurRes.data);
      }

      // Saillies (Sheets) : rejet explicite = log + []
      const sailliesSettled = results[8];
      if (sailliesSettled.status === 'rejected') {
        logger.error('FarmContext', 'saillies fetch failed', sailliesSettled.reason);
        setSaillies([]);
      } else {
        setSaillies(sailliesRes.data);
      }

      // ── Moteur d'alertes GTTT ──────────────────────────────────
      // S'exécute après chaque chargement de données
      const newAlerts = runAlertEngine({
        truies: truieRes.data,
        bandes: bandeRes.data,
        sante: santeRes.data,
        stockAliments: stockARes.data,
      });
      setAlerts(newAlerts);

      // Synchronise les notifs locales natives (R1/R3/R5 critiques/hautes)
      scheduleFromAlerts(newAlerts).catch(e =>
        logger.error('FarmContext', 'scheduleFromAlerts failed', e)
      );

      // Enregistrer les alertes nécessitant une action dans la queue de confirmation
      for (const alert of newAlerts.filter(a => a.requiresAction)) {
        const primaryAction = alert.actions.find(a => a.type !== 'DISMISS');
        if (primaryAction) {
          enqueueAlert(alert, primaryAction).catch(e => logger.error('FarmContext', 'enqueueAlert failed', e));
        }
      }

    } catch (e) {
      console.error('Initial refresh error:', e);
      setDataSource('FALLBACK');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Legitimate I/O: initial data fetch (Google Sheets + alert engine)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshData();
  }, [refreshData]);

  // ─── Accesseurs par ID ───────────────────────────────────────
  const getTruieById = (id: string) => state.truies.find(t => t.id === id || t.displayId === id);
  const getVerratById = (id: string) => state.verrats.find(v => v.id === id || v.displayId === id);
  const getBandeById = (id: string) => state.bandes.find(b => b.id === id);

  const getAnimalById = (id: string, type: 'TRUIE' | 'VERRAT'): Animal | undefined => {
    if (type === 'TRUIE') {
      const t = getTruieById(id);
      return t ? truieToAnimal(t) : undefined;
    }
    const v = getVerratById(id);
    return v ? verratToAnimal(v) : undefined;
  };

  const getHealthForSubject = (id: string, type: string) =>
    state.sante.filter(h => h.cibleId === id && h.cibleType.toUpperCase() === type.toUpperCase());

  const getHealthForAnimal = (id: string, type: 'TRUIE' | 'VERRAT') =>
    getHealthForSubject(id, type);

  const getNotesForSubject = (id: string, type: string) =>
    state.sante.filter(h => h.cibleId === id && h.cibleType.toUpperCase() === type.toUpperCase());

  const getNotesForAnimal = (id: string, type: 'TRUIE' | 'VERRAT'): Note[] =>
    notes.filter(n => n.animalId === id && n.animalType === type);

  const pullData = async () => refreshData(true);

  const handleProcessQueue = async () => {
    await processQueue();
    await refreshData();
  };

  const criticalAlertCount = alerts.filter(
    a => a.requiresAction && (a.priority === 'CRITIQUE' || a.priority === 'HAUTE')
  ).length;

  return (
    <FarmContext.Provider value={{
      ...state,
      notes,
      alerts,
      alertesServeur,
      saillies,
      criticalAlertCount,
      loading,
      dataSource,
      refreshData,
      getTruieById,
      getVerratById,
      getBandeById,
      getAnimalById,
      getHealthForAnimal,
      getHealthForSubject,
      getNotesForAnimal,
      getNotesForSubject,
      pullData,
      processQueue: handleProcessQueue,
    }}>
      {children}
    </FarmContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useFarm = () => {
  const context = useContext(FarmContext);
  if (!context) throw new Error('useFarm must be used within FarmProvider');
  return context;
};
