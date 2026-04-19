# Agritech Primitives — Usage

Cheat-sheet pour les 6 primitives `src/components/agritech/*` + le wrapper `AgritechLayout`
et la barre `AgritechNav`. Dark cockpit, coexistent avec les composants `premium-*` existants.

```tsx
import {
  KpiCard, HubTile, BottomSheet, DataRow, Chip, SectionDivider,
} from '@/components/agritech';
import AgritechLayout from '@/components/AgritechLayout';
import AgritechNav from '@/components/AgritechNav';
```

---

## Squelette d'un écran agritech

```tsx
<IonPage>
  <IonContent fullscreen className="ion-no-padding">
    <AgritechLayout>
      <PremiumHeader title="Cockpit" subtitle="Temps réel" />
      <div className="px-4 pt-4 space-y-4">
        {/* sections */}
      </div>
    </AgritechLayout>
    <AgritechNav />
  </IonContent>
</IonPage>
```

---

## KpiCard

Carte KPI dense (label + valeur mono + delta + icône).

```tsx
<KpiCard label="Truies pleines" value={12} unit="/17" />

<KpiCard
  label="GMQ post-sev"
  value="512"
  unit="g/j"
  delta={+18}
  deltaLabel="vs 7j"
  tone="success"
/>

<KpiCard
  label="Mortalité"
  value="3.2"
  unit="%"
  delta={-0.8}
  deltaLabel="vs cible"
  tone="critical"
  onClick={() => navigate('/pilotage/alertes')}
/>

<KpiCard
  label="Stock aliment"
  value={248}
  unit="kg"
  icon={<Wheat size={14} />}
  tone="warning"
/>
```

---

## HubTile

Tuile d'entrée vers un sous-hub (icône + titre + compteur + chevron).

```tsx
<HubTile icon={<TruieIcon size={22} />} title="Truies" count={17} to="/troupeau/truies" tone="accent" />

<HubTile
  icon={<Wheat size={22} />}
  title="Aliments"
  subtitle="Plan d'alimentation"
  count={5}
  to="/ressources/aliments"
  tone="amber"
/>

<HubTile icon={<Settings size={22} />} title="Réglages" to="/pilotage/reglages" />
```

---

## BottomSheet

Sheet bas d'écran (IonModal sous le capot) pour les saisies / actions secondaires.

```tsx
const [open, setOpen] = useState(false);

<BottomSheet isOpen={open} onClose={() => setOpen(false)} title="Quick Soin">
  <form className="space-y-4">…</form>
</BottomSheet>

<BottomSheet isOpen={open} onClose={() => setOpen(false)} title="Saisie pesées" height="full">
  <PeseeForm />
</BottomSheet>
```

---

## DataRow

Ligne dense d'une liste verticale (pas une `<table>`).

```tsx
<DataRow primary="T-142" secondary="Pleine · J-3 MB" meta="3kg/j" />

<DataRow
  primary="B24-03"
  secondary="Sevré · 28 porcelets"
  meta={<Chip label="J+21" tone="accent" />}
  accessory={<ChevronRight size={16} className="text-text-2" />}
  onClick={() => navigate('/troupeau/bandes/B24-03')}
/>

<DataRow primary="Aliment Truie Gesta" meta="0 kg" tone="muted" />
```

---

## Chip

Petit badge pill (statut, catégorie). Tous utilisent le font mono.

```tsx
<Chip label="Pleine" tone="accent" />
<Chip label="Rupture" tone="red" />
<Chip label="J+21" tone="amber" size="xs" />
<Chip label="Info" tone="blue" />
<Chip label="GMQ" tone="gold" />
```

---

## SectionDivider

Séparateur de section avec filet accent + label mono uppercase.

```tsx
<SectionDivider label="Alertes critiques" />

<SectionDivider
  label="Mes truies"
  action={
    <button className="font-mono text-[11px] text-accent uppercase">Voir tout</button>
  }
/>
```

---

## Conventions

- Pas de `style={{}}` inline pour les couleurs — utiliser les classes Tailwind sur tokens (`text-accent`, `border-border`, `bg-bg-1`).
- Valeurs numériques toujours en font mono (`.kpi-value`, `font-mono tabular-nums`).
- `transition-colors` / `transition-transform` — jamais `transition-all`.
- `.pressable` sur tout bouton tactile.
- `aria-label` sur les boutons icon-only.
