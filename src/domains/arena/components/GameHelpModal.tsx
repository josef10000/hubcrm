import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, X, Award, Compass, Lightbulb, CheckCircle2 } from 'lucide-react';
import { GAME_RULES } from '../helpers/gameRules';

interface GameHelpModalProps {
  gameType: string;
  onClose: () => void;
  skin?: 'classic' | 'cyberpunk';
}

export function GameHelpModal({ gameType, onClose, skin = 'cyberpunk' }: GameHelpModalProps) {
  const rule = GAME_RULES[gameType];
  if (!rule) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-6 select-none"
    >
      <motion.div
        initial={{ scale: 0.93, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.93, y: 15 }}
        className={`w-full max-w-xl rounded-[2.5rem] border p-8 flex flex-col gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] max-h-[90vh] overflow-y-auto custom-scrollbar relative ${
          skin === 'cyberpunk'
          ? 'bg-slate-950/80 border-cyan-500/20 text-white'
          : 'bg-[#1c1917] border-amber-500/20 text-[#e7e5e4]'
        }`}
      >
        {/* Efeito Brilho Neon */}
        <div className={`absolute top-0 right-0 w-44 h-44 rounded-full blur-[80px] -mr-16 -mt-16 opacity-30 ${
          skin === 'cyberpunk' ? 'bg-cyan-500' : 'bg-amber-500'
        }`} />

        {/* Header do Modal */}
        <div className="flex justify-between items-center relative z-10 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${
              skin === 'cyberpunk' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-amber-500/10 text-amber-400'
            }`}>
              <HelpCircle size={20} />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-widest leading-none">Como Jogar</h3>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mt-1">{rule.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Corpo de Regras */}
        <div className="space-y-6 relative z-10">
          
          {/* Objetivo do Jogo */}
          <div className={`p-5 border rounded-2xl flex gap-3.5 items-start ${
            skin === 'cyberpunk'
            ? 'bg-cyan-500/5 border-cyan-500/10'
            : 'bg-amber-500/5 border-amber-500/10'
          }`}>
            <Award className={`shrink-0 mt-0.5 ${
              skin === 'cyberpunk' ? 'text-cyan-400' : 'text-amber-400'
            }`} size={18} />
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Objetivo Geral</h4>
              <p className="text-xs font-bold leading-relaxed">{rule.objective}</p>
            </div>
          </div>

          {/* Instruções de Passo a Passo */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
              <Compass size={14} />
              Regras e Movimentos
            </h4>
            <div className="flex flex-col gap-2.5">
              {rule.steps.map((step, idx) => (
                <div key={idx} className="flex gap-3 items-start p-3.5 bg-white/[0.01] border border-white/5 rounded-2xl">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[9px] shrink-0 text-gray-900 ${
                    skin === 'cyberpunk' ? 'bg-cyan-400' : 'bg-amber-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <p className="text-xs font-semibold leading-relaxed text-gray-300">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Dicas Estratégicas */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
              <Lightbulb size={14} />
              Dicas de Mestre
            </h4>
            <div className="flex flex-col gap-2">
              {rule.tips.map((tip, idx) => (
                <div key={idx} className="flex gap-2.5 items-start pl-1 border-l-2 border-primary-500/35">
                  <CheckCircle2 size={12} className="text-primary-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-gray-400 font-medium leading-relaxed italic">{tip}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer do Modal */}
        <button
          onClick={onClose}
          className={`w-full py-4.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer mt-2 text-center shadow-lg ${
            skin === 'cyberpunk'
            ? 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-cyan-500/10'
            : 'bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-amber-500/10'
          }`}
        >
          Fechar e Voltar ao Jogo ➔
        </button>
      </motion.div>
    </motion.div>
  );
}
