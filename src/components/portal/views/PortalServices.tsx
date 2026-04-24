import React from 'react';
import { motion } from 'motion/react';
import { 
  ShoppingBag, 
  Star, 
  ArrowRight, 
  Zap, 
  Check,
  ShieldCheck,
  Sparkles,
  Search
} from 'lucide-react';

interface PortalServicesProps {
  offers: any[];
}

export default function PortalServices({ offers }: PortalServicesProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header with Search (Future functionality) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-primary-500/10 rounded-xl">
              <ShoppingBag className="text-primary-400 w-6 h-6" />
            </div>
            Marketplace de Soluções
          </h3>
          <p className="text-gray-500 text-sm mt-1">Expanda seu negócio com nossas ferramentas exclusivas.</p>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-400 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="O que você precisa hoje?"
            className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-3.5 w-full md:w-80 outline-none focus:ring-2 focus:ring-primary-500/50 transition-all placeholder:text-gray-600"
          />
        </div>
      </div>

      {/* Hero Service (Pinned or Featured) */}
      <div className="bg-gradient-to-br from-indigo-600/20 to-primary-600/10 border border-white/10 p-10 rounded-[3rem] relative overflow-hidden group">
        <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[120%] bg-primary-500/20 rounded-full blur-[100px] group-hover:bg-primary-500/30 transition-colors duration-700" />
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-500/20 border border-primary-500/30 rounded-full mb-6">
              <Sparkles className="w-3.5 h-3.5 text-primary-400" />
              <span className="text-[10px] font-bold text-primary-400 uppercase tracking-wider">Mais Contratado</span>
            </div>
            <h2 className="text-4xl font-black text-white mb-4 leading-tight">
              E-mail Profissional <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-blue-400">Google Workspace</span>
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-md">
              Dê mais autoridade para sua marca com e-mails personalizados @suaempresa e as melhores ferramentas do Google.
            </p>
            <ul className="space-y-3 mb-10">
              {['30GB de Armazenamento', 'E-mails @suamarca.com', 'Google Meet Premium', 'Suporte Especializado'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-white/80 font-medium">
                  <div className="w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <Check className="text-emerald-400" size={12} strokeWidth={3} />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <button className="px-10 py-5 bg-white text-black font-black rounded-2xl hover:bg-gray-100 transition-all active:scale-95 shadow-2xl flex items-center gap-3 group">
              Contratar Agora
              <Zap size={20} className="fill-current group-hover:scale-125 transition-transform" />
            </button>
          </div>
          
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative w-full aspect-square max-w-sm">
              <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-[60px] animate-pulse" />
              <div className="relative bg-white/5 backdrop-blur-3xl border border-white/20 p-10 rounded-[3rem] shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500">
                 <ShoppingBag className="w-full h-full text-primary-400/50" strokeWidth={0.5} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Offers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
        {offers.length > 0 ? (
          offers.map((offer, index) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col hover:border-white/20 transition-all duration-300 hover:-translate-y-2 shadow-xl"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
                <Star className="text-primary-400 w-7 h-7 group-hover:fill-primary-400 transition-all" />
              </div>
              
              <div className="flex-1">
                <h4 className="text-xl font-bold text-white mb-2 group-hover:text-primary-400 transition-colors">{offer.title}</h4>
                <p className="text-gray-500 text-sm leading-relaxed mb-8">
                  {offer.description || 'Uma solução completa para impulsionar os resultados do seu negócio digital.'}
                </p>
              </div>

              <div className="space-y-6 pt-6 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Investimento</span>
                    <span className="text-2xl font-black text-white">
                      {offer.price ? `R$ ${offer.price.toFixed(2).replace('.', ',')}` : 'Consultar'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <ShieldCheck className="text-emerald-500 w-5 h-5 mb-1" />
                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">Compra Segura</span>
                  </div>
                </div>
                
                <button className="w-full py-4 bg-white/5 group-hover:bg-primary-500 group-hover:text-white text-gray-400 font-bold rounded-2xl transition-all flex items-center justify-center gap-2">
                  Ver Detalhes
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-gray-500 italic">
            Estamos preparando novas ofertas exclusivas para você.
          </div>
        )}
      </div>
    </div>
  );
}
