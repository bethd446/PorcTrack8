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

## Prochaines étapes
1. **Validation de stabilité :** Tester l'App Ionic en conditions réelles (après rafraîchissement cache).
2. **Flux d'authentification :** Implémenter le login testeur pour débloquer l'accès aux données privées (sows, troupeaux, bandes).
