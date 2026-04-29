# /shared — Types TypeScript partagés

Ce dossier contient les types TypeScript qui sont utilisés à la fois
par **`/app`** (application Ionic/React) et **`/website`** (site vitrine Vite).

## Utilisation

### Dans /app (TypeScript strict)
```ts
import type { Truie, BandeStatut, GTTT_CONSTANTS } from '../shared/types';
```

### Dans /website (si TS activé)
```ts
import type { UserProfile, AdminLog } from '../shared/types';
```

## Contenu

| Export | Description |
|--------|-------------|
| `UserRole` | `'ADMIN' \| 'OWNER' \| 'PORCHER'` |
| `UserProfile` | Profil Supabase (table `profiles`) |
| `AdminLog` | Entrée de log admin (table `admin_logs`) |
| `Truie` / `TruieStatut` | Entité truie + statuts |
| `Bande` / `BandeStatut` | Entité bande + statuts |
| `BiologicalAlert` / `AlertType` | Alertes GTTT |
| `GTTT_CONSTANTS` | Constantes biologiques (115j gestation, 28j sevrage…) |
| `SupabaseConfig` | Config partagée Supabase |

## Règle de gestion

Tout type qui existe **dans les deux projets** doit être défini ici,
pas dupliqué dans `/app/src/types` et `/website/src/types`.
