-- =============================================================================
-- Backfill auth.identities pour audit-senior@porctrack.test
-- Date : 2026-05-17 18:30 UTC
--
-- Contexte : le compte audit a été créé par SQL direct via INSERT INTO
-- auth.users (cf. f475872). Cette méthode contourne le flow signup standard
-- GoTrue et NE CRÉE PAS la ligne correspondante dans auth.identities (que
-- le trigger handle_new_user n'alimente pas non plus). Résultat : signInWithPassword
-- échoue en HTTP 500 (error "Database error querying schema") car GoTrue
-- charge identities WHERE user_id=? AND provider='email' pour construire
-- le JWT — et ne trouve rien.
--
-- Diagnostic par Claude PC sur Phase 1 audit Chantier A.
--
-- Fix : INSERT identity 'email' manquante avec le pattern Supabase canonique :
-- - provider_id = user_id::text
-- - provider = 'email'
-- - identity_data = jsonb { sub, email, email_verified, phone_verified }
--
-- LEÇON pour création future de comptes test/audit : utiliser
-- l'admin API GoTrue (supabase.auth.admin.createUser) OU
-- POST /auth/v1/admin/users avec service_role key. Ces 2 méthodes créent
-- automatiquement auth.users + auth.identities + déclenchent handle_new_user.
-- L'INSERT SQL direct est à proscrire pour les comptes de prod.
-- =============================================================================

DO $$
DECLARE
  v_user_id uuid := '9546896d-2c9d-481f-9468-a0325a36b4e5';
  v_email text;
  v_existing_count int;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'User % introuvable dans auth.users', v_user_id;
  END IF;

  SELECT count(*) INTO v_existing_count
  FROM auth.identities
  WHERE user_id = v_user_id AND provider = 'email';

  IF v_existing_count > 0 THEN
    RAISE NOTICE 'Identity email déjà présente pour % (count=%) — skip', v_user_id, v_existing_count;
  ELSE
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_user_id::text,
      v_user_id,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      null,
      now(),
      now()
    );
    RAISE NOTICE 'Identity email créée pour user_id %', v_user_id;
  END IF;
END $$;

-- =============================================================================
-- ROLLBACK :
--   DELETE FROM auth.identities
--    WHERE user_id = '9546896d-2c9d-481f-9468-a0325a36b4e5'
--      AND provider = 'email';
-- =============================================================================
