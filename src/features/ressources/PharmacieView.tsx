import React, { useMemo, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { Package, Box, AlertOctagon, Plus } from 'lucide-react';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import AgritechNav from '../../components/AgritechNav';
import { Chip, DataRow, SectionDivider, KpiCard } from '../../components/agritech';
import type { ChipTone } from '../../components/agritech';
import { SeringueIcon } from '../../components/icons';
import { useFarm } from '../../context/FarmContext';
import type { StockVeto, StockStatut } from '../../types/farm';
import QuickAddVetoForm from '../../components/forms/QuickAddVetoForm';

/**
 * Priorité d'affichage : RUPTURE (urgent) > BAS > OK.
 * Statuts inconnus (legacy) se placent après OK.
 */
const STATUT_PRIORITY: Record<string, number> = {
  RUPTURE: 0,
  BAS: 1,
  OK: 2,
};

function priorityOf(statut: StockStatut | undefined): number {
  if (!statut) return 3;
  return STATUT_PRIORITY[statut] ?? 3;
}

/** Mappe un statut stock → tone Chip (red | amber | accent | default). */
function chipToneForStatut(statut: StockStatut | undefined): ChipTone {
  if (statut === 'RUPTURE') return 'red';
  if (statut === 'BAS') return 'amber';
  if (statut === 'OK') return 'accent';
  return 'default';
}

/** Label affichable d'un statut (fallback sur la valeur brute). */
function labelForStatut(statut: StockStatut | undefined): string {
  if (!statut) return '—';
  return String(statut);
}

/**
 * Lit un éventuel champ prix unitaire sur un StockVeto. Le type officiel
 * n'expose pas `prixUnit`, mais le mapper peut être étendu sans casser le
 * typage via l'objet `raw` ou l'ajout futur d'une colonne.
 *
 * Stratégie fallback :
 *   1. Essayer `prixUnit` dynamique (cast via lookup typé).
 *   2. Essayer `prixUnitaire` (legacy alias).
 *   3. Retourner 0 (ignoré dans la somme) si rien.
 *
 * Cela permet d'afficher la valeur stock dès que la donnée arrive côté
 * Sheets, sans avoir à modifier le type ni le mapper maintenant.
 */
function priceOf(item: StockVeto): number {
  const record = item as unknown as Record<string, unknown>;
  const raw = record.prixUnit ?? record.prixUnitaire;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/** Formate une valeur numérique (XOF implicite, sans décimale). */
function formatCurrency(n: number): string {
  if (n === 0) return '—';
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

/**
 * PharmacieView — vue dédiée à la gestion médicale (stock vétérinaire).
 *
 * Route : `/ressources/pharmacie`
 *
 * Affiche :
 *  - 3 KpiCards : total produits, en rupture, valeur stock
 *  - Liste des produits triée par urgence (RUPTURE → BAS → OK)
 *  - Regroupement par usage/type (tableau simple)
 *  - Empty state si aucun produit
 *
 * Lecture seule — aucune mutation du FarmContext.
 */
const PharmacieView: React.FC = () => {
  const { stockVeto } = useFarm();
  const [addOpen, setAddOpen] = useState<boolean>(false);

  const summary = useMemo(() => {
    const total = stockVeto.length;
    const rupture = stockVeto.filter(s => s.statutStock === 'RUPTURE').length;
    const valeurStock = stockVeto.reduce(
      (sum, item) => sum + item.stockActuel * priceOf(item),
      0
    );
    return { total, rupture, valeurStock };
  }, [stockVeto]);

  const sorted = useMemo(() => {
    return [...stockVeto].sort((a, b) => {
      const diff = priorityOf(a.statutStock) - priorityOf(b.statutStock);
      if (diff !== 0) return diff;
      return a.produit.localeCompare(b.produit, 'fr');
    });
  }, [stockVeto]);

  // Regroupement par type (Complément, Antibiotique, Antiparasitaire...).
  const byType = useMemo(() => {
    const groups = new Map<string, StockVeto[]>();
    for (const item of stockVeto) {
      const key = (item.type && item.type.trim()) || 'Non catégorisé';
      const bucket = groups.get(key);
      if (bucket) bucket.push(item);
      else groups.set(key, [item]);
    }
    return Array.from(groups.entries())
      .map(([type, items]) => ({
        type,
        items,
        rupture: items.filter(i => i.statutStock === 'RUPTURE').length,
      }))
      .sort((a, b) => a.type.localeCompare(b.type, 'fr'));
  }, [stockVeto]);

  const isEmpty = stockVeto.length === 0;

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="PHARMACIE"
            subtitle="Inventaire produits vétérinaires"
            backTo="/ressources"
            action={
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                aria-label="Ajouter un nouveau produit vétérinaire"
                className="pressable inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-accent/40 text-accent font-mono text-[11px] uppercase tracking-wide hover:bg-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-colors"
              >
                <Plus size={14} aria-hidden="true" />
                Nouveau produit
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
                label="Valeur stock"
                value={formatCurrency(summary.valeurStock)}
                unit={summary.valeurStock > 0 ? 'XOF' : undefined}
                icon={<Box size={14} />}
              />
            </div>

            {/* ── Empty state ─────────────────────────────────────── */}
            {isEmpty ? (
              <div
                className="flex flex-col items-center justify-center py-16 px-8 text-center animate-fade-in-up"
                role="status"
              >
                <div className="w-20 h-20 rounded-2xl bg-bg-1 border border-border flex items-center justify-center mb-4 text-text-2">
                  <SeringueIcon size={48} />
                </div>
                <h3 className="ft-heading text-text-0 text-[18px] mb-2 uppercase tracking-wide">
                  Pharmacie vide
                </h3>
                <p className="text-text-2 text-[13px] max-w-xs leading-relaxed">
                  Aucun produit vétérinaire enregistré. Renseignez vos antibiotiques, antiparasitaires et compléments dans Google Sheets.
                </p>
              </div>
            ) : (
              <>
                {/* ── Produits actifs (triés par urgence) ────────── */}
                <section>
                  <SectionDivider label="Produits actifs" />
                  <div className="card-dense !p-0 overflow-hidden">
                    {sorted.map(item => {
                      const tone = chipToneForStatut(item.statutStock);
                      const seuil =
                        typeof item.seuilAlerte === 'number' && item.seuilAlerte > 0
                          ? item.seuilAlerte
                          : null;
                      const secondaryParts: string[] = [];
                      if (item.type) secondaryParts.push(item.type);
                      if (item.usage) secondaryParts.push(item.usage);
                      return (
                        <DataRow
                          key={item.id || item.produit}
                          primary={item.produit}
                          secondary={
                            secondaryParts.length > 0
                              ? secondaryParts.join(' · ')
                              : undefined
                          }
                          meta={
                            seuil !== null
                              ? `${item.stockActuel}/${seuil} ${item.unite}`
                              : `${item.stockActuel} ${item.unite}`
                          }
                          accessory={
                            <Chip
                              tone={tone}
                              label={labelForStatut(item.statutStock)}
                            />
                          }
                        />
                      );
                    })}
                  </div>
                </section>

                {/* ── Par usage / type ────────────────────────────── */}
                <section>
                  <SectionDivider label="Par usage" />
                  <div className="card-dense !p-0 overflow-hidden">
                    {byType.map(group => (
                      <DataRow
                        key={group.type}
                        primary={group.type}
                        secondary={`${group.items.length} produit${
                          group.items.length > 1 ? 's' : ''
                        }`}
                        accessory={
                          group.rupture > 0 ? (
                            <Chip
                              tone="red"
                              label={`${group.rupture} rupture`}
                            />
                          ) : (
                            <Chip tone="default" label="OK" />
                          )
                        }
                      />
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        </AgritechLayout>
        <AgritechNav />
      </IonContent>

      <QuickAddVetoForm
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
      />
    </IonPage>
  );
};

export default PharmacieView;
