/**
 * V70 — Page Mon équipe (route /reglages/mon-equipe)
 *
 * V71-P3 — multi-farm aware :
 *  - liste les `farm_members` de la `currentFarmId` (avec leur rôle effectif)
 *  - bouton "Inviter un membre" visible si currentRole ∈ {OWNER, ADMIN}
 *  - BottomSheet form (email + rôle) → INSERT farm_members
 *  - vérification user existant via lookup `profiles.email` (RLS-safe)
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../services/supabaseClient';
import { PageHeader } from '../components/ds/PageHeader';
import BottomSheet from '../../components/agritech/BottomSheet';
import FarmSwitcher from '../../components/FarmSwitcher';
import type { FarmRole } from '../../types/farm';

const PAGE_BACKGROUND_SRC = '/images/ambiance-ux.webp';

interface TeamMember {
  user_id: string;
  email: string | null;
  role: string;
  full_name: string | null;
}

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  OWNER:    { label: 'Owner',    color: '#2d4a1f', bg: '#cce0bf' },
  ADMIN:    { label: 'Admin',    color: '#6b4910', bg: '#f4dcb6' },
  PORCHER:  { label: 'Porcher',  color: '#92400e', bg: 'rgba(244, 162, 97, 0.18)' },
  WORKER:   { label: 'Porcher',  color: '#92400e', bg: 'rgba(244, 162, 97, 0.18)' },
  ASSISTANT:{ label: 'Assistant',color: '#1f2937', bg: 'rgba(31, 41, 55, 0.08)' },
  GERANT:   { label: 'Gérant',   color: '#1f2937', bg: 'rgba(31, 41, 55, 0.08)' },
};

function getRoleStyle(role: string) {
  return ROLE_LABELS[role] ?? { label: role || 'Membre', color: '#1f2937', bg: 'rgba(31, 41, 55, 0.08)' };
}

function initialOf(member: TeamMember): string {
  const src = member.full_name?.trim() || member.email?.trim() || member.user_id;
  return (src.charAt(0) || '?').toUpperCase();
}

const ROLE_OPTIONS: Array<{ value: FarmRole; title: string; subtitle: string }> = [
  { value: 'PORCHER', title: 'Porcher',  subtitle: 'Saisie terrain · pas d\'accès finances' },
  { value: 'ADMIN',   title: 'Admin',    subtitle: 'Gestion ferme + équipe' },
  { value: 'OWNER',   title: 'Owner',    subtitle: 'Tous droits, y compris finances' },
];

interface InviteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onInvited: () => void;
  currentFarmId: string;
}

const InviteSheet: React.FC<InviteSheetProps> = ({ isOpen, onClose, onInvited, currentFarmId }) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<FarmRole>('PORCHER');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset à la fermeture
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setRole('PORCHER');
      setSubmitting(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      setErrorMsg('Email invalide.');
      return;
    }
    setSubmitting(true);
    try {
      // 1. Lookup user via profiles.email (RLS — l'utilisateur doit voir le profil cible).
      const { data: profileRow, error: lookupErr } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', cleanEmail)
        .maybeSingle();
      if (lookupErr) {
        showToast('Erreur lookup user. Réessaie plus tard.', 'error');
        return;
      }
      if (!profileRow?.id) {
        showToast(
          "Cet utilisateur n'est pas encore inscrit sur PorcTrack. Demande-lui de créer un compte d'abord.",
          'error',
          4500,
        );
        return;
      }

      // 2. INSERT farm_members
      const { error: insertErr } = await supabase
        .from('farm_members')
        .insert({
          farm_id: currentFarmId,
          user_id: profileRow.id,
          role,
          invited_by: user?.id ?? null,
        });
      if (insertErr) {
        if (insertErr.code === '23505') {
          showToast('Cet utilisateur est déjà membre de la ferme.', 'error');
        } else {
          showToast(`Erreur invitation : ${insertErr.message}`, 'error');
        }
        return;
      }

      const roleLabel = ROLE_OPTIONS.find((r) => r.value === role)?.title ?? role;
      showToast(`${cleanEmail} ajouté avec rôle ${roleLabel}`, 'success');
      onInvited();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }, [email, role, currentFarmId, user, showToast, onInvited, onClose]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Inviter un membre" height="auto">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label
            htmlFor="invite-email"
            style={{
              display: 'block',
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--pt-muted, #6b6357)',
              fontWeight: 500,
              marginBottom: 6,
            }}
          >
            Email du membre
          </label>
          <input
            id="invite-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ex: porcher@ferme.fr"
            required
            disabled={submitting}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid var(--pt-line, rgba(26,26,26,0.16))',
              background: 'var(--bg-surface, #ffffff)',
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              color: 'var(--pt-ink, #1a1a1a)',
            }}
          />
        </div>

        <div>
          <span
            style={{
              display: 'block',
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--pt-muted, #6b6357)',
              fontWeight: 500,
              marginBottom: 8,
            }}
          >
            Rôle
          </span>
          <div role="radiogroup" aria-label="Rôle du membre" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ROLE_OPTIONS.map((opt) => {
              const active = role === opt.value;
              return (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '12px 14px',
                    borderRadius: 14,
                    border: `1.5px solid ${active ? 'var(--pt-primary, #2D4A1F)' : 'var(--pt-line, rgba(26,26,26,0.08))'}`,
                    background: active ? 'var(--pt-warm, #F5E9D8)' : 'var(--bg-surface, #ffffff)',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'border-color 200ms ease, background 200ms ease',
                  }}
                >
                  <input
                    type="radio"
                    name="invite-role"
                    value={opt.value}
                    checked={active}
                    onChange={() => setRole(opt.value)}
                    disabled={submitting}
                    style={{ marginTop: 2, accentColor: 'var(--pt-primary, #2D4A1F)' }}
                  />
                  <span style={{ flex: 1 }}>
                    <span
                      style={{
                        display: 'block',
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 700,
                        fontSize: 13,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: 'var(--pt-ink, #1a1a1a)',
                      }}
                    >
                      {opt.title}
                    </span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--pt-muted, #6b6357)', marginTop: 2 }}>
                      {opt.subtitle}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            style={{
              padding: '10px 12px',
              background: 'rgba(164, 69, 61, 0.08)',
              border: '1px solid rgba(164, 69, 61, 0.24)',
              borderRadius: 12,
              fontSize: 13,
              color: 'var(--pt-danger, #a4453d)',
            }}
          >
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !email.trim()}
          style={{
            width: '100%',
            padding: '14px 18px',
            background: submitting ? 'var(--pt-muted, #6b6357)' : 'var(--pt-primary, #2D4A1F)',
            color: 'white',
            border: 'none',
            borderRadius: 16,
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {submitting ? 'Envoi…' : "Envoyer l'invitation"}
        </button>
      </form>
    </BottomSheet>
  );
};

export const MonEquipeV70: React.FC = () => {
  const navigate = useNavigate();
  const { profile, currentRole } = useAuth();
  const { currentFarmId } = useFarm();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const canInvite = currentRole === 'OWNER' || currentRole === 'ADMIN';

  useEffect(() => {
    if (!currentFarmId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    setError(null);
    void (async () => {
      // Pas de FK déclarée farm_members → profiles dans le schema Supabase :
      // on fait deux requêtes (membres puis profiles.id IN (...)) et on
      // hydrate côté client.
      const { data: rows, error: fetchErr } = await supabase
        .from('farm_members')
        .select('user_id, role')
        .eq('farm_id', currentFarmId);
      if (!mounted) return;
      if (fetchErr || !Array.isArray(rows)) {
        setError("Impossible de charger l'équipe.");
        setMembers([]);
        setLoading(false);
        return;
      }
      const ids = rows.map((r) => r.user_id as string);
      const profMap = new Map<string, { email: string | null; full_name: string | null }>();
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', ids);
        if (!mounted) return;
        (profs ?? []).forEach((p) => {
          profMap.set(p.id as string, {
            email: (p.email as string | null) ?? null,
            full_name: (p.full_name as string | null) ?? null,
          });
        });
      }
      setMembers(
        rows.map((r) => ({
          user_id: r.user_id as string,
          role: (r.role as string) || 'PORCHER',
          email: profMap.get(r.user_id as string)?.email ?? null,
          full_name: profMap.get(r.user_id as string)?.full_name ?? null,
        })),
      );
      setLoading(false);
    })().catch((err: unknown) => {
      if (!mounted) return;
      console.error('[MonEquipeV70] farm_members fetch failed', err);
      setError('Impossible de charger l\'équipe.');
      setMembers([]);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [currentFarmId, refreshTick]);

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
      <div style={{ marginBottom: 12 }}>
        <FarmSwitcher />
      </div>
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

      {canInvite && (
        <section style={{ marginTop: 20 }}>
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            aria-label="Inviter un membre dans la ferme"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '14px 18px',
              background: 'var(--pt-accent, #B8703D)',
              color: 'white',
              border: 'none',
              borderRadius: 16,
              cursor: 'pointer',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <UserPlus size={18} aria-hidden />
            Inviter un membre
          </button>
        </section>
      )}

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
          const isYou = profile?.id === m.user_id;
          const displayName = m.full_name?.trim() || m.email || m.user_id.substring(0, 8) + '…';
          return (
            <article
              key={m.user_id}
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
      </section>

      {currentFarmId && (
        <InviteSheet
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
          onInvited={() => setRefreshTick((n) => n + 1)}
          currentFarmId={currentFarmId}
        />
      )}
    </div>
  );
};

export default MonEquipeV70;
