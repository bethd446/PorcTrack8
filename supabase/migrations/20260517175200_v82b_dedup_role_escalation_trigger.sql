-- =============================================================================
-- v82b — Déduplication des triggers anti-escalation sur public.profiles
-- + NULL guard pour le login (auth.uid() pas encore propagé pendant la session
-- en cours d'établissement → 500 sur le compte audit-senior).
-- Date : 2026-05-17 17:52 UTC
--
-- Contexte : f475872 a créé prevent_profile_role_escalation + son trigger sans
-- s'apercevoir que prevent_role_escalation existait déjà (registry plus ancien
-- 2026_04_30_b2_complete.sql). Résultat : 2 triggers BEFORE UPDATE sur la même
-- table, dont 1 trop strict bloquant des UPDATE internes pendant le login.
--
-- Fix :
-- 1. DROP du doublon prevent_profile_role_escalation_tr + fn
-- 2. Réécriture de l'ancien prevent_role_escalation avec :
--    - NULL guard sur auth.uid() (pendant login Supabase Auth)
--    - service_role bypass explicite
--    - couvre désormais role + is_super_admin + id (au lieu de role seul)
-- =============================================================================

-- ── 1. Drop du doublon créé par f475872 ───────────────────────────────────
DROP TRIGGER IF EXISTS prevent_profile_role_escalation_tr ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_profile_role_escalation();

-- ── 2. Réécriture du trigger pré-existant ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := COALESCE((SELECT auth.jwt() ->> 'role'), '');
BEGIN
  -- 2a. NULL guard : pendant le login Supabase Auth, des UPDATE internes sur
  -- public.profiles peuvent transiter sans auth.uid() encore propagé. Les
  -- triggers internes service-role ne doivent JAMAIS être bloqués.
  IF v_uid IS NULL OR v_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- 2b. role : modifiable uniquement par OWNER/ADMIN sur sa ferme.
  IF NEW.role IS DISTINCT FROM OLD.role
     AND NOT public.is_owner_or_admin() THEN
    RAISE EXCEPTION 'role change requires ADMIN/OWNER (got: %)',
      (SELECT role FROM public.profiles WHERE id = v_uid)
      USING ERRCODE = '42501';
  END IF;

  -- 2c. is_super_admin : modifiable uniquement par service_role
  -- (le guard ci-dessus a déjà laissé passer service_role).
  IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin THEN
    RAISE EXCEPTION 'is_super_admin change requires service_role'
      USING ERRCODE = '42501';
  END IF;

  -- 2d. id immutable.
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'profiles.id immutable'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_role_escalation() IS
  'BEFORE UPDATE on profiles. Bloque escalation role/is_super_admin/id. v82b 2026-05-17 : NULL guard auth.uid() pendant login + couvre 3 champs au lieu d''un.';

-- 3. Le trigger trg_prevent_role_escalation reste attaché à la fonction
-- (pas de DROP/recreate nécessaire — CREATE OR REPLACE met à jour la fn en place).

-- =============================================================================
-- ROLLBACK :
--   1. Restaurer l'ancienne fonction (sans NULL guard, sans couverture is_super_admin/id) :
--      CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
--      RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
--      AS $$
--        BEGIN
--          IF NEW.role IS DISTINCT FROM OLD.role
--             AND NOT public.is_owner_or_admin() THEN
--            RAISE EXCEPTION 'role change requires ADMIN/OWNER';
--          END IF;
--          RETURN NEW;
--        END;
--      $$;
--   2. Optionnel : recréer le doublon prevent_profile_role_escalation (cf.
--      20260517160407_v82_prevent_profile_role_escalation.sql).
-- =============================================================================
