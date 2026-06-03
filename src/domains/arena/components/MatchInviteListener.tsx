import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@auth/contexts/AuthContext';
import { useArenaStore } from '@store/useArenaStore';
import { motion, AnimatePresence } from 'framer-motion';

export function MatchInviteListener() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Zustand Store
  const receivedInvite = useArenaStore(state => state.receivedInvite);
  const activeMatch = useArenaStore(state => state.activeMatch);
  const acceptInvite = useArenaStore(state => state.acceptInvite);
  const acceptLudoInvite = useArenaStore(state => state.acceptLudoInvite);
  const declineInvite = useArenaStore(state => state.declineInvite);
  const rejectLudoInvite = useArenaStore(state => state.rejectLudoInvite);
  const listenToInvites = useArenaStore(state => state.listenToInvites);

  // Inicia a escuta de convites para o usuário logado
  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = listenToInvites(user.uid);
      return () => unsubscribe();
    }
  }, [user?.uid, listenToInvites]);

  // Se uma partida online ativa é detectada, redireciona ambos instantaneamente para a Hub Arena!
  useEffect(() => {
    if (activeMatch && activeMatch.id !== 'local_game') {
      navigate('/arena');
    }
  }, [activeMatch, navigate]);

  const handleAccept = async () => {
    if (!receivedInvite) return;
    if (receivedInvite.gameType === 'ludo') {
      await acceptLudoInvite(receivedInvite.id, user?.uid || '');
    } else {
      await acceptInvite(receivedInvite);
    }
    navigate('/arena');
  };

  const handleDecline = async () => {
    if (!receivedInvite) return;
    if (receivedInvite.gameType === 'ludo') {
      await rejectLudoInvite(receivedInvite.id, user?.uid || '');
    } else {
      await declineInvite(receivedInvite.id);
    }
  };

  return (
    <AnimatePresence>
      {receivedInvite && (
        <motion.div
          initial={{ opacity: 0, y: -80, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4"
        >
          {/* Dynamic Island Premium Container */}
          <div className="bg-[#05070a]/90 backdrop-blur-xl border border-white/10 p-5 rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.6)] flex items-center justify-between gap-4">
            
            {/* Foto / Info do Desafiador */}
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-xs font-bold text-gray-900 shrink-0 overflow-hidden relative">
                {receivedInvite.player1Photo ? (
                  <img src={receivedInvite.player1Photo} alt={receivedInvite.player1Name} className="w-full h-full object-cover" />
                ) : (
                  receivedInvite.player1Name[0].toUpperCase()
                )}
                {/* Ping de animação de convite ativo */}
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary-500 rounded-full border border-slate-950 animate-ping" />
              </div>
              <div className="overflow-hidden flex flex-col">
                <span className="text-[10px] font-black text-primary-400 uppercase tracking-wider truncate">Desafio Recebido!</span>
                <span className="text-[9px] text-gray-400 font-bold uppercase truncate leading-relaxed">
                  <span className="text-white">{receivedInvite.player1Name}</span> quer jogar {receivedInvite.gameType.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="flex gap-2 shrink-0">
              <button 
                onClick={handleDecline}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/20 text-gray-400 hover:text-rose-400 flex items-center justify-center transition-all cursor-pointer"
                title="Recusar"
              >
                <i className="ph-bold ph-x text-sm" />
              </button>
              
              <button 
                onClick={handleAccept}
                className="w-8 h-8 rounded-xl bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-primary-500/20"
                title="Aceitar Desafio e Jogar!"
              >
                <i className="ph-bold ph-sword text-sm animate-pulse" />
              </button>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
