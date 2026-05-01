/**
 * FarmContext — FAÇADE unifiée du state de l'exploitation.
 *
 * Historique : ce contexte gérait à lui seul 6 domaines (troupeau, santé,
 * ressources, finances, alertes, meta) dans un `useState` unique — ce qui
 * causait des re-renders globaux dès qu'un sous-domaine changeait.
 *
 * Refonte (Chantier 4) : le state est désormais split en 3 sous-contextes
 * spécialisés :
 *  - `TroupeauContext`    : truies / verrats / bandes
 *  - `RessourcesContext`  : sante / stocks / notes / formules aliment
 *  - `PilotageContext`    : alertes locales / serveur, saillies, finances
 *
 * Ce fichier est MAINTENANT une façade : le Provider orchestre les trois
 * sous-providers + la meta (loading, dataSource, refreshData) et
 * `useFarm()` compose les trois slices en un objet UNIQUE, identique à
 * l'API publique pré-refonte.
 *
 * Contrat :
 *  - `useFarm()` retourne EXACTEMENT la même shape qu'avant
 *  - les tests qui mockent `FarmContext` (via `vi.mock('../context/FarmContext')`)
 *    continuent de fonctionner sans modification
 *  - App.tsx n'a pas été modifié : `<FarmProvider>` reste l'unique wrapper
 *
 * Pour la suite : les consommateurs peuvent progressivement migrer vers
 * `useTroupeau()` / `useRessources()` / `usePilotage()` pour n'abonner qu'au
 * slice nécessaire et éliminer les re-renders croisés.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type {
  Truie, Verrat, BandePorcelets, TraitementSante,
  FarmState, AlerteServeur, Saillie, FinanceEntry, TransitionBande,
} from '../types/farm';
import type { Animal, Note } from '../types';
import type { FormuleAliment } from '../config/aliments';
import type { FarmAlert } from '../services/alertEngine';

import {
  refreshAll,
  processQueueAndRefresh,
  recomputeAlerts,
  subscribe,
  getSnapshot,
} from '../services/farmDataLoader';
import { TroupeauProvider, useTroupeau } from './TroupeauContext';
import { RessourcesProvider, useRessources } from './RessourcesContext';
import { PilotageProvider, usePilotage } from './PilotageContext';
import { useAuth } from './AuthContext';

// ── Shape publique (inchangée par rapport à l'existant) ────────────────────
interface FarmContextType extends FarmState {
  loading: boolean;
  notes: Note[];
  alerts: FarmAlert[];
  alertesServeur: AlerteServeur[];
  saillies: Saillie[];
  finances: FinanceEntry[];
  transitions: TransitionBande[];
  alimentFormules: FormuleAliment[];
  criticalAlertCount: number;
  dataSource: 'NETWORK' | 'CACHE' | 'FALLBACK' | null;
  refreshData: (force?: boolean) => Promise<void>;
  getTruieById: (id: string) => Truie | undefined;
  getVerratById: (id: string) => Verrat | undefined;
  getBandeById: (id: string) => BandePorcelets | undefined;
  getAnimalById: (id: string, type: 'TRUIE' | 'VERRAT') => Animal | undefined;
  getHealthForAnimal: (id: string, type: 'TRUIE' | 'VERRAT') => TraitementSante[];
  getHealthForSubject: (id: string, type: string) => TraitementSante[];
  getNotesForAnimal: (id: string, type: 'TRUIE' | 'VERRAT') => Note[];
  getNotesForSubject: (id: string, type: string) => TraitementSante[];
  pullData: () => Promise<void>;
  processQueue: () => Promise<void>;
  recomputeAlerts: () => void;
}

// ── Meta context (loading / dataSource / refreshData) ──────────────────────
interface MetaContextType {
  loading: boolean;
  dataSource: 'NETWORK' | 'CACHE' | 'FALLBACK' | null;
  syncStatus: FarmState['syncStatus'];
  lastUpdate: number;
  refreshData: (force?: boolean) => Promise<void>;
  pullData: () => Promise<void>;
  processQueue: () => Promise<void>;
  recomputeAlerts: () => void;
}

const MetaContext = createContext<MetaContextType | undefined>(undefined);

const MetaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [meta, setMeta] = useState(() => getSnapshot('meta'));
  // Dépend de la session auth : RLS Supabase filtre par auth.uid() = farm_id.
  // Sans session, toutes les requêtes reviennent vides — il faut donc attendre
  // que la session soit attachée avant le premier refreshAll().
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    return subscribe('meta', setMeta);
  }, []);

  // Fetch initial : on attend que l'auth ait fini son boot ET qu'une session
  // soit présente. Re-déclenché si l'utilisateur change (logout/login).
  useEffect(() => {
    if (authLoading) return;
    if (!userId) return;
    // Legitimate I/O: initial data fetch (Supabase + alert engine)
    void refreshAll();
  }, [authLoading, userId]);

  useEffect(() => {
    const onOnline = (): void => {
      void processQueueAndRefresh().catch(() => {
        /* silent : retry possible via /sync */
      });
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  const refreshData = useCallback(async (force: boolean = false) => {
    if (force) {
      await processQueueAndRefresh();
    } else {
      await refreshAll();
    }
  }, []);

  const pullData = useCallback(async () => {
    await refreshAll();
  }, []);

  const processQueue = useCallback(async () => {
    await processQueueAndRefresh();
  }, []);

  return (
    <MetaContext.Provider value={{
      loading: meta.loading,
      dataSource: meta.dataSource,
      syncStatus: meta.syncStatus,
      lastUpdate: meta.lastUpdate,
      refreshData,
      pullData,
      processQueue,
      recomputeAlerts,
    }}>
      {children}
    </MetaContext.Provider>
  );
};

export function useMeta(): MetaContextType {
  const ctx = useContext(MetaContext);
  if (!ctx) throw new Error('useMeta must be used within MetaProvider');
  return ctx;
}

// ── FarmProvider (façade) ──────────────────────────────────────────────────
/**
 * Ordre de wrapping : Meta (= orchestre les fetch) puis les 3 slices. L'ordre
 * des 3 slices est sans importance fonctionnelle (pas de dépendance croisée).
 */
export const FarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MetaProvider>
    <TroupeauProvider>
      <RessourcesProvider>
        <PilotageProvider>
          {children}
        </PilotageProvider>
      </RessourcesProvider>
    </TroupeauProvider>
  </MetaProvider>
);

/**
 * Façade : compose les 4 sous-contextes en un objet unique, identique à la
 * shape historique. Les consommateurs existants (Cockpit, TroupeauHub, etc.)
 * continuent d'utiliser `useFarm()` sans modification.
 *
 * Les tests qui font `vi.mock('../context/FarmContext', () => ({ useFarm: ... }))`
 * écrasent simplement cette fonction — les sous-contextes ne sont jamais
 * consultés dans ce cas.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useFarm = (): FarmContextType => {
  const troupeau = useTroupeau();
  const ressources = useRessources();
  const pilotage = usePilotage();
  const meta = useMeta();

  return {
    // Troupeau
    truies: troupeau.truies,
    verrats: troupeau.verrats,
    bandes: troupeau.bandes,
    transitions: troupeau.transitions,
    truiesHeader: troupeau.truiesHeader,
    verratsHeader: troupeau.verratsHeader,
    bandesHeader: troupeau.bandesHeader,
    getTruieById: troupeau.getTruieById,
    getVerratById: troupeau.getVerratById,
    getBandeById: troupeau.getBandeById,
    getAnimalById: troupeau.getAnimalById,

    // Ressources
    sante: ressources.sante,
    stockAliment: ressources.stockAliment,
    stockVeto: ressources.stockVeto,
    santeHeader: ressources.santeHeader,
    stockAlimentHeader: ressources.stockAlimentHeader,
    stockVetoHeader: ressources.stockVetoHeader,
    notes: ressources.notes,
    alimentFormules: ressources.alimentFormules,
    getHealthForAnimal: ressources.getHealthForAnimal,
    getHealthForSubject: ressources.getHealthForSubject,
    getNotesForAnimal: ressources.getNotesForAnimal,
    getNotesForSubject: ressources.getNotesForSubject,

    // Pilotage
    alerts: pilotage.alerts,
    alertesServeur: pilotage.alertesServeur,
    saillies: pilotage.saillies,
    finances: pilotage.finances,
    criticalAlertCount: pilotage.criticalAlertCount,

    // Meta
    loading: meta.loading,
    dataSource: meta.dataSource,
    syncStatus: meta.syncStatus,
    lastUpdate: meta.lastUpdate,
    refreshData: meta.refreshData,
    pullData: meta.pullData,
    processQueue: meta.processQueue,
    recomputeAlerts: meta.recomputeAlerts,
  };
};

// Les consommateurs souhaitant un accès ciblé doivent importer directement
// depuis ./TroupeauContext, ./RessourcesContext ou ./PilotageContext.
