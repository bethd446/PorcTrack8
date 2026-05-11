import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/design-system';

interface BandesEBProps { children: React.ReactNode; onReset: () => void; }
interface BandesEBState { hasError: boolean; error: Error | null; }

class BandesErrorBoundary extends React.Component<BandesEBProps, BandesEBState> {
  declare state: BandesEBState;
  declare props: BandesEBProps;
  declare setState: React.Component<BandesEBProps, BandesEBState>['setState'];

  constructor(props: BandesEBProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): BandesEBState {
    return { hasError: true, error };
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="agritech-root p-10 text-center space-y-6 flex flex-col items-center justify-center min-h-[60vh]">
          <AlertTriangle size={38} className="text-red mb-4" />
          <h2 className="agritech-heading text-xl uppercase">Erreur d'affichage</h2>
          <p className="text-[12px] text-text-2 leading-relaxed max-w-xs">
            {this.state.error?.message || 'Une erreur critique est survenue dans le module Portées.'}
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button
              variant="primary"
              fullWidth
              onClick={this.handleReset}
              className="pressable w-full h-11 rounded-md bg-accent text-bg-0 text-[12px] uppercase tracking-wide transition-colors"
            >
              Rafraîchir
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => { window.location.href = '/'; }}
              className="pressable w-full h-11 rounded-md bg-bg-1 border border-border text-text-1 text-[12px] uppercase tracking-wide transition-colors"
            >
              Retour Accueil
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default BandesErrorBoundary;
