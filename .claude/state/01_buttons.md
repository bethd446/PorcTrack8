# Sub-agent 1 — Boutons UI (terminé)
Log: /tmp/audit-1-buttons.log

## P0 (2)
1. `src/features/troupeau/PorceletDetailView.tsx:410-413` — 4 boutons GTTT inertes (Peser/Soigner/Vendu/Mortalité). Route active `/troupeau/porcelets/:id`. Probable régression design.
2. `src/features/troupeau/PorceletDetailView.tsx:236-242` — Menu MoreHorizontal header fiche sans handler / state.

## P1 (2)
3. `src/v70/components/v70/EncyclopediaArticle.tsx:264` — CTA "Marquer comme lu" décoratif, pas de prop `onMarkAsRead`.
4. `src/features/admin/PendingValidationsView.tsx:80` — `navigate('/sante')` route inexistante → fallback silencieux.

## P2 (7)
- `src/features/protocoles/ProtocolApplicationSheet.tsx:214` — "Ajouter photo" sans handler
- `src/features/design-system/DesignSystemView.tsx:286,297,313,323,333` — 5 no-op démo

## Dead code (10+ fichiers, ~3000L)
- Chaîne legacy nav AgritechLayout/Header/AppSidebar (853L)
- PendingBandesBanner + PendingBandesView (165L+)
- AgritechNavV2 (~480L hors QuickActionsProvider qui est utilisé)
- TableView + tableLoader (services)
- DesignSystemView (orphelin)
- design/Sidebar + design/MariusFAB

## Routes mortes
- `/onboarding/bandes-pending` (composant DEAD)
- `/sante` (jamais définie)
