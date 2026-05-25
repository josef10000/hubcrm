import React, { useEffect, useState } from 'react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { useArenaStore, GameType } from '@store/useArenaStore';
import { Connect4Board } from '../components/Connect4Board';
import { CheckersBoard } from '../components/CheckersBoard';
import { ChessBoard } from '../components/ChessBoard';
import { LudoBoard } from '../components/LudoBoard';
import { MonopolyBoard } from '../components/MonopolyBoard';
import { WarBoard } from '../components/WarBoard';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const ACHIEVEMENTS_LIST = [
  { id: 'chess_win', title: 'Grão-Mestre', desc: 'Venceu no Xadrez na Arena', icon: '👑' },
  { id: 'ludo_win', title: 'Campeão Ludo', desc: 'Venceu no Ludo 4P na Arena', icon: '🎲' },
  { id: 'c4_win', title: 'Conexão Superior', desc: 'Venceu no Connect 4 na Arena', icon: '🏆' },
  { id: 'chk_win', title: 'Mestre Damas', desc: 'Venceu no Damas na Arena', icon: '🏅' },
  { id: 'chess_cast', title: 'A Fortaleza', desc: 'Realizou o movimento de Roque no Xadrez', icon: '🏰' },
  { id: 'ludo_cap', title: 'Predador', desc: 'Capturou uma ficha inimiga no Ludo', icon: '💥' },
  { id: 'chk_king', title: 'Voo Majestoso', desc: 'Promoveu uma peça a Dama Brasileira', icon: '👑' },
  { id: 'monopoly_win', title: 'Barão Imobiliário', desc: 'Venceu no Monopoly faliendo oponentes', icon: '🏦' },
  { id: 'monopoly_hotel', title: 'Império Neon', desc: 'Construiu hotel na skin futurista', icon: '🏨' },
  { id: 'war_win', title: 'General Supremo', desc: 'Cumpriu seu objetivo e venceu no War', icon: '⚔️' },
  { id: 'war_conquer', title: 'Globalização', desc: 'Conquistou um continente inteiro no War', icon: '🗺️' }
];

export default function ArenaView() {
  const { user } = useAuth();
  const { teamProfiles = [] } = useCRM();
  
  // Zustand Store
  const activeMatch = useArenaStore(state => state.activeMatch);
  const sentInvite = useArenaStore(state => state.sentInvite);
  const onlinePlayers = useArenaStore(state => state.onlinePlayers);
  const setOnlinePlayers = useArenaStore(state => state.setOnlinePlayers);
  const createMatchInvite = useArenaStore(state => state.createMatchInvite);
  const cancelSentInvite = useArenaStore(state => state.cancelSentInvite);
  const listenToInvites = useArenaStore(state => state.listenToInvites);
  const exitActiveMatch = useArenaStore(state => state.exitActiveMatch);

  // Estados locais
  const [selectedGame, setSelectedGame] = useState<GameType>('connect4');
  const [gameMode, setGameMode] = useState<'single' | 'multi'>('single');
  const [aiDifficulty, setAiDifficulty] = useState<number>(3); // 2 = Fácil, 3 = Médio, 4 = Lendário
  const [localActiveSingleMatch, setLocalActiveSingleMatch] = useState<{ active: boolean; gameType: GameType } | null>(null);
  const [realWins, setRealWins] = useState<number>(0);
  const [achievements, setAchievements] = useState<any[]>([]);

  // Escuta vitórias reais do usuário logado na Arena
  useEffect(() => {
    if (user?.uid) {
      const q = query(
        collection(db, 'matches'),
        where('winnerId', '==', user.uid),
        where('status', '==', 'finished')
      );
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          setRealWins(snapshot.size);
        },
        (error) => {
          console.warn('Firestore: ranking de vitórias desativado por regras de segurança:', error.message);
          setRealWins(0);
        }
      );
      return () => unsubscribe();
    }
  }, [user?.uid]);

  // Escuta conquistas (Achievements) no Firestore em tempo real
  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = onSnapshot(doc(db, 'arenaAchievements', user.uid), 
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data && data.unlocked) {
              setAchievements(data.unlocked);
            }
          }
        },
        (error) => {
          console.warn('Firestore: conquistas desativadas por seguranca:', error.message);
        }
      );
      return () => unsubscribe();
    }
  }, [user?.uid]);

  // Escuta os convites recebidos na montagem da tela
  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = listenToInvites(user.uid);
      return () => unsubscribe();
    }
  }, [user?.uid, listenToInvites]);

  // Sincroniza colaboradores online
  useEffect(() => {
    if (teamProfiles.length > 0) {
      const online = teamProfiles
        .filter(p => p.uid !== user?.uid && p.presenceStatus === 'online')
        .map(p => ({
          uid: p.uid,
          displayName: p.displayName || p.name || 'Colega',
          photoURL: p.photoURL || p.photoUrl,
          presenceStatus: p.presenceStatus
        }));
      setOnlinePlayers(online);
    }
  }, [teamProfiles, user?.uid, setOnlinePlayers]);

  const handleDesafioOnline = async (opponent: any) => {
    if (!user) return;
    const tId = toast.loading(`Enviando convite para ${opponent.displayName}...`);
    try {
      await createMatchInvite(
        opponent.uid,
        opponent.displayName,
        opponent.photoURL,
        selectedGame,
        { uid: user.uid, displayName: user.displayName || 'Jogador A', photoURL: user.photoURL || undefined }
      );
      toast.success('Desafio enviado!', { id: tId });
    } catch (e) {
      toast.error('Erro ao desafiar oponente.', { id: tId });
    }
  };

  const handleStartLocalGame = () => {
    setLocalActiveSingleMatch({ active: true, gameType: selectedGame });
    toast.success(`Partida contra a máquina iniciada!`);
  };

  const handleExitLocalGame = () => {
    setLocalActiveSingleMatch(null);
  };

  // Renderiza a partida se houver jogo ativo (Online ou Local)
  if (activeMatch) {
    return (
      <div className="w-full min-h-[calc(100vh-100px)] p-6 bg-[#030712] relative overflow-hidden select-none">
        {activeMatch.gameType === 'connect4' && (
          <Connect4Board match={activeMatch} isLocal={false} />
        )}
        {activeMatch.gameType === 'checkers' && (
          <CheckersBoard match={activeMatch} isLocal={false} />
        )}
        {activeMatch.gameType === 'chess' && (
          <ChessBoard match={activeMatch} isLocal={false} />
        )}
        {activeMatch.gameType === 'ludo' && (
          <LudoBoard match={activeMatch} isLocal={false} />
        )}
        {activeMatch.gameType === 'monopoly' && (
          <MonopolyBoard match={activeMatch} isLocal={false} />
        )}
        {activeMatch.gameType === 'war' && (
          <WarBoard match={activeMatch} isLocal={false} />
        )}
      </div>
    );
  }

  if (localActiveSingleMatch?.active) {
    const mockMatch = {
      id: 'local_game',
      gameType: localActiveSingleMatch.gameType,
      player1Id: user?.uid || 'player1',
      player1Name: user?.displayName || 'Você',
      player2Id: 'computer',
      player2Name: `CPU (Nv. ${aiDifficulty === 2 ? 'Fácil' : aiDifficulty === 3 ? 'Médio' : 'Lendário'})`,
      status: 'playing' as const,
      turn: user?.uid || 'player1',
      boardState: null,
      moves: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    return (
      <div className="w-full min-h-[calc(100vh-100px)] p-6 bg-[#030712] relative overflow-hidden select-none">
        {localActiveSingleMatch.gameType === 'connect4' && (
          <Connect4Board match={mockMatch} isLocal={true} aiDifficulty={aiDifficulty} onExit={handleExitLocalGame} />
        )}
        {localActiveSingleMatch.gameType === 'checkers' && (
          <CheckersBoard match={mockMatch} isLocal={true} aiDifficulty={aiDifficulty} onExit={handleExitLocalGame} />
        )}
        {localActiveSingleMatch.gameType === 'chess' && (
          <ChessBoard match={mockMatch} isLocal={true} aiDifficulty={aiDifficulty} onExit={handleExitLocalGame} />
        )}
        {localActiveSingleMatch.gameType === 'ludo' && (
          <LudoBoard match={mockMatch} isLocal={true} aiDifficulty={aiDifficulty} onExit={handleExitLocalGame} />
        )}
        {localActiveSingleMatch.gameType === 'monopoly' && (
          <MonopolyBoard match={mockMatch} isLocal={true} aiDifficulty={aiDifficulty} onExit={handleExitLocalGame} />
        )}
        {localActiveSingleMatch.gameType === 'war' && (
          <WarBoard match={mockMatch} isLocal={true} aiDifficulty={aiDifficulty} onExit={handleExitLocalGame} />
        )}
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-100px)] p-8 bg-[#030712]/40 relative overflow-hidden select-none animate-in fade-in duration-300">
      
      {/* 🚀 MODAL FLUTUANTE DE ESPERA DE CONVITE */}
      <AnimatePresence>
        {sentInvite && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-slate-950/70 border border-white/10 p-8 rounded-[2.5rem] text-center flex flex-col items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            >
              <div className="w-20 h-20 rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin flex items-center justify-center text-4xl">
                ⚔️
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white uppercase tracking-widest">Aguardando Aceite</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                  Você desafiou <span className="text-primary-400">{sentInvite.player2Name}</span> para {sentInvite.gameType.toUpperCase()}...
                </p>
              </div>
              
              <button 
                onClick={cancelSentInvite}
                className="w-full py-4 rounded-2xl bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/20 text-[10px] font-black text-gray-400 hover:text-rose-400 uppercase tracking-widest transition-all"
              >
                Cancelar Desafio
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
        
        {/* 🎮 1. SELEÇÃO DE JOGOS & MODOS (ESQUERDA) */}
        <div className="flex-1 flex flex-col gap-6">
          
          <div className="space-y-2">
            <span className="text-[10px] font-black text-primary-500 uppercase tracking-[0.4em]">Hub Arena</span>
            <h1 className="text-4xl font-black text-white tracking-tight leading-none">CENTRAL DE JOGOS & DESCOMPRESSÃO</h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">DESAFIE COLEGAS DE EQUIPE OU JOGUE CONTRA A MÁQUINA</p>
          </div>

          {/* Cards de Seleção de Jogos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-4 mt-4">
            
            {/* Connect 4 Card */}
            <button 
              onClick={() => setSelectedGame('connect4')}
              className={`p-5 border rounded-[2rem] text-left transition-all relative overflow-hidden group flex flex-col justify-between h-44 ${
                selectedGame === 'connect4' 
                ? 'bg-blue-500/10 border-blue-500/40 shadow-[0_0_30px_rgba(59,130,246,0.15)]' 
                : 'bg-slate-950/40 hover:bg-slate-950/70 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="text-2xl">🔴</div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Connect 4</h4>
                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">Conecte 4 fichas neon em linha. Rápido e estratégico.</p>
              </div>
            </button>

            {/* Damas Card */}
            <button 
              onClick={() => setSelectedGame('checkers')}
              className={`p-5 border rounded-[2rem] text-left transition-all relative overflow-hidden group flex flex-col justify-between h-44 ${
                selectedGame === 'checkers' 
                ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)]' 
                : 'bg-slate-950/40 hover:bg-slate-950/70 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="text-2xl">🏆</div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Damas</h4>
                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">Salte, coma as peças do adversário e domine o tabuleiro.</p>
              </div>
            </button>

            {/* Xadrez Card */}
            <button 
              onClick={() => setSelectedGame('chess')}
              className={`p-5 border rounded-[2rem] text-left transition-all relative overflow-hidden group flex flex-col justify-between h-44 ${
                selectedGame === 'chess' 
                ? 'bg-purple-500/10 border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.15)]' 
                : 'bg-slate-950/40 hover:bg-slate-950/70 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="text-2xl">👑</div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Xadrez</h4>
                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">Xeque-mate com peças metálicas e tabuleiro luxuoso.</p>
              </div>
            </button>

            {/* Ludo Card */}
            <button 
              onClick={() => setSelectedGame('ludo')}
              className={`p-5 border rounded-[2rem] text-left transition-all relative overflow-hidden group flex flex-col justify-between h-44 ${
                selectedGame === 'ludo' 
                ? 'bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.15)]' 
                : 'bg-slate-950/40 hover:bg-slate-950/70 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="text-2xl">🎲</div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Ludo</h4>
                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">Role dados, tire peças da base e capture o oponente.</p>
              </div>
            </button>

            {/* Monopoly Card */}
            <button 
              onClick={() => setSelectedGame('monopoly')}
              className={`p-5 border rounded-[2rem] text-left transition-all relative overflow-hidden group flex flex-col justify-between h-44 ${
                selectedGame === 'monopoly' 
                ? 'bg-purple-500/10 border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.15)]' 
                : 'bg-slate-950/40 hover:bg-slate-950/70 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="text-2xl">💰</div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Monopoly</h4>
                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">Compre propriedades, cobre aluguéis e construa seu império corporativo.</p>
              </div>
            </button>

            {/* War Card */}
            <button 
              onClick={() => setSelectedGame('war')}
              className={`p-5 border rounded-[2rem] text-left transition-all relative overflow-hidden group flex flex-col justify-between h-44 ${
                selectedGame === 'war' 
                ? 'bg-red-500/10 border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.15)]' 
                : 'bg-slate-950/40 hover:bg-slate-950/70 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="text-2xl">🪖</div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">War</h4>
                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">Conquiste territórios, aloque exércitos e cumpra seu objetivo tático.</p>
              </div>
            </button>

          </div>

          {/* Seleção do Modo de Jogo */}
          <div className="bg-slate-950/30 border border-white/5 rounded-[2.5rem] p-8 flex flex-col gap-6 select-none mt-2">
            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Configurações de Partida</span>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setGameMode('single')}
                className={`flex-1 py-4 px-6 rounded-2xl border transition-all text-center flex flex-col gap-1 items-center ${
                  gameMode === 'single'
                  ? 'bg-primary-500/10 border-primary-500/40 text-primary-400'
                  : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'
                }`}
              >
                <span className="text-xs font-black uppercase tracking-widest">Contra a Máquina</span>
                <span className="text-[9px] opacity-40 uppercase font-bold tracking-wider">Singleplayer local</span>
              </button>

              <button 
                onClick={() => setGameMode('multi')}
                className={`flex-1 py-4 px-6 rounded-2xl border transition-all text-center flex flex-col gap-1 items-center ${
                  gameMode === 'multi'
                  ? 'bg-primary-500/10 border-primary-500/40 text-primary-400'
                  : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'
                }`}
              >
                <span className="text-xs font-black uppercase tracking-widest">Multiplayer Online</span>
                <span className="text-[9px] opacity-40 uppercase font-bold tracking-wider">Desafiar colega da empresa</span>
              </button>
            </div>

            {/* Opções Específicas do Modo Singleplayer */}
            {gameMode === 'single' ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex justify-between items-center text-[10px] uppercase font-black text-gray-500 tracking-wider">
                  <span>Dificuldade do Computador (CPU)</span>
                  <span className="text-primary-400">{aiDifficulty === 2 ? 'Fácil' : aiDifficulty === 3 ? 'Intermediário' : 'Lendário'}</span>
                </div>
                <div className="flex gap-3">
                  {[2, 3, 4].map(level => (
                    <button 
                      key={level}
                      onClick={() => setAiDifficulty(level)}
                      className={`flex-1 py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                        aiDifficulty === level
                        ? 'bg-white/10 border-white/20 text-white'
                        : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'
                      }`}
                    >
                      {level === 2 ? 'Fácil' : level === 3 ? 'Intermediário' : 'Lendário'}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={handleStartLocalGame}
                  className="w-full py-4.5 bg-primary-500 hover:bg-primary-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all mt-4 text-center cursor-pointer shadow-lg shadow-primary-500/20"
                >
                  ⚔️ Iniciar Combate Local
                </button>
              </div>
            ) : (
              <div className="py-6 text-center border border-dashed border-white/5 rounded-2xl animate-in fade-in duration-300">
                <i className="ph ph-hand-pointing text-2xl text-primary-500/40 mb-2" />
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Escolha um colega online na barra lateral direita para desafiá-lo.</p>
              </div>
            )}

          </div>

        </div>

        {/* 👥 2. STATUS DE CONTATOS, LEADERBOARD & CONQUISTAS (DIREITA) */}
        <div className="w-80 shrink-0 flex flex-col gap-6">
          
          {/* Caixa de Funcionários Online */}
          <div className="bg-slate-950/30 border border-white/5 rounded-[2.5rem] p-6 flex flex-col gap-5 select-none min-h-[250px]">
            <div>
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Integrantes Online</span>
              <h3 className="text-xs font-black text-white uppercase tracking-widest mt-1">Colegas Conectados</h3>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[250px] custom-scrollbar pr-1">
              {onlinePlayers.length > 0 ? (
                onlinePlayers.map(player => (
                  <div 
                    key={player.uid}
                    className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 hover:bg-white/5 rounded-2xl transition-all"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-xs font-bold text-gray-900 shrink-0 overflow-hidden relative">
                        {player.photoURL ? (
                          <img src={player.photoURL} alt={player.displayName} className="w-full h-full object-cover" />
                        ) : (
                          player.displayName[0].toUpperCase()
                        )}
                        <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-slate-950" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider truncate">{player.displayName}</span>
                    </div>

                    {gameMode === 'multi' && (
                      <button 
                        onClick={() => handleDesafioOnline(player)}
                        className="py-2 px-3 bg-primary-500 hover:bg-primary-600 active:scale-95 text-white font-black text-[8px] uppercase tracking-widest rounded-xl transition-all cursor-pointer shrink-0"
                      >
                        Desafiar
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center opacity-30 space-y-2">
                  <i className="ph ph-user-circle-minus text-3xl" />
                  <p className="text-[9px] font-bold uppercase tracking-widest">Nenhum colega online.</p>
                </div>
              )}
            </div>
          </div>

          {/* Placar de Líderes (Leaderboard) */}
          <div className="bg-slate-950/30 border border-white/5 rounded-[2.5rem] p-6 flex flex-col gap-4 select-none">
            <div>
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Hall of Fame</span>
              <h3 className="text-xs font-black text-white uppercase tracking-widest mt-1">Mestres do Hub</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase border-b border-white/5 pb-2">
                <span>Rank / Colega</span>
                <span>Vitórias</span>
              </div>
              
              {realWins > 0 ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-500 animate-pulse">
                  <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-2">🥇 1º {user?.displayName || 'Você'}</span>
                  <span className="text-xs font-black">{realWins}</span>
                </div>
              ) : (
                <div className="py-6 text-center opacity-35 space-y-1">
                  <i className="ph ph-shield-star text-xl text-primary-500" />
                  <p className="text-[8px] font-bold uppercase tracking-widest">Nenhuma vitória online.</p>
                </div>
              )}
            </div>
          </div>

          {/* 🏆 MURAL DE CONQUISTAS (ACHIEVEMENTS) DOURADO */}
          <div className="bg-slate-950/30 border border-white/5 rounded-[2.5rem] p-6 flex flex-col gap-4 select-none">
            <div>
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Mural de Emblemas</span>
              <h3 className="text-xs font-black text-white uppercase tracking-widest mt-1">Suas Conquistas</h3>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {ACHIEVEMENTS_LIST.map(ach => {
                const isUnlocked = achievements.some(a => a.id === ach.id);
                return (
                  <div
                    key={ach.id}
                    title={`${ach.title}: ${ach.desc}`}
                    className={`h-14 rounded-2xl border flex flex-col items-center justify-center relative cursor-help transition-all ${
                      isUnlocked
                      ? 'bg-gradient-to-br from-amber-500/10 to-yellow-500/20 border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:scale-105'
                      : 'bg-white/[0.01] border-white/5 text-gray-700 opacity-30 filter grayscale'
                    }`}
                  >
                    <span className="text-2xl">{ach.icon}</span>
                    <span className="text-[5px] font-black uppercase text-center mt-1 w-full truncate px-1">
                      {ach.title.split(' ')[0]}
                    </span>
                    {isUnlocked && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-slate-950 flex items-center justify-center text-[5px] text-gray-950 font-black">
                        ✓
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
