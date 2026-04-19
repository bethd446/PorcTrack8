/**
 * PorcTrack — Contact Support (WhatsApp)
 * ═══════════════════════════════════════
 *
 * Petit service utilitaire pour stocker le numéro WhatsApp du support
 * (configuré par l'admin dans les Réglages) et construire un deep-link
 * `wa.me` qu'on ouvre via `window.open` depuis l'écran Aide.
 *
 * 100% offline-friendly : aucune requête externe, juste un lien universel.
 */

import { kvGet, kvSet } from './kvStore';

const KEY = 'support_whatsapp';

/**
 * Retourne le numéro WhatsApp configuré (format libre, ex: '+33 6 12 34 56 78').
 * Retourne une chaîne vide si non configuré.
 */
export function getSupportWhatsapp(): string {
  return kvGet(KEY) || '';
}

/** Enregistre le numéro WhatsApp. La normalisation est faite à la construction de l'URL. */
export function setSupportWhatsapp(phone: string): void {
  void kvSet(KEY, phone.trim());
}

/**
 * Construit l'URL `wa.me` à partir du numéro stocké.
 * Retourne `null` si aucun numéro n'est configuré.
 *
 * @param message Message pré-rempli optionnel (sera url-encodé).
 */
export function buildWhatsappUrl(message?: string): string | null {
  const phone = getSupportWhatsapp().replace(/[^\d]/g, '');
  if (!phone) return null;
  const url = `https://wa.me/${phone}`;
  return message ? `${url}?text=${encodeURIComponent(message)}` : url;
}
