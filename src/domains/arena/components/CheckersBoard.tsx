import React, { useEffect, useState } from 'react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useArenaStore, GameMatch } from '@store/useArenaStore';
import { CheckersGrid, CheckersMove, getCheckersValidMoves, applyCheckersMove, checkCheckersWinner, getBestCheckersMove } from '../helpers/checkersLogic';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface CheckersBoardProps {
  match: Partial<GameMatch>;
  isLocal: boolean;
  aiDifficulty?: number;
  onExit?: () => void;
}

export function CheckersBoard({ match, isLocal, aiDifficulty = 3, onExit }: CheckersBoardProps) {
  const { user } = useAuth();
  const makeMove = useArenaStore(state => state.makeMove);
  const exitActiveMatch = useArenaStore(state => state.exitActiveMatch);

  // Estados locais para modo offline (singleplayer)
  const [localGrid, setLocalGrid] = useState<CheckersGrid>(() => {
    const grid = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) grid[r][c] = { player: 1, type: 'normal' };
      }
    }
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) grid[r][c] = { player: 2, type: 'normal' };
      }
    }
    return grid;
  });
  const [localTurn, setLocalTurn] = useState<string>(user?.uid || 'player1');

  const [selectedPiece, setSelectedPiece] = useState<[number, number] | null>(null);
  const [winnerPlayer, setWinnerPlayer] = useState<number | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Sincronização em tempo real para jogos online multiplayer
  const currentGrid = isLocal ? localGrid : (match.boardState || localGrid) as CheckersGrid;
  const currentTurn = isLocal ? localTurn : match.turn;
  const isMyTurn = isLocal ? localTurn === user?.uid : match.turn === user?.uid;
  const myPlayerNum = isLocal ? 1 : (match.player1Id === user?.uid ? 1 : 2);

  // Calcula todos os movimentos válidos para o jogador da vez
  const activePlayerNum = isLocal ? (localTurn === 'computer' ? 2 : 1) : (match.turn === match.player1Id ? 1 : 2);
  const validMoves = getCheckersValidMoves(currentGrid, activePlayerNum);

  // Movimentos da peça atualmente selecionada
  const selectedMoves = selectedPiece 
    ? validMoves.filter(m => m.from[0] === selectedPiece[0] && m.from[1] === selectedPiece[1])
    : [];

  // Efeito sonoro procedural nativo (arrastar peça de Damas)
  const playMoveSound = (isCapture: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isCapture ? 280 : 180, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(isCapture ? 420 : 250, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn('Audio Context indisponível:', e);
    }
  };

  const handlePieceClick = (r: number, c: number) => {
    if (!isMyTurn || winnerPlayer || isAiThinking) return;

    const piece = currentGrid[r][c];
    if (piece && piece.player === myPlayerNum) {
      // Se a regra obriga capturas, e a peça selecionada não tem movimentos de captura, avisa
      const hasCaptures = validMoves.some(m => m.captures);
      const pieceMoves = validMoves.filter(m => m.from[0] === r && m.from[1] === c);
      
      if (hasCaptures && pieceMoves.length === 0) {
        toast.warning('Você é obrigado a capturar peças adversárias nesta rodada!');
        return;
      }
      
      setSelectedPiece([r, c]);
    }
  };

  const handleCellClick = async (r: number, c: number) => {
    if (!selectedPiece) return;

    // Busca o movimento de destino correspondente
    const targetMove = selectedMoves.find(m => m.to[0] === r && m.to[1] === c);
    if (!targetMove) {
      // Se clicou em outra peça aliada, troca seleção
      const piece = currentGrid[r][c];
      if (piece && piece.player === myPlayerNum) {
        handlePieceClick(r, c);
      } else {
        setSelectedPiece(null);
      }
      return;
    }

    const nextGrid = applyCheckersMove(currentGrid, targetMove);
    playMoveSound(!!targetMove.captures);

    setSelectedPiece(null);

    const winResult = checkCheckersWinner(nextGrid);

    if (isLocal) {
      setLocalGrid(nextGrid);
      if (winResult) {
        setWinnerPlayer(winResult);
        toast.success('Parabéns! Você venceu o computador!');
        return;
      }
      // Passa turno para CPU
      setLocalTurn('computer');
    } else {
      const winnerUserId = winResult ? user?.uid : undefined;
      await makeMove(nextGrid, `${targetMove.from.join(',')}-${targetMove.to.join(',')}`, winnerUserId);
      if (winResult) {
        toast.success('Vitória espetacular na Dama!');
      }
    }
  };

  // Efeito de IA do Computador no modo local (singleplayer)
  useEffect(() => {
    if (isLocal && localTurn === 'computer' && !winnerPlayer) {
      setIsAiThinking(true);

      const timer = setTimeout(() => {
        const bestMove = getBestCheckersMove(localGrid, aiDifficulty, 2);
        
        if (bestMove) {
          const nextGrid = applyCheckersMove(localGrid, bestMove);
          playMoveSound(!!bestMove.captures);
          
          setLocalGrid(nextGrid);

          const winResult = checkCheckersWinner(nextGrid);
          if (winResult) {
            setWinnerPlayer(winResult);
            toast.error('O computador venceu a partida!');
          } else {
            setLocalTurn(user?.uid || 'player1');
          }
        } else {
          // Sem movimentos, computador perde
          setWinnerPlayer(1);
          toast.success('Você venceu! O computador ficou bloqueado.');
        }
        
        setIsAiThinking(false);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [isLocal, localTurn, localGrid, winnerPlayer, aiDifficulty, user?.uid]);

  // Monitora alterações online para definir vencedor na Dama
  useEffect(() => {
    if (!isLocal && match.boardState) {
      const winResult = checkCheckersWinner(match.boardState as CheckersGrid);
      if (winResult) setWinnerPlayer(winResult);
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
          <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Damas Clássicas</span>
          <h3 className="text-sm font-black text-white uppercase tracking-widest mt-1">Status da Arena</h3>
        </div>

        <div className="flex flex-col gap-3">
          {/* Card do Jogador 1 (Você / Vermelhas) */}
          <div className={`p-4 rounded-xl border flex flex-col gap-1 ${
            currentTurn === (isLocal ? user?.uid : match.player1Id) 
            ? 'bg-rose-500/10 border-rose-500/30' 
            : 'bg-white/5 border-white/5 opacity-55'
          }`}>
            <span className="text-[8px] font-black text-rose-500 uppercase">Peças Vermelhas (Você)</span>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">{isLocal ? 'Você' : match.player1Name}</span>
            {currentTurn === (isLocal ? user?.uid : match.player1Id) && (
              <span className="text-[7px] font-black text-rose-400 uppercase mt-1 animate-pulse">Sua Vez!</span>
            )}
          </div>

          {/* Card do Jogador 2 (Oponente / Pretas / CPU) */}
          <div className={`p-4 rounded-xl border flex flex-col gap-1 ${
            currentTurn === (isLocal ? 'computer' : match.player2Id) 
            ? 'bg-amber-500/10 border-amber-500/30' 
            : 'bg-white/5 border-white/5 opacity-55'
          }`}>
            <span className="text-[8px] font-black text-amber-500 uppercase">Peças Metálicas</span>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">{getOpponentName()}</span>
            {currentTurn === (isLocal ? 'computer' : match.player2Id) && (
              <span className="text-[7px] font-black text-amber-400 uppercase mt-1 animate-pulse">Pensando...</span>
            )}
          </div>
        </div>

        {/* Notificação de Vencedor */}
        {winnerPlayer && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-1.5 animate-bounce">
            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Partida Encerrada</span>
            <p className="text-[10px] text-white font-bold uppercase">
              {winnerPlayer === 1 ? 'VERMELHAS VENCERAM!' : 'METÁLICAS VENCERAM!'}
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

      {/* 🏆 TABULEIRO DE DAMAS CLÁSSICO 8X8 (DIREITA) */}
      <div className="flex-1 flex flex-col items-center justify-center">
        
        <div className="relative p-6 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[3rem] shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
          {/* Luz de Fundo Neon */}
          <div className="absolute inset-0 bg-amber-500/5 rounded-[3rem] blur-2xl z-0 pointer-events-none" />

          {/* Grid do Tabuleiro de Damas */}
          <div className="relative z-10 grid grid-rows-8 gap-0.5 w-[384px] h-[384px] bg-[#07090f] rounded-2xl p-1 overflow-hidden border border-white/5">
            {currentGrid.map((row, rIdx) => (
              <div key={rIdx} className="grid grid-cols-8 gap-0.5">
                {row.map((piece, cIdx) => {
                  const isBlackSquare = (rIdx + cIdx) % 2 === 1;
                  const isSelected = selectedPiece?.[0] === rIdx && selectedPiece?.[1] === cIdx;
                  
                  // Verifica se esta casa é um destino de movimento válido para a peça selecionada
                  const isValidTarget = selectedMoves.find(m => m.to[0] === rIdx && m.to[1] === cIdx);

                  return (
                    <div
                      key={cIdx}
                      onClick={() => isBlackSquare && (piece ? handlePieceClick(rIdx, cIdx) : handleCellClick(rIdx, cIdx))}
                      className={`w-11 h-11 flex items-center justify-center relative select-none cursor-pointer transition-all ${
                        isBlackSquare 
                        ? 'bg-[#0f121d] hover:bg-[#151928]' 
                        : 'bg-[#1e2330] pointer-events-none'
                      }`}
                    >
                      {/* Destaque de destino de movimento válido */}
                      {isValidTarget && (
                        <div className="absolute inset-1 border-2 border-emerald-500/60 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.3)] z-20" />
                      )}

                      {/* Renderização física da Peça de Dama */}
                      {piece && (
                        <motion.div
                          layoutId={`piece-${rIdx}-${cIdx}`}
                          className={`w-9 h-9 rounded-full flex items-center justify-center relative shadow-lg active:scale-95 transition-all ${
                            piece.player === 1
                            ? 'bg-gradient-to-br from-rose-500 to-rose-700 border border-rose-400/20 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                            : 'bg-gradient-to-br from-amber-600 to-amber-800 border border-amber-500/20 shadow-[0_0_15px_rgba(217,119,6,0.4)]'
                          } ${
                            isSelected ? 'ring-2 ring-white scale-105 z-30' : ''
                          }`}
                        >
                          {/* Nervuras circulares concêntricas de relevo metálico */}
                          <div className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center opacity-60">
                            <div className="w-5 h-5 rounded-full border border-dashed border-white/20 flex items-center justify-center">
                              {piece.type === 'king' ? (
                                <span className="text-white text-xs">👑</span>
                              ) : (
                                <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                              )}
                            </div>
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
