import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IonPage, IonContent } from '@ionic/react';
import Button from './Button';

const FONT_DISPLAY = 'var(--font-heading)';
const FONT_BODY = 'var(--font-body)';
/**
 * @deprecated theme-day est désormais forcé globalement dans main.tsx
 * (refonte v6 light). Conservé en no-op pour la compat avec les imports.
 */
export function useForceDayTheme() {
  /* no-op */
}

export function PublicHeader() {
  return (
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
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 18,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}
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
          style={{
            fontSize: 11,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
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
  );
}

export function PublicFooter() {
  return (
    <footer
      style={{
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--line)',
      }}
    >
      <div
        className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-5 py-8 md:flex-row md:items-center md:justify-between md:px-8"
        style={{
          fontSize: 11,
          letterSpacing: '0.06em',
          color: 'var(--muted)',
        }}
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
          <a
            href="mailto:contact@porctrack.tech"
            className="uppercase"
            style={{ color: 'var(--muted)' }}
          >
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}

interface PublicShellProps {
  children: ReactNode;
}

export default function PublicShell({ children }: PublicShellProps) {
  useForceDayTheme();
  return (
    <IonPage>
      <IonContent fullscreen scrollY={true}>
        <div
          data-public-page
          style={{
            position: 'relative',
            zIndex: 1,
            minHeight: '100%',
            width: '100%',
            background: 'var(--bg-app)',
            color: 'var(--ink)',
            fontFamily: FONT_BODY,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <PublicHeader />
          <main style={{ flex: 1 }}>{children}</main>
          <PublicFooter />
        </div>
      </IonContent>
    </IonPage>
  );
}
