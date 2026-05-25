import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, RefreshCw, AlertTriangle, ShieldAlert, Award, Volume2, VolumeX, Compass, Map, User, HelpCircle } from 'lucide-react';
import { useArenaStore } from '@store/useArenaStore';
import { WAR_TERRITORIES, WAR_OBJECTIVES, CONTINENT_BONUSES } from '../helpers/warConstants';
import { useAuth } from '@auth/contexts/AuthContext';
import { toast } from 'sonner';

interface WarBoardProps {
  match: any;
  isLocal: boolean;
  aiDifficulty?: number;
  onExit?: () => void;
}

export function WarBoard({ match, isLocal, aiDifficulty = 3, onExit }: WarBoardProps) {
  const { user } = useAuth();
  const makeMove = useArenaStore(state => state.makeMove);
  const exitActiveMatch = useArenaStore(state => state.exitActiveMatch);

  // Estados Locais
  const [skin, setSkin] = useState<'classic' | 'cyberpunk'>('cyberpunk');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [battleDice, setBattleDice] = useState<{ atk: number[]; def: number[] } | null>(null);
  const [isFighting, setIsFighting] = useState(false);
  const [showObjective, setShowObjective] = useState(false);

  const players = match.boardState?.players || [];
  const territories = match.boardState?.territories || {};
  const objectives = match.boardState?.playerObjectives || {};
  const currentPhase = match.boardState?.phase || 'distribute'; // distribute | attack | fortify
  const armiesToDistribute = match.boardState?.armiesToDistribute || {};
  const currentTurn = match.turn;

  const activePlayer = players.find((p: any) => p.id === currentTurn);
  const isMyTurn = currentTurn === (isLocal ? 'player1' : user?.uid);

  // Efeito de Som da Arena
  const playSound = (type: 'dice' | 'cash' | 'card' | 'jail' | 'bankrupt') => {
    if (!soundEnabled) return;
    try {
      const sounds: Record<string, string> = {
        dice: 'https://assets.mixkit.co/active_storage/sfx/2012/2012-84.wav', // Dados
        cash: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav', // Alocação/Troca
        card: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-84.wav', // Objetivo
        jail: 'https://assets.mixkit.co/active_storage/sfx/2006/2006-84.wav', // Alerta
        bankrupt: 'https://assets.mixkit.co/active_storage/sfx/2021/2021-84.wav' // Derrota
      };
      const audio = new Audio(sounds[type]);
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  // Execução automática do turno dos Bots (IAs)
  useEffect(() => {
    const isCreator = isLocal || (user?.uid === match.player1Id);
    if (activePlayer && activePlayer.isBot && isCreator && match.boardState && match.status === 'playing') {
      const botTimer = setTimeout(() => {
        runBotTurn();
      }, 2000);
      return () => clearTimeout(botTimer);
    }
  }, [currentTurn, match.status]);

  // Função para executar a rodada completa da IA
  const runBotTurn = () => {
    if (!match.boardState) return;
    const nextState = { ...match.boardState };
    const bot = nextState.players.find((p: any) => p.id === currentTurn);
    if (!bot) return;

    let logMessages: string[] = [];

    // 1. Fase de Distribuição do Bot
    let armiesToPlace = nextState.armiesToDistribute[bot.id] || 3;
    const botTerritories = Object.keys(nextState.territories).filter(
      key => nextState.territories[key].ownerId === bot.id
    );

    if (botTerritories.length > 0) {
      // Aloca os exércitos no primeiro território do bot estrategicamente
      const targetT = botTerritories[Math.floor(Math.random() * botTerritories.length)];
      nextState.territories[targetT].armies += armiesToPlace;
      nextState.armiesToDistribute[bot.id] = 0;
      logMessages.push(`${bot.name} (IA) distribuiu ${armiesToPlace} exércitos em ${WAR_TERRITORIES[targetT]?.name}.`);
      playSound('cash');
    }

    // 2. Fase de Ataque do Bot
    // O bot procura um território dele com exércitos >= 4 que fronteireie um território inimigo
    let madeAttack = false;
    for (const origin of botTerritories) {
      const armies = nextState.territories[origin].armies;
      if (armies >= 4) {
        const adjacents = WAR_TERRITORIES[origin]?.adjacencies || [];
        const enemies = adjacents.filter(adj => nextState.territories[adj]?.ownerId !== bot.id);
        if (enemies.length > 0) {
          const target = enemies[0];
          const defArmies = nextState.territories[target]?.armies || 1;
          
          // Inteligência simples: Ataca apenas se tiver vantagem numérica clara
          if (armies > defArmies * 1.5) {
            madeAttack = true;
            // Executa batalha
            const atkRolls = Array(Math.min(3, armies - 1)).fill(null).map(() => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);
            const defRolls = Array(Math.min(3, defArmies)).fill(null).map(() => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);

            // Compara os dados
            let atkLoss = 0;
            let defLoss = 0;
            const matchesCount = Math.min(atkRolls.length, defRolls.length);
            for (let i = 0; i < matchesCount; i++) {
              if (atkRolls[i] > defRolls[i]) {
                defLoss++;
              } else {
                atkLoss++;
              }
            }

            nextState.territories[origin].armies -= atkLoss;
            nextState.territories[target].armies -= defLoss;

            let battleResult = `${bot.name} atacou ${WAR_TERRITORIES[target]?.name} de ${WAR_TERRITORIES[origin]?.name}. Perdas: Ataque -${atkLoss}, Defesa -${defLoss}.`;

            if (nextState.territories[target].armies <= 0) {
              // Conquistou!
              nextState.territories[target].ownerId = bot.id;
              nextState.territories[target].armies = Math.max(1, armies - atkLoss - 1);
              nextState.territories[origin].armies = 1;
              battleResult += ` Conquistou o território!`;
              playSound('card');
            } else {
              playSound('dice');
            }

            logMessages.push(battleResult);
            break;
          }
        }
      }
    }

    if (!madeAttack) {
      logMessages.push(`${bot.name} decidiu manter posições táticas e não atacar.`);
    }

    // Passa o turno
    const activePlayers = nextState.players.filter((p: any) => {
      // Jogador ativo é aquele que possui pelo menos 1 território
      return Object.keys(nextState.territories).some(key => nextState.territories[key].ownerId === p.id);
    });

    let nextTurnId = currentTurn;
    if (activePlayers.length > 1) {
      const currentActiveIdx = activePlayers.findIndex((p: any) => p.id === currentTurn);
      const nextActiveIdx = (currentActiveIdx + 1) % activePlayers.length;
      nextTurnId = activePlayers[nextActiveIdx].id;
    } else if (activePlayers.length === 1) {
      // Fim do Jogo
      nextState.log = [`🏆 ${activePlayers[0].name} cumpriu seu objetivo e dominou o mundo!`, ...nextState.log];
      makeMove(nextState, `${activePlayers[0].name} venceu a partida!`, activePlayers[0].id);
      return;
    }

    // Calcula os exércitos de distribuição do próximo jogador caso comece o turno dele
    nextState.armiesToDistribute[nextTurnId] = calculateNewArmies(nextState, nextTurnId);

    nextState.log = [...logMessages, ...nextState.log].slice(0, 15);
    makeMove(nextState, `${bot.name} concluiu seu turno.`, undefined);
  };

  // Cálculo de Exércitos de distribuição clássico (Territórios / 2, bônus de continentes)
  const calculateNewArmies = (state: any, playerId: string): number => {
    const playerTCount = Object.keys(state.territories).filter(
      key => state.territories[key].ownerId === playerId
    ).length;
    let base = Math.max(3, Math.floor(playerTCount / 2));

    // Bônus de Continente (Sul-americano completo dá 2, etc.)
    const southAmerica = ['brasil', 'argentina', 'colombia', 'chile'];
    const hasSouthAmerica = southAmerica.every(t => state.territories[t]?.ownerId === playerId);
    if (hasSouthAmerica) base += CONTINENT_BONUSES.south_america;

    const oceania = ['sumatra', 'nova_guine', 'australia'];
    const hasOceania = oceania.every(t => state.territories[t]?.ownerId === playerId);
    if (hasOceania) base += CONTINENT_BONUSES.oceania;

    return base;
  };

  // Clique em Território do Mapa
  const handleTerritoryClick = (territoryId: string) => {
    if (!isMyTurn) return;
    const territory = territories[territoryId];
    if (!territory) return;

    if (currentPhase === 'distribute') {
      // Aloca reforços se o território for meu
      if (territory.ownerId === (isLocal ? 'player1' : user?.uid)) {
        const placeable = armiesToDistribute[currentTurn] || 0;
        if (placeable > 0) {
          const nextState = { ...match.boardState };
          nextState.territories[territoryId].armies += 1;
          nextState.armiesToDistribute[currentTurn] = placeable - 1;
          nextState.log = [`Alocou 1 exército em ${WAR_TERRITORIES[territoryId]?.name}.`, ...nextState.log].slice(0, 15);
          playSound('cash');
          makeMove(nextState, `Distribuiu exército.`);
        } else {
          toast.info('Você já distribuiu todos os seus exércitos deste turno! Avance para a fase de Ataque.');
        }
      } else {
        toast.error('Este território pertence a outro general!');
      }
    } else if (currentPhase === 'attack') {
      // Selecionar origem ou alvo do ataque
      const myId = isLocal ? 'player1' : user?.uid;
      if (territory.ownerId === myId) {
        // Seleciona origem do ataque
        if (territory.armies < 2) {
          toast.error('Você precisa de pelo menos 2 exércitos no território para realizar um ataque!');
          return;
        }
        setSelectedOrigin(territoryId);
        setSelectedTarget(null);
        toast.info(`Origem definida: ${WAR_TERRITORIES[territoryId]?.name}. Agora escolha um território inimigo adjacente para atacar!`);
      } else {
        // Seleciona alvo do ataque
        if (!selectedOrigin) {
          toast.error('Selecione primeiro um território seu de origem para iniciar o ataque!');
          return;
        }
        // Valida adjacência
        const adjacents = WAR_TERRITORIES[selectedOrigin]?.adjacencies || [];
        if (!adjacents.includes(territoryId)) {
          toast.error('Você só pode atacar territórios vizinhos conectados!');
          return;
        }
        setSelectedTarget(territoryId);
        handleAttack(selectedOrigin, territoryId);
      }
    } else if (currentPhase === 'fortify') {
      // Lógica de remanejamento simples
      const myId = isLocal ? 'player1' : user?.uid;
      if (!selectedOrigin) {
        if (territory.ownerId === myId && territory.armies >= 2) {
          setSelectedOrigin(territoryId);
          toast.info(`Remanejar de: ${WAR_TERRITORIES[territoryId]?.name}. Agora selecione um território vizinho seu para receber.`);
        }
      } else {
        if (territory.ownerId === myId) {
          const adjacents = WAR_TERRITORIES[selectedOrigin]?.adjacencies || [];
          if (!adjacents.includes(territoryId)) {
            toast.error('Você só pode remanejar exércitos entre territórios conectados!');
            return;
          }
          // Transfere exército
          const nextState = { ...match.boardState };
          nextState.territories[selectedOrigin].armies -= 1;
          nextState.territories[territoryId].armies += 1;
          nextState.log = [`Remanejou 1 exército de ${WAR_TERRITORIES[selectedOrigin]?.name} para ${WAR_TERRITORIES[territoryId]?.name}.`, ...nextState.log].slice(0, 15);
          playSound('cash');
          setSelectedOrigin(null);
          makeMove(nextState, `Remanejou exércitos.`);
        } else {
          toast.error('Você só pode remanejar para territórios sob seu próprio controle!');
        }
      }
    }
  };

  // Realizar Ataque Humano
  const handleAttack = (originId: string, targetId: string) => {
    const origin = territories[originId];
    const target = territories[targetId];
    if (!origin || !target || isFighting) return;

    setIsFighting(true);
    playSound('dice');

    // Dados de ataque (máximo 3) e defesa (máximo 3)
    const atkCount = Math.min(3, origin.armies - 1);
    const defCount = Math.min(3, target.armies);

    setTimeout(() => {
      const atkRolls = Array(atkCount).fill(null).map(() => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);
      const defRolls = Array(defCount).fill(null).map(() => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);

      setBattleDice({ atk: atkRolls, def: defRolls });
      setIsFighting(false);

      const nextState = { ...match.boardState };
      
      // Compara dados e desconta baixas
      let atkLoss = 0;
      let defLoss = 0;
      const matchesCount = Math.min(atkRolls.length, defRolls.length);
      for (let i = 0; i < matchesCount; i++) {
        if (atkRolls[i] > defRolls[i]) {
          defLoss++;
        } else {
          atkLoss++;
        }
      }

      nextState.territories[originId].armies -= atkLoss;
      nextState.territories[targetId].armies -= defLoss;

      let logMessage = `Combate: ${WAR_TERRITORIES[originId]?.name} atacou ${WAR_TERRITORIES[targetId]?.name}. Baixas: Ataque -${atkLoss}, Defesa -${defLoss}.`;

      if (nextState.territories[targetId].armies <= 0) {
        // Conquistado!
        const myId = isLocal ? 'player1' : user?.uid;
        nextState.territories[targetId].ownerId = myId;
        nextState.territories[targetId].armies = Math.max(1, origin.armies - atkLoss - 1);
        nextState.territories[originId].armies = 1;
        logMessage += ` Território conquistado com sucesso!`;
        playSound('card');
        setSelectedOrigin(null);
        setSelectedTarget(null);
      }

      nextState.log = [logMessage, ...nextState.log].slice(0, 15);
      makeMove(nextState, `Combate concluído.`);
    }, 1000);
  };

  // Avançar de Fase no Turno
  const handleNextPhase = () => {
    if (!isMyTurn || !match.boardState) return;
    const nextState = { ...match.boardState };
    
    if (currentPhase === 'distribute') {
      const placeable = armiesToDistribute[currentTurn] || 0;
      if (placeable > 0) {
        toast.warning(`Você ainda possui ${placeable} exércitos pendentes para distribuir no mapa!`);
        return;
      }
      nextState.phase = 'attack';
      nextState.log = [`Fase de Ataque iniciada para ${activePlayer?.name}.`, ...nextState.log].slice(0, 15);
    } else if (currentPhase === 'attack') {
      nextState.phase = 'fortify';
      nextState.log = [`Fase de Remanejamento iniciada para ${activePlayer?.name}.`, ...nextState.log].slice(0, 15);
      setSelectedOrigin(null);
      setSelectedTarget(null);
    } else if (currentPhase === 'fortify') {
      // Passa a vez
      nextState.phase = 'distribute';
      
      const activePlayers = nextState.players.filter((p: any) => {
        return Object.keys(nextState.territories).some(key => nextState.territories[key].ownerId === p.id);
      });

      let nextTurnId = currentTurn;
      if (activePlayers.length > 1) {
        const currentActiveIdx = activePlayers.findIndex((p: any) => p.id === currentTurn);
        const nextActiveIdx = (currentActiveIdx + 1) % activePlayers.length;
        nextTurnId = activePlayers[nextActiveIdx].id;
      }

      nextState.armiesToDistribute[nextTurnId] = calculateNewArmies(nextState, nextTurnId);
      nextState.log = [`Vez de ${nextState.players.find((p:any)=>p.id===nextTurnId)?.name} iniciada com ${nextState.armiesToDistribute[nextTurnId]} reforços.`, ...nextState.log].slice(0, 15);
      
      setBattleDice(null);
      setSelectedOrigin(null);
      setSelectedTarget(null);
    }

    makeMove(nextState, `Fase do jogo alterada.`);
  };

  // Helper de Cor do Continente
  const getContinentColor = (continent: string) => {
    switch (continent) {
      case 'south_america': return 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/35';
      case 'north_america': return 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/35';
      case 'europe': return 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/35';
      case 'africa': return 'bg-yellow-500/10 hover:bg-yellow-500/20 text-amber-400 border-amber-500/35';
      case 'asia': return 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/35';
      default: return 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/35';
    }
  };

  return (
    <div className={`w-full min-h-[calc(100vh-140px)] rounded-[2.5rem] p-6 transition-all duration-500 border select-none ${
      skin === 'cyberpunk'
      ? 'bg-slate-950/90 border-cyan-500/20 shadow-[0_0_50px_rgba(6,182,212,0.15)] text-white'
      : 'bg-gradient-to-br from-[#1c1917] to-[#0c0a09] border-amber-500/20 text-[#e7e5e4]'
    }`}>
      {/* Barra de Controle Superior */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/15 rounded-2xl">
            <span className="text-2xl">🪖</span>
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
              WAR MULTIPLAYER
              <span className="px-2 py-0.5 rounded text-[8px] bg-cyan-500/20 text-cyan-400 font-extrabold">HOLOGRÁFICO 4P</span>
            </h2>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
              Modo: {isLocal ? 'Singleplayer' : 'Multiplayer'} | Sorteio de Objetivos e Dados 3v3 reativos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Som */}
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 bg-white/5 border border-white/5 rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer"
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          {/* Alternador de Skins */}
          <button 
            onClick={() => setSkin(prev => prev === 'classic' ? 'cyberpunk' : 'classic')}
            className={`px-4 py-2.5 rounded-xl border font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              skin === 'cyberpunk'
              ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25'
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
        
        {/* 🗺️ MAPA INTERATIVO TÁTICO (ESQUERDA) */}
        <div className="xl:col-span-2 flex flex-col gap-4 p-4 bg-black/40 border border-white/5 rounded-[2.5rem] relative">
          
          {/* Título da Fase da Rodada */}
          <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 p-4 rounded-2xl relative overflow-hidden">
            <div>
              <span className="text-[7px] text-gray-500 font-black uppercase tracking-widest leading-none">Fase Atual do Turno</span>
              <p className="text-xs font-black uppercase text-white mt-1">
                {currentPhase === 'distribute' ? '📍 DISTRIBUIÇÃO DE REFORÇOS' : currentPhase === 'attack' ? '⚔️ FASE DE ATAQUE' : '🛡️ REMANEJAMENTO TÁTICO'}
              </p>
            </div>
            {isMyTurn && (
              <button 
                onClick={handleNextPhase}
                className={`py-2.5 px-6 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 ${
                  skin === 'cyberpunk'
                  ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-stone-950'
                }`}
              >
                {currentPhase === 'fortify' ? 'Encerrar Vez ➔' : 'Avançar Fase ➔'}
              </button>
            )}
          </div>

          {/* Mapeamento SVG Simplificado de Territórios Táticos (Layout responsivo com botões funcionais) */}
          <div className="relative min-h-[480px] bg-black/20 border border-white/5 rounded-3xl p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto max-h-[500px]">
            {Object.keys(WAR_TERRITORIES).map((key) => {
              const t = WAR_TERRITORIES[key];
              const stateT = territories[key] || { ownerId: 'bot_1', armies: 3 };
              const owner = players.find((p: any) => p.id === stateT.ownerId);

              const isOwner = stateT.ownerId === (isLocal ? 'player1' : user?.uid);
              const isSelected = selectedOrigin === key || selectedTarget === key;

              return (
                <div
                  key={key}
                  onClick={() => handleTerritoryClick(key)}
                  className={`p-4 border rounded-2xl flex flex-col justify-between cursor-pointer transition-all hover:scale-102 ${getContinentColor(t.continent)} ${
                    isSelected
                    ? (skin === 'cyberpunk' ? 'border-cyan-400 ring-2 ring-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.25)]' : 'border-amber-400 ring-2 ring-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.25)]')
                    : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[6.5px] font-black uppercase text-gray-500 tracking-wider leading-none">
                        {t.continent.replace('_', ' ').toUpperCase()}
                      </span>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider mt-1">{t.name}</h4>
                    </div>
                    {/* Badge Circular de Exército */}
                    <div className={`w-6 h-6 rounded-full border shadow-lg flex items-center justify-center font-black text-[10px] text-white ${
                      owner?.color === 'red' ? 'bg-red-500 border-red-400' : owner?.color === 'blue' ? 'bg-blue-500 border-blue-400' : owner?.color === 'yellow' ? 'bg-amber-500 border-amber-400' : 'bg-emerald-500 border-emerald-400'
                    }`}>
                      {stateT.armies}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2.5 mt-2 border-t border-white/5">
                    <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest truncate max-w-[80px]">
                      General: {owner?.name || 'Inimigo'}
                    </span>
                    {isOwner && (
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[6px] font-black uppercase">
                        Seu
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* 📊 PAINEL ESTATÍSTICO FINANCEIRO & LEADERBOARD (DIREITA) */}
        <div className="space-y-6 flex flex-col justify-between">
          
          {/* Caixa de Objetivo Secreto do Jogador */}
          <div className={`p-6 border rounded-[2rem] shadow-xl ${
            skin === 'cyberpunk'
            ? 'bg-cyan-500/5 border-cyan-500/25 shadow-cyan-500/5'
            : 'bg-amber-500/5 border-amber-500/25 shadow-amber-500/5'
          }`}>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Seu Objetivo Secreto</h4>
              <button 
                onClick={() => setShowObjective(!showObjective)}
                className="text-[8px] font-bold uppercase tracking-widest border border-white/10 hover:bg-white/5 px-2 py-1 rounded"
              >
                {showObjective ? 'Ocultar' : 'Revelar'}
              </button>
            </div>
            
            <p className="text-xs font-semibold leading-relaxed text-white">
              {showObjective 
                ? (objectives[isLocal ? 'player1' : user?.uid] || 'Conquistar 24 territórios à sua escolha no mapa.')
                : '••••••••••••••••••••••••••••••••••••••••••••••••••••'
              }
            </p>
          </div>

          {/* Dados de Combate Tático */}
          {battleDice && (
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] space-y-4 text-center">
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-wider text-left">Resultados da Última Batalha</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[8px] font-bold text-red-400 uppercase tracking-widest">Dados Ataque</span>
                  <div className="flex justify-center gap-1.5">
                    {battleDice.atk.map((v, i) => (
                      <div key={i} className="w-8 h-8 bg-red-600 border border-red-500 rounded-lg flex items-center justify-center font-bold text-sm text-white">
                        {v}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-[8px] font-bold text-amber-400 uppercase tracking-widest">Dados Defesa</span>
                  <div className="flex justify-center gap-1.5">
                    {battleDice.def.map((v, i) => (
                      <div key={i} className="w-8 h-8 bg-amber-600 border border-amber-500 rounded-lg flex items-center justify-center font-bold text-sm text-white">
                        {v}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Listagem de Generais */}
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] space-y-4">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Generais e exércitos no Tabuleiro</h4>
            
            <div className="space-y-3">
              {players.map((player: any) => {
                const isEliminated = !Object.keys(territories).some(key => territories[key]?.ownerId === player.id);
                const placeable = armiesToDistribute[player.id] || 0;
                
                return (
                  <div 
                    key={player.id} 
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isEliminated
                      ? 'opacity-40 bg-black/40 border-red-500/10'
                      : currentTurn === player.id
                      ? (skin === 'cyberpunk' ? 'bg-cyan-500/10 border-cyan-500/30 shadow-lg shadow-cyan-500/5' : 'bg-amber-500/10 border-amber-500/30 shadow-lg shadow-amber-500/5')
                      : 'bg-black/20 border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 text-white border ${
                        player.color === 'red' ? 'bg-red-500 border-red-400' : player.color === 'blue' ? 'bg-blue-500 border-blue-400' : player.color === 'yellow' ? 'bg-amber-500 border-amber-400' : 'bg-emerald-500 border-emerald-400'
                      }`}>
                        {player.color[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                          {player.name}
                          {player.isBot && <span className="text-[7px] text-gray-500 font-extrabold uppercase">(IA)</span>}
                        </div>
                        <div className="text-[8px] text-gray-500 uppercase tracking-widest font-semibold mt-0.5">
                          {isEliminated ? 'ELIMINADO' : `Reforços Pendentes: ${placeable}`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Histórico/Log */}
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] space-y-3">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Log de Combates</h4>
            
            <div className="h-36 overflow-y-auto custom-scrollbar flex flex-col gap-2">
              {log.slice(0, 10).map((line: string, idx: number) => (
                <p key={idx} className="text-[8.5px] text-gray-400 font-medium leading-relaxed border-l border-white/10 pl-2">
                  {line}
                </p>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
