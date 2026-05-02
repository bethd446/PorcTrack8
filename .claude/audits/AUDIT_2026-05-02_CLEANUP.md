# AUDIT 2026-05-02 — Cleanup garanti

**À EXÉCUTER OBLIGATOIREMENT AVANT TEST TERRAIN 2026-05-03.**

## Comptes test à supprimer

| Email | user_id | troupeau_id | Origine |
|---|---|---|---|
| `audit-50-test@porctrack.test` | `58f2ca4d-0c45-48d0-9002-890d5b35991c` | `575371e4-97cd-4ff9-acb4-baba001df004` | Audit V23 (cette session) |
| `test-audit@deltajohnsons.com` | `c7d775c8-9365-43d3-afd1-268f6fea14f3` | `7a43ab3f-4810-47d8-8f1a-0a437a86fd53` | Session précédente — résiduel |

## Compte PRODUCTION à PRÉSERVER

`contact@liegeoischristophe.com` — **NE JAMAIS TOUCHER**.

## Script SQL de cleanup (idempotent)

```sql
-- Variables
\set test_user_1 'c7d775c8-9365-43d3-afd1-268f6fea14f3'
\set test_user_2 '58f2ca4d-0c45-48d0-9002-890d5b35991c'

-- Suppression des données métier dans l'ordre des FK
DELETE FROM public.adoptions             WHERE farm_id IN (:'test_user_1', :'test_user_2');
DELETE FROM public.feed_consumption_logs WHERE farm_id IN (:'test_user_1', :'test_user_2');
DELETE FROM public.weight_distributions  WHERE farm_id IN (:'test_user_1', :'test_user_2');
DELETE FROM public.alert_dismissals      WHERE farm_id IN (:'test_user_1', :'test_user_2');
DELETE FROM public.saillies              WHERE farm_id IN (:'test_user_1', :'test_user_2');
DELETE FROM public.health_logs           WHERE farm_id IN (:'test_user_1', :'test_user_2');
DELETE FROM public.notes                 WHERE farm_id IN (:'test_user_1', :'test_user_2');
DELETE FROM public.finances              WHERE farm_id IN (:'test_user_1', :'test_user_2');
DELETE FROM public.plan_alimentation     WHERE farm_id IN (:'test_user_1', :'test_user_2');
DELETE FROM public.batches               WHERE farm_id IN (:'test_user_1', :'test_user_2');
DELETE FROM public.sows                  WHERE farm_id IN (:'test_user_1', :'test_user_2');
DELETE FROM public.boars                 WHERE farm_id IN (:'test_user_1', :'test_user_2');
DELETE FROM public.feed_inventory        WHERE farm_id IN (:'test_user_1', :'test_user_2');
DELETE FROM public.vet_inventory         WHERE farm_id IN (:'test_user_1', :'test_user_2');
DELETE FROM public.produits_aliments     WHERE farm_id IN (:'test_user_1', :'test_user_2');
DELETE FROM public.produits_veto         WHERE farm_id IN (:'test_user_1', :'test_user_2');
DELETE FROM public.fournisseurs          WHERE farm_id IN (:'test_user_1', :'test_user_2');

-- Troupeaux + profiles
DELETE FROM public.troupeaux WHERE user_id IN (:'test_user_1', :'test_user_2');
DELETE FROM public.profiles  WHERE id      IN (:'test_user_1', :'test_user_2');

-- Auth users (DERNIER pour préserver les FK)
DELETE FROM auth.users WHERE id IN (:'test_user_1', :'test_user_2');
```

## Vérification post-cleanup

```sql
SELECT count(*) FROM auth.users WHERE id IN (
  '58f2ca4d-0c45-48d0-9002-890d5b35991c',
  'c7d775c8-9365-43d3-afd1-268f6fea14f3'
);
-- doit retourner 0

SELECT count(*) FROM public.troupeaux WHERE user_id IN (
  '58f2ca4d-0c45-48d0-9002-890d5b35991c',
  'c7d775c8-9365-43d3-afd1-268f6fea14f3'
);
-- doit retourner 0
```

## Trace cleanup exécuté

- [ ] Cleanup exécuté à : ____________
- [ ] Vérification 0 user test : ____________
- [ ] Vérification 0 troupeau test : ____________
- [ ] Compte christophe préservé : ____________
