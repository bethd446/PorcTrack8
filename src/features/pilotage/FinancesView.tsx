/**
 * FinancesView — /pilotage/finances
 * ══════════════════════════════════════════════════════════════════════════
 * Refonte Claude Design v1 (2026-04-20) : variante SYNTHÈSE retenue.
 *
 * Structure :
 *   1. Header + period toggle (3 chips : mois / précédent / année)
 *   2. KPI 2×2 (CA · Dépenses · Marge · Trésorerie cumulée)
 *   3. Bloc A : Sparkline CA 6 derniers mois + 3 dernières ventes
 *   4. Bloc B : Donut ventilation dépenses + liste % par catégorie
 *   5. Transactions récentes (8 dernières, lignes directionnelles ↙/↗)
 *   6. HubTile gold → /pilotage/finances/rapport (variante EMPILÉE + export PDF)
 *
 * Données : FarmContext.finances (FinanceEntry[]) + financesAnalyzer.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonContent, IonPage, IonRefresher, IonRefresherContent,
} from '@ionic/react';
import {
  Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft,
  ArrowDownRight, ChevronRight, BarChart3, Coins,
} from 'lucide-react';

import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { KpiCard, Chip, SectionDivider } from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';
import {
  summarizeByPeriode,
  summarizeAll,
  formatMontant,
  categorieToTone,
  detectCurrency,
  dateToPeriode,
} from '../../services/financesAnalyzer';
import type { FinanceEntry } from '../../types/farm';

// ─── Période ─────────────────────────────────────────────────────────────────

type PeriodeKey = 'mois' | 'prec' | 'annee';

function periodeKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function previousMonthKey(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return periodeKeyFromDate(d);
}

function yearKeyPrefix(now: Date = new Date()): string {
  return String(now.getFullYear());
}

function parseDateFr(s: string): number {
  if (!s) return 0;
  const parts = s.split('/');
  if (parts.length !== 3) return 0;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return 0;
  return new Date(yyyy, mm - 1, dd).getTime();
}

/** Libellé court pour la sparkline : "AVR", "MAR", … */
const MOIS_SHORT = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];

function monthShortLabel(periodeKey: string): string {
  const mm = Number(periodeKey.slice(5, 7));
  return Number.isFinite(mm) && mm >= 1 && mm <= 12 ? MOIS_SHORT[mm - 1] : '—';
}

/** 6 derniers mois (chronologique, plus ancien → récent). */
function last6MonthsKeys(now: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(periodeKeyFromDate(d));
  }
  return keys;
}

// ─── Composant principal ─────────────────────────────────────────────────────

const FinancesView: React.FC = () => {
  const navigate = useNavigate();
  const { finances, refreshData } = useFarm();
  const [periode, setPeriode] = useState<PeriodeKey>('mois');

  const entries = finances as FinanceEntry[];

  const currency = useMemo<'FCFA' | 'EUR'>(() => {
    for (const e of entries) {
      if (detectCurrency(e) === 'EUR') return 'EUR';
    }
    return 'FCFA';
  }, [entries]);

  // Filtre selon la période sélectionnée
  const filteredEntries = useMemo<FinanceEntry[]>(() => {
    const now = new Date();
    if (periode === 'mois') {
      const key = periodeKeyFromDate(now);
      return entries.filter((e) => dateToPeriode(e.date) === key);
    }
    if (periode === 'prec') {
      const key = previousMonthKey(now);
      return entries.filter((e) => dateToPeriode(e.date) === key);
    }
    const prefix = yearKeyPrefix(now);
    return entries.filter((e) => dateToPeriode(e.date).startsWith(prefix));
  }, [entries, periode]);

  const summary = useMemo(() => {
    if (periode === 'mois') return summarizeByPeriode(entries, periodeKeyFromDate(new Date()));
    if (periode === 'prec') return summarizeByPeriode(entries, previousMonthKey());
    return summarizeAll(filteredEntries);
  }, [entries, filteredEntries, periode]);

  // Trésorerie cumulée = somme tous revenus - toutes dépenses depuis le début
  const tresorerieCumul = useMemo(() => {
    const all = summarizeAll(entries);
    return all.totalRevenus - all.totalDepenses;
  }, [entries]);

  // Sparkline : CA par mois (6 derniers)
  const sparkData = useMemo(() => {
    const keys = last6MonthsKeys();
    return keys.map((k) => {
      const s = summarizeByPeriode(entries, k);
      return { periode: k, label: monthShortLabel(k), ca: s.totalRevenus };
    });
  }, [entries]);

  // 3 dernières ventes (type REVENU) dans la période filtrée
  const recentVentes = useMemo<FinanceEntry[]>(() => {
    return [...filteredEntries]
      .filter((e) => e.type === 'REVENU')
      .sort((a, b) => parseDateFr(b.date) - parseDateFr(a.date))
      .slice(0, 3);
  }, [filteredEntries]);

  // Ventilation dépenses par catégorie (pour donut)
  const depensesParCat = useMemo(() => {
    const entries = Object.entries(summary.parCategorie) as Array<
      [string, { depenses: number; revenus: number }]
    >;
    const rows = entries
      .map(([cat, v]) => ({ cat, montant: v.depenses }))
      .filter((r) => r.montant > 0)
      .sort((a, b) => b.montant - a.montant);
    const total = rows.reduce((s, r) => s + r.montant, 0);
    return { rows, total };
  }, [summary]);

  // Top 8 transactions récentes (date desc)
  const recentMovements = useMemo<FinanceEntry[]>(() => {
    return [...filteredEntries]
      .sort((a, b) => parseDateFr(b.date) - parseDateFr(a.date))
      .slice(0, 8);
  }, [filteredEntries]);

  const hasData = entries.length > 0;
  const deltaCaPct = useMemo(() => {
    if (sparkData.length < 2) return null;
    const last = sparkData[sparkData.length - 1].ca;
    const prev = sparkData[sparkData.length - 2].ca;
    if (prev === 0) return null;
    return Math.round(((last - prev) / prev) * 100);
  }, [sparkData]);

  const margeTone: 'success' | 'critical' | 'default' =
    summary.margeNette > 0 ? 'success'
    : summary.margeNette < 0 ? 'critical'
    : 'default';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <IonRefresher
          slot="fixed"
          onIonRefresh={(e) => {
            void refreshData().finally(() => e.detail.complete());
          }}
        >
          <IonRefresherContent />
        </IonRefresher>

        <AgritechLayout>
          <AgritechHeader
            title="FINANCES"
            subtitle="Suivi trésorerie K13"
            backTo="/pilotage"
          />

          <div className="px-4 pt-4 pb-32 flex flex-col gap-5">
            {/* ── Period toggle (3 chips) ─────────────────────────────── */}
            <div role="tablist" aria-label="Période" className="flex gap-1.5">
              {[
                { k: 'mois' as const, l: 'Mois en cours' },
                { k: 'prec' as const, l: 'Mois préc.' },
                { k: 'annee' as const, l: 'Année' },
              ].map((p) => {
                const on = periode === p.k;
                return (
                  <button
                    key={p.k}
                    role="tab"
                    aria-selected={on}
                    onClick={() => setPeriode(p.k)}
                    className={`pressable flex-1 py-2.5 rounded-md font-mono text-[10px] font-semibold uppercase tracking-wide border transition-colors ${
                      on
                        ? 'bg-bg-2 border-accent text-accent'
                        : 'bg-transparent border-border text-text-1 hover:text-text-0'
                    }`}
                  >
                    {p.l}
                  </button>
                );
              })}
            </div>

            {/* ── Empty state global ──────────────────────────────────── */}
            {!hasData ? (
              <EmptyFinances />
            ) : (
              <>
                {/* ── KPI 2×2 ──────────────────────────────────────────── */}
                <div
                  role="group"
                  aria-label="Résumé finances"
                  className="grid grid-cols-2 gap-2.5"
                >
                  <KpiCard
                    label="Chiffre d'affaires"
                    value={formatMontant(summary.totalRevenus, currency)}
                    icon={<TrendingUp size={14} aria-hidden="true" />}
                    tone="success"
                  />
                  <KpiCard
                    label="Dépenses"
                    value={formatMontant(summary.totalDepenses, currency)}
                    icon={<TrendingDown size={14} aria-hidden="true" />}
                    tone="warning"
                  />
                  <KpiCard
                    label="Marge nette"
                    value={formatMontant(summary.margeNette, currency)}
                    icon={
                      summary.margeNette >= 0
                        ? <ArrowUpRight size={14} aria-hidden="true" />
                        : <ArrowDownRight size={14} aria-hidden="true" />
                    }
                    tone={margeTone}
                  />
                  <KpiCard
                    label="Trésorerie cumul"
                    value={formatMontant(tresorerieCumul, currency)}
                    icon={<Wallet size={14} aria-hidden="true" />}
                    tone={tresorerieCumul >= 0 ? 'default' : 'critical'}
                  />
                </div>

                {/* ── Bloc A : CA 6 mois + 3 ventes (variante SYNTHÈSE) ── */}
                <section aria-label="Chiffre d'affaires 6 mois">
                  <SectionDivider label="Chiffre d'affaires · 6 mois" />
                  <SparkCa
                    data={sparkData}
                    currency={currency}
                    deltaPct={deltaCaPct}
                    recentVentes={recentVentes}
                  />
                </section>

                {/* ── Bloc B : Donut ventilation dépenses ─────────────── */}
                {depensesParCat.rows.length > 0 ? (
                  <section aria-label="Ventilation dépenses">
                    <SectionDivider label="Ventilation dépenses" />
                    <DonutVentilation
                      rows={depensesParCat.rows}
                      total={depensesParCat.total}
                      currency={currency}
                    />
                  </section>
                ) : null}

                {/* ── Transactions récentes ───────────────────────────── */}
                {recentMovements.length > 0 ? (
                  <section aria-label="Transactions récentes">
                    <SectionDivider
                      label={`Dernières transactions · ${recentMovements.length}`}
                    />
                    <ul role="list" className="card-dense !p-0 overflow-hidden">
                      {recentMovements.map((e, idx) => (
                        <TransactionRow
                          key={`${e.date}-${e.libelle}-${idx}`}
                          entry={e}
                          currency={currency}
                        />
                      ))}
                    </ul>
                  </section>
                ) : null}

                {/* ── HubTile → Rapport financier ─────────────────────── */}
                <button
                  type="button"
                  onClick={() => navigate('/pilotage/finances/rapport')}
                  className="pressable card-dense flex items-center gap-3.5 !p-4 border-gold/40 bg-bg-2"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--gold) 40%, var(--border))',
                    background: 'color-mix(in srgb, var(--gold) 5%, var(--bg-2))',
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-[10px] bg-bg-1 flex items-center justify-center shrink-0"
                    style={{
                      border: '1px solid color-mix(in srgb, var(--gold) 40%, var(--border))',
                      color: 'var(--gold)',
                    }}
                  >
                    <BarChart3 size={20} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="ft-heading text-[15px] text-text-0 leading-tight">
                      Rapport financier
                    </div>
                    <div className="font-mono text-[11px] text-text-2 mt-1">
                      Détail CA par bande · 6 mois · export PDF
                    </div>
                  </div>
                  <ChevronRight size={18} style={{ color: 'var(--gold)' }} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

// ─── Sous-composants ─────────────────────────────────────────────────────────

const EmptyFinances: React.FC = () => (
  <div className="card-dense text-center py-10 animate-fade-in-up" role="status">
    <div className="inline-flex w-12 h-12 rounded-xl bg-bg-1 border border-border items-center justify-center text-text-2 mb-3">
      <Coins size={22} aria-hidden="true" />
    </div>
    <h3 className="ft-heading text-[14px] uppercase text-text-0">
      Aucune transaction ce mois
    </h3>
    <p className="font-mono text-[11px] text-text-2 mt-2">
      Appuie sur + pour enregistrer ta première vente ou dépense.
    </p>
  </div>
);

interface SparkCaProps {
  data: ReadonlyArray<{ periode: string; label: string; ca: number }>;
  currency: 'FCFA' | 'EUR';
  deltaPct: number | null;
  recentVentes: readonly FinanceEntry[];
}

const SparkCa: React.FC<SparkCaProps> = ({ data, currency, deltaPct, recentVentes }) => {
  const W = 300, H = 70;
  const vals = data.map((d) => d.ca);
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, 1);
  const lastCa = vals[vals.length - 1] ?? 0;
  const lastLabel = data[data.length - 1]?.label ?? '—';

  const pts = data.map((d, i) => {
    const x = (i / Math.max(1, data.length - 1)) * W;
    const y = H - ((d.ca - min) / Math.max(1, max - min)) * (H - 6) - 3;
    return [x, y] as const;
  });
  const line = pts.map((p) => p.join(',')).join(' ');
  const area = pts.length > 0
    ? `M 0,${H} L ${pts.map((p) => p.join(',')).join(' L ')} L ${W},${H} Z`
    : '';
  const last = pts[pts.length - 1] ?? [0, H];

  return (
    <div className="card-dense mt-3">
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <div className="kpi-label text-[10px]">{lastLabel}</div>
          <div className="font-mono tabular-nums text-[26px] font-bold text-accent mt-1 leading-none tracking-tight">
            {formatMontant(lastCa, currency)}
          </div>
          {deltaPct !== null ? (
            <div className="font-mono text-[10px] text-text-2 mt-1.5">
              {deltaPct >= 0 ? '+' : ''}{deltaPct}% vs {data[data.length - 2]?.label}
            </div>
          ) : null}
        </div>
        <svg
          width={W * 0.55}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          className="shrink-0"
        >
          <defs>
            <linearGradient id="spark-ca" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {area ? <path d={area} fill="url(#spark-ca)" /> : null}
          {line ? (
            <polyline
              points={line}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          <circle
            cx={last[0]}
            cy={last[1]}
            r="4"
            fill="var(--accent)"
            stroke="var(--bg-2)"
            strokeWidth="2"
          />
        </svg>
      </div>
      <div className="flex justify-between mt-2">
        {data.map((d, i) => (
          <span
            key={d.periode}
            className={`font-mono text-[9px] tracking-wide ${
              i === data.length - 1 ? 'text-accent font-semibold' : 'text-text-2'
            }`}
          >
            {d.label}
          </span>
        ))}
      </div>
      {recentVentes.length > 0 ? (
        <>
          <div className="hairline my-3.5" />
          <div className="kpi-label text-[10px] mb-2">
            {recentVentes.length} dernière{recentVentes.length > 1 ? 's' : ''} vente{recentVentes.length > 1 ? 's' : ''}
          </div>
          <div className="flex flex-col gap-2">
            {recentVentes.map((v, i) => (
              <div key={`${v.date}-${i}`} className="flex justify-between items-baseline">
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-[11px] font-semibold text-text-0 truncate">
                    {v.libelle || '(sans libellé)'}
                  </span>
                  <span className="font-mono text-[10px] text-text-2 ml-1.5">· {v.date || '—'}</span>
                </div>
                <span className="font-mono text-[12px] font-semibold text-accent tabular-nums whitespace-nowrap">
                  +{formatMontant(v.montant, currency)}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};

interface DonutVentilationProps {
  rows: ReadonlyArray<{ cat: string; montant: number }>;
  total: number;
  currency: 'FCFA' | 'EUR';
}

/** Couleur CSS-var pour chaque tone pied de liste donut. */
function toneVarFor(cat: string): string {
  const tone = categorieToTone(cat);
  const map: Record<string, string> = {
    accent: 'var(--accent)',
    amber: 'var(--amber)',
    red: 'var(--coral)',
    blue: 'var(--blue)',
    default: 'var(--teal)',
  };
  return map[tone] ?? 'var(--text-2)';
}

const DonutVentilation: React.FC<DonutVentilationProps> = ({ rows, total, currency }) => {
  const size = 96, stroke = 14;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  let offset = 0;
  const arcs = rows.map((row) => {
    const len = (row.montant / total) * C;
    const arc = (
      <circle
        key={row.cat}
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={toneVarFor(row.cat)}
        strokeWidth={stroke}
        strokeDasharray={`${len} ${C - len}`}
        strokeDashoffset={-offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        strokeLinecap="butt"
      />
    );
    offset += len;
    return arc;
  });

  return (
    <div className="card-dense mt-3">
      <div className="flex gap-4 items-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
          className="shrink-0"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--bg-1)"
            strokeWidth={stroke}
          />
          {arcs}
          <text
            x={size / 2}
            y={size / 2 - 4}
            textAnchor="middle"
            fill="var(--text-2)"
            fontFamily="var(--font-mono)"
            fontSize="8"
            letterSpacing="0.06em"
          >
            TOTAL
          </text>
          <text
            x={size / 2}
            y={size / 2 + 12}
            textAnchor="middle"
            fill="var(--text-0)"
            fontFamily="var(--font-mono)"
            fontSize="12"
            fontWeight="700"
          >
            {Math.round(total / 1000)}k
          </text>
        </svg>
        <ul className="flex-1 flex flex-col gap-2.5 min-w-0">
          {rows.map((row) => {
            const pct = Math.round((row.montant / total) * 100);
            return (
              <li key={row.cat} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ background: toneVarFor(row.cat) }}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-text-0 font-medium truncate">
                    {row.cat}
                  </div>
                  <div className="font-mono text-[10px] text-text-2 tabular-nums">
                    {formatMontant(row.montant, currency)}
                  </div>
                </div>
                <Chip label={`${pct}%`} tone="default" size="xs" />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

interface TransactionRowProps {
  entry: FinanceEntry;
  currency: 'FCFA' | 'EUR';
}

const TransactionRow: React.FC<TransactionRowProps> = ({ entry, currency }) => {
  const isIn = entry.type === 'REVENU';
  const tone = categorieToTone(entry.categorie);
  return (
    <li className="flex items-center gap-3 px-3 py-3 border-b border-border last:border-b-0">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: isIn
            ? 'color-mix(in srgb, var(--accent) 12%, var(--bg-1))'
            : 'color-mix(in srgb, var(--amber) 10%, var(--bg-1))',
          border: `1px solid ${
            isIn
              ? 'color-mix(in srgb, var(--accent) 40%, var(--border))'
              : 'color-mix(in srgb, var(--amber) 40%, var(--border))'
          }`,
          color: isIn ? 'var(--accent)' : 'var(--amber)',
        }}
      >
        {isIn
          ? <ArrowDownLeft size={16} strokeWidth={2.2} aria-hidden="true" />
          : <ArrowUpRight size={16} strokeWidth={2.2} aria-hidden="true" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[13px] font-medium text-text-0 truncate">
            {entry.categorie || 'DIVERS'}
          </span>
          <span className="font-mono text-[10px] text-text-2 tabular-nums">· {entry.date || '—'}</span>
          <Chip label={tone.toUpperCase()} tone={tone} size="xs" />
        </div>
        <div className="text-[11px] text-text-2 mt-0.5 truncate">
          {entry.libelle || '(sans libellé)'}
        </div>
      </div>
      <div className="text-right shrink-0">
        <span
          className={`font-mono text-[13px] font-semibold tabular-nums whitespace-nowrap ${
            isIn ? 'text-accent' : 'text-amber'
          }`}
        >
          {isIn ? '+' : '−'}{formatMontant(entry.montant, currency)}
        </span>
      </div>
    </li>
  );
};

export default FinancesView;
