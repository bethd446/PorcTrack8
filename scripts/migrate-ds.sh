#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# migrate-ds.sh — V38-A FINAL · PorcTrack 8
# ═══════════════════════════════════════════════════════════════════════════
# Find/replace mécanique des hex hardcodés vers les tokens --pt-* du DS.
# Préserve les fallbacks `var(--token, #hex)` pour rétrocompat.
#
# IMPORTANT — exclut :
#   - src/design-system/         (vide actuellement, réservé futur)
#   - src/styles/design-system-v29.css  (DÉFINITIONS de tokens, source unique)
#   - src/styles/theme-tokens.css       (idem, mode jour/nuit)
#   - src/styles/agritech-tokens.css    (idem, @theme Tailwind)
#   - src/styles/terrain-vivant-v6.css  (palette client v6, source)
#   - src/styles/terra-v2-tokens.css    (typo + radii)
#   - src/styles/theme-v2-tokens.css    (radii + accents par onglet)
#   - src/index.css                     (définitions @theme Tailwind v4)
#
# Usage : bash scripts/migrate-ds.sh [--dry-run]
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

DRY=0
if [[ "${1:-}" == "--dry-run" ]]; then DRY=1; fi

cd "$(dirname "$0")/.."

EXCLUDE_DIRS=(
  "src/design-system"
)
EXCLUDE_FILES=(
  "src/styles/design-system-v29.css"
  "src/styles/theme-tokens.css"
  "src/styles/agritech-tokens.css"
  "src/styles/terrain-vivant-v6.css"
  "src/styles/terra-v2-tokens.css"
  "src/styles/theme-v2-tokens.css"
  "src/index.css"
)

# Mapping hex → token --pt-*. Tableau parallèle (pas associatif pour bash 3 macOS).
HEX=(
  "2D4A1F"  # primary
  "FBF8F1"  # surface
  "F2EEE3"  # bg
  "D4915C"  # accent
  "B23A2A"  # danger
  "1A1A1A"  # text
  "5C5C5C"  # text-muted
  "8A8A8A"  # text-subtle
  "D4CFC2"  # divider
)
TOKEN=(
  "var(--pt-primary)"
  "var(--pt-surface)"
  "var(--pt-bg)"
  "var(--pt-accent)"
  "var(--pt-danger)"
  "var(--pt-text)"
  "var(--pt-text-muted)"
  "var(--pt-text-subtle)"
  "var(--pt-divider)"
)

# Construction args find. Cible .ts/.tsx/.css sous src/, hors exclusions.
build_find() {
  local f="find src -type f \\( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \\)"
  for d in "${EXCLUDE_DIRS[@]}"; do
    f+=" -not -path '$d/*'"
  done
  for ff in "${EXCLUDE_FILES[@]}"; do
    f+=" -not -path '$ff'"
  done
  echo "$f"
}

# gsed = GNU sed (macOS) ou sed (Linux)
SED_BIN="sed"
if command -v gsed >/dev/null 2>&1; then SED_BIN="gsed"; fi

echo "━━━ V38-A · migrate-ds.sh ━━━"
echo "Sed binary : $SED_BIN"
echo "Mode       : $([ $DRY -eq 1 ] && echo DRY-RUN || echo APPLY)"
echo

FIND_CMD=$(build_find)

for i in "${!HEX[@]}"; do
  hex="${HEX[$i]}"
  tok="${TOKEN[$i]}"

  # Compte avant — uniquement les hex SANS fallback `var(..., #hex)`.
  # On ne touche pas aux fallbacks (rétrocompat préservée).
  count_before=$(eval "$FIND_CMD" \
    | xargs grep -lE "#${hex}\b" 2>/dev/null \
    | wc -l | tr -d ' ')

  echo "→ #$hex → $tok  (fichiers concernés: $count_before)"

  if [[ $DRY -eq 0 ]] && [[ $count_before -gt 0 ]]; then
    # Remplace #HEX → token MAIS uniquement si pas déjà dans var(..., #hex)
    # Pattern : #HEX précédé d'un caractère non-virgule-espace
    # On est conservateur : on ne touche QUE les occurrences en valeur directe
    # (style={{ color: '#HEX' }} etc.), pas les définitions @theme/--var.
    eval "$FIND_CMD" \
      | xargs -I{} $SED_BIN -i \
        -e "s|: *'#${hex}'|: '${tok//\//\\/}'|g" \
        -e "s|: *\"#${hex}\"|: \"${tok//\//\\/}\"|g" \
        {} 2>/dev/null || true
  fi
done

echo
echo "━━━ Audit final ━━━"
HEX_PURE=$(eval "$FIND_CMD" \
  | xargs grep -E "#[0-9A-Fa-f]{6}\b" 2>/dev/null \
  | grep -vE "var\([^,)]+,\s*#" \
  | wc -l | tr -d ' ')
echo "Hex purs (hors fallbacks, hors token-files) : $HEX_PURE"
