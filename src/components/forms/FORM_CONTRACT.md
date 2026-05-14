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
  submitLabel, savingLabel?, submitAriaLabel?, submitDisabled?, children`.
- **`FieldError`** : `<FieldError message={errors.x} />` — rien si `message`
  falsy, sinon `<span role="alert">`.
- **`EntityPicker`** : sélecteur truie/verrat, modes `chips` /
  `autocomplete`. Préserve l'a11y (`role=radio` + `aria-checked` /
  `role=listbox` + `role=option`).
- **`useFocusFirstInput`** : reste appelé PAR LE FORM (la ref va sur son
  premier champ). Le shell ne peut pas la poser lui-même.

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

- **`useToast` ne supporte pas le tone `warning`** (seulement
  `success/error/info`). Aucun form de référence n'en avait besoin (MiseBas
  utilisait `useAppToast` mais seulement avec `success/error/info`). Si un
  form Phase 2 utilise réellement `warning`, l'étendre dans `ToastContext`
  (ajouter `'warning'` au type + `color="warning"`) plutôt que réintroduire
  `useAppToast`. À signaler à l'orchestrateur.
- **`QuickActionSheet` ne rend pas de toast.** Le toast survit à la
  fermeture de la modale parce qu'il est monté au niveau App. C'est l'intérêt
  principal de `useToast` sur `useAppToast`.
- **a11y des pickers** : les `aria-label` `"Sélectionner la truie X"` /
  `"le verrat X"` sont contractuels — des tests s'y appuient. Ne pas les
  changer.
- **Barrels de re-export** (`export { ... } from './quickXxxHelpers'`) :
  les conserver tels quels en Phase 1 si des tests importent depuis le
  composant. Ne pas « nettoyer » sans vérifier les imports.
