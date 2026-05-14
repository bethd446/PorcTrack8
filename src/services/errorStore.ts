/**
 * PorcTrack — Error Store local (Sprint 15)
 *
 * Stocke les 50 dernières erreurs capturées (ErrorBoundaries + logger.error)
 * dans kvStore (Capacitor Preferences / localStorage fallback).
 * Aucune dépendance externe. Aucun envoi réseau.
 */
import { kvGet, kvSet } from './kvStore';

const STORE_KEY = 'pt:errors';
const MAX_ERRORS = 50;

export interface ErrorRecord {
  id: string;
  timestamp: number;
  scope: string;
  message: string;
  stack?: string;
  url: string;
  userId?: string;
  version: string;
}

function readRecords(): ErrorRecord[] {
  try {
    const raw = kvGet(STORE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ErrorRecord[];
  } catch {
    return [];
  }
}

function writeRecords(records: ErrorRecord[]): void {
  try {
    void kvSet(STORE_KEY, JSON.stringify(records));
  } catch {
    // silencieux — le store est best-effort
  }
}

export function recordError(entry: Omit<ErrorRecord, 'id'>): void {
  const records = readRecords();
  const record: ErrorRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...entry,
  };
  records.push(record);
  // Garde uniquement les MAX_ERRORS plus récentes
  if (records.length > MAX_ERRORS) records.splice(0, records.length - MAX_ERRORS);
  writeRecords(records);
}

export function listErrors(): ErrorRecord[] {
  return readRecords().slice().reverse();
}

export function clearErrors(): void {
  writeRecords([]);
}
