# V71 Design Audit — 2026-05-05

> Persona : Christophe, éleveur naisseur-engraisseur, bottes + gants, Android sous plastique, 4G capricieux.
> Branche auditée : `claude/ecstatic-chebyshev-c72bdb` HEAD `1ebe49a` (V70.9).
> READ-ONLY — aucun code modifié.

---

## 1. Vue d'ensemble (verdict global)

| Dimension | Note /10 | Commentaire |
|---|---|---|
| Cohérence DS | 5/10 | Deux systèmes de tokens coexistent (`--color-accent-*` dans `index.css` et `--pt-*` dans `v70-tokens.css`). Les pages V70 ne consomment que `--pt-*`. Les fiches détail legacy (`TruieDetailView`, `BandeDetailView`) restent sur `--color-accent-*` + Ionic. Collision visible en prod : couleurs verte différentes entre BottomNav et fiches. |
| Lisibilité | 6/10 | `page-eyebrow` et `stat-label` à 10px/8px en plein soleil — illisibles (F3). Font `JetBrains Mono` déclarée dans `v70-global.css` lignes 15 et 277 mais absente des `@font-face` de `index.css` — Chromium fallback sur monospace système. |
| Workflows | 6/10 | Saisie saillie depuis Today → 3 taps minimum (Today → FAB Repro → Form). Hero Card Today hardcodé (`T-018` stub), pas branché FarmContext. Données stubs ≠ données réelles. |
| Pédagogie | 7/10 | Tooltip 15 termes fonctionnel, EduCard pertinente, EmptyEdu câblé sur Repro. Encyclopédie 10 articles navigable avec recherche. Mais EmptyEdu affiché TOUJOURS en bas de Repro (même quand data riche) — bruit pédagogique. |
| Mobile-first | 5/10 | `tab-mini` à `font-size: 10px` + `padding: 7px 12px` → hauteur estimée ~30px (F1). Dismiss alerte Today : bouton `padding: 4px 8px` → cible ~24px (F1). `btn-sm` : `padding: 6px 12px` → cible < 32px. |

---

## 2. Frictions persona (grille obligatoire)

| # | Écran | Action simulée | Observé | Friction | Gravité | Proposition fix:ligne |
|---|---|---|---|---|---|---|
| 1 | `/today` | Hero "Mise-bas imminente" — Christophe veut vérifier T-018 | `TodayV70.tsx:67` — `userName = 'Christophe'` et `Stat` truies = 50 hardcodés. FarmContext non branché sur Hero ni StatsGrid | F12 données fausses | P0 | `TodayV70.tsx:170-175` — remplacer stubs `Stat` par `truies.length`, `verrats.length`, `bandes.length` via `useFarm()` |
| 2 | `/today` | Acquitter une alerte | Bouton `✓` dismiss : `padding: 4px 8px` → cible estimée 24×24 px | F1 tap impossible | P0 | `TodayV70.tsx:157` — passer à `padding: 12px 14px` ou `minHeight: 44px` |
| 3 | `/today` | Saisir une saillie depuis Today | Pas de CTA saillie sur Today. Christophe doit naviguer → Repro → FAB → Form (3 taps). | F15 trop de clics | P1 | Ajouter action rapide "Nouvelle saillie" dans Section "À traiter" ou un second bouton dans Hero si bande applicable |
| 4 | `/troupeau` | Chercher truie "T-005" | Search input `TodayV70` non filtrant : `AnimalsV70.tsx:161-174` — input présent mais `onChange` absent, aucun filtrage sur la liste | F6 cherche pas trouve | P0 | `AnimalsV70.tsx:162` — câbler `onChange={(e) => setSearch(e.target.value)}` + filtrer `(realStubs[tab] ?? TAB_DATA[tab].stubs)` par `it.id.includes(search)` |
| 5 | `/troupeau` | Identifier une bande réelle | `AnimalsV70.tsx:119` — `id: b.id` (UUID brut ex. `3f4a-...`) dans ListItem title. UUID tronqué à 8 chars mais reste illisible | F12 données fausses | P1 | `AnimalsV70.tsx:119` — utiliser `b.idPortee ?? b.id.slice(0,6)` pour afficher le code métier |
| 6 | `/troupeau` | Filtres Truies "Pleines (28)" | Counts dans `AnimalsV70.tsx:185-210` hardcodés ("50", "28", "11", "6") — pas calculés depuis `truies` réelles | F12 données fausses | P1 | Calculer depuis `truies.filter(t => /pleine/.test(...))`.length après `useFarm()` |
| 7 | `/troupeau` | Tab "Loges" — tap sur Loge | `TAB_DATA.loges.species = 'bande'` (`AnimalsV70.tsx:83`) — EntityAvatar affiche une "bande" pour une loge. Incohérence visuelle | F12 | P2 | Ajouter species `'loge'` dans EntityAvatar ou mapper `loges` → `bande` species volontairement + commentaire |
| 8 | `/troupeau/truies/:id` | Lire la fiche truie | TruieDetailView reste legacy Ionic (IonPage/IonContent). Shell V70 (paddingBottom 80px, overflow scroll) + Ionic IonPage risque double-scroll | F1 / F15 | P1 | `V70Routes.tsx:152` — câbler fiche dans shell V70 natif (sans IonPage) ou forcer `height: auto; overflow: visible` sur IonPage parent |
| 9 | `/troupeau/truies/:id` | Retour vers liste | Pas de breadcrumb cliquable visible depuis TruieDetailView dans shell V70. Back = bouton natif Android. Si déeplink direct → back = exit app | F15 | P1 | `TruieDetailView.tsx` — le composant a un `TopBarSync` avec breadcrumb (`lineage`), vérifier qu'il render dans shell V70 sans être masqué par z-index |
| 10 | `/troupeau/bandes/:bandeId` | Naviguer bande → portée mère | `BandeDetailRouteV70.tsx:107` — `truie: bandeTyped.truie ?? null` passé à `BandeDetailView` mais si truie est UUID le lien nav n'est pas câblé dans V70 | F15 | P1 | `BandeDetailRouteV70.tsx:107` — vérifier que `bande.truie` est le `displayId` (T-001) et non UUID, puis câbler `navigate('/troupeau/truies/' + bande.truie)` |
| 11 | `/reproduction` | KPIs "Pleines/Materni/Vides/MB 7j" | `ReproV70.tsx:113-118` — valeurs 28/11/6/3 hardcodées, pas issues de FarmContext | F12 | P0 | Brancher `useFarm()` : `truies.filter(t => /pleine/.test(t.statut ?? '')).length` etc. |
| 12 | `/reproduction` | FAB Ajouter saillie | `ReproV70.tsx:253-268` — FAB `+` : `font-size: 28` mais pas de `minWidth/minHeight` 44px défini. La classe `fab` (v70-global.css) non consultée — risque cible < 44px | F1 | P1 | `v70-global.css:.fab` — confirmer `width: 56px; height: 56px` (standard FAB material), sinon ajouter inline |
| 13 | `/reproduction tab=historique` | Voir bandes terminées | Empty state "Voir toutes les bandes sur onglet Élevage › Bandes" (`ReproV70.tsx:229-242`). Lien dans un `button` style texte underline = cible ~12px | F1 | P1 | Remplacer par `<Button variant="secondary" size="sm">` pour cible ≥ 44px |
| 14 | `/reproduction` | EmptyEdu toujours affiché | `ReproV70.tsx:245-251` — `<EmptyEdu>` rendu inconditionnellement sous toutes les tabs, même quand Christophe a 12 bandes actives. Bruit cognitif | F7 vocabulaire / confusion | P2 | Conditionner `EmptyEdu` à `bandes.length === 0` ou uniquement sur tab 'historique' |
| 15 | `/performance` | Lire ISSE moyen | `PerformanceV70.tsx:123` — ISSE affiché `11.8` hardcodé. Tooltip ISSE présent et fonctionnel. Mais valeur pas calculée. | F12 | P0 | Brancher `perfKpiAnalyzer` ou moyenne `bandes.map(b => b.isse)` depuis FarmContext |
| 16 | `/performance` | Voir marge mensuelle | `PerformanceV70.tsx:196` — `+ 1 240 €` hardcodé. Devise `€` — si ferme ivoirienne = F14 (FCFA) | F14 devise + F12 données fausses | P0 | Lire `farm.currency` depuis FarmContext et afficher `+${marge} ${devise}`. Données calculées depuis `FinancesView` |
| 17 | `/performance tab=finances` | Imprimer PDF | `PerformanceV70.tsx:67-73` — `window.print()` déclenché après 100ms. `pdfHint` affiche un toast avec emoji `📥` en code. Toast non standard — pas de feedback visuel adapté sur mobile (print dialog = desktop behavior) | F2 submit silencieux | P2 | Remplacer par export CSV ou Share API natif mobile |
| 18 | `/reglages` | Lire nom ferme | `ReglagesV70.tsx:46` — `"Ferme audit test"` hardcodé dans hero. `useFarm().farm?.name` non branché | F13 identité ferme floue | P1 | `ReglagesV70.tsx:46` — `const { farm } = useFarm(); farm?.name ?? 'Ma ferme'` |
| 19 | `/reglages` | Naviguer vers "Mon équipe" | `ReglagesV70.tsx:68` — `onClick={() => navigate('/reglages/systeme')}`. Route `/reglages/systeme` charge `SettingsPage` (legacy) dans shell V70. Contexte de navigation cassé (back → /reglages OK mais visuel legacy) | F15 | P2 | Acceptable en V71. Planifier fiche équipe native V70 en V72 |
| 20 | `/reglages/encyclopedie` | Lire article "ISSE" | Article `02-isse-optimisation` visible dans liste. Recherche fonctionnelle (accent-insensible). Mais `EncyclopediaArticle` non audité — suspicion chargement fichier markdown absent | F2 | P1 | Vérifier que `docs/v70/educational-content/articles/02-isse-optimisation.md` existe et que `EncyclopediaArticle.tsx` parse correctement |
| 21 | `/reglages/encyclopedie` | Retour depuis article | `EncyclopediaPage.tsx:107-117` — bouton `← Retour` : classe `btn btn-ghost btn-sm`, `padding: 6px 12px` → cible ~28px | F1 | P1 | Passer à `btn` sans `btn-sm` ou ajouter `style={{ minHeight: 44px }}` |
| 22 | BottomNav | Identifier l'onglet actif | `BottomNav.tsx:22-27` — icônes sont des emojis unicode (`⌂`, `🐖`, `❤`, `📊`, `⚙`). Incohérent avec EntityAvatar SVG et Lucide dans fiches détail. Taille rendu emoji variable entre Android OEM (Samsung One UI vs stock Android) | F3 illisible + incohérence DS | P1 | Remplacer emojis par Lucide : `Home`, `PiggyBank`/`Beef`, `Heart`, `BarChart2`, `Settings` — taille fixe 22px, color `var(--pt-primary)` actif |
| 23 | BottomNav | Touch target tab | `v70-global.css` non consulté pour `.bn-item` — recherche nécessaire. La classe `bn-item` appliquée sur `<button>` sans height explicite dans `BottomNav.tsx`. Sans garantie de 44px. | F1 | P1 | Définir `.bn-item { min-height: 56px; flex: 1; }` dans `v70-global.css` |
| 24 | `/today` Hero Card | Emoji 🐖 en code | `TodayV70.tsx:92` — `<div className="hero-icon">🐖</div>`. Même page utilise aussi EntityAvatar dans d'autres composants. Incohérence DS | incohérence DS | P2 | Remplacer par `<EntityAvatar species="truie" size="sm" />` dans hero icon slot |
| 25 | `ReglagesV70` ListItem avatars | Emojis dans ListItem.avatar | `ReglagesV70.tsx:56-99` — tous les ListItem.avatar sont `<span style={{fontSize:20}}>🏠</span>` etc. Incohérent avec EntityAvatar + Lucide pattern | incohérence DS | P2 | Utiliser Lucide : `<Home size={20} />`, `<Users size={20} />`, `<Wheat size={20} />`, `<ClipboardList size={20} />`, `<BookOpen size={20} />`, `<GraduationCap size={20} />` |

---

## 3. Top 10 actions perfectionnement (priorité métier)

| # | Action | Phase | Effort | Impact persona |
|---|---|---|---|---|
| 1 | Brancher FarmContext sur Today (StatsGrid + Hero) | V72-data | 2h | P0 — Christophe voit ses vraies données dès l'ouverture |
| 2 | Câbler search bar AnimalsV70 (filtre live) | V72-data | 1h | P0 — trouver une truie en 1 tap |
| 3 | Brancher KPIs Repro depuis FarmContext (pleines/maternité) | V72-data | 2h | P0 — KPIs vrais = confiance éleveur |
| 4 | Brancher ISSE + marge depuis perfKpiAnalyzer / FinancesView | V72-data | 3h | P0 — Performance utilisable |
| 5 | Remplacer emojis BottomNav par Lucide 22px | V72-design | 1h | P1 — Cohérence DS + lisibilité OEM Android |
| 6 | Agrandir touch targets : dismiss alerte / btn-sm / retour encyclopédie | V72-a11y | 1h | P1 — Frustation bottes/gants |
| 7 | Afficher `farm.name` dans ReglagesV70 hero | V72-data | 20min | P1 — Identité ferme correcte |
| 8 | Utiliser `b.idPortee` pour afficher codes bandes (pas UUID) | V72-data | 30min | P1 — IDs lisibles terrain |
| 9 | Conditionner EmptyEdu Repro à `bandes.length === 0` | V72-ux | 20min | P2 — Moins de bruit pédagogique |
| 10 | Remplacer emojis ListItem Réglages par Lucide | V72-design | 30min | P2 — Cohérence DS totale |

---

## 4. Quick wins V72 (< 30 min chacun)

1. **`ReglagesV70.tsx:46`** — `farm?.name ?? 'Ma ferme'` au lieu de `"Ferme audit test"` hardcodé.
2. **`TodayV70.tsx:170-175`** — `useFarm()` pour `Stat` value truies/verrats/porcelets/bandes (4 lignes).
3. **`ReproV70.tsx:245`** — `{bandes.length === 0 && <EmptyEdu ... />}` pour supprimer bruit pédagogique.
4. **`TodayV70.tsx:149-160`** — dismiss button : `padding: 12px` + `minHeight: 44px` pour touch target.
5. **`AnimalsV70.tsx:119`** — `id: b.idPortee ?? b.id.slice(0,8)` pour codes métier lisibles.
6. **`EncyclopediaPage.tsx:109`** — remplacer `btn-sm` par `btn` (taille normale) sur bouton Retour.
7. **`v70-global.css`** — vérifier `.fab { width: 56px; height: 56px; }` existe et est correct.
8. **`ReproV70.tsx:113-118`** — remplacer stubs statiques par `useFarm().truies.filter(...)`.length.
9. **`BottomNav.tsx:22-27`** — remplacer `⌂` par icône textuelle neutre en attendant Lucide V72.
10. **`ReglagesV70.tsx:89`** — `"5 articles"` → `"${ARTICLES.length} articles"` (import depuis EncyclopediaPage ou constante partagée).

---

## 5. Long terme V73+ (refonte structurelle)

1. **Fusion DS `--pt-*` + `--color-accent-*`** : une seule couche de tokens. Les fiches détail legacy (`TruieDetailView`, `BandeDetailView`) restent sur l'ancien système. Plan de migration : wrapper les fiches dans un `<div style="--pt-primary: var(--color-accent-500)">` en attendant la réécriture complète.

2. **Fiches détail V70 natives** : `TruieDetailView` et `BandeDetailView` sont des composants legacy Ionic (IonPage/IonContent) montés dans le shell V70 natif. Double-scroll et z-index conflicts sont structurels. V73 devrait livrer `TruieDetailV70.tsx` sans Ionic.

3. **Saisie saillie en 2 taps depuis Today** : l'architecture actuelle nécessite Today → Repro → FAB → Form. Objectif V73 : QuickSaillieForm accessible directement depuis Today si une truie est en fenêtre de saillie (deep link contextuel).

4. **JetBrains Mono manquante** : `v70-global.css` déclare `font-family: 'JetBrains Mono', monospace` pour `.page-eyebrow` et `.list-title`, mais aucun `@font-face` dans `index.css`. Fallback silencieux sur monospace système. Soit ajouter la font (coût bundle ~30KB woff2), soit remplacer par `DMMono` déjà chargé.

5. **Mode offline** : `TodayV70` charge des stubs statiques — aucune intégration `offlineCache` / `kvStore`. En 4G capricieux porcherie béton, Christophe verra toujours les stubs plutôt que les vraies données mises en cache. V73 : câbler `offlineCache.getTruies()` comme fallback.
