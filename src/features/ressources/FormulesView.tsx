import React, { useMemo, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { ClipboardList, Calculator, AlertTriangle, Database, HardDrive } from 'lucide-react';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import AgritechNav from '../../components/AgritechNav';
import { Chip, SectionDivider } from '../../components/agritech';
import {
  PHASE_LABELS,
  PHASE_TONES,
  type FormuleAliment,
} from '../../config/aliments';
import { calculerRation, type CalculResult } from '../../services/rationCalculator';
import { useFarm } from '../../context/FarmContext';
import { cn } from '../../lib/utils';

/** Presets quantité — 100 kg (sac), 500 kg, 1 tonne, 2 tonnes. */
const PRESETS_KG: ReadonlyArray<{ label: string; value: number }> = [
  { label: '100 kg', value: 100 },
  { label: '500 kg', value: 500 },
  { label: '1 tonne', value: 1000 },
  { label: '2 tonnes', value: 2000 },
];

/** Formate un kg ingrédient : entier → sans décimale, sinon 1 décimale. */
function formatKg(n: number): string {
  if (!isFinite(n)) return '—';
  if (n === 0) return '0';
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
}

/** Bloc une formule — header + tables ingrédients / additifs. */
const FormuleCard: React.FC<{
  formule: FormuleAliment;
  calcul: CalculResult;
}> = ({ formule, calcul }) => {
  const tone = PHASE_TONES[formule.code];

  return (
    <section className="card-dense flex flex-col gap-3">
      {/* Header phase */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="agritech-heading text-[16px] uppercase leading-tight truncate">
            {formule.nom}
          </div>
          <div className="mt-1 font-mono text-[11px] text-text-2">
            {formule.phase} · {formule.poidsRange}
          </div>
        </div>
        <Chip tone={tone} label={PHASE_LABELS[formule.code]} />
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
            className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-1.5 bg-bg-2 text-[10px] uppercase tracking-wider text-text-2 font-mono"
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
              <span
                role="cell"
                className="font-mono tabular-nums text-right text-text-2"
              >
                {ing.pourcent}
              </span>
              <span
                role="cell"
                className="font-mono tabular-nums text-right text-text-0 font-semibold min-w-[56px]"
              >
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
              className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-1.5 bg-bg-2 text-[10px] uppercase tracking-wider text-text-2 font-mono"
              role="row"
            >
              <span role="columnheader">Nom</span>
              <span role="columnheader" className="text-right">Dose réf.</span>
              <span role="columnheader" className="text-right min-w-[72px]">
                Quantité
              </span>
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
                <span
                  role="cell"
                  className="font-mono tabular-nums text-right text-text-2"
                >
                  {add.doseRef}
                </span>
                <span
                  role="cell"
                  className="font-mono tabular-nums text-right text-text-0 font-semibold min-w-[72px]"
                >
                  {add.quantiteAffiche}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings éventuels (formule corrompue) */}
      {calcul.warnings.length > 0 && (
        <div
          className="flex items-center gap-2 text-[12px] text-amber"
          role="alert"
        >
          <AlertTriangle size={14} aria-hidden="true" />
          <span>{calcul.warnings[0]}</span>
        </div>
      )}
    </section>
  );
};

/**
 * FormulesView — 5 formules aliment validées + calculateur masse.
 *
 * Source : technicien K13 · avril 2026. Les quantités se recalculent
 * en temps réel via `calculerRation` lorsque la masse change (input
 * libre ou preset). `useMemo` par formule pour éviter de recalculer
 * les 5 formules à chaque keystroke du champ masse.
 */
const FormulesView: React.FC = () => {
  const [masseKg, setMasseKg] = useState<number>(1000);
  const { alimentFormules, dataSource } = useFarm();

  // Calcul réactif des formules — recalcul si masse OU formules changent.
  const calculs = useMemo(
    () =>
      alimentFormules.map((f) => ({
        formule: f,
        calcul: calculerRation(f, masseKg),
      })),
    [masseKg, alimentFormules],
  );

  // Indicateur discret de la source des formules (Sheets vs cache local).
  const sourceLabel =
    dataSource === 'NETWORK' ? 'Google Sheets'
    : dataSource === 'CACHE' ? 'Cache local'
    : 'Valeurs par défaut';
  const SourceIcon = dataSource === 'NETWORK' ? Database : HardDrive;

  const handleMasseChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const v = Number(e.target.value);
    if (Number.isFinite(v) && v >= 0) setMasseKg(v);
    else if (e.target.value === '') setMasseKg(0);
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="FORMULES ALIMENT"
            subtitle="Validé par technicien · 04/2026"
            backTo="/ressources/aliments"
          />

          <div className="px-4 pt-4 pb-8 flex flex-col gap-4">
            {/* ── Calculateur ──────────────────────────────────────── */}
            <section className="card-dense flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Calculator size={16} className="text-accent" aria-hidden="true" />
                <span className="agritech-heading text-[15px] uppercase">
                  Calculateur
                </span>
              </div>

              <div>
                <label
                  htmlFor="masse-aliment"
                  className="kpi-label block mb-1.5"
                >
                  Quantité d'aliment à préparer (kg)
                </label>
                <input
                  id="masse-aliment"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={50}
                  value={masseKg}
                  onChange={handleMasseChange}
                  aria-describedby="masse-aliment-help"
                  className="w-full h-11 px-3 bg-bg-2 border border-border rounded-md font-mono tabular-nums text-[16px] text-text-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1"
                />
                <p
                  id="masse-aliment-help"
                  className="mt-1 font-mono text-[11px] text-text-2"
                >
                  Les quantités ci-dessous se recalculent automatiquement.
                </p>
              </div>

              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Préréglages de masse"
              >
                {PRESETS_KG.map((p) => {
                  const active = masseKg === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setMasseKg(p.value)}
                      aria-pressed={active}
                      className={cn(
                        'pressable inline-flex items-center justify-center h-8 px-3 rounded-full text-[12px] font-mono uppercase tracking-wide border transition-colors',
                        active
                          ? 'bg-accent text-bg-0 border-accent'
                          : 'bg-bg-2 text-text-1 border-border hover:border-accent/60',
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── Formules + indicateur source ─────────────────────── */}
            <SectionDivider label={`${alimentFormules.length} formules`} />

            {/* Chip source — discret, mono, text-text-2 */}
            <div
              className="flex items-center gap-1.5 -mt-1 font-mono text-[11px] text-text-2"
              role="status"
              aria-label={`Source des formules : ${sourceLabel}`}
            >
              <SourceIcon size={11} aria-hidden="true" />
              <span>Source : {sourceLabel}</span>
            </div>

            {alimentFormules.length === 0 ? (
              <section
                className="flex flex-col items-center justify-center py-16 px-8 text-center animate-fade-in-up"
                role="status"
              >
                <div className="w-20 h-20 rounded-2xl bg-bg-1 border border-border flex items-center justify-center mb-4 text-text-2">
                  <ClipboardList size={40} aria-hidden="true" />
                </div>
                <h3 className="ft-heading text-text-0 text-[18px] mb-2 uppercase tracking-wide">
                  Aucune formule
                </h3>
                <p className="text-text-2 text-[13px] max-w-xs leading-relaxed">
                  Ajoutez l'onglet{' '}
                  <span className="font-mono text-text-1">ALIMENT_FORMULES</span>{' '}
                  dans Sheets, ou utilisez les formules de démo.
                </p>
              </section>
            ) : (
              <div
                className="flex flex-col gap-3"
                aria-live="polite"
                aria-atomic="false"
              >
                {calculs.map(({ formule, calcul }) => (
                  <FormuleCard
                    key={formule.code}
                    formule={formule}
                    calcul={calcul}
                  />
                ))}
              </div>
            )}

            {/* ── Footer — lien vers Plan Alimentation ─────────────── */}
            <footer className="card-dense flex items-start gap-2">
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
            </footer>
          </div>
        </AgritechLayout>
        <AgritechNav />
      </IonContent>
    </IonPage>
  );
};

export default FormulesView;
