-- Rename column for clarity (no functional change, value is still auth.uid())
-- La colonne stocke auth.users.id, pas un farm_id distinct. Le naming
-- prête à confusion en vue d'un futur modèle multi-user/farm.
ALTER TABLE public.alert_dismissals RENAME COLUMN farm_id TO user_id;

-- Recreate index avec le nouveau nom de colonne
ALTER INDEX IF EXISTS alert_dismissals_farm_id_idx RENAME TO alert_dismissals_user_id_idx;

-- Recreate RLS policies with new column name
DROP POLICY IF EXISTS "users see own farm dismissals" ON public.alert_dismissals;
DROP POLICY IF EXISTS "users insert own farm dismissals" ON public.alert_dismissals;
DROP POLICY IF EXISTS "users delete own farm dismissals" ON public.alert_dismissals;

CREATE POLICY "users see own dismissals" ON public.alert_dismissals
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "users insert own dismissals" ON public.alert_dismissals
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND dismissed_by = auth.uid());
CREATE POLICY "users delete own dismissals" ON public.alert_dismissals
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
