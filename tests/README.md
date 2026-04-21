# PorcTrack — Tests E2E

## Installation (une seule fois)

```bash
cd ~/PorcTrack8
npm install -D @playwright/test
npx playwright install chromium
```

## Lancer les tests

```bash
# Tous les tests
npm run test

# Tests de navigation uniquement (headers, bouton retour, titres)
npm run test:nav

# Tests cheptel (liste, filtre, fiche animal)
npm run test:cheptel

# Tests formulaires (QuickNote, QuickHealth, Checklist)
npm run test:forms

# Tests synchronisation Google Sheets
npm run test:sheets

# Mode interactif avec interface graphique
npm run test:ui

# Voir le rapport HTML des derniers tests
npm run test:report
```

## Ce que chaque suite teste

### `navigation.spec.ts`
- Tous les onglets nav (HOME, CHEPTEL, BANDES, ALERTES, PLUS) chargent sans crash
- Chaque header a un titre en français cohérent
- Le bouton retour fonctionne sur chaque page
- Aucun titre anglais ou générique ("Module d'Exploration")

### `cheptel.spec.ts`
- Liste des truies/verrats s'affiche
- Switcher Truies/Verrats fonctionne
- Barre de recherche filtre
- Clic sur une truie ouvre la fiche
- Badges de statut visibles

### `sheets-sync.spec.ts`
- Des requêtes GAS sont lancées au démarrage
- L'indicateur LIVE/CACHE/OFFLINE est présent
- Les KPIs n'affichent pas NaN
- L'app fonctionne en mode offline (cache)

### `forms.spec.ts`
- QuickNote : formulaire saisissable, bouton actif
- QuickHealth : champ Soin saisissable
- Checklist quotidienne : affiche une question

## Espresso / UIAutomator (Android natif)

Pour les tests sur APK réel, suivre la documentation officielle :
https://developer.android.com/training/testing/espresso

```bash
# Depuis Android Studio
./gradlew connectedAndroidTest

# Ou via Firebase Test Lab
gcloud firebase test android run \
  --type instrumentation \
  --app app/build/outputs/apk/debug/app-debug.apk \
  --test app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk \
  --device model=Pixel3,version=30
```
