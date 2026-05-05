/**
 * V70 — ReproV70 (page /reproduction, archétype Hub)
 *
 * Référence pixel-perfect : docs/v70/v70-mockup.html lignes 1178-1293
 *
 * Phase 3C : page Hub Reproduction — TabsMini 4 sub-tabs (Agenda/En cours/
 * À venir/Historique), KPIs Repro, EduCard 115j gestation, CycleTimeline V2
 * (V45 ré-export) avec 4 étapes Saillie→Écho→Gestation→MB, agenda 7 jours,
 * empty state éducatif vers encyclopédie. FAB ajout saillie.
 *
 * Décision : CycleTimeline API V45 ({label, day, done?, target?}), pas la
 * forme {label, date, status} du brief — adapté au composant existant.
 */
import React, { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ds/PageHeader';
import { Section } from '../components/ds/Section';
import { Card } from '../components/ds/Card';
import { TabsMini } from '../components/ds/TabsMini';
import { StatsGrid, Stat } from '../components/ds/StatsGrid';
import { CycleTimeline } from '../components/ds/CycleTimeline';
import { EduCard } from '../components/v70/EduCard';
import { EmptyEdu } from '../components/v70/EmptyEdu';

const QuickSaillieForm = lazy(() => import('../../components/forms/QuickSaillieForm'));

type ReproTab = 'agenda' | 'en-cours' | 'a-venir' | 'historique';

interface UpcomingItem {
  badge: string;
  badgeBg: string;
  title: string;
  meta: string;
  to: string;
}

const UPCOMING: UpcomingItem[] = [
  {
    badge: 'DEM',
    badgeBg: 'var(--pt-accent)',
    title: 'Mise-bas T-018',
    meta: 'Bande de février · J115',
    to: '/troupeau/truies/T-018',
  },
  {
    badge: '+2J',
    badgeBg: 'var(--pt-primary)',
    title: 'Sevrage bande mars',
    meta: '11 truies · J+143',
    to: '/reproduction?phase=maternite',
  },
  {
    badge: '+5J',
    badgeBg: 'var(--pt-info)',
    title: 'Échographie planifiée',
    meta: '7 truies saillies J+28',
    to: '/reproduction?phase=saillie',
  },
];

export const ReproV70: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ReproTab>('agenda');
  const [saillieOpen, setSaillieOpen] = useState(false);

  return (
    <div className="phone-content" style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <PageHeader
        eyebrow="Cycle vivant"
        title="Reproduction"
        subtitle="Le cycle complet, en un seul écran"
      />

      <TabsMini
        value={tab}
        onChange={(v) => setTab(v as ReproTab)}
        options={[
          { value: 'agenda', label: 'Agenda' },
          { value: 'en-cours', label: 'En cours' },
          { value: 'a-venir', label: 'À venir' },
          { value: 'historique', label: 'Historique' },
        ]}
      />

      <StatsGrid cols={4}>
        <Stat value={28} label="Pleines" />
        <Stat value={11} label="Materni." />
        <Stat value={6} label="Vides" />
        <Stat value={3} label="MB 7j" />
      </StatsGrid>

      {tab === 'agenda' && (
        <>
          <EduCard label="💡 Le saviez-vous ?">
            Le cycle de gestation d'une truie dure <strong>115 jours</strong>. L'échographie à <strong>J28</strong> permet de confirmer la gestation et planifier la mise-bas.
          </EduCard>

          <Section label="Cycle bande mai 2026">
            <Card>
              <CycleTimeline
                currentDay={42}
                totalDays={115}
                steps={[
                  { label: 'Saillie', day: 0, done: true },
                  { label: 'Écho', day: 28, done: true },
                  { label: 'Gestation', day: 42, done: false },
                  { label: 'Mise-bas', day: 115, done: false, target: true },
                ]}
              />
            </Card>
          </Section>

          <Section label="7 prochains jours">
            <Card>
              {UPCOMING.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => navigate(item.to)}
                  className="alert-row"
                  style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                  aria-label={`${item.title} — voir détail`}
                >
                  <div style={{ background: item.badgeBg, color: 'white', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, minWidth: 36, textAlign: 'center' }}>
                    {item.badge}
                  </div>
                  <div className="alert-info" style={{ flex: 1 }}>
                    <div className="alert-title">{item.title}</div>
                    <div className="alert-meta">{item.meta}</div>
                  </div>
                  <span className="list-arrow">›</span>
                </button>
              ))}
            </Card>
          </Section>
        </>
      )}

      {tab === 'en-cours' && (
        <Section label="Bandes en cycle reproduction">
          <Card>
            <CycleTimeline
              currentDay={42}
              totalDays={115}
              steps={[
                { label: 'Saillie', day: 0, done: true },
                { label: 'Écho', day: 28, done: true },
                { label: 'Gestation', day: 42, done: false },
                { label: 'Mise-bas', day: 115, done: false, target: true },
              ]}
            />
            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--pt-muted)' }}>
              Bande mai 2026 · 11 truies pleines · J42/115
            </div>
          </Card>
          <button
            type="button"
            onClick={() => navigate('/troupeau/bandes/B-MAI')}
            className="list-item"
            style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
          >
            <div className="list-info">
              <div className="list-title">Bande de mai · J42</div>
              <div className="list-sub">Gestation · 11 truies · MB le 28 août</div>
            </div>
            <span className="list-arrow">›</span>
          </button>
        </Section>
      )}

      {tab === 'a-venir' && (
        <Section label="Événements à venir (7 jours)">
          <Card>
            {UPCOMING.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => navigate(item.to)}
                className="alert-row"
                style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                aria-label={`${item.title} — voir détail`}
              >
                <div style={{ background: item.badgeBg, color: 'white', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, minWidth: 36, textAlign: 'center' }}>
                  {item.badge}
                </div>
                <div className="alert-info" style={{ flex: 1 }}>
                  <div className="alert-title">{item.title}</div>
                  <div className="alert-meta">{item.meta}</div>
                </div>
                <span className="list-arrow">›</span>
              </button>
            ))}
          </Card>
        </Section>
      )}

      {tab === 'historique' && (
        <Section label="Bandes passées">
          <Card>
            <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--pt-muted)', fontSize: 13 }}>
              📦 Historique des bandes terminées
              <div style={{ marginTop: 8, fontSize: 11 }}>
                Voir toutes les bandes (actives + historique) sur l'onglet
                <button
                  type="button"
                  onClick={() => navigate('/troupeau?view=bandes')}
                  style={{ marginLeft: 4, background: 'none', border: 'none', color: 'var(--pt-primary)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                >
                  Élevage › Bandes
                </button>
              </div>
            </div>
          </Card>
        </Section>
      )}

      <EmptyEdu
        icon="📚"
        title="Comprendre les cycles"
        description="Apprends comment optimiser tes saillies et ton ISSE avec nos articles de l'encyclopédie."
        ctaLabel="Encyclopédie"
        onCtaClick={() => navigate('/reglages/encyclopedie')}
      />

      <button
        type="button"
        className="fab"
        aria-label="Ajouter saillie"
        onClick={() => setSaillieOpen(true)}
        style={{
          background: 'var(--pt-primary)',
          border: 'none',
          color: 'white',
          fontSize: 28,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        +
      </button>

      <Suspense fallback={null}>
        <QuickSaillieForm isOpen={saillieOpen} onClose={() => setSaillieOpen(false)} />
      </Suspense>
    </div>
  );
};
