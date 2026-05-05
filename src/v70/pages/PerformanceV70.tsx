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
import React, { useState } from 'react';
import { PageHeader } from '../components/ds/PageHeader';
import { Section } from '../components/ds/Section';
import { Card } from '../components/ds/Card';
import { Button } from '../components/ds/Button';
import { Pill } from '../components/ds/Pill';
import { TabsMini } from '../components/ds/TabsMini';
import { ListItem } from '../components/ds/ListItem';
import { Tooltip } from '../components/v70/Tooltip';
import { EduCard } from '../components/v70/EduCard';
import { EntityAvatar } from '../../components/ds/EntityAvatar';

type PerfTab = 'vue' | 'kpis' | 'finances' | 'previsions';

export const PerformanceV70: React.FC = () => {
  const [tab, setTab] = useState<PerfTab>('vue');

  return (
    <div className="phone-content" style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
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

      {/* ISSE hero */}
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
              11.8
            </div>
            <div style={{ fontSize: 10, color: 'var(--pt-muted)' }}>vs réf. 12.0</div>
          </div>
        </div>
      </Card>

      {/* Edu card ISSE */}
      <EduCard label="💡 Qu'est-ce que l'ISSE ?">
        <strong>I</strong>ndice <strong>S</strong>evré-<strong>S</strong>aillie : nombre moyen de
        porcelets sevrés par truie par cycle. Référence métier :{' '}
        <strong>&gt;12 = excellent, 10-12 = bon, &lt;10 = à améliorer</strong>.
      </EduCard>

      {/* KPIs grid */}
      <Section label="Indicateurs techniques">
        <Card>
          <div className="kv-row">
            <span className="kv-key">Taux mise-bas</span>
            <span className="kv-val">
              86 % <span style={{ color: 'var(--pt-success)', fontSize: 10 }}>↗ +2%</span>
            </span>
          </div>
          <div className="kv-row">
            <span className="kv-key">Nés vivants/portée</span>
            <span className="kv-val">13.2</span>
          </div>
          <div className="kv-row">
            <span className="kv-key">
              Mortalité allaitement <Tooltip term="mortalite" />
            </span>
            <span className="kv-val">
              8.4 % <span style={{ color: 'var(--pt-success)', fontSize: 10 }}>↘ -1%</span>
            </span>
          </div>
          <div className="kv-row">
            <span className="kv-key">
              IEM moyen <Tooltip term="iem" />
            </span>
            <span className="kv-val">5.1 j</span>
          </div>
        </Card>
      </Section>

      {/* Finances (limité par rôle — V70 visuel only, RLS différé V71) */}
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
                  fontSize: 28,
                  fontWeight: 900,
                  color: 'var(--pt-primary)',
                  lineHeight: 1,
                }}
              >
                + 1 240 €
              </div>
            </div>
            <Pill variant="success">+12% vs avril</Pill>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm">
              Détails
            </Button>
            <Button variant="secondary" size="sm">
              📥 PDF
            </Button>
          </div>
        </Card>
      </Section>

      {/* Top performances */}
      <Section label="Top performances">
        <ListItem
          avatar={<EntityAvatar species="bande" size="md" shortCode="B-MAR" />}
          title="Bande de mars 🏆"
          subtitle="ISSE 12.4 · marge +890€"
          trailing={<span className="list-arrow">›</span>}
        />
        <ListItem
          avatar={<EntityAvatar species="bande" size="md" shortCode="B-FEV" />}
          title="Bande de février 🥈"
          subtitle="ISSE 11.9 · marge +650€"
          trailing={<span className="list-arrow">›</span>}
        />
      </Section>
    </div>
  );
};
