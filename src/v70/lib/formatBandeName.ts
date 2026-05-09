export type BandeForName = {
  id: string;
  idPortee?: string | null;
  truieMere?: string | null;
  dateMB?: string | null;
};

export type FormatBandeOptions = {
  compact?: boolean;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FR_MONTHS = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatMonthYear(iso: string): string | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return capitalize(FR_MONTHS.format(d));
}

export function formatBandeName(
  bande: BandeForName,
  options?: FormatBandeOptions,
): string {
  const compact = options?.compact ?? false;

  if (bande.idPortee && !UUID_RE.test(bande.idPortee)) {
    return `Bande ${bande.idPortee}`;
  }

  if (bande.dateMB) {
    const monthYear = formatMonthYear(bande.dateMB);
    if (monthYear) {
      if (!compact && bande.truieMere) {
        return `Bande ${monthYear} · ${bande.truieMere}`;
      }
      return `Bande ${monthYear}`;
    }
  }

  if (bande.truieMere) {
    return `Bande ${bande.truieMere} · en cours`;
  }

  return `Bande ${bande.id.slice(0, 8)}`;
}
