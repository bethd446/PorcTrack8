# design-briefs/

Specs structurées d'écrans à prototyper dans **Claude Design**.

Chaque fichier = 1 écran / flow. Claude Design lit ce dossier via GitHub → pas besoin de recoller le contexte à chaque itération.

## Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Écrire brief           design-briefs/XX-nom.md              │
│  2. Claude Design          Lit le brief depuis GitHub           │
│  3. Prototypage            Itérations dans claude.ai/design     │
│  4. Screenshot final       docs/design-mockups/XX-nom.png       │
│  5. Lien source ajouté     Dans design-briefs/XX-nom.md (§Source)│
│  6. Claude Code implémente Sur demande "implémente XX"          │
└─────────────────────────────────────────────────────────────────┘
```

## Convention de nommage

`XX-nom-court.md` où `XX` = numéro d'ordre (01, 02, …). Garder nom court kebab-case.

Exemples :
- `01-finances.md`
- `02-rapport-financier.md`
- `03-historique-pesees.md`
- `04-detail-loge.md`

## Template

Copier [_TEMPLATE.md](_TEMPLATE.md) et remplir. Tous les champs `[entre crochets]` doivent être remplis — sinon Claude Design redemande.

## Cycle de vie d'un brief

| Statut | Ce qu'il signifie | Qui agit |
|--------|-------------------|----------|
| `📝 draft` | Brief écrit, pas encore envoyé à Claude Design | Owner |
| `🎨 in-design` | Envoyé à Claude Design, itérations en cours | Claude Design |
| `✅ ready-to-code` | Maquette validée + screenshot déposé + lien source | Claude Code |
| `🚀 shipped` | Implémenté dans l'app, testé, commité | — |

Mettre à jour le champ `status` en haut du brief à chaque étape.
