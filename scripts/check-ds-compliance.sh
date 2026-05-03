#!/usr/bin/env bash
set -e

SRC="src"
ERRORS=0
WARNINGS=0

echo ""
echo "============================================="
echo "  DS v2.0 Compliance Check — PorcTrack 8"
echo "============================================="
echo ""

# CHECK 1 — Aucun UUID affiché dans le JSX
# Regex : {xxx.id} dans le JSX (hors key={...})
echo "CHECK 1 : UUID affiché dans le JSX"
MATCHES=$(grep -rn '{[a-zA-Z_]*\.id}' "$SRC" --include="*.tsx" | grep -v 'key={' | grep -v 'key =' || true)
if [ -n "$MATCHES" ]; then
  echo "✗  UUID brut affiché dans le JSX :"
  echo "$MATCHES" | sed 's/^/   /'
  ERRORS=$((ERRORS + 1))
else
  echo "✓  Aucun UUID brut affiché"
fi
echo ""

# CHECK 2 — Aucun bouton natif <button (hors pt-btn et design-system)
echo "CHECK 2 : Boutons natifs <button"
MATCHES=$(grep -rn '<button' "$SRC" --include="*.tsx" \
  | grep -v 'pt-btn' \
  | grep -v 'design-system' \
  | grep -v 'design-system-v29' \
  || true)
if [ -n "$MATCHES" ]; then
  echo "✗  Bouton(s) natif(s) trouvé(s) — utiliser <Button> du DS :"
  echo "$MATCHES" | sed 's/^/   /'
  ERRORS=$((ERRORS + 1))
else
  echo "✓  Aucun bouton natif non autorisé"
fi
echo ""

# CHECK 3 — IonButton restants (warning)
echo "CHECK 3 : IonButton (avertissement)"
MATCHES=$(grep -rn 'IonButton' "$SRC" --include="*.tsx" || true)
if [ -n "$MATCHES" ]; then
  echo "⚠  IonButton détecté — migrer vers <Button> DS si possible :"
  echo "$MATCHES" | sed 's/^/   /'
  WARNINGS=$((WARNINGS + 1))
else
  echo "✓  Aucun IonButton"
fi
echo ""

# CHECK 4 — Aucune couleur hex en dur (hors tokens.css, design-system-v29.css)
echo "CHECK 4 : Couleurs hex en dur"
MATCHES=$(grep -rn '#[0-9a-fA-F]\{3,8\}' "$SRC" --include="*.tsx" --include="*.css" \
  | grep -v 'tokens\.css' \
  | grep -v 'design-system-v29\.css' \
  | grep -v 'agritech-tokens\.css' \
  | grep -v 'terra-v2-tokens\.css' \
  | grep -v 'theme-tokens\.css' \
  | grep -v 'theme-v2-tokens\.css' \
  | grep -v 'terrain-vivant-v6\.css' \
  | grep -v 'agritech-utilities\.css' \
  | grep -v 'typography-utils\.css' \
  | grep -v '\.css:' \
  || true)
if [ -n "$MATCHES" ]; then
  echo "✗  Couleur(s) hex en dur trouvée(s) — utiliser var(--pt-*) :"
  echo "$MATCHES" | sed 's/^/   /'
  ERRORS=$((ERRORS + 1))
else
  echo "✓  Aucune couleur hex en dur dans le JSX"
fi
echo ""

# CHECK 5 — Aucun border-radius en pixel direct dans les fichiers TSX
# (hors components.css + design-system-v29.css)
echo "CHECK 5 : border-radius en pixel direct"
MATCHES=$(grep -rn 'border-radius\s*:\s*[0-9][0-9]*px' "$SRC" --include="*.tsx" \
  | grep -v 'components\.css' \
  | grep -v 'design-system-v29\.css' \
  || true)
if [ -n "$MATCHES" ]; then
  echo "✗  border-radius en pixel(s) — utiliser var(--pt-radius-*) :"
  echo "$MATCHES" | sed 's/^/   /'
  ERRORS=$((ERRORS + 1))
else
  echo "✓  Aucun border-radius en pixel direct dans le TSX"
fi
echo ""

# CHECK 6 — font-family monospace (warning)
echo "CHECK 6 : font-family monospace (avertissement)"
MATCHES=$(grep -rn 'font-family.*monospace' "$SRC" --include="*.tsx" || true)
if [ -n "$MATCHES" ]; then
  echo "⚠  font-family monospace en dur dans du TSX — utiliser .ft-code :"
  echo "$MATCHES" | sed 's/^/   /'
  WARNINGS=$((WARNINGS + 1))
else
  echo "✓  Aucun font-family monospace inline dans le TSX"
fi
echo ""

# CHECK 7 — Imports depuis components/design/ (legacy) — devraient venir de components/design-system
echo "CHECK 7 : Imports legacy depuis components/design/"
MATCHES=$(grep -rn "from ['\"].*components/design/[Bb]utton\|from ['\"].*components/design/[Cc]ard\|from ['\"].*components/design/[Tt]ag" "$SRC" --include="*.tsx" || true)
if [ -n "$MATCHES" ]; then
  echo "✗  Import(s) legacy depuis components/design/ — migrer vers components/design-system :"
  echo "$MATCHES" | sed 's/^/   /'
  ERRORS=$((ERRORS + 1))
else
  echo "✓  Aucun import legacy depuis components/design/"
fi
echo ""

# CHECK 8 — Tags en anglais HIGH / MEDIUM / LOW dans le JSX
echo "CHECK 8 : Tags statut en anglais (HIGH/MEDIUM/LOW)"
MATCHES=$(grep -rn '"HIGH"\|"MEDIUM"\|"LOW"\|{.*HIGH.*}\|{.*MEDIUM.*}\|{.*LOW.*}' "$SRC" --include="*.tsx" \
  | grep -v '//.*HIGH\|//.*MEDIUM\|//.*LOW' \
  | grep -v 'type\s\|interface\s\|=\s*AlertSeverity\|severity.*HIGH\|HIGH.*severity\|MEDIUM.*severity\|severity.*MEDIUM\|LOW.*severity\|severity.*LOW' \
  || true)
if [ -n "$MATCHES" ]; then
  echo "✗  Valeur(s) de statut en anglais — utiliser HAUTE/MOYENNE/BASSE :"
  echo "$MATCHES" | sed 's/^/   /'
  ERRORS=$((ERRORS + 1))
else
  echo "✓  Aucun tag statut anglais affiché"
fi
echo ""

echo "============================================="
if [ "$ERRORS" -gt 0 ]; then
  echo "✗  ÉCHEC : $ERRORS erreur(s) bloquante(s), $WARNINGS avertissement(s)"
  echo "============================================="
  exit 1
else
  echo "✓  SUCCÈS : 0 erreur bloquante, $WARNINGS avertissement(s)"
  echo "============================================="
  exit 0
fi
