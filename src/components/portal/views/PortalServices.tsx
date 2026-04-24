import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Star, 
  ArrowRight, 
  Zap, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Search, 
  X, 
  Info, 
  Loader2 
} from 'lucide-react';
import { Offer, Client } from '../../../types';

interface PortalServicesProps {
  offers: Offer[];
  client: Client;
}

export default function PortalServices({ offers, client }: PortalServicesProps) {
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  
  // Encontrar o mais contratado ou o primeiro
  const featuredOffer = offers.find(o => o.isMostHired) || offers[0];
  const otherOffers = offers.filter(o => o.id !== featuredOffer?.id);

  const handleHireClick = (offer: any) => {
    const message = encodeURIComponent(`Olá! Gostaria de fechar o acordo para o serviço: ${offer.name}`);
    window.open(`https://wa.me/5511952924208?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header with Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-primary-500/10 rounded-xl">
              <ShoppingBag className="text-primary-400 w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            Marketplace
          </h3>
          <p className="text-gray-500 text-xs lg:text-sm mt-1">Expanda seu negócio com ferramentas exclusivas.</p>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-400 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="O que você precisa?"
            className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-3.5 w-full md:w-80 outline-none focus:ring-2 focus:ring-primary-500/50 transition-all placeholder:text-gray-600 text-sm text-white"
          />
        </div>
      </div>

      {/* Hero Service (Mais Contratado) */}
      {featuredOffer ? (
        <div className="bg-gradient-to-br from-indigo-600/20 to-primary-600/10 border border-white/10 p-6 lg:p-10 rounded-[2rem] lg:rounded-[3rem] relative overflow-hidden group">
          <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[120%] bg-primary-500/20 rounded-full blur-[100px] group-hover:bg-primary-500/30 transition-colors duration-700" />
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full mb-4 lg:mb-6">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Destaque</span>
              </div>
              <h2 className="text-2xl lg:text-4xl font-black text-white mb-3 lg:mb-4 leading-tight">
                {featuredOffer.name}
              </h2>
              <p className="text-gray-400 text-sm lg:text-lg leading-relaxed mb-6 lg:mb-8 max-w-md line-clamp-3">
                {featuredOffer.description || 'Uma solução completa para impulsionar os resultados do seu negócio digital.'}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 mb-4 lg:mb-10">
                <button 
                  onClick={() => handleHireClick(featuredOffer)}
                  className="px-8 py-4 bg-primary-500 text-white font-black rounded-2xl hover:bg-primary-600 transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2 group text-sm lg:text-base order-1 sm:order-2"
                >
                  Fechar Acordo
                  <Zap size={20} className="fill-current group-hover:scale-125 transition-transform" />
                </button>
                 <button 
                  onClick={() => setSelectedOffer(featuredOffer)}
                  className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 border border-white/10 text-sm lg:text-base order-2 sm:order-1"
                >
                  <Info size={18} />
                  Detalhes
                </button>
              </div>
            </div>
            
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative w-full aspect-square max-w-sm">
                <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-[60px] animate-pulse" />
                <div className="relative bg-white/5 backdrop-blur-3xl border border-white/20 p-10 rounded-[3rem] shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500 flex items-center justify-center">
                   <ShoppingBag className="w-32 h-32 text-primary-400/50" strokeWidth={0.5} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 p-20 rounded-[3rem] text-center text-gray-500 italic">
          Nenhuma oferta disponível no momento.
        </div>
      )}

      {/* Grid of Offers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
        {otherOffers.length > 0 ? (
          otherOffers.map((offer, index) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] lg:rounded-[2.5rem] p-6 lg:p-8 flex flex-col hover:border-white/20 transition-all duration-300 hover:-translate-y-2 shadow-xl"
            >
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-xl lg:rounded-2xl flex items-center justify-center mb-6 lg:mb-8 group-hover:scale-110 transition-transform duration-500">
                <Star className="text-primary-400 w-6 h-6 lg:w-7 lg:h-7 group-hover:fill-primary-400 transition-all" />
              </div>
              
              <div className="flex-1">
                <h4 className="text-lg lg:text-xl font-bold text-white mb-2 group-hover:text-primary-400 transition-colors line-clamp-1">{offer.name}</h4>
                <p className="text-gray-500 text-xs lg:text-sm leading-relaxed mb-6 lg:mb-8 line-clamp-3">
                  {offer.description || 'Uma solução completa para impulsionar os resultados do seu negócio digital.'}
                </p>
              </div>

              <div className="space-y-4 lg:space-y-6 pt-6 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Investimento</span>
                    <span className="text-xl lg:text-2xl font-black text-white">
                      {offer.price ? `R$ ${offer.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Consultar'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <ShieldCheck className="text-emerald-500 w-4 h-4 lg:w-5 lg:h-5 mb-1" />
                    <span className="text-[9px] lg:text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">Seguro</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleHireClick(offer)}
                    className="py-3 bg-primary-500 text-white text-[10px] lg:text-xs font-black rounded-xl transition-all active:scale-95 shadow-lg"
                  >
                    Contratar
                  </button>
                  <button 
                    onClick={() => setSelectedOffer(offer)}
                    className="py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] lg:text-xs font-bold rounded-xl border border-white/10 transition-all"
                  >
                    Detalhes
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : null}
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedOffer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOffer(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#111] border border-white/10 rounded-t-[2.5rem] lg:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] lg:max-h-[85vh] mt-auto lg:mt-0"
            >
              <div className="p-6 lg:p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-primary-500/10 rounded-xl flex items-center justify-center">
                    <ShoppingBag className="text-primary-500" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg lg:text-xl font-bold text-white">{selectedOffer.name}</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Detalhes</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedOffer(null)}
                  className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
                <div className="space-y-6 lg:space-y-8">
                  <div>
                    <h4 className="text-[10px] font-black text-primary-500 uppercase tracking-widest mb-3 lg:mb-4">Sobre esta solução</h4>
                    <p className="text-gray-300 leading-relaxed text-sm lg:text-lg">
                      {selectedOffer.description || "Nenhum detalhe adicional informado."}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                    <div className="bg-white/5 p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-white/5 text-center sm:text-left">
                      <span className="text-[9px] lg:text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1">Valor Mensal</span>
                      <span className="text-2xl lg:text-3xl font-black text-white">
                        R$ {selectedOffer.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {selectedOffer.setupPrice > 0 && (
                      <div className="bg-white/5 p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-white/5 text-center sm:text-left">
                        <span className="text-[9px] lg:text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1">Taxa de Setup</span>
                        <span className="text-2xl lg:text-3xl font-black text-white">
                          R$ {selectedOffer.setupPrice?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>

                  {selectedOffer.details && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-primary-500 uppercase tracking-widest">O que inclui</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedOffer.details.split('\n').filter(f => f.trim()).map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                            <CheckCircle2 className="text-emerald-400 w-4 h-4 shrink-0" />
                            <span className="text-gray-300 text-[11px] lg:text-xs">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 lg:p-6 rounded-2xl lg:rounded-3xl flex items-start gap-4">
                    <ShieldCheck className="text-emerald-500 shrink-0" size={20} />
                    <div>
                      <h4 className="text-emerald-400 font-bold text-sm lg:text-base">Acordo Direto</h4>
                      <p className="text-emerald-500/70 text-xs lg:text-sm">Este serviço requer alinhamento estratégico. Fale com nosso atendimento.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 lg:p-8 border-t border-white/5 bg-white/5">
                <button 
                  onClick={() => handleHireClick(selectedOffer)}
                  className="w-full py-4 lg:py-5 bg-primary-500 text-white font-black rounded-2xl hover:bg-primary-600 transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3 text-sm lg:text-base"
                >
                  Falar com Atendimento
                  <ArrowRight size={20} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
