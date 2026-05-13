-- ============================================================================
-- 2026-05-13 — Sprint 1 sécu : flag super_admin + RLS admin_logs réservée
-- ============================================================================
-- Contexte : la policy `admin_logs_select` filtrait via `profiles.role IN
-- ('OWNER','ADMIN')`, ce qui exposait potentiellement les logs cross-tenant
-- à tout OWNER de ferme. La table `admin_logs` est conçue comme audit log
-- GLOBAL plateforme (pas de `farm_id`), donc seul un super_admin (équipe
-- support PorcTrack) doit pouvoir lire.
--
-- Stratégie retenue : ajouter `profiles.is_super_admin` (BOOLEAN), passer
-- l'email support en super_admin, et scoper la policy SELECT sur ce flag.
-- Le flag est réutilisable pour toute future feature ops (dashboard global,
-- exports cross-tenant, support tickets, etc.).
-- ============================================================================

-- 1) Colonne flag super_admin sur profiles (idempotent)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.is_super_admin IS
  'Super-admin plateforme PorcTrack (support, ops, debug). NE PAS confondre avec role OWNER/ADMIN qui sont des rôles par ferme.';

-- 2) Index partiel pour lookup rapide (1-3 lignes attendues max)
CREATE INDEX IF NOT EXISTS profiles_super_admin_idx
  ON public.profiles (id)
  WHERE is_super_admin = TRUE;

-- 3) Promotion du compte support
UPDATE public.profiles
   SET is_super_admin = TRUE
 WHERE email = 'contact@liegeoischristophe.com';

-- 4) Refonte de la policy SELECT sur admin_logs
DROP POLICY IF EXISTS admin_logs_select ON public.admin_logs;

CREATE POLICY admin_logs_select ON public.admin_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.is_super_admin = TRUE
    )
  );

-- 5) (Conservation) policy INSERT inchangée — un user authentifié peut
-- toujours logger ses propres actions via logAction(). On garde l'audit
-- trail entrant ouvert, on restreint uniquement la lecture.

COMMENT ON POLICY admin_logs_select ON public.admin_logs IS
  'V81 — Lecture réservée aux super-admins plateforme (cf profiles.is_super_admin). Les OWNER/ADMIN de ferme n''y ont plus accès car la table n''est pas farm-scopée.';
