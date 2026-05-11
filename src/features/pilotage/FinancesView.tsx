/**
 * FinancesView — Refonte V78 (2026-05-11)
 * ════════════════════════════════════════════════════════════════════════════
 * Pattern mockup `reglages-pilotage-mockup-v76.html` (section B.4) :
 *   - header `.ph--primary` (eyebrow Pilotage / titre Finances)
 *   - kpi-billboard marge nette mensuelle (Big Shoulders 64px)
 *     + delta vs mois précédent (signe Unicode + ou − U+2212)
 *   - bar chart 12 mois SVG (marge nette mensuelle, dernier mois en accent)
 *   - kpis-strip 3 colonnes : Revenus / Charges / Marge
 *   - trésorerie cumul (label "Trésorerie cumul (depuis début)" préservé V8)
 *   - liste transactions `.txn-row` (10 dernières) avec
 *     `.amount--positive` (+) / `.amount--negative` (−)
 *   - card-link Rapport financier détaillé
 *   - FAB `.fab` Nouvelle transaction
 *
 * Logique métier préservée :
 *   - useFarm().finances + useFarm().currency inchangés
 *   - financesAnalyzer (summarizeByPeriode / summarizeAll / formatMontant)
 *     inchangé — espace insécable U+00A0 entre milliers (formatCurrency).
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonContent, IonPage, IonRefresher, IonRefresherContent,
} from '@ionic/react';
import { ChevronLeft, ChevronRight, FileText, Plus, TrendingUp, TrendingDown } from 'lucide-react';

import { useFarm } from '../../context/FarmContext';
import {
  summarizeByPeriode,
  summarizeAll,
  formatMontant,
} from '../../services/financesAnalyzer';
import type { Currency } from '../../lib/currency';
import type { FinanceEntry } from '../../types/farm';
import QuickAddTransactionForm from '../../components/forms/QuickAddTransactionForm';

// ─── Période & helpers ───────────────────────────────────────────────────────

const MINUS = '−'; // Unicode minus sign U+2212

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

const MOIS_SHORT_INITIAL = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function monthLongLabel(periodeKey: string): string {
  const yyyy = periodeKey.slice(0, 4);
  const mm = Number(periodeKey.slice(5, 7));
  if (!Number.isFinite(mm) || mm < 1 || mm > 12) return '—';
  return `${MOIS_LONG[mm - 1]} ${yyyy}`;
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

/** Parse une date dd/MM/yyyy → Date (ou null si invalide). */
function parseDdmmyyyy(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d;
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
  const prevMonthLabel = monthLongLabel(previousMonthKey(now));

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
      const mm = Number(k.slice(5, 7));
      return {
        key: k,
        initial: Number.isFinite(mm) ? MOIS_SHORT_INITIAL[mm - 1] : '?',
        marge: s.margeNette,
        idx: i,
      };
    });
  }, [entries, now]);

  const currentMonthIdx = monthly.length - 1;
  const margeMax = Math.max(1, ...monthly.map(m => Math.abs(m.marge)));
  const margeMinVal = monthly.reduce((mn, m) => (m.marge < mn ? m.marge : mn), Infinity);
  const margeMaxVal = monthly.reduce((mx, m) => (m.marge > mx ? m.marge : mx), -Infinity);

  // 10 dernières transactions (tri date desc)
  const recent = useMemo<FinanceEntry[]>(() => {
    return [...entries]
      .sort((a, b) => {
        const da = parseDdmmyyyy(a.date)?.getTime() ?? 0;
        const db = parseDdmmyyyy(b.date)?.getTime() ?? 0;
        return db - da;
      })
      .slice(0, 10);
  }, [entries]);

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

        <div className="pt-screen" style={{ paddingBottom: 120 }}>
          <header className="ph--primary">
            <button
              type="button"
              className="back"
              aria-label="Retour à Performance"
              onClick={() => navigate('/performance?tab=finances')}
            >
              <ChevronLeft size={18} strokeWidth={2} aria-hidden />
            </button>
            <div className="eyebrow">Pilotage · {currentMonthLabel}</div>
            <h1>Finances</h1>
            <div className="sub">Marge mensuelle FCFA · 12 mois roulants</div>
          </header>

          <div
            className="phone-content"
            style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}
          >
            {!hasData ? (
              <div className="empty" style={{ marginTop: 16, textAlign: 'center', padding: '40px 16px' }}>
                <div
                  style={{
                    fontFamily: 'var(--pt-font-display)',
                    fontWeight: 900,
                    fontSize: 26,
                    textTransform: 'uppercase',
                    letterSpacing: '-0.01em',
                    color: 'var(--pt-ink)',
                    lineHeight: 1,
                  }}
                >
                  Aucune transaction
                </div>
                <div style={{ fontSize: 13, color: 'var(--pt-muted)', marginTop: 8 }}>
                  Ajoute ta première vente ou dépense pour suivre ta marge.
                </div>
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  style={{
                    marginTop: 22,
                    background: 'var(--pt-primary)',
                    color: 'var(--pt-warm, white)',
                    border: 'none',
                    borderRadius: 12,
                    padding: '12px 18px',
                    fontFamily: 'var(--pt-font-mono)',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Plus size={14} strokeWidth={2} aria-hidden /> Nouvelle transaction
                </button>
              </div>
            ) : (
              <>
                {/* ── KPI Billboard : marge nette mensuelle ─────────────── */}
                <section style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      padding: 18,
                      background: 'var(--pt-warm, #FAF7F0)',
                      border: '1px solid var(--pt-line)',
                      borderRadius: 18,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--pt-font-mono)',
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: 'var(--pt-subtle)',
                        marginBottom: 8,
                      }}
                    >
                      Marge nette · {currentMonthLabel}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        gap: 14,
                      }}
                    >
                      <div
                        className={`kpi-billboard num ${marge >= 0 ? 'amount--positive' : 'amount--negative'}`}
                        style={{
                          fontFamily: 'var(--pt-font-display)',
                          fontWeight: 900,
                          fontSize: 64,
                          lineHeight: 0.9,
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {marge >= 0 ? '+' : MINUS}
                        {formatMontant(Math.abs(marge), currency)}
                      </div>
                      {deltaPct !== null ? (
                        <div
                          className={`num ${deltaPct >= 0 ? 'amount--positive' : 'amount--negative'}`}
                          style={{
                            fontFamily: 'var(--pt-font-mono)',
                            fontWeight: 600,
                            fontSize: 14,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            flexShrink: 0,
                            paddingBottom: 4,
                          }}
                        >
                          {deltaPct >= 0
                            ? <TrendingUp size={14} strokeWidth={2} aria-hidden />
                            : <TrendingDown size={14} strokeWidth={2} aria-hidden />}
                          {deltaPct >= 0 ? '+' : MINUS}{Math.abs(deltaPct)}%
                        </div>
                      ) : null}
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        fontFamily: 'var(--pt-font-mono)',
                        fontSize: 11,
                        color: 'var(--pt-muted)',
                      }}
                    >
                      vs {prevMonthLabel.toLowerCase()} {margePrev >= 0 ? '+' : MINUS}
                      {formatMontant(Math.abs(margePrev), currency)}
                    </div>
                  </div>
                </section>

                {/* ── Bar chart 12 mois ─────────────────────────────────── */}
                <section style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      fontFamily: 'var(--pt-font-mono)',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--pt-subtle)',
                      marginBottom: 10,
                    }}
                  >
                    Évolution · 12 mois
                  </div>
                  <div
                    style={{
                      padding: 14,
                      background: 'var(--pt-bg, #FAF7F0)',
                      border: '1px solid var(--pt-line)',
                      borderRadius: 14,
                    }}
                  >
                    <svg
                      viewBox="0 0 320 120"
                      preserveAspectRatio="none"
                      aria-label="Marge nette des 12 derniers mois"
                      style={{ width: '100%', height: 120, display: 'block' }}
                    >
                      <line
                        x1={0}
                        x2={320}
                        y1={100}
                        y2={100}
                        stroke="rgba(26,26,26,0.08)"
                        strokeWidth={2}
                      />
                      {monthly.map((m, i) => {
                        const barH = (Math.abs(m.marge) / margeMax) * 78;
                        const isCurrent = i === currentMonthIdx;
                        const isPositive = m.marge >= 0;
                        const x = i * 26 + 6;
                        const y = isPositive ? 100 - barH : 100;
                        const fill = isCurrent
                          ? 'var(--pt-accent, #B8703D)'
                          : isPositive
                            ? 'var(--pt-primary, #2D4A1F)'
                            : 'var(--pt-rose-ink, #a4453d)';
                        return (
                          <g key={m.key}>
                            <rect
                              x={x}
                              y={y}
                              width={18}
                              height={Math.max(2, barH)}
                              fill={fill}
                            />
                            <text
                              x={x + 3}
                              y={115}
                              style={{
                                fontFamily: 'var(--pt-font-mono)',
                                fontSize: 8.5,
                                fill: isCurrent
                                  ? 'var(--pt-accent, #B8703D)'
                                  : 'var(--pt-subtle, #a39888)',
                              }}
                            >
                              {m.initial}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                    <div
                      style={{
                        marginTop: 6,
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontFamily: 'var(--pt-font-mono)',
                        fontSize: 11,
                        color: 'var(--pt-muted)',
                      }}
                    >
                      <span>
                        min {margeMinVal < 0 ? MINUS : ''}
                        {formatMontant(Math.abs(margeMinVal === Infinity ? 0 : margeMinVal), currency)}
                      </span>
                      <span>
                        max <b style={{ color: 'var(--pt-accent, #B8703D)' }}>
                          {margeMaxVal >= 0 ? '+' : MINUS}
                          {formatMontant(Math.abs(margeMaxVal === -Infinity ? 0 : margeMaxVal), currency)}
                        </b>
                      </span>
                    </div>
                  </div>
                </section>

                {/* ── 3 KPIs revenus / charges / marge ─────────────────── */}
                <section style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      fontFamily: 'var(--pt-font-mono)',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--pt-subtle)',
                      marginBottom: 10,
                    }}
                  >
                    Détail {currentMonthLabel.toLowerCase()}
                  </div>
                  <div
                    className="kpis-strip"
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, border: '1px solid var(--pt-line)', borderRadius: 14, background: 'var(--pt-bg, #FAF7F0)', overflow: 'hidden' }}
                  >
                    <div className="kpi" style={{ padding: 14, borderRight: '1px solid var(--pt-line)' }}>
                      <div className="kpi__label" style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pt-subtle)' }}>Revenus</div>
                      <div
                        className="kpi__val num amount--positive"
                        style={{ fontFamily: 'var(--pt-font-display)', fontWeight: 900, fontSize: 24, lineHeight: 0.95, marginTop: 6 }}
                      >
                        +{formatMontant(revenus, currency)}
                      </div>
                    </div>
                    <div className="kpi" style={{ padding: 14, borderRight: '1px solid var(--pt-line)' }}>
                      <div className="kpi__label" style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pt-subtle)' }}>Charges</div>
                      <div
                        className="kpi__val num amount--negative"
                        style={{ fontFamily: 'var(--pt-font-display)', fontWeight: 900, fontSize: 24, lineHeight: 0.95, marginTop: 6 }}
                      >
                        {MINUS}{formatMontant(charges, currency)}
                      </div>
                    </div>
                    <div className="kpi" style={{ padding: 14 }}>
                      <div className="kpi__label" style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pt-subtle)' }}>Marge</div>
                      <div
                        className={`kpi__val num ${marge >= 0 ? 'amount--positive' : 'amount--negative'}`}
                        style={{ fontFamily: 'var(--pt-font-display)', fontWeight: 900, fontSize: 24, lineHeight: 0.95, marginTop: 6 }}
                      >
                        {marge >= 0 ? '+' : MINUS}{formatMontant(Math.abs(marge), currency)}
                      </div>
                    </div>
                  </div>
                </section>

                {/* ── Trésorerie cumul (label test V8 préservé) ─────────── */}
                <section style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      fontFamily: 'var(--pt-font-mono)',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--pt-subtle)',
                      marginBottom: 10,
                    }}
                  >
                    Trésorerie cumul (depuis début)
                  </div>
                  <div
                    style={{
                      padding: 16,
                      background: 'var(--pt-bg, #FAF7F0)',
                      border: '1px solid var(--pt-line)',
                      borderRadius: 14,
                    }}
                  >
                    <div
                      className={`num ${tresorerieCumul >= 0 ? 'amount--positive' : 'amount--negative'}`}
                      style={{
                        fontFamily: 'var(--pt-font-display)',
                        fontWeight: 900,
                        fontSize: 28,
                        letterSpacing: '-0.01em',
                        lineHeight: 1,
                      }}
                    >
                      {tresorerieCumul >= 0 ? '+' : MINUS}
                      {formatMontant(Math.abs(tresorerieCumul), currency)}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--pt-font-mono)',
                        fontSize: 11,
                        color: 'var(--pt-muted)',
                        marginTop: 4,
                      }}
                    >
                      Solde net depuis le début de l’historique
                    </div>
                  </div>
                </section>

                {/* ── Liste transactions récentes ─────────────────────── */}
                <section style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--pt-font-mono)',
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: 'var(--pt-subtle)',
                      }}
                    >
                      Transactions récentes
                    </div>
                    <span
                      className="num"
                      style={{
                        fontFamily: 'var(--pt-font-mono)',
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--pt-muted)',
                      }}
                    >
                      {recent.length} / {entries.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {recent.map((e, idx) => {
                      const isRev = e.type === 'REVENU';
                      const sign = isRev ? '+' : MINUS;
                      const klass = isRev ? 'amount--positive' : 'amount--negative';
                      const dateStr = e.date || '—';
                      return (
                        <div className="txn-row" key={`${e.date}-${e.libelle}-${idx}`}>
                          <div className="txn-row__date">{dateStr}</div>
                          <div>
                            <div className="txn-row__cat">{e.categorie || '—'}</div>
                            <div className="txn-row__desc">{e.libelle || '—'}</div>
                          </div>
                          <div className={`txn-row__amount num ${klass}`}>
                            {sign}{formatMontant(e.montant, currency)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

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
                    <div className="card-link__title">Rapport financier complet</div>
                    <div className="card-link__sub">Détail par catégorie · 6 mois</div>
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
        {hasData ? (
          <button
            type="button"
            className="fab"
            onClick={() => setAddOpen(true)}
            aria-label="Nouvelle transaction"
          >
            <Plus size={22} strokeWidth={2.4} aria-hidden="true" />
          </button>
        ) : null}
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
