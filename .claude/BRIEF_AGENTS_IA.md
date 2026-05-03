# BRIEF AGENTS IA — PorcTrack 8

> **À joindre en début de chaque session sub-agent (Opus / Sonnet / Haiku).**
> Ce brief consolide les règles non-négociables du Design System v2.0
> ("Source of Truth") et les conventions code de PorcTrack 8.
>
> **Emplacement canonique souhaité :** `.claude/BRIEF_AGENTS_IA.md`
> (déposé dans `docs/` faute de droits d'écriture sur `.claude/` côté
> sandbox agent — copier ou symlinker au besoin).

---

## 1. PROJET

**PorcTrack 8** = application mobile Ionic React (Capacitor) de gestion
technique de troupeau porcin (GTTT). Cible : éleveurs de truies/porcelets en
Côte d'Ivoire et Afrique de l'Ouest. Mobile-first, offline-first, terrain.

- Stack : Ionic 8 + React 18 + TypeScript + Vite + Tailwind v4
- Backend : Supabase (auth + RLS) ; legacy : Google Sheets
- Persistance : kvStore (Capacitor Preferences) + Contexts (Troupeau / Ressources / Pilotage)
- Routes : 50+ via React Router (cf. `src/App.tsx`)
- Tests : Vitest + jsdom (1700+ tests baseline, 0 failed obligatoire)

---

## 2. DESIGN SYSTEM (V33-DS-COMPLETION)

DNA "Aujourd'hui" : éditorial, calme, premium, terrain.

### Tokens canoniques (`src/styles/design-system-v29.css`)

Tous prefixés `--pt-*` (alias rétrocompat `--ds-*`).

**Couleurs**
- `--pt-bg` `#F2EEE3` (fond crème global)
- `--pt-surface` `#FBF8F1` (cards)
- `--pt-surface-alt` `#EFEBE0` (cards alt / hover)
- `--pt-primary` `#2D4A1F` (vert forêt — boutons/actions)
- `--pt-accent` `#D4915C` (orange terracotta)
- `--pt-danger` `#B23A2A`
- `--pt-text` `#1A1A1A` / `--pt-text-muted` `#5C5C5C` / `--pt-text-subtle` `#8A8A8A`
- `--pt-divider` `#D4CFC2`

**Typo**
- `--pt-font-display` Big Shoulders Display (titres + chiffres)
- `--pt-font-body` Instrument Sans (texte)
- `--pt-font-mono` DM Mono (réservé IDs/codes pur — **bannir** dans nouveaux composants)

**Espacements** : `--pt-space-1` 4px → `--pt-space-7` 48px.
**Radius** : `--pt-radius-sm` 8 / `md` 16 / `lg` 24 / `xl` 32 / `pill` 9999.
**Shadows** : `--pt-shadow-card`, `--pt-shadow-elevated`.

---

## 3. RÈGLES NON-NÉGOCIABLES

1. **Tokens uniquement.** Pas de hex hardcodé, pas de couleur magique.
2. **Tap targets ≥ 44px** sur tout élément interactif.
3. **Radius pill** sur boutons + inputs (`var(--pt-radius-pill)`).
4. **Bannir `font-mono`** dans les nouveaux composants. Réservé aux IDs/codes legacy.
5. **Pas de `-mt-X` négatif** pour positionner. Utiliser flex/grid/children slot.
6. **Réutiliser les composants DS** (cf. §4). Pas de réinvention locale.
7. **A11y** : aria-label sur boutons icône, role correct, focus visible.
8. **FR uniquement** dans l'UI utilisateur.
9. **Pas d'emoji** dans le code (sauf demande explicite ou label métier).

---

## 4. COMPOSANTS DISPONIBLES (16 canoniques)

Import unique :
```ts
import {
  Card, Button, SectionHeader, Tag, IconBox,
  KeyValueRow, InsightCard, Input, FormField, Tabs,
  AlertGroup, AlertRow, Wizard,
  Segment, Chip, Search, ListItem, ActionRow, Stat, StatsGrid,
} from '@/components/design-system';
```

| Composant      | Usage                                                                  |
|----------------|------------------------------------------------------------------------|
| `Card`         | Conteneur surface (default / elevated / alt)                           |
| `Button`       | Bouton pill (primary / secondary / ghost — sm / md / lg)               |
| `SectionHeader`| Eyebrow + label uppercase d'une section                                |
| `Tag`          | Pill de statut (default / accent / primary / success / warning)        |
| `IconBox`      | Carré 44×44 avec icône (accent / primary)                              |
| `KeyValueRow`  | Ligne label : value pour KV listings                                   |
| `InsightCard`  | Card crème chaud "Marius / Insight"                                    |
| `Input`        | Input pill crème (focus + invalid states)                              |
| `FormField`    | Wrapper Input avec label + hint + error                                |
| `Tabs`         | Segment pill (changement de page/contenu, ex Vue/Repro/Santé)          |
| `AlertGroup`   | Card alertes regroupées avec bordure gauche colorée                    |
| `AlertRow`     | Ligne dans AlertGroup                                                  |
| `Wizard`       | Stepper multi-étapes                                                   |
| `Segment` (V33)| Toggle visuel 2-3 options (Liste / Grille). Différent de Tabs !        |
| `Chip` (V33)   | Filtre avec compteur ("Pleines 6", "Vides 6")                          |
| `Search` (V33) | Input pill avec loupe + bouton clear                                   |
| `ListItem` (V33)| Ligne d'animal/objet (avatar + primary/secondary + trailing + chevron)|
| `ActionRow` (V33)| Entrée de menu/réglages (icon + title/desc + badge + chevron)        |
| `Stat` (V33)   | Bloc value (Big Shoulders) + label (small caps)                        |
| `StatsGrid` (V33)| Card grille de Stats (cols : 2 / 3 / 4 / 6)                           |

---

## 5. INTERDITS

- `style={{ color: '#xxxxxx' }}` ou autre couleur en hex inline
- Réinventer un bouton, une card, un input — utiliser le DS
- `font-family: 'DM Mono'` dans un nouveau composant
- Margin négative pour repositionner après le header
- Touch target < 44px sur un élément interactif
- `console.log` non gardé dans du code de prod
- Anglais dans une string UI utilisateur
- Emojis décoratifs dans le code (les emojis métier dans des labels sont OK si demandés)
- Ajouter une dépendance npm sans justifier

---

## 6. WORKFLOW SUB-AGENT

1. **Lire** `.claude/AGENT_CONTRACT.md` (garde-fou anti-hallucination).
2. **Lire** les fichiers concernés AVANT toute édition.
3. **Coder** la mission strict scope — pas de débordement.
4. **Vérifier** localement :
   - `npx tsc --noEmit` → 0 erreur
   - `npm run test:unit` → 0 failed (baseline conservée)
   - `npm run build` → vert
5. **Rapport** : finir par bloc `=== VERIFICATION ===` complet
   (commandes + outputs **réels**, copiés bruts).

**Sans `=== VERIFICATION ===` complet → rapport rejeté, mission réassignée.**

---

## 7. EXEMPLE D'IMPORT TYPIQUE

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';

import AgritechLayout from '@/components/AgritechLayout';
import Eyebrow from '@/components/design/Eyebrow';
import {
  Card,
  SectionHeader,
  ActionRow,
  IconBox,
  Stat,
  StatsGrid,
} from '@/components/design-system';

const MyView: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AgritechLayout withNav>
      <div style={{ padding: '24px 16px', maxWidth: 720, margin: '0 auto' }}>
        <Eyebrow>Section</Eyebrow>
        <h1
          style={{
            fontFamily: 'var(--pt-font-display)',
            fontSize: 'var(--pt-text-display)',
            fontWeight: 700,
            color: 'var(--pt-text)',
          }}
        >
          Titre
        </h1>
        <SectionHeader label="Synthèse" />
        <StatsGrid cols={3}>
          <Stat value="17" label="Truies" />
          <Stat value="2" label="Verrats" />
          <Stat value="29" label="Pleines" tone="accent" />
        </StatsGrid>
        <Card style={{ padding: 8 }}>
          <ActionRow
            icon={<IconBox tone="primary" size={36}><Bell size={18} /></IconBox>}
            title="Toutes les alertes"
            description="3 en attente"
            badge={3}
            onClick={() => navigate('/alerts')}
          />
        </Card>
      </div>
    </AgritechLayout>
  );
};

export default MyView;
```

---

## 8. POUR ALLER PLUS LOIN

- `src/features/today/TodayHub.tsx` : design mère, référence visuelle
- `src/features/design-system/DesignSystemView.tsx` (route `/design-system`) : storybook-lite
- `src/styles/design-system-v29.css` : tokens canoniques
- `.github/pull_request_template.md` : checklist PR (à coller dans toute PR UI)
