import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage, IonToast } from '@ionic/react';
import {
  Package,
  AlertOctagon,
  Wheat,
  FlaskConical,
  Box,
  Scale,
  Plus,
  ExternalLink,
  Settings,
} from 'lucide-react';
import AgritechLayout from '../../components/AgritechLayout';
import EditableNumber from '../../components/EditableNumber';
import EditableText from '../../components/EditableText';
import { Chip, SectionDivider, KpiCard } from '../../components/agritech';
import type { ChipTone } from '../../components/agritech';
import EmptyState from '../../components/design/EmptyState';
import Eyebrow from '../../components/design/Eyebrow';
import TopBarSync from '../../components/design/TopBarSync';
import { useFarm } from '../../context/FarmContext';
import { updateProduitAliment } from '../../services/supabaseWrites';
import type { StockAliment, StockStatut, Truie, Verrat, BandePorcelets } from '../../types/farm';
import QuickAddAlimentForm from '../../components/forms/QuickAddAlimentForm';
import { projectStockDuration, formatJoursRestants } from '../../utils/stockProjection';
import {
  buildSingleItemOrderURL,
  buildWhatsAppOrderURL,
  hasWhatsAppSupport,
  type OrderItem,
} from '../../utils/whatsappOrder';

const FARM_NAME = 'K13';

function manqueKgOf(item: StockAliment): number {
  const stock = item.stockActuel ?? 0;
  const seuil = item.seuilAlerte ?? 0;
  const manque = 2 * seuil - stock;
  return manque > 0 ? manque : 0;
}

function needsOrder(item: StockAliment): boolean {
  if (item.statutStock === 'RUPTURE') return true;
  const stock = item.stockActuel ?? 0;
  const seuil = item.seuilAlerte ?? 0;
  return seuil > 0 && stock < seuil;
}

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
type ResourceTreatment = 'urgent' | 'normal' | 'resolu';

function classifyTreatment(item: StockAliment): ResourceTreatment {
  const stock = item.stockActuel ?? 0;
  const seuil = item.seuilAlerte ?? 0;
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

/**
 * Classifie un aliment via regex sur son libellé (et fallback sur son ID).
 *
 * Matières premières : maïs, tourteau de soja, son de blé/riz, orge, blé.
 * Concentrés       : KPC, Romelko, Vitafaf, Mycofix, AMV, lysine, méthionine,
 *                    phytase, prémix, vitamine.
 * Autres           : aliments composés déjà formulés (TRUIE-GEST, PORCELET…)
 *                    et tout ce qui ne matche pas.
 */
function categoriserAliment(libelle: string, id?: string): AlimentCategorie {
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
  onRefresh: () => Promise<void>;
  cheptel: { truies: Truie[]; verrats: Verrat[]; bandes: BandePorcelets[] };
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
  onRefresh,
  cheptel,
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
            return (
              <AlimentEditableRow
                key={item.id || item.libelle}
                item={item}
                tone={tone}
                onRefresh={onRefresh}
                onSelect={onSelect}
                cheptel={cheptel}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Editable row : stock_actuel / seuil_alerte / notes inline
// ─────────────────────────────────────────────────────────────────────────────

interface AlimentEditableRowProps {
  item: StockAliment;
  tone: ChipTone;
  onRefresh: () => Promise<void>;
  onSelect: (item: StockAliment) => void;
  cheptel: { truies: Truie[]; verrats: Verrat[]; bandes: BandePorcelets[] };
}

const AlimentEditableRow: React.FC<AlimentEditableRowProps> = ({
  item,
  tone,
  onRefresh,
  cheptel,
}) => {
  const projection = projectStockDuration(item, cheptel);
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
              fontFamily: 'DMMono, ui-monospace, monospace',
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
            {item.libelle || item.id}
          </div>
          {projection.joursRestants != null && (
            <div
              style={{
                fontFamily: 'DMMono, ui-monospace, monospace',
                fontSize: 11,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginTop: 2,
                color:
                  projection.joursRestants < 7
                    ? 'var(--color-pig)'
                    : projection.joursRestants < 14
                      ? 'var(--amber-pork-deep)'
                      : 'var(--muted)',
              }}
            >
              {formatJoursRestants(projection.joursRestants)}
            </div>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-1 font-mono text-[12px] tabular-nums text-text-1">
          <EditableNumber
            value={item.stockActuel ?? null}
            min={0}
            step={1}
            ariaLabel={`Modifier le stock actuel de ${item.libelle || item.id}`}
            onSave={async (v) => {
              const res = await updateProduitAliment(item.id, { stock_actuel: v });
              if (res.success) await onRefresh();
              return res;
            }}
          />
          <span className="text-text-2">/</span>
          <EditableNumber
            value={item.seuilAlerte ?? null}
            min={0}
            step={1}
            ariaLabel={`Modifier le seuil d'alerte de ${item.libelle || item.id}`}
            onSave={async (v) => {
              const res = await updateProduitAliment(item.id, { seuil_alerte: v });
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
      <div className="font-mono text-[11px] text-text-2 pl-0.5">
        <EditableText
          value={item.notes ?? null}
          maxLength={200}
          ariaLabel={`Modifier les notes de ${item.libelle || item.id}`}
          placeholder="Ajouter une note…"
          onSave={async (v) => {
            const res = await updateProduitAliment(item.id, { notes: v });
            if (res.success) await onRefresh();
            return res;
          }}
        />
      </div>
      {needsOrder(item) && (() => {
        const url = buildSingleItemOrderURL(
          item.libelle || item.id,
          manqueKgOf(item),
          item.unite,
          FARM_NAME,
        );
        if (!url) return null;
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Commander ${item.libelle || item.id} via WhatsApp`}
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
              fontFamily: 'DMMono, ui-monospace, monospace',
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

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const AlimentsView: React.FC = () => {
  const navigate = useNavigate();
  const { stockAliment, refreshData, truies, verrats, bandes } = useFarm();
  const cheptel = useMemo(() => ({ truies, verrats, bandes }), [truies, verrats, bandes]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const whatsappReady = hasWhatsAppSupport();

  const stocksAOrdonner = useMemo<OrderItem[]>(
    () =>
      stockAliment
        .filter(needsOrder)
        .map((it) => ({
          libelle: it.libelle || it.id,
          manqueKg: manqueKgOf(it),
          unite: it.unite,
        })),
    [stockAliment],
  );

  const groupedOrderUrl = useMemo(
    () =>
      stocksAOrdonner.length >= 2
        ? buildWhatsAppOrderURL(stocksAOrdonner, FARM_NAME)
        : null,
    [stocksAOrdonner],
  );

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

  const counts = useMemo(() => {
    let mp = 0;
    let conc = 0;
    for (const item of stockAliment) {
      const cat = categoriserAliment(item.libelle, item.id);
      if (cat === 'MATIERE_PREMIERE') mp += 1;
      else if (cat === 'CONCENTRE') conc += 1;
    }
    return { mp, conc };
  }, [stockAliment]);

  const treatmentCounts = useMemo(() => {
    const out = { urgent: 0, normal: 0, resolu: 0 };
    for (const item of stockAliment) {
      out[classifyTreatment(item)] += 1;
    }
    return out;
  }, [stockAliment]);

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
          <TopBarSync
            crumbs={['Ressources', 'Aliments']}
            onMariusClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
          />

          <div className="px-4 pt-5 pb-32 flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Eyebrow dotColor="accent">Ressources · Aliments</Eyebrow>
                <h1
                  style={{
                    fontFamily: 'BigShoulders, system-ui, sans-serif',
                    fontSize: 34,
                    fontWeight: 700,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    color: 'var(--ink)',
                    margin: '8px 0 4px',
                  }}
                >
                  Aliments
                </h1>
                <div
                  style={{
                    fontFamily: 'InstrumentSans, system-ui, sans-serif',
                    fontSize: 13,
                    color: 'var(--muted)',
                  }}
                >
                  {counts.mp} matière{counts.mp > 1 ? 's' : ''} première{counts.mp > 1 ? 's' : ''} · {counts.conc} concentré{counts.conc > 1 ? 's' : ''}
                </div>
                {treatmentSummaryLine && (
                  <div
                    style={{
                      fontFamily: 'DMMono, ui-monospace, monospace',
                      fontSize: 10.5,
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                      color: 'var(--muted)',
                      marginTop: 4,
                    }}
                    aria-live="polite"
                  >
                    {summary.total} produit{summary.total > 1 ? 's' : ''} — {treatmentSummaryLine}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                aria-label="Ajouter un nouvel aliment"
                className="shrink-0 inline-flex h-9 items-center gap-1.5 px-3 rounded-md bg-accent text-bg-0 font-mono text-[11px] font-bold uppercase tracking-wide transition-colors duration-150 hover:brightness-110 active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                <Plus size={14} aria-hidden="true" />
                <span>Nouvel aliment</span>
              </button>
            </header>

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
                  fontFamily: 'BigShoulders, system-ui, sans-serif',
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
              <button
                type="button"
                onClick={() => navigate('/more')}
                aria-label="Configurer le numéro WhatsApp dans les Réglages"
                className="pressable"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'var(--bg-surface-2)',
                  color: 'var(--muted)',
                  border: '1px dashed var(--line)',
                  fontFamily: 'DMMono, ui-monospace, monospace',
                  fontSize: 11,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Settings size={13} aria-hidden="true" />
                <span>
                  Numéro WhatsApp non configuré · Régler dans Réglages
                </span>
              </button>
            ) : null}

            {/* ── Bannière alerte rupture ─────────────────────────── */}
            {summary.rupture > 0 ? (
              <div
                className="card-dense flex items-start gap-3"
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
              <EmptyState
                icon={<Package size={32} aria-hidden="true" />}
                title="Stock aliments vide"
                description="Aucun aliment enregistré. Ajoute ton 1er aliment via le bouton +."
                action={
                  <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    className="pressable h-11 px-5 rounded-md bg-accent text-bg-0 text-[13px] font-medium transition-colors inline-flex items-center gap-2"
                  >
                    <Plus size={16} aria-hidden="true" />
                    Ajouter un aliment
                  </button>
                }
              />
            ) : (
              <>
                <AlimentSection
                  title="Matières premières"
                  icon={<Wheat size={14} />}
                  emptyIcon={<Wheat size={40} />}
                  emptyTitle="Aucune matière première"
                  emptyDescription="Ajoute maïs, tourteau de soja ou son de blé"
                  items={grouped.matieres}
                  onSelect={handleSelect}
                  onRefresh={refreshData}
                  cheptel={cheptel}
                />

                <AlimentSection
                  title="Concentrés & compléments"
                  icon={<FlaskConical size={14} />}
                  emptyIcon={<FlaskConical size={40} />}
                  emptyTitle="Aucun concentré"
                  emptyDescription="Ajoute KPC, Mycofix, Lysine…"
                  emptyAction={{
                    label: 'Ajouter un aliment',
                    onClick: () => setAddOpen(true),
                  }}
                  items={grouped.concentres}
                  onSelect={handleSelect}
                  onRefresh={refreshData}
                  cheptel={cheptel}
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
                    onRefresh={refreshData}
                    cheptel={cheptel}
                  />
                ) : null}
              </>
            )}
          </div>
        </AgritechLayout>

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
