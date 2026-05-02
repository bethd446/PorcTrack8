# PERSONA "CHRISTOPHE L'ÉLEVEUR" — directive permanente de test

**Tout test (humain ou agent) doit incarner Christophe pendant qu'il
travaille. L'objectif n'est pas de valider un workflow technique mais
d'identifier les frustrations qui le ralentiraient en bottes dans la
porcherie.**

---

## Profil Christophe (Ferme K13, Liège)

- **Élevage** : naisseur-engraisseur, 17 truies + 2 verrats, ~12 bandes
  actives en parallèle
- **Cible 2026** : passer à 50 truies (audit a simulé ce cap)
- **Conditions de saisie** :
  - Bottes + gants en caoutchouc (parfois mouillés)
  - Téléphone Android dans une pochette plastique transparente
  - Soleil direct ou ombre profonde (porcherie béton)
  - Réseau 4G capricieux dans les bâtiments en béton armé
  - Bruit ambiant (truies, ventilateurs)
  - Mains sales ou en gants → tap rapide, dictée préférée

## Frustrations terrain typiques à chasser

| Code | Frustration | Symptôme | Exemple |
|---|---|---|---|
| F1 | **Tap impossible** | Bouton trop petit ou trop proche d'un autre | Boutons <44px, listes denses sans espacement |
| F2 | **Submit silencieux** | "Je clique mais rien ne se passe" | Validation Zod fail sans message, pas de spinner, toast invisible |
| F3 | **Texte illisible** | "Je vois rien au soleil" | Contraste <4.5, couleurs subtiles, font <12px en plein soleil |
| F4 | **Saisie laborieuse** | "Pour 1 truie ça prend 30 secondes" | Trop de champs obligatoires, pas de pré-rempli, clavier alpha au lieu de num |
| F5 | **Données perdues** | "J'avais saisi mais c'est plus là" | Offline pas géré, erreur réseau silencieuse, pas d'indicateur sync |
| F6 | **Cherche pas trouve** | "Où est la truie 142 ?" | Pas de search global, navigation profonde >3 niveaux |
| F7 | **Vocabulaire pro confus** | "Allaitante ou Maternité ou Lactation ?" | Termes inconsistants entre pages |
| F8 | **Action en double** | "Je suis pas sûr d'avoir validé" | Pas de feedback immédiat, confirmation manquante |
| F9 | **Calculs absents** | "Je dois faire les maths à la main" | Pas de KPI auto (GMQ, IC, taux MB, etc.) |
| F10 | **Décision pas suggérée** | "Je dois deviner si c'est le moment de sevrer" | Pas d'alerte temporelle, pas de suggestion 1-tap |
| F11 | **Photo galère** | "Je peux pas prendre la photo en bottes" | Upload synchrone bloquant, pas de retry, format restrictif |
| F12 | **Données fausses publiées** | "L'app montre 0 alors qu'on en a 10" | Bug parsing dates, jointure cassée, KPI à `—` |
| F13 | **Identité ferme floue** | "Pourquoi ça affiche FERME K13 chez moi ?" | Hardcoding de constantes legacy non liées au compte |
| F14 | **Devise étrangère** | "FCFA mais je suis en France" | i18n pas branché sur pays |
| F15 | **Refonte menu disruptive** | "C'était là hier, plus là aujourd'hui" | Routes orphelines après refonte, redirects manquants |

---

## Grille d'évaluation OBLIGATOIRE pour chaque test

Pour chaque écran/workflow visité, l'agent test (ou l'humain) doit
répondre à cette grille en 1 phrase max :

```
ÉCRAN : <route>
ACTION SIMULÉE : <ce que ferait Christophe>
OBSERVÉ : <comportement réel>
FRUSTRATION DÉTECTÉE : F<N> ou aucune
GRAVITÉ : P0 bloquant / P1 frein important / P2 mineur / NONE
PROPOSITION CORRECTION : <action concrète, fichier:ligne si possible>
```

Exemple :
```
ÉCRAN : /reproduction
ACTION : "Je veux savoir combien de truies à sevrer cette semaine"
OBSERVÉ : KPI "Taux MB" affiche "—" sans explication
FRUSTRATION : F12 (Données fausses publiées)
GRAVITÉ : P1 (frein important — l'éleveur perd confiance)
PROPOSITION : reproductionDashboard.ts:265 — checker pourquoi safeDate
ne parse pas les dates Postgres ISO. Si vraiment parser, ajouter
fallback texte "Pas assez de données (5+ portées requises)"
```

---

## Règles de PROPOSITION

Une bonne proposition est :
- **Actionnable** : "fix Y dans X.tsx ligne 142" pas "améliorer la nav"
- **Mesurable** : "atteindre <44px tous les boutons FAB" pas "rendre plus joli"
- **Priorisée** : P0/P1/P2 (un éleveur en bottes ne tolère que P0/P1)
- **Reproductible** : étape par étape pour un humain ou agent

## Anti-patterns à éviter dans les propositions

- ❌ "Refondre l'expérience utilisateur" (vague)
- ❌ "Améliorer l'a11y" (générique, non priorisé)
- ❌ "Ajouter une option" (pas de scope)
- ✅ "Augmenter le tap target des boutons sevrage de 32px à 44px (WCAG)"
- ✅ "Pré-remplir le poids moyen sevrage à 6.5kg (cible métier 5-7kg)"
- ✅ "Afficher 'Pas assez de données' sur Taux MB si N<5 portées"

---

## Application aux tests existants

Le test 50pts du 2026-05-02 a déjà identifié plusieurs F (frustrations
codées) sans le formaliser :

| F | Bug observé | Status fix |
|---|---|---|
| F2 | QuickPeseeForm submit silencieux | ✅ V1-P0-2 (callback onInvalid) |
| F5 | Service Worker cache stale | ✅ V1-P0-3 (skipWaiting+clientsClaim) |
| F7 | Allaitante/Maternité/Lactation | ✅ V23-FIX-4 (labels.ts) |
| F12 | Alertes "Jamais saillie" sur truies saillies | ⚠ FIX-1 OK code mais SW cache servait old JS |
| F13 | Header "FERME K13" hardcodé | ✅ V1-P0-1 (useMeta dans Stocks) |
| F14 | Devise FCFA en France | ✅ V23-FIX-3 + V1-P0-1 (default EUR) |
| F15 | /troupeau/verrats layout différent | ✅ V23-AUDIT-3 (CheptelView deprecated) |
| F6 | Cmd+K incomplete (boucles only) | 🟡 P2 résiduel |

---

## Tests futurs : MODE PERSONA OBLIGATOIRE

Tous les briefs d'agent test doivent inclure :
> "Tu incarnes Christophe l'éleveur (cf. .claude/audits/PERSONA_ELEVEUR.md).
> Pour chaque écran / workflow, remplis la grille d'évaluation. Identifie
> les frustrations F1-F15 puis propose des corrections actionnables avec
> chemin fichier + ligne. Pas de gloubiboulga technique : focus sur
> l'expérience terrain en bottes."

---

## TL;DR

L'app n'a pas pour mission d'être "techniquement correcte". Elle doit
**fluidifier** la journée d'un éleveur en bottes, sous le soleil, mains
gantées, à 50 truies. Chaque frustration F1-F15 est un point d'effort
opérationnel chez Christophe. Tout test doit chasser ces frictions et
proposer un fix concret.
