-- ════════════════════════════════════════════════════════════════════════════
-- V26c — Tables sessions_pesee + pesees (historique pesées par porcelet)
--
-- Date     : 2026-05-02
-- Spec     : carnet papier christophe pesée 02/05/2026, traçabilité requise
--
-- Conséquences :
--   - 1 session par date+ferme (mensuelle / individuelle / rattrapage)
--   - 1 ligne pesées par porcelet pesé dans la session
--   - poids_courant_kg sur porcelets_individuels reste à jour via dernière pesée
-- ════════════════════════════════════════════════════════════════════════════

-- Table sessions_pesee
CREATE TABLE IF NOT EXISTS public.sessions_pesee (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.profiles(id),
  date_session date NOT NULL,
  type text NOT NULL DEFAULT 'mensuelle' CHECK (type IN ('mensuelle','individuelle','rattrapage')),
  operateur text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_pesee_farm_idx ON public.sessions_pesee(farm_id);
CREATE INDEX IF NOT EXISTS sessions_pesee_date_idx ON public.sessions_pesee(date_session DESC);

ALTER TABLE public.sessions_pesee ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sessions_pesee_owner ON public.sessions_pesee;
CREATE POLICY sessions_pesee_owner ON public.sessions_pesee
  FOR ALL USING (farm_id = auth.uid());

-- Table pesees (1 ligne par porcelet × session)
CREATE TABLE IF NOT EXISTS public.pesees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.profiles(id),
  porcelet_id uuid NOT NULL REFERENCES public.porcelets_individuels(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions_pesee(id) ON DELETE SET NULL,
  poids_kg numeric NOT NULL CHECK (poids_kg > 0 AND poids_kg <= 200),
  date_pesee date NOT NULL,
  operateur text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pesees_farm_idx     ON public.pesees(farm_id);
CREATE INDEX IF NOT EXISTS pesees_porcelet_idx ON public.pesees(porcelet_id);
CREATE INDEX IF NOT EXISTS pesees_session_idx  ON public.pesees(session_id);
CREATE INDEX IF NOT EXISTS pesees_date_idx     ON public.pesees(date_pesee DESC);

ALTER TABLE public.pesees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pesees_owner ON public.pesees;
CREATE POLICY pesees_owner ON public.pesees
  FOR ALL USING (farm_id = auth.uid());

-- Couleur boucle (vert F / bleu M) sur porcelets_individuels — traçabilité métier
ALTER TABLE public.porcelets_individuels
  ADD COLUMN IF NOT EXISTS couleur_boucle text CHECK (couleur_boucle IN ('VERT','BLEU','AUTRE'));

COMMENT ON COLUMN public.porcelets_individuels.couleur_boucle IS
  'V26c: couleur boucle - VERT pour femelles, BLEU pour males (convention christophe)';
