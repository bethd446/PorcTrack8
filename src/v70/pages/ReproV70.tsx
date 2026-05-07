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
import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFarm } from '../../context/FarmContext';
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


const VALID_TABS: ReproTab[] = ['agenda', 'en-cours', 'a-venir', 'historique'];


const isReproTab = (v: string | null): v is ReproTab =>
  v !== null && (VALID_TABS as string[]).includes(v);

export const ReproV70: React.FC = () => {
  const navigate = useNavigate();
  const { truies, bandes, saillies } = useFarm();

  // V71.1 — KPIs live (étaient hardcodés 28/11/6/3)
  const kpis = useMemo(() => {
    const pleines = truies.filter(t => /pleine|gestante|gestation/i.test(t.statut ?? '')).length;
    const materni = truies.filter(t => /maternit[eé]|allaitante|allaitement/i.test(t.statut ?? '')).length;
    const vides = truies.filter(t => /attente saillie|vide|sevr[eé]e/i.test(t.statut ?? '')).length;
    // MB prévues dans les 7 prochains jours : bandes avec dateMB dans la fenêtre
    const now = new Date();
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const mbProches = bandes.filter(b => {
      if (!b.dateMB) return false;
      const d = new Date(b.dateMB);
      return !isNaN(d.getTime()) && d >= now && d <= in7days;
    }).length;
    return { pleines, materni, vides, mbProches };
  }, [truies, bandes]);

  const upcomingItems = useMemo((): UpcomingItem[] => {
    if (!bandes.length && !saillies.length) return [];
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const items: UpcomingItem[] = [];
    bandes.forEach(b => {
      if (!b.dateMB) return;
      const d = new Date(b.dateMB);
      if (isNaN(d.getTime()) || d < now || d > in7) return;
      const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86400000);
      items.push({
        badge: diffDays <= 0 ? 'AUJ' : diffDays === 1 ? 'DEM' : `+${diffDays}J`,
        badgeBg: 'var(--pt-accent)',
        title: `Mise-bas${b.truie ? ` ${b.truie}` : ''}`,
        meta: `${b.idPortee || b.id} · J115`,
        to: b.truie ? `/troupeau/truies/${b.truie}` : `/troupeau/bandes/${b.id}`,
      });
    });
    bandes.filter(b => b.statut === 'Sous mère' && b.dateSevragePrevue).forEach(b => {
      const d = new Date(b.dateSevragePrevue!);
      if (isNaN(d.getTime()) || d < now || d > in7) return;
      const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86400000);
      items.push({
        badge: `+${Math.max(0, diffDays)}J`,
        badgeBg: 'var(--pt-primary)',
        title: `Sevrage ${b.idPortee || b.id}`,
        meta: `${b.vivants ?? '?'} porcelets · J+28`,
        to: '/reproduction?phase=maternite',
      });
    });
    saillies.slice(0, 5).forEach(s => {
      if (!s.dateSaillie) return;
      const ds = new Date(s.dateSaillie);
      if (isNaN(ds.getTime())) return;
      const echoDate = new Date(ds.getTime() + 28 * 86400000);
      if (echoDate < now || echoDate > in7) return;
      const diffDays = Math.ceil((echoDate.getTime() - now.getTime()) / 86400000);
      items.push({
        badge: `+${Math.max(0, diffDays)}J`,
        badgeBg: 'var(--pt-info)',
        title: 'Échographie planifiée',
        meta: 'Vérification gestation J+28',
        to: '/reproduction?phase=saillie',
      });
    });
    return items.slice(0, 4);
  }, [bandes, saillies]);

  // V71 FIX #4 — initial tab depuis URL (?tab=...) pour deep-links legacy
  // (/cycles/maternite → /reproduction?tab=en-cours&phase=maternite, etc.).
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab: ReproTab = isReproTab(searchParams.get('tab'))
    ? (searchParams.get('tab') as ReproTab)
    : 'agenda';
  const [tab, setTab] = useState<ReproTab>(initialTab);

  // Sync state ← URL : nécessaire pour deep-links directs (QR code, copier-coller)
  // et navigation programmatique (Navigate replace, history.pushState).
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (isReproTab(urlTab) && urlTab !== tab) {
      setTab(urlTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTabChange = (v: string) => {
    setTab(v as ReproTab);
    // Synchronise l'URL pour permettre partage / bookmark.
    const next = new URLSearchParams(searchParams);
    next.set('tab', v);
    setSearchParams(next, { replace: true });
  };

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
        onChange={handleTabChange}
        options={[
          { value: 'agenda', label: 'Agenda' },
          { value: 'en-cours', label: 'En cours' },
          { value: 'a-venir', label: 'À venir' },
          { value: 'historique', label: 'Historique' },
        ]}
      />

      <StatsGrid cols={4}>
        <Stat value={kpis.pleines} label="Pleines" />
        <Stat value={kpis.materni} label="Materni." />
        <Stat value={kpis.vides} label="Vides" />
        <Stat value={kpis.mbProches} label="MB 7j" />
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
              {upcomingItems.length === 0 ? (
                <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--pt-muted)', fontSize: 13 }}>
                  Aucun événement dans les 7 prochains jours
                </div>
              ) : upcomingItems.map((item) => (
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
            {upcomingItems.length === 0 ? (
              <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--pt-muted)', fontSize: 13 }}>
                Aucun événement dans les 7 prochains jours
              </div>
            ) : upcomingItems.map((item) => (
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
