import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@auth/contexts/AuthContext';
import { Loader2, UserCheck, Shield, AlertCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function AcceptInviteView() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [authTimeout, setAuthTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (authLoading) {
        console.warn("[Invite] Auth loading took too long, showing fallback.");
        setAuthTimeout(true);
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [authLoading]);

  const handleAccept = async () => {
    if (!user) {
      // Save token to session storage to resume after login
      sessionStorage.setItem('pendingInviteToken', token || '');
      toast.info('Faça login ou crie sua conta para aceitar o convite.');
      navigate('/');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/team/accept', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        toast.success('Convite aceito! Bem-vindo à equipe.');
        // Redirect to dashboard after a short delay
        setTimeout(() => navigate('/'), 2000);
      } else {
        setError(data.error || 'Erro ao aceitar convite');
        toast.error(data.error || 'Erro ao aceitar convite');
      }
    } catch (err) {
      setError('Erro de conexão ao servidor');
    } finally {
      setLoading(false);
    }
  };

  // Auto-accept if logged in and returning from auth
  useEffect(() => {
    const savedToken = sessionStorage.getItem('pendingInviteToken');
    if (user && savedToken === token) {
      sessionStorage.removeItem('pendingInviteToken');
      handleAccept();
    }
  }, [user, token]);

  if (authLoading && !authTimeout) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-primary-500 mb-4" size={48} />
        <p className="text-gray-500">Verificando autenticação...</p>
      </div>
    );
  }

  // Se houver timeout ou demore demais, mostramos o botão mesmo assim (fallback)
  // O handleAccept tratará se o user é null ou não logo em seguida.

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-primary-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/80 dark:bg-zinc-900/50 backdrop-blur-2xl border border-gray-200 dark:border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative z-10 text-center">
        <div className="w-20 h-20 bg-primary-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary-500/10">
          <UserCheck size={40} className="text-primary-500" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Convite de Equipe</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Você foi convidado para colaborar no Hub Central.
        </p>

        {success ? (
          <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-2xl animate-in zoom-in duration-300">
            <Shield className="mx-auto text-green-500 mb-2" size={32} />
            <h2 className="text-green-500 font-bold text-lg">Sucesso!</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Convite aceito. Redirecionando para o painel...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl">
            <AlertCircle className="mx-auto text-red-500 mb-2" size={32} />
            <h2 className="text-red-500 font-bold text-lg">Ops! Algo deu errado</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{error}</p>
            <button onClick={() => navigate('/')} className="text-sm text-primary-500 font-bold underline">Voltar para Início</button>
          </div>
        ) : (
          <div className="space-y-6">
            <button 
              onClick={handleAccept}
              disabled={loading}
              className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-gray-900 dark:text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary-500/30 transition-all flex items-center justify-center group"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  {user ? 'Aceitar Convite' : 'Entrar para Aceitar'}
                  <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            <p className="text-xs text-gray-400">
              Ao aceitar, você terá acesso aos dados compartilhados da organização conforme seu cargo atribuído.
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center gap-2 opacity-50 grayscale hover:grayscale-0 transition-all cursor-default">
        <img src="/logo.png" alt="Hub Central" className="h-6 w-auto" />
        <span className="text-sm font-medium text-gray-500">Hub Central by Hub Symples</span>
      </div>
    </div>
  );
}
