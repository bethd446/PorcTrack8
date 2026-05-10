/**
 * V70 — Page Réglages (route /reglages)
 *
 * V77 — uniformisation namespace `.pt-screen` + header `.ph--primary`
 * (cohérent avec /performance, /finances, /animals). Cards sections via
 * `.section` + `.section__label`, navigation via `.card-link`.
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
import { Card } from '../components/ds/Card';
import { ToggleAdvancedMode } from '../components/v70/ToggleAdvancedMode';
import { NotifCategoriesSwitches } from '../components/v70/NotifCategoriesSwitches';
import { PushNotifToggle } from '../components/v70/PushNotifToggle';
import { MariusGreeting } from '../../features/chatbot/MariusGreeting';
import FarmSwitcher from '../../components/FarmSwitcher';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { titleCase } from '../lib';
import { ARTICLES as ENCYCLOPEDIA_ARTICLES } from './EncyclopediaPage';

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

  const displayName = titleCase(profile?.full_name?.trim()) || 'Éleveur';
  const initial = displayName.charAt(0).toUpperCase();
  const farmLabelRaw = (profile?.email?.split('@')[0] ?? 'ma-ferme').replace(/[._-]+/g, ' ');
  const farmLabel = titleCase(farmLabelRaw);
  const roleLabel = role || 'Utilisateur';

  return (
    <div className="pt-screen">
      <header className="ph ph--primary">
        <div className="ph__row">
          <div>
            <div className="ph__eyebrow">Configuration</div>
            <h1 className="ph__h1">Réglages</h1>
            <p className="ph__sub">Profil, ferme, équipe, ressources</p>
          </div>
        </div>
      </header>

      <div
        className="phone-content"
        style={{ padding: '0 24px 24px', maxWidth: 600, margin: '0 auto' }}
      >
        <MariusGreeting pageContext="configuration" />

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

        <section className="section">
          <div className="section__label">Mode d’affichage</div>
          <ToggleAdvancedMode />
        </section>

        <section className="section">
          <div className="section__label">Notifications</div>
          <PushNotifToggle />
          <NotifCategoriesSwitches />
        </section>

        <section className="section">
          <div className="section__label">Synchronisation</div>
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
        </section>

        <section className="section">
          <div className="section__label">Configuration</div>
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
        </section>

        <section className="section">
          <div className="section__label">Apprendre</div>
          <SettingsRow
            title="Encyclopédie porcine"
            subtitle={`${ENCYCLOPEDIA_ARTICLES.length} articles · cycles, santé, économie`}
            Icon={BookOpen}
            onClick={() => navigate('/reglages/encyclopedie')}
          />
          <SettingsRow
            title="Refaire le tutoriel"
            subtitle="2 min · découverte de l’app"
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
        </section>

        <section className="section" style={{ marginTop: 24, marginBottom: 32 }}>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Se déconnecter de PorcTrack"
            className="btn-secondary--lg"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textAlign: 'left',
              justifyContent: 'flex-start',
            }}
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
