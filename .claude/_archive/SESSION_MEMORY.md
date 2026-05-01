# SESSION_MEMORY.md - PorcTrack 8

## État actuel de l'infrastructure
- **Architecture :** Hébergement Hostinger Semi-managé / Nginx Reverse Proxy.
- **Domaines :**
    - `porctrack.tech` : Site vitrine SaaS (Vite/Build).
    - `app.porctrack.tech` : App métier Ionic/React.
- **Supabase :** Projet `jcritwravdwefwqwyjvk` (Projet K13).
- **SSL :** Actif (Lifetime SSL Hostinger).

## Dictionnaire des Tables & Sécurité
| Table | Rôle Métier | Règle RLS |
| :--- | :--- | :--- |
| `profiles` | Utilisateurs / Fermes | Ferme isolée (farm_id) |
| `sows` | Registre Truies | Ferme isolée (farm_id) |
| `boars` | Registre Verrats | Ferme isolée (farm_id) |
| `troupeaux` | Suivi Troupeaux | Ferme isolée (farm_id) |
| `bandes` | Organisation Production | Ferme isolée (farm_id) |
| `batches` | Lots / Portées | Ferme isolée (farm_id) |
| `feed_inventory` | Stocks Aliments | Public (anon) |
| `vet_inventory` | Stocks Vétérinaires | Public (anon) |
| `health_logs` | Journal Santé | Ferme isolée (farm_id) |
| `notes` | Observations Terrain | Ferme isolée (farm_id) |

## Status des données (Total: 183 entrées)
- profiles: 1
- sows: 19
- boars: 2
- troupeaux: 24
- bandes: 17
- batches: 11
- feed_inventory: 9
- vet_inventory: 85
- health_logs: 3
- notes: 12

## Workflow de test & Déploiement
1. **Build :** `cd PorcTrack8 && npm run build`
2. **Synchronisation :**
   ```bash
   rm -rf /var/www/porctrack.tech/source/dist/* && cp -r ./PorcTrack8/dist/* /var/www/porctrack.tech/source/dist/
   sudo systemctl restart nginx
   ```

## Plugins & Skills installés (2026-04-29)

| Plugin/Skill | Chemin | Rôle |
|---|---|---|
| **caveman** | `~/.claude/plugins/cache/caveman/` | Réduit output tokens ~75% (`/caveman`) |
| **hyperframes** | `~/.claude/skills/hyperframes/SKILL.md` | HTML/CSS/GSAP pro design (`/hyperframes`) |
| **frontend-design** | `~/.claude/plugins/cache/claude-plugins-official/` | Design frontend pro |
| **superpowers** | `~/.claude/plugins/cache/superpowers-marketplace/` | TDD, plans, debug skills |

**Browser Agent :** `mcp__Claude_Preview__*` outils disponibles pour preview HTML/CSS/GSAP en direct.
Usage : `preview_start(path)` → `preview_screenshot()` → itération → `preview_stop()`

## Déploiement Hostinger (solution htaccess)
- **Contrainte :** hPanel Hostinger ne permet pas de changer le dossier du sous-domaine `app.porctrack.tech`
- **Solution adoptée :** Vite base `/app/` + app déployée dans `public_html/app/` + `.htaccess` HTTP_HOST routing
- **porctrack.tech** → `public_html/index.html` (vitrine)
- **app.porctrack.tech** → `public_html/app/index.html` (SPA React)

## Google Play — Prêt pour publication
- `applicationId: com.porc800.porctrack`, `versionCode: 8`, `versionName: 8.2.0`
- Checklist : `google-play/CHECKLIST_GOOGLE_PLAY.md`
- Fiche Play Store : `google-play/store-listing/FICHE_PLAY_STORE.md`
- **Étapes manuelles restantes :** Keystore Android Studio → AAB signé → Console Play

## Prochaines étapes
1. **Google Play :** Créer keystore + générer AAB signé dans Android Studio
2. **Feature Graphic :** Créer bandeau 1024×500 (`#2d5a1b`) pour Play Store
3. **Screenshots :** 4-6 captures d'écran app pour Play Store
4. **Flux d'authentification :** Implémenter login testeur (sows, troupeaux, bandes)
