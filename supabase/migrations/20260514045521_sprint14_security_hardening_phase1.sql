-- Migration reconstituée depuis prod 2026-05-18 (drift fix).
-- Source : pg_class.relrowsecurity / relforcerowsecurity snapshot.
-- NE PAS RE-APPLIQUER. Déjà présente en prod.
--
-- Sprint14 — Phase 1 hardening sécurité :
--   - Force RLS sur tables sensibles (les owners ne bypass pas)
--   - Revoke d'éventuels GRANTs anon résiduels

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','farms','farm_members',
    'sows','boars','batches','batch_sows',
    'saillies','health_logs','notes',
    'feed_inventory','vet_inventory','plan_alimentation',
    'pesees_batch','pesee_planifiees',
    'porcelets_individuels','loges','loge_movements',
    'finances','lots','admin_logs'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXCEPTION WHEN undefined_table THEN
      -- Table inexistante (variantes profil ferme) : skip.
      CONTINUE;
    END;
  END LOOP;
END $$;
