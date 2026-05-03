import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonContent, IonPage, IonAlert, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons,
} from '@ionic/react';
import { LogOut, Trash2, Mail, Lock } from 'lucide-react';
import AgritechLayout from './AgritechLayout';
import {
  Button as DsButton,
  Section,
  Card,
  ActionRow as DsActionRow,
  KeyValueRow,
  Input,
  FormField,
  Toggle,
} from '@/design-system';
import { useAuth } from '../context/AuthContext';
import { useMeta } from '../context/FarmContext';
import { APP_VERSION } from '../config';
import { kvGet, kvSet, kvClear } from '../services/kvStore';
import { supabase } from '../services/supabaseClient';
import {
  fetchFarm, updateProfile, updateFarm, updatePassword,
  type FarmInfo,
} from '../services/settingsService';

const SUPPORT_EMAIL = 'support@porctrack.tech';
const NOTIF_SIGNUPS_KEY = 'notif_email_signups';
const NOTIF_ALERTS_KEY = 'notif_email_alerts';

// ─── helpers ──────────────────────────────────────────────────────────────

function formatRelativeTime(ts: number | null | undefined): string {
  if (!ts) return 'jamais';
  const diffMs = Date.now() - ts;
  if (diffMs < 0) return 'à l’instant';
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'il y a quelques secondes';
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} minute${min > 1 ? 's' : ''}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} heure${h > 1 ? 's' : ''}`;
  const d = Math.floor(h / 24);
  return `il y a ${d} jour${d > 1 ? 's' : ''}`;
}

// ─── primitives ────────────────────────────────────────────────────────────

const SettingsSection: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <section style={{ marginBottom: 28 }} aria-label={title}>
    <Section label={title} />
    <Card compact style={{ marginTop: 8 }}>
      {children}
    </Card>
  </section>
);

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <KeyValueRow label={label} value={value} />
);

interface SettingsRowProps {
  label: string;
  description?: string;
  onClick: () => void;
  destructive?: boolean;
  trailing?: React.ReactNode;
}
const ActionRow: React.FC<SettingsRowProps> = ({ label, description, onClick, destructive, trailing }) => (
  <DsActionRow
    title={label}
    subtitle={description}
    destructive={destructive}
    trailing={trailing}
    onClick={onClick}
  />
);

const ToggleRow: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '14px 16px',
      borderBottom: '1px solid var(--pt-border)',
    }}
  >
    <div style={{ minWidth: 0 }}>
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--pt-font-body)',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--pt-text)',
        }}
      >
        {label}
      </p>
      {description ? (
        <p
          style={{
            margin: '2px 0 0',
            fontFamily: 'var(--pt-font-body)',
            fontSize: 12,
            color: 'var(--pt-text-muted)',
          }}
        >
          {description}
        </p>
      ) : null}
    </div>
    <Toggle checked={checked} onChange={onChange} ariaLabel={label} />
  </div>
);

// ─── modals ────────────────────────────────────────────────────────────────

const errorStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 'var(--pt-radius-md)',
  background: 'rgba(220, 38, 38, 0.08)',
  color: 'var(--pt-danger)',
  fontSize: 13,
  margin: 0,
  fontFamily: 'var(--pt-font-body)',
};

const ProfileEditForm: React.FC<{
  onClose: () => void;
  initialName: string;
  userId: string | null;
  onSaved: () => void;
}> = ({ onClose, initialName, userId, onSaved }) => {
  const [name, setName] = useState(initialName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setError('Session invalide.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await updateProfile(userId, { full_name: name.trim() });
      await kvSet('user_name', name.trim());
      onSaved();
      onClose();
    } catch (err) {
      console.error('[Settings] updateProfile failed', err);
      setError('Impossible d’enregistrer. Réessaye.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IonContent>
      <form
        onSubmit={handleSubmit}
        style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 520, margin: '0 auto' }}
      >
        <FormField label="Nom complet" required>
          <Input
            id="profile-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Christophe Liégeois"
            disabled={submitting}
          />
        </FormField>
        {error ? <p role="alert" style={errorStyle}>{error}</p> : null}
        <DsButton
          type="submit"
          variant="primary"
          disabled={submitting || !name.trim()}
        >
          {submitting ? 'Enregistrement…' : 'Enregistrer'}
        </DsButton>
      </form>
    </IonContent>
  );
};

const ProfileEditModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  initialName: string;
  userId: string | null;
  onSaved: () => void;
}> = ({ isOpen, onClose, initialName, userId, onSaved }) => (
  <IonModal isOpen={isOpen} onDidDismiss={onClose}>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Modifier mon profil</IonTitle>
        <IonButtons slot="end">
          <DsButton variant="ghost" size="small" onClick={onClose}>Annuler</DsButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    {isOpen ? (
      <ProfileEditForm
        onClose={onClose}
        initialName={initialName}
        userId={userId}
        onSaved={onSaved}
      />
    ) : null}
  </IonModal>
);

const PasswordForm: React.FC<{
  onClose: () => void;
  onSaved: () => void;
}> = ({ onClose, onSaved }) => {
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères.');
      return;
    }
    if (pwd !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await updatePassword(pwd);
      onSaved();
      onClose();
    } catch (err) {
      console.error('[Settings] updatePassword failed', err);
      setError('Impossible de changer le mot de passe.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IonContent>
      <form
        onSubmit={handleSubmit}
        style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 520, margin: '0 auto' }}
      >
        <FormField label="Nouveau mot de passe" required>
          <Input
            id="pwd-new"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            disabled={submitting}
          />
        </FormField>
        <FormField label="Confirme le mot de passe" required>
          <Input
            id="pwd-confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={submitting}
          />
        </FormField>
        {error ? <p role="alert" style={errorStyle}>{error}</p> : null}
        <DsButton type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Mise à jour…' : 'Mettre à jour'}
        </DsButton>
      </form>
    </IonContent>
  );
};

const PasswordModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}> = ({ isOpen, onClose, onSaved }) => (
  <IonModal isOpen={isOpen} onDidDismiss={onClose}>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Changer mot de passe</IonTitle>
        <IonButtons slot="end">
          <DsButton variant="ghost" size="small" onClick={onClose}>Annuler</DsButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    {isOpen ? <PasswordForm onClose={onClose} onSaved={onSaved} /> : null}
  </IonModal>
);

const FarmEditForm: React.FC<{
  onClose: () => void;
  farm: FarmInfo;
  onSaved: () => void;
}> = ({ onClose, farm, onSaved }) => {
  const [nom, setNom] = useState(farm.nom);
  const [secteur, setSecteur] = useState(farm.secteur ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await updateFarm(farm.id, {
        nom: nom.trim(),
        secteur: secteur.trim() || null,
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error('[Settings] updateFarm failed', err);
      setError('Impossible d’enregistrer la ferme.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IonContent>
      <form
        onSubmit={handleSubmit}
        style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 520, margin: '0 auto' }}
      >
        <FormField label="Nom de la ferme" required>
          <Input
            id="farm-nom"
            type="text"
            required
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            disabled={submitting}
          />
        </FormField>
        <FormField label="Secteur">
          <Input
            id="farm-secteur"
            type="text"
            value={secteur}
            onChange={(e) => setSecteur(e.target.value)}
            placeholder="Ex: Nord — Côte d'Ivoire"
            disabled={submitting}
          />
        </FormField>
        {error ? <p role="alert" style={errorStyle}>{error}</p> : null}
        <DsButton type="submit" variant="primary" disabled={submitting || !nom.trim()}>
          {submitting ? 'Enregistrement…' : 'Enregistrer'}
        </DsButton>
      </form>
    </IonContent>
  );
};

const FarmEditModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  farm: FarmInfo | null;
  onSaved: () => void;
}> = ({ isOpen, onClose, farm, onSaved }) => (
  <IonModal isOpen={isOpen} onDidDismiss={onClose}>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Modifier la ferme</IonTitle>
        <IonButtons slot="end">
          <DsButton variant="ghost" size="small" onClick={onClose}>Annuler</DsButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    {isOpen && farm ? <FarmEditForm onClose={onClose} farm={farm} onSaved={onSaved} /> : null}
  </IonModal>
);

// ─── page ──────────────────────────────────────────────────────────────────

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, role, userName, signOut, refreshProfile } = useAuth();
  const { lastUpdate, refreshData, recomputeAlerts } = useMeta();
  // V33 : alertes/outils déplacés vers /outils — la page Plus est purement
  // settings (profil, ferme, équipe, sync, notifs, aide, sécurité).

  const [farm, setFarm] = useState<FarmInfo | null>(null);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showFarmEdit, setShowFarmEdit] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [notifSignups, setNotifSignups] = useState(() => kvGet(NOTIF_SIGNUPS_KEY) !== '0');
  const [notifAlerts, setNotifAlerts] = useState(() => kvGet(NOTIF_ALERTS_KEY) !== '0');

  const userId = user?.id ?? null;
  const userEmail = profile?.email ?? user?.email ?? '—';
  const isOwner = role === 'OWNER';

  useEffect(() => {
    let mounted = true;
    if (userId) {
      void fetchFarm(userId).then((f) => {
        if (mounted) setFarm(f);
      });
    }
    return () => { mounted = false; };
  }, [userId]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await refreshData(true);
      await recomputeAlerts();
      setToast('Synchronisé');
    } catch (err) {
      console.error('[Settings] sync failed', err);
      setToast('Échec de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const handleResetCache = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // continue : on doit purger même si signOut échoue
    }
    await kvClear();
    window.location.href = '/';
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      window.location.href = '/';
    }
  };

  const toggleNotifSignups = (v: boolean) => {
    setNotifSignups(v);
    void kvSet(NOTIF_SIGNUPS_KEY, v ? '1' : '0');
  };
  const toggleNotifAlerts = (v: boolean) => {
    setNotifAlerts(v);
    void kvSet(NOTIF_ALERTS_KEY, v ? '1' : '0');
  };

  const farmDisplayName = farm?.nomFerme || farm?.nom || 'Ferme non renseignée';
  const farmSector = farm?.secteur ?? null;
  const farmCodePrefixValue = (farm?.nomFerme || farm?.nom)
    ? (farm!.nomFerme || farm!.nom)
        .toUpperCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 4) || 'FARM'
    : 'FARM';
  const farmShortId = farm ? `${farmCodePrefixValue}-${farm.id.substring(0, 6).toUpperCase()}` : '—';

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout withNav={true}>
          <div className="px-4 pt-5 pb-32 max-w-md mx-auto">
            <header style={{ marginBottom: 24 }}>
              <Section label="Réglages" />
              <h1
                style={{
                  fontFamily: 'var(--pt-font-display)',
                  fontSize: 'var(--pt-text-display)',
                  fontWeight: 700,
                  lineHeight: 1.05,
                  letterSpacing: '-0.02em',
                  color: 'var(--pt-text)',
                  margin: '8px 0 4px',
                }}
              >
                Plus
              </h1>
              <p
                style={{
                  fontFamily: 'var(--pt-font-body)',
                  fontSize: 13,
                  color: 'var(--pt-text-muted)',
                  margin: 0,
                }}
              >
                Ton profil, ta ferme, l’équipe
              </p>
            </header>

            {/* V33 : Outils Terrain / Audit / Journal santé / Protocoles /
                Stocks / Fournisseurs migrés vers /outils. La page Plus est
                purement settings. */}

            {/* Profil */}
            <SettingsSection title="Profil">
              <InfoRow label="Nom" value={userName} />
              <InfoRow
                label="Email"
                value={<span style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 12 }}>{userEmail}</span>}
              />
              <ActionRow
                label="Modifier mon profil"
                onClick={() => setShowProfileEdit(true)}
              />
              <ActionRow
                label="Changer mot de passe"
                onClick={() => setShowPwd(true)}
                trailing={<Lock size={14} aria-hidden="true" style={{ color: 'var(--pt-text-muted)' }} />}
              />
            </SettingsSection>

            {/* Ferme */}
            <SettingsSection title="Ferme">
              <InfoRow
                label="Code"
                value={<span style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 12 }}>{farmShortId}</span>}
              />
              <InfoRow label="Nom" value={farmDisplayName} />
              {farmSector ? <InfoRow label="Secteur" value={farmSector} /> : null}
              <ActionRow
                label="Modifier la ferme"
                onClick={() => setShowFarmEdit(true)}
                description={farm ? undefined : 'Aucune ferme liée à ce compte'}
              />
            </SettingsSection>

            {/* Utilisateurs (OWNER only) */}
            {isOwner ? (
              <SettingsSection title="Utilisateurs">
                <InfoRow label="Membres" value={`${userName} (toi)`} />
                <ActionRow
                  label="Ajouter un porcher"
                  description="Inviter un opérateur sur ta ferme"
                  onClick={() => navigate('/admin')}
                />
                <ActionRow
                  label="Console admin"
                  description="Gérer comptes, rôles et invitations"
                  onClick={() => navigate('/admin')}
                />
              </SettingsSection>
            ) : null}

            {/* Synchronisation */}
            <SettingsSection title="Synchronisation">
              <InfoRow
                label="Dernière sync"
                value={formatRelativeTime(lastUpdate)}
              />
              <ActionRow
                label={syncing ? 'Synchronisation…' : 'Synchroniser maintenant'}
                onClick={() => { void handleSyncNow(); }}
                description="Recharge les données et recalcule les alertes"
              />
              <ActionRow
                label="Vider le cache local"
                description="Déconnecte et supprime toutes les données locales"
                onClick={() => setConfirmReset(true)}
                destructive
                trailing={<Trash2 size={14} aria-hidden="true" style={{ color: 'var(--pt-danger)' }} />}
              />
            </SettingsSection>

            {/* V33 : Carnet fournisseurs migré vers /outils. */}

            {/* Notifications (V21 candidate) */}
            <SettingsSection title="Notifications">
              <ToggleRow
                label="Confirmation des saisies"
                description="Email après chaque saisie validée"
                checked={notifSignups}
                onChange={toggleNotifSignups}
              />
              <ToggleRow
                label="Alertes critiques"
                description="Email pour les alertes urgentes"
                checked={notifAlerts}
                onChange={toggleNotifAlerts}
              />
            </SettingsSection>

            {/* Aide & support */}
            <SettingsSection title="Aide & support">
              <ActionRow
                label="FAQ"
                description="Réponses aux questions fréquentes"
                onClick={() => navigate('/aide')}
              />
              <ActionRow
                label="Contacter le support"
                description={SUPPORT_EMAIL}
                onClick={() => {
                  window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Support%20PorcTrack`;
                }}
                trailing={<Mail size={14} aria-hidden="true" style={{ color: 'var(--pt-text-muted)' }} />}
              />
              <div style={{ padding: '14px 16px' }}>
                <span
                  style={{
                    fontFamily: 'var(--pt-font-body)',
                    fontSize: 11,
                    color: 'var(--pt-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: 'var(--pt-tracking-label)',
                    fontWeight: 600,
                  }}
                >
                  PorcTrack v29 · build <span style={{ fontFamily: 'var(--pt-font-mono)' }}>{APP_VERSION}</span>
                </span>
              </div>
            </SettingsSection>

            {/* Sécurité */}
            <div style={{ marginTop: 16, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
              <DsButton
                variant="danger"
                onClick={() => setConfirmSignOut(true)}
                ariaLabel="Se déconnecter"
              >
                <LogOut size={16} aria-hidden="true" style={{ marginRight: 6 }} />
                Se déconnecter
              </DsButton>
            </div>

            {toast ? (
              <div
                role="status"
                aria-live="polite"
                style={{
                  position: 'fixed',
                  bottom: 96,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '10px 16px',
                  borderRadius: 'var(--pt-radius-pill)',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--pt-tracking-label)',
                  zIndex: 50,
                  background: 'var(--pt-text)',
                  color: 'var(--pt-surface)',
                  fontFamily: 'var(--pt-font-body)',
                  fontWeight: 600,
                }}
              >
                {toast}
              </div>
            ) : null}
          </div>
        </AgritechLayout>

        <ProfileEditModal
          isOpen={showProfileEdit}
          onClose={() => setShowProfileEdit(false)}
          initialName={userName}
          userId={userId}
          onSaved={() => {
            setToast('Profil mis à jour');
            void refreshProfile();
          }}
        />
        <PasswordModal
          isOpen={showPwd}
          onClose={() => setShowPwd(false)}
          onSaved={() => setToast('Mot de passe mis à jour')}
        />
        <FarmEditModal
          isOpen={showFarmEdit}
          onClose={() => setShowFarmEdit(false)}
          farm={farm}
          onSaved={() => {
            setToast('Ferme mise à jour');
            if (userId) {
              void fetchFarm(userId).then(setFarm);
            }
          }}
        />

        <IonAlert
          isOpen={confirmReset}
          onDidDismiss={() => setConfirmReset(false)}
          header="Vider le cache"
          message="Effacer toutes les données locales et se déconnecter ?"
          buttons={[
            { text: 'Annuler', role: 'cancel' },
            {
              text: 'Vider',
              cssClass: 'text-[var(--color-danger,#EF4444)]',
              handler: handleResetCache,
            },
          ]}
        />
        <IonAlert
          isOpen={confirmSignOut}
          onDidDismiss={() => setConfirmSignOut(false)}
          header="Déconnexion"
          message="Te déconnecter de ton compte ?"
          buttons={[
            { text: 'Annuler', role: 'cancel' },
            {
              text: 'Se déconnecter',
              cssClass: 'text-[var(--color-danger,#EF4444)]',
              handler: handleSignOut,
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default SettingsPage;
