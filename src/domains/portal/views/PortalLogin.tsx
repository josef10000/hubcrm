import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { toast, Toaster } from 'sonner';
import { Globe, Lock, Mail, Eye, EyeOff, Shield } from 'lucide-react';

export default function PortalLogin() {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Verifica se o usuário já está autenticado e redireciona automaticamente
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
          if (profileSnap.exists()) {
            const pData = profileSnap.data();
            if (pData.role === 'client_admin' && pData.orgId && pData.clientId) {
              const redirect = sessionStorage.getItem('portalRedirect');
              sessionStorage.removeItem('portalRedirect');
              navigate(redirect || `/portal/${pData.orgId}/${pData.clientId}`);
              return;
            }
            if (pData.role === 'admin' || pData.role === 'manager') {
              const redirect = sessionStorage.getItem('portalRedirect');
              if (redirect) {
                sessionStorage.removeItem('portalRedirect');
                navigate(redirect);
                return;
              }
            }
          }
        } catch (e) {
          console.error('[PortalLogin] Erro ao verificar perfil:', e);
        }
      }
      setCheckingAuth(false);
    });
    return () => unsub();
  }, [navigate]);

  const checkAndLinkProfile = async (user: any) => {
    const profileRef = doc(db, 'profiles', user.uid);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      const profileData = profileSnap.data();
      if (profileData.role === 'client_admin' && profileData.orgId && profileData.clientId) {
        toast.success('Login efetuado com sucesso!');
        const redirect = sessionStorage.getItem('portalRedirect');
        sessionStorage.removeItem('portalRedirect');
        setTimeout(() => {
          navigate(redirect || `/portal/${profileData.orgId}/${profileData.clientId}`);
        }, 1000);
      } else if (profileData.role === 'admin' || profileData.role === 'manager' || profileData.role === 'employee') {
        toast.success('Login administrativo detectado!');
        const redirect = sessionStorage.getItem('portalRedirect');
        sessionStorage.removeItem('portalRedirect');
        setTimeout(() => {
          navigate(redirect || '/');
        }, 1000);
      } else {
        toast.error('Acesso restrito apenas a clientes cadastrados.');
        await auth.signOut();
      }
    } else {
      // Perfil ainda não existe no Firestore, tenta a vinculação automática por e-mail via API serverless
      try {
        const response = await fetch('/api/portal_auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, uid: user.uid })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          toast.success('Sua conta foi vinculada e o acesso liberado!');
          setTimeout(() => {
            navigate(`/portal/${data.orgId}/${data.clientId}`);
          }, 1000);
        } else {
          toast.error(data.error || 'Este e-mail não está associado a nenhuma empresa no sistema.');
          
          // Se foi uma tentativa de criação de conta mal sucedida (não cadastrada no CRM), exclui do Auth
          if (isRegistering) {
            try { await user.delete(); } catch (e) {}
          }
          await auth.signOut();
        }
      } catch (err) {
        console.error(err);
        toast.error('Erro ao vincular perfil do portal com seu cadastro.');
        await auth.signOut();
      }
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Preencha todos os campos.');
      return;
    }

    if (isRegistering && password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      let user;
      if (isRegistering) {
        // Criação de Conta
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        user = userCredential.user;
      } else {
        // Login
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        user = userCredential.user;
      }

      await checkAndLinkProfile(user);

    } catch (error: any) {
      console.error('Erro de autenticação:', error);
      let errorMsg = 'E-mail ou senha inválidos.';
      if (error.code === 'auth/email-already-in-use') {
        errorMsg = 'Este e-mail já está em uso.';
      } else if (error.code === 'auth/weak-password') {
        errorMsg = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMsg = 'E-mail ou senha incorretos.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMsg = 'Muitas tentativas malsucedidas. Tente novamente mais tarde.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      await checkAndLinkProfile(user);
    } catch (error: any) {
      console.error('Erro no login Google:', error);
      let errorMsg = 'Erro ao efetuar login com o Google.';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMsg = 'Operação cancelada pelo usuário.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mb-4"></div>
        <p className="text-gray-400 font-medium animate-pulse">Verificando autenticação...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans select-none">
      <Toaster position="top-right" richColors />
      
      {/* Orbes Decorativas Ambientais em Neon */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-20%] w-[50vw] h-[50vw] bg-primary-600/10 rounded-full blur-[140px]"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[50vw] h-[50vw] bg-emerald-600/10 rounded-full blur-[140px]"></div>
      </div>

      <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500 relative z-10">
        {/* Cabeçalho de Logotipo */}
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-primary-500/20 blur-2xl rounded-full"></div>
            <div className="relative w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/20 border border-white/15">
              <Globe className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">PORTAL DO CLIENTE</h1>
          <p className="text-gray-400 text-xs mt-1 uppercase tracking-[0.2em] font-bold">Hub Symples &bull; Gestão Operacional</p>
        </div>

        {/* Card de Login/Cadastro Glassmorphism */}
        <div className="bg-white/[0.03] backdrop-blur-[35px] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl space-y-6 text-left">
          {/* Seletor de Abas (Entrar vs Cadastrar) */}
          <div className="flex bg-black/40 border border-white/10 p-1 rounded-xl">
            <button
              onClick={() => {
                setIsRegistering(false);
                setEmail('');
                setPassword('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                !isRegistering ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'
              }`}
            >
              Fazer Login
            </button>
            <button
              onClick={() => {
                setIsRegistering(true);
                setEmail('');
                setPassword('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                isRegistering ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'
              }`}
            >
              Criar Conta
            </button>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white mb-1">
              {isRegistering ? 'Criar minha conta' : 'Acessar minha conta'}
            </h2>
            <p className="text-xs text-gray-500">
              {isRegistering 
                ? 'Insira o e-mail cadastrado no seu contrato para criar sua senha de acesso.' 
                : 'Insira suas credenciais corporativas para acessar sua agenda e finanças.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {/* Input E-mail */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">E-mail Cadastrado</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@empresa.com"
                  className="w-full pl-12 pr-4 py-3.5 bg-black/30 border border-white/10 hover:border-white/20 focus:border-primary-500 text-white rounded-xl text-sm outline-none transition-all placeholder-gray-600 focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
            </div>

            {/* Input Senha */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {isRegistering ? 'Definir Senha (mín. 6 caract.)' : 'Senha Secreta'}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  className="w-full pl-12 pr-12 py-3.5 bg-black/30 border border-white/10 hover:border-white/20 focus:border-primary-500 text-white rounded-xl text-sm outline-none transition-all placeholder-gray-600 focus:ring-1 focus:ring-primary-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Input Confirmar Senha (Apenas Cadastro) */}
            {isRegistering && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Confirmar Senha</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                    className="w-full pl-12 pr-4 py-3.5 bg-black/30 border border-white/10 hover:border-white/20 focus:border-primary-500 text-white rounded-xl text-sm outline-none transition-all placeholder-gray-600 focus:ring-1 focus:ring-primary-500"
                    required={isRegistering}
                  />
                </div>
              </div>
            )}

            {/* Botão de Submissão */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-4 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-600/50 text-white font-bold rounded-xl text-sm transition-all active:scale-[0.98] shadow-lg shadow-primary-500/10 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <span>{isRegistering ? 'Finalizar Cadastro' : 'Entrar no Portal'}</span>
                  <Shield size={16} />
                </>
              )}
            </button>
          </form>

          {/* Divisor "Ou" */}
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ou acesse com</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          {/* Botão Google Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center active:scale-[0.98]"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Google Login
          </button>
        </div>

        <p className="text-gray-600 text-[10px] uppercase tracking-widest font-medium">
          Hub Symples &copy; 2026 - Área Restrita
        </p>
      </div>
    </div>
  );
}
