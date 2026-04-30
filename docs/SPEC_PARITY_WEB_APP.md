# PorcTrack 8 — Spécification parité Web / App

> Document de référence pour le design : tout ce que la version web (porctrack.tech) et l'app Android (Capacitor) doivent partager en termes de **données, navigation, interactions, vocabulaire**.
> Date : 2026-04-30 · Source : audit temps réel du repo + schéma Supabase live.

---

## 1. Vue d'ensemble

PorcTrack 8 est une **single page app React** (Ionic 8 + Vite + Tailwind v4 + TypeScript). Le **même code source** alimente :
- la version web sur `porctrack.tech` (build Vite, déploiement rsync Hostinger)
- l'app Android via Capacitor (build natif APK/AAB)

Donc **par construction, la parité fonctionnelle est totale**. Les différences ne portent que sur les capacités natives (caméra, notifications, fichiers, splash) et la fenêtre/safe-area.

**Backend unique** : Supabase (PostgreSQL + Auth + RLS multi-tenant) — eu-west-3, projet `jcritwravdwefwqwyjvk`.

**Multi-tenant** : 1 utilisateur = 1 ferme. Isolation par `farm_id = auth.uid()` sur toutes les tables business.

---

## 2. Navigation et structure

### 2.1 Routes publiques (pas de session requise)

| Route | Écran | Rôle |
|---|---|---|
| `/` | SmartRoot | Landing (visiteur) ou redirect `/cockpit` (connecté) |
| `/a-propos` | About | Mission, valeurs, équipe |
| `/privacy` | Privacy | Politique de confidentialité |
| `/cgu` | CGU | Conditions générales |
| `/login` | Login | Email + password (existant) |
| `/signup` | Signup | Magic link OU password (toggle) |
| `/auth/callback` | AuthCallback | Handler magic link (redirect post-validation) |

### 2.2 Onboarding (post-signup)

| Route | Écran | Rôle |
|---|---|---|
| `/onboarding` | OnboardingFlow | Première connexion : nom ferme, capacité, tour |

### 2.3 App protégée (session Supabase requise)

#### Navigation principale (4 onglets bottom + FAB)

```
┌─────────────────────────────────────────────────┐
│              (contenu écran)                     │
│                                                  │
├─────────────────────────────────────────────────┤
│  🟢      🐷       🌀       📦       ⚙️ (5e)     │
│ Cockpit Troupeau Cycles  Resssces Pilotage*     │
│         (FAB: ➕ centre)                          │
└─────────────────────────────────────────────────┘
                  * Pilotage visible si OWNER seulement
```

| Tab | Route racine | Hub | Sub-routes |
|---|---|---|---|
| Cockpit | `/cockpit` | (pas de hub, vue directe) | KPIs, alertes du jour |
| Troupeau | `/troupeau` | TroupeauHub | `/truies`, `/truies/:id`, `/verrats`, `/verrats/:id`, `/bandes`, `/bandes/:bandeId`, `/batiments` |
| Cycles | `/cycles` | CyclesHub | `/repro`, `/maternite`, `/post-sevrage`, `/croissance`, `/engraissement`, `/finition`, `/sortie` |
| Ressources | `/ressources` | RessourcesHub | `/aliments`, `/aliments/plan`, `/aliments/formules`, `/pharmacie`, `/veto` |
| Pilotage (OWNER) | `/pilotage` | PilotageHub | `/perf`, `/finances`, `/finances/rapport`, `/previsions`, + 3 redirects (`/alertes`, `/audit`, `/reglages`) |

#### Routes hors-tabs (accessibles via menus / actions)

| Route | Écran | Contexte |
|---|---|---|
| `/sante` | TableView('JOURNAL_SANTE') | Journal santé / traitements |
| `/alerts` | AlertsView | Liste alertes biologiques actives |
| `/protocoles` | ProtocolsView | Guides métier / SOPs |
| `/checklist/:name` | ChecklistFlow | Checklists quotidiennes (audit) |
| `/audit` | AuditView | Audit terrain |
| `/sync` | SyncView | État synchronisation offline |
| `/controle` | ControleQuotidien | Contrôle quotidien / saisie hebdo |
| `/more` | SettingsPage | Réglages / compte / aide |
| `/aide` | AideView | Aide contextuelle / support |
| `/admin` | AdminDashboard | Admin (rôle ADMIN seulement) |

#### Redirections legacy (à conserver le temps que les anciens liens disparaissent)

```
/cheptel              → /troupeau/truies
/cheptel/truie/:id    → /troupeau/truies/:id
/cheptel/verrat/:id   → /troupeau/verrats/:id
/bandes               → /troupeau/bandes
/bandes/:bandeId      → /troupeau/bandes/:bandeId
/stock                → /ressources/aliments
/stock/aliments       → /ressources/aliments
/stock/veto           → /ressources/pharmacie
```

---

## 3. Inventaire des écrans + données affichées

### 3.1 Cockpit (`/cockpit`)

**Ce que l'utilisateur voit en arrivant.** Synthèse du jour.

| Bloc | Données | Source |
|---|---|---|
| Effectifs | 17 truies (par statut), 2 verrats, 14 portées | `sows`, `boars`, `batches` |
| Alertes du jour | 14 règles GTTT actives | `alertEngine` (live calc) |
| KPIs | Mortalité bandes, taux sevrage, etc. | calculé live |
| Pull-to-refresh + DataAge "Maj il y a X" | — | hook `useAutoRefresh` |

### 3.2 Troupeau

#### `/troupeau` — TroupeauHub
4 sub-tabs : **Truies / Verrats / Porcelets / Loges**.
- Pipeline 4 statuts truies : Pleine / En maternité / En attente saillie / À surveiller (counts live)
- Liste compacte triable

#### `/troupeau/truies` — TruiesListView
Liste 17 truies. Filtres : statut, ration, recherche.
**Colonnes** : ID, Nom, Boucle, Statut, Date MB prévue, Ration kg/j, Notes.

#### `/troupeau/truies/:id` — TruieDetailView
Fiche complète d'une truie. **Inline edit** sur :
- Ration kg/j (number)
- NV de la portée courante (number)
- Notes (textarea)

Sections : Identité (nom, boucle, race, origine) · Reproduction (saillies historique, MB prévue, gestation jour) · Santé (traitements liés) · Notes.

Actions : Saillie · Mise-bas · Sevrage · Soin · Note · Pesée · Mortalité.

#### `/troupeau/verrats` + `/troupeau/verrats/:id` — VerratsListView, VerratDetailView
2 verrats. Champs : Nom, Boucle, Statut, Origine, Race, Ration, Notes.

#### `/troupeau/bandes` + `/troupeau/bandes/:bandeId` — BandesView, BandeDetailView
14 portées. Inline edit sur NV / Morts / Notes.
**Colonnes** : ID Portée (26-T7-01), Truie, Date MB, NV, Morts, Vivants, Date sevrage, Statut.

#### `/troupeau/batiments` — BatimentsView
Loges (9 maternité / 4 post-sevrage / 2 engraissement — constantes ferme K13).

### 3.3 Cycles

#### `/cycles` — CyclesHub
Pipeline horizontal 295 jours, 6 phases :
```
SAILLIE → GESTATION 115j → MISE-BAS → LACTATION 28j → SEVRAGE
                                                          ↓
                                                  POST-SEVRAGE 70j
                                                          ↓
                                                  ENGRAISSEMENT 90j
                                                          ↓
                                                    FINITION → VENTE
```

Marqueurs visuels des bandes actives sur la timeline.

#### Sub-vues
| Route | Écran | Contenu |
|---|---|---|
| `/cycles/repro` | ReproCalendarView | Calendrier saillies + retours chaleur |
| `/cycles/maternite` | MaterniteView | 9 loges, statut allaitement, sevrage prévu |
| `/cycles/post-sevrage` | PostSevrageView | Bandes en transition starter |
| `/cycles/croissance` | CroissanceView | Lots croissance (mâles/femelles séparés) |
| `/cycles/engraissement` | EngraissementView | Lots engraissement |
| `/cycles/finition` | FinitionView | Lots prêts pour vente (90 kg vif) |
| `/cycles/sortie` | SortieCalendarView | Calendrier ventes/sorties |

### 3.4 Ressources

#### `/ressources` — RessourcesHub
2 onglets : Aliments / Pharmacie. KPIs ruptures.

| Route | Écran | Contenu |
|---|---|---|
| `/ressources/aliments` | AlimentsView | 5 aliments (Maïs grain, Truie gestation/lactation, Porcelet démarrage, Engraissement) — stock_actuel, seuil_alerte |
| `/ressources/aliments/plan` | PlanAlimentationView | Plan alimentaire mensuel |
| `/ressources/aliments/formules` | FormulesView | Formules de mélange |
| `/ressources/pharmacie` | PharmacieView | 7 produits véto (Fer, Oxytétracycline, Ivermectine, Vitamines AD3E, Désinfectant, Calcium, Anti-diarrhéique) |
| `/ressources/veto` | TableView('STOCK_VETO') | Vue tableau brute |

### 3.5 Pilotage (OWNER seulement)

| Route | Écran | Contenu |
|---|---|---|
| `/pilotage` | PilotageHub | KPIs perf, alertes, finances, audit |
| `/pilotage/perf` | PerfKpiView | KPIs reproductifs (NV/portée, MB/truie/an, mortalité) |
| `/pilotage/finances` | FinancesView | Coûts mensuels, marge/kg |
| `/pilotage/finances/rapport` | RapportFinancierView | Rapport PDF exportable |
| `/pilotage/previsions` | ForecastView | Projections trésorerie |

---

## 4. Données — vocabulaire métier

### 4.1 Entités principales (tables Supabase)

| Table | Concept | Exemples de champs |
|---|---|---|
| `profiles` | Utilisateur (= 1 ferme) | id, email, full_name, role |
| `troupeaux` | Ferme (le label visible) | nom, secteur, user_id |
| `sows` | Truies (mères reproductrices) | code_id (T01-T19), name, boucle (B.22), statut, ration_kg_j |
| `boars` | Verrats (mâles reproducteurs) | code_id (V01-V02), name, boucle, breed |
| `saillies` | Accouplements (registre) | sow_id, boar_id, date_saillie, date_mb_prevue, statut |
| `batches` | Portées (lots de porcelets) | code_id (26-T7-01), sow_id, date_mise_bas, porcelets_nes_vivants, nb_mort_nes, date_sevrage, loge, phase |
| `bandes` | Groupes de bandes (legacy, 1 niveau au-dessus de batches) | troupeau_id, nom, date_entree, statut |
| `health_logs` | Journal santé / traitements | log_type, animal_type, animal_reference, treatment, dose, result |
| `notes` | Notes terrain | category, content, created_at, author_id |
| `produits_aliments` | Registre aliments | libelle, unite, stock_actuel, seuil_alerte |
| `produits_veto` | Registre médicaments | libelle, type, usage, stock_actuel, stock_min |
| `feed_inventory` | Mouvements aliments (entrées/sorties) | feed_name, movement_date, quantity_kg, movement_type |
| `vet_inventory` | Mouvements véto | product_name, movement_date, dose_quantity |
| `plan_alimentation` | Plan alimentaire par catégorie | categorie, effectif, ration_j_kg |
| `finances` | Postes de coûts | poste, mensuel_fcfa, pct_total, type (Variable/Fixe/Semi-fixe) |

### 4.2 Statuts truies (vocabulaire UI)

```
En attente saillie · Saillie · Pleine · En maternité · À surveiller · Réforme · Morte
```
*Note : "Pleine" et "Gestante" sont synonymes — le code accepte les deux.*

### 4.3 Statuts portées (batches.statut)

```
Sous mère (allaitement) · Sevrés · En cours sevrage · En croissance · En finition · Vendu
```

### 4.4 Statuts stocks

```
OK · BAS · RUPTURE · Périmé (DLC dépassée)
```

### 4.5 Constantes biologiques GTTT

| Constante | Valeur | Usage |
|---|---|---|
| Gestation | **115 jours** (±2) | Calcul date MB prévue |
| Lactation/Sevrage | **28 jours** | J+28 post mise-bas |
| Retour chaleur post-sevrage | **3-7 jours** | Re-saillie attendue |
| Post-sevrage durée | **70 jours** | Transition vers engraissement |
| Engraissement durée | **90 jours** | Vers finition |
| Finition vente | **90 kg vif** | Poids cible |
| Seuil mortalité anormale | **>15%** du lot | Déclenche alerte R4 |
| Prix vente | **2000-2200 FCFA/kg** vif | Référence finance |
| Porcelet sevré | **25 000 FCFA** | Référence vente |

### 4.6 14 règles d'alerte GTTT (alertEngine)

| # | Règle | Déclencheur | Priorité max |
|---|---|---|---|
| R1 | Mise-Bas | J-3 à J+2 date prévue | CRITIQUE |
| R2 | Sevrage | J+28 post naissance | NORMALE |
| R3 | Retour Chaleur | J+5 post sevrage | NORMALE |
| R4 | Mortalité | >15% morts dans lot | CRITIQUE |
| R5 | Stock Critique | Rupture ou seuil bas | CRITIQUE |
| R6 | Regroupement | 2+ bandes sevrables ±3j | INFO |
| R7 | Échographie | J25 à J35 post-saillie | INFO |
| R8 | Re-Saillie | Retour chaleur détecté | HAUTE |
| R9 | Retard Phase | Maternité prolongée >J31 | NORMALE |
| R10 | Surdensité | >6 bandes en engraissement | HAUTE |
| R11 | Réforme (Perf) | Productivité insuffisante | HAUTE |
| R12 | Réforme (Inact.) | Inactivité >90j | NORMALE |
| R13 | Manque Pesée | Aucun poids depuis 21j | NORMALE |
| R14 | Portée Orpheline | Truie morte + porcelets | CRITIQUE |

### 4.7 Constantes ferme K13 (référence projet pilote)

```
Maternité loges     : 9
Post-sevrage loges  : 4
Engraissement loges : 2
Truies cibles       : 17
Verrats             : 2
Bandes type         : 12 actives
Localisation        : Côte d'Ivoire (eu-west-3 Supabase = Paris)
Devise              : FCFA
```

---

## 5. Tokens design — Terrain Vivant (canonique)

### 5.1 Palette
```css
--color-accent-500 : #2d5a1b   /* Vert forêt (primary, CTA, links actifs) */
--color-accent-600 : #1e4012   /* Hover/active */
--color-accent-400 : #4b8529   /* Secondary */
--color-accent-50  : #f0f7ea   /* Bg subtle */

--bg-app           : #f0f4f3   /* Background global */
--surface          : #FFFFFF   /* Cards */
--ink              : #111827   /* Texte primary */

--amber-pork       : #F4A261   /* Accent signature (maïs doré) */
--amber-deep       : #c2662b   /* Amber foncé */

--danger           : #EF4444   /* Critique, rupture, mortalité */
--warning          : #D97706   /* Alerte modérée */
--info             : #3B82F6   /* Info, neutre */
--success          : #10b981   /* Réussite/sevré (subtil) */
```

**À ne JAMAIS utiliser hardcodé** : `#10B981`, `#059669`, `#064e3b` (variants déprouvés).
**Source de vérité** : `src/index.css` (token `--color-accent-500`).

### 5.2 Typographie
| Classe | Police | Usage |
|---|---|---|
| `.ft-heading` | Big Shoulders Display 700 | Titres, KPIs, labels nav, UPPERCASE |
| body (default) | Instrument Sans 400-500 | Texte courant |
| `.ft-values` | Bricolage Grotesque 600 | Nombres, statuts |
| `.ft-code` | DM Mono 500 | IDs (T01, B.22), codes, timestamps |

### 5.3 Spacing / radius / shadows
- **Radius** : `rounded-[12px]` cards · `rounded-[28px]` premium-card · `rounded-full` boutons CTA
- **Shadows** : minimes (≤4px). Préférer border 1px sur bg-app
- **Padding** : 16px horizontal écran · 12-20px interne cards

### 5.4 Touch targets
- **Minimum 44×44 px** (WCAG 2.1) — porcher avec gants en porcherie
- Boutons : `min-h-[44px]` ou `w-11 h-11` (icon-only)

---

## 6. Interactions standards (parité web/app)

| Interaction | Pattern | Notes |
|---|---|---|
| **Pull-to-refresh** | `IonRefresher` sur tous les hubs | Fonctionne web (souris drag) + tactile |
| **Auto-refresh** | Hook `useAutoRefresh` : on mount + visibilitychange (debounce 30s) | Fenêtre revisible → refetch |
| **Inline edit** | Tap valeur → input → Enter pour sauver | EditableNumber + EditableText composants |
| **Optimistic UI** | Save inline : spinner pendant, ✓ flash 1.5s, sinon revert + toast | Animations Emil |
| **Quick actions FAB** | Bouton + central nav | Saillie / Soin / Note / Pesée / Mortalité |
| **Skeleton loaders** | Sur listes > 1s | `<SkeletonCard />` |
| **Empty states** | Toujours avec CTA | Pas juste "Aucun élément" |
| **Toasts erreur** | `useIonToast` ou `<div role="alert">` 3s | FR text |
| **Confirmations destructives** | `useIonAlert` (pas `window.confirm` — bloqué iOS WebView) | "Êtes-vous sûr…" |

### 6.1 Animations Emil Kowalski (non-négociables)

```css
/* Easing standard */
transition: cubic-bezier(0.23, 1, 0.32, 1);
duration: 160ms;

/* Active sur pressables */
active:scale-[0.97] transition-transform;

/* Stagger entrées listes */
50ms entre items;

/* Apparition cards */
scale(0.98) + translateY(8px) < 300ms;

/* Respecter */
@media (prefers-reduced-motion: reduce) { /* off */ }
```

**Interdits** : `transition-all`, `ease-in`, `linear`, `transition: all`.

---

## 7. Différences web vs app native

### 7.1 Capacités natives (Capacitor uniquement)

| Capacité | Native | Web | Stratégie |
|---|---|---|---|
| Caméra | `@capacitor/camera` | `<input type=file capture>` | Détecter via `Capacitor.isNativePlatform()` |
| Notifications locales | `@capacitor/local-notifications` | Web Notifications API | Service worker pour web |
| Splash screen | `@capacitor/splash-screen` | — (HTML loader) | `<SuspenseFallback>` au boot |
| Status bar | `@capacitor/status-bar` | — | Skip web |
| Filesystem (export) | `@capacitor/filesystem` | `Blob` + `<a download>` | Helper conditionnel |
| Preferences (kvStore) | `@capacitor/preferences` | `localStorage` (via wrapper) | `kvStore.ts` abstrait les deux |

### 7.2 Layout / safe-area

| Plateforme | Header | Bottom nav | Safe-area |
|---|---|---|---|
| Web | `0` top inset | 64px bottom (pas de safe-area) | OK |
| Android | Variable selon device | 64px + bottom safe-area | `env(safe-area-inset-*)` |
| iOS (futur) | Notch top | Home indicator bottom | idem |

`AgritechLayout` gère ça via `padding: env(safe-area-inset-*)`.

### 7.3 Offline-first

| Web | App native |
|---|---|
| Lectures Supabase + cache mémoire 30s | Idem + offlineQueue persistante (kvStore) |
| Écritures directes Supabase | offlineQueue → batch flush |
| Pas d'icone "offline" | Badge `SyncStatusBadge` |

**Note** : la queue migration GAS→Supabase est en cours (PR1-5 différés). Pour l'instant les écritures forms passent encore par GAS — à terme tout sera direct Supabase.

---

## 8. Authentification + multi-tenant

### 8.1 Flow signup
```
1. /signup → email + password OU magic link
2. Supabase Auth crée auth.users
3. Trigger PostgreSQL on_auth_user_created :
   - INSERT profiles (id, email, full_name, role='OWNER')
   - INSERT troupeaux (nom='Ma ferme' OU farm_name de raw_user_meta_data, user_id, secteur)
4. Redirect /onboarding (3 steps : Identité ferme / Capacité / Tour)
5. Redirect /cockpit avec environnement vierge
```

### 8.2 Flow login
```
1. /login → email + password (signInWithPassword)
2. Session Supabase persistée (localStorage)
3. AuthContext fetch profile via RLS (auth.uid() = id)
4. Redirect /cockpit
```

### 8.3 Isolation données (RLS)
- 13/15 tables : policy `isolation_by_farm` `auth.uid() = farm_id`
- `profiles` : policies own (SELECT/INSERT/UPDATE)
- `troupeaux` : SELECT + INSERT/UPDATE/DELETE own
- `feed_inventory`, `vet_inventory` : bonus policy "Lecture publique" (anon peut voir stocks)

### 8.4 Rôles
- `OWNER` : propriétaire ferme — accès total + Pilotage
- `WORKER` / `PORCHER` : porcher terrain — pas d'accès Pilotage (KPIs financiers cachés)
- `ADMIN` : super-admin (validation comptes, audit) — route `/admin`

### 8.5 Dev autologin (optionnel local)
Variables `VITE_DEV_AUTOLOGIN_EMAIL` + `VITE_DEV_AUTOLOGIN_PASSWORD` dans `.env.local` → auto-signin en mode `import.meta.env.DEV`. Tree-shaké en prod.

---

## 9. Conventions UX à respecter

### 9.1 Texte UI
- **100% français**
- **Pas d'anglais** dans les libellés (sauf "OK", "Annuler" si international)
- **Pas d'emoji dans l'UI** (icônes Lucide React uniquement)

### 9.2 Lisibilité terrain
- Contraste **4.5:1 minimum**, **7:1** sur écrans plein soleil
- Tailles texte : 11px tertiary, 13-15px body, 22-28px titres, 20-48px KPIs
- Tabular figures pour alignement nombres : `font-feature-settings: 'tnum'`

### 9.3 Densité / hiérarchie
- Cible : **3 informations par écran visible** (pas 1 décorative)
- Card → 1 KPI principal + 2-3 sous-métriques + action rapide
- Tables denses sur grandes vues (BandesView, TruiesListView)

### 9.4 Feedback utilisateur
- **Tous les save** ont feedback visuel (spinner → ✓ → flash → revert si erreur)
- **Toutes les actions destructives** demandent confirmation
- **Tous les empty states** ont une CTA pour ajouter

### 9.5 Anti-patterns à éviter
| ❌ | ✅ |
|---|---|
| `localStorage.setItem` | `kvStore.kvSet` |
| `style={{ color: '#...' }}` | Tailwind classes / tokens CSS |
| `transition-all` | `transition-transform`, `transition-colors` |
| `ease-in` | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Emoji 🐷 dans icône | Lucide SVG (PiggyBank, etc.) |
| `-mt-10` négative margin | Slot children dans header |
| `window.confirm` | `useIonAlert` |
| `import { SyncStatusBadge }` | `import SyncStatusBadge from ...` (default) |

---

## 10. Glossaire éleveur (pour le designer)

| Terme | Définition |
|---|---|
| **GTTT** | Gestion Technique du Troupeau Truies |
| **Naisseur-engraisseur** | Élevage qui fait reproduction + finition (vs naisseur seul) |
| **Truie** | Femelle reproductrice (ID format `T01`-`T19`) |
| **Verrat** | Mâle reproducteur (ID format `V01`-`V02`) |
| **Boucle** | Identifiant physique animal (format `B.22`) |
| **Saillie** | Accouplement truie × verrat |
| **Gestation** | Période de portage (~115j) |
| **Mise-bas (MB)** | Accouchement |
| **Portée** | Ensemble des porcelets d'une mise-bas (ID `26-T7-01` = année-truie-numéro) |
| **NV** | Nés Vivants (porcelets) |
| **Mort-né** | Porcelet mort à la naissance |
| **Sevrage** | Séparation porcelets/mère (~J+28) |
| **Bande** | Groupe de porcelets sevrés gérés ensemble |
| **Loge** | Box physique (maternité, post-sevrage, engraissement) |
| **Réforme** | Sortie de la reproduction (truie/verrat) |
| **Flushing** | Sur-alimentation pré-saillie pour stimuler l'ovulation |
| **Échographie** | Confirmation gestation à J25-J35 post-saillie |

---

## 11. Sources de vérité (référence dev)

| Élément | Source canonique |
|---|---|
| Tokens design | `src/index.css` |
| Routes | `src/App.tsx` |
| Types DB | `src/types/database.types.ts` (à régénérer après migrations) |
| Constantes ferme | `src/config/farm.ts` (FARM_CONFIG) |
| Règles d'alerte | `src/services/alertEngine.ts` |
| Schéma Supabase | live via Management API (PAT) |
| Migrations SQL | `migrations/2026_04_30_*.sql` |

---

*Document maintenu à jour à chaque sprint majeur. Pour régénérer ce doc : `audit complet du projet temps réel`.*
