-- ════════════════════════════════════════════════════════════════════════════
-- HOTFIX P0 — drop fuites anon sur stocks (feed_inventory + vet_inventory)
--
-- Date     : 2026-05-04
-- Découvertes par RLS-AUDITOR Phase 0 V70 (docs/v70/V70_RLS_AUDIT.md §2.4)
-- Branche  : hotfix/p0-anon-policies
--
-- Risque corrigé :
--   1. feed_inventory.Lecture publique des stocks (SELECT, role=anon, qual=true)
--      → exposait `unit_price` + `total_price` (FCFA) sans authentification
--   2. vet_inventory.Lecture publique des stocks veto (SELECT, role=anon, qual=true)
--      → exposait `unit_cost` + `total_cost` (FCFA) sans authentification
--
-- Reproductible avant fix :
--   curl 'https://jcritwravdwefwqwyjvk.supabase.co/rest/v1/feed_inventory?select=*' \
--     -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
--   → dump complet de toutes les fermes, prix inclus.
--
-- Convention DB confirmée (cf. src/types/database.types.ts:313, :912) :
--   feed_inventory.farm_id  → FK profiles.id (= auth.uid())
--   vet_inventory.farm_id   → FK profiles.id (= auth.uid())
-- Le pattern multi-tenant standard du projet est `farm_id = auth.uid()`,
-- aligné avec les 11 autres tables `isolation_by_farm` (cf. audit §2.1).
--
-- Idempotence : DROP POLICY IF EXISTS + CREATE POLICY (recréation propre).
-- Rollback    : voir docs/hotfix/HOTFIX_P0_TESTS.md
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. feed_inventory : drop policy anon, recréer SELECT authentifié ─────────
DROP POLICY IF EXISTS "Lecture publique des stocks" ON public.feed_inventory;

CREATE POLICY "feed_inventory_select_authenticated"
  ON public.feed_inventory
  FOR SELECT
  TO authenticated
  USING (farm_id = auth.uid());

-- ── 2. vet_inventory : drop policy anon, recréer SELECT authentifié ──────────
DROP POLICY IF EXISTS "Lecture publique des stocks veto" ON public.vet_inventory;

CREATE POLICY "vet_inventory_select_authenticated"
  ON public.vet_inventory
  FOR SELECT
  TO authenticated
  USING (farm_id = auth.uid());

-- ── Vérifications post-migration recommandées ───────────────────────────────
--
-- 1. Plus aucune policy anon sur stocks :
--    SELECT tablename, policyname, roles, cmd, qual
--      FROM pg_policies
--     WHERE schemaname = 'public'
--       AND tablename IN ('feed_inventory','vet_inventory')
--     ORDER BY tablename, policyname;
--    → roles ne doit JAMAIS contenir {anon} ni {public}
--
-- 2. Test fuite anon (doit échouer) :
--    curl '<SUPABASE_URL>/rest/v1/feed_inventory?select=*' \
--      -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
--    → tableau vide [] (RLS bloque) ; PAS de 401, c'est normal côté PostgREST.
--
-- 3. App user authentifié (doit fonctionner) :
--    SELECT * FROM public.feed_inventory ;  -- en session auth.uid() = farm_id
--    → retourne les lignes de la ferme uniquement.
