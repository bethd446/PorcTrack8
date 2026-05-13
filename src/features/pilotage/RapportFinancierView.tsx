/**
 * RapportFinancierView — /pilotage/rapport (V78, 2026-05-11)
 * ════════════════════════════════════════════════════════════════════════════
 * Refonte conforme mockup `reglages-pilotage-mockup-v76.html` B.7 :
 *   - header `.ph--primary` (eyebrow Pilotage · Rapport / Mois Année / sub)
 *   - kpi-billboard 3 : Marge brute / Marge nette / Taux marge
 *   - sparklines SVG 12 mois (revenus / charges)
 *   - bar-stack répartition coûts par catégorie + progress bars
 *   - table `.dt` 6 mois (Mois · Revenus · Charges · Marge · %)
 *   - actions export (Partager / PDF / CSV — toast "Bientôt disponible")
 *
 * Logique métier préservée :
 *   - financesAnalyzer (formatMontant, dateToPeriode) inchangé
 *   - Mode comparable au précédent : agrégats 6 mois mensuels
 *   - Empty state si aucun mouvement sur la fenêtre
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { ChevronLeft, FileDown, FileText, Share2 } from 'lucide-react';

import { useFarm, useMeta } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import {
  formatMontant,
  dateToPeriode,
} from '../../services/financesAnalyzer';
import type { FinanceEntry } from '../../types/farm';

// ─── Helpers ────────────────────────────────────────────────────────────────

const MINUS = '−'; // U+2212
const MOIS_SHORT_INITIAL = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MOIS_LONG = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const MOIS_SHORT_LBL = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function periodeKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function monthShortLbl(key: string): string {
  const mm = Number(key.slice(5, 7));
  return Number.isFinite(mm) && mm >= 1 && mm <= 12 ? MOIS_SHORT_LBL[mm - 1] : '—';
}

function monthLongLabel(key: string): string {
  const yyyy = key.slice(0, 4);
  const mm = Number(key.slice(5, 7));
  if (!Number.isFinite(mm) || mm < 1 || mm > 12) return '—';
  return `${MOIS_LONG[mm - 1]} ${yyyy}`;
}

function lastNMonthsKeys(n: number, now: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(periodeKey(d));
  }
  return keys;
}

// Classification catégorie → bucket de coût (aligné mockup B.7 "Détail par catégorie")
function bucketOf(cat: string): 'ALIMENT' | 'VETO' | 'ENERGIE' | 'AUTRES' {
  const norm = (cat ?? '').toUpperCase().trim();
  if (!norm) return 'AUTRES';
  if (/ALIM|NUTRI|FEED|GRAIN|PROVENDE/.test(norm)) return 'ALIMENT';
  if (/SANT[EÉ]?|VETO|V[EÉ]T[EÉ]R|MEDIC|SOIN|VACCIN|VERMIFUGE/.test(norm)) return 'VETO';
  if (/[EÉ]NERG|EAU|[EÉ]LECTR|CARBUR|GAZ|ESSENCE/.test(norm)) return 'ENERGIE';
  return 'AUTRES';
}

const BUCKET_META: Record<
  'ALIMENT' | 'VETO' | 'ENERGIE' | 'AUTRES',
  { label: string; color: string }
> = {
  ALIMENT: { label: 'Aliment', color: 'var(--pt-primary, #2D4A1F)' },
  VETO: { label: 'Vétérinaire', color: 'var(--pt-accent, #B8703D)' },
  ENERGIE: { label: 'Énergie · eau', color: 'var(--pt-info, #4a6e8a)' },
  AUTRES: { label: 'Autres', color: 'var(--pt-muted, #6b6357)' },
};

// ─── Composant ──────────────────────────────────────────────────────────────

const RapportFinancierView: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { finances, currency } = useFarm();
  const { loading: farmLoading } = useMeta();
  const entries = finances as FinanceEntry[];

  const keys6 = useMemo(() => lastNMonthsKeys(6), []);
  const keys12 = useMemo(() => lastNMonthsKeys(12), []);
  const currentKey = keys6[keys6.length - 1] ?? '';
  const currentLong = monthLongLabel(currentKey);
  const currentMm = Number(currentKey.slice(5, 7));
  const currentYr = currentKey.slice(0, 4);
  const currentMonthName = Number.isFinite(currentMm) && currentMm >= 1 && currentMm <= 12
    ? MOIS_LONG[currentMm - 1]
    : '—';

  // Mensuel 6 mois (revenus / charges / marge / taux)
  const monthly = useMemo(() => {
    return keys6.map((k) => {
      const revenus = entries
        .filter((e) => e.type === 'REVENU' && dateToPeriode(e.date) === k)
        .reduce((s, e) => s + e.montant, 0);
      const couts = entries
        .filter((e) => e.type === 'DEPENSE' && dateToPeriode(e.date) === k)
        .reduce((s, e) => s + e.montant, 0);
      const marge = revenus - couts;
      const taux = revenus > 0 ? Math.round((marge / revenus) * 100) : 0;
      return {
        periode: k,
        label: monthShortLbl(k),
        labelLong: monthLongLabel(k),
        revenus,
        couts,
        marge,
        taux,
      };
    });
  }, [entries, keys6]);

  // Sparkline 12 mois (revenus & charges en valeur absolue)
  const sparkline = useMemo(() => {
    return keys12.map((k, i) => {
      const revenus = entries
        .filter((e) => e.type === 'REVENU' && dateToPeriode(e.date) === k)
        .reduce((s, e) => s + e.montant, 0);
      const couts = entries
        .filter((e) => e.type === 'DEPENSE' && dateToPeriode(e.date) === k)
        .reduce((s, e) => s + e.montant, 0);
      const mm = Number(k.slice(5, 7));
      return {
        periode: k,
        revenus,
        couts,
        initial: Number.isFinite(mm) ? MOIS_SHORT_INITIAL[mm - 1] : '?',
        idx: i,
      };
    });
  }, [entries, keys12]);

  const current = monthly[monthly.length - 1] ?? { revenus: 0, couts: 0, marge: 0, taux: 0 };
  const prev = monthly[monthly.length - 2] ?? { revenus: 0, couts: 0, marge: 0, taux: 0 };
  const deltaPctMarge = prev.marge !== 0
    ? Math.round(((current.marge - prev.marge) / Math.abs(prev.marge)) * 100)
    : null;

  // Répartition par bucket de coût (mois courant)
  const buckets = useMemo(() => {
    const acc: Record<string, number> = { ALIMENT: 0, VETO: 0, ENERGIE: 0, AUTRES: 0 };
    for (const e of entries) {
      if (e.type !== 'DEPENSE') continue;
      if (dateToPeriode(e.date) !== currentKey) continue;
      acc[bucketOf(e.categorie)] += e.montant;
    }
    const totalCouts = current.couts || 1;
    return (Object.keys(acc) as Array<keyof typeof acc>)
      .map((k) => ({
        key: k,
        label: BUCKET_META[k].label,
        color: BUCKET_META[k].color,
        v: acc[k],
        pct: Math.round((acc[k] / totalCouts) * 100),
      }))
      .sort((a, b) => b.v - a.v);
  }, [entries, currentKey, current.couts]);

  const hasData = monthly.some((m) => m.revenus > 0 || m.couts > 0);
  const showLoading = farmLoading && entries.length === 0;

  // Sparkline scaling
  const sparkMax = Math.max(1, ...sparkline.map((d) => Math.max(d.revenus, d.couts)));

  const handleExportPdf = (): void => {
    showToast('Export PDF · Bientôt disponible', 'info', 2200);
  };
  const handleExportCsv = (): void => {
    showToast('Export CSV · Bientôt disponible', 'info', 2200);
  };
  const handleShare = (): void => {
    showToast('Partage · Bientôt disponible', 'info', 2200);
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <div className="pt-screen" style={{ paddingBottom: 140 }}>
          <header className="ph--primary">
            <button
              type="button"
              className="back"
              aria-label="Retour"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft size={18} strokeWidth={2} aria-hidden />
            </button>
            <div className="eyebrow">Pilotage · Rapport</div>
            <h1>
              {currentMonthName}
              <br />
              {currentYr}
            </h1>
            <div className="sub">Synthèse financière · 6 mois roulants</div>
          </header>

          <div
            className="phone-content"
            style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}
          >
            {showLoading ? (
              <div className="empty-state" aria-busy="true" aria-live="polite">
                <div className="empty-state__icon" aria-hidden style={{ opacity: 0.4 }}>
                  <FileText size={38} strokeWidth={2} />
                </div>
                <div className="empty-state__title" style={{ opacity: 0.7 }}>Chargement…</div>
                <div className="empty-state__sub">Génération du rapport en cours.</div>
              </div>
            ) : !hasData ? (
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
                  Aucune donnée financière
                </div>
                <div style={{ fontSize: 13, color: 'var(--pt-muted)', marginTop: 8 }}>
                  Ajoute des transactions pour générer un rapport sur les 6 derniers mois.
                </div>
              </div>
            ) : (
              <>
                {/* ── KPI billboard 3 colonnes ─────────────────────────── */}
                <section style={{ marginBottom: 20 }}>
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
                    Synthèse {currentLong.toLowerCase()}
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      border: '1px solid var(--pt-line)',
                      borderRadius: 14,
                      background: 'var(--pt-bg, #FAF7F0)',
                      overflow: 'hidden',
                    }}
                  >
                    <div className="kpi-billboard__cell" style={{ padding: 14, borderRight: '1px solid var(--pt-line)' }}>
                      <div
                        style={{
                          fontFamily: 'var(--pt-font-mono)',
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color: 'var(--pt-subtle)',
                        }}
                      >
                        Marge brute
                      </div>
                      <div
                        className="kpi-billboard num"
                        style={{
                          fontFamily: 'var(--pt-font-display)',
                          fontWeight: 900,
                          fontSize: 28,
                          lineHeight: 0.95,
                          marginTop: 6,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        +{formatMontant(current.revenus, currency)}
                      </div>
                    </div>
                    <div className="kpi-billboard__cell" style={{ padding: 14, borderRight: '1px solid var(--pt-line)' }}>
                      <div
                        style={{
                          fontFamily: 'var(--pt-font-mono)',
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color: 'var(--pt-subtle)',
                        }}
                      >
                        Marge nette
                      </div>
                      <div
                        className={`kpi-billboard num ${current.marge >= 0 ? 'amount--positive' : 'amount--negative'}`}
                        style={{
                          fontFamily: 'var(--pt-font-display)',
                          fontWeight: 900,
                          fontSize: 28,
                          lineHeight: 0.95,
                          marginTop: 6,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {current.marge >= 0 ? '+' : MINUS}
                        {formatMontant(Math.abs(current.marge), currency)}
                      </div>
                      {deltaPctMarge !== null ? (
                        <div
                          className={`num ${deltaPctMarge >= 0 ? 'amount--positive' : 'amount--negative'}`}
                          style={{
                            fontFamily: 'var(--pt-font-mono)',
                            fontSize: 10.5,
                            marginTop: 4,
                          }}
                        >
                          {deltaPctMarge >= 0 ? '+' : MINUS}{Math.abs(deltaPctMarge)}%
                        </div>
                      ) : null}
                    </div>
                    <div className="kpi-billboard__cell" style={{ padding: 14 }}>
                      <div
                        style={{
                          fontFamily: 'var(--pt-font-mono)',
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color: 'var(--pt-subtle)',
                        }}
                      >
                        Taux marge
                      </div>
                      <div
                        className="kpi-billboard num"
                        style={{
                          fontFamily: 'var(--pt-font-display)',
                          fontWeight: 900,
                          fontSize: 28,
                          lineHeight: 0.95,
                          marginTop: 6,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {current.taux}
                        <small
                          style={{
                            fontFamily: 'var(--pt-font-mono)',
                            fontWeight: 600,
                            fontSize: 13,
                            color: 'var(--pt-muted)',
                            marginLeft: 2,
                          }}
                        >
                          %
                        </small>
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--pt-font-mono)',
                          fontSize: 10.5,
                          color: 'var(--pt-muted)',
                          marginTop: 4,
                        }}
                      >
                        vs {prev.taux}% mois préc.
                      </div>
                    </div>
                  </div>
                </section>

                {/* ── Sparklines SVG 12 mois (revenus & charges) ─────── */}
                <section style={{ marginBottom: 20 }}>
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
                    Tendance · 12 mois
                  </div>
                  <div
                    style={{
                      padding: 14,
                      background: 'var(--pt-bg, #FAF7F0)',
                      border: '1px solid var(--pt-line)',
                      borderRadius: 14,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="amount--positive" style={{ fontFamily: 'var(--pt-font-mono)', fontWeight: 600, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        Revenus
                      </span>
                      <span className="amount--positive num" style={{ fontFamily: 'var(--pt-font-mono)', fontWeight: 600, fontSize: 11 }}>
                        +{formatMontant(current.revenus, currency)}
                      </span>
                    </div>
                    <svg
                      viewBox="0 0 320 60"
                      preserveAspectRatio="none"
                      aria-label="Évolution revenus 12 mois"
                      style={{ width: '100%', height: 60, display: 'block', marginBottom: 12 }}
                    >
                      <polyline
                        fill="rgba(45,74,31,0.10)"
                        stroke="none"
                        points={
                          [`1,58`]
                            .concat(
                              sparkline.map((d, i) => {
                                const x = (i / Math.max(1, sparkline.length - 1)) * 318 + 1;
                                const y = 58 - (d.revenus / sparkMax) * 54;
                                return `${x},${y}`;
                              }),
                            )
                            .concat([`319,58`])
                            .join(' ')
                        }
                      />
                      <polyline
                        fill="none"
                        stroke="var(--pt-emerald-ink, #2D4A1F)"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={sparkline
                          .map((d, i) => {
                            const x = (i / Math.max(1, sparkline.length - 1)) * 318 + 1;
                            const y = 58 - (d.revenus / sparkMax) * 54;
                            return `${x},${y}`;
                          })
                          .join(' ')}
                      />
                    </svg>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="amount--negative" style={{ fontFamily: 'var(--pt-font-mono)', fontWeight: 600, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        Charges
                      </span>
                      <span className="amount--negative num" style={{ fontFamily: 'var(--pt-font-mono)', fontWeight: 600, fontSize: 11 }}>
                        {MINUS}{formatMontant(current.couts, currency)}
                      </span>
                    </div>
                    <svg
                      viewBox="0 0 320 60"
                      preserveAspectRatio="none"
                      aria-label="Évolution charges 12 mois"
                      style={{ width: '100%', height: 60, display: 'block' }}
                    >
                      <polyline
                        fill="none"
                        stroke="var(--pt-rose-ink, #a4453d)"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={sparkline
                          .map((d, i) => {
                            const x = (i / Math.max(1, sparkline.length - 1)) * 318 + 1;
                            const y = 58 - (d.couts / sparkMax) * 54;
                            return `${x},${y}`;
                          })
                          .join(' ')}
                      />
                    </svg>
                  </div>
                </section>

                {/* ── Bar-stack répartition coûts par catégorie ──────── */}
                <section style={{ marginBottom: 20 }}>
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
                    Détail par catégorie
                  </div>
                  <div
                    style={{
                      padding: 14,
                      background: 'var(--pt-bg, #FAF7F0)',
                      border: '1px solid var(--pt-line)',
                      borderRadius: 14,
                    }}
                  >
                    {current.couts > 0 ? (
                      <div
                        className="bar-stack"
                        style={{
                          display: 'flex',
                          width: '100%',
                          height: 14,
                          borderRadius: 999,
                          overflow: 'hidden',
                          background: 'var(--pt-line)',
                          marginBottom: 14,
                        }}
                      >
                        {buckets.map((b) =>
                          b.v > 0 ? (
                            <span
                              key={b.key}
                              title={`${b.label} · ${formatMontant(b.v, currency)} (${b.pct}%)`}
                              style={{
                                display: 'block',
                                width: `${b.pct}%`,
                                height: '100%',
                                background: b.color,
                              }}
                            />
                          ) : null,
                        )}
                      </div>
                    ) : null}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {buckets.map((b) => (
                        <div key={b.key}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontFamily: 'var(--pt-font-mono)',
                              fontSize: 12,
                              fontWeight: 600,
                              marginBottom: 4,
                            }}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <span
                                aria-hidden
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: 2,
                                  background: b.color,
                                  display: 'inline-block',
                                }}
                              />
                              {b.label}
                            </span>
                            <span className="num">
                              {b.v > 0 ? `${MINUS}${formatMontant(b.v, currency)}` : '—'} · {b.pct}%
                            </span>
                          </div>
                          <div
                            style={{
                              height: 6,
                              borderRadius: 99,
                              background: 'var(--pt-bg-app, #F1ECE0)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, b.pct)}%`,
                                height: '100%',
                                background: b.color,
                                transition: 'width .2s ease',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* ── Table .dt mensuelle 6 mois ───────────────────────── */}
                <section style={{ marginBottom: 20 }}>
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
                    Mois par mois · 6 derniers
                  </div>
                  <div
                    style={{
                      padding: '6px 10px',
                      background: 'var(--pt-bg, #FAF7F0)',
                      border: '1px solid var(--pt-line)',
                      borderRadius: 14,
                    }}
                  >
                    <table className="dt" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th>Mois</th>
                          <th className="num-r">Revenus</th>
                          <th className="num-r">Charges</th>
                          <th className="num-r">Marge</th>
                          <th className="num-r">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...monthly].reverse().map((m, i) => {
                          const isCurrent = i === 0;
                          return (
                            <tr
                              key={m.periode}
                              style={isCurrent ? { background: 'rgba(184,112,61,0.06)' } : undefined}
                            >
                              <td>{isCurrent ? <b>{m.label} {m.periode.slice(2, 4)}</b> : m.label}</td>
                              <td className="num-r">
                                <span className="amount--positive">
                                  +{formatMontant(m.revenus, currency)}
                                </span>
                              </td>
                              <td className="num-r">
                                <span className="amount--negative">
                                  {MINUS}{formatMontant(m.couts, currency)}
                                </span>
                              </td>
                              <td className="num-r">
                                <span className={m.marge >= 0 ? 'amount--positive' : 'amount--negative'}>
                                  {isCurrent ? <b>{m.marge >= 0 ? '+' : MINUS}{formatMontant(Math.abs(m.marge), currency)}</b>
                                    : <>{m.marge >= 0 ? '+' : MINUS}{formatMontant(Math.abs(m.marge), currency)}</>}
                                </span>
                              </td>
                              <td className="num-r">{m.taux}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* ── Actions export ───────────────────────────────────── */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  <button
                    type="button"
                    className="btn btn--secondary btn--lg"
                    onClick={handleShare}
                    aria-label="Partager le rapport"
                  >
                    <Share2 size={16} strokeWidth={2} aria-hidden />
                    Partager
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--lg"
                    onClick={handleExportCsv}
                    aria-label="Exporter le rapport en CSV"
                  >
                    <FileText size={16} strokeWidth={2} aria-hidden />
                    CSV
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--lg"
                    onClick={handleExportPdf}
                    aria-label="Exporter le rapport en PDF"
                  >
                    <FileDown size={16} strokeWidth={2} aria-hidden />
                    PDF
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
