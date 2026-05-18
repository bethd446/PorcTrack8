/**
 * V70 — Page Ma ferme (route /reglages/ma-ferme)
 *
 * V77 — uniformisation namespace `.pt-screen` + header `.ph--primary`.
 * Cards d'identité/localisation/bilan : .card-link + .section.
 *
 * V77 — hint devise corrigé : "Devise plateforme — FCFA" (cohérent V43.3,
 * la plateforme est FCFA only, pas dérivée du pays).
 *
 * V77.1 — polish visuel : StatTile + styles partagés.
 *
 * Phase 3 (design senior) — hiérarchie tranchée : plaque d'identité de tête
 * (monogramme + nom + code) au lieu de rows uniformes ; champs regroupés en
 * panneaux denses (FieldRow, filets internes) ; cartes profil avec marqueur
 * de sélection assumé. La valeur porte le poids, le label reste discret.
 *
 * L'édition réelle (formulaire farm, profil, mot de passe) reste pour
 * l'instant déléguée au legacy /reglages/systeme via le CTA bas de page.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFarm, useMeta } from '../../context/FarmContext';
import { fetchFarm, type FarmInfo } from '../../services/settingsService';
import FarmSwitcher from '../../components/FarmSwitcher';
import { useFarmProfile } from '../../hooks/useFarmProfile';
import {
  FARM_PROFILES,
  setFarmProfile,
  type FarmProfile,
} from '../../lib/farmProfile';
import { useToast } from '../../context/ToastContext';
import { PPABiosecurityChecklist } from '../components/PPABiosecurityChecklist';

/* ── Plaque d'identité ferme ──────────────────────────────────────────────
 * Bloc de tête : monogramme + nom + code. C'est la présence de la ferme,
 * pas une row de formulaire. Traité comme l'en-tête d'un cahier d'éleveur. */
const farmPlateStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  background: 'var(--pt-warm)',
  border: '1px solid var(--pt-warm-deep)',
  borderRadius: 'var(--pt-radius-lg)',
  padding: '20px 20px',
  marginBottom: 12,
};

const farmMonogramStyle: React.CSSProperties = {
  width: 60,
  height: 60,
  borderRadius: 18,
  background: 'var(--pt-primary)',
  color: 'var(--pt-warm)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--pt-font-display)',
  fontWeight: 800,
  fontSize: 26,
  lineHeight: 1,
  flexShrink: 0,
};

const farmNameStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-display)',
  fontSize: 24,
  fontWeight: 800,
  color: 'var(--pt-ink)',
  lineHeight: 1.05,
  letterSpacing: '-0.01em',
  textTransform: 'uppercase',
};

const farmCodeStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-mono)',
  fontSize: 12,
  letterSpacing: '0.08em',
  color: 'var(--pt-accent-deep)',
  marginTop: 5,
};

/* ── Lignes de fiche (paires label/valeur denses) ─────────────────────────
 * Plus de cards-rows uniformes : un seul panneau, lignes séparées par un
 * filet. La valeur porte le poids, le label reste discret en mono. */
const fieldPanelStyle: React.CSSProperties = {
  background: 'var(--pt-bg)',
  border: '1px solid var(--pt-line)',
  borderRadius: 'var(--pt-radius-lg)',
  overflow: 'hidden',
};

const fieldRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 16,
  padding: '14px 18px',
  borderTop: '1px solid var(--pt-line)',
};

const fieldRowFirstStyle: React.CSSProperties = {
  ...fieldRowStyle,
  borderTop: 'none',
};

const fieldLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-mono)',
  fontSize: 10,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--pt-muted)',
  fontWeight: 600,
  flexShrink: 0,
};

const fieldValueStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-display)',
  fontSize: 16,
  fontWeight: 800,
  color: 'var(--pt-ink)',
  lineHeight: 1.2,
  textAlign: 'right',
  minWidth: 0,
};

const fieldHintStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-body)',
  fontSize: 11,
  fontWeight: 400,
  color: 'var(--pt-subtle)',
  marginTop: 2,
};

interface FieldRowProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  first?: boolean;
}

const FieldRow: React.FC<FieldRowProps> = ({ label, value, hint, first }) => (
  <div style={first ? fieldRowFirstStyle : fieldRowStyle}>
    <span style={fieldLabelStyle}>{label}</span>
    <span style={{ textAlign: 'right', minWidth: 0 }}>
      <span style={fieldValueStyle}>{value}</span>
      {hint && <span style={{ ...fieldHintStyle, display: 'block' }}>{hint}</span>}
    </span>
  </div>
);

const statTileStyle: React.CSSProperties = {
  background: 'var(--pt-bg)',
  borderRadius: 'var(--pt-radius-lg)',
  padding: '18px 12px',
  border: '1px solid var(--pt-line)',
  textAlign: 'center',
};

const statValueStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-display)',
  fontSize: 30,
  fontWeight: 800,
  color: 'var(--pt-ink)',
  lineHeight: 1,
};

const statLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-mono)',
  fontSize: 10,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--pt-muted)',
  marginTop: 6,
  fontWeight: 600,
};

interface StatTileProps {
  value: React.ReactNode;
  label: string;
}

const StatTile: React.FC<StatTileProps> = ({ value, label }) => (
  <article style={statTileStyle}>
    <div style={statValueStyle}>{value}</div>
    <div style={statLabelStyle}>{label}</div>
  </article>
);

/* ── Carte de profil d'élevage (sélecteur) ────────────────────────────── */
const profileCardBase: React.CSSProperties = {
  textAlign: 'left',
  padding: '14px 16px',
  borderRadius: 16,
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  fontFamily: 'var(--pt-font-body)',
  transition:
    'border-color 160ms var(--pt-ease), background 160ms var(--pt-ease), opacity 160ms var(--pt-ease)',
};

const profileCardSelected: React.CSSProperties = {
  ...profileCardBase,
  border: '1.5px solid var(--pt-primary)',
  background: 'var(--pt-warm)',
};

const profileCardIdle: React.CSSProperties = {
  ...profileCardBase,
  border: '1.5px solid var(--pt-line-strong)',
  background: 'var(--pt-bg)',
};

const profileCheckStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 999,
  background: 'var(--pt-primary)',
  color: 'var(--pt-warm)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

export const MaFermeV70: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { nomFerme, pays, currency, truies, verrats, bandes } = useFarm();
  const { currentFarmId } = useMeta();
  const profil = useFarmProfile();
  const { showToast } = useToast();
  const [savingProfil, setSavingProfil] = useState(false);

  const [farm, setFarm] = useState<FarmInfo | null>(null);

  const handleSetProfil = async (next: FarmProfile) => {
    if (!currentFarmId || savingProfil || next === profil) return;
    setSavingProfil(true);
    try {
      await setFarmProfile(currentFarmId, next);
      const label = FARM_PROFILES.find((p) => p.value === next)?.label ?? next;
      showToast(`Type d'élevage : ${label}`, 'success', 2500);
      // Reload léger pour rafraîchir le hook (qui re-fetch metadata au mount).
      window.location.reload();
    } catch (err) {
      console.error('setFarmProfile failed', err);
      showToast((err as Error).message ?? 'Erreur — réessaie', 'error', 4000);
      setSavingProfil(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    if (user?.id) {
      void fetchFarm(user.id).then((f) => {
        if (mounted) setFarm(f);
      });
    }
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const farmName = farm?.nomFerme || farm?.nom || nomFerme || 'Ma ferme';
  const farmShortId = farm
    ? `${(farmName || 'FARM').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'FARM'}-${farm.id.substring(0, 6).toUpperCase()}`
    : '—';
  const sector = farm?.secteur ?? '—';
  const country = farm?.pays || pays || '—';
  const ownerLabel = profile?.full_name?.trim() || profile?.email || 'Owner';
  const farmMonogram =
    farmName.trim().replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || 'PT';
  const cheptelTotal = (truies?.length ?? 0) + (verrats?.length ?? 0);

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
            <div className="ph__eyebrow">Configuration</div>
            <h1 className="ph__h1">Ma ferme</h1>
            <p className="ph__sub">Identité, secteur, devise</p>
          </div>
        </div>
      </header>

      <div
        className="phone-content"
        style={{ padding: '0 24px 24px', maxWidth: 600, margin: '0 auto' }}
      >
        <div style={{ marginBottom: 12 }}>
          <FarmSwitcher />
        </div>

        <section className="section">
          <div className="section__label">Identité</div>
          <div style={farmPlateStyle}>
            <span aria-hidden style={farmMonogramStyle}>{farmMonogram}</span>
            <div style={{ minWidth: 0 }}>
              <div style={farmNameStyle}>{farmName}</div>
              <div style={farmCodeStyle}>{farmShortId}</div>
            </div>
          </div>
          <div style={fieldPanelStyle}>
            <FieldRow first label="Propriétaire" value={ownerLabel} />
            <FieldRow
              label="Cheptel"
              value={`${cheptelTotal} ${cheptelTotal > 1 ? 'reproducteurs' : 'reproducteur'}`}
              hint={`${truies?.length ?? 0} truies · ${verrats?.length ?? 0} verrats`}
            />
          </div>
        </section>

        <section className="section">
          <div className="section__label">Implantation &amp; devise</div>
          <div style={fieldPanelStyle}>
            <FieldRow first label="Pays" value={country} />
            <FieldRow label="Secteur" value={sector} />
            <FieldRow
              label="Devise"
              value={currency || 'FCFA'}
              hint="Plateforme en FCFA — non modifiable"
            />
          </div>
        </section>

        {/* V80 P0 #1 — Type d'élevage : permet de switcher le profil après
            onboarding (impacte bottom-nav, KPIs Performance et FAB). */}
        <section className="section">
          <div className="section__label">Type d&apos;élevage</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FARM_PROFILES.map((opt) => {
              const selected = opt.value === profil;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => void handleSetProfil(opt.value)}
                  disabled={savingProfil}
                  data-pt-profile-card={opt.value}
                  aria-pressed={selected}
                  style={{
                    ...(selected ? profileCardSelected : profileCardIdle),
                    cursor: savingProfil ? 'wait' : 'pointer',
                    opacity: savingProfil && !selected ? 0.5 : 1,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      color: selected ? 'var(--pt-primary)' : 'var(--pt-muted)',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={22} strokeWidth={2} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: 'var(--pt-font-display)',
                        fontWeight: 800,
                        fontSize: 14,
                        textTransform: 'uppercase',
                        letterSpacing: '0.01em',
                        color: 'var(--pt-ink)',
                        marginBottom: 3,
                      }}
                    >
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--pt-muted)', lineHeight: 1.4 }}>
                      {opt.description}
                    </div>
                  </span>
                  {selected && (
                    <span aria-hidden style={profileCheckStyle}>
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: 'var(--pt-muted)', marginTop: 8, lineHeight: 1.45 }}>
            Le changement adapte le bottom-nav, les KPIs Performance et le FAB Saisir.
          </p>
        </section>

        <section className="section">
          <div className="section__label">Ce que compte la ferme</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <StatTile value={truies?.length ?? 0} label="Truies" />
            <StatTile value={verrats?.length ?? 0} label="Verrats" />
            <StatTile value={bandes?.length ?? 0} label="Bandes" />
          </div>
        </section>

        {/* v3.6.0 — Module PPA (Peste Porcine Africaine).
            Différenciateur marché CI : épizootie 2024 = 100k têtes abattues. */}
        <section className="section">
          <PPABiosecurityChecklist />
        </section>

        <section className="section" style={{ marginTop: 32, marginBottom: 32 }}>
          <button
            type="button"
            onClick={() => navigate('/reglages/systeme')}
            aria-label="Modifier l’identité de la ferme"
            className="btn btn--primary btn--block"
          >
            Modifier la ferme
            <ChevronRight size={18} aria-hidden />
          </button>
        </section>
      </div>
    </div>
  );
};

export default MaFermeV70;
