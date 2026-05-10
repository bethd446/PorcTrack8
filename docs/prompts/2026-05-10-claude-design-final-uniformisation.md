# Prompt Claude Design 3 (final) — Uniformisation totale PorcTrack 8

> Copie ce prompt entier dans Claude Design (claude.ai). Joins **obligatoirement** les 2 mockups précédents :
> 1. `elevage-mockup-v76.html` (DNA établi, fiches détail, system block, anti-AI feel)
> 2. `reglages-pilotage-mockup-v76.html` (patterns card-link, priority-line, score-billboard, alert-card)
>
> Optionnel mais utile : `~/Downloads/v70-mockup.html`, `V70-VISION-STRATEGIQUE.md`, `REPONSE-A-ORCHESTRATEUR-V70.md`.

---

## Le contexte — clôture du sprint design

Tu as déjà livré 2 mockups exemplaires :
- **`elevage-mockup-v76.html`** — 10 écrans Élevage + bonus mode avancé + system block + 3 décisions design fortes (header fiche `--pt-primary` opaque, lignes liste 3 niveaux, cycle vivant rail 5 nœuds).
- **`reglages-pilotage-mockup-v76.html`** — 16 écrans Réglages + Pilotage + 2 bonus + 3 nouvelles décisions (Today liste actions priorisées border-left, Performance score billboard A/B/C/D, Réglages racine cards-link uniforme).

J'ai déjà implémenté en React/Ionic Capacitor :
- ✅ Le pattern `card-link` (Réglages racine)
- ✅ Le pattern `priority-line` (Today section "À traiter")
- ✅ Le CSS du `score-billboard` (prêt, pas encore appliqué)

**Mission de ce 3ème prompt** : couvrir **tout ce qui n'a pas encore été mockupé**, pour que je puisse finaliser l'uniformisation V76 en une seule passe d'implémentation. **C'est le dernier livrable design** — après ça, tu n'es plus sollicité, le DNA est verrouillé et l'app est cohérente bout-en-bout.

## Persona — inchangé

Yao (38, éleveur seul Yamoussoukro) + Aïssa (27, technicienne coopérative Bouaké). Mobile Android Chrome 4G, 6h du matin, terrain.

## DNA — verrouillé

Reprendre **exactement** les patterns établis dans les 2 mockups précédents. Ne dévie sur aucun token, font, eyebrow, pill, avatar, card-link, priority-line, score-billboard, alert-card, ph--primary. Si tu hésites entre une nouvelle approche et un pattern existant, **garde le pattern existant**.

Anti-AI feel — règles dures (rappelées) : pas de gradient text, pas de glassmorphism, pas de cards icône+titre+soustitre clonées, pas de hero metric, pas de copy SaaS, pas d'emojis dans titres ou labels.

## Scope — 17 écrans à mockuper, en 6 groupes thématiques

Ne pas survoler. Pour chaque écran : structure complète, données réelles (compte audit Yao Kouassi), comportement responsive 390×844.

### Groupe A — Ressources détail (5 écrans)

Sous-pages atteignables depuis le hub Ressources mocké en A.4 du précédent prompt.

#### A.1 — Aliments — `/reglages/ressources/aliments`
Breadcrumb `Réglages › Ressources › Aliments`. Bouton retour. Eyebrow `STOCKS · ALIMENTS`, h1 `Aliments`, sub `Stock matières premières + sacs prêts`. KPIs (4) : Total kg en stock / Stock OK (count) / Stock bas (count) / Rupture (count). Tabs : Sacs prêts / Matières premières. Liste items 3-niveaux (icône Wheat + nom + sub `dernière entrée 12/04 · 850 kg restants` + pill `OK`/`Bas`/`Rupture`). FAB "Nouvelle entrée".

#### A.2 — Pharmacie / Vétérinaire — `/reglages/ressources/pharmacie`
Breadcrumb. Header. KPIs : Total produits / Vaccins en cours / Antibio stock / Rupture. Tabs : Vaccins / Antibiotiques / Vermifuges / Autres. Liste items (icône Stethoscope + nom DCI + sub `lot · péremption · stock`). Pill `OK`/`Bas`/`Périmé bientôt` (warning ambre)/`Rupture`. FAB "Nouveau produit".

#### A.3 — Formules d'aliment — `/reglages/ressources/formules`
Breadcrumb. Header. Liste de formules custom (gestation / lactation / post-sevrage / engraissement / finition). Chaque formule = card avec : nom + description + composition (liste matières premières en %), coût/kg estimé, bouton "Modifier". CTA "Nouvelle formule".

#### A.4 — Plan d'alimentation — `/reglages/ressources/aliments/plan`
Breadcrumb. Header. Vue tabulaire ou grid : par phase de cycle (Maternité / Gestation / Post-sevrage / Croissance / Finition), affecter une formule × ration kg/jour. Mini grid responsive. Bouton "Calculer besoins mensuels" qui ouvre un sheet avec projection consommation 30j sur le troupeau actuel.

#### A.5 — Fournisseurs — `/reglages/ressources/fournisseurs`
Breadcrumb. Header. Liste fournisseurs (Sipra, vétérinaire local, etc.) avec eyebrow type (Aliment / Véto / Génétique / Matériel) et infos contact. Pattern card-link adapté : icône Building2, nom mono, sub catégorie + ville + téléphone. CTA "Nouveau fournisseur".

### Groupe B — Reproduction (4 écrans, polish + sub-tabs)

`/reproduction` est déjà V70 propre côté code (eyebrow + h1 + KPIs strip + 4 sous-tabs + cycle viewer). À harmoniser avec le DNA renouvelé v76.

#### B.1 — Reproduction · Agenda — `/reproduction?tab=agenda`
Header standard. KPIs strip (4 chiffres : Pleines / Maternité / Vides / MB 7j). Mini cycle viewer pour la prochaine MB imminente (rail 5 nœuds — réutilise le pattern fiche truie). Section "7 prochains jours" : timeline verticale avec items (J+1, J+3, J+5) + actions à prévoir (saillie / écho / MB / sevrage). Card-link "Comprendre les cycles" → encyclopédie.

#### B.2 — Reproduction · En cours — `?tab=en-cours`
Liste cycles actifs. Chaque cycle = card avec : avatar bande + nom + cycle viewer rail 5 nœuds compact + chevron vers fiche bande. Filtre chips par phase (Saillie / Gestation / Maternité / Post-sevrage).

#### B.3 — Reproduction · À venir — `?tab=a-venir`
Liste actions planifiées 30 jours : saillies à faire (truies vides J+5 post sevrage), échos à programmer (J28 post saillie), MB attendues (J115). Pattern priority-line (icône métier colorée) avec délai en sub.

#### B.4 — Reproduction · Historique — `?tab=historique`
Liste bandes passées (sevrées + sorties). Format DataTable mode avancé OU cards stackées mobile : bande + truie + MB + sevrage + NV / NS / ISSE finale. Filtre par année. CTA export CSV en mode avancé.

### Groupe C — Onboarding wizard (5 étapes)

`/onboarding-v2` ou `/reglages/onboarding`. Wizard 5 étapes obligatoire première connexion + rejouable depuis Réglages. Format plein écran, bouton retour étape précédente, bouton Skip discret en haut droite.

#### C.1 — Étape 1/5 — Bienvenue
Heading énorme Big Shoulders ("Bienvenue dans PorcTrack"). Illustration : `<PigSilhouette />` Lucide grand format (96px) ou un dessin custom métier (silhouette truie+porcelets en line-art `--pt-primary`). Sub : présentation du cycle truie (saillie → écho → MB → maternité → sevrage) en mini timeline 5 nœuds (réutilise rail). CTA primary "Continuer".

#### C.2 — Étape 2/5 — Alertes biologiques
Présentation des 16 règles d'alerte du moteur. Au lieu d'une liste plate, regrouper en 4 catégories visuelles (Reproduction / Santé / Stock / Performance). Chaque catégorie = card avec icône + titre + count règles + 2-3 exemples. Ne PAS lister les 16 règles, juste donner l'idée. CTA "Continuer".

#### C.3 — Étape 3/5 — Ajouter ta première truie
Embedded mini-form simulé (champ Code T-XXX, champ Boucle, champ Statut). Au validate, mock une animation de succès (truie avatar pop in dans la liste). Pas une vraie écriture DB, juste un teaser. CTA "Continuer".

#### C.4 — Étape 4/5 — Enregistrer une saillie
Mock fiche truie + bouton "+ Saisir évènement" → choix "Saillie" → sheet bottom avec date/verrat. Animation : la timeline cycle se peuple de J0 saillie + dates calculées (écho J28, MB J115, sevrage J143). Texte explicatif court. CTA "Continuer".

#### C.5 — Étape 5/5 — Comprendre tes KPIs
Mini score billboard (variant compact, lettre B 80px + ISSE 11.4 + Marge 575k FCFA). Trois cards-link vers : Encyclopédie ISSE / Encyclopédie marge / Encyclopédie réforme. CTA primary "C'est parti — voir mon élevage" → redirect /today.

### Groupe D — Modals quick-add (6 modals partagés)

Bottom-sheet mobiles, ouverts depuis FAB ou actions inline. Hauteur max 90vh, drag handle en haut, fermeture swipe-down ou backdrop.

#### D.1 — Quick add Truie — `<QuickAddTruieForm>`
Champs : Code (auto-gen T-XXX si vide), Boucle officielle, Statut (radio Vide / Pleine / Maternité), Date naissance (datepicker), Loge (select), Boucle mère (autocomplete), Verrat origine (select). Validation inline. CTA primary "Enregistrer la truie", secondary "Annuler".

#### D.2 — Quick add Verrat — `<QuickAddVerratForm>`
Champs : Code V-XXX, Boucle, Date naissance, Origine (libre), Ration kg/j. CTAs identiques.

#### D.3 — Quick add Bande — `<QuickAddBandeForm>`
Champs : Truie mère (autocomplete obligatoire), Date MB, NV (nombre vivants), Morts (count optionnel). Auto-génère idPortee compact. CTAs.

#### D.4 — Quick add Porcelet — `<QuickAddPorceletForm>`
Champs : Bande (select), Boucle (libre, ex CR-12), Sexe (radio M / F / Inconnu), Poids naissance kg (numeric tabular-nums). CTAs.

#### D.5 — Quick add Loge — `<QuickAddLogeForm>`
Champs : Code loge (auto M-NN selon type), Type (radio Maternité / Post-sevrage / Engraissement), Capacité max (numeric), Position (libre). CTAs.

#### D.6 — Quick saillie / Quick mise-bas
Saillie : Truie (autocomplete), Verrat (select), Date saillie. Auto-calcule écho J28, MB J115, sevrage J143 et les affiche en preview avant submit.
Mise-bas : Truie en gestation (autocomplete filtré), Date MB, NV, Morts, NS optionnel. Pré-rempli à partir de la date saillie + 115j si dispo.

### Groupe E — Marius chat plein écran (3 écrans)

Marius est l'assistant IA intégré (cf. `~/.claude/projects/-Users-13mac/memory/reference_porctrack8_marius.md` ou demande à l'utilisateur). Endpoint `/chat` SSE format OpenAI sur api.porctrack.tech, Mistral-7B Q4. Atteint depuis bouton flottant "Marius M" en haut droite de Today + bouton dédié dans pages clés.

#### E.1 — Chat fullscreen — `/marius`
Plein écran (pas de BottomNav). Header avec avatar Marius (M dans cercle accent ambre) + titre `MARIUS · ASSISTANT` + bouton fermer (X). Stream messages bulle utilisateur (right, fond accent) vs bulle Marius (left, fond bg). Markdown render minimal (bullets, bold, code inline). Sticky bottom : champ saisie + bouton envoyer (ArrowUp). Chips suggestions sous le champ (3-4 propositions contextuelles : "Que faire aujourd'hui ?", "Mortalité allaitement haute, pourquoi ?", "T-026 mise-bas, prête ?").

#### E.2 — Marius greeting card (variant compact embedded)
Pattern `card--ink` (fond `--pt-ink` + texte cream) avec eyebrow `MARIUS · LECTURE`, titre Big Shoulders 18px ("Bonjour Yao"), 3-4 bullets max d'analyse contextuelle (priorités du jour, anomalies repérées). Bouton "Continuer la conversation" → ouvre fullscreen E.1. Utilisé sur Today + fiches détail (TruieDetail · "Lecture du dossier · MARIUS").

#### E.3 — Marius offline state
Quand l'API Marius est down (cf. P0 #1 du crash test). Card `card--ink` avec icône CloudOff + message neutre `Marius est temporairement indisponible. Reconnecte-toi à internet ou réessaie dans quelques minutes.` + bouton "Réessayer". Pas d'erreur technique exposée.

### Groupe F — Patterns transverses + finitions

#### F.1 — Skeleton loading patterns
Aujourd'hui le skeleton est basique (`<div className="rounded-md bg-bg-2 animate-pulse">`). Définir 4 patterns réutilisables : Skeleton list-item (priority-line shape), Skeleton card-link, Skeleton card profil, Skeleton chart bar. Cascade d'animation sequence. À documenter dans le system block.

#### F.2 — Empty states transverses
Lister 8 empty states cohérents (Aucune truie, Aucune bande active, Aucune loge, Aucun porcelet, Aucune alerte, Aucune transaction, Aucun fournisseur, Aucun protocole). Pour chacun : illustration discrète + titre Big Shoulders + sub copy concrète métier + CTA primary unique. Pas d'image stock photographique systématique — alternance entre icônes Lucide grand format `--pt-subtle` et illustrations line-art primaires.

#### F.3 — Error states (4 variantes)
1. Erreur réseau (ConnectionError) — pattern `card--ink` warning ambre + bouton Retry
2. Erreur 404 (ressource introuvable) — déjà existe `EntityNotFoundCard`, à harmoniser visuellement
3. Erreur 403 (RLS Supabase, accès refusé porcher) — copy spécifique métier ("Cette donnée est réservée au propriétaire")
4. Erreur 500 (server) — copy neutre + bouton Retry + lien Marius "Marius peut t'aider à diagnostiquer"

#### F.4 — Toast notifications (3 variantes)
Success (vert primary-light) / Warning (ambre accent) / Error (rouge danger). Position bottom 16px au-dessus du BottomNav. Auto-dismiss 4s. Animation slide-in subtile. Maximum 1 toast à la fois.

#### F.5 — Confirmation dialogs (IonAlert custom V70)
Quand on remplace `window.confirm()` natif. Header Big Shoulders titre, body Instrument Sans 14px, 2 boutons (Annuler ghost + Action destructive danger). Pattern utilisé pour : déconnexion, suppression bande, marquage mortalité, réforme truie.

#### F.6 — Long press actions (mobile)
Sur les items de liste (truies/bandes/porcelets) : long-press 500ms ouvre un menu contextuel (action sheet bottom) avec 3-4 actions rapides. Exemple porcelet : Peser / Mortalité / Vente / Modifier. Définir le pattern visuel (sheet bottom avec dragger + liste actions icon + label).

### Groupe G — Bonus apprécié

- **Variant TopBar tablet/desktop** : sur écran ≥ 1024px, ajouter une barre supérieure (top-nav) avec brand mark + ferme courante + lien rapides (Élevage / Repro / Performance / Réglages) + bouton Marius. Cohérent avec le mockup `reglages-pilotage-mockup-v76.html` qui a déjà `.top-nav`.
- **Variant Aïssa coopérative** repris : sélecteur ferme en haut (chip ferme A / B / C / D + KPIs consolidés). À étendre sur Today + Performance pour Aïssa.
- **DataTable mode avancé** : pattern réutilisable pour Performance KPIs / Repro Historique / Finances détail. Tri, filtre, export CSV.

## Format livrable

**1 fichier HTML standalone** : `final-uniformisation-mockup-v76.html`. Mêmes contraintes techniques que les 2 précédents (Tailwind CDN ou CSS custom, Google Fonts, Lucide UMD). Tous les écrans dans le même fichier, séparés par sections, navigables par ancres.

Structure attendue :
```html
<body>
  <nav>menu d'ancres en haut</nav>
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
  <!-- C. Onboarding -->
  <section id="onboarding-1">…</section>
  <section id="onboarding-2">…</section>
  <section id="onboarding-3">…</section>
  <section id="onboarding-4">…</section>
  <section id="onboarding-5">…</section>
  <!-- D. Modals (6 modals empilés visuellement) -->
  <section id="modals">…</section>
  <!-- E. Marius -->
  <section id="marius-fullscreen">…</section>
  <section id="marius-greeting">…</section>
  <section id="marius-offline">…</section>
  <!-- F. Patterns transverses -->
  <section id="skeletons">…</section>
  <section id="empty-states">…</section>
  <section id="error-states">…</section>
  <section id="toasts">…</section>
  <section id="dialogs">…</section>
  <section id="long-press">…</section>
  <!-- G. Bonus -->
  <section id="topbar-desktop">…</section>
  <section id="aissa-cooperative">…</section>
  <section id="datatable">…</section>
</body>
```

## Critères d'acceptance — durs

Avant de me rendre le mockup, vérifie :

1. ✅ Cohérence 100% avec les 2 mockups précédents (mêmes tokens, fonts, eyebrows, patterns card-link / priority-line / score-billboard / alert-card / ph--primary / id-strip)
2. ✅ Aucun emoji, gradient text, glassmorphism, hero metric SaaS, copy SaaS générique
3. ✅ Aucune couleur hors des 13 tokens + 5 paires avatars + tokens loge
4. ✅ Aucune font hors les 3 (Big Shoulders Display / Instrument Sans / JetBrains Mono)
5. ✅ Tous les chiffres en `tabular-nums` (`.num` class)
6. ✅ Eyebrows uppercase mono 0.14em
7. ✅ Données réelles (Yao Kouassi, Aïssa Diabaté, Côte d'Ivoire, FCFA, T-XXX, V-XXX, codes bande, prix Sipra réalistes, formules d'aliment réalistes)
8. ✅ Persona testé : Yao en mobile à 6h doit comprendre / agir en 3 secondes
9. ✅ Bouton retour ChevronLeft + "Retour" sur sous-pages
10. ✅ Breadcrumb sur sous-pages
11. ✅ Pas de doublon avec les 2 mockups précédents — si un écran existe déjà, je le réutilise. Tu n'as pas à le re-mockuper.

## 5 décisions design fortes attendues

Tranche, explique, livre. Suggestions de zones à arbitrer :

- **Onboarding wizard** : full screen avec animation entre étapes, ou stack vertical scrollable ?
- **Marius fullscreen** : bulles colorées (warm vs accent), ou typographie pure (alignement gauche/droite avec eyebrow + texte) ?
- **Long press** : action sheet bottom mobile classique, ou inline expansion de la ligne ?
- **DataTable mode avancé** : table HTML traditionnelle, ou cards stackées avec en-têtes flottants ?
- **Pharmacie** : tabs par catégorie (Vaccins / Antibio / Vermifuges), ou liste plate avec chips filtres ?

## Effort dev estimé attendu

Comme les 2 fois précédentes, donne en fin de fichier :
- Estimation jours dev React/Ionic Capacitor pour porter ce mockup
- Top 3 priorités d'implémentation pour l'utilisateur final (les écrans qui apportent le plus de valeur)
- 2 zones d'hésitation détaillées (avec alternative écartée)

## Ce que je ferai de ton livrable

J'implémente en React/Ionic. Avec les 3 mockups en main (Élevage v76 + Réglages-Pilotage v76 + Final v76), j'ai une référence complète pour aligner toute l'app PorcTrack sur le DNA Terrain Vivant. **Plus aucun écran legacy V43 ne devrait subsister** dans le shell V70 après cette passe d'implémentation.

Tu n'as pas besoin de me demander mon avis. Tranche, livre, je te dis si l'uniformité produit est atteinte sur l'ensemble de l'app.

---

**Annexe — état d'implémentation actuel** (informationnel, pour que tu calibres la profondeur attendue) :

- ✅ Patterns CSS implémentés : eyebrow, page-header, page-eyebrow, page-title, page-subtitle, breadcrumb, card-link, priority-line, score-billboard (CSS prêt, pas encore appliqué Performance), Pill 7 variants, EntityAvatar 5 espèces × 4 tailles, ListItem, BottomNav 5 tabs Lucide, FAB, TabsMini avec deeplink ?tab=
- ⏳ Patterns CSS définis dans tes mockups, à appliquer : alert-card border-left, ph--primary header opaque, id-strip, cycle-rail, miniplot SVG, barchart SVG, score-billboard markup, kpis grid 4-cols/2-cols/3-cols
- ❌ Patterns à mockuper : skeletons, empty states, error states, toasts, dialogs, long-press, top-nav desktop, datatable mode avancé, marius fullscreen, modals quick-add

**Bonne dernière passe.**
