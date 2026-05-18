import React from 'react';
import { isChunkError, reloadForChunkError } from '../lib/chunkError';
import { recordError } from '../services/errorStore';
import { APP_VERSION } from '../config';
import { kvGet } from '../services/kvStore';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * AUDIT-A2 P0 : ErrorBoundary racine de l'app.
 *
 * Catche toutes les erreurs non gérées. Si l'erreur est un chunk stale
 * (ChunkLoadError ou "Failed to fetch dynamically imported module"),
 * affiche un message "Nouvelle version disponible". Sinon affiche un
 * message d'erreur générique. Le bouton "Recharger la page" reset le
 * flag anti-boucle puis force window.location.reload().
 */
export class RootErrorBoundary extends React.Component<Props, State> {
  declare state: State;
  declare props: Props;
  declare setState: React.Component<Props, State>['setState'];

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[RootErrorBoundary]', error, info);
    }
    try {
      const ua = navigator.userAgent.slice(0, 80);
      recordError({
        timestamp: Date.now(),
        scope: 'RootErrorBoundary',
        message: error.message || String(error),
        stack: (error.stack ?? '') + '\n\nComponent stack:' + (info.componentStack ?? ''),
        url: typeof window !== 'undefined' ? window.location.href : '',
        userId: kvGet('pt:user_id') ?? undefined,
        version: APP_VERSION + ' ua:' + ua,
      });
    } catch {
      // ne pas casser le rendu d'urgence
    }
  }

  handleReload = () => {
    reloadForChunkError();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;

    const chunkError = isChunkError(this.state.error);
    const title = chunkError ? 'Nouvelle version disponible' : 'Une erreur est survenue';
    const subtitle = chunkError
      ? 'Recharger la page pour récupérer la dernière mise à jour.'
      : 'Recharger la page peut résoudre le problème.';

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'var(--pt-bg-app)',
          color: 'var(--pt-ink)',
        }}
      >
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <h1
            className="ft-heading"
            style={{
              fontSize: 'clamp(28px, 6vw, 40px)',
              lineHeight: 1.05,
              textTransform: 'uppercase',
              margin: '0 0 12px',
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontStyle: 'italic',
              fontSize: 16,
              color: 'var(--pt-muted)',
              margin: '0 0 28px',
            }}
          >
            {subtitle}
          </p>
          <button
            type="button"
            className="btn btn--primary btn--lg btn--block"
            onClick={this.handleReload}
          >
            Recharger la page
          </button>
        </div>
      </div>
    );
  }
}

export default RootErrorBoundary;
