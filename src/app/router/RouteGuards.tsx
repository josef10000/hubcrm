import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import Auth from '@auth/components/Auth';
import WaitingInviteView from '@auth/views/WaitingInviteView';
import ContractSignatureGate from '@auth/components/ContractSignatureGate';

interface GuardProps {
  children: React.ReactNode;
}

/**
 * Protege rotas que exigem autenticação e um perfil carregado.
 */
export function AuthGuard({ children }: GuardProps) {
  const { user, userProfile, loading, errorMsg } = useAuth();

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

  const rawRole = userProfile ? (typeof userProfile.role === 'string' ? userProfile.role : (userProfile.role as any)?.id || (userProfile.role as any)?.name || '') : '';
  const isClientAdmin = userProfile && (rawRole === 'client_admin' || userProfile.clientId);

  if (isClientAdmin) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6">
        <div className="bg-white/5 border border-amber-500/20 p-8 rounded-[2rem] max-w-md text-center backdrop-blur-xl shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-amber-400 font-bold mb-3 text-lg font-display">Acesso Restrito ao CRM</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">
            Você está conectado com uma conta de <strong>Portal do Cliente</strong> ({user.email}). Para acessar o painel administrativo do CRM, por favor faça login com uma conta administrativa.
          </p>
          <div className="flex flex-col gap-2.5">
            <button 
              onClick={async () => {
                const { auth } = await import('@/lib/firebase');
                await auth.signOut();
                window.location.reload();
              }} 
              className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-all active:scale-95 text-xs uppercase tracking-wider shadow-lg shadow-primary-500/20"
            >
              Fazer Login como Administrador
            </button>
            {userProfile.orgId && userProfile.clientId && (
              <a 
                href={`/portal/${userProfile.orgId}/${userProfile.clientId}`}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all text-xs font-bold uppercase tracking-wider border border-white/5 block"
              >
                Voltar para o Portal do Cliente
              </a>
            )}
          </div>
        </div>
      </div>
    );
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

/**
 * Intercepta colaboradores que possuem contratos pendentes de assinatura.
 * Os administradores estão isentos de bloqueio.
 */
export function ContractGuard({ children }: GuardProps) {
  const { userProfile, refreshProfile } = useAuth();

  if (!userProfile) return <>{children}</>;

  // Verifica se o usuário atual é Administrador
  // Administradores possuem a permissão MANAGE_SETTINGS ou a role contendo "Admin"
  const rawRole = typeof userProfile.role === 'string' ? userProfile.role : (userProfile.role as any)?.name || '';
  const isAdmin = userProfile.permissions?.includes('MANAGE_SETTINGS') || String(rawRole).toLowerCase().includes('admin');

  // Filtra contratos no estado pendente
  const pendingContracts = userProfile.contracts?.filter(c => c.status === 'pending') || [];

  // Se houver contrato pendente E não for administrador, bloqueia com a tela de assinatura
  if (pendingContracts.length > 0 && !isAdmin) {
    return (
      <ContractSignatureGate 
        userProfile={userProfile} 
        pendingContracts={pendingContracts} 
        onSignSuccess={async () => {
          if (refreshProfile) {
            await refreshProfile();
          } else {
            window.location.reload();
          }
        }} 
      />
    );
  }

  return <>{children}</>;
}
