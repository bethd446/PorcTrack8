/**
 * PharmacieView — /ressources/pharmacie
 * ══════════════════════════════════════════════════════════════════════════
 * V70 natif (mockup ressources-reproduction-mockup-v76.html#ressources-pharmacie).
 * Tabs Vaccins / Antibio / Vermifuges / Autres. Ligne items 3-niveaux
 * (icône + main + pill). Édition inline conservée (stock_actuel,
 * stock_min, notes), commande WhatsApp préservée.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import {
  Stethoscope, Plus, ExternalLink, Settings, AlertOctagon, ChevronLeft,
} from 'lucide-react';
import EditableNumber from '../../components/EditableNumber';
import EditableText from '../../components/EditableText';
import { useFarm, useMeta } from '../../context/FarmContext';
import { updateProduitVeto } from '../../services/supabaseWrites';
import type { StockVeto } from '../../types/farm';
import QuickAddVetoForm from '../../components/forms/QuickAddVetoForm';
import {
  buildSingleItemOrderURL,
  buildWhatsAppOrderURL,
  hasWhatsAppSupport,
  type OrderItem,
} from '../../utils/whatsappOrder';
import { Section } from '../../v70/components/ds/Section';
import { Pill, type PillVariant } from '../../v70/components/ds/Pill';

type PharmacieTab = 'vaccins' | 'antibio' | 'vermifuges' | 'autres';
type ResourceTreatment = 'urgent' | 'normal' | 'resolu';

function manqueVeto(item: StockVeto): number {
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

function classify(item: StockVeto): ResourceTreatment {
  const stock = item.stockActuel ?? 0;
  const seuil =
    typeof item.stockMin === 'number' ? item.stockMin : item.seuilAlerte ?? 0;
  if (stock === 0 || /rupt/i.test(item.statutStock ?? '')) return 'urgent';
  if (stock < seuil) return 'normal';
  return 'resolu';
}

function pillFor(item: StockVeto): { variant: PillVariant; label: string } {
  const t = classify(item);
  if (t === 'urgent') return { variant: 'danger', label: 'Rupture' };
  if (t === 'normal') return { variant: 'warning', label: 'Bas' };
  return { variant: 'success', label: 'OK' };
}

function categorize(item: StockVeto): PharmacieTab {
  const s = `${item.produit} ${item.type ?? ''} ${item.usage ?? ''}`.toLowerCase();
  if (/vaccin/.test(s)) return 'vaccins';
  if (/antibio|amoxi|tétracy|tetracy|p[eé]nicill|tylosin|pénicill/.test(s)) return 'antibio';
  if (/vermif|ivermectin|antiparasit|d[eé]parasit/.test(s)) return 'vermifuges';
  return 'autres';
}

const STATUT_PRIORITY: Record<string, number> = { RUPTURE: 0, BAS: 1, OK: 2 };

function sortItems(items: StockVeto[]): StockVeto[] {
  return [...items].sort((a, b) => {
    const pa = STATUT_PRIORITY[a.statutStock ?? ''] ?? 3;
    const pb = STATUT_PRIORITY[b.statutStock ?? ''] ?? 3;
    if (pa !== pb) return pa - pb;
    return a.produit.localeCompare(b.produit, 'fr');
  });
}

interface VetoRowProps {
  item: StockVeto;
  farmName: string;
  onRefresh: () => Promise<void>;
}

const VetoRow: React.FC<VetoRowProps> = ({ item, farmName, onRefresh }) => {
  const treatment = classify(item);
  const pill = pillFor(item);
  const subParts: string[] = [];
  if (item.type) subParts.push(item.type);
  if (item.usage) subParts.push(item.usage);
  subParts.push(`${item.stockActuel ?? 0} ${item.unite}`);
  const minValue =
    typeof item.stockMin === 'number' ? item.stockMin : item.seuilAlerte ?? null;

  const orderUrl = needsOrderVeto(item)
    ? buildSingleItemOrderURL(item.produit, manqueVeto(item), item.unite, farmName)
    : null;

  return (
    <div
      className="card-link"
      style={{
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 16px',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%' }}>
        <div className="card-link__icon" aria-hidden>
          <Stethoscope size={18} />
        </div>
        <div className="card-link__main">
          <div
            className="card-link__title"
            style={{
              fontFamily: 'var(--ff-display)',
              fontWeight: 700,
              fontSize: 15,
              textTransform: 'none',
              letterSpacing: 0,
            }}
          >
            {item.produit}
          </div>
          <div
            className="card-link__sub"
            style={{
              marginTop: 2,
              fontFamily: 'var(--ff-mono)',
              fontSize: 11,
              letterSpacing: '0.04em',
            }}
          >
            {subParts.join(' · ')}
          </div>
        </div>
        <Pill variant={pill.variant}>{pill.label}</Pill>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          fontFamily: 'var(--ff-mono)',
          fontSize: 11,
          color: 'var(--pt-muted)',
          width: '100%',
        }}
      >
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stock</span>
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
        <span aria-hidden>/</span>
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
        <span>{item.unite}</span>
      </div>

      <div style={{ width: '100%', fontSize: 12, color: 'var(--pt-muted)' }}>
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

      {orderUrl && (
        <a
          href={orderUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Commander ${item.produit} via WhatsApp`}
          className="btn--primary"
          style={{
            padding: '8px 14px',
            borderRadius: 999,
            minHeight: 36,
            fontSize: 11,
            alignSelf: 'flex-start',
            textDecoration: 'none',
            background:
              treatment === 'urgent' ? 'var(--pt-danger)' : 'var(--pt-primary)',
            borderColor:
              treatment === 'urgent' ? 'var(--pt-danger)' : 'var(--pt-primary)',
          }}
        >
          Commander
          <ExternalLink size={12} aria-hidden />
        </a>
      )}
    </div>
  );
};

const PharmacieView: React.FC = () => {
  const navigate = useNavigate();
  const { stockVeto, refreshData } = useFarm();
  const { nomFerme: FARM_NAME } = useMeta();
  const [addOpen, setAddOpen] = useState(false);
  const [tab, setTab] = useState<PharmacieTab>('vaccins');
  const whatsappReady = hasWhatsAppSupport();

  const partition = useMemo(() => {
    const buckets: Record<PharmacieTab, StockVeto[]> = {
      vaccins: [],
      antibio: [],
      vermifuges: [],
      autres: [],
    };
    for (const it of stockVeto) {
      buckets[categorize(it)].push(it);
    }
    return {
      vaccins: sortItems(buckets.vaccins),
      antibio: sortItems(buckets.antibio),
      vermifuges: sortItems(buckets.vermifuges),
      autres: sortItems(buckets.autres),
    };
  }, [stockVeto]);

  const stats = useMemo(() => {
    let ok = 0;
    let bas = 0;
    let rupture = 0;
    for (const it of stockVeto) {
      const t = classify(it);
      if (t === 'urgent') rupture += 1;
      else if (t === 'normal') bas += 1;
      else ok += 1;
    }
    return {
      total: stockVeto.length,
      ok,
      bas,
      rupture,
      vaccinsCount: partition.vaccins.length,
      antibioCount: partition.antibio.length,
    };
  }, [stockVeto, partition]);

  const stocksAOrdonner = useMemo<OrderItem[]>(
    () =>
      stockVeto.filter(needsOrderVeto).map((it) => ({
        libelle: it.produit,
        manqueKg: manqueVeto(it),
        unite: it.unite,
      })),
    [stockVeto],
  );

  const groupedOrderUrl = useMemo(
    () =>
      stocksAOrdonner.length >= 2
        ? buildWhatsAppOrderURL(stocksAOrdonner, FARM_NAME)
        : null,
    [stocksAOrdonner, FARM_NAME],
  );

  const items = partition[tab];
  const subInfo: string[] = [];
  if (stats.rupture > 0) subInfo.push(`${stats.rupture} rupture${stats.rupture > 1 ? 's' : ''}`);
  if (stats.bas > 0) subInfo.push(`${stats.bas} stock${stats.bas > 1 ? 's' : ''} bas`);
  const subtitle =
    subInfo.length > 0
      ? `Vaccins, antibiotiques, vermifuges · ${subInfo.join(' · ')}`
      : 'Vaccins, antibiotiques, vermifuges';

  const isEmpty = stockVeto.length === 0;

  const tabs: { value: PharmacieTab; label: string; count: number }[] = [
    { value: 'vaccins', label: 'Vaccins', count: partition.vaccins.length },
    { value: 'antibio', label: 'Antibio', count: partition.antibio.length },
    { value: 'vermifuges', label: 'Vermif.', count: partition.vermifuges.length },
    { value: 'autres', label: 'Autres', count: partition.autres.length },
  ];

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <div className="pt-screen">
          <header className="ph--primary">
            <button
              type="button"
              className="back"
              aria-label="Retour à Ressources"
              onClick={() => navigate('/ressources')}
            >
              <ChevronLeft size={18} strokeWidth={1.8} aria-hidden />
            </button>
            <div className="eyebrow">Ressources · Pharmacie</div>
            <h1>Pharmacie</h1>
            <div className="sub">{subtitle}</div>
          </header>

          <div className="phone-content" style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
            <div className="kpis-strip">
              <div className="kpi">
                <div className="kpi__label">Produits</div>
                <div className="kpi__val num">{stats.total}</div>
              </div>
              <div className="kpi">
                <div className="kpi__label">Vaccins</div>
                <div className="kpi__val num">{stats.vaccinsCount}</div>
              </div>
              <div className="kpi">
                <div className="kpi__label">Antibio</div>
                <div className="kpi__val num">{stats.antibioCount}</div>
              </div>
              <div className="kpi">
                <div className="kpi__label">Rupture</div>
                <div className="kpi__val num" style={{ color: 'var(--pt-danger)' }}>{stats.rupture}</div>
              </div>
            </div>

            {stats.rupture > 0 && (
              <div role="alert" className="alert-card alert-card--danger">
                <AlertOctagon size={18} className="alert-card__icon" aria-hidden />
                <div className="alert-card__body">
                  <div className="alert-card__title">
                    {stats.rupture} produit{stats.rupture > 1 ? 's' : ''} en rupture
                  </div>
                  <div className="alert-card__text">
                    Commander d’urgence pour ne pas interrompre les traitements.
                  </div>
                </div>
              </div>
            )}

            {whatsappReady && groupedOrderUrl && (
              <a
                href={groupedOrderUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Commander ${stocksAOrdonner.length} produits via WhatsApp`}
                className="btn--primary"
                style={{
                  width: '100%',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  minHeight: 44,
                  marginBottom: 12,
                  textDecoration: 'none',
                }}
              >
                <span>Commander {stocksAOrdonner.length} produits via WhatsApp</span>
                <ExternalLink size={14} aria-hidden />
              </a>
            )}

            {!whatsappReady && stocksAOrdonner.length > 0 && (
              <button
                type="button"
                onClick={() => navigate('/reglages')}
                aria-label="Configurer le numéro WhatsApp dans les Réglages"
                className="btn--ghost"
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: '10px 14px',
                  minHeight: 44,
                  marginBottom: 12,
                }}
              >
                <Settings size={13} aria-hidden />
                Numéro WhatsApp non configuré · Régler dans Réglages
              </button>
            )}

            <div className="pills" role="tablist" aria-label="Catégorie pharmacie">
              {tabs.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  className={`pill${tab === t.value ? ' is-active' : ''}`}
                  aria-selected={tab === t.value}
                  aria-label={`${t.label} · ${t.count}`}
                  onClick={() => setTab(t.value)}
                >
                  {t.label} <span className="num">{t.count}</span>
                </button>
              ))}
            </div>

            {isEmpty ? (
              <div className="empty-state">
                <div className="empty-state__icon" aria-hidden>
                  <Stethoscope size={48} strokeWidth={1.25} />
                </div>
                <div className="empty-state__title">Pharmacie vide</div>
                <div className="empty-state__sub">
                  Renseigne ton premier produit vétérinaire pour suivre les stocks.
                </div>
                <button
                  type="button"
                  className="btn--primary"
                  onClick={() => setAddOpen(true)}
                  style={{ padding: '12px 20px', minHeight: 44 }}
                >
                  <Plus size={14} aria-hidden /> Nouveau produit
                </button>
              </div>
            ) : (
              <Section label={`${items.length} produit${items.length > 1 ? 's' : ''}`}>
                {items.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state__icon" aria-hidden>
                      <Stethoscope size={40} strokeWidth={1.25} />
                    </div>
                    <div className="empty-state__title">Aucun élément</div>
                    <div className="empty-state__sub">
                      Aucun produit dans cette catégorie.
                    </div>
                  </div>
                ) : (
                  items.map((item) => (
                    <VetoRow
                      key={item.id || item.produit}
                      item={item}
                      farmName={FARM_NAME}
                      onRefresh={refreshData}
                    />
                  ))
                )}
              </Section>
            )}
          </div>
        </div>

        <button
          type="button"
          className="fab--v77"
          onClick={() => setAddOpen(true)}
          aria-label="Nouveau produit"
        >
          <Plus size={22} aria-hidden />
        </button>

        <QuickAddVetoForm
          isOpen={addOpen}
          onClose={() => setAddOpen(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default PharmacieView;
