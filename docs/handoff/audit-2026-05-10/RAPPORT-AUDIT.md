# Audit localhost — 2026-05-10

> Audit transverse des 5 onglets V70 + sous-pages réglages + fiches détail.
> Compte test : `audit-final@porctrack.test` (50 truies / 3 verrats / 92 porcelets / 6 bandes / 0 loge).
> Méthode : navigation Chrome DevTools MCP, viewport mobile 390×844.
> Screenshots : `01-landing.png` → `10-bande-detail.png` (mêmes dossier).

---

## P0 — Bloquants à corriger immédiatement

### P0-1 · ~~Écran "Ma ferme" V70 affiche données fantômes~~ → **FAUX POSITIF**
**Statut (vérifié 2026-05-10 Lot 2)** : pas un bug. Le snapshot initial avait été pris pendant le render asynchrone de `MaFermeV70` — entre le moment où le composant monte avec `farm = null` (fallback "Ma ferme") et la réponse de `fetchFarm(user.id)` peuplant le state. Hard reload vérifié via Supabase MCP (table `troupeaux` row `da7b5a17-...` avec `nom_ferme = 'Ferme Audit Test'`, RLS `auth.uid() = user_id` OK) puis re-render browser : tout s'affiche correctement (nom, code FERM-DA7B5A, pays Belgique, bilan 50/3/6).
**Dette UX résiduelle (P3)** : l'écran flash le fallback "Ma ferme" pendant 100-300ms à la première navigation. Un skeleton ou `Suspense` pendant le `fetchFarm` évacuerait ce flash. Pas urgent.

### P0-2 · Clic "Bande" depuis Élevage > Bandes redirige vers /reproduction
**Fichier** : à localiser dans `src/v70/pages/AnimalsV70.tsx` (carte bande, vue=bandes)
**Symptôme** : cliquer la carte entière d'une bande dans la liste mène à `/reproduction` (agenda) au lieu de la fiche bande détail. Seul le sous-bouton "Voir la fiche bande" (présent dans la vue Porcelets) ouvre `/troupeau/bandes/{uuid}`.
**Impact** : navigation cassée pour le scénario principal Élevage > Bandes > sélection.
**Fix** : router le clic principal sur `/troupeau/bandes/{id}` au lieu de `/reproduction`.

### P0-3 · Texte technique "refonte V71+" exposé à l'utilisateur
**Fichiers** :
- `src/v70/pages/MaFermeV70.tsx:339` → "Édition complète sur l'écran legacy (refonte V71+)."
- `src/v70/pages/MonEquipeV70.tsx:687` → "Console admin (rôles, invitations) — refonte V71+."

**Symptôme** : l'app admet sa propre dette technique en clair dans l'UI. Friction de crédibilité forte (anti-AI feel inversé : ça SENT le chantier inachevé).
**Fix** : remplacer par une copie neutre orientée action ("Modifier la ferme →", "Inviter un membre →") et supprimer la mention legacy/V71.

---

## P1 — Frictions visuelles importantes

### P1-1 · BottomNav avec emojis Unicode (4/5 tabs)
**Fichier** : `src/v70/components/v70/BottomNav.tsx:23,25,26,27`
**Symptôme** :
- `today` : icon `'⌂'`
- `repro` : icon `'❤'`
- `perf`  : icon `'📊'`
- `settings` : icon `'⚙'`
- (`animals` utilise déjà `<PigSilhouette />` Lucide ✅)

**Impact** : DNA V70 strict refuse les emojis. Friction "AI feel" connue (memo `feedback_anti_ai_aesthetic.md`). Rendu hétérogène entre devices (emoji noir/coloré).
**Fix** : remplacer par 4 Lucide (`Home`, `Heart`, `BarChart3`, `Settings`) en `size={20}`, cohérent avec `PigSilhouette`.

### P1-2 · Écrans legacy V43 atteignables via Réglages
**Routes legacy détectées** :
- `/reglages/systeme` — hub Réglages V43, footer "PORCTRACK V43 · BUILD V2.1.0". Cible du bouton "Modifier la ferme" sur l'écran V70.
- `/ressources` — empty state legacy. Cible du bouton "Ressources & stocks" depuis Réglages V70.
- `/protocoles` — eyebrow "OUTILS · PROTOCOLES" (onglet "Outils" pourtant supprimé en V70). Cible du bouton "Protocoles santé".

**Impact** : trois écrans legacy V43 sont des cul-de-sac UX accessibles via la nav V70 propre.
**Fix** : soit reconstruire ces 3 écrans en V70, soit (V71.x temporaire) styler-wrapper pour qu'ils ne hurlent plus "V43".

### P1-3 · Format technique nommage bandes (4/6 bandes)
**Fichier** : à grep sur les call-sites qui n'utilisent pas `formatBandeName()`.
**Symptôme** : bandes affichées avec leur ID brut `B-20260503-M-02`, `B-AUDIT-MB`, `B-AUDIT-PS`, `B-AUDIT-CR` au lieu d'un nom court humain. Visible dans :
- Élevage > Bandes (liste principale)
- Élevage > Porcelets (groupage par bande)
- Repro > En cours (cycles actifs)
- Performance > Top performances
- Performance > Prévisions (mises-bas)

**Cause probable** : `formatBandeName()` ne couvre pas les bandes avec ID préfixé `B-` arbitraire (testées dans `formatBandeName.test.ts` mais pas pour ce format).
**Fix** : étendre `formatBandeName()` pour normaliser ces patterns (`B-AUDIT-MB` → "Audit MB" ou `B-20260503-M-02` → "Mai 2026 · M-02"), ou l'appliquer aux call-sites manquants.

### P1-4 · Emojis dans titres de cards
**Fichiers** :
- `src/v70/pages/PerformanceV70.tsx:467` → `<EduCard label="🔮 Prévisions d'élevage">`
- `src/v70/pages/ReproV70.tsx:461` → "📦 Historique des bandes terminées"

**Fix** : remplacer 🔮 et 📦 par Lucide (`TrendingUp`, `Archive`) ou retirer purement.

### P1-5 · URL fiches incohérentes (UUID vs code court)
**Symptôme** :
- Truie : `/troupeau/truies/fa790120-538a-494a-8622-49588b347567` (UUID complet)
- Bande : `/troupeau/bandes/56284a1c-542f-4596-bc90-65059ae53f9c` (UUID complet)
- Verrat : `/troupeau/verrats/V-001` (code court humain ✅)

**Impact** : impossible de partager un lien lisible truie/bande, deeplinks fragiles.
**Fix** : aligner sur `code` (T-001, B-AUDIT-MB) avec fallback UUID si conflit. Pattern verrat OK à généraliser.

### P1-6 · Sous-tabs Performance sans deeplink URL
**Fichier** : `src/v70/pages/PerformanceV70.tsx`
**Symptôme** : tabs VUE / KPIS / FINANCES / PRÉVISIONS changent le focus visuel mais pas l'URL (reste `/performance`). Refresh perd l'état, pas de deeplink.
**Référence saine** : `ReproV70` utilise `?tab=en-cours`, `?tab=historique` correctement → reproduire le pattern.

### P1-7 · Date format ISO US sur fiche bande
**Fichier** : `src/v70/pages/BandeDetailView.tsx` (à confirmer)
**Symptôme** : "MB 2026-05-03" (format ISO) au lieu de "MB 03/05/2026". Helper `formatDateFr` existe (`src/v70/lib/formatters`).
**Fix** : appliquer `formatDateFr()` au champ MB de la fiche bande.

---

## P2 — Frictions UX mineures

### P2-1 · Tabs label collé au compteur (sans espace)
**Écrans** : `/ressources` ("ALIMENTS0", "PHARMACIE0"), `/protocoles` ("CYCLE5", "TERRAIN4", "BIOSÉCURITÉ3", "RATIONS3", "LISTES2").
**Fix** : interpoler `${label} (${count})` ou `${label} · ${count}`.

### P2-2 · Empty state Loges affiche 2 boutons "Ajouter une loge"
**Fichier** : à localiser sur `/troupeau?view=loges`.
**Cause probable** : un bouton dans la card empty + un FAB redondant.
**Fix** : retirer le FAB quand l'empty state est affiché.

### P2-3 · Eyebrow "OUTILS · PROTOCOLES"
**Fichier** : page legacy `/protocoles` (`src/pages/ProtocolesPage.tsx` ou équivalent).
**Symptôme** : "OUTILS" est l'onglet supprimé en V70 (mémo brief V70).
**Fix** : "RÉGLAGES · PROTOCOLES" si on garde le legacy, ou refonte V70 propre.

### P2-4 · Apostrophes typographiques inconsistantes
**Fichier** : `/protocoles` — mix `l'écrasement` (droite) et `l’appétit` (courbe).
**Fix** : passer toute la copy française en `’` (U+2019) ou tout en `'` (mais le brief V70 ne le précise pas).

### P2-5 · Manifest dev casse
**Symptôme** : `/manifest.webmanifest` retourne `text/html` (SPA fallback Vite) → console "Manifest: Line: 1, column: 1, Syntax error."
**Impact** : DEV-ONLY. En prod (Hostinger), le fichier est servi statiquement. Ne pas paniquer.
**Fix** : (optionnel) ajouter dans `vite.config.ts` ou `public/manifest.webmanifest` pour servir en dev. Faible priorité.

---

## ✅ Zones V70 conformes (RAS)

- **Tab Aujourd'hui** : eyebrow + heading Big Shoulders, KPIs élevage, tournée, CTA rappels. Conforme.
- **Tab Élevage > Truies** : 5 sous-tabs, filtres (50/28/11/6/5), tri, liste 50 truies avec pills sémantiques. Conforme.
- **Tab Élevage > Verrats** : liste 3 verrats, fiche détail propre (URL code court ✅).
- **Tab Élevage > Porcelets** : groupage par bande, statuts par phase. Conforme.
- **Tab Repro > Agenda / En cours / À venir / Historique** : sous-tabs avec deeplink URL ✅.
- **Tab Réglages (racine V70)** : profil, mode avancé toggle, 4 notifs, sync, 4 boutons config, encyclopédie, support, logout. Conforme.
- **/reglages/encyclopedie** : 10 articles, search, structure V70 propre.
- **Fiche Truie détail** : 4 tabs, lignée, dernière activité, performance économique, identité, lecture Marius, actions. Conforme.
- **Fiche Verrat détail** : 4 tabs, identité, reproduction, journal terrain, actions. Conforme.
- **Fiche Bande détail** : 4 tabs, cycle bande timeline 5 phases, performances. Conforme (sauf format date).

## 🔍 Faux positifs investigués

- **`agritech-bottom-sheet`** : classe CSS sur `<ion-modal>`. Convention de naming, pas le shell legacy `AgritechLayout`. RAS.
- **Roboto fontFamily** : présent sur `<html>`, `<head>`, `<script>` (default Ionic mobile). Aucun élément visible utilise Roboto. RAS.

---

## Plan de remédiation suggéré (priorité décroissante)

1. **Sprint v75-y (P0)** — 3 fixes critiques, ~3-4h
   - P0-3 retirer texte "refonte V71+" (15 min, deux strings)
   - P0-2 router clic carte bande → fiche détail (~1h)
   - P0-1 patcher `fetchFarm` ou `useFarm` pour résoudre nom + bilan (~2h, nécessite vérif schema Supabase)

2. **Sprint v75-z (P1)** — frictions transverses, ~4-6h
   - P1-1 4 icônes Lucide BottomNav (~30 min)
   - P1-4 retirer 2 emojis cards (~10 min)
   - P1-7 `formatDateFr` fiche bande (~10 min)
   - P1-3 étendre `formatBandeName` aux patterns B-AUDIT-* / B-YYYYMMDD-* (~1h)
   - P1-5 URLs code court généralisé truie/bande (~2h, attention deeplinks existants)
   - P1-6 sous-tabs Performance avec `?tab=` (~30 min)

3. **Sprint v75-aa (P1-2)** — décision produit
   - Soit reconstruire `/reglages/systeme`, `/ressources`, `/protocoles` en V70 (gros chantier, ~2 jours chacun)
   - Soit wrapper visuel léger + bandeau "Édition simplifiée bientôt" (~1h chacun)

4. **Sprint v75-ab (P2)** — finitions, ~1-2h cumulé
   - Tabs label/count espace
   - Empty state Loges déduplication FAB
   - Apostrophes Protocoles
   - Eyebrow "OUTILS"
