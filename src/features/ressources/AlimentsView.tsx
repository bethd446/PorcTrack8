import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import {
  Package,
  AlertOctagon,
  Wheat,
  FlaskConical,
  Box,
  ExternalLink,
  Settings,
} from 'lucide-react';
import AgritechLayout from '../../components/AgritechLayout';
import EditableNumber from '../../components/EditableNumber';
import EditableText from '../../components/EditableText';
import { AppToast, useAppToast } from '../../components/agritech';
import EmptyState from '../../components/design/EmptyState';
import { useFarm, useMeta } from '../../context/FarmContext';
import {
  Button,
  Card,
  Fab,
  Search,
  Section,
  Tabs,
  Tag,
} from '@/design-system';
import { PageHeader } from '../../v70/components/ds/PageHeader';
import PhaseBanner from '../cycles/PhaseBanner';
import { updateProduitAliment } from '../../services/supabaseWrites';
import type { StockAliment, StockStatut, Truie, Verrat, BandePorcelets } from '../../types/farm';
import QuickAddAlimentForm from '../../components/forms/QuickAddAlimentForm';
import { projectStockDuration, formatJoursRestants } from '../../utils/stockProjection';
import {
  buildSingleItemOrderURL,
  buildSupplierOrderURL,
  buildWhatsAppOrderURL,
  hasWhatsAppSupport,
  type OrderItem,
} from '../../utils/whatsappOrder';
import { listFournisseurs, type FournisseurRow } from '../../services/supabaseWrites';

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
 * V44 archétype 3 — liste pure : Tabs catégorie + Search + Sections + Tag DS.
 * Les KPI stock ont été déplacés dans le hub Ressources (anti-doublon).
 *
 * Sections : Matières premières / Concentrés / Autres — triées RUPTURE → BAS
 * → OK puis alphabétique FR. Édition inline (stock, seuil, notes) préservée
 * via AlimentEditableRow custom (le DS ListItem ne supporte pas les champs
 * éditables multiples).
 */

type AlimentCategorie = 'MATIERE_PREMIERE' | 'CONCENTRE' | 'AUTRE';
type CategoryFilter = 'all' | AlimentCategorie;
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

const STATUT_PRIORITY: Record<string, number> = {
  RUPTURE: 0,
  BAS: 1,
  OK: 2,
};

function priorityOf(statut: StockStatut | undefined): number {
  if (!statut) return 3;
  return STATUT_PRIORITY[statut] ?? 3;
}

type TagVariant = 'default' | 'primary' | 'accent' | 'soft' | 'danger' | 'warning' | 'success';

function tagVariantForStatut(statut: StockStatut | undefined): TagVariant {
  if (statut === 'RUPTURE') return 'danger';
  if (statut === 'BAS') return 'warning';
  if (statut === 'OK') return 'success';
  return 'default';
}

function labelForStatut(statut: StockStatut | undefined): string {
  if (!statut) return '—';
  return String(statut);
}

function sortAliments(items: StockAliment[]): StockAliment[] {
  return [...items].sort((a, b) => {
    const diff = priorityOf(a.statutStock) - priorityOf(b.statutStock);
    if (diff !== 0) return diff;
    return a.libelle.localeCompare(b.libelle, 'fr');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sous-section liste (Section DS + Card DS contenant les rows éditables)
// ─────────────────────────────────────────────────────────────────────────────

interface AlimentSectionProps {
  title: string;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: { label: string; onClick: () => void };
  items: StockAliment[];
  onSelect: (item: StockAliment) => void;
  onRefresh: () => Promise<void>;
  cheptel: { truies: Truie[]; verrats: Verrat[]; bandes: BandePorcelets[] };
  fournisseurs?: FournisseurRow[];
  farmName: string;
}

const AlimentSection: React.FC<AlimentSectionProps> = ({
  title,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  items,
  onSelect,
  onRefresh,
  cheptel,
  fournisseurs,
  farmName,
}) => {
  const isEmpty = items.length === 0;
  return (
    <section role="region" aria-label={title}>
      <Section label={`${title} · ${items.length}`} />
      {isEmpty ? (
        <Card compact>
          <div
            className="flex flex-col items-center justify-center py-8 px-6 text-center"
            role="status"
            aria-label={`${title} — ${emptyTitle}`}
          >
            <div className="w-14 h-14 rounded-2xl bg-bg-1 border border-border flex items-center justify-center mb-3 text-text-2">
              {emptyIcon}
            </div>
            <h4 className="ft-heading text-text-0 text-[15px] mb-1.5 uppercase tracking-wide">
              {emptyTitle}
            </h4>
            <p className="text-text-2 text-[12px] max-w-xs leading-relaxed">
              {emptyDescription}
            </p>
            {emptyAction ? (
              <Button
                variant="primary"
                size="small"
                onClick={emptyAction.onClick}
                className="mt-4"
              >
                {emptyAction.label}
              </Button>
            ) : null}
          </div>
        </Card>
      ) : (
        <Card compact className="!p-0 overflow-hidden">
          {items.map(item => (
            <AlimentEditableRow
              key={item.id || item.libelle}
              item={item}
              onRefresh={onRefresh}
              onSelect={onSelect}
              cheptel={cheptel}
              fournisseurs={fournisseurs}
              farmName={farmName}
            />
          ))}
        </Card>
      )}
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Editable row : stock_actuel / seuil_alerte / notes inline
// ─────────────────────────────────────────────────────────────────────────────

interface AlimentEditableRowProps {
  item: StockAliment;
  onRefresh: () => Promise<void>;
  onSelect: (item: StockAliment) => void;
  cheptel: { truies: Truie[]; verrats: Verrat[]; bandes: BandePorcelets[] };
  fournisseurs?: FournisseurRow[];
  /** Nom de la ferme courante (lu depuis useMeta().nomFerme dans le parent). */
  farmName: string;
}

const AlimentEditableRow: React.FC<AlimentEditableRowProps> = ({
  item,
  onRefresh,
  cheptel,
  fournisseurs,
  farmName,
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
            {item.libelle || item.id}
          </div>
          {projection.joursRestants != null && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
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
        <div className="shrink-0 flex items-center gap-1 text-[12px] tabular-nums text-text-1">
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
          <Tag variant={tagVariantForStatut(item.statutStock)} dot>
            {labelForStatut(item.statutStock)}
          </Tag>
        </div>
      </div>
      <div className="text-[11px] text-text-2 pl-0.5">
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
        // V21-D1 : si fournisseur préféré configuré, on cible son WhatsApp.
        const f = item.fournisseurId
          ? fournisseurs?.find(x => x.id === item.fournisseurId)
          : undefined;
        const supplierUrl = f
          ? buildSupplierOrderURL({
              fournisseur: { nom: f.nom, whatsapp_number: f.whatsapp_number },
              produit: item.libelle || item.id,
              qteKg: manqueKgOf(item),
              farmName,
            })
          : null;
        const url =
          supplierUrl ??
          buildSingleItemOrderURL(
            item.libelle || item.id,
            manqueKgOf(item),
            item.unite,
            farmName,
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

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const AlimentsView: React.FC = () => {
  const navigate = useNavigate();
  const { stockAliment, refreshData, truies, verrats, bandes } = useFarm();
  const { nomFerme: FARM_NAME } = useMeta();
  const cheptel = useMemo(() => ({ truies, verrats, bandes }), [truies, verrats, bandes]);
  const { toastProps } = useAppToast();
  const [addOpen, setAddOpen] = useState(false);
  const [fournisseurs, setFournisseurs] = useState<FournisseurRow[]>([]);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [query, setQuery] = useState('');
  const whatsappReady = hasWhatsAppSupport();

  React.useEffect(() => {
    let active = true;
    void listFournisseurs().then(list => {
      if (active) setFournisseurs(list);
    });
    return () => {
      active = false;
    };
  }, []);

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
    [stocksAOrdonner, FARM_NAME],
  );

  const grouped = useMemo(() => {
    const matieres: StockAliment[] = [];
    const concentres: StockAliment[] = [];
    const autres: StockAliment[] = [];
    const q = query.trim().toLowerCase();

    for (const item of stockAliment) {
      if (q && !(item.libelle || item.id).toLowerCase().includes(q)) continue;
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
  }, [stockAliment, query]);

  const counts = useMemo(() => ({
    all: grouped.matieres.length + grouped.concentres.length + grouped.autres.length,
    MATIERE_PREMIERE: grouped.matieres.length,
    CONCENTRE: grouped.concentres.length,
    AUTRE: grouped.autres.length,
  }), [grouped]);

  const ruptureCount = useMemo(
    () => stockAliment.filter(s => s.statutStock === 'RUPTURE').length,
    [stockAliment],
  );

  const handleSelect = (_item: StockAliment) => {
    // Placeholder — édition stock arrivera dans un prochain sprint.
  };

  const isEmpty = stockAliment.length === 0;
  const totalFiltered = counts.all;
  const showMatieres = (filter === 'all' || filter === 'MATIERE_PREMIERE') && grouped.matieres.length > 0;
  const showConcentres = (filter === 'all' || filter === 'CONCENTRE') && grouped.concentres.length > 0;
  const showAutres = (filter === 'all' || filter === 'AUTRE') && grouped.autres.length > 0;
  const noMatch = !isEmpty && totalFiltered === 0;

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <div className="px-4 pt-5 pb-32 flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
            <PageHeader
              eyebrow="STOCKS · ALIMENTS"
              title="Aliments"
              subtitle="Stocks et consommation"
            />
            <PhaseBanner
              src="/images/ambiance-stock.webp"
              alt=""
              label="STOCKS ALIMENTS"
            />

            {/* ── Filtres + recherche dans une Card DS ──────────────── */}
            {!isEmpty && (
              <Card compact>
                <div className="flex flex-col gap-3">
                  <Tabs
                    value={filter}
                    onChange={v => setFilter(v as CategoryFilter)}
                    options={[
                      { value: 'all', label: 'Tous', count: counts.all },
                      { value: 'MATIERE_PREMIERE', label: 'Matières', count: counts.MATIERE_PREMIERE },
                      { value: 'CONCENTRE', label: 'Concentrés', count: counts.CONCENTRE },
                      { value: 'AUTRE', label: 'Autres', count: counts.AUTRE },
                    ]}
                    ariaLabel="Filtrer les aliments par catégorie"
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
              >
                <Settings size={13} aria-hidden="true" />
                <span>Numéro WhatsApp non configuré · Régler dans Réglages</span>
              </Button>
            ) : null}

            {/* ── Bannière alerte rupture ─────────────────────────── */}
            {ruptureCount > 0 ? (
              <Card compact danger>
                <div className="flex items-start gap-3" role="alert" aria-label="Alerte rupture stock">
                  <AlertOctagon
                    size={18}
                    className="shrink-0 text-red mt-0.5"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-text-0">
                      {ruptureCount} matière{ruptureCount > 1 ? 's' : ''} en rupture
                    </div>
                    <div className="mt-0.5 text-[11px] text-text-2">
                      Commander d'urgence — production à l'arrêt si non réapprovisionné.
                    </div>
                  </div>
                </div>
              </Card>
            ) : null}

            {/* ── Empty state global ──────────────────────────────── */}
            {isEmpty ? (
              <EmptyState
                icon={<Package size={32} aria-hidden="true" />}
                title="Stock aliments vide"
                description="Aucun aliment enregistré. Ajoute ton 1er aliment via le bouton +."
                action={
                  <Button
                    variant="primary"
                    onClick={() => setAddOpen(true)}
                  >
                    Ajouter un aliment
                  </Button>
                }
              />
            ) : noMatch ? (
              <EmptyState
                icon={<Package size={32} aria-hidden="true" />}
                title="Aucun aliment trouvé"
                description={query ? `Aucun résultat pour « ${query} »` : 'Aucun aliment dans cette catégorie.'}
              />
            ) : (
              <>
                {showMatieres ? (
                  <AlimentSection
                    title="Matières premières"
                    emptyIcon={<Wheat size={32} />}
                    emptyTitle="Aucune matière première"
                    emptyDescription="Ajoute maïs, tourteau de soja ou son de blé"
                    items={grouped.matieres}
                    onSelect={handleSelect}
                    onRefresh={refreshData}
                    cheptel={cheptel}
                    fournisseurs={fournisseurs}
                    farmName={FARM_NAME}
                  />
                ) : null}

                {showConcentres ? (
                  <AlimentSection
                    title="Concentrés & compléments"
                    emptyIcon={<FlaskConical size={32} />}
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
                    fournisseurs={fournisseurs}
                    farmName={FARM_NAME}
                  />
                ) : null}

                {showAutres ? (
                  <AlimentSection
                    title="Autres aliments"
                    emptyIcon={<Box size={32} />}
                    emptyTitle="Aucun autre aliment"
                    emptyDescription="Les aliments composés (TRUIE-GEST, PORCELET…) apparaîtront ici."
                    items={grouped.autres}
                    onSelect={handleSelect}
                    onRefresh={refreshData}
                    cheptel={cheptel}
                    farmName={FARM_NAME}
                  />
                ) : null}
              </>
            )}
          </div>
        </AgritechLayout>

        {/* ── FAB DS — Ajouter un aliment ─────────────────────────── */}
        <Fab
          label="Aliment"
          ariaLabel="Ajouter un nouvel aliment"
          onClick={() => setAddOpen(true)}
        />

        <QuickAddAlimentForm
          isOpen={addOpen}
          onClose={() => setAddOpen(false)}
        />

        <AppToast {...toastProps} />
      </IonContent>
    </IonPage>
  );
};

export default AlimentsView;
