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
import { MariusGreeting } from '../../features/chatbot/MariusGreeting';

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
    <div className="phone-content" style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <MariusGreeting pageContext="performance" />

      <PageHeader
        eyebrow="Pilotage · Mai 2026"
        title="Performance"
        subtitle="Comment se porte ton élevage"
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
          📥 Aperçu PDF prêt — utilise « Enregistrer au format PDF » dans la fenêtre d'impression
        </div>
      )}

      {/* ISSE hero (toujours visible : repère métier principal) */}
      <Card variant="hero">
        <div className="hero-row">
          <div className="hero-icon" style={{ background: 'var(--pt-success)' }}>📈</div>
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
        <EduCard label="💡 Qu'est-ce que l'ISSE ?">
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
                Voir « Détails » pour le calcul live
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
              📥 PDF
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
          <Section label="Prochaines mises-bas (28 jours)">
            <Card>
              <div className="kv-row">
                <span className="kv-key">Bande de mai · 11 truies</span>
                <span className="kv-val">28 août 2026</span>
              </div>
              <div className="kv-row">
                <span className="kv-key">Bande d'avril · 9 truies</span>
                <span className="kv-val">5 sept. 2026</span>
              </div>
              <div className="kv-row">
                <span className="kv-key">Total porcelets attendus</span>
                <span className="kv-val" style={{ color: 'var(--pt-primary)', fontWeight: 700 }}>~260 porcelets</span>
              </div>
            </Card>
          </Section>
          <Section label="Sorties abattoir prévues">
            <Card>
              <div className="kv-row">
                <span className="kv-key">Bande de décembre · 95 cochons</span>
                <span className="kv-val">12 mai 2026</span>
              </div>
              <div className="kv-row">
                <span className="kv-key">Bande de janvier · 88 cochons</span>
                <span className="kv-val">8 juin 2026</span>
              </div>
            </Card>
          </Section>
        </>
      )}

      {/* Top performances — visible en Vue uniquement (vraies bandes via FarmContext) */}
      {tab === 'vue' && (
      <Section label="Top performances">
        {topBandes.length > 0 ? (
          topBandes.map((b, idx) => (
            <ListItem
              key={b.id}
              avatar={<EntityAvatar species="bande" size="md" shortCode={b.id.slice(0, 5)} />}
              title={`${b.truie ? `Bande ${b.truie}` : `Bande ${b.id.slice(0, 8)}…`} ${idx === 0 ? '🏆' : '🥈'}`}
              subtitle={`${b.dateMB ? `MB ${b.dateMB}` : ''} · ${b.nv ?? '?'} NV`}
              trailing={<span className="list-arrow">›</span>}
              onClick={() => navigate(`/troupeau/bandes/${b.id}`)}
            />
          ))
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
  );
};
