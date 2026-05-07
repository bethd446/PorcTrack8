/**
 * V70 — Page Mon équipe (route /reglages/mon-equipe)
 *
 * V71 P1.7 — landing V70 cohérent (header monumental + cards arrondies)
 * remplaçant le pont direct vers le legacy SystemManagement.
 *
 * Édition rôles / invitations reste sur la console legacy /admin
 * (refonte V71+) accessible via le CTA bas de page.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { PageHeader } from '../components/ds/PageHeader';

const PAGE_BACKGROUND_SRC = '/images/ambiance-ux.webp';

interface TeamMember {
  id: string;
  email: string | null;
  role: string;
  full_name?: string | null;
}

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  OWNER:    { label: 'Owner',    color: '#064e3b', bg: 'rgba(6, 78, 59, 0.10)' },
  ADMIN:    { label: 'Admin',    color: '#064e3b', bg: 'rgba(6, 78, 59, 0.10)' },
  PORCHER:  { label: 'Porcher',  color: '#92400e', bg: 'rgba(244, 162, 97, 0.18)' },
  WORKER:   { label: 'Porcher',  color: '#92400e', bg: 'rgba(244, 162, 97, 0.18)' },
  ASSISTANT:{ label: 'Assistant',color: '#1f2937', bg: 'rgba(31, 41, 55, 0.08)' },
  GERANT:   { label: 'Gérant',   color: '#1f2937', bg: 'rgba(31, 41, 55, 0.08)' },
};

function getRoleStyle(role: string) {
  return ROLE_LABELS[role] ?? { label: role || 'Membre', color: '#1f2937', bg: 'rgba(31, 41, 55, 0.08)' };
}

function initialOf(member: TeamMember): string {
  const src = member.full_name?.trim() || member.email?.trim() || member.id;
  return (src.charAt(0) || '?').toUpperCase();
}

export const MonEquipeV70: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    supabase
      .from('profiles')
      .select('id, email, role, full_name')
      .order('role', { ascending: true })
      .then(({ data, error: fetchErr }) => {
        if (!mounted) return;
        if (fetchErr) {
          // Fallback gracieux si table inaccessible (ex : RLS, table absente).
          if (fetchErr.code === '42P01' || /relation .* does not exist/i.test(fetchErr.message)) {
            setMembers([]);
            setError(null);
          } else {
            setError('Impossible de charger l\'équipe.');
            setMembers([]);
          }
        } else {
          setMembers((data ?? []) as TeamMember[]);
        }
        setLoading(false);
      }, (err: unknown) => {
        if (!mounted) return;
        console.error('[MonEquipeV70] profiles fetch failed', err);
        setError('Impossible de charger l\'équipe.');
        setMembers([]);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const byRole: Record<string, number> = {};
    members.forEach((m) => {
      const k = (m.role || 'AUTRE').toUpperCase();
      byRole[k] = (byRole[k] ?? 0) + 1;
    });
    return {
      total: members.length,
      owners: (byRole.OWNER ?? 0) + (byRole.ADMIN ?? 0),
      porchers: (byRole.PORCHER ?? 0) + (byRole.WORKER ?? 0),
      autres: members.length - ((byRole.OWNER ?? 0) + (byRole.ADMIN ?? 0) + (byRole.PORCHER ?? 0) + (byRole.WORKER ?? 0)),
    };
  }, [members]);

  return (
    <div
      className="phone-content"
      style={{ padding: 24, maxWidth: 600, margin: '0 auto', position: 'relative', minHeight: '100%' }}
    >
      <div
        style={{
          position: 'relative',
          height: 160,
          marginBottom: 16,
          borderRadius: 16,
          overflow: 'hidden',
          background: `url('${PAGE_BACKGROUND_SRC}') center/cover no-repeat`,
        }}
        aria-hidden="true"
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(6,78,59,0.55) 100%)',
          }}
        />
        <span
          className="ft-heading"
          style={{
            position: 'absolute',
            left: 16,
            bottom: 12,
            color: 'white',
            fontSize: 14,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            fontWeight: 700,
            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }}
        >
          Mon équipe
        </span>
      </div>

      <PageHeader
        eyebrow="Configuration · Équipe"
        title="Mon équipe"
        subtitle="Gérer rôles et accès"
      />

      <section style={{ marginTop: 8 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
          }}
        >
          {[
            { value: stats.total, label: 'Membres' },
            { value: stats.owners, label: 'Owners' },
            { value: stats.porchers, label: 'Porchers' },
          ].map((kpi) => (
            <article
              key={kpi.label}
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-card, 24px)',
                padding: '18px 12px',
                border: '1px solid var(--line)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  color: 'var(--ink)',
                }}
              >
                {kpi.value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  marginTop: 4,
                }}
              >
                {kpi.label}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            marginBottom: 10,
            fontWeight: 500,
          }}
        >
          Membres
        </div>

        {loading && (
          <div
            style={{
              padding: 18,
              background: 'var(--bg-surface)',
              border: '1px solid var(--line)',
              borderRadius: 16,
              fontSize: 13,
              color: 'var(--muted)',
              textAlign: 'center',
            }}
          >
            Chargement…
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              padding: 18,
              background: 'var(--bg-surface)',
              border: '1px solid var(--line)',
              borderRadius: 16,
              fontSize: 13,
              color: '#a4453d',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && members.length === 0 && (
          <div
            style={{
              padding: 18,
              background: 'var(--bg-surface)',
              border: '1px solid var(--line)',
              borderRadius: 16,
              fontSize: 13,
              color: 'var(--muted)',
              textAlign: 'center',
            }}
          >
            Aucun membre enregistré.
          </div>
        )}

        {!loading && !error && members.map((m) => {
          const roleStyle = getRoleStyle((m.role || '').toUpperCase());
          const isYou = profile?.id === m.id;
          const displayName = m.full_name?.trim() || m.email || m.id.substring(0, 8) + '…';
          return (
            <article
              key={m.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--line)',
                borderRadius: 16,
                marginBottom: 10,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'var(--pt-primary, #064e3b)',
                  color: 'white',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                {initialOf(m)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayName}
                  {isYou && (
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, marginLeft: 6 }}>
                      (vous)
                    </span>
                  )}
                </div>
                {m.email && m.email !== displayName && (
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--muted)',
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.email}
                  </div>
                )}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '5px 10px',
                  borderRadius: 999,
                  color: roleStyle.color,
                  background: roleStyle.bg,
                  flexShrink: 0,
                }}
              >
                {roleStyle.label}
              </span>
            </article>
          );
        })}
      </section>

      <section style={{ marginTop: 32, marginBottom: 32 }}>
        <button
          type="button"
          onClick={() => navigate('/admin')}
          aria-label="Modifier l'équipe"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 18px',
            background: 'var(--pt-primary, #064e3b)',
            color: 'white',
            border: 'none',
            borderRadius: 16,
            cursor: 'pointer',
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            justifyContent: 'center',
          }}
        >
          Modifier l'équipe
          <ChevronRight size={18} aria-hidden />
        </button>
        <p
          style={{
            fontSize: 12,
            color: 'var(--muted)',
            marginTop: 10,
            textAlign: 'center',
          }}
        >
          Console admin (rôles, invitations) — refonte V71+.
        </p>
      </section>
    </div>
  );
};

export default MonEquipeV70;
