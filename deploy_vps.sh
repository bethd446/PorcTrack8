#!/bin/bash
# ══════════════════════════════════════════════════════════════
# PorcTrack 8 — Script de déploiement VPS
# USAGE : bash deploy_vps.sh
# Remplir les 3 variables ci-dessous avant de lancer.
# ══════════════════════════════════════════════════════════════
set -e

# ── SECRETS À REMPLIR ─────────────────────────────────────────
GAS_URL="REMPLACER_PAR_URL_GAS"
GAS_TOKEN="REMPLACER_PAR_TOKEN_GAS"
STORE_PASS="REMPLACER_PAR_MOT_DE_PASSE_KEYSTORE"
KEYSTORE_B64="REMPLACER_PAR_CONTENU_KEY_B64_TXT"
# ─────────────────────────────────────────────────────────────

echo "▶ [1/8] Mise à jour système + dépendances..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq openjdk-17-jdk unzip curl git

echo "▶ [2/8] Installation Node.js 20..."
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
  apt-get install -y -qq nodejs
fi
echo "   Node $(node -v) / npm $(npm -v)"

echo "▶ [3/8] Clone / pull du repo..."
cd /root
if [ -d "PorcTrack8/.git" ]; then
  cd PorcTrack8 && git pull --quiet
else
  git clone --quiet https://github.com/bethd446/PorcTrack8.git
  cd PorcTrack8
fi

echo "▶ [4/8] Création .env.local..."
cat > .env.local << EOF
VITE_GAS_URL="${GAS_URL}"
VITE_GAS_TOKEN="${GAS_TOKEN}"
EOF

echo "▶ [5/8] Création keystore.properties..."
cat > android/keystore.properties << EOF
storePassword=${STORE_PASS}
keyPassword=${STORE_PASS}
keyAlias=porctrack
storeFile=porctrack-release.jks
EOF

echo "▶ [6/8] Restauration du keystore (.jks)..."
echo "${KEYSTORE_B64}" | base64 -d > android/porctrack-release.jks
echo "   Taille : $(wc -c < android/porctrack-release.jks) octets"

echo "▶ [7/8] Build web + sync Capacitor..."
npm ci --silent
npm run build --silent
npx cap sync android --inline 2>&1 | tail -3

echo "▶ [8/8] Build APK release Gradle..."
cd android
chmod +x gradlew
./gradlew assembleRelease --quiet

echo ""
echo "══════════════════════════════════════════════"
echo "✅  BUILD TERMINÉ"
find /root/PorcTrack8/android -name "*.apk" -path "*/release/*" 2>/dev/null
echo "══════════════════════════════════════════════"
