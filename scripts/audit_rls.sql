-- =============================================================================
-- PorcTrack 8 — scripts/audit_rls.sql
-- Audit RLS + FK + multi-tenant sur 35 tables public
-- READ ONLY — aucune DDL/DML
-- Exécuter : Supabase SQL editor (chaque section séparément) ou psql -f
-- Source : Worker 3 (security-reviewer) — Phase 2 mécanique 2026-05-18
-- =============================================================================

-- ── SECTION 1 : État RLS par table ──────────────────────────────────────────
SELECT
  t.tablename                                              AS table_name,
  t.rowsecurity                                            AS rls_enabled,
  t.forcerowsecurity                                       AS rls_forced,
  COUNT(p.policyname)                                      AS n_policies,
  STRING_AGG(p.policyname, ', ' ORDER BY p.policyname)    AS policy_list
FROM pg_tables t
LEFT JOIN pg_policies p
  ON p.tablename = t.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE '_audit_%'
GROUP BY t.tablename, t.rowsecurity, t.forcerowsecurity
ORDER BY rls_enabled ASC, n_policies ASC, t.tablename;

-- ── SECTION 2 : Policies complètes (cmd, qual, with_check) ──────────────────
SELECT
  tablename, policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- ── SECTION 3 : FK déclarées avec table cible et ON DELETE ──────────────────
SELECT
  src.relname                                             AS src_table,
  string_agg(src_att.attname, ', ')                       AS src_columns,
  ref.relname                                             AS ref_table,
  string_agg(ref_att.attname, ', ')                       AS ref_columns,
  con.conname                                             AS constraint_name,
  CASE con.confdeltype
    WHEN 'a' THEN 'NO ACTION'
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'd' THEN 'SET DEFAULT'
  END                                                     AS on_delete
FROM pg_constraint con
JOIN pg_class src ON src.oid = con.conrelid
JOIN pg_namespace src_ns ON src_ns.oid = src.relnamespace
JOIN pg_class ref ON ref.oid = con.confrelid
JOIN pg_namespace ref_ns ON ref_ns.oid = ref.relnamespace
JOIN pg_attribute src_att ON src_att.attrelid = src.oid
  AND src_att.attnum = ANY(con.conkey)
JOIN pg_attribute ref_att ON ref_att.attrelid = ref.oid
  AND ref_att.attnum = ANY(con.confkey)
WHERE con.contype = 'f'
  AND src_ns.nspname = 'public'
GROUP BY src.relname, ref.relname, con.conname, con.confdeltype
ORDER BY src.relname, con.conname;

-- ── SECTION 4 : Rows farm_id NULL par table ──────────────────────────────────
SELECT 'adoptions'             AS tbl, COUNT(*) AS null_farm_id FROM adoptions            WHERE farm_id IS NULL
UNION ALL SELECT 'batch_sows',          COUNT(*) FROM batch_sows           WHERE farm_id IS NULL
UNION ALL SELECT 'batches',             COUNT(*) FROM batches              WHERE farm_id IS NULL
UNION ALL SELECT 'boars',               COUNT(*) FROM boars                WHERE farm_id IS NULL
UNION ALL SELECT 'daily_checks_mb',     COUNT(*) FROM daily_checks_mb      WHERE farm_id IS NULL
UNION ALL SELECT 'feed_consumption_logs',COUNT(*) FROM feed_consumption_logs WHERE farm_id IS NULL
UNION ALL SELECT 'feed_inventory',      COUNT(*) FROM feed_inventory        WHERE farm_id IS NULL
UNION ALL SELECT 'finances',            COUNT(*) FROM finances              WHERE farm_id IS NULL
UNION ALL SELECT 'fournisseurs',        COUNT(*) FROM fournisseurs          WHERE farm_id IS NULL
UNION ALL SELECT 'health_logs',         COUNT(*) FROM health_logs           WHERE farm_id IS NULL
UNION ALL SELECT 'loge_movements',      COUNT(*) FROM loge_movements        WHERE farm_id IS NULL
UNION ALL SELECT 'loges',               COUNT(*) FROM loges                 WHERE farm_id IS NULL
UNION ALL SELECT 'lot_mortalites',      COUNT(*) FROM lot_mortalites        WHERE farm_id IS NULL
UNION ALL SELECT 'lot_pesees',          COUNT(*) FROM lot_pesees            WHERE farm_id IS NULL
UNION ALL SELECT 'lots',                COUNT(*) FROM lots                  WHERE farm_id IS NULL
UNION ALL SELECT 'notes',               COUNT(*) FROM notes                 WHERE farm_id IS NULL
UNION ALL SELECT 'pesee_planifiees',    COUNT(*) FROM pesee_planifiees      WHERE farm_id IS NULL
UNION ALL SELECT 'pesees',              COUNT(*) FROM pesees                WHERE farm_id IS NULL
UNION ALL SELECT 'pesees_batch',        COUNT(*) FROM pesees_batch          WHERE farm_id IS NULL
UNION ALL SELECT 'plan_alimentation',   COUNT(*) FROM plan_alimentation     WHERE farm_id IS NULL
UNION ALL SELECT 'porcelets_individuels',COUNT(*) FROM porcelets_individuels WHERE farm_id IS NULL
UNION ALL SELECT 'produits_aliments',   COUNT(*) FROM produits_aliments     WHERE farm_id IS NULL
UNION ALL SELECT 'produits_veto',       COUNT(*) FROM produits_veto         WHERE farm_id IS NULL
UNION ALL SELECT 'saillies',            COUNT(*) FROM saillies              WHERE farm_id IS NULL
UNION ALL SELECT 'sessions_pesee',      COUNT(*) FROM sessions_pesee        WHERE farm_id IS NULL
UNION ALL SELECT 'sows',                COUNT(*) FROM sows                  WHERE farm_id IS NULL
UNION ALL SELECT 'vet_inventory',       COUNT(*) FROM vet_inventory         WHERE farm_id IS NULL
UNION ALL SELECT 'weight_distributions',COUNT(*) FROM weight_distributions  WHERE farm_id IS NULL
ORDER BY tbl;

-- ── SECTION 5 : Rows farm_id orphelines (absent de farms.id) ────────────────
-- (Pattern : SELECT '<tbl>', COUNT(*) FROM <tbl> x WHERE NOT EXISTS (SELECT 1 FROM farms f WHERE f.id = x.farm_id) UNION ALL ...)
-- Voir Worker 3 transcript pour l'union complète. Préfère lancer SECTION 4 d'abord ; si 0 NULL, lance SECTION 5.

-- ── SECTION 6 : Cross-check couverture current_user_farms() ─────────────────
SELECT
  c.table_name,
  COUNT(p.policyname)                                     AS n_policies,
  BOOL_OR(
    p.qual ILIKE '%current_user_farms%'
    OR p.qual ILIKE '%user_farms%'
    OR p.with_check ILIKE '%current_user_farms%'
    OR p.with_check ILIKE '%user_farms%'
    OR p.qual ILIKE '%auth.uid()%'
    OR p.with_check ILIKE '%auth.uid()%'
    OR p.qual ILIKE '%is_member_with_role%'
    OR p.with_check ILIKE '%is_member_with_role%'
  )                                                       AS has_uid_or_farms_coverage
FROM information_schema.columns c
LEFT JOIN pg_policies p
  ON p.tablename = c.table_name AND p.schemaname = 'public'
WHERE c.table_schema = 'public'
  AND c.column_name = 'farm_id'
GROUP BY c.table_name
ORDER BY has_uid_or_farms_coverage NULLS FIRST, c.table_name;

-- ── SECTION 7 : Distribution enums statut/phase/type ────────────────────────
SELECT 'batches.phase'              AS champ, phase::text   AS valeur, COUNT(*) AS n FROM batches GROUP BY phase
UNION ALL SELECT 'batches.statut',             statut,                 COUNT(*) FROM batches GROUP BY statut
UNION ALL SELECT 'sows.statut',                statut,                 COUNT(*) FROM sows GROUP BY statut
UNION ALL SELECT 'boars.statut',               statut,                 COUNT(*) FROM boars GROUP BY statut
UNION ALL SELECT 'lots.statut',                statut,                 COUNT(*) FROM lots GROUP BY statut
UNION ALL SELECT 'porcelets_individuels.statut', statut,               COUNT(*) FROM porcelets_individuels GROUP BY statut
UNION ALL SELECT 'loges.type',                 type,                   COUNT(*) FROM loges GROUP BY type
UNION ALL SELECT 'health_logs.log_type',       log_type::text,         COUNT(*) FROM health_logs GROUP BY log_type
ORDER BY champ, valeur;

-- ── SECTION 8 : Vérification policy farm_members_insert_admin (faille O-1) ──
SELECT tablename, policyname, cmd, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'farm_members'
  AND policyname = 'farm_members_insert_admin';
-- Si with_check contient "OR" + "role = 'OWNER'" sans EXISTS membership → VULNERABLE

-- ── SECTION 9 : Vérification farms_select existe ────────────────────────────
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'farms'
  AND cmd = 'SELECT';

-- ── SECTION 10 : Fonctions SECURITY DEFINER + search_path + grant ───────────
SELECT
  p.proname                                               AS function_name,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security_type,
  p.proconfig                                             AS search_path_config,
  array_agg(
    CASE
      WHEN a.grantee = 'authenticated' THEN 'authenticated'
      WHEN a.grantee = 'anon'          THEN 'anon'
      WHEN a.grantee = 'PUBLIC'        THEN 'PUBLIC'
      ELSE a.grantee::text
    END
  )                                                       AS execute_grants
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
LEFT JOIN information_schema.routine_privileges a
  ON a.routine_name = p.proname
  AND a.routine_schema = 'public'
  AND a.privilege_type = 'EXECUTE'
WHERE n.nspname = 'public'
  AND p.prosecdef = true
GROUP BY p.proname, p.prosecdef, p.proconfig
ORDER BY p.proname;
