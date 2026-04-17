import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Truie, Verrat, BandePorcelets, TraitementSante,
  StockAliment, StockVeto, FarmState, SyncStatus
} from '../types/farm';
import { Animal, Note } from '../types';
import {
  getTruies, getVerrats, getBandes, getJournalSante,
  getStockAliments, getStockVeto, getNotesTerrain
} from '../services/googleSheets';
import { getQueueStatus, processQueue } from '../services/offlineQueue';
import { runAlertEngine, type FarmAlert } from '../services/alertEngine';
import { enqueueAlert } from '../services/confirmationQueue';

interface FarmContextType extends FarmState {
  loading: boolean;
  notes: Note[];
  /** Alertes générées par le moteur automatique (GTTT) */
  alerts: FarmAlert[];
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
    race: t.race || '',
    statut: t.statut,
    type: 'TRUIE',
    ration: t.ration,
    emplacement: t.emplacement,
    stade: t.stade,
    nbPortees: t.nbPortees,
    dateDerniereMB: t.dateDerniereMB,
    dateMBPrevue: t.dateMBPrevue,
    nvMoyen: t.nvMoyen,
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
    race: v.race || '',
    statut: v.statut,
    type: 'VERRAT',
    ration: v.ration,
    dateNaissance: v.dateNaissance,
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
    lastUpdate: 0,
    syncStatus: 'synced'
  });
  const [notes, setNotes] = useState<Note[]>([]);
  const [alerts, setAlerts] = useState<FarmAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'NETWORK' | 'CACHE' | 'FALLBACK' | null>(null);

  const refreshData = useCallback(async (_force: boolean = false) => {
    // 1. CHARGEMENT INSTANTANÉ (Cache SWR)
    // On récupère ce qu'on a en local immédiatement
    setLoading(true);

    const updateState = (domain: string, data: any[]) => {
      setState(prev => ({ ...prev, [domain]: data, lastUpdate: Date.now() }));
    };

    try {
      const qStatus = getQueueStatus();
      setState(prev => ({ ...prev, syncStatus: qStatus.pending > 0 ? 'pending' : 'synced' }));

      // Lecture initiale (retourne le cache si présent, et lance le refresh background)
      const results = await Promise.allSettled([
        getTruies((data) => updateState('truies', data)),
        getVerrats((data) => updateState('verrats', data)),
        getBandes((data) => updateState('bandes', data)),
        getJournalSante((data) => updateState('sante', data)),
        getStockAliments((data) => updateState('stockAliment', data)),
        getStockVeto((data) => updateState('stockVeto', data)),
        getNotesTerrain((data) => setNotes(data)),
      ]);

      const fallback = { success: false, data: [] as any[], source: 'FALLBACK' as const };
      const [
        truieRes, verratRes, bandeRes,
        santeRes, stockARes, stockVRes, notesRes
      ] = results.map(r => r.status === 'fulfilled' ? r.value : fallback) as [
        { success: boolean; data: Truie[];             source: string },
        { success: boolean; data: Verrat[];            source: string },
        { success: boolean; data: BandePorcelets[];    source: string },
        { success: boolean; data: TraitementSante[];   source: string },
        { success: boolean; data: StockAliment[];      source: string },
        { success: boolean; data: StockVeto[];         source: string },
        { success: boolean; data: any[];               source: string },
      ];

      // Mise à jour synchrone immédiate (depuis CACHE ou FALLBACK)
      setDataSource(truieRes.source);
      setState(prev => ({
        ...prev,
        truies: truieRes.data,
        verrats: verratRes.data,
        bandes: bandeRes.data,
        sante: santeRes.data,
        stockAliment: stockARes.data,
        stockVeto: stockVRes.data,
        lastUpdate: Date.now()
      }));
      setNotes(notesRes.data);

      // ── Moteur d'alertes GTTT ──────────────────────────────────
      // S'exécute après chaque chargement de données
      const newAlerts = runAlertEngine({
        truies: truieRes.data,
        bandes: bandeRes.data,
        sante: santeRes.data,
        stockAliments: stockARes.data,
      });
      setAlerts(newAlerts);

      // Enregistrer les alertes nécessitant une action dans la queue de confirmation
      for (const alert of newAlerts.filter(a => a.requiresAction)) {
        const primaryAction = alert.actions.find(a => a.type !== 'DISMISS');
        if (primaryAction) {
          enqueueAlert(alert, primaryAction).catch(() => {}); // silencieux
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

export const useFarm = () => {
  const context = useContext(FarmContext);
  if (!context) throw new Error('useFarm must be used within FarmProvider');
  return context;
};
