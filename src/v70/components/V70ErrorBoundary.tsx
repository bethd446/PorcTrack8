import React from 'react';

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

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--pt-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>!</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {this.props.pageName ?? 'Page'} indisponible
          </div>
          <div style={{ fontSize: 13 }}>
            {this.state.error?.message ?? 'Erreur inattendue'}
          </div>
          <button
            type="button"
            style={{
              marginTop: 16,
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--pt-border)',
              background: 'none',
              cursor: 'pointer',
            }}
            onClick={() => this.setState({ hasError: false })}
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
