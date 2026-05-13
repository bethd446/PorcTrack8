import React from 'react';
import { isChunkError, reloadForChunkError } from '../../lib/chunkError';

interface Props { children: React.ReactNode; pageName?: string; }
interface State { hasError: boolean; error?: Error; }

export class V70ErrorBoundary extends React.Component<Props, State> {
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
      console.error('[V70ErrorBoundary]', error, info);
    }
  }

  handleReload = () => {
    reloadForChunkError();
  };

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      const chunkError = isChunkError(this.state.error);
      const title = chunkError
        ? 'Nouvelle version disponible'
        : `${this.props.pageName ?? 'Page'} indisponible`;
      const subtitle = chunkError
        ? 'Recharger la page pour récupérer la dernière mise à jour.'
        : (this.state.error?.message ?? 'Erreur inattendue');

      return (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--pt-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>!</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {title}
          </div>
          <div style={{ fontSize: 13 }}>
            {subtitle}
          </div>
          {chunkError ? (
            <button
              type="button"
              className="btn btn--primary btn--lg btn--block"
              style={{ marginTop: 16 }}
              onClick={this.handleReload}
            >
              Recharger la page
            </button>
          ) : (
            <button
              type="button"
              style={{
                marginTop: 16,
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid var(--pt-line)',
                background: 'none',
                cursor: 'pointer',
              }}
              onClick={this.handleRetry}
            >
              Réessayer
            </button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
