import React from 'react';
import { useAuth } from '@auth/contexts/AuthContext';
import Auth from '@auth/components/Auth';
import WaitingInviteView from '@auth/views/WaitingInviteView';

interface GuardProps {
  children: React.ReactNode;
}

/**
 * Protege rotas que exigem autenticação e um perfil carregado.
 */
export function AuthGuard({ children }: GuardProps) {
  const { user, loading, errorMsg } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Carregando autenticação...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6">
        <div className="bg-gray-200 dark:bg-white/10 border border-red-500/30 p-6 rounded-2xl max-w-md text-center">
          <h2 className="text-red-400 font-semibold mb-2">Erro de Autenticação</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{errorMsg}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:bg-white/20 text-gray-900 dark:text-white rounded-xl transition-colors text-sm">
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return <>{children}</>;
}

/**
 * Intercepta usuários que estão com convite pendente.
 */
export function PendingInviteGuard({ children }: GuardProps) {
  const { userProfile } = useAuth();

  if (userProfile?.orgId === 'pending') {
    return <WaitingInviteView />;
  }

  return <>{children}</>;
}
