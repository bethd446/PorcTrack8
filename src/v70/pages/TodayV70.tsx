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
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFarm } from '../../context/FarmContext';
import { useAuth } from '../../context/AuthContext';
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

export const TodayV70: React.FC = () => {
  const navigate = useNavigate();
  const { truies, verrats, bandes } = useFarm();
  const { profile } = useAuth();

  // V71.2 — alertes calculées depuis FarmContext (plus de mocks statiques)
  const computedAlerts = useMemo((): AlertItem[] => {
    const result: AlertItem[] = [];
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // MB prévues dans les 7 prochains jours
    bandes.forEach(b => {
      if (!b.dateMB) return;
      const d = new Date(b.dateMB);
      if (isNaN(d.getTime()) || d < now || d > in7) return;
      const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86400000);
      result.push({
        id: `mb-${b.id}`,
        variant: diffDays <= 1 ? 'danger' : 'warning',
        pillVariant: diffDays <= 1 ? 'danger' : 'warning',
        pillLabel: diffDays <= 0 ? 'Urgent' : `J-${diffDays}`,
        title: `Mise-bas${b.truie ? ` — ${b.truie}` : ''}`,
        meta: `${b.idPortee || b.id} · dans ${diffDays <= 0 ? "aujourd'hui" : `${diffDays}j`}`,
        to: b.truie ? `/troupeau/truies/${b.truie}` : `/troupeau/bandes/${b.id}`,
      });
    });

    // Truies à réformer
    truies.filter(t => /réforme|reforme/i.test(t.statut ?? '')).forEach(t => {
      result.push({
        id: `reforme-${t.id}`,
        variant: 'warning',
        pillVariant: 'warning',
        pillLabel: 'Action',
        title: `Réforme suggérée — ${t.displayId}`,
        meta: 'Productivité insuffisante · voir fiche',
        to: `/troupeau/truies/${t.id}`,
      });
    });

    return result.slice(0, 5);
  }, [truies, bandes]);

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const alerts = useMemo(
    () => computedAlerts.filter(a => !dismissed.has(a.id)),
    [computedAlerts, dismissed],
  );

  // MB imminente dans 3j → hero card
  const heroMiseBas = useMemo(() => {
    const now = new Date();
    const in3 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return bandes.find(b => {
      if (!b.dateMB) return false;
      const d = new Date(b.dateMB);
      return !isNaN(d.getTime()) && d >= now && d <= in3;
    }) ?? null;
  }, [bandes]);

  // V71.1 — données live FarmContext (était hardcodé 50/3/92/6)
  const stats = useMemo(() => {
    const porceletsVivants = bandes.reduce((acc, b) => acc + (b.vivants ?? 0), 0);
    return {
      truies: truies.length,
      verrats: verrats.length,
      porcelets: porceletsVivants,
      bandes: bandes.length,
    };
  }, [truies, verrats, bandes]);

  const userName = profile?.full_name?.split(' ')[0] || 'éleveur';
  const dateLabel = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });

  const dismissAlert = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(prev => new Set([...prev, id]));
  };

  return (
    <div className="phone-content" style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 12px',
          marginBottom: 16,
          borderRadius: 999,
          background: 'rgba(6, 78, 59, 0.05)',
          border: '1px solid rgba(6, 78, 59, 0.12)',
        }}
      >
        <img
          src="/images/marius-avatar.webp"
          alt="Marius"
          width={40}
          height={40}
          style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        />
        <div style={{ minWidth: 0 }}>
          <div className="ft-heading" style={{ fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--pt-primary, #064e3b)', fontWeight: 700 }}>
            Marius
          </div>
          <div style={{ fontSize: 12, color: 'var(--pt-muted, #6b7280)' }}>
            vous écoute · poser une question
          </div>
        </div>
      </div>

      <PageHeader
        eyebrow={dateLabel}
        title="Aujourd'hui"
        subtitle={`Bonjour ${userName} — ${alerts.length} priorités`}
      />

      {/* Section 1 : TÂCHE PRIORITAIRE (Hero) — affiché uniquement si MB imminente réelle */}
      {heroMiseBas && (
        <Card variant="hero">
          <div className="hero-row">
            <div className="hero-icon">🐖</div>
            <div className="hero-info">
              <div className="hero-title-text">Mise-bas imminente</div>
              <div className="hero-sub">
                {heroMiseBas.truie ?? heroMiseBas.idPortee} · prévue{' '}
                {(() => {
                  const d = new Date(heroMiseBas.dateMB!);
                  const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
                  return diff <= 0 ? "aujourd'hui" : diff === 1 ? 'demain' : `dans ${diff}j`;
                })()}
              </div>
            </div>
          </div>
          <Button
            variant="primary"
            size="full"
            onClick={() => navigate(
              heroMiseBas.truie
                ? `/troupeau/truies/${heroMiseBas.truie}`
                : `/troupeau/bandes/${heroMiseBas.id}`,
            )}
          >
            → Voir {heroMiseBas.truie ?? heroMiseBas.idPortee}
          </Button>
        </Card>
      )}

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
          <Stat value={stats.truies} label="Truies" />
          <Stat value={stats.verrats} label="Verrats" />
          <Stat value={stats.porcelets} label="Porcelets" />
          <Stat value={stats.bandes} label="Bandes" />
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
