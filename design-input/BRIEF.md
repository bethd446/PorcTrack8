# BRIEF — PorcTrack 8 Design System

## Company name and blurb (≤280 chars, à coller dans Claude.ai)

<!-- BLURB_START -->
PorcTrack 8 — app mobile (Android + web) pour éleveurs porcins de Côte d'Ivoire. Suivi du troupeau : truies, verrats, bandes, cycles de reproduction, mise-bas, sevrage, porc à vendre. Outil terrain qui parle comme l'éleveur, pas comme un SaaS européen.
<!-- BLURB_END -->

## Any other notes? (≤1200 chars, à coller dans Claude.ai)

<!-- NOTES_START -->
Public : éleveurs Côte d'Ivoire, 5-50 truies, mobile-first 360px, gants au boulot, lumière soleil ou aube. Littéracie tech faible à moyenne.

Ton : terre-à-terre, vocabulaire métier local. On dit "la truie demande" (chaleur), "porc à vendre", "faire monter" (saillie), "case", "bande". Jamais de jargon européen condescendant ni de copy SaaS lifestyle.

Stack : Ionic 8 + Tailwind v4 + React 19 + Vite 6, Capacitor Android. Réutiliser IonButton, IonCard, IonModal, IonList. Polices : Big Shoulders Display 700 pour titres UPPERCASE et KPIs, Instrument Sans pour body.

A11y : WCAG 2.1 AA, touch ≥ 44×44px (gants), contraste 4.5:1 mini, viser 7:1 en plein soleil. Focus visible, clavier OK.

Dark mode : oui, requis (tournées tôt matin + soir).

Palette à privilégier : terre cuite, ocre, vert agricole foncé (pas mint), crème, bleu confiance discret. Référence "Terrain Vivant" : vert forêt #2D4A1F, crème #F5E9D8, terre #B8703D. À éviter : rose pastel SaaS, dégradés violet/indigo, glassmorphism gratuit, néons.

Icônes : pictos métier (porc, truie, porcelet, case, bande, balance, seringue, abreuvoir). Lucide React préféré, Ionicons toléré en legacy.
<!-- NOTES_END -->

## Contexte étendu (pour suivi interne, PAS à coller dans Claude.ai)

### État du design
- Phase 1 + Phase 2 validées (0 bouton mort, RLS durci, 2184 tests pass).
- Système legacy `--color-accent-*` déprécié. Source unique tokens : `src/v70/theme/v70-tokens.css`.
- Avant cette session, design partiellement désinstallé volontairement pour repartir sur une base saine.

### Vocabulaire métier à respecter
- "Truie" / "verrat" / "porcelet" / "porc" (jamais "cochon", jamais "swine").
- "Bande" = lot d'animaux synchronisés par cycle.
- "Case" / "loge" = compartiment physique.
- "La truie demande" = chaleur détectée.
- "Faire monter" = saillie.
- "Mise-bas" / "sevrage" / "retour chaleur" = jalons cycle reproduction (115j gestation, 28j lactation, retour J+3 à J+7 post-sevrage).
- "Porc à vendre" = animal prêt abattoir (≥110 kg).

### Cycle métier (référence pour mockups)
Saillie → Gestation (115j) → Mise-bas → Lactation/Maternité (28j) → Sevrage → Retour chaleur (3-7j) → Saillie.
Porcelets : Post-sevrage (35j) → Croissance (37j) → Engraissement (80j) → Finition → Abattoir.

### Contraintes terrain à garder en tête pour le designer
- Connexion 3G instable → offline-first, badges sync visibles.
- Gants au boulot → touch ≥ 44px, swipe rare, formulaires courts.
- Plein soleil régulier → contraste élevé, pas de gris clair sur blanc.
- Décompte d'animaux à la voix → futurs flows vocal-friendly, garder labels courts.

### Rôles utilisateurs
- WORKER (alias PORCHER) : terrain, saisies rapides.
- OWNER (alias ADMIN) : gestion, KPIs, vue financière FCFA.

### Devise
- FCFA. Pas d'euro, pas de dollar. Prix vente porc référence : 2100 FCFA/kg.
