-- Table : alert_dismissals
-- Permet à l'utilisateur d'ignorer (dismiss) une alerte FarmAlert sans changer
-- les données métier. Expiration 30j → alerte revient si toujours pertinente.
CREATE TABLE IF NOT EXISTS public.alert_dismissals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_id    text NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  dismissed_by uuid NOT NULL,
  reason      text,
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '30 days'
);

CREATE INDEX IF NOT EXISTS alert_dismissals_farm_id_idx ON public.alert_dismissals(farm_id);
CREATE INDEX IF NOT EXISTS alert_dismissals_alert_id_idx ON public.alert_dismissals(alert_id);

ALTER TABLE public.alert_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own farm dismissals" ON public.alert_dismissals
  FOR SELECT TO authenticated
  USING (farm_id = auth.uid());

CREATE POLICY "users insert own farm dismissals" ON public.alert_dismissals
  FOR INSERT TO authenticated
  WITH CHECK (farm_id = auth.uid() AND dismissed_by = auth.uid());

CREATE POLICY "users delete own farm dismissals" ON public.alert_dismissals
  FOR DELETE TO authenticated
  USING (farm_id = auth.uid());
