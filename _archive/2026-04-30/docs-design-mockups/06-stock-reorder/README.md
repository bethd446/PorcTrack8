# Stock reorder sheet (06-stock-reorder)

Sheet uniquement — déclenché depuis l'écran **Ressources** quand l'utilisateur appuie sur le bouton `+` d'une ligne stock.

## Source

Extrait de `_shared/App.jsx` — chercher le bloc :

```jsx
<BottomSheet open={sheet === 'reorder'} onClose={() => setSheet(null)} title={...}>
  ...
</BottomSheet>
```

Le state `reorderItem` est passé par `openReorder(item)` appelé depuis `RessourcesScreen` via la prop `onReorder`.

## Port Ionic React

```tsx
<IonModal isOpen={reorderOpen} onDidDismiss={closeReorder} breakpoints={[0, 0.9]} initialBreakpoint={0.9}>
  {/* ... contenu du sheet */}
</IonModal>
```
