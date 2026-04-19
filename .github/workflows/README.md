# GitHub Actions — CI

Le workflow `ci.yml` valide chaque Pull Request ciblant `main` et chaque push sur `main`.

Il tourne sur `ubuntu-latest` avec Node 20 et le cache npm actif (clé basée sur `package-lock.json`). Étapes : `npm ci`, `npm run lint` (tsc --noEmit), `npm run test:unit` (vitest), puis `npm run build` (Vite). Les variables `VITE_GAS_URL` / `VITE_GAS_TOKEN` sont mockées avec des valeurs factices pour que le build passe sans secret.

Les tests Playwright (`npm test`) sont volontairement exclus du CI (budget séparé). L'artifact `dist/` est publié uniquement sur push `main` (rétention 7 jours). Un `concurrency` group annule les runs obsolètes sur une même ref.
