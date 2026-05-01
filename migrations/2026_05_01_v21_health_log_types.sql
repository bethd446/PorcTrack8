-- ════════════════════════════════════════════════════════════════════════════
-- Migration V21-2 : health_logs enum strict + dose / produit_id
--
-- Date     : 2026-05-01
-- Auteur   : agent (PorcTrack8)
--
-- Contexte : aujourd'hui health_logs.log_type est libre (texte). Impossible
-- d'auditer "Ai-je vacciné contre la peste ?" ou "Fer J3 fait ?". On passe
-- log_type en enum strict + on ajoute dose_or_quantity (texte libre, ex:
-- "1 ml") et produit_id (FK produits_veto, nullable, ON DELETE SET NULL).
-- ════════════════════════════════════════════════════════════════════════════

-- ── Type enum strict ────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE health_log_type AS ENUM (
    'FER_J3', 'VERMIFUGE', 'VACCIN_PESTE', 'VACCIN_MYCOPLASME', 'VACCIN_AUTRE',
    'CASTRATION', 'COUPE_QUEUE', 'BOITERIE', 'TOUX', 'DIARRHEE',
    'FIEVRE', 'ECRASEMENT', 'PARASITOSE', 'AUTRE'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Colonnes additives sur health_logs ──────────────────────────────────────
ALTER TABLE public.health_logs
  ADD COLUMN IF NOT EXISTS log_type health_log_type DEFAULT 'AUTRE',
  ADD COLUMN IF NOT EXISTS dose_or_quantity text,
  ADD COLUMN IF NOT EXISTS produit_id uuid REFERENCES public.produits_veto(id) ON DELETE SET NULL;

-- ── Index pour audit / dashboards ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS health_logs_log_type_idx ON public.health_logs(log_type);

-- ── Vérification ────────────────────────────────────────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'health_logs'
--     AND column_name IN ('log_type', 'dose_or_quantity', 'produit_id');
-- SELECT enumlabel FROM pg_enum
--   WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'health_log_type');
