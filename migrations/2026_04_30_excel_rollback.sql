-- ============================================================
-- PorcTrack 8 — ROLLBACK Import Excel 2026-04-30
-- Cible farm_id: bc96ddbd-c34d-46b1-b624-4a3dca181a2c
-- Supprime UNIQUEMENT les lignes scopées à ce farm_id et
-- aux code_id/codes spécifiques importés.
-- ============================================================
BEGIN;

-- saillies
DELETE FROM public.saillies WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid;

-- batches inserted via PORCELETS_BANDES (code_id LIKE '26-%')
DELETE FROM public.batches WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id IN ('26-T7-01', '26-T11-01', '26-T1-01', '26-T3-01', '26-T2-01', '26-T15-01', '26-T9-01', '26-T16-01', '26-T6-01', '26-T13-01', '26-T10-01', '26-T14-02', '26-T19-01', '26-T18-01');

-- NOTE: MATERNITE/POST_SEVRAGE updates set loge/date_sevrage_prevue/phase/aliment_actuel
-- on the batches inserted above; deleting those batches removes those updates.

-- health_logs
DELETE FROM public.health_logs WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id IN ('SANTE-2026-04-07-03', 'SANTE-2026-04-12-04');

-- notes (only those imported, matched by content)
DELETE FROM public.notes WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND content IN ('Saillie T7 + T8 + T11 + T14 + T15 avec verrats [Animaux: T7,T8,T11,T14,T15]', 'Sevrage en retard bande 2 — J29-J33 sous mère [Animaux: Bande 2]', 'Stocks Starter/Croissance/Finition à 0 — RUPTURE [Animaux: Tous]', 'T6: 2 mortalités porcelets enregistrées 17/03 [Animaux: T6]', 'Porcher | HEBDO | Sem 6-12 avr: 3 truies gest (bruyantes) + 3 lactation. NV total: 9-10. Morts-nés: 6. Mortalité post-natal: ~10 porcelets. Actions: nettoyage loges, suivi renforcé.', 'Porcher | MATERNITE | Suivi maternité 9 loges: boucles 29,24,26,30-32,57 entrées 17-30 mars. MB entre 20 mars et 6 avril. Portées 6-13 pcel. Sevrage prévu ~10 avril 2026.', 'Porcher | QUOTIDIEN | Suivi quotidien sem 6-12 avr: eau + alimentation distribués chaque jour. Aucune naissance. Quelques animaux malades début semaine (maîtrisé). Mortalité totale semaine: ~10 porcelets.', 'Alertes GTTT | OK | Action terrain validée par USER (Global)', '2026-04-17 00:00:00 | 21:56:33 | Porcher A130 | CONTROLE_QUOTIDIEN | Gestantes imminentes : mise bas confirmée ? | Oui | APP | DEV-C9X1C9FMH', 'Pesée 6 porcelets · 10kg moy · J+59 [Animaux: Anonyme]');

-- produits_veto
DELETE FROM public.produits_veto WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id IN ('SANTE-20260414-0001', 'SANTE-20260414-0002', 'SANTE-20260414-0003', 'SANTE-20260414-0004', 'SANTE-20260414-0005', 'SANTE-20260414-0006', 'SANTE-20260414-0007');

-- produits_aliments
DELETE FROM public.produits_aliments WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id IN ('ALIM-MAIS', 'ALIM-TRUIE-GEST', 'ALIM-TRUIE-LACT', 'ALIM-PORCELET', 'ALIM-ENGR', 'ALIM-KPC', 'ALIM-SOJA', 'ALIM-SON', 'ALIM-COQ');

-- feed_inventory
DELETE FROM public.feed_inventory WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id IN ('FEEDMV-1776003314174');

-- finances
DELETE FROM public.finances WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND poste IN ('Alimentation', 'Main-d oeuvre', 'Eau + Electricite', 'Veterinaire', 'Biosecurite', 'Transport + Divers', 'Cout/truie productive/mois', 'Cout/porcelet sevre', 'Cout/porc engraisse', 'Cout/kg poids vif', 'Prix vente moyen', 'Marge/kg', 'Seuil rentabilite');

-- sows (after batches/saillies deleted to avoid FK cascade surprises)
DELETE FROM public.sows WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id IN ('T01', 'T02', 'T03', 'T06', 'T09', 'T11', 'T14', 'T15', 'T16', 'T10', 'T13', 'T18', 'T19', 'T04', 'T05', 'T07', 'T12');

-- boars
DELETE FROM public.boars WHERE farm_id = 'bc96ddbd-c34d-46b1-b624-4a3dca181a2c'::uuid AND code_id IN ('V01', 'V02');

COMMIT;
-- END ROLLBACK