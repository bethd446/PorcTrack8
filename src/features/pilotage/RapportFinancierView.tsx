/**
 * RapportFinancierView — /pilotage/finances/rapport
 * ══════════════════════════════════════════════════════════════════════════
 * Sous-écran de détail financier (variante EMPILÉE de Claude Design v1).
 * Accessible depuis /pilotage/rapports ET depuis /pilotage/finances (HubTile).
 *
 * Structure :
 *   1. Header + back (retour selon chemin d'entrée)
 *   2. KPI synthèse 6 mois (total CA · moy. mois · top bande)
 *   3. Graphique barres empilées CA par bande × 6 mois
 *   4. Liste top bandes (N=6) classées par CA cumulé
 *   5. Bouton Export PDF (placeholder, désactivé)
 */

import React, { useMemo } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { Download, TrendingUp, Trophy, BarChart3 } from 'lucide-react';

import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { KpiCard, SectionDivider, Chip } from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';
import {
  formatMontant,
  detectCurrency,
  dateToPeriode,
} from '../../services/financesAnalyzer';
import type { FinanceEntry } from '../../types/farm';

// ─── Helpers ────────────────────────────────────────────────────────────────

const MOIS_SHORT = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];

function periodeKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function monthShort(key: string): string {
  const mm = Number(key.slice(5, 7));
  return Number.isFinite(mm) && mm >= 1 && mm <= 12 ? MOIS_SHORT[mm - 1] : '—';
}

function last6MonthsKeys(now: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(periodeKey(d));
  }
  return keys;
}

/**
 * Extrait l'ID de bande depuis un libellé ("25-T07-01") ou depuis bandeId
 * si présent sur l'entrée. Fallback "—".
 */
function extractBandeId(entry: FinanceEntry): string {
  // @ts-expect-error bandeId optionnel selon implémentation FinanceEntry
  if (entry.bandeId) return String(entry.bandeId);
  const m = entry.libelle?.match(/\b\d{2}-[A-Z]\d{1,3}-\d{1,2}\b/i);
  return m ? m[0].toUpperCase() : '—';
}

// ─── Composant ──────────────────────────────────────────────────────────────

const RapportFinancierView: React.FC = () => {
  const { finances } = useFarm();
  const entries = finances as FinanceEntry[];

  const currency = useMemo<'FCFA' | 'EUR'>(() => {
    for (const e of entries) {
      if (detectCurrency(e) === 'EUR') return 'EUR';
    }
    return 'FCFA';
  }, [entries]);

  const keys = useMemo(() => last6MonthsKeys(), []);

  // Stacked data : pour chaque mois, liste des bandes avec leur CA
  const stackData = useMemo(() => {
    return keys.map((k) => {
      const monthEntries = entries.filter(
        (e) => e.type === 'REVENU' && dateToPeriode(e.date) === k,
      );
      const byBande = new Map<string, number>();
      for (const e of monthEntries) {
        const id = extractBandeId(e);
        byBande.set(id, (byBande.get(id) ?? 0) + e.montant);
      }
      const bandes = Array.from(byBande.entries())
        .map(([id, v]) => ({ id, v }))
        .sort((a, b) => b.v - a.v);
      const total = bandes.reduce((s, b) => s + b.v, 0);
      return { periode: k, label: monthShort(k), total, bandes };
    });
  }, [entries, keys]);

  // KPI synthèse
  const { totalCa, moyMois, topBandeLabel, topBandeCa } = useMemo(() => {
    const totals = stackData.map((m) => m.total);
    const total = totals.reduce((s, v) => s + v, 0);
    const moy = stackData.length > 0 ? Math.round(total / stackData.length) : 0;

    const byBande = new Map<string, number>();
    for (const m of stackData) {
      for (const b of m.bandes) {
        byBande.set(b.id, (byBande.get(b.id) ?? 0) + b.v);
      }
    }
    const top = [...byBande.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      totalCa: total,
      moyMois: moy,
      topBandeLabel: top?.[0] ?? '—',
      topBandeCa: top?.[1] ?? 0,
    };
  }, [stackData]);

  // Liste top bandes (cumul 6 mois)
  const topBandes = useMemo(() => {
    const byBande = new Map<string, number>();
    for (const m of stackData) {
      for (const b of m.bandes) {
        byBande.set(b.id, (byBande.get(b.id) ?? 0) + b.v);
      }
    }
    return [...byBande.entries()]
      .map(([id, v]) => ({ id, v }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 6);
  }, [stackData]);

  const maxMonthTotal = Math.max(1, ...stackData.map((m) => m.total)) * 1.1;
  const hasData = stackData.some((m) => m.total > 0);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="RAPPORT FINANCIER"
            subtitle="Détail CA par bande · 6 mois"
            backTo="/pilotage/finances"
          />

          <div className="px-4 pt-4 pb-32 flex flex-col gap-5">
            {/* ── KPI synthèse ────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-2.5">
              <KpiCard
                label="Total CA 6 mois"
                value={formatMontant(totalCa, currency)}
                icon={<TrendingUp size={14} aria-hidden="true" />}
                tone="success"
              />
              <KpiCard
                label="Moy. mois"
                value={formatMontant(moyMois, currency)}
                icon={<BarChart3 size={14} aria-hidden="true" />}
              />
              <KpiCard
                label={`Top · ${topBandeLabel}`}
                value={formatMontant(topBandeCa, currency)}
                icon={<Trophy size={14} aria-hidden="true" />}
                tone="warning"
              />
            </div>

            {/* ── Stacked bar CA par bande × 6 mois ───────────────────── */}
            <section aria-label="CA mensuel empilé par bande">
              <SectionDivider label="CA mensuel · empilé par bande" />
              {hasData ? (
                <StackedBars
                  data={stackData}
                  maxTotal={maxMonthTotal}
                  currency={currency}
                />
              ) : (
                <div className="card-dense text-center py-8 mt-3">
                  <p className="font-mono text-[11px] text-text-2">
                    Aucune vente enregistrée sur les 6 derniers mois.
                  </p>
                </div>
              )}
            </section>

            {/* ── Top bandes ──────────────────────────────────────────── */}
            {topBandes.length > 0 ? (
              <section aria-label="Top bandes par CA cumulé">
                <SectionDivider label={`Top bandes · cumul ${topBandes.length}`} />
                <ul role="list" className="card-dense !p-0 overflow-hidden">
                  {topBandes.map((b, idx) => {
                    const pct = totalCa > 0 ? Math.round((b.v / totalCa) * 100) : 0;
                    return (
                      <li
                        key={b.id}
                        className="flex items-center gap-3 px-3 py-3 border-b border-border last:border-b-0"
                      >
                        <span className="font-mono text-[11px] text-text-2 w-5">
                          #{idx + 1}
                        </span>
                        <span className="font-mono text-[13px] font-semibold text-text-0 flex-1 min-w-0 truncate">
                          {b.id}
                        </span>
                        <Chip label={`${pct}%`} tone="accent" size="xs" />
                        <span className="font-mono text-[13px] font-semibold text-accent tabular-nums whitespace-nowrap">
                          {formatMontant(b.v, currency)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {/* ── Export PDF (placeholder) ────────────────────────────── */}
            <button
              type="button"
              disabled
              className="card-dense pressable flex items-center justify-center gap-2 !py-3 opacity-60 cursor-not-allowed"
              aria-label="Export PDF · bientôt disponible"
            >
              <Download size={16} aria-hidden="true" />
              <span className="ft-heading text-[13px] uppercase tracking-wide">
                Export PDF · bientôt
              </span>
            </button>
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

// ─── StackedBars ────────────────────────────────────────────────────────────

interface StackedBarsProps {
  data: ReadonlyArray<{
    periode: string;
    label: string;
    total: number;
    bandes: ReadonlyArray<{ id: string; v: number }>;
  }>;
  maxTotal: number;
  currency: 'FCFA' | 'EUR';
}

const StackedBars: React.FC<StackedBarsProps> = ({ data, maxTotal, currency }) => {
  const H = 140;
  const isLast = (i: number) => i === data.length - 1;

  return (
    <div className="card-dense mt-3">
      <div
        className="flex items-end gap-1.5"
        style={{
          height: H,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 2,
        }}
      >
        {data.map((m, i) => (
          <div
            key={m.periode}
            className="flex-1 flex flex-col items-center justify-end gap-0.5 h-full"
          >
            <span
              className={`font-mono text-[9px] tabular-nums mb-1 ${
                isLast(i) ? 'text-accent' : 'text-text-2'
              }`}
            >
              {m.total > 0 ? `${Math.round(m.total / 1000)}k` : '—'}
            </span>
            <div className="w-[70%] flex flex-col-reverse gap-[1px]">
              {m.bandes.map((b, j) => {
                const h = (b.v / maxTotal) * (H - 28);
                const opacity = isLast(i) ? 1 : 0.55 + j * 0.15;
                return (
                  <div
                    key={b.id + j}
                    title={`${b.id} · ${formatMontant(b.v, currency)}`}
                    style={{
                      height: `${Math.max(2, h)}px`,
                      background: 'var(--accent)',
                      opacity,
                      borderRadius: j === m.bandes.length - 1 ? '3px 3px 0 0' : 0,
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {data.map((m, i) => (
          <div key={m.periode} className="flex-1 text-center">
            <span
              className={`font-mono text-[10px] ${
                isLast(i) ? 'text-accent font-semibold' : 'text-text-2'
              }`}
            >
              {m.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RapportFinancierView;
