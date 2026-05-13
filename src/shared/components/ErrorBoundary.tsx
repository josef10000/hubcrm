import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Logger } from '@/lib/logger';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Logger.error("[ErrorBoundary] Uncaught error:", error, { errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      const error = this.state.error;
      const isChunkError = error?.name === 'ChunkLoadError' || 
                          error?.message?.includes('Failed to fetch dynamically imported module');

      if (isChunkError) {
        return (
          <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6 font-sans">
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] max-w-lg w-full text-center shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
               <div className="relative z-10">
                 <div className="w-20 h-20 bg-primary-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-primary-500/20">
                    <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                 </div>
                 <h2 className="text-3xl font-black text-white mb-4 tracking-tight uppercase italic">Atualização Necessária</h2>
                 <p className="text-gray-400 mb-8 leading-relaxed">
                   Uma nova versão do Hub Central foi detectada. Para continuar com segurança e performance, precisamos atualizar sua sessão.
                 </p>
                 <button 
                   onClick={() => window.location.reload()}
                   className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-gray-900 font-black rounded-2xl transition-all shadow-xl shadow-primary-500/20 active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                 >
                   Atualizar Sistema Agora
                 </button>
               </div>
            </div>
          </div>
        );
      }

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
