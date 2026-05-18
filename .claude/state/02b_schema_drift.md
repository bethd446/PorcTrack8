# Drift schéma — migrations prod absentes du repo

Cross-check `supabase_migrations.schema_migrations` ↔ `supabase/migrations/` + `migrations/`

## Migrations prod absentes du repo (15)
```
20260511153010 add_nb_morts_naissance_to_batches
20260511153019 normalize_sows_statut
20260511153030 normalize_batches_phase
20260511153041 backfill_derived_fields
20260511153102 saillies_set_mb_prevue_trigger
20260511153200 add_missing_fk_indexes
20260511153218 trigger_increment_sow_nb_portees_on_mb
20260511153303 v76_pesees_batch_table
20260511223412 v80_farm_profile_default
20260511223427 v80_engraissement_lots
20260512102351 v3_4_5_genealogie_sows_boars
20260514045521 sprint14_security_hardening_phase1
20260514045648 sprint14_force_rls_finances_adminlogs
20260517162558 revoke_prevent_profile_role_escalation
20260517162618 fix_tg_lots_search_path
```

## Triggers DB non versionnés
- `set_sow_mb_prevue_on_saillie()` SECURITY DEFINER — fonctionne en prod
- `increment_sow_nb_portees_on_mb()` SECURITY DEFINER — fonctionne en prod

## CHECK constraints batches
**Absentes sur `phase` et `statut`** → explique la divergence silencieuse.
- Present: canal_vente, poids_initial_kg, validation_status

## Phases observées en prod (batches)
- MATERNITE 5 rows | POST_SEVRAGE 3 | SEVREE 3 | CROISSANCE 1 | "Post-sevrage" 1 (outlier)
- **Convention canonique** : SCREAMING_SNAKE_CASE
- Code divergent: `'maternite'` (QuickMiseBasForm), `'post-sevrage'` (QuickSevrageForm), `'SOUS_MERE'` (mbWorkflowService) — à harmoniser sur `MATERNITE` ou `POST_SEVRAGE`
