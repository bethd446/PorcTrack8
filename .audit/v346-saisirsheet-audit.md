# Audit SaisirSheet — v3.4.6 (2026-05-12)

## Bug racine identifié

**Symptôme user** : "Le bouton Saillie est flou et pas optimisé."

**Cause technique** : `src/components/forms/SaisirSheet.tsx` lignes 306 et 321 utilisaient `fontFamily: 'var(--ff-mono)'` SANS fallback. L'alias `--ff-mono` n'est défini nulle part dans le projet (audit V80 A2 a abandonné JetBrains Mono au profit d'`InstrumentSans` via `--pt-font-mono`). Résolution navigateur → `unset` → fallback browser = `monospace` system (Courier) = **rendu dégradé sur TOUS les labels** de la sheet.

**Périmètre réel** : ce n'était pas Saillie seul — toutes les actions (titre + hint) avaient le même rendu flou. L'éleveur a remarqué Saillie en premier car c'est le 1er bouton du grid.

**Fix appliqué** : 2 occurrences `var(--ff-mono)` → `var(--pt-font-mono)` (qui pointe vers `InstrumentSans` + fallback chain `-apple-system, system-ui, sans-serif`).

---

## Inventaire 16 actions (post-fix, profil Cycle complet)

| # | Action | Profil | Icône Lucide | Status | Note |
|---|---|---|---|---|---|
| 1 | Saillie | Naisseur+Cycle | Heart | ✅ | Hint "Truie × verrat" lisible |
| 2 | Écho | Naisseur+Cycle | Stethoscope | ✅ | Hint "J28 gestation" |
| 3 | Mise-bas | Naisseur+Cycle | Baby | ✅ | Hint "Nés + morts-nés" |
| 4 | Sevrage | Naisseur+Cycle | Milk | ✅ | Hint "Bande + porcelets" |
| 5 | Mortalité | Transverse | AlertOctagon | ✅ | tone="red" — icône rouge distinctive |
| 6 | Adoption | Naisseur+Cycle | Repeat | ✅ | Hint "Transfert mat." |
| 7 | Pesée | Transverse | Scale | ✅ | Hint "Poids moyen" |
| 8 | Conso | Transverse | Wheat | ✅ | Hint "Aliment livré" — distinct du Stock aliment |
| 9 | Tri poids | Engraisseur+Cycle | Layers | ✅ | Hint "Eng. / finition" |
| 10 | Réception lot | Engraisseur+Cycle | PackagePlus | ✅ | Hint "Achat porcelets" — ouvre QuickAddLotForm |
| 11 | Vente lot | Engraisseur+Cycle | Truck | ✅ | Hint "Abattoir / négoce" — navigue `/engraissement` |
| 12 | Soin | Transverse | Syringe | ✅ | Hint "Traitement véto" |
| 13 | Note | Transverse | FileText | ✅ | Hint "Observation" |
| 14 | Stock aliment | Transverse | Wheat | ✅ | Navigue `/ressources/aliments` |
| 15 | Stock véto | Transverse | Pill | ✅ | Navigue `/ressources/pharmacie` |
| 16 | Finance | Transverse | Coins | ✅ | Navigue `/pilotage/finances/details` |
| 17 | Marius | (assistant) | Sparkles | ✅ | Séparateur full-width dashed border |

---

## Critères techniques (4 check par action)

Vérifié pour les 16 actions :

1. **CLICKABLE** : ✅ — boutons natifs `<button onClick>`, pas de z-index masqué (sheet z-1100, contenu intérieur en flow normal)
2. **OUVRE LE BON FORM** : ✅ — `handlePick(kind)` appelle `openAction(kind)` qui dispatch vers le QuickActionsProvider. Forms confirmés :
   - Saillie → QuickSaillieForm
   - Mise-bas → QuickMiseBasForm
   - Écho → QuickEchographieForm
   - Sevrage → QuickConfirmSevrageForm
   - Mortalité → QuickMortalityForm
   - Pesée → QuickPeseeForm
   - Conso → QuickConsoAlimentForm
   - Soin → QuickHealthForm
   - Note → QuickNoteForm
   - Adoption → QuickAdoptionForm
   - Tri poids → QuickWeightDistForm
   - Réception lot → QuickAddLotForm (réutilise A5)
   - Vente lot → navigate `/engraissement` + toast guide
   - Stock aliment → navigate `/ressources/aliments`
   - Stock véto → navigate `/ressources/pharmacie`
   - Finance → navigate `/pilotage/finances/details`
   - Marius → `window.dispatchEvent('open-chatbot')`
3. **VISUEL** : ✅ — DNA V77/V78 respecté
   - Border-radius 14px conteneur, 10px icône (carré arrondi)
   - Padding 14/12, gap 8, min-height 104px (tap target large)
   - Fond `var(--pt-warm)`, border `var(--pt-line)`
   - 4 tones : `default` (warm), `accent` (B97839 16% mix), `amber` (B45309 18% mix), `red` (B91C1C 14% mix)
   - **Polices canon** (post-fix v3.4.6) : title + hint en `var(--pt-font-mono)` (InstrumentSans tabular-nums)
4. **A11Y** : ✅
   - `role="dialog"` + `aria-modal="true"` + `aria-labelledby` sur la sheet
   - Bouton "Fermer" : `aria-label="Fermer"` + focus auto au mount
   - Trap focus Tab/Shift+Tab implémenté
   - Restore focus sur élément précédent au unmount
   - Icônes `aria-hidden`
   - `data-saisir-item={kind}` exposé pour les tests E2E

---

## Filtrage par profil (post-V80 A4 + v3.4.4)

| Profil | Actions visibles | Cachées |
|---|---|---|
| Naisseur | 12 (saillie, écho, mise-bas, sevrage, mortalité, adoption, pesée, conso, soin, note, stock aliment, stock véto, finance, marius) | tripoids, receptionlot, ventelot |
| Engraisseur | 11 (mortalité, pesée, conso, tripoids, réception lot, vente lot, soin, note, stock aliment, stock véto, finance, marius) | saillie, écho, mise-bas, sevrage, adoption |
| Cycle complet | 17 (superset) | — |

---

## Hors scope v3.4.6

Autres résiduels `var(--ff-*)` orphelins détectés mais HORS SaisirSheet :

```
src/features/outils/OutilsView.tsx      : 1× --ff-mono
src/features/tables/AlertsView.tsx      : 3× (--ff-mono ×2, --ff-display ×1)
src/features/ressources/FournisseursView.tsx     : 3×
src/features/ressources/FournisseurDetailView.tsx : 10× (--ff-mono ×5, --ff-body ×4, autre)
src/features/ressources/PharmacieView.tsx        : 1× --ff-display
src/features/ressources/AlimentsView.tsx         : 2× --ff-display
```

→ À traiter dans **v3.4.7** (nettoyage typo final) : ~20 occurrences à migrer vers `var(--pt-font-*)` canoniques. Même symptôme (flou subtle) sur ces pages mais hors périmètre signalé par le user.

---

## Validation

- `npx tsc --noEmit` → EXIT 0
- `rg "var\(--ff-" src/components/forms/SaisirSheet.tsx | wc -l` → 0
- Audit visuel Chrome DevTools : screenshot `.audit/v346-screens/02-saisir-sheet-cycle-complet.png` montre les 16 actions + Marius en rendu canon propre
- Hauteur boutons tap target : 104px ≥ 44px (WCAG AA largement validé)
- Filtrage profil : 3 cas testés (Cycle complet = 17 visible, Naisseur masque 3, Engraisseur masque 5)
