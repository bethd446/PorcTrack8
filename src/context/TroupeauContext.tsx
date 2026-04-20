/**
 * TroupeauContext — slice "cheptel" du FarmContext historique.
 *
 * Expose uniquement les données liées aux animaux : truies, verrats, bandes
 * (+ headers) et les accesseurs par ID. Isolé pour éviter les re-renders
 * globaux lorsque d'autres domaines (finances, ressources, alertes) changent.
 *
 * S'abonne à `farmDataLoader` (singleton) pour recevoir uniquement le slice
 * `troupeau`. Le hook `useTroupeau()` est interne — les consommateurs
 * continuent d'utiliser `useFarm()` (façade dans FarmContext.tsx).
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Animal } from '../types';
import type { Truie, Verrat, BandePorcelets } from '../types/farm';
import { subscribe, getSnapshot, type TroupeauSnapshot } from '../services/farmDataLoader';

export interface TroupeauContextType extends TroupeauSnapshot {
  getTruieById: (id: string) => Truie | undefined;
  getVerratById: (id: string) => Verrat | undefined;
  getBandeById: (id: string) => BandePorcelets | undefined;
  getAnimalById: (id: string, type: 'TRUIE' | 'VERRAT') => Animal | undefined;
}

const TroupeauContext = createContext<TroupeauContextType | undefined>(undefined);

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

export const TroupeauProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snap, setSnap] = useState<TroupeauSnapshot>(() => getSnapshot('troupeau'));

  useEffect(() => {
    // `subscribe` pousse le snapshot courant synchroneusement — pas de flash.
    return subscribe('troupeau', setSnap);
  }, []);

  const getTruieById = (id: string) =>
    snap.truies.find(t => t.id === id || t.displayId === id);
  const getVerratById = (id: string) =>
    snap.verrats.find(v => v.id === id || v.displayId === id);
  const getBandeById = (id: string) =>
    snap.bandes.find(b => b.id === id);

  const getAnimalById = (id: string, type: 'TRUIE' | 'VERRAT'): Animal | undefined => {
    if (type === 'TRUIE') {
      const t = getTruieById(id);
      return t ? truieToAnimal(t) : undefined;
    }
    const v = getVerratById(id);
    return v ? verratToAnimal(v) : undefined;
  };

  return (
    <TroupeauContext.Provider value={{
      ...snap,
      getTruieById,
      getVerratById,
      getBandeById,
      getAnimalById,
    }}>
      {children}
    </TroupeauContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTroupeau = (): TroupeauContextType => {
  const ctx = useContext(TroupeauContext);
  if (!ctx) throw new Error('useTroupeau must be used within TroupeauProvider');
  return ctx;
};
