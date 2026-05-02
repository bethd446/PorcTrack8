import { Link } from 'react-router-dom';
import { ArrowRight, Bell } from 'lucide-react';
import Eyebrow from '../components/design/Eyebrow';
import Button from '../components/design/Button';
import PublicShell from '../components/design/PublicShell';

const FONT_DISPLAY = 'var(--font-heading)';
const FONT_BODY = 'var(--font-body)';
const FONT_MONO = 'var(--font-mono)';

export default function NotFound() {
  return (
    <PublicShell>
      <section
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div className="mx-auto flex max-w-3xl flex-col items-start px-5 py-20 md:px-8 md:py-28">
          <Eyebrow dotColor="amber">Erreur 404 · page introuvable</Eyebrow>

          <p
            aria-hidden
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 'clamp(96px, 18vw, 168px)',
              lineHeight: 0.85,
              letterSpacing: '-0.05em',
              color: 'var(--color-accent-600)',
              margin: '20px 0 0',
            }}
          >
            404
          </p>

          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 'clamp(28px, 4.5vw, 40px)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
              margin: '24px 0 14px',
              maxWidth: 640,
            }}
          >
            La page que vous cherchez n'est plus dans la porcherie.
          </h1>

          <p
            style={{
              fontFamily: FONT_BODY,
              fontSize: 16,
              lineHeight: 1.6,
              color: 'var(--ink-soft)',
              margin: '0 0 28px',
              maxWidth: 540,
            }}
          >
            Le lien est peut-être obsolète, ou la ressource a été déplacée. Ramenons-vous à un
            endroit utile.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/" aria-label="Retour à l'accueil">
              <Button variant="primary" size="lg">
                Retour à l'accueil
                <ArrowRight size={16} strokeWidth={2} />
              </Button>
            </Link>
            <Link to="/alerts" aria-label="Voir mes alertes">
              <Button variant="secondary" size="lg">
                <Bell size={14} strokeWidth={2} />
                Voir mes alertes
              </Button>
            </Link>
          </div>

          <div
            className="mt-10 inline-flex items-center gap-2"
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--color-amber-pork)',
              }}
            />
            Si vous étiez en train de saisir une donnée, elle est sauvegardée localement
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
