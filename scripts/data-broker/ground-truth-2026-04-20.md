# Ground truth ferme K13 — 2026-04-20 (fourni par le propriétaire)

Source : rapport manuel du porcher + recoupement propriétaire. **Sert de référence de validation pour les données Google Sheets** (si divergence, c'est le terrain qui gagne, la Sheet doit être corrigée).

## Cheptel reproducteur

**17 truies + 2 verrats**
- V01 **Bobi**
- V02 **Aligator**

### 7 Pleines (en gestation)

| ID | Boucle | MB prévue | Notes |
|----|--------|-----------|-------|
| T05 | B.20 | 11 juillet 2026 | |
| T12 | B.10 | **6 mai 2026** | Prochaine MB |
| T07 | — Choupette | 28 juillet 2026 | saillie 05/04 |
| T09 | — Zapata | 28 juillet 2026 | saillie 05/04 |
| T11 | — Ficelle | 28 juillet 2026 | saillie 05/04 |
| T15 | — Anillette | 28 juillet 2026 | saillie 05/04 |
| T16 | — Pirouette | 28 juillet 2026 | saillie 05/04 |

### 4 En maternité (allaitantes avec porcelets sous mère)

| ID | Boucle | Porcelets | Âge | Sevrage prévu | État |
|----|--------|-----------|-----|---------------|------|
| T10 | B.37 | 5 | J27 | **EN RETARD** | Porcelets trop petits |
| T18 | B.85 | 12 | J22 | **18/04 — HIER** | À sevrer d'urgence |
| T14 | B.24 | 13 | J18 | ~22/04 (2 jours) | |
| T19 | B.76 | 13 | J18 | ~22/04 (2 jours) | |

### 5 En attente saillie

T01 **Monette** · T02 **Fillaou** · T03 **Pénélope** · T06 · T13

### 1 À surveiller

- T04 **Pistachette** — refus d'allaitement

## Porcelets — 150 total

### Sous mère (maternité) — 48 porcelets dans 4 loges maternité

Confirmé par propriétaire 20/04/2026 (correction du précédent 43).
Détail probable : T10: 5, T18: 12, T14: 13, T19: 13 + 5 porcelets supplémentaires non listés (nouveau-nés ou réajustement) → total **48**.

### Post-sevrage (4 loges) — 102 porcelets (terrain)

| Loge | Porcelets | Lot |
|------|-----------|-----|
| Loge 1 | 23 | Lot ancien (T07 6 + T11 12 + complément) — J+31 post-sevrage |
| Loge 2 | 22 | Lot sevré 10/04 |
| Loge 3 | 28 | Lot sevré 10/04 |
| Loge 4 | 29 | Lot sevré 10/04 |

**Sheets comptent 106 sevrés vs terrain 102 → 4 mortalités post-sevrage à enregistrer dans la Sheet PORCELETS_BANDES_DETAIL**

## Lots & calendrier vente

| Lot | Sevrage | Post-sevrage | Séparation M/F (J+70) | Finition ~90 kg (J+160) |
|-----|---------|--------------|------------------------|--------------------------|
| Lot 1 (T07+T11, 18 porc.) | 19/03/2026 | J+31 aujourd'hui | **~28 mai 2026** | fin août 2026 |
| Lot 2 (8 bandes, 84 porc.) | 10/04/2026 | J+9 aujourd'hui | **~19 juin 2026** | mi-sept 2026 |

## Prochaines échéances (ordre chronologique)

| Date | Événement | Action |
|------|-----------|--------|
| **Maintenant** | T18 sevrage retard J22 | Sevrer d'urgence |
| **22/04** (2j) | T14 + T19 sevrage J21 | Préparer 2 loges post-sevrage |
| **6 mai** | MB T12 (1ère) | Loge maternité |
| **28 mai** | Séparation sexe Lot 1 | Loges engraissement |
| **19 juin** | Séparation sexe Lot 2 | Loges engraissement |
| **11 juillet** | MB T05 | Loge maternité |
| **28 juillet** | MB ×5 (T07, T09, T11, T15, T16) | 5 loges maternité |
| **Fin août 2026** | Premières ventes Lot 1 (~90kg) | |
| **Mi-sept 2026** | Premières ventes Lot 2 | |

## Écarts attendus Sheets ↔ Terrain

1. **Porcelets post-sevrage** : Sheets=106 vs Terrain=102 → 4 mortalités non enregistrées
2. **Boucles truies** : vérifier que T05=B.20, T10=B.37, T12=B.10, T14=B.24, T18=B.85, T19=B.76 sont bien dans SUIVI_TRUIES_REPRODUCTION
3. **Noms truies** : Choupette T07, Zapata T09, Ficelle T11, Anillette T15, Pirouette T16, Monette T01, Fillaou T02, Pénélope T03, Pistachette T04
4. **Verrats** : V01=Bobi, V02=Aligator — vérifier noms dans VERRATS
5. **dateMBPrevue T18** : devrait être passée (sevrage prévu 18/04) → alerte SEV attendue
6. **T04 Pistachette** : statut "À surveiller" ou "Surveillance" dans la sheet ?

## Usage pour les autres agents

- Lire ce fichier avant toute manipulation de données
- Utiliser ces valeurs comme référence de test (ex. dans `perfKpiAnalyzer.test.ts` : simuler les 17 truies / 14 portées)
- Si l'agent détecte divergence Sheet vs terrain, logguer un warning dans la validation du snapshot
