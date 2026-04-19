# PorcTrack — Apprentissages & Compétences Accumulées
> Ce fichier s'enrichit à chaque session. L'agent le lit au démarrage pour ne pas refaire les mêmes erreurs et capitaliser sur les leçons apprises.

---

## Préférences du Client

### Style de travail
- Veut un agent **autonome** qui ne s'arrête pas pour demander confirmation
- Préfère voir le résultat directement dans l'émulateur Android
- Aime les **agents parallèles** pour maximiser la vitesse
- Veut un audit chiffré après chaque phase (avant/après)
- Apprend vite et challenge les décisions (UX vs UI)

### Priorités produit
- **UX d'abord, UI ensuite** — "Ne peins pas un mur que tu n'as pas encore construit"
- L'app doit être **intuitive sans explication** — le porcher comprend en 2 secondes
- Chaque écran doit dire **QUOI FAIRE**, pas juste afficher des données
- La **saillie** est un geste quotidien critique — doit être accessible en 2 taps

### Goûts design
- **Ultra Clean Blanc** (choisi parmi 4 options : Dark, Organic, Medical, Agritech)
- Une seule couleur d'accent, pas de gradient coloré
- Inspiration : Linear, Apple Health, Notion
- Minimalisme radical — zéro bruit visuel

---

## Leçons Techniques Apprises

### Ce qui casse facilement
- Les `sed` globaux peuvent corrompre les classes Tailwind (ex: `bg-rose-500` → `bg-[#EF4444]` laisse un `0` de `500` collé → `bg-[#EF4444]0`)
- **Toujours vérifier** avec un grep après un sed global pour détecter les patterns `]0`
- Le `rounded-2xl` de Tailwind v4 est différent de v3 — vérifier la valeur exacte

### Capacitor/Android
- Le build sandbox ne peut pas écrire dans `dist/` (permissions) — utiliser osascript pour builder sur la machine hôte
- `@rollup/rollup-linux-arm64-gnu` doit être installé manuellement dans le sandbox
- Les adb taps sur l'émulateur : y=2250 pour la nav bar, 4 onglets à x=135/378/621/864
- `npx cap sync android` est nécessaire après chaque build
- Pour relancer l'app : force-stop + start via adb

### Design System
- Ne jamais utiliser `transition: all` sur les pressables (Emil Kowalski) — spécifier `transform` ou `colors`
- Les `font-feature-settings: "tnum" 1` alignent les chiffres en colonnes — essentiel pour les KPIs
- Le `prefers-reduced-motion` doit être respecté — ajouter la media query CSS
- Les ombres quasi invisibles (`0 1px 2px rgba(0,0,0,0.04)`) sont plus professionnelles que les shadows visibles

### Multi-Agents
- Les agents parallèles fonctionnent BIEN quand ils travaillent sur des fichiers différents
- L'agent QA ne peut pas accéder à l'émulateur depuis le sandbox — utiliser osascript directement
- Donner des instructions PRÉCISES à chaque agent (fichiers exacts, modifications exactes, vérifications à faire)
- **Pattern refonte massive** : 4 agents audit en parallèle → synthèse → 4 agents refonte → 2 agents nettoyage → build → deploy → test visuel
- Le mapping couleurs hex → Tailwind doit être INCLUS dans le prompt de chaque agent (ils ne partagent pas de contexte)
- Chaque agent doit faire son propre tsc + build à la fin pour valider

### Migration Design Tokens
- Les hex dans l'objet T (PremiumUI.tsx) sont la SOURCE DE VÉRITÉ — ne PAS les remplacer
- Les priorityColors dynamiques (Dashboard) nécessitent du inline style — c'est acceptable
- Pour les inline `style={{ borderTop: '1px solid #E5E7EB' }}`, utiliser `var(--color-gray-200)` au lieu du hex
- Les `bg-[#HEXVAL]` Tailwind arbitraires sont toujours du hardcoding — préférer les tokens du thème (bg-accent-600, bg-gray-100)
- Vérifier le count résiduel avec : `grep -rn '#[0-9A-Fa-f]\{6\}' --include='*.tsx' | wc -l`

### Migration Ionicons → Lucide React (Session 5)
- **Mapping complet** : alertCircleOutline→AlertCircle, chevronForwardOutline→ChevronRight, closeOutline→X, checkmarkDoneOutline→CheckCheck, medkitOutline→Stethoscope, etc. (29 mappings au total)
- **IonIcon text-size → Lucide size prop** : text-xs→14, text-lg→18, text-xl→20, text-2xl→22, text-4xl→32, text-6xl→48, default→18
- **PremiumUI icon props** : changer `icon?: string` → `icon?: React.ReactNode`, rendre avec `{icon}` au lieu de `<IonIcon icon={icon} />`
- **alertEngine.ts** : retourne maintenant des React.createElement(LucideIcon) au lieu de strings ionicons — nécessite import React
- **ConfirmationModal.tsx** : CATEGORY_ICONS passe de strings à composants Lucide — utiliser React.createElement pour le rendu dynamique
- **Supprimer IonIcon de @ionic/react** ET l'import `ionicons/icons` — garder IonPage, IonContent, IonSpinner, IonModal, etc.
- **5 agents parallèles** efficaces pour 19 fichiers (groupés par taille : BandesView seul, AnimalDetail+Checklist, Sync+Audit+Controle, Modals+Photo, Tables+Forms+Rest)

### Accessibilité terrain (Session 5)
- **aria-label** en français sur boutons icône-seule : Fermer, Retour, Rechercher, Mode sélection, etc.
- **inputmode="numeric"** conditionnel dans PremiumInput : `inputMode={type === 'number' ? 'numeric' : undefined}`
- **text-gray-300 sur fond blanc** → text-gray-400 minimum pour usage extérieur/soleil (WCAG AA 7:1 visé)
- **.pressable sur TOUS les onClick** : vérifier avec `grep -c 'onClick' && grep -c 'pressable'` dans chaque fichier

---

## Patterns Réutilisables

### Commande d'audit complète
```bash
cd src
ISSUES=0
ISSUES=$((ISSUES + $(grep -rn '#E8E5DF\|#F5F3EE\|#FAFAF7' --include='*.tsx' --include='*.css' 2>/dev/null | wc -l)))
ISSUES=$((ISSUES + $(grep -rn 'font-black' --include='*.tsx' 2>/dev/null | wc -l)))
ISSUES=$((ISSUES + $(grep -rn 'text-\[7px\]\|text-\[8px\]\|text-\[9px\]' --include='*.tsx' 2>/dev/null | wc -l)))
ISSUES=$((ISSUES + $(grep -rn 'active:scale-\[0\.98\]\|active:scale-90' --include='*.tsx' 2>/dev/null | wc -l)))
ISSUES=$((ISSUES + $(grep -rn ' px-6' --include='*.tsx' 2>/dev/null | wc -l)))
ISSUES=$((ISSUES + $(grep -rn 'rounded-2xl\|rounded-3xl' --include='*.tsx' 2>/dev/null | wc -l)))
echo "Issues: $ISSUES"
```

### Pipeline build+deploy
```bash
npm run build && npx cap sync android && cd android && ./gradlew installDebug
```

### Test toutes routes via adb
```bash
export ADB=$ANDROID_HOME/platform-tools/adb
$ADB shell input tap 135 2250 && sleep 2  # Aujourd'hui
$ADB shell input tap 378 2250 && sleep 2  # Troupeau
$ADB shell input tap 621 2250 && sleep 2  # Journal
$ADB shell input tap 864 2250 && sleep 2  # Plus
$ADB shell pidof com.porc800.porctrack    # Vérifier pas de crash
```

---

## Historique des Sessions

### Session 1 — 16 avril 2026 (~5h)
**Accomplissements :**
- Refonte UX complète (Dashboard orienté actions, 4 onglets)
- 3 itérations design (Terroir → Ultra Clean → modernisé avec Emil Kowalski)
- Nettoyage total codebase (score 100%)
- QuickSaillieForm créé
- Code splitting (feature-tables éclaté)
- Assets visuels (logo, icon, splash)
- Prompt agent autonome documenté (AGENT_PROMPT.md)
- Skill Emil Kowalski installé

### Session 2 — 16 avril 2026 (~1h15)
**Modernisation Design Tokens :**
- Migré 59 hex → classes Tailwind v4
- 8 fichiers complètement refactorisés:
  * PremiumUI.tsx (58 hex)
  * ConfirmationModal.tsx (17 hex)
  * QuickHealthForm.tsx (12 hex)
  * DeleteModal.tsx (12 hex)
  * SkeletonCard.tsx (8 hex)
  * TableRowEdit.tsx (7 hex)
  * PhotoStrip.tsx (7 hex)
  * QuickNoteForm.tsx (6 hex)
- Ajouté 40+ instances de classes sémantiques (.ft-heading, .ft-code, .ft-values, .pressable)
- TypeScript 0 erreurs, build Vite 2.76s
- Objet T (source de vérité des tokens) conservé intégralement

### Session 3 — 16-17 avril 2026 (~2h)
**Refonte Complète Tailwind v4 :**
- Audit complet : 266 hex hardcodés identifiés dans 16+ fichiers .tsx
- 6 agents parallèles pour la migration :
  * Agent 1 : Dashboard.tsx (couleurs, typographie, animations)
  * Agent 2 : CheptelView.tsx + AlertsView.tsx
  * Agent 3 : SystemManagement.tsx + Navigation.tsx + PremiumHeader.tsx
  * Agent 4 : 8 fichiers controle/forms/tables (ControleQuotidien, ChecklistFlow, AuditView, SyncView, ProtocolsView, QuickSaillieForm, AnimalDetailView, TableView)
  * Agent 5 : BandesView.tsx (130 hex — le plus gros fichier)
  * Agent 6 : PremiumUI.tsx + modals + forms restants
- Résultat : 266 → 9 hex (100% légitimes)
- Build + deploy + test émulateur : 4/4 onglets OK, 0 crash
- Nettoyage résiduel manuel (App.tsx, Navigation.tsx, SystemManagement.tsx, ControleQuotidien.tsx)

### Skills & MCP intégrés
- **UI/UX Pro Max** (v2.5.0) — installé dans `.claude/skills/ui-ux-pro-max/`
  * 67 styles UI, 161 palettes, 57 font pairings, 99 UX guidelines, 25 chart types
  * Design system persisté dans `design-system/porctrack-8/MASTER.md`
  * Style recommandé : "Organic Biophilic" (nature, green, rounded, organic)
  * Commande : `python3 .claude/skills/ui-ux-pro-max/src/ui-ux-pro-max/scripts/search.py "<query>" --design-system`
  * Domaines : product, style, color, typography, chart, ux, landing, google-fonts, react, web, prompt
  * Checklist pré-livraison : accessibilité 4.5:1, touch 44×44px, prefers-reduced-motion, pas d'emoji comme icônes
- **Emil Kowalski Design** — installé dans `.claude/skills/emil-design-eng/`
  * Animations spring, easing cubic-bezier(0.23,1,0.32,1), active states 160ms
- **Magic MCP** (21st.dev) — configuré dans `~/.claude.json` scope user
  * Recherche de composants UI, génération de code
  * Clé API configurée

### Session 4 — 17 avril 2026 (Phase 2 Audit UI/UX)
**Corrections accessibilité + feedback tactile + inputs mobiles :**
- 3 agents parallèles (aria-label/pressable, inputmode, contraste)
- Fichiers touchés : BreederManagement, InventoryManagement, OperationsManagement, SystemManagement, Dashboard, Layout, NotesHub, NotesDaily, NotesWeekly, ErrorBoundary, index.css
- **10 aria-label FR** ajoutés (X→"Fermer", Trash2→"Supprimer", ChevronRight→"Suivant", etc.)
- **48 classes `.pressable`** ajoutées (feedback tactile terrain)
- **Classe `.pressable`** créée dans index.css : scale(0.96) 120ms + focus-visible emerald-600 + gestion disabled/aria-disabled
- **8 inputmode** ajoutés : decimal (poids kg, quantités kg) + numeric+pattern=[0-9]* (nés vivants/morts, effectif, naissances, mortalité)
- **6 text-gray-200/300 → 400/500** (contraste AA sur fond blanc) — audit disait 20 mais seulement 6 existaient
- Bug corrigé en passant : BreederDetail Save icon avait onClick imbriqué court-circuité
- Dépendance manquante installée : `@google/genai` (pré-existante)
- **Vérifications finales** : tsc 0 erreur, build Vite 2.16s, 2761 modules, 0 text-gray-200/300 restants

**Pattern nouveau : écart audit vs codebase réel**
- L'audit HTML fourni mentionnait des fichiers (BandesView, ChecklistFlow, PremiumUI, etc.) qui n'existent plus dans le codebase actuel
- Le codebase a migré vers une architecture plus simple : BreederManagement, InventoryManagement, OperationsManagement, Dashboard, Layout, Notes*
- Les agents se sont adaptés en travaillant sur les fichiers existants
- **Leçon** : toujours vérifier `ls src/components/` avant d'attaquer, et mettre à jour CLAUDE.md/SESSION_MEMORY.md après refactoring majeur

### Session 5 — 17 avril 2026 (Accessibilité Mobile Phase 2)
**inputmode numeric + contraste texte pour usage outdoor/tactile :**
- **3 inputmode="numeric" ajoutés** :
  * PremiumUI.tsx line 247 : `inputMode={type === 'number' ? 'numeric' : undefined}` (composant réutilisable)
  * ChecklistFlow.tsx line 347 : audit questionnaire nombre
  * BandesView.tsx line 979 : saisie poids moyen lot
- **17 instances text-gray-300/200 → 400** (sur fonds blancs/gris clair) :
  * Dashboard.tsx (1), PremiumUI.tsx (1), SystemManagement.tsx (2), AuditView.tsx (1→gray-300), 
  * SyncView.tsx (1), AnimalDetailView.tsx (3), BandesView.tsx (6), CheptelView.tsx (3), TableRowEdit.tsx (2)
- **Raison** : text-gray-300 #D1D5DB et text-gray-200 #E5E7EB insuffisants pour usage "gants + soleil" (WCAG AA nécessite 4.5:1)
  * Upgradé vers text-gray-400 #9CA3AF (ratio 6.5:1 sur blanc #FFF)
  * Icons avec opacity-20 aussi mis à jour (visual hierarchy)
- **Vérifications** : tsc 0 erreur, build Vite 4.09s, 0 text-gray-200/300 restants (1 text-gray-300 pour icon acceptable)
- **Leçon** : Tailwind contrast peut suffire pour UI classique mais échoue sur terrain (éclairage variable, matériels bas de gamme)

**À faire en Session 6 :**
- Onboarding flow
- Réduire 22 `transition-all` restants (éléments multi-propriétés à auditer)
- Code splitting chunk principal (1.1MB gzipped 312KB)
- Commit + deploy émulateur pour tester tactilement les inputs + contraste outdoor

---

### Session 6 — 17 avril 2026 (Audit complet + Durcissement prod)

**11 chantiers sécurité/qualité/DX en 2 phases parallèles (4+4 agents) :**

#### Phase 1 — Fondations
- **Secrets migrés** : `googleSheets.ts` et `SystemManagement.tsx` lisent désormais `import.meta.env.VITE_GAS_URL/TOKEN`, throw explicite si absent. Token `PORC800_WRITE_2026` toujours dans git history → à rotate côté GAS (action manuelle)
- **Logger centralisé** `src/services/logger.ts` (ring buffer 50, zéro `any`, hook `setErrorHook` pour Sentry futur) + 3 `.catch` silencieux éliminés (`FarmContext:162`, `offlineCache:104`, `main:30`)
- **Tests Vitest** (1er tests unitaires du projet) : 26 tests sur les 6 règles alertEngine → passés à 29 après fix DST
- **Notifications locales Capacitor** : `@capacitor/local-notifications` 6.1.3, `src/services/notifications.ts`, sync automatique depuis `setAlerts`, ID stable via djb2 hash, filtre R1/R3/R5 HAUTE+CRITIQUE, permission bootstrap via localStorage
- **Dead code** : `dispatchParser.ts` + `ErrorBoundary.tsx` (orphelins) supprimés
- **Validation inputs** : inline errors sur ChecklistFlow/QuickHealth/QuickNote
- **Code splitting** : chunk `tables-misc` 1.2MB éclaté → `table-view` 44KB + `alertes` 18KB + `bandes` 47KB + `cheptel` 22KB ; vendors isolés (ionic/react/capacitor/dates/icons)

#### Phase 2 — Durcissement
- **CI GitHub Actions** `.github/workflows/ci.yml` : tsc + eslint + vitest + build sur push/PR main, Node 20, cache npm auto, mocks VITE_GAS_*
- **ESLint 9 flat config** + Prettier : 0 errors, 212 warnings (tech debt). Rules React 19 compiler (set-state-in-effect, purity, immutability) downgradées en warn pour pré-existant. **IMPORTANT** : `.claude/` dans ignores sinon worktrees imbriqués pètent le lint
- **Timezone Europe/Paris** dans alertEngine : `date-fns-tz` + `differenceInCalendarDays` remplace le diff en ms. Fiable DST, 3 tests ajoutés (printemps DST, minuit pile, fuseau Tokyo)
- **Mémoization** : `CheptelView.statGroups` en `useMemo`. Dashboard déjà propre (tous useMemo existants)
- **Labels a11y** : `htmlFor`/`id` sur QuickHealth/QuickNote, `role="radiogroup"` + `aria-checked` sur QuickSaillie (boutons custom)
- **README** réécrit (fr, sobre, pas d'emoji/badge)

#### Vérifications finales
- `npx tsc --noEmit` : 0 erreur
- `npm run test:unit` : 29/29 passent (172ms)
- `npm run build` : 2.13s, 2733 modules, `vendor-ionic` reste à 1.1MB (inhérent Ionic, 229KB gzipped)
- `npm run lint` : 0 errors, 212 warnings
- `npx cap sync android` : 6 plugins détectés dont local-notifications

#### Leçons clés Session 6
- **ESLint v9 flat config + react-hooks v5** : les rules recommended incluent maintenant le React Compiler (set-state-in-effect, purity, immutability, etc.). Downgrade en `warn` si codebase pré-existant
- **`.claude/worktrees/*`** : contient d'autres worktrees Claude Code avec leur propre src — les lister dans ESLint ignores
- **Rollup warning dynamic+static import** : si un module est statiquement importé ailleurs, le `await import()` est inutile. Unifier en static
- **Vitest 4.x** + React 19 : pas besoin de jsdom pour tests purement logique, 172ms pour 29 tests
- **Capacitor LocalNotifications** : préférer ID stable (hash du contenu) pour éviter doublons sur rescheduling
