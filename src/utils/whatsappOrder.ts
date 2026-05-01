/**
 * whatsappOrder — deep-link WhatsApp pour commande rapide stocks
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Le numéro de support est stocké via `kvSet('support_whatsapp', ...)` dans
 * SettingsPage. Si non configuré (ou trop court), les builders renvoient
 * `null` → l'UI doit afficher un état désactivé / hint vers Réglages.
 */

import { kvGet } from '../services/kvStore';

export interface OrderItem {
  libelle: string;
  manqueKg: number;
  unite?: string;
}

function getSupportNumber(): string | null {
  const raw = kvGet('support_whatsapp');
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 8) return null;
  return digits;
}

/** True si un numéro de support exploitable est configuré. */
export function hasWhatsAppSupport(): boolean {
  return getSupportNumber() !== null;
}

export function buildWhatsAppOrderURL(
  items: OrderItem[],
  farmName?: string,
): string | null {
  const supportNumber = getSupportNumber();
  if (!supportNumber) return null;
  if (items.length === 0) return null;

  const lines = items.map(
    (i) => `- ${i.libelle} : ${Math.ceil(i.manqueKg)} ${i.unite || 'kg'}`,
  );
  const message = [
    `Bonjour, commande PorcTrack`,
    farmName ? `Ferme : ${farmName}` : null,
    ``,
    `Produits demandés :`,
    ...lines,
    ``,
    `Merci`,
  ]
    .filter(Boolean)
    .join('\n');

  return `https://wa.me/${supportNumber}?text=${encodeURIComponent(message)}`;
}

export function buildSingleItemOrderURL(
  libelle: string,
  manqueKg: number,
  unite?: string,
  farmName?: string,
): string | null {
  return buildWhatsAppOrderURL([{ libelle, manqueKg, unite }], farmName);
}
