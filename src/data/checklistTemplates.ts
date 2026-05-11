/**
 * checklistTemplates — V21-6 C4
 *
 * Templates de tournée par phase métier. Chaque template = liste d'items
 * Q/R simples ; `critical=true` = question bloquante santé/bien-être.
 *
 * Consommé par `ChecklistFlow.tsx` (sélecteur de tournée au démarrage).
 */
import { Baby, Heart, Sunrise, Tag, type LucideIcon } from 'lucide-react';

export type ChecklistTemplateKey =
  | 'GENERAL'
  | 'MISE_BAS'
  | 'SEVRAGE'
  | 'SORTIE_VENTE';

export interface ChecklistTemplateItem {
  id: string;
  label: string;
  critical?: boolean;
}

export const CHECKLIST_TEMPLATES: Record<ChecklistTemplateKey, ChecklistTemplateItem[]> = {
  GENERAL: [
    { id: 'eau', label: 'Eau disponible et propre dans tous les abreuvoirs ?', critical: true },
    { id: 'aliment', label: 'Aliments disponibles dans les mangeoires ?', critical: true },
    { id: 'comportement', label: 'Comportement des animaux normal (pas de léthargie ou stress) ?', critical: false },
  ],
  MISE_BAS: [
    { id: 'mise_bas_imminente', label: 'Truies en attente J+115 vérifiées ?' },
    { id: 'porcelets_naissance_secs', label: 'Porcelets nés-jour secs et chaleur OK ?' },
    { id: 'fer_j3', label: 'Fer J3 administré ?' },
    { id: 'colostrum_pris', label: 'Colostrum pris (toutes les portées vues téter) ?' },
    { id: 'mortalite_porcelets', label: 'Mortalité allaitement constatée ?' },
  ],
  SEVRAGE: [
    { id: 'pesee_avant_sevrage', label: 'Pesée des porcelets avant sevrage ?' },
    { id: 'separation_truie', label: 'Séparation truie/porcelets effectuée proprement ?' },
    { id: 'transfert_loge', label: 'Transfert vers loge post-sevrage OK ?' },
    { id: 'aliment_demarrage', label: 'Aliment démarrage disponible ?' },
    { id: 'truie_libere_loge', label: 'Truie libérée → loge attente saillie' },
  ],
  SORTIE_VENTE: [
    { id: 'pesee_finale', label: 'Pesée finale effectuée pour les ≥110 kg ?' },
    { id: 'tri_par_poids', label: 'Tri par poids fait ?' },
    { id: 'transport_organise', label: 'Transport organisé (camion/abattoir confirmé) ?' },
    { id: 'documents', label: 'Documents sanitaires + facturation prêts ?' },
    { id: 'paiement_recu', label: 'Paiement reçu ou planifié ?' },
  ],
};

export interface ChecklistTemplateMeta {
  key: ChecklistTemplateKey;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const CHECKLIST_TEMPLATES_META: ChecklistTemplateMeta[] = [
  { key: 'GENERAL', label: 'Tournée générale', icon: Sunrise, description: 'Eau, aliment, comportement' },
  { key: 'MISE_BAS', label: 'Tournée mise-bas', icon: Heart, description: 'Truies prêtes / porcelets' },
  { key: 'SEVRAGE', label: 'Tournée sevrage', icon: Baby, description: 'Porcelets J28' },
  { key: 'SORTIE_VENTE', label: 'Tournée sortie/vente', icon: Tag, description: 'Engraissement' },
];

/**
 * Concatène les 4 templates dans l'ordre métier (général → mise-bas → sevrage
 * → sortie). Utilisé par le mode "Tout combiné".
 */
export function getCombinedTemplate(): ChecklistTemplateItem[] {
  return [
    ...CHECKLIST_TEMPLATES.GENERAL,
    ...CHECKLIST_TEMPLATES.MISE_BAS,
    ...CHECKLIST_TEMPLATES.SEVRAGE,
    ...CHECKLIST_TEMPLATES.SORTIE_VENTE,
  ];
}
