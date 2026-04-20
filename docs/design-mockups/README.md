# docs/design-mockups/

Livrables visuels produits par **Claude Design** et prêts à être implémentés par **Claude Code**.

## Convention

Pour chaque écran du brief `design-briefs/XX-nom.md`, déposer ici :

```
docs/design-mockups/
├── XX-nom.png           # Screenshot principal (mobile 390×844 idéalement)
├── XX-nom-variante2.png # Si 2 variantes prototypées
├── XX-nom.source.md     # Lien Claude Design + export JSX/HTML si disponible
└── XX-nom.notes.md      # Notes optionnelles (détails hors brief)
```

**Exemple** :

```
01-finances.png
01-finances-empile.png
01-finances-synthese.png
01-finances.source.md
```

## Format attendu

### Screenshots

- **Résolution** : 390×844 (iPhone 14) ou 414×896 (iPhone Pro Max)
- **Format** : PNG (pas de compression JPEG)
- **Capture** : viewport Claude Design en mode aperçu mobile, plein écran (pas de chrome navigateur)
- **Thème** : dark (Agritech Dark par défaut) — si un écran existe en light, suffixer `-light.png`

### Fichier .source.md

Exemple :

```markdown
# Source — 01 Finances

- **Lien Claude Design** : https://claude.ai/design/[id]
- **Variante retenue** : 2 (SYNTHÈSE)
- **Date design finalisé** : 2026-04-20
- **Brief associé** : ../../design-briefs/01-finances.md

## Export JSX (si Claude Design le fournit)

\`\`\`jsx
[coller ici le code source produit par Claude Design si accessible]
\`\`\`

## Notes d'implémentation

[À adapter côté code : remplacer les composants React DOM par les
équivalents Ionic React, brancher FarmContext, etc.]
```

## Workflow de handoff

Quand un écran est prêt à être codé :

1. Vérifier que le brief a `status: ✅ ready-to-code`
2. Dire à Claude Code : *« implémente le mockup `01-finances` »*
3. Claude Code lit :
   - `design-briefs/01-finances.md`
   - `docs/design-mockups/01-finances.png`
   - `docs/design-mockups/01-finances.source.md` (si présent)
4. Code + tests + APK
5. Mettre à jour le brief : `status: 🚀 shipped`
