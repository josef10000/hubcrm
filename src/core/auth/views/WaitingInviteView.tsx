import React from 'react';
import { ShieldAlert, LogOut, Clock, Mail } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';

export default function WaitingInviteView() {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (e) {
      toast.error('Erro ao sair.');
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-primary-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-primary-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500 relative z-10">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-primary-500/20 blur-2xl rounded-full"></div>
          <div className="relative bg-gray-900/50 backdrop-blur-3xl border border-white/10 p-6 rounded-3xl shadow-2xl">
            <ShieldAlert size={64} className="text-primary-500 mx-auto" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-white tracking-tight">Acesso Pendente</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Olá! Identificamos que você ainda não faz parte de nenhuma organização no Hub Central.
          </p>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/5 rounded-2xl p-6 text-left space-y-4">
            <div className="flex items-start gap-3">
              <Clock className="text-primary-500 shrink-0 mt-1" size={18} />
              <p className="text-xs text-gray-300">
                <span className="font-bold block text-white mb-1">Aguarde o Convite</span>
                Peça ao administrador da sua empresa para enviar um convite para o seu e-mail de cadastro.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="text-primary-500 shrink-0 mt-1" size={18} />
              <p className="text-xs text-gray-300">
                <span className="font-bold block text-white mb-1">Verifique seu E-mail</span>
                Assim que convidado, você receberá um link de acesso oficial.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-all shadow-xl active:scale-95"
          >
            Já fui convidado, atualizar
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Sair da Conta
          </button>
        </div>

        <p className="text-gray-500 text-[10px] uppercase tracking-widest font-medium">
          Hub Symples &copy; 2026 - Gestão Segura
        </p>
      </div>
    </div>
  );
}
