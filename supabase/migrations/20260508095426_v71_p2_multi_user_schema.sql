-- =============================================================
-- _DRAFT_v71_multi_user_schema.sql
-- Brouillon — N'EST PAS exécuté par défaut (préfixe _DRAFT_).
-- Auteur: supabase-ops sub-agent (2026-05-08)
-- Pré-requis: 20260508_rls_quickwins.sql DÉJÀ appliquée (vérifié via list_migrations).
--
-- Objectif (V71 P2):
--   Passer du modèle "1 user = 1 farm" (farm_id = auth.uid())
--   au modèle "N users <-> N farms" via les tables farms + farm_members.
--   Préserver les données existantes en backfillant chaque user actuel
--   comme OWNER de sa propre farm (farm.id = user.id).
--
-- Décisions structurantes:
--   1. farms.id reste = auth.users.id pour les users existants
--      (zero-cost backfill : aucun UPDATE de farm_id sur les 24 tables).
--   2. Helper SECURITY DEFINER `public.user_farms(uid uuid)` pour cacher
--      la jointure RLS et garder une perf acceptable (STABLE + index).
--   3. Refactor des 40 policies farm-scoped via le pattern
--      `farm_id IN (SELECT public.user_farms(auth.uid()))`.
--   4. Le rôle (OWNER/ADMIN/PORCHER) migre de profiles.role vers
--      farm_members.role pour permettre des rôles différents par farm.
--      `profiles.role` reste pour rétro-compat lecture (non muté ici).
--
-- ⚠ Cette migration N'INCLUT PAS:
--   - DROP de profiles.role (à faire en V72 après refactor frontend complet)
--   - Refactor des fonctions handle_new_user / is_owner_or_admin
--     (à versionner séparément — voir BLOC 5 pour le squelette)
--   - Changements frontend (FarmContext.currentFarmId, hooks useCurrentFarm…)
--
-- Ordre d'application recommandé:
--   ÉTAPE A: ce fichier (_DRAFT_v71_multi_user_schema.sql) renommé sans _DRAFT_
--   ÉTAPE B: refactor frontend (currentFarmId dans FarmContext + supabaseWrites)
--   ÉTAPE C: V72 cleanup (drop profiles.role, drop farm_id colonnes obsolètes)
-- =============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- BLOC 1. Création des tables farms + farm_members
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.farms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL DEFAULT 'Ma ferme',
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pays        text,                    -- ré-aligné sur troupeaux.pays
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS farms_owner_id_idx ON public.farms(owner_id);

CREATE TABLE IF NOT EXISTS public.farm_members (
  farm_id     uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'PORCHER')),
  invited_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (farm_id, user_id)
);

CREATE INDEX IF NOT EXISTS farm_members_user_id_idx ON public.farm_members(user_id);
CREATE INDEX IF NOT EXISTS farm_members_farm_id_idx ON public.farm_members(farm_id);

-- ─────────────────────────────────────────────────────────────
-- BLOC 2. Helper SECURITY DEFINER user_farms(uid) — perf RLS
-- ─────────────────────────────────────────────────────────────
-- STABLE pour permettre le caching côté planner.
-- search_path lock à `''` pour bloquer search_path injection.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.user_farms(uid uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT farm_id
  FROM public.farm_members
  WHERE user_id = uid;
$$;

REVOKE EXECUTE ON FUNCTION public.user_farms(uuid) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.user_farms(uuid) TO authenticated;

-- Helper alternatif sans param (sucre syntaxique côté policies)
CREATE OR REPLACE FUNCTION public.current_user_farms()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT farm_id
  FROM public.farm_members
  WHERE user_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_farms() FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.current_user_farms() TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- BLOC 3. RLS sur farms + farm_members
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.farms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_members ENABLE ROW LEVEL SECURITY;

-- farms: visible si l'user en est membre (owner ou autre)
CREATE POLICY farms_select ON public.farms
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.current_user_farms()));

-- farms: insert réservé aux users authentifiés, owner_id forcé = auth.uid()
CREATE POLICY farms_insert ON public.farms
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- farms: update/delete réservé à OWNER de la farm
CREATE POLICY farms_update_owner ON public.farms
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.farm_members
      WHERE farm_id = id AND user_id = auth.uid() AND role = 'OWNER'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.farm_members
      WHERE farm_id = id AND user_id = auth.uid() AND role = 'OWNER'
    )
  );

CREATE POLICY farms_delete_owner ON public.farms
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.farm_members
      WHERE farm_id = id AND user_id = auth.uid() AND role = 'OWNER'
    )
  );

-- farm_members: select des membres des fermes auxquelles on appartient
CREATE POLICY farm_members_select ON public.farm_members
  FOR SELECT TO authenticated
  USING (farm_id IN (SELECT public.current_user_farms()));

-- farm_members: insert (= invitation) réservé à OWNER ou ADMIN de la farm
CREATE POLICY farm_members_insert_admin ON public.farm_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.farm_members fm
      WHERE fm.farm_id = farm_members.farm_id
        AND fm.user_id = auth.uid()
        AND fm.role IN ('OWNER', 'ADMIN')
    )
    -- Exception : auto-insertion du OWNER lors du signup (cf. handle_new_user)
    OR (user_id = auth.uid() AND role = 'OWNER')
  );

-- farm_members: update du rôle réservé à OWNER (pas ADMIN — anti-escalation)
CREATE POLICY farm_members_update_owner ON public.farm_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.farm_members fm
      WHERE fm.farm_id = farm_members.farm_id
        AND fm.user_id = auth.uid()
        AND fm.role = 'OWNER'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.farm_members fm
      WHERE fm.farm_id = farm_members.farm_id
        AND fm.user_id = auth.uid()
        AND fm.role = 'OWNER'
    )
  );

-- farm_members: delete (= retrait/quitter) — OWNER ou self
CREATE POLICY farm_members_delete ON public.farm_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()    -- l'user peut quitter une farm
    OR EXISTS (
      SELECT 1 FROM public.farm_members fm
      WHERE fm.farm_id = farm_members.farm_id
        AND fm.user_id = auth.uid()
        AND fm.role = 'OWNER'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- BLOC 4. BACKFILL — chaque user actuel devient OWNER de SA farm
-- ─────────────────────────────────────────────────────────────
-- Stratégie : farms.id = profiles.id pour préserver tous les farm_id existants
-- dans les 24 tables. Aucun UPDATE de données métier nécessaire.
-- ─────────────────────────────────────────────────────────────

-- 4.1. Crée une farm par profile (id = profile.id)
INSERT INTO public.farms (id, name, owner_id, pays, created_at)
SELECT
  p.id,
  COALESCE(t.nom, 'Ma ferme'),
  p.id,
  t.pays,
  COALESCE(t.created_at, now())
FROM public.profiles p
LEFT JOIN public.troupeaux t ON t.user_id = p.id
ON CONFLICT (id) DO NOTHING;

-- 4.2. Backfill farm_members : chaque user OWNER de sa farm
-- profiles.role peut être 'PORCHER' par défaut → on force 'OWNER' au backfill
-- car historiquement chaque user EST owner de sa farm implicite.
INSERT INTO public.farm_members (farm_id, user_id, role, created_at)
SELECT p.id, p.id, 'OWNER', now()
FROM public.profiles p
ON CONFLICT (farm_id, user_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- BLOC 5. Refonte des 40 policies farm-scoped (24 tables)
-- ─────────────────────────────────────────────────────────────
-- Pattern de remplacement :
--   USING (farm_id = auth.uid())  →  USING (farm_id IN (SELECT public.current_user_farms()))
--
-- Pour les policies write_admin_owner (feed_inventory, finances, vet_inventory,
-- produits_*, plan_alimentation) : ajout d'un check role IN ('OWNER','ADMIN')
-- via la nouvelle table farm_members (au lieu de is_owner_or_admin() qui lit
-- profiles.role globalement).
-- ─────────────────────────────────────────────────────────────

-- 5.1. Nouvelle helper : check rôle dans la farm courante
CREATE OR REPLACE FUNCTION public.is_member_with_role(p_farm_id uuid, VARIADIC p_roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.farm_members
    WHERE farm_id = p_farm_id
      AND user_id = auth.uid()
      AND role = ANY(p_roles)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_member_with_role(uuid, text[]) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.is_member_with_role(uuid, text[]) TO authenticated;

-- 5.2. Refactor policies — bloc DROP + CREATE par table
-- (24 tables — listées ci-dessous dans l'ordre alphabétique)

-- adoptions (2 policies)
DROP POLICY IF EXISTS "users insert own adoptions" ON public.adoptions;
DROP POLICY IF EXISTS "users see own adoptions"    ON public.adoptions;
CREATE POLICY adoptions_select ON public.adoptions
  FOR SELECT TO authenticated
  USING (farm_id IN (SELECT public.current_user_farms()));
CREATE POLICY adoptions_insert ON public.adoptions
  FOR INSERT TO authenticated
  WITH CHECK (
    farm_id IN (SELECT public.current_user_farms())
    AND created_by = auth.uid()
  );

-- batch_sows
DROP POLICY IF EXISTS batch_sows_all ON public.batch_sows;
CREATE POLICY batch_sows_all ON public.batch_sows
  FOR ALL TO authenticated
  USING       (farm_id IN (SELECT public.current_user_farms()))
  WITH CHECK  (farm_id IN (SELECT public.current_user_farms()));

-- batches
DROP POLICY IF EXISTS isolation_by_farm ON public.batches;
CREATE POLICY batches_all ON public.batches
  FOR ALL TO authenticated
  USING       (farm_id IN (SELECT public.current_user_farms()))
  WITH CHECK  (farm_id IN (SELECT public.current_user_farms()));

-- boars
DROP POLICY IF EXISTS isolation_by_farm ON public.boars;
CREATE POLICY boars_all ON public.boars
  FOR ALL TO authenticated
  USING       (farm_id IN (SELECT public.current_user_farms()))
  WITH CHECK  (farm_id IN (SELECT public.current_user_farms()));

-- daily_checks_mb
DROP POLICY IF EXISTS daily_checks_mb_all ON public.daily_checks_mb;
CREATE POLICY daily_checks_mb_all ON public.daily_checks_mb
  FOR ALL TO authenticated
  USING       (farm_id IN (SELECT public.current_user_farms()))
  WITH CHECK  (farm_id IN (SELECT public.current_user_farms()));

-- feed_consumption_logs (4 policies)
DROP POLICY IF EXISTS "users delete own farm feed conso" ON public.feed_consumption_logs;
DROP POLICY IF EXISTS "users insert own farm feed conso" ON public.feed_consumption_logs;
DROP POLICY IF EXISTS "users see own farm feed conso"    ON public.feed_consumption_logs;
DROP POLICY IF EXISTS "users update own farm feed conso" ON public.feed_consumption_logs;
CREATE POLICY feed_consumption_logs_all ON public.feed_consumption_logs
  FOR ALL TO authenticated
  USING       (farm_id IN (SELECT public.current_user_farms()))
  WITH CHECK  (farm_id IN (SELECT public.current_user_farms())
               AND created_by = auth.uid());

-- feed_inventory (2 policies — read all, write OWNER/ADMIN)
DROP POLICY IF EXISTS feed_inventory_select_farm        ON public.feed_inventory;
DROP POLICY IF EXISTS feed_inventory_write_admin_owner  ON public.feed_inventory;
CREATE POLICY feed_inventory_select ON public.feed_inventory
  FOR SELECT TO authenticated
  USING (farm_id IN (SELECT public.current_user_farms()));
CREATE POLICY feed_inventory_write ON public.feed_inventory
  FOR ALL TO authenticated
  USING       (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'))
  WITH CHECK  (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));

-- finances (2 policies — OWNER/ADMIN only)
DROP POLICY IF EXISTS finances_select_admin_owner ON public.finances;
DROP POLICY IF EXISTS finances_write_admin_owner  ON public.finances;
CREATE POLICY finances_select ON public.finances
  FOR SELECT TO authenticated
  USING (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));
CREATE POLICY finances_write ON public.finances
  FOR ALL TO authenticated
  USING       (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'))
  WITH CHECK  (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));

-- fournisseurs (4 policies)
DROP POLICY IF EXISTS "users delete own fournisseurs" ON public.fournisseurs;
DROP POLICY IF EXISTS "users insert own fournisseurs" ON public.fournisseurs;
DROP POLICY IF EXISTS "users see own fournisseurs"    ON public.fournisseurs;
DROP POLICY IF EXISTS "users update own fournisseurs" ON public.fournisseurs;
CREATE POLICY fournisseurs_all ON public.fournisseurs
  FOR ALL TO authenticated
  USING       (farm_id IN (SELECT public.current_user_farms()))
  WITH CHECK  (farm_id IN (SELECT public.current_user_farms()));

-- health_logs
DROP POLICY IF EXISTS isolation_by_farm ON public.health_logs;
CREATE POLICY health_logs_all ON public.health_logs
  FOR ALL TO authenticated
  USING       (farm_id IN (SELECT public.current_user_farms()))
  WITH CHECK  (farm_id IN (SELECT public.current_user_farms()));

-- loge_movements
DROP POLICY IF EXISTS loge_movements_all ON public.loge_movements;
CREATE POLICY loge_movements_all ON public.loge_movements
  FOR ALL TO authenticated
  USING       (farm_id IN (SELECT public.current_user_farms()))
  WITH CHECK  (farm_id IN (SELECT public.current_user_farms()));

-- loges
DROP POLICY IF EXISTS loges_all ON public.loges;
CREATE POLICY loges_all ON public.loges
  FOR ALL TO authenticated
  USING       (farm_id IN (SELECT public.current_user_farms()))
  WITH CHECK  (farm_id IN (SELECT public.current_user_farms()));

-- notes
DROP POLICY IF EXISTS notes_all ON public.notes;
CREATE POLICY notes_all ON public.notes
  FOR ALL TO authenticated
  USING       (farm_id IN (SELECT public.current_user_farms()))
  WITH CHECK  (farm_id IN (SELECT public.current_user_farms()));

-- pesee_planifiees
DROP POLICY IF EXISTS pesee_planifiees_all ON public.pesee_planifiees;
CREATE POLICY pesee_planifiees_all ON public.pesee_planifiees
  FOR ALL TO authenticated
  USING       (farm_id IN (SELECT public.current_user_farms()))
  WITH CHECK  (farm_id IN (SELECT public.current_user_farms()));

-- pesees
DROP POLICY IF EXISTS pesees_all ON public.pesees;
CREATE POLICY pesees_all ON public.pesees
  FOR ALL TO authenticated
  USING       (farm_id IN (SELECT public.current_user_farms()))
  WITH CHECK  (farm_id IN (SELECT public.current_user_farms()));

-- plan_alimentation (2 policies — OWNER/ADMIN write, read all)
DROP POLICY IF EXISTS plan_alimentation_select_farm        ON public.plan_alimentation;
DROP POLICY IF EXISTS plan_alimentation_write_admin_owner  ON public.plan_alimentation;
CREATE POLICY plan_alimentation_select ON public.plan_alimentation
  FOR SELECT TO authenticated
  USING (farm_id IN (SELECT public.current_user_farms()));
CREATE POLICY plan_alimentation_write ON public.plan_alimentation
  FOR ALL TO authenticated
  USING       (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'))
  WITH CHECK  (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));

-- porcelets_individuels
DROP POLICY IF EXISTS porcelets_individuels_all ON public.porcelets_individuels;
CREATE POLICY porcelets_individuels_all ON public.porcelets_individuels
  FOR ALL TO authenticated
  USING       (farm_id IN (SELECT public.current_user_farms()))
  WITH CHECK  (farm_id IN (SELECT public.current_user_farms()));

-- produits_aliments (2 policies)
DROP POLICY IF EXISTS produits_aliments_select_farm        ON public.produits_aliments;
DROP POLICY IF EXISTS produits_aliments_write_admin_owner  ON public.produits_aliments;
CREATE POLICY produits_aliments_select ON public.produits_aliments
  FOR SELECT TO authenticated
  USING (farm_id IN (SELECT public.current_user_farms()));
CREATE POLICY produits_aliments_write ON public.produits_aliments
  FOR ALL TO authenticated
  USING       (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'))
  WITH CHECK  (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));

-- produits_veto (2 policies)
DROP POLICY IF EXISTS produits_veto_select_farm        ON public.produits_veto;
DROP POLICY IF EXISTS produits_veto_write_admin_owner  ON public.produits_veto;
CREATE POLICY produits_veto_select ON public.produits_veto
  FOR SELECT TO authenticated
  USING (farm_id IN (SELECT public.current_user_farms()));
CREATE POLICY produits_veto_write ON public.produits_veto
  FOR ALL TO authenticated
  USING       (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'))
  WITH CHECK  (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));

-- saillies
DROP POLICY IF EXISTS saillies_all ON public.saillies;
CREATE POLICY saillies_all ON public.saillies
  FOR ALL TO authenticated
  USING       (farm_id IN (SELECT public.current_user_farms()))
  WITH CHECK  (farm_id IN (SELECT public.current_user_farms()));

-- sessions_pesee
DROP POLICY IF EXISTS sessions_pesee_all ON public.sessions_pesee;
CREATE POLICY sessions_pesee_all ON public.sessions_pesee
  FOR ALL TO authenticated
  USING       (farm_id IN (SELECT public.current_user_farms()))
  WITH CHECK  (farm_id IN (SELECT public.current_user_farms()));

-- sows
DROP POLICY IF EXISTS isolation_by_farm ON public.sows;
CREATE POLICY sows_all ON public.sows
  FOR ALL TO authenticated
  USING       (farm_id IN (SELECT public.current_user_farms()))
  WITH CHECK  (farm_id IN (SELECT public.current_user_farms()));

-- vet_inventory (2 policies)
DROP POLICY IF EXISTS vet_inventory_select_farm        ON public.vet_inventory;
DROP POLICY IF EXISTS vet_inventory_write_admin_owner  ON public.vet_inventory;
CREATE POLICY vet_inventory_select ON public.vet_inventory
  FOR SELECT TO authenticated
  USING (farm_id IN (SELECT public.current_user_farms()));
CREATE POLICY vet_inventory_write ON public.vet_inventory
  FOR ALL TO authenticated
  USING       (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'))
  WITH CHECK  (public.is_member_with_role(farm_id, 'OWNER', 'ADMIN'));

-- weight_distributions (4 policies)
DROP POLICY IF EXISTS "users delete own farm weight distributions" ON public.weight_distributions;
DROP POLICY IF EXISTS "users insert own farm weight distributions" ON public.weight_distributions;
DROP POLICY IF EXISTS "users see own farm weight distributions"    ON public.weight_distributions;
DROP POLICY IF EXISTS "users update own farm weight distributions" ON public.weight_distributions;
CREATE POLICY weight_distributions_all ON public.weight_distributions
  FOR ALL TO authenticated
  USING       (farm_id IN (SELECT public.current_user_farms()))
  WITH CHECK  (farm_id IN (SELECT public.current_user_farms()));

-- ─────────────────────────────────────────────────────────────
-- BLOC 6. Mise à jour handle_new_user pour créer farm + membership
-- ─────────────────────────────────────────────────────────────
-- Le trigger AFTER INSERT ON auth.users doit désormais :
--  1. Créer un row profiles (idem actuel)
--  2. Créer un row farms (id = new.id pour rester cohérent avec backfill)
--  3. Créer un row farm_members (farm_id=new.id, user_id=new.id, role='OWNER')
--  4. Créer un row troupeaux (legacy — à supprimer en V72 si plus utilisé)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- 1. Profile
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'OWNER'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Farm (id = new.id pour cohérence avec données existantes)
  INSERT INTO public.farms (id, name, owner_id, pays)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'farm_name', 'Ma ferme'),
    new.id,
    new.raw_user_meta_data->>'sector'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 3. Membership OWNER
  INSERT INTO public.farm_members (farm_id, user_id, role)
  VALUES (new.id, new.id, 'OWNER')
  ON CONFLICT (farm_id, user_id) DO NOTHING;

  -- 4. Troupeau legacy (ne pas casser flow actuel — à droper en V72)
  INSERT INTO public.troupeaux (nom, user_id, secteur)
  VALUES (
    COALESCE(new.raw_user_meta_data->>'farm_name', 'Ma ferme'),
    new.id,
    new.raw_user_meta_data->>'sector'
  );

  RETURN new;
END;
$$;

-- Permissions inchangées (cf. quickwins) : seul le trigger l'invoque
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- ─────────────────────────────────────────────────────────────
-- BLOC 7. is_owner_or_admin() — version multi-farm
-- ─────────────────────────────────────────────────────────────
-- L'ancienne version regarde profiles.role globalement. La nouvelle version
-- prend un farm_id et regarde le rôle dans CETTE farm. ATTENTION : la
-- signature change → toutes les policies qui utilisaient is_owner_or_admin()
-- ont été refactor au BLOC 5 vers is_member_with_role(farm_id, 'OWNER','ADMIN').
-- L'ancienne fonction is_owner_or_admin() est conservée pour rétro-compat
-- (admin_logs_select s'en sert peut-être) mais on la marque DEPRECATED.
-- ─────────────────────────────────────────────────────────────

COMMENT ON FUNCTION public.is_owner_or_admin() IS
  'DEPRECATED V71 — utiliser is_member_with_role(farm_id, ''OWNER'', ''ADMIN''). À drop en V72.';

-- ─────────────────────────────────────────────────────────────
-- BLOC 8. Trigger auto-update updated_at sur farms
-- ─────────────────────────────────────────────────────────────

CREATE TRIGGER farms_set_updated_at
  BEFORE UPDATE ON public.farms
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMIT;

-- =============================================================
-- ROLLBACK (à exécuter si problème détecté)
-- =============================================================
-- BEGIN;
--   -- 1. Restaurer policies au pattern farm_id = auth.uid()
--   --    (recopier les CREATE POLICY de 20260508_rls_quickwins.sql + originaux)
--   -- 2. Drop helper functions
--   DROP FUNCTION IF EXISTS public.is_member_with_role(uuid, text[]);
--   DROP FUNCTION IF EXISTS public.current_user_farms();
--   DROP FUNCTION IF EXISTS public.user_farms(uuid);
--   -- 3. Drop tables (CASCADE car les policies y réfèrent)
--   DROP TABLE IF EXISTS public.farm_members CASCADE;
--   DROP TABLE IF EXISTS public.farms CASCADE;
--   -- 4. Restaurer handle_new_user d'origine
--   --    (recopier prosrc snapshot pré-V71 — disponible dans cet historique git)
-- COMMIT;
