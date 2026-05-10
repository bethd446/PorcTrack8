/**
 * AlimentsView — /ressources/aliments
 * ══════════════════════════════════════════════════════════════════════════
 * V70 natif (mockup ressources-reproduction-mockup-v76.html#ressources-aliments).
 * Liste 3-niveaux (icone + main + count/pill) avec stockbar visuelle, KPIs
 * strip 4 colonnes (Total kg / OK / Bas / Rupture) et tabs Sacs prêts /
 * Matières premières. Logique métier (autonomie, edits inline, commande
 * WhatsApp) préservée.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import {
  Wheat, ExternalLink, Settings, Plus, AlertOctagon,
} from 'lucide-react';
import EditableNumber from '../../components/EditableNumber';
import EditableText from '../../components/EditableText';
import { AppToast, useAppToast } from '../../components/agritech';
import { useFarm, useMeta } from '../../context/FarmContext';
import { Section } from '../../v70/components/ds/Section';
import { Pill, type PillVariant } from '../../v70/components/ds/Pill';
import { PageHeader } from '../../v70/components/ds/PageHeader';
import {
  updateProduitAliment,
  listFournisseurs,
  type FournisseurRow,
} from '../../services/supabaseWrites';
import type {
  StockAliment,
  Truie,
  Verrat,
  BandePorcelets,
} from '../../types/farm';
import QuickAddAlimentForm from '../../components/forms/QuickAddAlimentForm';
import { projectStockDuration, formatJoursRestants } from '../../utils/stockProjection';
import {
  buildSingleItemOrderURL,
  buildSupplierOrderURL,
  buildWhatsAppOrderURL,
  hasWhatsAppSupport,
  type OrderItem,
} from '../../utils/whatsappOrder';

type AlimentTab = 'sacs' | 'matieres';
type ResourceTreatment = 'urgent' | 'normal' | 'resolu';

function classifyTreatment(item: StockAliment): ResourceTreatment {
  const stock = item.stockActuel ?? 0;
  const seuil = item.seuilAlerte ?? 0;
  if (stock === 0 || /rupt/i.test(item.statutStock ?? '')) return 'urgent';
  if (stock < seuil) return 'normal';
  return 'resolu';
}

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

function isMatierePremiere(item: StockAliment): boolean {
  const s = `${item.libelle} ${item.id ?? ''}`.toLowerCase();
  return /ma[iï]s|tourteau|soja|son\b|orge|\bbl[eé]\b|coquille|huile|coton/.test(s);
}

const STATUT_PRIORITY: Record<string, number> = { RUPTURE: 0, BAS: 1, OK: 2 };

function sortByTreatment(items: StockAliment[]): StockAliment[] {
  return [...items].sort((a, b) => {
    const pa = STATUT_PRIORITY[a.statutStock ?? ''] ?? 3;
    const pb = STATUT_PRIORITY[b.statutStock ?? ''] ?? 3;
    if (pa !== pb) return pa - pb;
    return (a.libelle || a.id).localeCompare(b.libelle || b.id, 'fr');
  });
}

function pillForTreatment(t: ResourceTreatment): { variant: PillVariant; label: string } {
  if (t === 'urgent') return { variant: 'danger', label: 'Rupture' };
  if (t === 'normal') return { variant: 'warning', label: 'Bas' };
  return { variant: 'success', label: 'OK' };
}

function stockbarClass(t: ResourceTreatment): string {
  if (t === 'urgent') return 'stockbar danger';
  if (t === 'normal') return 'stockbar warn';
  return 'stockbar';
}

function stockPercent(item: StockAliment): number {
  const stock = item.stockActuel ?? 0;
  const seuil = item.seuilAlerte ?? 0;
  if (stock <= 0) return 0;
  if (seuil <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((stock / (seuil * 2.5)) * 100)));
}

interface AlimentRowProps {
  item: StockAliment;
  cheptel: { truies: Truie[]; verrats: Verrat[]; bandes: BandePorcelets[] };
  fournisseurs: FournisseurRow[];
  farmName: string;
  onRefresh: () => Promise<void>;
}

const AlimentRow: React.FC<AlimentRowProps> = ({
  item, cheptel, fournisseurs, farmName, onRefresh,
}) => {
  const treatment = classifyTreatment(item);
  const pill = pillForTreatment(treatment);
  const projection = projectStockDuration(item, cheptel);
  const percent = stockPercent(item);

  const subParts: string[] = [];
  if (projection.joursRestants != null) {
    subParts.push(formatJoursRestants(projection.joursRestants));
  }
  subParts.push(`${item.stockActuel ?? 0} ${item.unite} restants · seuil ${item.seuilAlerte ?? 0}`);

  const orderUrl = (() => {
    if (!needsOrder(item)) return null;
    const f = item.fournisseurId
      ? fournisseurs.find((x) => x.id === item.fournisseurId)
      : undefined;
    if (f) {
      return buildSupplierOrderURL({
        fournisseur: { nom: f.nom, whatsapp_number: f.whatsapp_number },
        produit: item.libelle || item.id,
        qteKg: manqueKgOf(item),
        farmName,
      });
    }
    return buildSingleItemOrderURL(
      item.libelle || item.id,
      manqueKgOf(item),
      item.unite,
      farmName,
    );
  })();

  const valueColor =
    treatment === 'urgent'
      ? 'var(--pt-danger)'
      : treatment === 'normal'
        ? 'var(--pt-warning)'
        : 'var(--pt-ink)';

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
          <Wheat size={18} />
        </div>
        <div className="card-link__main">
          <div className="card-link__title" style={{ fontFamily: 'var(--pt-font-display)', fontWeight: 700, fontSize: 15, textTransform: 'none', letterSpacing: 0 }}>
            {item.libelle || item.id}
          </div>
          <div className="card-link__sub" style={{ marginTop: 2 }}>
            {subParts.join(' · ')}
          </div>
          <div className={stockbarClass(treatment)} style={{ marginTop: 6, width: '100%' }}>
            <span style={{ width: `${percent}%` }} />
          </div>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, minWidth: 84 }}>
          <div
            className="num"
            style={{
              fontFamily: 'var(--pt-font-display)',
              fontWeight: 900,
              fontSize: 18,
              lineHeight: 1,
              color: valueColor,
            }}
          >
            {item.stockActuel ?? 0}
            <small style={{ fontSize: 10, marginLeft: 2, fontWeight: 600 }}>{item.unite}</small>
          </div>
          <Pill variant={pill.variant}>{pill.label}</Pill>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          fontFamily: 'var(--pt-font-mono)',
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
          ariaLabel={`Modifier le stock actuel de ${item.libelle || item.id}`}
          onSave={async (v) => {
            const res = await updateProduitAliment(item.id, { stock_actuel: v });
            if (res.success) await onRefresh();
            return res;
          }}
        />
        <span aria-hidden>/</span>
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
        <span>{item.unite}</span>
      </div>

      <div style={{ width: '100%', fontSize: 12, color: 'var(--pt-muted)' }}>
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

      {orderUrl && (
        <a
          href={orderUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Commander ${item.libelle || item.id} via WhatsApp`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 999,
            background:
              treatment === 'urgent' ? 'var(--pt-danger)' : 'var(--pt-primary)',
            color: 'white',
            fontFamily: 'var(--pt-font-mono)',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            textDecoration: 'none',
            minHeight: 36,
            alignSelf: 'flex-start',
          }}
        >
          Commander
          <ExternalLink size={12} aria-hidden />
        </a>
      )}
    </div>
  );
};

const AlimentsView: React.FC = () => {
  const navigate = useNavigate();
  const { stockAliment, refreshData, truies, verrats, bandes } = useFarm();
  const { nomFerme: FARM_NAME } = useMeta();
  const cheptel = useMemo(() => ({ truies, verrats, bandes }), [truies, verrats, bandes]);
  const { toastProps } = useAppToast();
  const [addOpen, setAddOpen] = useState(false);
  const [fournisseurs, setFournisseurs] = useState<FournisseurRow[]>([]);
  const [tab, setTab] = useState<AlimentTab>('sacs');
  const whatsappReady = hasWhatsAppSupport();

  React.useEffect(() => {
    let active = true;
    void listFournisseurs().then((list) => {
      if (active) setFournisseurs(list);
    });
    return () => {
      active = false;
    };
  }, []);

  const partition = useMemo(() => {
    const sacs: StockAliment[] = [];
    const matieres: StockAliment[] = [];
    for (const it of stockAliment) {
      if (isMatierePremiere(it)) matieres.push(it);
      else sacs.push(it);
    }
    return {
      sacs: sortByTreatment(sacs),
      matieres: sortByTreatment(matieres),
    };
  }, [stockAliment]);

  const stats = useMemo(() => {
    const totalKg = stockAliment.reduce((sum, it) => sum + (it.stockActuel ?? 0), 0);
    let ok = 0;
    let bas = 0;
    let rupture = 0;
    for (const it of stockAliment) {
      const t = classifyTreatment(it);
      if (t === 'urgent') rupture += 1;
      else if (t === 'normal') bas += 1;
      else ok += 1;
    }
    return { totalKg, ok, bas, rupture };
  }, [stockAliment]);

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

  const items = tab === 'sacs' ? partition.sacs : partition.matieres;
  const subInfo: string[] = [];
  if (stats.rupture > 0) subInfo.push(`${stats.rupture} rupture${stats.rupture > 1 ? 's' : ''}`);
  if (stats.bas > 0) subInfo.push(`${stats.bas} stock${stats.bas > 1 ? 's' : ''} bas`);
  const subtitle =
    subInfo.length > 0
      ? `Stock matières premières + sacs prêts · ${subInfo.join(' · ')}`
      : 'Stock matières premières + sacs prêts';

  const isEmptyAll = stockAliment.length === 0;

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <div className="phone-content" style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
          <PageHeader
            eyebrow="Stocks · Aliments"
            title="Aliments"
            subtitle={subtitle}
            onBack={() => navigate('/ressources')}
          />

          <div className="kpis-strip">
            <div className="kpi">
              <div className="kpi__label">Total kg</div>
              <div className="kpi__val num">{stats.totalKg}</div>
            </div>
            <div className="kpi">
              <div className="kpi__label">OK</div>
              <div className="kpi__val num" style={{ color: 'var(--pt-success)' }}>{stats.ok}</div>
            </div>
            <div className="kpi">
              <div className="kpi__label">Bas</div>
              <div className="kpi__val num" style={{ color: 'var(--pt-warning)' }}>{stats.bas}</div>
            </div>
            <div className="kpi">
              <div className="kpi__label">Rupture</div>
              <div className="kpi__val num" style={{ color: 'var(--pt-danger)' }}>{stats.rupture}</div>
            </div>
          </div>

          {stats.rupture > 0 && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 14px',
                background: 'var(--pt-rose-bg)',
                color: 'var(--pt-rose-ink)',
                borderRadius: 12,
                margin: '8px 0 12px',
              }}
            >
              <AlertOctagon size={18} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--pt-font-display)', fontWeight: 700, fontSize: 14, textTransform: 'uppercase' }}>
                  {stats.rupture} matière{stats.rupture > 1 ? 's' : ''} en rupture
                </div>
                <div style={{ fontSize: 12, marginTop: 2 }}>
                  Commander d’urgence — production à l’arrêt si non réapprovisionné.
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
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '12px 16px',
                borderRadius: 12,
                background: 'var(--pt-primary)',
                color: 'white',
                textDecoration: 'none',
                fontFamily: 'var(--pt-font-display)',
                fontWeight: 800,
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: 12,
                minHeight: 44,
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 12,
                background: 'transparent',
                border: '1px dashed var(--pt-line-strong)',
                color: 'var(--pt-muted)',
                fontFamily: 'var(--pt-font-mono)',
                fontSize: 12,
                textAlign: 'left',
                marginBottom: 12,
                width: '100%',
                minHeight: 44,
                cursor: 'pointer',
              }}
            >
              <Settings size={13} aria-hidden />
              Numéro WhatsApp non configuré · Régler dans Réglages
            </button>
          )}

          <nav
            role="tablist"
            aria-label="Type d’aliment"
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'sacs'}
              onClick={() => setTab('sacs')}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 999,
                border: '1px solid var(--pt-line-strong)',
                background: tab === 'sacs' ? 'var(--pt-ink)' : 'transparent',
                color: tab === 'sacs' ? 'var(--pt-warm)' : 'var(--pt-muted)',
                fontFamily: 'var(--pt-font-mono)',
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.10em',
                cursor: 'pointer',
                minHeight: 44,
              }}
            >
              Sacs prêts <span className="num" style={{ marginLeft: 4, opacity: 0.7 }}>{partition.sacs.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'matieres'}
              onClick={() => setTab('matieres')}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 999,
                border: '1px solid var(--pt-line-strong)',
                background: tab === 'matieres' ? 'var(--pt-ink)' : 'transparent',
                color: tab === 'matieres' ? 'var(--pt-warm)' : 'var(--pt-muted)',
                fontFamily: 'var(--pt-font-mono)',
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.10em',
                cursor: 'pointer',
                minHeight: 44,
              }}
            >
              Matières prem. <span className="num" style={{ marginLeft: 4, opacity: 0.7 }}>{partition.matieres.length}</span>
            </button>
          </nav>

          {isEmptyAll ? (
            <div className="empty">
              <Wheat size={48} strokeWidth={1.25} color="var(--pt-subtle)" aria-hidden />
              <div style={{ fontFamily: 'var(--pt-font-display)', fontWeight: 900, fontSize: 22, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                Aucun aliment
              </div>
              <div style={{ fontSize: 13, color: 'var(--pt-muted)' }}>
                Ajoute ton premier aliment pour commencer le suivi.
              </div>
              <button
                type="button"
                className="btn--primary"
                onClick={() => setAddOpen(true)}
                style={{ marginTop: 8, padding: '12px 20px', minHeight: 44 }}
              >
                <Plus size={14} aria-hidden /> Nouvelle entrée
              </button>
            </div>
          ) : (
            <Section label={`${items.length} aliment${items.length > 1 ? 's' : ''}`}>
              {items.length === 0 ? (
                <div className="empty">
                  <Wheat size={40} strokeWidth={1.25} color="var(--pt-subtle)" aria-hidden />
                  <div style={{ fontFamily: 'var(--pt-font-display)', fontWeight: 900, fontSize: 18, textTransform: 'uppercase' }}>
                    Aucun élément
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--pt-muted)' }}>
                    Aucun aliment dans cette catégorie.
                  </div>
                </div>
              ) : (
                items.map((item) => (
                  <AlimentRow
                    key={item.id || item.libelle}
                    item={item}
                    cheptel={cheptel}
                    fournisseurs={fournisseurs}
                    farmName={FARM_NAME}
                    onRefresh={refreshData}
                  />
                ))
              )}
            </Section>
          )}
        </div>

        <button
          type="button"
          className="fab"
          onClick={() => setAddOpen(true)}
          aria-label="Nouvelle entrée"
        >
          <Plus size={22} aria-hidden />
        </button>

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
