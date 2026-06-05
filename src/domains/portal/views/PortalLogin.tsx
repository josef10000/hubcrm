import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { toast, Toaster } from 'sonner';
import { Globe, Lock, Mail, Eye, EyeOff, Shield } from 'lucide-react';

export default function PortalLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      // 1. Efetua login com o Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // 2. Busca o perfil correspondente na coleção profiles
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        toast.error('Perfil de usuário não encontrado.');
        await auth.signOut();
        setLoading(false);
        return;
      }

      const profileData = profileSnap.data();

      // 3. Verifica se possui a permissão de cliente
      if (profileData.role === 'client_admin' && profileData.orgId && profileData.clientId) {
        toast.success('Login efetuado com sucesso!');
        // Redireciona para o portal correspondente
        setTimeout(() => {
          navigate(`/portal/${profileData.orgId}/${profileData.clientId}`);
        }, 1000);
      } else if (profileData.role === 'admin' || profileData.role === 'manager' || profileData.role === 'employee') {
        // Se for da equipe administrativa, redireciona para o painel principal
        toast.success('Login administrativo detectado!');
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        toast.error('Acesso restrito apenas a clientes cadastrados.');
        await auth.signOut();
      }
    } catch (error: any) {
      console.error('Erro de login:', error);
      let errorMsg = 'E-mail ou senha inválidos.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMsg = 'E-mail ou senha incorretos.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMsg = 'Muitas tentativas malsucedidas. Tente novamente mais tarde.';
      }
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans select-none">
      <Toaster position="top-right" richColors />
      
      {/* Orbes Decorativas Ambientais em Neon */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-20%] w-[50vw] h-[50vw] bg-primary-600/10 rounded-full blur-[140px]"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[50vw] h-[50vw] bg-emerald-600/10 rounded-full blur-[140px]"></div>
      </div>

      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500 relative z-10">
        {/* Cabeçalho de Logotipo */}
        <div className="flex flex-col items-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-primary-500/20 blur-2xl rounded-full"></div>
            <div className="relative w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/20 border border-white/15">
              <Globe className="w-8 h-8 text-white animate-pulse" />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">PORTAL DO CLIENTE</h1>
          <p className="text-gray-400 text-xs mt-1 uppercase tracking-[0.2em] font-bold">Hub Symples &bull; Gestão Operacional</p>
        </div>

        {/* Card de Login Glassmorphism */}
        <div className="bg-white/[0.03] backdrop-blur-[35px] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl space-y-6 text-left">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Acessar minha conta</h2>
            <p className="text-xs text-gray-500">Insira suas credenciais corporativas para acessar sua agenda e finanças.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Input E-mail */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">E-mail Corporativo</label>
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
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Senha Secreta</label>
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

            {/* Botão de Submissão */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-4 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-600/50 text-white font-bold rounded-xl text-sm transition-all active:scale-[0.98] shadow-lg shadow-primary-500/10 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Verificando Acesso...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Portal</span>
                  <Shield size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-gray-600 text-[10px] uppercase tracking-widest font-medium">
          Hub Symples &copy; 2026 - Área Restrita
        </p>
      </div>
    </div>
  );
}
