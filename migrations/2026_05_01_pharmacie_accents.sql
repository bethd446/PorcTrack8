-- ============================================================
-- 2026-05-01 — Correction des accents Pharmacie (produits_veto)
-- ============================================================
--
-- Contexte (cleanup audit I9) : les libellés et catégories des produits
-- vétérinaires importés depuis Excel manquent d'accents (ex.
-- "Anti-diarrheique" au lieu de "Anti-diarrhéique"). Cette migration
-- met à jour les lignes existantes pour la ferme K13 uniquement.
--
-- Manuel — à exécuter par l'utilisateur côté Supabase prod.
-- Idempotent : un second passage ne change rien (les lignes correctes
-- ne matchent plus la clause WHERE).
-- ============================================================

BEGIN;

-- libelle
UPDATE public.produits_veto SET libelle = 'Anti-diarrhéique'
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND libelle = 'Anti-diarrheique';

UPDATE public.produits_veto SET libelle = 'Désinfectant'
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND libelle = 'Desinfectant';

-- type (catégorie)
UPDATE public.produits_veto SET type = 'Biosécurité'
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND type = 'Biosecurite';

UPDATE public.produits_veto SET type = 'Complément'
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND type = 'Complement';

-- usage
UPDATE public.produits_veto SET usage = 'Déparasitage'
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND usage = 'Deparasitage';

UPDATE public.produits_veto SET usage = 'Diarrhée'
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND usage = 'Diarrhee';

-- finances.poste : 'Biosecurite' → 'Biosécurité'
UPDATE public.finances SET poste = 'Biosécurité'
WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid
  AND poste = 'Biosecurite';

COMMIT;
