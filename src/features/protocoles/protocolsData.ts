/**
 * V77 — Données protocoles santé/biosécurité (hardcodées pour livraison rapide).
 *
 * Source: mockups Claude Design protocoles-hub.html + protocole-detail.html.
 * Refactor futur: charger depuis backend (Supabase ou JSON statique).
 */

export type ProtocolCategory =
  | 'vaccins'
  | 'traitements'
  | 'deparasitage'
  | 'biosecurite'
  | 'reproduction'
  | 'urgences';

export interface ProtocolPosology {
  age: string;
  dose: string;
  voie: string;
  delai: string;
}

export interface ProtocolStep {
  title: string;
  description: string;
}

export interface ProtocolDetail {
  id: string;
  category: ProtocolCategory;
  /** Court titre dans les cards-link (UPPERCASE mono). */
  title: string;
  /** Sous-titre sur la card hub (cible · voie · délai). */
  subtitle: string;
  /** Badge optionnel (ex: "Révision conseillée"). */
  badge?: string;
  /** Eyebrow header détail (ex: "Vaccination", "Traitement"). */
  eyebrow: string;
  /** Sous-titre détail header (ex: "Pneumonie enzootique · Porcelets"). */
  detailSub: string;
  /** Indication thérapeutique (alert info). */
  indication: string;
  /** Tableau posologie. */
  posology: ProtocolPosology[];
  /** Étapes timeline. */
  steps: ProtocolStep[];
  /** Contre-indication (alert danger). */
  contreIndication?: string;
}

export const PROTOCOLS: ProtocolDetail[] = [
  {
    id: 'vaccin-mycoplasma-j35',
    category: 'vaccins',
    title: 'Vaccin Mycoplasma J35',
    subtitle: 'Porcelets · Voie IM · Délai 0j',
    eyebrow: 'Vaccination',
    detailSub: 'Pneumonie enzootique · Porcelets',
    indication:
      "Prévention de la pneumonie enzootique chez les porcelets en post-sevrage. Réduit la toux et améliore le GMQ de 30 à 80 g/jour.",
    posology: [
      { age: 'J35', dose: '2 mL', voie: 'IM', delai: '0 j' },
      { age: 'Rappel J63', dose: '2 mL', voie: 'IM', delai: '0 j' },
    ],
    steps: [
      {
        title: 'Préparer le matériel',
        description:
          'Sortir le flacon du frigo 30 minutes avant. Vérifier la date de péremption. Préparer seringues 2 mL et aiguilles 18G × 25mm neuves.',
      },
      {
        title: 'Contention du porcelet',
        description:
          "Saisir le porcelet par les pattes arrière, le maintenir tête en bas contre le bras. Demander de l'aide si plus de 8 kg.",
      },
      {
        title: 'Injection intramusculaire',
        description:
          "Site : encolure, 3-4 doigts derrière l'oreille. Aiguille perpendiculaire à la peau, profondeur 25mm. Injecter en 2 secondes.",
      },
      {
        title: 'Marquage temporaire',
        description:
          "Marquer le porcelet vacciné au spray rouge sur le dos. Saisir dans l'app : tranche d'âge, lot, opérateur.",
      },
    ],
    contreIndication:
      'Ne pas vacciner un porcelet fébrile (>40°C) ni en cas de stress thermique extrême.',
  },
  {
    id: 'vaccin-parvo-j60',
    category: 'vaccins',
    title: 'Vaccin Parvo J60',
    subtitle: 'Cochettes · Avant 1ère saillie · Voie IM',
    eyebrow: 'Vaccination',
    detailSub: 'Parvovirose · Cochettes',
    indication:
      'Prévention de la parvovirose porcine (mortalité embryonnaire et momifications). Indispensable avant la 1ère saillie.',
    posology: [
      { age: 'J60', dose: '2 mL', voie: 'IM', delai: '0 j' },
      { age: 'Rappel +3 sem', dose: '2 mL', voie: 'IM', delai: '0 j' },
    ],
    steps: [
      {
        title: 'Sortir le vaccin',
        description: 'Réchauffer 30 min à température ambiante. Agiter doucement.',
      },
      {
        title: 'Contention de la cochette',
        description: 'Box étroit ou licol nasal. Désinfecter site injection.',
      },
      {
        title: 'Injection IM encolure',
        description: 'Aiguille 18G × 40mm. Injecter 2 mL en 2 secondes.',
      },
      {
        title: 'Enregistrer dans le journal',
        description: 'Numéro lot, date, identifiant cochette, opérateur.',
      },
    ],
    contreIndication: 'Ne pas vacciner une truie déjà saillie.',
  },
  {
    id: 'vaccin-aujeszky-j90',
    category: 'vaccins',
    title: 'Vaccin Aujeszky J90',
    subtitle: 'Truies · Trimestriel · Voie IM',
    badge: 'Révision conseillée',
    eyebrow: 'Vaccination',
    detailSub: 'Maladie d’Aujeszky · Truies',
    indication:
      'Vaccin trimestriel obligatoire en zones réglementées. Prévient avortements et mortalité néonatale par herpèsvirus suidé.',
    posology: [
      { age: 'Tous les 90 j', dose: '2 mL', voie: 'IM', delai: '0 j' },
    ],
    steps: [
      {
        title: 'Vérifier le calendrier',
        description: 'Toutes les truies doivent recevoir un rappel tous les 90 jours.',
      },
      {
        title: 'Contention en couloir',
        description: "Bloquer la truie au couloir, immobiliser la tête contre l'épaule.",
      },
      {
        title: 'Injection encolure droite',
        description: 'Aiguille 18G × 40mm. Injecter en 3 secondes.',
      },
      {
        title: 'Marquage et enregistrement',
        description: 'Spray vert sur le dos. Saisir lot, date, opérateur.',
      },
    ],
  },
  {
    id: 'antibio-ecoli-j3',
    category: 'traitements',
    title: 'Antibio E.coli porcelets',
    subtitle: 'J3 à J5 post-naissance · 3 jours',
    eyebrow: 'Traitement',
    detailSub: 'Diarrhée néonatale · Porcelets J3-J5',
    indication:
      "Traitement préventif/curatif de la diarrhée néonatale à E.coli. À démarrer dès apparition des premiers symptômes (selles aqueuses).",
    posology: [
      { age: 'J3 à J5', dose: '0,5 mL', voie: 'PO', delai: '21 j' },
    ],
    steps: [
      {
        title: 'Identifier les porcelets atteints',
        description: 'Rechercher les selles jaunâtres / aqueuses, déshydratation, apathie.',
      },
      {
        title: 'Préparer la dose',
        description: 'Seringue orale 1 mL graduée. Bien agiter le flacon.',
      },
      {
        title: 'Administration orale',
        description: 'Insérer la seringue dans le coin de la bouche, injecter lentement.',
      },
      {
        title: 'Réhydratation',
        description: 'Compléter avec sachet de réhydratation orale dans l’eau de boisson de la portée.',
      },
    ],
    contreIndication: 'Respecter le délai d’attente viande de 21 jours.',
  },
  {
    id: 'antiparasitaire-ivermectine',
    category: 'deparasitage',
    title: 'Antiparasitaire Ivermectine',
    subtitle: 'Truies · J85 gestation · 1 dose',
    eyebrow: 'Déparasitage',
    detailSub: 'Endo + ectoparasites · Truies gestantes',
    indication:
      "Élimination des parasites internes (ascaris, strongles) et externes (gale, poux) avant l'entrée en maternité. Réduit la pression parasitaire transmise aux porcelets.",
    posology: [
      { age: 'J85 gestation', dose: '1 mL / 33 kg', voie: 'SC', delai: '28 j' },
    ],
    steps: [
      {
        title: 'Peser ou estimer la truie',
        description: 'Adapter la dose : 1 mL pour 33 kg de poids vif.',
      },
      {
        title: 'Préparation de la seringue',
        description: 'Aiguille 16G × 30mm pour injection sous-cutanée.',
      },
      {
        title: 'Injection sous-cutanée encolure',
        description: 'Pincer la peau, insérer en biais, injecter doucement.',
      },
      {
        title: 'Surveillance 24h',
        description: 'Pas d’effet secondaire attendu. Saisir dans le journal santé.',
      },
    ],
    contreIndication: 'Délai d’attente viande 28 jours. Ne pas utiliser pendant la lactation.',
  },
  {
    id: 'pediluve-entree',
    category: 'biosecurite',
    title: 'Pédiluve entrée porcherie',
    subtitle: 'Quotidien · Crésyl 2% renouvelé 7j',
    eyebrow: 'Biosécurité',
    detailSub: 'Pédiluve d’entrée · Quotidien',
    indication:
      "Désinfection obligatoire des bottes à l'entrée de chaque bâtiment. Première barrière contre la peste porcine et autres pathogènes.",
    posology: [
      { age: 'Quotidien', dose: 'Crésyl 2%', voie: 'Trempage', delai: '—' },
    ],
    steps: [
      {
        title: 'Vidanger le pédiluve',
        description: 'Tous les 7 jours minimum (plus souvent en saison des pluies).',
      },
      {
        title: 'Nettoyer le bac',
        description: 'Brosse + eau savonneuse pour retirer les souillures.',
      },
      {
        title: 'Préparer la solution Crésyl 2%',
        description: '20 mL de Crésyl pour 1 L d’eau. Brasser pour homogénéiser.',
      },
      {
        title: 'Remplir et tester',
        description: 'Niveau 5 cm minimum. Tremper les bottes 10 secondes à chaque passage.',
      },
    ],
  },
  {
    id: 'quarantaine-entree',
    category: 'biosecurite',
    title: 'Quarantaine entrée animaux',
    subtitle: '21 jours minimum · Lot isolé',
    eyebrow: 'Biosécurité',
    detailSub: 'Quarantaine · Nouveaux animaux',
    indication:
      "Tout animal nouvellement introduit doit rester 21 jours en zone tampon isolée avant intégration au troupeau, pour observer l'absence de pathologies.",
    posology: [
      { age: '21 jours', dose: 'Surveillance quotidienne', voie: '—', delai: '—' },
    ],
    steps: [
      {
        title: 'Isoler en zone tampon',
        description: "Bâtiment dédié, sans contact avec le troupeau principal.",
      },
      {
        title: 'Observation quotidienne',
        description: 'Température, appétit, comportement, selles. Noter tout signe anormal.',
      },
      {
        title: 'Vérification sérologique J0 et J21',
        description: 'Prise de sang pour dépistage PPA, Aujeszky, parvovirose si vétérinaire dispo.',
      },
      {
        title: 'Levée de quarantaine',
        description: 'Si aucun signe à J21, intégrer progressivement au troupeau.',
      },
    ],
  },
];

export function getProtocolById(id: string): ProtocolDetail | undefined {
  return PROTOCOLS.find((p) => p.id === id);
}
