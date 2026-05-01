import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, LogOut, Users, UserPlus } from 'lucide-react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons } from '@ionic/react';
import { supabase } from '../../services/supabaseClient';
import { kvGet, kvSet } from '../../services/kvStore';
import { useAuth } from '../../context/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';
import AgritechLayout from '../../components/AgritechLayout';
import KpiCardV6 from '../../components/design/KpiCard';
import Button from '../../components/design/Button';
import Eyebrow from '../../components/design/Eyebrow';

interface AdminLog {
  id: string;
  action: string;
  details: unknown;
  created_at: string;
}

interface UserProfile {
  id: string;
  email?: string;
  role: string;
  last_sign_in_at?: string;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function shortId(id: string): string {
  return id.substring(0, 8) + '…';
}

const CARD_STYLE: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--radius-card)',
  boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04), 0 1px 3px rgba(17, 24, 39, 0.06)',
  overflow: 'hidden',
};

const SECTION_HEADER_STYLE: React.CSSProperties = {
  padding: '14px 20px',
  borderBottom: '1px solid var(--line-2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};

const SECTION_TITLE_STYLE: React.CSSProperties = {
  fontFamily: 'DMMono, ui-monospace, monospace',
  fontSize: 11,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--ink-soft)',
  fontWeight: 500,
};

const COUNT_PILL_STYLE: React.CSSProperties = {
  fontFamily: 'DMMono, ui-monospace, monospace',
  fontSize: 11,
  padding: '3px 10px',
  borderRadius: 'var(--radius-pill)',
  background: 'var(--color-accent-100)',
  color: 'var(--color-accent-500)',
  fontWeight: 500,
};

function SectionHeader({ title, badge }: { title: string; badge?: number }) {
  return (
    <div style={SECTION_HEADER_STYLE}>
      <span style={SECTION_TITLE_STYLE}>{title}</span>
      {badge !== undefined && <span style={COUNT_PILL_STYLE}>{badge}</span>}
    </div>
  );
}

function LogsPanel() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data, error: fetchErr }) => {
        if (fetchErr) {
          console.error('[AdminDashboard] LogsPanel fetch failed', fetchErr);
          setError('Impossible de charger les journaux.');
          setLogs([]);
        } else {
          setLogs(data ?? []);
        }
        setLoading(false);
      }, (err) => {
        console.error('[AdminDashboard] LogsPanel fetch failed', err);
        setError('Impossible de charger les journaux.');
        setLogs([]);
        setLoading(false);
      });

    channelRef.current = supabase
      .channel('admin_logs_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_logs' },
        (payload) => {
          setLogs(prev => [payload.new as AdminLog, ...prev].slice(0, 50));
          listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, []);

  return (
    <div style={CARD_STYLE}>
      <SectionHeader title="Journal temps réel" badge={logs.length} />
      <div ref={listRef} style={{ overflowY: 'auto', maxHeight: 380 }}>
        {loading && (
          <p style={{ padding: '32px 24px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
            Chargement…
          </p>
        )}
        {!loading && error && (
          <p role="alert" style={{ padding: '16px 24px', fontSize: 13, color: 'var(--color-pig-deep, #c0392b)', background: 'var(--color-pig-soft, #fdecea)', borderBottom: '1px solid var(--line-2)' }}>
            {error}
          </p>
        )}
        {!loading && !error && logs.length === 0 && (
          <p style={{ padding: '32px 24px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
            Aucun log enregistré.
          </p>
        )}
        {logs.map((log, i) => (
          <div
            key={log.id}
            style={{
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: i === 0 ? 'var(--color-accent-100)' : 'transparent',
              borderBottom: i < logs.length - 1 ? '1px solid var(--line-2)' : 'none',
              transition: 'background 200ms var(--ease-emil)',
            }}
          >
            <span
              style={{
                flexShrink: 0,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: i === 0 ? 'var(--color-accent-500)' : 'var(--line)',
                animation: i === 0 ? 'pulse 2s ease-in-out infinite' : undefined,
              }}
            />
            <span
              style={{
                fontFamily: 'DMMono, ui-monospace, monospace',
                fontSize: 11,
                background: 'var(--color-accent-100)',
                color: 'var(--color-accent-500)',
                padding: '2px 10px',
                borderRadius: 'var(--radius-pill)',
                whiteSpace: 'nowrap',
                fontWeight: 500,
              }}
            >
              {log.action}
            </span>
            <span
              className="hidden sm:inline"
              style={{
                fontFamily: 'DMMono, ui-monospace, monospace',
                fontSize: 11,
                color: 'var(--muted)',
              }}
            >
              {shortId(log.id)}
            </span>
            <span
              style={{
                fontFamily: 'DMMono, ui-monospace, monospace',
                fontSize: 11,
                color: 'var(--muted)',
                marginLeft: 'auto',
                whiteSpace: 'nowrap',
              }}
            >
              {fmtDate(log.created_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface RoleStyle {
  background: string;
  color: string;
}

const ROLE_STYLES: Record<string, RoleStyle> = {
  ADMIN: {
    background: 'var(--amber-pork-soft, #fde7d3)',
    color: 'var(--amber-pork-deep, #c2662b)',
  },
  OWNER: {
    background: 'var(--color-accent-100)',
    color: 'var(--color-accent-500)',
  },
  PORCHER: {
    background: 'var(--bg-surface-2)',
    color: 'var(--ink-soft)',
  },
};

interface UsersPanelProps {
  users: UserProfile[];
  loading: boolean;
  error: string | null;
  onUsersChange: (users: UserProfile[]) => void;
  onError: (msg: string | null) => void;
  onInvite: () => void;
}

function UsersPanel({ users, loading, error, onUsersChange, onError, onInvite }: UsersPanelProps) {
  const [updating, setUpdating] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId);
    try {
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      if (updErr) throw updErr;
      onUsersChange(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error('[AdminDashboard] role update failed', err);
      onError('Mise à jour du rôle impossible.');
    } finally {
      setUpdating(null);
    }
  };

  const thStyle: React.CSSProperties = {
    fontFamily: 'DMMono, ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    fontWeight: 500,
    textAlign: 'left',
    padding: '12px 20px',
  };

  return (
    <div style={CARD_STYLE}>
      <div style={SECTION_HEADER_STYLE}>
        <span style={SECTION_TITLE_STYLE}>Gestion des utilisateurs</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={COUNT_PILL_STYLE}>{users.length}</span>
          <Button variant="primary" size="sm" onClick={onInvite}>
            <UserPlus size={14} strokeWidth={1.75} />
            Inviter un opérateur
          </Button>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        {loading && (
          <p style={{ padding: '32px 24px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
            Chargement…
          </p>
        )}
        {!loading && error && (
          <p role="alert" style={{ padding: '16px 24px', fontSize: 13, color: 'var(--color-pig-deep, #c0392b)', background: 'var(--color-pig-soft, #fdecea)', borderBottom: '1px solid var(--line-2)' }}>
            {error}
          </p>
        )}
        {!loading && !error && users.length === 0 && (
          <p style={{ padding: '32px 24px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
            Aucun profil trouvé.
          </p>
        )}
        {!loading && users.length > 0 && (
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line-2)' }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Rôle</th>
                <th style={thStyle}>Dernière connexion</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => {
                const roleStyle = ROLE_STYLES[user.role] ?? ROLE_STYLES.PORCHER;
                return (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: i < users.length - 1 ? '1px solid var(--line-2)' : 'none',
                      transition: 'background 200ms var(--ease-emil)',
                    }}
                  >
                    <td
                      style={{
                        padding: '12px 20px',
                        fontFamily: 'DMMono, ui-monospace, monospace',
                        fontSize: 11,
                        color: 'var(--muted)',
                      }}
                    >
                      {shortId(user.id)}
                    </td>
                    <td
                      style={{
                        padding: '12px 20px',
                        color: 'var(--ink-soft)',
                        maxWidth: 180,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {user.email ?? '—'}
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <select
                        value={user.role}
                        disabled={updating === user.id}
                        onChange={e => handleRoleChange(user.id, e.target.value)}
                        style={{
                          fontFamily: 'DMMono, ui-monospace, monospace',
                          fontSize: 11,
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-pill)',
                          border: 'none',
                          fontWeight: 500,
                          cursor: 'pointer',
                          background: roleStyle.background,
                          color: roleStyle.color,
                          opacity: updating === user.id ? 0.5 : 1,
                        }}
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="OWNER">OWNER</option>
                        <option value="PORCHER">PORCHER</option>
                      </select>
                    </td>
                    <td
                      style={{
                        padding: '12px 20px',
                        fontFamily: 'DMMono, ui-monospace, monospace',
                        fontSize: 11,
                        color: 'var(--muted)',
                      }}
                    >
                      {fmtDate(user.last_sign_in_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function MonitoringPanel({ logs }: { logs: AdminLog[] }) {
  const actionCounts = logs.reduce<Record<string, number>>((acc, log) => {
    acc[log.action] = (acc[log.action] ?? 0) + 1;
    return acc;
  }, {});

  const sorted = Object.entries(actionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const maxCount = sorted[0]?.[1] ?? 1;

  return (
    <div style={CARD_STYLE}>
      <SectionHeader title="Monitoring — Requêtes récentes" />
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>
            Aucune donnée.
          </p>
        )}
        {sorted.map(([action, count]) => (
          <div key={action}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span
                style={{
                  fontFamily: 'DMMono, ui-monospace, monospace',
                  fontSize: 11,
                  color: 'var(--ink)',
                }}
              >
                {action}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 12,
                  color: 'var(--muted)',
                }}
              >
                {count}
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: 'var(--bg-surface-2)',
                borderRadius: 'var(--radius-pill)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: 'var(--color-accent-500)',
                  borderRadius: 'var(--radius-pill)',
                  width: `${(count / maxCount) * 100}%`,
                  transition: 'width 500ms var(--ease-emil)',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type InviteRole = 'PORCHER' | 'ASSISTANT' | 'GERANT';

interface PendingInvite {
  email: string;
  role: InviteRole;
  message: string;
  farm_id: string;
  invited_by: string;
  created_at: string;
  status: 'pending';
}

const INVITES_KV_KEY = 'pending_invites_local';

interface InviteOperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string | null;
  onInvited: (note: string) => void;
}

function InviteOperatorModal({ isOpen, onClose, currentUserId, onInvited }: InviteOperatorModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('PORCHER');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reset = () => {
    setEmail('');
    setRole('PORCHER');
    setMessage('');
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) {
      setFormError('Session invalide. Reconnectez-vous.');
      return;
    }
    setSubmitting(true);
    setFormError(null);

    const invite: PendingInvite = {
      email: email.trim(),
      role,
      message: message.trim(),
      farm_id: currentUserId,
      invited_by: currentUserId,
      created_at: new Date().toISOString(),
      status: 'pending',
    };

    try {
      const raw = kvGet(INVITES_KV_KEY);
      const list: PendingInvite[] = raw ? JSON.parse(raw) : [];
      list.push(invite);
      await kvSet(INVITES_KV_KEY, JSON.stringify(list));
      const code = `K13-${currentUserId.substring(0, 6)}`;
      onInvited(`Invitation enregistrée. Envoi automatique bientôt disponible — contactez ${invite.email} avec le code ferme : ${code}`);
      reset();
      onClose();
    } catch (err) {
      console.error('[AdminDashboard] kvStore invite save failed', err);
      setFormError('Impossible d\'enregistrer l\'invitation. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'DMMono, ui-monospace, monospace',
    fontSize: 11,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'var(--ink-soft)',
    fontWeight: 500,
    display: 'block',
    marginBottom: 6,
  };

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

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Inviter un opérateur</IonTitle>
          <IonButtons slot="end">
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--ink-soft)',
                fontSize: 14,
                padding: '8px 16px',
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <form
          onSubmit={handleSubmit}
          style={{
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            maxWidth: 520,
            margin: '0 auto',
          }}
        >
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>
            L'opérateur recevra une invitation pour rejoindre votre élevage K13 avec le rôle choisi.
          </p>

          <div>
            <label style={labelStyle} htmlFor="invite-email">Email de l'opérateur</label>
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="porcher@ferme.fr"
              style={inputStyle}
              disabled={submitting}
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="invite-role">Rôle</label>
            <select
              id="invite-role"
              value={role}
              onChange={e => setRole(e.target.value as InviteRole)}
              style={inputStyle}
              disabled={submitting}
            >
              <option value="PORCHER">Porcher (terrain)</option>
              <option value="ASSISTANT">Assistant (saisies)</option>
              <option value="GERANT">Gérant (pilotage)</option>
            </select>
          </div>

          <div>
            <label style={labelStyle} htmlFor="invite-message">Message personnalisé (optionnel)</label>
            <textarea
              id="invite-message"
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Bienvenue sur PorcTrack..."
              style={{ ...inputStyle, resize: 'vertical', minHeight: 80, fontFamily: 'inherit' }}
              disabled={submitting}
            />
          </div>

          {formError && (
            <p
              role="alert"
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-card)',
                background: 'var(--color-pig-soft, #fdecea)',
                color: 'var(--color-pig-deep, #c0392b)',
                fontSize: 13,
                margin: 0,
              }}
            >
              {formError}
            </p>
          )}

          <Button type="submit" variant="primary" size="md" disabled={submitting || !email}>
            <UserPlus size={14} strokeWidth={1.75} />
            {submitting ? 'Envoi...' : 'Envoyer l\'invitation'}
          </Button>
        </form>
      </IonContent>
    </IonModal>
  );
}

interface OnboardingHeroProps {
  onInvite: () => void;
}

function OnboardingHero({ onInvite }: OnboardingHeroProps) {
  const benefits = [
    'Saisies temps réel : pesées, mortalités, soins.',
    'Rôles ciblés : Porcher (terrain), Assistant (gestion), Gérant (pilotage).',
    'Audit trail : traçabilité des actions par utilisateur.',
  ];

  return (
    <section
      style={{
        padding: '48px 32px',
        textAlign: 'center',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--line)',
        boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04), 0 1px 3px rgba(17, 24, 39, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'var(--color-accent-100)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
        }}
      >
        <Users size={36} strokeWidth={1.5} color="var(--color-accent-500)" />
      </div>

      <h2
        style={{
          fontFamily: 'var(--font-display, BigShoulders), system-ui, sans-serif',
          fontSize: 'clamp(24px, 4vw, 32px)',
          lineHeight: 1.1,
          letterSpacing: '-0.01em',
          color: 'var(--ink)',
          fontWeight: 700,
          margin: 0,
        }}
      >
        Inviter votre 1er opérateur
      </h2>

      <p
        style={{
          color: 'var(--ink-soft)',
          maxWidth: 480,
          margin: '4px auto 8px',
          fontSize: 15,
          lineHeight: 1.5,
        }}
      >
        Vous êtes seul sur la ferme K13. Invitez un porcher, assistant ou
        gérant à rejoindre votre élevage pour partager le suivi quotidien.
      </p>

      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: '8px 0 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxWidth: 440,
          textAlign: 'left',
          width: '100%',
        }}
      >
        {benefits.map((b) => (
          <li
            key={b}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              fontSize: 14,
              color: 'var(--ink-soft)',
              lineHeight: 1.5,
            }}
          >
            <span
              style={{
                flexShrink: 0,
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--color-accent-500)',
                marginTop: 8,
              }}
            />
            {b}
          </li>
        ))}
      </ul>

      <Button variant="primary" size="md" onClick={onInvite}>
        <UserPlus size={14} strokeWidth={1.75} />
        Envoyer une invitation
      </Button>

      <a
        href="https://porctrack.app/aide/multi-utilisateur"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 13,
          color: 'var(--ink-soft)',
          textDecoration: 'none',
          marginTop: 4,
        }}
      >
        Aide : guide multi-utilisateur →
      </a>
    </section>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [todayCount, setTodayCount] = useState<number>(0);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteToast, setInviteToast] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error: fetchErr }) => {
        if (fetchErr) {
          console.error('[AdminDashboard] logs aggregate fetch failed', fetchErr);
          setGlobalError('Erreur de chargement du journal.');
          setLogs([]);
          setTodayCount(0);
          return;
        }
        const allLogs = data ?? [];
        setLogs(allLogs);
        const today = new Date().toISOString().slice(0, 10);
        setTodayCount(allLogs.filter(l => l.created_at.startsWith(today)).length);
      }, (err) => {
        console.error('[AdminDashboard] logs aggregate fetch failed', err);
        setGlobalError('Erreur de chargement du journal.');
        setLogs([]);
        setTodayCount(0);
      });

    supabase
      .from('profiles')
      .select('id, role, last_sign_in_at, email')
      .order('role', { ascending: true })
      .then(({ data, error: fetchErr }) => {
        if (fetchErr) {
          console.error(
            '[AdminDashboard] profiles fetch failed',
            fetchErr.message,
            fetchErr.code,
            fetchErr,
          );
          // Table inexistante → fallback gracieux : 0 profils, onboarding solo-owner pris.
          if (fetchErr.code === '42P01' || /relation .* does not exist/i.test(fetchErr.message)) {
            setProfiles([]);
            setProfilesError(null);
          } else {
            const detail = fetchErr.code ? `${fetchErr.code} — ${fetchErr.message}` : fetchErr.message;
            setProfilesError(`Erreur chargement utilisateurs : ${detail}`);
            setProfiles([]);
          }
        } else {
          setProfiles(data ?? []);
        }
        setProfilesLoading(false);
      }, (err: unknown) => {
        console.error('[AdminDashboard] profiles fetch failed', err);
        const msg = err instanceof Error ? err.message : String(err);
        setProfilesError(`Erreur chargement utilisateurs : ${msg}`);
        setProfiles([]);
        setProfilesLoading(false);
      });
  }, []);

  const isSoloOwner =
    !profilesLoading &&
    !profilesError &&
    currentUserId !== null &&
    (profiles.length === 0 ||
      (profiles.length === 1 && profiles[0].id === currentUserId));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleInviteSuccess = (note: string) => {
    setInviteToast(note);
    window.setTimeout(() => setInviteToast(null), 6000);
  };

  return (
    <AgritechLayout>
      <main
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '32px 20px 96px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Eyebrow>Console d'administration</Eyebrow>
            <h1
              style={{
                fontFamily: 'var(--font-display, BigShoulders), system-ui, sans-serif',
                fontSize: 'clamp(32px, 5vw, 44px)',
                lineHeight: 1.05,
                letterSpacing: '-0.01em',
                color: 'var(--ink)',
                fontWeight: 700,
                margin: 0,
              }}
            >
              Administration
            </h1>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)', margin: 0 }}>
              Supervision, utilisateurs et journal d'événements.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut size={14} strokeWidth={1.75} />
            Déconnexion
          </Button>
        </header>

        {globalError && (
          <div
            role="alert"
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-card)',
              background: 'var(--color-pig-soft, #fdecea)',
              color: 'var(--color-pig-deep, #c0392b)',
              border: '1px solid var(--color-pig, #f5c6c0)',
              fontSize: 13,
            }}
          >
            {globalError}
          </div>
        )}

        {inviteToast && (
          <div
            role="status"
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-card)',
              background: 'var(--color-accent-100)',
              color: 'var(--color-accent-500)',
              border: '1px solid var(--color-accent-500)',
              fontSize: 13,
            }}
          >
            {inviteToast}
          </div>
        )}

        {isSoloOwner ? (
          <OnboardingHero onInvite={() => setInviteOpen(true)} />
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 16,
              }}
            >
              <KpiCardV6
                label="Logs totaux"
                value={logs.length}
                accentColor="var(--color-accent-500)"
              />
              <KpiCardV6
                label="Logs aujourd'hui"
                value={todayCount}
                accentColor="var(--amber-pork, #F4A261)"
              />
              <KpiCardV6
                label="Utilisateurs"
                value={profiles.length}
                accentColor="var(--color-accent-500)"
              />
            </div>

            <LogsPanel />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 24,
              }}
            >
              <UsersPanel
                users={profiles}
                loading={profilesLoading}
                error={profilesError}
                onUsersChange={setProfiles}
                onError={setProfilesError}
                onInvite={() => setInviteOpen(true)}
              />
              <MonitoringPanel logs={logs} />
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ChevronLeft size={14} strokeWidth={1.75} />
            Retour au dashboard élevage
          </Button>
        </div>
      </main>

      <InviteOperatorModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        currentUserId={currentUserId}
        onInvited={handleInviteSuccess}
      />
    </AgritechLayout>
  );
}
