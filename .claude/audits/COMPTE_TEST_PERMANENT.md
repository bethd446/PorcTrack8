# Compte Test PERMANENT — PorcTrack 8

**À conserver entre sessions. NE JAMAIS SUPPRIMER ce compte.**

## Credentials

| Champ | Valeur |
|---|---|
| URL | https://porctrack.tech |
| Email | `audit-final@porctrack.test` |
| Mot de passe | `AuditFinal2026!` |
| user_id | `0f2577f1-ba42-4895-b43f-d3d4acc29867` |
| Rôle | `ADMIN` |
| Nom ferme | `Ferme Audit Test` |
| Onboarding | Complété |

## Données seed (état stable)

| Entité | Count | Détail |
|---|---|---|
| Truies | 50 | T-001 à T-050 (30 Gestante / 10 Allaitante / 5 Vide / 5 Réforme) |
| Verrats | 3 | V-001, V-002, V-003 (Actifs) |
| Saillies | 31 | 30 sur truies gestantes (J-30 à J-114 random) + 1 proche MB sur T-001 (J-113) pour test R1 |
| Bandes | 3 | B-AUDIT-MB (Sous mère, 11 porcelets, loge M-01) + B-AUDIT-PS (Post-sevrage, 25 porcelets, loge PS-01) + B-AUDIT-CR (Croissance, 30 porcelets, loge C-01) |
| Porcelets | 11 | Tous dans B-AUDIT-MB (6F vert + 5M bleu, boucles BP01-BP06) |
| Loges | 13 | M-01/02/03, PS-01/02, C-01, E-01, F-01, G-01, V-01/02/03, INF-01 |

## Procédure de création (historique 2026-05-03)

```bash
# 1. SignUp via REST API (génère hash bcrypt natif GoTrue)
curl -X POST "https://jcritwravdwefwqwyjvk.supabase.co/auth/v1/signup" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"audit-final@porctrack.test","password":"AuditFinal2026!","data":{"full_name":"Auditeur","farm_name":"Ferme Audit Test"}}'

# 2. Confirm email + admin role + onboarded (SQL)
UPDATE auth.users SET email_confirmed_at = now() WHERE email='audit-final@porctrack.test';
UPDATE public.profiles SET role='ADMIN', full_name='Auditeur' WHERE id='<user_id>';
UPDATE public.troupeaux SET nom_ferme='Ferme Audit Test', onboarding_completed_at=now() WHERE user_id='<user_id>';

# 3. Seed 50T + 3V + 31 saillies + 3 bandes + 11 porcelets + 13 loges
# Voir /tmp/seed_audit_50_3.sql (à archiver dans seeds/ si besoin de re-seed)
```

## ⚠️ Anti-pattern à NE PAS reproduire

L'INSERT direct dans `auth.users` via SQL (sans passer par `/auth/v1/signup`) cause une erreur 500 "Database error querying schema" au login parce que :
1. Le format bcrypt `$2a$06$...` généré par PostgreSQL `crypt(pwd, gen_salt('bf'))` est ancien (rounds=6)
2. La row `auth.identities` n'est PAS auto-créée par INSERT — manque le binding email→user
3. `instance_id` doit être l'instance par défaut

**Toujours utiliser `/auth/v1/signup`** pour créer un user de test, puis SQL pour confirmer/ajuster role/onboarding.

## Réutilisation entre sessions

Au début d'une nouvelle session de dev/test :
1. **Vérifier que le compte existe** : `SELECT id FROM auth.users WHERE email='audit-final@porctrack.test'` → doit retourner 1 row
2. **Si manquant** : suivre la procédure ci-dessus pour le recréer
3. **Si données seed corrompues** : truncate tables `sows/boars/saillies/batches/porcelets_individuels/loges/...` filtrées par `farm_id` puis re-seed

## Tests E2E recommandés

À chaque changement majeur, relancer ce flow :
1. Login (porctrack.tech avec credentials ci-dessus)
2. Vérifier home propre (pas d'erreur console)
3. Vérifier alerte R1 (T-001 saillie J-113 → MB imminente)
4. Tap "Confirmer la mise bas" sur la row alerte → form QuickConfirmMiseBasForm
5. Naviguer vers B-AUDIT-MB → bouton "Daily Check du jour" + bouton "Sevrer"
6. Sevrer B-AUDIT-MB → vérifier transition phase Sous mère → Post-sevrage
7. Logout (sans supprimer le compte)
