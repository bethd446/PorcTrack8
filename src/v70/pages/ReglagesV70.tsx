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
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../components/ds/PageHeader';
import { Section } from '../components/ds/Section';
import { Card } from '../components/ds/Card';
import { ListItem } from '../components/ds/ListItem';
import { ToggleAdvancedMode } from '../components/v70/ToggleAdvancedMode';
import { MariusGreeting } from '../../features/chatbot/MariusGreeting';

const PAGE_BACKGROUND_SRC = '/images/ambiance-ux.webp';

export const ReglagesV70: React.FC = () => {
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();

  const handleSignOut = useCallback(async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) return;
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Sign out failed', err);
    }
  }, [signOut, navigate]);

  // V71.1 — données live profile (étaient hardcodées "Christophe / Owner · Ferme audit test")
  const displayName = profile?.full_name?.trim() || 'Éleveur';
  const initial = displayName.charAt(0).toUpperCase();
  const farmLabel = (profile?.email?.split('@')[0] ?? 'ma-ferme').replace(/[._-]+/g, ' ');
  const roleLabel = role || 'Utilisateur';

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
      <MariusGreeting pageContext="configuration" />

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
            {initial}
          </div>
          <div className="hero-info">
            <div className="hero-title-text">{displayName}</div>
            <div className="hero-sub">{`${roleLabel} · ${farmLabel}`}</div>
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
          onClick={() => navigate('/reglages/ma-ferme')}
        />
        <ListItem
          avatar={<span style={{ fontSize: 20 }}>👥</span>}
          title="Mon équipe"
          subtitle="Rôles, accès et invitations"
          trailing={<span className="list-arrow">›</span>}
          onClick={() => navigate('/reglages/mon-equipe')}
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

      {/* SECTION DÉCONNEXION — visible et accessible (V70 P1.7) */}
      <section style={{ marginTop: 24, marginBottom: 32 }}>
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Se déconnecter de PorcTrack"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--line)',
            borderRadius: 16,
            cursor: 'pointer',
            transition: 'background 200ms ease, border-color 200ms ease',
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            color: 'var(--ink)',
            textAlign: 'left',
          }}
          className="hover:bg-[var(--bg-surface-2)] hover:border-[var(--color-danger,#a4453d)]"
        >
          <span
            aria-hidden
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(164, 69, 61, 0.08)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <LogOut size={18} color="var(--color-danger, #a4453d)" />
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontWeight: 600, color: 'var(--ink)' }}>
              Se déconnecter
            </span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Quitter votre session PorcTrack
            </span>
          </span>
          <ChevronRight size={18} color="var(--muted)" aria-hidden />
        </button>
      </section>
      </div>
    </div>
  );
};
