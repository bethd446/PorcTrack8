-- ════════════════════════════════════════════════════════════════════════════
-- Migration : Photos + champs étendus (date naissance, origine, loge) pour
-- les fiches Truie / Verrat / Bande.
--
-- Date     : 2026-05-01
-- Auteur   : agent (PorcTrack8)
--
-- À EXÉCUTER MANUELLEMENT côté Supabase (SQL editor) :
--   1) Créer le bucket Storage 'farm-photos' (public, max 1 MB).
--   2) Lancer ce script SQL.
--
-- Bucket Storage 'farm-photos' :
--   - Visibilité : Public
--   - Politique  : authentifiés peuvent INSERT/UPDATE/DELETE leurs propres
--                  fichiers (path préfixé par auth.uid()).
--   Exemple SQL pour la policy (à adapter à votre schéma RLS) :
--
--   CREATE POLICY "users upload own farm photos"
--     ON storage.objects FOR INSERT TO authenticated
--     WITH CHECK (bucket_id = 'farm-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
--   CREATE POLICY "users read public farm photos"
--     ON storage.objects FOR SELECT TO public
--     USING (bucket_id = 'farm-photos');
--   CREATE POLICY "users delete own farm photos"
--     ON storage.objects FOR DELETE TO authenticated
--     USING (bucket_id = 'farm-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
-- ════════════════════════════════════════════════════════════════════════════

-- ── Truies (sows) ───────────────────────────────────────────────────────────
ALTER TABLE public.sows
  ADD COLUMN IF NOT EXISTS photo_url       text,
  ADD COLUMN IF NOT EXISTS date_naissance  date;

-- `localisation` (loge) et `origine` existent déjà côté sows, on n'y touche pas.

-- ── Verrats (boars) ─────────────────────────────────────────────────────────
ALTER TABLE public.boars
  ADD COLUMN IF NOT EXISTS photo_url       text,
  ADD COLUMN IF NOT EXISTS date_naissance  date,
  ADD COLUMN IF NOT EXISTS localisation    text;

-- `origine` existe déjà côté boars.

-- ── Bandes (batches) ────────────────────────────────────────────────────────
ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS photo_url       text;

-- `loge` existe déjà côté batches → réutilisé pour l'emplacement.
-- `origine` (parents truie+verrat) est dérivable via sow_id / boar_id existants.

-- ── Vérification ────────────────────────────────────────────────────────────
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name IN ('sows', 'boars', 'batches')
--   ORDER BY table_name, column_name;
