/**
 * RessourcesHub — /ressources
 * ══════════════════════════════════════════════════════════════════════════
 * V77 namespace (.pt-screen + .ph--primary). Hub navigation 2 sections
 * actives : Aliments, Pharmacie. KPIs strip globale (Total / OK / Bas /
 * Rupture) calculée sur l'union stockAliment + stockVeto.
 *
 * Note : Formules et Fournisseurs masqués (vague précédente).
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import {
  Wheat, Stethoscope, ChevronRight, ChevronLeft,
} from 'lucide-react';

import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { Section } from '../../v70/components/ds/Section';
import { useFarm } from '../../context/FarmContext';
import type { StockAliment, StockVeto } from '../../types/farm';

type StockItem = StockAliment | StockVeto;
type ResourceTreatment = 'urgent' | 'normal' | 'resolu';

function classify(item: StockItem): ResourceTreatment {
  const stock = item.stockActuel ?? 0;
  const seuil = item.seuilAlerte ?? 0;
  const statut = item.statutStock ?? '';
  if (stock === 0 || /rupt/i.test(statut)) return 'urgent';
  if (stock < seuil) return 'normal';
  return 'resolu';
}

const RessourcesHub: React.FC = () => {
  const navigate = useNavigate();
  const { stockAliment, stockVeto } = useFarm();
  const { handleRefresh } = useAutoRefresh();

  const stats = useMemo(() => {
    const all: StockItem[] = [...stockAliment, ...stockVeto];
    const total = all.length;
    let urgent = 0;
    let normal = 0;
    let resolu = 0;
    for (const it of all) {
      const t = classify(it);
      if (t === 'urgent') urgent += 1;
      else if (t === 'normal') normal += 1;
      else resolu += 1;
    }
    return { total, urgent, normal, resolu };
  }, [stockAliment, stockVeto]);

  const subParts: string[] = [];
  if (stats.urgent > 0) subParts.push(`${stats.urgent} rupture${stats.urgent > 1 ? 's' : ''}`);
  if (stats.normal > 0) subParts.push(`${stats.normal} stock${stats.normal > 1 ? 's' : ''} bas`);
  const subtitle = subParts.length > 0
    ? `Aliments et pharmacie · ${subParts.join(' · ')}`
    : 'Aliments et pharmacie';

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="pt-screen">
          <header className="ph--primary">
            <button
              type="button"
              className="back"
              aria-label="Retour aux Réglages"
              onClick={() => navigate('/reglages')}
            >
              <ChevronLeft size={18} strokeWidth={1.8} aria-hidden />
            </button>
            <div className="eyebrow">Ressources</div>
            <h1>Ressources</h1>
            <div className="sub">{subtitle}</div>
          </header>

          <div
            className="phone-content"
            style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}
          >
            <div className="kpis-strip">
              <div className="kpi">
                <div className="kpi__label">Total</div>
                <div className="kpi__val num">{stats.total}</div>
              </div>
              <div className="kpi">
                <div className="kpi__label">OK</div>
                <div className="kpi__val num" style={{ color: 'var(--pt-success)' }}>{stats.resolu}</div>
              </div>
              <div className="kpi">
                <div className="kpi__label">Bas</div>
                <div className="kpi__val num" style={{ color: 'var(--pt-warning)' }}>{stats.normal}</div>
              </div>
              <div className="kpi">
                <div className="kpi__label">Rupture</div>
                <div className="kpi__val num" style={{ color: 'var(--pt-danger)' }}>{stats.urgent}</div>
              </div>
            </div>

            <Section label="Sections">
              <button
                type="button"
                className="card-link"
                onClick={() => navigate('/ressources/aliments')}
                aria-label="Ouvrir Aliments"
              >
                <div className="card-link__icon"><Wheat size={18} aria-hidden /></div>
                <div className="card-link__main">
                  <div className="card-link__title">Aliments</div>
                  <div className="card-link__sub">
                    {stockAliment.length} référence{stockAliment.length > 1 ? 's' : ''} · matières premières et sacs prêts
                  </div>
                </div>
                <span className="card-link__chev"><ChevronRight aria-hidden /></span>
              </button>

              <button
                type="button"
                className="card-link"
                onClick={() => navigate('/ressources/pharmacie')}
                aria-label="Ouvrir Pharmacie"
              >
                <div className="card-link__icon"><Stethoscope size={18} aria-hidden /></div>
                <div className="card-link__main">
                  <div className="card-link__title">Pharmacie</div>
                  <div className="card-link__sub">
                    {stockVeto.length} produit{stockVeto.length > 1 ? 's' : ''} · vaccins, antibiotiques, vermifuges
                  </div>
                </div>
                <span className="card-link__chev"><ChevronRight aria-hidden /></span>
              </button>
            </Section>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default RessourcesHub;
