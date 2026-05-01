import type { Truie, Verrat, BandePorcelets } from '../types/farm';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export interface TroupeauLookup {
  bandes: BandePorcelets[];
  truies: Truie[];
  verrats: Verrat[];
}

const labelForUuid = (uuid: string, t: TroupeauLookup): string | null => {
  const bande = t.bandes.find(b => b.id === uuid);
  if (bande) {
    const code = bande.idPortee?.trim();
    return code ? `Bande ${code}` : `Bande ${uuid.slice(0, 8)}`;
  }
  const truie = t.truies.find(s => s.id === uuid);
  if (truie) {
    const code = truie.displayId?.trim();
    return code ? `Truie ${code}` : `Truie ${uuid.slice(0, 8)}`;
  }
  const verrat = t.verrats.find(v => v.id === uuid);
  if (verrat) {
    const code = verrat.displayId?.trim();
    return code ? `Verrat ${code}` : `Verrat ${uuid.slice(0, 8)}`;
  }
  return null;
};

export const resolveAlertSubject = (raw: string, t: TroupeauLookup): string => {
  if (!raw) return raw;
  return raw.replace(UUID_RE, (uuid) => {
    const friendly = labelForUuid(uuid.toLowerCase(), t);
    return friendly ?? `${uuid.slice(0, 8)}…`;
  });
};
