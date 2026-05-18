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

// idPortee techniques générés par MultiPorteeSevrageWizard / quickConfirmMiseBas /
// quickAddBandeFromLoge / OnboardingWizard. Format : B-YYYYMMDD-{suffix}.
// Réécrits en "Bande {Mois AAAA} · {suffix}" pour ne pas exposer la string brute.
const TECH_DATE_RE = /^B-(\d{4})(\d{2})(\d{2})-?(.*)$/;

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
    const techMatch = TECH_DATE_RE.exec(bande.idPortee);
    if (techMatch) {
      const [, y, m, d, suffix] = techMatch;
      const monthYear = formatMonthYear(`${y}-${m}-${d}`);
      if (monthYear) {
        if (!compact && bande.truieMere) {
          return `Bande ${monthYear} · ${bande.truieMere}`;
        }
        return suffix ? `Bande ${monthYear} · ${suffix}` : `Bande ${monthYear}`;
      }
    }
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
