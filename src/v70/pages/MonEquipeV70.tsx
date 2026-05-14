/**
 * V70 — Page Mon équipe (route /reglages/mon-equipe)
 *
 * V71-P3 — multi-farm aware :
 *  - liste les `farm_members` de la `currentFarmId` (avec leur rôle effectif)
 *  - bouton "Inviter un membre" visible si currentRole ∈ {OWNER, ADMIN}
 *  - BottomSheet form (email + rôle) → INSERT farm_members
 *  - vérification user existant via lookup `profiles.email` (RLS-safe)
 *
 * V77.1 — polish : styles partagés extraits. Boutons CTA via
 * `.btn--primary btn--block` (constitution V77.1 — pas de --lg).
 *
 * Phase 3 (design senior) — l'écran porte le rôle, pas un annuaire plat :
 *  - bandeau d'effectif en langage éleveur (« 4 personnes : 1 responsable… »)
 *    au lieu de 3 KPI tiles génériques
 *  - fiche membre : avatar teinté au rôle, ce que le rôle autorise sous le
 *    nom, badge de rôle assumé ; la ligne « vous » a un liseré primary
 *  - empty state concret (« Tu es seul sur la ferme » + action utile)
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFarm } from '../../context/FarmContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../services/supabaseClient';
import BottomSheet from '../../components/agritech/BottomSheet';
import FarmSwitcher from '../../components/FarmSwitcher';
import type { FarmRole } from '../../types/farm';


interface TeamMember {
  user_id: string;
  email: string | null;
  role: string;
  full_name: string | null;
}

// V78.4: roles colors — tokenisés sur var(--pt-role-*).
// Phase 3 : `can` = ce que le rôle autorise concrètement, affiché sous le nom.
// C'est l'info qui porte l'écran (qui peut faire quoi sur la ferme).
interface RoleMeta {
  label: string;
  color: string;
  bg: string;
  can: string;
}
const ROLE_LABELS: Record<string, RoleMeta> = {
  OWNER:    { label: 'Owner',    color: 'var(--pt-role-owner-fg)',     bg: 'var(--pt-role-owner-bg)',     can: 'Tous droits, y compris finances' },
  ADMIN:    { label: 'Admin',    color: 'var(--pt-role-admin-fg)',     bg: 'var(--pt-role-admin-bg)',     can: 'Gère la ferme et l’équipe' },
  PORCHER:  { label: 'Porcher',  color: 'var(--pt-role-porcher-fg)',   bg: 'var(--pt-role-porcher-bg)',   can: 'Saisie terrain, pas les finances' },
  WORKER:   { label: 'Porcher',  color: 'var(--pt-role-porcher-fg)',   bg: 'var(--pt-role-porcher-bg)',   can: 'Saisie terrain, pas les finances' },
  ASSISTANT:{ label: 'Assistant',color: 'var(--pt-role-assistant-fg)', bg: 'var(--pt-role-assistant-bg)', can: 'Consultation, saisie limitée' },
  GERANT:   { label: 'Gérant',   color: 'var(--pt-role-gerant-fg)',    bg: 'var(--pt-role-gerant-bg)',    can: 'Suivi et gestion courante' },
};

function getRoleStyle(role: string): RoleMeta {
  return ROLE_LABELS[role] ?? { label: role || 'Membre', color: 'var(--pt-role-gerant-fg)', bg: 'var(--pt-role-gerant-bg)', can: 'Accès de base' };
}

function initialOf(member: TeamMember): string {
  const src = member.full_name?.trim() || member.email?.trim() || member.user_id;
  return (src.charAt(0) || '?').toUpperCase();
}

/* ── Bandeau de tête équipe : effectif réel en une phrase, pas 3 KPI tiles
 * génériques. On annonce la composition de l'équipe comme un éleveur le
 * dirait : « 4 personnes : 1 owner, 3 porchers ». */
const teamBannerStyle: React.CSSProperties = {
  background: 'var(--pt-warm)',
  border: '1px solid var(--pt-warm-deep)',
  borderRadius: 'var(--radius-card, 24px)',
  padding: '18px 20px',
};

const teamCountStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-display)',
  fontSize: 34,
  fontWeight: 800,
  color: 'var(--pt-ink)',
  lineHeight: 1,
  letterSpacing: '-0.01em',
};

const teamBreakdownStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-body)',
  fontSize: 13,
  color: 'var(--pt-accent-deep)',
  marginTop: 6,
  lineHeight: 1.4,
};

/* ── Fiche membre ─────────────────────────────────────────────────────────
 * Plus une row plate : avatar coloré au rôle + nom + ce que le rôle autorise.
 * Le badge de rôle est assumé (pas un micro-pill à 10px coincé à droite). */
const memberRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 13,
  padding: '14px 16px',
  background: 'var(--pt-bg)',
  border: '1px solid var(--pt-line)',
  borderRadius: 18,
  marginBottom: 8,
};

const memberRowYouStyle: React.CSSProperties = {
  ...memberRowStyle,
  border: '1.5px solid var(--pt-primary)',
  background: 'var(--pt-warm)',
};

const memberAvatarStyle: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 15,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--pt-font-display)',
  fontWeight: 800,
  fontSize: 17,
  flexShrink: 0,
};

const memberNameStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-body)',
  fontSize: 14,
  fontWeight: 700,
  color: 'var(--pt-ink)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const memberCanStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-body)',
  fontSize: 11.5,
  color: 'var(--pt-muted)',
  marginTop: 2,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const roleBadgeStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-mono)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  padding: '6px 11px',
  borderRadius: 8,
  flexShrink: 0,
  alignSelf: 'flex-start',
};

const youTagStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-mono)',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--pt-primary)',
  background: 'var(--pt-bg)',
  border: '1px solid var(--pt-primary)',
  borderRadius: 6,
  padding: '2px 6px',
  marginLeft: 8,
  verticalAlign: 'middle',
};

const stateBoxStyle: React.CSSProperties = {
  padding: 18,
  background: 'var(--pt-bg)',
  border: '1px solid var(--pt-line)',
  borderRadius: 16,
  fontSize: 13,
  color: 'var(--pt-muted)',
  textAlign: 'center',
};

const emptyStateStyle: React.CSSProperties = {
  padding: '28px 20px',
  background: 'var(--pt-bg)',
  border: '1px dashed var(--pt-line-strong)',
  borderRadius: 18,
  textAlign: 'center',
};

const ROLE_OPTIONS: Array<{ value: FarmRole; title: string; subtitle: string }> = [
  { value: 'PORCHER', title: 'Porcher',  subtitle: 'Saisie terrain · pas d’accès finances' },
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
          'Cet utilisateur n’est pas encore inscrit sur PorcTrack. Demande-lui de créer un compte d’abord.',
          'error',
          4500,
        );
        return;
      }

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
              fontFamily: 'var(--pt-font-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--pt-muted, #6b6357)',
              fontWeight: 600,
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
              border: '1px solid var(--pt-line)',
              background: 'var(--pt-bg, #ffffff)',
              fontFamily: 'var(--pt-font-body)',
              fontSize: 15,
              color: 'var(--pt-ink, #1a1a1a)',
            }}
          />
        </div>

        <div>
          <span
            style={{
              display: 'block',
              fontFamily: 'var(--pt-font-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--pt-muted, #6b6357)',
              fontWeight: 600,
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
                    background: active ? 'var(--pt-warm, #F5E9D8)' : 'var(--pt-bg, #ffffff)',
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
                        fontFamily: 'var(--pt-font-display)',
                        fontWeight: 800,
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
          className="btn btn--primary btn--block"
        >
          {submitting ? 'Envoi…' : 'Envoyer l’invitation'}
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
      const { data: rows, error: fetchErr } = await supabase
        .from('farm_members')
        .select('user_id, role')
        .eq('farm_id', currentFarmId);
      if (!mounted) return;
      if (fetchErr || !Array.isArray(rows)) {
        setError('Impossible de charger l’équipe.');
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
    const owners = (byRole.OWNER ?? 0) + (byRole.ADMIN ?? 0);
    const porchers = (byRole.PORCHER ?? 0) + (byRole.WORKER ?? 0);
    const autres = members.length - owners - porchers;
    const parts: string[] = [];
    if (owners > 0) parts.push(`${owners} ${owners > 1 ? 'responsables' : 'responsable'}`);
    if (porchers > 0) parts.push(`${porchers} ${porchers > 1 ? 'porchers' : 'porcher'}`);
    if (autres > 0) parts.push(`${autres} ${autres > 1 ? 'autres' : 'autre'}`);
    return {
      total: members.length,
      owners,
      porchers,
      autres,
      breakdown: parts.join(' · '),
    };
  }, [members]);

  return (
    <div className="pt-screen">
      <header className="ph ph--primary">
        <div className="ph__row">
          <div style={{ flex: 1 }}>
            <button
              type="button"
              onClick={() => navigate('/reglages')}
              aria-label="Retour aux réglages"
              className="iconbtn"
              style={{ marginBottom: 10 }}
            >
              <ChevronLeft size={16} strokeWidth={2} aria-hidden />
            </button>
            <div className="ph__eyebrow">Configuration · Équipe</div>
            <h1 className="ph__h1">Mon équipe</h1>
            <p className="ph__sub">Gérer rôles et accès</p>
          </div>
        </div>
      </header>

      <div
        className="phone-content"
        style={{ padding: '0 24px 24px', maxWidth: 600, margin: '0 auto', position: 'relative' }}
      >
        <div style={{ marginBottom: 12 }}>
          <FarmSwitcher />
        </div>

        {!loading && !error && members.length > 0 && (
          <section className="section">
            <div style={teamBannerStyle}>
              <div style={teamCountStyle}>
                {stats.total} {stats.total > 1 ? 'personnes' : 'personne'}
              </div>
              {stats.breakdown && (
                <div style={teamBreakdownStyle}>{stats.breakdown} sur la ferme</div>
              )}
            </div>
          </section>
        )}

        {canInvite && (
          <section className="section">
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              aria-label="Inviter un membre dans la ferme"
              className="btn btn--primary btn--block"
            >
              <UserPlus size={18} aria-hidden />
              Inviter un membre
            </button>
          </section>
        )}

        <section className="section">
          <div className="section__label">Qui travaille ici</div>

          {loading && <div style={stateBoxStyle}>Chargement de l’équipe…</div>}

          {!loading && error && (
            <div style={{ ...stateBoxStyle, color: 'var(--pt-danger)' }}>{error}</div>
          )}

          {!loading && !error && members.length === 0 && (
            <div style={emptyStateStyle}>
              <div
                style={{
                  fontFamily: 'var(--pt-font-display)',
                  fontSize: 17,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: 'var(--pt-ink)',
                  marginBottom: 6,
                }}
              >
                Tu es seul sur la ferme
              </div>
              <p style={{ fontSize: 13, color: 'var(--pt-muted)', lineHeight: 1.5, margin: 0 }}>
                {canInvite
                  ? 'Ajoute un porcher pour qu’il puisse saisir les pesées et les soins depuis son téléphone.'
                  : 'Le propriétaire n’a encore invité personne d’autre.'}
              </p>
            </div>
          )}

          {!loading && !error && members.map((m) => {
            const roleStyle = getRoleStyle((m.role || '').toUpperCase());
            const isYou = profile?.id === m.user_id;
            const displayName = m.full_name?.trim() || m.email || m.user_id.substring(0, 8) + '…';
            return (
              <article key={m.user_id} style={isYou ? memberRowYouStyle : memberRowStyle}>
                <span
                  aria-hidden
                  style={{
                    ...memberAvatarStyle,
                    background: roleStyle.bg,
                    color: roleStyle.color,
                  }}
                >
                  {initialOf(m)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={memberNameStyle}>
                    {displayName}
                    {isYou && <span style={youTagStyle}>Vous</span>}
                  </div>
                  <div style={memberCanStyle}>{roleStyle.can}</div>
                </div>
                <span style={{ ...roleBadgeStyle, color: roleStyle.color, background: roleStyle.bg }}>
                  {roleStyle.label}
                </span>
              </article>
            );
          })}
        </section>

        <section className="section" style={{ marginTop: 32, marginBottom: 32 }}>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            aria-label="Modifier l’équipe"
            className="btn btn--primary btn--block"
          >
            Modifier l’équipe
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
    </div>
  );
};

export default MonEquipeV70;
