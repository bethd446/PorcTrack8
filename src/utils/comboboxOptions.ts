import type { Truie, Verrat, BandePorcelets } from '../types/farm';
import type { ComboboxOption } from '../components/ui/combobox';

export function truiesToComboboxOptions(truies: Truie[]): ComboboxOption[] {
  return truies.map((t) => ({
    value: t.id,
    label: `Truie ${t.displayId ?? t.id}`,
    hint: t.nom ?? t.race ?? t.boucle ?? undefined,
  }));
}

export function verratsToComboboxOptions(verrats: Verrat[]): ComboboxOption[] {
  return verrats.map((v) => ({
    value: v.id,
    label: `Verrat ${v.displayId ?? v.id}`,
    hint: v.nom ?? v.origine ?? v.boucle ?? undefined,
  }));
}

export function bandesToComboboxOptions(bandes: BandePorcelets[]): ComboboxOption[] {
  return bandes.map((b) => ({
    value: b.id,
    label: `Bande ${b.idPortee ?? b.id.slice(0, 8)}`,
    hint: b.statut ?? undefined,
  }));
}
