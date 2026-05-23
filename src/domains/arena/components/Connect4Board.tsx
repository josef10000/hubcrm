import React, { useEffect, useState } from 'react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useArenaStore, GameMatch } from '@store/useArenaStore';
import { checkConnect4Winner, getConnect4FreeRow, getBestConnect4Move, isConnect4Draw, BoardGrid } from '../helpers/connect4Logic';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface Connect4BoardProps {
  match: Partial<GameMatch>;
  isLocal: boolean;
  aiDifficulty?: number;
  onExit?: () => void;
}

export function Connect4Board({ match, isLocal, aiDifficulty = 3, onExit }: Connect4BoardProps) {
  const { user } = useAuth();
  const makeMove = useArenaStore(state => state.makeMove);
  const exitActiveMatch = useArenaStore(state => state.exitActiveMatch);

  // Estado local da grade para o modo offline (singleplayer) ou sincronia
  const [localGrid, setLocalGrid] = useState<BoardGrid>(
    Array(6).fill(null).map(() => Array(7).fill(null))
  );
  const [localTurn, setLocalTurn] = useState<string>(user?.uid || 'player1');
  const [winnerInfo, setWinnerInfo] = useState<{ winner: number; line: [number, number][] } | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Sincronização em tempo real para jogos online multiplayer
  const currentGrid = isLocal ? localGrid : (match.boardState || localGrid) as BoardGrid;
  const currentTurn = isLocal ? localTurn : match.turn;
  const isMyTurn = isLocal ? localTurn === user?.uid : match.turn === user?.uid;

  // Efeito sonoro procedural nativo (quique de ficha)
  const playClickSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      console.warn('Audio Context bloqueado ou indisponível:', e);
    }
  };

  // Trata jogada do usuário ao clicar em uma coluna
  const handleColumnClick = async (col: number) => {
    if (!isMyTurn || winnerInfo || isDraw || isAiThinking) return;

    const row = getConnect4FreeRow(currentGrid, col);
    if (row === -1) {
      toast.warning('Esta coluna já está cheia!');
      return;
    }

    // Calcula a ficha (1 = Brancas/Jogador1, 2 = Pretas/Jogador2/IA)
    const activePlayerNum = isLocal ? 1 : (match.player1Id === user?.uid ? 1 : 2);
    const nextGrid = currentGrid.map(r => [...r]);
    nextGrid[row][col] = activePlayerNum;
    
    playClickSound();

    // Verifica vitória ou empate imediato
    const winResult = checkConnect4Winner(nextGrid);
    const drawResult = isConnect4Draw(nextGrid);

    if (isLocal) {
      setLocalGrid(nextGrid);
      if (winResult) {
        setWinnerInfo(winResult);
        toast.success('Parabéns! Você venceu a máquina!');
        return;
      }
      if (drawResult) {
        setIsDraw(true);
        toast.info('Partida empatada!');
        return;
      }

      // Passa turno para a CPU
      setLocalTurn('computer');
    } else {
      // Multiplayer online via Firestore
      const winnerUserId = winResult ? user?.uid : undefined;
      await makeMove(nextGrid, `${row},${col}`, winnerUserId);
      if (winResult) {
        toast.success('Vitória espetacular!');
      }
      if (drawResult) {
        toast.info('Empate!');
      }
    }
  };

  // Efeito de inteligência da CPU no modo local contra o computador
  useEffect(() => {
    if (isLocal && localTurn === 'computer' && !winnerInfo && !isDraw) {
      setIsAiThinking(true);
      
      const timer = setTimeout(() => {
        // Roda o algoritmo Minimax
        const bestCol = getBestConnect4Move(localGrid, aiDifficulty, 2);
        const row = getConnect4FreeRow(localGrid, bestCol);
        
        if (row !== -1) {
          const nextGrid = localGrid.map(r => [...r]);
          nextGrid[row][bestCol] = 2; // CPU é o jogador 2
          
          playClickSound();
          setLocalGrid(nextGrid);

          const winResult = checkConnect4Winner(nextGrid);
          const drawResult = isConnect4Draw(nextGrid);

          if (winResult) {
            setWinnerInfo(winResult);
            toast.error('A CPU venceu desta vez!');
          } else if (drawResult) {
            setIsDraw(true);
            toast.info('Partida empatada!');
          } else {
            setLocalTurn(user?.uid || 'player1');
          }
        }
        setIsAiThinking(false);
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [isLocal, localTurn, localGrid, winnerInfo, isDraw, aiDifficulty, user?.uid]);

  // Monitora alterações online para notificar sobre fim de jogo no modo multiplayer
  useEffect(() => {
    if (!isLocal && match.boardState) {
      const winResult = checkConnect4Winner(match.boardState as BoardGrid);
      const drawResult = isConnect4Draw(match.boardState as BoardGrid);
      
      if (winResult) {
        setWinnerInfo(winResult);
      } else if (drawResult) {
        setIsDraw(true);
      }
    }
  }, [isLocal, match.boardState]);

  const handleLeaveGame = () => {
    if (isLocal) {
      if (onExit) onExit();
    } else {
      exitActiveMatch();
    }
  };

  const getOpponentName = () => {
    if (isLocal) return 'Computador';
    return match.player1Id === user?.uid ? match.player2Name : match.player1Name;
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-center justify-center py-6 select-none animate-in fade-in duration-300">
      
      {/* 📊 PAINEL ESTATÍSTICO DE JOGO (ESQUERDA) */}
      <div className="w-64 bg-slate-950/65 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 flex flex-col gap-6 select-none shadow-2xl">
        <div className="space-y-1">
          <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Connect 4</span>
          <h3 className="text-sm font-black text-white uppercase tracking-widest mt-1">Status da Arena</h3>
        </div>

        <div className="flex flex-col gap-3">
          {/* Card do Jogador 1 (Você) */}
          <div className={`p-4 rounded-xl border flex flex-col gap-1 ${
            currentTurn === (isLocal ? user?.uid : match.player1Id) 
            ? 'bg-blue-500/10 border-blue-500/30' 
            : 'bg-white/5 border-white/5 opacity-55'
          }`}>
            <span className="text-[8px] font-black text-gray-500 uppercase">Jogador 1 (Azul)</span>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">{isLocal ? 'Você' : match.player1Name}</span>
            {currentTurn === (isLocal ? user?.uid : match.player1Id) && (
              <span className="text-[7px] font-black text-blue-400 uppercase mt-1 animate-pulse">Sua Vez!</span>
            )}
          </div>

          {/* Card do Jogador 2 (Oponente/CPU) */}
          <div className={`p-4 rounded-xl border flex flex-col gap-1 ${
            currentTurn === (isLocal ? 'computer' : match.player2Id) 
            ? 'bg-pink-500/10 border-pink-500/30' 
            : 'bg-white/5 border-white/5 opacity-55'
          }`}>
            <span className="text-[8px] font-black text-gray-500 uppercase">Jogador 2 (Rosa)</span>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">{getOpponentName()}</span>
            {currentTurn === (isLocal ? 'computer' : match.player2Id) && (
              <span className="text-[7px] font-black text-pink-400 uppercase mt-1 animate-pulse">Pensando...</span>
            )}
          </div>
        </div>

        {/* Notificação de Vencedor */}
        {(winnerInfo || isDraw) && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-1.5 animate-bounce">
            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Partida Encerrada</span>
            <p className="text-[10px] text-white font-bold uppercase">
              {isDraw ? 'EMPATE!' : winnerInfo?.winner === 1 ? 'JOGADOR 1 VENCEU!' : 'JOGADOR 2 VENCEU!'}
            </p>
          </div>
        )}

        <button 
          onClick={handleLeaveGame}
          className="mt-auto py-3.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 text-[9px] font-black text-rose-400 uppercase tracking-widest rounded-xl transition-all cursor-pointer text-center"
        >
          🏳️ Abandonar Arena
        </button>
      </div>

      {/* 🔴 TABULEIRO FÍSICO COM GRADE GLASSMOPHISM (DIREITA) */}
      <div className="flex-1 flex flex-col items-center justify-center">
        
        {/* Indicador de Setas de Coluna no Topo */}
        <div className="grid grid-cols-7 gap-4 w-[420px] mb-2 px-4 justify-items-center">
          {Array(7).fill(null).map((_, col) => {
            const isColFull = currentGrid[0][col] !== null;
            return (
              <button
                key={col}
                onClick={() => handleColumnClick(col)}
                disabled={!isMyTurn || winnerInfo || isDraw || isColFull}
                className={`w-8 h-8 rounded-full border border-white/5 flex items-center justify-center transition-all ${
                  isMyTurn && !winnerInfo && !isDraw && !isColFull
                  ? 'bg-white/5 hover:bg-primary-500/20 hover:border-primary-500/30 text-gray-500 hover:text-white cursor-pointer hover:-translate-y-1' 
                  : 'bg-transparent text-transparent'
                }`}
              >
                <i className="ph-bold ph-arrow-down text-sm" />
              </button>
            );
          })}
        </div>

        {/* Grade do Connect 4 */}
        <div className="relative p-6 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[3rem] shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
          {/* Luz de Fundo Neon */}
          <div className="absolute inset-0 bg-blue-500/5 rounded-[3rem] blur-2xl z-0 pointer-events-none" />

          <div className="relative z-10 grid grid-rows-6 gap-4 w-[390px] h-[340px]">
            {currentGrid.map((row, rIdx) => (
              <div key={rIdx} className="grid grid-cols-7 gap-4">
                {row.map((cell, cIdx) => {
                  const isWinningCell = winnerInfo?.line.some(([winR, winC]) => winR === rIdx && winC === cIdx);
                  
                  return (
                    <div 
                      key={cIdx}
                      onClick={() => handleColumnClick(cIdx)}
                      className={`w-10 h-10 rounded-full border border-white/5 bg-[#030712]/80 flex items-center justify-center relative overflow-hidden cursor-pointer transition-all ${
                        isWinningCell ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-950 scale-105' : ''
                      }`}
                    >
                      {/* Encaixe Tridimensional */}
                      <div className="absolute inset-1 rounded-full border border-white/5 shadow-inner" />
                      
                      {/* Ficha colorida com animação de queda realista do Framer Motion */}
                      {cell !== null && (
                        <motion.div 
                          initial={{ y: -300, scale: 0.2 }}
                          animate={{ y: 0, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                          className={`absolute inset-0.5 rounded-full flex items-center justify-center relative ${
                            cell === 1 
                            ? 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                            : 'bg-gradient-to-br from-pink-400 to-pink-600 shadow-[0_0_15px_rgba(236,72,153,0.5)]'
                          }`}
                        >
                          {/* Detalhe interno da Ficha */}
                          <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center opacity-70">
                            <div className="w-2 h-2 rounded-full bg-white/20" />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
