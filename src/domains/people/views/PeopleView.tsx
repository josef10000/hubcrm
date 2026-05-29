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
  UserPlus,
  PlusCircle,
  Trash2,
  ChevronDown,
  AlertTriangle,
  Settings,
  Plus,
  X,
  Package,
  Globe
} from 'lucide-react';
import { usePermissions } from '@auth/hooks/usePermissions';
import AssetManager from '@people/components/AssetManager';
import FeedbackBoard from '@people/components/FeedbackBoard';
import CareerTimeline from '@people/components/CareerTimeline';
import AddMilestoneModal from '@people/components/AddMilestoneModal';
import SkillRadar from '@people/components/SkillRadar';
import EditSkillsModal from '@people/components/EditSkillsModal';
import { useAuth } from '@auth/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, deleteDoc, arrayUnion, arrayRemove, orderBy } from 'firebase/firestore';
import { UserProfile, OnboardingTask } from '@/types';
import { format, differenceInYears, parseISO, isSameDay, addDays } from 'date-fns';
import { useCRM } from '@crm/contexts/CRMContext';
import { useCRMStore } from '@/store/useCRMStore';
import { TimeLog, calculateNetDuration } from '@/store/slices/timeTrackingSlice';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { VacationPeriod, PDICategory, PDIAction } from '@/types/people';
import { PDIKanban } from '@people/components/PDIKanban';
import { EnergyScoreCard } from '@people/components/EnergyScoreCard';

type PeopleSubTab = 'dashboard' | 'onboarding' | 'development' | 'career' | 'mural' | 'assets' | 'vacations' | 'climate' | 'expediente';

export default function PeopleView() {
  const { user } = useAuth();
  const crm = useCRM();
  const { userProfile, teamProfiles: crmTeamProfiles, effectiveOrgId: crmOrgId } = crm;

  const subscribeToPeople = useCRMStore(s => s.subscribeToPeople);

  useEffect(() => {
    if (crmOrgId) {
      return subscribeToPeople(crmOrgId);
    }
  }, [crmOrgId, subscribeToPeople]);

  const [activeTab, setActiveTab] = useState<PeopleSubTab>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const todayLog = useCRMStore(s => s.todayLog);
  const [myTimeLogs, setMyTimeLogs] = useState<TimeLog[]>([]);
  const [elapsedToday, setElapsedToday] = useState(0);

  useEffect(() => {
    if (!userProfile?.uid || !effectiveOrgId) return;
    const q = query(
      collection(db, 'organizations', effectiveOrgId, 'time_logs'),
      where('userId', '==', userProfile.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const logs = snap.docs.map(d => d.data() as TimeLog);
      logs.sort((a, b) => b.startTime - a.startTime);
      setMyTimeLogs(logs);
    });
    return () => unsub();
  }, [userProfile?.uid, effectiveOrgId]);

  useEffect(() => {
    if (!todayLog || todayLog.status !== 'active') {
      if (todayLog) {
        setElapsedToday(todayLog.totalDuration);
      } else {
        setElapsedToday(0);
      }
      return;
    }

    const timer = setInterval(() => {
      const duration = calculateNetDuration(todayLog.startTime, undefined, todayLog.pauses);
      setElapsedToday(duration);
    }, 1000);

    return () => clearInterval(timer);
  }, [todayLog]);

  const formatDuration = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  };
  
  // Estados para Gestão Local e Interatividade
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Blindagem de Dados (Safe Mode)
  const { 
    vacations: rawVacations = [], 
    enpsQuestion = '',
    setEnpsQuestion = () => {},
    enpsFrequency = 'mensal',
    setEnpsFrequency = () => {}
  } = crm || {};

  const vacations = Array.isArray(rawVacations) ? rawVacations : [];
  const teamProfiles = Array.isArray(crmTeamProfiles) ? crmTeamProfiles : [];
  const effectiveOrgId = crmOrgId || '';

  const [showVacationModal, setShowVacationModal] = useState(false);
  const [newVacation, setNewVacation] = useState<Partial<VacationPeriod>>({
    type: 'Férias',
    reason: 'Férias',
    status: 'Pendente',
    description: '',
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(addDays(new Date(), 15), 'yyyy-MM-dd')
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [vacationToDelete, setVacationToDelete] = useState<string | null>(null);

  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [newActionText, setNewActionText] = useState<{ [key: string]: string }>({});

  const { hasPermission } = usePermissions();
  const isAdminOrGerente = hasPermission('MANAGE_TEAM');

  const [enpsResults, setEnpsResults] = useState<any[]>([]);
  const [enpsScoreCalc, setEnpsScoreCalc] = useState<number | null>(null);
  const [showClearEnpsConfirm, setShowClearEnpsConfirm] = useState(false);
  const [isClearingEnps, setIsClearingEnps] = useState(false);

  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showSkillsModal, setShowSkillsModal] = useState(false);

  // Estados para Recusa de Ausência
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [vacationToReject, setVacationToReject] = useState<VacationPeriod | null>(null);

  useEffect(() => {
    if (!effectiveOrgId) return;
    const q = query(
      collection(db, 'organizations', effectiveOrgId, 'enps_results'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setEnpsResults(results);
      if (results.length > 0) {
        const promoters = results.filter((r: any) => r.score >= 9).length;
        const detractors = results.filter((r: any) => r.score <= 6).length;
        const total = results.length;
        const score = Math.round(((promoters - detractors) / total) * 100);
        setEnpsScoreCalc(score);
      } else {
        setEnpsScoreCalc(null);
      }
    });
    return () => unsubscribe();
  }, [effectiveOrgId]);

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
      if (selectedMember) {
        const updated = members.find(m => m.uid === selectedMember.uid);
        if (updated) setSelectedMember(updated);
      }
    });
    return () => unsubscribe();
  }, [userProfile?.orgId, selectedMember?.uid]);

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

  const handleClearEnpsData = async () => {
    if (!effectiveOrgId) return;
    setIsClearingEnps(true);
    try {
      const promises = enpsResults.map(r => deleteDoc(doc(db, 'organizations', effectiveOrgId, 'enps_results', r.id)));
      await Promise.all(promises);
      setShowClearEnpsConfirm(false);
      toast.success('Dados da pesquisa limpos com sucesso!');
    } catch (error) {
      console.error("Error clearing eNPS data:", error);
      toast.error('Erro ao limpar dados.');
    } finally {
      setIsClearingEnps(false);
    }
  };

  const toggleTask = async (memberUid: string, taskId: string) => {
    const member = teamMembers.find(m => m.uid === memberUid);
    if (!member || !member.onboardingTasks) return;
    const updatedTasks = member.onboardingTasks.map(t => {
      if (t.id === taskId) {
        const isNowCompleted = !t.completed;
        return { ...t, completed: isNowCompleted, completedAt: isNowCompleted ? Date.now() : null };
      }
      return t;
    });
    try {
      await updateDoc(doc(db, 'profiles', memberUid), { onboardingTasks: updatedTasks });
      toast.success('Tarefa atualizada!');
    } catch (error) {
      toast.error('Erro ao atualizar tarefa.');
    }
  };

  const addTaskToOnboarding = async (memberUid: string, taskDescription: string) => {
    if (!taskDescription.trim()) return;
    try {
      const newTask: OnboardingTask = { id: Date.now().toString(), task: taskDescription, completed: false };
      await updateDoc(doc(db, 'profiles', memberUid), { onboardingTasks: arrayUnion(newTask) });
      toast.success('Tarefa adicionada!');
    } catch (error) {
      toast.error('Erro ao adicionar tarefa.');
    }
  };

  const removeTaskFromOnboarding = async (memberUid: string, taskId: string) => {
    const member = teamMembers.find(m => m.uid === memberUid);
    if (!member || !member.onboardingTasks) return;
    const taskToRemove = member.onboardingTasks.find(t => t.id === taskId);
    if (!taskToRemove) return;
    try {
      await updateDoc(doc(db, 'profiles', memberUid), { onboardingTasks: arrayRemove(taskToRemove) });
      toast.success('Tarefa removida!');
    } catch (error) {
      toast.error('Erro ao remover tarefa.');
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
      await updateDoc(doc(db, 'profiles', memberUid), { onboardingTasks: defaultTasks });
      toast.success('Checklist padrão atribuído!');
    } catch (error) {
      toast.error('Erro ao atribuir checklist.');
    }
  };

  const addPDICategory = async (memberUid: string) => {
    if (!newCategoryTitle.trim()) return;
    const member = teamMembers.find(m => m.uid === memberUid);
    const categories = member?.pdiCategories || [];
    const newCategory: PDICategory = { id: Date.now().toString(), title: newCategoryTitle, actions: [] };
    try {
      await updateDoc(doc(db, 'profiles', memberUid), { pdiCategories: [...categories, newCategory] });
      setNewCategoryTitle('');
      toast.success('Nova categoria adicionada!');
    } catch (error) {
      toast.error('Erro ao adicionar categoria.');
    }
  };

  const addPDIAction = async (memberUid: string, categoryId: string) => {
    const text = newActionText[categoryId];
    if (!text?.trim()) return;
    const member = teamMembers.find(m => m.uid === memberUid);
    if (!member?.pdiCategories) return;
    const updatedCategories = member.pdiCategories.map(cat => {
      if (cat.id === categoryId) {
        const newAction: PDIAction = { id: Date.now().toString(), description: text, completed: false };
        return { ...cat, actions: [...cat.actions, newAction] };
      }
      return cat;
    });
    try {
      await updateDoc(doc(db, 'profiles', memberUid), { pdiCategories: updatedCategories });
      setNewActionText(prev => ({ ...prev, [categoryId]: '' }));
      toast.success('Ação adicionada ao PDI!');
    } catch (error) {
      toast.error('Erro ao adicionar ação.');
    }
  };

  const togglePDIAction = async (memberUid: string, categoryId: string, actionId: string) => {
    if (!isAdminOrGerente) {
      toast.error('Apenas gestores podem validar o progresso do PDI.');
      return;
    }
    const member = teamMembers.find(m => m.uid === memberUid);
    if (!member?.pdiCategories) return;
    const updatedCategories = member.pdiCategories.map(cat => {
      if (cat.id === categoryId) {
        const updatedActions = cat.actions.map(act => act.id === actionId ? { ...act, completed: !act.completed, completedAt: !act.completed ? Date.now() : null } : act);
        return { ...cat, actions: updatedActions };
      }
      return cat;
    });
    try {
      await updateDoc(doc(db, 'profiles', memberUid), { pdiCategories: updatedCategories });
      toast.success('PDI atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar PDI.');
    }
  };

  const removePDICategory = async (memberUid: string, categoryId: string) => {
    const member = teamMembers.find(m => m.uid === memberUid);
    if (!member?.pdiCategories) return;
    const updatedCategories = member.pdiCategories.filter(cat => cat.id !== categoryId);
    try {
      await updateDoc(doc(db, 'profiles', memberUid), { pdiCategories: updatedCategories });
      toast.success('Categoria removida.');
    } catch (error) {
      toast.error('Erro ao remover categoria.');
    }
  };

  const handleAddVacation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVacation.userId || !newVacation.start || !newVacation.end || !newVacation.description?.trim()) {
      toast.error('Preencha todos os campos, incluindo a justificativa!');
      return;
    }

    try {
      await crm.handleSaveVacationRequest(newVacation);
      // Sucesso Real: Fecha o modal e limpa os campos
      setShowVacationModal(false);
      setNewVacation({
        type: 'Férias',
        reason: 'Férias',
        status: 'Pendente',
        description: '',
        start: format(new Date(), 'yyyy-MM-dd'),
        end: format(addDays(new Date(), 15), 'yyyy-MM-dd')
      });
    } catch (error) {
      // Falha Real de Conexão/Permissão: Mantém o modal aberto e os dados intactos para re-tentativa
      console.error("Erro ao salvar ausência na UI:", error);
    }
  };

  const updateVacationStatus = async (vacation: VacationPeriod, status: 'Aprovado' | 'Recusado') => {
    if (status === 'Recusado') {
      setVacationToReject(vacation);
      setShowRejectionModal(true);
      return;
    }
    await crm.handleSaveVacationRequest({ ...vacation, status });
  };

  const handleConfirmRejection = async () => {
    if (!vacationToReject || !rejectionReason.trim()) {
      toast.error('Informe o motivo da recusa!');
      return;
    }
    try {
      await crm.handleSaveVacationRequest({ 
        ...vacationToReject, 
        status: 'Recusado',
        hrFeedback: rejectionReason.trim()
      });
      setShowRejectionModal(false);
      setRejectionReason('');
      setVacationToReject(null);
    } catch (e) {
      console.error("Erro ao recusar ausência na UI:", e);
    }
  };

  const deleteVacation = async (id: string) => {
    setVacationToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteVacation = async () => {
    if (!vacationToDelete) return;
    try {
      await crm.handleDeleteVacationRequest(vacationToDelete);
      setShowDeleteConfirm(false);
      setVacationToDelete(null);
    } catch (e) {
      console.error("Erro ao excluir ausência na UI:", e);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <HeartHandshake className="text-pink-500" /> People & Culture
            </h1>
            <p className="text-gray-500 dark:text-gray-400">Desenvolvimento, bem-estar e cultura da equipe.</p>
          </div>
        </div>

        <div className="flex bg-gray-200/50 dark:bg-white/5 p-1 rounded-2xl border border-gray-200 dark:border-white/10 mb-8 w-fit overflow-x-auto">
          {[
            { id: 'dashboard', icon: TrendingUp, label: 'Dashboard' },
            { id: 'onboarding', icon: Sparkles, label: 'Onboarding' },
            { id: 'development', icon: Target, label: 'Desenvolvimento' },
            { id: 'career', icon: TrendingUp, label: 'Carreira' },
            { id: 'mural', icon: MessageSquare, label: 'Mural' },
            { id: 'assets', icon: Package, label: 'Ativos' },
            { id: 'vacations', icon: Calendar, label: 'Ausências' },
            { id: 'expediente', icon: Clock, label: 'Meu Expediente' },
            { id: 'climate', icon: Smile, label: 'Clima', restricted: true }
          ].filter(t => !t.restricted || isAdminOrGerente).map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as PeopleSubTab)} className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-medium shrink-0 ${activeTab === t.id ? 'bg-white dark:bg-white/10 text-primary-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              <t.icon size={18} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="relative">
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
              <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl text-center">
                 <h3 className="font-bold flex items-center gap-2 mb-6"><Smile className="text-yellow-500" /> Clima Geral</h3>
                 <div className={`text-5xl font-black mb-2 ${enpsScoreCalc === null ? 'text-gray-400' : enpsScoreCalc >= 70 ? 'text-emerald-500' : enpsScoreCalc >= 30 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {enpsScoreCalc === null ? '--' : enpsScoreCalc}
                 </div>
                 <p className="text-sm text-gray-500">Score eNPS baseada em {enpsResults.length} respostas.</p>
              </div>
              <div className="md:col-span-2 bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl">
                 <h3 className="font-bold flex items-center gap-2 mb-6"><Cake className="text-pink-500" /> Celebrações</h3>
                 <div className="space-y-4">
                    {teamMembers.filter(celebratesAnniversary).length > 0 ? (
                      teamMembers.filter(celebratesAnniversary).map(m => (
                        <div key={m.uid} className="flex items-center justify-between p-4 bg-primary-500/5 rounded-2xl border border-primary-500/10">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0">
                                {m.photoURL && <img src={m.photoURL} alt="" className="w-full h-full object-cover" />}
                              </div>
                              <div>
                                <p className="font-bold">{m.displayName}</p>
                                <p className="text-xs text-gray-500">Completando {getTenure(m)}</p>
                              </div>
                           </div>
                        </div>
                      ))
                    ) : <p className="text-center py-10 opacity-30">Nenhuma celebração hoje.</p>}
                 </div>
              </div>
              <div className="md:col-span-3 bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl">
                 <h3 className="font-bold flex items-center gap-2 mb-6"><Users className="text-blue-500" /> No Radar de Onboarding</h3>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {teamMembers.filter(m => (m.onboardingTasks?.length || 0) > 0 && (m.onboardingTasks?.filter(t => t.completed).length || 0) < (m.onboardingTasks?.length || 0)).map(m => (
                      <button key={m.uid} onClick={() => { setSelectedMember(m); setActiveTab('onboarding'); }} className="p-4 bg-gray-100/50 dark:bg-white/5 rounded-2xl border border-transparent hover:border-primary-500 transition-all text-left">
                         <p className="text-xs font-bold truncate">{m.displayName}</p>
                         <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
                           <div className="h-full bg-primary-500" style={{ width: `${Math.round(((m.onboardingTasks?.filter(t => t.completed).length || 0) / (m.onboardingTasks?.length || 1)) * 100)}%` }}></div>
                         </div>
                      </button>
                    ))}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'onboarding' && (
            <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl animate-in slide-in-from-bottom duration-500">
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-1 border-r border-gray-100 dark:border-white/5 pr-4">
                     <p className="text-[10px] font-bold text-gray-400 uppercase mb-4">Em Onboarding</p>
                     <div className="space-y-1">
                        {teamMembers.filter(m => m.onboardingTasks && m.onboardingTasks.length > 0 && m.onboardingTasks.filter(t => t.completed).length < m.onboardingTasks.length).map(m => (
                          <button key={m.uid} onClick={() => setSelectedMember(m)} className={`w-full text-left p-3 rounded-xl transition-all ${selectedMember?.uid === m.uid ? 'bg-primary-500 text-white' : 'hover:bg-white/5 text-sm'}`}>{m.displayName}</button>
                        ))}
                     </div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase mt-8 mb-4">Restante da Equipe</p>
                     <div className="space-y-1">
                        {teamMembers.filter(m => !m.onboardingTasks || m.onboardingTasks.length === 0 || m.onboardingTasks.filter(t => t.completed).length === m.onboardingTasks.length).map(m => (
                          <button key={m.uid} onClick={() => setSelectedMember(m)} className={`w-full text-left p-3 rounded-xl transition-all ${selectedMember?.uid === m.uid ? 'bg-primary-500 text-white' : 'hover:bg-white/5 text-sm'}`}>{m.displayName}</button>
                        ))}
                     </div>
                  </div>
                  <div className="lg:col-span-3">
                     {selectedMember ? (
                       <div>
                          <h3 className="text-xl font-bold mb-6">{selectedMember.displayName}</h3>
                          {isAdminOrGerente && (
                            <div className="flex gap-2 mb-6">
                              <input id="new_ob_task" type="text" placeholder="Nova tarefa..." className="flex-1 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl text-xs" onKeyPress={e => e.key === 'Enter' && addTaskToOnboarding(selectedMember.uid, (e.target as HTMLInputElement).value)} />
                              <button onClick={() => { const i = document.getElementById('new_ob_task') as HTMLInputElement; addTaskToOnboarding(selectedMember.uid, i.value); i.value=''; }} className="px-4 py-2 bg-primary-500 text-white rounded-xl">Add</button>
                            </div>
                          )}
                          <div className="space-y-2">
                             {(selectedMember.onboardingTasks || []).map(t => (
                               <div key={t.id} className="flex items-center gap-3 p-4 bg-white/5 dark:bg-white/5 rounded-2xl border border-white/5">
                                  <div onClick={() => toggleTask(selectedMember.uid, t.id)} className="flex items-center flex-1 gap-3 cursor-pointer">
                                    {t.completed ? <CheckCircle2 className="text-emerald-500" /> : <Circle className="text-gray-400" />}
                                    <span className={t.completed ? 'line-through opacity-40' : ''}>{t.task}</span>
                                  </div>
                                  {isAdminOrGerente && <button onClick={() => removeTaskFromOnboarding(selectedMember.uid, t.id)} className="text-red-500"><Trash2 size={16} /></button>}
                               </div>
                             ))}
                             {!(selectedMember.onboardingTasks?.length) && isAdminOrGerente && <button onClick={() => assignDefaultTemplate(selectedMember.uid)} className="w-full p-8 border-2 border-dashed border-white/10 rounded-3xl text-gray-500 hover:text-primary-500 transition-all font-bold">Iniciar Checklist Padrão</button>}
                          </div>
                       </div>
                     ) : <div className="text-center py-20 text-gray-500">Selecione um membro</div>}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'development' && (
            <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl animate-in slide-in-from-bottom duration-500">
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-1 border-r border-gray-100 dark:border-white/5 pr-4">
                     {teamMembers.map(m => (
                        <button key={m.uid} onClick={() => setSelectedMember(m)} className={`w-full text-left p-3 rounded-xl transition-all ${selectedMember?.uid === m.uid ? 'bg-primary-500 text-white' : 'hover:bg-white/5 text-sm'}`}>{m.displayName}</button>
                     ))}
                  </div>
                  <div className="lg:col-span-3">
                     {selectedMember ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                           {/* Coluna Esquerda: PDI */}
                           <div className="space-y-6">
                              <div className="flex justify-between items-center mb-6">
                                 <h3 className="text-xl font-bold">Plano de Desenvolvimento (PDI)</h3>
                              </div>
                              <PDIKanban 
                                 items={(selectedMember.pdiItems || []) as any} 
                                 orgId={effectiveOrgId} 
                                 userId={selectedMember.uid} 
                              />
                           </div>

                           {/* Coluna Direita: Energy & Skills */}
                           <div className="space-y-6">
                              <EnergyScoreCard userProfile={selectedMember} />
                              <div className="flex justify-between items-center mb-6">
                                 <h3 className="text-xl font-bold">Matriz de Competências</h3>
                                 {isAdminOrGerente && (
                                    <button 
                                       onClick={() => setShowSkillsModal(true)}
                                       className="text-xs font-bold text-primary-500 hover:text-primary-600 transition-all px-3 py-2 bg-primary-500/10 rounded-xl flex items-center gap-2"
                                    >
                                       <Settings size={14} /> Atualizar Matriz
                                    </button>
                                 )}
                              </div>
                              <div className="p-8 bg-white/5 border border-white/5 rounded-3xl min-h-[400px] flex items-center justify-center">
                                 <SkillRadar skills={[
                                    ...(selectedMember.skills?.hard || []).map(s => ({ ...s, type: 'Hard' as const })),
                                    ...(selectedMember.skills?.soft || []).map(s => ({ ...s, type: 'Soft' as const }))
                                 ]} />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="p-4 bg-primary-500/5 border border-primary-500/10 rounded-2xl">
                                    <p className="text-[10px] font-black uppercase text-primary-400 mb-1">Hard Skills</p>
                                    <p className="text-2xl font-black">{selectedMember.skills?.hard?.length || 0}</p>
                                 </div>
                                 <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                                    <p className="text-[10px] font-black uppercase text-emerald-400 mb-1">Soft Skills</p>
                                    <p className="text-2xl font-black">{selectedMember.skills?.soft?.length || 0}</p>
                                 </div>
                              </div>
                           </div>
                        </div>
                      ) : (
                        <div className="text-center py-20 text-gray-500">Selecione um membro</div>
                      )}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'career' && (
            <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl animate-in slide-in-from-bottom duration-500">
               <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold">Jornada do Colaborador</h2>
                  {isAdminOrGerente && <button onClick={() => setShowMilestoneModal(true)} className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-bold shadow-lg">Adicionar Marco</button>}
               </div>
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-1 border-r border-white/5 pr-4">
                     {teamMembers.map(m => (
                        <button key={m.uid} onClick={() => setSelectedMember(m)} className={`w-full text-left p-3 rounded-xl transition-all ${selectedMember?.uid === m.uid ? 'bg-primary-500 text-white' : 'hover:bg-white/5 text-sm'}`}>{m.displayName}</button>
                     ))}
                  </div>
                  <div className="lg:col-span-3">
                      {selectedMember ? <CareerTimeline milestones={selectedMember.careerTimeline || []} /> : <div className="text-center py-20 text-gray-500">Selecione um membro</div>}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'mural' && (
            <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl animate-in fade-in duration-500">
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-1 border-r border-gray-100 dark:border-white/5 pr-4">
                     <p className="text-[10px] font-bold text-gray-400 uppercase mb-4 tracking-widest pl-2">Modo de Visualização</p>
                     <button 
                        onClick={() => setSelectedMember(null)} 
                        className={`w-full text-left p-3 rounded-xl mb-4 flex items-center gap-2 transition-all ${selectedMember === null ? 'bg-purple-600 text-white shadow-lg' : 'hover:bg-white/5 text-sm font-medium'}`}
                     >
                        <Globe size={16} /> 
                        <span>Mural Global (Gestão)</span>
                     </button>
                     
                     <p className="text-[10px] font-bold text-gray-400 uppercase mt-8 mb-4 tracking-widest pl-2">Murais Individuais</p>
                     <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                        {teamMembers.map(m => (
                           <button 
                              key={m.uid} 
                              onClick={() => setSelectedMember(m)} 
                              className={`w-full text-left p-3 rounded-xl transition-all ${selectedMember?.uid === m.uid ? 'bg-primary-500 text-white shadow-lg' : 'hover:bg-white/5 text-sm'}`}
                           >
                              {m.displayName}
                           </button>
                        ))}
                     </div>
                  </div>
                  <div className="lg:col-span-3">
                     <FeedbackBoard userId={selectedMember?.uid} />
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'assets' && (
            <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl animate-in slide-in-from-bottom duration-500">
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-1 border-r border-white/5 pr-4">
                     <button onClick={() => setSelectedMember(null)} className={`w-full text-left p-3 rounded-xl mb-4 ${selectedMember === null ? 'bg-primary-500 text-white' : 'hover:bg-white/5 text-sm'}`}>Todos os Ativos</button>
                     {teamMembers.map(m => (
                        <button key={m.uid} onClick={() => setSelectedMember(m)} className={`w-full text-left p-3 rounded-xl transition-all ${selectedMember?.uid === m.uid ? 'bg-primary-500 text-white' : 'hover:bg-white/5 text-sm'}`}>{m.displayName}</button>
                     ))}
                  </div>
                  <div className="lg:col-span-3"><AssetManager userId={selectedMember?.uid} /></div>
               </div>
            </div>
          )}

          {activeTab === 'vacations' && (
            <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl">
               <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold">Ausências & Férias</h2>
                  <button onClick={() => setShowVacationModal(true)} className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-bold">Solicitar</button>
               </div>
               
               <div className="space-y-12">
                 {/* Seção de Pendências */}
                 <div>
                    <h3 className="text-xs font-black uppercase text-amber-500 mb-6 tracking-widest flex items-center gap-2">
                       <AlertTriangle size={14} /> Solicitações Pendentes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       {vacations.filter(v => v.status === 'Pendente').map(v => (
                         <div key={v.id} className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-3xl relative group shadow-xl">
                            <div className="flex justify-between mb-4">
                               <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500/10 text-amber-500">{v.reason}</span>
                            </div>
                            <p className="font-bold text-sm mb-2">{teamProfiles.find(p => p.uid === v.userId)?.displayName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 italic">"{v.description}"</p>
                            <div className="flex justify-between text-[10px] py-2 border-t border-white/5 font-mono">
                               <span>{v.start}</span><span>{v.end}</span>
                            </div>
                            {isAdminOrGerente && (
                              <div className="mt-4 flex gap-2">
                                 <button onClick={() => updateVacationStatus(v, 'Aprovado')} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-[10px] font-bold shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform">Aprovar</button>
                                 <button onClick={() => updateVacationStatus(v, 'Recusado')} className="flex-1 py-2 bg-red-500/10 text-red-500 rounded-lg text-[10px] font-bold hover:bg-red-500/20 transition-colors">Recusar</button>
                              </div>
                            )}
                            {isAdminOrGerente && <button onClick={() => deleteVacation(v.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500"><Trash2 size={12} /></button>}
                         </div>
                       ))}
                       {vacations.filter(v => v.status === 'Pendente').length === 0 && (
                         <div className="md:col-span-3 py-10 text-center opacity-30 text-sm border-2 border-dashed border-white/5 rounded-3xl">Nenhuma solicitação pendente no momento.</div>
                       )}
                    </div>
                 </div>

                 {/* Seção de Histórico */}
                 {vacations.filter(v => v.status !== 'Pendente').length > 0 && (
                   <div className="pt-8 border-t border-white/5">
                      <h3 className="text-xs font-black uppercase text-gray-500 mb-6 tracking-widest flex items-center gap-2">
                        <Clock size={14} /> Histórico de Ausências
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                         {vacations.filter(v => v.status !== 'Pendente').map(v => (
                           <div key={v.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl opacity-80 group hover:opacity-100 transition-all">
                              <div className="flex justify-between mb-2">
                                 <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${v.status === 'Aprovado' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{v.status}</span>
                                 <span className="text-[8px] text-gray-500">{v.reason}</span>
                              </div>
                              <p className="font-bold text-xs truncate mb-1">{teamProfiles.find(p => p.uid === v.userId)?.displayName}</p>
                              <p className="text-[10px] text-gray-400 line-clamp-1 mb-3 italic">"{v.description}"</p>
                              <div className="flex justify-between text-[10px] text-gray-500 border-t border-white/5 pt-2">
                                 <span>{v.start}</span><span>{v.end}</span>
                              </div>
                             {isAdminOrGerente && <button onClick={() => deleteVacation(v.id)} className="mt-2 text-[8px] text-red-500/40 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 uppercase font-black">Remover do Histórico</button>}
                           </div>
                         ))}
                      </div>
                   </div>
                 )}
               </div>
            </div>
          )}
          {activeTab === 'expediente' && (
            <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Status Atual e Timer */}
                <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between min-h-[180px]">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Tempo Hoje</span>
                    <h3 className="text-3xl font-black font-mono tracking-tight text-gray-900 dark:text-white">
                      {formatDuration(elapsedToday)}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      !todayLog
                        ? 'bg-gray-400'
                        : todayLog.status === 'active'
                        ? 'bg-emerald-500 animate-pulse'
                        : todayLog.status === 'paused'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`} />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      {!todayLog
                        ? 'Fora de Expediente'
                        : todayLog.status === 'active'
                        ? 'Ativo & Trabalhando'
                        : todayLog.status === 'paused'
                        ? 'Em Intervalo (Pausa)'
                        : 'Expediente Concluído'}
                    </span>
                  </div>
                </div>

                {/* Card 2: Horas Líquidas no Mês */}
                <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between min-h-[180px]">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Total Líquido do Mês</span>
                    <h3 className="text-3xl font-black font-mono tracking-tight text-primary-500">
                      {(() => {
                        const totalMs = myTimeLogs.reduce((acc, curr) => acc + (curr.totalDuration || 0), 0);
                        const totalHours = Math.floor(totalMs / (1000 * 60 * 60));
                        const totalMins = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
                        return `${totalHours}h ${totalMins}m`;
                      })()}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-400">Total acumulado de horas produtivas registradas.</p>
                </div>

                {/* Card 3: Pausas Feitas Hoje */}
                <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between min-h-[180px]">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Pausas Hoje</span>
                    <h3 className="text-3xl font-black text-amber-500">
                      {todayLog?.pauses?.length || 0}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-400">Intervalos de almoço, café ou reuniões do dia.</p>
                </div>
              </div>

              {/* Gráfico de Horas Semanais */}
              <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl">
                <h3 className="font-bold flex items-center gap-2 mb-6"><TrendingUp className="text-primary-500" /> Histórico Semanal de Horas</h3>
                <div className="h-64 flex items-end gap-4 md:gap-8 pt-8 px-4 border-b border-white/5">
                  {(() => {
                    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                    const logsByDay = new Array(7).fill(0);
                    
                    // Pega os logs da semana atual (últimos 7 dias)
                    const now = new Date();
                    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); // Domingo
                    
                    myTimeLogs.forEach(log => {
                      const logDate = parseISO(log.date);
                      const diff = Math.floor((logDate.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24));
                      if (diff >= 0 && diff < 7) {
                        logsByDay[diff] = log.totalDuration;
                      }
                    });

                    const maxDuration = Math.max(...logsByDay, 1000 * 60 * 60 * 8); // Pelo menos 8 horas como escala máxima

                    return logsByDay.map((duration, idx) => {
                      const percentage = Math.min((duration / maxDuration) * 100, 100);
                      const hours = (duration / (1000 * 60 * 60)).toFixed(1);
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition-all font-mono pointer-events-none shrink-0 z-20">
                            {hours}h
                          </div>
                          {/* Barra do Gráfico */}
                          <div 
                            style={{ height: `${percentage}%` }}
                            className={`w-full max-w-[40px] rounded-t-xl transition-all duration-500 ${
                              duration === 0 
                                ? 'bg-white/5' 
                                : idx === new Date().getDay()
                                ? 'bg-gradient-to-t from-primary-600 to-primary-400 shadow-lg shadow-primary-500/20'
                                : 'bg-gradient-to-t from-zinc-800 to-zinc-600 dark:from-white/10 dark:to-white/20'
                            }`}
                          />
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">{daysOfWeek[idx]}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Tabela de Logs de Ponto */}
              <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl">
                <h3 className="font-bold flex items-center gap-2 mb-6"><Clock className="text-pink-500" /> Registro de Presenças do Mês</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-xs text-gray-400 font-black uppercase tracking-widest">
                        <th className="py-4 px-2">Data</th>
                        <th className="py-4 px-2">Entrada</th>
                        <th className="py-4 px-2">Saída</th>
                        <th className="py-4 px-2">Intervalos/Pausas</th>
                        <th className="py-4 px-2">Total Líquido</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {myTimeLogs.map(log => (
                        <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4 px-2 font-bold">{format(parseISO(log.date), 'dd/MM/yyyy')}</td>
                          <td className="py-4 px-2 font-mono">{format(log.startTime, 'HH:mm:ss')}</td>
                          <td className="py-4 px-2 font-mono">
                            {log.endTime ? format(log.endTime, 'HH:mm:ss') : <span className="text-emerald-500 font-bold">Ativo</span>}
                          </td>
                          <td className="py-4 px-2">
                            {log.pauses.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 font-mono">
                                {log.pauses.map((p, idx) => (
                                  <span key={idx} className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 flex items-center gap-1 font-mono">
                                    {p.type === 'lunch' ? '🍱 Almoço' : p.type === 'meeting' ? '👥 Reunião' : '🕒 Ausente'}:{' '}
                                    {format(p.startTime, 'HH:mm')} - {p.endTime ? format(p.endTime, 'HH:mm') : '...'}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500 italic">Sem intervalos</span>
                            )}
                          </td>
                          <td className="py-4 px-2 font-mono font-bold text-primary-500">
                            {formatDuration(log.totalDuration || calculateNetDuration(log.startTime, log.endTime, log.pauses))}
                          </td>
                        </tr>
                      ))}
                      {myTimeLogs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center opacity-30 italic text-sm">
                            Nenhum registro de expediente encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'climate' && isAdminOrGerente && (
            <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 shadow-xl">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div>
                     <h3 className="font-bold mb-6 flex items-center gap-2"><Settings size={18} /> Configurar eNPS</h3>
                     <div className="space-y-4">
                        <textarea value={enpsQuestion} onChange={e => setEnpsQuestion(e.target.value)} className="w-full h-24 bg-white/5 border border-white/10 p-4 rounded-2xl text-sm" placeholder="Pergunta da pesquisa..." />
                        <select value={enpsFrequency} onChange={e => setEnpsFrequency(e.target.value as any)} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-sm">
                           <option value="mensal">Mensal</option>
                           <option value="trimestral">Trimestral</option>
                        </select>
                        <button onClick={async () => { if(!effectiveOrgId) return; await setDoc(doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences'), { enpsQuestion, enpsFrequency }, { merge: true }); toast.success('Salvo!'); }} className="w-full py-4 bg-primary-500 text-white rounded-2xl font-bold">Salvar</button>
                     </div>
                  </div>
                  <div>
                     <h3 className="font-bold mb-6 flex items-center gap-2"><MessageSquare size={18} /> Feedbacks Anônimos</h3>
                     <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {enpsResults.filter(r => r.comment).map(r => (
                          <div key={r.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                             <div className="flex justify-between mb-2"><span className="text-xs font-bold text-primary-500">Nota: {r.score}</span></div>
                             <p className="text-sm italic">"{r.comment}"</p>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>

        {showVacationModal && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#0a0a0a] rounded-[2rem] p-8 w-full max-w-lg">
                 <div className="flex justify-between mb-6"><h3 className="text-xl font-bold">Nova Solicitação</h3><button onClick={() => setShowVacationModal(false)}><X /></button></div>
                 <form onSubmit={handleAddVacation} className="space-y-4">
                    <select required className="w-full bg-gray-100 dark:bg-white/5 p-4 rounded-xl" value={newVacation.userId || ''} onChange={e => setNewVacation({...newVacation, userId: e.target.value})}><option value="">Membro...</option>{teamProfiles.map(p => <option key={p.uid} value={p.uid}>{p.displayName}</option>)}</select>
                    <select required className="w-full bg-gray-100 dark:bg-white/5 p-4 rounded-xl" value={newVacation.reason || ''} onChange={e => setNewVacation({...newVacation, reason: e.target.value as any, status: 'Pendente', type: e.target.value === 'Férias' ? 'Férias' : 'Ausência'})}><option value="">Motivo...</option><option value="Férias">Férias</option><option value="Motivo Médico">Médico</option><option value="Licença Maternidade/Paternidade">Licença Maternidade/Paternidade</option><option value="Outro">Outro/Folga</option></select>
                    <textarea required placeholder="Descreva o motivo detalhado..." className="w-full bg-gray-100 dark:bg-white/5 p-4 rounded-xl h-32 text-sm" value={newVacation.description || ''} onChange={e => setNewVacation({...newVacation, description: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4"><input type="date" className="p-4 rounded-xl bg-gray-100 dark:bg-white/5" value={newVacation.start} onChange={e => setNewVacation({...newVacation, start: e.target.value})} /><input type="date" className="p-4 rounded-xl bg-gray-100 dark:bg-white/5" value={newVacation.end} onChange={e => setNewVacation({...newVacation, end: e.target.value})} /></div>
                    <button className="w-full py-4 bg-primary-500 text-white rounded-xl font-bold">Enviar Solicitação</button>
                 </form>
              </div>
           </div>
        )}

        {showRejectionModal && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#0a0a0a] rounded-[2rem] p-8 w-full max-w-md shadow-2xl border border-white/5">
                 <div className="flex justify-between mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                       <AlertTriangle className="text-amber-500" size={20} /> Justificar Recusa
                    </h3>
                    <button onClick={() => setShowRejectionModal(false)}><X /></button>
                 </div>
                 <p className="text-xs text-gray-400 mb-4 italic">Informe o motivo para que o colaborador saiba por que a solicitação não foi aprovada.</p>
                 <textarea 
                    required 
                    placeholder="Ex: Equipe reduzida no período ou necessidade de escala..." 
                    className="w-full bg-gray-100 dark:bg-white/5 p-4 rounded-xl h-32 text-sm focus:ring-2 ring-primary-500 transition-all outline-none" 
                    value={rejectionReason} 
                    onChange={e => setRejectionReason(e.target.value)} 
                 />
                 <div className="flex gap-2 mt-6">
                    <button onClick={() => setShowRejectionModal(false)} className="flex-1 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">Cancelar</button>
                    <button 
                       onClick={handleConfirmRejection} 
                       disabled={!rejectionReason.trim()}
                       className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                    >
                       Confirmar Recusa
                    </button>
                 </div>
              </div>
           </div>
        )}

        {showDeleteConfirm && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#0a0a0a] rounded-[2rem] p-8 text-center max-w-sm">
                 <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
                 <h3 className="font-bold mb-2">Excluir?</h3>
                 <div className="flex gap-2 mt-6"><button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 border border-white/10 rounded-xl">Não</button><button onClick={confirmDeleteVacation} className="flex-1 py-3 bg-red-500 text-white rounded-xl">Sim</button></div>
              </div>
           </div>
        )}

        {showMilestoneModal && (
          <AddMilestoneModal 
            isOpen={showMilestoneModal}
            onClose={() => setShowMilestoneModal(false)} 
            targetUserId={selectedMember?.uid || ''}
            onSuccess={() => { setShowMilestoneModal(false); toast.success('Adicionado!'); }}
          />
        )}

        {showSkillsModal && selectedMember && (
          <EditSkillsModal
            isOpen={showSkillsModal}
            onClose={() => setShowSkillsModal(false)}
            targetUserId={selectedMember.uid}
            initialSkills={selectedMember.skills || { hard: [], soft: [] }}
            onSuccess={() => { setShowSkillsModal(false); toast.success('Matriz atualizada!'); }}
          />
        )}
      </div>
    </div>
  );
}
