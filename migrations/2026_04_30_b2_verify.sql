-- ═══════════════════════════════════════════════════════════════
-- PorcTrack 8 — Vérifications post-migration B2
-- Date : 2026-04-30
-- ═══════════════════════════════════════════════════════════════
-- À exécuter APRÈS 2026_04_30_b2_complete.sql pour valider l'état.
-- Chaque query doit retourner ce qui est indiqué en commentaire.
-- ═══════════════════════════════════════════════════════════════

-- VÉRIF 1 — Table saillies existe
-- Attendu : true
SELECT to_regclass('public.saillies') IS NOT NULL AS saillies_exists;

-- VÉRIF 2 — Colonnes saillies (12 colonnes attendues)
-- Attendu : 12 lignes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='saillies'
ORDER BY ordinal_position;

-- VÉRIF 3 — Colonne batches.date_sevrage_prevue ajoutée
-- Attendu : 1 ligne (DATE, nullable)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='batches' AND column_name='date_sevrage_prevue';

-- VÉRIF 4 — RLS policies count par table
-- Attendu :
--   profiles    : 3 (select_own, insert_own, update_own)
--   saillies    : 1 (isolation_by_farm)
--   troupeaux   : 4 (Lecture troupeau + insert/update/delete_own)
SELECT tablename, count(*) AS n_policies
FROM pg_policies
WHERE schemaname='public' AND tablename IN ('profiles','troupeaux','saillies')
GROUP BY tablename
ORDER BY tablename;

-- VÉRIF 5 — Code de la fonction handle_new_user (doit contenir INSERT INTO troupeaux)
-- Attendu : code TRIGGER avec INSERT troupeaux
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname='handle_new_user';

-- VÉRIF 6 — Troupeau restauré pour le user admin
-- Attendu : 1 ligne (Ferme Liegois Christophe, Principal)
SELECT id, nom, user_id, secteur, created_at
FROM public.troupeaux
WHERE user_id='bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid;

-- VÉRIF 7 — Total troupeaux dans la base
-- Attendu : 1 (juste celui de l'admin pour l'instant)
SELECT count(*) FROM public.troupeaux;
