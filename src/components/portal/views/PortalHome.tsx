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
    const link = `https://hubsimples.com.br/indicar/${client.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Link de indicação copiado!');
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Announcement Banner */}
      {announcement && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-1 rounded-3xl bg-gradient-to-r from-primary-500/20 to-blue-500/20 border border-white/10"
        >
          <div className="bg-[#0a0a0a]/60 backdrop-blur-xl p-6 rounded-[calc(1.5rem-1px)] flex items-start gap-5">
            <div className="w-12 h-12 bg-primary-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-primary-500/20">
              <Megaphone className="text-primary-400 w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg mb-1">{announcement.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{announcement.message}</p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Project Progress Card */}
        <div className="lg:col-span-2 group bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden transition-all duration-500 hover:border-white/20">
          <div className="flex flex-col md:flex-row items-center gap-10">
            {/* Circular Progress */}
            <div className="relative w-48 h-48 shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  className="text-white/5"
                />
                <motion.circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={552.92}
                  initial={{ strokeDashoffset: 552.92 }}
                  animate={{ strokeDashoffset: 552.92 - (552.92 * progress) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  strokeLinecap="round"
                  className="text-primary-500 drop-shadow-[0_0_8px_rgba(242,125,38,0.5)]"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white">{progress}%</span>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Completo</span>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Status do Projeto</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Seu site está ganhando vida!</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Estamos na etapa de <strong className="text-white">"{client.stages?.find((s: any) => !s.completed)?.name || 'Finalização'}"</strong>. 
                Nossa equipe está trabalhando para entregar a melhor experiência possível.
              </p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Previsão</span>
                  <div className="flex items-center gap-2 text-white font-bold">
                    <Calendar size={16} className="text-primary-500" />
                    {client.deliveryDate ? new Date(client.deliveryDate + 'T12:00:00').toLocaleDateString('pt-BR') : '--/--/----'}
                  </div>
                </div>
                <div className="w-px h-10 bg-white/10 hidden md:block" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Plano</span>
                  <div className="flex items-center gap-2 text-white font-bold">
                    <Globe size={16} className="text-blue-500" />
                    {client.plan}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions / Info Card */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] flex flex-col justify-between">
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
      <div className="bg-gradient-to-br from-blue-600/10 to-primary-600/5 backdrop-blur-2xl border border-blue-500/20 p-8 rounded-[2.5rem] relative overflow-hidden group">
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
            <div className="flex-1 lg:w-64 bg-black/40 border border-white/10 px-4 py-4 rounded-2xl font-mono text-xs text-gray-300 truncate">
              hubsimples.com.br/indicar/{client.id}
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
