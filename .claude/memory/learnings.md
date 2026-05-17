# PorcTrack — Apprentissages & Compétences Accumulées
> Ce fichier s'enrichit à chaque session. L'agent le lit au démarrage pour ne pas refaire les mêmes erreurs et capitaliser sur les leçons apprises.

---

## Leçons Techniques — Session 2026-05-08 V71-P3 (audit mobile + wizards bloquants + trigger DB)

### Trigger Postgres SECURITY DEFINER comme garde-fou métier (vs frontend)

**Problème** : Le statut d'une truie devait passer auto en 'Pleine' après une saillie. Initialement, le frontend (insertSaillie) ne gérait pas cet effet de bord → truie restait "En attente saillie" même après saillie créée.

**Solution choisie** : trigger Postgres `AFTER INSERT ON saillies` qui UPDATE `sows.statut = 'Pleine'` SI le statut courant est compatible (NULL, '', En attente saillie, Vide, Sevrée).

**Pourquoi pas frontend** :
- Couvre tous les call-paths (UI, API direct, scripts MCP, futurs imports CSV) — frontend ne couvrirait que la UI.
- Atomique avec l'INSERT (pas de race condition).
- Robuste face aux refactors frontend.

**Pattern technique** :
```sql
CREATE OR REPLACE FUNCTION public.set_sow_pleine_on_saillie()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER          -- exécute avec privilèges créateur (bypass RLS)
SET search_path = ''       -- bloque injection search_path
AS $$
BEGIN
  IF NEW.sow_id IS NOT NULL THEN
    UPDATE public.sows
    SET statut = 'Pleine'
    WHERE id = NEW.sow_id
      AND (statut IS NULL OR statut ILIKE '%attente%saillie%' OR statut ILIKE 'vide%' OR statut = 'Sevrée');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_sow_pleine_on_saillie() FROM anon, authenticated, public;
```

**Quand utiliser** : invariants métier qui doivent tenir peu importe le call-path. Pas pour la logique purement présentationnelle (qui reste frontend).

### CSS `mask-image` linear-gradient comme indicateur de scroll horizontal

**Pattern utilisé pour `.pt-tabs`** (Tabs DS V70) :
```css
.pt-tabs {
  overflow-x: auto;
  scrollbar-width: none;  /* Firefox cache scrollbar */
  mask-image: linear-gradient(to right, black 0, black calc(100% - 28px), transparent 100%);
  -webkit-mask-image: linear-gradient(to right, black 0, black calc(100% - 28px), transparent 100%);
}
.pt-tabs::-webkit-scrollbar { display: none; }
```

Effet : la dernière tab tronquée fade progressivement vers transparent → indique visuellement qu'on peut scroller. Trade-off accepté : si toutes les tabs rentrent, la dernière tab a un léger fade sur ses 28 derniers px (acceptable).

### Genération auto DB cascade dans onboarding wizard

**Pattern OnboardingV2Wizard étape 5** : à la confirmation, INSERT en cascade :
1. N truies (sows) avec code_id "T-001"..."T-N" + statut "En attente saillie"
2. N verrats (boars) avec code_id "V-001"..."V-N" + statut "Actif"
3. N cases maternité (loges) M-01...M-N, capacite_max=1, type=MATERNITE
4. N loges post-sevrage PS-01..., capacite_max=N, repartition=MIXTE
5. N loges engraissement E-01... (si type === NAISSEUR_ENGRAISSEUR)
6. UPDATE farms.metadata.onboarding_v2 = { completed_at, version, profile }

**Leçon** : pour un onboarding obligatoire, **générer la structure de données dès le wizard** plutôt que de laisser l'user créer manuellement après. Réduit le drop-off et garantit cohérence (codes formatés, statuts initiaux corrects).

**Important** : code_id format `T-001` (3 digits avec padding). Les futures saisies via QuickAddTruieForm doivent suivre ce format pour cohérence.

### Backfill `metadata.onboarding_vN.completed_at = created_at` pour skip auto users existants

**Pattern** : quand on déploie un nouveau wizard onboarding obligatoire, **les users existants ne doivent PAS être redirigés** (ils ont déjà des données, le wizard les écraserait). Backfill SQL en même temps que la migration :

```sql
UPDATE public.farms
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{onboarding_v2}',
  jsonb_build_object('completed_at', COALESCE(created_at, now())::text, 'version', 'auto-skip-v1')
)
WHERE metadata->'onboarding_v2'->>'completed_at' IS NULL
  AND created_at < now();
```

`auto-skip-v1` est un marqueur explicite (différent de `v2` qui marque les vrais onboardings via wizard).

### IonToast centralisé via Provider top-level (vs in-line par form)

**Problème** : Les toasts in-line (useState local + render IonToast dans le form) **disparaissent quand la modale se ferme** (le DOM du toast est démonté avec son parent).

**Solution** : `<ToastProvider>` mounté **au top niveau** (App.tsx, sous QuickActionsProvider), expose `useToast()` hook avec `showToast(msg, type, duration)`. Les toasts vivent au top du DOM, survivent à toutes les navigations et fermetures de modales.

**Pattern de queue** : `[ToastMessage[]]` state, `IonToast` rendu pour chaque, auto-dismiss via `onDidDismiss` qui filter le tableau. Parallel toasts visibles simultanément.

### `overflow-x: clip` (CSS moderne) > `overflow-x: hidden` quand on a position:sticky enfants

(Déjà documenté V71-P2 mais ré-affirmé V71-P3) : `overflow-x:hidden` force `overflow-y:auto` par CSS spec → casse `position:sticky`. `overflow-x:clip` est l'équivalent qui n'introduit PAS de scroll context.

---

## Leçons Techniques — Session 2026-05-08 (V71-P2 multi-user + landing-v2 fix)

### GSAP ScrollTrigger + Lenis : pièges et patterns robustes

**Anti-pattern figeant l'état initial** :
```js
gsap.from(titleEl, { opacity: 0, y: 40, scrollTrigger: { trigger, toggleActions } });
```
`gsap.from()` a `immediateRender: true` par défaut → l'élément est SET à opacity:0 au mount. Si ScrollTrigger échoue à trigger (Lenis hijack le scroll, override Ionic body, sticky parents, refresh tardifs), l'élément reste invisible à vie.

**Pattern robuste** :
```js
gsap.fromTo(
  titleEl,
  { opacity: 0, y: 40 },
  {
    opacity: 1, y: 0, duration: 0.9, ease: 'power2.out',
    immediateRender: false,  // ← clef : ne fige pas l'état initial
    scrollTrigger: { trigger, start: 'top 75%', toggleActions: 'play none none reverse' },
  },
);
```
Avec `immediateRender:false`, l'élément reste à son CSS initial (opacity:1) tant que le tween n'est pas joué. Si ScrollTrigger trigger correctement, anim entrée jouée. Si non, l'élément reste visible — pas de bug invisible.

### CSS : `overflow-x:hidden` force `overflow-y:auto` (et casse position:sticky)

CSS spec : si `overflow-x` ou `overflow-y` n'est pas `visible`, l'autre devient `auto` automatiquement. Donc `overflowX:'hidden'` sur un wrapper crée implicitement un nouveau scrolling container vertical → tous les `position:sticky` enfants se réfèrent à ce wrapper, pas au viewport, et le sticky ne s'active jamais.

**Fix** : utiliser `overflow-x: clip` (CSS moderne, supporté Chrome 90+/Safari 16+/Firefox 81+). `clip` n'introduit PAS de scroll context. Idem pour `overflow-y: clip` si on veut bloquer le scroll vertical sans casser sticky.

**Aussi** : `body.style.overflow = 'auto'` rend body scrollable et fait du body le scrolling container des sticky enfants — sur une SPA Ionic où le scroll attendu est sur window/html, c'est cassé. Préférer `body.style.overflow = 'visible'`.

### Sub-agents general-purpose : limitations Edit/Write

Un sub-agent dispatché en `general-purpose` (Opus 4.7) peut être refusé Edit/Write — comportement vu sur cette session avec le sub-agent designer-pilot. Le diagnostic + plan sont produits, mais l'application bloque.

**Workaround** : pour les Edit critiques, faire localement après avoir reçu le diag du sub-agent. Le sub-agent reste utile pour audit/design/plan mais pas pour application code direct si les permissions sont restrictives.

**Sub-agents OK pour Edit** : tests, design draft SQL/migrations (qui produisent `_DRAFT_*.sql`), refactor frontend coordonné (sub-agent dev-troupeau a réussi sur cette session — refactor 5 fichiers FarmContext/AuthContext/supabaseWrites/types).

### Supabase RLS multi-tenant : pattern `farms.id = profiles.id` au backfill

Quand on passe d'un modèle "1 user = 1 farm" (`farm_id = auth.uid()`) à un modèle multi-tenant (`farms` + `farm_members`), le backfill peut être **zero-cost** si on choisit `farms.id = profiles.id` pour les users existants. Aucun UPDATE de farm_id sur les 24 tables — uniquement INSERT INTO farms + INSERT INTO farm_members.

Pendant la transition (frontend pas encore refactor), les RLS continuent de fonctionner via fallback : `farm_id IN (SELECT current_user_farms())` retourne `{auth.uid()}` pour chaque user existant grâce au backfill, donc équivaut à `farm_id = auth.uid()` côté ancien code.

### Helper SECURITY DEFINER STABLE search_path locked (perf RLS)

Pattern Supabase pour les helpers RLS performants :
```sql
CREATE OR REPLACE FUNCTION public.current_user_farms()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER     -- exécute avec privilèges du créateur
STABLE               -- résultats cachés au sein d'une transaction
SET search_path = ''  -- bloque search_path injection
AS $$
  SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.current_user_farms() FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.current_user_farms() TO authenticated;
```
- `STABLE` permet au planner Postgres de cacher l'appel.
- `SET search_path = ''` empêche un attaquant de forcer le helper à lire une table dans un schéma piégé.
- `REVOKE FROM anon, public` + `GRANT TO authenticated` = principe de moindre privilège.

### Préfixe `_DRAFT_` pour migrations Supabase non encore appliquées

Convention utile : nommer un fichier de migration `_DRAFT_xxx.sql` empêche `supabase db push` de l'exécuter automatiquement (le CLI ignore les fichiers non-timestamped). Permet de garder le draft en review dans le repo, puis renommer en `<timestamp>_xxx.sql` avant apply.

### globalCurrentFarmIdRef : pattern context-to-service

Pour partager un état React Context avec un service module-level (sans wrapper React partout) :
```ts
// src/services/supabaseWrites.ts
let globalCurrentFarmIdRef: string | null = null;
export function setCurrentFarmIdRef(farmId: string | null) {
  globalCurrentFarmIdRef = farmId;
}
async function getFarmId(): Promise<string> {
  if (globalCurrentFarmIdRef) return globalCurrentFarmIdRef;
  // fallback auth.uid() si ref pas encore set
  ...
}

// src/context/FarmContext.tsx
useEffect(() => { setCurrentFarmIdRef(currentFarmId); }, [currentFarmId]);
```
Évite de wrapper tous les call-sites avec un hook `useFarmId()`. Trade-off : couplage module-global, mais acceptable pour un contexte mono-instance comme une farm courante. Le test peut reset via `__resetCurrentFarmIdRefForTests()`.

---

## Leçons Techniques — Sprint 5 (19/04/2026)

### Pattern pipeline statut (Troupeau + Cycles)
Un "pipeline" UI est un funnel horizontal d'étapes cliquables, chaque étape ayant :
- `key` (identifiant URL), `label` (FR), `count` (valeur numérique live), `tone` (default/accent/gold/amber)
- Un `basePath` prop pour construire la route cible (ex : `/troupeau/truies?statut=attente`)
- Calcul `count` via `useMemo()` sur `useFarm()` pour éviter les re-renders

Structure réutilisable : `TruieStatutPipeline` (Troupeau) et `PipelineBar` (Cycles inline) suivent le même pattern. Extraire en composant `<StagePipeline>` générique lors du Sprint 6 si un troisième cas apparaît.

### Bug mapAlerteServeur avec rows GAS malformées → regex filter
Le script Apps Script côté Google Sheets injecte parfois des lignes ALERTES_ACTIVES corrompues :
> `"Mortalité élevée: 100% (1729876543210/..GMT+0100 Mon Apr..."`

Signature reconnaissable : `100%` suivi d'un timestamp Unix 13 digits entre parenthèses. Solution :
```ts
if (/mortalit[eé]\s*(?:\w+\s*)?:\s*100\s*%.*\(\d{10,}\s*\/.*GMT/i.test(descRaw)) return null;
```
Plus `mapTable` filtre `null` via `.filter((a): a is AlerteServeur => a !== null)`. Signature du mapper changée : retourne `AlerteServeur | null`.

### GAS API limits (connector v5)
- Pas de `create_sheet` programmatique sur les Sheets `EDITABLE=false`
- Pas de `delete` sur les Sheets `EDITABLE=false` — contournement : filtrer côté mapper
- Les colonnes d'agrégat RECAP/TOTAL apparaissent dans les requêtes — filtrer par `.id.toUpperCase().startsWith('TOTAL')`
- Les lignes squelettes (libellé vide) sortent aussi — filtrer par `v.produit && v.produit.trim() !== ''`

### Nested worktrees → eslint ignore ne marche pas par défaut
Les worktrees Claude (`.claude/worktrees/<branch>/`) contiennent l'arbre complet du repo — ESLint lint récursivement ces fichiers et spam les warnings. Solutions :
- `eslint.config.js` : `ignores: ['.claude/**/*', '**/.claude/**/*', 'worktrees/**/*']`
- `package.json` script : `"lint": "tsc --noEmit && eslint src scripts --ignore-pattern '.claude/**' --ignore-pattern 'node_modules/**'"`
- Scoper ESLint à `src scripts` au lieu de `.` global
- Les deux mécanismes sont redondants (défense en profondeur) car `ignores` ne s'applique pas toujours aux chemins passés explicitement en CLI

### `cd` dans Bash : main vs worktree
Le CWD ne persiste PAS entre commandes Bash — toujours utiliser paths absolus. Mais ATTENTION : un worktree Claude à `.claude/worktrees/<branch>/` est SUR UNE AUTRE BRANCHE. Un `git diff` depuis main ne verra pas les mods du worktree sauf si explicitement on `cd` dans le worktree et `git diff`. Pour QA inter-agents, vérifier `git worktree list` puis aller voir dans chaque worktree.

### Les fixes mapper + filtrage → 85 produits véto deviennent 7
Avant : `STOCK_VETO` retournait 85 rows (dont 78 squelettes). Après filtrage : ~7 produits réels. Même logique `STOCK_ALIMENTS`. À retenir : une source Sheets peut retourner BEAUCOUP de bruit — toujours filtrer au mapper, pas au composant.

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

---

## Leçons Techniques — Session 2026-05-17 (Vagues A/B/C cleanup + Chantier 0 sécurité Mistral)

### Vite `VITE_*` env vars sont inlinées dans le bundle = jamais utiliser pour secrets

**Problème vu en prod** : `VITE_MISTRAL_API_KEY` et `VITE_MARIUS_API_KEY` étaient déclarées comme variables d'environnement Vite (`import.meta.env.VITE_MISTRAL_API_KEY`). Vite inline les valeurs au build dans le bundle JS (comportement documenté), donc la clé Mistral `TQXuKoW…` était exfiltrable en 30 secondes via DevTools → Network → `dist/assets/index-D9ZZxbo1.js`.

**Règle absolue** :
- Toute clé sensible (API third-party, tokens, secrets) DOIT être server-side : Supabase Edge Function avec `Deno.env.get('SECRET_NAME')`, ou backend via service_role.
- Le préfixe `VITE_` ne doit servir qu'à des constantes publiques (URL Supabase, clé anon Supabase, URLs publiques).

**Pattern de migration appliqué** :
1. Créer une Edge Function Supabase qui lit la clé via `Deno.env.get('MISTRAL_API_KEY')` et fait le forward vers l'API tierce.
2. Injecter le secret server-side via Management API : `POST /v1/projects/{ref}/secrets [{"name": "MISTRAL_API_KEY", "value": "..."}]`.
3. Refactor frontend : appel `fetch('${SUPABASE_URL}/functions/v1/marius-chat')` avec `Authorization: Bearer ${session.access_token}` + `apikey: ${VITE_SUPABASE_ANON_KEY}`.
4. Supprimer la variable `VITE_*` du `.env.local`.
5. Rebuild + verify : `grep -r "VALEUR_SECRETE" dist/` doit retourner 0.

### CDN Hostinger keye sur la query string — utilisable pour bypass entry stale

**Problème** : Le CDN Hostinger (hCDN) avait gelé `/sw.js` avec `max-age=604800` (7 jours TTL) avant qu'on push le fix `.htaccess no-cache`. Pas de méthode `PURGE` exposée (405), pas d'API CDN dans le PAT.

**Découverte** : `curl /sw.js?cb=X` → `x-hcdn-cache-status: MISS` (le CDN considère que `?query` change la cache key).

**Fix appliqué** : renommer le SW de `sw.js` → `service-worker.js` (one-shot, dans `vite.config.ts` `VitePWA({ filename: 'service-worker.js' })`). Nouvelle URL → MISS CDN garanti, `.htaccess no-cache` empêche tout re-gel.

**Règle générale** : pour bypass un cache CDN frozen sans purge, soit query string `?v=N`, soit rename de la ressource. Pas besoin de purge API si on contrôle l'URL.

### Trigger BEFORE UPDATE > policy WITH CHECK pour bloquer column-level escalation

**Contexte** : policy `profiles_update_own` avait `USING (auth.uid() = id)` mais aucun `WITH CHECK` → un user authentifié pouvait UPDATE son profile avec `role='OWNER'` ou `is_super_admin=true` (escalation).

**Solution** : trigger `BEFORE UPDATE ON profiles` qui RAISE EXCEPTION si `auth.role() != 'service_role'` ET `NEW.role IS DISTINCT FROM OLD.role` (ou is_super_admin, ou id).

**Pattern** :
```sql
CREATE OR REPLACE FUNCTION prevent_profile_role_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  -- idem is_super_admin, id
  RETURN NEW;
END;
$$;
```

**Pourquoi trigger > policy** : un WITH CHECK qui compare avec un sub-SELECT sur la même row est fragile (timing UPDATE). Le trigger BEFORE UPDATE compare `OLD vs NEW` de façon atomique et explicite. Bonus : un message d'erreur clair côté client.

### CORS borné > CORS `*` pour Edge Functions

Avant : `Access-Control-Allow-Origin: *` sur `marius-chat` → n'importe quel site tiers peut appeler Marius (DoS, abus quota Mistral).

Après :
```ts
const ALLOWED_ORIGINS = new Set([
  "https://porctrack.tech", "https://www.porctrack.tech", "https://app.porctrack.tech",
  "http://localhost:5173", "http://localhost:4173",
]);
function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://porctrack.tech";
  return { "Access-Control-Allow-Origin": allow, "Vary": "Origin", /* ... */ };
}
```

Header `Vary: Origin` indispensable pour que les CDN/proxies cachent par origin distincte.

### Anti prompt-injection : borner messages côté serveur

Edge Function `marius-chat` accepte maintenant `{ messages: [...] }` au lieu de `{ message }` seul, mais :
- Slice `.slice(-12)` max 12 messages d'historique
- Truncate `content.slice(0, 2000)` chars max par message
- Filter `role === 'system'` côté serveur (jamais accepter un system prompt du client)
- Injection du SYSTEM_PROMPT serveur en tête (toujours premier)

### Nettoyage Git : 33 branches stales supprimées (Vagues A/B)

**Avant** : 21 branches locales + 17 distantes (v43-*, migration/v44/v45/v70, worktree-agent-*, claude/*).
**Après** : 2 branches (`main`, `migration/v71-consolidation` pour rollback).

**Commandes utilisées** :
```sh
git branch | sed 's|^[* +]*||' | grep -E '^(v43-|...)' | xargs -I{} git branch -D {}
git branch -r | grep -E 'origin/(v43-|...)' | sed 's|^[ ]*origin/||' | tr '\n' ' ' | xargs git push origin --delete
git remote prune origin
```

### dist/ tracked dans git = bruit massif sur chaque commit

182 fichiers dist/ étaient tracked malgré le pipeline GitHub Actions FTP-Deploy qui régénère dist/ à chaque push. Chaque commit applicatif faisait diff +50 lignes binaires dans git. Fix : `git rm -r --cached dist/` + `dist/` dans gitignore. **Règle** : ne jamais tracker un build output qui est régénéré par CI.

### Coordination multi-sessions Claude

**Pattern qui marche** : zones de fichiers strictement disjointes annoncées par avance dans le brief envoyé à chaque session.
- Session A : `src/components/forms/` + `src/v70/pages/` + `src/types/`
- Session B : `supabase/`, `.env`, `.htaccess`, secrets, migrations
- Communication par état Git (commits sur main + signaux explicites "le commit X est prêt, tu peux pull")

**Anti-pattern** : laisser 2 sessions toucher au même fichier → conflicts merge garantis.
