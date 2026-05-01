# PorcTrack 8 — Workflow Design : UI/UX Pro Max + Magic Chat

> Ce document définit l'ordre de travail et les instructions précises pour utiliser
> les deux compétences design sur notre projet.

---

## ORDRE DE TRAVAIL

```
┌─────────────────────────────────────────────────────────┐
│  PHASE 1 — UI/UX PRO MAX (Audit & Intelligence)        │
│  → Analyse, diagnostique, recommande                    │
│  → Génère les specs, les règles, les tokens             │
│  → Identifie les erreurs visibles ET invisibles         │
├─────────────────────────────────────────────────────────┤
│  PHASE 2 — MAGIC CHAT (Composants & Code)               │
│  → Cherche des composants modernes existants             │
│  → Génère du code UI prêt à intégrer                    │
│  → S'inspire de composants réels (shadcn, etc.)         │
├─────────────────────────────────────────────────────────┤
│  PHASE 3 — IMPLÉMENTATION                               │
│  → Intègre les recommandations + composants              │
│  → Respecte le design system PorcTrack                   │
│  → tsc --noEmit + npm run build                          │
├─────────────────────────────────────────────────────────┤
│  PHASE 4 — VÉRIFICATION                                 │
│  → Test émulateur Android                                │
│  → Checklist pré-livraison UI/UX Pro Max                │
│  → Mise à jour mémoire                                   │
└─────────────────────────────────────────────────────────┘
```

**Pourquoi cet ordre :**
- UI/UX Pro Max = le CERVEAU (quoi faire, pourquoi, règles à respecter)
- Magic Chat = les MAINS (composants concrets, code à copier)
- On ne code jamais sans avoir d'abord diagnostiqué

---

## PHASE 1 — UI/UX PRO MAX

### Quand l'utiliser
- AVANT toute modification UI/UX
- Pour auditer un écran existant
- Pour choisir couleurs/typo/style
- Pour vérifier l'accessibilité

### Commandes disponibles

#### 1. Design System complet (OBLIGATOIRE au début de session)
```bash
cd /chemin/vers/PorcTrack8
python3 .claude/skills/ui-ux-pro-max/src/ui-ux-pro-max/scripts/search.py \
  "agriculture livestock pig farm mobile dashboard" \
  --design-system -p "PorcTrack 8"
```

#### 2. Design System par page (quand on travaille sur un écran spécifique)
```bash
python3 .claude/skills/ui-ux-pro-max/src/ui-ux-pro-max/scripts/search.py \
  "agriculture mobile dashboard alerts" \
  --design-system --persist -p "PorcTrack 8" --page "dashboard"
```

#### 3. Recherche par domaine (UX, couleurs, typo, animations...)

| Besoin | Commande |
|--------|----------|
| Guidelines UX | `--domain ux "touch target animation accessibility"` |
| Palettes couleurs | `--domain color "agriculture green earthy"` |
| Font pairings | `--domain typography "professional dashboard modern"` |
| Types de charts | `--domain chart "real-time livestock monitoring"` |
| Styles UI | `--domain style "minimalism organic biophilic"` |
| Landing patterns | `--domain landing "hero social-proof"` |
| Google Fonts | `--domain google-fonts "sans serif bold variable"` |

**Exemple complet :**
```bash
python3 .claude/skills/ui-ux-pro-max/src/ui-ux-pro-max/scripts/search.py \
  "touch target haptic outdoor gloves" --domain ux -n 10
```

#### 4. Checklist pré-livraison (OBLIGATOIRE avant deploy)

Vérifier ces 10 catégories dans l'ordre de priorité :

| # | Catégorie | Impact | Vérification clé |
|---|-----------|--------|-------------------|
| 1 | **Accessibilité** | CRITIQUE | Contraste 4.5:1, aria-labels, focus visible |
| 2 | **Touch & Interaction** | CRITIQUE | Min 44×44px, gap 8px+, feedback tactile |
| 3 | **Performance** | HAUTE | Lazy loading, skeleton, pas de CLS |
| 4 | **Style** | HAUTE | Cohérence, SVG icons (pas d'emoji), Lucide |
| 5 | **Layout & Responsive** | HAUTE | Mobile-first, pas de scroll horizontal |
| 6 | **Typographie & Couleurs** | MOYENNE | Base 16px, line-height 1.5, tokens sémantiques |
| 7 | **Animation** | MOYENNE | 150-300ms, ease-out, prefers-reduced-motion |
| 8 | **Forms & Feedback** | MOYENNE | Labels visibles, erreurs près du champ |
| 9 | **Navigation** | HAUTE | Bottom nav ≤5, back prévisible, deep linking |
| 10 | **Charts & Data** | BASSE | Légendes, tooltips, couleurs accessibles |

### Règles spécifiques PorcTrack (terrain agricole)

- **Touch targets : 48×48px minimum** (pas 44px — usage avec gants)
- **`touch-action: manipulation`** sur tout le body (zéro délai 300ms)
- **Haptic feedback** : vibration 10ms sur confirmations importantes (saillie, check)
- **`overscroll-behavior: contain`** : pas de pull-to-refresh accidentel
- **`inputmode="numeric"`** : clavier numérique pour poids, quantités, numéros
- **Texte minimum 14px** sur les labels terrain (pas 11-12px quand on est dehors)
- **Contraste renforcé** : écran en plein soleil → viser 7:1 pas juste 4.5:1

---

## PHASE 2 — MAGIC CHAT (21st.dev)

### Quand l'utiliser
- APRÈS l'audit UI/UX Pro Max
- Pour trouver des composants UI modernes
- Pour s'inspirer de designs existants
- Pour générer du code prêt à intégrer

### Disponibilité
- **Claude Code (terminal)** : disponible immédiatement via `claude` CLI
- **Cowork** : pas encore disponible (MCP user-scope non chargé en Cowork)

### Comment l'utiliser dans Claude Code

Lancer Claude Code dans le terminal puis utiliser les outils Magic :

```bash
# Depuis le terminal macOS
cd ~/PorcTrack8
claude
```

Puis dans Claude Code, les outils `mcp__magic__*` sont disponibles :
- **Recherche de composants** : "cherche un composant dashboard card avec KPI"
- **Génération de code** : "génère un bottom nav Ionic React avec 4 onglets"
- **Inspiration** : "montre-moi des designs de mobile farm management"

### Adaptation au stack PorcTrack

Quand Magic propose un composant :
1. **Vérifier la compatibilité** : Ionic React + Tailwind v4
2. **Adapter les couleurs** : remplacer par nos tokens (accent-600, gray-900, etc.)
3. **Adapter les polices** : appliquer .ft-heading, .ft-values, .ft-code
4. **Ajouter .pressable** : sur tous les éléments cliquables
5. **Vérifier les touch targets** : minimum 48×48px

---

## PHASE 3 — IMPLÉMENTATION

### Règles absolues (NE JAMAIS ENFREINDRE)

1. **Lire avant d'écrire** : TOUJOURS Read → Edit, jamais Write sur un fichier existant
2. **Pas de hex hardcodé** : utiliser les classes Tailwind (accent-600, gray-900, red-500)
3. **Pas de inline style** : sauf progress bar width% dynamique
4. **Classes design system** : .ft-heading, .ft-values, .ft-code, .premium-card, .pressable
5. **Espacement** : px-5 standard, space-y-6 entre sections, gap-4 dans les grids
6. **Animations** : .animate-fade-in-up + .stagger-1/.stagger-2/.stagger-3
7. **Active states** : active:scale-[0.97] transition-transform duration-[160ms]
8. **French UI** : tout le texte visible en français

### Pipeline de validation

```bash
# Après chaque modification
npx tsc --noEmit                    # 0 erreurs TypeScript
npm run build                       # Build Vite réussi

# Avant deploy
npm run build && npx cap sync android && cd android && ./gradlew installDebug

# Relancer app
adb shell am force-stop com.porc800.porctrack
adb shell am start -n com.porc800.porctrack/.MainActivity
```

---

## PHASE 4 — VÉRIFICATION

### Audit automatisé (grep)
```bash
cd src
# Hex hardcodés restants
grep -rn '#[0-9A-Fa-f]\{6\}' --include='*.tsx' | grep -v 'node_modules' | wc -l

# Inline styles
grep -rn 'style={{' --include='*.tsx' | grep -v 'width:' | grep -v 'node_modules' | wc -l

# Touch targets trop petits
grep -rn 'w-6\|h-6\|w-5\|h-5' --include='*.tsx' | grep -v 'node_modules' | wc -l

# Texte trop petit
grep -rn 'text-\[9px\]\|text-\[10px\]' --include='*.tsx' | grep -v 'node_modules' | wc -l
```

### Checklist visuelle (sur émulateur)
- [ ] Dashboard : greeting, checklist CTA, actions urgentes, quick actions, résumé
- [ ] Cheptel : recherche, tabs, statuts, liste animaux, détail
- [ ] Alertes : filtres, summary strip, cards priorité, actions
- [ ] Paramètres : sync, audit/protocoles, config, reset
- [ ] Navigation : 4 onglets, badges, état actif, transitions
- [ ] Formulaires : QuickSaillie, QuickHealth, QuickNote, checklist

---

## RÉSUMÉ EXPRESS

```
Nouvelle tâche UI ?
    │
    ├─ 1. UI/UX Pro Max → python3 search.py "..." --domain ux
    │     → Quel est le problème ? Quelle règle s'applique ?
    │
    ├─ 2. Magic Chat (si composant nécessaire)
    │     → Quel composant moderne existe ?
    │     → Adapter au stack PorcTrack
    │
    ├─ 3. Implémenter
    │     → Read → Edit → tsc → build
    │     → Pas de hex, pas de inline style
    │
    └─ 4. Vérifier
          → Grep audit + émulateur + checklist
```
