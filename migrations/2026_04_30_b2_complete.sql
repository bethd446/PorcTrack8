-- ═══════════════════════════════════════════════════════════════
-- PorcTrack 8 — Migration B2 (foundation complète)
-- Date : 2026-04-30
-- Auteur : Claude Opus 4.7 + supabase-ops sub-agent
-- Cible : projet jcritwravdwefwqwyjvk (eu-west-3, Postgres 17.6)
-- ═══════════════════════════════════════════════════════════════
-- Objectif :
--   1. Schéma complet pour le signup multi-tenant (auto-création profile + troupeau)
--   2. Préparation pour migration Excel 132 lignes (saillies + batches.date_sevrage_prevue)
--   3. RLS complète sur profiles + troupeaux (les 13 autres tables sont déjà couvertes)
--   4. Restauration du troupeau manquant pour l'admin existant
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────────────────────────
-- SECTION 1 — DDL SCHEMA (CREATE TABLE saillies + ALTER batches)
-- ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saillies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sow_id uuid REFERENCES public.sows(id) ON DELETE SET NULL,
  boar_id uuid REFERENCES public.boars(id) ON DELETE SET NULL,
  sow_code_id text,
  boar_code_id text,
  date_saillie date,
  date_mb_prevue date,
  statut text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.saillies ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS saillies_farm_id_idx ON public.saillies(farm_id);
CREATE INDEX IF NOT EXISTS saillies_sow_id_idx ON public.saillies(sow_id);
CREATE INDEX IF NOT EXISTS saillies_date_mb_prevue_idx ON public.saillies(date_mb_prevue);

-- batches : ajout colonne date_sevrage_prevue (utilisée par MATERNITE)
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS date_sevrage_prevue DATE;

-- ───────────────────────────────────────────────────────────────
-- SECTION 2 — TRIGGER handle_new_user (enrichi profile + troupeau)
-- ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Profile (id = auth.users.id, role par défaut OWNER)
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'OWNER'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Troupeau vide associé (nom personnalisable via raw_user_meta_data)
  INSERT INTO public.troupeaux (nom, user_id, secteur)
  VALUES (
    COALESCE(new.raw_user_meta_data->>'farm_name', 'Ma ferme'),
    new.id,
    new.raw_user_meta_data->>'sector'
  );

  RETURN new;
END;
$$;

-- (Le trigger on_auth_user_created existe déjà sur auth.users — il pointe
--  vers cette fonction, donc CREATE OR REPLACE suffit, pas besoin de
--  recréer le trigger.)

-- ───────────────────────────────────────────────────────────────
-- SECTION 3 — RLS policies sur saillies (nouvelle table)
-- ───────────────────────────────────────────────────────────────

CREATE POLICY "isolation_by_farm" ON public.saillies
  FOR ALL USING (auth.uid() = farm_id);

-- ───────────────────────────────────────────────────────────────
-- SECTION 4 — RLS policies sur profiles (manquantes complètement)
-- ───────────────────────────────────────────────────────────────

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ───────────────────────────────────────────────────────────────
-- SECTION 5 — RLS policies INSERT/UPDATE/DELETE sur troupeaux
-- (la policy SELECT existe déjà sous le nom "Lecture troupeau")
-- ───────────────────────────────────────────────────────────────

CREATE POLICY "troupeaux_insert_own" ON public.troupeaux
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "troupeaux_update_own" ON public.troupeaux
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "troupeaux_delete_own" ON public.troupeaux
  FOR DELETE USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────
-- SECTION 6 — Restauration troupeau pour le user admin existant
-- (créé avant le trigger enrichi → n'a pas de troupeau)
-- ───────────────────────────────────────────────────────────────

INSERT INTO public.troupeaux (nom, user_id, secteur, created_at)
SELECT
  'Ferme Liegois Christophe',
  'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid,
  'Principal',
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.troupeaux
  WHERE user_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
);

COMMIT;

-- ═══════════════════════════════════════════════════════════════
-- FIN — pour vérifier l'état post-migration, voir verify.sql
-- ═══════════════════════════════════════════════════════════════
