import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { Package, Box, AlertOctagon, Plus, ExternalLink, Settings } from 'lucide-react';
import AgritechLayout from '../../components/AgritechLayout';
import EditableNumber from '../../components/EditableNumber';
import EditableText from '../../components/EditableText';
import { Chip, DataRow, SectionDivider, KpiCard } from '../../components/agritech';
import type { ChipTone } from '../../components/agritech';
import EmptyState from '../../components/design/EmptyState';
import TopBarSync from '../../components/design/TopBarSync';
import { SeringueIcon } from '../../components/icons';
import { useFarm, useMeta } from '../../context/FarmContext';
import { updateProduitVeto } from '../../services/supabaseWrites';
import type { StockVeto, StockStatut } from '../../types/farm';
import QuickAddVetoForm from '../../components/forms/QuickAddVetoForm';
import QuickRefillForm from '../../components/forms/QuickRefillForm';
import { toRefillItem, type RefillStockItem } from '../../components/forms/quickRefillLogic';
import {
  buildSingleItemOrderURL,
  buildWhatsAppOrderURL,
  hasWhatsAppSupport,
  type OrderItem,
} from '../../utils/whatsappOrder';
import { Button, PageHeader } from '@/design-system';

function manqueKgVeto(item: StockVeto): number {
  const stock = item.stockActuel ?? 0;
  const seuil =
    typeof item.stockMin === 'number' ? item.stockMin : item.seuilAlerte ?? 0;
  const manque = 2 * seuil - stock;
  return manque > 0 ? manque : 0;
}

function needsOrderVeto(item: StockVeto): boolean {
  if (item.statutStock === 'RUPTURE') return true;
  const stock = item.stockActuel ?? 0;
  const seuil =
    typeof item.stockMin === 'number' ? item.stockMin : item.seuilAlerte ?? 0;
  return seuil > 0 && stock < seuil;
}

/**
 * Priorité d'affichage : RUPTURE (urgent) > BAS > OK.
 * Statuts inconnus (legacy) se placent après OK.
 */
const STATUT_PRIORITY: Record<string, number> = {
  RUPTURE: 0,
  BAS: 1,
  OK: 2,
};

type ResourceTreatment = 'urgent' | 'normal' | 'resolu';

function classifyTreatment(item: StockVeto): ResourceTreatment {
  const stock = item.stockActuel ?? 0;
  const seuil = (typeof item.stockMin === 'number' ? item.stockMin : item.seuilAlerte) ?? 0;
  if (stock === 0 || /rupt/i.test(item.statutStock ?? '')) return 'urgent';
  if (stock < seuil) return 'normal';
  return 'resolu';
}

interface TreatmentVisual {
  borderLeft: string;
  dot: string;
  label: string;
}

function getTreatmentVisual(t: ResourceTreatment): TreatmentVisual {
  if (t === 'urgent') {
    return {
      borderLeft: '3px solid var(--color-pig)',
      dot: 'var(--color-pig)',
      label: 'Rupture',
    };
  }
  if (t === 'normal') {
    return {
      borderLeft: '3px solid var(--color-amber-pork)',
      dot: 'var(--color-amber-pork)',
      label: 'Stock bas',
    };
  }
  return {
    borderLeft: '3px solid transparent',
    dot: 'var(--color-accent-500)',
    label: 'OK',
  };
}

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
  const navigate = useNavigate();
  const { stockVeto, refreshData } = useFarm();
  const { nomFerme: FARM_NAME } = useMeta();
  const [addOpen, setAddOpen] = useState<boolean>(false);
  const [refillItem, setRefillItem] = useState<RefillStockItem | null>(null);
  const whatsappReady = hasWhatsAppSupport();

  const stocksAOrdonner = useMemo<OrderItem[]>(
    () =>
      stockVeto.filter(needsOrderVeto).map((it) => ({
        libelle: it.produit,
        manqueKg: manqueKgVeto(it),
        unite: it.unite,
      })),
    [stockVeto],
  );

  const groupedOrderUrl = useMemo(
    () =>
      stocksAOrdonner.length >= 2
        ? buildWhatsAppOrderURL(stocksAOrdonner, FARM_NAME)
        : null,
    [stocksAOrdonner],
  );

  const summary = useMemo(() => {
    const total = stockVeto.length;
    const rupture = stockVeto.filter(s => s.statutStock === 'RUPTURE').length;
    const produitsAvecPrix = stockVeto.filter(item => priceOf(item) > 0).length;
    const valeurStock = stockVeto.reduce(
      (sum, item) => sum + (item.stockActuel ?? 0) * priceOf(item),
      0
    );
    return { total, rupture, valeurStock, produitsAvecPrix };
  }, [stockVeto]);

  const treatmentCounts = useMemo(() => {
    const out = { urgent: 0, normal: 0, resolu: 0 };
    for (const item of stockVeto) {
      out[classifyTreatment(item)] += 1;
    }
    return out;
  }, [stockVeto]);

  const treatmentSummaryLine = useMemo(() => {
    const parts: string[] = [];
    if (treatmentCounts.urgent > 0) {
      parts.push(`${treatmentCounts.urgent} rupture${treatmentCounts.urgent > 1 ? 's' : ''}`);
    }
    if (treatmentCounts.normal > 0) {
      parts.push(`${treatmentCounts.normal} stock${treatmentCounts.normal > 1 ? 's' : ''} bas`);
    }
    if (treatmentCounts.resolu > 0) {
      parts.push(`${treatmentCounts.resolu} OK`);
    }
    return parts.join(' · ');
  }, [treatmentCounts]);

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
          <TopBarSync
            crumbs={['Ressources', 'Pharmacie']}
            onMariusClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
          />

          <div className="px-4 pt-5 pb-32 flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
            <PageHeader
              eyebrow="Ressources · Pharmacie"
              title="Pharmacie"
              subtitle="Stocks véto et sanitaire"
            />
            {treatmentSummaryLine && (
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
                aria-live="polite"
              >
                {treatmentSummaryLine}
              </div>
            )}
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="small"
                onClick={() => setAddOpen(true)}
                ariaLabel="Ajouter un nouveau produit vétérinaire"
                className="pressable shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-accent/40 text-accent text-[11px] uppercase tracking-wide hover:bg-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-colors"
              >
                <Plus size={14} aria-hidden="true" />
                Nouveau produit
              </Button>
            </div>

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
                value={
                  summary.valeurStock > 0
                    ? formatCurrency(summary.valeurStock)
                    : summary.total === 0
                      ? '—'
                      : 'Définir prix'
                }
                unit={summary.valeurStock > 0 ? 'XOF' : undefined}
                icon={<Box size={14} />}
                tone={summary.valeurStock === 0 && summary.total > 0 ? 'default' : 'default'}
              />
            </div>

            {/* ── Action groupée Commander ──────────────────────── */}
            {whatsappReady && groupedOrderUrl ? (
              <a
                href={groupedOrderUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Commander ${stocksAOrdonner.length} produits via WhatsApp`}
                className="pressable"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: 'var(--color-accent-500)',
                  color: 'var(--bg-surface)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-heading)',
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  boxShadow: '0 2px 6px rgba(6,78,59,0.18)',
                }}
              >
                <span>
                  Commander {stocksAOrdonner.length} produits via WhatsApp
                </span>
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            ) : null}

            {!whatsappReady && stocksAOrdonner.length > 0 ? (
              <Button
                variant="ghost"
                onClick={() => navigate('/more')}
                ariaLabel="Configurer le numéro WhatsApp dans les Réglages"
                className="pressable"
                style={{
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'var(--bg-surface-2)',
                  color: 'var(--muted)',
                  border: '1px dashed var(--line)',
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'left',
                }}
              >
                <Settings size={13} aria-hidden="true" />
                <span>
                  Numéro WhatsApp non configuré · Régler dans Réglages
                </span>
              </Button>
            ) : null}

            {/* ── Empty state ─────────────────────────────────────── */}
            {isEmpty ? (
              <EmptyState
                icon={<SeringueIcon size={32} />}
                title="Pharmacie vide"
                description="Aucun produit vétérinaire enregistré. Renseigne ton 1er produit véto via le bouton +."
              />
            ) : (
              <>
                {/* ── Produits actifs (triés par urgence) ────────── */}
                <section>
                  <SectionDivider label="Produits actifs" />
                  <div className="card-dense !p-0 overflow-hidden">
                    {sorted.map(item => {
                      const tone = chipToneForStatut(item.statutStock);
                      const secondaryParts: string[] = [];
                      if (item.type) secondaryParts.push(item.type);
                      if (item.usage) secondaryParts.push(item.usage);
                      return (
                        <VetoEditableRow
                          key={item.id || item.produit}
                          item={item}
                          tone={tone}
                          secondary={
                            secondaryParts.length > 0
                              ? secondaryParts.join(' · ')
                              : undefined
                          }
                          onRefresh={refreshData}
                          onRefill={() => setRefillItem(toRefillItem(item, 'VETO'))}
                          farmName={FARM_NAME}
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
      </IonContent>

      <QuickAddVetoForm
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
      />

      <QuickRefillForm
        isOpen={!!refillItem}
        onClose={() => setRefillItem(null)}
        stockItem={refillItem}
      />
    </IonPage>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Editable row : stock_actuel / stock_min / notes inline
// ─────────────────────────────────────────────────────────────────────────────

interface VetoEditableRowProps {
  item: StockVeto;
  tone: ChipTone;
  secondary?: string;
  onRefresh: () => Promise<void>;
  onRefill: () => void;
  /** Nom de la ferme courante (lu depuis useMeta().nomFerme dans le parent). */
  farmName: string;
}

const VetoEditableRow: React.FC<VetoEditableRowProps> = ({
  item,
  tone,
  secondary,
  onRefresh,
  farmName,
}) => {
  // `seuilAlerte` UI = `stock_min` DB. On préfère `stockMin` si fourni, sinon
  // on retombe sur `seuilAlerte` (legacy mapper).
  const minValue =
    typeof item.stockMin === 'number' ? item.stockMin : item.seuilAlerte ?? null;

  const treatment = classifyTreatment(item);
  const visual = getTreatmentVisual(treatment);
  const isUrgent = treatment === 'urgent';

  return (
    <div
      className="flex flex-col gap-1.5 px-3 py-3 border-b border-border last:border-b-0"
      style={{ borderLeft: visual.borderLeft }}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div
            className="flex items-center gap-1.5 mb-0.5"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color: isUrgent ? 'var(--color-pig-deep)' : 'var(--muted)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 5,
                height: 5,
                borderRadius: 999,
                background: visual.dot,
                display: 'inline-block',
              }}
            />
            <span>{visual.label}</span>
          </div>
          <div
            className="truncate text-text-0"
            style={{
              fontSize: isUrgent ? 15 : 14,
              fontWeight: isUrgent ? 700 : 500,
            }}
          >
            {item.produit}
          </div>
          {secondary ? (
            <div className="mt-0.5 truncate text-[11px] text-text-2">
              {secondary}
            </div>
          ) : null}
        </div>
        <div className="shrink-0 flex items-center gap-1 text-[12px] tabular-nums text-text-1">
          <EditableNumber
            value={item.stockActuel ?? null}
            min={0}
            step={1}
            ariaLabel={`Modifier le stock actuel de ${item.produit}`}
            onSave={async (v) => {
              const res = await updateProduitVeto(item.id, { stock_actuel: v });
              if (res.success) await onRefresh();
              return res;
            }}
          />
          <span className="text-text-2">/</span>
          <EditableNumber
            value={minValue}
            min={0}
            step={1}
            ariaLabel={`Modifier le stock minimum de ${item.produit}`}
            onSave={async (v) => {
              const res = await updateProduitVeto(item.id, { stock_min: v });
              if (res.success) await onRefresh();
              return res;
            }}
          />
          <span className="text-text-2 ml-0.5">{item.unite}</span>
        </div>
        <div className="shrink-0">
          <Chip tone={tone} label={labelForStatut(item.statutStock)} />
        </div>
      </div>
      <div className="text-[11px] text-text-2 pl-0.5">
        <EditableText
          value={item.notes ?? null}
          maxLength={200}
          ariaLabel={`Modifier les notes de ${item.produit}`}
          placeholder="Ajouter une note…"
          onSave={async (v) => {
            const res = await updateProduitVeto(item.id, { notes: v });
            if (res.success) await onRefresh();
            return res;
          }}
        />
      </div>
      {needsOrderVeto(item) && (() => {
        const url = buildSingleItemOrderURL(
          item.produit,
          manqueKgVeto(item),
          item.unite,
          farmName,
        );
        if (!url) return null;
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Commander ${item.produit} via WhatsApp`}
            className="pressable"
            style={{
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 9999,
              background: isUrgent ? 'var(--color-pig)' : 'var(--color-accent-500)',
              color: 'white',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              textDecoration: 'none',
              fontWeight: 600,
              marginTop: 4,
            }}
          >
            Commander
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        );
      })()}
    </div>
  );
};

export default PharmacieView;
