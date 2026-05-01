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

/**
 * Construit une URL WhatsApp ciblée vers un fournisseur (V21-D1).
 * Si `fournisseur` est fourni, utilise son numéro WhatsApp ; sinon retourne
 * `null` (le fallback grouped/support reste à la charge de l'appelant).
 *
 * Format message : "Bonjour {nom}, j'ai besoin de {produit} {qte} kg pour ma
 * ferme {farm}. Possible quand ?"
 */
export function buildSupplierOrderURL(opts: {
  fournisseur: { nom: string; whatsapp_number: string | null } | null | undefined;
  produit: string;
  qteKg: number;
  farmName?: string;
}): string | null {
  const f = opts.fournisseur;
  if (!f || !f.whatsapp_number) return null;
  const digits = f.whatsapp_number.replace(/\D/g, '');
  if (digits.length < 8) return null;
  const qte = Math.max(0, Math.ceil(opts.qteKg));
  const farmPart = opts.farmName ? ` pour ma ferme ${opts.farmName}` : '';
  const message = `Bonjour ${f.nom}, j'ai besoin de ${opts.produit} ${qte} kg${farmPart}. Possible quand ?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
