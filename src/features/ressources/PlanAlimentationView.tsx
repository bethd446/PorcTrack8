import React, { useMemo } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { Wheat, Calculator, AlertTriangle } from 'lucide-react';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import AgritechNav from '../../components/AgritechNav';
import { Chip, DataRow, SectionDivider, KpiCard } from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';
import {
  buildAlimentationPlan,
  sortCoveragesByUrgency,
  type FeedCoverage,
  type CategoryConsumption,
} from '../../services/alimentationPlanner';

/**
 * Formate un nombre kg avec 1 décimale si fractionnaire, 0 sinon.
 * Affiche "—" si la valeur est 0.
 */
function formatKg(n: number): string {
  if (n === 0) return '—';
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
}

/** Formate les jours de couverture : "∞" si Infinity, sinon 1 décimale. */
function formatJours(j: number): string {
  if (!isFinite(j)) return '∞';
  if (j < 10) return j.toFixed(1);
  return Math.round(j).toString();
}

/** Libellé des catégories consommatrices pour affichage "Consommé par …". */
function formatCategoriesConsommatrices(cats: CategoryConsumption[]): string {
  if (cats.length === 0) return 'Non catégorisé';
  return cats.map(c => c.label.toLowerCase()).join(' + ');
}

/** Tone Chip selon statut de couverture. */
function coverageChipTone(statut: FeedCoverage['statutCouverture']): 'red' | 'amber' | 'default' | 'accent' {
  switch (statut) {
    case 'CRITIQUE':
      return 'red';
    case 'HAUTE':
      return 'amber';
    case 'OK':
      return 'accent';
    default:
      return 'default';
  }
}

/**
 * PlanAlimentationView — Plan d'alimentation & couverture stocks.
 *
 * Calcule en live (useMemo) :
 *  - La consommation journalière par catégorie (truies/verrats/porcelets).
 *  - Les jours de couverture par aliment en stock.
 *  - Un résumé global + sections triées par urgence.
 *
 * Lecture seule — aucune mutation du FarmContext.
 */
const PlanAlimentationView: React.FC = () => {
  const { truies, verrats, bandes, stockAliment } = useFarm();

  const plan = useMemo(
    () => buildAlimentationPlan({ truies, verrats, bandes, stockAliment }),
    [truies, verrats, bandes, stockAliment]
  );

  const sortedCoverages = useMemo(
    () => sortCoveragesByUrgency(plan.coverages),
    [plan.coverages]
  );

  // Regroupements par niveau d'urgence (une passe, pas N filter sur le tableau).
  const critiques = sortedCoverages.filter(c => c.statutCouverture === 'CRITIQUE');
  const hautes = sortedCoverages.filter(c => c.statutCouverture === 'HAUTE');
  const categoriesAvecConso = plan.categories.filter(c => c.consommationJournaliere > 0);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="PLAN ALIMENTATION"
            subtitle="Couverture stocks & rations"
          />

          <div className="px-4 pt-4 pb-8 flex flex-col gap-4">
            {/* ── Summary strip : 3 KPI ───────────────────────────── */}
            <div className="grid grid-cols-3 gap-2">
              <KpiCard
                label="Conso/j"
                value={formatKg(plan.consommationJournaliereTotale)}
                unit="kg"
                icon={<Calculator size={14} />}
              />
              <KpiCard
                label="Stock"
                value={formatKg(plan.stockTotal)}
                unit="kg"
                icon={<Wheat size={14} />}
              />
              <KpiCard
                label="Couv. moy."
                value={formatJours(plan.joursCouvertureMoyenne)}
                unit="j"
                tone={
                  !isFinite(plan.joursCouvertureMoyenne)
                    ? 'default'
                    : plan.joursCouvertureMoyenne < 7
                    ? 'critical'
                    : plan.joursCouvertureMoyenne < 14
                    ? 'warning'
                    : 'success'
                }
              />
            </div>

            {/* ── Stock critique (< 7j) ──────────────────────────── */}
            {critiques.length > 0 && (
              <section>
                <SectionDivider label="Stock critique" />
                <div className="card-dense !p-0 overflow-hidden">
                  {critiques.map(cov => (
                    <DataRow
                      key={cov.stock.id}
                      primary={cov.stock.libelle}
                      secondary={`${formatJours(cov.joursCouverture)}j · ${formatCategoriesConsommatrices(
                        cov.categoriesConsommatrices
                      )}`}
                      accessory={
                        <Chip
                          tone="red"
                          label={`${formatJours(cov.joursCouverture)}j`}
                        />
                      }
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Stock faible (< 14j) ───────────────────────────── */}
            {hautes.length > 0 && (
              <section>
                <SectionDivider label="Stock faible" />
                <div className="card-dense !p-0 overflow-hidden">
                  {hautes.map(cov => (
                    <DataRow
                      key={cov.stock.id}
                      primary={cov.stock.libelle}
                      secondary={`${formatJours(cov.joursCouverture)}j · ${formatCategoriesConsommatrices(
                        cov.categoriesConsommatrices
                      )}`}
                      accessory={
                        <Chip
                          tone="amber"
                          label={`${formatJours(cov.joursCouverture)}j`}
                        />
                      }
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Par catégorie ──────────────────────────────────── */}
            <section>
              <SectionDivider label="Par catégorie" />
              {categoriesAvecConso.length === 0 ? (
                <div className="card-dense text-[13px] text-text-2 text-center py-4">
                  Aucune catégorie active sur le troupeau.
                </div>
              ) : (
                <div className="card-dense !p-0 overflow-hidden">
                  {categoriesAvecConso.map(cat => (
                    <DataRow
                      key={cat.key}
                      primary={cat.label}
                      secondary={`${cat.effectif} animaux · ${formatKg(
                        cat.rationMoyenne
                      )} kg/j/tête`}
                      accessory={
                        <Chip
                          tone="accent"
                          label={`${formatKg(cat.consommationJournaliere)} kg/j`}
                        />
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ── Tous les stocks ────────────────────────────────── */}
            <section>
              <SectionDivider label="Tous les stocks" />
              {sortedCoverages.length === 0 ? (
                <div className="card-dense text-[13px] text-text-2 text-center py-4 flex items-center justify-center gap-2">
                  <AlertTriangle size={14} className="text-amber" />
                  <span>Aucun aliment en stock.</span>
                </div>
              ) : (
                <div className="card-dense !p-0 overflow-hidden">
                  {sortedCoverages.map(cov => (
                    <DataRow
                      key={cov.stock.id}
                      primary={cov.stock.libelle}
                      secondary={`${formatKg(cov.stock.stockActuel)} ${cov.stock.unite} · ${formatCategoriesConsommatrices(
                        cov.categoriesConsommatrices
                      )}`}
                      accessory={
                        <Chip
                          tone={coverageChipTone(cov.statutCouverture)}
                          label={`${formatJours(cov.joursCouverture)}j`}
                        />
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </AgritechLayout>
        <AgritechNav />
      </IonContent>
    </IonPage>
  );
};

export default PlanAlimentationView;
