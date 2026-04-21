import React, { useMemo, useState } from 'react';
import { IonContent, IonPage, IonToast } from '@ionic/react';
import {
  Package,
  AlertOctagon,
  Wheat,
  FlaskConical,
  Box,
  Scale,
  Plus,
} from 'lucide-react';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import AgritechNav from '../../components/AgritechNav';
import { Chip, DataRow, SectionDivider, KpiCard } from '../../components/agritech';
import type { ChipTone } from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';
import type { StockAliment, StockStatut } from '../../types/farm';
import QuickAddAlimentForm from '../../components/forms/QuickAddAlimentForm';

/**
 * AlimentsView — stock aliments structuré par catégorie métier.
 *
 * Route : `/stock`, `/stock/aliments`, `/ressources/aliments`
 *
 * Remplace l'ancien `<TableView tableKey="STOCK_ALIMENTS" />` (écran blanc
 * intermittent + zéro structure).
 *
 * Sections :
 *   1. Matières premières  — céréales, tourteaux, sons (base des mélanges)
 *   2. Concentrés & compléments  — KPC, Mycofix, Romelko, AMV, additifs
 *   3. Autres  — tout ce qui ne tombe pas dans les 2 catégories ci-dessus
 *
 * Chaque section : DataRow triés RUPTURE → BAS → OK puis alphabétique FR.
 * Bannière rouge en tête si ≥1 produit en rupture.
 *
 * Lecture seule : aucune mutation du FarmContext. Tap = placeholder (futur
 * éditeur). La vue reste fonctionnelle même si `stockAliment` est vide
 * (empty state dédié). Aucun early return `null` sur chargement — on s'appuie
 * sur les données déjà hydratées par `FarmProvider` au démarrage.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Catégorisation
// ─────────────────────────────────────────────────────────────────────────────

type AlimentCategorie = 'MATIERE_PREMIERE' | 'CONCENTRE' | 'AUTRE';

/**
 * Classifie un aliment via regex sur son libellé (et fallback sur son ID).
 *
 * Matières premières : maïs, tourteau de soja, son de blé/riz, orge, blé.
 * Concentrés       : KPC, Romelko, Vitafaf, Mycofix, AMV, lysine, méthionine,
 *                    phytase, prémix, vitamine.
 * Autres           : aliments composés déjà formulés (TRUIE-GEST, PORCELET…)
 *                    et tout ce qui ne matche pas.
 */
export function categoriserAliment(libelle: string, id?: string): AlimentCategorie {
  const s = `${libelle} ${id ?? ''}`.toLowerCase();
  if (
    /ma[iï]s|tourteau.*soja|soja.*tourteau|son.*bl[eé]|son.*riz|orge|\bbl[eé]\b/i.test(
      s
    )
  ) {
    return 'MATIERE_PREMIERE';
  }
  if (
    /kpc|romelko|vitafaf|mycofix|\bamv\b|lysine|m[eé]thionine|phytase|pr[eé]mix|vitamine/i.test(
      s
    )
  ) {
    return 'CONCENTRE';
  }
  return 'AUTRE';
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers tri / chip
// ─────────────────────────────────────────────────────────────────────────────

const STATUT_PRIORITY: Record<string, number> = {
  RUPTURE: 0,
  BAS: 1,
  OK: 2,
};

function priorityOf(statut: StockStatut | undefined): number {
  if (!statut) return 3;
  return STATUT_PRIORITY[statut] ?? 3;
}

function chipToneForStatut(statut: StockStatut | undefined): ChipTone {
  if (statut === 'RUPTURE') return 'red';
  if (statut === 'BAS') return 'amber';
  if (statut === 'OK') return 'accent';
  return 'default';
}

function labelForStatut(statut: StockStatut | undefined): string {
  if (!statut) return '—';
  return String(statut);
}

/** Poids estimé en kg si l'unité est kg ou sac (1 sac ≈ 50 kg standard). */
function poidsEstimeKg(item: StockAliment): number {
  const u = item.unite.toLowerCase();
  if (u === 'kg') return item.stockActuel;
  if (u === 'sac' || u === 'sacs') return item.stockActuel * 50;
  if (u === 't' || u === 'tonne' || u === 'tonnes') return item.stockActuel * 1000;
  return 0;
}

function formatKg(n: number): string {
  if (n === 0) return '—';
  if (n >= 1000) {
    return `${(n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} t`;
  }
  return `${Math.round(n).toLocaleString('fr-FR')} kg`;
}

function sortAliments(items: StockAliment[]): StockAliment[] {
  return [...items].sort((a, b) => {
    const diff = priorityOf(a.statutStock) - priorityOf(b.statutStock);
    if (diff !== 0) return diff;
    return a.libelle.localeCompare(b.libelle, 'fr');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sous-sections
// ─────────────────────────────────────────────────────────────────────────────

interface AlimentSectionProps {
  title: string;
  icon: React.ReactNode;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: { label: string; onClick: () => void };
  items: StockAliment[];
  onSelect: (item: StockAliment) => void;
}

const AlimentSection: React.FC<AlimentSectionProps> = ({
  title,
  icon,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  items,
  onSelect,
}) => {
  const isEmpty = items.length === 0;
  return (
    <section role="region" aria-label={title}>
      <SectionDivider label={title} />
      {isEmpty ? (
        <div
          className="flex flex-col items-center justify-center py-10 px-6 text-center animate-fade-in-up"
          role="status"
          aria-label={`${title} — ${emptyTitle}`}
        >
          <div className="w-16 h-16 rounded-2xl bg-bg-1 border border-border flex items-center justify-center mb-3 text-text-2">
            {emptyIcon}
          </div>
          <h4 className="ft-heading text-text-0 text-[15px] mb-1.5 uppercase tracking-wide">
            {emptyTitle}
          </h4>
          <p className="text-text-2 text-[12px] max-w-xs leading-relaxed">
            {emptyDescription}
          </p>
          {emptyAction ? (
            <button
              type="button"
              onClick={emptyAction.onClick}
              className="pressable mt-4 h-10 px-4 rounded-md bg-accent text-bg-0 text-[12px] font-medium transition-colors"
            >
              {emptyAction.label}
            </button>
          ) : null}
          {/* Icon legacy (keeps hint for screen readers) */}
          <span className="sr-only" aria-hidden="true">
            {icon}
          </span>
        </div>
      ) : (
        <div className="card-dense !p-0 overflow-hidden">
          {items.map(item => {
            const tone = chipToneForStatut(item.statutStock);
            const seuil =
              typeof item.seuilAlerte === 'number' && item.seuilAlerte > 0
                ? item.seuilAlerte
                : null;
            const meta =
              seuil !== null
                ? `${item.stockActuel}/${seuil} ${item.unite}`
                : `${item.stockActuel} ${item.unite}`;
            return (
              <DataRow
                key={item.id || item.libelle}
                primary={item.libelle || item.id}
                secondary={item.notes || undefined}
                meta={meta}
                accessory={<Chip tone={tone} label={labelForStatut(item.statutStock)} />}
                onClick={() => onSelect(item)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const AlimentsView: React.FC = () => {
  const { stockAliment } = useFarm();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const grouped = useMemo(() => {
    const matieres: StockAliment[] = [];
    const concentres: StockAliment[] = [];
    const autres: StockAliment[] = [];

    for (const item of stockAliment) {
      const cat = categoriserAliment(item.libelle, item.id);
      if (cat === 'MATIERE_PREMIERE') matieres.push(item);
      else if (cat === 'CONCENTRE') concentres.push(item);
      else autres.push(item);
    }

    return {
      matieres: sortAliments(matieres),
      concentres: sortAliments(concentres),
      autres: sortAliments(autres),
    };
  }, [stockAliment]);

  const summary = useMemo(() => {
    const total = stockAliment.length;
    const rupture = stockAliment.filter(s => s.statutStock === 'RUPTURE').length;
    const poidsKg = stockAliment.reduce((sum, item) => sum + poidsEstimeKg(item), 0);
    return { total, rupture, poidsKg };
  }, [stockAliment]);

  const handleSelect = (_item: StockAliment) => {
    // Placeholder — édition stock arrivera dans un prochain sprint.
    // Pour l'instant, on évite de rediriger vers TableView legacy pour ne
    // pas ré-exposer le bug blank-screen.
  };

  const isEmpty = stockAliment.length === 0;

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="STOCK ALIMENTS"
            subtitle="Matières premières & concentrés"
            backTo="/ressources"
            action={
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                aria-label="Ajouter un nouvel aliment"
                className="inline-flex h-9 items-center gap-1.5 px-3 rounded-md bg-accent text-bg-0 font-mono text-[11px] font-bold uppercase tracking-wide transition-colors duration-150 hover:brightness-110 active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                <Plus size={14} aria-hidden="true" />
                <span>Nouvel aliment</span>
              </button>
            }
          />

          <div className="px-4 pt-4 pb-8 flex flex-col gap-4">
            {/* ── Summary strip : 3 KpiCards ──────────────────────── */}
            <div className="grid grid-cols-3 gap-2">
              <KpiCard
                label="Total produits"
                value={summary.total}
                icon={<Package size={14} />}
              />
              <KpiCard
                label="En rupture"
                value={summary.rupture}
                icon={<AlertOctagon size={14} />}
                tone={summary.rupture > 0 ? 'critical' : 'default'}
              />
              <KpiCard
                label="Poids estimé"
                value={formatKg(summary.poidsKg)}
                icon={<Scale size={14} />}
              />
            </div>

            {/* ── Bannière alerte rupture ─────────────────────────── */}
            {summary.rupture > 0 ? (
              <div
                className="card-dense flex items-start gap-3 border-l-2 border-l-red"
                role="alert"
                aria-label="Alerte rupture stock"
              >
                <AlertOctagon
                  size={18}
                  className="shrink-0 text-red mt-0.5"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-text-0">
                    {summary.rupture} matière{summary.rupture > 1 ? 's' : ''} en rupture
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-text-2">
                    Commander d'urgence — production à l'arrêt si non réapprovisionné.
                  </div>
                </div>
              </div>
            ) : null}

            {/* ── Empty state global ──────────────────────────────── */}
            {isEmpty ? (
              <div
                className="flex flex-col items-center justify-center py-16 px-8 text-center animate-fade-in-up"
                role="status"
              >
                <div className="w-20 h-20 rounded-2xl bg-bg-1 border border-border flex items-center justify-center mb-4 text-text-2">
                  <Package size={40} />
                </div>
                <h3 className="ft-heading text-text-0 text-[18px] mb-2 uppercase tracking-wide">
                  Stock aliments vide
                </h3>
                <p className="text-text-2 text-[13px] max-w-xs leading-relaxed">
                  Aucun aliment n'est enregistré dans la feuille STOCK_ALIMENTS. Ajoutez matières premières et concentrés depuis Google Sheets.
                </p>
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="pressable mt-5 h-11 px-5 rounded-md bg-accent text-bg-0 text-[13px] font-medium transition-colors inline-flex items-center gap-2"
                >
                  <Plus size={16} aria-hidden="true" />
                  Ajouter un aliment
                </button>
              </div>
            ) : (
              <>
                <AlimentSection
                  title="Matières premières"
                  icon={<Wheat size={14} />}
                  emptyIcon={<Wheat size={40} />}
                  emptyTitle="Aucune matière première"
                  emptyDescription="Ajoutez maïs, tourteau de soja ou son de blé dans Google Sheets."
                  items={grouped.matieres}
                  onSelect={handleSelect}
                />

                <AlimentSection
                  title="Concentrés & compléments"
                  icon={<FlaskConical size={14} />}
                  emptyIcon={<FlaskConical size={40} />}
                  emptyTitle="Aucun concentré"
                  emptyDescription="Ajoutez KPC, Mycofix, Lysine… dans Google Sheets."
                  emptyAction={{
                    label: 'Voir Sheets',
                    onClick: () =>
                      setToastMsg('Édite STOCK_ALIMENTS dans Google Sheets'),
                  }}
                  items={grouped.concentres}
                  onSelect={handleSelect}
                />

                {grouped.autres.length > 0 ? (
                  <AlimentSection
                    title="Autres aliments"
                    icon={<Box size={14} />}
                    emptyIcon={<Box size={40} />}
                    emptyTitle="Aucun autre aliment"
                    emptyDescription="Les aliments composés (TRUIE-GEST, PORCELET…) apparaîtront ici."
                    items={grouped.autres}
                    onSelect={handleSelect}
                  />
                ) : null}
              </>
            )}
          </div>
        </AgritechLayout>
        <AgritechNav />

        <QuickAddAlimentForm
          isOpen={addOpen}
          onClose={() => setAddOpen(false)}
        />

        <IonToast
          isOpen={toastMsg !== null}
          message={toastMsg ?? ''}
          duration={2400}
          onDidDismiss={() => setToastMsg(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default AlimentsView;
