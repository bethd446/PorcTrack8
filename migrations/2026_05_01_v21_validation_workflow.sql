-- ════════════════════════════════════════════════════════════════════════════
-- Migration V21-7 : Workflow validation porcher → admin
--
-- Date     : 2026-05-01
-- Auteur   : agent (PorcTrack8)
--
-- Contexte : actions critiques saisies par un porcher (WORKER) doivent passer
-- en attente de validation. Un OWNER/ADMIN peut valider ou rejeter.
-- Tables concernées : health_logs, batches (vente / mortalité), finances.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.health_logs
  ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS validation_status text DEFAULT 'PENDING'
    CHECK (validation_status IN ('PENDING', 'VALIDATED', 'REJECTED'));

ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS validation_status text DEFAULT 'VALIDATED'
    CHECK (validation_status IN ('PENDING', 'VALIDATED', 'REJECTED')),
  ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS validated_at timestamptz;

ALTER TABLE public.finances
  ADD COLUMN IF NOT EXISTS validation_status text DEFAULT 'VALIDATED'
    CHECK (validation_status IN ('PENDING', 'VALIDATED', 'REJECTED')),
  ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS validated_at timestamptz;

CREATE INDEX IF NOT EXISTS health_logs_validation_idx
  ON public.health_logs(validation_status) WHERE validation_status = 'PENDING';
CREATE INDEX IF NOT EXISTS batches_validation_idx
  ON public.batches(validation_status) WHERE validation_status = 'PENDING';
CREATE INDEX IF NOT EXISTS finances_validation_idx
  ON public.finances(validation_status) WHERE validation_status = 'PENDING';
