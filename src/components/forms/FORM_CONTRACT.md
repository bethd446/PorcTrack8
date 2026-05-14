# FORM_CONTRACT — Contrat des Quick*Form (PorcTrack 8)

> **Phase 1 — référence.** Ce document est la source de vérité pour la
> migration des ~40 `Quick*Form.tsx`. Les agents de Phase 2 l'appliquent
> form par form. Les 2 références migrées sont `QuickSaillieForm.tsx`
> (picker chips) et `QuickMiseBasForm.tsx` (picker autocomplete + pipeline
> de validation). Copier l'une des deux selon le cas.

---

## 1. Décisions canoniques (non négociables)

| Sujet | Règle | Anti-pattern à tuer |
|-------|-------|---------------------|
| Conteneur | `<QuickActionSheet>` (shell partagé) → `<form onSubmit>` + bouton `type="submit"`. Le handler appelle `e.preventDefault()`. | `<div className="sheet">` + `onClick` sur le bouton |
| Toast | `useToast()` de `context/ToastContext` — context global monté dans App. Signature : `showToast(message, type?, duration?)` avec `type` ∈ `success | error | info`. | `useAppToast()` + `<AppToast>` rendu localement par le form |
| Validation | Fonction pure `validateX(draft) → { ok, errors, normalized }`. État `errors` dans le form. Rendu d'erreur via `<FieldError message={errors.champ} />`. | Booléen `isValid` inline sans messages, ou `errMsg()` redéfini dans chaque form |
| Helpers date | `_formHelpers.ts` : `todayIso()`, `nowHoursMinutes()`, `isoDaysAgo()`, `formatFr()`. **Heure locale**, jamais UTC. | `todayISO`, `todayIsoLocal`, `toISOString().slice(0,10)` redéfinis localement |
| Reset-on-open | Pattern `lastOpenKey` render-phase (voir §4). | `useEffect([isOpen])` qui reset (cause un render de trop) |
| Garde double-clic | `saving` reste `true` jusqu'au `onClose` ; fermeture via `closeTimerRef` + cleanup `useEffect`. | `setTimeout` nu sans ref ni cleanup |
| Nommage logique | Logique/validation extraite → `quickXxxLogic.ts`. **Ne PAS renommer les fichiers existants** (`*Helpers.ts`, `*Validation.ts`) en Phase 1 — règle pour le code neuf uniquement. | Mélange `*Logic` / `*Validation` / `*Helpers` pour du code neuf |
| Picker d'entité | `<EntityPicker>` de `_formFields.tsx`. `mode="chips"` si liste courte (< ~8), `mode="autocomplete"` au-delà. | Réimplémenter `radio-chips--cards` ou l'autocomplete `role=listbox` à la main |

---

## 2. Briques partagées (à importer, ne pas réécrire)

```ts
import QuickActionSheet from './QuickActionSheet';
import { FieldError, EntityPicker } from './_formFields';
import { todayIso, nowHoursMinutes, isoDaysAgo, formatFr } from './_formHelpers';
import { useFocusFirstInput } from './useFormA11y';
import { useToast } from '../../context/ToastContext';
```

- **`QuickActionSheet`** : `IonModal` bottom-sheet + `<form>` + `.sheet` +
  header (eyebrow/titre/close) + slot body + footer (Annuler ghost +
  submit primary). Câble `useEscapeKey`. Props :
  `isOpen, onClose, eyebrow, title, ariaLabel?, saving, isValid, onSubmit,
  submitLabel, savingLabel?, submitAriaLabel?, submitDisabled?, footer?,
  bodyClassName?, children`.
  - **`footer?: React.ReactNode`** (Phase 3a) — si fourni, REMPLACE le footer
    canonique Annuler+submit. Le form rend sa propre navigation (wizard). Le
    reste du shell est inchangé. Sans `footer` → comportement Phase 1 strict.
  - **`bodyClassName?: string`** (Phase 3a) — classe additionnelle sur
    `.sheet__body` (layouts denses / wizard).
- **`FieldError`** : `<FieldError message={errors.x} />` — rien si `message`
  falsy, sinon `<span role="alert">`.
- **`EntityPicker`** : sélecteur truie/verrat, modes `chips` /
  `autocomplete`. Préserve l'a11y (`role=radio` + `aria-checked` /
  `role=listbox` + `role=option`). Extensions Phase 3a (toutes additives,
  défaut = comportement Phase 1) :
  - **`multi?: boolean`** — mode `chips` uniquement. `multi: true` change
    `value` en `ReadonlyArray<string>` et `onChange` en `(ids: string[]) =>
    void`. Les chips passent en `role="checkbox"` + `aria-checked` (sémantique
    correcte d'une multi-sélection ; un `radiogroup` n'autorise qu'un
    sélectionné). `EntityPickerProps` est désormais une **union discriminée**
    sur `mode` × `multi` — TS infère le bon type de `value`/`onChange`.
  - **`renderSubLabel?: (entity) => React.ReactNode`** — sous-titre par chip
    (ex. `J+12 · saillie du 03/05`), rendu dans `.radio-chip__sub`.
  - **`getAriaLabel?: (entity) => string`** — `aria-label` paramétré par
    entité. Fallback = `Sélectionner {entityLabel} {displayId}` (forme
    contractuelle attendue par les tests — NE PAS changer le fallback).
- **`useFocusFirstInput`** : reste appelé PAR LE FORM (la ref va sur son
  premier champ). Le shell ne peut pas la poser lui-même.
- **`useConfirmFlow`** (Phase 3a) : hook partagé Confirm Sevrage/Reforme. Émet
  désormais le toast de succès via `useToast()` (conforme au contrat — plus
  d'`IonToast` local). Les clés `toast` / `dismissToast` de
  `UseConfirmFlowState` restent exposées mais sont INERTES (`@deprecated`,
  compat consommateurs) — Phase 3b supprimera les `<IonToast>` morts dans
  QuickConfirmSevrageForm / QuickConfirmReformeForm.

---

## 3. Checklist de migration d'un form

1. **Imports** : retirer `IonModal` direct, `useAppToast`/`AppToast`, les
   helpers date locaux. Ajouter les briques partagées (§2).
2. **Toast** : `const { showToast } = useToast();`. Remplacer
   `show(msg, tone, { duration })` → `showToast(msg, type, duration)`.
   Supprimer `<AppToast {...toastProps} />` et le fragment `<>...</>` qui
   l'entourait.
3. **Conteneur** : remplacer le `<IonModal>...<div className="sheet">` (ou
   `<form>`) par `<QuickActionSheet ...>` ; le contenu de `.sheet__body`
   devient les `children`. Supprimer header/footer manuels.
4. **Submit** : le handler devient `(e: React.FormEvent) => { e.preventDefault(); ... }`
   et est passé en `onSubmit`. Plus de `onClick` sur le bouton.
5. **Validation** : si le form a déjà un `validateX` → garder. Sinon, en
   extraire un dans `quickXxxLogic.ts` au contrat `{ ok, errors, normalized }`.
   Stocker `errors` en state, afficher via `<FieldError>` sous chaque champ.
6. **Dates** : remplacer toute fonction "today" locale par `todayIso()` ;
   `isoDaysAgo(n)` pour les `min`, `formatFr()` pour l'affichage.
7. **Reset-on-open** : appliquer le pattern `lastOpenKey` (§4) si absent.
8. **Garde double-clic** : `closeTimerRef` + cleanup `useEffect` (§4).
9. **Picker** : si le form sélectionne une truie/verrat, passer à
   `<EntityPicker>`.
10. **Vérifier** : `npx tsc --noEmit` + `npx vitest run src/components/forms`
    verts. Si un test asserte une structure que le contrat change
    légitimement, adapter l'assertion ET le signaler.

### 3 bis. Checklist spécifique WIZARD (forms multi-étapes)

Pour les ~7 forms wizard (SplitBande, Mortality, SaillieBande,
AddBandeFromLoge, HealthLogPorcelet, SexSeparation, Pesee) — référence migrée :
**`QuickSplitBandeForm.tsx`** (3 étapes).

1. **Shell** : `<QuickActionSheet>` avec la prop `footer` — PAS de
   `<BottomSheet>` + `<Wizard>` DS. Le wizard garde IonModal + handle + header
   + a11y escape + le `<form onSubmit>` du shell.
2. **État `step`** : `useState<0 | 1 | … >(0)` local. Reset à `0` dans le
   bloc reset-on-open render-phase.
3. **Footer custom** : bouton gauche = `Annuler` (étape 0) ou `Retour`
   (`type="button"`, → `step-1`) ; bouton droit = `Suivant` (`type="button"`,
   valide l'étape courante avant `step+1`) ou, à la dernière étape, le bouton
   final en `type="submit"` (déclenche `onSubmit` du form — contrat respecté).
4. **Validation par étape** : `validateStepN()` appelée avant `Suivant` ;
   si invalide, on n'avance pas et on affiche l'erreur d'étape.
5. **`isValid`** du shell = condition de submit de la DERNIÈRE étape (sert
   d'indicateur ; le footer custom pilote l'activation réelle de ses boutons).
6. **`bodyClassName`** : utiliser pour les layouts denses (listes longues).
7. Reste du contrat (toast `useToast`, garde double-clic `closeTimerRef`,
   reset render-phase) : identique aux forms simples.

---

## 4. Patterns de référence (copier tel quel)

### Reset-on-open (render-phase, pas de useEffect)

```tsx
const [lastOpenKey, setLastOpenKey] = useState<{ isOpen: boolean; defaultX: string | undefined }>({
  isOpen, defaultX,
});
if (lastOpenKey.isOpen !== isOpen || lastOpenKey.defaultX !== defaultX) {
  setLastOpenKey({ isOpen, defaultX });
  if (isOpen) {
    // ... reset de tous les states du form ...
    setSaving(false);
  }
}
```

### Garde double-clic + cleanup

```tsx
const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => () => {
  if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
}, []);

// dans handleSubmit, après succès :
closeTimerRef.current = setTimeout(() => {
  closeTimerRef.current = null;
  setSaving(false);   // reset SEULEMENT ici (succès) ou dans le catch (retry)
  onClose();
}, 1500);
```

### handleClose

```tsx
const handleClose = useCallback(() => {
  if (saving) return;
  if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
  // ... reset éventuel ...
  onClose();
}, [onClose, saving]);
```

---

## 5. Avant / après (extrait Saillie)

**Avant** — `<div>` + `onClick`, helper date local, toast OK :

```tsx
const todayISO = (): string => new Date().toISOString().slice(0, 10); // bug UTC
// ...
<IonModal ...>
  <div className="ion-page pt-screen">
    <div className="sheet">
      <span className="sheet__handle" />
      <header className="sheet__head">...</header>
      <div className="sheet__body">
        <div className="radio-chips--cards" role="radiogroup">{/* map inline */}</div>
      </div>
      <footer className="sheet__foot">
        <button type="button" onClick={handleSave} disabled={!isValid || saving}>...</button>
      </footer>
    </div>
  </div>
</IonModal>
```

**Après** — shell partagé, `onSubmit`, helpers + picker partagés :

```tsx
import { todayIso, isoDaysAgo, formatFr } from './_formHelpers';
import { EntityPicker } from './_formFields';
import QuickActionSheet from './QuickActionSheet';
// ...
const handleSubmit = async (e: React.FormEvent): Promise<void> => {
  e.preventDefault();
  // ... resolve + insert + showToast + closeTimerRef ...
};

<QuickActionSheet
  isOpen={isOpen} onClose={handleClose}
  eyebrow="Nouvelle saillie" title="Saisir une saillie"
  saving={saving} isValid={isValid}
  onSubmit={handleSubmit} submitLabel="Confirmer la saillie"
>
  <div className="field">
    <label className="label--v77">TRUIE EN CHALEUR <span className="req">requis</span></label>
    <EntityPicker mode="chips" entities={truiesDisponibles}
      value={selectedTruie} onChange={setSelectedTruie}
      entityLabel="la truie" groupLabel="Truie"
      emptyText="Aucune truie disponible" disabled={saving} />
  </div>
  {/* ... autres champs ... */}
</QuickActionSheet>
```

---

## 6. Notes d'implémentation

- **`useToast` supporte le tone `warning`** depuis Phase 3a. Tones valides :
  `success` (vert) · `error` (rouge) · `warning` (orange, `color="warning"`) ·
  `info` (gris). Purement additif — les appels `success/error/info` existants
  sont inchangés. Ne plus réintroduire `useAppToast` pour un besoin `warning`.
- **`QuickActionSheet` ne rend pas de toast.** Le toast survit à la
  fermeture de la modale parce qu'il est monté au niveau App. C'est l'intérêt
  principal de `useToast` sur `useAppToast`.
- **a11y des pickers** : les `aria-label` `"Sélectionner la truie X"` /
  `"le verrat X"` sont contractuels — des tests s'y appuient. Ne pas les
  changer.
- **Barrels de re-export** (`export { ... } from './quickXxxHelpers'`) :
  les conserver tels quels en Phase 1 si des tests importent depuis le
  composant. Ne pas « nettoyer » sans vérifier les imports.
