#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# PorcTrack Website — Script de déploiement VPS
# Usage : npm run deploy  (ou : bash scripts/deploy.sh)
# Prérequis : SSH key configurée, VPS accessible
# ═══════════════════════════════════════════════════════════════
set -e

# ── Config (surcharger via .env ou variables d'env) ──────────
DEPLOY_HOST="${DEPLOY_HOST:-YOUR_VPS_IP}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PATH="${DEPLOY_PATH:-/usr/share/nginx/html/website}"
DEPLOY_KEY="${DEPLOY_KEY:-$HOME/.ssh/id_rsa}"
LOCAL_DIST="$(cd "$(dirname "$0")/.." && pwd)/dist"

# ── Couleurs ─────────────────────────────────────────────────
GREEN='\033[0;32m'; AMBER='\033[0;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${AMBER}⚠${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1"; exit 1; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PorcTrack Website — Déploiement VPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Vérifications ─────────────────────────────────────────
[ "$DEPLOY_HOST" = "YOUR_VPS_IP" ] && err "Configure DEPLOY_HOST (ex: export DEPLOY_HOST=187.127.225.24)"
[ -d "$LOCAL_DIST" ] || err "Le dossier dist/ n'existe pas. Lance d'abord : npm run build"
ok "Dist trouvé : $LOCAL_DIST"

# ── 2. Création du dossier distant ───────────────────────────
echo ""
warn "Connexion à $DEPLOY_USER@$DEPLOY_HOST..."
ssh -i "$DEPLOY_KEY" -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_HOST" \
  "mkdir -p $DEPLOY_PATH"
ok "Dossier distant prêt : $DEPLOY_PATH"

# ── 3. Transfert des fichiers (rsync) ────────────────────────
echo ""
warn "Transfert des fichiers..."
rsync -avz --delete \
  -e "ssh -i $DEPLOY_KEY -o StrictHostKeyChecking=no" \
  "$LOCAL_DIST/" \
  "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/"
ok "Fichiers transférés"

# ── 4. Rechargement nginx ────────────────────────────────────
echo ""
warn "Rechargement nginx..."
ssh -i "$DEPLOY_KEY" -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_HOST" \
  "nginx -t && systemctl reload nginx"
ok "Nginx rechargé"

# ── 5. Done ──────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}✓ Déploiement terminé !${NC}"
echo "  → https://porctrack.tech"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
