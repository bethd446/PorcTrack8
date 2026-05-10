# Prompt Claude Design 3a — Ressources + Reproduction

> Suite au timeout SSE du prompt précédent (39k tokens, livrable trop long).
> Ce prompt 3a couvre uniquement **9 écrans** (Ressources détail + Reproduction).
> Le prompt 3b (Onboarding / Modals / Marius / patterns transverses) viendra après.
>
> **Pièces attachées obligatoires** :
> 1. `elevage-mockup-v76.html`
> 2. `reglages-pilotage-mockup-v76.html`

---

## Le contexte

Tu as déjà livré 2 mockups exemplaires (Élevage v76 + Réglages-Pilotage v76). Le 3ème prompt complet a timeout (livrable trop volumineux). On le scinde donc.

Ce **prompt 3a** ne couvre que **2 groupes** : Ressources détail (5 écrans) + Reproduction (4 sous-tabs). C'est la suite naturelle des 2 mockups précédents — même DNA, même persona, mêmes patterns.

## Persona — inchangé

Yao (38, éleveur Yamoussoukro) + Aïssa (technicienne coopérative Bouaké). Mobile Android Chrome 4G, 6h matin, terrain.

## DNA — verrouillé

Reprendre **exactement** :
- Tous les tokens `--pt-*` des 2 mockups précédents
- Les 3 fonts (Big Shoulders / Instrument Sans / JetBrains Mono)
- Les patterns établis : `card-link`, `priority-line`, `score-billboard`, `alert-card`, `ph--primary`, `id-strip`, `cycle__rail` (5 nœuds), `kpis grid`, Pills 7 variants, EntityAvatar 5 espèces, Section, PageHeader avec onBack, BottomNav 5 tabs Lucide, FAB
- Anti-AI feel : pas d'emojis dans titres, pas de gradient text, pas de glassmorphism, pas de hero metric SaaS, pas de cards icône+titre+soustitre clonées

Si tu hésites entre une nouvelle approche et un pattern existant, **garde le pattern existant**.

## Scope — 9 écrans

### Groupe A — Ressources détail (5 écrans)

Sous-pages atteignables depuis le hub Ressources mocké en A.4 du mockup `reglages-pilotage-mockup-v76.html`. Toutes ont breadcrumb `Réglages › Ressources › X` + bouton retour ChevronLeft.

#### A.1 — Aliments — `/reglages/ressources/aliments`
Eyebrow `STOCKS · ALIMENTS`, h1 `Aliments`, sub `Stock matières premières + sacs prêts`. **KPIs (4)** : Total kg en stock / Stock OK count / Stock bas count / Rupture count. **Tabs** : Sacs prêts / Matières premières (avec aria-label `Sacs prêts · 12`). **Liste items 3-niveaux** : icône Wheat + nom mono + sub `dernière entrée 12/04 · 850 kg restants` + pill `OK`/`Bas`/`Rupture` selon seuil. **FAB** "Nouvelle entrée" pattern primary `--pt-primary` fond + cream texte.

Exemples données : `Aliment lactation Sipra · 240 kg · entré 04/05 · pill warning Bas`, `Aliment gestation · 1820 kg · OK`, `Maïs grain · 480 kg · OK`.

#### A.2 — Pharmacie / Vétérinaire — `/reglages/ressources/pharmacie`
Eyebrow `STOCKS · VÉTÉRINAIRE`, h1 `Pharmacie`, sub `Vaccins, antibiotiques, vermifuges`. **KPIs (4)** : Total produits / Vaccins en cours / Antibio stock / Rupture. **Tabs** : Vaccins / Antibiotiques / Vermifuges / Autres. **Liste items** : icône Stethoscope + nom DCI mono + sub `lot AB12 · péremption 09/2026 · stock 24`. **Pill** `OK`/`Bas`/`Périmé bientôt` (warning ambre)/`Rupture` (danger). **FAB** "Nouveau produit".

Exemples : `Ivermectine 1% · lot IVM-228 · pér. 11/2026 · stock 8 · OK`, `Vaccin parvo+ery · pér. 06/2026 · pill warning`, `Vermifuge · stock 0 · pill danger Rupture`.

#### A.3 — Formules d'aliment — `/reglages/ressources/formules`
Eyebrow `STOCKS · FORMULES`, h1 `Formules d'aliment`, sub `Recettes par phase de cycle`. **Liste de cards-formule** (pas card-link standard, pattern dédié) :
- Header : nom formule (ex `Lactation premium`) + pill phase ciblée (`Maternité`)
- Composition (5-6 lignes) : matière première + % (mono tabular-nums) — ex `Maïs grain · 38%`, `Tourteau soja · 18%`, `Son de blé · 22%`, `CMV lactation · 4%`...
- Footer : coût/kg estimé en mono (`245 FCFA/kg`) + bouton "Modifier"

CTA en bas : "Nouvelle formule" pattern card-link.

Exemples 4 formules : Lactation premium (245 FCFA/kg) / Gestation standard (185 FCFA/kg) / Post-sevrage starter (310 FCFA/kg) / Engraissement (165 FCFA/kg).

#### A.4 — Plan d'alimentation — `/reglages/ressources/aliments/plan`
Eyebrow `STOCKS · PLAN`, h1 `Plan d'alimentation`, sub `Phase × formule × ration`. **Vue tabulaire ou grid responsive** :

```
PHASE              FORMULE                  RATION /j        STATUT
Maternité          Lactation premium        6.0 kg          ✓ Active
Gestation          Gestation standard       2.4 kg          ✓ Active
Post-sevrage       Post-sevrage starter     0.8 kg          ✓ Active
Croissance         Engraissement            1.6 kg          ✓ Active
Engraissement      Engraissement            2.4 kg          ✓ Active
Finition           Engraissement            3.1 kg          ✓ Active
```

Header table en mono uppercase 9.5px letter-spacing 0.12em color subtle. Pattern DataTable du système. **Bouton primary "Calculer besoins mensuels"** qui ouvre un sheet avec projection consommation 30j sur le troupeau actuel (50 truies × 11 maternité × 6 kg + 28 gestation × 2.4 kg + ...). Section sous-totaux en mono.

#### A.5 — Fournisseurs — `/reglages/ressources/fournisseurs`
Eyebrow `STOCKS · FOURNISSEURS`, h1 `Fournisseurs`, sub `Aliments, vétérinaire, génétique, matériel`. **Filtres chips** en haut : Tous / Aliment / Véto / Génétique / Matériel. **Pattern card-link adapté** :
- Icône Building2 (carrée 40px)
- Titre nom fournisseur mono
- Sub : `Aliment · Yamoussoukro · +225 27 30 64 …`
- Chevron

CTA bas "Nouveau fournisseur" pattern card-link.

Exemples 5 fournisseurs : `Sipra Yamoussoukro` (aliment) / `Cabinet vét. Dr Koffi` (véto) / `INERA Bouaké` (génétique) / `Atelier méca Yao` (matériel) / `Coop. avicole Daloa` (matériel).

### Groupe B — Reproduction (4 sous-tabs)

`/reproduction` est l'un des 5 onglets BottomNav. Déjà V70 propre côté code, à harmoniser avec le DNA renouvelé v76. **Pas de bouton retour** (écran-racine BottomNav). Eyebrow `CYCLE VIVANT`, h1 `Reproduction`, sub `Saillie → écho J28 → mise-bas J115 → sevrage J143`.

**Sous-tabs visibles sur les 4** : Agenda / En cours / À venir / Historique (avec deeplink `?tab=...`).

**KPIs strip** persistant en haut sous le PageHeader sur les 4 sous-tabs : Pleines (28) / Maternité (11) / Vides (6) / MB 7j (0).

#### B.1 — Reproduction · Agenda — `?tab=agenda` (default)

**EduCard "Le saviez-vous ?"** avec icône Lightbulb (déjà présent V70, à styler v76). Phrase éducative cycle gestation 115j.

**Mini cycle viewer** : pour la prochaine MB imminente (T-026, J-2), réutilise le pattern `cycle__rail` du mockup Élevage (5 nœuds Saillie / Écho / MB / En cours / Sevrage avec curseur ambre sur position courante). Header section : eyebrow `PROCHAINE MISE-BAS · T-026`.

**Section "7 prochains jours"** : timeline verticale avec items dated (J+1 12 mai, J+3 14 mai, J+5 16 mai). Chaque item = priority-line variant info (icône CalendarDays + titre `MB T-026` ou `Écho J28 T-019` + sub mono date + verrat/loge).

**Card-link "Comprendre les cycles"** → encyclopédie. Icône BookOpen.

#### B.2 — Reproduction · En cours — `?tab=en-cours`

Liste cycles actifs (3 cycles). Chaque cycle = **card horizontal** (réutilise pattern card-link étendu) :
- Avatar bande (vert céleri 40px)
- Main : titre nom bande mono (`Mai 2026 · T-016`) + sub statut + jour de cycle (`Sous mère · J7 lactation`)
- Mini cycle rail compact (3-5 nœuds, hauteur 24px) intégré dans la card
- Chevron

**Filtre chips** par phase au-dessus : Saillie / Gestation / Maternité / Post-sevrage. Bouton "Toutes" actif par défaut.

#### B.3 — Reproduction · À venir — `?tab=a-venir`

Liste actions planifiées 30 jours, regroupées par type. Pattern `priority-line` :
- **Saillies à faire** (3 truies vides J+5 post sevrage) — icône Heart, variant warm
- **Échos à programmer** (2 truies J28 post saillie) — icône Activity, variant info
- **MB attendues** (4 truies J115) — icône Baby, variant warm
- **Sevrages** (2 bandes J143) — icône ArrowLeftRight, variant info

Délai en sub mono (`dans 3j · 13 mai`).

#### B.4 — Reproduction · Historique — `?tab=historique`

Liste bandes passées (sevrées + sorties). 

**Mode standard mobile** : cards stackées (1 par bande), avec eyebrow année (`2025 · Q4`), titre nom bande, KPIs en grid 4-cols (Truie / NV / NS sevrés / ISSE finale).

**Mode avancé** (toggle dans Réglages activé) : DataTable HTML avec colonnes Bande / Truie / MB / Sevrage / NV / NS / ISSE. Tri par colonne, filtre par année. CTA export CSV.

**Filtre par année** chips en haut : 2026 / 2025 / 2024 / Tout.

Section "Stats globales" en haut au-dessus de la liste : 4 mini-KPIs (Bandes terminées · 18, NV moyen · 12.1, ISSE moyen carrière · 11.4, Mortalité moyenne · 8.2%).

## Données réelles à intégrer

```
ALIMENTS (extraits)
Aliment lactation Sipra · 240 kg · entré 04/05 · seuil 500 kg · pill Bas
Aliment gestation Sipra · 1820 kg · OK · 8.4 j d'autonomie
Maïs grain local · 480 kg · OK
Son de blé · 0 kg · Rupture · pill danger
Tourteau soja · 240 kg · OK
CMV lactation · 28 kg · Bas

VÉTÉRINAIRE (extraits)
Ivermectine 1% inj · lot IVM-228 · péremption 11/2026 · stock 8 fl · OK
Vaccin parvo+ery · lot PAR-04 · pér. 06/2026 · stock 22 doses · OK (pér. proche)
Amoxicilline 15% LA · pér. 03/2027 · stock 4 fl · Bas
Vermifuge oral · stock 0 · Rupture
Fer dextran porcelet · stock 18 fl · OK

CYCLES EN COURS
Mai 2026 · T-016 · Sous mère J7 · 10 NV
26-T1-01 · T-001 · Sevrage J28 · 11 NS
B-AUDIT-MB · T-031 · Lactation J34 · 11 NV

À VENIR (30 j)
T-013 · Saillie attendue · J+5 post sevrage · 12 mai
T-019 · Écho J28 · 11 mai
T-026 · MB attendue · 12 mai
T-022 · MB attendue · 13 mai
26-T16-01 · Sevrage prévu · 24 mai

HISTORIQUE 2025 (5 bandes terminées)
2025-Q4 / 25-T2-04 · T-002 · MB 12/10 · Sevrage 09/11 · NV 13 · NS 11 · ISSE 11.0
2025-Q4 / 25-T7-03 · T-007 · MB 24/10 · Sevrage 21/11 · NV 12 · NS 12 · ISSE 12.0
…
```

## Format livrable

**1 fichier HTML standalone** : `ressources-reproduction-mockup-v76.html`. Tous les écrans dans le même fichier, séparés par sections, navigables par ancres en haut.

```html
<body>
  <nav>menu d'ancres</nav>
  <!-- A. Ressources détail -->
  <section id="ressources-aliments">…</section>
  <section id="ressources-pharmacie">…</section>
  <section id="ressources-formules">…</section>
  <section id="ressources-plan">…</section>
  <section id="ressources-fournisseurs">…</section>
  <!-- B. Reproduction -->
  <section id="repro-agenda">…</section>
  <section id="repro-en-cours">…</section>
  <section id="repro-a-venir">…</section>
  <section id="repro-historique">…</section>
</body>
```

## Critères d'acceptance

1. ✅ Cohérence 100% avec mockups précédents (mêmes tokens, fonts, eyebrows, patterns)
2. ✅ Aucun emoji, gradient text, glassmorphism, copy SaaS
3. ✅ Aucune couleur hors palette
4. ✅ Tabular-nums sur tous les chiffres
5. ✅ Eyebrows uppercase mono 0.14em
6. ✅ Données réelles (Sipra, Yamoussoukro, FCFA, codes T-XXX, etc.)
7. ✅ Bouton retour ChevronLeft + breadcrumb sur les 5 sous-pages Ressources
8. ✅ Pas de bouton retour sur les 4 onglets Repro (écran-racine BottomNav)
9. ✅ Mini cycle rail réutilisable dans Repro Agenda et Repro En cours

## Décisions design attendues (3 minimum)

Tranche, explique, livre. Suggestions :
- **Pharmacie** : tabs (Vaccins/Antibio/Vermifuges) ou liste plate avec chips filtres ?
- **Plan d'alimentation** : DataTable verticale ou grid horizontal phase × formule ?
- **Reproduction En cours** : mini cycle rail dans la card, ou seulement en cliquant pour expansion ?
- **Historique mode avancé** : DataTable HTML traditionnelle ou cards stackées avec en-têtes flottants ?

## Effort dev attendu

Estimation jours dev React/Ionic Capacitor pour porter ce mockup, top 3 priorités, 2 zones d'hésitation détaillées (alternative écartée).

---

**Sortie attendue : ~2200-2500 lignes HTML, équivalent au mockup Élevage v76**. Reste sous 30k tokens output pour éviter le timeout SSE.
