import React, { useEffect, useState } from 'react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useArenaStore, GameMatch } from '@store/useArenaStore';
import { ChessBoardState, ChessMove, ChessPieceType, ChessPiece, getChessValidMoves, applyChessMove, checkChessWinner, getBestChessMove } from '../helpers/chessLogic';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface ChessBoardProps {
  match: Partial<GameMatch>;
  isLocal: boolean;
  aiDifficulty?: number;
  onExit?: () => void;
}

// Dicionário de Peças Unicode Estilizadas
const CHESS_PIECES_UNICODE: Record<string, string> = {
  'pawn': '♟', 'knight': '♞', 'bishop': '♝', 'rook': '♜', 'queen': '♛', 'king': '♚'
};

export function ChessBoard({ match, isLocal, aiDifficulty = 3, onExit }: ChessBoardProps) {
  const { user } = useAuth();
  const makeMove = useArenaStore(state => state.makeMove);
  const exitActiveMatch = useArenaStore(state => state.exitActiveMatch);

  // Estado inicial padrão do tabuleiro
  const initialPieces: Record<string, ChessPiece> = {
    // Peças brancas (Jogador 1) - Linhas 6 e 7
    '6,0': { player: 1, type: 'pawn' }, '6,1': { player: 1, type: 'pawn' }, '6,2': { player: 1, type: 'pawn' }, '6,3': { player: 1, type: 'pawn' },
    '6,4': { player: 1, type: 'pawn' }, '6,5': { player: 1, type: 'pawn' }, '6,6': { player: 1, type: 'pawn' }, '6,7': { player: 1, type: 'pawn' },
    '7,0': { player: 1, type: 'rook' }, '7,1': { player: 1, type: 'knight' }, '7,2': { player: 1, type: 'bishop' }, '7,3': { player: 1, type: 'queen' },
    '7,4': { player: 1, type: 'king' }, '7,5': { player: 1, type: 'bishop' }, '7,6': { player: 1, type: 'knight' }, '7,7': { player: 1, type: 'rook' },
    
    // Peças pretas (Jogador 2) - Linhas 0 e 1
    '0,0': { player: 2, type: 'rook' }, '0,1': { player: 2, type: 'knight' }, '0,2': { player: 2, type: 'bishop' }, '0,3': { player: 2, type: 'queen' },
    '0,4': { player: 2, type: 'king' }, '0,5': { player: 2, type: 'bishop' }, '0,6': { player: 2, type: 'knight' }, '0,7': { player: 2, type: 'rook' },
    '1,0': { player: 2, type: 'pawn' }, '1,1': { player: 2, type: 'pawn' }, '1,2': { player: 2, type: 'pawn' }, '1,3': { player: 2, type: 'pawn' },
    '1,4': { player: 2, type: 'pawn' }, '1,5': { player: 2, type: 'pawn' }, '1,6': { player: 2, type: 'pawn' }, '1,7': { player: 2, type: 'pawn' }
  };

  const [localBoard, setLocalBoard] = useState<ChessBoardState>({ pieces: initialPieces });
  const [localTurn, setLocalTurn] = useState<string>(user?.uid || 'player1');

  const [selectedCell, setSelectedCell] = useState<string | null>(null); // "r,c"
  const [winnerPlayer, setWinnerPlayer] = useState<number | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Relógios de jogo (segundos)
  const [p1Clock, setP1Clock] = useState(600); // 10 min de relógio
  const [p2Clock, setP2Clock] = useState(600);

  // Sincronização em tempo real para jogos online multiplayer
  const currentBoard = isLocal ? localBoard : (match.boardState || localBoard) as ChessBoardState;
  const currentTurn = isLocal ? localTurn : match.turn;
  const isMyTurn = isLocal ? localTurn === user?.uid : match.turn === user?.uid;
  const myPlayerNum = isLocal ? 1 : (match.player1Id === user?.uid ? 1 : 2);

  // Calcula movimentos legais totais para o jogador da vez
  const activePlayerNum = isLocal ? (localTurn === 'computer' ? 2 : 1) : (match.turn === match.player1Id ? 1 : 2);
  const validMoves = getChessValidMoves(currentBoard, activePlayerNum);

  // Movimentos da peça atualmente selecionada
  const selectedMoves = selectedCell 
    ? validMoves.filter(m => m.from === selectedCell)
    : [];

  // Efeitos sonoros procedimentais do Xadrez (som seco clássico de peça tocando madeira)
  const playChessSound = (isCapture: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isCapture ? 480 : 320, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(isCapture ? 200 : 250, ctx.currentTime + 0.12);
      
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      console.warn('Audio Context indisponível:', e);
    }
  };

  // Temporizador para relógios
  useEffect(() => {
    if (winnerPlayer) return;
    const timer = setInterval(() => {
      const activeClock = currentTurn === (isLocal ? user?.uid : match.player1Id) ? 'p1' : 'p2';
      if (activeClock === 'p1') {
        setP1Clock(prev => (prev > 0 ? prev - 1 : 0));
      } else {
        setP2Clock(prev => (prev > 0 ? prev - 1 : 0));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentTurn, isLocal, user?.uid, match.player1Id, winnerPlayer]);

  // Se algum relógio zerar, determina o vencedor
  useEffect(() => {
    if (p1Clock === 0) {
      setWinnerPlayer(2);
      toast.error('O tempo do Jogador 1 acabou!');
    } else if (p2Clock === 0) {
      setWinnerPlayer(1);
      toast.success('O tempo do Jogador 2 acabou!');
    }
  }, [p1Clock, p2Clock]);

  const handleCellClick = (r: number, c: number) => {
    if (!isMyTurn || winnerPlayer || isAiThinking) return;

    const cellKey = `${r},${c}`;
    const piece = currentBoard.pieces[cellKey];

    if (piece && piece.player === myPlayerNum) {
      setSelectedCell(cellKey);
    }
  };

  const handleTargetCellClick = async (r: number, c: number) => {
    if (!selectedCell) return;

    const targetKey = `${r},${c}`;
    const targetMove = selectedMoves.find(m => m.to === targetKey);

    if (!targetMove) {
      // Se clicou em outra peça aliada, troca seleção
      const piece = currentBoard.pieces[targetKey];
      if (piece && piece.player === myPlayerNum) {
        setSelectedCell(targetKey);
      } else {
        setSelectedCell(null);
      }
      return;
    }

    const nextBoard = applyChessMove(currentBoard, targetMove);
    playChessSound(!!targetMove.capturedPiece);
    setSelectedCell(null);

    const winResult = checkChessWinner(nextBoard);

    if (isLocal) {
      setLocalBoard(nextBoard);
      if (winResult) {
        setWinnerPlayer(winResult);
        toast.success('Parabéns! Você venceu a inteligência artificial do Hub!');
        return;
      }
      setLocalTurn('computer');
    } else {
      const winnerUserId = winResult ? user?.uid : undefined;
      await makeMove(nextBoard, `${targetMove.from}-${targetMove.to}`, winnerUserId);
      if (winResult) {
        toast.success('Vitória e Xeque-mate na Hub Arena!');
      }
    }
  };

  // Efeito de IA do Computador no modo local (singleplayer)
  useEffect(() => {
    if (isLocal && localTurn === 'computer' && !winnerPlayer) {
      setIsAiThinking(true);

      const timer = setTimeout(() => {
        // Computa o melhor movimento (CPU = Jogador 2)
        const bestMove = getBestChessMove(localBoard, 2);
        
        if (bestMove) {
          const nextBoard = applyChessMove(localBoard, bestMove);
          playChessSound(!!bestMove.capturedPiece);
          
          setLocalBoard(nextBoard);

          const winResult = checkChessWinner(nextBoard);
          if (winResult) {
            setWinnerPlayer(winResult);
            toast.error('O computador venceu a partida de Xadrez!');
          } else {
            setLocalTurn(user?.uid || 'player1');
          }
        } else {
          // Sem movimentos, computador perde
          setWinnerPlayer(1);
          toast.success('Você venceu por Xeque-mate / Afogamento!');
        }
        
        setIsAiThinking(false);
      }, 900);

      return () => clearTimeout(timer);
    }
  }, [isLocal, localTurn, localBoard, winnerPlayer, user?.uid]);

  // Sincroniza finais de jogo online
  useEffect(() => {
    if (!isLocal && match.boardState) {
      const winResult = checkChessWinner(match.boardState as ChessBoardState);
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

  const formatClock = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
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
          <span className="text-[8px] font-black text-purple-500 uppercase tracking-widest">Xadrez Estratégico</span>
          <h3 className="text-sm font-black text-white uppercase tracking-widest mt-1">Status da Arena</h3>
        </div>

        <div className="flex flex-col gap-3">
          {/* Card do Jogador 1 (Você / Peças Claras) */}
          <div className={`p-4 rounded-xl border flex flex-col gap-1 relative overflow-hidden ${
            currentTurn === (isLocal ? user?.uid : match.player1Id) 
            ? 'bg-purple-500/10 border-purple-500/30' 
            : 'bg-white/5 border-white/5 opacity-55'
          }`}>
            <span className="text-[8px] font-black text-purple-400 uppercase">Brancas (Você)</span>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">{isLocal ? 'Você' : match.player1Name}</span>
            <span className="text-xs font-black mt-2 text-white font-mono">{formatClock(p1Clock)}</span>
            {currentTurn === (isLocal ? user?.uid : match.player1Id) && (
              <span className="text-[7px] font-black text-purple-400 uppercase mt-1 animate-pulse">Sua Vez!</span>
            )}
          </div>

          {/* Card do Jogador 2 (Oponente / Peças Escuras / CPU) */}
          <div className={`p-4 rounded-xl border flex flex-col gap-1 relative overflow-hidden ${
            currentTurn === (isLocal ? 'computer' : match.player2Id) 
            ? 'bg-amber-500/10 border-amber-500/30' 
            : 'bg-white/5 border-white/5 opacity-55'
          }`}>
            <span className="text-[8px] font-black text-amber-500 uppercase">Pretas (Metálicas)</span>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">{getOpponentName()}</span>
            <span className="text-xs font-black mt-2 text-white font-mono">{formatClock(p2Clock)}</span>
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
              {winnerPlayer === 1 ? 'BRANCAS VENCERAM!' : 'PRETAS VENCERAM!'}
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

      {/* 👑 TABULEIRO DE XADREZ CIBERNÉTICO (DIREITA) */}
      <div className="flex-1 flex flex-col items-center justify-center">
        
        <div className="relative p-6 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[3rem] shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
          {/* Luz de Fundo Neon */}
          <div className="absolute inset-0 bg-purple-500/5 rounded-[3rem] blur-2xl z-0 pointer-events-none" />

          {/* Grid do Tabuleiro de Xadrez */}
          <div className="relative z-10 grid grid-rows-8 gap-0.5 w-[384px] h-[384px] bg-[#07090f] rounded-2xl p-1 overflow-hidden border border-white/5">
            {Array(8).fill(null).map((_, rIdx) => (
              <div key={rIdx} className="grid grid-cols-8 gap-0.5">
                {Array(8).fill(null).map((_, cIdx) => {
                  const cellKey = `${rIdx},${cIdx}`;
                  const piece = currentBoard.pieces[cellKey];
                  const isBlackSquare = (rIdx + cIdx) % 2 === 1;
                  const isSelected = selectedCell === cellKey;
                  
                  // Verifica se esta casa é um destino válido para a peça selecionada
                  const isValidTarget = selectedMoves.find(m => m.to === cellKey);

                  return (
                    <div
                      key={cIdx}
                      onClick={() => piece ? handleCellClick(rIdx, cIdx) : isValidTarget && handleTargetCellClick(rIdx, cIdx)}
                      className={`w-11 h-11 flex items-center justify-center relative select-none cursor-pointer transition-all ${
                        isBlackSquare 
                        ? 'bg-[#151928]' // Azul grafite
                        : 'bg-[#2a3045]' // Cinza azulado claro
                      }`}
                    >
                      {/* Destaque de destino válido */}
                      {isValidTarget && (
                        <div 
                          onClick={() => handleTargetCellClick(rIdx, cIdx)}
                          className="absolute inset-1.5 border-2 border-emerald-500/60 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.3)] z-20 cursor-pointer" 
                        />
                      )}

                      {/* Renderização física e luxuosa da Peça de Xadrez */}
                      {piece && (
                        <motion.div
                          layoutId={`chess-piece-${cellKey}`}
                          onClick={() => piece.player === myPlayerNum ? handleCellClick(rIdx, cIdx) : isValidTarget && handleTargetCellClick(rIdx, cIdx)}
                          className={`w-10 h-10 flex items-center justify-center text-3xl font-bold cursor-pointer transition-all z-10 ${
                            piece.player === 1
                            ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] hover:scale-105'
                            : 'text-amber-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] hover:scale-105 filter brightness-95'
                          } ${
                            isSelected ? 'scale-110 -translate-y-1 ring-2 ring-primary-500 rounded-lg bg-primary-500/10' : ''
                          }`}
                        >
                          {CHESS_PIECES_UNICODE[piece.type]}
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
