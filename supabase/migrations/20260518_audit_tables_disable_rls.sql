-- 2026-05-18 — Schéma `audit` déjà revoke depuis PUBLIC/anon/authenticated.
-- RLS sans policy = bruit advisor sans valeur sécu. On disable.

ALTER TABLE IF EXISTS audit._audit_20260518_batches_pre DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit._audit_20260518_phase2_snapshot DISABLE ROW LEVEL SECURITY;
