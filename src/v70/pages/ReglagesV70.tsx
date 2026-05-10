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
import { useIonAlert } from '@ionic/react';
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
  LifeBuoy,
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
import { titleCase } from '../lib';
import { ARTICLES as ENCYCLOPEDIA_ARTICLES } from './EncyclopediaPage';

/**
 * V76 — Pattern card-link issu du mockup Claude Design (reglages-pilotage v76).
 * Icône carrée colorée + titre mono + sub muted + chevron. Utilisé pour les
 * lignes de navigation Configuration / Apprendre sur l'écran Réglages racine.
 */
interface SettingsRowProps {
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  onClick: () => void;
}

const SettingsRow: React.FC<SettingsRowProps> = ({ title, subtitle, Icon, onClick }) => (
  <button type="button" className="card-link" onClick={onClick} aria-label={`${title} — ${subtitle}`}>
    <span className="card-link__icon" aria-hidden>
      <Icon size={18} strokeWidth={1.6} />
    </span>
    <span className="card-link__main">
      <span className="card-link__title">{title}</span>
      <span className="card-link__sub">{subtitle}</span>
    </span>
    <span className="card-link__chev" aria-hidden>
      <ChevronRight size={16} strokeWidth={1.6} />
    </span>
  </button>
);

export const ReglagesV70: React.FC = () => {
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const { pendingCount, errorCount } = useOfflineQueue();
  const [presentAlert] = useIonAlert();

  // V75-v P2#8 — remplace `window.confirm()` natif (laid, hors design system)
  // par un IonAlert stylisé, cohérent avec le pattern handleReformer
  // (TruieDetailView). Garde la même UX : annulation par défaut, action
  // destructive explicite, focus sur "Annuler".
  const handleSignOut = useCallback(() => {
    void presentAlert({
      header: 'Se déconnecter ?',
      message: 'Tu reviendras au login. Tes données restent sauvegardées.',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Se déconnecter',
          role: 'destructive',
          handler: () => {
            void (async () => {
              try {
                await signOut();
                navigate('/login', { replace: true });
              } catch (err) {
                console.error('Sign out failed', err);
              }
            })();
          },
        },
      ],
    });
  }, [presentAlert, signOut, navigate]);

  // V71.1 — données live profile (étaient hardcodées "Christophe / Owner · Ferme audit test")
  // V75-q B-1 (F-34) / V75-v P2#1 : Title Case sur displayName ET farmLabel (le QA voit
  // "OWNER · audit final" — le "audit final" vient de l'email, pas du full_name).
  const displayName = titleCase(profile?.full_name?.trim()) || 'Éleveur';
  const initial = displayName.charAt(0).toUpperCase();
  const farmLabelRaw = (profile?.email?.split('@')[0] ?? 'ma-ferme').replace(/[._-]+/g, ' ');
  const farmLabel = titleCase(farmLabelRaw);
  const roleLabel = role || 'Utilisateur';

  return (
    <div
      className="phone-content"
      style={{ padding: 24, maxWidth: 600, margin: '0 auto', minHeight: '100%' }}
    >
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
        <SettingsRow
          title={pendingCount === 0 ? 'Tout est synchronisé' : `${pendingCount} action${pendingCount > 1 ? 's' : ''} en attente`}
          subtitle={
            errorCount > 0
              ? `${errorCount} erreur${errorCount > 1 ? 's' : ''} · voir la file pour relancer`
              : 'File offline · retry automatique au retour réseau'
          }
          Icon={CloudUpload}
          onClick={() => navigate('/reglages/sync')}
        />
      </Section>

      <Section label="Configuration">
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
        />
      </Section>

      <Section label="Apprendre">
        <SettingsRow
          title="Encyclopédie porcine"
          subtitle={`${ENCYCLOPEDIA_ARTICLES.length} articles · cycles, santé, économie`}
          Icon={BookOpen}
          onClick={() => navigate('/reglages/encyclopedie')}
        />
        <SettingsRow
          title="Refaire le tutoriel"
          subtitle="2 min · découverte de l'app"
          Icon={GraduationCap}
          onClick={() => navigate('/reglages/onboarding')}
        />
        <SettingsRow
          title="Aide & support"
          subtitle="support@porctrack.tech · réponse sous 24h"
          Icon={LifeBuoy}
          onClick={() => {
            window.location.href =
              'mailto:support@porctrack.tech?subject=Support%20PorcTrack';
          }}
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
  );
};
