/**
 * V70 — Page Ma ferme (route /reglages/ma-ferme)
 *
 * V77 — uniformisation namespace `.pt-screen` + header `.ph--primary`.
 * Cards d'identité/localisation/bilan : .card-link + .section.
 *
 * V77 — hint devise corrigé : "Devise plateforme — FCFA" (cohérent V43.3,
 * la plateforme est FCFA only, pas dérivée du pays).
 *
 * V77.1 — polish visuel : InfoCard + StatTile partagent un style cohérent
 * (label mono uppercase, valeur display 800, hint muted). CTA bas via
 * `.btn--primary btn--block` (constitution V77.1, plus de variantes --lg).
 *
 * L'édition réelle (formulaire farm, profil, mot de passe) reste pour
 * l'instant déléguée au legacy /reglages/systeme via le CTA bas de page.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFarm } from '../../context/FarmContext';
import { fetchFarm, type FarmInfo } from '../../services/settingsService';
import FarmSwitcher from '../../components/FarmSwitcher';

const infoCardStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  borderRadius: 'var(--radius-card, 24px)',
  padding: '18px 20px',
  border: '1px solid var(--line)',
  marginBottom: 10,
};

const infoLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-mono)',
  fontSize: 10,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginBottom: 6,
  fontWeight: 600,
};

const infoValueStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-display)',
  fontSize: 18,
  fontWeight: 800,
  color: 'var(--ink)',
  lineHeight: 1.25,
  letterSpacing: '-0.005em',
};

const infoHintStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--muted)',
  marginTop: 6,
};

interface InfoCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
}

const InfoCard: React.FC<InfoCardProps> = ({ label, value, hint }) => (
  <article style={infoCardStyle}>
    <div style={infoLabelStyle}>{label}</div>
    <div style={infoValueStyle}>{value}</div>
    {hint && <div style={infoHintStyle}>{hint}</div>}
  </article>
);

const statTileStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  borderRadius: 'var(--radius-card, 24px)',
  padding: '18px 12px',
  border: '1px solid var(--line)',
  textAlign: 'center',
};

const statValueStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-display)',
  fontSize: 28,
  fontWeight: 800,
  color: 'var(--ink)',
  lineHeight: 1,
};

const statLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-mono)',
  fontSize: 10,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
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

export const MaFermeV70: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { nomFerme, pays, currency, truies, verrats, bandes } = useFarm();

  const [farm, setFarm] = useState<FarmInfo | null>(null);

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
          <InfoCard label="Nom de la ferme" value={farmName} />
          <InfoCard
            label="Code"
            value={
              <span
                style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 14, letterSpacing: '0.06em' }}
              >
                {farmShortId}
              </span>
            }
            hint="Identifiant interne"
          />
          <InfoCard label="Propriétaire" value={ownerLabel} />
        </section>

        <section className="section">
          <div className="section__label">Localisation</div>
          <InfoCard label="Pays" value={country} />
          <InfoCard label="Secteur" value={sector} />
          <InfoCard
            label="Devise"
            value={currency || 'FCFA'}
            hint="Devise plateforme — FCFA"
          />
        </section>

        <section className="section">
          <div className="section__label">Bilan</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <StatTile value={truies?.length ?? 0} label="Truies" />
            <StatTile value={verrats?.length ?? 0} label="Verrats" />
            <StatTile value={bandes?.length ?? 0} label="Bandes" />
          </div>
        </section>

        <section className="section" style={{ marginTop: 32, marginBottom: 32 }}>
          <button
            type="button"
            onClick={() => navigate('/reglages/systeme')}
            aria-label="Modifier l’identité de la ferme"
            className="btn--primary btn--block"
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
