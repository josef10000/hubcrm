import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, RefreshCw, AlertTriangle, ArrowRight, DollarSign, Eye, ShieldAlert, Award, Volume2, VolumeX, HelpCircle } from 'lucide-react';
import { useArenaStore } from '@store/useArenaStore';
import { GameHelpModal } from './GameHelpModal';
import { MONOPOLY_SQUARES, MONOPOLY_SQUARES as squares, CHANCE_CARDS, MonopolySquare } from '../helpers/monopolyConstants';
import { useAuth } from '@auth/contexts/AuthContext';
import { toast } from 'sonner';

interface MonopolyBoardProps {
  match: any;
  isLocal: boolean;
  aiDifficulty?: number;
  onExit?: () => void;
}

export function MonopolyBoard({ match, isLocal, aiDifficulty = 3, onExit }: MonopolyBoardProps) {
  const { user } = useAuth();
  const makeMove = useArenaStore(state => state.makeMove);
  const exitActiveMatch = useArenaStore(state => state.exitActiveMatch);

  // Estados Locais
  const [skin, setSkin] = useState<'classic' | 'cyberpunk'>('cyberpunk');
  const [isRolling, setIsRolling] = useState(false);
  const [dice, setDice] = useState<[number, number] | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [activeChanceCard, setActiveChanceCard] = useState<any | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedPropertyForUpgrade, setSelectedPropertyForUpgrade] = useState<MonopolySquare | null>(null);

  const players = match.boardState?.players || [];
  const properties = match.boardState?.properties || {};
  const log = match.boardState?.log || [];
  const currentTurn = match.turn;

  const activePlayer = players.find((p: any) => p.id === currentTurn);
  const isMyTurn = currentTurn === (isLocal ? 'player1' : user?.uid);

  // Efeito de Som da Arena
  const playSound = (type: 'dice' | 'cash' | 'card' | 'jail' | 'bankrupt') => {
    if (!soundEnabled) return;
    try {
      const sounds: Record<string, string> = {
        dice: 'https://assets.mixkit.co/active_storage/sfx/2012/2012-84.wav',
        cash: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav',
        card: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-84.wav',
        jail: 'https://assets.mixkit.co/active_storage/sfx/2006/2006-84.wav',
        bankrupt: 'https://assets.mixkit.co/active_storage/sfx/2021/2021-84.wav'
      };
      const audio = new Audio(sounds[type]);
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  // Efeito de Execução automática dos Turnos dos Bots (IAs)
  useEffect(() => {
    // Apenas o jogador criador da partida executa as jogadas dos bots para evitar duplicidades em rede
    const isCreator = isLocal || (user?.uid === match.player1Id);
    if (activePlayer && activePlayer.isBot && isCreator && match.boardState && match.status === 'playing') {
      const botTimer = setTimeout(() => {
        runBotTurn();
      }, 2000);
      return () => clearTimeout(botTimer);
    }
  }, [currentTurn, match.status]);

  // Função para simular o bot jogando inteligente
  const runBotTurn = () => {
    if (!match.boardState) return;
    const nextState = { ...match.boardState };
    const playerIdx = nextState.players.findIndex((p: any) => p.id === currentTurn);
    if (playerIdx === -1) return;
    const bot = nextState.players[playerIdx];

    // 1. Rolar dados
    playSound('dice');
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const totalMove = d1 + d2;

    const oldPos = bot.position;
    let newPos = (oldPos + totalMove) % 40;
    bot.position = newPos;

    let logMessage = `${bot.name} (Bot) rolou [${d1}, ${d2}] e avançou para ${squares[newPos].name}.`;

    // Regra da Partida (Passou pelo 0)
    if (newPos < oldPos) {
      bot.money += 200;
      logMessage += ` Recebeu M$ 200 ao passar pela Partida.`;
    }

    const currentSquare = squares[newPos];

    // Lógica inteligente do Bot
    if (currentSquare.type === 'property' || currentSquare.type === 'company' || currentSquare.type === 'utility') {
      const ownerId = nextState.properties[newPos];
      if (!ownerId && bot.money >= (currentSquare.price || 0) + 150) {
        // Compra se sobrar dinheiro
        bot.money -= currentSquare.price || 0;
        nextState.properties[newPos] = bot.id;
        logMessage += ` Comprou a propriedade por M$ ${currentSquare.price}.`;
        playSound('cash');
      } else if (ownerId && ownerId !== bot.id) {
        // Pagar aluguel
        const owner = nextState.players.find((p: any) => p.id === ownerId);
        if (owner) {
          const rentValue = calculateRent(currentSquare, nextState.properties, ownerId);
          bot.money -= rentValue;
          owner.money += rentValue;
          logMessage += ` Pagou M$ ${rentValue} de aluguel para ${owner.name}.`;
          playSound('cash');
        }
      }
    } else if (currentSquare.type === 'tax') {
      const taxValue = currentSquare.price || 100;
      bot.money -= taxValue;
      logMessage += ` Pagou M$ ${taxValue} de impostos.`;
    } else if (currentSquare.type === 'go_to_jail') {
      bot.position = 10;
      bot.isPreso = true;
      bot.jailTurns = 3;
      logMessage += ` Enviado para a prisão!`;
      playSound('jail');
    }

    // Tratamento de falência do Bot
    if (bot.money < 0) {
      bot.money = 0;
      // Hipoteca propriedades do bot de forma simplificada
      Object.keys(nextState.properties).forEach(key => {
        if (nextState.properties[key] === bot.id) {
          delete nextState.properties[key]; // Libera
        }
      });
      nextState.players[playerIdx].isBankrupt = true;
      logMessage += ` DECLAROU FALÊNCIA corporativa e saiu do jogo!`;
      playSound('bankrupt');
    }

    nextState.log = [logMessage, ...nextState.log].slice(0, 15);
    
    // Passa o turno
    const activePlayers = nextState.players.filter((p: any) => !p.isBankrupt);
    let nextTurnId = currentTurn;
    if (activePlayers.length > 1) {
      const currentActiveIdx = activePlayers.findIndex((p: any) => p.id === currentTurn);
      const nextActiveIdx = (currentActiveIdx + 1) % activePlayers.length;
      nextTurnId = activePlayers[nextActiveIdx].id;
    } else if (activePlayers.length === 1) {
      // Fim do Jogo
      nextState.log = [`🏆 ${activePlayers[0].name} é o grande Campeão do Monopoly!`, ...nextState.log];
      makeMove(nextState, `${activePlayers[0].name} venceu a partida!`, activePlayers[0].id);
      return;
    }

    makeMove(nextState, `${bot.name} concluiu seu turno.`, undefined);
  };

  // Cálculo de Aluguel Oficial
  const calculateRent = (square: MonopolySquare, propertiesMap: any, ownerId: string): number => {
    if (square.type === 'company' || square.type === 'utility') return 50;
    const baseRent = square.rent ? square.rent[0] : 10;
    
    // Monopólio? (Verifica se possui todas as do mesmo grupo de cor)
    const colorGroup = squares.filter(s => s.color === square.color);
    const hasMonopoly = colorGroup.every(s => propertiesMap[s.position] === ownerId);
    
    // Aluguel dobra caso possua monopólio sem casas construídas
    return hasMonopoly ? baseRent * 2 : baseRent;
  };

  // Jogador Humano Rolar Dados
  const handleRollDice = () => {
    if (isRolling || !isMyTurn) return;
    setIsRolling(true);
    playSound('dice');

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const totalMove = d1 + d2;

    setTimeout(() => {
      setDice([d1, d2]);
      setIsRolling(false);

      if (match.boardState) {
        const nextState = { ...match.boardState };
        const playerIdx = nextState.players.findIndex((p: any) => p.id === currentTurn);
        if (playerIdx === -1) return;
        const player = nextState.players[playerIdx];

        const oldPos = player.position;
        let newPos = (oldPos + totalMove) % 40;
        player.position = newPos;

        let logMessage = `Você rolou [${d1}, ${d2}] e avançou para ${squares[newPos].name}.`;

        // Regra do Ponto de Partida
        if (newPos < oldPos) {
          player.money += 200;
          logMessage += ` Recebeu M$ 200 por passar na Partida.`;
          playSound('cash');
        }

        const currentSquare = squares[newPos];

        // Lógica de casas especiais
        if (currentSquare.type === 'tax') {
          const taxValue = currentSquare.price || 100;
          player.money -= taxValue;
          logMessage += ` Pagou M$ ${taxValue} de impostos corporativos.`;
        } else if (currentSquare.type === 'go_to_jail') {
          player.position = 10;
          player.isPreso = true;
          player.jailTurns = 3;
          logMessage += ` Enviado para a prisão corporativa!`;
          playSound('jail');
        } else if (currentSquare.type === 'chance') {
          // Tirar carta Sorte ou Revés
          const cardIdx = Math.floor(Math.random() * CHANCE_CARDS.length);
          const card = CHANCE_CARDS[cardIdx];
          setActiveChanceCard(card);
          playSound('card');

          logMessage += ` Retirou carta Sorte ou Revés: "${card.text}"`;

          if (card.type === 'money') {
            player.money += card.value;
          } else if (card.type === 'move') {
            player.position = card.value;
          } else if (card.type === 'go_to_jail') {
            player.position = 10;
            player.isPreso = true;
            player.jailTurns = 3;
          } else if (card.type === 'jail_free') {
            player.hasJailCard = true;
          }
        } else if (currentSquare.type === 'property' || currentSquare.type === 'company' || currentSquare.type === 'utility') {
          const ownerId = nextState.properties[newPos];
          if (ownerId && ownerId !== player.id) {
            // Pagar aluguel automático
            const owner = nextState.players.find((p: any) => p.id === ownerId);
            if (owner) {
              const rentValue = calculateRent(currentSquare, nextState.properties, ownerId);
              player.money -= rentValue;
              owner.money += rentValue;
              logMessage += ` Pagou M$ ${rentValue} de aluguel para ${owner.name}.`;
              playSound('cash');
            }
          }
        }

        nextState.log = [logMessage, ...nextState.log].slice(0, 15);
        nextState.hasRolled = true; // Necessário clicar em "Encerrar Turno" para passar a vez
        makeMove(nextState, `Você rolou os dados.`);
      }
    }, 1000);
  };

  // Comprar propriedade atual
  const handleBuyProperty = () => {
    if (!isMyTurn || !match.boardState || !activePlayer) return;
    const currentSquare = squares[activePlayer.position];
    if (activePlayer.money < (currentSquare.price || 0)) {
      toast.error('Saldo insuficiente para comprar esta propriedade!');
      return;
    }

    const nextState = { ...match.boardState };
    const playerIdx = nextState.players.findIndex((p: any) => p.id === currentTurn);
    const player = nextState.players[playerIdx];

    player.money -= currentSquare.price || 0;
    nextState.properties[currentSquare.position] = player.id;
    nextState.log = [`${player.name} comprou ${currentSquare.name} por M$ ${currentSquare.price}.`, ...nextState.log].slice(0, 15);
    playSound('cash');

    makeMove(nextState, `Comprou a propriedade ${currentSquare.name}`);
  };

  // Encerrar turno do jogador humano
  const handleEndTurn = () => {
    if (!isMyTurn || !match.boardState) return;
    const nextState = { ...match.boardState };
    nextState.hasRolled = false;

    // Rota o turno para o próximo que não faliu
    const activePlayers = nextState.players.filter((p: any) => !p.isBankrupt);
    let nextTurnId = currentTurn;
    if (activePlayers.length > 1) {
      const currentActiveIdx = activePlayers.findIndex((p: any) => p.id === currentTurn);
      const nextActiveIdx = (currentActiveIdx + 1) % activePlayers.length;
      nextTurnId = activePlayers[nextActiveIdx].id;
    }

    setDice(null);
    makeMove(nextState, `Turno passado.`);
  };

  // Declarar falência
  const handleDeclareBankrupt = () => {
    if (!isMyTurn || !match.boardState || !activePlayer) return;
    const nextState = { ...match.boardState };
    const playerIdx = nextState.players.findIndex((p: any) => p.id === currentTurn);
    
    // Libera propriedades
    Object.keys(nextState.properties).forEach(key => {
      if (nextState.properties[key] === activePlayer.id) {
        delete nextState.properties[key];
      }
    });

    nextState.players[playerIdx].isBankrupt = true;
    nextState.log = [`${activePlayer.name} declarou falência corporativa e saiu da mesa!`, ...nextState.log].slice(0, 15);
    playSound('bankrupt');

    // Verifica se sobrou apenas 1 jogador ativo
    const activePlayers = nextState.players.filter((p: any) => !p.isBankrupt);
    if (activePlayers.length === 1) {
      nextState.log = [`🏆 ${activePlayers[0].name} é o grande Campeão!`, ...nextState.log];
      makeMove(nextState, `${activePlayers[0].name} venceu a partida!`, activePlayers[0].id);
    } else {
      handleEndTurn();
    }
  };

  // Helper para desenhar a posição de cada quadrado do grid 11x11
  const getGridPosition = (position: number) => {
    if (position >= 0 && position <= 10) {
      // Linha de baixo (Direita para Esquerda)
      return { gridRow: 11, gridColumn: 11 - position };
    } else if (position > 10 && position <= 20) {
      // Coluna da esquerda (Baixo para Cima)
      return { gridRow: 11 - (position - 10), gridColumn: 1 };
    } else if (position > 20 && position <= 30) {
      // Linha de cima (Esquerda para Direita)
      return { gridRow: 1, gridColumn: position - 20 + 1 };
    } else {
      // Coluna da direita (Cima para Baixo)
      return { gridRow: position - 30 + 1, gridColumn: 11 };
    }
  };

  return (
    <div className={`w-full min-h-[calc(100vh-140px)] rounded-[2.5rem] p-6 transition-all duration-500 border select-none ${
      skin === 'cyberpunk'
      ? 'bg-slate-950/90 border-purple-500/20 shadow-[0_0_50px_rgba(168,85,247,0.15)] text-white'
      : 'bg-gradient-to-br from-[#1c1917] to-[#0c0a09] border-amber-500/20 text-[#e7e5e4]'
    }`}>
      {/* 🚀 BARRA DE CONTROLE SUPERIOR */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary-500/15 rounded-2xl">
            <span className="text-2xl">💰</span>
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
              MONOPOLY CORPORATIVO
              <span className="px-2 py-0.5 rounded text-[8px] bg-primary-500/20 text-primary-400 font-extrabold">BETA 4P</span>
            </h2>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
              Modo: {isLocal ? 'Singleplayer' : 'Multiplayer'} | Tabuleiro 11x11 interativo reativo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Ajuda */}
          <button 
            onClick={() => setShowHelp(true)}
            className="p-2.5 bg-white/5 border border-white/5 rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer flex items-center justify-center"
            title="Como Jogar"
          >
            <HelpCircle size={14} />
          </button>

          {/* Botão de Som */}
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 bg-white/5 border border-white/5 rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer"
            title={soundEnabled ? 'Desativar Som' : 'Ativar Som'}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          {/* Alternador de Skins */}
          <button 
            onClick={() => setSkin(prev => prev === 'classic' ? 'cyberpunk' : 'classic')}
            className={`px-4 py-2.5 rounded-xl border font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              skin === 'cyberpunk'
              ? 'bg-purple-500/15 border-purple-500/30 text-purple-400 hover:bg-purple-500/25'
              : 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
            }`}
          >
            🎨 Skin: {skin === 'classic' ? 'Clássico' : 'Cyberpunk'}
          </button>
          
          <button 
            onClick={onExit || exitActiveMatch}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-rose-500/10 hover:border-rose-500/20 text-[9px] font-black text-gray-400 hover:text-rose-400 uppercase tracking-widest transition-all cursor-pointer"
          >
            Abandonar Arena
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* 🎲 TABULEIRO GRID 11x11 REAL E INTERATIVO (ESQUERDA) */}
        <div className="xl:col-span-2 flex items-center justify-center p-4 bg-black/40 border border-white/5 rounded-[2.5rem] overflow-x-auto relative">
          <div className="grid grid-cols-11 grid-rows-11 w-[550px] h-[550px] gap-[2px] bg-white/5 p-2 rounded-3xl relative">
            
            {/* Centro do Tabuleiro (Logger, Dados & Controles) */}
            <div className="col-start-2 col-end-11 row-start-2 row-end-11 flex flex-col justify-between p-6 bg-black/35 rounded-2xl relative overflow-hidden">
              {/* Efeito Neon de Fundo */}
              <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-primary-500/5 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2" />
              
              {/* Status do Turno Executivo */}
              <div className="relative z-10 flex justify-between items-center">
                <div>
                  <span className="text-[7px] text-gray-500 font-black uppercase tracking-widest leading-none">Turno Ativo</span>
                  <p className="text-xs font-black uppercase text-white mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {activePlayer?.name} {activePlayer?.isBot && '(IA)'}
                  </p>
                </div>
                {dice && (
                  <div className="flex gap-2">
                    <span className="px-2 py-1 rounded bg-white/5 border border-white/5 text-[9px] font-black">Dados: {dice[0]} + {dice[1]}</span>
                  </div>
                )}
              </div>

              {/* Logger Centralizado de Transações */}
              <div className="relative z-10 h-32 overflow-y-auto custom-scrollbar flex flex-col gap-1.5 bg-black/30 border border-white/5 p-3 rounded-xl mt-4">
                {log.slice(0, 8).map((line: string, idx: number) => (
                  <p key={idx} className="text-[8px] text-gray-400 font-semibold leading-relaxed pl-1.5 border-l border-primary-500/35">
                    {line}
                  </p>
                ))}
              </div>

              {/* Painel Executivo do Jogador Ativo */}
              <div className="relative z-10 space-y-3 mt-4">
                {isMyTurn ? (
                  <div className="flex flex-col gap-2">
                    {!match.boardState?.hasRolled ? (
                      <button
                        onClick={handleRollDice}
                        disabled={isRolling}
                        className={`w-full py-4.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${
                          skin === 'cyberpunk'
                          ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                          : 'bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-lg shadow-amber-500/20'
                        }`}
                      >
                        {isRolling ? 'Rolando Dados...' : 'Lançar Dados'}
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        {/* Botão de Comprar Propriedade */}
                        {activePlayer && (squares[activePlayer.position].type === 'property' || squares[activePlayer.position].type === 'company' || squares[activePlayer.position].type === 'utility') && !properties[activePlayer.position] && (
                          <button
                            onClick={handleBuyProperty}
                            className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                          >
                            💵 Comprar por M$ {squares[activePlayer.position].price}
                          </button>
                        )}
                        <button
                          onClick={handleEndTurn}
                          className="flex-1 py-3.5 bg-white/5 border border-white/5 hover:bg-white/10 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                        >
                          Encerrar Turno ➔
                        </button>
                      </div>
                    )}
                    
                    {/* Botão de Emergência de Falência */}
                    {activePlayer && activePlayer.money < 0 && (
                      <button
                        onClick={handleDeclareBankrupt}
                        className="w-full py-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-400 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <ShieldAlert size={14} />
                        Declarar Falência Corporativa
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl text-center">
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Aguardando jogada de {activePlayer?.name}...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Renderização física das 40 casas nas bordas */}
            {squares.map((sq) => {
              const { gridRow, gridColumn } = getGridPosition(sq.position);
              const ownerId = properties[sq.position];
              const owner = players.find((p: any) => p.id === ownerId);
              
              // Verifica se há algum jogador/bot nesta casa
              const playersHere = players.filter((p: any) => p.position === sq.position && !p.isBankrupt);

              return (
                <div
                  key={sq.position}
                  style={{ gridRow, gridColumn }}
                  className={`border border-white/5 rounded flex flex-col justify-between p-1.5 relative overflow-hidden transition-all duration-300 ${
                    skin === 'cyberpunk'
                    ? 'bg-slate-950/70 border-white/5 hover:bg-slate-900/50'
                    : 'bg-stone-900/80 hover:bg-stone-800/80'
                  }`}
                  title={`${sq.name} (${sq.type.toUpperCase()})`}
                >
                  {/* Faixa de cor para propriedades de grupo */}
                  {sq.type === 'property' && sq.color && (
                    <div 
                      className="absolute top-0 left-0 right-0 h-1.5 rounded-t"
                      style={{ backgroundColor: sq.color }}
                    />
                  )}

                  {/* Detalhes da Casa no Tabuleiro */}
                  <div className="flex flex-col h-full justify-between items-center relative z-10">
                    <span className="text-[5.5px] font-black uppercase text-center leading-[1.1] text-gray-400 truncate w-full">
                      {sq.name.split(' ').slice(0, 2).join(' ')}
                    </span>

                    {/* Preço de Compra no Rodapé */}
                    {sq.price && (
                      <span className="text-[5px] font-black opacity-60">M${sq.price}</span>
                    )}

                    {/* Exibe o peão do jogador se estiver na casa */}
                    <div className="flex gap-1 justify-center absolute bottom-1.5">
                      {playersHere.map((p: any) => (
                        <span
                          key={p.id}
                          className={`w-2.5 h-2.5 rounded-full border border-white flex items-center justify-center text-[5px] font-black text-white shrink-0 shadow-lg ${
                            p.color === 'red' ? 'bg-red-500' : p.color === 'blue' ? 'bg-blue-500' : p.color === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          title={p.name}
                        >
                          {p.name[0]}
                        </span>
                      ))}
                    </div>

                    {/* Ícone de Dono (Badge Neon) */}
                    {owner && (
                      <div 
                        className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full border shadow-lg ${
                          owner.color === 'red' ? 'bg-red-500 border-red-400' : owner.color === 'blue' ? 'bg-blue-500 border-blue-400' : owner.color === 'yellow' ? 'bg-amber-500 border-amber-400' : 'bg-emerald-500 border-emerald-400'
                        }`}
                        title={`Dono: ${owner.name}`}
                      />
                    )}
                  </div>
                </div>
              );
            })}

          </div>
        </div>

        {/* 📊 PAINEL ESTATÍSTICO FINANCEIRO & LEADERBOARD (DIREITA) */}
        <div className="space-y-6 flex flex-col justify-between">
          
          {/* Caixa do Jogador Local */}
          <div className={`p-6 border rounded-[2rem] shadow-xl ${
            skin === 'cyberpunk'
            ? 'bg-purple-500/5 border-purple-500/25 shadow-purple-500/5'
            : 'bg-amber-500/5 border-amber-500/25 shadow-amber-500/5'
          }`}>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Suas Finanças Corporativas</h4>
            <div className="flex justify-between items-end">
              <div>
                <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">Patrimônio Disponível</span>
                <p className="text-3xl font-black text-white tracking-tight mt-1 flex items-center gap-1">
                  <span className={skin === 'cyberpunk' ? 'text-purple-400' : 'text-amber-400'}>M$</span> 
                  {players.find((p: any) => p.id === (isLocal ? 'player1' : user?.uid))?.money || 0}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">Posição Atual</span>
                <p className="text-xs font-black uppercase text-gray-300 mt-1">
                  Casa {players.find((p: any) => p.id === (isLocal ? 'player1' : user?.uid))?.position || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Listagem de Jogadores e Ranking de Capital */}
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] space-y-4">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Mesa Executiva</h4>
            
            <div className="space-y-3">
              {players.map((player: any) => (
                <div 
                  key={player.id} 
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    player.isBankrupt
                    ? 'opacity-40 bg-black/40 border-red-500/10'
                    : currentTurn === player.id
                    ? (skin === 'cyberpunk' ? 'bg-purple-500/10 border-purple-500/30 shadow-lg shadow-purple-500/5' : 'bg-amber-500/10 border-amber-500/30 shadow-lg shadow-amber-500/5')
                    : 'bg-black/20 border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 text-white uppercase border ${
                      player.color === 'red' ? 'bg-red-500 border-red-400' : player.color === 'blue' ? 'bg-blue-500 border-blue-400' : player.color === 'yellow' ? 'bg-amber-500 border-amber-400' : 'bg-emerald-500 border-emerald-400'
                    }`}>
                      {player.name[0]}
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                        {player.name}
                        {player.isBot && <span className="text-[7px] text-gray-500 font-extrabold uppercase">(IA)</span>}
                        {player.id === (isLocal ? 'player1' : user?.uid) && <span className="text-[7px] text-primary-400 font-extrabold uppercase">(Você)</span>}
                      </div>
                      <div className="text-[8px] text-gray-500 uppercase tracking-widest font-semibold mt-0.5">
                        {player.isBankrupt ? 'FALIDO / ELIMINADO' : `Casa ${player.position}: ${squares[player.position]?.name}`}
                      </div>
                    </div>
                  </div>
                  
                  <span className={`text-xs font-black ${
                    player.isBankrupt ? 'text-red-500 line-through' : skin === 'cyberpunk' ? 'text-purple-400' : 'text-amber-400'
                  }`}>
                    {player.isBankrupt ? 'M$ 0' : `M$ ${player.money}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Dinâmico de Sorte ou Revés */}
          <AnimatePresence>
            {activeChanceCard && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="p-6 bg-slate-900 border border-white/10 rounded-2xl space-y-4 shadow-xl"
              >
                <div className="flex items-center gap-2 text-amber-500 font-bold uppercase tracking-wider text-xs">
                  <AlertTriangle size={16} />
                  Sorte ou Revés Corporativo!
                </div>
                <p className="text-xs text-gray-300 leading-relaxed font-semibold italic">
                  "{activeChanceCard.text}"
                </p>
                <button
                  onClick={() => setActiveChanceCard(null)}
                  className="w-full py-2 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Entendido ➔
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      <AnimatePresence>
        {showHelp && (
          <GameHelpModal 
            gameType="monopoly" 
            skin={skin} 
            onClose={() => setShowHelp(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
