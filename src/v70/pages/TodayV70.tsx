/**
 * V70 — Page /today (archétype Dashboard)
 *
 * Réplique pixel-perfect mockup `docs/v70/v70-mockup.html` lignes 994-1080.
 *
 * 4 sections (décision V44/V70 — limite stricte) :
 *  1. Hero "Mise-bas imminente" (Card hero + Button primary)
 *  2. À traiter (3 alertes warning/info/danger + Pills)
 *  3. Mon élevage (StatsGrid 4 cols : truies/verrats/porcelets/bandes)
 *  4. Tournée du jour (CTA Démarrer la tournée)
 *
 * Stubs data Phase 3 — Phase F validator branchera FarmContext.
 */
import React from 'react';
import { PageHeader } from '../components/ds/PageHeader';
import { Section } from '../components/ds/Section';
import { Card } from '../components/ds/Card';
import { Button } from '../components/ds/Button';
import { Pill } from '../components/ds/Pill';
import { StatsGrid, Stat } from '../components/ds/StatsGrid';

export const TodayV70: React.FC = () => {
  const userName = 'Christophe';
  const dateLabel = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });
  const priorityCount = 3;

  return (
    <div className="phone-content" style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <PageHeader
        eyebrow={dateLabel}
        title="Aujourd'hui"
        subtitle={`Bonjour ${userName} — ${priorityCount} priorités`}
      />

      {/* Section 1 : TÂCHE PRIORITAIRE (Hero) */}
      <Card variant="hero">
        <div className="hero-row">
          <div className="hero-icon">🐖</div>
          <div className="hero-info">
            <div className="hero-title-text">Mise-bas imminente</div>
            <div className="hero-sub">T-018 · prévue demain</div>
          </div>
        </div>
        <Button variant="primary" size="full">→ Voir T-018</Button>
      </Card>

      {/* Section 2 : À TRAITER (alertes) */}
      <Section label="À traiter (3)">
        <Card>
          <div className="alert-row">
            <div className="alert-dot warning"></div>
            <div className="alert-info">
              <div className="alert-title">Réforme suggérée — T-001</div>
              <div className="alert-meta">Aucune saillie depuis 90 jours</div>
            </div>
            <Pill variant="warning">Action</Pill>
          </div>
          <div className="alert-row">
            <div className="alert-dot info"></div>
            <div className="alert-info">
              <div className="alert-title">Sevrage à confirmer</div>
              <div className="alert-meta">Bande de mai · J+143</div>
            </div>
            <Pill variant="info">Auto</Pill>
          </div>
          <div className="alert-row">
            <div className="alert-dot danger"></div>
            <div className="alert-info">
              <div className="alert-title">Stock aliment critique</div>
              <div className="alert-meta">Truie gestante · 2 jours restants</div>
            </div>
            <Pill variant="danger">Urgent</Pill>
          </div>
        </Card>
      </Section>

      {/* Section 3 : MON ÉLEVAGE (KPIs résumés) */}
      <Section label="Mon élevage">
        <StatsGrid cols={4}>
          <Stat value={50} label="Truies" />
          <Stat value={3} label="Verrats" />
          <Stat value={92} label="Porcelets" />
          <Stat value={6} label="Bandes" />
        </StatsGrid>
      </Section>

      {/* Section 4 : TOURNÉE DU JOUR */}
      <Section label="Tournée du jour">
        <Card>
          <div style={{ textAlign: 'center', padding: '8px 0 14px' }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>📋</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Tournée terrain</div>
            <div style={{ fontSize: 11, color: 'var(--pt-muted)' }}>
              12 points de contrôle aujourd'hui
            </div>
          </div>
          <Button variant="primary" size="full">▶ Démarrer la tournée</Button>
        </Card>
      </Section>
    </div>
  );
};
