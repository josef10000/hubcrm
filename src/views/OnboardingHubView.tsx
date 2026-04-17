import React, { useState } from 'react';
import { Rocket, Users, CheckCircle2, Clock, ArrowRight, UserPlus, Search, Filter, Calendar } from 'lucide-react';
import { useCRM } from '../contexts/CRMContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type TabType = 'cs' | 'talent';

export default function OnboardingHubView() {
  const { clients, teamProfiles, setEditingClient } = useCRM();
  const [activeTab, setActiveTab] = useState<TabType>('cs');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Filtragem de Clientes em Onboarding
  const onboardingClients = clients.filter(c => 
    c.status === 'Em Desenvolvimento' &&
    (searchTerm === '' || c.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Filtragem de Talentos em Onboarding
  const onboardingTalents = teamProfiles.filter(p => 
    p.onboardingTasks && p.onboardingTasks.some(t => !t.completed) &&
    (searchTerm === '' || p.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const calculateProgress = (items: any[]) => {
    if (!items || items.length === 0) return 0;
    const completed = items.filter(i => i.completed).length;
    return Math.round((completed / items.length) * 100);
  };

  const getSLAColor = (createdAt: number) => {
    const days = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
    if (days > 15) return 'text-red-500';
    if (days > 7) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Estratégico */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Onboarding Hub
            </h2>
            <p className="text-gray-400 mt-1">Aceleração de Clientes e Talentos v4.0</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-400 transition-colors" size={18} />
              <input 
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 w-full md:w-64 backdrop-blur-xl transition-all"
              />
            </div>
          </div>
        </div>

        {/* Tabs de Navegação */}
        <div className="flex p-1 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 w-fit">
          <button
            onClick={() => setActiveTab('cs')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-300 ${
              activeTab === 'cs' 
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
              : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Rocket size={18} />
            <span className="font-medium">Sucesso do Cliente</span>
            <span className="ml-2 px-2 py-0.5 bg-black/40 rounded-md text-xs font-bold text-primary-400">{onboardingClients.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('talent')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all duration-300 ${
              activeTab === 'talent' 
              ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
              : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={18} />
            <span className="font-medium">Talentos & Cultura</span>
            <span className="ml-2 px-2 py-0.5 bg-black/40 rounded-md text-xs font-bold text-indigo-400">{onboardingTalents.length}</span>
          </button>
        </div>

        {/* Grid de Conteúdo */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {activeTab === 'cs' ? (
              onboardingClients.length > 0 ? (
                onboardingClients.map((client) => {
                  const progress = calculateProgress(client.stages || []);
                  return (
                    <motion.div
                      key={client.id}
                      layout
                      className="group p-6 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-3xl backdrop-blur-xl transition-all duration-500 shadow-xl hover:shadow-primary-500/5"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-primary-500/20 rounded-2xl flex items-center justify-center text-primary-400 group-hover:scale-110 transition-transform duration-500">
                          <Rocket size={24} />
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${getSLAColor(client.createdAt)} bg-black/20 px-3 py-1 rounded-full border border-white/5`}>
                          <Clock size={12} />
                          {formatDistanceToNow(client.createdAt, { locale: ptBR, addSuffix: true })}
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary-400 transition-colors">
                        {client.name}
                      </h3>
                      <p className="text-sm text-gray-400 mb-6 flex items-center gap-2">
                        <Calendar size={14} />
                        Início: {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                      </p>

                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Progresso Técnico</span>
                          <span className="text-lg font-bold text-primary-400">{progress}%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-gradient-to-r from-primary-600 to-primary-400 shadow-[0_0_15px_rgba(var(--primary-500-rgb),0.5)]"
                          />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 bg-black/10 p-2 rounded-lg">
                          <CheckCircle2 size={14} className="text-green-500" />
                          {client.stages?.filter(s => s.completed).length || 0} de {client.stages?.length || 0} etapas concluídas
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setEditingClient(client);
                          navigate('/clients');
                        }}
                        className="mt-8 w-full py-3 bg-white/5 hover:bg-primary-500 text-white rounded-2xl border border-white/5 hover:border-transparent transition-all duration-300 flex items-center justify-center gap-2 group/btn font-medium"
                      >
                        Gerenciar Etapas
                        <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </motion.div>
                  );
                })
              ) : (
                <EmptyState icon={<Rocket size={48} />} title="Nenhum Onboarding Ativo" description="Novos clientes em desenvolvimento aparecerão aqui." />
              )
            ) : (
              onboardingTalents.length > 0 ? (
                onboardingTalents.map((profile) => {
                  const progress = calculateProgress(profile.onboardingTasks || []);
                  return (
                    <motion.div
                      key={profile.uid}
                      layout
                      className="group p-6 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-3xl backdrop-blur-xl transition-all duration-500"
                    >
                      <div className="flex items-start justify-between mb-6">
                        <div className="relative">
                          <img 
                            src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}&background=6366f1&color=fff`}
                            alt={profile.displayName}
                            className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-500/20"
                          />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-500 rounded-lg flex items-center justify-center text-white border-2 border-black/50">
                            <UserPlus size={12} />
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-tighter block mb-1">Cargo</span>
                          <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-semibold">
                            {profile.jobTitle || 'Novo Membro'}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-white mb-1">{profile.displayName}</h3>
                      <p className="text-xs text-gray-500 mb-6 italic">Ingressou {formatDistanceToNow(profile.createdAt, { locale: ptBR, addSuffix: true })}</p>

                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Aclimatização</span>
                          <span className="text-lg font-bold text-indigo-400">{progress}%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400"
                          />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <CheckCircle2 size={14} className="text-indigo-400" />
                          {profile.onboardingTasks?.filter(t => t.completed).length || 0} de {profile.onboardingTasks?.length || 0} pendências resolvidas
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/profile/${profile.uid}`)}
                        className="mt-8 w-full py-3 bg-white/5 hover:bg-indigo-500 text-white rounded-2xl border border-white/5 hover:border-transparent transition-all duration-300 flex items-center justify-center gap-2 group/btn font-medium"
                      >
                        Ver Perfil Completo
                        <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </motion.div>
                  );
                })
              ) : (
                <EmptyState icon={<Users size={48} />} title="Time Completo" description="Todos os novos membros já concluíram seu onboarding." color="indigo" />
              )
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description, color = 'primary' }: any) {
  const colorClass = color === 'primary' ? 'text-primary-500' : 'text-indigo-500';
  return (
    <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white/[0.02] border border-dashed border-white/10 rounded-[3rem] text-center">
      <div className={`${colorClass} mb-4 opacity-50`}>{icon}</div>
      <h3 className="text-xl font-medium text-white mb-2">{title}</h3>
      <p className="text-gray-500 max-w-xs">{description}</p>
    </div>
  );
}
