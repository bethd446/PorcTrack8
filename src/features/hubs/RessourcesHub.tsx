/**
 * RessourcesHub — /ressources (tab 04)
 * ══════════════════════════════════════════════════════════════════════════
 * Refonte Claude Design v2 (2026-04-20) — mockup _tabs/04-ressources.
 *
 * Structure :
 *   1. Bannière RUPTURE (rouge) si ≥1 item en rupture
 *   2. Section ALIMENTS — liste StockRow avec progress bar + bouton "+"
 *   3. Section VACCINS & SOINS — idem
 *   4. Section SOUS-ÉCRANS — HubTiles Plan Alim / Formules / Pharmacie (full)
 */

import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import {
  AlertOctagon, Plus, Calculator, ClipboardList, Package,
} from 'lucide-react';

import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { HubTile, SectionDivider } from '../../components/agritech';
import QuickRefillForm, {
  toRefillItem,
  type RefillStockItem,
} from '../../components/forms/QuickRefillForm';
import { useFarm } from '../../context/FarmContext';
import type { StockAliment, StockVeto } from '../../types/farm';

// ─── Helpers ────────────────────────────────────────────────────────────────

type StockTone = 'accent' | 'amber' | 'red';

interface StockRowData {
  id: string;
  name: string;
  qty: string;
  pct: number;
  tone: StockTone;
  meta: string;
}

function fillClass(tone: StockTone): string {
  if (tone === 'red') return 'bg-red';
  if (tone === 'amber') return 'bg-amber';
  return 'bg-accent';
}

function qtyColor(tone: StockTone): string {
  if (tone === 'red') return 'text-red';
  if (tone === 'amber') return 'text-amber';
  return 'text-accent';
}

function toneFromStatut(statut: string | undefined): StockTone {
  const s = (statut ?? '').toUpperCase();
  if (s === 'RUPTURE') return 'red';
  if (s === 'BAS') return 'amber';
  return 'accent';
}

function pctFromStock(stockActuel: number, seuil: number): number {
  if (seuil <= 0) return 100;
  const ratio = (stockActuel / (seuil * 3)) * 100; // seuil = 33% par convention
  return Math.max(0, Math.min(100, Math.round(ratio)));
}

function mapAliment(a: StockAliment): StockRowData {
  const tone = toneFromStatut(a.statutStock);
  const pct = pctFromStock(a.stockActuel, a.seuilAlerte);
  const meta = a.seuilAlerte > 0
    ? `Seuil alerte ${a.seuilAlerte} ${a.unite}`
    : (a.notes?.trim() || 'Stock courant');
  return {
    id: a.id,
    name: a.libelle,
    qty: `${a.stockActuel} ${a.unite}`,
    pct,
    tone,
    meta,
  };
}

function mapVeto(v: StockVeto): StockRowData {
  const tone = toneFromStatut(v.statutStock);
  const pct = pctFromStock(v.stockActuel, v.seuilAlerte);
  const meta = v.usage?.trim() || v.type?.trim() || (v.notes?.trim() ?? 'Vaccin / soin');
  return {
    id: v.id,
    name: v.produit,
    qty: `${v.stockActuel} ${v.unite}`,
    pct,
    tone,
    meta,
  };
}

// ─── Composant ──────────────────────────────────────────────────────────────

const RessourcesHub: React.FC = () => {
  const navigate = useNavigate();
  const { stockAliment, stockVeto, refreshData } = useFarm();

  const aliments = useMemo(() => stockAliment.map(mapAliment), [stockAliment]);
  const vetos = useMemo(() => stockVeto.map(mapVeto), [stockVeto]);

  const ruptures = useMemo(
    () => [...aliments, ...vetos].filter((s) => s.tone === 'red'),
    [aliments, vetos],
  );

  // ── Réappro : état du BottomSheet ───────────────────────────────────────
  const [refillTarget, setRefillTarget] = useState<RefillStockItem | null>(null);

  const handleOpenRefillAliment = useCallback(
    (id: string): void => {
      const raw = stockAliment.find((a) => a.id === id);
      if (raw) setRefillTarget(toRefillItem(raw, 'ALIMENT'));
    },
    [stockAliment],
  );

  const handleOpenRefillVeto = useCallback(
    (id: string): void => {
      const raw = stockVeto.find((v) => v.id === id);
      if (raw) setRefillTarget(toRefillItem(raw, 'VETO'));
    },
    [stockVeto],
  );

  const handleCloseRefill = useCallback((): void => {
    setRefillTarget(null);
  }, []);

  const handleRefillSuccess = useCallback((): void => {
    // Refresh est déjà déclenché par le form lui-même via useFarm.refreshData,
    // mais on laisse ce hook en double-sécurité si besoin futur.
    void refreshData();
  }, [refreshData]);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="RESSOURCES"
            subtitle="Aliments · vaccins · matériel"
          />

          <div className="px-4 pt-4 pb-32 flex flex-col gap-5">
            {/* ── Bannière rupture ────────────────────────────────────── */}
            {ruptures.length > 0 ? (
              <button
                type="button"
                onClick={() => navigate('/alerts')}
                aria-label={`${ruptures.length} rupture${ruptures.length > 1 ? 's' : ''}`}
                className="pressable card-dense flex items-start gap-3 text-left w-full !p-3.5"
                style={{
                  borderColor: 'color-mix(in srgb, var(--red) 40%, var(--border))',
                  background: 'color-mix(in srgb, var(--red) 6%, var(--bg-2))',
                }}
              >
                <span className="shrink-0 text-red">
                  <AlertOctagon size={20} aria-hidden="true" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="ft-heading text-[14px] text-red uppercase">
                    Rupture · {ruptures.length} item{ruptures.length > 1 ? 's' : ''}
                  </div>
                  <div className="text-[12px] text-text-1 mt-1 leading-snug">
                    {ruptures
                      .slice(0, 2)
                      .map((r) => r.name)
                      .join(' · ')}
                    {ruptures.length > 2 ? ` · +${ruptures.length - 2}` : ''}
                  </div>
                </div>
              </button>
            ) : null}

            {/* ── Aliments ────────────────────────────────────────────── */}
            {aliments.length > 0 ? (
              <section aria-label="Stocks aliments">
                <SectionDivider label="Aliments" />
                <ul className="card-dense !p-0 overflow-hidden">
                  {aliments.map((s) => (
                    <StockRow
                      key={`a-${s.id}`}
                      row={s}
                      onOpen={() => navigate('/ressources/aliments')}
                      onRefill={() => handleOpenRefillAliment(s.id)}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {/* ── Vaccins & soins ─────────────────────────────────────── */}
            {vetos.length > 0 ? (
              <section aria-label="Stocks vaccins et soins">
                <SectionDivider label="Vaccins & soins" />
                <ul className="card-dense !p-0 overflow-hidden">
                  {vetos.map((s) => (
                    <StockRow
                      key={`v-${s.id}`}
                      row={s}
                      onOpen={() => navigate('/ressources/pharmacie')}
                      onRefill={() => handleOpenRefillVeto(s.id)}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {/* ── Sous-écrans ─────────────────────────────────────────── */}
            <section aria-label="Sous-écrans">
              <SectionDivider label="Détails & protocoles" />
              <div className="grid grid-cols-1 gap-2.5">
                <HubTile
                  icon={<Calculator size={22} aria-hidden="true" />}
                  title="Plan alim"
                  subtitle="Couverture · rations/j"
                  to="/ressources/aliments/plan"
                  tone="accent"
                />
                <HubTile
                  icon={<ClipboardList size={22} aria-hidden="true" />}
                  title="Formules"
                  subtitle="5 recettes validées"
                  count={5}
                  to="/ressources/aliments/formules"
                  tone="ochre"
                />
                <HubTile
                  icon={<Package size={22} aria-hidden="true" />}
                  title="Pharmacie"
                  subtitle="Catalogue complet véto"
                  count={vetos.length}
                  to="/ressources/pharmacie"
                  tone="teal"
                />
              </div>
            </section>
          </div>

          {/* ── Bottom sheet réapprovisionnement ──────────────────────── */}
          <QuickRefillForm
            isOpen={refillTarget !== null}
            onClose={handleCloseRefill}
            stockItem={refillTarget}
            onSuccess={handleRefillSuccess}
          />
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

// ─── StockRow ────────────────────────────────────────────────────────────────

interface StockRowProps {
  row: StockRowData;
  onOpen: () => void;
  onRefill: () => void;
}

const StockRow: React.FC<StockRowProps> = ({ row, onOpen, onRefill }) => (
  <li className="flex items-stretch gap-3 px-3.5 py-3.5 border-b border-border last:border-b-0">
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Ouvrir ${row.name}`}
      className="flex-1 min-w-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded-[8px]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-text-0 font-medium truncate">{row.name}</div>
          <div className="font-mono text-[11px] text-text-2 mt-0.5 tabular-nums truncate">
            {row.meta}
          </div>
        </div>
        <span
          className={`font-mono text-[14px] font-semibold ${qtyColor(row.tone)} tabular-nums shrink-0`}
        >
          {row.qty}
        </span>
      </div>
      <div className="h-1.5 w-full bg-bg-2 rounded-full overflow-hidden mt-2.5">
        <div
          className={`h-full ${fillClass(row.tone)} rounded-full transition-[width]`}
          style={{ width: `${row.pct}%` }}
        />
      </div>
    </button>
    <button
      type="button"
      onClick={onRefill}
      aria-label={`Réapprovisionner ${row.name}`}
      className="pressable self-center shrink-0 w-9 h-9 rounded-[10px] bg-bg-1 border border-border flex items-center justify-center text-text-1 hover:text-accent transition-colors"
    >
      <Plus size={16} aria-hidden="true" />
    </button>
  </li>
);

export default RessourcesHub;
