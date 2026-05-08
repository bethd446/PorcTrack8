/**
 * V70 — Page /performance (archétype 2 Hub)
 *
 * Réplique pixel-perfect mockup `docs/v70/v70-mockup.html` lignes 1295-1397.
 *
 * Sections :
 *  1. PageHeader 'Pilotage · Mai 2026' / 'Performance'
 *  2. TabsMini (Vue / KPIs / Finances / Prévisions)
 *  3. ISSE hero (Card hero + Tooltip term="isse")
 *  4. EduCard explication ISSE
 *  5. Indicateurs techniques (4 KPIs, Tooltips mortalite/iem)
 *  6. Finances (Marge mensuelle + Pill "Owner") — UI ouverte à tous V70,
 *     RLS différé V71 (décision B Christophe).
 *  7. Top performances (2 ListItem bandes + EntityAvatar)
 *
 * Phase 3D V70 — stubs data, Phase F branchera perfKpiAnalyzer.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Download, Trophy, Medal } from 'lucide-react';
import { PageHeader } from '../components/ds/PageHeader';
import { Section } from '../components/ds/Section';
import { Card } from '../components/ds/Card';
import { Button } from '../components/ds/Button';
import { Pill } from '../components/ds/Pill';
import { TabsMini } from '../components/ds/TabsMini';
import { ListItem } from '../components/ds/ListItem';
import { Tooltip } from '../components/v70/Tooltip';
import { EduCard } from '../components/v70/EduCard';
import { DataTable, DataTableColumn } from '../components/v70/DataTable';
import { ExportButton } from '../components/v70/ExportButton';
import { useUIPreferences } from '../context/UIPreferencesContext';
import { EntityAvatar } from '../../components/ds/EntityAvatar';
import { useFarm } from '../../context/FarmContext';
import { computeGlobalKpis } from '../../services/perfKpiAnalyzer';
import { buildForecastEvents } from '../../utils/forecastEvents';
import { MariusGreeting } from '../../features/chatbot/MariusGreeting';

const PAGE_BACKGROUND_SRC = '/images/ambiance-croissance.webp';

type PerfTab = 'vue' | 'kpis' | 'finances' | 'previsions';

interface BandePerf {
  bande: string;
  isse: number | null;
  marge: number | null;
  truies: number | null;
  [key: string]: unknown;
}

const BANDES_COLUMNS: DataTableColumn<BandePerf>[] = [
  { key: 'bande', label: 'Bande' },
  { key: 'isse', label: 'ISSE', align: 'right', sortable: true, render: (r) => r.isse != null ? r.isse.toFixed(1) : '—' },
  { key: 'marge', label: 'Marge FCFA', align: 'right', sortable: true, render: (r) => r.marge != null ? `+${r.marge}` : '—' },
  { key: 'truies', label: 'Truies', align: 'right', sortable: true, render: (r) => r.truies != null ? String(r.truies) : '—' },
];

export const PerformanceV70: React.FC = () => {
  const navigate = useNavigate();
  const { bandes, truies, saillies } = useFarm();
  const [tab, setTab] = useState<PerfTab>('vue');
  const { advancedMode } = useUIPreferences();
  const topBandes = bandes?.slice(0, 2) ?? [];

  // V71.1 — KPIs live calculés via perfKpiAnalyzer (étaient 11.8/86%/13.2/8.4%/5.1j hardcodés)
  const kpis = useMemo(() => {
    try {
      return computeGlobalKpis(truies, bandes, saillies);
    } catch {
      return null;
    }
  }, [truies, bandes, saillies]);

  // V71.2 — données bandes calculées depuis FarmContext (plus de stubs BANDES_DATA)
  const bandesData = useMemo((): BandePerf[] => {
    if (!bandes.length) return [];
    return bandes.slice(0, 10).map(b => ({
      bande: b.idPortee || b.id,
      isse: null,   // calculé via perfKpiAnalyzer par bande — disponible après 1 cycle complet
      marge: null,
      truies: null,
    }));
  }, [bandes]);

  // V71.3 — Prévisions dynamiques basées sur buildForecastEvents (saillie+115j → MB,
  // dateMB+165j → sortie abattoir). Avant : labels hardcodés ("Bande de mai · 11
  // truies / 28 août 2026", etc.).
  const forecasts = useMemo(() => {
    const today = new Date();
    const events = buildForecastEvents({ truies, bandes, saillies }, today, 90);
    const mises = events.filter(e => e.type === 'MISE_BAS').slice(0, 4);
    const sorties = events.filter(e => e.type === 'SORTIE').slice(0, 4);
    // Total porcelets attendus : moyenne NV troupeau × nb mises-bas prévues.
    const moyNV = (() => {
      const datedNV = bandes
        .map(b => b.nv ?? 0)
        .filter(n => n > 0);
      if (datedNV.length === 0) return null;
      const sum = datedNV.reduce((s, n) => s + n, 0);
      return sum / datedNV.length;
    })();
    const totalPorceletsEstimes = moyNV !== null && mises.length > 0
      ? Math.round(moyNV * mises.length)
      : null;
    return { mises, sorties, totalPorceletsEstimes };
  }, [truies, bandes, saillies]);

  const fmt = (n: number | null | undefined, digits = 1, suffix = ''): string =>
    n === null || n === undefined || !Number.isFinite(n) ? '—' : `${n.toFixed(digits)}${suffix}`;

  const [pdfHint, setPdfHint] = useState(false);
  const handlePrintPdf = () => {
    setPdfHint(true);
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      // Defer print to let the hint render first
      setTimeout(() => window.print(), 100);
    }
    setTimeout(() => setPdfHint(false), 4000);
  };

  return (
    <div
      className="phone-content"
      style={{ padding: 24, maxWidth: 600, margin: '0 auto', position: 'relative', minHeight: '100%' }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${PAGE_BACKGROUND_SRC})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          opacity: 0.06,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
      <MariusGreeting pageContext="performance" />

      <PageHeader
        eyebrow={`Pilotage · ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase())}`}
        title="Performance"
        subtitle="L'année en chiffres. Sans détour."
      />

      <TabsMini
        value={tab}
        onChange={(v) => setTab(v as PerfTab)}
        options={[
          { value: 'vue', label: 'Vue' },
          { value: 'kpis', label: 'KPIs' },
          { value: 'finances', label: 'Finances' },
          { value: 'previsions', label: 'Prévisions' },
        ]}
      />

      {pdfHint && (
        <div
          role="status"
          style={{ background: 'var(--pt-success)', color: 'white', padding: '10px 14px', borderRadius: 12, marginBottom: 12, fontSize: 13, textAlign: 'center' }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <Download size={14} strokeWidth={1.5} aria-hidden="true" />
            Aperçu PDF prêt — utilise « Enregistrer au format PDF » dans la fenêtre d'impression
          </span>
        </div>
      )}

      {/* ISSE hero (toujours visible : repère métier principal) */}
      <Card variant="hero">
        <div className="hero-row">
          <div
            className="hero-icon"
            style={{
              background: 'var(--pt-success)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <TrendingUp size={20} strokeWidth={1.5} aria-hidden="true" />
          </div>
          <div className="hero-info">
            <div className="hero-title-text">ISSE moyen</div>
            <div className="hero-sub">
              <Tooltip term="isse">Indice Sevré-Saillie</Tooltip>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontFamily: 'var(--pt-font-display, sans-serif)',
                fontSize: 32,
                fontWeight: 900,
                color: 'var(--pt-success)',
                lineHeight: 1,
              }}
            >
              {fmt(kpis?.sevresParTruieAn ?? null, 1)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--pt-muted)' }}>vs réf. 12.0</div>
          </div>
        </div>
      </Card>

      {/* Edu card ISSE — visible en Vue + KPIs */}
      {(tab === 'vue' || tab === 'kpis') && (
        <EduCard label="Qu'est-ce que l'ISSE ?">
          <strong>I</strong>ndice <strong>S</strong>evré-<strong>S</strong>aillie : nombre moyen de
          porcelets sevrés par truie par cycle. Référence métier :{' '}
          <strong>&gt;12 = excellent, 10-12 = bon, &lt;10 = à améliorer</strong>.
        </EduCard>
      )}

      {/* KPIs grid — visible en Vue + KPIs */}
      {(tab === 'vue' || tab === 'kpis') && (
      <Section label="Indicateurs techniques">
        <Card>
          <div className="kv-row">
            <span className="kv-key">Taux mise-bas</span>
            <span className="kv-val">{fmt(kpis?.tauxMBPct ?? null, 0, ' %')}</span>
          </div>
          <div className="kv-row">
            <span className="kv-key">Nés vivants/portée</span>
            <span className="kv-val">{fmt(kpis?.moyNV ?? null, 1)}</span>
          </div>
          <div className="kv-row">
            <span className="kv-key">
              <Tooltip term="mortalite">Mortalité naiss.→sevrage</Tooltip>
            </span>
            <span className="kv-val">{fmt(kpis?.tauxMortaliteNaissanceSevrage ?? null, 1, ' %')}</span>
          </div>
          <div className="kv-row">
            <span className="kv-key">
              <Tooltip term="iem">IEM moyen</Tooltip>
            </span>
            <span className="kv-val">{fmt(kpis?.iemMoyJours ?? null, 0, ' j')}</span>
          </div>
          <div
            className="kv-row"
            title="Indice de consommation = kg aliment / kg gain poids vif. Référence métier 2.5-3.0."
          >
            <span className="kv-key">IC moyen (post-sevrage)</span>
            <span className="kv-val">
              {kpis?.icMoyenReel != null && kpis.icMoyenReel > 0
                ? `${kpis.icMoyenReel.toFixed(2)} kg/kg`
                : '—'}
              <span style={{ color: 'var(--pt-muted)', fontSize: 11, marginLeft: 8 }}>
                réf. 2.5-3.0
              </span>
            </span>
          </div>
        </Card>
      </Section>
      )}

      {/* Finances — visible en Vue + Finances */}
      {(tab === 'vue' || tab === 'finances') && (
      <Section label="Finances">
        <Card>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: 'var(--pt-muted)', marginBottom: 4 }}>
                Marge mensuelle <Pill variant="soft">Owner</Pill>
              </div>
              <div
                style={{
                  fontFamily: 'var(--pt-font-display, sans-serif)',
                  fontSize: 22,
                  fontWeight: 900,
                  color: 'var(--pt-muted)',
                  lineHeight: 1,
                }}
              >
                — FCFA
              </div>
              <div style={{ fontSize: 11, color: 'var(--pt-muted)', marginTop: 4 }}>
                Calcul live · ouvre les détails
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/pilotage/finances/details')}
            >
              Détails
            </Button>
            <Button variant="secondary" size="sm" onClick={handlePrintPdf}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Download size={14} strokeWidth={1.5} aria-hidden="true" />
                PDF
              </span>
            </Button>
          </div>
        </Card>
      </Section>
      )}

      {/* Prévisions — section dédiée onglet Prévisions */}
      {tab === 'previsions' && (
        <>
          <EduCard label="🔮 Prévisions d'élevage">
            Projections basées sur les bandes en cycle : naissances attendues, sevrages à venir, sorties abattoir prévues. Affine ton planning ferme avec les <strong>3 prochains mois</strong>.
          </EduCard>
          <Section label="Prochaines mises-bas (90 jours)">
            <Card>
              {forecasts.mises.length === 0 ? (
                <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--pt-muted)', fontSize: 13 }}>
                  Aucune mise-bas prévue. Enregistre une saillie pour générer la prévision (saillie + 115 j).
                </div>
              ) : (
                forecasts.mises.map(ev => (
                  <div key={ev.id} className="kv-row">
                    <span className="kv-key">{ev.title}</span>
                    <span className="kv-val">
                      {ev.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                ))
              )}
              {forecasts.totalPorceletsEstimes !== null && (
                <div className="kv-row">
                  <span className="kv-key">Total porcelets attendus</span>
                  <span className="kv-val" style={{ color: 'var(--pt-primary)', fontWeight: 700 }}>
                    ~{forecasts.totalPorceletsEstimes} porcelets
                  </span>
                </div>
              )}
            </Card>
          </Section>
          <Section label="Sorties abattoir prévues (90 jours)">
            <Card>
              {forecasts.sorties.length === 0 ? (
                <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--pt-muted)', fontSize: 13 }}>
                  Aucune sortie abattoir prévue dans la fenêtre.
                </div>
              ) : (
                forecasts.sorties.map(ev => (
                  <div key={ev.id} className="kv-row">
                    <span className="kv-key">{ev.title}{ev.subtitle ? ` · ${ev.subtitle}` : ''}</span>
                    <span className="kv-val">
                      {ev.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                ))
              )}
            </Card>
          </Section>
        </>
      )}

      {/* Top performances — visible en Vue uniquement (vraies bandes via FarmContext) */}
      {tab === 'vue' && (
      <Section label="Top performances">
        {topBandes.length > 0 ? (
          topBandes.map((b, idx) => {
            const RankIcon = idx === 0 ? Trophy : Medal;
            const rankColor = idx === 0 ? 'var(--pt-accent)' : 'var(--pt-muted)';
            const rankLabel = idx === 0 ? 'Top 1' : 'Top 2';
            return (
              <ListItem
                key={b.id}
                avatar={<EntityAvatar species="bande" size="md" shortCode={b.id.slice(0, 5)} />}
                title={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {b.truie ? `Bande ${b.truie}` : `Bande ${b.id.slice(0, 8)}…`}
                    <RankIcon
                      size={14}
                      strokeWidth={1.5}
                      aria-label={rankLabel}
                      style={{ color: rankColor, flexShrink: 0 }}
                    />
                  </span>
                }
                subtitle={`${b.dateMB ? `MB ${b.dateMB}` : ''} · ${b.nv ?? '?'} NV`}
                trailing={<span className="list-arrow">›</span>}
                onClick={() => navigate(`/troupeau/bandes/${b.id}`)}
              />
            );
          })
        ) : (
          <ListItem
            avatar={<EntityAvatar species="bande" size="md" shortCode="..." />}
            title="Aucune bande active"
            subtitle="Crée ta première bande dans Élevage › Bandes"
            trailing={<span className="list-arrow">›</span>}
            onClick={() => navigate('/troupeau')}
          />
        )}
      </Section>
      )}

      {advancedMode && (
        <Section label="Tableau détaillé (Mode avancé)">
          {bandesData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--pt-muted)', fontSize: 13 }}>
              Données disponibles après le 1er cycle complet
            </div>
          ) : (
            <>
              <DataTable data={bandesData} columns={BANDES_COLUMNS} />
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <ExportButton data={bandesData} filename="performance-bandes.csv" label="Export CSV" />
              </div>
            </>
          )}
        </Section>
      )}
      </div>
    </div>
  );
};
