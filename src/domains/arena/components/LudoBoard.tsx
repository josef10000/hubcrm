import React, { useEffect, useState } from 'react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useArenaStore, GameMatch } from '@store/useArenaStore';
import { LudoBoardState, LudoToken, LudoColor, createInitialLudoState, getLudoValidMoves, applyLudoMove, getBestLudoMove, getLudoCoords, canLudoTokenMove } from '../helpers/ludoLogic';
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

  // Estado centralizado do Ludo com 4 cores ativas
  const [localBoard, setLocalBoard] = useState<LudoBoardState>(createInitialLudoState());
  const [localTurn, setLocalTurn] = useState<LudoColor>('red'); // Turnos locais: red -> green -> yellow -> blue
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [diceRolling, setDiceRolling] = useState(false);

  // Sincronização em tempo real para multiplayer e singleplayer
  const currentBoard = isLocal ? localBoard : (match.boardState || localBoard) as LudoBoardState;
  
  // No modo local, o jogador humano é a cor 'red' (Vermelho)
  // No modo online, o Player 1 (criador) joga com 'red' e o Player 2 joga com 'green'. Amarelo e Azul são robôs cooperativos.
  const myColor: LudoColor = isLocal ? 'red' : (match.player1Id === user?.uid ? 'red' : 'green');
  
  // Quem é o jogador ativo da vez
  const activeColor: LudoColor = isLocal ? localTurn : (match.turn as LudoColor || 'red');
  const isMyTurn = isLocal ? localTurn === 'red' : (match.turn === user?.uid && activeColor === myColor);

  // Efeitos Sonoros Procedimentais Premium
  const playDiceSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(550, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
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
      osc.frequency.setValueAtTime(isCapture ? 680 : 360, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(isCapture ? 180 : 260, ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch (e) {
      console.warn('Audio Context indisponível:', e);
    }
  };

  // Turno rotativo clássico do Ludo de 4 cores
  const getNextLudoColorTurn = (current: LudoColor): LudoColor => {
    const sequence: LudoColor[] = ['red', 'green', 'yellow', 'blue'];
    const idx = sequence.indexOf(current);
    return sequence[(idx + 1) % 4];
  };

  // Rola o dado do Ludo com micro-animação acelerada luxuosa
  const handleRollDice = async () => {
    if (!isMyTurn || currentBoard.hasRolled || diceRolling || currentBoard.winnerColor) return;

    setDiceRolling(true);
    playDiceSound();

    setTimeout(async () => {
      const rolledValue = Math.floor(Math.random() * 6) + 1;
      setDiceRolling(false);

      const nextBoard = {
        ...currentBoard,
        diceValue: rolledValue,
        hasRolled: true
      };

      const potentialMoves = getLudoValidMoves(nextBoard, activeColor);

      if (potentialMoves.length === 0) {
        toast.info(`Rolou ${rolledValue}! Sem movimentos válidos para Vermelho.`);
        nextBoard.diceValue = null;
        nextBoard.hasRolled = false;

        const nextColorTurn = getNextLudoColorTurn(activeColor);

        if (isLocal) {
          setLocalBoard(nextBoard);
          setLocalTurn(nextColorTurn);
        } else {
          // No multiplayer, passa o turno das cores ou dos jogadores
          await makeMove(nextBoard, `roll-${rolledValue}-no-moves`);
        }
      } else {
        if (isLocal) {
          setLocalBoard(nextBoard);
        } else {
          await makeMove(nextBoard, `roll-${rolledValue}`);
        }
      }
    }, 550);
  };

  // Humano move a peça escolhida
  const handleSelectToken = async (token: LudoToken) => {
    if (!isMyTurn || !currentBoard.hasRolled || currentBoard.diceValue === null || diceRolling) return;
    if (token.color !== activeColor) return;

    const oldBoard = currentBoard;
    const nextBoard = applyLudoMove(currentBoard, token, currentBoard.diceValue);
    
    const isCapture = nextBoard.tokens.filter(t => t.position === -1).length > oldBoard.tokens.filter(t => t.position === -1).length;
    playMoveSound(isCapture);

    if (isCapture) {
      toast.success('💥 Captura espetacular! Ficha oponente retornou para o ninho.');
    }

    if (nextBoard.winnerColor) {
      setLocalBoard(nextBoard);
      toast.success(`👑 Vitória Consagrada! O jogador ${nextBoard.winnerColor.toUpperCase()} venceu o Ludo!`);
      return;
    }

    // Regra clássica de Ludo: Obter 6 ou capturar dá uma jogada extra!
    const rollAgain = currentBoard.diceValue === 6 || isCapture;
    
    nextBoard.diceValue = null;
    nextBoard.hasRolled = false;

    if (isLocal) {
      setLocalBoard(nextBoard);
      if (!rollAgain) {
        setLocalTurn(getNextLudoColorTurn(activeColor));
      } else {
        toast.success('Rode o dado novamente! Bônus de jogada extra.');
      }
    } else {
      // Sincroniza online
      await makeMove(nextBoard, `move-${token.color}-${token.id}`);
    }
  };

  // Efeito recursivo de Inteligência Artificial para as 3 CPUs do Ludo offline (green, yellow, blue)
  useEffect(() => {
    if (isLocal && localTurn !== 'red' && !currentBoard.winnerColor) {
      setIsAiThinking(true);

      const aiTimer = setTimeout(() => {
        // 1. CPU Rola o Dado
        playDiceSound();
        const aiDice = Math.floor(Math.random() * 6) + 1;
        
        const boardWithDice = {
          ...localBoard,
          diceValue: aiDice,
          hasRolled: true
        };

        const validAiMoves = getLudoValidMoves(boardWithDice, localTurn);

        if (validAiMoves.length === 0) {
          // Sem movimentos: passa para a próxima CPU ou volta para o jogador
          boardWithDice.diceValue = null;
          boardWithDice.hasRolled = false;
          setLocalBoard(boardWithDice);
          setLocalTurn(getNextLudoColorTurn(localTurn));
          setIsAiThinking(false);
          return;
        }

        // 2. CPU Escolhe a melhor jogada
        setTimeout(() => {
          const bestToken = getBestLudoMove(boardWithDice, aiDice, localTurn);
          if (bestToken) {
            const nextBoard = applyLudoMove(boardWithDice, bestToken, aiDice);
            
            const isCapture = nextBoard.tokens.filter(t => t.position === -1).length > boardWithDice.tokens.filter(t => t.position === -1).length;
            playMoveSound(isCapture);

            nextBoard.diceValue = null;
            nextBoard.hasRolled = false;
            setLocalBoard(nextBoard);

            if (nextBoard.winnerColor) {
              toast.error(`A CPU ${nextBoard.winnerColor.toUpperCase()} venceu a partida de Ludo!`);
            } else {
              const rollAgain = aiDice === 6 || isCapture;
              if (rollAgain) {
                // Ganhou jogada extra: mantém a CPU ativa
                setLocalTurn(localTurn);
              } else {
                setLocalTurn(getNextLudoColorTurn(localTurn));
              }
            }
          }
          setIsAiThinking(false);
        }, 700);

      }, 900);

      return () => clearTimeout(aiTimer);
    }
  }, [isLocal, localTurn, localBoard, currentBoard.winnerColor]);

  const handleRestartLocalGame = () => {
    setLocalBoard(createInitialLudoState());
    setLocalTurn('red');
    setIsAiThinking(false);
    setDiceRolling(false);
    toast.success('Partida de Ludo 4 Jogadores reiniciada!');
  };

  const handleLeaveGame = () => {
    if (isLocal) {
      if (onExit) onExit();
    } else {
      exitActiveMatch();
    }
  };

  // Cores CSS Estilizadas Neon para as 4 Cores do Ludo
  const LUDO_COLORS_THEME: Record<LudoColor, { bg: string; text: string; shadow: string; label: string; border: string }> = {
    red: { bg: 'bg-rose-500', text: 'text-rose-400', shadow: 'shadow-[0_0_15px_rgba(244,63,94,0.5)]', label: 'Vermelho (Você)', border: 'border-rose-500/30' },
    green: { bg: 'bg-emerald-500', text: 'text-emerald-400', shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.5)]', label: 'Verde (CPU)', border: 'border-emerald-500/30' },
    yellow: { bg: 'bg-amber-500', text: 'text-amber-400', shadow: 'shadow-[0_0_15px_rgba(245,158,11,0.5)]', label: 'Amarelo (CPU)', border: 'border-amber-500/30' },
    blue: { bg: 'bg-indigo-500', text: 'text-indigo-400', shadow: 'shadow-[0_0_15px_rgba(99,102,241,0.5)]', label: 'Azul (CPU)', border: 'border-indigo-500/30' }
  };

  // Renderização 2D inteligente das células do tabuleiro clássico de Ludo 15x15
  const renderLudoCell = (x: number, y: number) => {
    const isRedBase = x < 6 && y < 6;
    const isGreenBase = x >= 9 && y < 6;
    const isYellowBase = x < 6 && y >= 9;
    const isBlueBase = x >= 9 && y >= 9;

    const isRedHome = y === 7 && x > 0 && x < 6;
    const isGreenHome = x === 7 && y > 0 && y < 6;
    const isYellowHome = x === 7 && y > 8 && y < 14;
    const isBlueHome = y === 7 && x > 8 && x < 14;

    const isRedStart = x === 1 && y === 6;
    const isGreenStart = x === 8 && y === 1;
    const isYellowStart = x === 6 && y === 13;
    const isBlueStart = x === 13 && y === 8;

    const isCenter = x >= 6 && x <= 8 && y >= 6 && y <= 8;

    if (isRedBase) return 'bg-rose-500/10 border-rose-500/20';
    if (isGreenBase) return 'bg-emerald-500/10 border-emerald-500/20';
    if (isYellowBase) return 'bg-amber-500/10 border-amber-500/20';
    if (isBlueBase) return 'bg-indigo-500/10 border-indigo-500/20';

    if (isRedHome) return 'bg-rose-500/40 border-rose-500/30';
    if (isGreenHome) return 'bg-emerald-500/40 border-emerald-500/30';
    if (isYellowHome) return 'bg-amber-500/40 border-amber-500/30';
    if (isBlueHome) return 'bg-indigo-500/40 border-indigo-500/30';

    if (isRedStart) return 'bg-rose-500/60 border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]';
    if (isGreenStart) return 'bg-emerald-500/60 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]';
    if (isYellowStart) return 'bg-amber-500/60 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]';
    if (isBlueStart) return 'bg-indigo-500/60 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]';

    if (isCenter) return 'bg-indigo-950/80 border-indigo-500/30';

    return 'bg-[#0f121d] border-white/[0.03]';
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-center justify-center py-6 select-none animate-in fade-in duration-300">
      
      {/* 📊 PAINEL ESTATÍSTICO DE JOGO (ESQUERDA) */}
      <div className="w-64 bg-slate-950/65 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 flex flex-col gap-6 select-none shadow-2xl">
        <div className="space-y-1">
          <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Ludo de 4 Jogadores</span>
          <h3 className="text-sm font-black text-white uppercase tracking-widest mt-1">Status da Arena</h3>
        </div>

        {/* Listagem das 4 Cores e Turnos */}
        <div className="flex flex-col gap-2">
          {(['red', 'green', 'yellow', 'blue'] as LudoColor[]).map(color => {
            const theme = LUDO_COLORS_THEME[color];
            const isTurn = activeColor === color;
            const wins = currentBoard.tokens.filter(t => t.color === color && t.position === 105).length;
            
            return (
              <div key={color} className={`p-3.5 rounded-2xl border flex flex-col gap-1 relative overflow-hidden transition-all ${
                isTurn ? `${theme.border} bg-white/5` : 'bg-transparent border-white/5 opacity-40'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-[8px] font-black uppercase ${theme.text}`}>{theme.label}</span>
                  <span className="text-[9px] font-black text-white">{wins}/4 Finalizadas</span>
                </div>
                {isTurn && (
                  <span className={`text-[7px] font-black uppercase mt-1 animate-pulse ${theme.text}`}>
                    {color === 'red' ? 'Sua Vez!' : 'Pensando (CPU)...'}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* 🎲 DADO 3D MULTICOR DINÂMICO COM GIRO PREMIUM */}
        <div className="flex flex-col items-center gap-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
          <span className="text-[8px] font-black text-gray-500 uppercase">Dado da Sorte</span>
          
          <motion.button
            whileHover={isMyTurn && !currentBoard.hasRolled ? { scale: 1.08, y: -2 } : {}}
            whileTap={isMyTurn && !currentBoard.hasRolled ? { scale: 0.95 } : {}}
            onClick={handleRollDice}
            disabled={!isMyTurn || currentBoard.hasRolled || diceRolling || !!currentBoard.winnerColor}
            className={`w-16 h-16 rounded-2xl border flex items-center justify-center text-3xl font-black transition-all relative ${
              isMyTurn && !currentBoard.hasRolled
              ? 'bg-gradient-to-br from-indigo-500 via-purple-600 to-rose-600 border-indigo-400/40 text-white cursor-pointer shadow-lg shadow-indigo-500/35'
              : 'bg-slate-900 border-white/5 text-gray-600'
            }`}
          >
            {diceRolling ? (
              <motion.div
                animate={{ 
                  rotate: [0, 360, 720, 1080], 
                  scale: [1, 1.2, 0.9, 1.1, 1] 
                }}
                transition={{ duration: 0.55, ease: 'easeInOut' }}
              >
                🎲
              </motion.div>
            ) : (
              currentBoard.diceValue !== null ? currentBoard.diceValue : '🎲'
            )}
          </motion.button>

          {currentBoard.diceValue !== null && !diceRolling && (
            <span className="text-[9px] font-bold text-white uppercase tracking-widest animate-pulse font-mono">
              Rolou: {currentBoard.diceValue}!
            </span>
          )}
        </div>

        {/* Botão de Reset e Abandonar */}
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

      {/* 👑 TABULEIRO DE LUDO 15X15 LUXUOSO NEON (DIREITA) */}
      <div className="flex-1 flex flex-col items-center justify-center">
        
        <div className="relative p-6 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[3rem] shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
          {/* Luz de fundo de efeito premium */}
          <div className="absolute inset-0 bg-indigo-500/5 rounded-[3rem] blur-3xl z-0 pointer-events-none" />

          {/* Grid do Tabuleiro de Ludo 15x15 */}
          <div className="relative z-10 grid grid-cols-15 grid-rows-15 w-[384px] h-[384px] bg-[#07090f] rounded-2xl p-1 overflow-hidden border border-white/5">
            {Array(15).fill(null).map((_, y) => (
              <React.Fragment key={y}>
                {Array(15).fill(null).map((_, x) => {
                  const cellClass = renderLudoCell(x, y);

                  // Encontra as fichas localizadas nesta coordenada do circuito
                  const tokensHere = currentBoard.tokens.filter(t => {
                    const coords = getLudoCoords(t.color, t);
                    return coords.x === x && coords.y === y;
                  });

                  return (
                    <div
                      key={x}
                      className={`w-full h-full border-[0.5px] flex items-center justify-center relative transition-all ${cellClass}`}
                    >
                      {/* Efeito visual na reta final e centro */}
                      {x === 7 && y === 7 && (
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 animate-pulse z-0" />
                      )}

                      {/* Desenha as fichas da casa atual de forma empilhada ou orbitando */}
                      {tokensHere.length > 0 && (
                        <div className="relative w-full h-full flex items-center justify-center">
                          {tokensHere.map((token, tIdx) => {
                            const isMyToken = token.color === myColor;
                            const isClickable = isMyTurn && currentBoard.hasRolled && canLudoTokenMove(token, currentBoard.diceValue!) && isMyToken;
                            const theme = LUDO_COLORS_THEME[token.color];

                            // Posicionamento de Órbita Circular elegante se houver múltiplas fichas na mesma casa!
                            const count = tokensHere.length;
                            let transformStyle = 'none';
                            if (count > 1) {
                              const angle = (tIdx / count) * 2 * Math.PI;
                              const radius = 6; // pixels de deslocamento orbital
                              const tx = Math.round(Math.cos(angle) * radius);
                              const ty = Math.round(Math.sin(angle) * radius);
                              transformStyle = `translate(${tx}px, ${ty}px)`;
                            }

                            return (
                              <motion.div
                                key={`${token.color}-${token.id}`}
                                layoutId={`ludo-token-${token.color}-${token.id}`}
                                onClick={() => isClickable && handleSelectToken(token)}
                                style={{
                                  position: 'absolute',
                                  transform: transformStyle,
                                  zIndex: 10 + tIdx
                                }}
                                className={`w-4 h-4 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                                  token.color === 'red' ? 'bg-gradient-to-br from-rose-400 to-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.6)]' :
                                  token.color === 'green' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.6)]' :
                                  token.color === 'yellow' ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.6)]' :
                                  'bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.6)]'
                                } ${
                                  isClickable
                                  ? 'ring-2 ring-white scale-125 border-indigo-400 z-50 animate-bounce'
                                  : 'border border-white/20'
                                }`}
                              >
                                <div className="w-2.5 h-2.5 rounded-full border border-white/10 flex items-center justify-center bg-white/10">
                                  <span className="text-[6px] text-white/90 font-bold">{token.id + 1}</span>
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
