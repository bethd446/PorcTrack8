import type { Truie, Verrat, BandePorcelets } from '../types/farm';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
// Capture un préfixe de classification précédant directement un UUID, ex : "Bande <uuid>".
// On l'utilise pour éviter "Bande Bande XX" lorsque le label remonté contient déjà le mot.
const PREFIXED_UUID_RE =
  /\b(bande|truie|verrat)s?\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

// V36-A — Préfixes techniques parasites injectés par les comptes de test
// (ex: `AUDIT-T-001` au lieu de `T-001`). On les retire à l'affichage pour
// présenter un code propre au porcher. Idempotent : ne touche pas les codes
// déjà nettoyés.
const TECH_PREFIX_RE = /\b(AUDIT|TEST|DEMO)-(?=[TVB]-?\d)/gi;

export interface TroupeauLookup {
  bandes: BandePorcelets[];
  truies: Truie[];
  verrats: Verrat[];
}

interface FriendlyLabel {
  kind: 'bande' | 'truie' | 'verrat';
  code: string;
}

const friendlyForUuid = (uuid: string, t: TroupeauLookup): FriendlyLabel | null => {
  const bande = t.bandes.find(b => b.id === uuid);
  if (bande) {
    return { kind: 'bande', code: bande.idPortee?.trim() || uuid.slice(0, 8) };
  }
  const truie = t.truies.find(s => s.id === uuid);
  if (truie) {
    return { kind: 'truie', code: truie.displayId?.trim() || uuid.slice(0, 8) };
  }
  const verrat = t.verrats.find(v => v.id === uuid);
  if (verrat) {
    return { kind: 'verrat', code: verrat.displayId?.trim() || uuid.slice(0, 8) };
  }
  return null;
};

const KIND_LABEL: Record<FriendlyLabel['kind'], string> = {
  bande: 'Bande',
  truie: 'Truie',
  verrat: 'Verrat',
};

export const resolveAlertSubject = (raw: string, t: TroupeauLookup): string => {
  if (!raw) return raw;
  // 1) Pass prioritaire : si "Bande <uuid>" / "Truie <uuid>" / "Verrat <uuid>" apparaît,
  //    on garde le préfixe existant (avec sa casse) et on remplace l'UUID par le code seul.
  const withoutDoublons = raw.replace(PREFIXED_UUID_RE, (_match, prefix: string, uuid: string) => {
    const friendly = friendlyForUuid(uuid.toLowerCase(), t);
    if (!friendly) return `${prefix} ${uuid.slice(0, 8)}…`;
    return `${prefix} ${friendly.code}`;
  });
  // 2) Pass standard : UUID isolés non préfixés → on prefixe avec le kind.
  const withUuidResolved = withoutDoublons.replace(UUID_RE, (uuid) => {
    const friendly = friendlyForUuid(uuid.toLowerCase(), t);
    if (!friendly) return `${uuid.slice(0, 8)}…`;
    return `${KIND_LABEL[friendly.kind]} ${friendly.code}`;
  });
  // 3) Nettoyage des préfixes techniques (AUDIT-/TEST-/DEMO-) injectés par
  //    les comptes de test — affichage `T-001` au lieu de `AUDIT-T-001`.
  return withUuidResolved.replace(TECH_PREFIX_RE, '');
};

/**
 * Vérifie si un alertSubject pointe vers une entité qui n'existe plus dans
 * le troupeau (truie supprimée, bande purgée…). Sert à filtrer ou marquer
 * les alertes orphelines générées avant suppression de la donnée référente.
 *
 * Garde-fou : si la collection référente est vide (contexte non chargé,
 * page en cours d'init), on ne classe RIEN comme orphelin pour éviter de
 * masquer toutes les alertes en boot. Le filtrage s'active dès qu'au moins
 * une entité de la même catégorie existe.
 */
export const isAlertSubjectOrphan = (
  subjectId: string | undefined | null,
  category: string | undefined | null,
  t: TroupeauLookup,
): boolean => {
  if (!subjectId || subjectId === 'GLOBAL') return false;
  const cat = (category ?? '').toUpperCase();
  if (cat === 'STOCK' || cat === 'PLANNING' || cat === 'SANTE') return false;
  if (cat === 'REPRO') {
    if (t.truies.length === 0) return false;
    return !t.truies.some(s => s.id === subjectId || s.displayId === subjectId);
  }
  if (cat === 'BANDES') {
    if (t.bandes.length === 0) return false;
    return !t.bandes.some(b => b.id === subjectId || b.idPortee === subjectId);
  }
  return false;
};
