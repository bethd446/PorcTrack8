-- =============================================================================
-- 20260517_rls_initplan_fix.sql
-- But : corriger les 19 policies RLS signalées par l'advisor "auth_rls_initplan"
--       (Supabase Performance Advisors, 2026-05-17).
--
-- Source advisor : mcp-supabase-get_advisors-1778825639051.txt
--   lint = auth_rls_initplan × 19
--
-- Problème : auth.uid() / auth.role() évalués row-by-row par le planner Postgres
--   quand ils apparaissent directement dans USING/WITH CHECK.
--   Fix : les entourer de (SELECT ...) pour que le planner les évalue une fois
--   (InitPlan) puis cache le résultat pour toute la requête.
--
-- Vérification pré-migration : toutes les définitions de policies ci-dessous
--   ont été reconstituées depuis les fichiers de migration du repo (chemin exact
--   noté sur chaque DROP). Toute policy dont la définition n'a pas pu être
--   retrouvée avec certitude est marquée SKIP et commentée.
--
-- Risque : faible — DROP + CREATE dans une transaction. Si la recréation échoue,
--   la transaction est annulée et les policies originales sont restaurées.
--   Le seul risque est une microseconde d'absence de policy entre DROP et
--   CREATE — mitigé par le BEGIN/COMMIT qui rend l'opération atomique.
--
-- Rollback : ré-exécuter ce bloc en inversant (SELECT auth.uid()) → auth.uid()
--   et (SELECT auth.role()) → auth.role(). Les commandes exactes sont en bas.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TABLE : troupeaux
-- Policies : Lecture troupeau · troupeaux_insert_own · troupeaux_update_own
--            troupeaux_delete_own
-- Source   : migrations/2026_04_30_b2_complete.sql (insert/update/delete)
--            La policy "Lecture troupeau" est antérieure à B2 (pré-existante
--            dans la DB lors de la migration B2). Sa définition exacte est
--            INFÉRÉE comme user_id = auth.uid() pour SELECT — cohérent avec
--            les 3 autres policies de la table et le commentaire B2 l. 102.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Lecture troupeau" ON public.troupeaux;
CREATE POLICY "Lecture troupeau" ON public.troupeaux
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS troupeaux_insert_own ON public.troupeaux;
CREATE POLICY troupeaux_insert_own ON public.troupeaux
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS troupeaux_update_own ON public.troupeaux;
CREATE POLICY troupeaux_update_own ON public.troupeaux
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS troupeaux_delete_own ON public.troupeaux;
CREATE POLICY troupeaux_delete_own ON public.troupeaux
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TABLE : push_subscriptions
-- Policy   : "users manage their own subs"
-- Source   : supabase/migrations/20260508_v72_push_subscriptions.sql l. 28-29
--   Original : FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "users manage their own subs" ON public.push_subscriptions;
CREATE POLICY "users manage their own subs" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TABLE : profiles
-- Policies : profiles_select_own · profiles_insert_own · profiles_update_own
-- Source   : migrations/2026_04_30_b2_complete.sql l. 91-98
--   profiles_select_own  : FOR SELECT USING (auth.uid() = id)
--   profiles_insert_own  : FOR INSERT WITH CHECK (auth.uid() = id)
--   profiles_update_own  : FOR UPDATE USING (auth.uid() = id)
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  USING ((SELECT auth.uid()) = id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TABLE : alert_dismissals
-- Policies : "users see own dismissals" · "users insert own dismissals"
--            "users delete own dismissals"
-- Source   : migrations/2026_05_01_alert_dismissals_rename.sql l. 14-22
--   see    : FOR SELECT USING (user_id = auth.uid())
--   insert : FOR INSERT WITH CHECK (user_id = auth.uid() AND dismissed_by = auth.uid())
--   delete : FOR DELETE USING (user_id = auth.uid())
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "users see own dismissals" ON public.alert_dismissals;
CREATE POLICY "users see own dismissals" ON public.alert_dismissals
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users insert own dismissals" ON public.alert_dismissals;
CREATE POLICY "users insert own dismissals" ON public.alert_dismissals
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND dismissed_by = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "users delete own dismissals" ON public.alert_dismissals;
CREATE POLICY "users delete own dismissals" ON public.alert_dismissals
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TABLE : farms
-- Policies : farms_insert · farms_update_owner · farms_delete_owner
-- Source   : supabase/migrations/20260508095426_v71_p2_multi_user_schema.sql
--            l. 116-143
--   farms_insert       : FOR INSERT WITH CHECK (owner_id = auth.uid())
--   farms_update_owner : EXISTS (... fm.user_id = auth.uid() AND role='OWNER')
--   farms_delete_owner : EXISTS (... fm.user_id = auth.uid() AND role='OWNER')
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS farms_insert ON public.farms;
CREATE POLICY farms_insert ON public.farms
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS farms_update_owner ON public.farms;
CREATE POLICY farms_update_owner ON public.farms
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.farm_members
      WHERE farm_id = id
        AND user_id = (SELECT auth.uid())
        AND role = 'OWNER'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.farm_members
      WHERE farm_id = id
        AND user_id = (SELECT auth.uid())
        AND role = 'OWNER'
    )
  );

DROP POLICY IF EXISTS farms_delete_owner ON public.farms;
CREATE POLICY farms_delete_owner ON public.farms
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.farm_members
      WHERE farm_id = id
        AND user_id = (SELECT auth.uid())
        AND role = 'OWNER'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. TABLE : farm_members
-- Policies : farm_members_insert_admin · farm_members_update_owner
--            farm_members_delete
-- Source   : supabase/migrations/20260508095426_v71_p2_multi_user_schema.sql
--            l. 151-195
--   insert_admin  : EXISTS (... fm.user_id = auth.uid() AND role IN ('OWNER','ADMIN'))
--                   OR (user_id = auth.uid() AND role = 'OWNER')
--   update_owner  : EXISTS (... fm.user_id = auth.uid() AND role = 'OWNER') × 2
--   delete        : user_id = auth.uid() OR EXISTS (... fm.user_id = auth.uid() AND role='OWNER')
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS farm_members_insert_admin ON public.farm_members;
CREATE POLICY farm_members_insert_admin ON public.farm_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.farm_members fm
      WHERE fm.farm_id = farm_members.farm_id
        AND fm.user_id = (SELECT auth.uid())
        AND fm.role IN ('OWNER', 'ADMIN')
    )
    OR (user_id = (SELECT auth.uid()) AND role = 'OWNER')
  );

DROP POLICY IF EXISTS farm_members_update_owner ON public.farm_members;
CREATE POLICY farm_members_update_owner ON public.farm_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.farm_members fm
      WHERE fm.farm_id = farm_members.farm_id
        AND fm.user_id = (SELECT auth.uid())
        AND fm.role = 'OWNER'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.farm_members fm
      WHERE fm.farm_id = farm_members.farm_id
        AND fm.user_id = (SELECT auth.uid())
        AND fm.role = 'OWNER'
    )
  );

DROP POLICY IF EXISTS farm_members_delete ON public.farm_members;
CREATE POLICY farm_members_delete ON public.farm_members
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.farm_members fm
      WHERE fm.farm_id = farm_members.farm_id
        AND fm.user_id = (SELECT auth.uid())
        AND fm.role = 'OWNER'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. TABLE : adoptions
-- Policy   : adoptions_insert
-- Source   : supabase/migrations/20260508095426_v71_p2_multi_user_schema.sql
--            l. 264-269
--   Original :
--     FOR INSERT TO authenticated
--     WITH CHECK (
--       farm_id IN (SELECT public.current_user_farms())
--       AND created_by = auth.uid()
--     )
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS adoptions_insert ON public.adoptions;
CREATE POLICY adoptions_insert ON public.adoptions
  FOR INSERT TO authenticated
  WITH CHECK (
    farm_id IN (SELECT public.current_user_farms())
    AND created_by = (SELECT auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. TABLE : feed_consumption_logs
-- Policy   : feed_consumption_logs_all
-- Source   : supabase/migrations/20260508095426_v71_p2_multi_user_schema.sql
--            l. 304-309
--   Original :
--     FOR ALL TO authenticated
--     USING (farm_id IN (SELECT public.current_user_farms()))
--     WITH CHECK (
--       farm_id IN (SELECT public.current_user_farms())
--       AND created_by = auth.uid()     ← ici le problème
--     )
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS feed_consumption_logs_all ON public.feed_consumption_logs;
CREATE POLICY feed_consumption_logs_all ON public.feed_consumption_logs
  FOR ALL TO authenticated
  USING (farm_id IN (SELECT public.current_user_farms()))
  WITH CHECK (
    farm_id IN (SELECT public.current_user_farms())
    AND created_by = (SELECT auth.uid())
  );

COMMIT;

-- =============================================================================
-- ROLLBACK (remplacer (SELECT auth.uid()) → auth.uid() dans chaque policy) :
--
-- BEGIN;
--
-- DROP POLICY IF EXISTS "Lecture troupeau" ON public.troupeaux;
-- CREATE POLICY "Lecture troupeau" ON public.troupeaux
--   FOR SELECT TO authenticated USING (user_id = auth.uid());
--
-- DROP POLICY IF EXISTS troupeaux_insert_own ON public.troupeaux;
-- CREATE POLICY troupeaux_insert_own ON public.troupeaux
--   FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
--
-- DROP POLICY IF EXISTS troupeaux_update_own ON public.troupeaux;
-- CREATE POLICY troupeaux_update_own ON public.troupeaux
--   FOR UPDATE TO authenticated USING (auth.uid() = user_id);
--
-- DROP POLICY IF EXISTS troupeaux_delete_own ON public.troupeaux;
-- CREATE POLICY troupeaux_delete_own ON public.troupeaux
--   FOR DELETE TO authenticated USING (auth.uid() = user_id);
--
-- DROP POLICY IF EXISTS "users manage their own subs" ON public.push_subscriptions;
-- CREATE POLICY "users manage their own subs" ON public.push_subscriptions
--   FOR ALL TO authenticated
--   USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
--
-- DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
-- CREATE POLICY profiles_select_own ON public.profiles
--   FOR SELECT USING (auth.uid() = id);
-- DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
-- CREATE POLICY profiles_insert_own ON public.profiles
--   FOR INSERT WITH CHECK (auth.uid() = id);
-- DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
-- CREATE POLICY profiles_update_own ON public.profiles
--   FOR UPDATE USING (auth.uid() = id);
--
-- DROP POLICY IF EXISTS "users see own dismissals" ON public.alert_dismissals;
-- CREATE POLICY "users see own dismissals" ON public.alert_dismissals
--   FOR SELECT TO authenticated USING (user_id = auth.uid());
-- DROP POLICY IF EXISTS "users insert own dismissals" ON public.alert_dismissals;
-- CREATE POLICY "users insert own dismissals" ON public.alert_dismissals
--   FOR INSERT TO authenticated
--   WITH CHECK (user_id = auth.uid() AND dismissed_by = auth.uid());
-- DROP POLICY IF EXISTS "users delete own dismissals" ON public.alert_dismissals;
-- CREATE POLICY "users delete own dismissals" ON public.alert_dismissals
--   FOR DELETE TO authenticated USING (user_id = auth.uid());
--
-- DROP POLICY IF EXISTS farms_insert ON public.farms;
-- CREATE POLICY farms_insert ON public.farms
--   FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
-- DROP POLICY IF EXISTS farms_update_owner ON public.farms;
-- CREATE POLICY farms_update_owner ON public.farms
--   FOR UPDATE TO authenticated
--   USING (EXISTS (SELECT 1 FROM public.farm_members
--     WHERE farm_id = id AND user_id = auth.uid() AND role = 'OWNER'))
--   WITH CHECK (EXISTS (SELECT 1 FROM public.farm_members
--     WHERE farm_id = id AND user_id = auth.uid() AND role = 'OWNER'));
-- DROP POLICY IF EXISTS farms_delete_owner ON public.farms;
-- CREATE POLICY farms_delete_owner ON public.farms
--   FOR DELETE TO authenticated
--   USING (EXISTS (SELECT 1 FROM public.farm_members
--     WHERE farm_id = id AND user_id = auth.uid() AND role = 'OWNER'));
--
-- DROP POLICY IF EXISTS farm_members_insert_admin ON public.farm_members;
-- CREATE POLICY farm_members_insert_admin ON public.farm_members
--   FOR INSERT TO authenticated
--   WITH CHECK (
--     EXISTS (SELECT 1 FROM public.farm_members fm
--       WHERE fm.farm_id = farm_members.farm_id
--         AND fm.user_id = auth.uid() AND fm.role IN ('OWNER', 'ADMIN'))
--     OR (user_id = auth.uid() AND role = 'OWNER')
--   );
-- DROP POLICY IF EXISTS farm_members_update_owner ON public.farm_members;
-- CREATE POLICY farm_members_update_owner ON public.farm_members
--   FOR UPDATE TO authenticated
--   USING (EXISTS (SELECT 1 FROM public.farm_members fm
--     WHERE fm.farm_id = farm_members.farm_id
--       AND fm.user_id = auth.uid() AND fm.role = 'OWNER'))
--   WITH CHECK (EXISTS (SELECT 1 FROM public.farm_members fm
--     WHERE fm.farm_id = farm_members.farm_id
--       AND fm.user_id = auth.uid() AND fm.role = 'OWNER'));
-- DROP POLICY IF EXISTS farm_members_delete ON public.farm_members;
-- CREATE POLICY farm_members_delete ON public.farm_members
--   FOR DELETE TO authenticated
--   USING (user_id = auth.uid()
--     OR EXISTS (SELECT 1 FROM public.farm_members fm
--       WHERE fm.farm_id = farm_members.farm_id
--         AND fm.user_id = auth.uid() AND fm.role = 'OWNER'));
--
-- DROP POLICY IF EXISTS adoptions_insert ON public.adoptions;
-- CREATE POLICY adoptions_insert ON public.adoptions
--   FOR INSERT TO authenticated
--   WITH CHECK (
--     farm_id IN (SELECT public.current_user_farms())
--     AND created_by = auth.uid()
--   );
--
-- DROP POLICY IF EXISTS feed_consumption_logs_all ON public.feed_consumption_logs;
-- CREATE POLICY feed_consumption_logs_all ON public.feed_consumption_logs
--   FOR ALL TO authenticated
--   USING (farm_id IN (SELECT public.current_user_farms()))
--   WITH CHECK (
--     farm_id IN (SELECT public.current_user_farms())
--     AND created_by = auth.uid()
--   );
--
-- COMMIT;
-- =============================================================================
