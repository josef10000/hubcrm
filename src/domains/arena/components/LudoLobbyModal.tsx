import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, User, Play, ShieldAlert, CheckCircle2, AlertCircle, Bot } from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { useArenaStore, GameMatch } from '@/store/useArenaStore';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface LudoLobbyModalProps {
  matchId: string;
  onClose: () => void;
}

export function LudoLobbyModal({ matchId, onClose }: LudoLobbyModalProps) {
  const { user } = useAuth();
  const { teamProfiles = [] } = useCRM();
  
  // Arena Store
  const activeMatch = useArenaStore(state => state.activeMatch);
  const sentInvite = useArenaStore(state => state.sentInvite);
  const onlinePlayers = useArenaStore(state => state.onlinePlayers);
  const acceptLudoInvite = useArenaStore(state => state.acceptLudoInvite);
  const rejectLudoInvite = useArenaStore(state => state.rejectLudoInvite);
  const startLudoMatch = useArenaStore(state => state.startLudoMatch);
  const listenToMatch = useArenaStore(state => state.listenToMatch);

  // Monitorar a partida atual do lobby
  const currentMatch = (activeMatch?.id === matchId ? activeMatch : sentInvite?.id === matchId ? sentInvite : null) as GameMatch | null;

  const [showInviteSelectorSlot, setShowInviteSelectorSlot] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = listenToMatch(matchId);
    return () => unsubscribe();
  }, [matchId, listenToMatch]);

  if (!currentMatch) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  const isHost = currentMatch.player1Id === user?.uid;
  const playersAccepted = currentMatch.playersAccepted || [];

  // Mapeamento dos slots de jogadores
  const slots = [
    {
      slotIndex: 1,
      color: 'red',
      label: 'Vermelho (Host)',
      uid: currentMatch.player1Id,
      name: currentMatch.player1Name,
      photo: currentMatch.player1Photo,
      status: 'ready',
      colorClass: 'from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-400'
    },
    {
      slotIndex: 2,
      color: 'green',
      label: 'Verde',
      uid: currentMatch.player2Id,
      name: currentMatch.player2Name,
      photo: currentMatch.player2Photo,
      status: currentMatch.player2Id === 'computer' ? 'cpu' : playersAccepted.includes(currentMatch.player2Id) ? 'ready' : 'waiting',
      colorClass: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400'
    },
    {
      slotIndex: 3,
      color: 'yellow',
      label: 'Amarelo',
      uid: currentMatch.player3Id,
      name: currentMatch.player3Name,
      photo: currentMatch.player3Photo,
      status: currentMatch.player3Id === 'computer' ? 'cpu' : playersAccepted.includes(currentMatch.player3Id || '') ? 'ready' : 'waiting',
      colorClass: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400'
    },
    {
      slotIndex: 4,
      color: 'blue',
      label: 'Azul',
      uid: currentMatch.player4Id,
      name: currentMatch.player4Name,
      photo: currentMatch.player4Photo,
      status: currentMatch.player4Id === 'computer' ? 'cpu' : playersAccepted.includes(currentMatch.player4Id || '') ? 'ready' : 'waiting',
      colorClass: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 text-indigo-400'
    }
  ];

  // Identifica o slot do próprio usuário logado se ele for um convidado
  const mySlot = slots.find(s => s.uid === user?.uid);
  const hasIAccepted = mySlot ? playersAccepted.includes(user?.uid || '') : false;

  const handleInvitePlayer = async (slotIndex: number, invitedUser: any) => {
    if (!isHost) return;
    try {
      const matchDocRef = doc(db, 'matches', matchId);
      const updates: any = {};
      
      if (slotIndex === 2) {
        updates.player2Id = invitedUser.uid;
        updates.player2Name = invitedUser.displayName || invitedUser.name || 'Jogador';
        updates.player2Photo = invitedUser.photoURL || invitedUser.photoUrl || null;
      } else if (slotIndex === 3) {
        updates.player3Id = invitedUser.uid;
        updates.player3Name = invitedUser.displayName || invitedUser.name || 'Jogador';
        updates.player3Photo = invitedUser.photoURL || invitedUser.photoUrl || null;
      } else if (slotIndex === 4) {
        updates.player4Id = invitedUser.uid;
        updates.player4Name = invitedUser.displayName || invitedUser.name || 'Jogador';
        updates.player4Photo = invitedUser.photoURL || invitedUser.photoUrl || null;
      }

      await updateDoc(matchDocRef, updates);
      setShowInviteSelectorSlot(null);
      toast.success(`Convite enviado para ${invitedUser.displayName || invitedUser.name}!`);
    } catch (err) {
      toast.error('Erro ao enviar convite.');
    }
  };

  const handleSetCpu = async (slotIndex: number) => {
    if (!isHost) return;
    try {
      const matchDocRef = doc(db, 'matches', matchId);
      const updates: any = {};
      
      if (slotIndex === 2) {
        updates.player2Id = 'computer';
        updates.player2Name = 'CPU 🤖';
        updates.player2Photo = null;
      } else if (slotIndex === 3) {
        updates.player3Id = 'computer';
        updates.player3Name = 'CPU 🤖';
        updates.player3Photo = null;
      } else if (slotIndex === 4) {
        updates.player4Id = 'computer';
        updates.player4Name = 'CPU 🤖';
        updates.player4Photo = null;
      }

      await updateDoc(matchDocRef, updates);
      toast.info(`Slot ${slotIndex} alterado para CPU.`);
    } catch (err) {
      toast.error('Erro ao configurar slot.');
    }
  };

  const handleStartGame = async () => {
    if (!isHost) return;
    const tId = toast.loading('Inicializando tabuleiro de Ludo...');
    try {
      await startLudoMatch(matchId);
      toast.success('Partida iniciada!', { id: tId });
      onClose();
    } catch (err) {
      toast.error('Erro ao iniciar partida.', { id: tId });
    }
  };

  // Filtrar colaboradores online que não estejam já em nenhum slot do lobby
  const currentSlotUids = slots.map(s => s.uid).filter(Boolean);
  const availableCollaborators = teamProfiles.filter(
    p => p.uid !== user?.uid && !currentSlotUids.includes(p.uid)
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-6 select-none"
    >
      <motion.div
        initial={{ scale: 0.94, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 15 }}
        className="w-full max-w-2xl rounded-[2.5rem] border bg-slate-950/90 border-indigo-500/20 text-white p-8 flex flex-col gap-6 shadow-[0_0_50px_rgba(99,102,241,0.15)] max-h-[90vh] overflow-y-auto custom-scrollbar relative"
      >
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[90px] -mr-16 -mt-16 bg-indigo-500 opacity-20 pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-center relative z-10 border-b border-white/5 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Users size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-widest leading-none flex items-center gap-2">
                Sala de Espera de Ludo
              </h3>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Multiplayer de até 4 jogadores online</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Slots do Lobby */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          {slots.map(slot => (
            <div
              key={slot.color}
              className={`p-5 rounded-[2rem] border bg-gradient-to-br flex flex-col justify-between min-h-[140px] relative overflow-hidden transition-all ${slot.colorClass}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[9px] font-black uppercase tracking-widest">{slot.label}</span>
                {slot.status === 'ready' && (
                  <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 size={8} /> Pronto!
                  </span>
                )}
                {slot.status === 'waiting' && (
                  <span className="text-[8px] font-black bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <AlertCircle size={8} className="animate-pulse" /> Aguardando...
                  </span>
                )}
                {slot.status === 'cpu' && (
                  <span className="text-[8px] font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Bot size={8} /> Robô
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 my-3">
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-sm font-black overflow-hidden relative">
                  {slot.status === 'cpu' ? (
                    <Bot size={18} className="text-indigo-400" />
                  ) : slot.photo ? (
                    <img src={slot.photo} alt={slot.name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={18} className="text-gray-500" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black uppercase tracking-wider">{slot.name || 'Livre'}</span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                    {slot.status === 'cpu' ? 'Inteligência Artificial' : slot.status === 'ready' ? 'Jogador Confirmado' : slot.uid ? 'Convite Enviado' : 'Slot Vazio'}
                  </span>
                </div>
              </div>

              {/* Botões de Ação para o Host */}
              {isHost && slot.slotIndex > 1 && (
                <div className="flex gap-2 mt-2 border-t border-white/5 pt-3">
                  <button
                    onClick={() => setShowInviteSelectorSlot(slot.slotIndex)}
                    className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-center cursor-pointer text-gray-300"
                  >
                    Convidar
                  </button>
                  {slot.status !== 'cpu' && (
                    <button
                      onClick={() => handleSetCpu(slot.slotIndex)}
                      className="flex-1 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg text-[8px] font-black uppercase tracking-widest text-center cursor-pointer text-indigo-400"
                    >
                      Usar CPU
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Seletor de Convidados */}
        <AnimatePresence>
          {showInviteSelectorSlot !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-slate-950/50 border border-white/5 rounded-[2rem] p-5 relative z-10 flex flex-col gap-3"
            >
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                  Convidar para o Slot {showInviteSelectorSlot}
                </span>
                <button
                  onClick={() => setShowInviteSelectorSlot(null)}
                  className="text-[9px] font-black uppercase text-gray-500 hover:text-white"
                >
                  Fechar ✕
                </button>
              </div>

              <div className="flex flex-col gap-2 overflow-y-auto max-h-[160px] custom-scrollbar pr-1">
                {availableCollaborators.length > 0 ? (
                  availableCollaborators.map(collab => {
                    const isOnline = onlinePlayers.some(op => op.uid === collab.uid);
                    return (
                      <div
                        key={collab.uid}
                        className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/5 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-900 overflow-hidden relative">
                            {collab.photoURL || collab.photoUrl ? (
                              <img src={collab.photoURL || collab.photoUrl} alt={collab.displayName || collab.name} className="w-full h-full object-cover" />
                            ) : (
                              <User size={12} className="text-gray-500" />
                            )}
                            {isOnline && (
                              <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-500 rounded-full border border-slate-950" />
                            )}
                          </div>
                          <span className="text-[9px] font-bold text-gray-300 uppercase tracking-wider">
                            {collab.displayName || collab.name}
                          </span>
                        </div>
                        <button
                          onClick={() => handleInvitePlayer(showInviteSelectorSlot, collab)}
                          className="py-1.5 px-3 bg-indigo-500 hover:bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest rounded-lg"
                        >
                          Convidar
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                    Nenhum colaborador disponível para convidar.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer com Ações */}
        <div className="flex gap-4 border-t border-white/5 pt-5 relative z-10 mt-auto">
          {isHost ? (
            <button
              onClick={handleStartGame}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-98 transition-all cursor-pointer"
            >
              <Play size={14} fill="white" />
              <span>Iniciar Partida de Ludo</span>
            </button>
          ) : (
            <div className="flex gap-3 w-full">
              {!hasIAccepted ? (
                <>
                  <button
                    onClick={() => acceptLudoInvite(matchId, user?.uid || '')}
                    className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-98 transition-all cursor-pointer"
                  >
                    Aceitar Convite (Ficar Pronto)
                  </button>
                  <button
                    onClick={() => rejectLudoInvite(matchId, user?.uid || '')}
                    className="flex-1 py-4 bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/20 text-rose-400 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-98 transition-all cursor-pointer"
                  >
                    Recusar Convite
                  </button>
                </>
              ) : (
                <div className="w-full text-center py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-emerald-400 animate-pulse">
                  Pronto! Aguardando o Host Iniciar o Jogo...
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
