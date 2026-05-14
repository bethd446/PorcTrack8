# AUDIT LIVRAISON PORCTRACK 8 — 2026-05-13

> Crash-test pré-livraison · 18 routes testées en localhost:5173 (Chrome DevTools MCP, viewport 390×844)
> Compte test : `audit-final@porctrack.test` · Ferme Audit Test (Belgique) · 50 truies · 3 verrats · 92 porcelets · 7 bandes

---

## Verdict global

**Santé technique : ✅ EXCELLENT** — tsc 0 erreur, build ✓ 3.13s, 75 requêtes Supabase 200/200, 0 page blanche détectée, 0 erreur console hors manifest dev (attendu).

**Cohérence design : 🟡 À CONSOLIDER** — 4 P0 sur les tokens CSS (système dupliqué + tokens fantômes), 6 P1 perceptibles. Pas bloquant mais visible pour un œil exigeant.

**Cohérence fonctionnelle : 🟡 À RELIRE** — bugs textuels (pluralisation, libellé statut triple), 1 doublon de bouton, devise/pays désynchros sur compte test.

**Décision livraison** : 🚀 **GO** sous condition de fixer les 6 P0 (≈ 90 min de travail).

---

## ✅ Ce qui marche très bien

| Vérif | Résultat |
|------|---------|
| `npx tsc --noEmit` | **0 erreur** |
| `npm run build` | ✓ built in **3.13s** · 107 entries précache 5.9 MB |
| Routes V70 actives | 18 routes testées · **toutes répondent** (aucune page blanche) |
| Réseau Supabase | **75 requêtes 200/200** (REST + Auth + Storage), aucun 4xx/5xx |
| Console errors (hors manifest dev) | **0** |
| Empty states (entité absente) | propres (ex : `/troupeau/loges/non-existent` → "LOGE INTROUVABLE · Retour aux loges") |
| Anti-patterns CLAUDE.md | **0 negative margin**, **0 localStorage en prod**, **0 couleur Tailwind hors palette** dans `src/v70/` |
| Landing-v2 | DNA "Terrain Vivant" respecté · vidéo hero + CTA propres |

---

## ⚠️ 20 points d'audit à corriger (par priorité)

### P0 — Bloquants UX / cohérence (à fixer avant livraison)

**1. Doublon de bouton « Nouvelle entrée » sur `/ressources/aliments`**
- `src/features/ressources/AlimentsView.tsx` — 2 boutons identiques rendus (uid 10_18 + 10_19 dans le snapshot). Le second est probablement le FAB qui se duplique parce que la page rend déjà son propre CTA.
- **Fix** : conditionner le FAB `SaisirFABMount` à `config !== 'aliments'` dans `usePageFabConfig`, ou supprimer le CTA inline.

**2. Pays « Belgique » + Devise « FCFA » sur la même fiche ferme**
- `/reglages/ma-ferme` affiche `PAYS · Belgique` puis `DEVISE · FCFA` (uid 6_16 / 6_20). La décision 2026-05-02 dit "Belgique → EUR auto". La logique de fallback `currency.ts` n'a pas tourné sur le seed `audit-final`.
- **Fix** : vérifier que `farms.metadata.currency` est rempli au signup pour les fermes BE/FR ; sinon migration SQL one-shot sur les comptes existants.

**3. Tokens CSS fantômes (3 usages fallback Tailwind imprévisible)**
- `src/v70/pages/EngraissementV70.tsx:183` → `var(--pt-danger-bg, #fde8e8)` — `--pt-danger-bg` non défini (existe `--pt-danger-bg-soft`).
- `src/v70/pages/EngraissementV70.tsx:427` → `var(--pt-warn, #b45309)` — non défini (existe `--pt-warning = #c08a3d`).
- `src/v70/components/V70ErrorBoundary.tsx:70` → `var(--pt-border)` — non défini (existe `--pt-line`).
- **Fix** : remplacer `--pt-warn → --pt-warning`, `--pt-border → --pt-line`, `--pt-danger-bg → --pt-danger-bg-soft`.

**4. Doublon de système de tokens dans MaFerme + MonEquipe (38 occurrences)**
- `src/v70/pages/MaFermeV70.tsx` et `MonEquipeV70.tsx` utilisent `var(--bg-surface)`, `var(--line)`, `var(--ink)`, `var(--muted)` (legacy `terrain-vivant-v6.css`) alors que tout le reste du shell V70 utilise `var(--pt-*)`.
- **Fix** : `sed -i '' 's/var(--bg-surface)/var(--pt-bg)/g; s/var(--line)/var(--pt-line)/g; s/var(--ink)/var(--pt-ink)/g; s/var(--muted)/var(--pt-muted)/g'` sur ces 2 fichiers.

**5. Définitions de tokens contradictoires entre 3 fichiers CSS**
- `--pt-bg` : `#FFFFFF` (`v70-tokens.css:17`) vs `#F2EEE3` (`design-system/tokens/tokens.css:5`).
- `--pt-danger` : `#a4453d` vs `#B23A2A`. `--pt-warning` : `#c08a3d` vs `#D4915C`.
- L'ordre d'import donne raison à `v70-tokens` à runtime mais flash visuel possible au boot.
- **Fix** : supprimer `design-system/tokens/tokens.css` (ou faire de `v70-tokens.css` le seul autoritaire).

**6. Pluralisation française cassée — lecture Marius**
- `src/features/troupeau/TruieDetailView.tsx` (zone "LECTURE DU DOSSIER · MARIUS") rend : *« T-026 compte **1 saillies** au registre dont **1 confirmées** »*.
- **Fix** : ajouter helper `plural(n, "saillie")` + `accord(n, "confirmée", "confirmées")`. 6 templates similaires dans le fichier.

### P1 — Perceptible (à corriger sous 24h)

**7. Texte PPA hardcodé « Côte d'Ivoire »**
- `MaFermeV70` (uid 6_47/6_48) : *« La PPA a coûté plus de 20 Mds FCFA aux éleveurs ivoiriens en 2024 »* sur une ferme Belgique.
- **Fix** : adapter le copy au pays via `farm.pays` ; texte BE/FR neutre ou stats EU PPA.

**8. Layout barre Marius incohérent entre écrans**
- `/today` et `/troupeau` : barre Marius **au-dessus** du header vert.
- `/reglages` : barre Marius **dans** le header vert (entre titre et liste).
- `/alerts` et `/protocoles` : **pas de barre Marius** du tout.
- **Fix** : standardiser dans `V70Routes` un slot fixe au-dessus de chaque page (ou désactiver explicitement le mount sur les pages où ça n'a pas de sens).

**9. `/engraissement` absent du bottom-nav**
- La route existe (`V70Routes.tsx:191`) mais aucun onglet ne la pointe → utilisateur perdu après navigation directe.
- **Fix** : soit ajouter un 6e onglet, soit la rendre accessible via `Réglages › Engraissement`, soit la fusionner dans `/troupeau?view=engraissement`.

**10. Statut truie triple libellé**
- `/troupeau/truies/T-026` : sous-titre `Allaitante · J115 post-saillie`, badge `ALLAITANTE`, bloc `STATUT · En maternité`. Trois libellés pour le même état métier.
- **Fix** : unifier sur `MATERNITÉ` (cohérent avec onglet liste) + sous-titre `J{n} de lactation`.

**11. Fallbacks inline erronés sur `var(--pt-*)`**
- `PerformanceV70.tsx:251,633` → `var(--pt-warm, #faf6ef)` (vrai = `#F5E9D8`).
- `EngraissementV70.tsx:184` → `var(--pt-danger, #991b1b)` (vrai = `#a4453d`).
- `SynchronisationV70.tsx:253` → `var(--pt-primary, #064e3b)` (vrai = `#2D4A1F`).
- **Fix** : soit aligner, soit supprimer les fallbacks (tokens définis statiquement, jamais undefined).

**12. 36 × `fontFamily: 'var(--pt-font-display)'` inline + classes manquantes**
- Aucune classe `.ft-display` / `.ft-mono` / `.ft-body` dans `v70-global.css`. Les classes legacy `.ft-heading` / `.ft-code` du CLAUDE.md ne sont pas portées en V70.
- **Fix** : ajouter trois classes utilitaires dans `v70-global.css`, refactor inline → `className="ft-display"`.

**13. Touch target `<select>` filtres tri AnimalsV70 < 44 px**
- `AnimalsV70.tsx:482, 508` : `padding: '6px 12px'` + `fontSize: 12` → hauteur ~28 px. Inutilisable au doigt sur mobile.
- **Fix** : `padding: '10px 14px'` + `minHeight: 44`.

**14. Bundle `vendor-misc` 1.55 MB / 416 KB gzip (chunkSizeWarning Vite)**
- Build émet l'avertissement Rollup. Pénalise le LCP sur réseau 3G/4G (cible naisseurs Afrique de l'Ouest).
- **Fix** : `manualChunks` Rollup pour isoler GSAP, date-fns, radix-ui, lucide. Quick win = `+50 KB transfer cellulaire évité`.

### P2 — Mineur (à inscrire au prochain sprint)

**15. Polices `DM Mono` + `Bricolage Grotesque` non chargées en V70**
- Brief CLAUDE.md mentionne 4 polices (`.ft-heading`, `.ft-code`, `.ft-values`, body). Implé V71 typo-lock charge uniquement BigShoulders + InstrumentSans. `--pt-font-mono` = InstrumentSans (commentaire "V71 typo-lock"). Fallback `monospace` répété 12 fois dans `PerformanceV70` est trompeur.
- **Fix** : soit re-importer DM Mono via `@font-face` woff2 + `.ft-code`, soit documenter formellement la décision V71 et supprimer les fallbacks `'monospace'`.

**16. `rgba(164, 69, 61, 0.08)` hardcodé sans token**
- `ReglagesV70.tsx:239`, `MonEquipeV70.tsx:341-342`. Couleur danger en dur.
- **Fix** : créer `--pt-danger-tint-08` ou réutiliser `--pt-danger-bg-soft`.

**17. Classes legacy `.btn-primary/.btn-secondary/.btn-accent/.btn-ghost` mortes**
- `v70-global.css:158-164` : aucune page V70 ne les utilise (`.btn--primary` BEM partout).
- **Fix** : supprimer les 4 sélecteurs legacy (gain : -7 lignes CSS).

**18. CTA empty state à 36 px de haut (touch borderline)**
- `EngraissementV70.tsx:224`, `AnimalsV70.tsx:647` : `padding: '11px 18px'` + `fontSize: 11` → 36 px.
- **Fix** : `padding: '14px 18px'` ou `minHeight: 44`.

**19. STUBS hardcodés dans AnimalsV70 (truies/verrats/porcelets fictifs)**
- `AnimalsV70.tsx:62-98` rend 5 const fallback "T-001…T-024" si FarmContext vide. Bandes/Loges font empty state V73 (cohérent), Truies/Verrats/Porcelets restent en stub démo.
- **Fix** : aligner sur empty state V73 pour les 3 entités restantes (cohérence + pas de fausses données visibles).

**20. Console "Manifest: Line 1, column 1, Syntax error" en DEV**
- `index.html` référence `/manifest.webmanifest`, généré par `vite-plugin-pwa` **uniquement au build**. En dev, le serveur renvoie le `index.html` à la place → erreur de parsing JSON visible.
- **Fix** : acceptable tel quel (disparaît en prod). Sinon ajouter un `dev.handleHotUpdate` qui sert un manifest minimal en dev, ou retirer la balise `<link rel="manifest">` en dev.

---

## Métriques mesurées

```
[tsc]              npx tsc --noEmit                → 0 erreur
[build]            npm run build                   → ✓ built in 3.13s
[build] warning    vendor-misc-_0HjlBS-.js         → 1,553.86 kB (gzip 416.73 kB)
[build] PWA        precache                        → 107 entries · 5903.90 KiB
[net]              75 requêtes Supabase           → 100% 200 OK
[console errors]   hors manifest dev               → 0
[routes testées]   /, /today, /troupeau, /troupeau/truies/:id, /troupeau/verrats/:id,
                   /troupeau/loges/:id (not-found), /reproduction, /performance,
                   /engraissement, /alerts, /protocoles, /ressources,
                   /ressources/aliments, /ressources/pharmacie, /reglages,
                   /reglages/ma-ferme, /reglages/mon-equipe, /reglages/encyclopedie,
                   /reglages/sync, /controle, /pilotage/finances/details,
                   /marius, /landing-v2
                                                   → 18 routes OK
[screenshots]      /Users/13mac/PorcTrack8/.claude/audits/v3.6-screens/01-22 → 22 PNG
```

---

## Plan de fix recommandé (90 min)

| Bloc | Tâche | Effort |
|------|-------|--------|
| **30 min** | P0 #3 + #4 + #5 (tokens : fantômes + doublon MaFerme/MonEquipe + contradictions) — `sed` + édits ciblés `v70-tokens.css` | 30 min |
| **20 min** | P0 #1 (doublon bouton Aliments) + P0 #2 (devise BE → EUR) | 20 min |
| **15 min** | P0 #6 (pluralisation Marius) — helper `plural()` | 15 min |
| **15 min** | P1 #8 + #9 (layout Marius cohérent + Engraissement entry) | 15 min |
| **10 min** | P1 #14 (Rollup manualChunks GSAP/radix/lucide) | 10 min |

Total : **~90 min** pour repasser à 100% sur les 6 P0 + 3 P1 critiques.

Les P2 (#15-#20) sont à inscrire au prochain sprint sans impact sur la livraison du jour.

---

*Audit produit par orchestrateur Opus 4.7 + sub-agent Opus 4.7 (audit design statique) + crawl Chrome DevTools MCP en parallèle. Aucune modification de code effectuée — audit lecture seule.*
