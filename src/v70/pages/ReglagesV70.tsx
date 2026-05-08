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
import {
  LogOut,
  ChevronRight,
  Home,
  Users,
  Wheat,
  ClipboardList,
  BookOpen,
  GraduationCap,
  CloudUpload,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../components/ds/PageHeader';
import { Section } from '../components/ds/Section';
import { Card } from '../components/ds/Card';
import { ToggleAdvancedMode } from '../components/v70/ToggleAdvancedMode';
import { NotifCategoriesSwitches } from '../components/v70/NotifCategoriesSwitches';
import { PushNotifToggle } from '../components/v70/PushNotifToggle';
import { MariusGreeting } from '../../features/chatbot/MariusGreeting';
import FarmSwitcher from '../../components/FarmSwitcher';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';

const PAGE_BACKGROUND_SRC = '/images/ambiance-ux.webp';

/**
 * V70 P2 — Liste typographique anti-AI.
 * Plus de card icon+titre+soustitre+chevron uniforme : rangée éditoriale
 * avec séparateurs `--pt-line`, titre BigShoulders bold, subtitle muted,
 * icône Lucide discrète à droite (affordance, pas hiérarchie).
 */
interface SettingsRowProps {
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  onClick: () => void;
  isLast?: boolean;
}

const SettingsRow: React.FC<SettingsRowProps> = ({ title, subtitle, Icon, onClick, isLast }) => {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      aria-label={`${title} — ${subtitle}`}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        minHeight: 64,
        padding: '18px 4px',
        background: active
          ? 'var(--pt-bg-app)'
          : hover
            ? 'rgba(26,26,26,0.025)'
            : 'transparent',
        border: 'none',
        borderBottom: isLast ? 'none' : '1px solid var(--pt-line)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 160ms ease',
        fontFamily: 'inherit',
        color: 'inherit',
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontFamily: 'var(--pt-font-display, "BigShouldersDisplay", system-ui, sans-serif)',
            fontWeight: 700,
            fontSize: 18,
            lineHeight: 1.15,
            letterSpacing: '0.005em',
            color: 'var(--pt-ink)',
            textTransform: 'none',
          }}
        >
          {title}
        </span>
        <span
          style={{
            display: 'block',
            fontFamily: 'var(--pt-font-body, "InstrumentSans", system-ui, sans-serif)',
            fontSize: 13,
            lineHeight: 1.4,
            color: 'var(--pt-muted)',
            marginTop: 4,
          }}
        >
          {subtitle}
        </span>
      </span>
      <Icon
        size={18}
        strokeWidth={1.5}
        color="var(--pt-muted)"
        aria-hidden
        style={{ flexShrink: 0 }}
      />
    </button>
  );
};

export const ReglagesV70: React.FC = () => {
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const { pendingCount, errorCount } = useOfflineQueue();

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

      <div style={{ marginBottom: 12 }}>
        <FarmSwitcher />
      </div>

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

      <Section label="Notifications">
        <PushNotifToggle />
        <NotifCategoriesSwitches />
      </Section>

      <Section label="Synchronisation">
        <div style={{ borderTop: '1px solid var(--pt-line)' }}>
          <SettingsRow
            title={pendingCount === 0 ? 'Tout est synchronisé' : `${pendingCount} action${pendingCount > 1 ? 's' : ''} en attente`}
            subtitle={
              errorCount > 0
                ? `${errorCount} erreur${errorCount > 1 ? 's' : ''} · voir la file pour relancer`
                : 'File offline · retry automatique au retour réseau'
            }
            Icon={CloudUpload}
            onClick={() => navigate('/reglages/sync')}
            isLast
          />
        </div>
      </Section>

      <Section label="Configuration">
        <div style={{ borderTop: '1px solid var(--pt-line)' }}>
          <SettingsRow
            title="Ma ferme"
            subtitle="Identité, secteur, devise"
            Icon={Home}
            onClick={() => navigate('/reglages/ma-ferme')}
          />
          <SettingsRow
            title="Mon équipe"
            subtitle="Rôles, accès, invitations"
            Icon={Users}
            onClick={() => navigate('/reglages/mon-equipe')}
          />
          <SettingsRow
            title="Ressources & stocks"
            subtitle="Aliments, vétérinaire, fournisseurs"
            Icon={Wheat}
            onClick={() => navigate('/ressources')}
          />
          <SettingsRow
            title="Protocoles santé"
            subtitle="SOPs, vaccins, traitements"
            Icon={ClipboardList}
            onClick={() => navigate('/protocoles')}
            isLast
          />
        </div>
      </Section>

      <Section label="Apprendre">
        <div style={{ borderTop: '1px solid var(--pt-line)' }}>
          <SettingsRow
            title="Encyclopédie porcine"
            subtitle="5 articles · cycles, santé, économie"
            Icon={BookOpen}
            onClick={() => navigate('/reglages/encyclopedie')}
          />
          <SettingsRow
            title="Refaire le tutoriel"
            subtitle="2 min · découverte de l'app"
            Icon={GraduationCap}
            onClick={() => navigate('/reglages/onboarding')}
            isLast
          />
        </div>
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
