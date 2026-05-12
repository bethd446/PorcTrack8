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

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type {
  Truie, Verrat, BandePorcelets, TraitementSante,
  FarmState, AlerteServeur, Saillie, FinanceEntry, TransitionBande,
  FarmRole, FarmMembership,
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
import { fetchFarm } from '../services/settingsService';
import { inferCurrencyFromCountry, type Currency } from '../lib/currency';
import { supabase } from '../services/supabaseClient';
import { setCurrentFarmIdRef } from '../services/supabaseWrites';
import { kvGet, kvSet } from '../services/kvStore';

/** V71-P2 — Clé de persistance Capacitor Preferences pour la ferme courante. */
const CURRENT_FARM_ID_KV_KEY = 'pt:current_farm_id';

/** V71-P2 — Slim shape exposée pour le picker de ferme dans l'UI. */
export interface AvailableFarm {
  id: string;
  name: string;
  role: FarmRole;
}

// ── Shape publique (inchangée par rapport à l'existant + V71-P2) ───────────
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
  nomFerme: string;
  pays: string | null;
  currency: Currency;
  /** V71-P2 — UUID de la ferme actuellement active (null tant que non résolue). */
  currentFarmId: string | null;
  /** V71-P2 — Liste des fermes accessibles à l'utilisateur courant. */
  availableFarms: AvailableFarm[];
  /** V71-P2 — Bascule la ferme courante (vérifie qu'elle ∈ availableFarms). */
  switchFarm: (farmId: string) => void;
  /** v3.4.1 — true si la ferme a au moins un porcelet en vrac (batch_id NULL). */
  hasPorceletsVrac: boolean;
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
  recomputeAlerts: () => Promise<void>;
}

// ── Meta context (loading / dataSource / refreshData / identité ferme) ────
interface MetaContextType {
  loading: boolean;
  dataSource: 'NETWORK' | 'CACHE' | 'FALLBACK' | null;
  syncStatus: FarmState['syncStatus'];
  lastUpdate: number;
  /** Nom affichable de la ferme (nom_ferme ou nom, fallback "Ma ferme"). */
  nomFerme: string;
  /** Pays brut tel que saisi à l'onboarding (peut être null). */
  pays: string | null;
  /** Devise dérivée du pays (FCFA par défaut). */
  currency: Currency;
  /** false tant que fetchFarm n'a pas résolu (skeleton UI possible). */
  identityLoaded: boolean;
  /** V71-P2 — UUID de la ferme courante (initialisé à auth.uid() au login). */
  currentFarmId: string | null;
  /** V71-P2 — Fermes accessibles via farm_members. */
  availableFarms: AvailableFarm[];
  /** V71-P2 — Rôle effectif de l'user dans la ferme courante. */
  currentRole: FarmRole | null;
  /** V71-P2 — Bascule sur une autre ferme (must be in availableFarms). */
  switchFarm: (farmId: string) => void;
  /** v3.4.1 — true si la ferme a au moins un porcelet en vrac (batch_id NULL). */
  hasPorceletsVrac: boolean;
  refreshData: (force?: boolean) => Promise<void>;
  pullData: () => Promise<void>;
  processQueue: () => Promise<void>;
  recomputeAlerts: () => Promise<void>;
}

// V80 — export du context pour permettre aux hooks lookup-direct (sans
// throw hors-provider) d'y accéder en lecture optionnelle, p.ex.
// `useFarmProfile` qui doit tolérer un rendu de composant isolé (tests).
export const MetaContext = createContext<MetaContextType | undefined>(undefined);

interface FarmIdentity {
  nomFerme: string;
  pays: string | null;
  currency: Currency;
  /** false tant que fetchFarm n'a pas résolu — utiliser pour skeleton UI. */
  loaded: boolean;
}

const DEFAULT_FARM_IDENTITY: FarmIdentity = {
  nomFerme: 'Ma ferme',
  pays: null,
  currency: 'FCFA',
  loaded: false,
};

const MetaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [meta, setMeta] = useState(() => getSnapshot('meta'));
  const [identity, setIdentity] = useState<FarmIdentity>(DEFAULT_FARM_IDENTITY);
  // V71-P2 — State multi-ferme.
  const [currentFarmId, setCurrentFarmIdState] = useState<string | null>(null);
  const [availableFarms, setAvailableFarms] = useState<AvailableFarm[]>([]);
  // v3.4.1 — Présence de porcelets en vrac (batch_id NULL) ; gate Wizard reorg.
  const [hasPorceletsVrac, setHasPorceletsVrac] = useState(false);
  // Dépend de la session auth : RLS Supabase filtre via `farm_members`.
  // Sans session, toutes les requêtes reviennent vides — il faut donc attendre
  // que la session soit attachée avant le premier refreshAll().
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    return subscribe('meta', setMeta);
  }, []);

  // V71-P2 — Charge la liste des fermes accessibles + résout currentFarmId.
  // Stratégie de résolution :
  //   1. Lit `pt:current_farm_id` depuis kvStore (persist Capacitor Preferences) ;
  //   2. Si présent ET ∈ availableFarms → utilise ;
  //   3. Sinon → fallback sur auth.uid() (rétro-compat backfill V71-P2).
  //
  // v3.4.8 — useRef guard pour neutraliser les re-runs du useEffect quand
  // `authLoading` toggle pendant le bootstrap (null→loading→resolved peut
  // produire 2-3 firings du useEffect même si `userId` n'a pas changé).
  // Chaque fire relançait le fetch `farm_members` → 1 ERR_ABORTED par fire.
  // Cible session-critique : 19 → ≤2 ERR_ABORTED par session.
  const lastBootstrapUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      lastBootstrapUserIdRef.current = null;
      setCurrentFarmIdState(null);
      setAvailableFarms([]);
      setCurrentFarmIdRef(null);
      return;
    }
    if (lastBootstrapUserIdRef.current === userId) return;
    lastBootstrapUserIdRef.current = userId;
    let cancelled = false;
    void (async () => {
      // Lit les memberships via JOIN farm_members → farms.
      const { data, error } = await supabase
        .from('farm_members')
        .select('farm_id, role, farms(id, name)')
        .eq('user_id', userId);
      if (cancelled) return;
      let farms: AvailableFarm[] = [];
      if (!error && Array.isArray(data)) {
        farms = (data as Array<{
          farm_id: string;
          role: string;
          farms: { id: string; name: string } | { id: string; name: string }[] | null;
        }>)
          .map((r) => {
            // Supabase renvoie soit un objet (FK 1-1) soit un tableau selon les
            // versions du schema cache. On normalise dans les deux cas.
            const f = Array.isArray(r.farms) ? r.farms[0] : r.farms;
            const id = f?.id ?? r.farm_id;
            const name = f?.name?.trim() || 'Ma ferme';
            const role = (r.role === 'OWNER' || r.role === 'ADMIN' || r.role === 'PORCHER')
              ? (r.role as FarmRole)
              : 'PORCHER';
            return { id, name, role };
          })
          .filter((f) => !!f.id);
      }
      setAvailableFarms(farms);

      // Résout currentFarmId : kvStore → si valide, sinon auth.uid().
      const stored = kvGet(CURRENT_FARM_ID_KV_KEY);
      const validStored = stored && farms.some((f) => f.id === stored) ? stored : null;
      const nextId = validStored ?? userId;
      setCurrentFarmIdState(nextId);
      setCurrentFarmIdRef(nextId);
    })().catch(() => {
      // Silent : RLS / offline. On retombe sur auth.uid().
      if (cancelled) return;
      setAvailableFarms([]);
      setCurrentFarmIdState(userId);
      setCurrentFarmIdRef(userId);
    });
    return () => {
      cancelled = true;
    };
  }, [authLoading, userId]);

  // Fetch initial : on attend que l'auth ait fini son boot ET qu'une session
  // soit présente. Re-déclenché si l'utilisateur change (logout/login) ou si
  // currentFarmId change (switch de ferme).
  useEffect(() => {
    if (authLoading) return;
    if (!userId || !currentFarmId) {
      setIdentity(DEFAULT_FARM_IDENTITY);
      return;
    }
    // Legitimate I/O: initial data fetch (Supabase + alert engine)
    void refreshAll();
    // Charge l'identité ferme (nom_ferme, pays) → devise.
    let cancelled = false;
    void fetchFarm(currentFarmId)
      .then((f) => {
        if (cancelled || !f) {
          // Pas de farm row trouvée mais fetch ok : on marque loaded pour
          // débloquer l'UI (sinon skeleton infini).
          if (!cancelled) setIdentity((prev) => ({ ...prev, loaded: true }));
          return;
        }
        const next: FarmIdentity = {
          nomFerme: f.nomFerme?.trim() || f.nom?.trim() || 'Ma ferme',
          pays: f.pays,
          currency: inferCurrencyFromCountry(f.pays),
          loaded: true,
        };
        setIdentity(next);
        if (typeof document !== 'undefined') {
          document.title = `PorcTrack · ${next.nomFerme}`;
        }
      })
      .catch(() => {
        /* silent : offline / RLS — débloque quand même l'UI. */
        if (!cancelled) setIdentity((prev) => ({ ...prev, loaded: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, userId, currentFarmId]);

  useEffect(() => {
    const onOnline = (): void => {
      void processQueueAndRefresh().catch(() => {
        /* silent : retry possible via /sync */
      });
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  // v3.4.1 — Check porcelets en vrac une seule fois par farm_id. Avant ce
  // patch, le gate <PorceletsReorgGate> refaisait un HEAD count à chaque
  // navigation (24 req/session). On centralise ici (1 req par farm_id).
  // v3.4.2 — useRef guard pour neutraliser :
  //   (a) StrictMode double-fire (mount→unmount→mount = 2 invocations)
  //   (b) transitions currentFarmId pendant bootstrap (null→cached→supabase)
  // v3.4.3 — Remplace `cancelled` flag par AbortController : le flag annulait
  // juste le setState mais le request HTTP restait en flight et finissait
  // ERR_ABORTED quand le browser le cancellait sur navigation rapide
  // (~8 ERR_ABORTED résiduels en audit). Avec abort.signal passé à supabase,
  // l'annulation est silencieuse côté reporting browser.
  const lastFetchedFarmIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentFarmId) {
      setHasPorceletsVrac(false);
      lastFetchedFarmIdRef.current = null;
      return;
    }
    if (lastFetchedFarmIdRef.current === currentFarmId) return;
    lastFetchedFarmIdRef.current = currentFarmId;
    const controller = new AbortController();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (supabase as any)
      .from('porcelets_individuels')
      .select('id', { count: 'exact', head: true })
      .eq('farm_id', currentFarmId)
      .is('batch_id', null)
      .abortSignal(controller.signal)
      .then(({ count, error }: { count: number | null; error: unknown }) => {
        if (controller.signal.aborted || error) return;
        setHasPorceletsVrac((count ?? 0) > 0);
      });
    return () => {
      controller.abort();
    };
  }, [currentFarmId]);

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

  // V71-P2 — Bascule de ferme. Vérifie l'appartenance, persiste, met à jour
  // la ref globale lue par supabaseWrites.getFarmId().
  const switchFarm = useCallback((farmId: string) => {
    if (!farmId) return;
    if (!availableFarms.some((f) => f.id === farmId)) return;
    setCurrentFarmIdState(farmId);
    setCurrentFarmIdRef(farmId);
    void kvSet(CURRENT_FARM_ID_KV_KEY, farmId);
  }, [availableFarms]);

  // V71-P2 — Rôle dérivé : lookup dans availableFarms par currentFarmId.
  const currentRole: FarmRole | null = currentFarmId
    ? availableFarms.find((f) => f.id === currentFarmId)?.role ?? null
    : null;

  return (
    <MetaContext.Provider value={{
      loading: meta.loading,
      dataSource: meta.dataSource,
      syncStatus: meta.syncStatus,
      lastUpdate: meta.lastUpdate,
      nomFerme: identity.nomFerme,
      pays: identity.pays,
      currency: identity.currency,
      identityLoaded: identity.loaded,
      currentFarmId,
      availableFarms,
      currentRole,
      switchFarm,
      hasPorceletsVrac,
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
    nomFerme: meta.nomFerme,
    pays: meta.pays,
    currency: meta.currency,
    // V71-P2 — Multi-user
    currentFarmId: meta.currentFarmId,
    availableFarms: meta.availableFarms,
    switchFarm: meta.switchFarm,
    // v3.4.1 — Gate porcelets en vrac
    hasPorceletsVrac: meta.hasPorceletsVrac,
    refreshData: meta.refreshData,
    pullData: meta.pullData,
    processQueue: meta.processQueue,
    recomputeAlerts: meta.recomputeAlerts,
  };
};

// V71-P2 — Re-export du type membership pour les consommateurs UI.
export type { FarmMembership };

// Les consommateurs souhaitant un accès ciblé doivent importer directement
// depuis ./TroupeauContext, ./RessourcesContext ou ./PilotageContext.
