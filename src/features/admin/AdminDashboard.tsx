import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, LogOut } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
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

function UsersPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, role, last_sign_in_at, email')
      .order('role', { ascending: true })
      .then(({ data, error: fetchErr }) => {
        if (fetchErr) {
          console.error('[AdminDashboard] UsersPanel fetch failed', fetchErr);
          setError('Impossible de charger les utilisateurs.');
          setUsers([]);
        } else {
          setUsers(data ?? []);
        }
        setLoading(false);
      }, (err) => {
        console.error('[AdminDashboard] UsersPanel fetch failed', err);
        setError('Impossible de charger les utilisateurs.');
        setUsers([]);
        setLoading(false);
      });
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId);
    try {
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      if (updErr) throw updErr;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error('[AdminDashboard] role update failed', err);
      setError('Mise à jour du rôle impossible.');
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
      <SectionHeader title="Gestion des utilisateurs" badge={users.length} />
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
                  fontFamily: 'BricolageGrotesque, system-ui, sans-serif',
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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [userCount, setUserCount] = useState<number>(0);
  const [todayCount, setTodayCount] = useState<number>(0);
  const [globalError, setGlobalError] = useState<string | null>(null);

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
      .select('id', { count: 'exact', head: true })
      .then(({ count, error: fetchErr }) => {
        if (fetchErr) {
          console.error('[AdminDashboard] user count fetch failed', fetchErr);
          setGlobalError('Erreur de chargement des utilisateurs.');
          setUserCount(0);
          return;
        }
        setUserCount(count ?? 0);
      }, (err) => {
        console.error('[AdminDashboard] user count fetch failed', err);
        setGlobalError('Erreur de chargement des utilisateurs.');
        setUserCount(0);
      });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
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
            value={userCount}
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
          <UsersPanel />
          <MonitoringPanel logs={logs} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ChevronLeft size={14} strokeWidth={1.75} />
            Retour au dashboard élevage
          </Button>
        </div>
      </main>
    </AgritechLayout>
  );
}
