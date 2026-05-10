/**
 * V70 — Page Ma ferme (route /reglages/ma-ferme)
 *
 * V71 P1.7 — landing V70 cohérent (header monumental + cards arrondies)
 * remplaçant le pont direct vers le legacy SystemManagement.
 *
 * L'édition réelle (formulaire farm, profil, mot de passe) reste pour
 * l'instant déléguée au legacy /reglages/systeme via le CTA bas de page.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFarm } from '../../context/FarmContext';
import { PageHeader } from '../components/ds/PageHeader';
import { fetchFarm, type FarmInfo } from '../../services/settingsService';
import FarmSwitcher from '../../components/FarmSwitcher';


interface InfoCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
}

const InfoCard: React.FC<InfoCardProps> = ({ label, value, hint }) => (
  <article
    style={{
      background: 'var(--bg-surface)',
      borderRadius: 'var(--radius-card, 24px)',
      padding: '20px 22px',
      border: '1px solid var(--line)',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      marginBottom: 12,
    }}
  >
    <div
      style={{
        fontSize: 11,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        marginBottom: 8,
        fontWeight: 500,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 18,
        fontFamily: 'var(--font-heading)',
        fontWeight: 700,
        color: 'var(--ink)',
        lineHeight: 1.3,
      }}
    >
      {value}
    </div>
    {hint && (
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{hint}</div>
    )}
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
    <div
      className="phone-content"
      style={{ padding: 24, maxWidth: 600, margin: '0 auto', minHeight: '100%' }}
    >
      <div style={{ marginBottom: 12 }}>
        <FarmSwitcher />
      </div>

      <PageHeader
        eyebrow="Configuration"
        title="Ma ferme"
        subtitle="Identité, secteur, devise"
        onBack={() => navigate('/reglages')}
      />

      <section style={{ marginTop: 8 }}>
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
          Identité
        </div>
        <InfoCard label="Nom de la ferme" value={farmName} />
        <InfoCard
          label="Code"
          value={
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, letterSpacing: 0.4 }}>
              {farmShortId}
            </span>
          }
          hint="Identifiant interne"
        />
        <InfoCard label="Propriétaire" value={ownerLabel} />
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
          Localisation
        </div>
        <InfoCard label="Pays" value={country} />
        <InfoCard label="Secteur" value={sector} />
        <InfoCard label="Devise" value={currency || 'FCFA'} hint="Dérivée du pays" />
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
          Bilan
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
          }}
        >
          <article
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-card, 24px)',
              padding: '18px 16px',
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
              {truies?.length ?? 0}
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
              Truies
            </div>
          </article>
          <article
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-card, 24px)',
              padding: '18px 16px',
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
              {verrats?.length ?? 0}
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
              Verrats
            </div>
          </article>
          <article
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-card, 24px)',
              padding: '18px 16px',
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
              {bandes?.length ?? 0}
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
              Bandes
            </div>
          </article>
        </div>
      </section>

      <section style={{ marginTop: 32, marginBottom: 32 }}>
        <button
          type="button"
          onClick={() => navigate('/reglages/systeme')}
          aria-label="Modifier l'identité de la ferme"
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
          Modifier la ferme
          <ChevronRight size={18} aria-hidden />
        </button>
      </section>
    </div>
  );
};

export default MaFermeV70;
