import React, { useEffect, useState } from 'react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { useArenaStore, GameType } from '@store/useArenaStore';
import { ArenaStoreModal } from '../components/ArenaStoreModal';
import { TournamentBrackets } from '../components/TournamentBrackets';
import { DailyPuzzle } from '../components/DailyPuzzle';
import { usePermissions } from '@auth/hooks/usePermissions';
import { Coins, ShoppingBag, Trophy, Plus, ArrowLeft, Crown, Swords, Users, ShieldAlert, Clock } from 'lucide-react';
import { Connect4Board } from '../components/Connect4Board';
import { CheckersBoard } from '../components/CheckersBoard';
import { ChessBoard } from '../components/ChessBoard';
import { LudoBoard } from '../components/LudoBoard';
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
  { id: 'chk_king', title: 'Voo Majestoso', desc: 'Promoveu uma peça a Dama Brasileira', icon: '👑' }
];

export default function ArenaView() {
  const { user, userProfile } = useAuth();
  const { teamProfiles = [] } = useCRM();
  const { hasPermission } = usePermissions();
  const isManager = hasPermission('MANAGE_TEAM');
  
  // Zustand Store
  const activeMatch = useArenaStore(state => state.activeMatch);
  const sentInvite = useArenaStore(state => state.sentInvite);
  const onlinePlayers = useArenaStore(state => state.onlinePlayers);
  const setOnlinePlayers = useArenaStore(state => state.setOnlinePlayers);
  const createMatchInvite = useArenaStore(state => state.createMatchInvite);
  const cancelSentInvite = useArenaStore(state => state.cancelSentInvite);
  const listenToInvites = useArenaStore(state => state.listenToInvites);
  const exitActiveMatch = useArenaStore(state => state.exitActiveMatch);

  // Zustand Torneios
  const tournaments = useArenaStore(state => state.tournaments);
  const listenToTournaments = useArenaStore(state => state.listenToTournaments);
  const createTournament = useArenaStore(state => state.createTournament);

  // Estados locais
  const [selectedGame, setSelectedGame] = useState<GameType>('connect4');
  const [gameMode, setGameMode] = useState<'single' | 'multi'>('single');
  const [aiDifficulty, setAiDifficulty] = useState<number>(3); // 2 = Fácil, 3 = Médio, 4 = Lendário
  const [localActiveSingleMatch, setLocalActiveSingleMatch] = useState<{ active: boolean; gameType: GameType } | null>(null);
  const [realWins, setRealWins] = useState<number>(0);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [isStoreOpen, setIsStoreOpen] = useState(false);

  // Estados locais dos Torneios
  const [activeTab, setActiveTab] = useState<'games' | 'tournaments' | 'puzzles'>('games');
  const [puzzlesLeaderboard, setPuzzlesLeaderboard] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [isCreateTournamentOpen, setIsCreateTournamentOpen] = useState(false);
  const [newTourName, setNewTourName] = useState('');
  const [newTourGame, setNewTourGame] = useState<GameType>('chess');
  const [newTourMaxPlayers, setNewTourMaxPlayers] = useState<4 | 8>(4);

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

  // Escuta os torneios em tempo real da organização
  useEffect(() => {
    if (userProfile?.orgId) {
      const unsubscribe = listenToTournaments(userProfile.orgId);
      return () => unsubscribe();
    }
  }, [userProfile?.orgId, listenToTournaments]);

  // Escuta solvers do puzzle de hoje em tempo real
  useEffect(() => {
    const todayKey = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'dailyPuzzleSolvers'),
      where('date', '==', todayKey)
    );
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const solvers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        // Ordena por menor tempo de resolução
        solvers.sort((a: any, b: any) => (a.timeSeconds || 0) - (b.timeSeconds || 0));
        setPuzzlesLeaderboard(solvers);
      },
      (error) => {
        console.warn('Firestore: leaderboard de puzzles indisponível:', error.message);
        setPuzzlesLeaderboard([]);
      }
    );
    return () => unsubscribe();
  }, []);

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
        
        {/* 🎮 1. COLUNA PRINCIPAL (ESQUERDA) */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Seletor de Abas Retro-Neon */}
          <div className="flex gap-2 border-b border-white/5 pb-2 mb-2 select-none">
            <button
              onClick={() => setActiveTab('games')}
              className={`pb-2 px-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                activeTab === 'games'
                  ? 'border-cyan-500 text-cyan-400 shadow-[0_4px_12px_rgba(6,182,212,0.15)]'
                  : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              🎮 Central de Jogos
            </button>
            <button
              onClick={() => {
                setActiveTab('tournaments');
                setSelectedTournamentId(null);
              }}
              className={`pb-2 px-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                activeTab === 'tournaments'
                  ? 'border-cyan-500 text-cyan-400 shadow-[0_4px_12px_rgba(6,182,212,0.15)]'
                  : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              🏆 Torneios Eliminatórios
            </button>
            <button
              onClick={() => {
                setActiveTab('puzzles');
                setSelectedTournamentId(null);
              }}
              className={`pb-2 px-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                activeTab === 'puzzles'
                  ? 'border-cyan-500 text-cyan-400 shadow-[0_4px_12px_rgba(6,182,212,0.15)]'
                  : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              🧩 Desafios Diários
            </button>
          </div>

          {activeTab === 'games' ? (
            // Central de Jogos Atual
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-primary-500 uppercase tracking-[0.4em]">Hub Arena</span>
                  <h1 className="text-4xl font-black text-white tracking-tight leading-none">CENTRAL DE JOGOS & DESCOMPRESSÃO</h1>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">DESAFIE COLEGAS DE EQUIPE OU JOGUE CONTRA A MÁQUINA</p>
                </div>

                {/* Balanço de Moedas e Botão da Loja */}
                <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                  <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl">
                    <Coins size={14} className="text-yellow-400 animate-bounce" />
                    <span className="text-xs font-black text-yellow-400 tracking-wider">{userProfile?.arenaCredits || 0}</span>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Coins</span>
                  </div>
                  <button
                    onClick={() => setIsStoreOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-purple-500/20 active:scale-95 transition-all cursor-pointer border border-purple-400/20"
                  >
                    <ShoppingBag size={14} />
                    Loja da Arena
                  </button>
                </div>
              </div>

              {/* Cards de Seleção de Jogos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
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
                    <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">Salte, coma as peças do oponente e domine o tabuleiro.</p>
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
            </>
          ) : activeTab === 'tournaments' ? (
            // Visualização de Torneios Eliminatórios
            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              {selectedTournamentId && tournaments.find(t => t.id === selectedTournamentId) ? (
                // Chaves de Torneio Ativo Selecionado
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedTournamentId(null)}
                    className="flex items-center gap-2 py-2 px-4 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 hover:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer self-start"
                  >
                    <ArrowLeft size={12} />
                    Voltar aos Torneios
                  </button>
                  <TournamentBrackets tournament={tournaments.find(t => t.id === selectedTournamentId)!} />
                </div>
              ) : (
                // Lista Geral de Torneios
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-primary-500 uppercase tracking-[0.4em]">Hub Arena</span>
                      <h1 className="text-4xl font-black text-white tracking-tight leading-none">TORNEIOS CORPORATIVOS</h1>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">LIGAS ELIMINATÓRIAS E COPAS INTERNAS</p>
                    </div>

                    {/* Botão administrativo para criar novo torneio */}
                    {isManager && (
                      <button
                        onClick={() => setIsCreateTournamentOpen(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer border border-cyan-400/20"
                      >
                        <Plus size={14} />
                        Novo Torneio
                      </button>
                    )}
                  </div>

                  {/* Lista de Torneios Ativos */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">Torneios Ativos & Inscrições</h3>
                    {tournaments.filter(t => t.status !== 'finished').length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {tournaments.filter(t => t.status !== 'finished').map(tour => {
                          const isRegistered = tour.participants.includes(user?.uid || '');
                          return (
                            <div 
                              key={tour.id}
                              className="bg-slate-950/40 border border-white/5 hover:border-cyan-500/20 rounded-[2rem] p-6 transition-all duration-300 flex flex-col justify-between min-h-[160px] relative overflow-hidden group shadow-lg"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[8px] font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md uppercase tracking-widest">
                                    {tour.gameType === 'chess' ? 'Xadrez 👑' : tour.gameType === 'checkers' ? 'Damas 🏆' : tour.gameType === 'connect4' ? 'Connect 4 🔴' : 'Ludo 🎲'}
                                  </span>
                                  <span className={`text-[8px] font-black uppercase tracking-widest ${
                                    tour.status === 'registration' ? 'text-cyan-400' : 'text-purple-400'
                                  }`}>
                                    {tour.status === 'registration' ? 'Inscrições Abertas' : 'Em Progresso'}
                                  </span>
                                </div>
                                <h4 className="text-sm font-black text-white uppercase tracking-wider truncate">{tour.name}</h4>
                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                                  👥 {tour.participants.length} / {tour.maxPlayers} Inscritos
                                </p>
                              </div>
                              <button 
                                onClick={() => setSelectedTournamentId(tour.id)}
                                className={`w-full py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer text-center ${
                                  isRegistered
                                    ? 'bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                                    : 'bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300'
                                }`}
                              >
                                {tour.status === 'registration' ? (isRegistered ? 'Acessar / Ver Vagas' : 'Inscrever-se & Jogar') : 'Ver Chaves & Lutas'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-12 text-center border border-dashed border-white/5 bg-slate-950/10 rounded-[2rem] opacity-60">
                        <Trophy size={36} className="text-gray-600 mx-auto mb-3" />
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Nenhum Torneio Ativo</h4>
                        <p className="text-[8px] text-gray-600 font-bold uppercase tracking-wider mt-1">Nenhuma competição interna ocorrendo agora.</p>
                      </div>
                    )}
                  </div>

                  {/* Histórico / Torneios Concluídos */}
                  <div className="space-y-4 pt-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">Histórico (Concluídos)</h3>
                    {tournaments.filter(t => t.status === 'finished').length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {tournaments.filter(t => t.status === 'finished').map(tour => {
                          const championName = tour.bracket.final.winnerId === tour.bracket.final.p1 ? tour.bracket.final.p1Name : tour.bracket.final.p2Name;
                          return (
                            <div 
                              key={tour.id}
                              className="bg-slate-950/20 border border-white/5 rounded-[2rem] p-6 flex flex-col justify-between min-h-[160px] relative overflow-hidden group shadow-md"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[8px] font-black text-gray-500 bg-white/5 px-2 py-0.5 rounded-md uppercase tracking-widest">
                                    {tour.gameType === 'chess' ? 'Xadrez 👑' : tour.gameType === 'checkers' ? 'Damas 🏆' : tour.gameType === 'connect4' ? 'Connect 4 🔴' : 'Ludo 🎲'}
                                  </span>
                                  <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md uppercase tracking-widest flex items-center gap-1">
                                    👑 Finalizado
                                  </span>
                                </div>
                                <h4 className="text-sm font-black text-gray-400 uppercase tracking-wider truncate">{tour.name}</h4>
                                <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/10 px-3 py-2 rounded-xl text-amber-400 text-[9px] font-black uppercase tracking-widest">
                                  <Crown size={12} />
                                  <span>Campeão: {championName || 'Jogador'}</span>
                                </div>
                              </div>
                              <button 
                                onClick={() => setSelectedTournamentId(tour.id)}
                                className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer text-center"
                              >
                                Ver Tabela Completa
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-8 text-center opacity-30">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-gray-600">Nenhum torneio arquivado no histórico.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <DailyPuzzle onBack={() => setActiveTab('games')} />
          )}
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
            {activeTab === 'puzzles' ? (
              <>
                <div>
                  <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Puzzle do Dia</span>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest mt-1">Cérebros Rápidos</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase border-b border-white/5 pb-2">
                    <span>Rank / Colega</span>
                    <span>Tempo</span>
                  </div>

                  {puzzlesLeaderboard.length > 0 ? (
                    <div className="flex flex-col gap-2 overflow-y-auto max-h-[150px] custom-scrollbar pr-1">
                      {puzzlesLeaderboard.map((solver, idx) => {
                        const mins = Math.floor((solver.timeSeconds || 0) / 60);
                        const secs = (solver.timeSeconds || 0) % 60;
                        const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}s`;
                        
                        return (
                          <div 
                            key={solver.uid}
                            className={`flex items-center justify-between p-2 rounded-xl border ${
                              idx === 0 
                                ? 'bg-amber-500/5 border-amber-500/10 text-amber-500 animate-pulse'
                                : 'bg-white/[0.01] border-white/5 text-gray-300'
                            }`}
                          >
                            <span className="text-[9px] font-bold uppercase tracking-wider truncate max-w-[140px]">
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`} {solver.displayName}
                            </span>
                            <span className="text-[10px] font-mono font-black">{timeStr}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-6 text-center opacity-35 space-y-1">
                      <Clock size={14} className="text-cyan-500 mx-auto animate-pulse" />
                      <p className="text-[8px] font-bold uppercase tracking-widest">Ninguém resolveu hoje!</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
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

      <AnimatePresence>
        {isStoreOpen && (
          <ArenaStoreModal onClose={() => setIsStoreOpen(false)} />
        )}
      </AnimatePresence>

      {/* 🚀 MODAL DE CRIAÇÃO DE TORNEIO ADMINISTRATIVO */}
      <AnimatePresence>
        {isCreateTournamentOpen && (
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
              className="w-full max-w-md bg-slate-950/80 border border-white/10 p-8 rounded-[2.5rem] flex flex-col gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="space-y-1">
                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Painel Administrativo</span>
                <h3 className="text-xl font-black text-white uppercase tracking-wide">Criar Novo Torneio</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Configure uma chave eliminatória neon para a empresa</p>
              </div>

              {/* Nome do Torneio */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Nome do Torneio</label>
                <input 
                  type="text" 
                  value={newTourName}
                  onChange={(e) => setNewTourName(e.target.value)}
                  placeholder="Ex: Copa Hub Vendas Xadrez"
                  className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none transition-all"
                />
              </div>

              {/* Seleção do Jogo */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Modalidade</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['chess', 'checkers', 'connect4', 'ludo'] as GameType[]).map(game => (
                    <button
                      key={game}
                      type="button"
                      onClick={() => setNewTourGame(game)}
                      className={`py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                        newTourGame === game
                          ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                          : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'
                      }`}
                    >
                      {game === 'chess' ? 'Xadrez' : game === 'checkers' ? 'Damas' : game === 'connect4' ? 'Connect 4' : 'Ludo'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantidade de Jogadores */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Vagas (Chaveamento)</label>
                <div className="flex gap-3">
                  {[4, 8].map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setNewTourMaxPlayers(size as 4 | 8)}
                      className={`flex-1 py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                        newTourMaxPlayers === size
                          ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                          : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'
                      }`}
                    >
                      {size} Jogadores ({size === 4 ? 'Semifinais' : 'Quartas'})
                    </button>
                  ))}
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateTournamentOpen(false)}
                  className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newTourName.trim()) {
                      toast.error('Preencha o nome do torneio!');
                      return;
                    }
                    if (!userProfile?.orgId) return;
                    
                    const tId = toast.loading('Criando torneio eliminatório...');
                    try {
                      await createTournament(userProfile.orgId, newTourName, newTourGame, newTourMaxPlayers);
                      setIsCreateTournamentOpen(false);
                      setNewTourName('');
                      toast.dismiss(tId);
                    } catch (err) {
                      toast.dismiss(tId);
                    }
                  }}
                  className="flex-1 py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer border border-cyan-400/20 text-center"
                >
                  Criar Torneio
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
