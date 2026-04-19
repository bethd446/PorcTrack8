# Comment l'app communique avec Google Sheets

> Guide pour comprendre où vivent les données et comment elles voyagent.

## Vue d'ensemble

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   Téléphone     │  HTTPS  │  Google Apps     │  API    │  Google Sheets   │
│   (APK Android) │ ──────► │  Script V20      │ ──────► │  SUIVI_FERME…    │
│                 │         │  (Web App GAS)   │         │  (source vérité) │
└─────────────────┘         └──────────────────┘         └──────────────────┘
        ▲                                                         │
        │                                                         │
        └──────── Lecture (JSON rows) ────────────────────────────┘
```

Trois pièces :
1. **L'app Android** (PorcTrack) — vue, saisie, cache offline
2. **Google Apps Script V20** — petit serveur intermédiaire hébergé gratuitement par Google
3. **Google Sheets** — la base de données en elle-même (le classeur `SUIVI_FERME_A130…`)

L'app ne parle **jamais directement à Sheets**. Elle passe toujours par GAS qui sert d'intermédiaire sécurisé.

## Authentification

Chaque requête envoie un token partagé (défini dans `.env.local` sur ton Mac, stocké via Capacitor Preferences sur le téléphone) :

```
GET https://script.google.com/macros/s/AKfyc…/exec
    ?token=TON_TOKEN
    &action=read_table_by_key
    &key=SUIVI_TRUIES_REPRODUCTION
```

GAS vérifie le token. Si invalide → refus. Si valide → lit ou écrit dans Sheets.

## Lecture (app → Sheets)

Au démarrage de l'app, **9 tables** sont lues en parallèle :

| Table Sheets | Usage dans l'app |
|---|---|
| `SUIVI_TRUIES_REPRODUCTION` | Liste des 17 truies |
| `VERRATS` | Liste des 2 verrats |
| `PORCELETS_BANDES_DETAIL` | Les 14 portées |
| `JOURNAL_SANTE` | Historique traitements vétérinaires |
| `STOCK_ALIMENTS` | Stocks aliment |
| `STOCK_VETO` | Stock médicaments/produits |
| `SUIVI_REPRODUCTION_ACTUEL` | Saillies récentes |
| `ALERTES_ACTIVES` | Alertes générées côté Sheets |
| `FINANCES` | Coûts/revenus |
| `NOTES_TERRAIN` | Toutes les observations |

**Stratégie SWR (Stale-While-Revalidate)** :
1. L'app cherche d'abord dans le cache local (Preferences) → affichage instantané
2. En parallèle, elle fait un appel réseau
3. Si réseau OK → mise à jour du cache + re-render
4. Si réseau KO → elle reste sur le cache (bannière "Hors ligne" s'affiche)

Cache valide **30 minutes** (configurable par table). Après, la prochaine ouverture relance un fetch.

## Écriture (app → Sheets)

Quand le porcher enregistre quelque chose (saillie, soin, note, pesée, contrôle quotidien), l'app envoie une requête POST à GAS :

```
POST https://script.google.com/…/exec
Body: {
  token: "...",
  action: "append_row",
  sheet: "NOTES_TERRAIN",
  row: ["2026-04-19", "TRUIE", "T01", "Saillie avec V01", "Jean"]
}
```

GAS insère la ligne à la fin de la feuille et retourne `{ok: true}`.

### Cas réseau indisponible

Si l'app ne peut pas joindre GAS (porcherie sans 4G/Wi-Fi) :
1. La requête est stockée dans une **queue offline** (Capacitor Preferences)
2. Le compteur "X action(s) en attente" apparaît dans Réglages
3. Dès que le réseau revient, un worker vide la queue en arrière-plan
4. Rien n'est perdu, l'ordre chronologique est conservé

## Format des données en Sheets

### NOTES_TERRAIN — schéma unifié 5 colonnes

Tous les événements du terrain (saillies, soins, notes, checklists, contrôles, pesées) passent par cette table :

| DATE | TYPE_ANIMAL | ID_ANIMAL | NOTE | AUTEUR |
|---|---|---|---|---|
| 2026-04-19 | TRUIE | T01 | Saillie avec V01 · MB prévue le 12/08 | Jean |
| 2026-04-19 | BANDE | 26-T1-01 | Pesée 10 porcelets · 5.4kg moy · J+21 | Jean |
| 2026-04-19 | CHECKLIST | MATIN | CHECKLIST_DONE: Question:Eau OK? Réponse:Oui | Jean |
| 2026-04-19 | CONTROLE | Q1 | Question:Température Réponse:28°C Détails:RAS | Jean |
| 2026-04-19 | GENERAL | - | Obs générale de la ferme | Jean |

**TYPE_ANIMAL** : `TRUIE` · `VERRAT` · `BANDE` · `CONTROLE` · `CHECKLIST` · `GENERAL`

Si tu vas voir ta feuille Sheets après une saisie, tu verras directement la ligne ajoutée. Tu peux filtrer par `TYPE_ANIMAL` ou `ID_ANIMAL` pour retrouver tout l'historique d'une truie.

### Autres tables

Les autres tables (TRUIES, VERRATS, PORCELETS_BANDES, STOCKS) sont **lues** par l'app mais les modifications se font généralement côté Sheets directement par toi (ajout d'une truie, modification du stock, etc.). L'app met à jour certains champs ciblés via `update_row` (ex: statut truie qui passe de "Pleine" à "En maternité").

## Quand tu modifies Sheets directement

Si tu ajoutes une nouvelle truie, une portée, ou modifies un stock **depuis Google Sheets sur ton ordinateur** :
- L'app ne le voit **pas immédiatement** (cache 30 min)
- Le porcher doit soit attendre 30 min, soit aller dans `Plus → Forcer Pull` pour récupérer les changements

## Résumé pour le porcher

Il n'a rien à savoir techniquement. Il sait juste :
- **Ses saisies vont directement dans Sheets** s'il a du réseau
- **Si pas de réseau** (porcherie isolée), l'app attend et envoie plus tard
- **Forcer Pull** dans Réglages rafraîchit les données depuis Sheets si besoin
- **Bannière rouge "Hors ligne"** = pas de réseau, aucune donnée n'est perdue

## Résumé pour toi (admin)

Tu peux ouvrir Google Sheets à tout moment et voir :
- Les saisies du porcher en temps réel (filtrer NOTES_TERRAIN)
- Les statuts truies mis à jour automatiquement par l'app après sevrage
- Les actions confirmées dans `ALERTES_ACTIVES` (si activé côté GAS)

Tu restes maître de ton fichier Sheets, l'app ne fait que l'alimenter et l'exploiter.
