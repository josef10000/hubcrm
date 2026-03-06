import React, { useState } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';

export default function Auth() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError('Domínio não autorizado. Adicione a URL atual nos "Domínios Autorizados" do Firebase.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Login com Google não está ativado no Firebase Console.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('O pop-up de login foi fechado antes de concluir.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('O pop-up foi bloqueado pelo navegador. Permita pop-ups para este site.');
      } else {
        setError(`Erro: ${err.message || 'Falha ao fazer login com o Google.'}`);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-gray-100 overflow-hidden">
      {/* Background Glows for Glassmorphism */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-orange-500/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-orange-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <img src="https://i.imgur.com/2H9UPAW.png" alt="Hub central Logo" className="h-64 w-auto object-contain drop-shadow-2xl -mb-16" referrerPolicy="no-referrer" />
        </div>
        <h2 className="text-center text-3xl font-extrabold text-white tracking-tight">
          Hub central
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Acesso exclusivo para administração
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/5 backdrop-blur-2xl py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10 border border-white/10">
          {error && <div className="mb-6 bg-rose-500/10 border border-rose-500/50 text-rose-400 p-3 rounded-xl text-sm text-center">{error}</div>}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex justify-center items-center py-3.5 px-4 border border-white/10 rounded-xl shadow-lg bg-white/10 text-sm font-medium text-white hover:bg-white/20 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {loading ? 'Conectando...' : 'Entrar com Google'}
          </button>
        </div>
      </div>
    </div>
  );
}
