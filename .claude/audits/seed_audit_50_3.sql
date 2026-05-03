-- Seed compte audit-final : 50 truies + 3 verrats + saillies + bandes + loges
-- user_id : 0f2577f1-ba42-4895-b43f-d3d4acc29867

-- Loges
INSERT INTO public.loges (farm_id, numero, type, capacite_max, active) VALUES
  ('0f2577f1-ba42-4895-b43f-d3d4acc29867', 'M-01', 'MATERNITE', 12, true),
  ('0f2577f1-ba42-4895-b43f-d3d4acc29867', 'M-02', 'MATERNITE', 12, true),
  ('0f2577f1-ba42-4895-b43f-d3d4acc29867', 'M-03', 'MATERNITE', 12, true),
  ('0f2577f1-ba42-4895-b43f-d3d4acc29867', 'PS-01', 'POST_SEVRAGE', 30, true),
  ('0f2577f1-ba42-4895-b43f-d3d4acc29867', 'PS-02', 'POST_SEVRAGE', 30, true),
  ('0f2577f1-ba42-4895-b43f-d3d4acc29867', 'C-01', 'CROISSANCE', 50, true),
  ('0f2577f1-ba42-4895-b43f-d3d4acc29867', 'E-01', 'ENGRAISSEMENT', 60, true),
  ('0f2577f1-ba42-4895-b43f-d3d4acc29867', 'F-01', 'FINITION', 60, true),
  ('0f2577f1-ba42-4895-b43f-d3d4acc29867', 'G-01', 'GESTANTE', 25, true),
  ('0f2577f1-ba42-4895-b43f-d3d4acc29867', 'V-01', 'VERRAT', 1, true),
  ('0f2577f1-ba42-4895-b43f-d3d4acc29867', 'V-02', 'VERRAT', 1, true),
  ('0f2577f1-ba42-4895-b43f-d3d4acc29867', 'V-03', 'VERRAT', 1, true),
  ('0f2577f1-ba42-4895-b43f-d3d4acc29867', 'INF-01', 'INFIRMERIE', 10, true);

-- 50 truies (T-001 à T-050) avec statuts variés
DO $$
DECLARE
  i int;
  st text;
BEGIN
  FOR i IN 1..50 LOOP
    -- Variation statut : 30 gestantes, 10 allaitantes, 5 vides, 5 réforme
    st := CASE
      WHEN i <= 30 THEN 'Gestante'
      WHEN i <= 40 THEN 'Allaitante'
      WHEN i <= 45 THEN 'Vide'
      ELSE 'Réforme'
    END;
    INSERT INTO public.sows (farm_id, code_id, statut)
      VALUES ('0f2577f1-ba42-4895-b43f-d3d4acc29867',
              'T-' || lpad(i::text, 3, '0'),
              st);
  END LOOP;
END $$;

-- 3 verrats
INSERT INTO public.boars (farm_id, code_id, statut) VALUES
  ('0f2577f1-ba42-4895-b43f-d3d4acc29867', 'V-001', 'Actif'),
  ('0f2577f1-ba42-4895-b43f-d3d4acc29867', 'V-002', 'Actif'),
  ('0f2577f1-ba42-4895-b43f-d3d4acc29867', 'V-003', 'Actif');

-- Saillies : 30 pour les truies gestantes, dates étalées
DO $$
DECLARE
  truie_rec record;
  verrat_id uuid;
  age_days int;
BEGIN
  -- Récup des verrats
  SELECT id INTO verrat_id FROM public.boars
   WHERE farm_id='0f2577f1-ba42-4895-b43f-d3d4acc29867' LIMIT 1;
  
  FOR truie_rec IN
    SELECT id, code_id FROM public.sows
     WHERE farm_id='0f2577f1-ba42-4895-b43f-d3d4acc29867'
       AND statut='Gestante'
     ORDER BY code_id
  LOOP
    -- Distribue les saillies entre J-30 et J-114 pour avoir de la diversité
    age_days := 30 + (random() * 84)::int;
    INSERT INTO public.saillies (farm_id, sow_id, boar_id, date_saillie, statut)
      VALUES ('0f2577f1-ba42-4895-b43f-d3d4acc29867',
              truie_rec.id, verrat_id,
              CURRENT_DATE - age_days,
              'CONFIRMEE');
  END LOOP;
END $$;

-- 1 saillie proche MB pour test confirmation MB (truie T-001)
INSERT INTO public.saillies (farm_id, sow_id, boar_id, date_saillie, statut)
SELECT '0f2577f1-ba42-4895-b43f-d3d4acc29867', s.id,
       (SELECT id FROM public.boars WHERE farm_id='0f2577f1-ba42-4895-b43f-d3d4acc29867' LIMIT 1),
       CURRENT_DATE - 113, 'CONFIRMEE'
FROM public.sows s
WHERE s.farm_id='0f2577f1-ba42-4895-b43f-d3d4acc29867' AND s.code_id='T-001';

-- 3 bandes : 1 Sous mère (test sevrage) + 1 Post-sevrage + 1 Croissance
DO $$
DECLARE
  uid uuid := '0f2577f1-ba42-4895-b43f-d3d4acc29867';
  loge_m uuid; loge_ps uuid; loge_c uuid;
  sow_a uuid; sow_b uuid; verrat uuid;
  bande1 uuid := gen_random_uuid();
  bande2 uuid := gen_random_uuid();
  bande3 uuid := gen_random_uuid();
BEGIN
  SELECT id INTO loge_m FROM public.loges WHERE farm_id=uid AND numero='M-01';
  SELECT id INTO loge_ps FROM public.loges WHERE farm_id=uid AND numero='PS-01';
  SELECT id INTO loge_c FROM public.loges WHERE farm_id=uid AND numero='C-01';
  SELECT id INTO sow_a FROM public.sows WHERE farm_id=uid AND code_id='T-031'; -- Allaitante
  SELECT id INTO sow_b FROM public.sows WHERE farm_id=uid AND code_id='T-032';
  SELECT id INTO verrat FROM public.boars WHERE farm_id=uid LIMIT 1;
  
  -- Bande Sous mère (B-AUDIT-MB) — 11 porcelets, mise bas il y a 5 jours
  INSERT INTO public.batches (id, farm_id, code_id, phase, statut, sow_id, boar_id,
    date_saillie, date_mise_bas, porcelets_nes_total, porcelets_nes_vivants, nb_mort_nes,
    poids_portee_naissance_kg, poids_initial_kg, poids_moyen_kg, validation_status, loge_id)
  VALUES (bande1, uid, 'B-AUDIT-MB', 'Sous mère', 'En cours', sow_a, verrat,
    CURRENT_DATE - 120, CURRENT_DATE - 5, 12, 11, 1, 16.5, 1.5, 1.6, 'VALIDATED', loge_m);
  
  -- 11 porcelets dans bande1 (6F + 5M)
  INSERT INTO public.porcelets_individuels (farm_id, batch_id, boucle, sexe, poids_courant_kg, statut, couleur_boucle) VALUES
    (uid, bande1, 'BP01', 'F', 1.6, 'VIVANT', 'VERT'),
    (uid, bande1, 'BP02', 'F', 1.5, 'VIVANT', 'VERT'),
    (uid, bande1, 'BP03', 'F', 1.7, 'VIVANT', 'VERT'),
    (uid, bande1, 'BP04', 'F', 1.6, 'VIVANT', 'VERT'),
    (uid, bande1, 'BP05', 'F', 1.5, 'VIVANT', 'VERT'),
    (uid, bande1, 'BP06', 'F', 1.7, 'VIVANT', 'VERT'),
    (uid, bande1, 'BP01', 'M', 1.6, 'VIVANT', 'BLEU'),
    (uid, bande1, 'BP02', 'M', 1.5, 'VIVANT', 'BLEU'),
    (uid, bande1, 'BP03', 'M', 1.6, 'VIVANT', 'BLEU'),
    (uid, bande1, 'BP04', 'M', 1.7, 'VIVANT', 'BLEU'),
    (uid, bande1, 'BP05', 'M', 1.6, 'VIVANT', 'BLEU');
  
  -- Bande Post-sevrage (B-AUDIT-PS) — 25 porcelets, sevrage il y a 14 jours
  INSERT INTO public.batches (id, farm_id, code_id, phase, statut, sow_id, boar_id,
    date_saillie, date_mise_bas, date_sevrage, porcelets_nes_total, porcelets_nes_vivants,
    poids_initial_kg, poids_moyen_kg, validation_status, loge_id)
  VALUES (bande2, uid, 'B-AUDIT-PS', 'Post-sevrage', 'En cours', sow_b, verrat,
    CURRENT_DATE - 145, CURRENT_DATE - 30, CURRENT_DATE - 14, 25, 25,
    7.5, 12.5, 'VALIDATED', loge_ps);
  
  -- Bande Croissance (B-AUDIT-CR) — 30 porcelets en croissance
  INSERT INTO public.batches (id, farm_id, code_id, phase, statut,
    porcelets_nes_total, porcelets_nes_vivants, poids_initial_kg, poids_moyen_kg,
    validation_status, loge_id)
  VALUES (bande3, uid, 'B-AUDIT-CR', 'Croissance', 'En cours',
    30, 30, 25, 35, 'VALIDATED', loge_c);
END $$;

-- Vérifications
SELECT
  (SELECT count(*) FROM sows WHERE farm_id='0f2577f1-ba42-4895-b43f-d3d4acc29867') AS truies,
  (SELECT count(*) FROM boars WHERE farm_id='0f2577f1-ba42-4895-b43f-d3d4acc29867') AS verrats,
  (SELECT count(*) FROM saillies WHERE farm_id='0f2577f1-ba42-4895-b43f-d3d4acc29867') AS saillies,
  (SELECT count(*) FROM batches WHERE farm_id='0f2577f1-ba42-4895-b43f-d3d4acc29867') AS bandes,
  (SELECT count(*) FROM porcelets_individuels WHERE farm_id='0f2577f1-ba42-4895-b43f-d3d4acc29867') AS porcelets,
  (SELECT count(*) FROM loges WHERE farm_id='0f2577f1-ba42-4895-b43f-d3d4acc29867') AS loges;
