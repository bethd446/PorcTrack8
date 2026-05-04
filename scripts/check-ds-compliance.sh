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
# V42-pre — regex resserré pour ne matcher QUE les UUID rendus dans du
# contenu JSX entre tags ouvrants/fermants (`>...{x.id}...<`).
# L'ancien regex `{xxx.id}` matchait massivement des faux positifs :
#   - URLs   : navigate(`/troupeau/truies/${truie.id}`)
#   - Props  : subjectId={bande.id}
#   - Sets   : seen.add(`truie|${t.id}|${iso}`)
#   - Calls  : getBandeById(bande.id)
# Ces patterns ne rendent JAMAIS un UUID dans l'UI utilisateur.
echo "CHECK 1 : UUID affiché dans le JSX"
MATCHES=$(grep -rnE ">[^<]*\{[a-zA-Z_]*\.id\}[^>]*<" "$SRC" --include="*.tsx" | grep -v 'key={' | grep -v 'key =' || true)
if [ -n "$MATCHES" ]; then
  echo "✗  UUID brut affiché dans le JSX :"
  echo "$MATCHES" | sed 's/^/   /'
  ERRORS=$((ERRORS + 1))
else
  echo "✓  Aucun UUID brut affiché"
fi
echo ""

# CHECK 2 — Aucun bouton natif <button (hors pt-btn, design-system, tests, commentaires)
# V43-B-bis-final : exclusions complétées
#   - *.test.tsx / *.test.ts / __tests__ : faux positifs (mocks Ionic, etc.)
#   - lignes commençant par // ou /* ou * : commentaires JS qui mentionnent <button> en doc
echo "CHECK 2 : Boutons natifs <button"
MATCHES=$(grep -rn '<button' "$SRC" --include="*.tsx" \
  --exclude='*.test.tsx' \
  --exclude='*.test.ts' \
  --exclude-dir='__tests__' \
  | grep -v 'pt-btn' \
  | grep -v 'design-system' \
  | grep -v 'design-system-v29' \
  | grep -vE '^[^:]+:[0-9]+:\s*(//|/\*|\*[^/])' \
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
# V42-pre — whitelists ajoutées :
#   - AuditPrintTemplate.tsx : print constants intentionnelles (rendu PDF
#     où les CSS vars peuvent ne pas s'appliquer)
#   - WHATSAPP_BRAND : couleur officielle WhatsApp (#25D366), constante de
#     service externe non négociable
# V45 — whitelist EntityAvatar : palette espèces (truie/verrat/porcelet/bande)
#   dictée par la spec V45 PDF, palette stricte non-tokenisable.
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
  | grep -v 'AuditPrintTemplate\.tsx' \
  | grep -v 'WHATSAPP_BRAND' \
  | grep -v 'EntityAvatar\.tsx' \
  | grep -v 'EntityAvatar\.test\.tsx' \
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

# CHECK 9 — Pas de className contenant tag-rect / btn-rect / icon-outline / tag-outline / btn-outline
echo "CHECK 9 : Variants illégitimes (tag-rect, btn-rect, icon-outline)"
MATCHES=$(grep -rnE "className=[\"'][^\"']*\b(tag-rect|btn-rect|icon-outline|tag-outline|btn-outline)\b" "$SRC" --include="*.tsx" || true)
if [ -n "$MATCHES" ]; then
  echo "✗  Variants illégitimes détectés — utiliser <Tag>/<Button>/<IconBox> du DS :"
  echo "$MATCHES" | sed 's/^/   /'
  ERRORS=$((ERRORS + 1))
else
  echo "✓  Aucun variant illégitime (tag-rect, btn-rect, icon-outline, etc.)"
fi
echo ""

# CHECK 10 — Pas de caractère ASCII → dans JSX rendu (warning, faux positifs possibles)
echo "CHECK 10 : Caractère → ASCII dans JSX (avertissement)"
MATCHES=$(grep -rn "→" "$SRC" --include="*.tsx" \
  | grep -v "\.test\.tsx" \
  | grep -vE "^[^:]+:[0-9]+:\s*//" \
  | grep -vE "^[^:]+:[0-9]+:\s*\*" \
  | grep -v "console\." \
  | grep -v "throw new Error" \
  | grep -vE "describe\(|^\s*it\(|expect\(" \
  | grep -vE "J[0-9]+\s*→\s*J[0-9]+" \
  || true)
if [ -n "$MATCHES" ]; then
  echo "⚠  Caractère → ASCII détecté dans JSX (utiliser › ou <ActionRow>) :"
  echo "$MATCHES" | sed 's/^/   /' | head -10
  WARNINGS=$((WARNINGS + 1))
else
  echo "✓  Aucun → ASCII dans JSX rendu"
fi
echo ""

# CHECK 11 — Pas de double <Fab> dans une même page
echo "CHECK 11 : Double <Fab> dans une même page"
DOUBLE_FAB_FILES=$(grep -rln "<Fab" "$SRC" --include="*.tsx" 2>/dev/null | while read -r f; do
  count=$(grep -c "<Fab" "$f" 2>/dev/null || echo 0)
  if [ "$count" -gt 1 ]; then
    echo "$f ($count occurrences)"
  fi
done)
if [ -n "$DOUBLE_FAB_FILES" ]; then
  echo "✗  Page(s) avec >1 <Fab> détectée(s) :"
  echo "$DOUBLE_FAB_FILES" | sed 's/^/   /'
  ERRORS=$((ERRORS + 1))
else
  echo "✓  Aucune page avec double <Fab>"
fi
echo ""

# CHECK 12 — Pas de filtre scroll horizontal custom (préférer <Tabs> ou <Chips>)
echo "CHECK 12 : Scroll horizontal custom (avertissement)"
MATCHES=$(grep -rnE "overflowX:\s*['\"]auto['\"]|overflow-x:\s*auto" "$SRC" --include="*.tsx" \
  | grep -v "design-system" \
  | grep -v "pt-tabs" \
  | grep -v "pt-chips" \
  || true)
if [ -n "$MATCHES" ]; then
  echo "⚠  Scroll horizontal custom détecté (préférer <Tabs> ou <Chips>) :"
  echo "$MATCHES" | sed 's/^/   /' | head -10
  WARNINGS=$((WARNINGS + 1))
else
  echo "✓  Aucun scroll horizontal custom"
fi
echo ""

# V41 — LA 11e RÈGLE D'OR : ARCHITECTURE DE PAGE
# CHECK 13: <Button> (DS) à l'intérieur d'un <PageHeader> (interdit V41)
echo "CHECK 13 : <Button> dans <PageHeader> (interdit V41)"
MATCHES=$(grep -rPzo --include="*.tsx" '(?s)<PageHeader[^/]*?>.*?</PageHeader>' "$SRC" 2>/dev/null \
  | tr '\0' '\n' \
  | grep -E "<Button" \
  || true)
if [ -n "$MATCHES" ]; then
  echo "✗  <Button> détecté dans <PageHeader> (pattern V41 interdit) :"
  echo "$MATCHES" | sed 's/^/   /' | head -5
  ERRORS=$((ERRORS + 1))
else
  echo "✓  Aucun <Button> dans <PageHeader>"
fi
echo ""

# CHECK 14: <PageHeader subtitle="..."> contenant un pattern numérique (métriques)
echo "CHECK 14 : subtitle de <PageHeader> avec métriques chiffrées (interdit V41)"
MATCHES=$(grep -rnE "subtitle=\\{?[\"\`'][^\"\`']*[0-9]+\\s*(truies?|verrats?|animaux|pleines?|allaitantes?|vides?|réformes?|critiques?|bandes?|portées?)[^\"\`']*[\"\`']" "$SRC" --include="*.tsx" 2>/dev/null || true)
if [ -n "$MATCHES" ]; then
  echo "✗  PageHeader avec subtitle métrique chiffré (anti-pattern V41) :"
  echo "$MATCHES" | sed 's/^/   /' | head -10
  ERRORS=$((ERRORS + 1))
else
  echo "✓  Aucun subtitle PageHeader avec métriques chiffrées"
fi
echo ""

# CHECK 15: 2 <Section><StatsGrid></Section> consécutives (avertissement)
# Heuristique : un fichier avec >= 2 occurrences de "<StatsGrid" est suspect.
echo "CHECK 15 : 2+ <StatsGrid> dans un même fichier (avertissement)"
MULTI_STATS_FILES=$(grep -rln "<StatsGrid" "$SRC" --include="*.tsx" 2>/dev/null | while read -r f; do
  count=$(grep -c "<StatsGrid" "$f" 2>/dev/null || echo 0)
  if [ "$count" -gt 1 ]; then
    echo "$f ($count <StatsGrid>)"
  fi
done)
if [ -n "$MULTI_STATS_FILES" ]; then
  echo "⚠  2+ <StatsGrid> dans un même fichier (consolidation V41 recommandée) :"
  echo "$MULTI_STATS_FILES" | sed 's/^/   /' | head -10
  WARNINGS=$((WARNINGS + 1))
else
  echo "✓  Aucun fichier avec 2+ <StatsGrid>"
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
