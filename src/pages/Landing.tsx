import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  RotateCcw,
  Sparkles,
  CalendarRange,
  ShieldCheck,
  WifiOff,
  Layers,
} from 'lucide-react';
import Eyebrow from '../components/design/Eyebrow';
import Button from '../components/design/Button';
import Chip from '../components/design/Chip';

const FONT_DISPLAY = 'BigShoulders, "InstrumentSans", sans-serif';
const FONT_BODY = 'InstrumentSans, -apple-system, system-ui, sans-serif';
const FONT_NUM = 'BricolageGrotesque, "InstrumentSans", sans-serif';
const FONT_MONO = 'DMMono, ui-monospace, monospace';

export default function Landing() {
  // theme-day est désormais forcé globalement dans main.tsx (refonte v6 light).
  return (
    <div
      data-public-page
      style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
        width: '100%',
        background: 'var(--bg-app, #f0f4f3)',
        color: 'var(--ink, #111827)',
        fontFamily: FONT_BODY,
      }}
    >
      {/* ── Header public ──────────────────────────────────────────── */}
      <header
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2"
            style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18, color: 'var(--ink)', letterSpacing: '-0.01em' }}
          >
            <span
              aria-hidden
              style={{
                width: 28,
                height: 28,
                background: 'var(--color-accent-500)',
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--bg-surface)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" />
                <path d="M12 3v9l5 3" />
              </svg>
            </span>
            <span className="uppercase tracking-wide">PorcTrack</span>
          </Link>

          <nav
            className="flex items-center gap-1 md:gap-2"
            style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase' }}
          >
            <Link
              to="/a-propos"
              className="hidden md:inline-flex items-center px-3 py-2"
              style={{ color: 'var(--muted)', minHeight: 44 }}
            >
              À propos
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center px-3 py-2"
              style={{ color: 'var(--muted)', minHeight: 44 }}
            >
              Connexion
            </Link>
            <Link to="/signup" aria-label="Commencer">
              <Button variant="primary" size="sm">
                Commencer
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.2fr_1fr] md:px-8 md:py-24">
          <div className="flex flex-col">
            <span
              className="inline-flex items-center gap-2 self-start"
              style={{
                fontFamily: FONT_MONO,
                fontSize: '9.5px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--color-accent-600)',
                background: 'var(--color-accent-100)',
                padding: '6px 11px',
                borderRadius: 'var(--radius-pill)',
                fontWeight: 500,
                marginBottom: 18,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--color-accent-500)',
                }}
              />
              Smart app élevage 2026 · Côte d'Ivoire
            </span>

            <h1
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 'clamp(32px, 6vw, 56px)',
                lineHeight: 0.95,
                letterSpacing: '-0.025em',
                margin: 0,
                color: 'var(--ink)',
              }}
            >
              Pilotez votre élevage{' '}
              <em
                style={{
                  fontStyle: 'normal',
                  color: 'var(--color-accent-600)',
                  background: 'var(--color-accent-100)',
                  padding: '0 8px',
                  borderRadius: 6,
                  display: 'inline-block',
                }}
              >
                en bandes
              </em>
              , pas en bricoles.
            </h1>

            <p
              style={{
                fontFamily: FONT_BODY,
                fontSize: 16,
                lineHeight: 1.55,
                color: 'var(--ink-soft)',
                margin: '20px 0 28px',
                maxWidth: 560,
              }}
            >
              PorcTrack suit chaque saillie, mise-bas et pesée, anticipe les retours en chaleur entre J18 et J24,
              et donne à Marius — votre assistant — les bons éléments pour vous conseiller au bon moment.
              Pour éleveurs naisseurs-engraisseurs en Afrique de l'Ouest.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link to="/signup">
                <Button variant="primary" size="lg">
                  Commencer
                  <ArrowRight size={16} strokeWidth={2} />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" size="lg">
                  Se connecter
                </Button>
              </Link>
            </div>

            <div
              className="mt-8 inline-flex items-center gap-2"
              style={{
                fontFamily: FONT_MONO,
                fontSize: '10px',
                letterSpacing: '0.06em',
                color: 'var(--muted)',
              }}
            >
              <span
                aria-hidden
                className="pulse-green"
                style={{
                  width: 6,
                  height: 6,
                  background: 'var(--color-accent-500)',
                  borderRadius: '50%',
                }}
              />
              Données chiffrées · hébergement souverain · 100 % hors-ligne
            </div>
          </div>

          {/* Stats card */}
          <aside
            aria-label="Chiffres clés PorcTrack"
            className="self-start"
            style={{
              background: 'var(--bg-app)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-card)',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
            }}
          >
            <Stat num="115" suffix=" j" label="Cycle gestation suivi" border="r b" />
            <Stat num="14" label="Règles GTTT actives" border="b" />
            <Stat num="J18" suffix="–J24" label="Fenêtre retour chaleur" border="r" />
            <Stat num="100" suffix="%" label="Hors-ligne" />
          </aside>
        </div>
      </section>

      {/* ── Pourquoi PorcTrack ─────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
        <Eyebrow dotColor="accent">Pensé pour le terrain</Eyebrow>
        <h2
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 'clamp(28px, 4vw, 40px)',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            margin: '14px 0 32px',
            color: 'var(--ink)',
          }}
        >
          Tout ce qu'une ferme a besoin, rien de plus.
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <Feature
            tone="accent"
            icon={<RotateCcw size={20} strokeWidth={2} />}
            title="Retour en chaleur · détecté"
            body="À J19 post-saillie, l'app vous demande la décision. Si retour, replacement automatique en bande."
          />
          <Feature
            tone="amber"
            icon={<Sparkles size={20} strokeWidth={2} />}
            title="Marius · l'assistant"
            body="LLM auto-hébergé, pas de cloud. Marius lit votre dossier, identifie les patterns, propose des actions."
          />
          <Feature
            tone="terre"
            icon={<CalendarRange size={20} strokeWidth={2} />}
            title="Conduite en bandes"
            body="Mises-bas, sevrages, saillies, départs. Toutes les bandes alignées sur un calendrier qui parle votre métier."
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Feature
            tone="accent"
            icon={<ShieldCheck size={20} strokeWidth={2} />}
            title="14 alertes biologiques"
            body="Mise-bas, sevrage, retour chaleur, mortalité, stocks critiques : les règles GTTT déclenchent au bon jour."
          />
          <Feature
            tone="accent"
            icon={<WifiOff size={20} strokeWidth={2} />}
            title="Offline-first"
            body="Saisissez en porcherie sans réseau. La sync repart automatiquement dès que le signal revient."
          />
          <Feature
            tone="terre"
            icon={<Layers size={20} strokeWidth={2} />}
            title="Vocabulaire métier exact"
            body="Saillie, pleine, en maternité, retour chaleur. Pas de jargon importé : votre langage de ferme."
          />
        </div>
      </section>

      {/* ── Marius ─────────────────────────────────────────────────── */}
      <section
        style={{
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1fr_1.1fr] md:px-8 md:py-24">
          <div>
            <Eyebrow dotColor="amber">Lecture du dossier</Eyebrow>
            <h2
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 'clamp(28px, 4vw, 40px)',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                margin: '14px 0 16px',
                color: 'var(--ink)',
              }}
            >
              Marius lit votre élevage et vous parle au bon moment.
            </h2>
            <p
              style={{
                fontFamily: FONT_BODY,
                fontSize: 15,
                lineHeight: 1.55,
                color: 'var(--ink-soft)',
                margin: '0 0 20px',
                maxWidth: 480,
              }}
            >
              LLM contextuel auto-hébergé sur le VPS de la ferme. Marius croise saillies, retours, pesées et
              historique pour proposer la décision suivante. Aucun fichier ne quitte votre serveur.
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip tone="amber">Local-first</Chip>
              <Chip tone="green">RGPD</Chip>
              <Chip tone="terre">VPS souverain</Chip>
            </div>
          </div>

          {/* Bloc Marius — signature visuelle maïs */}
          <article
            aria-label="Exemple d'analyse Marius"
            style={{
              background: 'var(--color-amber-pork-soft)',
              borderRadius: 'var(--radius-card)',
              padding: '20px 22px',
              border: '1px solid rgba(176, 112, 61, 0.15)',
            }}
          >
            <div
              className="inline-flex items-center gap-2"
              style={{
                fontFamily: FONT_MONO,
                fontSize: '10px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--color-amber-pork-deep)',
                fontWeight: 500,
                marginBottom: 12,
              }}
            >
              <Sparkles size={12} strokeWidth={2} />
              Marius · analyse
            </div>
            <p
              style={{
                fontFamily: FONT_BODY,
                fontSize: 15,
                lineHeight: 1.55,
                color: 'var(--color-secondary-deep)',
                margin: 0,
              }}
            >
              Diane <span style={{ fontFamily: FONT_MONO, fontSize: 12 }}>(T19)</span> a connu{' '}
              <strong style={{ color: 'var(--ink)' }}>2 retours sur 5 saillies</strong> (40 % vs 12 % moyenne ferme).
              Les retours étaient avec V01 Bobi. La saillie S07 utilise V02 Aligator.{' '}
              <strong style={{ color: 'var(--ink)' }}>
                Si nouvel échec, point vétérinaire avant la semaine 8.
              </strong>
            </p>
            <div
              className="mt-4 flex flex-wrap items-center gap-2"
              style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.08em', color: 'var(--muted)' }}
            >
              <Chip tone="terre">B17</Chip>
              <Chip tone="amber">Cycle en attente</Chip>
              <span className="uppercase">J19 / 35 · fenêtre J18-J24</span>
            </div>
          </article>
        </div>
      </section>

      {/* ── CTA Final ──────────────────────────────────────────────── */}
      <section
        style={{
          background: 'var(--color-accent-500)',
          color: 'var(--bg-surface)',
        }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-16 md:flex-row md:items-center md:justify-between md:px-8 md:py-20">
          <div className="max-w-2xl">
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: '10px',
                letterSpacing: '0.20em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.75)',
              }}
            >
              · Côte d'Ivoire · Afrique de l'Ouest
            </span>
            <h2
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 'clamp(28px, 4vw, 40px)',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                margin: '10px 0 12px',
                color: 'var(--bg-surface)',
              }}
            >
              Prêt à passer du cahier au pilotage ?
            </h2>
            <p
              style={{
                fontFamily: FONT_BODY,
                fontSize: 15,
                lineHeight: 1.55,
                color: 'rgba(255,255,255,0.85)',
                margin: 0,
                maxWidth: 560,
              }}
            >
              Inscription en deux minutes. Migration depuis Excel disponible. Pensé pour les naisseurs-engraisseurs.
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

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer
        style={{
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--line)',
        }}
      >
        <div
          className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-5 py-8 md:flex-row md:items-center md:justify-between md:px-8"
          style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: '0.06em', color: 'var(--muted)' }}
        >
          <span className="uppercase">© 2026 PorcTrack · porctrack.tech</span>
          <nav className="flex flex-wrap gap-5">
            <Link to="/a-propos" className="uppercase" style={{ color: 'var(--muted)' }}>
              À propos
            </Link>
            <Link to="/privacy" className="uppercase" style={{ color: 'var(--muted)' }}>
              Confidentialité
            </Link>
            <Link to="/cgu" className="uppercase" style={{ color: 'var(--muted)' }}>
              CGU
            </Link>
            <a href="mailto:contact@porctrack.tech" className="uppercase" style={{ color: 'var(--muted)' }}>
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/* ── Sub-components (locaux à la page) ───────────────────────────── */

interface StatProps {
  num: string;
  suffix?: string;
  label: string;
  border?: string;
}

function Stat({ num, suffix, label, border = '' }: StatProps) {
  const borderRight = border.includes('r') ? '1px solid var(--line)' : 'none';
  const borderBottom = border.includes('b') ? '1px solid var(--line)' : 'none';
  return (
    <div style={{ padding: '20px 22px', borderRight, borderBottom }}>
      <div
        style={{
          fontFamily: FONT_NUM,
          fontSize: 32,
          fontWeight: 600,
          color: 'var(--ink)',
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {num}
        {suffix && (
          <small style={{ fontSize: 15, color: 'var(--muted)', fontWeight: 400, marginLeft: 2 }}>{suffix}</small>
        )}
      </div>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 9.5,
          color: 'var(--muted)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginTop: 8,
          lineHeight: 1.4,
        }}
      >
        {label}
      </div>
    </div>
  );
}

interface FeatureProps {
  tone: 'accent' | 'amber' | 'terre';
  icon: ReactNode;
  title: string;
  body: string;
}

const FEATURE_ICON_BG: Record<FeatureProps['tone'], string> = {
  accent: 'var(--color-accent-100)',
  amber: 'var(--color-amber-pork-soft)',
  terre: 'var(--color-secondary-soft)',
};
const FEATURE_ICON_FG: Record<FeatureProps['tone'], string> = {
  accent: 'var(--color-accent-600)',
  amber: 'var(--color-amber-pork-deep)',
  terre: 'var(--color-secondary-deep)',
};

function Feature({ tone, icon, title, body }: FeatureProps) {
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
          background: FEATURE_ICON_BG[tone],
          color: FEATURE_ICON_FG[tone],
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
