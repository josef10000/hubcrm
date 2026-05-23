import React, { useEffect, useState } from 'react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useArenaStore, GameMatch } from '@store/useArenaStore';
import { LudoBoardState, LudoToken, LudoColor, createInitialLudoState, getLudoValidMoves, applyLudoMove, getBestLudoMove, getLudoCoords } from '../helpers/ludoLogic';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface LudoBoardProps {
  match: Partial<GameMatch>;
  isLocal: boolean;
  aiDifficulty?: number;
  onExit?: () => void;
}

export function LudoBoard({ match, isLocal, aiDifficulty = 3, onExit }: LudoBoardProps) {
  const { user } = useAuth();
  const makeMove = useArenaStore(state => state.makeMove);
  const exitActiveMatch = useArenaStore(state => state.exitActiveMatch);

  // Estados locais para modo offline (singleplayer)
  const [localBoard, setLocalBoard] = useState<LudoBoardState>(createInitialLudoState());
  const [localTurn, setLocalTurn] = useState<string>(user?.uid || 'player1');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [diceRolling, setDiceRolling] = useState(false);

  // Sincronização em tempo real para jogos online multiplayer
  const currentBoard = isLocal ? localBoard : (match.boardState || localBoard) as LudoBoardState;
  const currentTurn = isLocal ? localTurn : match.turn;
  const isMyTurn = isLocal ? localTurn === user?.uid : match.turn === user?.uid;
  const myColor: LudoColor = isLocal ? 'red' : (match.player1Id === user?.uid ? 'red' : 'green');
  const activeColor: LudoColor = isLocal 
    ? (localTurn === 'computer' ? 'green' : 'red') 
    : (match.turn === match.player1Id ? 'red' : 'green');

  // Movimentos válidos para o jogador ativo
  const validMoves = getLudoValidMoves(currentBoard, activeColor);

  // Efeitos Sonoros Procedimentais (Dado e Peças)
  const playDiceSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(450, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn('Audio Context indisponível:', e);
    }
  };

  const playMoveSound = (isCapture: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isCapture ? 600 : 340, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(isCapture ? 200 : 220, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.warn('Audio Context indisponível:', e);
    }
  };

  // Rola o dado do Ludo
  const handleRollDice = async () => {
    if (!isMyTurn || currentBoard.hasRolled || diceRolling || currentBoard.winnerColor) return;

    setDiceRolling(true);
    playDiceSound();

    // Roda animação visual do dado de 600ms
    setTimeout(async () => {
      const rolledValue = Math.floor(Math.random() * 6) + 1;
      setDiceRolling(false);

      const nextBoard = {
        ...currentBoard,
        diceValue: rolledValue,
        hasRolled: true
      };

      // Calcula os movimentos válidos imediatos após a rolagem
      const potentialMoves = getLudoValidMoves(nextBoard, activeColor);

      if (potentialMoves.length === 0) {
        // Sem movimentos válidos! O turno passa para o oponente imediatamente
        toast.info(`Rolou ${rolledValue}! Sem movimentos possíveis.`);
        nextBoard.diceValue = null;
        nextBoard.hasRolled = false;

        if (isLocal) {
          setLocalBoard(nextBoard);
          setLocalTurn('computer');
        } else {
          await makeMove(nextBoard, `roll-${rolledValue}-no-moves`);
        }
      } else {
        // Salva estado para o jogador escolher qual peça mover
        if (isLocal) {
          setLocalBoard(nextBoard);
        } else {
          await makeMove(nextBoard, `roll-${rolledValue}`);
        }
      }
    }, 600);
  };

  // Executa o movimento da peça selecionada pelo jogador
  const handleSelectToken = async (token: LudoToken) => {
    if (!isMyTurn || !currentBoard.hasRolled || currentBoard.diceValue === null || diceRolling) return;
    if (token.color !== activeColor) return;

    const isValid = canLudoTokenMove(token, currentBoard.diceValue);
    if (!isValid) return;

    // Aplica o movimento de Ludo
    const oldBoard = currentBoard;
    const nextBoard = applyLudoMove(currentBoard, token, currentBoard.diceValue);
    
    // Verifica se houve captura (comparando peças na base)
    const oldCapturedCount = oldBoard.tokens.filter(t => t.position === -1).length;
    const newCapturedCount = nextBoard.tokens.filter(t => t.position === -1).length;
    const isCapture = newCapturedCount > oldCapturedCount;
    
    playMoveSound(isCapture);

    if (isCapture) {
      toast.success('💥 Captura! Peça adversária retornou para a base.');
    }

    if (nextBoard.winnerColor) {
      if (isLocal) {
        setLocalBoard(nextBoard);
        toast.success('👑 Incrível! Você derrotou a máquina no Ludo!');
      } else {
        const winnerUserId = nextBoard.winnerColor === 'red' ? match.player1Id : match.player2Id;
        await makeMove(nextBoard, `move-${token.color}-${token.id}`, winnerUserId);
        toast.success('👑 Vitória consagrada no Ludo da Arena!');
      }
      return;
    }

    // Regra do Ludo: se tirou 6 ou se capturou, o jogador joga de novo!
    const rollAgain = currentBoard.diceValue === 6 || isCapture;
    
    nextBoard.diceValue = null;
    nextBoard.hasRolled = false;

    if (isLocal) {
      setLocalBoard(nextBoard);
      if (!rollAgain) {
        setLocalTurn('computer');
      } else {
        toast.success('Rode de novo! Bônus de jogada extra.');
      }
    } else {
      const nextTurnUserId = rollAgain ? user?.uid : (match.player1Id === user?.uid ? match.player2Id : match.player1Id);
      // Sincroniza a jogada e opcionalmente mantém o turno
      await makeMove(nextBoard, `move-${token.color}-${token.id}`);
      if (rollAgain) {
        toast.success('Bônus de rodada extra! Rolo o dado novamente.');
      }
    }
  };

  // Efeito de IA do Computador no modo local (singleplayer)
  useEffect(() => {
    if (isLocal && localTurn === 'computer' && !currentBoard.winnerColor) {
      setIsAiThinking(true);

      const timer = setTimeout(() => {
        // 1. Simula rolagem de dado do computador
        playDiceSound();
        const aiDice = Math.floor(Math.random() * 6) + 1;
        
        const boardWithDice = {
          ...localBoard,
          diceValue: aiDice,
          hasRolled: true
        };

        const aiMoves = getLudoValidMoves(boardWithDice, 'green');

        if (aiMoves.length === 0) {
          // Computador sem movimentos
          boardWithDice.diceValue = null;
          boardWithDice.hasRolled = false;
          setLocalBoard(boardWithDice);
          setLocalTurn(user?.uid || 'player1');
          setIsAiThinking(false);
          return;
        }

        // 2. Escolhe a melhor peça para mover usando a IA Heurística
        setTimeout(() => {
          const bestToken = getBestLudoMove(boardWithDice, aiDice, 'green');
          if (bestToken) {
            const nextBoard = applyLudoMove(boardWithDice, bestToken, aiDice);
            
            // Verifica capturas
            const isCapture = nextBoard.tokens.filter(t => t.position === -1).length > boardWithDice.tokens.filter(t => t.position === -1).length;
            playMoveSound(isCapture);

            nextBoard.diceValue = null;
            nextBoard.hasRolled = false;

            setLocalBoard(nextBoard);

            if (nextBoard.winnerColor) {
              toast.error('O Computador venceu a partida de Ludo!');
            } else {
              // Se o dado foi 6 ou se capturou, o computador ganha outra vez
              const rollAgain = aiDice === 6 || isCapture;
              if (rollAgain) {
                // Roda o loop da IA recursivamente
                setLocalTurn('computer');
              } else {
                setLocalTurn(user?.uid || 'player1');
              }
            }
          }
          setIsAiThinking(false);
        }, 800);

      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isLocal, localTurn, localBoard, user?.uid, currentBoard.winnerColor]);

  // Sincroniza finais de jogo online
  useEffect(() => {
    if (!isLocal && match.boardState) {
      // Estado de Ludo online sincroniza sozinho
    }
  }, [isLocal, match.boardState]);

  const handleRestartLocalGame = () => {
    setLocalBoard(createInitialLudoState());
    setLocalTurn(user?.uid || 'player1');
    setIsAiThinking(false);
    setDiceRolling(false);
    toast.success('Partida de Ludo reiniciada!');
  };

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

  // Desenha a célula correspondente ao tabuleiro clássico de Ludo
  const renderLudoCell = (x: number, y: number) => {
    // 1. Quadrantes de Base (Ninhos)
    const isRedBase = x < 6 && y < 6;
    const isGreenBase = x >= 9 && y < 6;
    const isYellowBase = x < 6 && y >= 9;
    const isBlueBase = x >= 9 && y >= 9;

    // 2. Reta final
    const isRedHome = y === 7 && x > 0 && x < 6;
    const isGreenHome = x === 7 && y > 0 && y < 6;

    // 3. Casas Especiais de Saída/Seguras
    const isRedStart = x === 1 && y === 6;
    const isGreenStart = x === 8 && y === 1;

    // 4. Centro (Vitória)
    const isCenter = x >= 6 && x <= 8 && y >= 6 && y <= 8;

    // Cores específicas
    if (isRedBase) return 'bg-rose-500/10 border-rose-500/20';
    if (isGreenBase) return 'bg-emerald-500/10 border-emerald-500/20';
    if (isYellowBase || isBlueBase) return 'bg-slate-950/20 border-white/5';
    if (isRedHome) return 'bg-rose-500/40 border-rose-500/30';
    if (isGreenHome) return 'bg-emerald-500/40 border-emerald-500/30';
    if (isRedStart) return 'bg-rose-500/60 border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]';
    if (isGreenStart) return 'bg-emerald-500/60 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]';
    if (isCenter) return 'bg-indigo-950/80 border-indigo-500/30';

    return 'bg-[#0f121d] border-white/[0.03]';
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-center justify-center py-6 select-none animate-in fade-in duration-300">
      
      {/* 📊 PAINEL ESTATÍSTICO DE JOGO (ESQUERDA) */}
      <div className="w-64 bg-slate-950/65 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 flex flex-col gap-6 select-none shadow-2xl">
        <div className="space-y-1">
          <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Ludo da Arena</span>
          <h3 className="text-sm font-black text-white uppercase tracking-widest mt-1">Status da Arena</h3>
        </div>

        <div className="flex flex-col gap-3">
          {/* Card do Jogador 1 (Você / Vermelho) */}
          <div className={`p-4 rounded-xl border flex flex-col gap-1 relative ${
            currentTurn === (isLocal ? user?.uid : match.player1Id) 
            ? 'bg-rose-500/10 border-rose-500/30' 
            : 'bg-white/5 border-white/5 opacity-55'
          }`}>
            <span className="text-[8px] font-black text-rose-500 uppercase">Vermelho (Você)</span>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">{isLocal ? 'Você' : match.player1Name}</span>
            {currentTurn === (isLocal ? user?.uid : match.player1Id) && (
              <span className="text-[7px] font-black text-rose-400 uppercase mt-1 animate-pulse">Sua Vez!</span>
            )}
          </div>

          {/* Card do Jogador 2 (Oponente / Verde / CPU) */}
          <div className={`p-4 rounded-xl border flex flex-col gap-1 relative ${
            currentTurn === (isLocal ? 'computer' : match.player2Id) 
            ? 'bg-emerald-500/10 border-emerald-500/30' 
            : 'bg-white/5 border-white/5 opacity-55'
          }`}>
            <span className="text-[8px] font-black text-emerald-500 uppercase">Verde (CPU)</span>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">{getOpponentName()}</span>
            {currentTurn === (isLocal ? 'computer' : match.player2Id) && (
              <span className="text-[7px] font-black text-emerald-400 uppercase mt-1 animate-pulse font-mono">Pensando...</span>
            )}
          </div>
        </div>

        {/* 🎲 DADO INTERATIVO PREMIUM */}
        <div className="flex flex-col items-center gap-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
          <span className="text-[8px] font-black text-gray-500 uppercase">Rolar Dado</span>
          
          <motion.button
            whileHover={isMyTurn && !currentBoard.hasRolled ? { scale: 1.05 } : {}}
            whileTap={isMyTurn && !currentBoard.hasRolled ? { scale: 0.95 } : {}}
            onClick={handleRollDice}
            disabled={!isMyTurn || currentBoard.hasRolled || diceRolling || !!currentBoard.winnerColor}
            className={`w-16 h-16 rounded-2xl border flex items-center justify-center text-3xl font-black transition-all ${
              isMyTurn && !currentBoard.hasRolled
              ? 'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-400/40 text-white cursor-pointer shadow-lg shadow-indigo-500/30'
              : 'bg-slate-900 border-white/5 text-gray-500'
            }`}
          >
            {diceRolling ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.3, ease: 'linear' }}
              >
                🎲
              </motion.div>
            ) : (
              currentBoard.diceValue !== null ? currentBoard.diceValue : '🎲'
            )}
          </motion.button>

          {currentBoard.diceValue !== null && !diceRolling && (
            <span className="text-[9px] font-bold text-white uppercase tracking-widest animate-pulse">
              Rolou: {currentBoard.diceValue}!
            </span>
          )}
        </div>

        {/* Notificação de Vencedor */}
        {currentBoard.winnerColor && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-1.5 animate-bounce">
            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Partida Encerrada</span>
            <p className="text-[10px] text-white font-bold uppercase">
              {currentBoard.winnerColor === 'red' ? 'VERMELHO VENCEU!' : 'VERDE VENCEU!'}
            </p>
          </div>
        )}

        {isLocal && (
          <button 
            onClick={handleRestartLocalGame}
            className="py-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 text-[9px] font-black text-emerald-400 uppercase tracking-widest rounded-xl transition-all cursor-pointer text-center"
          >
            🔄 Recomeçar Partida
          </button>
        )}

        <button 
          onClick={handleLeaveGame}
          className="mt-auto py-3.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 text-[9px] font-black text-rose-400 uppercase tracking-widest rounded-xl transition-all cursor-pointer text-center"
        >
          🏳️ Abandonar Arena
        </button>
      </div>

      {/* 👑 TABULEIRO DE LUDO PREMIUM 15X15 (DIREITA) */}
      <div className="flex-1 flex flex-col items-center justify-center">
        
        <div className="relative p-6 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[3rem] shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
          {/* Luz de Fundo Neon */}
          <div className="absolute inset-0 bg-indigo-500/5 rounded-[3rem] blur-2xl z-0 pointer-events-none" />

          {/* Grid do Tabuleiro de Ludo 15x15 */}
          <div className="relative z-10 grid grid-cols-15 grid-rows-15 w-[384px] h-[384px] bg-[#07090f] rounded-2xl p-1 overflow-hidden border border-white/5">
            {Array(15).fill(null).map((_, y) => (
              <React.Fragment key={y}>
                {Array(15).fill(null).map((_, x) => {
                  const cellClass = renderLudoCell(x, y);

                  // Encontra fichas que estão nesta casa (comum ou reta final)
                  const tokensHere = currentBoard.tokens.filter(t => {
                    const coords = getLudoCoords(t.color, t);
                    return coords.x === x && coords.y === y;
                  });

                  return (
                    <div
                      key={x}
                      className={`w-full h-full border-[0.5px] flex items-center justify-center relative transition-all ${cellClass}`}
                    >
                      {/* Se houver fichas nesta casa, desenha elas de forma empilhada */}
                      {tokensHere.length > 0 && (
                        <div className="relative w-7 h-7 flex items-center justify-center">
                          {tokensHere.map((token, tIdx) => {
                            const isMyToken = token.color === myColor;
                            const isClickable = isMyTurn && currentBoard.hasRolled && canLudoTokenMove(token, currentBoard.diceValue!) && isMyToken;

                            return (
                              <motion.div
                                key={token.id}
                                layoutId={`ludo-token-${token.color}-${token.id}`}
                                onClick={() => isClickable && handleSelectToken(token)}
                                style={{
                                  position: 'absolute',
                                  transform: tokensHere.length > 1 ? `translate(${tIdx * 3}px, ${tIdx * 3}px)` : 'none',
                                  zIndex: tokensHere.length + tIdx
                                }}
                                className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                                  token.color === 'red'
                                  ? 'bg-gradient-to-br from-rose-400 to-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.6)]'
                                  : 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.6)]'
                                } ${
                                  isClickable
                                  ? 'ring-2 ring-white scale-110 border-indigo-400 z-50 animate-pulse'
                                  : 'border border-white/10'
                                }`}
                              >
                                <div className="w-2.5 h-2.5 rounded-full border border-white/20 flex items-center justify-center bg-white/10">
                                  <span className="text-[7px] text-white/80 font-bold">{token.id + 1}</span>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
