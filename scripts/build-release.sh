#!/bin/bash
# ============================================================================
# PorcTrack 8 — Build APK release pour distribution WhatsApp
# ----------------------------------------------------------------------------
# Usage :   ./scripts/build-release.sh
# Sortie :  releases/porctrack-<versionName>.apk
#
# Si un keystore existe dans android/app/*.jks ou *.keystore → assembleRelease
# Sinon → assembleDebug (APK debug-signed, OK pour pre-prod / WhatsApp)
# ============================================================================

set -euo pipefail

# ---- Repo root (absolu, peu importe d'où on lance le script) ---------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

# ---- Lire versionName depuis android/app/build.gradle ----------------------
VERSION_NAME="$(grep -E '^\s*versionName\s+' android/app/build.gradle \
    | head -n1 \
    | sed -E 's/.*versionName[[:space:]]+"([^"]+)".*/\1/')"

if [[ -z "${VERSION_NAME}" ]]; then
  echo "ERREUR: impossible de lire versionName dans android/app/build.gradle" >&2
  exit 1
fi

echo "==> PorcTrack build release, versionName=${VERSION_NAME}"

# ---- Détecter keystore release (optionnel) ---------------------------------
KEYSTORE_FOUND=""
for candidate in android/app/*.jks android/app/*.keystore; do
  if [[ -f "${candidate}" ]]; then
    KEYSTORE_FOUND="${candidate}"
    break
  fi
done

# ---- 1. Clean ---------------------------------------------------------------
echo "==> [1/4] Clean dist + assets Android"
rm -rf dist android/app/src/main/assets/public

# ---- 2. Build Vite ----------------------------------------------------------
echo "==> [2/4] npm run build (Vite production)"
npm run build

# ---- 3. Capacitor sync ------------------------------------------------------
echo "==> [3/4] npx cap sync android"
npx cap sync android

# ---- 4. Gradle assemble -----------------------------------------------------
mkdir -p releases

if [[ -n "${KEYSTORE_FOUND}" ]]; then
  echo "==> [4/4] Gradle assembleRelease (keystore: ${KEYSTORE_FOUND})"
  ( cd android && ./gradlew assembleRelease )
  APK_SRC="android/app/build/outputs/apk/release/app-release.apk"
else
  echo "==> [4/4] Gradle assembleDebug (pas de keystore → debug-signed)"
  ( cd android && ./gradlew assembleDebug )
  APK_SRC="android/app/build/outputs/apk/debug/app-debug.apk"
fi

if [[ ! -f "${APK_SRC}" ]]; then
  echo "ERREUR: APK introuvable à ${APK_SRC}" >&2
  exit 1
fi

# ---- Copie finale -----------------------------------------------------------
APK_DEST="releases/porctrack-${VERSION_NAME}.apk"
cp "${APK_SRC}" "${APK_DEST}"

APK_SIZE_HUMAN="$(du -h "${APK_DEST}" | awk '{print $1}')"
APK_SIZE_BYTES="$(wc -c < "${APK_DEST}" | tr -d ' ')"

echo ""
echo "============================================================"
echo "  BUILD OK"
echo "  APK  : ${APK_DEST}"
echo "  Taille : ${APK_SIZE_HUMAN} (${APK_SIZE_BYTES} octets)"
echo "  Version : ${VERSION_NAME}"
echo "============================================================"
