import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sprout, Shield, Hand } from 'lucide-react';
import Eyebrow from '../components/design/Eyebrow';
import Button from '../components/design/Button';
import Chip from '../components/design/Chip';
import PublicShell from '../components/design/PublicShell';

const FONT_DISPLAY = 'BigShoulders, "InstrumentSans", sans-serif';
const FONT_BODY = 'InstrumentSans, -apple-system, system-ui, sans-serif';
const FONT_MONO = 'DMMono, ui-monospace, monospace';
const FONT_NUM = 'BricolageGrotesque, "InstrumentSans", sans-serif';

export default function About() {
  return (
    <PublicShell>
      {/* Hero */}
      <section
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
          <Eyebrow dotColor="accent">PorcTrack en quelques mots</Eyebrow>
          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 'clamp(32px, 5.5vw, 52px)',
              lineHeight: 1,
              letterSpacing: '-0.025em',
              margin: '14px 0 18px',
              color: 'var(--ink)',
            }}
          >
            L'élevage porcin africain mérite ses propres outils.
          </h1>
          <p
            style={{
              fontFamily: FONT_BODY,
              fontSize: 17,
              lineHeight: 1.6,
              color: 'var(--ink-soft)',
              margin: 0,
              maxWidth: 620,
            }}
          >
            PorcTrack est une application de gestion technique de troupeau pensée pour les éleveurs
            naisseurs-engraisseurs d'Afrique de l'Ouest. Conçue avec eux, sur le terrain, pour
            transformer le cahier de saillies en tableau de bord vivant.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
        <Eyebrow dotColor="terre">Notre mission</Eyebrow>
        <h2
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 'clamp(26px, 4vw, 36px)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            margin: '14px 0 18px',
            color: 'var(--ink)',
          }}
        >
          Professionnaliser la conduite d'élevage, sans rien lui faire perdre de son terrain.
        </h2>
        <p
          style={{
            fontFamily: FONT_BODY,
            fontSize: 16,
            lineHeight: 1.65,
            color: 'var(--ink-soft)',
            margin: '0 0 14px',
          }}
        >
          Nous aidons les éleveurs porcins à passer d'une gestion sur cahier à une conduite en
          bandes outillée : suivi des cycles biologiques, alertes au bon jour, indicateurs de
          performance lisibles, et conseil contextuel par notre assistant Marius.
        </p>
        <p
          style={{
            fontFamily: FONT_BODY,
            fontSize: 16,
            lineHeight: 1.65,
            color: 'var(--ink-soft)',
            margin: 0,
          }}
        >
          L'objectif n'est pas la digitalisation pour la digitalisation. L'objectif est de gagner
          des porcelets sevrés par truie et par an, et de faire dormir l'éleveur la conscience
          tranquille.
        </p>
      </section>

      {/* Pourquoi */}
      <section
        style={{
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
          <Eyebrow dotColor="amber">L'histoire</Eyebrow>
          <h2
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 'clamp(26px, 4vw, 36px)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              margin: '14px 0 18px',
              color: 'var(--ink)',
            }}
          >
            Tout commence dans une porcherie d'Abidjan.
          </h2>
          <p
            style={{
              fontFamily: FONT_BODY,
              fontSize: 16,
              lineHeight: 1.65,
              color: 'var(--ink-soft)',
              margin: '0 0 14px',
            }}
          >
            En 2024, en Côte d'Ivoire, un naisseur-engraisseur cherche un outil simple pour suivre
            ses 17 truies. Le marché propose des logiciels européens chers, complexes, calibrés
            pour 800 truies, des protocoles vaccinaux nordiques et une connexion fibre permanente.
            Rien ne tient debout dans une porcherie ivoirienne en saison des pluies.
          </p>
          <p
            style={{
              fontFamily: FONT_BODY,
              fontSize: 16,
              lineHeight: 1.65,
              color: 'var(--ink-soft)',
              margin: 0,
            }}
          >
            PorcTrack est né de cette observation. Une équipe distribuée Paris ↔ Abidjan, des
            éleveurs partenaires sur le terrain, et la conviction qu'un outil bien fait vaut mieux
            qu'un outil bien financé.
          </p>
        </div>
      </section>

      {/* Valeurs */}
      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
        <Eyebrow dotColor="accent">Nos valeurs</Eyebrow>
        <h2
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 'clamp(26px, 4vw, 36px)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            margin: '14px 0 28px',
            color: 'var(--ink)',
          }}
        >
          Trois principes qui ne bougent pas.
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <Value
            tone="accent"
            icon={<Sprout size={20} strokeWidth={2} />}
            title="Terroir + tech"
            body="Conçu avec des éleveurs ivoiriens. Le vocabulaire, les seuils biologiques et les flux suivent la pratique terrain — pas un manuel européen plaqué."
          />
          <Value
            tone="terre"
            icon={<Shield size={20} strokeWidth={2} />}
            title="Souveraineté"
            body="Vos données peuvent rester sur votre VPS (option auto-hébergement). L'assistant Marius tourne sur un LLM auto-hébergé, sans appel cloud externe."
          />
          <Value
            tone="amber"
            icon={<Hand size={20} strokeWidth={2} />}
            title="Simplicité terrain"
            body="L'utilisateur cible est le porcher avec des gants, pas un data scientist. Saisie en deux gestes, lisible en lumière directe, fonctionne sans réseau."
          />
        </div>
      </section>

      {/* Vision */}
      <section
        style={{
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
          <Eyebrow dotColor="terre">Vision 2027</Eyebrow>
          <h2
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 'clamp(26px, 4vw, 36px)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              margin: '14px 0 18px',
              color: 'var(--ink)',
            }}
          >
            Cent fermes pilotes, trois pays, un même métier.
          </h2>
          <p
            style={{
              fontFamily: FONT_BODY,
              fontSize: 16,
              lineHeight: 1.65,
              color: 'var(--ink-soft)',
              margin: '0 0 24px',
              maxWidth: 620,
            }}
          >
            Nous visons à équiper 100 fermes pilotes en Côte d'Ivoire, au Sénégal et au Cameroun
            d'ici fin 2027. L'objectif est de constituer la première base de référence GTTT
            ouest-africaine et de publier des indicateurs de performance régionalisés, utiles à
            toute la filière.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <VisionStat num="100" label="fermes pilotes" />
            <VisionStat num="3" label="pays cibles" />
            <VisionStat num="2027" label="horizon" />
          </div>
        </div>
      </section>

      {/* Équipe */}
      <section className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
        <Eyebrow dotColor="amber">L'équipe</Eyebrow>
        <h2
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 'clamp(26px, 4vw, 36px)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            margin: '14px 0 18px',
            color: 'var(--ink)',
          }}
        >
          Petite équipe, grande humilité.
        </h2>
        <p
          style={{
            fontFamily: FONT_BODY,
            fontSize: 16,
            lineHeight: 1.65,
            color: 'var(--ink-soft)',
            margin: '0 0 18px',
          }}
        >
          Équipe distribuée Paris ↔ Abidjan, ouverte aux contributions d'éleveurs, de vétérinaires
          et de développeurs qui partagent la conviction qu'un bon outil agricole se construit avec
          ses utilisateurs.
        </p>
        <div className="flex flex-wrap gap-2">
          <Chip tone="green">Produit</Chip>
          <Chip tone="terre">Terrain</Chip>
          <Chip tone="amber">Vétérinaire conseil</Chip>
          <Chip tone="neutral">Open contributions</Chip>
        </div>
      </section>

      {/* Contact / CTA */}
      <section
        style={{
          background: 'var(--color-accent-500)',
          color: 'var(--bg-surface)',
        }}
      >
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-6 px-5 py-16 md:flex-row md:items-center md:justify-between md:px-8 md:py-20">
          <div className="max-w-xl">
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                letterSpacing: '0.20em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.75)',
              }}
            >
              Discutons
            </span>
            <h2
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 'clamp(24px, 4vw, 34px)',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                margin: '10px 0 12px',
                color: 'var(--bg-surface)',
              }}
            >
              Une question, une ferme, un partenariat ?
            </h2>
            <p
              style={{
                fontFamily: FONT_BODY,
                fontSize: 15,
                lineHeight: 1.55,
                color: 'rgba(255,255,255,0.88)',
                margin: 0,
              }}
            >
              Écrivez-nous à{' '}
              <a
                href="mailto:contact@porctrack.tech"
                style={{
                  color: 'var(--bg-surface)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                contact@porctrack.tech
              </a>
              . Réponse sous 48 heures ouvrées.
            </p>
          </div>
          <Link to="/signup" className="self-stretch md:self-auto">
            <Button variant="inverse" size="lg" className="w-full md:w-auto">
              Commencer gratuitement
              <ArrowRight size={16} strokeWidth={2} />
            </Button>
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}

interface ValueProps {
  tone: 'accent' | 'amber' | 'terre';
  icon: ReactNode;
  title: string;
  body: string;
}

const VALUE_ICON_BG: Record<ValueProps['tone'], string> = {
  accent: 'var(--color-accent-100)',
  amber: 'var(--color-amber-pork-soft)',
  terre: 'var(--color-secondary-soft)',
};
const VALUE_ICON_FG: Record<ValueProps['tone'], string> = {
  accent: 'var(--color-accent-600)',
  amber: 'var(--color-amber-pork-deep)',
  terre: 'var(--color-secondary-deep)',
};

function Value({ tone, icon, title, body }: ValueProps) {
  return (
    <article
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-card)',
        padding: '22px 22px 24px',
        border: '1px solid var(--line)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <div
        aria-hidden
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: VALUE_ICON_BG[tone],
          color: VALUE_ICON_FG[tone],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 600,
          fontSize: 18,
          lineHeight: 1.2,
          letterSpacing: '-0.01em',
          color: 'var(--ink)',
          margin: '0 0 8px',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: FONT_BODY,
          fontSize: 14,
          lineHeight: 1.55,
          color: 'var(--ink-soft)',
          margin: 0,
        }}
      >
        {body}
      </p>
    </article>
  );
}

function VisionStat({ num, label }: { num: string; label: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-app)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-card)',
        padding: '18px 20px',
      }}
    >
      <div
        style={{
          fontFamily: FONT_NUM,
          fontSize: 36,
          fontWeight: 600,
          color: 'var(--ink)',
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {num}
      </div>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 10,
          color: 'var(--muted)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginTop: 8,
        }}
      >
        {label}
      </div>
    </div>
  );
}
