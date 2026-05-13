/**
 * V70 — Onboarding éducatif (Sprint 6 · refonte mockup v76 3b)
 *
 * Wizard 5 étapes plein écran, skip total (pas de confirmation), navigation
 * Précédent / Continuer. Rejouable depuis Réglages → "Refaire le tutoriel".
 *
 * Étapes :
 *   1. Bienvenue (silhouette + cycle truie 5 nœuds)
 *   2. 14 alertes biologiques (4 cards 2×2)
 *   3. Première truie (mini-form teaser)
 *   4. Saillie (J0 du cycle, 4 dates calculées)
 *   5. KPIs (score-mini + 3 cards-link encyclopédie)
 *
 * Référence pixel-perfect : docs/mockups/onboarding-modals-mockup-v76.html
 * sections id="onboarding-1" à id="onboarding-5".
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Stethoscope,
  Package,
  TrendingUp,
  Banknote,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Check,
  Plus,
  X,
} from 'lucide-react';
import { EntityAvatar } from '../../components/ds/EntityAvatar';

export interface OnboardingEduPageProps {
  onComplete?: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

const TOTAL_STEPS = 5;

// ============================================================================
// Sous-composants — header / footer wizard
// ============================================================================

interface WizardHeaderProps {
  step: Step;
  onSkip: () => void;
  hideSkip?: boolean;
}

const STEP_TITLES: Record<Step, { eyebrow: string; title: string }> = {
  1: { eyebrow: 'Premier démarrage', title: 'Bienvenue' },
  2: { eyebrow: 'Moteur d’alertes', title: 'Alertes' },
  3: { eyebrow: 'Mini-form', title: 'Première truie' },
  4: { eyebrow: 'Cycle vivant', title: 'Saillie · J0' },
  5: { eyebrow: 'Tableau de bord', title: 'Tes KPIs' },
};

const WizardHeader: React.FC<WizardHeaderProps> = ({ step, onSkip, hideSkip }) => {
  const meta = STEP_TITLES[step];
  return (
    <header className="ph ph--primary" style={{ flexShrink: 0 }}>
      <div className="ph__row">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ph__eyebrow">{meta.eyebrow}</div>
          <h1 className="ph__h1">{meta.title}</h1>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="iconbtn"
          style={{
            visibility: hideSkip ? 'hidden' : 'visible',
            width: 'auto',
            padding: '0 10px',
            gap: 4,
            fontFamily: 'var(--pt-font-mono)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          Passer <X size={12} strokeWidth={2} />
        </button>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 6,
          marginTop: 14,
          alignItems: 'center',
        }}
      >
        <span className="step-pill">
          Étape {step} / {TOTAL_STEPS}
        </span>
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: `repeat(${TOTAL_STEPS}, 1fr)`,
            gap: 4,
          }}
        >
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const idx = i + 1;
            const isDone = idx < step;
            const isNow = idx === step;
            return (
              <div
                key={idx}
                style={{
                  height: 3,
                  borderRadius: 99,
                  background: isDone
                    ? 'var(--pt-warm)'
                    : isNow
                      ? 'var(--pt-accent-light)'
                      : 'rgba(245, 233, 216, 0.2)',
                }}
              />
            );
          })}
        </div>
      </div>
    </header>
  );
};

interface WizardFooterProps {
  step: Step;
  onPrev: () => void;
  onNext: () => void;
  isLast: boolean;
}

const WizardFooter: React.FC<WizardFooterProps> = ({ step, onPrev, onNext, isLast }) => (
  <div
    style={{
      flexShrink: 0,
      display: 'grid',
      gridTemplateColumns: 'auto 1fr',
      gap: 8,
      padding: '12px 20px 20px',
      borderTop: '1px solid var(--pt-line)',
      background: 'var(--pt-bg)',
    }}
  >
    <button
      type="button"
      onClick={onPrev}
      disabled={step === 1}
      style={{
        ...wizBtnStyle,
        background: 'transparent',
        color: 'var(--pt-muted)',
        border: '1px solid var(--pt-line-strong)',
        opacity: step === 1 ? 0.4 : 1,
        cursor: step === 1 ? 'not-allowed' : 'pointer',
      }}
    >
      <ChevronLeft size={13} strokeWidth={2} />
      Précédent
    </button>
    <button
      type="button"
      className="btn btn--primary btn--lg btn--block"
      onClick={onNext}
    >
      {isLast ? (
        <>
          <Check size={13} strokeWidth={2} />
          C’est parti — voir mon élevage
        </>
      ) : (
        <>
          Continuer
          <ArrowRight size={13} strokeWidth={2} />
        </>
      )}
    </button>
  </div>
);

const wizBtnStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-mono)',
  fontWeight: 600,
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  padding: '13px 14px',
  borderRadius: 10,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  lineHeight: 1,
};

// ============================================================================
// Tokens texte communs
// ============================================================================

const eyebrowStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-mono)',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--pt-muted)',
  marginBottom: 8,
};

const wizTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-display)',
  fontWeight: 900,
  fontSize: 28,
  lineHeight: 1.05,
  letterSpacing: '-0.01em',
  textTransform: 'uppercase',
  color: 'var(--pt-ink)',
  margin: 0,
};

const wizSubStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.5,
  color: 'var(--pt-muted)',
  margin: '8px 0 16px',
};

// ============================================================================
// Étape 1 — Bienvenue
// ============================================================================

const Step1Welcome: React.FC = () => (
  <>
    <div style={eyebrowStyle}>Premier démarrage · Bienvenue</div>
    <h1 style={wizTitleStyle}>
      Bienvenue dans <b style={{ color: 'var(--pt-primary)' }}>PorcTrack</b>
    </h1>
    <p style={wizSubStyle}>
      L’app GTTT pour les naisseurs-engraisseurs d’Afrique de l’Ouest. Une fois
      configurée, tu n’oublies plus rien — chaque saillie, chaque mise-bas,
      chaque sevrage suivi à la journée.
    </p>

    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '12px 0 24px',
        color: 'var(--pt-primary)',
      }}
      aria-hidden="true"
    >
      <EntityAvatar species="truie" size="xl" />
    </div>

    <div
      style={{
        background: 'var(--pt-warm)',
        border: '1px solid var(--pt-line)',
        borderRadius: 14,
        padding: '14px 16px',
      }}
    >
      <div style={{ ...eyebrowStyle, marginBottom: 10 }}>Cycle truie · 143 jours</div>
      <div className="cycle-mini">
        <div className="cycle-mini__line" />
        <div className="cycle-mini__line-done" style={{ width: '100%' }} />
        <div className="cycle-mini__dot done" style={{ left: '0%' }} />
        <div className="cycle-mini__dot done" style={{ left: '25%' }} />
        <div className="cycle-mini__dot done" style={{ left: '50%' }} />
        <div className="cycle-mini__dot done" style={{ left: '80%' }} />
        <div className="cycle-mini__dot now" style={{ left: '100%' }} />
      </div>
      <div className="cycle-mini__labels">
        <span>Saillie</span>
        <span>Écho J28</span>
        <span>Fœtal J90</span>
        <span>MB J115</span>
        <span className="cur">Sevr. J143</span>
      </div>
    </div>
  </>
);

// ============================================================================
// Étape 2 — Alertes
// ============================================================================

interface AlertCatProps {
  icon: React.ReactNode;
  bg: string;
  count: string;
  title: string;
  examples: string;
}

const AlertCat: React.FC<AlertCatProps> = ({ icon, bg, count, title, examples }) => (
  <div
    className="fact"
    style={{
      background: bg,
      borderRadius: 14,
      padding: '14px 14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      border: '1px solid var(--pt-line)',
    }}
  >
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: 'var(--pt-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--pt-primary)',
        border: '1px solid var(--pt-line)',
      }}
    >
      {icon}
    </div>
    <div
      style={{
        fontFamily: 'var(--pt-font-mono)',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--pt-subtle)',
      }}
    >
      {count}
    </div>
    <h3
      style={{
        fontFamily: 'var(--pt-font-display)',
        fontWeight: 900,
        fontSize: 18,
        lineHeight: 1,
        letterSpacing: '-0.005em',
        textTransform: 'uppercase',
        color: 'var(--pt-ink)',
        margin: 0,
      }}
    >
      {title}
    </h3>
    <div
      style={{
        fontFamily: 'var(--pt-font-mono)',
        fontSize: 11,
        fontStyle: 'italic',
        color: 'var(--pt-muted)',
        lineHeight: 1.4,
      }}
    >
      {examples}
    </div>
  </div>
);

const Step2Alerts: React.FC = () => (
  <>
    <div style={eyebrowStyle}>Moteur d’alertes · 14 règles métier</div>
    <h1 style={wizTitleStyle}>
      <b style={{ color: 'var(--pt-primary)' }}>14 alertes</b> veillent sur ton élevage
    </h1>
    <p style={wizSubStyle}>
      PorcTrack analyse ton troupeau en continu et te ping quand quelque chose
      mérite attention. Pas de spam — uniquement ce qui compte.
    </p>

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
      }}
    >
      <AlertCat
        icon={<Heart size={18} strokeWidth={2} />}
        bg="var(--pt-truie-bg)"
        count="5 règles"
        title="Reproduction"
        examples="Mise-bas imminente · Sevrage dû · Retour chaleur"
      />
      <AlertCat
        icon={<Stethoscope size={18} strokeWidth={2} />}
        bg="var(--pt-warm)"
        count="3 règles"
        title="Santé"
        examples="Mortalité anormale · Portée orpheline · Manque pesée"
      />
      <AlertCat
        icon={<Package size={18} strokeWidth={2} />}
        bg="var(--pt-warm-deep)"
        count="3 règles"
        title="Stock"
        examples="Aliment <2j · Véto bas · Vermifuge rupture"
      />
      <AlertCat
        icon={<TrendingUp size={18} strokeWidth={2} />}
        bg="var(--pt-bande-bg)"
        count="3 règles"
        title="Performance"
        examples="Réforme zootechnique · Surdensité · Prêt abattoir"
      />
    </div>
  </>
);

// ============================================================================
// Étape 3 — Première truie
// ============================================================================

const Step3FirstSow: React.FC = () => {
  const [statut, setStatut] = useState<'vide' | 'pleine' | 'maternite'>('vide');
  return (
    <>
      <div style={eyebrowStyle}>Mini-form · teaser éducatif</div>
      <h1 style={wizTitleStyle}>
        Tu commences avec <b style={{ color: 'var(--pt-primary)' }}>une truie</b>
      </h1>
      <p style={wizSubStyle}>
        Code, boucle, statut. C’est tout ce qu’il faut pour démarrer. Tu
        ajouteras les autres ensuite — une à une, ou par import CSV.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="field">
          <label className="field__label">
            Code de la truie <span className="hint">auto · modifiable</span>
          </label>
          <input className="field__input mono filled" defaultValue="T-001" readOnly />
        </div>
        <div className="field">
          <label className="field__label">
            Boucle officielle <span className="req">requis</span>
          </label>
          <input className="field__input mono" placeholder="CI-001-26" readOnly />
        </div>
        <div className="field">
          <label className="field__label">Statut</label>
          <div className="radio-chips">
            <button
              type="button"
              className="radio-chip"
              aria-checked={statut === 'vide'}
              onClick={() => setStatut('vide')}
            >
              Vide
            </button>
            <button
              type="button"
              className="radio-chip"
              aria-checked={statut === 'pleine'}
              onClick={() => setStatut('pleine')}
            >
              Pleine
            </button>
            <button
              type="button"
              className="radio-chip"
              aria-checked={statut === 'maternite'}
              onClick={() => setStatut('maternite')}
            >
              Maternité
            </button>
          </div>
        </div>
        <div className="field">
          <label className="field__label">Date de naissance</label>
          <input
            className="field__input mono field__input--ghost"
            type="date"
            defaultValue="2024-03-14"
            readOnly
          />
        </div>
      </div>
    </>
  );
};

// ============================================================================
// Étape 4 — Saillie
// ============================================================================

const Step4Saillie: React.FC = () => (
  <>
    <div style={eyebrowStyle}>Cycle vivant · démo</div>
    <h1 style={wizTitleStyle}>
      <b style={{ color: 'var(--pt-primary)' }}>Saillie</b> = J0 du cycle
    </h1>
    <p style={wizSubStyle}>
      Tu notes la saillie aujourd’hui, PorcTrack calcule pour toi écho J28,
      mise-bas J115, sevrage J143.
    </p>

    {/* mock-fiche : T-001 simplifiée */}
    <div
      style={{
        background: 'var(--pt-warm)',
        border: '1px solid var(--pt-line)',
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'var(--pt-truie-bg)',
            color: 'var(--pt-truie-fg)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--pt-font-mono)',
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '0.04em',
          }}
        >
          T01
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--pt-font-mono)',
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--pt-ink)',
            }}
          >
            T-001
          </div>
          <div style={{ fontSize: 11, color: 'var(--pt-muted)', marginTop: 2 }}>
            Vide · parité 0 · CI-001-26
          </div>
        </div>
      </div>

      {/* add-evt : ligne add évènement */}
      <button
        type="button"
        style={{
          marginTop: 12,
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 14px',
          borderRadius: 10,
          border: '1px dashed var(--pt-line-strong)',
          background: 'var(--pt-bg)',
          fontFamily: 'var(--pt-font-mono)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--pt-primary)',
          cursor: 'default',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Plus size={13} strokeWidth={2} />
          Saisir un évènement
        </span>
        <span style={{ color: 'var(--pt-subtle)', fontWeight: 500, letterSpacing: '0.08em' }}>
          Saillie · Écho · MB
        </span>
      </button>
    </div>

    {/* 4 dates calculées */}
    <div
      style={{
        background: 'var(--pt-bg)',
        border: '1px solid var(--pt-line)',
        borderRadius: 14,
        padding: '14px 16px',
      }}
    >
      <div style={{ ...eyebrowStyle, marginBottom: 12 }}>Cycle calculé · auto</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          fontFamily: 'var(--pt-font-mono)',
          fontSize: 12,
          color: 'var(--pt-ink)',
        }}
      >
        <DateRow label="Saillie" value="J0 · 10/05" tone="now" />
        <DateRow label="Écho" value="J28 · 07/06" />
        <DateRow label="Mise-bas" value="J115 · 02/09" />
        <DateRow label="Sevrage" value="J143 · 30/09" />
      </div>
    </div>
  </>
);

const DateRow: React.FC<{ label: string; value: string; tone?: 'now' }> = ({
  label,
  value,
  tone,
}) => (
  <div
    style={{
      borderLeft: `3px solid ${tone === 'now' ? 'var(--pt-accent)' : 'var(--pt-line-strong)'}`,
      paddingLeft: 10,
    }}
  >
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--pt-subtle)',
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: 'var(--pt-font-mono)',
        fontSize: 13,
        fontWeight: 600,
        color: tone === 'now' ? 'var(--pt-accent)' : 'var(--pt-ink)',
        fontVariantNumeric: 'tabular-nums',
        marginTop: 2,
      }}
    >
      {value}
    </div>
  </div>
);

// ============================================================================
// Étape 5 — KPIs
// ============================================================================

const Step5Kpis: React.FC<{ onLink: (slug: string) => void }> = ({ onLink }) => (
  <>
    <div style={eyebrowStyle}>Tableau de bord · score</div>
    <h1 style={wizTitleStyle}>
      <b style={{ color: 'var(--pt-primary)' }}>ISSE, GMQ, Marge</b>
      <br />
      Ton tableau de bord en un coup d’œil.
    </h1>
    <p style={wizSubStyle}>
      À tout moment, tu sais où en est ton élevage. La note synthétise les
      indicateurs métiers et te dit si tu es au-dessus ou en-dessous des
      standards.
    </p>

    <div className="score-mini" style={{ marginBottom: 14 }}>
      <div className="score-mini__letter">B</div>
      <div className="score-mini__main">
        <div className="score-mini__row">
          <span className="lab">Score</span>
          <span className="v">64 / 100 · Bon</span>
        </div>
        <div className="score-mini__row">
          <span className="lab">ISSE</span>
          <span className="v">11,4</span>
        </div>
        <div className="score-mini__row">
          <span className="lab">GMQ post-sev.</span>
          <span className="v">412 g</span>
        </div>
        <div className="score-mini__row">
          <span className="lab">Marge mai</span>
          <span className="v">+575 000 FCFA</span>
        </div>
      </div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <KpiLink
        icon={<Heart size={18} strokeWidth={2} />}
        title="Comprendre l’ISSE"
        sub="Indice Sevré-Saillie · cible >12"
        onClick={() => onLink('isse')}
      />
      <KpiLink
        icon={<Banknote size={18} strokeWidth={2} />}
        title="Comprendre la marge"
        sub="Calcul live · FCFA"
        onClick={() => onLink('marge')}
      />
      <KpiLink
        icon={<LogOut size={18} strokeWidth={2} />}
        title="Comprendre la réforme"
        sub="Quand sortir une truie improductive"
        onClick={() => onLink('reforme')}
      />
    </div>
  </>
);

const KpiLink: React.FC<{
  icon: React.ReactNode;
  title: string;
  sub: string;
  onClick: () => void;
}> = ({ icon, title, sub, onClick }) => (
  <button type="button" className="card-link" onClick={onClick}>
    <div className="card-link__icon">{icon}</div>
    <div className="card-link__main">
      <div className="card-link__title">{title}</div>
      <div className="card-link__sub">{sub}</div>
    </div>
    <span className="card-link__chev">
      <ChevronRight size={16} strokeWidth={2} />
    </span>
  </button>
);

// ============================================================================
// Page principale
// ============================================================================

export const OnboardingEduPage: React.FC<OnboardingEduPageProps> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>(1);
  const navigate = useNavigate();

  const finish = () => {
    if (onComplete) {
      onComplete();
    } else {
      navigate('/today');
    }
  };

  const handleNext = () => {
    if (step === 5) {
      finish();
    } else {
      setStep((step + 1) as Step);
    }
  };

  const handlePrev = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  const handleEncyclo = (slug: string) => {
    navigate(`/reglages/encyclopedie?slug=${slug}`);
  };

  return (
    <div
      className="pt-screen"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--pt-bg)',
      }}
    >
      <WizardHeader step={step} onSkip={finish} hideSkip={step === 5} />

      <div
        style={{
          flex: 1,
          padding: '4px 20px 16px',
          overflow: 'auto',
        }}
      >
        {step === 1 && <Step1Welcome />}
        {step === 2 && <Step2Alerts />}
        {step === 3 && <Step3FirstSow />}
        {step === 4 && <Step4Saillie />}
        {step === 5 && <Step5Kpis onLink={handleEncyclo} />}
      </div>

      <WizardFooter step={step} onPrev={handlePrev} onNext={handleNext} isLast={step === 5} />
    </div>
  );
};
