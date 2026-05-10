/**
 * FinancesView — Refonte V70 (Sprint Legacy 1, 2026-05-10)
 * ════════════════════════════════════════════════════════════════════════════
 * Pattern V70 natif (mockup B.4) : pt-screen + ph--primary (eyebrow Pilotage /
 * titre Finances / sub Détail des transactions / back arrow vers
 * /performance?tab=finances) + phone-content + score-billboard marge mensuelle
 * + kpis-strip 3 KPIs + bar chart 12 mois SVG + card-link vers le rapport
 * détaillé. Plus d'AgritechLayout / KpiCardV6 / TopBarSync.
 *
 * Logique métier préservée :
 *   - useFarm.finances + useFarm.currency inchangés
 *   - financesAnalyzer (summarizeByPeriode / summarizeAll / dateToPeriode /
 *     formatMontant) inchangé
 *   - Trésorerie cumul = somme tous revenus - dépenses depuis le début
 *     (label "Trésorerie cumul (depuis début)" préservé pour test V8)
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonContent, IonPage, IonRefresher, IonRefresherContent,
} from '@ionic/react';
import { ChevronLeft, ChevronRight, FileText, Plus } from 'lucide-react';

import { Section } from '@/design-system';
import { useFarm } from '../../context/FarmContext';
import {
  summarizeByPeriode,
  summarizeAll,
  formatMontant,
  dateToPeriode,
} from '../../services/financesAnalyzer';
import type { Currency } from '../../lib/currency';
import type { FinanceEntry } from '../../types/farm';
import QuickAddTransactionForm from '../../components/forms/QuickAddTransactionForm';

// ─── Période & helpers ───────────────────────────────────────────────────────

function periodeKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function previousMonthKey(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return periodeKeyFromDate(d);
}

const MOIS_LONG = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const MOIS_SHORT = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];

function monthLongLabel(periodeKey: string): string {
  const yyyy = periodeKey.slice(0, 4);
  const mm = Number(periodeKey.slice(5, 7));
  if (!Number.isFinite(mm) || mm < 1 || mm > 12) return '—';
  return `${MOIS_LONG[mm - 1]} ${yyyy}`;
}

function monthShortLabel(periodeKey: string): string {
  const mm = Number(periodeKey.slice(5, 7));
  return Number.isFinite(mm) && mm >= 1 && mm <= 12 ? MOIS_SHORT[mm - 1] : '—';
}

/** 12 derniers mois (chronologique, plus ancien → récent). */
function last12MonthsKeys(now: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(periodeKeyFromDate(d));
  }
  return keys;
}

// ─── Composant principal ─────────────────────────────────────────────────────

const FinancesView: React.FC = () => {
  const navigate = useNavigate();
  const { finances, refreshData, currency: farmCurrency } = useFarm();
  const [addOpen, setAddOpen] = useState(false);

  const entries = finances as FinanceEntry[];
  const currency: Currency = farmCurrency;

  const now = new Date();
  const currentMonthKey = periodeKeyFromDate(now);
  const currentMonthLabel = monthLongLabel(currentMonthKey);

  // Synthèse mois en cours (revenus / charges / marge)
  const summary = useMemo(
    () => summarizeByPeriode(entries, currentMonthKey),
    [entries, currentMonthKey],
  );

  // Synthèse mois précédent → calcul deltaPct
  const summaryPrev = useMemo(
    () => summarizeByPeriode(entries, previousMonthKey(now)),
    [entries, now],
  );

  const revenus = summary.totalRevenus;
  const charges = summary.totalDepenses;
  const marge = summary.margeNette;
  const margePrev = summaryPrev.margeNette;

  const deltaPct = useMemo<number | null>(() => {
    if (margePrev === 0) return null;
    return Math.round(((marge - margePrev) / Math.abs(margePrev)) * 100);
  }, [marge, margePrev]);

  // Trésorerie cumulée (test V8 : label "Trésorerie cumul (depuis début)")
  const tresorerieCumul = useMemo(() => {
    const all = summarizeAll(entries);
    return all.totalRevenus - all.totalDepenses;
  }, [entries]);

  // Bar chart 12 mois (marge nette mensuelle)
  const monthly = useMemo(() => {
    const keys = last12MonthsKeys(now);
    return keys.map((k, i) => {
      const s = summarizeByPeriode(entries, k);
      return {
        key: k,
        label: monthShortLabel(k),
        marge: s.margeNette,
        idx: i,
      };
    });
  }, [entries, now]);

  const currentMonthIdx = monthly.length - 1;
  const firstMonthLabel = monthly[0]?.label ?? '—';
  const lastMonthLabel = monthly[currentMonthIdx]?.label ?? '—';

  // Échelle pour le SVG : hauteur positive et négative
  const margeMax = Math.max(1, ...monthly.map(m => Math.abs(m.marge)));

  const hasData = entries.length > 0;

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

        <div className="pt-screen">
          <header className="ph--primary">
            <button
              type="button"
              className="back"
              aria-label="Retour à Performance"
              onClick={() => navigate('/performance?tab=finances')}
            >
              <ChevronLeft size={18} strokeWidth={1.8} aria-hidden />
            </button>
            <div className="eyebrow">Pilotage</div>
            <h1>Finances</h1>
            <div className="sub">Détail des transactions</div>
          </header>
          <div
            className="phone-content"
            style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}
          >

          {!hasData ? (
            <div className="empty" style={{ marginTop: 16 }}>
              <div
                style={{
                  fontFamily: 'var(--pt-font-display)',
                  fontWeight: 900,
                  fontSize: 22,
                  textTransform: 'uppercase',
                  letterSpacing: '-0.01em',
                  color: 'var(--pt-ink)',
                }}
              >
                Aucune transaction
              </div>
              <div style={{ fontSize: 13, color: 'var(--pt-muted)' }}>
                Ajoute ta première vente ou dépense pour suivre ta marge.
              </div>
            </div>
          ) : (
            <>
              {/* ── Big marge mensuelle ──────────────────────────────── */}
              <Section label="Marge nette du mois" />
              <div
                className="card"
                style={{
                  padding: 22,
                  marginTop: 8,
                  marginBottom: 16,
                  background: 'var(--pt-bg)',
                  border: '1px solid var(--pt-line)',
                  borderRadius: 14,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      className={`num ${marge >= 0 ? 'amount--positive' : 'amount--negative'}`}
                      style={{
                        fontFamily: 'var(--pt-font-display)',
                        fontWeight: 900,
                        fontSize: 36,
                        letterSpacing: '-0.01em',
                        lineHeight: 1,
                      }}
                    >
                      {marge >= 0 ? '+' : '−'}{formatMontant(Math.abs(marge), currency)}
                    </div>
                    <div className="eyebrow" style={{ marginTop: 6 }}>
                      {currentMonthLabel}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {deltaPct !== null ? (
                      <div
                        className={`num ${deltaPct >= 0 ? 'amount--positive' : 'amount--negative'}`}
                        style={{
                          fontFamily: 'var(--pt-font-mono)',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {deltaPct >= 0 ? '↑ +' : '↓ −'}{Math.abs(deltaPct)}%
                      </div>
                    ) : (
                      <div
                        className="num"
                        style={{
                          fontFamily: 'var(--pt-font-mono)',
                          fontSize: 13,
                          color: 'var(--pt-muted)',
                        }}
                      >
                        —
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--pt-muted)', marginTop: 2 }}>
                      vs mois passé
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 3 KPIs revenus / charges / marge ─────────────────── */}
              <Section label="Détail" />
              <div
                className="kpis-strip"
                style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
              >
                <div className="kpi">
                  <div className="kpi__label">Revenus</div>
                  <div className="kpi__val num amount--positive">
                    +{formatMontant(revenus, currency)}
                  </div>
                </div>
                <div className="kpi">
                  <div className="kpi__label">Charges</div>
                  <div className="kpi__val num amount--negative">
                    −{formatMontant(charges, currency)}
                  </div>
                </div>
                <div className="kpi">
                  <div className="kpi__label">Marge</div>
                  <div
                    className={`kpi__val num ${marge >= 0 ? 'amount--positive' : 'amount--negative'}`}
                  >
                    {marge >= 0 ? '+' : '−'}{formatMontant(Math.abs(marge), currency)}
                  </div>
                </div>
              </div>

              {/* ── Trésorerie cumul (label test V8) ─────────────────── */}
              <Section label="Trésorerie cumul (depuis début)" />
              <div
                className="card"
                style={{
                  padding: 16,
                  marginTop: 8,
                  marginBottom: 16,
                  background: 'var(--pt-bg)',
                  border: '1px solid var(--pt-line)',
                  borderRadius: 14,
                }}
              >
                <div
                  className={`num ${tresorerieCumul >= 0 ? 'amount--positive' : 'amount--negative'}`}
                  style={{
                    fontFamily: 'var(--pt-font-display)',
                    fontWeight: 900,
                    fontSize: 24,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {tresorerieCumul >= 0 ? '+' : '−'}{formatMontant(Math.abs(tresorerieCumul), currency)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--pt-muted)', marginTop: 4 }}>
                  Solde net depuis le début de l’historique
                </div>
              </div>

              {/* ── Bar chart 12 mois ────────────────────────────────── */}
              <Section label="Évolution 12 mois" />
              <div
                className="card"
                style={{
                  padding: 16,
                  marginTop: 8,
                  marginBottom: 16,
                  background: 'var(--pt-bg)',
                  border: '1px solid var(--pt-line)',
                  borderRadius: 14,
                }}
              >
                <svg
                  viewBox="0 0 360 100"
                  style={{ width: '100%', height: 100, display: 'block' }}
                  preserveAspectRatio="none"
                  aria-label="Marge nette des 12 derniers mois"
                >
                  {/* Ligne de zéro centrée verticalement */}
                  <line
                    x1={0}
                    x2={360}
                    y1={50}
                    y2={50}
                    stroke="var(--pt-line)"
                    strokeWidth={1}
                    strokeDasharray="2 3"
                  />
                  {monthly.map((m, i) => {
                    const barHeight = (Math.abs(m.marge) / margeMax) * 45;
                    const isCurrent = i === currentMonthIdx;
                    const isPositive = m.marge >= 0;
                    const x = i * 30 + 3;
                    const y = isPositive ? 50 - barHeight : 50;
                    const fill = isCurrent
                      ? 'var(--pt-accent)'
                      : isPositive
                        ? 'var(--pt-primary)'
                        : 'var(--pt-danger)';
                    return (
                      <rect
                        key={m.key}
                        x={x}
                        y={y}
                        width={24}
                        height={Math.max(2, barHeight)}
                        fill={fill}
                        rx={2}
                      />
                    );
                  })}
                </svg>
                <div
                  style={{
                    fontFamily: 'var(--pt-font-mono)',
                    fontSize: 9,
                    color: 'var(--pt-subtle)',
                    marginTop: 6,
                    display: 'flex',
                    justifyContent: 'space-between',
                    letterSpacing: '0.06em',
                  }}
                >
                  <span>{firstMonthLabel}</span>
                  <span>{lastMonthLabel}</span>
                </div>
              </div>

              {/* ── Card-link vers rapport détaillé ──────────────────── */}
              <button
                type="button"
                className="card-link"
                onClick={() => navigate('/pilotage/rapport')}
                aria-label="Ouvrir le rapport financier détaillé"
              >
                <div className="card-link__icon">
                  <FileText size={18} aria-hidden="true" />
                </div>
                <div className="card-link__main">
                  <div className="card-link__title">Rapport détaillé</div>
                  <div className="card-link__sub">Détail par catégorie · 12 mois</div>
                </div>
                <span className="card-link__chev">
                  <ChevronRight size={16} aria-hidden="true" />
                </span>
              </button>
            </>
          )}
          </div>
        </div>

        {/* ── FAB Nouvelle transaction ──────────────────────────────── */}
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="Nouvelle transaction"
          style={{
            position: 'fixed',
            right: 20,
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
            zIndex: 40,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--pt-primary)',
            color: 'var(--pt-warm)',
            border: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(17,24,39,0.12)',
          }}
        >
          <Plus size={24} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </IonContent>

      <QuickAddTransactionForm
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          void refreshData();
        }}
      />
    </IonPage>
  );
};

export default FinancesView;
