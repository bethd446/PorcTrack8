# Data Broker — PorcTrack 8

Source de vérité live (lecture seule) des Google Sheets pour les agents autonomes du projet.

## Fichiers

| Fichier | Rôle |
|---------|------|
| `build-snapshot.mjs` | Script Node 20 (lecture GAS uniquement) qui génère un snapshot daté |
| `snapshot-YYYY-MM-DD.json` | Snapshot structuré (truies, verrats, portées, stocks, finances, alertes, validation) |
| `snapshot-latest.json` | Copie du dernier snapshot (pour imports stables par d'autres agents) |
| `ground-truth-YYYY-MM-DD.md` | Référence terrain (fournie par le propriétaire) — vérité ultime si divergence |

## Régénérer le snapshot (live)

```bash
# Depuis la racine du repo
node scripts/data-broker/build-snapshot.mjs                # daté du jour
node scripts/data-broker/build-snapshot.mjs --date=2026-04-20 --farm=K13
```

**Prérequis** : `.env.local` à la racine contient `VITE_GAS_URL` et `VITE_GAS_TOKEN`. Sinon, le script écrit un snapshot `stale: true` et liste les étapes de setup dans le JSON.

Le script :
- n'écrit JAMAIS dans les Sheets (aucun `POST`, aucun `update_row`, aucun `delete_row`)
- lit via `gasGet('read_table_by_key' | 'read_sheet' | 'list_sheets' | 'get_tables_index')`
- normalise les dates en `dd/MM/yyyy`, les boucles en `B.NN`
- valide les comptes attendus (17 truies, 2 verrats, 14 portées actives, ~100 porcelets)

## Structure du snapshot

```json
{
  "timestamp": "2026-04-20T15:30:00Z",
  "farm": "K13",
  "source": { "gasUrl": "…", "hasToken": true, "stale": false },
  "counts": { "truies": 17, "verrats": 2, "portees": 14, "porcelets_vivants": 149, … },
  "truies":   [{ "id":"T01", "boucle":"B.22", "nom":"Monette", "statut":"…", "stade":"…", "ration":6, "nbPortees":1, "dateDerniereMB":"", "dateMBPrevue":"", "derniereNV":11 }, …],
  "verrats":  [{ "id":"V01", "nom":"Bobi", "origine":"Thomasset", "statut":"Actif", "ration":3 }, …],
  "portees":  [{ "idPortee":"26-T18-01", "truie":"T18", "boucleMere":"B.85", "dateMB":"28/03/2026", "nv":12, "morts":0, "vivants":12, "statut":"Sous mère", "dateSevragePrevue":"18/04/2026" }, …],
  "stocks_aliment": [{ "libelle":"Maïs grain", "stockActuel":0, "seuilAlerte":500, "unite":"kg", "statutStock":"RUPTURE" }, …],
  "stocks_veto":    [{ "produit":"Fer injectable", "stockActuel":0, "statutStock":"RUPTURE", "dlc":"" }, …],
  "finances":       [{ "date":"", "categorie":"Charge fixe", "libelle":"Salaires porcher", "montant":120000, "type":"DEPENSE", "bandeId":"" }, …],
  "alertes":        [{ "titre":"…", "priorite":"…", "type":"R4", "cible":"…", "date":"…" }, …],
  "divergences":    { "truies": { "expected":17, "actual":17, "ok":true }, … },
  "validation":     { "ok": true, "warnings": [ … ], "errors": [] }
}
```

## Consommer le snapshot depuis un autre agent

### En Node / Vite

```js
import snapshot from '../../scripts/data-broker/snapshot-latest.json' assert { type: 'json' };

const truiesGestantes = snapshot.truies.filter(t =>
  /pleine|gest|matern/i.test(t.statut)
);
const porceletsTotaux = snapshot.counts.porcelets_vivants;
const rupturesAliment = snapshot.stocks_aliment.filter(s => s.statutStock === 'RUPTURE');
```

### En shell

```bash
jq '.counts' scripts/data-broker/snapshot-latest.json
jq '.truies[] | select(.statut == "En maternité") | .id' scripts/data-broker/snapshot-latest.json
```

### En test / mock

Importer `snapshot-latest.json` directement comme fixture. **Ne pas** muter l'objet — cloner si besoin (`structuredClone`).

## Règles pour les agents

1. **Lecture seule.** Aucun agent ne doit jamais `POST` vers le GAS. Toute modification passe par l'UI de l'app (qui elle-même passe par le `offlineQueue` puis le backend).
2. **Pas de truc en dur.** Les IDs (T01-T19), boucles (B.22 etc.), noms (Monette, Bobi, …) doivent venir du snapshot, pas d'un fichier source committé.
3. **Vérifier `validation.ok` + `source.stale`** avant d'utiliser le snapshot. Si `stale: true`, prévenir l'utilisateur et proposer la régénération.
4. **Respecter les divergences documentées.** Exemple : 149 porcelets vivants ≠ 102 consigne ; bug mortalité 100% dans `alertEngine.ts`. Ces points sont référencés dans `validation.warnings` et `SHEETS_DATA_INTEGRITY.md`.
5. **Dates canoniques `dd/MM/yyyy`** — le broker normalise déjà, mais toute comparaison doit reparser proprement (éviter `new Date("15/03/2026")` qui est ambigu en JS).

## Cadence de rafraîchissement recommandée

- Avant chaque session de développement qui touche aux données (Dashboard, Cheptel, Alertes, Stocks).
- Après toute modification manuelle dans le Sheet par l'éleveur.
- Automatiquement en début de run CI si ajouté plus tard.

## Truies archivées (IDs non séquentiels)

La numérotation des truies n'est **pas séquentielle** — deux anciennes truies
réformées (`T08` et `T17`) ne sont plus présentes dans `SUIVI_TRUIES_REPRODUCTION`,
mais restent référencées dans l'historique repro (`SUIVI_REPRODUCTION_ACTUEL`
et alertes dérivées). **Ce n'est pas un bug, c'est de l'historique normal.**

Liste canonique actuelle (avril 2026, 17 truies actives) :

```
T01 · T02 · T03 · T04 · T05 · T06 · T07
      T09 · T10 · T11 · T12 · T13 · T14 · T15 · T16
            T18 · T19
```

IDs archivés (réformés) : `T08`, `T17`.

Les mappers et scripts d'audit ne doivent pas émettre d'erreur pour ces IDs —
utiliser `isArchivedTruie()` dans `src/lib/truieHelpers.ts`, et le flag
`--include-archived` sur `audit-sheets-data-integrity.mjs` pour les inclure
explicitement dans les warnings.

Source de vérité : [`ground-truth-2026-04-20.md`](./ground-truth-2026-04-20.md).

## Historique

- `2026-04-20` — Snapshot initial, aligné sur l'audit `SHEETS_DATA_INTEGRITY.json` du 2026-04-19. 17 truies, 2 verrats, 14 portées, 149 porcelets vivants, 5 aliments en rupture, 12 alertes (10 faux positifs R4). Validation `ok: true`, 8 warnings.
- `2026-04` — Documentation de l'écart `T08` / `T17` (réformées). Ajout du helper `isArchivedTruie` (`src/lib/truieHelpers.ts`) et du flag `--include-archived` sur l'audit intégrité.
