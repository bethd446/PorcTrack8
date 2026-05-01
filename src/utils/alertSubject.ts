import type { Truie, Verrat, BandePorcelets } from '../types/farm';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
// Capture un préfixe de classification précédant directement un UUID, ex : "Bande <uuid>".
// On l'utilise pour éviter "Bande Bande XX" lorsque le label remonté contient déjà le mot.
const PREFIXED_UUID_RE =
  /\b(bande|truie|verrat)s?\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

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
  return withoutDoublons.replace(UUID_RE, (uuid) => {
    const friendly = friendlyForUuid(uuid.toLowerCase(), t);
    if (!friendly) return `${uuid.slice(0, 8)}…`;
    return `${KIND_LABEL[friendly.kind]} ${friendly.code}`;
  });
};
