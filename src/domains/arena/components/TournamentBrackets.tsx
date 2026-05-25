import React from 'react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useArenaStore } from '@store/useArenaStore';
import { Tournament, TournamentMatch } from '@/types';
import { motion } from 'framer-motion';
import { Trophy, Play, Users, Crown, Swords, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface TournamentBracketsProps {
  tournament: Tournament;
}

export function TournamentBrackets({ tournament }: TournamentBracketsProps) {
  const { user } = useAuth();
  const startTournamentMatch = useArenaStore(state => state.startTournamentMatch);
  const registerInTournament = useArenaStore(state => state.registerInTournament);

  const uid = user?.uid || '';
  const displayName = user?.displayName || 'Jogador';

  const isParticipant = tournament.participants.includes(uid);
  const isFull = tournament.participants.length === tournament.maxPlayers;

  const handleRegister = async () => {
    if (!uid) return;
    const tId = toast.loading('Registrando inscrição...');
    try {
      await registerInTournament(tournament.id, uid, displayName);
      // O toast.success já é disparado na store
      toast.dismiss(tId);
    } catch (err: any) {
      // toast.error já é disparado na store
      toast.dismiss(tId);
    }
  };

  const handleStartMatch = async (
    roundKey: 'quarterfinals' | 'semifinals' | 'final',
    matchIdx: number,
    match: TournamentMatch
  ) => {
    if (!match.p1 || !match.p2) return;
    
    const tId = toast.loading('Inicializando partida do torneio...');
    try {
      await startTournamentMatch(
        tournament.id,
        roundKey,
        matchIdx,
        match.p1,
        match.p1Name || 'Jogador 1',
        match.p2,
        match.p2Name || 'Jogador 2',
        tournament.gameType
      );
      toast.success('Partida iniciada! Que vença o melhor.', { id: tId });
    } catch (err) {
      toast.error('Erro ao iniciar partida.', { id: tId });
    }
  };

  // Helper para renderizar o cartão de uma partida específica
  const renderMatchCard = (
    match: TournamentMatch | undefined,
    roundKey: 'quarterfinals' | 'semifinals' | 'final',
    matchIdx: number
  ) => {
    if (!match) {
      return (
        <div className="bg-slate-950/20 border border-dashed border-white/5 rounded-2xl p-4 flex flex-col justify-center items-center h-28 opacity-45">
          <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Aguardando</span>
        </div>
      );
    }

    const { p1, p2, p1Name, p2Name, winnerId, matchId } = match;
    const isMyMatch = p1 === uid || p2 === uid;
    
    // Status do combate
    const notStarted = !matchId && p1 && p2;
    const inProgress = matchId && !winnerId;
    const finished = !!winnerId;

    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={`bg-slate-950/60 border rounded-2xl p-4 flex flex-col justify-between h-28 relative overflow-hidden transition-all shadow-xl ${
          isMyMatch && !finished
            ? 'border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-slate-950/80'
            : 'border-white/5 hover:border-white/10'
        }`}
      >
        {/* Glow neon de fundo se for o jogo do usuário */}
        {isMyMatch && !finished && (
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 to-purple-500/5 pointer-events-none" />
        )}

        {/* Jogadores */}
        <div className="space-y-2">
          {/* Jogador 1 */}
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-black uppercase tracking-wider truncate max-w-[120px] ${
                p1
                  ? winnerId === p1
                    ? 'text-yellow-400 font-extrabold flex items-center gap-1'
                    : winnerId && winnerId !== p1
                    ? 'text-gray-600 line-through'
                    : 'text-gray-300'
                  : 'text-gray-600 italic'
              }`}
            >
              {p1 ? (
                <>
                  {winnerId === p1 && <Crown size={10} className="text-yellow-400 inline" />}
                  {p1Name || 'Jogador 1'}
                  {p1 === uid && <span className="text-[8px] text-cyan-400 lowercase ml-1">(você)</span>}
                </>
              ) : (
                'A definir'
              )}
            </span>
            {p1 && winnerId === p1 && (
              <span className="text-[8px] font-extrabold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded-full uppercase tracking-widest">W</span>
            )}
          </div>

          {/* Divisor / VS */}
          <div className="h-[1px] bg-white/5 relative flex items-center justify-center">
            <span className="bg-slate-950 px-2 text-[7px] font-black text-gray-600 uppercase tracking-widest absolute">VS</span>
          </div>

          {/* Jogador 2 */}
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-black uppercase tracking-wider truncate max-w-[120px] ${
                p2
                  ? winnerId === p2
                    ? 'text-yellow-400 font-extrabold flex items-center gap-1'
                    : winnerId && winnerId !== p2
                    ? 'text-gray-600 line-through'
                    : 'text-gray-300'
                  : 'text-gray-600 italic'
              }`}
            >
              {p2 ? (
                <>
                  {winnerId === p2 && <Crown size={10} className="text-yellow-400 inline" />}
                  {p2Name || 'Jogador 2'}
                  {p2 === uid && <span className="text-[8px] text-cyan-400 lowercase ml-1">(você)</span>}
                </>
              ) : (
                'A definir'
              )}
            </span>
            {p2 && winnerId === p2 && (
              <span className="text-[8px] font-extrabold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded-full uppercase tracking-widest">W</span>
            )}
          </div>
        </div>

        {/* Rodapé do card / Botões de Ação */}
        <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1">
          {notStarted ? (
            isMyMatch ? (
              <button
                onClick={() => handleStartMatch(roundKey, matchIdx, match)}
                className="w-full flex items-center justify-center gap-1 py-1 px-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow-md shadow-cyan-500/10 transition-all cursor-pointer"
              >
                <Play size={10} fill="white" />
                Batalhar Agora
              </button>
            ) : (
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                <Swords size={10} /> Confronto Pronto
              </span>
            )
          ) : inProgress ? (
            isMyMatch ? (
              <button
                onClick={() => useArenaStore.getState().listenToMatch(matchId!)}
                className="w-full flex items-center justify-center gap-1 py-1 px-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow-md shadow-purple-500/10 transition-all cursor-pointer animate-pulse"
              >
                <Zap size={10} className="text-purple-300" />
                Retomar Jogo
              </button>
            ) : (
              <span className="text-[8px] font-black text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" /> Em Combate
              </span>
            )
          ) : finished ? (
            <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md uppercase tracking-widest w-full text-center">
              ✓ Finalizado
            </span>
          ) : (
            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest w-full text-center">
              Aguardando Adversários
            </span>
          )}
        </div>
      </motion.div>
    );
  };

  const getGameLabel = (type: string) => {
    switch (type) {
      case 'chess': return 'Chess 👑';
      case 'checkers': return 'Damas 🏆';
      case 'connect4': return 'Connect 4 🔴';
      case 'ludo': return 'Ludo 🎲';
      default: return type.toUpperCase();
    }
  };

  const hasWinner = !!tournament.winnerId;

  return (
    <div className="bg-slate-950/20 border border-white/5 rounded-[2.5rem] p-8 flex flex-col gap-8 select-none w-full shadow-2xl relative overflow-hidden">
      
      {/* Detalhes do Torneio / Status do Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-primary-500 bg-primary-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest">
              Torneio {getGameLabel(tournament.gameType)}
            </span>
            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${
              tournament.status === 'registration'
                ? 'text-cyan-400 bg-cyan-500/10'
                : tournament.status === 'active'
                ? 'text-purple-400 bg-purple-500/10 animate-pulse'
                : 'text-amber-400 bg-amber-500/10'
            }`}>
              {tournament.status === 'registration' ? 'Inscrições Abertas' : tournament.status === 'active' ? 'Em Andamento' : 'Concluído'}
            </span>
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wide">{tournament.name}</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            Modalidade eliminatória de {tournament.maxPlayers} jogadores • Prêmio de 300 coins para o campeão
          </p>
        </div>

        {/* Área de Inscrição */}
        {tournament.status === 'registration' && (
          <div className="flex items-center gap-4 bg-slate-950/40 p-4 border border-white/5 rounded-3xl shrink-0">
            <div className="space-y-1">
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Vagas Preenchidas</span>
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Users size={12} className="text-cyan-400" />
                {tournament.participants.length} / {tournament.maxPlayers}
              </span>
            </div>
            {isParticipant ? (
              <span className="px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-[9px] font-black uppercase tracking-widest">
                Você está Inscrito
              </span>
            ) : (
              <button
                onClick={handleRegister}
                className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary-500/20 transition-all active:scale-95 cursor-pointer border border-primary-400/20"
              >
                Garantir Vaga
              </button>
            )}
          </div>
        )}

        {/* Campeão do Torneio */}
        {tournament.status === 'finished' && tournament.bracket.final.winnerId && (
          <div className="flex items-center gap-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 p-4 border border-amber-500/30 rounded-3xl shrink-0 shadow-lg shadow-amber-500/5">
            <Trophy className="text-yellow-400 animate-bounce shrink-0" size={32} />
            <div className="space-y-1">
              <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest block">Grande Campeão</span>
              <span className="text-sm font-black text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                {tournament.bracket.final.winnerId === uid ? (
                  <>👑 {tournament.bracket.final.p1 === uid ? tournament.bracket.final.p1Name : tournament.bracket.final.p2Name} (Você)</>
                ) : (
                  <>👑 {tournament.bracket.final.winnerId === tournament.bracket.final.p1 ? tournament.bracket.final.p1Name : tournament.bracket.final.p2Name}</>
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ÁRVORE DE BRACKETS (GRID RESPONSIVO COM CONECTORES NEON) */}
      {tournament.status === 'registration' ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center opacity-70">
          <Users size={48} className="text-cyan-500/40 animate-pulse" />
          <div className="space-y-1">
            <h4 className="text-sm font-black text-white uppercase tracking-widest">Aguardando Jogadores</h4>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider max-w-sm leading-relaxed">
              O chaveamento neon será gerado e iniciado automaticamente assim que todas as {tournament.maxPlayers} vagas forem preenchidas.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center justify-center relative min-h-[400px]">
          
          {/* 1. QUARTAS DE FINAL (Apenas se o Torneio tiver 8 Jogadores) */}
          {tournament.maxPlayers === 8 && (
            <div className="flex flex-col justify-between gap-6 h-full py-4 relative">
              <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest text-center block mb-2 border-b border-white/5 pb-1">
                Quartas de Final
              </span>
              <div className="flex flex-col gap-6 h-full justify-around">
                {tournament.bracket.quarterfinals?.map((match, idx) => (
                  <div key={`qf-${idx}`} className="relative">
                    {renderMatchCard(match, 'quarterfinals', idx)}
                    
                    {/* SVG Connector Neon até a Semifinal (Apenas em telas md/desktop) */}
                    <div className="hidden md:block absolute top-1/2 -right-6 w-6 h-[2px] bg-white/5 pointer-events-none transform -translate-y-1/2">
                      <div className={`h-full w-full transition-all ${
                        match.winnerId ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]' : ''
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. SEMIFINAIS */}
          <div className="flex flex-col justify-between gap-6 h-full py-4 relative">
            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest text-center block mb-2 border-b border-white/5 pb-1">
              Semifinais
            </span>
            <div className="flex flex-col gap-12 h-full justify-around">
              {tournament.bracket.semifinals.map((match, idx) => (
                <div key={`sf-${idx}`} className="relative">
                  {renderMatchCard(match, 'semifinals', idx)}
                  
                  {/* SVG Connector Neon até a Final (Apenas em telas md/desktop) */}
                  <div className="hidden md:block absolute top-1/2 -right-6 w-6 h-[2px] bg-white/5 pointer-events-none transform -translate-y-1/2">
                    <div className={`h-full w-full transition-all ${
                      match.winnerId ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]' : ''
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. GRANDE FINAL */}
          <div className="flex flex-col justify-center gap-6 h-full py-4 relative">
            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest text-center block mb-2 border-b border-white/5 pb-1">
              Grande Final
            </span>
            <div className="flex flex-col justify-center h-full items-center">
              <div className="relative w-full">
                {renderMatchCard(tournament.bracket.final, 'final', 0)}
                
                {/* Coroa/Pódio Flutuante sobre o Campeão */}
                {hasWinner && (
                  <motion.div 
                    initial={{ scale: 0, y: 10 }}
                    animate={{ scale: 1, y: -45 }}
                    className="absolute left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-amber-500 to-yellow-400 border border-amber-400 p-2 rounded-2xl flex items-center justify-center shadow-xl shadow-yellow-500/20 text-gray-950 font-black text-[9px] uppercase tracking-wider gap-1"
                  >
                    <Trophy size={12} fill="black" />
                    Campeão do Hub!
                  </motion.div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
