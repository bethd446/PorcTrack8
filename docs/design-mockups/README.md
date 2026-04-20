# docs/design-mockups/

Livrables **Claude Design** — source, preview et tokens pour chaque écran.

## Structure par écran

Chaque écran = 1 sous-dossier :

```
docs/design-mockups/
├── 01-finances/
│   ├── source.jsx              # Code JSX vanilla React DOM de Claude Design
│   ├── preview.html            # Bundle HTML standalone offline (archivable)
│   ├── tokens.json             # Tokens utilisés par cet écran (dérivé du CSS vars)
│   ├── screenshot.png          # Capture mobile 390×844
│   ├── screenshot-v2.png       # Si variantes multiples
│   └── README.md               # Brief résumé + lien Claude Design + notes
├── 02-rapport-financier/
│   └── …
└── _shared/
    ├── colors_and_type.css     # Tokens CSS globaux (source de vérité Claude Design)
    ├── components.css          # Classes utilitaires partagées
    └── tokens.json             # Bundle tokens complet (Style Dictionary format)
```

## Flux de livraison

1. Claude Design finit une maquette
2. Claude Design génère un zip `NN-nom.zip` avec le contenu ci-dessus
3. **Tu** télécharges le zip depuis le chat Claude Design
4. **Tu** dézippes dans `docs/design-mockups/NN-nom/`
5. **Tu** dis à Claude Code : *« code le mockup `NN-nom` »*
6. Claude Code lit `design-briefs/NN-nom.md` + `docs/design-mockups/NN-nom/` → implémente en Ionic React
7. Commit + APK + mise à jour brief status `🚀 shipped`

## preview.html (bundle standalone)

Fichier unique contenant fonts, CSS, JS inline → ouvrable dans n'importe quel navigateur sans serveur, sans connexion. Archivable durablement (survit aux URLs Claude Design qui expirent après ~1h).

**Convention** : `preview.html` ouvre directement sur l'écran principal. Si plusieurs variantes, suffixer `preview-v1.html`, `preview-v2.html`.

## tokens.json

Format **Style Dictionary** compatible (plat ou nested), permet :
- Sync automatique possible côté Claude Code (script qui régénère `src/styles/agritech-tokens.css` depuis `_shared/tokens.json`)
- Lecture par outils externes (Figma Tokens, FigMail, etc.)

## source.jsx (React DOM → Ionic React)

Claude Design produit du React DOM + JSX + CSS inline. Portage vers Ionic ≈ 20 min / écran :

| Claude Design | Ionic équivalent |
|---------------|------------------|
| `<div>` chrome (header fixe) | `<IonHeader>` + `<IonToolbar>` |
| `<div>` scroll container | `<IonContent fullscreen>` |
| `<div>` bottom sheet | `<IonModal>` avec `breakpoints` |
| `<button>` onClick | `<IonButton>` ou `<button>` direct selon cas |
| `<input>` | `<IonInput>` ou `<input>` direct |

**Ce qu'on garde tel quel** : classes CSS, composants agritech (KpiCard, Chip…), logique d'état, structure JSX interne.

## _shared/

Tokens et CSS globaux partagés entre tous les écrans. Mise à jour seulement quand le design system évolue (ex. nouveau token ajouté).

## Sync tokens.json → src/styles/

Script à créer : `scripts/sync-design-tokens.mjs` qui lit `docs/design-mockups/_shared/tokens.json` et régénère `src/styles/agritech-tokens.css`. À faire dans une itération future — pour l'instant on sync manuellement.
