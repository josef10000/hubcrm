import React, { useState, useEffect } from 'react';
import { 
  HeartHandshake, 
  Users, 
  Calendar, 
  Target, 
  TrendingUp, 
  Cake, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Smile, 
  MessageSquare,
  Sparkles,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { UserProfile, OnboardingTask } from '../types';
import { format, differenceInYears, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

type PeopleSubTab = 'dashboard' | 'onboarding' | 'development' | 'vacations';

export default function PeopleView() {
  const [activeTab, setActiveTab] = useState<PeopleSubTab>('dashboard');
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.orgId) return;

    const q = query(
      collection(db, 'profiles'),
      where('orgId', '==', userProfile.orgId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const members = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      setTeamMembers(members);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.orgId]);

  const celebratesAnniversary = (member: UserProfile) => {
    if (!member.startDate) return false;
    const start = parseISO(member.startDate);
    const today = new Date();
    return isSameDay(
      new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      new Date(today.getFullYear(), start.getMonth(), start.getDate())
    );
  };

  const getTenure = (member: UserProfile) => {
    if (!member.startDate) return 'Data não definida';
    const years = differenceInYears(new Date(), parseISO(member.startDate));
    return years === 0 ? 'Menos de 1 ano' : `${years} ${years === 1 ? 'ano' : 'anos'}`;
  };

  const toggleTask = async (memberUid: string, taskId: string) => {
    const member = teamMembers.find(m => m.uid === memberUid);
    if (!member || !member.onboardingTasks) return;

    const newTasks = member.onboardingTasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : undefined } : t
    );

    try {
      await updateDoc(doc(db, 'profiles', memberUid), {
        onboardingTasks: newTasks
      });
      toast.success('Tarefa atualizada!');
    } catch (error) {
      toast.error('Erro ao atualizar tarefa.');
    }
  };

  const assignDefaultTemplate = async (memberUid: string) => {
    const defaultTasks: OnboardingTask[] = [
      { id: '1', task: 'Configurar e-mail institucional', completed: false },
      { id: '2', task: 'Acesso ao Slack/Discord/WhatsApp da equipe', completed: false },
      { id: '3', task: 'Preencher dados no perfil do CRM', completed: false },
      { id: '4', task: 'Treinamento sobre o produto/serviço', completed: false },
      { id: '5', task: 'Assinar contrato de prestação de serviço', completed: false },
    ];

    try {
      await updateDoc(doc(db, 'profiles', memberUid), {
        onboardingTasks: defaultTasks
      });
      toast.success('Checklist padrão atribuído!');
    } catch (error) {
      toast.error('Erro ao atribuir checklist.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <HeartHandshake className="text-pink-500" /> People & Culture
            </h1>
            <p className="text-gray-500 dark:text-gray-400">Desenvolvimento, bem-estar e cultura da equipe.</p>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="flex bg-gray-200/50 dark:bg-white/5 p-1 rounded-2xl border border-gray-200 dark:border-white/10 mb-8 w-fit">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-medium ${activeTab === 'dashboard' ? 'bg-white dark:bg-white/10 text-primary-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <TrendingUp size={18} />
            <span>Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('onboarding')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-medium ${activeTab === 'onboarding' ? 'bg-white dark:bg-white/10 text-primary-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Sparkles size={18} />
            <span>Onboarding</span>
          </button>
          <button 
            onClick={() => setActiveTab('development')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-medium ${activeTab === 'development' ? 'bg-white dark:bg-white/10 text-primary-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Target size={18} />
            <span>Desenvolvimento</span>
          </button>
          <button 
            onClick={() => setActiveTab('vacations')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-medium ${activeTab === 'vacations' ? 'bg-white dark:bg-white/10 text-primary-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Calendar size={18} />
            <span>Ausências</span>
          </button>
        </div>

        {/* Content Rendering */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {/* Clima Organizacional (eNPS Mock) */}
            <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold flex items-center gap-2"><Smile className="text-yellow-500" /> Clima da Equipe</h3>
                <span className="text-xs font-bold text-primary-500 bg-primary-500/10 px-2 py-1 rounded-lg">Mês Atual</span>
              </div>
              <div className="flex flex-col items-center justify-center py-4">
                <div className="text-5xl font-black text-gray-900 dark:text-white mb-2">78</div>
                <div className="text-sm font-medium text-gray-500">Score eNPS (Excelente)</div>
                <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full mt-6 overflow-hidden">
                  <div className="h-full bg-primary-500 transition-all duration-1000" style={{ width: '78%' }}></div>
                </div>
              </div>
            </div>

            {/* Celebrações */}
            <div className="md:col-span-2 bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl">
              <h3 className="font-bold flex items-center gap-2 mb-6"><Cake className="text-pink-500" /> Celebrações do Dia</h3>
              <div className="space-y-4">
                {teamMembers.some(m => celebratesAnniversary(m)) ? (
                  teamMembers.filter(m => celebratesAnniversary(m)).map(m => (
                    <div key={m.uid} className="flex items-center justify-between p-4 bg-primary-500/5 rounded-2xl border border-primary-500/10 scale-in-center overflow-hidden relative">
                       <div className="absolute top-0 right-0 p-2 transform rotate-12 opacity-10">
                        <Cake size={48} />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary-500 p-0.5">
                          {m.photoURL ? <img src={m.photoURL} alt="" className="w-full h-full rounded-full object-cover" /> : <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center text-white">{m.displayName[0]}</div>}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">Aniversário de Empresa: {m.displayName}</p>
                          <p className="text-sm text-gray-500">Completando {getTenure(m)} de jornada conosco!</p>
                        </div>
                      </div>
                      <button className="bg-primary-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary-500/20">Parabenizar</button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto text-gray-300 mb-2" size={32} />
                    <p className="text-gray-500 text-sm">Nenhuma celebração para hoje. Que tal planejar o próximo Happy Hour?</p>
                  </div>
                )}
              </div>
            </div>

            {/* Talentos Recentes (Onboarding Stats) */}
            <div className="md:col-span-3 bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl overflow-hidden">
               <h3 className="font-bold flex items-center gap-2 mb-6"><Users className="text-blue-500" /> Talentos em Onboarding</h3>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 {teamMembers.filter(m => (m.onboardingTasks?.length || 0) > 0).slice(0, 4).map(m => {
                   const completed = m.onboardingTasks?.filter(t => t.completed).length || 0;
                   const total = m.onboardingTasks?.length || 0;
                   const percent = Math.round((completed / total) * 100);
                   return (
                     <div key={m.uid} className="p-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl hover:border-primary-500/30 transition-all cursor-pointer group">
                        <div className="flex items-center gap-3 mb-3">
                           <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                             {m.photoURL ? <img src={m.photoURL} alt="" /> : m.displayName[0]}
                           </div>
                           <div className="flex-1">
                             <p className="text-xs font-bold truncate">{m.displayName}</p>
                             <p className="text-[10px] text-gray-500">{m.jobTitle}</p>
                           </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] mb-1">
                           <span className="font-bold">{percent}%</span>
                           <span className="text-gray-500">{completed}/{total} tarefas</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                           <div className="h-full bg-blue-500 transition-all" style={{ width: `${percent}%` }}></div>
                        </div>
                     </div>
                   );
                 })}
                 <div className="flex items-center justify-center p-4 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl hover:bg-white/5 transition-all text-gray-400 text-sm cursor-pointer lg:flex hidden">
                    <UserPlus size={20} className="mr-2" /> Novo Membro
                 </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'onboarding' && (
          <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl animate-in slide-in-from-bottom duration-500">
             <div className="flex items-center gap-3 mb-8">
               <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                 <Sparkles size={24} />
               </div>
               <div>
                 <h2 className="text-xl font-bold">Gestão de Onboarding</h2>
                 <p className="text-sm text-gray-500">Acompanhe a chegada dos novos talentos e garanta uma experiência incrível.</p>
               </div>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 space-y-2">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Colaboradores</p>
                   {teamMembers.map(m => (
                     <button key={m.uid} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${m.onboardingTasks ? 'bg-white dark:bg-white/10' : 'hover:bg-gray-100 dark:hover:bg-white/5 opacity-60'}`}>
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                             {m.photoURL ? <img src={m.photoURL} alt="" /> : m.displayName[0]}
                           </div>
                           <span className="text-xs font-bold text-left truncate max-w-[100px]">{m.displayName}</span>
                        </div>
                        <ChevronRight size={14} className="text-gray-400" />
                     </button>
                   ))}
                </div>
                
                <div className="lg:col-span-3 bg-black/20 rounded-3xl p-6 border border-white/5">
                   <div className="text-center py-20 grayscale opacity-40">
                      <Circle size={48} className="mx-auto mb-4 text-gray-500" />
                      <p className="text-gray-500">Selecione um colaborador para gerenciar o checklist de onboarding.</p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {(activeTab === 'development' || activeTab === 'vacations') && (
           <div className="flex flex-col items-center justify-center p-20 bg-white/30 dark:bg-white/5 backdrop-blur-3xl border border-gray-200 dark:border-white/10 rounded-[3rem] animate-pulse">
              <Clock size={48} className="text-primary-500 mb-4" />
              <h2 className="text-xl font-bold">Em Breve</h2>
              <p className="text-gray-500">Este módulo está sendo finalizado para oferecer a melhor experiência de gestão.</p>
           </div>
        )}
      </div>
    </div>
  );
}
