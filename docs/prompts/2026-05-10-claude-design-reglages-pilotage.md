# Prompt Claude Design 2 — Refonte Réglages + Pilotage PorcTrack 8

> Copie ce prompt entier dans Claude Design (claude.ai). Joins en pièce attachée :
> 1. Le précédent livrable `elevage-mockup-v76.html` (DNA établi, à respecter à 100%)
> 2. Optionnel : `~/Downloads/v70-mockup.html` (DNA de base) et les 2 docs vision V70-VISION-STRATEGIQUE.md / REPONSE-A-ORCHESTRATEUR-V70.md

---

## Le contexte

Tu as déjà livré **`elevage-mockup-v76.html`** (10 écrans Élevage + system + notes) — j'en suis très satisfait. Tes 3 décisions design (header fiche `--pt-primary` opaque, lignes liste 3 niveaux, cycle vivant en rail 5 nœuds) sont la nouvelle référence. Le DNA Terrain Vivant est verrouillé.

**Mission de ce prompt** : produire un **2ème mockup HTML standalone** qui couvre les 2 autres rubriques visibles depuis la BottomNav, dans la **continuité absolue** du mockup Élevage. Cohérence cross-rubriques exigée — un éleveur qui passe d'Élevage à Réglages doit sentir qu'il est dans la même app, sans rupture.

## Persona inchangé

Yao, 38 ans, éleveur seul à Yamoussoukro, 50 truies, ouvre PorcTrack à 6h du matin sur son Android. Mêmes contraintes (4G, mobile, terrain). Pour Réglages, ajoute aussi : **Aïssa, 27 ans, technicienne d'élevage** d'une coopérative à Bouaké qui supervise 4 fermes, doit configurer ressources / équipe / synchronisation pour son patron.

## DNA — verrouillé, ne pas dévier

Reprendre **exactement** :
- Les 13 tokens `--pt-*` (couleurs) + 5 paires avatars espèces (truie / verrat / porcelet / bande / loge)
- Les 3 fonts (Big Shoulders Display / Instrument Sans / JetBrains Mono)
- L'eyebrow mono uppercase 0.14em letter-spacing
- `.num` class avec tabular-nums sur tous les chiffres
- Le pattern de Pills 7 variants (success / warm / warning / danger / info / soft / ghost)
- Le pattern PageHeader (eyebrow + h1 + sub + breadcrumb optionnel)
- Le pattern PageHeader VARIANT primary (`.ph--primary` fond `--pt-primary` opaque, texte cream) — utilisé sur toutes les fiches détail
- Les Lucide icons (jamais d'emojis)
- BottomNav 5 tabs, FAB style cahier (`--pt-primary` fond + `--pt-warm` texte + box-shadow décollée)

**Anti-AI feel — règles dures rappelées** : pas de gradient text, pas de glassmorphism, pas de cards icône+titre+soustitre clonées, pas de hero metric central, pas de copy SaaS ("Découvrez", "Optimisez"), pas d'emojis dans titres ou labels.

## Scope — 14 écrans à mockuper

### A. Rubrique RÉGLAGES (priorité user, 7 écrans)

Route racine : `/reglages`. C'est le BottomNav tab 5 (Settings).

#### A.1 — Réglages (hub principal) — `/reglages`
État actuel V70 : eyebrow `CONFIGURATION`, h1 `Réglages`, sub `Profil, ferme, équipe, ressources`. Card profil OWNER, toggle "Mode avancé", 4 toggles notifications (Notifications app fermée / Rappels mise-bas / Stocks critiques / Cycles repro), bouton sync, 4 boutons configuration (Ma ferme / Mon équipe / Ressources & stocks / Protocoles santé), 3 boutons apprendre (Encyclopédie / Tutoriel / Aide & support), bouton logout.

À refaire en strict cohérence avec le mockup Élevage. Conserve la structure mais pousse-la dans le DNA. Important : c'est un écran-racine BottomNav, donc **pas de header primary opaque**, juste le PageHeader normal.

#### A.2 — Ma ferme — `/reglages/ma-ferme`
État actuel V70 : breadcrumb `Réglages > Ma ferme`, eyebrow `CONFIGURATION`, h1 `Ma ferme`, sub `Identité, secteur, devise`. Sections : Identité (nom de la ferme, code FERM-XXXXXX, propriétaire), Localisation (pays, secteur, devise), Bilan (3 KPIs : truies / verrats / bandes), bouton "Modifier la ferme" qui ouvre un écran d'édition complet (à mockuper aussi, A.2.bis).

Le bouton retour ChevronLeft + "Retour" est en haut au-dessus du breadcrumb (pattern V75-aa F-14).

#### A.2.bis — Ma ferme · édition (formulaire) — `/reglages/ma-ferme/edit`
Formulaire complet : nom ferme, code (lecture seule), propriétaire (lecture seule), pays (select avec drapeaux), secteur (libre), devise (auto dérivée du pays). Boutons "Enregistrer" / "Annuler" en bas. Sticky bottom action bar.

#### A.3 — Mon équipe — `/reglages/mon-equipe`
Breadcrumb, header standard. Sections : Stats (3 chiffres : membres / owners / porchers), Liste membres (1 ligne par membre : avatar avec initiales, nom, email, pill rôle OWNER ou WORKER, plus actions menu "···"), bouton primary "Inviter un membre", section "Console admin" (rôles, permissions — peut être un lien vers une vue détail).

#### A.4 — Ressources & stocks · hub — `/reglages/ressources` (re-création, pas le legacy `/ressources`)
Hub avec 4 sous-pages : Aliments / Pharmacie / Formules d'aliment / Plan d'alimentation. Chaque sous-page a son propre KPI (stock total, ruptures, bas). À l'écran hub : eyebrow `STOCKS`, h1 `Ressources`, sub `Aliments, pharmacie, fournisseurs`. 4 cards-action larges (icône Lucide + titre + sous-titre + count + chevron). Vue d'ensemble en haut : 4 KPIs (Total / Stock OK / Stock bas / Rupture).

#### A.5 — Protocoles — `/reglages/protocoles`
Breadcrumb. Eyebrow `RÉGLAGES · PROTOCOLES`, h1 `Protocoles`, sub `Procédures et SOP`. Tabs : Cycle / Terrain / Biosécurité / Rations / Listes (compteurs visibles avec aria-label "Cycle · 5"). Chaque tab affiche une **timeline de phases d'élevage** (Naissance / Post-sevrage / Croissance / Engraissement / Finition) en pattern rail similaire au Cycle vivant truie. Pour chaque phase : durée, objectif, surveillance, aliment. Pas la table fade actuelle.

#### A.6 — Encyclopédie — `/reglages/encyclopedie`
Déjà V70 propre — recherche full-text fonctionnelle. À redessiner pour aligner sur le DNA mockup Élevage : eyebrow `CONFIGURATION · AIDE`, h1 `Encyclopédie porcine`, sub `10 articles · Cycles, santé, économie, alimentation`. Searchbox avec icon search. Liste articles 3-niveaux (avatar catégorie / titre / `Catégorie · niveau` en mono). Au clic, ouvre l'article en pleine page avec bouton retour.

Mockuper aussi **un article ouvert** (lecture longue, typographie soignée, headings hiérarchiques, blocs citation, listes ordonnées, code blocks pour valeurs métier type "ISSE > 12 = excellent").

#### A.7 — Synchronisation — `/reglages/sync`
Breadcrumb. Header standard. Bouton retour. Sections : État global (icône cloud + status `Synchronisé` ou `12 actions en attente`), Liste détaillée des items en attente (date, action, table, status), Actions globales (Synchroniser maintenant / Vider le cache local). Pills `success` / `warning` / `danger` selon état.

### B. Rubrique PILOTAGE (cross-onglets, 7 écrans)

Cette rubrique mêle Today (BottomNav tab 1) et Performance (tab 4) ainsi que les détails Pilotage atteignables depuis ces tabs.

#### B.1 — Aujourd'hui — `/today`
État actuel V70 : eyebrow `DIMANCHE 10 MAI 2026`, h1 `Aujourd'hui`, sub `Bonjour Yao — N priorités`. Sections : Card "Le saviez-vous ?" (Lucide Lightbulb + titre + sub avec "En savoir plus"), Section "À traiter" (liste actions urgentes, chaque ligne = button avec avatar + titre + sub + chevron), Bannière "Activer les rappels" (cream avec 2 CTAs ACTIVER / PLUS TARD), Section "Mon élevage" (4 KPIs : truies / verrats / porcelets / bandes), Section "Tournée du jour" (12 points · biosécurité, alimentation, santé · bouton primary `Démarrer la tournée`).

C'est le hub central — l'écran que Yao voit en premier. Doit donner immédiatement les 3-5 actions critiques du jour. Fond hero possible si subtil. Marius accessible en haut à droite (button icon).

#### B.2 — Performance · vue — `/performance?tab=vue`
Eyebrow `PILOTAGE · MAI 2026`, h1 `Performance`, sub `L'année en chiffres. Sans détour.`. Sous-tabs : Vue / KPIs / Finances / Prévisions. Vue : Score global D/C/B/A en gros (style Big Shoulders 900 énorme), pondérations en sub (`ISSE 50% · Taux MB 30% · NV 10% · Mortalité 10% · 5 cycles`), Card ISSE moyen (gros chiffre + ref 12.0), Section indicateurs techniques (5 KPIs : Taux MB / NV/portée / Mortalité naiss-sevrage / IEM / IC post-sevrage), Section Finances (Marge mensuelle FCFA + boutons DÉTAILS / PDF), Section Top performances (3 lignes : bandes triées par NV).

#### B.3 — Performance · KPIs (DataTable mode avancé) — `/performance?tab=kpis`
Vue tabulaire profonde. DataTable colonnes : Bande / ISSE / Taux MB / NV / Mortalité / Marge. Triable, filtrable. Mode mobile : cards stackées scrollables. CTA export CSV en haut droite.

#### B.4 — Performance · Finances — `/performance?tab=finances`
Card grosse marge mensuelle FCFA + delta vs mois précédent (avec arrow + couleur success/danger). Graphe simple barres 12 mois (utilise SVG natif, pas Recharts). 3 KPIs : Revenus / Charges / Marge nette. Lien vers `/pilotage/rapport` pour le rapport financier complet.

#### B.5 — Performance · Prévisions — `/performance?tab=previsions`
Card EduCard `Prévisions d'élevage` (icône TrendingUp Lucide, pas emoji). 3 sections : Prochaines mises-bas (90 jours) avec liste de truies T-XXX et dates, Total porcelets attendus (gros chiffre `~61` mono), Sorties abattoir prévues (90 jours). Empty state si rien de prévu.

#### B.6 — Alertes — `/alertes`
Atteignable depuis Today (badge count). Eyebrow `PILOTAGE · ALERTES`, h1 `Alertes actives`, sub `12 alertes — 3 critiques`. Liste alertes ordonnées par priorité (CRITIQUE / HAUTE / NORMALE / INFO). Chaque alerte = card avec eyebrow priorité (couleur sémantique) + titre alerte + sub règle déclenchée + timestamp + bouton "Voir" + bouton "Ignorer". Filtres en haut (chips toggleables : Toutes / Critique / Haute / Stocks / Repro / Mortalité). Pattern hub.

#### B.7 — Rapport financier — `/pilotage/rapport`
Atteignable depuis Performance > Finances > détails. Eyebrow `PILOTAGE · RAPPORT`, h1 `Rapport financier`, sub mois sélectionné. Sélecteur période (mois ou trimestre). Sections : Synthèse (gros chiffres marge brute / nette), Détail par catégorie (alimentation / véto / ventes porcelets / ventes truies réformées / autres) — mini bar chart par catégorie, Détail mois par mois (table 12 lignes), Bouton export PDF.

## Cohérence transverse exigée

- **Bouton retour** ChevronLeft + "Retour" mono uppercase 11px sur toute page non-racine BottomNav (pattern V75-aa F-14, ajouté au PageHeader).
- **Breadcrumb** au-dessus de l'eyebrow sur les sous-pages (`Réglages > Ma ferme`).
- **Tabs/sub-tabs** mêmes patterns que mockup Élevage (`.tab[aria-current=true]` border-bottom 2px primary + color ink).
- **Cards** : fond `--pt-warm` ou `--pt-bg`, border-radius 14-16px, border 1px `--pt-line`. Pas de shadow.
- **Empty states** : typographie austère, 1 CTA primary, copy concrète métier.
- **Skeleton loading** : blocs lignes `--pt-line` qui s'allument en cascade (réutilise pattern Élevage).
- **Mode avancé toggle** : visible dans Réglages racine, transforme certaines vues en DataTable.

## Données réelles à intégrer

Mêmes données que le mockup Élevage (compte audit Yao). Pour Réglages :

```
PROFIL
Yao Kouassi (you, OWNER)
yao@porctrack.test
Ferme PorcTrack Yamoussoukro · code FERM-DA7B5A
Pays Côte d'Ivoire · Secteur Naisseur-engraisseur · Devise FCFA
50 truies · 3 verrats · 6 bandes

ÉQUIPE
Yao Kouassi · OWNER · (you)
Aïssa Diabaté · WORKER · invitée 2 mai 2026, en attente

NOTIFICATIONS
Notifications app fermée : OFF
Rappels mise-bas : ON (J-3, J-1, jour J)
Stocks critiques : ON (aliment ou véto en rupture)
Cycles repro : ON (sevrage, retour chaleur, écho)

SYNCHRONISATION
12 actions en attente · 0 erreur · dernière sync il y a 2h
```

Pour Pilotage / Performance :

```
KPIs ÉLEVAGE
ISSE moyen 11.4 (réf >12)
Taux MB 86%
NV/portée 12.4
Mortalité allaitement 8.2%
GMQ post-sevrage 412 g/j
IC engraissement 2.7
Score global C — 64/100 — Bon

FINANCES MAI 2026
Revenus 1 845 000 FCFA (ventes 12 porcs charcutiers + 2 truies réformées)
Charges 1 270 000 FCFA (aliment 78%, véto 12%, autres 10%)
Marge nette 575 000 FCFA (+18% vs avril)

PRÉVISIONS 90 J
Mises-bas : T-026 le 12/05, T-022 le 13/05, T-005 le 17/05, T-009 le 18/05 (4 truies)
Total porcelets attendus : ~61
Sorties abattoir prévues : aucune fenêtre 0-90 j

ALERTES ACTIVES
3 CRITIQUE : T-018 réforme zootechnique, stock aliment <2j, R14 portée orpheline T-031
4 HAUTE : T-026 mise-bas J-2, T-005 retour chaleur attendu, R10 surdensité engraissement, R5b stock vermifuge bas
5 NORMALE : 5 sevrages dans 7j, 3 échos planifiées
```

## Format livrable

**1 fichier HTML standalone** : `reglages-pilotage-mockup-v76.html`. Mêmes contraintes techniques que le mockup Élevage (Tailwind CDN si tu veux, Google Fonts identiques, Lucide via UMD). Tous les écrans dans le même fichier, séparés par sections, navigables par ancres.

Structure attendue :
```html
<body>
  <!-- A. Réglages -->
  <section id="reglages-hub">…</section>
  <section id="reglages-maferme">…</section>
  <section id="reglages-maferme-edit">…</section>
  <section id="reglages-monequipe">…</section>
  <section id="reglages-ressources-hub">…</section>
  <section id="reglages-protocoles">…</section>
  <section id="reglages-encyclopedie-liste">…</section>
  <section id="reglages-encyclopedie-article">…</section>
  <section id="reglages-sync">…</section>
  <!-- B. Pilotage -->
  <section id="today">…</section>
  <section id="performance-vue">…</section>
  <section id="performance-kpis">…</section>
  <section id="performance-finances">…</section>
  <section id="performance-previsions">…</section>
  <section id="alertes">…</section>
  <section id="pilotage-rapport">…</section>
</body>
```

Menu de navigation en haut (ancres). Section "system" inutile cette fois (déjà dans le mockup Élevage, à réutiliser tel quel en implémentation).

## Critères d'acceptance

Avant de me rendre le mockup, vérifie :

1. ✅ Cohérence visuelle 100% avec `elevage-mockup-v76.html` (mêmes tokens, mêmes patterns Pills/Avatar/PageHeader, même `.ph--primary` pour les fiches détail si pertinent)
2. ✅ Aucun emoji, gradient text, glassmorphism
3. ✅ Aucune couleur hors des 13 tokens (+ 5 paires avatars)
4. ✅ Aucune font hors les 3 (Big Shoulders / Instrument Sans / JetBrains Mono)
5. ✅ Tous les chiffres en `tabular-nums` (`.num` class)
6. ✅ Eyebrows uppercase mono 0.14em partout
7. ✅ Données réelles (Yao, Aïssa, Côte d'Ivoire, FCFA, T-026, etc.) — pas de Lorem
8. ✅ Bouton retour ChevronLeft + "Retour" sur sous-pages
9. ✅ Breadcrumb sur sous-pages
10. ✅ Persona Yao + Aïssa testés mentalement (Yao consulte Today/Performance, Aïssa configure Réglages)

## Bonus apprécié

- **Variant "Aïssa OWNER d'une coopérative multi-fermes"** sur le Réglages racine : un sélecteur ferme en haut (chips ou dropdown) qui montre 4 fermes + KPIs consolidés en bas. Indique comment l'écran change quand on switch.
- **Mode avancé** sur Performance KPIs (DataTable détaillée triable) — même DataTable pattern que le mockup Élevage bonus.
- **Vue alerte détaillée** : si tu cliques sur une alerte critique, ça ouvre une fiche avec toutes les infos métier (règle déclenchée, valeurs observées, recommandation Marius, actions disponibles "Marquer traitée" / "Repousser 24h" / "Voir l'animal").

## 3 décisions design fortes attendues

Comme la dernière fois, tranche et explique. Suggestions de zones à arbitrer :

- **Today** : hero metric ou dense liste à actions ? (Ne pas tomber dans hero metric SaaS générique)
- **Performance score global** : grosse note A/B/C/D façon billboard, ou évolution graphique 12 mois ?
- **Réglages racine** : tout en liste sobre comme aujourd'hui, ou redécouper avec sections plus visuelles (avec illustrations Lucide grand format) ?
- **Alertes** : timeline chronologique ou groupes par sévérité ?
- **Bouton "Modifier la ferme"** : ouvrir le formulaire dans un sheet bottom mobile, ou une nouvelle page plein écran ?

## Ce que je ferai de ton livrable

J'ouvre les deux mockups (Élevage v76 + Réglages-Pilotage v76) en split-screen pendant que je code. La cohérence visuelle entre les deux mockups est ma garantie de **uniformité produit** — c'est ce que l'utilisateur final perçoit.

---

**Annexe — rubriques NON couvertes par ce prompt** (à mockuper plus tard si besoin) :

- **Ressources sous-pages détail** (`/reglages/ressources/aliments`, `/pharmacie`, `/formules`, `/plan`, `/fournisseurs`) : 5 écrans techniques, plus tard. Le hub Ressources mocké dans A.4 suffit pour cadrer le pattern.
- **Onboarding wizard** (5 étapes pour nouveaux users) : déjà partiellement V70, à finaliser plus tard.
- **Repro** (`/reproduction`) : déjà V70 propre côté code, polish suffit.

Tranche, livre, je te dis si l'uniformité produit est atteinte.
