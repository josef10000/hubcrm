import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-10 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] text-center space-y-4">
          <i className="ph-duotone ph-warning-octagon text-5xl text-rose-500" />
          <h2 className="text-xl font-black text-white uppercase tracking-tighter">Ops! Algo deu errado.</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Ocorreu um erro inesperado neste módulo. Tente recarregar a página ou voltar mais tarde.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-rose-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-lg shadow-rose-500/20"
          >
            Recarregar Sistema
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
