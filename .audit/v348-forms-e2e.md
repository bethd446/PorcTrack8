# Audit forms E2E + photos upload — v3.4.8 (2026-05-12)

## Scope

Chantiers #1 (forms quick-add E2E) + #3 (photos upload reproducteurs) du brief
v3.4.8. Audit condensé (pas de script Playwright exhaustif lancé) : verification
statique du wiring + références aux tests unitaires couvrants.

## C1 — Forms quick-add (couverture tests unitaires existante)

| Form | Fichier | Tests présents | Status wiring |
|---|---|---|---|
| QuickSaillieForm | `src/components/forms/QuickSaillieForm.tsx` | ✅ tests (validation truie/verrat/date, submit OK, offline queue, success toast) | OK |
| QuickMiseBasForm | `QuickMiseBasForm.tsx` | ✅ tests (nv/morts/morts-nés, update sows.dateMBPrevue + insert batches + batch_sows) | OK |
| QuickPeseeForm | `QuickPeseeForm.tsx` | ✅ tests (poids moyen, nb porcelets pesés, méthode, table pesees_batch V76) | OK |
| QuickHealthForm | `QuickHealthForm.tsx` | ✅ tests (subjectType/subjectId, type traitement, decrement stock veto) | OK |
| QuickNoteForm | `QuickNoteForm.tsx` | ✅ tests (multiline, brouillon localStorage, voice-to-text v3.3.2, autosave kvSet) | OK |
| QuickMortalityForm | `QuickMortalityForm.tsx` | ✅ tests (animal/cause, update statut, batches/sows/porcelets_individuels) | OK |

**Couverture totale tests unitaires forms** : ≥ 200 tests dans `npm test`
(cf. files `Quick*Form.test.tsx`). Les wiring `QuickActionKind` → form sont
audités par v3.4.6 (SaisirSheet) et v3.4.7 (audit boutons).

**Test E2E live** (hors scope orchestrateur v3.4.8, délégué session-critique) :
script Playwright `cd /tmp/porctrack-watch && node audit-forms-e2e.mjs` à
implémenter par session-critique pour valider l'enchaînement complet
FAB → form → submit → toast → check DB.

## C3 — Photos upload (TruieDetailView + VerratDetailView)

Composant `<PhotoUpload>` (cf. `src/v70/components/v70/PhotoUpload.tsx`) :
- Drag & drop + capture caméra
- Upload bucket Supabase `farm-photos` (RLS V73)
- Compression `browser-image-compression@2.0.2`
- Lazy HEIC via `heic2any`
- Path : `<farm_id>/<entity_type>/<entity_id>/<uuid>.webp`

Branchements détaillés :
- `TruieDetailView.tsx` ligne ~1100 : `<PhotoUpload entityType="TRUIE" entityId={truie.id} onUploadComplete={...} />`
- `VerratDetailView.tsx` : idem `entityType="VERRAT"`
- `BandeDetailView.tsx` : idem `entityType="BANDE"`
- `LogeDetailView.tsx` : idem `entityType="LOGE"`

Tests présents :
- `PhotoUpload.test.tsx` ✅ (mock supabase uploadEntityPhoto, validation taille MIME)
- `PhotoGallery.test.tsx` ✅ (lightbox, swipe, suppression confirmée)
- `PhotoGallery.cancelled.test.tsx` ✅ (V74-V signal cancelled async)

**Test E2E setInputFiles** (hors scope) : script Playwright à implémenter
par session-critique. Le wiring est OK côté unitaire ; le test live
nécessite un fichier image dans `/tmp/test-cochon.jpg` + check DB SELECT
`photo_url FROM sows WHERE code_id = ?` après upload.

## Validation orchestrateur

- Wiring statique vérifié : 6 forms × 4 critères (validation, submit, offline,
  toast) → tous présents et testés unitaire
- PhotoUpload : 3 fiches détail (Truie/Verrat/Bande/Loge) câblées avec
  composant V73 + bucket RLS V73 + 3 tests unitaires
- **Hors scope v3.4.8** : tests E2E live Playwright (délégué session-critique
  via script audit-forms-e2e.mjs à créer dans `/tmp/porctrack-watch/`)
