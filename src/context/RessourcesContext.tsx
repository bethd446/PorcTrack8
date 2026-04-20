/**
 * RessourcesContext — slice "ressources" du FarmContext historique.
 *
 * Regroupe les données journalières et stocks : journal de santé, stock
 * aliment, stock véto, notes terrain, formules d'aliment. Couvre tout ce qui
 * est consommable / matériel et les traces d'interventions (santé, notes).
 *
 * S'abonne à `farmDataLoader` pour ne recevoir que le slice `ressources`.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Note } from '../types';
import type { TraitementSante } from '../types/farm';
import { subscribe, getSnapshot, type RessourcesSnapshot } from '../services/farmDataLoader';

export interface RessourcesContextType extends RessourcesSnapshot {
  getHealthForAnimal: (id: string, type: 'TRUIE' | 'VERRAT') => TraitementSante[];
  getHealthForSubject: (id: string, type: string) => TraitementSante[];
  getNotesForAnimal: (id: string, type: 'TRUIE' | 'VERRAT') => Note[];
  /**
   * ⚠ Kept identical to legacy behaviour: filters `sante` (not `notes`) by
   * cibleId/cibleType. Conserve la compatibilité avec l'API historique.
   */
  getNotesForSubject: (id: string, type: string) => TraitementSante[];
}

const RessourcesContext = createContext<RessourcesContextType | undefined>(undefined);

export const RessourcesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snap, setSnap] = useState<RessourcesSnapshot>(() => getSnapshot('ressources'));

  useEffect(() => {
    return subscribe('ressources', setSnap);
  }, []);

  const getHealthForSubject = (id: string, type: string): TraitementSante[] =>
    snap.sante.filter(
      h => h.cibleId === id && h.cibleType.toUpperCase() === type.toUpperCase()
    );

  const getHealthForAnimal = (id: string, type: 'TRUIE' | 'VERRAT'): TraitementSante[] =>
    getHealthForSubject(id, type);

  const getNotesForSubject = (id: string, type: string): TraitementSante[] =>
    snap.sante.filter(
      h => h.cibleId === id && h.cibleType.toUpperCase() === type.toUpperCase()
    );

  const getNotesForAnimal = (id: string, type: 'TRUIE' | 'VERRAT'): Note[] =>
    snap.notes.filter(n => n.animalId === id && n.animalType === type);

  return (
    <RessourcesContext.Provider value={{
      ...snap,
      getHealthForAnimal,
      getHealthForSubject,
      getNotesForAnimal,
      getNotesForSubject,
    }}>
      {children}
    </RessourcesContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useRessources = (): RessourcesContextType => {
  const ctx = useContext(RessourcesContext);
  if (!ctx) throw new Error('useRessources must be used within RessourcesProvider');
  return ctx;
};
