-- ════════════════════════════════════════════════════════════════════════════
-- V36 — Politique UUIDs (PDF DS v2.0 page 23)
--
-- Date     : 2026-05-03
-- Spec     : 3 niveaux d'identifiants
--   1. id (UUID)        — usage interne uniquement, jamais affiché
--   2. short_code (text) — identifiant lisible humain (T-001, IVRM, etc.)
--   3. name (text)       — nom métier (Ivermectine, Bande mai 2026)
--
-- Portée :
--   - sows / boars / batches : déjà conformes (code_id = short_code)
--   - produits_veto / produits_aliments : il manque short_code stable.
--     `code_id` y existe mais sans contrainte UNIQUE et n'est pas peuplé
--     systématiquement. On ajoute donc `short_code` text dédié, peuplé via
--     slugify(libelle) en fallback, avec UNIQUE per farm.
--   - alerts_view : NON-APPLICABLE — l'alertEngine est 100% côté front
--     (src/services/alertEngine.ts). Il n'existe pas de table `alerts` en DB,
--     uniquement `alert_dismissals` (acquittements). La vue n'a donc aucun
--     subject à exposer ; cf. note de §3 du brief P2-SUPABASE.
--
-- Idempotence : ALTER TABLE ... ADD COLUMN IF NOT EXISTS, INDEX IF NOT EXISTS.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. produits_veto.short_code ────────────────────────────────────────────
ALTER TABLE public.produits_veto
  ADD COLUMN IF NOT EXISTS short_code text;

-- Backfill depuis libelle (slugify minimal : majuscules, alphanum + tirets,
-- collapse, trim, troncature à 24 chars). Utilise id pour désambiguïser.
UPDATE public.produits_veto p
SET short_code = sub.sc
FROM (
  SELECT
    id,
    -- slugify : upper → remplace non-alphanum par '-' → collapse '-' → trim
    NULLIF(
      LEFT(
        TRIM(BOTH '-' FROM
          regexp_replace(
            regexp_replace(UPPER(COALESCE(libelle, '')), '[^A-Z0-9]+', '-', 'g'),
            '-{2,}', '-', 'g'
          )
        ),
        24
      ),
      ''
    ) AS sc
  FROM public.produits_veto
) sub
WHERE p.id = sub.id
  AND p.short_code IS NULL
  AND sub.sc IS NOT NULL;

-- Fallback pour les libellés vides : V- + premiers chars de l'UUID
UPDATE public.produits_veto
SET short_code = 'V-' || LEFT(REPLACE(id::text, '-', ''), 8)
WHERE short_code IS NULL;

-- Unicité par ferme (deux fermes peuvent avoir le même short_code "IVRM")
CREATE UNIQUE INDEX IF NOT EXISTS produits_veto_short_code_farm_uniq
  ON public.produits_veto (farm_id, short_code);

-- ── 2. produits_aliments.short_code ────────────────────────────────────────
ALTER TABLE public.produits_aliments
  ADD COLUMN IF NOT EXISTS short_code text;

UPDATE public.produits_aliments p
SET short_code = sub.sc
FROM (
  SELECT
    id,
    NULLIF(
      LEFT(
        TRIM(BOTH '-' FROM
          regexp_replace(
            regexp_replace(UPPER(COALESCE(libelle, '')), '[^A-Z0-9]+', '-', 'g'),
            '-{2,}', '-', 'g'
          )
        ),
        24
      ),
      ''
    ) AS sc
  FROM public.produits_aliments
) sub
WHERE p.id = sub.id
  AND p.short_code IS NULL
  AND sub.sc IS NOT NULL;

UPDATE public.produits_aliments
SET short_code = 'A-' || LEFT(REPLACE(id::text, '-', ''), 8)
WHERE short_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS produits_aliments_short_code_farm_uniq
  ON public.produits_aliments (farm_id, short_code);

-- ── 3. alerts_view : NON-APPLICABLE ────────────────────────────────────────
-- L'alertEngine vit dans src/services/alertEngine.ts (côté front), il
-- consomme directement Truie/Verrat/BandePorcelets et émet FarmAlert in-memory.
-- Aucune table `alerts` n'existe ; rien à JOIN ici. Cette section reste
-- volontairement vide. Voir §3 du brief V36-D P2 pour la justification.
