# Deployment PorcTrack via WhatsApp

> **Pour qui ?** Porchers en Côte d'Ivoire (ou tout terrain) avec 4G/3G
> intermittent et Android basique. Pas besoin de PlayStore, pas de compte
> Google requis.
>
> **Résumé** : on génère un APK local, on l'envoie sur WhatsApp, le porcher
> tape dessus → installation directe.

---

## Préambule — comment ça marche

PorcTrack est une application Android native (Capacitor) qui embarque une app
web Ionic React. On la distribue sous forme d'**APK** (fichier `.apk`), envoyé
directement au porcher via WhatsApp.

- L'APK est **signé debug** (suffisant pour pre-prod / circuit fermé).
- Taille cible : **< 30 MB** — confortable sur WhatsApp (limite 100 MB).
- L'app fonctionne **offline** : toute saisie est mise en file d'attente et
  syncée vers Google Sheets dès que le réseau revient.

---

## Étape 1 — Générer l'APK

Depuis la racine du repo, sur le poste du dev :

```bash
./scripts/build-release.sh
```

Ce script :

1. Nettoie `dist/` et les assets Android.
2. `npm run build` — construit le bundle Vite production.
3. `npx cap sync android` — copie les assets web dans le projet Android.
4. `./gradlew assembleRelease` si un keystore existe (`android/app/*.jks`),
   sinon `assembleDebug`.
5. Copie l'APK dans `releases/porctrack-<versionName>.apk`.

À la fin, le script affiche le chemin et la taille :

```
============================================================
  BUILD OK
  APK    : releases/porctrack-8.1.0.apk
  Taille : 7.4M (7719406 octets)
  Version : 8.1.0
============================================================
```

> **Note** : les `.apk` sont git-ignored (voir `.gitignore`). Ne jamais
> committer un binaire dans le repo.

---

## Étape 2 — Activer les sources inconnues sur le téléphone du porcher

Android bloque par défaut l'installation d'apps hors PlayStore. Il faut
autoriser l'installation depuis WhatsApp. Le chemin exact varie selon la
version d'Android.

### Android 8 et + (recommandé)

1. Ouvrir **Paramètres** (l'engrenage).
2. Chercher : **Applis** → **Accès spéciaux** → **Installer applis inconnues**
   (selon le téléphone : "Install unknown apps").
3. Sélectionner **WhatsApp** dans la liste.
4. Activer le bouton : **"Autoriser depuis cette source"**.

### Android 7 et avant (anciens téléphones)

1. **Paramètres** → **Sécurité**.
2. Cocher **"Sources inconnues"** (ou "Unknown sources").
3. Confirmer le message d'avertissement.

> **Sécurité** : on ne recommande d'autoriser que WhatsApp (pas "toutes
> sources"). Une fois l'app installée, on peut re-désactiver.

---

## Étape 3 — Envoyer l'APK via WhatsApp

Côté dev (depuis le Mac ou directement un téléphone) :

1. Ouvrir WhatsApp Web (ou l'app).
2. Cliquer sur le trombone (attacher) → **Document**.
3. Sélectionner `releases/porctrack-8.1.0.apk`.
4. Envoyer au porcher.

> Si l'APK dépasse **100 MB** (rare) : le compresser en `.zip` avec un mot
> de passe simple (`porc800`), ou passer par Google Drive / Telegram. Le
> build debug actuel fait ~7 MB.

---

## Étape 4 — Installer côté porcher

Côté porcher, dans WhatsApp :

1. Ouvrir la conversation avec le dev.
2. Taper sur le fichier **`porctrack-8.1.0.apk`**.
3. WhatsApp ouvre l'APK → un écran Android demande la permission.
4. Taper **"Installer"** (en bas à droite).
5. Attendre 10–20 secondes.
6. Taper **"Ouvrir"** quand le bouton apparaît, ou chercher l'icône
   **PorcTrack** sur l'écran d'accueil.

> Si l'installation est refusée : revenir à l'**Étape 2** et vérifier que
> WhatsApp a bien le droit d'installer des applis inconnues.

---

## Étape 5 — Premier lancement

Au premier lancement, l'app demande des permissions Android :

| Permission | Pourquoi |
|------------|----------|
| **Notifications** | Alertes GTTT (mise-bas J-3, sevrage J+21…) |
| **Stockage** | Cache offline des fiches truies/bandes |
| **Caméra** (optionnel) | Photos terrain sur les fiches |

**Accepter Notifications** : c'est critique. Sans ça, le porcher ne reçoit
pas les rappels biologiques.

---

## Étape 6 — Onboarding (4 slides)

Au premier lancement, PorcTrack affiche 4 écrans :

1. **Welcome** — "Bienvenue sur PorcTrack 8".
2. **Rôle** — choisir **PORCHER** (terrain) ou **ADMIN** (gestion). Pour
   l'usage terrain CI, sélectionner **PORCHER**.
3. **Ferme** — ferme **A130 / secteur Nord** (par défaut).
4. **Terminer** — "Prêt pour le terrain".

Une fois l'onboarding terminé, l'app affiche le **Cockpit** (tableau de bord)
avec les alertes du jour.

---

## Annexe — Flows clés

Les 5 actions les plus fréquentes du porcher.

### Ajouter une truie

1. Menu bas → **Cheptel**.
2. Bouton flottant **+** (en bas à droite).
3. Remplir :
   - **Boucle** (obligatoire) — ex. `TR-042`.
   - Nom, race, poids (optionnels).
   - Stade (Gestation / Lactation / Vide).
4. **Enregistrer** — la truie rejoint la file d'attente offline et
   apparaît dans Sheets dès la prochaine sync.

### Modifier une truie (nom, boucle, poids, ration)

1. **Cheptel** → taper sur la ligne truie.
2. Bouton **"Modifier"** (crayon).
3. Changer n'importe quel champ : nom, boucle, race, poids, stade, statut,
   ration, nb portées, dernière NV, date MB prévue, notes.
4. **Enregistrer** — seuls les champs modifiés sont envoyés à Sheets
   (diff patch).

### Déclarer une mortalité

1. **Cheptel** → truie concernée → **Modifier**.
2. Changer **Statut** → **"Morte"**.
3. Ajouter dans **Notes** : cause + date (ex. `mort 19/04/2026, respiratoire`).
4. **Enregistrer**.
5. Si c'est une portée qui a des morts partiels : aller dans **Bandes**,
   ouvrir la portée, saisir **Nb morts** → **Enregistrer**.

### Réapprovisionner un stock

1. Menu bas → **Stock**.
2. Taper sur l'article en rupture ou bas.
3. Bouton **"Réapprovisionner"**.
4. Saisir **Quantité reçue** + date.
5. **Enregistrer** — le stock remonte, l'alerte R5 disparaît.

### Sevrer une portée

1. Menu bas → **Bandes** (ou depuis l'alerte R2 "Sevrage J+21" dans le
   Cockpit).
2. Ouvrir la portée à sevrer.
3. Bouton **"Sevrer"**.
4. Saisir **Nb sevrés** + date sevrage.
5. **Enregistrer** — la truie mère passe automatiquement en statut
   **Vide**, la portée est marquée sevrée, l'alerte R3 "Retour chaleur
   J+5" se programme.

---

## Checklist pré-envoi

À cocher avant d'envoyer l'APK au porcher.

- [ ] Tests unitaires verts (`npm run test:unit`)
- [ ] Zéro erreur TypeScript (`npx tsc --noEmit`)
- [ ] Zéro warning lint (`npm run lint`)
- [ ] Build APK OK (`./scripts/build-release.sh`)
- [ ] Taille APK < 30 MB (idéal < 10 MB pour 4G/3G lent)
- [ ] Testé sur émulateur Android récent (API 33+)
- [ ] Données Sheets cohérentes : 17 truies, 2 verrats, 14 portées
- [ ] URL GAS configurée dans `.env.local` (`VITE_GAS_URL=...`)
- [ ] Version bumpée dans `android/app/build.gradle`
      (`versionCode` + `versionName`)
- [ ] APK ajouté au dossier `releases/` (et **pas** committé)

---

## Dépannage rapide

| Symptôme | Cause probable | Fix |
|----------|----------------|-----|
| WhatsApp refuse d'ouvrir l'APK | Sources inconnues non autorisées | Étape 2 |
| "App non installée" | Version déjà installée avec signature différente | Désinstaller l'ancienne version d'abord |
| App plante au démarrage | Cache Vite corrompu au build | `rm -rf node_modules/.vite dist && ./scripts/build-release.sh` |
| Pas d'alertes qui arrivent | Permission Notifications refusée | Paramètres → Apps → PorcTrack → Autorisations → Notifications |
| Sync Sheets ne passe pas | `VITE_GAS_URL` manquante au build | Vérifier `.env.local` AVANT de lancer le script, rebuild |
| APK > 30 MB | Bundle pas minifié | Activer `minifyEnabled true` dans `android/app/build.gradle` → `buildTypes.release` + keystore |

---

## Optimisations tailles APK (si > 30 MB)

Pour le jour où l'APK devient trop lourd :

1. **Minify Vite** : déjà activé par défaut en production.
2. **Tree-shaking Lucide** : importer les icônes une par une
   (`import { Edit3 } from 'lucide-react'`), jamais `import * as Icons`.
3. **Images** : convertir PNG → WebP (gain 40–60%).
4. **Fonts** : sous-setter BigShoulders + InstrumentSans à `latin` uniquement
   (pas `latin-ext`).
5. **R8/Proguard** : passer `minifyEnabled true` + fournir un keystore
   (`scripts/build-release.sh` basculera automatiquement sur
   `assembleRelease`).
6. **Split ABI** : générer un APK par architecture (`armeabi-v7a`,
   `arm64-v8a`) — divise par ~2 la taille côté user.

---

_PorcTrack 8 · GTTT terrain · FR / CI_
