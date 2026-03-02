import React, { useState } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup } from 'firebase/auth';
import { Building2, Mail, Lock, LogIn, UserPlus, KeyRound } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isReset) {
        await sendPasswordResetEmail(auth, email);
        setMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
        setIsReset(false);
      } else if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Ocorreu um erro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-gray-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Building2 size={24} className="text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          GMN CRM
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          {isReset ? 'Recuperar Senha' : isLogin ? 'Faça login na sua conta' : 'Crie sua conta gratuitamente'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-900 py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-gray-800">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-3 rounded-lg text-sm">{error}</div>}
            {message && <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-3 rounded-lg text-sm">{message}</div>}

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
                  className="block w-full pl-10 bg-gray-950 border border-gray-800 rounded-lg py-2 text-gray-200 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            {!isReset && (
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
                    className="block w-full pl-10 bg-gray-950 border border-gray-800 rounded-lg py-2 text-gray-200 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {isLogin && !isReset && (
              <div className="flex items-center justify-end">
                <div className="text-sm">
                  <button type="button" onClick={() => setIsReset(true)} className="font-medium text-blue-500 hover:text-blue-400">
                    Esqueceu a senha?
                  </button>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 transition-colors disabled:opacity-50"
              >
                {loading ? 'Aguarde...' : isReset ? 'Enviar Link de Recuperação' : isLogin ? 'Entrar' : 'Criar Conta'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-800" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-900 text-gray-500">Ou continue com</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-gray-700 rounded-lg shadow-sm bg-gray-950 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </button>
            </div>
          </div>

          <div className="mt-6 flex justify-center space-x-4 text-sm">
            {isReset ? (
              <button type="button" onClick={() => setIsReset(false)} className="text-gray-400 hover:text-white transition-colors">
                Voltar para o Login
              </button>
            ) : (
              <>
                <button type="button" onClick={() => setIsLogin(true)} className={`${isLogin ? 'text-white font-medium' : 'text-gray-400 hover:text-white'} transition-colors`}>
                  Login
                </button>
                <span className="text-gray-700">|</span>
                <button type="button" onClick={() => setIsLogin(false)} className={`${!isLogin ? 'text-white font-medium' : 'text-gray-400 hover:text-white'} transition-colors`}>
                  Cadastrar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
