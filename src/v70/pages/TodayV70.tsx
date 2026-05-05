/**
 * V70 — Page /today (archétype Dashboard)
 *
 * Réplique pixel-perfect mockup `docs/v70/v70-mockup.html` lignes 994-1080.
 *
 * 4 sections (décision V44/V70 — limite stricte) :
 *  1. Hero "Mise-bas imminente" (Card hero + Button primary)
 *  2. À traiter (3 alertes warning/info/danger + Pills cliquables)
 *  3. Mon élevage (StatsGrid 4 cols : truies/verrats/porcelets/bandes)
 *  4. Tournée du jour (CTA Démarrer la tournée)
 *
 * V70.1 — Câblage complet onClick (Option B).
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ds/PageHeader';
import { Section } from '../components/ds/Section';
import { Card } from '../components/ds/Card';
import { Button } from '../components/ds/Button';
import { Pill } from '../components/ds/Pill';
import { StatsGrid, Stat } from '../components/ds/StatsGrid';

interface AlertItem {
  id: string;
  variant: 'warning' | 'info' | 'danger';
  pillVariant: 'warning' | 'info' | 'danger';
  pillLabel: string;
  title: string;
  meta: string;
  to: string;
}

const ALERTS_INITIAL: AlertItem[] = [
  {
    id: 'reforme-T-001',
    variant: 'warning',
    pillVariant: 'warning',
    pillLabel: 'Action',
    title: 'Réforme suggérée — T-001',
    meta: 'Aucune saillie depuis 90 jours',
    to: '/troupeau/truies/T-001',
  },
  {
    id: 'sevrage-bande-mai',
    variant: 'info',
    pillVariant: 'info',
    pillLabel: 'Auto',
    title: 'Sevrage à confirmer',
    meta: 'Bande de mai · J+143',
    to: '/reproduction?phase=maternite',
  },
  {
    id: 'stock-aliment',
    variant: 'danger',
    pillVariant: 'danger',
    pillLabel: 'Urgent',
    title: 'Stock aliment critique',
    meta: 'Truie gestante · 2 jours restants',
    to: '/ressources/aliments',
  },
];

export const TodayV70: React.FC = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<AlertItem[]>(ALERTS_INITIAL);

  const userName = 'Christophe';
  const dateLabel = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });

  const dismissAlert = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="phone-content" style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <PageHeader
        eyebrow={dateLabel}
        title="Aujourd'hui"
        subtitle={`Bonjour ${userName} — ${alerts.length} priorités`}
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
        <Button
          variant="primary"
          size="full"
          onClick={() => navigate('/troupeau/truies/T-018')}
        >
          → Voir T-018
        </Button>
      </Card>

      {/* Section 2 : À TRAITER (alertes cliquables + dismiss inline) */}
      <Section label={`À traiter (${alerts.length})`}>
        <Card>
          {alerts.length === 0 && (
            <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--pt-muted)', fontSize: 13 }}>
              ✓ Toutes les alertes sont traitées
            </div>
          )}
          {alerts.map((alert) => {
            // V71 FIX #7 : wrapper en div role="button" (et non <button>) pour
            // permettre le bouton "Acquitter" interne sans nesting illégal HTML5.
            const handleActivate = () => navigate(alert.to);
            return (
              <div
                key={alert.id}
                role="button"
                tabIndex={0}
                onClick={handleActivate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleActivate();
                  }
                }}
                className="alert-row"
                style={{
                  width: '100%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
                aria-label={`${alert.title} — ouvrir le détail`}
              >
                <div className={`alert-dot ${alert.variant}`}></div>
                <div className="alert-info" style={{ flex: 1 }}>
                  <div className="alert-title">{alert.title}</div>
                  <div className="alert-meta">{alert.meta}</div>
                </div>
                <Pill variant={alert.pillVariant}>{alert.pillLabel}</Pill>
                <button
                  type="button"
                  onClick={(e) => dismissAlert(alert.id, e)}
                  aria-label={`Acquitter ${alert.title}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    fontSize: 16,
                    color: 'var(--pt-muted)',
                    marginLeft: 4,
                  }}
                >
                  ✓
                </button>
              </div>
            );
          })}
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
          <Button
            variant="primary"
            size="full"
            onClick={() => navigate('/controle')}
          >
            ▶ Démarrer la tournée
          </Button>
        </Card>
      </Section>
    </div>
  );
};
