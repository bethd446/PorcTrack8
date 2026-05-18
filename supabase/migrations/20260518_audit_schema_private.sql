-- 2026-05-18 — Déplace les snapshots audit hors du schéma public exposé
-- Élimine 2 INFO 'rls_enabled_no_policy' de l'advisor sécurité.
-- Schéma `audit` accessible uniquement par postgres + service_role.

CREATE SCHEMA IF NOT EXISTS audit;
REVOKE ALL ON SCHEMA audit FROM PUBLIC;
REVOKE ALL ON SCHEMA audit FROM anon;
REVOKE ALL ON SCHEMA audit FROM authenticated;
GRANT USAGE ON SCHEMA audit TO postgres, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='_audit_20260518_batches_pre') THEN
    EXECUTE 'ALTER TABLE public._audit_20260518_batches_pre SET SCHEMA audit';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='_audit_20260518_phase2_snapshot') THEN
    EXECUTE 'ALTER TABLE public._audit_20260518_phase2_snapshot SET SCHEMA audit';
  END IF;
END $$;

GRANT ALL ON ALL TABLES IN SCHEMA audit TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT ALL ON TABLES TO postgres, service_role;
