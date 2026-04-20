# Troupeau

Liste truies/verrats/porcelets, filtrage par catégorie + recherche. Accent: teal.

## Fichiers

- `source.jsx` — composant React DOM (JSX vanille). Ionic React port : remplacer les `<div>` de layout par `IonPage`/`IonContent`, garder toutes les classes CSS + tokens.
- `preview.html` — bundle HTML standalone (offline, autonome). Ouvre-le dans n'importe quel navigateur.
- `tokens.json` — extrait des tokens utilisés par cet écran (sous-ensemble de `_shared/tokens.json`).
- `screenshot.png` — capture mobile 390×844.

## Dépendances (composants partagés)

Ce fichier importe globalement (via `window`) les composants exposés par :
- `_shared/components/Primitives.jsx` — `Card`, `Button`, `Chip`, `DataRow`, `SectionDivider`, `HubTile`, `KpiCard`, `SparkCard`, `Icon`, `Progress`
- `_shared/components/Chrome.jsx` — `AgritechHeader`, `BottomNav`, `FAB`, `BottomSheet`, `FinancesFAB`, `PhoneFrame`

## Intégration Ionic React

```tsx
import { IonPage, IonContent, IonHeader } from '@ionic/react';
import '_shared/colors_and_type.css';
import '_shared/components.css';
// ... copier le JSX de source.jsx en remplaçant :
//   - <div style={{ position: 'absolute', ... }}>  →  <IonPage>
//   - <div style={{ flex: 1, overflowY: 'auto' }}> →  <IonContent>
//   - <BottomSheet>                                 →  <IonModal breakpoints={[0, 0.8]}>
```

## Tokens clés

Voir `tokens.json`. Couleurs principales utilisées :
- Accent écran · surface `--bg-0`/`--bg-1`/`--bg-2`
- Texte `--text-0`/`--text-1`/`--text-2`
- Bordures `--border`
