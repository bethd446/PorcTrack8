/**
 * RapportFinancierView — /pilotage/rapport
 * ══════════════════════════════════════════════════════════════════════════
 * Refonte V77 (2026-05-10) : namespace .pt-screen + header .ph--primary
 * + .kpi-billboard (3 KPIs) + tableau .dt (mensuel) + bar-stack 6 mois
 * + boutons export .btn-secondary--lg (stubs toast "Bientôt disponible").
 *
 * Logique métier préservée :
 *   - financesAnalyzer (formatMontant, dateToPeriode) inchangé
 *   - Stack 6 mois par bande (extraction depuis libellé/bandeId)
 *   - Top bandes par CA cumulé
 *   - KPIs : Marge brute · Revenus · Coûts (synthèse 6 mois)
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { ChevronLeft, FileDown, FileText } from 'lucide-react';

import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import {
  formatMontant,
  dateToPeriode,
} from '../../services/financesAnalyzer';
import type { FinanceEntry } from '../../types/farm';

// ─── Helpers ────────────────────────────────────────────────────────────────

const MOIS_SHORT = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];
const MOIS_LONG = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function periodeKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function monthShort(key: string): string {
  const mm = Number(key.slice(5, 7));
  return Number.isFinite(mm) && mm >= 1 && mm <= 12 ? MOIS_SHORT[mm - 1] : '—';
}

function monthLongLabel(key: string): string {
  const yyyy = key.slice(0, 4);
  const mm = Number(key.slice(5, 7));
  if (!Number.isFinite(mm) || mm < 1 || mm > 12) return '—';
  return `${MOIS_LONG[mm - 1]} ${yyyy}`;
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
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { finances, currency } = useFarm();
  const entries = finances as FinanceEntry[];

  const keys = useMemo(() => last6MonthsKeys(), []);
  const periodLabel = useMemo(() => {
    if (keys.length === 0) return '6 derniers mois';
    const first = monthLongLabel(keys[0]);
    const last = monthLongLabel(keys[keys.length - 1]);
    return `${first} → ${last}`;
  }, [keys]);

  // Synthèse mensuelle : revenus / coûts / marge par mois
  const monthly = useMemo(() => {
    return keys.map((k) => {
      const revenus = entries
        .filter((e) => e.type === 'REVENU' && dateToPeriode(e.date) === k)
        .reduce((s, e) => s + e.montant, 0);
      const couts = entries
        .filter((e) => e.type === 'DEPENSE' && dateToPeriode(e.date) === k)
        .reduce((s, e) => s + e.montant, 0);
      const byBande = new Map<string, number>();
      for (const e of entries) {
        if (e.type !== 'REVENU' || dateToPeriode(e.date) !== k) continue;
        const id = extractBandeId(e);
        byBande.set(id, (byBande.get(id) ?? 0) + e.montant);
      }
      const bandes = Array.from(byBande.entries())
        .map(([id, v]) => ({ id, v }))
        .sort((a, b) => b.v - a.v);
      return {
        periode: k,
        label: monthShort(k),
        labelLong: monthLongLabel(k),
        revenus,
        couts,
        marge: revenus - couts,
        bandes,
      };
    });
  }, [entries, keys]);

  // KPI synthèse : Marge brute · Revenus · Coûts (cumul 6 mois)
  const totals = useMemo(() => {
    const revenus = monthly.reduce((s, m) => s + m.revenus, 0);
    const couts = monthly.reduce((s, m) => s + m.couts, 0);
    return { revenus, couts, marge: revenus - couts };
  }, [monthly]);

  // Top bandes (cumul 6 mois)
  const topBandes = useMemo(() => {
    const byBande = new Map<string, number>();
    for (const m of monthly) {
      for (const b of m.bandes) {
        byBande.set(b.id, (byBande.get(b.id) ?? 0) + b.v);
      }
    }
    return [...byBande.entries()]
      .map(([id, v]) => ({ id, v }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 6);
  }, [monthly]);

  const maxMonthTotal = Math.max(1, ...monthly.map((m) => m.revenus)) * 1.1;
  const hasData = monthly.some((m) => m.revenus > 0 || m.couts > 0);

  const handleExportPdf = (): void => {
    showToast('Export PDF · Bientôt disponible', 'info', 2200);
  };
  const handleExportCsv = (): void => {
    showToast('Export CSV · Bientôt disponible', 'info', 2200);
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <div className="pt-screen" style={{ paddingBottom: 120 }}>
          <header className="ph--primary">
            <button
              type="button"
              className="back"
              aria-label="Retour"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft size={18} strokeWidth={1.8} aria-hidden />
            </button>
            <div className="eyebrow">Pilotage</div>
            <h1>Rapport financier</h1>
            <div className="sub">{periodLabel}</div>
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
                  Aucune donnée financière
                </div>
                <div style={{ fontSize: 13, color: 'var(--pt-muted)' }}>
                  Ajoute des transactions pour générer un rapport sur les 6 derniers mois.
                </div>
              </div>
            ) : (
              <>
                {/* ── KPI billboard 3 colonnes ─────────────────────────── */}
                <div
                  className="kpi-billboard"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 10,
                    marginBottom: 20,
                  }}
                >
                  <div className="kpi-billboard__cell">
                    <div className="kpi-billboard__label">Marge brute</div>
                    <div
                      className={`kpi-billboard__val ${totals.marge >= 0 ? 'amount--positive' : 'amount--negative'}`}
                    >
                      {totals.marge >= 0 ? '+' : '−'}
                      {formatMontant(Math.abs(totals.marge), currency)}
                    </div>
                  </div>
                  <div className="kpi-billboard__cell">
                    <div className="kpi-billboard__label">Revenus</div>
                    <div className="kpi-billboard__val amount--positive">
                      +{formatMontant(totals.revenus, currency)}
                    </div>
                  </div>
                  <div className="kpi-billboard__cell">
                    <div className="kpi-billboard__label">Coûts</div>
                    <div className="kpi-billboard__val amount--negative">
                      −{formatMontant(totals.couts, currency)}
                    </div>
                  </div>
                </div>

                {/* ── Bar-stack 6 mois (CA par bande) ───────────────────── */}
                <div
                  className="section__label"
                  style={{
                    fontFamily: 'var(--pt-font-mono)',
                    fontSize: 10.5,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: 'var(--pt-subtle)',
                    marginTop: 4,
                    marginBottom: 10,
                  }}
                >
                  CA mensuel · empilé par bande
                </div>
                <div
                  className="bar-stack"
                  style={{
                    padding: 16,
                    background: 'var(--pt-bg)',
                    border: '1px solid var(--pt-line)',
                    borderRadius: 14,
                    marginBottom: 20,
                  }}
                >
                  <div
                    className="bar-stack__bars"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 6,
                      height: 140,
                      borderBottom: '1px solid var(--pt-line)',
                      paddingBottom: 2,
                    }}
                  >
                    {monthly.map((m, i) => {
                      const isLast = i === monthly.length - 1;
                      return (
                        <div
                          key={m.periode}
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            height: '100%',
                            gap: 2,
                          }}
                        >
                          <span
                            className="num"
                            style={{
                              fontFamily: 'var(--pt-font-mono)',
                              fontSize: 9,
                              color: isLast ? 'var(--pt-accent)' : 'var(--pt-subtle)',
                              marginBottom: 2,
                            }}
                          >
                            {m.revenus > 0 ? `${Math.round(m.revenus / 1000)}k` : '—'}
                          </span>
                          <div
                            style={{
                              width: '70%',
                              display: 'flex',
                              flexDirection: 'column-reverse',
                              gap: 1,
                            }}
                          >
                            {m.bandes.map((b, j) => {
                              const h = (b.v / maxMonthTotal) * 110;
                              const opacity = isLast ? 1 : 0.55 + j * 0.12;
                              return (
                                <div
                                  key={b.id + j}
                                  title={`${b.id} · ${formatMontant(b.v, currency)}`}
                                  style={{
                                    height: `${Math.max(2, h)}px`,
                                    background: 'var(--pt-primary)',
                                    opacity: Math.min(1, opacity),
                                    borderRadius: j === m.bandes.length - 1 ? '3px 3px 0 0' : 0,
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    {monthly.map((m, i) => {
                      const isLast = i === monthly.length - 1;
                      return (
                        <div
                          key={m.periode}
                          style={{
                            flex: 1,
                            textAlign: 'center',
                            fontFamily: 'var(--pt-font-mono)',
                            fontSize: 10,
                            letterSpacing: '0.06em',
                            color: isLast ? 'var(--pt-accent)' : 'var(--pt-subtle)',
                            fontWeight: isLast ? 700 : 500,
                          }}
                        >
                          {m.label}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Table mensuelle .dt ──────────────────────────────── */}
                <div
                  className="section__label"
                  style={{
                    fontFamily: 'var(--pt-font-mono)',
                    fontSize: 10.5,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: 'var(--pt-subtle)',
                    marginTop: 4,
                    marginBottom: 10,
                  }}
                >
                  Détail mensuel
                </div>
                <table className="dt" style={{ marginBottom: 20 }}>
                  <thead>
                    <tr>
                      <th>Mois</th>
                      <th className="num-r">Revenus</th>
                      <th className="num-r">Coûts</th>
                      <th className="num-r">Marge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map((m) => (
                      <tr key={m.periode}>
                        <td>{m.label}</td>
                        <td className="num-r">
                          <span className="amount--positive">
                            +{formatMontant(m.revenus, currency)}
                          </span>
                        </td>
                        <td className="num-r">
                          <span className="amount--negative">
                            −{formatMontant(m.couts, currency)}
                          </span>
                        </td>
                        <td className="num-r">
                          <span
                            className={m.marge >= 0 ? 'amount--positive' : 'amount--negative'}
                          >
                            {m.marge >= 0 ? '+' : '−'}
                            {formatMontant(Math.abs(m.marge), currency)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* ── Table cumul / annuel — Top bandes .dt ────────────── */}
                {topBandes.length > 0 ? (
                  <>
                    <div
                      className="section__label"
                      style={{
                        fontFamily: 'var(--pt-font-mono)',
                        fontSize: 10.5,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        color: 'var(--pt-subtle)',
                        marginTop: 4,
                        marginBottom: 10,
                      }}
                    >
                      Cumul {keys.length} mois · top bandes
                    </div>
                    <table className="dt" style={{ marginBottom: 24 }}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Bande</th>
                          <th className="num-r">CA cumulé</th>
                          <th className="num-r">Part</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topBandes.map((b, idx) => {
                          const pct = totals.revenus > 0
                            ? Math.round((b.v / totals.revenus) * 100)
                            : 0;
                          return (
                            <tr key={b.id}>
                              <td>{idx + 1}</td>
                              <td>{b.id}</td>
                              <td className="num-r">
                                <span className="amount--positive">
                                  +{formatMontant(b.v, currency)}
                                </span>
                              </td>
                              <td className="num-r">{pct}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                ) : null}

                {/* ── Actions export ───────────────────────────────────── */}
                <div
                  className="actions-stack"
                  style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                >
                  <button
                    type="button"
                    className="btn-secondary--lg"
                    onClick={handleExportPdf}
                    aria-label="Exporter le rapport en PDF"
                  >
                    <FileDown size={18} strokeWidth={1.6} aria-hidden />
                    Exporter PDF
                  </button>
                  <button
                    type="button"
                    className="btn-secondary--lg"
                    onClick={handleExportCsv}
                    aria-label="Exporter le rapport en CSV"
                  >
                    <FileText size={18} strokeWidth={1.6} aria-hidden />
                    Exporter CSV
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default RapportFinancierView;
