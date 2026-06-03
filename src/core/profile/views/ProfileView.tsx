import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User as UserIcon, Mail, Phone, Instagram, Linkedin, 
  ChevronLeft, Edit3, Save, X, Briefcase, Info, 
  Shield, Globe, MapPin, Loader2, Camera, Cake, Calendar,
  Target, ChevronDown, CheckCircle2, Circle, Star, Wallet, TrendingUp, Clock, Plane, AlertTriangle, CalendarDays, DollarSign, Pencil
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useDialog } from '@auth/contexts/DialogContext';
import { useCRM } from '@crm/contexts/CRMContext';
import AvailabilityCalendar from '@people/components/AvailabilityCalendar';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, setDoc, query, where, onSnapshot } from 'firebase/firestore';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { usePermissions } from '@auth/hooks/usePermissions';
import { VacationPeriod } from '@/types/people';
import { UserProfile } from '@/types';
import { PDICategory } from '@/types/people';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { SaveButton } from '@/shared/components/SaveButton';
import { format } from 'date-fns';
import MoodTracker from '@people/components/MoodTracker';
import SkillRadarChart from '@people/components/SkillRadarChart';
import CareerTimeline from '@people/components/CareerTimeline';
import FeedbackMural from '@people/components/FeedbackMural';
import InventorySection from '@people/components/InventorySection';
import { EnergyScoreCard } from '@people/components/EnergyScoreCard';
import ProfileContractsTab from './ProfileContractsTab';
import { useCRMStore } from '@/store/useCRMStore';
import { TimeLog, calculateNetDuration, getLocalDateString } from '@/store/slices/timeTrackingSlice';
import { parseISO } from 'date-fns';
import { PDIKanban } from '@people/components/PDIKanban';
import { 
  Plus, 
  Trash2, 
  Heart, 
  ShieldAlert, 
  Wrench, 
  Award,
  Box,
  MessageCircle,
  History,
  X as XIcon,
  Inbox,
  BellRing
} from 'lucide-react';
import AddFeedbackModal from '@people/components/AddFeedbackModal';
import AddAssetModal from '@people/components/AddAssetModal';
import AddMilestoneModal from '@people/components/AddMilestoneModal';
import EditSkillsModal from '@people/components/EditSkillsModal';
import { updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

const formatToBrasiliaTime = (timestamp: number, formatStr: 'HH:mm:ss' | 'HH:mm' | 'dd/MM/yyyy'): string => {
  const date = new Date(timestamp);
  if (formatStr === 'HH:mm:ss') {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  }
  if (formatStr === 'HH:mm') {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  }
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

const formatLocalDateStr = (dateStr: string): string => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export default function ProfileView() {
  const { uid } = useParams();
  const { user, userProfile: currentUserProfile, refreshProfile } = useAuth();
  const { supportRequests, vacations, handleSaveVacationRequest, handleDeleteVacationRequest, teamProfiles } = useCRM();
  const { confirm } = useDialog();
  const navigate = useNavigate();

  // Métrica CSAT Individual (Segura)
  const memberRatedRequests = Array.isArray(supportRequests) 
    ? supportRequests.filter(req => req && req.assignedTo === uid && req.status === 'concluido' && typeof req.csatScore === 'number')
    : [];
    
  const csatAvg = memberRatedRequests.length > 0
    ? (memberRatedRequests.reduce((acc, curr) => acc + (curr.csatScore || 0), 0) / memberRatedRequests.length).toFixed(1)
    : null;
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [superior, setSuperior] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'pdi' | 'comissoes' | 'inventory' | 'feedbacks' | 'history' | 'alerts' | 'vacations' | 'availability' | 'expediente' | 'contracts'>('info');

  // Lógica de Ponto Eletrônico Individual (Meu Expediente)
  const [myTimeLogs, setMyTimeLogs] = useState<TimeLog[]>([]);
  const todayLocalDateStr = getLocalDateString();
  const todayLog = myTimeLogs.find(l => l.date === todayLocalDateStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => format(new Date(), 'yyyy-MM'));

  const getMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = format(d, 'yyyy-MM');
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
      options.push({ value, label: capitalizedLabel });
    }
    return options;
  };
  const [elapsedToday, setElapsedToday] = useState(0);
  const myMonthlyLogs = myTimeLogs.filter(l => l.date.startsWith(selectedMonth));

  useEffect(() => {
    if (!uid || !currentUserProfile?.orgId) return;
    const q = query(
      collection(db, 'organizations', currentUserProfile.orgId, 'time_logs'),
      where('userId', '==', uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const logs = snap.docs.map(d => d.data() as TimeLog);
      logs.sort((a, b) => b.startTime - a.startTime);
      setMyTimeLogs(logs);
    });
    return () => unsub();
  }, [uid, currentUserProfile?.orgId]);

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
  const { businessAlerts = [], unreadAlertsCount = 0, markAlertAsRead } = useAuth();
  const { commissions = [] } = useCRM();
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [showAddFeedbackModal, setShowAddFeedbackModal] = useState(false);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  const [showEditSkillsModal, setShowEditSkillsModal] = useState(false);

  // Estados para edição de Logs de Ponto (Expediente) pelo Admin
  const [editingTimeLog, setEditingTimeLog] = useState<TimeLog | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editStartTime, setEditStartTime] = useState<string>('');
  const [editEndTime, setEditEndTime] = useState<string>('');
  
  const [newVacation, setNewVacation] = useState<Partial<VacationPeriod>>({
    type: 'Férias',
    status: 'Pendente',
    start: '',
    end: '',
    reason: 'Férias',
    description: ''
  });


  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    displayName: '',
    jobTitle: '',
    bio: '',
    phoneNumber: '',
    instagram: '',
    linkedin: '',
    photoURL: '',
    birthDate: '',
    startDate: '',
    contractType: 'PJ' as 'PJ' | 'CLT',
    workSchedule: {
      daysOfWeek: [1, 2, 3, 4, 5],
      entryTime: '09:00',
      exitTime: '18:00'
    },
    salary: 0,
    healthInsurance: 0,
    mealVoucher: 0,
    transportVoucher: 0,
    homeOfficeAux: 0,
    benefitDeductions: {
      healthInsuranceCopay: 0,
      mealVoucherDiscount: 0,
      transportVoucherDiscount: 0
    },
    pixKeyType: '' as 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM' | '',
    pixKey: '',
    bankAccount: {
      bankCode: '',
      bankName: '',
      agency: '',
      account: '',
      accountDigit: '',
      accountType: 'CHECKING' as 'CHECKING' | 'SAVINGS',
      holderName: '',
      holderCpfCnpj: ''
    },
    resignationDetails: {
      resignationDate: '',
      reason: 'dismissal_without_cause' as 'dismissal_without_cause' | 'dismissal_with_cause' | 'employee_resignation' | 'pj_termination',
      noticeType: 'none' as 'worked' | 'indemnified' | 'none',
      penaltyPercentage: 0
    }
  });
  const [userAssets, setUserAssets] = useState<any[]>([]);
  const [activeAdvance, setActiveAdvance] = useState<any | null>(null);
  const [isRequestingAdvance, setIsRequestingAdvance] = useState(false);
  const { hasPermission } = usePermissions();

  const isOwnProfile = user?.uid === uid;
  const isAdmin = hasPermission('MANAGE_SETTINGS');
  const isManagement = hasPermission('MANAGE_TEAM');
  const canEdit = isOwnProfile || isManagement || isAdmin;
  const canViewFinancials = isOwnProfile || isAdmin || isManagement;
  const canEditFinancials = isAdmin || isManagement;

  // Redefine a aba ativa para 'info' se o colaborador acessar o perfil de outra pessoa estando em uma aba pessoal protegida
  useEffect(() => {
    if (!isOwnProfile && activeTab !== 'info' && activeTab !== 'availability') {
      setActiveTab('info');
    }
  }, [isOwnProfile, uid, activeTab]);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const docRef = doc(db, 'profiles', uid);
    
    const unsubscribe = onSnapshot(docRef, async (snap) => {
      try {
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setProfile(data);
          setError(null);
          
          setIsEditing(editing => {
            if (!editing) {
              setFormData({
                displayName: data.displayName || '',
                jobTitle: data.jobTitle || '',
                bio: data.bio || '',
                phoneNumber: data.phoneNumber || '',
                instagram: data.instagram || '',
                linkedin: data.linkedin || '',
                photoURL: data.photoURL || '',
                birthDate: data.birthDate || '',
                startDate: data.startDate || '',
                contractType: data.contractType || 'PJ',
                workSchedule: data.workSchedule || {
                  daysOfWeek: [1, 2, 3, 4, 5],
                  entryTime: '09:00',
                  exitTime: '18:00'
                },
                salary: data.salary || 0,
                healthInsurance: data.healthInsurance || 0,
                mealVoucher: data.mealVoucher || 0,
                transportVoucher: data.transportVoucher || 0,
                homeOfficeAux: data.homeOfficeAux || 0,
                benefitDeductions: {
                  healthInsuranceCopay: data.benefitDeductions?.healthInsuranceCopay ?? 0,
                  mealVoucherDiscount: data.benefitDeductions?.mealVoucherDiscount ?? 0,
                  transportVoucherDiscount: data.benefitDeductions?.transportVoucherDiscount ?? 0
                },
                pixKeyType: data.pixKeyType || '',
                pixKey: data.pixKey || '',
                bankAccount: {
                  bankCode: data.bankAccount?.bankCode ?? '',
                  bankName: data.bankAccount?.bankName ?? '',
                  agency: data.bankAccount?.agency ?? '',
                  account: data.bankAccount?.account ?? '',
                  accountDigit: data.bankAccount?.accountDigit ?? '',
                  accountType: data.bankAccount?.accountType ?? 'CHECKING',
                  holderName: data.bankAccount?.holderName ?? '',
                  holderCpfCnpj: data.bankAccount?.holderCpfCnpj ?? ''
                },
                resignationDetails: {
                  resignationDate: data.resignationDetails?.resignationDate ?? '',
                  reason: data.resignationDetails?.reason ?? 'dismissal_without_cause',
                  noticeType: data.resignationDetails?.noticeType ?? 'none',
                  penaltyPercentage: data.resignationDetails?.penaltyPercentage ?? 0
                }
              });
            }
            return editing;
          });

          // Buscar superior
          if (data.reportsTo) {
            const superiorRef = doc(db, 'profiles', data.reportsTo);
            const superiorSnap = await getDoc(superiorRef);
            if (superiorSnap.exists()) {
              setSuperior(superiorSnap.data() as UserProfile);
            }
          } else {
            setSuperior(null);
          }
        } else {
          setError('Perfil não encontrado no sistema.');
          toast.error('Perfil não encontrado');
          setTimeout(() => navigate('/team'), 3000);
        }
      } catch (err: any) {
        console.error(err);
        setError(`Erro ao carregar dados: ${err.message || 'Falha de conexão'}`);
        toast.error('Erro ao carregar perfil');
      } finally {
        setLoading(false);
      }
    }, (err) => {
      console.error(err);
      setError(`Erro ao carregar dados: ${err.message || 'Falha de conexão'}`);
      toast.error('Erro ao carregar perfil');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid, navigate]);

  // Listener para ativos em tempo real
  useEffect(() => {
    if (!uid || !currentUserProfile?.orgId) return;

    const q = query(
      collection(db, 'organizations', currentUserProfile.orgId, 'assets'),
      where('assignedTo', '==', uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setUserAssets(loaded);
    });

    return () => unsubscribe();
  }, [uid, currentUserProfile?.orgId]);

  // Listener para adiantamento salarial ativo no mês atual
  useEffect(() => {
    if (!uid || !currentUserProfile?.orgId) return;
    const now = new Date();
    // Ajuste de Brasília (UTC-3)
    const brTime = new Date(now.getTime() - 3 * 3600 * 1000);
    const year = brTime.getUTCFullYear();
    const month = String(brTime.getUTCMonth() + 1).padStart(2, '0');
    const currentMonthStr = `${year}-${month}`;

    const q = query(
      collection(db, 'organizations', currentUserProfile.orgId, 'salary_advances'),
      where('userId', '==', uid),
      where('month', '==', currentMonthStr)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setActiveAdvance({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setActiveAdvance(null);
      }
    }, (error) => {
      console.error('[ProfileView] Erro ao escutar adiantamentos salariais:', error);
    });

    return () => unsubscribe();
  }, [uid, currentUserProfile?.orgId]);

  const handleRefresh = async () => {
    if (!uid) return;
    const docRef = doc(db, 'profiles', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      setProfile(snap.data() as UserProfile);
    }
  };

  const handleRemoveAsset = async (assetId: string) => {
    if (!profile || !uid) return;
    const ok = await confirm({
      title: 'Remover Equipamento',
      message: 'Deseja remover este equipamento deste colaborador?',
      confirmText: 'Sim, remover',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/team_handler?action=remove-asset`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUid: uid,
          assetId
        })
      });

      if (!res.ok) throw new Error('Falha ao remover equipamento');

      toast.success('Equipamento removido');
      handleRefresh();
    } catch (error) {
      toast.error('Erro ao remover equipamento');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploading(true);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 10MB");
      
      const imageUrl = await uploadToCloudinary(file);
      
      setFormData(prev => ({ ...prev, photoURL: imageUrl }));
      toast.success('Foto carregada! Clique em "Salvar Alterações" para confirmar.');
    } catch (error: any) {
      toast.error(`Erro ao processar imagem: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      const token = await user?.getIdToken();
      
      // Sanitizar dados para o backend (remover campos vazios/inválidos para passar no esquema Zod)
      const sanitizedProfileData = { ...formData };
      
      // 1. Tratar pixKeyType e pixKey vazios
      if (!sanitizedProfileData.pixKeyType || (sanitizedProfileData.pixKeyType as string) === '') {
        delete (sanitizedProfileData as any).pixKeyType;
      }
      if (!sanitizedProfileData.pixKey || sanitizedProfileData.pixKey.trim() === '') {
        delete (sanitizedProfileData as any).pixKey;
      }
      
      // 2. Tratar bankAccount vazio
      const bank = sanitizedProfileData.bankAccount;
      if (bank) {
        const hasAnyBankData = 
          (bank.bankCode && bank.bankCode.trim() !== '') ||
          (bank.agency && bank.agency.trim() !== '') ||
          (bank.account && bank.account.trim() !== '') ||
          (bank.holderName && bank.holderName.trim() !== '');
          
        if (!hasAnyBankData) {
          sanitizedProfileData.bankAccount = null;
        } else {
          sanitizedProfileData.bankAccount = {
            bankCode: bank.bankCode || '',
            bankName: bank.bankName || '',
            agency: bank.agency || '',
            account: bank.account || '',
            accountDigit: bank.accountDigit || '',
            accountType: bank.accountType || 'CHECKING',
            holderName: bank.holderName || '',
            holderCpfCnpj: bank.holderCpfCnpj || ''
          };
        }
      }
      
      // 3. Tratar resignationDetails vazio
      const resignation = sanitizedProfileData.resignationDetails;
      if (resignation && (!resignation.resignationDate || resignation.resignationDate.trim() === '')) {
        sanitizedProfileData.resignationDetails = null;
      }

      const res = await fetch('/api/team/update-profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUid: uid,
          profileData: sanitizedProfileData
        })
      });

      if (!res.ok) throw new Error('Erro ao salvar perfil');
      
      // Pequeno atraso para a animação do botão ser percebida
      setTimeout(() => {
        setIsEditing(false);
      }, 1000);
      
      if (isOwnProfile) refreshProfile();
      
      // Atualizar estado local
      setProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          ...formData,
          pixKeyType: formData.pixKeyType === '' ? undefined : formData.pixKeyType
        };
      });
    } catch (error) {
      throw error;
    }
  };

  const confirmDeleteVacation = async (vacationId: string) => {
    const ok = await confirm({
      title: 'Excluir Registro de Ausência',
      message: 'Esta ação removerá permanentemente esta ausência do histórico do colaborador e de gestão. Deseja continuar?',
      confirmText: 'Sim, excluir',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      await handleDeleteVacationRequest(vacationId);
      toast.success('Ausência excluída com sucesso!');
    } catch (e) {
      console.error("Erro ao excluir ausência no Perfil:", e);
      toast.error('Erro ao excluir ausência');
    }
  };

   const handleAddVacation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !newVacation.start || !newVacation.end || !newVacation.description?.trim()) {
      toast.error('Preencha todos os campos, incluindo a justificativa!');
      return;
    }

    try {
      await handleSaveVacationRequest({
        ...newVacation,
        userId: uid
      });
      setShowVacationModal(false);
      setNewVacation({
        type: 'Férias',
        status: 'Pendente',
        start: '',
        end: '',
        reason: 'Férias',
        description: ''
      });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar solicitação.');
    }
  };

  const handleOpenEditLog = (log: TimeLog) => {
    setEditingTimeLog(log);
    setEditDate(log.date);
    setEditStartTime(formatToBrasiliaTime(log.startTime, 'HH:mm'));
    setEditEndTime(log.endTime ? formatToBrasiliaTime(log.endTime, 'HH:mm') : '');
  };

  const handleSaveEditedLog = async () => {
    if (!editingTimeLog || !currentUserProfile?.orgId || !user?.uid) return;

    const [startH, startM] = editStartTime.split(':').map(Number);
    const [yr, mo, dy] = editDate.split('-').map(Number);
    
    const startDt = new Date(yr, mo - 1, dy, startH, startM, 0, 0);
    const newStartTime = startDt.getTime();
    
    let newEndTime: number | undefined = undefined;
    
    if (editEndTime) {
      const [endH, endM] = editEndTime.split(':').map(Number);
      const endDt = new Date(yr, mo - 1, dy, endH, endM, 0, 0);
      newEndTime = endDt.getTime();
    }

    const newDuration = calculateNetDuration(newStartTime, newEndTime, editingTimeLog.pauses);
    const logRef = doc(db, 'organizations', currentUserProfile.orgId, 'time_logs', editingTimeLog.id);
    
    await setDoc(logRef, {
      date: editDate,
      startTime: newStartTime,
      endTime: newEndTime || null,
      status: newEndTime ? 'completed' : 'active',
      totalDuration: newDuration,
      updatedAt: Date.now(),
      editedByAdmin: true,
      adminId: user.uid,
      editedAt: Date.now()
    }, { merge: true });

    // Pequeno atraso para a animação do botão ser percebida
    setTimeout(() => {
      setEditingTimeLog(null);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-transparent p-6 text-center">
        <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 text-rose-500 border border-rose-500/20 shadow-lg shadow-rose-500/5">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Ops! Algo deu errado</h2>
        <p className="text-gray-500 max-w-sm mb-8">{error}</p>
        <button 
          onClick={() => navigate('/team')}
          className="px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-bold transition-all shadow-xl shadow-primary-500/20 active:scale-95 flex items-center gap-2"
        >
          <ChevronLeft size={18} />
          Voltar para a Equipe
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-transparent p-6 text-center">
        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 text-amber-500 border border-amber-500/20">
          <UserIcon size={32} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Perfil não localizado</h2>
        <p className="text-gray-500 max-w-sm mb-8">Não conseguimos encontrar as informações deste colaborador no momento.</p>
        <button 
          onClick={() => navigate('/team')}
          className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-700 dark:text-white rounded-2xl font-bold transition-all"
        >
          Explorar Time
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Navigation */}
        <div className="flex items-center justify-between p-2">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center text-sm font-medium text-gray-500 hover:text-primary-500 transition-colors bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10"
          >
            <ChevronLeft size={18} className="mr-1" />
            Voltar
          </button>
          
          <div className="flex items-center gap-3">
            {isOwnProfile && (
              <button 
                onClick={() => setShowVacationModal(true)}
                className="px-6 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 font-bold border border-amber-500/20 transition-all flex items-center gap-2"
              >
                <Calendar size={18} />
                Solicitar Ausência
              </button>
            )}
            {canEdit && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-bold shadow-lg shadow-primary-500/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <Edit3 size={18} />
                Editar Perfil
              </button>
            )}
          </div>
        </div>



        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Avatar & Basic Info */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-100 dark:bg-white/5 backdrop-blur-3xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-xl text-center relative overflow-hidden"
            >
              {/* Profile Image */}
              <div className="relative inline-block mb-6">
                <div className="w-40 h-40 rounded-full border-4 border-primary-500/20 p-1 bg-white/5 backdrop-blur-xl relative">
                  <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 dark:bg-white/5 flex items-center justify-center text-5xl font-bold font-display text-gray-900 dark:text-white">
                    {formData.photoURL ? (
                      <img src={formData.photoURL} alt={formData.displayName} className="w-full h-full object-cover" />
                    ) : (
                      formData.displayName?.[0] || <UserIcon />
                    )}
                  </div>
                  {isEditing && (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="absolute bottom-0 right-0 p-3 rounded-full bg-primary-500 text-white shadow-xl hover:bg-primary-600 transition-all active:scale-90"
                    >
                      {uploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                    </button>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>

              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1">{profile.displayName}</h2>
              {profile.activeTitle && (
                <div className="mb-2">
                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.15)] inline-block">
                    🎮 {profile.activeTitle}
                  </span>
                </div>
              )}
              <p className="text-sm font-bold text-primary-500 uppercase tracking-widest mb-4">{profile.jobTitle || (typeof profile.role === 'string' ? profile.role : profile.role?.name)}</p>
              
              <div className="flex items-center justify-center gap-4 mb-8">
                {profile.linkedin && (
                  <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-2xl hover:bg-[#0077b5] text-gray-400 hover:text-white transition-all">
                    <Linkedin size={20} />
                  </a>
                )}
              </div>

              {/* CSAT Individual - Visível apenas para gestão e atendimento */}
              {(() => {
                const canSeePerformance = hasPermission('MANAGE_TEAM') || hasPermission('MANAGE_SUPPORT');
                
                const showCSAT = 
                  canSeePerformance || 
                  ['suporte', 'atendimento', 'sucesso', 'support', 'success', 'service'].some(keyword => 
                    profile?.jobTitle?.toLowerCase().includes(keyword)
                  );

                return showCSAT && csatAvg ? (
                  <div className="mt-8 pt-8 border-t border-gray-100 dark:border-white/5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Média de Satisfação</p>
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={16} className={Number(csatAvg) >= s ? 'fill-amber-500 text-amber-500' : 'text-gray-300 dark:text-white/10'} />
                        ))}
                      </div>
                      <span className="text-2xl font-black text-gray-900 dark:text-white">{csatAvg}</span>
                      <p className="text-[10px] text-gray-500">Baseado em {memberRatedRequests.length} avaliações</p>
                    </div>
                  </div>
                ) : null;
              })()}
            </motion.div>

            {/* Superior Imediato */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-primary-500/5 backdrop-blur-xl border border-primary-500/10 rounded-3xl p-6"
            >
              <h3 className="text-sm font-bold text-primary-500 uppercase tracking-widest mb-4 flex items-center">
                <Shield className="mr-2" size={16} />
                Superior Imediato
              </h3>
              {superior ? (
                <div 
                  onClick={() => navigate(`/profile/${superior.uid}`)}
                  className="flex items-center space-x-3 p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-primary-500/30 cursor-pointer transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/5 flex items-center justify-center text-sm font-bold text-gray-900 dark:text-white overflow-hidden">
                    {superior.photoURL ? <img src={superior.photoURL} alt={superior.displayName} className="w-full h-full object-cover" /> : superior.displayName?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors">{superior.displayName}</p>
                    <p className="text-[10px] text-gray-500">{superior.jobTitle || (typeof superior.role === 'string' ? superior.role : superior.role?.name)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Não vinculado.</p>
              )}
            </motion.div>

            {/* Energy Score do Colaborador */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <EnergyScoreCard userProfile={profile} />
            </motion.div>

            {/* Mood Tracker - Apenas para o próprio perfil */}
            {isOwnProfile && (
              <div className="mt-6">
                <MoodTracker />
              </div>
            )}
          </div>

          {/* Right Column: Tabbed Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-3xl border border-gray-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
              {/* Tabs sem scrollbar feia e com pílula deslizante fluida */}
              <div className="flex gap-2 mb-8 overflow-x-auto custom-scrollbar pb-2.5 scroll-smooth max-w-full">
                <motion.button 
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setActiveTab('info')}
                  className={`relative shrink-0 whitespace-nowrap px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${activeTab === 'info' ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                  {activeTab === 'info' && (
                    <motion.div
                      layoutId="activeProfileTab"
                      className="absolute inset-0 bg-primary-500 rounded-2xl shadow-lg shadow-primary-500/20"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">Informações</span>
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setActiveTab('availability')}
                  className={`relative shrink-0 whitespace-nowrap px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${activeTab === 'availability' ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                  {activeTab === 'availability' && (
                    <motion.div
                      layoutId="activeProfileTab"
                      className="absolute inset-0 bg-primary-500 rounded-2xl shadow-lg shadow-primary-500/20"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">Disponibilidade</span>
                </motion.button>
                {isOwnProfile && (
                  <>
                    <motion.button 
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setActiveTab('pdi')}
                      className={`relative shrink-0 whitespace-nowrap px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${activeTab === 'pdi' ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {activeTab === 'pdi' && (
                        <motion.div
                          layoutId="activeProfileTab"
                          className="absolute inset-0 bg-primary-500 rounded-2xl shadow-lg shadow-primary-500/20"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">Meu PDI</span>
                    </motion.button>
                    <motion.button 
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setActiveTab('inventory')}
                      className={`relative shrink-0 whitespace-nowrap px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${activeTab === 'inventory' ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {activeTab === 'inventory' && (
                        <motion.div
                          layoutId="activeProfileTab"
                          className="absolute inset-0 bg-primary-500 rounded-2xl shadow-lg shadow-primary-500/20"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">Ativos</span>
                    </motion.button>
                    <motion.button 
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setActiveTab('feedbacks')}
                      className={`relative shrink-0 whitespace-nowrap px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${activeTab === 'feedbacks' ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {activeTab === 'feedbacks' && (
                        <motion.div
                          layoutId="activeProfileTab"
                          className="absolute inset-0 bg-primary-500 rounded-2xl shadow-lg shadow-primary-500/20"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">Mural</span>
                    </motion.button>
                    <motion.button 
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setActiveTab('history')}
                      className={`relative shrink-0 whitespace-nowrap px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${activeTab === 'history' ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {activeTab === 'history' && (
                        <motion.div
                          layoutId="activeProfileTab"
                          className="absolute inset-0 bg-primary-500 rounded-2xl shadow-lg shadow-primary-500/20"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">Carreira</span>
                    </motion.button>
                    <motion.button 
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setActiveTab('vacations')}
                      className={`relative shrink-0 whitespace-nowrap px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${activeTab === 'vacations' ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {activeTab === 'vacations' && (
                        <motion.div
                          layoutId="activeProfileTab"
                          className="absolute inset-0 bg-primary-500 rounded-2xl shadow-lg shadow-primary-500/20"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">Ausências</span>
                    </motion.button>
                    <motion.button 
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setActiveTab('alerts')}
                      className={`relative shrink-0 whitespace-nowrap px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${activeTab === 'alerts' ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {activeTab === 'alerts' && (
                        <motion.div
                          layoutId="activeProfileTab"
                          className="absolute inset-0 bg-primary-500 rounded-2xl shadow-lg shadow-primary-500/20"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <span>Alertas</span>
                        {unreadAlertsCount > 0 && (
                          <span className="w-4 h-4 bg-rose-500 text-white text-[8px] rounded-full flex items-center justify-center border border-zinc-950">
                            {unreadAlertsCount}
                          </span>
                        )}
                      </span>
                    </motion.button>
                    {(isOwnProfile || isManagement || isAdmin) && (
                      <motion.button 
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setActiveTab('expediente')}
                        className={`relative shrink-0 whitespace-nowrap px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${activeTab === 'expediente' ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                      >
                        {activeTab === 'expediente' && (
                          <motion.div
                            layoutId="activeProfileTab"
                            className="absolute inset-0 bg-primary-500 rounded-2xl shadow-lg shadow-primary-500/20"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                        <span className="relative z-10">Expediente</span>
                      </motion.button>
                    )}
                    {(isOwnProfile || isManagement || isAdmin) && (
                      <motion.button 
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setActiveTab('contracts')}
                        className={`relative shrink-0 whitespace-nowrap px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${activeTab === 'contracts' ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                      >
                        {activeTab === 'contracts' && (
                          <motion.div
                            layoutId="activeProfileTab"
                            className="absolute inset-0 bg-primary-500 rounded-2xl shadow-lg shadow-primary-500/20"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                        <span className="relative z-10">Documentos</span>
                      </motion.button>
                    )}
                  </>
                )}
              </div>

              {activeTab === 'availability' && (
                <div className="animate-in slide-in-from-right duration-500">
                  <AvailabilityCalendar 
                    userId={uid || ''} 
                    isOwner={isOwnProfile} 
                  />
                </div>
              )}

              {activeTab === 'info' && (
                <div className="animate-in fade-in duration-500">
                  {isEditing ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Nome Completo</label>
                          <input 
                            type="text" 
                            value={formData.displayName}
                            onChange={e => setFormData({...formData, displayName: e.target.value})}
                            className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Cargo / Título</label>
                          <input 
                            type="text" 
                            value={formData.jobTitle}
                            onChange={e => setFormData({...formData, jobTitle: e.target.value})}
                            placeholder="Ex: Consultor de Vendas"
                            className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Sobre Mim (Bio)</label>
                        <textarea 
                          value={formData.bio}
                          onChange={e => setFormData({...formData, bio: e.target.value})}
                          className="w-full h-32 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                          placeholder="Fale um pouco sobre você..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Data de Nascimento (Opcional)</label>
                          <input 
                            type="date" 
                            value={formData.birthDate}
                            onChange={e => setFormData({...formData, birthDate: e.target.value})}
                            className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Data de Contratação</label>
                          <input 
                            type="date" 
                            value={formData.startDate}
                            onChange={e => setFormData({...formData, startDate: e.target.value})}
                            className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Instagram (@usuario)</label>
                          <input 
                            type="text" 
                            value={formData.instagram}
                            onChange={e => setFormData({...formData, instagram: e.target.value})}
                            className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">LinkedIn (URL)</label>
                          <input 
                            type="text" 
                            value={formData.linkedin}
                            onChange={e => setFormData({...formData, linkedin: e.target.value})}
                            className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                        </div>
                      </div>

                      {/* Sessão de Regime de Contratação e Jornada */}
                      <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6 text-left">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Regime de Contratação e Jornada</h4>
                          {!(isAdmin || isManagement) && (
                            <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded-lg font-bold">
                              Apenas Leitura (RH/Admin)
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Regime de Contratação</label>
                            <select
                              disabled={!(isAdmin || isManagement)}
                              value={formData.contractType}
                              onChange={e => setFormData({ ...formData, contractType: e.target.value as any })}
                              className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="PJ">PJ (Prestador de Serviço Livre)</option>
                              <option value="CLT">CLT (Jornada de Trabalho Planejada)</option>
                            </select>
                          </div>

                          {formData.contractType === 'CLT' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Entrada Regular</label>
                                <input
                                  type="time"
                                  disabled={!(isAdmin || isManagement)}
                                  value={formData.workSchedule.entryTime}
                                  onChange={e => setFormData({
                                    ...formData,
                                    workSchedule: { ...formData.workSchedule, entryTime: e.target.value }
                                  })}
                                  className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Saída Regular</label>
                                <input
                                  type="time"
                                  disabled={!(isAdmin || isManagement)}
                                  value={formData.workSchedule.exitTime}
                                  onChange={e => setFormData({
                                    ...formData,
                                    workSchedule: { ...formData.workSchedule, exitTime: e.target.value }
                                  })}
                                  className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {formData.contractType === 'CLT' && (
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Dias de Trabalho na Semana</label>
                            <div className="flex gap-2 flex-wrap">
                              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dayChar, idx) => {
                                const isSelected = formData.workSchedule.daysOfWeek.includes(idx);
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    disabled={!(isAdmin || isManagement)}
                                    onClick={() => {
                                      const days = formData.workSchedule.daysOfWeek;
                                      let newDays = [...days];
                                      if (days.includes(idx)) {
                                        newDays = days.filter(d => d !== idx);
                                      } else {
                                        newDays = [...days, idx].sort();
                                      }
                                      setFormData({
                                        ...formData,
                                        workSchedule: { ...formData.workSchedule, daysOfWeek: newDays }
                                      });
                                    }}
                                    className={`w-10 h-10 rounded-xl font-bold text-xs border transition-all active:scale-95 disabled:scale-100 disabled:opacity-70 flex items-center justify-center ${
                                      isSelected
                                        ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/20'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                                    }`}
                                    title={['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][idx]}
                                  >
                                    {dayChar}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Remuneração & Benefícios (Apenas para donos do perfil e admins/RH) */}
                      {canViewFinancials && (
                        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6 text-left">
                          <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <div className="flex items-center space-x-2">
                              <DollarSign className="text-primary-500" size={20} />
                              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Remuneração & Benefícios</h4>
                            </div>
                            {!canEditFinancials && (
                              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded-lg font-bold">
                                Apenas Leitura
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">
                                Salário / Pró-labore Base (Líquido)
                              </label>
                              <div className="relative">
                                <span className="absolute left-4 top-3 text-sm text-gray-400 font-bold">R$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  disabled={!canEditFinancials}
                                  value={formData.salary || 0}
                                  onChange={e => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
                                  className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                  placeholder="0.00"
                                />
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1 ml-1">
                                Para administradores, pode ser definido como zero se não houver pró-labore ativo.
                              </p>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">
                                Plano de Saúde (Custo Mensal)
                              </label>
                              <div className="relative">
                                <span className="absolute left-4 top-3 text-sm text-gray-400 font-bold">R$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  disabled={!canEditFinancials}
                                  value={formData.healthInsurance || 0}
                                  onChange={e => setFormData({ ...formData, healthInsurance: parseFloat(e.target.value) || 0 })}
                                  className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">
                                Vale Refeição / Alimentação (VR/VA)
                              </label>
                              <div className="relative">
                                <span className="absolute left-4 top-3 text-sm text-gray-400 font-bold">R$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  disabled={!canEditFinancials}
                                  value={formData.mealVoucher || 0}
                                  onChange={e => setFormData({ ...formData, mealVoucher: parseFloat(e.target.value) || 0 })}
                                  className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">
                                Vale Transporte (VT)
                              </label>
                              <div className="relative">
                                <span className="absolute left-4 top-3 text-sm text-gray-400 font-bold">R$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  disabled={!canEditFinancials}
                                  value={formData.transportVoucher || 0}
                                  onChange={e => setFormData({ ...formData, transportVoucher: parseFloat(e.target.value) || 0 })}
                                  className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">
                                Auxílio Home Office / Custo Internet
                              </label>
                              <div className="relative">
                                <span className="absolute left-4 top-3 text-sm text-gray-400 font-bold">R$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  disabled={!canEditFinancials}
                                  value={formData.homeOfficeAux || 0}
                                  onChange={e => setFormData({ ...formData, homeOfficeAux: parseFloat(e.target.value) || 0 })}
                                  className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>

                            {/* Descontos de Participação de Benefícios (Apenas RH/Admin) */}
                            {canEditFinancials && (
                              <div className="md:col-span-2 border-t border-white/5 pt-6 mt-4">
                                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                                  Descontos / Participação em Benefícios (RH)
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1">
                                      Coparticipação Plano Saúde
                                    </label>
                                    <div className="relative">
                                      <span className="absolute left-4 top-2.5 text-xs text-gray-400 font-bold">R$</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.benefitDeductions?.healthInsuranceCopay || 0}
                                        onChange={e => setFormData({
                                          ...formData,
                                          benefitDeductions: {
                                            ...formData.benefitDeductions,
                                            healthInsuranceCopay: parseFloat(e.target.value) || 0
                                          }
                                        })}
                                        className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                                        placeholder="0.00"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1">
                                      Desconto Vale Refeição
                                    </label>
                                    <div className="relative">
                                      <span className="absolute left-4 top-2.5 text-xs text-gray-400 font-bold">R$</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.benefitDeductions?.mealVoucherDiscount || 0}
                                        onChange={e => setFormData({
                                          ...formData,
                                          benefitDeductions: {
                                            ...formData.benefitDeductions,
                                            mealVoucherDiscount: parseFloat(e.target.value) || 0
                                          }
                                        })}
                                        className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                                        placeholder="0.00"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1">
                                      Desconto Vale Transporte
                                    </label>
                                    <div className="relative">
                                      <span className="absolute left-4 top-2.5 text-xs text-gray-400 font-bold">R$</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.benefitDeductions?.transportVoucherDiscount || 0}
                                        onChange={e => setFormData({
                                          ...formData,
                                          benefitDeductions: {
                                            ...formData.benefitDeductions,
                                            transportVoucherDiscount: parseFloat(e.target.value) || 0
                                          }
                                        })}
                                        className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                                        placeholder="0.00"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Dados Bancários e Pix (Editável pelo próprio colaborador ou RH) */}
                            <div className="md:col-span-2 border-t border-white/5 pt-6 mt-4">
                              <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                                Dados de Recebimento (Pix / Conta Bancária)
                              </h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1">
                                    Tipo de Chave Pix
                                  </label>
                                  <select
                                    value={formData.pixKeyType || ''}
                                    onChange={e => setFormData({ ...formData, pixKeyType: e.target.value as any })}
                                    className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                                  >
                                    <option value="" className="bg-[#030712] text-gray-400">Não informado</option>
                                    <option value="CPF" className="bg-[#030712] text-white">CPF</option>
                                    <option value="CNPJ" className="bg-[#030712] text-white">CNPJ</option>
                                    <option value="EMAIL" className="bg-[#030712] text-white">E-mail</option>
                                    <option value="PHONE" className="bg-[#030712] text-white">Telefone/Celular</option>
                                    <option value="RANDOM" className="bg-[#030712] text-white">Chave Aleatória (EVP)</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1">
                                    Chave Pix
                                  </label>
                                  <input
                                    type="text"
                                    value={formData.pixKey || ''}
                                    onChange={e => setFormData({ ...formData, pixKey: e.target.value })}
                                    className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="Informe a chave Pix"
                                  />
                                </div>
                              </div>

                              <div className="mt-4 bg-white/5 border border-white/5 rounded-2xl p-4 space-y-4">
                                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Dados Bancários (Opcional / TED)</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Código do Banco</label>
                                    <input
                                      type="text"
                                      value={formData.bankAccount?.bankCode || ''}
                                      onChange={e => setFormData({
                                        ...formData,
                                        bankAccount: {
                                          ...formData.bankAccount,
                                          bankCode: e.target.value
                                        }
                                      })}
                                      placeholder="Ex: 001, 260, 033"
                                      className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                  </div>
                                  
                                  <div className="sm:col-span-2">
                                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Nome do Banco</label>
                                    <input
                                      type="text"
                                      value={formData.bankAccount?.bankName || ''}
                                      onChange={e => setFormData({
                                        ...formData,
                                        bankAccount: {
                                          ...formData.bankAccount,
                                          bankName: e.target.value
                                        }
                                      })}
                                      placeholder="Ex: Banco do Brasil"
                                      className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Agência</label>
                                    <input
                                      type="text"
                                      value={formData.bankAccount?.agency || ''}
                                      onChange={e => setFormData({
                                        ...formData,
                                        bankAccount: {
                                          ...formData.bankAccount,
                                          agency: e.target.value
                                        }
                                      })}
                                      placeholder="Agência (sem dígito)"
                                      className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Conta</label>
                                    <input
                                      type="text"
                                      value={formData.bankAccount?.account || ''}
                                      onChange={e => setFormData({
                                        ...formData,
                                        bankAccount: {
                                          ...formData.bankAccount,
                                          account: e.target.value
                                        }
                                      })}
                                      placeholder="Número"
                                      className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Dígito</label>
                                    <input
                                      type="text"
                                      value={formData.bankAccount?.accountDigit || ''}
                                      onChange={e => setFormData({
                                        ...formData,
                                        bankAccount: {
                                          ...formData.bankAccount,
                                          accountDigit: e.target.value
                                        }
                                      })}
                                      placeholder="Dígito"
                                      className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Tipo de Conta</label>
                                    <select
                                      value={formData.bankAccount?.accountType || 'CHECKING'}
                                      onChange={e => setFormData({
                                        ...formData,
                                        bankAccount: {
                                          ...formData.bankAccount,
                                          accountType: e.target.value as any
                                        }
                                      })}
                                      className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                                    >
                                      <option value="CHECKING" className="bg-[#030712] text-white">Conta Corrente</option>
                                      <option value="SAVINGS" className="bg-[#030712] text-white">Poupança</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Nome do Titular</label>
                                    <input
                                      type="text"
                                      value={formData.bankAccount?.holderName || ''}
                                      onChange={e => setFormData({
                                        ...formData,
                                        bankAccount: {
                                          ...formData.bankAccount,
                                          holderName: e.target.value
                                        }
                                      })}
                                      placeholder="Nome Completo"
                                      className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1.5 ml-1">CPF/CNPJ do Titular</label>
                                    <input
                                      type="text"
                                      value={formData.bankAccount?.holderCpfCnpj || ''}
                                      onChange={e => setFormData({
                                        ...formData,
                                        bankAccount: {
                                          ...formData.bankAccount,
                                          holderCpfCnpj: e.target.value
                                        }
                                      })}
                                      placeholder="Documento"
                                      className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Detalhes de Desligamento / Rescisão (Apenas RH/Admin) */}
                            {canEditFinancials && (
                              <div className="md:col-span-2 border-t border-white/5 pt-6 mt-4">
                                <h5 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-4 flex items-center">
                                  <span>Desligamento / Rescisão do Contrato</span>
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-red-500/5 border border-red-500/10 rounded-2xl p-4">
                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1">
                                      Data do Desligamento
                                    </label>
                                    <input
                                      type="date"
                                      value={formData.resignationDetails?.resignationDate || ''}
                                      onChange={e => setFormData({
                                        ...formData,
                                        resignationDetails: {
                                          ...formData.resignationDetails,
                                          resignationDate: e.target.value
                                        }
                                      })}
                                      className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-red-500 outline-none text-white"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1">
                                      Motivo do Desligamento
                                    </label>
                                    <select
                                      value={formData.resignationDetails?.reason || 'dismissal_without_cause'}
                                      onChange={e => setFormData({
                                        ...formData,
                                        resignationDetails: {
                                          ...formData.resignationDetails,
                                          reason: e.target.value as any
                                        }
                                      })}
                                      className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-red-500 outline-none"
                                    >
                                      <option value="dismissal_without_cause" className="bg-[#030712] text-white">Demissão sem Justa Causa (CLT)</option>
                                      <option value="dismissal_with_cause" className="bg-[#030712] text-white">Demissão por Justa Causa (CLT)</option>
                                      <option value="employee_resignation" className="bg-[#030712] text-white">Pedido de Demissão (CLT)</option>
                                      <option value="pj_termination" className="bg-[#030712] text-white">Rescisão de Contrato PJ</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1">
                                      Aviso Prévio
                                    </label>
                                    <select
                                      value={formData.resignationDetails?.noticeType || 'none'}
                                      onChange={e => setFormData({
                                        ...formData,
                                        resignationDetails: {
                                          ...formData.resignationDetails,
                                          noticeType: e.target.value as any
                                        }
                                      })}
                                      className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-red-500 outline-none"
                                    >
                                      <option value="none" className="bg-[#030712] text-white">Não se aplica</option>
                                      <option value="worked" className="bg-[#030712] text-white">Trabalhado</option>
                                      <option value="indemnified" className="bg-[#030712] text-white">Indenizado</option>
                                    </select>
                                  </div>

                                  {formData.contractType === 'PJ' && (
                                    <div>
                                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1">
                                        Multa Contratual PJ (%)
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={formData.resignationDetails?.penaltyPercentage || 0}
                                        onChange={e => setFormData({
                                          ...formData,
                                          resignationDetails: {
                                            ...formData.resignationDetails,
                                            penaltyPercentage: parseFloat(e.target.value) || 0
                                          }
                                        })}
                                        className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-red-500 outline-none"
                                        placeholder="Ex: 10"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-3 pt-4">
                        <button 
                          onClick={() => setIsEditing(false)}
                          className="px-6 py-3 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-500 transition-all font-medium"
                        >
                          Cancelar
                        </button>
                        <SaveButton 
                          onClick={handleSave}
                          className="px-8 py-3 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-bold shadow-xl shadow-primary-500/20"
                        >
                          Salvar Alterações
                        </SaveButton>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center">
                          <Info className="mr-2" size={16} />
                          Sobre o Colaborador
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {profile.bio || "Este colaborador ainda não preencheu sua biografia."}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center">
                            <MapPin className="mr-2" size={16} />
                            Informações Gerais
                          </h3>
                          <div className="space-y-3">
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                              <Briefcase size={16} className="mr-3 opacity-50" />
                              <span>{profile.jobTitle || (typeof profile.role === 'string' ? profile.role : profile.role?.name)}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                              <Globe size={16} className="mr-3 opacity-50" />
                              <span>Membro desde {profile.createdAt ? (typeof profile.createdAt === 'number' ? new Date(profile.createdAt).toLocaleDateString() : (profile.createdAt as any).toDate?.()?.toLocaleDateString() || '—') : '—'}</span>
                            </div>
                            {profile.birthDate && profile.birthDate.length >= 5 && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Cake size={16} className="mr-3 opacity-50" />
                                <span>Aniversário em: {new Date(profile.birthDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</span>
                              </div>
                            )}
                            {profile.startDate && profile.startDate.length >= 10 && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Calendar size={16} className="mr-3 opacity-50" />
                                <span>Contratado em: {new Date(profile.startDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center">
                            <Mail className="mr-2" size={16} />
                            Contatos
                          </h3>
                          <div className="space-y-3">
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                              <Mail size={16} className="mr-3 opacity-50" />
                              <span className="truncate">{profile.email}</span>
                            </div>
                            {profile.phoneNumber && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Phone size={16} className="mr-3 opacity-50" />
                                <span>{profile.phoneNumber}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Sessão de Regime & Jornada */}
                      <div className="border-t border-gray-200 dark:border-white/5 pt-8">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center">
                          <Clock className="mr-2 animate-spin-slow" size={16} />
                          Regime de Contratação & Jornada
                        </h3>
                        {(() => {
                          const isProfileAdminOrRH = profile.role === 'admin' || profile.roleId === 'admin' || profile.permissions?.includes('MANAGE_SETTINGS') || profile.permissions?.includes('MANAGE_TEAM');
                          const displayContract = isProfileAdminOrRH ? 'PJ' : (profile.contractType || 'PJ');

                          return (
                            <div className="bg-white/5 border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                              <div className="flex items-center space-x-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                                  displayContract === 'CLT'
                                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                }`}>
                                  <span className="font-black text-sm">{displayContract}</span>
                                </div>
                                <div className="text-left">
                                  <p className="font-semibold text-white">
                                    {displayContract === 'CLT' ? 'Jornada Planejada (CLT)' : 'Prestador de Serviço Livre (PJ)'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {displayContract === 'CLT' && profile.workSchedule
                                      ? `Horário: ${profile.workSchedule.entryTime} às ${profile.workSchedule.exitTime}`
                                      : 'Sem restrições de horários ou bloqueios de expediente.'}
                                  </p>
                                </div>
                              </div>

                              {displayContract === 'CLT' && profile.workSchedule && (
                                <div className="flex gap-1 flex-wrap">
                                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dayChar, idx) => {
                                    const isWorkDay = profile.workSchedule?.daysOfWeek.includes(idx);
                                    return (
                                      <span
                                        key={idx}
                                        className={`w-8 h-8 rounded-lg font-bold text-[10px] flex items-center justify-center border ${
                                          isWorkDay
                                            ? 'bg-primary-500/10 border-primary-500/30 text-primary-400'
                                            : 'bg-white/5 border-white/5 text-gray-600'
                                        }`}
                                        title={['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][idx]}
                                      >
                                        {dayChar}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Remuneração & Benefícios (Apenas para donos do perfil e admins/RH) */}
                      {canViewFinancials && (
                        <div className="border-t border-gray-200 dark:border-white/5 pt-8">
                          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center">
                            <DollarSign className="mr-2 text-primary-500" size={16} />
                            Remuneração & Benefícios (Confidencial)
                          </h3>
                          <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-left">
                              <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                  Salário Base / Pró-labore
                                </p>
                                <p className="text-lg font-black text-white">
                                  {profile.salary && profile.salary > 0 ? (
                                    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profile.salary)
                                  ) : (
                                    <span className="text-gray-500 text-sm font-semibold">R$ 0,00 (Sem Pró-labore)</span>
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                  Plano de Saúde
                                </p>
                                <p className="text-lg font-bold text-white">
                                  {profile.healthInsurance ? (
                                    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profile.healthInsurance)
                                  ) : (
                                    <span className="text-gray-500 text-sm font-semibold">Não possui</span>
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                  Vale Refeição / Alimentação (VR/VA)
                                </p>
                                <p className="text-lg font-bold text-white">
                                  {profile.mealVoucher ? (
                                    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profile.mealVoucher)
                                  ) : (
                                    <span className="text-gray-500 text-sm font-semibold">Não possui</span>
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                  Vale Transporte (VT)
                                </p>
                                <p className="text-lg font-bold text-white">
                                  {profile.transportVoucher ? (
                                    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profile.transportVoucher)
                                  ) : (
                                    <span className="text-gray-500 text-sm font-semibold">Não possui</span>
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                  Auxílio Home Office
                                </p>
                                <p className="text-lg font-bold text-white">
                                  {profile.homeOfficeAux ? (
                                    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profile.homeOfficeAux)
                                  ) : (
                                    <span className="text-gray-500 text-sm font-semibold">Não possui</span>
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                  Custo Total Mensal Estimado
                                </p>
                                <p className="text-lg font-black text-primary-400">
                                  {(() => {
                                    const base = profile.salary || 0;
                                    const benefits = (profile.healthInsurance || 0) + (profile.mealVoucher || 0) + (profile.transportVoucher || 0) + (profile.homeOfficeAux || 0);
                                    
                                    let total = base + benefits;
                                    if (profile.contractType === 'CLT') {
                                      // Provisões CLT: FGTS (8%), 13º (8.33%), Férias (11.11%), Multa FGTS (3.2%)
                                      const provs = base * (0.08 + 0.0833 + 0.1111 + 0.032);
                                      total += provs;
                                    }
                                    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total);
                                  })()}
                                </p>
                              </div>
                            </div>

                            {/* Divisor */}
                            <div className="border-t border-gray-200 dark:border-white/5 pt-6" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                              {/* Coluna 1: Dados Bancários / Pix */}
                              <div>
                                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">
                                  Dados de Recebimento
                                </h4>
                                <div className="space-y-3 bg-white/5 border border-white/5 rounded-2xl p-4">
                                  {profile.pixKey ? (
                                    <div>
                                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Pix (Chave {profile.pixKeyType})</p>
                                      <p className="text-sm font-semibold text-white select-all">{profile.pixKey}</p>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-amber-500 font-semibold flex items-center gap-1.5">
                                      <AlertTriangle size={14} /> Sem chave Pix cadastrada
                                    </p>
                                  )}
                                  
                                  {profile.bankAccount && profile.bankAccount.bankCode && (
                                    <div className="border-t border-white/5 pt-3">
                                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Conta Bancária (TED)</p>
                                      <p className="text-xs font-semibold text-white">
                                        Banco {profile.bankAccount.bankCode} {profile.bankAccount.bankName && `- ${profile.bankAccount.bankName}`}
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        Ag: {profile.bankAccount.agency} | Cta: {profile.bankAccount.account}-{profile.bankAccount.accountDigit} ({profile.bankAccount.accountType === 'SAVINGS' ? 'Poupança' : 'Corrente'})
                                      </p>
                                      <p className="text-[10px] text-gray-400 mt-1">
                                        Titular: {profile.bankAccount.holderName} ({profile.bankAccount.holderCpfCnpj})
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Coluna 2: Descontos de Benefícios & Rescisão */}
                              <div>
                                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">
                                  Coparticipações & Descontos
                                </h4>
                                <div className="space-y-3 bg-white/5 border border-white/5 rounded-2xl p-4">
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <span className="text-gray-400">Copart. Saúde:</span>
                                    <span className="font-semibold text-white text-right">
                                      {profile.benefitDeductions?.healthInsuranceCopay 
                                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profile.benefitDeductions.healthInsuranceCopay)
                                        : 'R$ 0,00'}
                                    </span>
                                    
                                    <span className="text-gray-400">Desconto VR:</span>
                                    <span className="font-semibold text-white text-right">
                                      {profile.benefitDeductions?.mealVoucherDiscount 
                                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profile.benefitDeductions.mealVoucherDiscount)
                                        : 'R$ 0,00'}
                                    </span>

                                    <span className="text-gray-400">Desconto VT:</span>
                                    <span className="font-semibold text-white text-right">
                                      {profile.benefitDeductions?.transportVoucherDiscount 
                                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profile.benefitDeductions.transportVoucherDiscount)
                                        : 'R$ 0,00'}
                                    </span>
                                  </div>

                                  {profile.resignationDetails && profile.resignationDetails.resignationDate && (
                                    <div className="border-t border-rose-500/20 pt-3 text-xs bg-rose-500/5 rounded-xl p-2.5 border border-rose-500/10 mt-2">
                                      <p className="font-bold text-rose-500 flex items-center gap-1.5">
                                        <AlertTriangle size={14} /> Desligamento Agendado
                                      </p>
                                      <p className="text-gray-300 mt-1">
                                        Data: {formatLocalDateStr(profile.resignationDetails.resignationDate)}
                                      </p>
                                      <p className="text-gray-400 text-[10px]">
                                        Motivo: {
                                          profile.resignationDetails.reason === 'dismissal_without_cause' ? 'Sem justa causa' :
                                          profile.resignationDetails.reason === 'dismissal_with_cause' ? 'Com justa causa' :
                                          profile.resignationDetails.reason === 'employee_resignation' ? 'Pedido de demissão' :
                                          'Rescisão contratual PJ'
                                        }
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Card de Adiantamento Salarial */}
                      {isOwnProfile && profile.salary && profile.salary > 0 && (
                        <div className="border-t border-gray-200 dark:border-white/5 pt-8 mt-6">
                          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center">
                            <Wallet className="mr-2 text-amber-500" size={16} />
                            Portal de Adiantamento Salarial
                          </h3>
                          <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-3xl p-6 relative overflow-hidden">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                              <div className="space-y-2 max-w-xl text-left">
                                <h4 className="text-lg font-black text-white flex items-center gap-2">
                                  Adiantamento Salarial Sem Custos
                                </h4>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                  Você pode solicitar um adiantamento Pix de até 30% do seu salário base de forma imediata. O valor será descontado integralmente no próximo fechamento da sua folha de pagamento.
                                </p>
                              </div>
                              <div className="bg-black/30 border border-white/5 rounded-2xl p-4 min-w-[200px] text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Seu Limite (30%)</p>
                                <p className="text-2xl font-black text-amber-400">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profile.salary * 0.3)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-6 border-t border-amber-500/10 pt-6">
                              {activeAdvance ? (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 text-left">
                                  <div>
                                    <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                                      <CheckCircle2 size={16} /> Adiantamento Solicitado e Pago!
                                    </p>
                                    <p className="text-xs text-gray-300 mt-1">
                                      Valor de <span className="font-semibold text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activeAdvance.amount)}</span> recebido em {format(new Date(activeAdvance.requestedAt), 'dd/MM/yyyy')} via Pix.
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                      ID Asaas: {activeAdvance.asaasTransferId} | Competência: {activeAdvance.month}
                                    </p>
                                  </div>
                                  <span className="shrink-0 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-wider">
                                    Compensação Pendente
                                  </span>
                                </div>
                              ) : !profile.pixKey ? (
                                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-left">
                                  <p className="text-sm font-bold text-rose-400 flex items-center gap-1.5">
                                    <AlertTriangle size={16} /> Chave Pix Necessária
                                  </p>
                                  <p className="text-xs text-gray-300 mt-1">
                                    Você precisa cadastrar sua chave Pix nas configurações do perfil para solicitar o adiantamento salarial.
                                  </p>
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row items-center gap-4 text-left">
                                  <div className="w-full sm:flex-1">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Valor da Solicitação</label>
                                    <div className="relative">
                                      <span className="absolute left-4 top-3 text-sm text-gray-400 font-bold">R$</span>
                                      <input
                                        type="number"
                                        min="1"
                                        max={profile.salary * 0.3}
                                        step="0.01"
                                        defaultValue={(profile.salary * 0.3).toFixed(2)}
                                        id="advanceAmountInput"
                                        placeholder="0,00"
                                        className="w-full bg-black/40 border border-amber-500/20 focus:border-amber-500/50 rounded-2xl pl-10 pr-4 py-3 text-sm font-semibold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                      />
                                    </div>
                                    <span className="text-[10px] text-gray-500 mt-1 block">Escolha qualquer valor até o limite de R$ {(profile.salary * 0.3).toFixed(2)}</span>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      const inputEl = document.getElementById('advanceAmountInput') as HTMLInputElement;
                                      const val = parseFloat(inputEl?.value) || 0;
                                      if (val <= 0 || val > profile.salary * 0.3) {
                                        toast.error('Valor solicitado inválido ou excede o limite permitido');
                                        return;
                                      }

                                      const ok = await confirm({
                                        title: 'Confirmar Adiantamento Salarial',
                                        message: `Deseja solicitar o adiantamento salarial de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)} via Pix? Este valor será descontado na sua próxima folha de pagamento.`,
                                        confirmText: 'Sim, solicitar Pix',
                                        variant: 'warning'
                                      });
                                      if (!ok) return;

                                      setIsRequestingAdvance(true);
                                      try {
                                        const token = await user?.getIdToken();
                                        const res = await fetch('/api/asaas_handler?action=request-advance', {
                                          method: 'POST',
                                          headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'Content-Type': 'application/json'
                                          },
                                          body: JSON.stringify({ amount: val })
                                        });

                                        const data = await res.json();
                                        if (!res.ok) throw new Error(data.error || 'Erro ao solicitar adiantamento');

                                        toast.success('Adiantamento solicitado com sucesso! O Pix está sendo enviado.');
                                      } catch (err: any) {
                                        console.error(err);
                                        toast.error(err.message || 'Erro ao solicitar adiantamento.');
                                      } finally {
                                        setIsRequestingAdvance(false);
                                      }
                                    }}
                                    disabled={isRequestingAdvance}
                                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/20 text-black font-black uppercase tracking-wider transition-all shadow-xl shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2 self-end shrink-0"
                                  >
                                    {isRequestingAdvance ? (
                                      <>
                                        <Loader2 size={16} className="animate-spin" /> Processando...
                                      </>
                                    ) : (
                                      'Confirmar Pix'
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Ausências Recentes - Adicionado para Visibilidade Dupla */}
                      <div className="pt-8 border-t border-gray-100 dark:border-white/5">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center">
                          <Plane className="mr-2" size={16} />
                          Últimas Ausências
                        </h3>
                        {Array.isArray(vacations) && vacations.filter(v => v && v.userId === uid).length > 0 ? (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           {vacations.filter(v => v && v.userId === uid)
                              .sort((a, b) => b.createdAt - a.createdAt)
                              .slice(0, 2)
                              .map(v => (
                                <div key={v.id} className="p-4 bg-white/50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-2xl flex items-center gap-3">
                                  <div className={`p-2 rounded-xl ${
                                    v.status === 'Aprovado' ? 'bg-emerald-500/10 text-emerald-500' :
                                    v.status === 'Recusado' ? 'bg-rose-500/10 text-rose-500' :
                                    'bg-amber-500/10 text-amber-500'
                                  }`}>
                                    {v.status === 'Aprovado' ? <CheckCircle2 size={16} /> : 
                                     v.status === 'Recusado' ? <AlertTriangle size={16} /> : 
                                     <Clock size={16} />}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">{v.type}</p>
                                    <p className="text-[10px] text-gray-500">{v.start} — {v.end}</p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="p-4 bg-white/50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-2xl">
                             <p className="text-xs text-gray-500 italic">Nenhuma ausência registrada neste perfil.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'pdi' && isOwnProfile && (
                <div className="animate-in slide-in-from-right duration-500">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
                      <Target size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold">Meu Plano de Desenvolvimento</h4>
                      <p className="text-xs text-gray-500">Trilha de carreira e objetivos definidos pelo gestor.</p>
                    </div>
                  </div>

                  <div className="mb-10 relative">
                    <SkillRadarChart skills={profile.skills || { hard: [], soft: [] }} />
                    {isManagement && !isOwnProfile && (
                      <button 
                        onClick={() => setShowEditSkillsModal(true)}
                        className="absolute top-0 right-0 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-primary-500 transition-all"
                      >
                        Atualizar Matriz
                      </button>
                    )}
                  </div>

                  <PDIKanban 
                    items={(profile.pdiItems || []) as any} 
                    orgId={currentUserProfile?.orgId || ''} 
                    userId={uid || ''} 
                  />
                </div>
              )}

              {activeTab === 'comissoes' && isOwnProfile && (
                <div className="animate-in slide-in-from-right duration-500 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl">
                      <div className="flex items-center gap-3 mb-2 text-emerald-500">
                        <TrendingUp size={18} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Ganhos Totais</span>
                      </div>
                      <p className="text-2xl font-black text-gray-900 dark:text-white">
                        R$ {(Array.isArray(commissions) ? commissions.filter(c => c && c.userId === uid).reduce((acc, c) => acc + (c.amount || 0), 0) : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    
                    <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl">
                      <div className="flex items-center gap-3 mb-2 text-amber-500">
                        <Wallet size={18} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">A Receber</span>
                      </div>
                      <p className="text-2xl font-black text-gray-900 dark:text-white">
                        R$ {(Array.isArray(commissions) ? commissions.filter(c => c && c.userId === uid && c.status === 'PENDING').reduce((acc, c) => acc + (c.amount || 0), 0) : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="p-6 bg-primary-500/10 border border-primary-500/20 rounded-3xl">
                      <div className="flex items-center gap-3 mb-2 text-primary-500">
                        <Clock size={18} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Pendentes</span>
                      </div>
                      <p className="text-2xl font-black text-gray-900 dark:text-white">
                        {Array.isArray(commissions) ? commissions.filter(c => c && c.userId === uid && c.status === 'PENDING').length : 0}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto overflow-y-auto max-h-[400px] custom-scrollbar pr-2">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Histórico de Vendas Individual</h4>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold">
                          <th className="pb-3">Data</th>
                          <th className="pb-3">Cliente</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Comissão</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!Array.isArray(commissions) || commissions.filter(c => c && c.userId === uid).length === 0) ? (
                          <tr>
                            <td colSpan={4} className="py-10 text-center text-gray-500 italic text-sm">Nenhuma venda com comissão registrada ainda.</td>
                          </tr>
                        ) : (
                          commissions.filter(c => c && c.userId === uid).map(comm => (
                            <tr key={comm.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="py-4 text-xs text-gray-500">
                                {comm.date ? (typeof comm.date === 'number' ? new Date(comm.date).toLocaleDateString('pt-BR') : (comm.date as any).toDate?.()?.toLocaleDateString('pt-BR') || '—') : '—'}
                              </td>
                              <td className="py-4">
                                <div className="text-sm font-bold text-gray-900 dark:text-white">{comm.clientName}</div>
                                <div className="text-[10px] text-gray-500 uppercase">{comm.offerName}</div>
                              </td>
                              <td className="py-4">
                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${comm.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                  {comm.status === 'PAID' ? 'Recebido' : 'Pendente'}
                                </span>
                              </td>
                              <td className="py-4 font-black text-gray-900 dark:text-white text-right">R$ {comm.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'inventory' && isOwnProfile && (
                <div className="animate-in slide-in-from-right duration-500">
                  <InventorySection 
                    inventory={userAssets} 
                    isAdmin={isAdmin}
                    onAdd={() => setShowAddAssetModal(true)}
                  />
                </div>
              )}

              {activeTab === 'feedbacks' && isOwnProfile && (
                <div className="animate-in slide-in-from-right duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Mural de Feedbacks</h4>
                    {isManagement && !isOwnProfile && (
                      <button 
                        onClick={() => setShowAddFeedbackModal(true)}
                        className="px-4 py-2 bg-primary-500 text-white rounded-xl text-xs font-bold flex items-center gap-2"
                      >
                         <Plus size={14} /> Novo Feedback
                      </button>
                    )}
                  </div>
                  <FeedbackMural 
                    feedbacks={profile.feedbacks || []} 
                    currentUserProfile={currentUserProfile}
                    profileOwnerId={uid!}
                  />
                </div>
              )}

              {activeTab === 'vacations' && isOwnProfile && (
                <div className="animate-in slide-in-from-right duration-500 space-y-6 text-left">
                   <div className="flex items-center gap-3 mb-4">
                     <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                       <Calendar size={24} />
                     </div>
                     <div>
                       <h4 className="font-bold">Histórico de Ausências</h4>
                       <p className="text-xs text-gray-500">Acompanhamento de férias, folgas e licenças.</p>
                     </div>
                   </div>

                   <div className="grid grid-cols-1 gap-4">
                      {(!Array.isArray(vacations) || vacations.filter(v => v && v.userId === uid).length === 0) ? (
                        <div className="text-center py-20 bg-white/5 rounded-[2rem] border-2 border-dashed border-white/5">
                           <Clock size={40} className="mx-auto text-gray-300 mb-4 opacity-10" />
                           <p className="text-gray-500 text-sm">Nenhuma ausência registrada neste perfil.</p>
                        </div>
                      ) : (
                        vacations.filter(v => v && v.userId === uid)
                          .sort((a, b) => b.createdAt - a.createdAt)
                          .map(v => (
                            <div key={v.id} className="p-6 bg-white/30 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-3xl flex flex-col gap-4 relative group">
                               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                  <div className="space-y-1">
                                     <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                          v.status === 'Aprovado' ? 'bg-emerald-500/10 text-emerald-500' :
                                          v.status === 'Recusado' ? 'bg-red-500/10 text-red-500' :
                                          'bg-amber-500/10 text-amber-500'
                                        }`}>
                                          {v.status}
                                        </span>
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{v.type} - {v.reason}</span>
                                     </div>
                                     <p className="text-sm font-medium italic text-gray-500">"{v.description || 'Nenhuma justificativa informada.'}"</p>
                                  </div>
                                  <div className="flex items-center gap-6 text-sm font-mono text-gray-500 shrink-0">
                                     <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-gray-400">Início</span>
                                        <span>{v.start}</span>
                                     </div>
                                     <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-gray-400">Retorno</span>
                                        <span>{v.end}</span>
                                     </div>
                                     {isManagement && (
                                       <button 
                                         onClick={() => confirmDeleteVacation(v.id)}
                                         className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                         title="Remover do histórico"
                                       >
                                          <Trash2 size={16} />
                                       </button>
                                     )}
                                  </div>
                               </div>
                               {v.status === 'Recusado' && v.hrFeedback && (
                                 <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl flex items-start gap-3">
                                    <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                       <p className="text-[10px] font-black uppercase text-red-500 mb-1">Feedback do RH / People</p>
                                       <p className="text-xs text-gray-600 dark:text-gray-400 italic">"{v.hrFeedback}"</p>
                                    </div>
                                 </div>
                               )}
                            </div>
                          ))
                      )}
                   </div>
                </div>
              )}

              {activeTab === 'alerts' && isOwnProfile && (
                <div className="animate-in slide-in-from-right duration-500 space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500">
                        <ShieldAlert size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold">Central de Alertas Operacionais</h4>
                        <p className="text-xs text-gray-500 text-left">Notificações direcionadas baseadas no seu cargo de {typeof profile.role === 'string' ? profile.role : profile.role?.name}.</p>
                      </div>
                    </div>
                  </div>

                  {Array.isArray(businessAlerts) && businessAlerts.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {businessAlerts.map(alert => {
                        const isRead = profile.readAlerts?.includes(alert.id);
                        return (
                          <div 
                            key={alert.id}
                            onClick={() => {
                              if (!isRead && isOwnProfile) markAlertAsRead(alert.id);
                              if (alert.link) navigate(alert.link);
                            }}
                            className={`group p-5 rounded-3xl border transition-all cursor-pointer text-left ${
                              isRead 
                                ? 'bg-white/5 border-white/5 opacity-60' 
                                : 'bg-white/10 border-primary-500/30 shadow-lg shadow-primary-500/5'
                            } hover:scale-[1.01] active:scale-[0.99] flex items-start gap-4 relative overflow-hidden`}
                          >
                            {!isRead && (
                              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary-500/10 to-transparent pointer-events-none"></div>
                            )}
                            
                            <div className={`mt-1 p-2 rounded-xl shrink-0 ${
                              alert.type === 'error' ? 'bg-rose-500/20 text-rose-500' :
                              alert.type === 'warning' ? 'bg-amber-500/20 text-amber-500' :
                              alert.type === 'success' ? 'bg-emerald-500/20 text-emerald-500' :
                              'bg-primary-500/20 text-primary-500'
                            }`}>
                              {alert.type === 'cron' ? <Clock size={16} /> : <BellRing size={16} />}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1 gap-2">
                                <h5 className={`text-sm font-bold truncate ${!isRead ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                                  {alert.title}
                                </h5>
                                <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                  {alert.createdAt ? (typeof alert.createdAt === 'number' ? new Date(alert.createdAt).toLocaleDateString() : (alert.createdAt as any).toDate?.()?.toLocaleDateString() || '—') : '—'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">
                                {alert.message}
                              </p>
                              
                              {alert.link && (
                                <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-primary-500 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                  Ver detalhes <ChevronLeft size={10} className="rotate-180" />
                                </div>
                              )}
                            </div>

                            {!isRead && (
                              <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 shrink-0 shadow-lg shadow-primary-500/50"></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-20 flex flex-col items-center justify-center text-center opacity-30">
                      <Inbox size={48} className="mb-4" />
                      <p className="text-sm font-medium">Nenhum alerta pendente para o seu cargo.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && isOwnProfile && (
                <div className="animate-in slide-in-from-right duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Linha do Tempo de Carreira</h4>
                    {isAdmin && (
                      <button 
                        onClick={() => setShowAddMilestoneModal(true)}
                        className="p-2 bg-primary-500/10 text-primary-500 rounded-xl hover:bg-primary-500/20 transition-all"
                      >
                        <Plus size={18} />
                      </button>
                    )}
                  </div>
                  <CareerTimeline milestones={profile.careerTimeline || []} />
                </div>
              )}

              {activeTab === 'expediente' && (isOwnProfile || isManagement || isAdmin) && (
                <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
                  {/* Barra de Período do Espelho de Ponto */}
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl gap-4">
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Espelho de Ponto Eletrônico</h3>
                      <p className="text-xs text-gray-500">Consulte seus horários de entrada, saída, intervalos e totais trabalhados.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Período:</span>
                      <select 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-800 dark:text-gray-300 focus:outline-none focus:border-primary-500 transition-all font-bold cursor-pointer"
                      >
                        {getMonthOptions().map(opt => (
                          <option key={opt.value} value={opt.value} className="bg-[#0f1117] text-white">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
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
                      {todayLog && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono mt-1 block">
                          Entrada: {formatToBrasiliaTime(todayLog.startTime, 'HH:mm:ss')}
                          {todayLog.endTime ? ` | Saída: ${formatToBrasiliaTime(todayLog.endTime, 'HH:mm:ss')}` : ''}
                        </span>
                      )}
                    </div>

                    {/* Card 2: Horas Líquidas no Mês */}
                    <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between min-h-[180px]">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Total Líquido do Mês</span>
                        <h3 className="text-3xl font-black font-mono tracking-tight text-primary-500">
                          {(() => {
                            const totalMs = myMonthlyLogs.reduce((acc, curr) => acc + (curr.totalDuration || 0), 0);
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
                    <h3 className="font-bold flex items-center gap-2 mb-6 text-left"><TrendingUp className="text-primary-500" /> Histórico Semanal de Horas</h3>
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
                            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative text-center">
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
                    <h3 className="font-bold flex items-center gap-2 mb-6 text-left"><Clock className="text-pink-500" /> Registro de Presenças do Mês</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 text-xs text-gray-400 font-black uppercase tracking-widest">
                            <th className="py-4 px-2">Data</th>
                            <th className="py-4 px-2">Entrada</th>
                            <th className="py-4 px-2">Saída</th>
                            <th className="py-4 px-2">Intervalos/Pausas</th>
                            <th className="py-4 px-2">Total Líquido</th>
                            {(isAdmin || isManagement) && <th className="py-4 px-2 text-right">Ações</th>}
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {myMonthlyLogs.map(log => (
                            <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="py-4 px-2 font-bold">
                                <div className="flex items-center gap-1.5">
                                  <span>{formatLocalDateStr(log.date)}</span>
                                  {log.editedByAdmin && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-black uppercase tracking-tighter shrink-0" title="Registro ajustado manualmente por um Administrador">
                                      Ajustado
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-2 font-mono">{formatToBrasiliaTime(log.startTime, 'HH:mm:ss')}</td>
                              <td className="py-4 px-2 font-mono">
                                {log.endTime ? formatToBrasiliaTime(log.endTime, 'HH:mm:ss') : <span className="text-emerald-500 font-bold">Ativo</span>}
                              </td>
                              <td className="py-4 px-2">
                                {log.pauses.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5 font-mono">
                                    {log.pauses.map((p, idx) => (
                                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 flex items-center gap-1 font-mono">
                                        {p.type === 'lunch' ? '🍱 Almoço' : p.type === 'meeting' ? '👥 Reunião' : '🕒 Ausente'}:{' '}
                                        {formatToBrasiliaTime(p.startTime, 'HH:mm')} - {p.endTime ? formatToBrasiliaTime(p.endTime, 'HH:mm') : '...'}
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
                              {(isAdmin || isManagement) && (
                                <td className="py-4 px-2 text-right">
                                  <button
                                    onClick={() => handleOpenEditLog(log)}
                                    className="p-2 hover:bg-white/10 rounded-xl transition-all text-primary-500 cursor-pointer inline-flex items-center justify-center"
                                    title="Editar Ponto do Colaborador"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                          {myMonthlyLogs.length === 0 && (
                            <tr>
                              <td colSpan={(isAdmin || isManagement) ? 6 : 5} className="py-12 text-center opacity-30 italic text-sm">
                                Nenhum registro de expediente encontrado para este período.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal de Nova Ausência */}
        {showVacationModal && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setShowVacationModal(false)}>
              <div className="bg-white dark:bg-[#0a0a0a] rounded-[2.5rem] border border-gray-200 dark:border-white/10 w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                 <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0">
                    <h3 className="text-2xl font-bold">Solicitar Ausência</h3>
                    <button onClick={() => setShowVacationModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><X /></button>
                 </div>
                 <form onSubmit={handleAddVacation} className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="space-y-2 text-left">
                       <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Tipo / Motivo</label>
                       <select 
                         required 
                         className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all font-medium" 
                         value={newVacation.reason || ''} 
                         onChange={e => {
                           const reason = e.target.value as any;
                           const status = (reason === 'Falta' || reason === 'Motivo Médico') ? 'Informado' : 'Pendente';
                           const type = reason === 'Férias' ? 'Férias' : 'Ausência';
                           setNewVacation({...newVacation, reason, status, type});
                         }}
                       >
                          <option value="Férias">Férias</option>
                          <option value="Falta">Falta</option>
                          <option value="Motivo Médico">Motivo Médico</option>
                          <option value="Licença Maternidade/Paternidade">Licença</option>
                          <option value="Outro">Outro Motivo</option>
                       </select>
                    </div>

                    <div className="space-y-2 text-left">
                       <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Justificativa Detalhada</label>
                       <textarea 
                         required 
                         placeholder="Descreva o motivo da sua ausência..." 
                         className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all font-medium h-24" 
                         value={newVacation.description || ''} 
                         onChange={e => setNewVacation({...newVacation, description: e.target.value})} 
                       />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-left">
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Início</label>
                          <input type="date" required className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all font-medium" value={newVacation.start} onChange={e => setNewVacation({...newVacation, start: e.target.value})} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Retorno / Fim</label>
                          <input type="date" required className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all font-medium" value={newVacation.end} onChange={e => setNewVacation({...newVacation, end: e.target.value})} />
                       </div>
                    </div>
                    
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                       <p className="text-xs text-amber-600 font-medium">
                         {newVacation.status === 'Informado' 
                           ? 'Este tipo de ausência será registrado automaticamente como informado.' 
                           : 'Sua solicitação de férias/licença será enviada para aprovação do gestor.'}
                       </p>
                    </div>

                    <button type="submit" className="w-full bg-primary-500 hover:bg-primary-600 text-white p-5 rounded-2xl font-bold shadow-xl shadow-primary-500/20 transition-all">Enviar Solicitação</button>
                 </form>
              </div>
           </div>
        )}

        {activeTab === 'contracts' && (isOwnProfile || isManagement || isAdmin) && (
           <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
              <ProfileContractsTab 
                profile={profile} 
                isOwnProfile={isOwnProfile} 
                isAdmin={isAdmin || isManagement} 
              />
           </div>
        )}

        <AddFeedbackModal 
          isOpen={showAddFeedbackModal}
          onClose={() => setShowAddFeedbackModal(false)}
          targetUserId={uid!}
          fromUser={currentUserProfile}
          onSuccess={handleRefresh}
        />

        <AddAssetModal 
          isOpen={showAddAssetModal}
          onClose={() => setShowAddAssetModal(false)}
          targetUserId={uid!}
          onSuccess={handleRefresh}
        />

        <EditSkillsModal 
          isOpen={showEditSkillsModal}
          onClose={() => setShowEditSkillsModal(false)}
          targetUserId={uid!}
          initialSkills={profile.skills}
          onSuccess={handleRefresh}
        />

        <AddMilestoneModal 
          isOpen={showAddMilestoneModal}
          onClose={() => setShowAddMilestoneModal(false)}
          targetUserId={uid!}
          onSuccess={handleRefresh}
        />

        {/* Modal de Edição de Ponto pelo Admin */}
        {editingTimeLog && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setEditingTimeLog(null)}>
              <div className="bg-white dark:bg-[#0a0a0a] rounded-[2.5rem] border border-gray-200 dark:border-white/10 w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                 <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0 text-left">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Ajustar Ponto Eletrônico</h3>
                    <button onClick={() => setEditingTimeLog(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white"><X /></button>
                 </div>
                 <form onSubmit={e => e.preventDefault()} className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="space-y-2 text-left">
                       <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Colaborador</label>
                       <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 font-bold text-gray-800 dark:text-white flex items-center gap-2">
                         <span className="w-2.5 h-2.5 rounded-full bg-primary-500 animate-pulse" />
                         {editingTimeLog.userName}
                       </div>
                    </div>

                    <div className="space-y-2 text-left">
                       <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Data do Log</label>
                       <input 
                         type="date" 
                         required 
                         className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all font-medium text-gray-800 dark:text-white" 
                         value={editDate} 
                         onChange={e => setEditDate(e.target.value)} 
                       />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2 text-left">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Hora Entrada</label>
                          <input 
                            type="time" 
                            required 
                            className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all font-medium text-gray-800 dark:text-white" 
                            value={editStartTime} 
                            onChange={e => setEditStartTime(e.target.value)} 
                          />
                       </div>

                       <div className="space-y-2 text-left">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Hora Saída</label>
                          <input 
                            type="time" 
                            className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:outline-none focus:border-primary-500 transition-all font-medium text-gray-800 dark:text-white" 
                            value={editEndTime} 
                            onChange={e => setEditEndTime(e.target.value)} 
                            placeholder="Ainda trabalhando..."
                          />
                          <p className="text-[10px] text-gray-500 mt-1 pl-1">Deixe em branco se o expediente continuar ativo.</p>
                       </div>
                    </div>

                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-left">
                       <p className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                         <Info size={14} /> Observação de Ajuste & Auditoria
                       </p>
                       <p className="text-[11px] text-amber-600/90 dark:text-amber-400/80 leading-relaxed">
                         Ao salvar as alterações, este ponto será marcado com o status <strong>"Concluído"</strong> (caso preenchida a saída) e a alteração será registrada internamente contendo sua identificação de Administrador no log de auditoria.
                       </p>
                    </div>

                    <SaveButton 
                      onClick={handleSaveEditedLog}
                      className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white font-black uppercase rounded-2xl transition-all shadow-xl shadow-primary-500/20 text-sm shrink-0 mt-4"
                    >
                      Salvar Alterações
                    </SaveButton>
                 </form>
              </div>
           </div>
        )}

      </div>
    </div>
  );
}
