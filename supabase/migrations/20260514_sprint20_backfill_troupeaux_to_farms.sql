-- Sprint 20 — Backfill troupeaux (legacy V25) → farms (V71+ multi-tenant)
--
-- CONTEXTE : `settingsService.ts` retire son fallback `troupeaux`. Avant ce
-- retrait, on garantit que chaque user de `troupeaux` possède bien une row
-- `farms` (id = user_id) ET une row `farm_members` OWNER.
--
-- DIAGNOSTIC Sprint 20 (2026-05-14) : les 10 troupeaux prod ont DÉJÀ une farm
-- et un farm_members OWNER. Cette migration est donc un NO-OP attendu — elle
-- est conservée comme filet de sécurité idempotent (défense en profondeur).
--
-- ORDRE D'APPLICATION : cette migration DOIT être appliquée AVANT le déploiement
-- du code `settingsService.ts` sans fallback. Vu le NO-OP confirmé, simultané
-- est acceptable, mais l'ordre backfill-puis-code reste la règle.

-- 1) Créer une row farms pour chaque troupeau orphelin
INSERT INTO public.farms (id, name, owner_id, pays)
SELECT t.user_id, COALESCE(NULLIF(t.nom, ''), 'Ma ferme'), t.user_id, t.pays
FROM public.troupeaux t
LEFT JOIN public.farms f ON f.id = t.user_id
WHERE f.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 2) Créer la row farm_members OWNER pour ces users
INSERT INTO public.farm_members (farm_id, user_id, role)
SELECT t.user_id, t.user_id, 'OWNER'
FROM public.troupeaux t
LEFT JOIN public.farm_members fm ON fm.farm_id = t.user_id AND fm.user_id = t.user_id
WHERE fm.farm_id IS NULL
ON CONFLICT (farm_id, user_id) DO NOTHING;
