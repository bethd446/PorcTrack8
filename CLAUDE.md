# PorcTrack 8 — Agent Autonome

Tu es l'agent de développement principal de **PorcTrack 8**, une application mobile Ionic React (Capacitor) de gestion technique de troupeau porcin (GTTT). Tu travailles en autonomie complète — tu ne t'arrêtes JAMAIS au milieu d'une tâche, tu enchaînes les étapes jusqu'à ce que le résultat soit fonctionnel, buildé et vérifié.

## MÉMOIRE — Lis ces fichiers AU DÉMARRAGE
1. **`.claude/AGENT_CONTRACT.md`** — Garde-fou anti-hallucination. **OBLIGATOIRE** pour tout sub-agent dispatché. Format `=== VERIFICATION ===` strict.
2. `.claude/memory/learnings.md` — Leçons techniques accumulées (patterns réutilisables, erreurs à éviter, préférences client)
3. `.claude/memory/decisions.md` — Décisions architecturales/métier/UX actées (NE PAS remettre en cause)
4. `.claude/memory/blockers.md` — Blocages actifs/résolus (zones à risque connues)
5. `.claude/memory/journal.md` — Historique chronologique des sessions et vagues (état courant projet)
6. `.claude/HANDOFF_NEXT_SESSION.md` — Snapshot post-Sheets-Out (V70/V71 consolidation, métriques live)
7. `.claude/BRIEF_AGENTS_IA.md` — Brief d'orchestration multi-agents (modèles, dispatch, contrats)
8. `.claude/skills/ui-ux-pro-max-skill/SKILL.md` — Skill UI/UX Pro Max (161 palettes, 99 guidelines, 25 chart types)
9. `.agents/skills/emil-design-eng/SKILL.md` — Philosophie design Emil Kowalski (animations, easings, active states)

**À NE PAS LIRE** : `.claude/_archive/*` (snapshots obsolètes pré-V70, conservés pour historique uniquement).

## SUB-AGENTS — Garde-fou anti-hallucination
Tout brief dispatché à un sub-agent (Opus/Sonnet/Haiku) **DOIT** se terminer par :

> Suis strictement `.claude/AGENT_CONTRACT.md`. Tout rapport sans bloc
> `=== VERIFICATION ===` complet (commandes + outputs réels) sera rejeté
> et la mission réassignée. Pas d'embellissement — l'orchestrateur
> préfère la vérité brute.

L'orchestrateur (toi) :
- Ne marque jamais un sprint `completed` sans avoir vu les chiffres exacts
  dans le rapport de l'agent
- Spot-check 1 fichier minimum si l'agent a rapporté "déjà implémenté"
  (`wc -l`, `grep`, `git log --oneline -- <fichier>`)
- Reproduit la commande de validation localement avant tout commit

**À la FIN de chaque session**, mets à jour la mémoire vivante :
- `.claude/memory/learnings.md` — nouvelles leçons techniques, patterns découverts
- `.claude/memory/decisions.md` — toute décision architecturale/UX actée (format daté)
- `.claude/memory/blockers.md` — blocages rencontrés (statut 🔴/🟡/✅/⏸)
- `.claude/memory/journal.md` — résumé chronologique de la session (vagues, métriques, fichiers touchés)

---

## Règles de travail

### Autonomie totale
- **Ne demande JAMAIS confirmation** pour une sous-étape technique. Si tu sais quoi faire, fais-le.
- **Enchaîne les tâches** : edit → lint → fix errors → build → test → next task. Pas de pause.
- **Si un build casse**, analyse l'erreur, corrige, rebuild. Boucle jusqu'à ce que ça passe.
- **Si un fichier manque**, crée-le. Si une dépendance manque, installe-la.
- **Utilise TodoWrite** pour tracker ta progression sur les tâches complexes.

### Workflow standard
Pour chaque modification :
1. Lire les fichiers concernés (TOUJOURS lire avant d'écrire)
2. Appliquer les changements
3. `npx tsc --noEmit` pour vérifier les types
4. `npm run build` pour vérifier le build Vite
5. Si erreur → corriger → reboucler
6. Si succès → passer à la tâche suivante

### Déploiement Capacitor (quand demandé)
```bash
npm run build
npx cap sync android
npx cap open android   # ou: npx cap run android
```

---

## Architecture du projet

```
/src
├── components/           # Composants réutilisables
│   ├── PremiumHeader.tsx    # Header principal (gradient vert, children slot)
│   ├── SyncStatusBadge.tsx  # Badge Sync (gris/orange/rouge)
│   ├── Navigation.tsx       # Bottom tab bar (Ionic)
│   ├── Dashboard.tsx        # Écran Home / Cockpit
│   ├── PremiumUI.tsx        # Design system (PremiumCard, PremiumButton, etc.)
│   ├── SkeletonCard.tsx     # Loading skeletons
│   ├── ConfirmationModal.tsx
│   └── forms/               # Formulaires rapides
│
├── features/
│   ├── tables/              # Vues données (Cheptel, Bandes, Alertes, etc.)
│   ├── controle/            # Audit quotidien, checklist, sync
│   ├── protocoles/          # Guide métier / SOPs
│   └── notes/               # Notes terrain
│
├── context/
│   ├── TroupeauContext.tsx   # State troupeau (truies, verrats, bandes)
│   ├── RessourcesContext.tsx # State ressources (aliments, stocks, veto)
│   └── PilotageContext.tsx   # State pilotage (KPIs, finances, alertes)
│
├── services/
│   ├── alertEngine.ts       # 16 règles GTTT biologiques
│   ├── googleSheets.ts      # Backend Google Sheets
│   ├── offlineQueue.ts      # File d'attente offline
│   ├── offlineCache.ts      # Cache local
│   └── kvStore.ts           # Persistance clé-valeur (Preferences)
│
├── index.css                # Design system CSS + Tailwind v4
├── App.tsx                  # Router (54 routes — V45 ; sera réorganisé en V70 : 5 onglets + sous-routes)
└── main.tsx                 # Entry point
```

## Stack technique
- **Framework** : Ionic 8 + React 18 + TypeScript
- **Build** : Vite
- **CSS** : Tailwind CSS v4 (@theme, @layer)
- **Persistance** : kvStore (Capacitor Preferences) pour les clés critiques, Google Sheets pour le métier
- **Déploiement** : Capacitor (Android/iOS)
- **Backend** : Google Sheets API
- **State** : React Context (Architecture granulaire Troupeau/Ressources/Pilotage)
- **Icons** : Ionicons + Lucide React
- **Dates** : date-fns (locale fr)

## Design system

### Palette "Terrain Vivant"
| Token | Hex | Usage |
|-------|-----|-------|
| emerald-premium | #064e3b | Primary / header gradient end |
| forest-mid | #065f46 | Header gradient |
| forest-light | #d1fae5 | Success backgrounds |
| amber-pork | #F4A261 | Accent signature |
| amber-deep | #c2662b | Accent foncé |
| bg-app | #f0f4f3 | Background global |

### Typographie (4 polices)
| Classe | Police | Usage |
|--------|--------|-------|
| `.ft-heading` | BigShoulders Bold | Titres, KPIs, nav labels |
| body (default) | InstrumentSans | Texte courant |
| `.ft-values` | BricolageGrotesque | Nombres, statuts |
| `.ft-code` | DMMono | IDs, codes, métadonnées |

### Composants CSS clés
- `.premium-header` — Header avec gradient, rounded-b-[36px], ombre
- `.premium-card` — Cards blanches, rounded-[28px], shadow subtile
- `.premium-btn` — Boutons BigShoulders, uppercase, h-[58px]
- `.premium-badge` — Badges DMMono, rounded-full
- `.premium-segment` — Tabs Ionic stylisés

### Header (`PremiumHeader.tsx`)
Le header accepte un slot `children` pour intégrer des éléments (tabs, barre de recherche, filtres) DANS le header. **Ne JAMAIS utiliser de margin-top négative** (-mt-10, etc.) pour positionner du contenu sous le header. Utiliser le slot children à la place.

```tsx
<PremiumHeader title="Alertes" subtitle="Suivi technique">
  {/* Tabs intégrés proprement dans le header */}
  <div className="flex gap-2">
    <button className="...">Tab 1</button>
    <button className="...">Tab 2</button>
  </div>
</PremiumHeader>
```

## Logique métier GTTT

### Constantes biologiques
- Gestation : **115 jours** (±2)
- Lactation / Sevrage : **28 jours**
- Retour chaleur post-sevrage : **3-7 jours**
- Seuil mortalité anormale : **>15%** du lot

### 16 règles d'alerte (`alertEngine.ts`)
| # | Règle | Déclencheur | Priorité |
|---|-------|-------------|----------|
| R1 | Mise-Bas | J-3 à J+2 de date prévue | HAUTE→CRITIQUE |
| R2 | Sevrage | J+28 post naissance | HAUTE→NORMALE |
| R3 | Retour Chaleur | Fenêtre J+3 à J+7 post sevrage (médian J+5) | HAUTE→NORMALE |
| R4 | Mortalité | >15% morts dans lot | HAUTE→CRITIQUE |
| R5 | Stock Aliment | Rupture ou seuil bas atteint | HAUTE→CRITIQUE |
| R5b | Stock Véto | Rupture ou seuil bas (vaccins, antibio) | HAUTE→CRITIQUE |
| R6 | Regroupement | 2+ bandes sevrables ±3j | INFO |
| R7 | Échographie | J25 à J35 post-saillie | INFO |
| R8 | Re-Saillie | Retour chaleur détecté | HAUTE |
| R9 | Retard Phase | Maternité prolongée (>J31) | NORMALE |
| R10 | Surdensité | >6 bandes en engraissement | HAUTE |
| R11 | Réforme (Perf) | Productivité insuffisante | HAUTE |
| R12 | Réforme (Inact.) | Longue inactivité (90j+) | NORMALE |
| R13 | Manque Pesée | Aucun poids depuis >21j | NORMALE→HAUTE (>35j) |
| R14 | Portée Orpheline| Truie morte avec porcelets | CRITIQUE |
| R15 | Passage Phase | Poids ≥ seuil (CROISSANCE / ENGRAISSEMENT / FINITION) | NORMALE |
| R16 | Sortie Abattoir | Poids ≥ 110 kg, prêt enlèvement | HAUTE |

### Statuts animaux

Statuts truies (type `TruieStatut`, cf. `src/types/farm.ts:16`) :
- `'En attente saillie'` (vide post-sevrage)
- `'En maternité'` (lactation)
- `'Pleine'` (gestation)
- `'À surveiller'`
- `'Réforme'`, `'Morte'` (gérés via fallback `string`)

Statuts verrats (type `VerratStatut`, cf. `src/types/farm.ts:23`) :
- `'Actif'` (seul libellé contraint)
- `'Réforme'`, `'Mort'` (fallback `string`)

### Données de référence
- Ferme : **K13**, Contexte : Côte d'Ivoire (compte test V70)
- Troupeau type : 17 truies + 2 verrats, 12 bandes actives
- Rôles canoniques : `WORKER` (terrain, alias `PORCHER`), `OWNER` (gestion, alias `ADMIN`) — cf. `AuthContext.tsx`

### Cycle de vie GTTT — phases post-sevrage (`config/farm.ts`)
- Post-sevrage : J28 → J63 (~35 jours, `POST_SEVRAGE_DUREE_JOURS=35`)
- Croissance : J63 → J100 (~37 jours, `CROISSANCE_DUREE_JOURS=37`)
- Engraissement : J100 → J180 (~80 jours, `ENGRAISSEMENT_DUREE_JOURS=80`)
- Finition : J180 ou poids ≥ 100 kg (seuil sortie abattoir 110 kg, cf. `FINITION_POIDS_MIN_KG=100`, `FINITION_POIDS_MAX_KG=110`)

### Configuration ferme par défaut

- Capacités loges : 9 (maternité), 6 (post-sevrage), 6 (croissance-finition / engraissement) — cf. `MATERNITE_LOGES_CAPACITY`, `POST_SEVRAGE_LOGES_CAPACITY`, `ENGRAISSEMENT_LOGES_CAPACITY` dans `src/config/farm.ts`
- Timezone : `Europe/Paris` (compte test pré-V70 utilisait FR ; cf. `alertEngine.ts:34`)
- Devise : FCFA (V43.3 plateforme uniformisée)
- Prix vente porcs : `PRIX_VENTE_PORC_KG=2100` FCFA/kg, coûts fixes `5000` FCFA/porc — cf. `FINANCE_CONFIG` dans `src/config/farm.ts:129`

## Conventions de code

### Patterns obligatoires
- **Toujours lire un fichier avant de l'éditer** (Read → Edit, jamais Write direct sur existant)
- **Imports** : Ionic d'abord, puis lucide-react, puis internes
- **Styles** : Utiliser les classes du design system (.ft-heading, .premium-card) + Tailwind utilities
- **Pas de localStorage** — utiliser kvStore (Preferences) pour le persistant et les Contextes pour le state
- **Pas de negative margins** pour le layout — utiliser flex/grid/children slots
- **Dates** : TOUJOURS utiliser `safeDate()` de `truieHelpers.ts` pour parser les dates utilisateur.
- **French UI** : Tout le texte visible est en français
- **Monospace pour les données** : IDs, dates, codes → `.ft-code`
- **Uppercase headings** : Tous les titres/labels → `.ft-heading` + `uppercase`

### Anti-patterns à éviter
```
❌ -mt-10, -mt-12        → ✅ children slot dans PremiumHeader
❌ pb-6 sur premium-header → ✅ le padding est dans index.css (.premium-header)
❌ style={{ color: ... }}  → ✅ Tailwind classes (text-slate-600, etc.)
❌ div en dehors du header  → ✅ Intégrer dans le slot children
❌ font-family inline      → ✅ .ft-heading, .ft-code, .ft-values
```

## Commandes utiles
```bash
# Dev
npm run dev              # Serveur Vite local
npx tsc --noEmit         # Type check sans build
npm run build            # Build production

# Capacitor
npx cap sync android     # Sync build → Android
npx cap run android      # Build + run sur device/emulator
npx cap open android     # Ouvrir dans Android Studio

# Lint / Debug
npx tsc --noEmit 2>&1 | head -20   # Premiers types errors
```
