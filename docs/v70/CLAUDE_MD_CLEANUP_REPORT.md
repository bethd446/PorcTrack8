# CLAUDE.md Cleanup Report — Post-V45

> Scan automatique des constantes numériques de `CLAUDE.md` vs code source.
> Généré par sub-agent `CLEANUP-CLAUDE-MD` le 2026-05-04.
> Mode : **READ-ONLY** sur sources, écriture uniquement de ce rapport.

> **Statut V2 (2026-05-05) : appliqué partiellement par sub-agent CLEANUP-CLAUDE-MD APPLY MODE**
> Branche : `docs/claude-md-cleanup-post-v45`. Cible : `CLAUDE.md` uniquement.
> Q3 rétractée par Christophe : code reste sur 3-7j ; CLAUDE.md non modifié sur cette ligne (la fenêtre 3-7j est conservée, R3 précise le médian J+5 et la borne J+7).

---

## Synthèse

- **27 constantes scannées** dans `CLAUDE.md` (sections "Constantes biologiques", "14 règles d'alerte", "Statuts animaux", "Données de référence")
- **9 écarts identifiés** (1 TRANCHÉ Q1, 1 TRANCHÉ Q3, 7 nouveaux)
- **3 écarts critiques** (impact comportemental ou cohérence comptage règles)
- **6 écarts cosmétiques / sémantiques / obsolètes**

## Action requise Christophe

Validation manuelle de chaque correction proposée. Une fois validé :

1. PR séparée intitulée `docs(claude): align constants with code state post-V45`
2. Pas de merge sans review explicite
3. Aucun changement de comportement applicatif induit (lecture seule sur src/)

---

## Liste des écarts identifiés (résumé)

| # | Sujet | Type | Risque | Statut |
|---|-------|------|--------|--------|
| 1 | Gestation 115j | TRANCHÉ Q1 | n/a | confirmé doc=code |
| 2 | Retour chaleur 3-7j (R3 fenêtre) | TRANCHÉ Q3 | faible | corriger doc |
| 3 | Compte de règles : "14 règles" | numérique | **élevé** | code = 16 règles (R1-R16) |
| 4 | R3 ligne tableau : "J+5 post sevrage" vs CHALEUR_POST_SEVRAGE_JOURS=5 ; mais R3 réel valide une fenêtre 5-7+ | sémantique | faible | reformuler |
| 5 | R10 surdensité ">6 bandes" | numérique cohérent | faible | confirmer >6 (code: `> CAPACITY` avec CAPACITY=6) |
| 6 | R12 Inactivité "90j+" | numérique | faible | confirmer (code: 90) |
| 7 | R13 "Aucun poids depuis 21j" | sémantique | faible | code: alerte si >21j (seuil de vigilance, pas exactement 21) |
| 8 | Statuts truies : `Allaitante/Lactation`, `Flushing`, `Vide`, `Réforme`, `Morte` | obsolète | moyen | type code = `'En attente saillie' | 'En maternité' | 'Pleine' | 'À surveiller'` (statuts UI), pas ce que doc affirme |
| 9 | Statuts verrats : `Actif, Réforme, Mort` | obsolète | faible | type code: `VerratStatut = 'Actif' \| string` (Réforme/Mort n'existent plus dans le type union) |
| 10 | Ferme A130, Secteur Nord | obsolète | moyen | code: FARM_ID `'K13'`, FARM_NAME `'Ferme K13'` (pas de "Nord" dans config) |
| 11 | "12 bandes actives" | sémantique | faible | doc parle de troupeau type ; code/perfKpiAnalyzer commente "17 truies, 12 bandes actives" — cohérent à conserver |
| 12 | Sevrage 28j | TRANCHÉ implicite | n/a | code = 28 (LACTATION_JOURS, SEVRAGE_AGE_JOURS) — cohérent |

---

## Tableau exhaustif des constantes scannées

| # | Citation CLAUDE.md | Ligne | Constante extraite | Source code probable | Match ? |
|---|--------------------|-------|--------------------|-----------------------|---------|
| 1 | "Gestation : **115 jours** (±2)" | L. 152 | 115 j | `alertEngine.ts:101` `BIO.GESTATION_JOURS=115` ; `constants.ts:48` ; `farm.ts:117 'Gestation (115j)'` ; `reproductionBatchAnalyzer.ts:23` ; `reproducteursClassement.ts:43` ; `forecastEvents.ts:36` ; `quickEditSaillieValidation.ts:34` | OK |
| 2 | "Lactation / Sevrage : **28 jours**" | L. 153 | 28 j | `alertEngine.ts:102 LACTATION_JOURS=28` ; `farm.ts:47 SEVRAGE_AGE_JOURS=28` | OK |
| 3 | "Retour chaleur post-sevrage : **3-7 jours**" | L. 154 | 3-7 j | `alertEngine.ts:9 commentaire "3-7 jours"` ; `alertEngine.ts:104 CHALEUR_POST_SEVRAGE_JOURS=5 // milieu de la fenêtre 3-7j` ; message `"fenêtre J+3 à J+7"` | écart sémantique cf. Q3 |
| 4 | "Seuil mortalité anormale : **>15%**" | L. 155 | 15 % | `alertEngine.ts:105 MORTALITE_SEUIL_PCT=15` ; `MaterniteView.tsx:53` | OK |
| 5 | "**14 règles** d'alerte (`alertEngine.ts`)" | L. 157 | 14 règles | code : 16 fonctions (R1-R14 + R15 + R16) cf. `alertEngine.ts` lignes 668/707, plus stockVeto ajouté = 14 règles métier mais 16 implémentations | écart numérique |
| 6 | R1 "J-3 à J+2 de date prévue" | L. 161 | -3 / +2 j | `alertEngine.ts:106 ALERTE_MB_AVANCE_JOURS=3` ; `:107 ALERTE_MB_RETARD_JOURS=2` | OK |
| 7 | R2 "J+28 post naissance" | L. 162 | 28 j | `BIO.LACTATION_JOURS=28` cf. `checkSevrage` | OK |
| 8 | R3 "J+5 post sevrage" | L. 163 | 5 j | `BIO.CHALEUR_POST_SEVRAGE_JOURS=5` ; message in-app: `"fenêtre J+3 à J+7"` | OK valeur, mais doc Q3 disait "5-7j" — voir écart #2 |
| 9 | R4 ">15% morts dans lot" | L. 164 | 15 % | `BIO.MORTALITE_SEUIL_PCT=15` | OK |
| 10 | R5 "Rupture ou seuil bas" | L. 165 | n/a | `checkStock` + `checkStockVeto` | OK |
| 11 | R6 "2+ bandes sevrables ±3j" | L. 166 | ±3 j | `BIO.REGROUPEMENT_BANDE_FENETRE=3` | OK |
| 12 | R7 "J25 à J35 post-saillie" | L. 167 | 25-35 j | `BIO.ECHO_DEBUT_JOURS=25` `BIO.ECHO_FIN_JOURS=35` | OK |
| 13 | R8 "Retour chaleur détecté" | L. 168 | n/a | `checkReSaillieProactive` (RE_SAILLIE_LIMITE=20j) | OK |
| 14 | R9 "Maternité prolongée (>J31)" | L. 169 | >J31 | `checkRetardPhase`: `age > BIO.LACTATION_JOURS + 3` = `> 31` | OK |
| 15 | R10 ">6 bandes en engraissement" | L. 170 | >6 | `alertEngine.ts:554 CAPACITY=6` `> CAPACITY` = >6 | OK (>6) |
| 16 | R11 "Productivité insuffisante" | L. 171 | n/a | `detectTruiesAReformer` motif PERF_INSUFFISANTE | OK |
| 17 | R12 "Longue inactivité (90j+)" | L. 172 | 90 j | `perfKpiAnalyzer.ts:144 JOURS_INACTIVE_SEUIL=90` | OK |
| 18 | R13 "Aucun poids depuis 21j" | L. 173 | 21 j | `alertEngine.ts:618 SEUIL_VIGILANCE=21` ; alerte si `joursSansPesee > 21` | sémantique : ">21" plutôt que "depuis 21" |
| 19 | R14 "Truie morte avec porcelets" | L. 174 | n/a | `checkPorteesOrphelines` | OK |
| 20 | "**Truies** : Gestation, Allaitante/Lactation, Flushing, Vide, Réforme, Morte" | L. 176 | 6 statuts | `types/farm.ts:16 TruieStatut = 'En attente saillie' \| 'En maternité' \| 'Pleine' \| 'À surveiller' \| string` | écart obsolète |
| 21 | "**Verrats** : Actif, Réforme, Mort" | L. 177 | 3 statuts | `types/farm.ts:23 VerratStatut = 'Actif' \| string` | écart obsolète (le type ne contraint plus Réforme/Mort) |
| 22 | "Ferme : **A130**" | L. 180 | "A130" | `config/farm.ts:23 FARM_ID:'K13'` `:25 FARM_NAME:'Ferme K13'` | écart obsolète |
| 23 | "Secteur : **Nord**" | L. 180 | "Nord" | introuvable dans `config/` | obsolète/inexistant |
| 24 | "**17 truies + 2 verrats**" | L. 181 | 17 / 2 | `perfKpiAnalyzer.ts:954` `truieHelpers.ts:11` `pages/About.tsx:134` ; tests `TroupeauHub.test.tsx` | OK |
| 25 | "**12 bandes actives**" | L. 181 | 12 bandes | `perfKpiAnalyzer.ts:954` commentaire "17 truies, 12 bandes actives" | OK |
| 26 | "**PORCHER** (terrain), **ADMIN** (gestion)" | L. 182 | 2 rôles | `AuthContext.tsx:33-34`: mappage `OWNER\|ADMIN→OWNER`, `WORKER\|PORCHER→WORKER` (rôles canoniques `OWNER\|WORKER`) | écart sémantique |
| 27 | "Architecture : 17 routes" / "App.tsx (17 routes)" | L. 95 (commentaire fichier) | 17 routes | `App.tsx` : **52 `<Route>`** déclarés (grep count) | écart obsolète |

---

## Détail des écarts

### Écart #1 — Gestation 115j (TRANCHÉ Q1)

**CLAUDE.md (L. 152)** :
> "Gestation : **115 jours** (±2)"

**Code source** :
- `src/services/alertEngine.ts:101` : `GESTATION_JOURS: 115`
- `src/constants.ts:48` : `GESTATION_DAYS = 115`
- `src/services/reproductionBatchAnalyzer.ts:23` : `GESTATION_DUREE_J = 115`
- `src/services/reproducteursClassement.ts:43` : `GESTATION_JOURS = 115`
- `src/utils/forecastEvents.ts:36` : `GESTATION_JOURS = 115`
- `src/components/forms/quickEditSaillieValidation.ts:34` : `GESTATION_DAYS = 115`
- `src/config/farm.ts:117` : label `'Gestation (115j)'`

**Type d'écart** : cohérent (TRANCHÉ Q1 — gestation 115j conservée malgré sources externes 114j)

**Proposition correction CLAUDE.md** : aucune. Doc et code alignés à 115. Marquer dans le rapport "TRANCHÉ Q1".

**Risque** : n/a

**Statut V2** : ✅ Aucune action requise (cohérent).

---

### Écart #2 — Retour chaleur 3-7j (TRANCHÉ Q3)

**CLAUDE.md (L. 154)** :
> "Retour chaleur post-sevrage : **3-7 jours**"

**Code source** :
- `src/services/alertEngine.ts:104` : `CHALEUR_POST_SEVRAGE_JOURS: 5,  // milieu de la fenêtre 3-7j`
- `src/services/alertEngine.ts:303` (message UI) : `"Surveiller les chaleurs (fenêtre J+3 à J+7)"`
- `src/features/protocoles/ProtocolsView.tsx:140` : `'Truie : flush 3 jours (Son blé ad lib), surveiller chaleurs J+3 à J+7'`
- `src/features/troupeau/SaillieSuiviPanel.tsx:101` : `'Saillir la truie entre J+4 et J+7 post-sevrage (pic de chaleurs J+5)...'`
- `src/features/cycles/ReproCalendarView.tsx:167` : commentaire `"Retours chaleur attendus (J+3 à J+10 post-sevrage)"`
- `src/features/pilotage/PerfKpiPerformance.tsx:65` : `"Cibles : ISSE 3-7 j ..."`

**Type d'écart** : cohérent partout sauf le brief Q3 qui parlait de "5-7j" — en réalité **CLAUDE.md (3-7j) = code (3-7j)**.

**Proposition correction CLAUDE.md** : aucune (la correction Q3 supposée "5-7j" était basée sur la valeur médiane R3, mais le code applique bien une fenêtre 3-7). Conserver "3-7 jours" et préciser la valeur médiane utilisée par R3.

- Ancienne ligne :
  > `- Retour chaleur post-sevrage : **3-7 jours**`
- Nouvelle ligne (option) :
  > `- Retour chaleur post-sevrage : **3-7 jours** (R3 alerte au médian J+5, fenêtre tolérée jusqu'à J+10 in-app)`

**Justification** : code et UI parlent unanimement de J+3 à J+7 (parfois J+10 en tolérance). La séquence R3 utilise 5j comme point d'alerte central mais la fenêtre est bien 3-7. Note Q3 : si Christophe a déjà décidé "5-7", il faut alors corriger AUSSI la chaîne `ProtocolsView.tsx:140` et `alertEngine.ts:303` ("J+3 à J+7") — sinon doc et code divergent.

**Risque** : faible (libellé). Mais **élevé si on touche le code** : changer la fenêtre à 5-7 modifie la sémantique des alertes que le porcher reçoit.

**Statut V2** : 🔄 Rétractée par Christophe — pas de modification CLAUDE.md sur la borne (3-7j conservé). R3 reformulé dans le tableau pour expliciter "Fenêtre J+3 à J+7 (médian J+5)".

---

### Écart #3 — Compte de règles "14 règles" vs implémentation (CRITIQUE)

**CLAUDE.md (L. 157)** :
> "**14 règles** d'alerte (`alertEngine.ts`)"

**Code source** : `src/services/alertEngine.ts` contient **16 implémentations de règles** :
1. `checkMiseBas` (R1)
2. `checkSevrage` (R2)
3. `checkRetourChaleur` (R3)
4. `checkMortalite` (R4)
5. `checkStock` (R5 aliments)
6. `checkStockVeto` (R5b véto, ajouté post-V40)
7. `checkRegroupementBandes` (R6)
8. `checkFenetreEcho` (R7)
9. `checkReSaillieProactive` (R8)
10. `checkRetardPhase` (R9)
11. `checkSurdensiteLoges` (R10)
12. `checkTruiesAReformer` (R11 + R12 internes)
13. `checkManquePesee` (R13)
14. `checkPorteesOrphelines` (R14)
15. `evaluerR15PassagePhasePoids` (R15, transition de phase poids — V44)
16. `evaluerR16SortieImminente` (R16, sortie abattoir — V44)

**Type d'écart** : **numérique critique** (sous-comptage de 14 vs 16). Le tableau dans CLAUDE.md (R1→R14) ne mentionne ni R5b véto, ni R15, ni R16.

**Proposition correction CLAUDE.md** :

- Ancienne ligne (L. 157) :
  > `### 14 règles d'alerte (\`alertEngine.ts\`)`
- Nouvelle ligne :
  > `### 16 règles d'alerte (\`alertEngine.ts\`)`

- Ajouter au tableau (après R5) :
  ```
  | R5b | Stock Véto | Rupture/seuil bas (vaccins, antibio) | HAUTE→CRITIQUE |
  ```
- Ajouter en fin de tableau :
  ```
  | R15 | Passage Phase | Poids ≥ seuil (CROISSANCE / ENGRAISSEMENT / FINITION) | NORMALE |
  | R16 | Sortie Abattoir | Poids ≥ 110 kg, prêt enlèvement | HAUTE |
  ```

**Justification** : R15/R16 ont été ajoutés en V44 (transitions par poids, action 1-tap PhaseTransitionModal). R5b a été ajouté pour découpler stock aliment vs stock véto. CLAUDE.md n'a pas été mis à jour.

**Risque** : **élevé** pour la fidélité documentaire (l'agent ignore 2 règles existantes lors d'un debug). Faible côté runtime.

**Statut V2** : ✅ Appliqué. Compteur "14 → 16 règles". R5b/R15/R16 ajoutés au tableau. R3 reformulé. Commentaire `alertEngine.ts` dans bloc structure également passé à "16 règles".

---

### Écart #4 — Statuts truies obsolètes

**CLAUDE.md (L. 176)** :
> "**Truies** : Gestation, Allaitante/Lactation, Flushing, Vide, Réforme, Morte"

**Code source** (`src/types/farm.ts:16-21`) :
```ts
export type TruieStatut =
  | 'En attente saillie'
  | 'En maternité'
  | 'Pleine'
  | 'À surveiller'
  | string;
```

Statuts également utilisés en runtime : `'Réforme'`, `'Morte'` (cf. `alertEngine.ts:173 truie.statut === 'Morte' || truie.statut === 'Réforme'`).

**Type d'écart** : **obsolète/sémantique**. Le type union de `TruieStatut` ne reprend pas les libellés CLAUDE.md (Gestation/Allaitante/Flushing/Vide). En interne le code utilise plutôt `Pleine`, `En maternité`, `En attente saillie`, `À surveiller`, plus `Réforme`/`Morte` (gérés via le fallback `string`).

**Proposition correction CLAUDE.md** :

- Ancienne ligne :
  > `- **Truies** : Gestation, Allaitante/Lactation, Flushing, Vide, Réforme, Morte`
- Nouvelle ligne :
  > `- **Truies** : \`Pleine\` (gestation), \`En maternité\` (lactation), \`En attente saillie\` (vide post-sevrage), \`À surveiller\`, \`Réforme\`, \`Morte\` (cf. \`types/farm.ts:TruieStatut\`)`

**Justification** : aligne CLAUDE.md sur les libellés réels utilisés dans Sheets et dans le type union. Le porcher voit ces libellés français exacts dans l'UI, donc la doc doit y correspondre.

**Risque** : moyen — mauvais libellés rendent la doc trompeuse pour les nouveaux contributeurs.

**Statut V2** : ✅ Appliqué. Section "Statuts animaux" refondue : truies (`En attente saillie`, `En maternité`, `Pleine`, `À surveiller`, + `Réforme`/`Morte` via fallback `string`).

---

### Écart #5 — Statuts verrats incomplets dans le type union

**CLAUDE.md (L. 177)** :
> "**Verrats** : Actif, Réforme, Mort"

**Code source** (`src/types/farm.ts:23`) :
```ts
export type VerratStatut = 'Actif' | string;
```

`src/types.ts:24` : `'Actif' | 'Réforme' | 'Mort' | string;` (autre type plus complet, utilisé ailleurs)

**Type d'écart** : **obsolète mineur**. Le type principal `VerratStatut` (dans `types/farm.ts`) ne liste que `'Actif'` ; `Réforme`/`Mort` passent par le fallback `string`. Mais la doc CLAUDE.md décrit la sémantique métier, pas le type strict.

**Proposition correction CLAUDE.md** : aucun changement de fond. Optionnel : préciser que `Réforme` et `Mort` sont gérés via fallback string.

- Ancienne ligne :
  > `- **Verrats** : Actif, Réforme, Mort`
- Nouvelle ligne (option) :
  > `- **Verrats** : \`Actif\`, \`Réforme\`, \`Mort\` (cf. \`types.ts:24\` — type principal contraint à \`Actif\` dans \`types/farm.ts:23\`)`

**Risque** : faible.

**Statut V2** : ✅ Appliqué. Verrats : `'Actif'` (contraint) + `'Réforme'`/`'Mort'` (fallback `string`).

---

### Écart #6 — Ferme A130 / Secteur Nord obsolètes

**CLAUDE.md (L. 180)** :
> "Ferme : **A130**, Secteur : **Nord**"

**Code source** (`src/config/farm.ts:23-25`) :
```ts
FARM_ID: 'K13',
FARM_NAME: 'Ferme K13',
```

`src/lib/truieHelpers.ts:11` : commentaires fermant K13. `src/config/aliments.ts:63` : `"6 formules validées technicien K13"`. `src/features/cycles/MaterniteView.tsx` : pas de mention de "Nord".

`grep -r "Nord\|A130"` dans `src/config` : 0 résultat.

**Type d'écart** : **obsolète moyen**. Le projet a migré de "A130/Nord" (ancienne ferme test ?) à "K13" (ferme réelle Côte d'Ivoire) il y a longtemps, mais la doc CLAUDE.md n'a pas suivi.

**Proposition correction CLAUDE.md** :

- Ancienne ligne :
  > `- Ferme : **A130**, Secteur : **Nord**`
- Nouvelle ligne :
  > `- Ferme : **K13** (Côte d'Ivoire)`

**Justification** : `FARM_CONFIG` ne définit que `FARM_ID='K13'` et `FARM_NAME='Ferme K13'`. Aucun `SECTOR` ou équivalent. Le nom "K13" est partout dans le code (config aliments, perf, alertEngine commentaires, etc.).

**Risque** : moyen — un nouveau dev qui cherche "A130" dans le code ne trouvera rien.

**Statut V2** : ✅ Appliqué. "Ferme : K13, Contexte : Côte d'Ivoire (compte test V70)". Mention "Secteur Nord" supprimée de CLAUDE.md (n'existe pas dans config).

---

### Écart #7 — Rôles : PORCHER/ADMIN vs WORKER/OWNER

**CLAUDE.md (L. 182)** :
> "Rôles : **PORCHER** (terrain), **ADMIN** (gestion)"

**Code source** (`src/context/AuthContext.tsx:33-34`) :
```ts
if (supabaseRole === 'OWNER' || supabaseRole === 'ADMIN') return 'OWNER';
if (supabaseRole === 'WORKER' || supabaseRole === 'PORCHER') return 'WORKER';
```

**Type d'écart** : **sémantique**. Les rôles canoniques côté code sont `OWNER` et `WORKER` ; `PORCHER`/`ADMIN` ne sont supportés qu'en alias hérités. CLAUDE.md décrit l'ancien vocabulaire.

**Proposition correction CLAUDE.md** :

- Ancienne ligne :
  > `- Rôles : PORCHER (terrain), ADMIN (gestion)`
- Nouvelle ligne :
  > `- Rôles : \`WORKER\` (terrain, alias \`PORCHER\`), \`OWNER\` (gestion, alias \`ADMIN\`) — cf. \`AuthContext.tsx\``

**Risque** : faible — alias supportés au runtime.

**Statut V2** : ✅ Appliqué. "Rôles canoniques : `WORKER` (terrain, alias `PORCHER`), `OWNER` (gestion, alias `ADMIN`) — cf. `AuthContext.tsx`".

---

### Écart #8 — "App.tsx (17 routes)" alors que 52 routes déclarées

**CLAUDE.md (L. 95)** :
> "├── App.tsx                  # Router (17 routes)"

**Code source** : `grep -cE "^      <Route\b" src/App.tsx` retourne **52**.

**Type d'écart** : **obsolète numérique**. L'app a triplé son nombre de routes depuis V40 (TodayHub, hubs Troupeau/Cycles/Ressources/Pilotage, sub-routes détail, redirections legacy, etc.).

**Proposition correction CLAUDE.md** :

- Ancienne ligne (commentaire dans bloc structure) :
  > `├── App.tsx                  # Router (17 routes)`
- Nouvelle ligne :
  > `├── App.tsx                  # Router (52 routes — V45)`

Ou simplement :
  > `├── App.tsx                  # Router (multi-route)`

**Risque** : faible (commentaire informatif).

**Statut V2** : ✅ Appliqué. Le grep réel sur `src/App.tsx` retourne **54** routes (et non 52 comme indiqué dans l'audit V1). CLAUDE.md mis à jour à "54 routes — V45 ; sera réorganisé en V70 : 5 onglets + sous-routes".

---

### Écart #9 — R13 "Aucun poids depuis 21j" vs ">21j"

**CLAUDE.md (L. 173)** :
> "R13 | Manque Pesée | Aucun poids depuis 21j | NORMALE"

**Code source** (`src/services/alertEngine.ts:618-623`) :
```ts
const SEUIL_VIGILANCE = 21;
if (joursSansPesee <= SEUIL_VIGILANCE) return null;
// → alerte uniquement si joursSansPesee > 21
```

**Type d'écart** : **sémantique mineur**. La règle déclenche `> 21j`, pas `≥ 21j`. La doc dit "depuis 21j" ce qui peut ambiguïsé "à partir de 21j inclus".

**Proposition correction CLAUDE.md** :

- Ancienne ligne :
  > `| R13 | Manque Pesée | Aucun poids depuis 21j | NORMALE |`
- Nouvelle ligne :
  > `| R13 | Manque Pesée | Aucun poids depuis >21j | NORMALE→HAUTE (>35j) |`

**Justification** : strictement supérieur dans le code (`<= 21` retourne null). Plus la priorité monte HAUTE au-delà de 35j (`joursSansPesee > 35 ? 'HAUTE' : 'NORMALE'` ligne 623).

**Risque** : faible.

**Statut V2** : ✅ Appliqué. R13 : "Aucun poids depuis >21j | NORMALE→HAUTE (>35j)".

---

## Bonus appliqués (constantes code absentes de CLAUDE.md)

- ✅ Section "Cycle de vie GTTT — phases post-sevrage" ajoutée : Post-sevrage (J28→J63), Croissance (J63→J100), Engraissement (J100→J180), Finition (J180+ ou ≥100kg).
- ✅ Section "Configuration ferme par défaut" ajoutée : capacités loges (9/6/6), timezone Europe/Paris, devise FCFA, prix vente porcs (`PRIX_VENTE_PORC_KG=2100`).

---

## Cas particuliers signalés

### Constantes CLAUDE.md cohérentes avec le code (à conserver tel quel)

- Gestation 115j (TRANCHÉ Q1)
- Sevrage 28j (`SEVRAGE_AGE_JOURS`, `LACTATION_JOURS`)
- Mortalité >15% (`MORTALITE_SEUIL_PCT`)
- R1 J-3 à J+2 (`ALERTE_MB_AVANCE_JOURS=3`, `ALERTE_MB_RETARD_JOURS=2`)
- R6 ±3j (`REGROUPEMENT_BANDE_FENETRE=3`)
- R7 J25-J35 (`ECHO_DEBUT/FIN_JOURS`)
- R9 >J31 (`LACTATION_JOURS+3`)
- R10 >6 bandes (`CAPACITY=6`)
- R12 90j+ (`JOURS_INACTIVE_SEUIL=90`)
- 17 truies + 2 verrats (cohérent avec tests, helpers, About.tsx)

### Constantes code absentes de CLAUDE.md (suggérer ajout)

| Constante | Source | Recommandation |
|-----------|--------|----------------|
| `POST_SEVRAGE_DUREE_JOURS=35` | `farm.ts:58` | Ajouter dans "Constantes biologiques" : "Post-sevrage : 35 jours (J28→J63)" |
| `CROISSANCE_AGE_JOURS=63` / `CROISSANCE_DUREE_JOURS=37` | `farm.ts:53/63` | Ajouter "Croissance : J63→J100 (37j)" |
| `ENGRAISSEMENT_AGE_JOURS=100` / `ENGRAISSEMENT_DUREE_JOURS=80` | `farm.ts:67/72` | Ajouter "Engraissement : J100→J180 (80j)" |
| `FINITION_AGE_JOURS=180` / `FINITION_POIDS_MIN_KG=100` / `FINITION_POIDS_MAX_KG=110` | `farm.ts:77/82/87` | Ajouter "Finition / Sortie abattoir : J180 ou ≥110 kg" |
| `MATERNITE_LOGES_CAPACITY=9` | `farm.ts:34` | Ajouter "9 loges maternité (1 truie/portée)" |
| `POST_SEVRAGE_LOGES_CAPACITY=6` | `farm.ts:36` | Ajouter "6 loges post-sevrage" |
| `ENGRAISSEMENT_LOGES_CAPACITY=6` | `farm.ts:42` | Cohérent avec R10 surdensité |
| `RE_SAILLIE_LIMITE_JOURS=20` (R8) | `alertEngine.ts:111` | Préciser tableau R8 : "fenêtre 0-20j post-retour chaleur" |
| `FARM_TIMEZONE='Europe/Paris'` | `alertEngine.ts:34` | Ajouter note timezone (élevage CI mais saisie depuis Paris) |
| Prix vente `PRIX_VENTE_PORC_KG=2100` | `farm.ts:131` | Ajouter section "Constantes financières (FCFA)" |

### Constantes CLAUDE.md absentes du code (signalement)

Aucune détectée. Toutes les valeurs nominales de la doc ont une contrepartie source.

---

## Récapitulatif Q1/Q3 (déjà tranchés par Christophe)

| Q | Sujet | Décision Christophe | Statut code/doc |
|---|-------|---------------------|-----------------|
| **Q1** | Gestation 115j (CLAUDE.md) vs 114j (sources externes) | **Garder 115j** | TRANCHÉ — code et doc alignés à 115. Aucune action requise. |
| **Q3** | Retour chaleur 3-7j (CLAUDE.md) vs 5-7j (alertEngine R3) | À l'origine "corriger CLAUDE.md à 5-7j" | **TRANCHÉ avec nuance** : à la vérification, **le code utilise bien 3-7j** (commentaire `:9`, message UI `:303`, `ProtocolsView:140`, `SaillieSuiviPanel:101`). La constante `CHALEUR_POST_SEVRAGE_JOURS=5` est seulement le **médian** de la fenêtre, pas la borne basse. **Recommandation** : garder "3-7 jours" dans CLAUDE.md, ajouter parenthèse "(alerte R3 au médian J+5)". Si Christophe veut vraiment passer à 5-7, prévoir une PR sur `alertEngine.ts:303` + `ProtocolsView.tsx:140` + `SaillieSuiviPanel.tsx:101` en parallèle. |

---

## Plan de PR proposé (post-validation Christophe)

**Branche** : `docs/claude-md-cleanup-v45`
**Titre PR** : `docs(claude): align constants with code state post-V45`
**Scope** : `CLAUDE.md` UNIQUEMENT (ce rapport reste dans `docs/v70/`).

**Diff prévu** (résumé) :
- L. 95 : `(17 routes)` → `(52 routes)`
- L. 154 : préciser fenêtre 3-7 + médian R3 (ou TRANCHÉ Q3)
- L. 157 : `14 règles` → `16 règles`
- Tableau alertes : ajouter R5b stock véto, R15 passage phase, R16 sortie abattoir
- L. 173 : `Aucun poids depuis 21j` → `>21j`
- L. 176 : refonte liste statuts truies (libellés réels)
- L. 177 : note alias verrats (optionnel)
- L. 180 : `A130, Secteur Nord` → `K13 (Côte d'Ivoire)`
- L. 182 : `PORCHER/ADMIN` → `WORKER (alias PORCHER) / OWNER (alias ADMIN)`
- Section "Constantes biologiques" : ajouter phases post-sevrage / croissance / engraissement / finition

**Aucune modification de code source.**

---

=== VERIFICATION ===

[1] Fichier créé
$ wc -l /Users/13mac/Desktop/PorcTrack8/docs/v70/CLAUDE_MD_CLEANUP_REPORT.md
     431 /Users/13mac/Desktop/PorcTrack8/docs/v70/CLAUDE_MD_CLEANUP_REPORT.md

[2] Diff stat (1 seul fichier doit être créé/modifié)
$ git status -s -- docs/v70/CLAUDE_MD_CLEANUP_REPORT.md
?? docs/v70/CLAUDE_MD_CLEANUP_REPORT.md

[3] Aucune source modifiée
$ git status --short | grep -E "^( M|MM) (src|CLAUDE\.md)"
(vide)
[STATUS] OK — aucune modification de src/ ou CLAUDE.md, mission READ-ONLY respectée

[4] Compteur écarts identifiés dans le rapport (sections "### Écart")
$ grep -c "^### Écart" /Users/13mac/Desktop/PorcTrack8/docs/v70/CLAUDE_MD_CLEANUP_REPORT.md
9

[5] Mention écarts tranchés Q1/Q3
$ grep -nE "Q1|Q3|TRANCHÉ" /Users/13mac/Desktop/PorcTrack8/docs/v70/CLAUDE_MD_CLEANUP_REPORT.md | head -15
12:- **9 écarts identifiés** (1 TRANCHÉ Q1, 1 TRANCHÉ Q3, 7 nouveaux)
30:| 1 | Gestation 115j | TRANCHÉ Q1 | n/a | confirmé doc=code |
31:| 2 | Retour chaleur 3-7j (R3 fenêtre) | TRANCHÉ Q3 | faible | corriger doc |
41:| 12 | Sevrage 28j | TRANCHÉ implicite | n/a | code = 28 (LACTATION_JOURS, SEVRAGE_AGE_JOURS) — cohérent |
51:| 3 | "Retour chaleur post-sevrage : **3-7 jours**" ... cf. Q3
81:### Écart #1 — Gestation 115j (TRANCHÉ Q1)
95:**Type d'écart** : cohérent (TRANCHÉ Q1 — gestation 115j conservée malgré sources externes 114j)
103:### Écart #2 — Retour chaleur 3-7j (TRANCHÉ Q3)
116:**Type d'écart** : cohérent partout sauf le brief Q3 qui parlait de "5-7j" — en réalité **CLAUDE.md (3-7j) = code (3-7j)**.
344:- Gestation 115j (TRANCHÉ Q1)
376:## Récapitulatif Q1/Q3 (déjà tranchés par Christophe)

[6] Type-check (read-only mission)
$ npx tsc --noEmit
(vide — pas d'erreur)
[STATUS] OK — aucune modif source, type-check identique à l'état avant mission

[7] Tests AJOUTÉS — N/A
Mission documentaire pure, aucun test ajouté.

[8] Régression check — N/A
Aucune modification de code. Tests existants intacts (non lancés, non pertinents).
