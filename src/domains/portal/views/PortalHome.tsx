import React from 'react';
import { motion } from 'motion/react';
import { 
  Globe, 
  Clock, 
  CheckCircle, 
  Calendar, 
  Users, 
  Copy, 
  ArrowRight,
  Sparkles,
  Megaphone
} from 'lucide-react';
import { toast } from 'sonner';

interface PortalHomeProps {
  client: any;
  announcement: any;
  setActiveTab: (tab: string) => void;
}

export default function PortalHome({ client, announcement, setActiveTab }: PortalHomeProps) {
  const completedStages = client.stages?.filter((s: any) => s.completed).length || 0;
  const totalStages = client.stages?.length || 0;
  const progress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  const copyReferralLink = () => {
    const message = `Olá! Fui indicado por ${client.name} e gostaria de conhecer os projetos da Hub Symples.`;
    const link = `https://wa.me/5511952924208?text=${encodeURIComponent(message)}`;
    navigator.clipboard.writeText(link);
    toast.success('Link de indicação (WhatsApp) copiado!');
  };

  return (
    <div className="space-y-6 lg:space-y-8 pb-10">
      {/* Announcement Banner */}
      {announcement && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`p-1 rounded-[2rem] lg:rounded-3xl border ${
            announcement.type === 'warning' 
              ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30' 
              : announcement.type === 'success'
                ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 border-emerald-500/30'
                : announcement.type === 'new_feature'
                  ? 'bg-gradient-to-r from-primary-500/20 to-purple-500/20 border-primary-500/30'
                  : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30'
          }`}
        >
          <div className="bg-[#0a0a0a]/60 backdrop-blur-xl p-4 lg:p-6 rounded-[calc(2rem-4px)] lg:rounded-[calc(1.5rem-1px)] flex items-start gap-4 lg:gap-5">
            <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl flex items-center justify-center shrink-0 border ${
              announcement.type === 'warning' 
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' 
                : announcement.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : announcement.type === 'new_feature'
                    ? 'bg-primary-500/10 border-primary-500/20 text-primary-400'
                    : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}>
              <Megaphone className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base lg:text-lg mb-1">{announcement.title}</h3>
              <p className="text-gray-400 text-xs lg:text-sm leading-relaxed">{announcement.message}</p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Project Progress Card */}
        <div className="lg:col-span-2 group bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden transition-all duration-500 hover:border-white/20">
          <div className="flex flex-col md:flex-row items-center gap-6 lg:gap-10">
            {progress < 100 ? (
              <>
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Status do Projeto</span>
                  </div>
                  <h2 className="text-xl lg:text-3xl font-bold text-white mb-2 lg:mb-4 tracking-tight">Seu site está ganhando vida!</h2>
                  
                  <div className="mb-6">
                    <div className="flex justify-between items-end mb-2">
                       <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Progresso Total</span>
                       <span className="text-xl font-black text-primary-500">{progress}%</span>
                    </div>
                    <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${progress}%` }}
                         transition={{ duration: 1.5, ease: "easeOut" }}
                         className="h-full bg-gradient-to-r from-primary-500 to-primary-600 shadow-[0_0_15px_rgba(242,125,38,0.3)]"
                       />
                    </div>
                  </div>

                  <p className="text-gray-400 text-xs lg:text-sm leading-relaxed mb-6">
                    Estamos na etapa de <strong className="text-white">"{client.stages?.find((s: any) => !s.completed)?.name || 'Desenvolvimento'}"</strong>. 
                  </p>
                  
                  <div className="flex flex-wrap justify-center md:justify-start gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Plano Selecionado</span>
                      <div className="flex items-center gap-2 text-white font-bold">
                        <Globe size={16} className="text-blue-500" />
                        {client.plan}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Concluded State */
              <div className="flex-1 w-full text-center md:text-left py-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Projeto Finalizado</span>
                </div>
                <h2 className="text-2xl lg:text-4xl font-black text-white mb-4 tracking-tight">
                  Tudo pronto! Seu projeto foi <span className="text-primary-500">concluído.</span>
                </h2>
                <p className="text-gray-400 text-sm lg:text-base leading-relaxed mb-8 max-w-2xl">
                  Parabéns! Sua jornada de desenvolvimento terminou. Você já pode acessar seu novo ambiente digital através do link oficial abaixo.
                </p>
                
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                  <a 
                    href={client.siteUrl || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 md:flex-none px-8 py-4 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-primary-500 hover:text-white transition-all duration-300 shadow-xl group"
                  >
                    <Globe size={20} />
                    Acessar Meu Site
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </a>
                  
                  <div className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col justify-center">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1">Plano Ativo</span>
                    <span className="text-sm font-bold text-white">{client.plan}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions / Info Card */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-400" />
              Resumo Financeiro
            </h3>
            <div className="space-y-4">
              <div 
                onClick={() => setActiveTab('finance')}
                className="p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors cursor-pointer"
              >
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Status de Pagamento</p>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${client.paymentStatus === 'RECEIVED' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                    {client.paymentStatus === 'RECEIVED' ? 'Em dia' : 'Aguardando Pagamento'}
                  </span>
                  {client.paymentStatus === 'RECEIVED' ? <CheckCircle size={16} className="text-emerald-400" /> : <Clock size={16} className="text-yellow-400" />}
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Próxima Mensalidade</p>
                <p className="text-xl font-black text-white">
                  {client.currentDueDate ? new Date(client.currentDueDate + 'T12:00:00').toLocaleDateString('pt-BR') : '--/--/----'}
                </p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setActiveTab('finance')}
            className="w-full mt-6 py-4 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl font-bold flex items-center justify-center gap-2 group hover:shadow-lg hover:shadow-primary-500/20 transition-all"
          >
            Ver Financeiro
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Referral / Member Get Member */}
      <div className="bg-gradient-to-br from-blue-600/10 to-primary-600/5 backdrop-blur-2xl border border-blue-500/20 p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden group">
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-primary-500/10 rounded-full blur-[100px] group-hover:bg-primary-500/20 transition-colors duration-700" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full mb-4">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Programa de Embaixadores</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Indique amigos e ganhe bônus!</h2>
            <p className="text-gray-400 text-sm max-w-xl leading-relaxed">
              Cada amigo que fechar um projeto através do seu link exclusivo te garante <strong className="text-white">R$ 100,00</strong> de desconto na mensalidade ou comissão direta.
            </p>
          </div>
          
          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 lg:w-64 bg-black/40 border border-white/10 px-4 py-4 rounded-2xl font-mono text-[10px] text-gray-300 truncate">
              wa.me/5511952924208?text=Fui indicado por...
            </div>
            <button 
              onClick={copyReferralLink}
              className="w-full sm:w-auto px-8 py-4 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-all active:scale-95 shadow-xl"
            >
              <Copy size={18} />
              Copiar Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
