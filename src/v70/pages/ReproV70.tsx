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
import React, { useState } from 'react';
import { PageHeader } from '../components/ds/PageHeader';
import { Section } from '../components/ds/Section';
import { Card } from '../components/ds/Card';
import { TabsMini } from '../components/ds/TabsMini';
import { StatsGrid, Stat } from '../components/ds/StatsGrid';
import { CycleTimeline } from '../components/ds/CycleTimeline';
import { EduCard } from '../components/v70/EduCard';
import { EmptyEdu } from '../components/v70/EmptyEdu';

type ReproTab = 'agenda' | 'en-cours' | 'a-venir' | 'historique';

export const ReproV70: React.FC = () => {
  const [tab, setTab] = useState<ReproTab>('agenda');

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
          <div className="alert-row">
            <div style={{ background: 'var(--pt-accent)', color: 'white', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, minWidth: 36, textAlign: 'center' }}>
              DEM
            </div>
            <div className="alert-info">
              <div className="alert-title">Mise-bas T-018</div>
              <div className="alert-meta">Bande de février · J115</div>
            </div>
            <span className="list-arrow">›</span>
          </div>
          <div className="alert-row">
            <div style={{ background: 'var(--pt-primary)', color: 'white', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, minWidth: 36, textAlign: 'center' }}>
              +2J
            </div>
            <div className="alert-info">
              <div className="alert-title">Sevrage bande mars</div>
              <div className="alert-meta">11 truies · J+143</div>
            </div>
            <span className="list-arrow">›</span>
          </div>
          <div className="alert-row">
            <div style={{ background: 'var(--pt-info)', color: 'white', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, minWidth: 36, textAlign: 'center' }}>
              +5J
            </div>
            <div className="alert-info">
              <div className="alert-title">Échographie planifiée</div>
              <div className="alert-meta">7 truies saillies J+28</div>
            </div>
            <span className="list-arrow">›</span>
          </div>
        </Card>
      </Section>

      <EmptyEdu
        icon="📚"
        title="Comprendre les cycles"
        description="Apprends comment optimiser tes saillies et ton ISSE avec nos articles de l'encyclopédie."
        ctaLabel="Encyclopédie"
        onCtaClick={() => { /* TODO Phase 6 navigate /reglages/encyclopedie */ }}
      />

      <div className="fab" role="button" aria-label="Ajouter saillie" tabIndex={0}>+</div>
    </div>
  );
};
