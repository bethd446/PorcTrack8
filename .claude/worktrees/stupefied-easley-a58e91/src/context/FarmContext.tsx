import React, { createContext, useContext, useState, useEffect } from 'react';
import { Animal, StockItem, Event, Portee, Bande, HealthRecord, Ration } from '../types';
import { INITIAL_ANIMALS, STOCK_ITEMS, INITIAL_BANDES } from '../constants';
import { fetchData, appendRow } from '../services/googleSheets';
import { queuePostAction, flushQueue, getQueueStatus } from '../services/offlineQueue';
import { syncToAppSheet, fetchFromAppSheet } from '../services/appSheet';

interface FarmContextType {
  animals: Animal[];
  stock: StockItem[];
  events: Event[];
  portees: Portee[];
  bandes: Bande[];
  healthRecords: HealthRecord[];
  syncStatus: 'synced' | 'pending' | 'offline';
  lastSyncError: string | null;
  userRole: 'ADMIN' | 'USER';
  setUserRole: (role: 'ADMIN' | 'USER') => void;
  addEvent: (event: Omit<Event, 'id' | 'synced'>) => void;
  updateAnimal: (animal: Animal) => void;
  addHealthRecord: (record: Omit<HealthRecord, 'id'>) => void;
  updateStock: (id: string, delta: number) => void;
  addRation: (ration: Omit<Ration, 'id'>) => void;
  addBande: (bande: Omit<Bande, 'id'>) => void;
  updateBande: (bande: Bande) => void;
  triggerSync: (table: string, action: any, data: any) => Promise<void>;
  pullData: () => Promise<void>;
  showOnboarding: boolean;
  handleOnboardingComplete: () => void;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

export const useFarm = () => {
  const context = useContext(FarmContext);
  if (!context) throw new Error('useFarm must be used within a FarmProvider');
  return context;
};

export const FarmProvider = ({ children }: { children: React.ReactNode }) => {
  const [animals, setAnimals] = useState<Animal[]>(INITIAL_ANIMALS);
  const [stock, setStock] = useState<StockItem[]>(STOCK_ITEMS);
  const [events, setEvents] = useState<Event[]>([]);
  const [portees, setPortees] = useState<Portee[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [bandes, setBandes] = useState<Bande[]>(INITIAL_BANDES);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'offline'>('synced');
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userRole, setUserRoleState] = useState<'ADMIN' | 'USER'>((localStorage.getItem('user_role') as any) || 'USER');

  const setUserRole = (role: 'ADMIN' | 'USER') => {
    setUserRoleState(role);
    localStorage.setItem('user_role', role);
  };

  const pullData = async () => {
    const syncMode = localStorage.getItem('sync_mode') || 'sheets';
    if (syncMode === 'appsheet') {
      setSyncStatus('pending');
      setLastSyncError(null);
      try {
        const [animalsRes, stockRes, bandesRes] = await Promise.all([
          fetchFromAppSheet('CHEPTEL'),
          fetchFromAppSheet('STOCK'),
          fetchFromAppSheet('BANDES')
        ]);
        if (animalsRes.success && animalsRes.data.length > 0) setAnimals(animalsRes.data);
        if (stockRes.success && stockRes.data.length > 0) setStock(stockRes.data);
        if (bandesRes.success && bandesRes.data.length > 0) setBandes(bandesRes.data);
        setSyncStatus('synced');
      } catch (error) {
        console.error("Failed to pull data (AppSheet):", error);
        setSyncStatus('offline');
        setLastSyncError(error instanceof Error ? error.message : 'Erreur de récupération');
      }
    } else {
      setSyncStatus('pending');
      setLastSyncError(null);
      try {
        // IMPORTANT: ton connecteur v5 renvoie un tableau 2D (values), pas des objets.
        // Pour l'instant, on ne remplace pas le modèle local par ces valeurs brutes.
        // On utilisera les appels GAS pour écrire/synchroniser, et on gardera l'état local pour l'UI.
        await fetchData('CHEPTEL');
        setSyncStatus('synced');
      } catch (error) {
        console.error("Failed to pull data (Sheets):", error);
        setSyncStatus('synced');
      }
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('farm_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      setAnimals(parsed.animals || INITIAL_ANIMALS);
      setStock(parsed.stock || STOCK_ITEMS);
      setEvents(parsed.events || []);
      setHealthRecords(parsed.healthRecords || []);
      setBandes(parsed.bandes || INITIAL_BANDES);
    }

    // Initial Pull
    pullData();

    // Auto-update GAS URL if it's the old one
    const oldUrl = 'https://script.google.com/macros/s/AKfycbzZX-hougG7gyPRdGrb8jEYWcasou5ORFPQcy1HnFrqDAVTr-6CbEAKSd0qTRSVzQruTg/exec';
    const newUrl = 'https://script.google.com/macros/s/AKfycbyaSeQ0mGHN8oP5R7UOMXy_-4OMNhtidl-5LDXFDT3GkGfm4pgb216TfybJ-ILgCKv0iw/exec';
    if (localStorage.getItem('gas_url') === oldUrl) {
      localStorage.setItem('gas_url', newUrl);
    }

    // Background Sync every 5 minutes
    const interval = setInterval(pullData, 5 * 60 * 1000);

    // Daily Onboarding Check
    const lastCheck = localStorage.getItem('last_onboarding');
    const today = new Date().toISOString().split('T')[0];
    if (lastCheck !== today) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('last_onboarding', today);
    setShowOnboarding(false);
  };

  useEffect(() => {
    localStorage.setItem('farm_data', JSON.stringify({ animals, stock, events, healthRecords, bandes }));
    
    // Automation: Gestation to Farrowing
    animals.forEach(a => {
      if (a.statut === 'Gestante' && a.dateMBPrevue) {
        const diff = Math.ceil((new Date(a.dateMBPrevue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        if (diff <= 0 && a.statut !== 'Allaitante') {
          console.log(`Automation: Animal ${a.id} is due for farrowing.`);
        }
      }
    });
  }, [animals, stock, events, healthRecords, bandes]);

  const triggerSync = async (table: string, action: any, data: any) => {
    if (userRole === 'ADMIN') {
      console.warn('Action ignorée : Mode Observation (ADMIN) actif.');
      return;
    }

    // Mode offline-first: on queue, puis on tente un flush.
    setSyncStatus('pending');
    setLastSyncError(null);

    const syncMode = localStorage.getItem('sync_mode') || 'sheets';

    try {
      if (syncMode === 'appsheet') {
        // on garde l'existant pour l'instant
        const appSheetAction = action === 'INSERT' ? 'Add' : action === 'UPDATE' ? 'Edit' : 'Delete';
        const res = await syncToAppSheet(table, appSheetAction, data);
        if (res.success) setSyncStatus('synced');
        else {
          setSyncStatus('offline');
          setLastSyncError(res.message || 'Erreur inconnue');
        }
        return;
      }

      // Sheets (Connecteur v5) : on enfile une opération générique.
      // Pour rester simple, on n'implémente que APPEND pour les notes dans cette itération.
      queuePostAction({
        action: 'append_row',
        sheet: table,
        values: Array.isArray(data) ? data : [JSON.stringify(data)],
      });

      // tentative de flush
      const r = await flushQueue(5);
      const q = getQueueStatus();
      if (q.pending === 0) setSyncStatus('synced');
      else setSyncStatus('offline');

      if (r.lastError) setLastSyncError(r.lastError);
    } catch (error) {
      setSyncStatus('offline');
      setLastSyncError(error instanceof Error ? error.message : 'Erreur réseau');
    }
  };

  const addEvent = (event: Omit<Event, 'id' | 'synced'>) => {
    const newEvent: Event = { ...event, id: Math.random().toString(36).substring(2, 11), synced: false };
    setEvents(prev => [newEvent, ...prev]);
    triggerSync('EVENTS', 'INSERT', newEvent);
  };

  const updateAnimal = (updated: Animal) => {
    setAnimals(prev => prev.map(a => a.id === updated.id ? updated : a));
    triggerSync('CHEPTEL', 'UPDATE', updated);
  };

  const addHealthRecord = (record: Omit<HealthRecord, 'id'>) => {
    const newRecord = { ...record, id: Math.random().toString(36).substring(2, 11) };
    setHealthRecords(prev => [newRecord, ...prev]);
    triggerSync('SANTE', 'INSERT', newRecord);
  };

  const updateStock = (id: string, delta: number) => {
    setStock(prev => prev.map(s => s.id === id ? { ...s, quantite: Math.max(0, s.quantite + delta) } : s));
    const item = stock.find(s => s.id === id);
    if (item) triggerSync('STOCK', 'UPDATE', { ...item, quantite: item.quantite + delta });
  };

  const addRation = (ration: Omit<Ration, 'id'>) => {
    triggerSync('ALIMENTATION', 'INSERT', ration);
    updateStock(ration.alimentId, -ration.quantite);
  };

  const addBande = (bande: Omit<Bande, 'id'>) => {
    const newBande = { ...bande, id: `B-${Date.now()}` };
    setBandes(prev => [...prev, newBande]);
    triggerSync('BANDES', 'INSERT', newBande);
  };

  const updateBande = (updated: Bande) => {
    setBandes(prev => prev.map(b => b.id === updated.id ? updated : b));
    triggerSync('BANDES', 'UPDATE', updated);
  };

  return (
    <FarmContext.Provider value={{ 
      animals, stock, events, portees, healthRecords, bandes, syncStatus, lastSyncError,
      userRole, setUserRole,
      addEvent, updateAnimal, addHealthRecord, updateStock, addRation,
      addBande, updateBande, triggerSync, pullData,
      showOnboarding, handleOnboardingComplete
    }}>
      {children}
    </FarmContext.Provider>
  );
};
