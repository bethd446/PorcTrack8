import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonContent, IonPage, IonAlert, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons,
} from '@ionic/react';
import {
  User, Tractor, Users, RefreshCw, Bell, HelpCircle, ShieldAlert,
  ChevronRight, LogOut, Trash2, Mail, Lock, Truck,
  ClipboardCheck, AlertTriangle, Stethoscope, BookOpen, Boxes, Building2,
} from 'lucide-react';
import AgritechLayout from './AgritechLayout';
import { useAuth } from '../context/AuthContext';
import { useMeta } from '../context/FarmContext';
import { usePilotage } from '../context/PilotageContext';
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
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <section className="mb-7" aria-label={title}>
    <div className="flex items-center gap-2 mb-3 px-1">
      <span className="text-text-2" aria-hidden="true">{icon}</span>
      <h2
        className="font-mono uppercase tracking-[0.18em] text-[11px] text-text-2"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {title}
      </h2>
      <span className="flex-1 h-px bg-border" aria-hidden="true" />
    </div>
    <div
      className="rounded-[var(--radius-card,12px)] overflow-hidden"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--line)',
      }}
    >
      {children}
    </div>
  </section>
);

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="px-5 py-3.5 flex items-baseline justify-between gap-3 border-b border-border last:border-b-0">
    <span
      className="font-mono uppercase tracking-wide text-[11px] text-text-2 shrink-0"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {label}
    </span>
    <span className="text-[13px] text-text-0 text-right truncate">{value}</span>
  </div>
);

const ActionRow: React.FC<{
  label: string;
  description?: string;
  onClick: () => void;
  destructive?: boolean;
  trailing?: React.ReactNode;
}> = ({ label, description, onClick, destructive = false, trailing }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left pressable hover:bg-bg-2 transition-colors border-b border-border last:border-b-0"
  >
    <div className="min-w-0">
      <p
        className={
          'text-[14px] font-semibold truncate ' +
          (destructive ? 'text-red' : 'text-text-0')
        }
      >
        {label}
      </p>
      {description ? (
        <p className="mt-0.5 font-mono text-[11px] text-text-2 truncate">{description}</p>
      ) : null}
    </div>
    {trailing ?? (
      <ChevronRight
        size={16}
        className={destructive ? 'text-red' : 'text-text-2'}
        aria-hidden="true"
      />
    )}
  </button>
);

const ToggleRow: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-border last:border-b-0">
    <div className="min-w-0">
      <p className="text-[14px] font-semibold text-text-0 truncate">{label}</p>
      {description ? (
        <p className="mt-0.5 font-mono text-[11px] text-text-2 truncate">{description}</p>
      ) : null}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-10 rounded-full transition-colors duration-150 shrink-0"
      style={{
        background: checked ? 'var(--color-accent-500)' : 'var(--color-bg-2)',
        border: '1px solid var(--line)',
      }}
    >
      <span
        aria-hidden="true"
        className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full transition-transform duration-150"
        style={{
          background: 'var(--bg-surface)',
          left: checked ? 'calc(100% - 19px)' : '3px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
        }}
      />
    </button>
  </div>
);

// ─── modals ────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--line)',
  borderRadius: 'var(--radius-input, 8px)',
  background: 'var(--bg-surface)',
  color: 'var(--ink)',
  fontSize: 14,
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--ink-soft)',
  fontWeight: 500,
  display: 'block',
  marginBottom: 6,
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
        <div>
          <label style={labelStyle} htmlFor="profile-name">Nom complet</label>
          <input
            id="profile-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Christophe Liégeois"
            style={inputStyle}
            disabled={submitting}
          />
        </div>
        {error ? (
          <p role="alert" style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-pig-soft, #fdecea)', color: 'var(--color-pig-deep, #c0392b)', fontSize: 13, margin: 0 }}>
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="pressable mt-2 h-11 px-4 rounded-md bg-accent text-bg-0 text-[12px] font-semibold uppercase tracking-wide disabled:opacity-50"
        >
          {submitting ? 'Enregistrement…' : 'Enregistrer'}
        </button>
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
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--ink-soft)', fontSize: 14, padding: '8px 16px' }}
          >
            Annuler
          </button>
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
        <div>
          <label style={labelStyle} htmlFor="pwd-new">Nouveau mot de passe</label>
          <input
            id="pwd-new"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            style={inputStyle}
            disabled={submitting}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="pwd-confirm">Confirme le mot de passe</label>
          <input
            id="pwd-confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={inputStyle}
            disabled={submitting}
          />
        </div>
        {error ? (
          <p role="alert" style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-pig-soft, #fdecea)', color: 'var(--color-pig-deep, #c0392b)', fontSize: 13, margin: 0 }}>
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="pressable mt-2 h-11 px-4 rounded-md bg-accent text-bg-0 text-[12px] font-semibold uppercase tracking-wide disabled:opacity-50"
        >
          {submitting ? 'Mise à jour…' : 'Mettre à jour'}
        </button>
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
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--ink-soft)', fontSize: 14, padding: '8px 16px' }}
          >
            Annuler
          </button>
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
        <div>
          <label style={labelStyle} htmlFor="farm-nom">Nom de la ferme</label>
          <input
            id="farm-nom"
            type="text"
            required
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            style={inputStyle}
            disabled={submitting}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="farm-secteur">Secteur</label>
          <input
            id="farm-secteur"
            type="text"
            value={secteur}
            onChange={(e) => setSecteur(e.target.value)}
            placeholder="Ex: Nord — Côte d'Ivoire"
            style={inputStyle}
            disabled={submitting}
          />
        </div>
        {error ? (
          <p role="alert" style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-pig-soft, #fdecea)', color: 'var(--color-pig-deep, #c0392b)', fontSize: 13, margin: 0 }}>
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting || !nom.trim()}
          className="pressable mt-2 h-11 px-4 rounded-md bg-accent text-bg-0 text-[12px] font-semibold uppercase tracking-wide disabled:opacity-50"
        >
          {submitting ? 'Enregistrement…' : 'Enregistrer'}
        </button>
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
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--ink-soft)', fontSize: 14, padding: '8px 16px' }}
          >
            Annuler
          </button>
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
  const { alerts, alertesServeur } = usePilotage();
  const pendingAlertsCount =
    alerts.filter(a => a.priority === 'CRITIQUE' || a.priority === 'HAUTE').length +
    alertesServeur.filter(a => a.priorite === 'CRITIQUE' || a.priorite === 'HAUTE').length;

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
            <header className="mb-6">
              <h1
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 34,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                  margin: '0 0 4px',
                }}
              >
                Plus
              </h1>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  color: 'var(--muted)',
                  margin: 0,
                }}
              >
                Ton profil, ta ferme et les réglages
              </p>
            </header>

            {/* Outils terrain — accès rapide aux modules opérationnels */}
            <SettingsSection title="Outils terrain" icon={<ClipboardCheck size={13} />}>
              <ActionRow
                label="Toutes les alertes"
                description={
                  pendingAlertsCount > 0
                    ? `${pendingAlertsCount} en attente`
                    : 'Aucune alerte en attente'
                }
                onClick={() => navigate('/alerts')}
                trailing={
                  pendingAlertsCount > 0 ? (
                    <span
                      className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full px-1.5 font-mono text-[11px] font-bold tabular-nums"
                      style={{
                        background: 'var(--red, #dc2626)',
                        color: 'var(--bg-surface, #fff)',
                      }}
                      aria-label={`${pendingAlertsCount} alertes en attente`}
                    >
                      {pendingAlertsCount > 9 ? '9+' : pendingAlertsCount}
                    </span>
                  ) : (
                    <AlertTriangle size={14} className="text-text-2" aria-hidden="true" />
                  )
                }
              />
              <ActionRow
                label="Audit quotidien"
                description="Checklist de contrôle journalier"
                onClick={() => navigate('/controle')}
                trailing={<ClipboardCheck size={14} className="text-text-2" aria-hidden="true" />}
              />
              <ActionRow
                label="Journal santé"
                description="Soins, traitements, mortalités"
                onClick={() => navigate('/sante')}
                trailing={<Stethoscope size={14} className="text-text-2" aria-hidden="true" />}
              />
              <ActionRow
                label="Protocoles"
                description="Guide métier et SOPs"
                onClick={() => navigate('/protocoles')}
                trailing={<BookOpen size={14} className="text-text-2" aria-hidden="true" />}
              />
              <ActionRow
                label="Ressources & Stocks"
                description="Aliments, pharmacie, suivi"
                onClick={() => navigate('/ressources')}
                trailing={<Boxes size={14} className="text-text-2" aria-hidden="true" />}
              />
              <ActionRow
                label="Fournisseurs"
                description="Carnet et commandes WhatsApp"
                onClick={() => navigate('/fournisseurs')}
                trailing={<Building2 size={14} className="text-text-2" aria-hidden="true" />}
              />
            </SettingsSection>

            {/* Profil */}
            <SettingsSection title="Profil" icon={<User size={13} />}>
              <InfoRow label="Nom" value={userName} />
              <InfoRow label="Email" value={<span className="font-mono text-[12px]">{userEmail}</span>} />
              <ActionRow
                label="Modifier mon profil"
                onClick={() => setShowProfileEdit(true)}
              />
              <ActionRow
                label="Changer mot de passe"
                onClick={() => setShowPwd(true)}
                trailing={<Lock size={14} className="text-text-2" aria-hidden="true" />}
              />
            </SettingsSection>

            {/* Ferme */}
            <SettingsSection title="Ferme" icon={<Tractor size={13} />}>
              <InfoRow label="Code" value={<span className="font-mono text-[12px]">{farmShortId}</span>} />
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
              <SettingsSection title="Utilisateurs" icon={<Users size={13} />}>
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
            <SettingsSection title="Synchronisation" icon={<RefreshCw size={13} />}>
              <InfoRow
                label="Dernière sync"
                value={
                  <span className="font-mono text-[12px]">{formatRelativeTime(lastUpdate)}</span>
                }
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
                trailing={<Trash2 size={14} className="text-red" aria-hidden="true" />}
              />
            </SettingsSection>

            {/* Carnet fournisseurs (V21-D1) */}
            <SettingsSection title="Carnet fournisseurs" icon={<Truck size={13} />}>
              <ActionRow
                label="Gérer les fournisseurs"
                description="Aliment, pharmacie, génétique — WhatsApp pré-rempli"
                onClick={() => navigate('/fournisseurs')}
              />
            </SettingsSection>

            {/* Notifications (V21 candidate) */}
            <SettingsSection title="Notifications" icon={<Bell size={13} />}>
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
            <SettingsSection title="Aide & support" icon={<HelpCircle size={13} />}>
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
                trailing={<Mail size={14} className="text-text-2" aria-hidden="true" />}
              />
              <div className="px-5 py-3.5 border-b border-border last:border-b-0">
                <span
                  className="font-mono text-[11px] text-text-2 uppercase tracking-wide"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  PorcTrack v20 · build {APP_VERSION}
                </span>
              </div>
            </SettingsSection>

            {/* Sécurité */}
            <SettingsSection title="Sécurité" icon={<ShieldAlert size={13} />}>
              <ActionRow
                label="Se déconnecter"
                onClick={() => setConfirmSignOut(true)}
                destructive
                trailing={<LogOut size={14} className="text-red" aria-hidden="true" />}
              />
            </SettingsSection>

            {toast ? (
              <div
                role="status"
                aria-live="polite"
                className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full text-[12px] font-mono uppercase tracking-wide z-50"
                style={{
                  background: 'var(--ink)',
                  color: 'var(--bg-surface)',
                  fontFamily: 'var(--font-mono)',
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
