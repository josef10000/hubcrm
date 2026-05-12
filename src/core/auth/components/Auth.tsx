import React, { useState } from 'react';
import { auth, googleProvider } from '@/lib/firebase';
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
    <div className="min-h-screen bg-[#02040a] relative flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-gray-100 overflow-hidden">
      {/* Background Glows for Glassmorphism */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[150px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary-600/10 rounded-full blur-[150px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>

      {/* Grain Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')]" />

      <style>
        {`
          input:-webkit-autofill,
          input:-webkit-autofill:hover,
          input:-webkit-autofill:focus,
          input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px #0a0c12 inset !important;
            -webkit-text-fill-color: white !important;
            transition: background-color 5000s ease-in-out 0s;
          }
        `}
      </style>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center px-4">
        <div className="flex justify-center mb-6">
          <img 
            src="/logo.png" 
            alt="Hub Central Logo" 
            className="h-32 w-auto object-contain drop-shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] hover:scale-105 transition-transform duration-700" 
            referrerPolicy="no-referrer" 
          />
        </div>
        <div className="flex items-baseline justify-center gap-2 mb-2">
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase">Hub</h1>
          <p className="text-4xl font-light text-primary-400 tracking-tight uppercase">Central</p>
        </div>
        <p className="text-xs font-black uppercase tracking-[0.4em] text-primary-500/60">
          {mode === 'login' ? 'Corporate Portal v6.2' : 
           mode === 'register' ? 'Admin Access Request' : 
           'Credential Recovery System'}
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-[#0a0c12]/40 backdrop-blur-[40px] py-10 px-6 shadow-[0_40px_80px_rgba(0,0,0,0.5)] sm:rounded-[2.5rem] sm:px-12 border border-white/10 relative overflow-hidden">
          {/* Subtle line glow */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />
          
          {error && <div className="mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-2xl text-sm font-medium text-center animate-shake">{error}</div>}
          {message && <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl text-sm font-medium text-center">{message}</div>}

          {mode === 'forgot' ? (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-primary-500/80 mb-2 ml-1">E-mail</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i className="ph-duotone ph-envelope text-lg text-gray-500" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl py-3.5 text-white placeholder-gray-600 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 outline-none transition-all"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-4 px-4 rounded-2xl shadow-[0_10px_20px_rgba(var(--primary-rgb),0.2)] text-sm font-black uppercase tracking-widest text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Recuperar Acesso'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="inline-flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-colors"
                >
                  <i className="ph-bold ph-arrow-left mr-2" />
                  Voltar para o login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-primary-500/80 mb-2 ml-1">Usuário</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i className="ph-duotone ph-envelope text-xl text-gray-500" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl py-3.5 text-white placeholder-gray-600 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 outline-none transition-all"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2 ml-1">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-primary-500/80">Senha</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[10px] font-black uppercase tracking-[0.1em] text-primary-400 hover:text-primary-300 transition-colors"
                    >
                      Esqueceu?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i className="ph-duotone ph-lock-key text-xl text-gray-500" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl py-3.5 text-white placeholder-gray-600 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-4 px-4 rounded-2xl shadow-[0_15px_30px_rgba(var(--primary-rgb),0.3)] text-sm font-black uppercase tracking-[0.2em] text-white bg-gradient-to-br from-primary-500 to-primary-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? 'Validando...' : mode === 'login' ? 'Entrar Agora' : 'Solicitar Acesso'}
              </button>

              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                  className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-colors"
                >
                  {mode === 'login' ? 'Novo por aqui? Criar conta' : 'Já possui conta? Acessar'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5" />
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.3em]">
                <span className="px-4 bg-[#0a0c12] text-gray-600">Single Sign-On</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-white/10 rounded-2xl bg-white/[0.03] text-[11px] font-black uppercase tracking-widest text-white hover:bg-white/[0.08] transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] shadow-xl"
              >
                <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continuar com Google
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
