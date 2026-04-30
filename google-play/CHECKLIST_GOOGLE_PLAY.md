# Checklist Publication Google Play — PorcTrack 8

## ✅ DÉJÀ PRÊT (fait automatiquement)

- [x] Package ID : `com.porc800.porctrack`
- [x] versionCode : 8 / versionName : 8.2.0
- [x] Palette Forêt & Maïs appliquée (StatusBar, Splash : `#2d5a1b`)
- [x] capacitor.config.ts — server.url pointé sur app.porctrack.tech/app/
- [x] manifest.json — icônes réelles, couleurs correctes, start_url `/app/`
- [x] minSdk 22 (Android 5.1+), targetSdk 34

---

## 🔑 ÉTAPE 1 — Créer une Keystore de signature (à faire UNE SEULE FOIS)

> ⚠️ Garde ce fichier précieusement — perdu = impossible de mettre à jour l'app

Dans Android Studio :
1. **Build** → **Generate Signed Bundle / APK**
2. Choisir **Android App Bundle (AAB)** ← format requis par Google Play
3. **Create new...** → remplis :
   - Key store path : `~/PorcTrack8-keystore.jks`
   - Password : (invente un mot de passe fort, note-le)
   - Alias : `porctrack`
   - Validity : 25 ans
   - First name : ton prénom
   - Organization : PorcTrack
   - Country : FR
4. Générer → sélectionner **release**
5. Le fichier `.aab` généré est dans `android/app/release/`

---

## 📱 ÉTAPE 2 — Assets visuels requis par Google Play

### Icône haute résolution (OBLIGATOIRE)
- Format : PNG 512×512 px, fond non transparent
- Fichier actuel à utiliser : `/public/images/icon-512.png`
- ⚠️ Si l'icône actuelle a un fond transparent → tu dois créer une version
  avec fond vert forêt `#2d5a1b`

### Feature Graphic (OBLIGATOIRE)
- Format : JPG ou PNG, **1024×500 px**
- S'affiche en tête de la fiche Play Store
- À créer : bandeau avec logo PorcTrack + texte "Gestion Technique de Troupeau Porcin"
  sur fond `#2d5a1b` (vert forêt)

### Captures d'écran (OBLIGATOIRE — min 2, max 8)
- Format : JPG ou PNG
- Taille : entre 320px et 3840px, ratio max 2:1
- Prendre sur un vrai téléphone Android OU émulateur Android Studio :
  1. Cockpit / Dashboard principal
  2. Vue Troupeau (liste truies)
  3. Alertes biologiques
  4. Chatbot IA (bouton ambre + panneau ouvert)
  5. Journal Santé
  6. Stocks / Ressources

### Vidéo promo (OPTIONNEL mais recommandé)
- YouTube URL uniquement
- 30 secondes de démonstration terrain

---

## 🏪 ÉTAPE 3 — Créer la fiche sur Google Play Console

1. Aller sur : https://play.google.com/console
2. **Créer une application** → Français → Application → Gratuite
3. Remplir avec le contenu du fichier `store-listing/FICHE_PLAY_STORE.md`

### Sections à compléter dans la Console :
- [ ] **Informations sur l'application** (titre, description, catégorie)
- [ ] **Graphismes** (icône 512, feature graphic, captures)
- [ ] **Classification du contenu** → questionnaire → répondre à tout (app agri pro)
- [ ] **Public cible** → Adultes (18+) recommandé pour usage professionnel
- [ ] **Politique de confidentialité** → URL : `https://porctrack.tech/#privacy`
- [ ] **Coordonnées** → openformac@gmail.com

---

## 📦 ÉTAPE 4 — Uploader le AAB

1. Dans la Console → **Production** → **Créer une nouvelle version**
2. Uploader le fichier `.aab` généré à l'étape 1
3. Notes de version :
```
Version 8.2.0 — Lancement initial
• Suivi complet du troupeau (truies, verrats, bandes)
• 14 alertes biologiques GTTT automatiques
• Mode hors-ligne total avec synchronisation
• Assistant IA Gemini (texte + analyse photo)
• Palette Forêt & Maïs — design terrain optimisé
```

---

## 🔒 ÉTAPE 5 — Politique de confidentialité (OBLIGATOIRE)

Google exige une URL de politique de confidentialité publique.
Tu dois créer une page sur `porctrack.tech/#privacy` (ou un sous-domaine).

Contenu minimum requis :
- Quelles données sont collectées (email, données d'élevage)
- Où elles sont stockées (Supabase, eu-west-3, France)
- Comment les supprimer (email support)
- Pas de partage avec des tiers

---

## ⏱ DÉLAIS

| Étape | Délai Google |
|---|---|
| Examen initial première app | 3 à 7 jours ouvrés |
| Mises à jour suivantes | 1 à 3 jours |
| Réponse si rejet | Immédiate (email) |

---

## 📞 Support

- **Google Play Console** : https://play.google.com/console
- **Documentation officielle** : https://support.google.com/googleplay/android-developer
- **Email dev** : openformac@gmail.com
