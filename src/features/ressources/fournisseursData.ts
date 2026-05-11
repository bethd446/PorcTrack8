/**
 * fournisseursData — Données statiques fournisseurs (V78 vague 1)
 * ══════════════════════════════════════════════════════════════════════════
 * Six fournisseurs réalistes Côte d'Ivoire (zone Yamoussoukro / Bouaké /
 * Abidjan). Catégories : ALIMENT, PHARMACIE, GENETIQUE, EQUIPEMENT, AUTRE.
 *
 * Hardcodé pour livraison V78 ; sera migré vers Supabase ultérieurement.
 * Téléphones au format E.164 ; `whatsappPhone` sans + ni espaces pour
 * `https://wa.me/<phone>`.
 */

export type FournisseurCategorie =
  | 'ALIMENT'
  | 'PHARMACIE'
  | 'GENETIQUE'
  | 'EQUIPEMENT'
  | 'AUTRE';

export interface FournisseurCommande {
  /** Date au format YYYY-MM-DD */
  date: string;
  /** Libellé court de la commande */
  libelle: string;
  /** Montant en FCFA */
  montantFcfa: number;
}

export interface FournisseurStatic {
  id: string;
  nom: string;
  categorie: FournisseurCategorie;
  /** 1 à 5 — notation interne */
  note: number;
  ville: string;
  adresse: string;
  /** Numéro affiché, format +225 XX XX XX XX XX */
  telephone: string;
  /** Numéro WhatsApp normalisé (chiffres uniquement, pour wa.me) */
  whatsappPhone: string;
  email: string | null;
  /** Date de dernier contact (YYYY-MM-DD) */
  dernierContact: string;
  notes: string;
  commandes: FournisseurCommande[];
}

export const FOURNISSEURS_STATIC: ReadonlyArray<FournisseurStatic> = [
  {
    id: 'frn-provendier-abidjan',
    nom: 'Provendier Abidjan',
    categorie: 'ALIMENT',
    note: 5,
    ville: 'Abidjan',
    adresse: 'Zone industrielle de Yopougon, rue M12',
    telephone: '+225 07 08 14 22 51',
    whatsappPhone: '2250708142251',
    email: 'commandes@provendier.ci',
    dernierContact: '2026-05-02',
    notes: 'Livraison sous 48 h sur Yamoussoukro. Tarif préférentiel sacs 50 kg.',
    commandes: [
      { date: '2026-05-02', libelle: 'Aliment Lactation · 30 sacs', montantFcfa: 525000 },
      { date: '2026-04-14', libelle: 'Aliment Gestation · 20 sacs', montantFcfa: 320000 },
      { date: '2026-03-22', libelle: 'Aliment Porcelet · 12 sacs', montantFcfa: 264000 },
    ],
  },
  {
    id: 'frn-bobi-aliments',
    nom: 'Bobi Aliments',
    categorie: 'ALIMENT',
    note: 4,
    ville: 'Bouaké',
    adresse: 'Quartier Belleville, route de Dabakala',
    telephone: '+225 07 47 31 88 09',
    whatsappPhone: '2250747318809',
    email: 'bobi.aliments@gmail.com',
    dernierContact: '2026-04-28',
    notes: 'Bon rapport qualité/prix. Stock irrégulier sur formules engraissement.',
    commandes: [
      { date: '2026-04-28', libelle: 'Maïs concassé · 1 tonne', montantFcfa: 215000 },
      { date: '2026-03-15', libelle: 'Tourteau soja · 400 kg', montantFcfa: 180000 },
    ],
  },
  {
    id: 'frn-dr-koffi',
    nom: 'Cabinet Dr Koffi',
    categorie: 'PHARMACIE',
    note: 5,
    ville: 'Yamoussoukro',
    adresse: 'Cabinet vétérinaire Sopim, avenue Houphouët-Boigny',
    telephone: '+225 07 89 22 31 04',
    whatsappPhone: '2250789223104',
    email: 'dr.koffi@veto-ci.com',
    dernierContact: '2026-05-08',
    notes: 'Référent santé troupeau. Disponible weekends pour urgences.',
    commandes: [
      { date: '2026-05-08', libelle: 'Visite mensuelle + vaccins parvo', montantFcfa: 95000 },
      { date: '2026-04-10', libelle: 'Antibio (amoxicilline 5L)', montantFcfa: 48000 },
      { date: '2026-03-05', libelle: 'Ivermectine 1L + suivi écho', montantFcfa: 62000 },
    ],
  },
  {
    id: 'frn-soprodis-genetique',
    nom: 'Soprodis Génétique',
    categorie: 'GENETIQUE',
    note: 4,
    ville: 'Abidjan',
    adresse: 'Zone 4, rue des Jardins · Cocody',
    telephone: '+225 27 22 44 18 67',
    whatsappPhone: '2252722441867',
    email: 'commercial@soprodis-genetique.ci',
    dernierContact: '2026-02-18',
    notes: 'Verrats Large White et Landrace. Insémination livrée à J0.',
    commandes: [
      { date: '2026-02-18', libelle: 'Doses IA · 8 unités', montantFcfa: 124000 },
      { date: '2025-11-04', libelle: 'Verrat Large White × 1', montantFcfa: 380000 },
    ],
  },
  {
    id: 'frn-toli-materiel',
    nom: 'Toli Matériel',
    categorie: 'EQUIPEMENT',
    note: 4,
    ville: 'Yamoussoukro',
    adresse: 'Marché central · allée des fournitures',
    telephone: '+225 05 47 12 09 81',
    whatsappPhone: '2250547120981',
    email: null,
    dernierContact: '2026-04-04',
    notes: 'Mangeoires, abreuvoirs, matériel inox. Devis sur demande.',
    commandes: [
      { date: '2026-04-04', libelle: 'Abreuvoirs PVC × 12', montantFcfa: 72000 },
      { date: '2026-01-19', libelle: 'Mangeoires inox × 6', montantFcfa: 138000 },
    ],
  },
  {
    id: 'frn-pharma-vet-yopougon',
    nom: 'Pharma Vét Yopougon',
    categorie: 'PHARMACIE',
    note: 3,
    ville: 'Abidjan',
    adresse: 'Yopougon Selmer, près de la grande pharmacie',
    telephone: '+225 07 56 78 41 22',
    whatsappPhone: '2250756784122',
    email: 'contact@pharmavet-yopougon.ci',
    dernierContact: '2026-03-29',
    notes: 'Dépannage rapide quand le cabinet Dr Koffi est en rupture.',
    commandes: [
      { date: '2026-03-29', libelle: 'Pénicilline 2L', montantFcfa: 26000 },
    ],
  },
];

const CATEGORIE_LABELS: Record<FournisseurCategorie, string> = {
  ALIMENT: 'Aliment',
  PHARMACIE: 'Vétérinaire',
  GENETIQUE: 'Génétique',
  EQUIPEMENT: 'Équipement',
  AUTRE: 'Autre',
};

export function getCategorieLabel(c: FournisseurCategorie): string {
  return CATEGORIE_LABELS[c];
}

export function findFournisseurById(id: string): FournisseurStatic | null {
  return FOURNISSEURS_STATIC.find((f) => f.id === id) ?? null;
}

/** Total cumulé des commandes (FCFA) pour stats détail */
export function totalCommandesFcfa(f: FournisseurStatic): number {
  return f.commandes.reduce((acc, c) => acc + c.montantFcfa, 0);
}
