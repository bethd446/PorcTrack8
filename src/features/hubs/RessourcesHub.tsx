/**
 * RessourcesHub — /ressources
 * ══════════════════════════════════════════════════════════════════════════
 * Refonte v6 « Terrain Vivant » (2026-04-30)
 *
 *   1. TopBarSync + Eyebrow + H1 Big Shoulders
 *   2. Sub-tabs Aliments / Pharmacie en pills
 *   3. KPI cards stocks (rupture / bas / ok)
 *   4. Search bar + grid de cards stock v6
 */

import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import {
  AlertTriangle, Plus, Edit3, Droplets, FlaskConical, Search,
  Calculator, ClipboardList, ArrowRight, ExternalLink, Settings,
  X,
} from 'lucide-react';

import AgritechLayout from '../../components/AgritechLayout';
import Eyebrow from '../../components/design/Eyebrow';
import TopBarSync from '../../components/design/TopBarSync';
import KpiCardV6 from '../../components/design/KpiCard';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import QuickRefillForm from '../../components/forms/QuickRefillForm';
import {
  toRefillItem,
  type RefillStockItem,
} from '../../components/forms/quickRefillLogic';
import QuickEditStockForm from '../../components/forms/QuickEditStockForm';
import type { StockKind } from '../../components/forms/quickEditStockLogic';
import { useFarm } from '../../context/FarmContext';
import type { StockAliment, StockVeto } from '../../types/farm';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { projectStockDuration, formatJoursRestants } from '../../utils/stockProjection';
import {
  buildSingleItemOrderURL,
  buildWhatsAppOrderURL,
  hasWhatsAppSupport,
  type OrderItem,
} from '../../utils/whatsappOrder';

// ─── Types ──────────────────────────────────────────────────────────────────

type ResourceTab = 'aliments' | 'pharmacie';
type StockItem = StockAliment | StockVeto;
type ResourceTreatment = 'urgent' | 'normal' | 'resolu';

// ─── Helpers hiérarchie visuelle ────────────────────────────────────────────

function classifyResourceTreatment(item: StockItem): ResourceTreatment {
  const stock = item.stockActuel ?? 0;
  const seuil = item.seuilAlerte ?? 0;
  const statut = item.statutStock ?? '';
  if (stock === 0 || /rupt/i.test(statut)) return 'urgent';
  if (stock < seuil) return 'normal';
  return 'resolu';
}

const TREATMENT_PRIORITY: Record<ResourceTreatment, number> = {
  urgent: 0,
  normal: 1,
  resolu: 2,
};

function sortByTreatment<T extends StockItem>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const diff = TREATMENT_PRIORITY[classifyResourceTreatment(a)]
      - TREATMENT_PRIORITY[classifyResourceTreatment(b)];
    if (diff !== 0) return diff;
    const labelA = 'libelle' in a ? a.libelle : a.produit;
    const labelB = 'libelle' in b ? b.libelle : b.produit;
    return labelA.localeCompare(labelB, 'fr');
  });
}

function countByTreatment(items: StockItem[]): Record<ResourceTreatment, number> {
  const counts: Record<ResourceTreatment, number> = { urgent: 0, normal: 0, resolu: 0 };
  for (const it of items) counts[classifyResourceTreatment(it)] += 1;
  return counts;
}

function libelleOf(item: StockItem): string {
  return 'libelle' in item ? item.libelle : item.produit;
}

/** Quantité à commander = remplir jusqu'à 2x le seuil. */
function manqueKgOf(item: StockItem): number {
  const stock = item.stockActuel ?? 0;
  const seuil = item.seuilAlerte ?? 0;
  const manque = 2 * seuil - stock;
  return manque > 0 ? manque : 0;
}

function toOrderItem(item: StockItem): OrderItem {
  return {
    libelle: libelleOf(item),
    manqueKg: manqueKgOf(item),
    unite: item.unite,
  };
}

const FARM_NAME = 'K13';

// ─── Composant ──────────────────────────────────────────────────────────────

const RessourcesHub: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  const isStockBasFilter = filterParam === 'stock-bas';

  const { stockAliment, stockVeto, refreshData, truies, verrats, bandes } = useFarm();
  const cheptel = useMemo(() => ({ truies, verrats, bandes }), [truies, verrats, bandes]);
  const { handleRefresh } = useAutoRefresh();

  const [activeTab, setActiveTab] = useState<ResourceTab>('aliments');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAliments = useMemo(() => {
    let filtered = stockAliment.filter(a =>
      a.libelle.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    if (isStockBasFilter) {
      filtered = filtered.filter(a => classifyResourceTreatment(a) !== 'resolu');
    }
    return sortByTreatment(filtered);
  }, [stockAliment, searchQuery, isStockBasFilter]);

  const filteredVetos = useMemo(() => {
    let filtered = stockVeto.filter(v =>
      v.produit.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    if (isStockBasFilter) {
      filtered = filtered.filter(v => classifyResourceTreatment(v) !== 'resolu');
    }
    return sortByTreatment(filtered);
  }, [stockVeto, searchQuery, isStockBasFilter]);

  const stockBasCount = useMemo(() => {
    if (!isStockBasFilter) return 0;
    return filteredAliments.length + filteredVetos.length;
  }, [isStockBasFilter, filteredAliments, filteredVetos]);

  const clearStockBasFilter = (): void => {
    const next = new URLSearchParams(searchParams);
    next.delete('filter');
    setSearchParams(next, { replace: true });
  };

  const treatmentCounts = useMemo(() => {
    const source: StockItem[] = activeTab === 'aliments' ? filteredAliments : filteredVetos;
    return countByTreatment(source);
  }, [activeTab, filteredAliments, filteredVetos]);

  const subEyebrowParts = useMemo(() => {
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
    return parts;
  }, [treatmentCounts]);

  const stats = useMemo(() => {
    const all = [
      ...stockAliment.map(a => a.statutStock),
      ...stockVeto.map(v => v.statutStock || 'OK'),
    ];
    const total = all.length;
    const rupture = all.filter(s => s === 'RUPTURE').length;
    const bas = all.filter(s => s === 'BAS').length;
    const ok = total - rupture - bas;
    return { total, rupture, bas, ok };
  }, [stockAliment, stockVeto]);

  const [refillTarget, setRefillTarget] = useState<RefillStockItem | null>(null);
  const [editTarget, setEditTarget] = useState<{ item: StockItem; kind: StockKind } | null>(null);

  const whatsappReady = hasWhatsAppSupport();

  const stocksAOrdonner = useMemo<OrderItem[]>(() => {
    const source = activeTab === 'aliments' ? filteredAliments : filteredVetos;
    return source
      .filter((it) => classifyResourceTreatment(it) !== 'resolu')
      .map(toOrderItem);
  }, [activeTab, filteredAliments, filteredVetos]);

  const groupedOrderUrl = useMemo(
    () =>
      stocksAOrdonner.length >= 2
        ? buildWhatsAppOrderURL(stocksAOrdonner, FARM_NAME)
        : null,
    [stocksAOrdonner],
  );

  const handleOpenRefill = (item: StockItem, kind: StockKind) => {
    setRefillTarget(toRefillItem(item, kind));
  };

  const orderUrlFor = (item: StockItem): string | null => {
    if (classifyResourceTreatment(item) === 'resolu') return null;
    return buildSingleItemOrderURL(
      libelleOf(item),
      manqueKgOf(item),
      item.unite,
      FARM_NAME,
    );
  };

  const TABS: { id: ResourceTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'aliments', label: 'Aliments', icon: <Droplets size={13} aria-hidden="true" />, count: stockAliment.length },
    { id: 'pharmacie', label: 'Pharmacie', icon: <FlaskConical size={13} aria-hidden="true" />, count: stockVeto.length },
  ];

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
            <IonRefresherContent />
          </IonRefresher>

          <TopBarSync
            crumbs={['Ressources', 'Vue globale']}
            onMariusClick={() => {
              const evt = new CustomEvent('open-chatbot');
              window.dispatchEvent(evt);
            }}
          />

          <div className="px-4 pt-5 pb-32 flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
            {/* ── En-tête ───────────────────────────────────────────── */}
            <header>
              <Eyebrow dotColor="amber">Inventaire · Approvisionnement</Eyebrow>
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
                Ressources
              </h1>
              <div
                style={{
                  fontFamily: 'InstrumentSans, system-ui, sans-serif',
                  fontSize: 13,
                  color: 'var(--muted)',
                }}
              >
                {stats.total} référence{stats.total > 1 ? 's' : ''} suivies · {stockAliment.length} aliments · {stockVeto.length} produits véto
              </div>
            </header>

            {isStockBasFilter && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                  marginTop: -8,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--color-pig-soft, var(--bg-surface-2))',
                    color: 'var(--color-pig-deep, var(--color-pig))',
                    border: '1px solid var(--color-pig)',
                    fontFamily: 'DMMono, ui-monospace, monospace',
                    fontSize: 11,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}
                >
                  <AlertTriangle size={12} aria-hidden="true" />
                  Stock bas · {stockBasCount} produit{stockBasCount > 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={clearStockBasFilter}
                  className="pressable"
                  aria-label="Réinitialiser le filtre stock bas"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'transparent',
                    color: 'var(--muted)',
                    border: '1px solid var(--line)',
                    fontFamily: 'DMMono, ui-monospace, monospace',
                    fontSize: 11,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  <X size={12} aria-hidden="true" />
                  Réinitialiser
                </button>
              </div>
            )}

            {/* ── 4 KPI cards ──────────────────────────────────────── */}
            <section
              aria-label="Indicateurs stock"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 10,
              }}
            >
              <KpiCardV6
                label="Total"
                value={stats.total}
                trend={`${stockAliment.length} aliments`}
                variant="accent"
              />
              <KpiCardV6
                label="Stock OK"
                value={stats.ok}
                trend="Au-dessus du seuil"
              />
              <KpiCardV6
                label="Stock bas"
                value={stats.bas}
                trend={stats.bas > 0 ? 'À surveiller' : 'Aucun'}
                trendDir={stats.bas > 0 ? 'down' : 'up'}
              />
              <KpiCardV6
                label="Rupture"
                value={stats.rupture}
                trend={stats.rupture > 0 ? 'Action requise' : 'Aucune'}
                trendDir={stats.rupture > 0 ? 'down' : 'up'}
              />
            </section>

            {/* ── Sub-tabs (Radix) ──────────────────────────────────── */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                if (v === 'aliments' || v === 'pharmacie') setActiveTab(v);
              }}
            >
              <TabsList aria-label="Type de ressource">
                {TABS.map((t) => (
                  <TabsTrigger key={t.id} value={t.id} style={{ minHeight: 36, gap: 8 }}>
                    {t.icon}
                    <span>{t.label}</span>
                    <span style={{ opacity: 0.75, fontSize: 10 }}>{t.count}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* ── Search bar ────────────────────────────────────────── */}
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--muted)',
                }}
              />
              <input
                type="search"
                placeholder={`Rechercher ${activeTab === 'aliments' ? 'un aliment' : 'un produit'}…`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: 44,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-pill)',
                  paddingLeft: 38,
                  paddingRight: 16,
                  fontFamily: 'InstrumentSans, system-ui, sans-serif',
                  fontSize: 13,
                  color: 'var(--ink)',
                  outline: 'none',
                  transition: 'border-color 160ms var(--ease-emil)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent-500)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}
              />
            </div>

            {/* ── Sub-eyebrow contextuel (counts par treatment) ─────── */}
            {subEyebrowParts.length > 0 && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  fontFamily: 'DMMono, ui-monospace, monospace',
                  fontSize: 10.5,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexWrap: 'wrap',
                  marginTop: -6,
                }}
              >
                <span style={{ color: 'var(--ink)', fontWeight: 600 }}>
                  {activeTab === 'aliments' ? 'Aliments' : 'Pharmacie'}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {activeTab === 'aliments' ? filteredAliments.length : filteredVetos.length} produit{(activeTab === 'aliments' ? filteredAliments.length : filteredVetos.length) > 1 ? 's' : ''}
                </span>
                <span aria-hidden="true">—</span>
                <span>{subEyebrowParts.join(' · ')}</span>
              </div>
            )}

            {/* ── Action groupée Commander ──────────────────────────── */}
            {whatsappReady && groupedOrderUrl && stocksAOrdonner.length >= 2 && (
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
            )}

            {!whatsappReady && treatmentCounts.urgent + treatmentCounts.normal > 0 && (
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
            )}

            {/* ── Liste ressources ─────────────────────────────────── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 12,
              }}
            >
              {activeTab === 'aliments'
                ? filteredAliments.map(a => (
                    <ResourceCard
                      key={a.id}
                      name={a.libelle}
                      qty={a.stockActuel}
                      unit={a.unite}
                      seuil={a.seuilAlerte}
                      statut={a.statutStock}
                      notes={a.notes}
                      joursRestants={projectStockDuration(a, cheptel).joursRestants}
                      treatment={classifyResourceTreatment(a)}
                      orderUrl={orderUrlFor(a)}
                      onRefill={() => handleOpenRefill(a, 'ALIMENT')}
                      onEdit={() => setEditTarget({ item: a, kind: 'ALIMENT' })}
                      onCommander={() => navigate('/ressources/aliments')}
                      onClick={() => navigate('/ressources/aliments')}
                    />
                  ))
                : filteredVetos.map(v => (
                    <ResourceCard
                      key={v.id}
                      name={v.produit}
                      qty={v.stockActuel}
                      unit={v.unite}
                      seuil={v.seuilAlerte}
                      statut={v.statutStock || 'OK'}
                      category={v.type}
                      notes={v.usage}
                      treatment={classifyResourceTreatment(v)}
                      orderUrl={orderUrlFor(v)}
                      onRefill={() => handleOpenRefill(v, 'VETO')}
                      onEdit={() => setEditTarget({ item: v, kind: 'VETO' })}
                      onCommander={() => navigate('/ressources/pharmacie')}
                      onClick={() => navigate('/ressources/pharmacie')}
                    />
                  ))}
            </div>

            {/* ── Accès rapides ─────────────────────────────────────── */}
            <section aria-label="Accès rapides">
              <Eyebrow dotColor="muted">Accès rapides</Eyebrow>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <QuickAccess
                  icon={<Calculator size={18} aria-hidden="true" />}
                  title="Plan alimentaire"
                  subtitle="Rations / jour"
                  onClick={() => navigate('/ressources/aliments/plan')}
                />
                <QuickAccess
                  icon={<ClipboardList size={18} aria-hidden="true" />}
                  title="Formules"
                  subtitle="Recettes mélanges"
                  onClick={() => navigate('/ressources/aliments/formules')}
                />
              </div>
            </section>
          </div>

          <QuickRefillForm
            isOpen={refillTarget !== null}
            onClose={() => setRefillTarget(null)}
            stockItem={refillTarget}
            onSuccess={() => { refreshData(); setRefillTarget(null); }}
          />

          {editTarget && (
            <QuickEditStockForm
              isOpen={editTarget !== null}
              onClose={() => setEditTarget(null)}
              stockItem={editTarget.item}
              kind={editTarget.kind}
              onSuccess={() => { refreshData(); setEditTarget(null); }}
            />
          )}
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

// ─── Sous-composants ───────────────────────────────────────────────────────

interface ResourceCardProps {
  name: string;
  qty: number;
  unit: string;
  seuil: number;
  statut: string;
  category?: string;
  notes?: string;
  joursRestants?: number | null;
  treatment: ResourceTreatment;
  orderUrl?: string | null;
  onRefill: () => void;
  onEdit: () => void;
  onCommander?: () => void;
  onClick?: () => void;
}

interface TreatmentStyle {
  border: string;
  eyebrowDot: string;
  eyebrowLabel: string;
  titleSize: number;
  titleWeight: number;
  valueColor: string;
  fillColor: string;
}

function getTreatmentStyle(treatment: ResourceTreatment): TreatmentStyle {
  if (treatment === 'urgent') {
    return {
      border: '1px solid var(--color-pig)',
      eyebrowDot: 'var(--color-pig)',
      eyebrowLabel: 'Rupture',
      titleSize: 16,
      titleWeight: 700,
      valueColor: 'var(--color-pig-deep)',
      fillColor: 'var(--color-pig)',
    };
  }
  if (treatment === 'normal') {
    return {
      border: '1px solid var(--amber-pork-soft, var(--color-amber-pork))',
      eyebrowDot: 'var(--color-amber-pork)',
      eyebrowLabel: 'Stock bas',
      titleSize: 14,
      titleWeight: 600,
      valueColor: 'var(--amber-pork-deep)',
      fillColor: 'var(--color-amber-pork)',
    };
  }
  return {
    border: '1px solid var(--line)',
    eyebrowDot: 'var(--color-accent-500)',
    eyebrowLabel: 'OK',
    titleSize: 14,
    titleWeight: 600,
    valueColor: 'var(--ink)',
    fillColor: 'var(--color-accent-500)',
  };
}

const ResourceCard: React.FC<ResourceCardProps> = ({
  name, qty, unit, seuil, statut: _statut, category, notes, joursRestants,
  treatment, orderUrl, onRefill, onEdit, onCommander,
}) => {
  const style = getTreatmentStyle(treatment);
  const isUrgent = treatment === 'urgent';
  const isNormal = treatment === 'normal';
  const progress = seuil > 0 ? Math.min(100, (qty / (seuil * 2.5)) * 100) : 100;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 12,
        padding: '14px 16px',
        border: style.border,
        boxShadow: isUrgent
          ? '0 1px 2px rgba(180,40,40,0.06), 0 2px 8px rgba(180,40,40,0.05)'
          : '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        position: 'relative',
      }}
    >
      {/* ── Eyebrow status ─────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'DMMono, ui-monospace, monospace',
            fontSize: 10,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: style.eyebrowDot,
              display: 'inline-block',
            }}
          />
          <span style={{ color: isUrgent ? 'var(--color-pig-deep)' : 'var(--muted)' }}>
            {style.eyebrowLabel}
          </span>
        </div>
        {isUrgent && (
          <AlertTriangle size={14} color="var(--color-pig)" aria-hidden="true" />
        )}
      </div>

      {/* ── Titre + actions edit/refill ─────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3
            style={{
              fontFamily: 'BigShoulders, system-ui, sans-serif',
              fontSize: style.titleSize,
              fontWeight: style.titleWeight,
              color: 'var(--ink)',
              margin: 0,
              letterSpacing: '-0.005em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </h3>
          {category && (
            <p
              style={{
                fontFamily: 'DMMono, ui-monospace, monospace',
                fontSize: 10,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                margin: '2px 0 0',
              }}
            >
              {category}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            aria-label={`Éditer ${name}`}
            className="pressable"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--bg-surface-2)',
              color: 'var(--muted)',
              border: '1px solid var(--line)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'transform 160ms var(--ease-emil)',
            }}
          >
            <Edit3 size={13} aria-hidden="true" />
          </button>
          {!isUrgent && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRefill(); }}
              aria-label={`Réapprovisionner ${name}`}
              className="pressable"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--color-accent-100)',
                color: 'var(--color-accent-600)',
                border: '1px solid var(--color-accent-100)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 160ms var(--ease-emil)',
              }}
            >
              <Plus size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* ── Quantité ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: isUrgent ? 28 : 24,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: style.valueColor,
            lineHeight: 1,
          }}
        >
          {qty}
        </span>
        <span
          style={{
            fontFamily: 'DMMono, ui-monospace, monospace',
            fontSize: 11,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          {unit}
        </span>
      </div>

      {/* ── Barre stock + jours restants ────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'DMMono, ui-monospace, monospace',
            fontSize: 9.5,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          <span>Stock</span>
          <span>Seuil : {seuil} {unit}</span>
        </div>
        <div
          style={{
            height: 4,
            background: 'var(--bg-app)',
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: style.fillColor,
              borderRadius: 999,
              transition: 'width 240ms var(--ease-emil)',
            }}
          />
        </div>
        {joursRestants != null && (
          <div
            style={{
              fontFamily: 'DMMono, ui-monospace, monospace',
              fontSize: 11,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color:
                joursRestants < 7
                  ? 'var(--color-pig)'
                  : joursRestants < 14
                    ? 'var(--amber-pork-deep)'
                    : 'var(--muted)',
            }}
          >
            {formatJoursRestants(joursRestants)}
          </div>
        )}
      </div>

      {/* ── CTA Commander ──────────────────────────────────── */}
      {orderUrl && (isUrgent || isNormal) ? (
        <a
          href={orderUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Commander ${name} via WhatsApp`}
          className="pressable"
          style={{
            marginTop: 2,
            width: '100%',
            minHeight: 38,
            borderRadius: 8,
            background: isUrgent ? 'var(--color-pig)' : 'var(--color-accent-500)',
            color: 'var(--bg-surface)',
            border: 'none',
            fontFamily: 'BigShoulders, system-ui, sans-serif',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'transform 160ms var(--ease-emil)',
          }}
        >
          Commander
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      ) : isUrgent && onCommander ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCommander(); }}
          aria-label={`Commander ${name}`}
          className="pressable"
          style={{
            marginTop: 2,
            width: '100%',
            minHeight: 38,
            borderRadius: 8,
            background: 'var(--color-pig)',
            color: 'var(--bg-surface)',
            border: 'none',
            fontFamily: 'BigShoulders, system-ui, sans-serif',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            cursor: 'pointer',
            transition: 'transform 160ms var(--ease-emil)',
          }}
        >
          Commander
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      ) : null}

      {/* ── Notes (caché si CTA Commander affiché) ─────────── */}
      {notes && !isUrgent && !(orderUrl && isNormal) && (
        <p
          style={{
            fontFamily: 'InstrumentSans, system-ui, sans-serif',
            fontSize: 11,
            color: isNormal ? 'var(--amber-pork-deep)' : 'var(--muted)',
            fontStyle: isNormal ? 'normal' : 'italic',
            borderTop: '1px solid var(--line-2)',
            paddingTop: 8,
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {notes}
        </p>
      )}
    </div>
  );
};

interface QuickAccessProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}

const QuickAccess: React.FC<QuickAccessProps> = ({ icon, title, subtitle, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={title}
    className="pressable"
    style={{
      background: 'var(--bg-surface)',
      borderRadius: 12,
      padding: '14px 16px',
      boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
      border: 'none',
      cursor: 'pointer',
      textAlign: 'left',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      minHeight: 44,
      transition: 'transform 160ms var(--ease-emil)',
    }}
  >
    <span
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: 'var(--color-accent-100)',
        color: 'var(--color-accent-600)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {icon}
    </span>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div
        style={{
          fontFamily: 'BigShoulders, system-ui, sans-serif',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--ink)',
          letterSpacing: '-0.005em',
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: 'DMMono, ui-monospace, monospace',
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginTop: 2,
        }}
      >
        {subtitle}
      </div>
    </div>
  </button>
);

export default RessourcesHub;
