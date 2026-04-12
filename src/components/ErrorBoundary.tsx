import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (React.Component as any) {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-red-100">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Oups ! Quelque chose a mal tourné.</h1>
          <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
            Une erreur inattendue est survenue dans l'application PorcTrack.
          </p>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 mb-8 w-full max-w-sm text-left overflow-auto max-h-32">
            <p className="text-[10px] font-mono text-red-600">{this.state.error?.message}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-8 py-4 bg-emerald-900 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-all"
          >
            <RefreshCw className="w-5 h-5" />
            Redémarrer l'application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
