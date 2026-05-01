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
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import {
  AlertTriangle, Plus, Edit3, Droplets, FlaskConical, Search,
  Calculator, ClipboardList,
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
import { useFarm, useMeta } from '../../context/FarmContext';
import type { StockAliment, StockVeto } from '../../types/farm';

// ─── Types ──────────────────────────────────────────────────────────────────

type ResourceTab = 'aliments' | 'pharmacie';
type StockItem = StockAliment | StockVeto;

// ─── Composant ──────────────────────────────────────────────────────────────

const RessourcesHub: React.FC = () => {
  const navigate = useNavigate();
  const { stockAliment, stockVeto, refreshData } = useFarm();
  const { lastUpdate } = useMeta();
  const { handleRefresh } = useAutoRefresh();

  const [activeTab, setActiveTab] = useState<ResourceTab>('aliments');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAliments = useMemo(() => {
    return stockAliment.filter(a =>
      a.libelle.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [stockAliment, searchQuery]);

  const filteredVetos = useMemo(() => {
    return stockVeto.filter(v =>
      v.produit.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [stockVeto, searchQuery]);

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

  const lastSyncMinutes = lastUpdate
    ? Math.max(0, Math.round((Date.now() - lastUpdate) / 60_000))
    : undefined;

  const [refillTarget, setRefillTarget] = useState<RefillStockItem | null>(null);
  const [editTarget, setEditTarget] = useState<{ item: StockItem; kind: StockKind } | null>(null);

  const handleOpenRefill = (item: StockItem, kind: StockKind) => {
    setRefillTarget(toRefillItem(item, kind));
  };

  const TABS: { id: ResourceTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'aliments', label: 'Aliments', icon: <Droplets size={13} aria-hidden="true" />, count: stockAliment.length },
    { id: 'pharmacie', label: 'Pharmacie', icon: <FlaskConical size={13} aria-hidden="true" />, count: stockVeto.length },
  ];

  // Spark déterministe pour KPIs
  const spark = (base: number) =>
    Array.from({ length: 7 }, (_, i) => Math.max(0, Math.round(base * (0.85 + 0.05 * i))));

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
            <IonRefresherContent />
          </IonRefresher>

          <TopBarSync
            crumbs={['Pilotage', 'Ressources']}
            lastSyncMinutes={lastSyncMinutes}
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
                spark={spark(stats.total || 1)}
                variant="accent"
              />
              <KpiCardV6
                label="Stock OK"
                value={stats.ok}
                trend="Au-dessus du seuil"
                spark={spark(stats.ok || 1)}
              />
              <KpiCardV6
                label="Stock bas"
                value={stats.bas}
                trend={stats.bas > 0 ? 'À surveiller' : 'Aucun'}
                trendDir={stats.bas > 0 ? 'down' : 'up'}
                spark={spark(stats.bas || 1)}
              />
              <KpiCardV6
                label="Rupture"
                value={stats.rupture}
                trend={stats.rupture > 0 ? 'Action requise' : 'Aucune'}
                trendDir={stats.rupture > 0 ? 'down' : 'up'}
                spark={spark(stats.rupture || 1)}
              />
            </section>

            {/* ── Sub-tabs (pills) ──────────────────────────────────── */}
            <div
              role="tablist"
              aria-label="Type de ressource"
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              {TABS.map(t => {
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(t.id)}
                    className="pressable"
                    style={{
                      minHeight: 44,
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-pill)',
                      background: active ? 'var(--color-accent-500)' : 'var(--bg-surface)',
                      color: active ? 'var(--bg-surface)' : 'var(--ink-soft)',
                      border: `1px solid ${active ? 'var(--color-accent-500)' : 'var(--line)'}`,
                      fontFamily: 'DMMono, ui-monospace, monospace',
                      fontSize: 11,
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'transform 160ms var(--ease-emil), background 200ms var(--ease-emil)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                    <span style={{ opacity: 0.75, fontSize: 10 }}>{t.count}</span>
                  </button>
                );
              })}
            </div>

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
                      onRefill={() => handleOpenRefill(a, 'ALIMENT')}
                      onEdit={() => setEditTarget({ item: a, kind: 'ALIMENT' })}
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
                      onRefill={() => handleOpenRefill(v, 'VETO')}
                      onEdit={() => setEditTarget({ item: v, kind: 'VETO' })}
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
  onRefill: () => void;
  onEdit: () => void;
  onClick?: () => void;
}

const ResourceCard: React.FC<ResourceCardProps> = ({
  name, qty, unit, seuil, statut, category, notes, onRefill, onEdit,
}) => {
  const isRupture = statut === 'RUPTURE';
  const isBas = statut === 'BAS';
  const progress = seuil > 0 ? Math.min(100, (qty / (seuil * 2.5)) * 100) : 100;

  const fillColor = isRupture
    ? 'var(--color-pig)'
    : isBas
      ? 'var(--color-amber-pork)'
      : 'var(--color-accent-500)';

  const valueColor = isRupture ? 'var(--color-pig-deep)' : 'var(--ink)';

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 12,
        padding: '14px 16px',
        boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <h3
              style={{
                fontFamily: 'BigShoulders, system-ui, sans-serif',
                fontSize: 16,
                fontWeight: 600,
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
            {isRupture && (
              <AlertTriangle size={13} color="var(--color-pig-deep)" aria-hidden="true" />
            )}
          </div>
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
              width: 36,
              height: 36,
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
            <Edit3 size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRefill(); }}
            aria-label={`Réapprovisionner ${name}`}
            className="pressable"
            style={{
              width: 36,
              height: 36,
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
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span
          style={{
            fontFamily: 'BricolageGrotesque, system-ui, sans-serif',
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: valueColor,
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
              background: fillColor,
              borderRadius: 999,
              transition: 'width 240ms var(--ease-emil)',
            }}
          />
        </div>
      </div>

      {notes && (
        <p
          style={{
            fontFamily: 'InstrumentSans, system-ui, sans-serif',
            fontSize: 11,
            color: 'var(--muted)',
            fontStyle: 'italic',
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
