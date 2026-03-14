import React, { useState } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { Mail, Lock, ArrowLeft } from 'lucide-react';

export default function Auth() {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleSignIn = async () => {
    setError('');
    setMessage('');
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

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (mode === 'register') {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Email Auth Error:", err);
      if (err.code === 'auth/email-already-in-use') setError('Este e-mail já está em uso.');
      else if (err.code === 'auth/invalid-email') setError('E-mail inválido.');
      else if (err.code === 'auth/weak-password') setError('A senha deve ter pelo menos 6 caracteres.');
      else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') setError('E-mail ou senha incorretos.');
      else setError(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, insira seu e-mail para redefinir a senha.');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('E-mail de redefinição de senha enviado! Verifique sua caixa de entrada.');
      setMode('login');
    } catch (err: any) {
      console.error("Reset Password Error:", err);
      if (err.code === 'auth/user-not-found') setError('Usuário não encontrado.');
      else setError(`Erro: ${err.message}`);
    } finally {
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
          {mode === 'login' ? 'Acesso exclusivo para administração' : 
           mode === 'register' ? 'Crie sua conta de administrador' : 
           'Redefina sua senha de acesso'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/5 backdrop-blur-2xl py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10 border border-white/10">
          {error && <div className="mb-6 bg-rose-500/10 border border-rose-500/50 text-rose-400 p-3 rounded-xl text-sm text-center">{error}</div>}
          {message && <div className="mb-6 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-3 rounded-xl text-sm text-center">{message}</div>}

          {mode === 'forgot' ? (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300">E-mail</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 bg-black/20 border border-white/10 rounded-xl py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar e-mail de redefinição'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar para o login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300">E-mail</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 bg-black/20 border border-white/10 rounded-xl py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">Senha</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 bg-black/20 border border-white/10 rounded-xl py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                </div>
                {mode === 'login' && (
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all disabled:opacity-50"
              >
                {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Cadastrar'}
              </button>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {mode === 'login' ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#1a1a1a] text-gray-500 rounded-lg">Ou continue com</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-white/10 rounded-xl shadow-lg bg-white/5 text-sm font-medium text-white hover:bg-white/10 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
