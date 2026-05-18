/**
 * Logique pure (testable) pour QuickAddFournisseurForm.
 * ════════════════════════════════════════════════════════════════════════
 *
 * Deux fonctions exportées :
 *  - validateAddFournisseur(): vérifie les champs et renvoie un payload
 *    typé prêt pour insert Supabase.
 *  - normalizeWhatsAppNumber(): normalise un numéro saisi vers le format
 *    international '+225...' (digits only, fallback null si trop court).
 *
 * Aucune dépendance React. Testable sans jsdom.
 */

export type FournisseurType = 'ALIMENT' | 'PHARMACIE' | 'GENETIQUE' | 'AUTRE';

export const FOURNISSEUR_TYPES: readonly FournisseurType[] = [
  'ALIMENT',
  'PHARMACIE',
  'GENETIQUE',
  'AUTRE',
];

export interface AddFournisseurInput {
  nom: string;
  type: string;
  whatsappNumber: string;
  email: string;
  notes: string;
  isDefault: boolean;
}

export interface AddFournisseurValidation {
  ok: boolean;
  errors: Partial<Record<keyof AddFournisseurInput, string>>;
  /** Payload normalisé prêt pour insertion Supabase si ok = true. */
  payload: {
    nom: string;
    type: FournisseurType | null;
    whatsapp_number: string | null;
    email: string | null;
    notes: string | null;
    is_default: boolean;
  } | null;
}

/**
 * Normalise un numéro WhatsApp vers un format international portable.
 * - Garde uniquement les chiffres et le préfixe '+'.
 * - Préfixe '+' si pas déjà présent et longueur ≥ 8 (couvre indicatifs locaux).
 * - Retourne null si trop court (< 8 digits) ou vide.
 */
export function normalizeWhatsAppNumber(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Conserve un éventuel '+' initial, retire le reste
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8) return null;
  return hasPlus ? `+${digits}` : `+${digits}`;
}

/** Email check minimal — vide accepté (optionnel). */
function isValidEmail(s: string): boolean {
  if (!s) return true;
  // Pattern simple : qq@qq.qq
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export function validateAddFournisseur(
  input: AddFournisseurInput,
): AddFournisseurValidation {
  const errors: AddFournisseurValidation['errors'] = {};

  const nom = input.nom?.trim() ?? '';
  if (!nom) errors.nom = 'Nom obligatoire';
  else if (nom.length > 80) errors.nom = 'Max 80 caractères';

  const typeRaw = (input.type || '').trim().toUpperCase();
  const type = FOURNISSEUR_TYPES.includes(typeRaw as FournisseurType)
    ? (typeRaw as FournisseurType)
    : null;
  if (input.type && !type) errors.type = 'Type invalide';

  const wa = normalizeWhatsAppNumber(input.whatsappNumber);
  if (input.whatsappNumber && !wa) {
    errors.whatsappNumber = 'Numéro trop court (8 chiffres min)';
  }

  const email = (input.email || '').trim();
  if (email && !isValidEmail(email)) errors.email = 'Email invalide';

  if (input.notes && input.notes.length > 500) {
    errors.notes = 'Max 500 caractères';
  }

  const ok = Object.keys(errors).length === 0;
  return {
    ok,
    errors,
    payload: ok
      ? {
          nom,
          type,
          whatsapp_number: wa,
          email: email || null,
          notes: input.notes?.trim() || null,
          is_default: !!input.isDefault,
        }
      : null,
  };
}

/**
 * Construit l'URL WhatsApp pour commander auprès d'un fournisseur.
 * Message contextuel :
 *   "Bonjour {fournisseur_nom}, j'ai besoin de {produit} {qte} kg pour ma
 *   ferme {farm_name}. Possible quand ?"
 *
 * Retourne null si le numéro WhatsApp n'est pas exploitable.
 */
export function buildFournisseurOrderURL(opts: {
  fournisseurNom: string;
  whatsappNumber: string | null | undefined;
  produit: string;
  qteKg: number;
  farmName?: string;
}): string | null {
  const wa = opts.whatsappNumber;
  if (!wa) return null;
  const digits = wa.replace(/\D/g, '');
  if (digits.length < 8) return null;
  const qte = Math.max(0, Math.ceil(opts.qteKg));
  const farm = opts.farmName ? ` pour ma ferme ${opts.farmName}` : '';
  const message = `Bonjour ${opts.fournisseurNom}, j'ai besoin de ${opts.produit} ${qte} kg${farm}. Possible quand ?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
