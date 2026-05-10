# Prompt Claude Design 3c — Marius + Patterns transverses + Bonus

> Dernier prompt de la série. Vient APRÈS 3a (Ressources + Repro) et 3b (Onboarding + Modals).
>
> **Pièces attachées obligatoires** :
> 1. `elevage-mockup-v76.html`
> 2. `reglages-pilotage-mockup-v76.html`
> 3. `ressources-reproduction-mockup-v76.html` (livrable 3a)
> 4. `onboarding-modals-mockup-v76.html` (livrable 3b)

---

## Contexte

4ème et **dernier mockup** d'une série de 4. Tu as déjà livré :
- Mockup 1 : Élevage v76 (10 écrans)
- Mockup 2 : Réglages-Pilotage v76 (16 écrans)
- Mockup 3a : Ressources + Reproduction (9 écrans)
- Mockup 3b : Onboarding + Modals (11 livrables)

Ce **prompt 3c** clôt la série avec **3 derniers groupes** : Marius (3 écrans) + Patterns transverses (6 patterns) + Bonus (3 variants). Après ça, tu n'es plus sollicité, le DNA Terrain Vivant est verrouillé.

## Persona — inchangé

Yao + Aïssa. Yao consulte Today/Performance, Aïssa configure ferme + parfois supervise via TopBar desktop pour la coopérative.

## DNA — verrouillé (rappel court)

13 tokens `--pt-*` + 3 fonts + eyebrow mono uppercase 0.14em + tabular-nums + Lucide + patterns `card-link` / `priority-line` / `score-billboard` / `alert-card` / `ph--primary` / `id-strip` / `cycle__rail` / Pills 7 / EntityAvatar 5×4 / FAB / BottomNav / TabsMini ?tab=.

Anti-AI feel : pas d'emojis dans titres, pas de gradient text, pas de glassmorphism, pas de hero metric SaaS, pas de copy "Découvrez/Optimisez".

## Scope — 12 livrables

### Groupe E — Marius IA (3 écrans)

Marius est l'assistant IA intégré (Mistral-7B Q4 sur VPS, endpoint `/chat` SSE format OpenAI). Atteint depuis :
- Bouton flottant "M" en haut droite de Today
- Bouton dédié sur fiches détail (TruieDetailView "Lecture du dossier · MARIUS")
- 2 autres points d'entrée à confirmer

#### E.1 — Marius chat fullscreen — `/marius`

**Plein écran, pas de BottomNav**. Header :
- Avatar Marius : cercle 36px fond `--pt-accent` + lettre M Big Shoulders 18px color cream
- Titre `MARIUS` Big Shoulders 18px uppercase, sub `Assistant IA · ton élevage en temps réel`
- Bouton fermer (X) à droite, ChevronLeft + "Retour" alternatif

**Body scrollable** : suite de messages bulles. Pattern :
- **Bulle utilisateur** (alignée droite) : fond `--pt-accent` opaque, texte cream, border-radius 14px tl-tr-bl, padding 12×14px, max-width 78%
- **Bulle Marius** (alignée gauche) : fond `--pt-bg`, texte ink, border 1px line, mêmes radii inversés, max-width 80%
- **Markdown render minimal** : bullets, **bold**, *italic*, ` code inline ` (mono color accent), blocs `## Heading`
- Timestamp mono color subtle entre groupes de messages (ex `· il y a 3 min ·`)

**Suggestions chips** sous le dernier message Marius (pré-générées contextuelles) :
- "Quelles truies surveiller aujourd'hui ?"
- "Pourquoi mortalité allaitement haute ?"
- "T-026 · prête pour mise-bas ?"
- "Plan d'aliment optimal mai ?"

**Sticky bottom input zone** :
- Champ saisie auto-grow textarea (max 4 lignes)
- Bouton envoyer rond accent avec icône `ArrowUp` (disabled si vide)
- Compteur chars discret en bas droite si >200 chars

**Stream indicator** quand Marius écrit : 3 dots animés (typing indicator), discret.

#### E.2 — Marius greeting card (variant compact embedded)

Pattern `card--ink` réutilisable sur Today + fiches détail. Structure :
- Eyebrow `MARIUS · LECTURE` en accent ambre (color `--pt-accent-light`)
- Titre Big Shoulders 18px ink-on-cream variant ("Bonjour Yao") OU bandeau analyse contextuelle si fiche détail ("Truie en réforme — à sortir")
- 3-4 bullets max d'analyse contextuelle (priorités, anomalies, recommandation)
- Bouton inline `Continuer la conversation →` (ghost cream sur fond ink) → ouvre fullscreen E.1
- Variant fiche détail : pas de bouton, juste l'analyse statique

**Exemples de copies réelles** :

Today greeting :
> **Bonjour Yao** — 3 priorités critiques ce matin
> - T-018 réforme zootechnique : sortir cette semaine (3 portées, ISSE 7.2)
> - Stock aliment lactation < 2j (240 kg / 130 kg/j)
> - R14 portée orpheline T-031 : adopter ou compléter biberon
> Tournée matin recommandée : 22 min, focus maternité.

TruieDetail T-046 (réforme) :
> **Truie en réforme** — à sortir du cheptel
> Marquer comme sortie depuis le bouton ci-dessous (vente, abattoir ou mortalité). Aucune saillie historique, productivité insuffisante.

#### E.3 — Marius offline state

Quand l'API Marius est down (cf. P0 #1 du crash test, mémoire `reference_porctrack8_marius.md`). Card pattern `card--ink` :
- Icône CloudOff Lucide grand format (32px) color cream subtle
- Titre Big Shoulders 18px uppercase `MARIUS · INDISPONIBLE`
- Sub : `Reconnecte-toi à internet ou réessaie dans quelques minutes. Pas d'erreur technique exposée à l'éleveur.`
- Bouton primary cream "Réessayer" + bouton secondary ghost "Continuer sans Marius"

Ne PAS exposer le détail d'erreur réseau (404, 500, CORS, timeout) à l'utilisateur.

### Groupe F — Patterns transverses (6 patterns)

Pattern réutilisables documentés en system block en fin de mockup. Chaque pattern doit montrer **3-5 variants** côte à côte pour servir de référence d'implémentation.

#### F.1 — Skeleton loading (4 patterns)

Définir 4 skeletons réutilisables :
- **Skeleton list-item** (priority-line shape) : icône carrée placeholder + 2 lignes de texte cascadées
- **Skeleton card-link** : icône carrée + 2 lignes + chevron ghost
- **Skeleton card profil** : avatar rond + nom + sub
- **Skeleton chart bar** : 6-8 barres verticales d'amplitude variable

**Animation** : pulse subtil (opacity 0.4 → 0.8 → 0.4 sur 1.6s ease), cascade entre items (delay 80ms par item). Couleur fond `--pt-line` ou `--pt-line-strong`. Ne JAMAIS de wave shimmer générique style Skeleton.io.

#### F.2 — Empty states (8 variants)

Lister 8 empty states cohérents, chacun = bloc dans le system block avec illustration + titre + sub + CTA :

| État | Illustration | Titre | Sub | CTA |
|------|-------------|-------|-----|-----|
| Aucune truie | Lucide Sprout 48px subtle | `Aucune truie` | `Ajoute ta première truie pour démarrer le suivi.` | + Ajouter une truie |
| Aucune bande active | line-art truie+porcelets | `Aucune bande active` | `Crée ta première bande pour suivre les naissances.` | + Nouvelle bande |
| Aucune loge | Lucide Home 48px | `Aucune loge configurée` | `Ajoute tes loges pour activer le suivi par bande.` | + Nouvelle loge |
| Aucun porcelet | line-art porcelets | `Aucun porcelet` | `Les porcelets apparaîtront automatiquement après mise-bas.` | (pas de CTA) |
| Aucune alerte | Lucide CheckCircle 48px success | `Carnet vide` | `Toutes les alertes sont traitées. Bonne tournée.` | (pas de CTA) |
| Aucune transaction | Lucide Banknote 48px subtle | `Aucune transaction` | `Saisis ta première vente ou achat pour démarrer le rapport financier.` | + Saisir transaction |
| Aucun fournisseur | Lucide Building2 48px | `Aucun fournisseur enregistré` | `Ajoute Sipra, ton vétérinaire, ou tout fournisseur récurrent.` | + Nouveau fournisseur |
| Aucun protocole | Lucide ClipboardList 48px | `Aucun protocole personnalisé` | `Les protocoles standards sont déjà disponibles dans Réglages.` | Voir Réglages |

**Pas d'image stock photographique systématique** — alternance entre icônes Lucide grand format `--pt-subtle` et illustrations line-art `--pt-primary` 2px (sobres, sans détail superflu).

#### F.3 — Error states (4 variantes)

1. **Erreur réseau (ConnectionError)** — pattern `card--ink` (alternative warm) avec icône WifiOff 32px ambre + titre `Hors-ligne` + sub `Tes saisies seront synchronisées au retour réseau.` + bouton ghost "Réessayer maintenant"
2. **Erreur 404 (entité introuvable)** — pattern `EntityNotFoundCard` existant à harmoniser : eyebrow type entité + titre Big Shoulders + sub explicatif + bouton primary "← Retour à la liste"
3. **Erreur 403 (RLS Supabase, accès refusé porcher)** — pattern `card` avec icône Lock 24px subtle + titre `Donnée réservée au propriétaire` + sub explicatif métier (`Demande à ton OWNER pour accéder aux finances détaillées.`) + bouton ghost "Demander accès"
4. **Erreur 500 (server)** — pattern `card--ink` warning + titre `Erreur côté serveur` + sub `Réessaie dans quelques minutes. Si le problème persiste, contacte support@porctrack.tech` + 2 boutons : "Réessayer" + "Marius peut t'aider"

#### F.4 — Toast notifications (3 variantes)

Position absolute bottom 16px au-dessus du BottomNav (84+16=100px du bottom). Largeur calc(100% - 32px), max 480px. Auto-dismiss 4s. Animation slide-up + fade-in 200ms ease.

- **Success** (fond `--pt-success` opaque, texte cream) : icône CheckCircle + texte (ex `Truie T-051 ajoutée`)
- **Warning** (fond `--pt-warning` opaque, texte cream) : icône AlertTriangle + texte (ex `Synchronisation différée — réseau faible`)
- **Error** (fond `--pt-danger` opaque, texte cream) : icône AlertOctagon + texte (ex `Échec sauvegarde — réessayer`)

Maximum 1 toast affiché à la fois (queue interne). Bouton "X" discret à droite optionnel pour dismiss manuel.

#### F.5 — Confirmation dialogs (IonAlert custom V70)

Quand on remplace `window.confirm()` natif. Modal centré (pas bottom sheet pour différencier du quick-add) :
- Backdrop `rgba(0,0,0,0.55)`
- Card cream 320px max-width, border-radius 18px, padding 22px
- Header : titre Big Shoulders 20px uppercase
- Body : Instrument Sans 14px ink, 2-3 lignes max
- Footer : 2 boutons en row (Annuler ghost à gauche · Action destructive `--pt-danger` à droite)

**Variants à montrer** :
- Déconnexion : `Se déconnecter ?` / `Tu reviendras au login. Tes données restent sauvegardées.` / `Annuler` `Se déconnecter`
- Suppression bande : `Supprimer bande Mai 2026 · T-016 ?` / `25 porcelets seront aussi supprimés. Action irréversible.` / `Annuler` `Supprimer définitivement`
- Marquage mortalité : `Marquer T-018 comme morte ?` / `Bande de la truie sera fermée automatiquement. Date du décès = aujourd'hui.` / `Annuler` `Confirmer décès`
- Réforme truie : `Marquer T-046 en réforme ?` / `Productivité insuffisante (3 portées, ISSE 7.2). À sortir cette semaine.` / `Annuler` `Confirmer réforme`

#### F.6 — Long press actions (mobile)

Sur les items de liste truies/bandes/porcelets, **long-press 500ms** ouvre un menu contextuel :
- Pattern **action sheet bottom** (cohérent avec quick-add mais plus petit)
- Header eyebrow type entité + nom + sub statut
- Liste 3-5 actions verticales : icône Lucide + label
- Bouton "Annuler" en bas

**Exemple porcelet long-press** :
- Header : eyebrow `PORCELET · CR-12`, titre mono `CR-12 · 4.8 kg · Sous mère`
- Actions : Peser (Scale) · Marquer mortalité (X) · Marquer vendu (Banknote) · Modifier (Pencil) · Voir fiche (ChevronRight)
- Annuler ghost

**Exemple truie long-press** :
- Header : `TRUIE · T-031`, titre `T-031 · Mâ Rose · Allaitante J34`
- Actions : Saisir évènement (Plus) · Marquer sortie (LogOut) · Modifier (Pencil) · Voir fiche (ChevronRight)
- Annuler ghost

### Groupe G — Bonus (3 variants)

#### G.1 — TopBar tablet/desktop (≥ 1024px)

Sur écran ≥ 1024px (iPad horizontal, desktop), le BottomNav mobile est masqué et remplacé par une **TopBar sticky** en haut. Pattern (réutilise déjà `.top-nav` du mockup `reglages-pilotage-mockup-v76.html`) :

- Brand mark à gauche : carré accent 28px + initiale "P" mono + texte "PORCTRACK 8" Big Shoulders uppercase 20px cream
- Divider vertical
- Sélecteur ferme courante (Yamoussoukro) chip mono uppercase
- Liens nav : Aujourd'hui (badge count) · Élevage · Repro · Performance · Réglages — eyebrow mono 11px uppercase, hover bg subtle
- Marius button "M" rond accent à l'extrême droite

Body content avec `max-width: 1240px` centré.

#### G.2 — Variant Aïssa coopérative multi-fermes

Sur Réglages racine + Today + Performance, quand l'user a `role=OWNER` ET `farms.length > 1`, afficher en haut **un sélecteur de ferme** :
- Chips horizontaux scrollables : Ferme A (10 truies) · Ferme B (24 truies) · Ferme C (8 truies) · Ferme D (15 truies) · `Toutes (consolidé)`
- Quand `Toutes` sélectionné, les KPIs s'agrègent (ex : Today affiche "57 truies · 4 fermes")
- Quand une ferme spécifique sélectionnée, l'app se "scope" sur cette ferme uniquement

Montrer les 2 états (Today scope ferme A · Today scope toutes-fermes consolidé).

#### G.3 — DataTable mode avancé

Pattern réutilisable activé par toggle "Mode avancé" dans Réglages. Utilisé sur :
- Performance KPIs (DataTable bandes : ISSE / Taux MB / NV / Mortalité / Marge)
- Reproduction Historique (DataTable bandes terminées)
- Finances (DataTable transactions)

**Pattern responsive** :
- **Desktop ≥ 1024px** : table HTML traditionnelle, sticky header, tri colonne (icône ChevronsUpDown), résize colonnes optionnel
- **Mobile < 1024px** : cards stackées avec en-têtes flottants. Chaque ligne = card cream avec eyebrow code + 4-5 KV (key mono uppercase 9.5px / value mono tabular-nums)

CTA "Exporter CSV" en haut droite (Lucide Download). Filtres chips en haut. Pagination 25/50/100 items en bas.

## Format livrable

**1 fichier HTML standalone** : `marius-patterns-bonus-mockup-v76.html`. Tous écrans dans le même fichier.

```html
<body>
  <nav>menu d'ancres</nav>
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

## Critères d'acceptance

1. ✅ Cohérence 100% avec mockups précédents
2. ✅ Anti-AI feel respecté
3. ✅ Marius : pas d'erreur technique exposée à l'utilisateur final
4. ✅ Patterns transverses : montre 3-5 variants côte à côte pour servir de référence d'implémentation
5. ✅ Empty states : 8 variants, alternance icônes / line-art (pas que des photos)
6. ✅ Skeletons : pas de wave shimmer générique
7. ✅ Toasts : auto-dismiss 4s, max 1 visible, position au-dessus BottomNav
8. ✅ Dialogs : modal centré (pas bottom sheet) pour différencier des quick-add
9. ✅ Long-press : action sheet bottom avec header eyebrow + nom entité + actions icon+label

## Décisions design attendues (3 minimum)

- **Marius bulles** : alignement droite/gauche avec fond coloré OU typographie pure avec eyebrow + texte (sans bulles) ?
- **Long press feedback haptique** : à indiquer comment le simuler visuellement (vibration → on annonce comment ?)
- **DataTable mobile** : cards stackées seules, ou bouton "Voir en mode tableau" force l'horizontal scroll ?
- **Toast empilement** : si multiples toasts en queue, comment les cycler (LIFO 1 visible OR stack vertical 3 max) ?
- **Empty state porcelets** : "Les porcelets apparaîtront automatiquement après mise-bas" — message neutre OK, ou ajouter un CTA "Voir les bandes en gestation" ?

## Effort dev attendu

Estimation jours dev React/Ionic Capacitor pour porter ce mockup. **Total cumulé estimé** depuis Mockup 1 = X jours pour 1 dev senior, hors backend. Top 3 priorités d'implémentation pour Yao. 2 zones d'hésitation détaillées.

## Note finale

Quand tu rends ce mockup, **ajoute en fin de fichier** un récapitulatif :
> ## Conclusion série v76
> 
> 4 mockups livrés (47+ écrans + system + transverses). DNA Terrain Vivant verrouillé.
> Effort dev cumulé estimé : ~X jours / 1 dev React/Ionic Capacitor, hors backend & QA terrain.
> Top 3 wins pour le produit : (...)

---

**Sortie attendue : ~2200-2700 lignes HTML, sous le seuil 30k tokens output.**
