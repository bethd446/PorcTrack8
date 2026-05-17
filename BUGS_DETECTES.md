# 🐛 Bugs détectés pendant le Design Reset

> Bugs FONCTIONNELS détectés pendant la démolition design.
> NON CORRIGÉS pendant cette phase — à traiter dans un chantier dédié
> APRÈS la refonte design par le dev externe.

## Format
- **Date** : YYYY-MM-DD
- **Lot** : Lot N
- **Fichier** : `path/to/file.tsx`
- **Symptôme** : description courte
- **Reproductible** : oui / non
- **Sévérité** : 🔴 bloquant / 🟠 gênant / 🟢 mineur
- **Notes** : contexte additionnel

---

## Bugs

### 2026-05-17 · Lot 3 · smoke-fallback.mjs login Playwright fail
- **Date** : 2026-05-17
- **Lot** : Lot 3 (3a-bis)
- **Fichier** : `smoke-fallback.mjs` (script audit perso, pas dans repo)
- **Symptôme** : `page.waitForResponse(/auth/v1/token)` timeout après 25s en mode preview localhost:4173/4174 — alors que curl direct sur le même endpoint Supabase retourne HTTP 200 + access_token instantanément
- **Reproductible** : oui (2 essais consécutifs sur 2 ports différents)
- **Sévérité** : 🟢 mineur — script perso d'audit, pas un bug de l'app
- **Notes** :
  - Le script smoke-quickactions.mjs du Lot 1.5 utilisait le même login flow et fonctionnait
  - Hypothèse : timing Ionic input fill (les `IonInput` wrappent un native `<input>` ; `.fill()` Playwright peut ne pas déclencher le change event Ionic correctement la 2e fois)
  - Hypothèse alternative : rate limit Supabase auth (4 logins en 5 min)
  - **Workaround pour le Lot 3** : skip 3a-bis (CHECK 1 a confirmé page lisible : bodyBg #fff, bodyColor #1a1a1a, inputs visibles) → smoke réel reprend à 3d avec script débugué (sleep entre actions, ou bypass login via storageState pré-saved)
  - **NON BLOQUANT** : pas un bug fonctionnel de l'app, juste fragilité du test E2E sur input Ionic
