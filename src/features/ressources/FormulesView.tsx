import React, { useMemo, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { ClipboardList, Calculator, AlertTriangle } from 'lucide-react';
import AgritechLayout from '../../components/AgritechLayout';
import EmptyState from '../../components/design/EmptyState';
import {
  PHASE_LABELS,
  PHASE_TONES,
  type FormuleAliment,
} from '../../config/aliments';
import { calculerRation, type CalculResult } from '../../services/rationCalculator';
import { useFarm } from '../../context/FarmContext';
import { Button, Card, FormField, Input, Section, Tabs, Tag } from '@/design-system';
import { PageHeader } from '../../v70/components/ds/PageHeader';

/** Presets quantité — 100 kg (sac), 500 kg, 1 tonne, 2 tonnes. */
const PRESETS_KG: ReadonlyArray<{ label: string; value: number }> = [
  { label: '100 kg', value: 100 },
  { label: '500 kg', value: 500 },
  { label: '1 tonne', value: 1000 },
  { label: '2 tonnes', value: 2000 },
];

type TagVariant = 'default' | 'primary' | 'accent' | 'soft' | 'danger' | 'warning' | 'success';

/** Mappe un PHASE_TONE legacy → variant Tag DS. */
function phaseTagVariant(code: keyof typeof PHASE_TONES): TagVariant {
  switch (PHASE_TONES[code]) {
    case 'amber':
      return 'warning';
    case 'accent':
      return 'accent';
    case 'blue':
      return 'soft';
    case 'gold':
      return 'primary';
    default:
      return 'default';
  }
}

/** Formate un kg ingrédient : entier → sans décimale, sinon 1 décimale. */
function formatKg(n: number): string {
  if (!isFinite(n)) return '—';
  if (n === 0) return '0';
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
}

/** Bloc une formule — header + tables ingrédients / additifs (Card DS). */
const FormuleCard: React.FC<{
  formule: FormuleAliment;
  calcul: CalculResult;
}> = ({ formule, calcul }) => {
  return (
    <Card compact>
      <div className="flex flex-col gap-3">
        {/* Header phase */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="agritech-heading text-[16px] uppercase leading-tight truncate">
              {formule.nom}
            </div>
            <div className="mt-1 text-[11px] text-text-2">
              {formule.phase} · {formule.poidsRange}
            </div>
          </div>
          <Tag variant={phaseTagVariant(formule.code)}>
            {PHASE_LABELS[formule.code]}
          </Tag>
        </div>

        {/* Ingrédients */}
        <div>
          <div className="kpi-label mb-1.5">Ingrédients</div>
          <div
            className="overflow-hidden rounded-md border border-border"
            role="table"
            aria-label={`Ingrédients ${formule.nom}`}
          >
            <div
              className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-1.5 bg-bg-2 text-[10px] uppercase tracking-wider text-text-2"
              role="row"
            >
              <span role="columnheader">Nom</span>
              <span role="columnheader" className="text-right">%</span>
              <span role="columnheader" className="text-right min-w-[56px]">kg</span>
            </div>
            {calcul.ingredients.map((ing) => (
              <div
                key={ing.nom}
                role="row"
                className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-2 text-[13px] border-t border-border first:border-t-0"
              >
                <span role="cell" className="text-text-1 truncate">
                  {ing.nom}
                </span>
                <span role="cell" className="tabular-nums text-right text-text-2">
                  {ing.pourcent}
                </span>
                <span role="cell" className="tabular-nums text-right text-text-0 font-semibold min-w-[56px]">
                  {formatKg(ing.kg)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Additifs */}
        {formule.additifs.length > 0 && (
          <div>
            <div className="kpi-label mb-1.5">Additifs</div>
            <div
              className="overflow-hidden rounded-md border border-border"
              role="table"
              aria-label={`Additifs ${formule.nom}`}
            >
              <div
                className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-1.5 bg-bg-2 text-[10px] uppercase tracking-wider text-text-2"
                role="row"
              >
                <span role="columnheader">Nom</span>
                <span role="columnheader" className="text-right">Dose réf.</span>
                <span role="columnheader" className="text-right min-w-[72px]">Quantité</span>
              </div>
              {calcul.additifs.map((add) => (
                <div
                  key={add.nom}
                  role="row"
                  className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-2 text-[13px] border-t border-border first:border-t-0"
                >
                  <span role="cell" className="text-text-1 truncate">
                    {add.nom}
                  </span>
                  <span role="cell" className="tabular-nums text-right text-text-2">
                    {add.doseRef}
                  </span>
                  <span role="cell" className="tabular-nums text-right text-text-0 font-semibold min-w-[72px]">
                    {add.quantiteAffiche}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings éventuels (formule corrompue) */}
        {calcul.warnings.length > 0 && (
          <div className="flex items-center gap-2 text-[12px] text-amber" role="alert">
            <AlertTriangle size={14} aria-hidden="true" />
            <span>{calcul.warnings[0]}</span>
          </div>
        )}
      </div>
    </Card>
  );
};

/**
 * FormulesView — 5 formules aliment validées + calculateur masse.
 *
 * V44 archétype 3 — Tabs DS (filtre phase) + Card DS pour le calculateur,
 * Section DS pour le label de section, Tag DS pour la phase. Logique
 * `calculerRation` intacte (1 useMemo par formule).
 */
const FormulesView: React.FC = () => {
  const [masseKg, setMasseKg] = useState<number>(1000);
  const [filter, setFilter] = useState<string>('all');
  const { alimentFormules } = useFarm();

  // Calcul réactif des formules — recalcul si masse OU formules changent.
  const calculs = useMemo(
    () =>
      alimentFormules.map((f) => ({
        formule: f,
        calcul: calculerRation(f, masseKg),
      })),
    [masseKg, alimentFormules],
  );

  const filterOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string }> = [
      { value: 'all', label: 'Toutes' },
    ];
    for (const f of alimentFormules) {
      opts.push({ value: f.code, label: PHASE_LABELS[f.code] ?? f.code });
    }
    return opts;
  }, [alimentFormules]);

  const filteredCalculs = useMemo(
    () => (filter === 'all' ? calculs : calculs.filter(c => c.formule.code === filter)),
    [calculs, filter],
  );

  const handleMasseChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const v = Number(e.target.value);
    if (Number.isFinite(v) && v >= 0) setMasseKg(v);
    else if (e.target.value === '') setMasseKg(0);
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <div className="px-4 pt-5 pb-32 flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
            <PageHeader
              eyebrow="ALIMENTS · FORMULES"
              title="Formules"
              subtitle="Compositions alimentaires"
            />

            {/* ── Calculateur (Card DS) ────────────────────────────── */}
            <Card compact>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Calculator size={16} className="text-accent" aria-hidden="true" />
                  <span className="agritech-heading text-[15px] uppercase">
                    Calculateur
                  </span>
                </div>

                <FormField
                  label="Quantité d'aliment à préparer (kg)"
                  hint="Les quantités ci-dessous se recalculent automatiquement."
                >
                  <Input
                    id="masse-aliment"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={50}
                    value={masseKg}
                    onChange={handleMasseChange}
                  />
                </FormField>

                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label="Préréglages de masse"
                >
                  {PRESETS_KG.map((p) => {
                    const active = masseKg === p.value;
                    return (
                      <Button
                        key={p.value}
                        variant={active ? 'primary' : 'secondary'}
                        size="small"
                        onClick={() => setMasseKg(p.value)}
                        aria-pressed={active}
                      >
                        {p.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* ── Tabs DS — filtre phase ────────────────────────────── */}
            {alimentFormules.length > 0 && (
              <Card compact>
                <Tabs
                  value={filter}
                  onChange={setFilter}
                  options={filterOptions}
                  ariaLabel="Filtrer les formules par phase"
                />
              </Card>
            )}

            {/* ── Section liste formules ────────────────────────────── */}
            <Section label={`${filteredCalculs.length} formule${filteredCalculs.length > 1 ? 's' : ''}`} />

            {alimentFormules.length === 0 ? (
              <EmptyState
                icon={<ClipboardList size={32} aria-hidden="true" />}
                title="Aucune formule"
                description="Ajoute l'onglet ALIMENT_FORMULES dans Sheets, ou utilise les formules de démo."
              />
            ) : filteredCalculs.length === 0 ? (
              <EmptyState
                icon={<ClipboardList size={32} aria-hidden="true" />}
                title="Aucune formule dans ce filtre"
                description="Sélectionne « Toutes » pour voir toutes les formules disponibles."
              />
            ) : (
              <div
                className="flex flex-col gap-3"
                aria-live="polite"
                aria-atomic="false"
              >
                {filteredCalculs.map(({ formule, calcul }) => (
                  <FormuleCard
                    key={formule.code}
                    formule={formule}
                    calcul={calcul}
                  />
                ))}
              </div>
            )}

            {/* ── Footer — lien vers Plan Alimentation ─────────────── */}
            <Card compact>
              <div className="flex items-start gap-2">
                <ClipboardList
                  size={16}
                  className="mt-0.5 text-accent shrink-0"
                  aria-hidden="true"
                />
                <p className="text-[12px] text-text-2 leading-relaxed">
                  Pour les rations journalières par catégorie et la couverture
                  des stocks, voir{' '}
                  <a
                    href="/ressources/aliments/plan"
                    className="text-accent underline underline-offset-2"
                  >
                    Plan Alimentation
                  </a>
                  .
                </p>
              </div>
            </Card>
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default FormulesView;
