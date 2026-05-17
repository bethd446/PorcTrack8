# VAGUE 2 — Plan détaillé : bandes multi-mères + système de loges

Version 1.0 · 2026-05-02 · auteur : architecte Vague 2 + spec user (loges)

---

## CONTEXTE BUSINESS

### A. Bandes multi-mères

Une bande de porcelets peut être issue de **N truies** (regroupement
post-sevrage, adoptions, péréquations). Le schéma actuel `batches.sow_id`
ne permet de tracer **qu'une seule mère**. Il faut :

1. Tracer **chaque truie source** + son **apport** en porcelets
2. **Éditer post-création** (ajouter/retirer une truie source, ajouter photo)
3. Workflows duaux **saillie** ET **sevrage** : individuel (1×1) OU bande (N×1)

### B. Système de loges (NOUVELLE spec — 2026-05-02)

> "Numéro de loge → sujets contenus dans la loge (boucle, poids, effectif).
> À chaque phase on note où se situent les sujets pour faciliter la
> traçabilité et le suivi temps réel. Truies repro / verrats / porcelets
> par bande — tout doit être noté en loge."

Aujourd'hui chaque table a un champ texte libre (`sows.localisation`,
`boars.localisation`, `batches.loge`). Manque :
- **Référentiel de loges** structuré (numéro / capacité / type / bâtiment)
- **Vue par loge** (qui est dedans, combien, depuis quand)
- **Mouvements** (transferts inter-loges historisés)

---

## AUDIT EXISTANT (factuel)

### Schéma actuel (vérifié)
- `batches.sow_id uuid NULLABLE` (FK → `sows.id`) — 1 mère par bande
- `batches.photo_url` ✅ DÉJÀ présent
- `sows.localisation text NULLABLE` — texte libre "Bât. A"
- `boars.localisation text NULLABLE` — idem
- `batches.loge text NULLABLE` — idem
- `adoptions` (V21-D2) trace transferts bande↔bande mais pas truie biologique
- **`batch_sows` absent** ✅
- **Aucune table `loges` structurée** ✅
- 12 batches en prod chez Christophe

### Photos
- Bucket Supabase Storage `farm-photos` ✅
- `PhotoUploader.tsx` (196L) ✅
- `photoUpload.ts` (138L) service opérationnel ✅
- Importé déjà dans `QuickEditBandeForm`

### Forms existants
- `QuickAddBandeForm` (721L) — 1 truie unique (mono-mère, OK)
- `QuickEditBandeForm` (928L) — édition photo + identité + dates,
  **manque section "Truies sources"** et **manque sélecteur loge**
- `QuickAdoptionForm` (459L) — transferts mais pas truie biologique
- `MultiPorteeSevrageWizard` (723L V23-S1) — bug ligne 280 :
  ne garde que `selectedSources[0].truie` comme `primarySowUuid`
  → besoin de répartition pondérée
- **WIZARD non monté dans une vue** (grep retourne uniquement
  le .tsx + son .test.tsx)
- `QuickSaillieForm` (264L) — 1 truie × 1 verrat (manque mode N×1)

### Call-sites de `bande.truie` / `batch.sow_id`
~80 occurrences sur ~50 fichiers (services, forms, hubs, vues).
**Impossible de supprimer `batches.sow_id`** — devient "truie principale".

---

## PLAN D'IMPLÉMENTATION

### Phase 1 — Migration SQL

**Fichier** `migrations/2026_05_03_v24_batch_sows_and_loges.sql`

```sql
-- 1) Table batch_sows : relation N:N batch ↔ sow
CREATE TABLE public.batch_sows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.profiles(id),
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  sow_id uuid NOT NULL REFERENCES public.sows(id),
  nb_porcelets_apportes int NOT NULL CHECK (nb_porcelets_apportes > 0
    AND nb_porcelets_apportes <= 30),
  date_ajout date NOT NULL DEFAULT current_date,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (batch_id, sow_id)
);

CREATE INDEX batch_sows_batch_idx ON public.batch_sows(batch_id);
CREATE INDEX batch_sows_sow_idx   ON public.batch_sows(sow_id);
CREATE INDEX batch_sows_farm_idx  ON public.batch_sows(farm_id);

ALTER TABLE public.batch_sows ENABLE ROW LEVEL SECURITY;
CREATE POLICY batch_sows_owner ON public.batch_sows
  FOR ALL USING (farm_id = auth.uid());

-- 2) Backfill : pour chaque batch, créer 1 row batch_sows depuis sow_id
INSERT INTO public.batch_sows (farm_id, batch_id, sow_id,
  nb_porcelets_apportes, date_ajout)
SELECT b.farm_id, b.id, b.sow_id,
       GREATEST(1, COALESCE(b.porcelets_nes_vivants, 1)),
       COALESCE(b.date_mise_bas, CURRENT_DATE)
FROM public.batches b
WHERE b.sow_id IS NOT NULL
ON CONFLICT (batch_id, sow_id) DO NOTHING;

-- 3) Table loges : référentiel structuré
CREATE TABLE public.loges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.profiles(id),
  numero text NOT NULL,                  -- "M-01", "PS-03", "ENG-12"
  type text NOT NULL CHECK (type IN (
    'MATERNITE', 'POST_SEVRAGE', 'CROISSANCE', 'ENGRAISSEMENT',
    'FINITION', 'GESTANTE', 'VERRAT', 'INFIRMERIE', 'AUTRE')),
  batiment text,                         -- "Bât. A"
  capacite_max int CHECK (capacite_max >= 0 AND capacite_max <= 500),
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (farm_id, numero)
);

CREATE INDEX loges_farm_idx ON public.loges(farm_id);
CREATE INDEX loges_type_idx ON public.loges(type);

ALTER TABLE public.loges ENABLE ROW LEVEL SECURITY;
CREATE POLICY loges_owner ON public.loges
  FOR ALL USING (farm_id = auth.uid());

-- 4) FK loge_id (NULLABLE) sur sows / boars / batches
ALTER TABLE public.sows    ADD COLUMN IF NOT EXISTS loge_id uuid
  REFERENCES public.loges(id);
ALTER TABLE public.boars   ADD COLUMN IF NOT EXISTS loge_id uuid
  REFERENCES public.loges(id);
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS loge_id uuid
  REFERENCES public.loges(id);

CREATE INDEX sows_loge_idx    ON public.sows(loge_id) WHERE loge_id IS NOT NULL;
CREATE INDEX boars_loge_idx   ON public.boars(loge_id) WHERE loge_id IS NOT NULL;
CREATE INDEX batches_loge_idx ON public.batches(loge_id) WHERE loge_id IS NOT NULL;

-- 5) Table loge_movements : historique des transferts
CREATE TABLE public.loge_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.profiles(id),
  subject_type text NOT NULL CHECK (subject_type IN ('TRUIE','VERRAT','BANDE')),
  subject_id uuid NOT NULL,              -- pointe vers sows.id / boars.id / batches.id
  from_loge_id uuid REFERENCES public.loges(id),
  to_loge_id uuid REFERENCES public.loges(id),
  date_mvt date NOT NULL DEFAULT current_date,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX loge_mvt_subject_idx ON public.loge_movements(subject_type, subject_id);
CREATE INDEX loge_mvt_farm_idx    ON public.loge_movements(farm_id);

ALTER TABLE public.loge_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY loge_mvt_owner ON public.loge_movements
  FOR ALL USING (farm_id = auth.uid());
```

Rollback `migrations/2026_05_03_v24_batch_sows_and_loges_rollback.sql` :
```sql
DROP TABLE IF EXISTS public.loge_movements CASCADE;
ALTER TABLE public.batches DROP COLUMN IF EXISTS loge_id;
ALTER TABLE public.boars DROP COLUMN IF EXISTS loge_id;
ALTER TABLE public.sows DROP COLUMN IF EXISTS loge_id;
DROP TABLE IF EXISTS public.loges CASCADE;
DROP TABLE IF EXISTS public.batch_sows CASCADE;
```

### Phase 2 — Types TS

**Fichier** `src/types/farm.ts` (extension)

```ts
export interface BatchSource {
  id: string;
  sowId: string;
  sowCode: string;         // AUDIT-T-001
  sowBoucle?: string;      // BCL-0001
  sowName?: string;
  nbPorceletsApportes: number;
  dateAjout: string;
  notes?: string;
}

export interface Loge {
  id: string;
  numero: string;
  type: 'MATERNITE' | 'POST_SEVRAGE' | 'CROISSANCE' | 'ENGRAISSEMENT'
      | 'FINITION' | 'GESTANTE' | 'VERRAT' | 'INFIRMERIE' | 'AUTRE';
  batiment?: string;
  capaciteMax?: number;
  notes?: string;
  active: boolean;
}

export interface LogeMovement {
  id: string;
  subjectType: 'TRUIE' | 'VERRAT' | 'BANDE';
  subjectId: string;
  fromLogeId?: string;
  toLogeId?: string;
  dateMvt: string;
  reason?: string;
}

// Extensions des types existants (ajouts non-breaking)
export interface BandePorcelets {
  // ... champs existants
  sources?: BatchSource[];   // NOUVEAU — JOIN batch_sows
  logeId?: string;           // NOUVEAU — FK loges
  logeNumero?: string;       // NOUVEAU — résolu via JOIN
}

export interface Truie {
  // ... champs existants
  logeId?: string;
  logeNumero?: string;
}

export interface Verrat {
  // ... champs existants
  logeId?: string;
  logeNumero?: string;
}
```

### Phase 3 — Services Supabase

**Fichier** `src/services/supabaseWrites.ts` (extensions)

```ts
// Batch sources (multi-mères)
export async function getBatchSources(batchId: string): Promise<BatchSource[]>;
export async function addBatchSource(args: {
  batchId: string;
  sowId: string;
  nbPorcelets: number;
  dateAjout?: string;
  notes?: string;
}): Promise<BatchSource>;
export async function updateBatchSource(id: string,
  patch: Partial<Pick<BatchSource, 'nbPorceletsApportes' | 'notes'>>): Promise<void>;
export async function removeBatchSource(id: string): Promise<void>;

// Loges (référentiel)
export async function listLoges(): Promise<Loge[]>;
export async function createLoge(data: Omit<Loge, 'id' | 'active'>): Promise<Loge>;
export async function updateLoge(id: string, patch: Partial<Loge>): Promise<void>;
export async function deactivateLoge(id: string): Promise<void>;

// Mouvements
export async function moveSubject(args: {
  subjectType: 'TRUIE' | 'VERRAT' | 'BANDE';
  subjectId: string;
  toLogeId: string;
  reason?: string;
}): Promise<LogeMovement>;
export async function getLogeContents(logeId: string): Promise<{
  truies: Truie[];
  verrats: Verrat[];
  bandes: BandePorcelets[];
  totalAnimaux: number;
}>;
```

Logique `addBatchSource` :
1. INSERT batch_sows
2. Si `batches.sow_id IS NULL`, PATCH avec `sow_id = sowId` (mère principale = 1ère ajoutée)
3. Refresh BandePorcelets dans le contexte

Logique `moveSubject` :
1. Lis `subject.loge_id` actuel = `from_loge_id`
2. INSERT loge_movements
3. PATCH subject.loge_id = `to_loge_id`

### Phase 4 — UI

#### 4.1 — `QuickEditBandeForm` enrichi (priorité 1)

Nouvelle section "Truies sources" :
- Liste des sources actuelles avec `nb_porcelets_apportes` + boucle truie
- Bouton "+ Ajouter une truie source" → mini-modal :
  - Combobox truie (filtrée actives)
  - Input nb_porcelets (1-30)
  - Date ajout (défaut today)
  - Notes
- Bouton 🗑 par source (confirm avant remove)
- Validation : `SUM(nb_porcelets_apportes) ≤ batch.porcelets_nes_vivants`
  (warning UI seulement, pas blocage)

Nouvelle section "Loge" :
- Sélecteur `<select>` ou combobox de toutes les loges actives
- Affichage capacité/occupation actuelle
- Bouton "Nouvelle loge" → ouvre `QuickAddLogeForm`

#### 4.2 — `QuickSaillieBandeForm` (NOUVEAU, priorité 2)

Form pour saillie en bande :
- Step 1 : sélection N truies (multi-checkbox depuis liste VIDE/CHALEUR)
- Step 2 : sélection 1 verrat
- Step 3 : date saillie + notes
- Submit : INSERT N `saillies` (1 par truie, même verrat, même date)
- Toast : "{N} saillies enregistrées · MB prévue {date+115j}"

#### 4.3 — `MultiPorteeSevrageWizard` patché (priorité 3)

Aujourd'hui (V23-S1 ligne 280) :
```ts
primarySowUuid: selectedSources[0].truie  // BUG : perte d'info N>1
```

Patch :
```ts
// 1) INSERT batch (destination)
const newBatch = await insertBatch({...});
// 2) Pour CHAQUE source, INSERT batch_sows avec apport pondéré
for (const src of selectedSources) {
  await addBatchSource({
    batchId: newBatch.id,
    sowId: src.sowId,
    nbPorcelets: src.nbApportes,  // déjà calculé en step 2
  });
}
// 3) PATCH batches.sow_id ← source 1ère (rétrocompat affichage)
```

Monter le wizard dans `ReproductionHub` (ligne ~430 étape 5 "À sevrer")
ou dans `MaterniteView` action "Sevrer la bande".

#### 4.4 — `BandeDetailView` enrichi

Nouvelle section "Origine — Truies sources" :
- Affiche la liste BatchSource[] avec lien `/troupeau/truies/{id}`
- Total porcelets apportés vs total bande → indicateur cohérence
- Bouton "Modifier" → ouvre QuickEditBandeForm sur cette section

Nouvelle section "Localisation — Loge" :
- Numéro loge actuelle + capacité/occupation
- Bouton "Déplacer" → modal `QuickMoveSubjectForm` qui appelle `moveSubject`
- Lien vers fiche loge `/troupeau/loges/{id}` (NOUVELLE route)

#### 4.5 — Page `/troupeau/loges` (NOUVEAU tab dans TroupeauHub)

Liste des loges :
- Filtres par type (Maternité / Post-sevrage / Croissance / etc.)
- Card par loge : numéro · type · capacité · occupation actuelle
- Click → `LogeDetailView` qui liste les sujets dedans + historique mouvements

#### 4.6 — `QuickAddLogeForm` (NOUVEAU)

Form simple :
- Numéro (text required, unique par farm)
- Type (select 9 valeurs)
- Bâtiment (text optional)
- Capacité max (number 0-500)
- Notes (textarea)

### Phase 5 — Tests

**Service** (`src/services/supabaseWrites.test.ts` extension)
- getBatchSources : retourne sources d'un batch
- addBatchSource : crée + patch sow_id si null
- removeBatchSource : delete OK
- listLoges : filtré par farm_id (RLS)
- moveSubject : crée mvt + patch loge_id

**UI** (forms tests)
- `QuickEditBandeForm.test` : ajout source, retrait source, validation somme
- `QuickSaillieBandeForm.test` : multi-truie sélection, INSERT N saillies
- `MultiPorteeSevrageWizard.test` : répartition pondérée multi-sources
- `BandeDetailView.test` : affichage sources, click → fiche truie
- `QuickAddLogeForm.test` : validation unique numero

**E2E** (Playwright)
- Workflow : créer 2 saillies → 2 mises-bas → wizard sevrage merge → 1 bande avec 2 sources
- Workflow : déplacer bande de loge "Sous-mère 01" → "Post-sev 03" → vérifier historique

### Phase 6 — Régen types DB

```bash
npx supabase gen types typescript --project-id jcritwravdwefwqwyjvk > src/types/database.types.ts
```

---

## ESTIMATIONS EFFORT

| Phase | Tâches | Effort |
|---|---|---|
| 1. SQL + backfill + apply Mgmt API | migration + rollback + verify counts | 1.5 h |
| 2. Types TS extensions | farm.ts + database.types.ts régen | 1 h |
| 3. Services Supabase (10 fonctions) | writes + tests stub | 2 h |
| 4.1 QuickEditBandeForm enrichi | section sources + loge | 3.5 h |
| 4.2 QuickSaillieBandeForm NEW | 3 steps + wiring | 2.5 h |
| 4.3 MultiPorteeSevrageWizard patch | + monter dans ReproductionHub | 2 h |
| 4.4 BandeDetailView enrichi | sections sources + localisation | 1.5 h |
| 4.5 Page /troupeau/loges + LogeDetailView | tab + détail | 3 h |
| 4.6 QuickAddLogeForm | form simple | 1 h |
| 4.7 QuickMoveSubjectForm | modal déplacement | 1 h |
| 5. Tests (~30) | service + UI + 1-2 E2E | 4 h |
| 6. Régen types DB | npx supabase gen | 0.5 h |
| **TOTAL** | | **23 h** |

---

## RISQUES & MITIGATIONS

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Casse `bande.truie` (80 call-sites) | Haute | Haut | NON-DESTRUCTIF : on garde `batches.sow_id`, devient "mère principale" auto-syncée |
| `SUM(apports) ≠ vivants` data integrity | Moyenne | Moyen | Warning UI, pas blocage DB. Tolérance écart ±2 (adoptions perdues) |
| `MultiPorteeSevrageWizard` non monté | Certaine | Moyen | Décision V2 : monter dans ReproductionHub étape "À sevrer" |
| Migration SQL backfill échoue (12 batches) | Faible | Bas | ON CONFLICT DO NOTHING + rollback testé |
| Tests existants cassés (~80 fichiers refs) | Moyenne | Haut | Pas de modif breaking, ajout uniquement. Tests stables verts |
| RLS mal configurée (fuite multi-tenant) | Faible | CRITIQUE | Tests E2E avec 2 farms, vérif `auth.uid()` dans toutes les policies |

---

## ORDRE D'EXÉCUTION RECOMMANDÉ

**Sprint 1 (8h)** — Multi-mères MVP
- Phase 1 SQL + Phase 2 types + Phase 3 services
- Phase 4.1 QuickEditBandeForm enrichi
- Phase 5 tests service

**Sprint 2 (8h)** — Workflows N×1
- Phase 4.2 QuickSaillieBandeForm
- Phase 4.3 MultiPorteeSevrageWizard patch + mount
- Phase 4.4 BandeDetailView enrichi
- Tests UI

**Sprint 3 (7h)** — Loges
- Phase 4.5 page /troupeau/loges + LogeDetailView
- Phase 4.6 QuickAddLogeForm
- Phase 4.7 QuickMoveSubjectForm
- Tests E2E

---

## DÉCISIONS — VALIDÉES PAR L'UTILISATEUR (2026-05-02)

1. ✅ **Loge portée par la BANDE** (1 loge → 1 bande entière, mass action
   lors transferts). Truies/verrats individuels ont `loge_id` séparé.

2. ✅ **Capacité max = WARNING** (pas blocage). Tolérance terrain courte durée.

3. ✅ **SOFT-delete** (`active=false`) pour préserver historique mouvements.

4. ✅ **Numérotation libre par l'utilisateur** + assistance via wizard
   d'onboarding qui demande la **disposition par type de loge**.

## NOUVELLE SPEC — Onboarding loges (étape supplémentaire wizard)

À intégrer dans `OnboardingWizard.tsx` après l'étape 8 (objectif annuel) :

### Étape 9bis — Configuration des loges

> "Combien de loges as-tu et de quel type ? On va t'aider à les numéroter."

Form en 2 sub-steps :

**Sub-step 9a — Quantités par type** (5 inputs number) :
- Loges truies vides / reproductrices : 0-N
- Loges mise-bas (maternité) : 0-N
- Loges démarrage (post-sevrage) : 0-N
- Loges croissance : 0-N
- Loges engraissement / finition : 0-N
- Verrats (si applicable) : 0-N

**Sub-step 9b — Numérotation** :

Pour chaque type avec quantité > 0, affichage d'une grille avec
**suggestions de numéros** que l'utilisateur peut **éditer librement** :

```
LOGES MATERNITÉ (5 loges)
[M-01] [M-02] [M-03] [M-04] [M-05]
       ↑ chaque case éditable, l'utilisateur change comme il veut
       (ex: "Bât A 1", "Salle 1A", "01", etc.)
```

### Logique service

À la fin du wizard, en plus du UPDATE troupeaux :
```ts
// Pour chaque type avec quantité, INSERT N rows dans loges
for (const type of TYPES_LOGES) {
  for (let i = 0; i < count; i++) {
    await createLoge({
      numero: editedNumbers[type][i] ?? defaultNumero(type, i+1),
      type: type,
      capacite_max: defaultCapaciteByType(type),  // 1 truie / 1 portée / 30 porcelets...
      active: true,
    });
  }
}
```

### Suggestions par défaut (utilisateur peut tout changer)

| Type | Préfixe suggéré | Exemple 5 loges |
|---|---|---|
| Truies vides / repro | `V-` | V-01, V-02, V-03, V-04, V-05 |
| Mise-bas | `M-` | M-01..M-05 |
| Démarrage / Post-sevrage | `PS-` | PS-01..PS-05 |
| Croissance | `C-` | C-01..C-05 |
| Engraissement / Finition | `E-` | E-01..E-05 |
| Verrats | `B-` (boar) | B-01, B-02, B-03 |

### Capacités par défaut (modifiable plus tard via /troupeau/loges)

| Type | Capacité défaut |
|---|---|
| Truies vides / repro | 8 truies/loge (groupe gestation) |
| Mise-bas | 1 portée |
| Démarrage | 30 porcelets |
| Croissance | 24 porcs |
| Engraissement / Finition | 18 porcs |
| Verrats | 1 verrat |

### Skip-friendly

Si l'utilisateur skip cette étape ou met tout à 0, l'app fonctionne
avec `loge_id NULL` partout — l'utilisateur peut configurer plus tard
via `/troupeau/loges` (page admin).

---

## RÉCAP IMPLÉMENTATION VAGUE 2 — 4 sprints

| Sprint | Description | Effort |
|---|---|---|
| 1 | SQL + types + services Supabase + tests service | 5 h |
| 2 | QuickEditBandeForm enrichi (sources + loge sélection) | 4 h |
| 3 | QuickSaillieBandeForm + MultiPorteeSevrageWizard mount + BandeDetailView | 6 h |
| 4 | Page /troupeau/loges + LogeDetailView + QuickAddLogeForm + onboarding loges | 8 h |
| **TOTAL** | | **23 h** |
