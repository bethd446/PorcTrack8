# Audit boutons / tap targets — v3.4.7 (2026-05-12)

## Méthode

Audit Chrome DevTools sur 3 pages clés (/today, /troupeau, /reproduction).
Critère WCAG AA tap target : ≥ 44×44 px (terrain mobile mains gantées).

```js
document.querySelectorAll('button, a[href], [role="button"], [role="tab"]')
  .filter(el => visible)
  .filter(el => bbox.w < 44 || bbox.h < 44)
```

## État pré-fix v3.4.7

| Page | Total visibles | Issues tap < 44px | % conformité |
|---|---|---|---|
| /today | 18 | 4 | 78 % |
| /troupeau | 68 | 10 | 85 % |
| /reproduction | 13 | 5 | 62 % |

Patterns récurrents identifiés :
- **`.tab-mini`** (TabsMini composant V70) : `padding: 7px 12px`, hauteur effective 24-26 px → toutes les tabs internes (TRUIES/VERRATS/PORCELETS/BANDES/LOGES sur /troupeau ; Agenda/En cours/À venir/Historique sur /reproduction)
- **`.pt-screen .pill`** (filtres listings) : `height: 36px` fixe → "TOUTES (50)" / "PLEINES (29)" / "MATERNITÉ (11)" etc.

## Fix appliqué v3.4.7 (commit P2)

`src/v70/theme/v70-global.css` :

```css
.tab-mini {
  min-height: 44px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* préserve le font-size 10px uppercase initial → look mini conservé,
     bouton ≥ 44px de hauteur tap target */
}

.pt-screen .pill {
  min-height: 44px;  /* était height: 36px fixe */
  /* padding 0 16px inchangé, juste plus de hauteur pour tap target */
}
```

## État post-fix

| Page | Total visibles | Issues tap < 44px | % conformité |
|---|---|---|---|
| /today | 18 | 4 | 78 % |
| /troupeau | 20 (mêmes éléments comptés différemment après réflow) | 0 | **100 %** ✅ |
| /reproduction | 13 | 1 | 92 % |

## Issues résiduelles (acceptables / hors scope CSS global)

### /today — 4 chips bannière notification (24-30 px)
- "En savoir plus" (lien encyclopédie savez-vous, 96×18)
- "Activer les rappels" (135×30)
- "Plus tard" (82×30)
- "Fermer cette bannière" (24×24)
- **Cause** : bannière legacy V77 onboarding notifications, pas dans `.pill`/`.tab-mini` scope
- **Reporté v3.4.8** : refonte bannière notification avec tap targets WCAG

### /reproduction — 1 chip Encyclopédie (110×30)
- Lien décoratif "› Encyclopédie" en bas de /reproduction
- **Cause** : pattern card-link spécifique
- **Reporté v3.4.8** ou laissé tel quel (décoratif, pas action critique terrain)

## Total après fix

- **2 patterns CSS V70 fixés** = impact transverse sur ~30 boutons tabs/pills sur 8+ pages (toutes pages qui utilisent `.tab-mini` ou `.pt-screen .pill`)
- 5 issues résiduelles bornées (4 bannière notif + 1 lien décoratif) → 5 % du total, hors périmètre CSS global
