/**
 * V70 — Page Réglages (route /reglages)
 *
 * Phase 3E : profil + ToggleAdvancedMode + sections configuration + Apprendre.
 * Référence pixel-perfect : docs/v70/v70-mockup.html lignes 1399-1490.
 *
 * Sous-routes (montées dans V70Routes) :
 * - /reglages/encyclopedie → EncyclopediaPage
 * - /reglages/onboarding → OnboardingEduPage
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ds/PageHeader';
import { Section } from '../components/ds/Section';
import { Card } from '../components/ds/Card';
import { ListItem } from '../components/ds/ListItem';
import { ToggleAdvancedMode } from '../components/v70/ToggleAdvancedMode';

export const ReglagesV70: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="phone-content" style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <PageHeader
        eyebrow="Configuration"
        title="Réglages"
        subtitle="Profil, ferme, équipe, ressources"
      />

      <Card variant="hero">
        <div className="hero-row">
          <div
            className="avatar avatar-lg"
            style={{
              background: 'var(--pt-primary)',
              color: 'white',
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            C
          </div>
          <div className="hero-info">
            <div className="hero-title-text">Christophe</div>
            <div className="hero-sub">Owner · Ferme audit test</div>
          </div>
        </div>
      </Card>

      <Section label="Mode d'affichage">
        <ToggleAdvancedMode />
      </Section>

      <Section label="Configuration">
        <ListItem
          avatar={<span style={{ fontSize: 20 }}>🏠</span>}
          title="Ma ferme"
          subtitle="Identité, secteur, devise"
          trailing={<span className="list-arrow">›</span>}
          onClick={() => navigate('/reglages/systeme')}
        />
        <ListItem
          avatar={<span style={{ fontSize: 20 }}>👥</span>}
          title="Mon équipe"
          subtitle="4 utilisateurs · Owner+Porcher+Admin"
          trailing={<span className="list-arrow">›</span>}
          onClick={() => navigate('/reglages/systeme')}
        />
        <ListItem
          avatar={<span style={{ fontSize: 20 }}>🌾</span>}
          title="Ressources & stocks"
          subtitle="Aliments, vétérinaire, fournisseurs"
          trailing={<span className="list-arrow">›</span>}
          onClick={() => navigate('/ressources')}
        />
        <ListItem
          avatar={<span style={{ fontSize: 20 }}>📋</span>}
          title="Protocoles santé"
          subtitle="SOPs, vaccins, traitements"
          trailing={<span className="list-arrow">›</span>}
          onClick={() => navigate('/protocoles')}
        />
      </Section>

      <Section label="Apprendre">
        <ListItem
          avatar={<span style={{ fontSize: 20 }}>📚</span>}
          title="Encyclopédie porcine"
          subtitle="5 articles · cycles, santé, économie"
          trailing={<span className="list-arrow">›</span>}
          onClick={() => navigate('/reglages/encyclopedie')}
        />
        <ListItem
          avatar={<span style={{ fontSize: 20 }}>🎓</span>}
          title="Refaire le tutoriel"
          subtitle="2 min · découverte de l'app"
          trailing={<span className="list-arrow">›</span>}
          onClick={() => navigate('/reglages/onboarding')}
        />
      </Section>
    </div>
  );
};
