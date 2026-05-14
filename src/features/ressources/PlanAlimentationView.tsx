import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { AlertTriangle } from 'lucide-react';
import {
  Card,
  ListItem,
  Search,
  Section,
  Tabs,
  Tag,
} from '@/design-system';
import { PageHeader } from '../../v70/components/ds/PageHeader';
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

type TagVariant = 'default' | 'primary' | 'accent' | 'soft' | 'danger' | 'warning' | 'success';

/** Variant Tag DS selon statut de couverture. */
function coverageTagVariant(statut: FeedCoverage['statutCouverture']): TagVariant {
  switch (statut) {
    case 'CRITIQUE':
      return 'danger';
    case 'HAUTE':
      return 'warning';
    case 'OK':
      return 'success';
    default:
      return 'default';
  }
}

type CoverageFilter = 'all' | 'critique' | 'haute' | 'ok';

/**
 * PlanAlimentationView — Plan d'alimentation & couverture stocks.
 *
 * V44 archétype 3 — liste pure : Tabs (filtre urgence) + Search + Sections DS
 * + ListItem DS + Tag DS. Logique de calcul (`buildAlimentationPlan`,
 * `sortCoveragesByUrgency`) intacte. Lecture seule.
 */
const PlanAlimentationView: React.FC = () => {
  const navigate = useNavigate();
  const { truies, verrats, bandes, stockAliment } = useFarm();
  const [filter, setFilter] = useState<CoverageFilter>('all');
  const [query, setQuery] = useState('');

  const plan = useMemo(
    () => buildAlimentationPlan({ truies, verrats, bandes, stockAliment }),
    [truies, verrats, bandes, stockAliment]
  );

  const sortedCoverages = useMemo(
    () => sortCoveragesByUrgency(plan.coverages),
    [plan.coverages]
  );

  const filteredCoverages = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortedCoverages.filter(cov => {
      if (q && !cov.stock.libelle.toLowerCase().includes(q)) return false;
      if (filter === 'critique') return cov.statutCouverture === 'CRITIQUE';
      if (filter === 'haute') return cov.statutCouverture === 'HAUTE';
      if (filter === 'ok') return cov.statutCouverture === 'OK';
      return true;
    });
  }, [sortedCoverages, filter, query]);

  const counts = useMemo(() => {
    const out = { all: sortedCoverages.length, critique: 0, haute: 0, ok: 0 };
    for (const c of sortedCoverages) {
      if (c.statutCouverture === 'CRITIQUE') out.critique += 1;
      else if (c.statutCouverture === 'HAUTE') out.haute += 1;
      else if (c.statutCouverture === 'OK') out.ok += 1;
    }
    return out;
  }, [sortedCoverages]);

  const categoriesAvecConso = plan.categories.filter(c => c.consommationJournaliere > 0);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <div className="phone-content px-4 pt-5 pb-32 flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto', minHeight: '100%' }}>
          <PageHeader
            eyebrow="ALIMENTS · PLAN"
            title="Plan alimentaire"
            subtitle="Programme nutritionnel"
            onBack={() => navigate(-1)}
          />

            {/* ── Filtres + recherche dans une Card DS ──────────────── */}
            {sortedCoverages.length > 0 && (
              <Card compact>
                <div className="flex flex-col gap-3">
                  <Tabs
                    value={filter}
                    onChange={v => setFilter(v as CoverageFilter)}
                    options={[
                      { value: 'all', label: 'Tous', count: counts.all },
                      { value: 'critique', label: 'Critique', count: counts.critique },
                      { value: 'haute', label: 'Faible', count: counts.haute },
                      { value: 'ok', label: 'OK', count: counts.ok },
                    ]}
                    ariaLabel="Filtrer les stocks par couverture"
                  />
                  <Search
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onClear={() => setQuery('')}
                    placeholder="Rechercher un aliment…"
                    aria-label="Rechercher un aliment"
                  />
                </div>
              </Card>
            )}

            {/* ── Section catégories consommatrices ──────────────── */}
            {categoriesAvecConso.length > 0 && (
              <section>
                <Section label={`Par catégorie · ${categoriesAvecConso.length}`} />
                <Card compact className="!p-0 overflow-hidden">
                  {categoriesAvecConso.map(cat => (
                    <div key={cat.key}>
                      <ListItem
                        title={cat.label}
                        subtitle={`${cat.effectif} animaux · ${formatKg(cat.rationMoyenne)} kg/j/tête`}
                        tag={
                          <Tag variant="accent">
                            {`${formatKg(cat.consommationJournaliere)} kg/j`}
                          </Tag>
                        }
                      />
                    </div>
                  ))}
                </Card>
              </section>
            )}

            {/* ── Bandeau couverture critique (rupture imminente) ─── */}
            {counts.critique > 0 && (
              <div
                role="alert"
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  padding: '14px 16px',
                  background: 'var(--pt-danger-bg-soft)',
                  border: '1px solid var(--pt-danger)',
                  borderRadius: 14,
                }}
              >
                <AlertTriangle
                  size={20}
                  strokeWidth={2.2}
                  style={{ color: 'var(--pt-danger)', flexShrink: 0, marginTop: 1 }}
                  aria-hidden
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--pt-font-display)',
                      fontWeight: 800,
                      fontSize: 15,
                      textTransform: 'uppercase',
                      letterSpacing: '-0.005em',
                      color: 'var(--pt-danger)',
                    }}
                  >
                    {counts.critique} aliment{counts.critique > 1 ? 's' : ''} sous 7 jours de stock
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--pt-ink)', marginTop: 2, lineHeight: 1.4 }}>
                    Réappro urgente — rupture imminente, le cheptel risque d'être à court.
                  </div>
                </div>
              </div>
            )}

            {/* ── Section couverture stocks ──────────────────────── */}
            <section>
              <Section
                label={`Couverture stocks · ${filteredCoverages.length}`}
                tone={filter === 'critique' ? 'danger' : 'primary'}
              />
              {sortedCoverages.length === 0 ? (
                <Card compact>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--pt-muted)',
                      textAlign: 'center',
                      padding: '16px 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <AlertTriangle size={14} style={{ color: 'var(--pt-warning)' }} aria-hidden />
                    <span>Aucun aliment en stock — ajoute tes sacs depuis l'écran Aliments.</span>
                  </div>
                </Card>
              ) : filteredCoverages.length === 0 ? (
                <Card compact>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--pt-muted)',
                      textAlign: 'center',
                      padding: '16px 0',
                    }}
                  >
                    {query ? `Aucun résultat pour « ${query} ».` : 'Aucun aliment dans ce filtre.'}
                  </div>
                </Card>
              ) : (
                <Card compact className="!p-0 overflow-hidden">
                  {filteredCoverages.map(cov => (
                    <div key={cov.stock.id}>
                      <ListItem
                        title={cov.stock.libelle}
                        subtitle={`${formatKg(cov.stock.stockActuel)} ${cov.stock.unite} · ${formatCategoriesConsommatrices(cov.categoriesConsommatrices)}`}
                        tag={
                          <Tag variant={coverageTagVariant(cov.statutCouverture)} dot>
                            {`${formatJours(cov.joursCouverture)}j`}
                          </Tag>
                        }
                      />
                    </div>
                  ))}
                </Card>
              )}
            </section>

            {/* ── Footer synthèse globale (mono, sans StatsGrid) ────── */}
            {plan.consommationJournaliereTotale > 0 && (
              <div
                style={{
                  fontFamily: 'var(--pt-font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 11,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--pt-subtle)',
                  paddingTop: 4,
                  borderTop: '1px solid var(--pt-line)',
                }}
                aria-live="polite"
              >
                {`Conso ${formatKg(plan.consommationJournaliereTotale)} kg/j · Stock ${formatKg(plan.stockTotal)} kg · Couv. moy. ${formatJours(plan.joursCouvertureMoyenne)}j`}
              </div>
            )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PlanAlimentationView;
